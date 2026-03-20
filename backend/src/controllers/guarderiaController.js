const pool = require('../config/database');
const path = require('path');

// ── CONFIGURACIÓN ─────────────────────────────────────────────────────────────
const getConfig = async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM guarderia_config LIMIT 1');
    res.json(r.rows[0] || {});
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const updateConfig = async (req, res) => {
  try {
    const { capacidad_maxima, precio_dia, precio_dia_con_adiestramiento, precio_transporte, horario_apertura, horario_cierre, requisitos } = req.body;
    const existe = await pool.query('SELECT id FROM guarderia_config LIMIT 1');
    let r;
    if (existe.rows.length === 0) {
      r = await pool.query(
        `INSERT INTO guarderia_config (capacidad_maxima, precio_dia, precio_dia_con_adiestramiento, precio_transporte, horario_apertura, horario_cierre, requisitos)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [capacidad_maxima||20, precio_dia||30000, precio_dia_con_adiestramiento||50000, precio_transporte||15000, horario_apertura||'07:00', horario_cierre||'19:00', requisitos||null]
      );
    } else {
      r = await pool.query(
        `UPDATE guarderia_config SET capacidad_maxima=$1,precio_dia=$2,precio_dia_con_adiestramiento=$3,precio_transporte=$4,horario_apertura=$5,horario_cierre=$6,requisitos=$7
         WHERE id=$8 RETURNING *`,
        [capacidad_maxima||20, precio_dia||30000, precio_dia_con_adiestramiento||50000, precio_transporte||15000, horario_apertura||'07:00', horario_cierre||'19:00', requisitos||null, existe.rows[0].id]
      );
    }
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── ESTANCIAS ─────────────────────────────────────────────────────────────────
const getEstancias = async (req, res) => {
  try {
    const { estado } = req.query;
    let q = `SELECT ge.*, p.nombre as paciente_nombre, p.especie, p.raza, p.foto_url,
                    pr.nombre as propietario_nombre, pr.apellido as propietario_apellido, pr.telefono as propietario_telefono
             FROM guarderia_estancias ge
             LEFT JOIN pacientes p ON ge.paciente_id = p.id
             LEFT JOIN propietarios pr ON p.propietario_id = pr.id
             WHERE 1=1`;
    const params = [];
    if (estado) { params.push(estado); q += ` AND ge.estado=$${params.length}`; }
    q += ' ORDER BY ge.fecha_ingreso DESC';
    const r = await pool.query(q, params);
    for (const e of r.rows) {
      const docs = await pool.query('SELECT * FROM guarderia_documentos WHERE estancia_id=$1', [e.id]);
      e.documentos = docs.rows;
    }
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const getEstanciaById = async (req, res) => {
  try {
    const est = await pool.query(
      `SELECT ge.*, p.nombre as paciente_nombre, p.especie, p.raza, p.foto_url, p.peso,
              pr.nombre as propietario_nombre, pr.apellido as propietario_apellido,
              pr.telefono as propietario_telefono, pr.email as propietario_email
       FROM guarderia_estancias ge
       LEFT JOIN pacientes p ON ge.paciente_id = p.id
       LEFT JOIN propietarios pr ON p.propietario_id = pr.id
       WHERE ge.id=$1`, [req.params.id]
    );
    if (est.rows.length === 0) return res.status(404).json({ error: 'No encontrado' });
    const registros = await pool.query(
      `SELECT gr.*, u.nombre as usuario_nombre FROM guarderia_registros_diarios gr
       LEFT JOIN usuarios u ON gr.registro_por = u.id
       WHERE gr.estancia_id=$1 ORDER BY gr.fecha DESC`, [req.params.id]
    );
    const docs = await pool.query('SELECT * FROM guarderia_documentos WHERE estancia_id=$1 ORDER BY created_at DESC', [req.params.id]);
    // Vacunas del paciente
    const vacunas = await pool.query('SELECT * FROM vacunas WHERE paciente_id=$1 ORDER BY fecha_aplicacion DESC', [est.rows[0].paciente_id]);
    res.json({ ...est.rows[0], registros: registros.rows, documentos: docs.rows, vacunas: vacunas.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const getAforo = async (req, res) => {
  try {
    const config = await pool.query('SELECT capacidad_maxima FROM guarderia_config LIMIT 1');
    const ocupados = await pool.query(`SELECT COUNT(*) FROM guarderia_estancias WHERE estado='activo'`);
    const capacidad = config.rows[0]?.capacidad_maxima || 20;
    const actual = parseInt(ocupados.rows[0].count) || 0;
    res.json({ capacidad, actual, disponibles: capacidad - actual, porcentaje: Math.round((actual/capacidad)*100) });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const createEstancia = async (req, res) => {
  const client = await pool.connect();
  try {
    const { paciente_id, fecha_ingreso, fecha_salida_estimada, incluye_adiestramiento, incluye_transporte, direccion_recogida, condicion_medica, observaciones } = req.body;
    // Verificar aforo
    const config = await client.query('SELECT * FROM guarderia_config LIMIT 1');
    const ocupados = await client.query(`SELECT COUNT(*) FROM guarderia_estancias WHERE estado='activo'`);
    if (parseInt(ocupados.rows[0].count) >= (config.rows[0]?.capacidad_maxima || 20))
      return res.status(400).json({ error: '❌ Guardería al máximo de capacidad' });

    const precioDia = incluye_adiestramiento
      ? (parseFloat(config.rows[0]?.precio_dia_con_adiestramiento) || 50000)
      : (parseFloat(config.rows[0]?.precio_dia) || 30000);
    const precioTransporte = incluye_transporte ? (parseFloat(config.rows[0]?.precio_transporte) || 15000) : 0;

    await client.query('BEGIN');
    const r = await client.query(
      `INSERT INTO guarderia_estancias (paciente_id, fecha_ingreso, fecha_salida_estimada, incluye_adiestramiento, incluye_transporte, direccion_recogida, precio_dia, condicion_medica, observaciones)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [paciente_id, fecha_ingreso, fecha_salida_estimada||null, incluye_adiestramiento||false,
       incluye_transporte||false, direccion_recogida||null, precioDia + precioTransporte,
       condicion_medica||null, observaciones||null]
    );
    await client.query('COMMIT');
    res.status(201).json(r.rows[0]);
  } catch (e) { await client.query('ROLLBACK'); res.status(500).json({ error: e.message }); }
  finally { client.release(); }
};

const updateEstancia = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { estado, fecha_salida_real, observaciones, condicion_medica, pagado, metodo_pago, vacunas_verificadas } = req.body;
    await client.query('BEGIN');
    const anterior = await client.query('SELECT * FROM guarderia_estancias WHERE id=$1', [id]);
    const est = anterior.rows[0];
    let costo_total = est.costo_total;
    if (estado === 'finalizada' && est.estado === 'activo') {
      const fechaSalida = fecha_salida_real || new Date().toISOString().split('T')[0];
      const dias = Math.ceil((new Date(fechaSalida) - new Date(est.fecha_ingreso)) / 86400000) || 1;
      costo_total = dias * (parseFloat(est.precio_dia) || 0);
    }
    const r = await client.query(
      `UPDATE guarderia_estancias SET estado=$1,fecha_salida_real=$2,observaciones=$3,condicion_medica=$4,
       pagado=$5,metodo_pago=$6,vacunas_verificadas=$7,costo_total=$8 WHERE id=$9 RETURNING *`,
      [estado||est.estado, fecha_salida_real||est.fecha_salida_real, observaciones||est.observaciones,
       condicion_medica||est.condicion_medica, pagado||false, metodo_pago||null, vacunas_verificadas||false, costo_total, id]
    );
    // Registrar ingreso financiero
    if (pagado && costo_total > 0) {
      const cat = await client.query(`SELECT id FROM categorias_financieras WHERE nombre='Guardería' LIMIT 1`);
      const pac = await client.query('SELECT nombre FROM pacientes WHERE id=$1', [est.paciente_id]);
      const existe = await client.query(`SELECT id FROM movimientos_financieros WHERE referencia_tipo='guarderia' AND referencia_id=$1`, [id]);
      if (existe.rows.length === 0) {
        await client.query(
          `INSERT INTO movimientos_financieros (tipo, categoria_id, concepto, monto, referencia_tipo, referencia_id, usuario_id)
           VALUES ('ingreso',$1,$2,$3,'guarderia',$4,$5)`,
          [cat.rows[0]?.id, `Guardería — ${pac.rows[0]?.nombre||'Paciente'}`, costo_total, id, req.usuario.id]
        );
      }
    }
    await client.query('COMMIT');
    res.json(r.rows[0]);
  } catch (e) { await client.query('ROLLBACK'); res.status(500).json({ error: e.message }); }
  finally { client.release(); }
};

