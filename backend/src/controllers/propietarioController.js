const pool = require('../config/database');

const getPropietarios = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM propietarios ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error getPropietarios:', error);
    res.status(500).json({ error: error.message });
  }
};

const getPropietarioById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM propietarios WHERE id=$1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Propietario no encontrado' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error getPropietarioById:', error);
    res.status(500).json({ error: error.message });
  }
};

const createPropietario = async (req, res) => {
  try {
    const { nombre, apellido, telefono, email, direccion, documento } = req.body;
    const result = await pool.query(`
      INSERT INTO propietarios (nombre, apellido, telefono, email, direccion, documento)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [nombre, apellido, telefono||null, email||null, direccion||null, documento||null]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error createPropietario:', error);
    res.status(500).json({ error: error.message });
  }
};

const updatePropietario = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, apellido, telefono, email, direccion, documento } = req.body;
    const result = await pool.query(`
      UPDATE propietarios SET nombre=$1, apellido=$2, telefono=$3,
      email=$4, direccion=$5, documento=$6
      WHERE id=$7 RETURNING *
    `, [nombre, apellido, telefono||null, email||null, direccion||null, documento||null, id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Propietario no encontrado' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updatePropietario:', error);
    res.status(500).json({ error: error.message });
  }
};

const deletePropietario = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM propietarios WHERE id=$1', [id]);
    res.json({ mensaje: 'Propietario eliminado' });
  } catch (error) {
    console.error('Error deletePropietario:', error);
    res.status(500).json({ error: error.message });
  }
};

const searchPropietarios = async (req, res) => {
  try {
    const { q } = req.query;
    const result = await pool.query(`
      SELECT * FROM propietarios
      WHERE nombre ILIKE $1 OR apellido ILIKE $1 OR documento ILIKE $1
    `, [`%${q}%`]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error searchPropietarios:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getPropietarios, getPropietarioById, createPropietario, updatePropietario, deletePropietario, searchPropietarios };