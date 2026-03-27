const pool = require('../config/database');

// Helper cliente_id
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

const getAll = async (req, res) => {
  try {
    const clienteId = await getClienteId(req.usuario);
    if (!clienteId) return res.json([]);
    const r = await pool.query(
      `SELECT p.*, COUNT(pa.id) as total_mascotas
       FROM propietarios p
       LEFT JOIN pacientes pa ON pa.propietario_id = p.id AND pa.activo=true
       WHERE p.cliente_id = $1
       GROUP BY p.id ORDER BY p.apellido, p.nombre`,
      [clienteId]
    );
    res.json(r.rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
};

const getById = async (req, res) => {
  try {
    const clienteId = await getClienteId(req.usuario);
    const r = await pool.query(
      'SELECT * FROM propietarios WHERE id=$1 AND cliente_id=$2',
      [req.params.id, clienteId]
    );
    if (!r.rows[0]) return res.status(404).json({ error: 'No encontrado' });
    const mascotas = await pool.query(
      'SELECT * FROM pacientes WHERE propietario_id=$1 AND activo=true', [req.params.id]
    );
    res.json({ ...r.rows[0], mascotas: mascotas.rows });
  } catch(e) { res.status(500).json({ error: e.message }); }
};

const create = async (req, res) => {
  try {
    const clienteId = await getClienteId(req.usuario);
    if (!clienteId) return res.status(400).json({ error: 'Sin clínica asignada' });
    const { nombre, apellido, email, telefono, direccion, documento, tipo_documento, ciudad } = req.body;
    const r = await pool.query(
      `INSERT INTO propietarios (nombre, apellido, email, telefono, direccion, documento, tipo_documento, ciudad, cliente_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [nombre, apellido||null, email||null, telefono||null, direccion||null,
       documento||null, tipo_documento||'CC', ciudad||null, clienteId]
    );
    res.status(201).json(r.rows[0]);
  } catch(e) { res.status(500).json({ error: e.message }); }
};

const update = async (req, res) => {
  try {
    const clienteId = await getClienteId(req.usuario);
    const { nombre, apellido, email, telefono, direccion, documento, tipo_documento, ciudad } = req.body;
    const r = await pool.query(
      `UPDATE propietarios SET nombre=$1,apellido=$2,email=$3,telefono=$4,
       direccion=$5,documento=$6,tipo_documento=$7,ciudad=$8
       WHERE id=$9 AND cliente_id=$10 RETURNING *`,
      [nombre, apellido||null, email||null, telefono||null, direccion||null,
       documento||null, tipo_documento||'CC', ciudad||null, req.params.id, clienteId]
    );
    if (!r.rows[0]) return res.status(404).json({ error: 'No encontrado' });
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ error: e.message }); }
};

const remove = async (req, res) => {
  try {
    const clienteId = await getClienteId(req.usuario);
    await pool.query('DELETE FROM propietarios WHERE id=$1 AND cliente_id=$2', [req.params.id, clienteId]);
    res.json({ mensaje: 'Eliminado' });
  } catch(e) { res.status(500).json({ error: e.message }); }
};

const buscar = async (req, res) => {
  try {
    const clienteId = await getClienteId(req.usuario);
    if (!clienteId) return res.json([]);
    const q = req.query.q || '';
    const r = await pool.query(
      `SELECT * FROM propietarios
       WHERE cliente_id=$1 AND (nombre ILIKE $2 OR apellido ILIKE $2 OR email ILIKE $2 OR telefono ILIKE $2 OR documento ILIKE $2)
       ORDER BY apellido, nombre LIMIT 20`,
      [clienteId, `%${q}%`]
    );
    res.json(r.rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
};

module.exports = { getAll, getById, create, update, remove, buscar };