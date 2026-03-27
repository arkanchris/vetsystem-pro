const pool = require('../config/database');
// Helper: obtener cliente_id del usuario
const getClienteId = async (usuario) => {
  if (usuario.cliente_id) return usuario.cliente_id;
  const r = await pool.query('SELECT cliente_id, admin_id FROM usuarios WHERE id=$1', [usuario.id]);
  if (r.rows[0]?.cliente_id) return r.rows[0].cliente_id;
  if (r.rows[0]?.admin_id) {
    const a = await pool.query('SELECT cliente_id FROM usuarios WHERE id=$1', [r.rows[0].admin_id]);
    return a.rows[0]?.cliente_id || null;
  }
  return null;
};


const path = require('path');

// ── CATÁLOGO DE SERVICIOS ─────────────────────────────────────────────────────
const getCatalogo = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM grooming_servicios_catalogo WHERE activo=true ORDER BY es_personalizado, nombre');
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const createServicio = async (req, res) => {
  try {
    const { nombre, descripcion, precio, duracion_minutos, aplica_a, es_personalizado } = req.body;
    const r = await pool.query(
      `INSERT INTO grooming_servicios_catalogo (nombre, descripcion, precio, duracion_minutos, aplica_a, es_personalizado)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [nombre, descripcion||null, parseFloat(precio)||0, parseInt(duracion_minutos)||60, aplica_a||'todos', es_personalizado||false]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const updateServicio = async (req, res) => {
  try {
    const { nombre, descripcion, precio, duracion_minutos, aplica_a, activo } = req.body;
    const r = await pool.query(
      `UPDATE grooming_servicios_catalogo SET nombre=$1,descripcion=$2,precio=$3,duracion_minutos=$4,aplica_a=$5,activo=$6
       WHERE id=$7 RETURNING *`,
      [nombre, descripcion||null, parseFloat(precio)||0, parseInt(duracion_minutos)||60, aplica_a||'todos', activo!==false, req.params.id]
    );
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const deleteServicio = async (req, res) => {
  try {
    await pool.query('UPDATE grooming_servicios_catalogo SET activo=false WHERE id=$1', [req.params.id]);
    res.json({ mensaje: '✅ Servicio eliminado' });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── CITAS ─────────────────────────────────────────────────────────────────────
const getCitas = async (req, res) => {
  try {
    const { fecha, estado, paciente_id } = req.query;
    let q = `SELECT gc.*, p.nombre as paciente_nombre, p.especie, p.raza, p.foto_url,
                    u.nombre as groomer_nombre
             FROM grooming_citas gc
             LEFT JOIN pacientes p ON gc.paciente_id = p.id
             LEFT JOIN usuarios u ON gc.usuario_id = u.id
             WHERE 1=1`;
    const params = [];
    if (fecha)       { params.push(fecha); q += ` AND DATE(gc.fecha_cita) = $${params.length}`; }
    if (estado)      { params.push(estado); q += ` AND gc.estado = $${params.length}`; }
    if (paciente_id) { params.push(paciente_id); q += ` AND gc.paciente_id = $${params.length}`; }
    q += ' ORDER BY gc.fecha_cita DESC';
    const result = await pool.query(q, params);
    // Servicios de cada cita
    for (const c of result.rows) {
      const svcs = await pool.query(
        'SELECT * FROM grooming_citas_servicios WHERE cita_id=$1', [c.id]
      );
      c.servicios = svcs.rows;
    }
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const createCita = async (req, res) => {
  const client = await pool.connect();
  try {
    const { paciente_id, usuario_id, fecha_cita, hora_fin_estimada, observaciones_ingreso, servicios } = req.body;
    await client.query('BEGIN');
    const total = (servicios||[]).reduce((s, sv) => s + parseFloat(sv.precio||0), 0);
    const r = await client.query(
      `INSERT INTO grooming_citas (paciente_id, usuario_id, fecha_cita, hora_fin_estimada, observaciones_ingreso, total)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [paciente_id, usuario_id||null, fecha_cita, hora_fin_estimada||null, observaciones_ingreso||null, total]
    );
    const citaId = r.rows[0].id;
    for (const sv of (servicios||[])) {
      await client.query(
        `INSERT INTO grooming_citas_servicios (cita_id, servicio_id, nombre_servicio, precio) VALUES ($1,$2,$3,$4)`,
        [citaId, sv.servicio_id||null, sv.nombre_servicio||sv.nombre, parseFloat(sv.precio)||0]
      );
    }
    await client.query('COMMIT');
    res.status(201).json(r.rows[0]);
  } catch (e) { await client.query('ROLLBACK'); res.status(500).json({ error: e.message }); }
  finally { client.release(); }
};

