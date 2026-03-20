const pool = require('../config/database');

// ── JAULAS ────────────────────────────────────────────────────────────────────
const getJaulas = async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT hj.*, h.id as hospitalizacion_id, p.nombre as paciente_nombre, p.especie
       FROM hospitalizacion_jaulas hj
       LEFT JOIN hospitalizaciones h ON h.jaula_id = hj.id AND h.estado = 'activo'
       LEFT JOIN pacientes p ON h.paciente_id = p.id
       WHERE hj.activo = true ORDER BY hj.tipo, hj.numero`
    );
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const updateJaula = async (req, res) => {
  try {
    const { numero, nombre, tipo, estado, descripcion } = req.body;
    const r = await pool.query(
      'UPDATE hospitalizacion_jaulas SET numero=$1,nombre=$2,tipo=$3,estado=$4,descripcion=$5 WHERE id=$6 RETURNING *',
      [numero, nombre||null, tipo||'standard', estado||'libre', descripcion||null, req.params.id]
    );
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const createJaula = async (req, res) => {
  try {
    const { numero, nombre, tipo, descripcion } = req.body;
    const r = await pool.query(
      'INSERT INTO hospitalizacion_jaulas (numero, nombre, tipo, descripcion) VALUES ($1,$2,$3,$4) RETURNING *',
      [numero, nombre||null, tipo||'standard', descripcion||null]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── HOSPITALIZACIONES ─────────────────────────────────────────────────────────
const getHospitalizaciones = async (req, res) => {
  try {
    const { estado } = req.query;
    let q = `SELECT h.*, p.nombre as paciente_nombre, p.especie, p.raza, p.foto_url,
                    u.nombre as veterinario_nombre, hj.numero as jaula_numero, hj.tipo as jaula_tipo
             FROM hospitalizaciones h
             LEFT JOIN pacientes p ON h.paciente_id = p.id
             LEFT JOIN usuarios u ON h.veterinario_id = u.id
             LEFT JOIN hospitalizacion_jaulas hj ON h.jaula_id = hj.id WHERE 1=1`;
    const params = [];
    if (estado) { params.push(estado); q += ` AND h.estado=$${params.length}`; }
    q += ' ORDER BY h.fecha_ingreso DESC';
    const r = await pool.query(q, params);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const getHospitalizacionById = async (req, res) => {
  try {
    const hosp = await pool.query(
      `SELECT h.*, p.nombre as paciente_nombre, p.especie, p.raza, p.foto_url, p.peso,
              u.nombre as veterinario_nombre, hj.numero as jaula_numero, hj.tipo as jaula_tipo
       FROM hospitalizaciones h
       LEFT JOIN pacientes p ON h.paciente_id = p.id
       LEFT JOIN usuarios u ON h.veterinario_id = u.id
       LEFT JOIN hospitalizacion_jaulas hj ON h.jaula_id = hj.id
       WHERE h.id=$1`, [req.params.id]
    );
    if (hosp.rows.length === 0) return res.status(404).json({ error: 'No encontrado' });
    const evoluciones = await pool.query(
      `SELECT he.*, u.nombre as usuario_nombre FROM hospitalizacion_evoluciones he
       LEFT JOIN usuarios u ON he.usuario_id = u.id
       WHERE he.hospitalizacion_id=$1 ORDER BY he.fecha DESC`, [req.params.id]
    );
    const medicamentos = await pool.query(
      `SELECT hm.*, m.nombre as med_nombre FROM hospitalizacion_medicamentos hm
       LEFT JOIN medicamentos m ON hm.medicamento_id = m.id
       WHERE hm.hospitalizacion_id=$1 ORDER BY hm.created_at DESC`, [req.params.id]
    );
    const documentos = await pool.query(
      'SELECT * FROM hospitalizacion_documentos WHERE hospitalizacion_id=$1 ORDER BY created_at DESC',
      [req.params.id]
    );
    res.json({ ...hosp.rows[0], evoluciones: evoluciones.rows, medicamentos: medicamentos.rows, documentos: documentos.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const createHospitalizacion = async (req, res) => {
  const client = await pool.connect();
  try {
    const { paciente_id, jaula_id, veterinario_id, motivo_ingreso, diagnostico_ingreso, pronostico, costo_dia } = req.body;
    await client.query('BEGIN');
    // Verificar jaula libre
    if (jaula_id) {
      const ocupada = await client.query('SELECT id FROM hospitalizaciones WHERE jaula_id=$1 AND estado=\'activo\'', [jaula_id]);
      if (ocupada.rows.length > 0) return res.status(400).json({ error: '❌ La jaula ya está ocupada' });
      await client.query('UPDATE hospitalizacion_jaulas SET estado=\'ocupada\' WHERE id=$1', [jaula_id]);
    }
    const r = await client.query(
      `INSERT INTO hospitalizaciones (paciente_id, jaula_id, veterinario_id, motivo_ingreso, diagnostico_ingreso, pronostico, costo_dia)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [paciente_id, jaula_id||null, veterinario_id||null, motivo_ingreso, diagnostico_ingreso||null, pronostico||'reservado', parseFloat(costo_dia)||0]
    );
    await client.query('COMMIT');
    res.status(201).json(r.rows[0]);
  } catch (e) { await client.query('ROLLBACK'); res.status(500).json({ error: e.message }); }
  finally { client.release(); }
};

