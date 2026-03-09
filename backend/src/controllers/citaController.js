const pool = require('../config/database');

const getCitas = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*, p.nombre as paciente_nombre, p.especie as paciente_especie
      FROM citas c
      LEFT JOIN pacientes p ON c.paciente_id = p.id
      ORDER BY c.fecha_cita DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error getCitas:', error);
    res.status(500).json({ error: error.message });
  }
};

const getCitaById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT c.*, p.nombre as paciente_nombre
      FROM citas c
      LEFT JOIN pacientes p ON c.paciente_id = p.id
      WHERE c.id = $1
    `, [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Cita no encontrada' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error getCitaById:', error);
    res.status(500).json({ error: error.message });
  }
};

const createCita = async (req, res) => {
  try {
    const { paciente_id, fecha_cita, motivo, estado, notas } = req.body;
    const result = await pool.query(`
      INSERT INTO citas (paciente_id, usuario_id, fecha_cita, motivo, estado, notas)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [paciente_id, req.usuario.id, fecha_cita, motivo, estado||'pendiente', notas||null]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error createCita:', error);
    res.status(500).json({ error: error.message });
  }
};

const updateCita = async (req, res) => {
  try {
    const { id } = req.params;
    const { paciente_id, fecha_cita, motivo, estado, notas } = req.body;
    const result = await pool.query(`
      UPDATE citas SET paciente_id=$1, fecha_cita=$2, motivo=$3, estado=$4, notas=$5
      WHERE id=$6 RETURNING *
    `, [paciente_id, fecha_cita, motivo, estado, notas||null, id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Cita no encontrada' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updateCita:', error);
    res.status(500).json({ error: error.message });
  }
};

const deleteCita = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM citas WHERE id=$1', [id]);
    res.json({ mensaje: 'Cita eliminada' });
  } catch (error) {
    console.error('Error deleteCita:', error);
    res.status(500).json({ error: error.message });
  }
};

const getCitasHoy = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*, p.nombre as paciente_nombre
      FROM citas c
      LEFT JOIN pacientes p ON c.paciente_id = p.id
      WHERE DATE(c.fecha_cita) = CURRENT_DATE
      ORDER BY c.fecha_cita ASC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error getCitasHoy:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getCitas, getCitaById, createCita, updateCita, deleteCita, getCitasHoy };