// ── REGISTROS DIARIOS ─────────────────────────────────────────────────────────
const addRegistroDiario = async (req, res) => {
  try {
    const { estancia_id, fecha, hora_entrada, hora_salida, comportamiento, alimentacion, observaciones } = req.body;
    const r = await pool.query(
      `INSERT INTO guarderia_registros_diarios (estancia_id, fecha, hora_entrada, hora_salida, comportamiento, alimentacion, observaciones, registro_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [estancia_id, fecha, hora_entrada||null, hora_salida||null, comportamiento||'normal', alimentacion||'normal', observaciones||null, req.usuario.id]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const updateRegistroDiario = async (req, res) => {
  try {
    const { hora_salida, comportamiento, alimentacion, observaciones } = req.body;
    const r = await pool.query(
      'UPDATE guarderia_registros_diarios SET hora_salida=$1,comportamiento=$2,alimentacion=$3,observaciones=$4 WHERE id=$5 RETURNING *',
      [hora_salida||null, comportamiento||'normal', alimentacion||'normal', observaciones||null, req.params.id]
    );
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── DOCUMENTOS ────────────────────────────────────────────────────────────────
const subirDocumento = async (req, res) => {
  try {
    const { estancia_id, nombre } = req.body;
    if (!req.file) return res.status(400).json({ error: 'Sin archivo' });
    const ext = req.file.originalname.split('.').pop().toLowerCase();
    const tipo = ['pdf'].includes(ext) ? 'pdf' : ['jpg','jpeg','png','webp'].includes(ext) ? 'imagen' : 'otro';
    const r = await pool.query(
      'INSERT INTO guarderia_documentos (estancia_id, nombre, archivo_url, tipo) VALUES ($1,$2,$3,$4) RETURNING *',
      [estancia_id, nombre || req.file.originalname, `/uploads/${req.file.filename}`, tipo]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const deleteDocumento = async (req, res) => {
  try {
    await pool.query('DELETE FROM guarderia_documentos WHERE id=$1', [req.params.id]);
    res.json({ mensaje: '✅ Documento eliminado' });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

module.exports = { getConfig, updateConfig, getEstancias, getEstanciaById, getAforo, createEstancia, updateEstancia, addRegistroDiario, updateRegistroDiario, subirDocumento, deleteDocumento };