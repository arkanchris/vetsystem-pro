const pool = require('../config/database');

const getMedicos = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT m.*, u.nombre as usuario_nombre, u.email as usuario_email
      FROM medicos m
      LEFT JOIN usuarios u ON m.usuario_id = u.id
      WHERE m.activo = true
      ORDER BY m.nombre ASC
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createMedico = async (req, res) => {
  try {
    const { nombre, especialidad, registro_profesional, usuario_id } = req.body;
    const firma_url = req.file ? `/uploads/${req.file.filename}` : null;
    const result = await pool.query(`
      INSERT INTO medicos (nombre, especialidad, registro_profesional, usuario_id, firma_url)
      VALUES ($1, $2, $3, $4, $5) RETURNING *
    `, [nombre, especialidad || null, registro_profesional || null, usuario_id || null, firma_url]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error createMedico:', error);
    res.status(500).json({ error: error.message });
  }
};

const updateMedico = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, especialidad, registro_profesional, usuario_id } = req.body;
    let query, params;
    if (req.file) {
      const firma_url = `/uploads/${req.file.filename}`;
      query = `UPDATE medicos SET nombre=$1, especialidad=$2, registro_profesional=$3, usuario_id=$4, firma_url=$5 WHERE id=$6 RETURNING *`;
      params = [nombre, especialidad || null, registro_profesional || null, usuario_id || null, firma_url, id];
    } else {
      query = `UPDATE medicos SET nombre=$1, especialidad=$2, registro_profesional=$3, usuario_id=$4 WHERE id=$5 RETURNING *`;
      params = [nombre, especialidad || null, registro_profesional || null, usuario_id || null, id];
    }
    const result = await pool.query(query, params);
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteMedico = async (req, res) => {
  try {
    await pool.query('UPDATE medicos SET activo=false WHERE id=$1', [req.params.id]);
    res.json({ mensaje: 'Médico desactivado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getMedicos, createMedico, updateMedico, deleteMedico };