const updateHospitalizacion = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { estado, diagnostico_ingreso, pronostico, costo_dia, notas_alta, jaula_id } = req.body;
    await client.query('BEGIN');
    const anterior = await client.query('SELECT * FROM hospitalizaciones WHERE id=$1', [id]);
    const hosp = anterior.rows[0];
    // Si se da de alta, liberar jaula y registrar ingreso financiero
    if (estado && estado !== 'activo' && hosp.estado === 'activo') {
      if (hosp.jaula_id) await client.query("UPDATE hospitalizacion_jaulas SET estado='en_limpieza' WHERE id=$1", [hosp.jaula_id]);
      // Calcular días y costo
      const dias = Math.ceil((Date.now() - new Date(hosp.fecha_ingreso)) / 86400000) || 1;
      const total = dias * (parseFloat(hosp.costo_dia) || 0);
      if (total > 0) {
        const cat = await client.query(`SELECT id FROM categorias_financieras WHERE nombre='Hospitalización' LIMIT 1`);
        const pac = await client.query('SELECT nombre FROM pacientes WHERE id=$1', [hosp.paciente_id]);
        const existe = await client.query(`SELECT id FROM movimientos_financieros WHERE referencia_tipo='hospitalizacion' AND referencia_id=$1`, [id]);
        if (existe.rows.length === 0) {
          await client.query(
            `INSERT INTO movimientos_financieros (tipo, categoria_id, concepto, monto, referencia_tipo, referencia_id, usuario_id)
             VALUES ('ingreso',$1,$2,$3,'hospitalizacion',$4,$5)`,
            [cat.rows[0]?.id, `Hospitalización ${dias}d — ${pac.rows[0]?.nombre||'Paciente'}`, total, id, req.usuario.id]
          );
        }
      }
    }
    // Asegurar tipos correctos para evitar "tipos de dato inconsistentes"
    const estadoFinal      = String(estado || hosp.estado);
    const diagFinal        = diagnostico_ingreso || hosp.diagnostico_ingreso || null;
    const pronosticoFinal  = String(pronostico || hosp.pronostico || 'reservado');
    const costoDiaFinal    = parseFloat(costo_dia ?? hosp.costo_dia ?? 0) || 0;
    const notasFinal       = notas_alta || null;

    const r = await client.query(
      `UPDATE hospitalizaciones
       SET estado        = $1::text,
           diagnostico_ingreso = $2::text,
           pronostico    = $3::text,
           costo_dia     = $4::numeric,
           notas_alta    = $5::text,
           fecha_alta    = CASE WHEN $1::text <> 'activo' THEN NOW() ELSE fecha_alta END
       WHERE id = $6::integer RETURNING *`,
      [estadoFinal, diagFinal || '', pronosticoFinal, costoDiaFinal, notasFinal || '', parseInt(id)]
    );
    await client.query('COMMIT');
    res.json(r.rows[0]);
  } catch (e) { await client.query('ROLLBACK'); res.status(500).json({ error: e.message }); }
  finally { client.release(); }
};

