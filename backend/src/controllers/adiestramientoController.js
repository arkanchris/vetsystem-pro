const pool = require('../config/database');

// ── PROGRAMAS ─────────────────────────────────────────────────────────────────
const getProgramas = async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM adiestramiento_programas WHERE activo=true ORDER BY nivel, nombre');
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const createPrograma = async (req, res) => {
  try {
    const { nombre, descripcion, nivel, duracion_semanas, sesiones_total, precio } = req.body;
    const r = await pool.query(
      `INSERT INTO adiestramiento_programas (nombre, descripcion, nivel, duracion_semanas, sesiones_total, precio)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [nombre, descripcion||null, nivel||'basico', parseInt(duracion_semanas)||4, parseInt(sesiones_total)||8, parseFloat(precio)||0]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const updatePrograma = async (req, res) => {
  try {
    const { nombre, descripcion, nivel, duracion_semanas, sesiones_total, precio, activo } = req.body;
    const r = await pool.query(
      `UPDATE adiestramiento_programas SET nombre=$1,descripcion=$2,nivel=$3,duracion_semanas=$4,sesiones_total=$5,precio=$6,activo=$7
       WHERE id=$8 RETURNING *`,
      [nombre, descripcion||null, nivel||'basico', parseInt(duracion_semanas)||4, parseInt(sesiones_total)||8, parseFloat(precio)||0, activo!==false, req.params.id]
    );
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── HABILIDADES ───────────────────────────────────────────────────────────────
const getHabilidades = async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM adiestramiento_habilidades ORDER BY categoria, nombre');
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const createHabilidad = async (req, res) => {
  try {
    const { nombre, categoria } = req.body;
    if (!nombre) return res.status(400).json({ error: 'Nombre requerido' });
    const r = await pool.query(
      'INSERT INTO adiestramiento_habilidades (nombre, categoria) VALUES ($1,$2) RETURNING *',
      [nombre, categoria || 'general']
    );
    res.status(201).json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const updateHabilidad = async (req, res) => {
  try {
    const { nombre, categoria } = req.body;
    const r = await pool.query(
      'UPDATE adiestramiento_habilidades SET nombre=$1, categoria=$2 WHERE id=$3 RETURNING *',
      [nombre, categoria || 'general', req.params.id]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'No encontrado' });
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const deleteHabilidad = async (req, res) => {
  try {
    // Eliminar logros asociados primero
    await pool.query('DELETE FROM adiestramiento_logros WHERE habilidad_id=$1', [req.params.id]);
    await pool.query('DELETE FROM adiestramiento_habilidades WHERE id=$1', [req.params.id]);
    res.json({ mensaje: '✅ Habilidad eliminada' });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// Eliminar un logro específico de una matrícula
const deleteLogro = async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM adiestramiento_logros WHERE matricula_id=$1 AND habilidad_id=$2',
      [req.params.matricula_id, req.params.habilidad_id]
    );
    res.json({ mensaje: '✅ Logro eliminado' });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── MATRÍCULAS ────────────────────────────────────────────────────────────────
const getMatriculas = async (req, res) => {
  try {
    const { estado, paciente_id } = req.query;
    let q = `SELECT am.*, p.nombre as paciente_nombre, p.especie, p.raza, p.foto_url,
                    ap.nombre as programa_nombre, ap.nivel, ap.sesiones_total,
                    u.nombre as entrenador_nombre
             FROM adiestramiento_matriculas am
             LEFT JOIN pacientes p ON am.paciente_id = p.id
             LEFT JOIN adiestramiento_programas ap ON am.programa_id = ap.id
             LEFT JOIN usuarios u ON am.entrenador_id = u.id WHERE 1=1`;
    const params = [];
    if (estado)      { params.push(estado);      q += ` AND am.estado=$${params.length}`; }
    if (paciente_id) { params.push(paciente_id); q += ` AND am.paciente_id=$${params.length}`; }
    q += ' ORDER BY am.created_at DESC';
    const r = await pool.query(q, params);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const getMatriculaById = async (req, res) => {
  try {
    const { id } = req.params;
    const mat = await pool.query(
      `SELECT am.*, p.nombre as paciente_nombre, p.especie, p.raza, p.foto_url,
              ap.nombre as programa_nombre, ap.nivel, ap.sesiones_total,
              u.nombre as entrenador_nombre
       FROM adiestramiento_matriculas am
       LEFT JOIN pacientes p ON am.paciente_id = p.id
       LEFT JOIN adiestramiento_programas ap ON am.programa_id = ap.id
       LEFT JOIN usuarios u ON am.entrenador_id = u.id WHERE am.id=$1`, [id]
    );
    if (mat.rows.length === 0) return res.status(404).json({ error: 'No encontrado' });
    const sesiones = await pool.query('SELECT * FROM adiestramiento_sesiones WHERE matricula_id=$1 ORDER BY fecha DESC', [id]);
    const logros   = await pool.query(
      `SELECT al.*, ah.nombre as habilidad_nombre, ah.categoria
       FROM adiestramiento_logros al
       LEFT JOIN adiestramiento_habilidades ah ON al.habilidad_id = ah.id
       WHERE al.matricula_id=$1 ORDER BY al.fecha_logro DESC`, [id]
    );
    res.json({ ...mat.rows[0], sesiones: sesiones.rows, logros: logros.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const createMatricula = async (req, res) => {
  try {
    const { paciente_id, programa_id, entrenador_id, fecha_inicio, precio_acordado, notas_generales } = req.body;
    // Calcular fecha fin estimada desde el programa
    const prog = await pool.query('SELECT * FROM adiestramiento_programas WHERE id=$1', [programa_id]);
    const semanas = prog.rows[0]?.duracion_semanas || 4;
    const fechaFin = new Date(fecha_inicio);
    fechaFin.setDate(fechaFin.getDate() + semanas * 7);
    const r = await pool.query(
      `INSERT INTO adiestramiento_matriculas (paciente_id, programa_id, entrenador_id, fecha_inicio, fecha_fin_estimada, precio_acordado, notas_generales)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [paciente_id, programa_id, entrenador_id||null, fecha_inicio, fechaFin.toISOString().split('T')[0],
       parseFloat(precio_acordado) || prog.rows[0]?.precio || 0, notas_generales||null]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const updateMatricula = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { estado, notas_generales, progreso_porcentaje, pagado, fecha_fin_real } = req.body;
    await client.query('BEGIN');
    const r = await client.query(
      `UPDATE adiestramiento_matriculas SET estado=$1,notas_generales=$2,progreso_porcentaje=$3,pagado=$4,fecha_fin_real=$5
       WHERE id=$6 RETURNING *`,
      [estado||'activo', notas_generales||null, progreso_porcentaje||0, pagado||false, fecha_fin_real||null, id]
    );
    // Si se marca como pagado, registrar ingreso
    if (pagado) {
      const mat = r.rows[0];
      const cat = await client.query(`SELECT id FROM categorias_financieras WHERE nombre='Adiestramiento' LIMIT 1`);
      const pac = await client.query('SELECT nombre FROM pacientes WHERE id=$1', [mat.paciente_id]);
      const existe = await client.query(`SELECT id FROM movimientos_financieros WHERE referencia_tipo='adiestramiento' AND referencia_id=$1`, [id]);
      if (existe.rows.length === 0 && mat.precio_acordado > 0) {
        await client.query(
          `INSERT INTO movimientos_financieros (tipo, categoria_id, concepto, monto, referencia_tipo, referencia_id, usuario_id)
           VALUES ('ingreso',$1,$2,$3,'adiestramiento',$4,$5)`,
          [cat.rows[0]?.id, `Adiestramiento — ${pac.rows[0]?.nombre||'Paciente'}`, mat.precio_acordado, id, req.usuario.id]
        );
      }
    }
    await client.query('COMMIT');
    res.json(r.rows[0]);
  } catch (e) { await client.query('ROLLBACK'); res.status(500).json({ error: e.message }); }
  finally { client.release(); }
};

// ── SESIONES ──────────────────────────────────────────────────────────────────
const addSesion = async (req, res) => {
  const client = await pool.connect();
  try {
    const { matricula_id, fecha, duracion_minutos, entrenador_id, comportamiento, descripcion, habilidades_trabajadas, notas } = req.body;
    await client.query('BEGIN');
    const r = await client.query(
      `INSERT INTO adiestramiento_sesiones (matricula_id, fecha, duracion_minutos, entrenador_id, comportamiento, descripcion, habilidades_trabajadas, notas)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [matricula_id, fecha, duracion_minutos||60, entrenador_id||null, comportamiento||'normal', descripcion||null,
       JSON.stringify(habilidades_trabajadas||[]), notas||null]
    );
    // Actualizar sesiones completadas y recalcular progreso
    const mat = await client.query('SELECT * FROM adiestramiento_matriculas WHERE id=$1', [matricula_id]);
    const prog = await client.query('SELECT sesiones_total FROM adiestramiento_programas WHERE id=$1', [mat.rows[0].programa_id]);
    const nuevasSesiones = (mat.rows[0].sesiones_completadas || 0) + 1;
    const total = prog.rows[0]?.sesiones_total || 1;
    const progreso = Math.min(Math.round((nuevasSesiones / total) * 100), 99);
    await client.query(
      'UPDATE adiestramiento_matriculas SET sesiones_completadas=$1, progreso_porcentaje=$2 WHERE id=$3',
      [nuevasSesiones, progreso, matricula_id]
    );
    await client.query('COMMIT');
    res.status(201).json(r.rows[0]);
  } catch (e) { await client.query('ROLLBACK'); res.status(500).json({ error: e.message }); }
  finally { client.release(); }
};

const deleteSesion = async (req, res) => {
  try {
    await pool.query('DELETE FROM adiestramiento_sesiones WHERE id=$1', [req.params.id]);
    res.json({ mensaje: '✅ Sesión eliminada' });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── LOGROS ────────────────────────────────────────────────────────────────────
const setLogro = async (req, res) => {
  try {
    const { matricula_id, habilidad_id, nivel_dominio, notas } = req.body;
    const r = await pool.query(
      `INSERT INTO adiestramiento_logros (matricula_id, habilidad_id, nivel_dominio, notas)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT DO NOTHING RETURNING *`,
      [matricula_id, habilidad_id, nivel_dominio||1, notas||null]
    );
    if (r.rows.length === 0) {
      // Actualizar nivel si ya existe
      await pool.query(
        'UPDATE adiestramiento_logros SET nivel_dominio=$1, notas=$2, fecha_logro=CURRENT_DATE WHERE matricula_id=$3 AND habilidad_id=$4',
        [nivel_dominio||1, notas||null, matricula_id, habilidad_id]
      );
    }
    res.json({ mensaje: '✅ Logro registrado' });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

module.exports = { getProgramas, createPrograma, updatePrograma, getHabilidades, createHabilidad, updateHabilidad, deleteHabilidad, deleteLogro, getMatriculas, getMatriculaById, createMatricula, updateMatricula, addSesion, deleteSesion, setLogro };