const updateCita = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { paciente_id, usuario_id, fecha_cita, hora_fin_estimada, estado, observaciones_ingreso, observaciones_salida, servicios, pagado, metodo_pago } = req.body;
    await client.query('BEGIN');
    const total = (servicios||[]).reduce((s, sv) => s + parseFloat(sv.precio||0), 0);
    const r = await client.query(
      `UPDATE grooming_citas SET paciente_id=$1,usuario_id=$2,fecha_cita=$3,hora_fin_estimada=$4,
       estado=$5,observaciones_ingreso=$6,observaciones_salida=$7,total=$8,pagado=$9,metodo_pago=$10
       WHERE id=$11 RETURNING *`,
      [paciente_id, usuario_id||null, fecha_cita, hora_fin_estimada||null, estado||'agendada',
       observaciones_ingreso||null, observaciones_salida||null, total, pagado||false, metodo_pago||null, id]
    );
    // Actualizar servicios
    await client.query('DELETE FROM grooming_citas_servicios WHERE cita_id=$1', [id]);
    for (const sv of (servicios||[])) {
      await client.query(
        `INSERT INTO grooming_citas_servicios (cita_id, servicio_id, nombre_servicio, precio) VALUES ($1,$2,$3,$4)`,
        [id, sv.servicio_id||null, sv.nombre_servicio||sv.nombre, parseFloat(sv.precio)||0]
      );
    }
    // Registrar ingreso financiero si se marca como pagado
    if (pagado && total > 0) {
      const cat = await client.query(`SELECT id FROM categorias_financieras WHERE nombre='Estética canina' LIMIT 1`);
      const catId = cat.rows[0]?.id;
      const pac = await client.query('SELECT nombre FROM pacientes WHERE id=$1', [paciente_id]);
      const existe = await client.query(`SELECT id FROM movimientos_financieros WHERE referencia_tipo='grooming' AND referencia_id=$1`, [id]);
      if (existe.rows.length === 0) {
        await client.query(
          `INSERT INTO movimientos_financieros (tipo, categoria_id, concepto, monto, referencia_tipo, referencia_id, usuario_id)
           VALUES ('ingreso',$1,$2,$3,'grooming',$4,$5)`,
          [catId, `Grooming — ${pac.rows[0]?.nombre||'Paciente'}`, total, id, req.usuario.id]
        );
      }
    }
    await client.query('COMMIT');
    res.json(r.rows[0]);
  } catch (e) { await client.query('ROLLBACK'); res.status(500).json({ error: e.message }); }
  finally { client.release(); }
};

const deleteCita = async (req, res) => {
  try {
    await pool.query('DELETE FROM grooming_citas WHERE id=$1', [req.params.id]);
    res.json({ mensaje: '✅ Cita eliminada' });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// Subir fotos antes/después
const subirFoto = async (req, res) => {
  try {
    const { id } = req.params;
    const { tipo } = req.body; // 'antes' | 'despues'
    if (!req.file) return res.status(400).json({ error: 'Sin archivo' });
    const url = `/uploads/${req.file.filename}`;
    const campo = tipo === 'antes' ? 'foto_antes_url' : 'foto_despues_url';
    await pool.query(`UPDATE grooming_citas SET ${campo}=$1 WHERE id=$2`, [url, id]);
    res.json({ url });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// Historial de un paciente
const getHistorialPaciente = async (req, res) => {
  try {
    const { paciente_id } = req.params;
    const r = await pool.query(
      `SELECT gc.*, u.nombre as groomer_nombre FROM grooming_citas gc
       LEFT JOIN usuarios u ON gc.usuario_id = u.id
       WHERE gc.paciente_id=$1 ORDER BY gc.fecha_cita DESC`, [paciente_id]
    );
    for (const c of r.rows) {
      const svcs = await pool.query('SELECT * FROM grooming_citas_servicios WHERE cita_id=$1', [c.id]);
      c.servicios = svcs.rows;
    }
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

module.exports = { getCatalogo, createServicio, updateServicio, deleteServicio, getCitas, createCita, updateCita, deleteCita, subirFoto, getHistorialPaciente };