// ── EVOLUCIONES ───────────────────────────────────────────────────────────────
const addEvolucion = async (req, res) => {
  try {
    const { hospitalizacion_id, temperatura, pulso, frecuencia_respiratoria, peso, estado_general, descripcion, tratamiento_aplicado, alimentacion, hidratacion } = req.body;
    const r = await pool.query(
      `INSERT INTO hospitalizacion_evoluciones (hospitalizacion_id, usuario_id, temperatura, pulso, frecuencia_respiratoria, peso, estado_general, descripcion, tratamiento_aplicado, alimentacion, hidratacion)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [hospitalizacion_id, req.usuario.id, temperatura||null, pulso||null, frecuencia_respiratoria||null,
       peso||null, estado_general||'estable', descripcion, tratamiento_aplicado||null, alimentacion||'normal', hidratacion||'normal']
    );
    res.status(201).json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const deleteEvolucion = async (req, res) => {
  try {
    await pool.query('DELETE FROM hospitalizacion_evoluciones WHERE id=$1', [req.params.id]);
    res.json({ mensaje: '✅ Eliminado' });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── MEDICAMENTOS ──────────────────────────────────────────────────────────────
const addMedicamento = async (req, res) => {
  try {
    const { hospitalizacion_id, medicamento_id, nombre_medicamento, dosis, via_administracion, frecuencia, fecha_inicio, fecha_fin, notas } = req.body;
    const r = await pool.query(
      `INSERT INTO hospitalizacion_medicamentos (hospitalizacion_id, medicamento_id, nombre_medicamento, dosis, via_administracion, frecuencia, fecha_inicio, fecha_fin, administrado_por, notas)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [hospitalizacion_id, medicamento_id||null, nombre_medicamento||null, dosis||null, via_administracion||null, frecuencia||null, fecha_inicio||null, fecha_fin||null, req.usuario.id, notas||null]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const deleteMedicamento = async (req, res) => {
  try {
    await pool.query('DELETE FROM hospitalizacion_medicamentos WHERE id=$1', [req.params.id]);
    res.json({ mensaje: '✅ Eliminado' });
  } catch (e) { res.status(500).json({ error: e.message }); }
};


// ── DOCUMENTOS DE HOSPITALIZACIÓN ────────────────────────────────────────────
const subirDocumentoHosp = async (req, res) => {
  try {
    const { hospitalizacion_id, nombre } = req.body;
    if (!req.file) return res.status(400).json({ error: 'Sin archivo' });
    const ext = req.file.originalname.split('.').pop().toLowerCase();
    const tipo = ['pdf'].includes(ext) ? 'pdf' : ['jpg','jpeg','png','webp'].includes(ext) ? 'imagen' : 'otro';
    const r = await pool.query(
      `INSERT INTO hospitalizacion_documentos (hospitalizacion_id, nombre, archivo_url, tipo)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [hospitalizacion_id, nombre || req.file.originalname, `/uploads/${req.file.filename}`, tipo]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const deleteDocumentoHosp = async (req, res) => {
  try {
    await pool.query('DELETE FROM hospitalizacion_documentos WHERE id=$1', [req.params.id]);
    res.json({ mensaje: '✅ Documento eliminado' });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── HISTORIAL CLÍNICO DEL PACIENTE (para mostrar en hospitalización) ──────────
const getHistorialesPaciente = async (req, res) => {
  try {
    const { paciente_id } = req.params;
    const historias = await pool.query(
      `SELECT h.*, u.nombre as veterinario_nombre
       FROM historia_clinica h
       LEFT JOIN usuarios u ON h.usuario_id = u.id
       WHERE h.paciente_id = $1 ORDER BY h.fecha DESC`,
      [paciente_id]
    );
    const vacunas = await pool.query(
      'SELECT * FROM vacunas WHERE paciente_id=$1 ORDER BY fecha_aplicacion DESC',
      [paciente_id]
    );
    res.json({ historias: historias.rows, vacunas: vacunas.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

module.exports = { getJaulas, createJaula, updateJaula, getHospitalizaciones, getHospitalizacionById, createHospitalizacion, updateHospitalizacion, addEvolucion, deleteEvolucion, addMedicamento, deleteMedicamento, subirDocumentoHosp, deleteDocumentoHosp, getHistorialesPaciente };