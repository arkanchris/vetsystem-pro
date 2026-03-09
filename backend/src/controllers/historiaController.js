const pool = require('../config/database');

const getHistoriasByPaciente = async (req, res) => {
  try {
    const { pacienteId } = req.params;
    const result = await pool.query(`
      SELECT h.*, u.nombre as veterinario_nombre
      FROM historia_clinica h
      LEFT JOIN usuarios u ON h.usuario_id = u.id
      WHERE h.paciente_id = $1
      ORDER BY h.fecha DESC
    `, [pacienteId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error getHistoriasByPaciente:', error);
    res.status(500).json({ error: error.message });
  }
};

const getHistoriaById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT h.*, u.nombre as veterinario_nombre
      FROM historia_clinica h
      LEFT JOIN usuarios u ON h.usuario_id = u.id
      WHERE h.id = $1
    `, [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Historia no encontrada' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error getHistoriaById:', error);
    res.status(500).json({ error: error.message });
  }
};

const createHistoria = async (req, res) => {
  try {
    const { paciente_id, motivo_consulta, examen_fisico, diagnostico, tratamiento, observaciones, peso_consulta, temperatura } = req.body;
    const result = await pool.query(`
      INSERT INTO historia_clinica 
      (paciente_id, usuario_id, motivo_consulta, examen_fisico, diagnostico, tratamiento, observaciones, peso_consulta, temperatura)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      paciente_id, req.usuario.id, motivo_consulta,
      examen_fisico||null, diagnostico||null,
      tratamiento||null, observaciones||null,
      peso_consulta||null, temperatura||null
    ]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error createHistoria:', error);
    res.status(500).json({ error: error.message });
  }
};

const updateHistoria = async (req, res) => {
  try {
    const { id } = req.params;
    const { paciente_id, motivo_consulta, examen_fisico, diagnostico, tratamiento, observaciones, peso_consulta, temperatura } = req.body;
    const result = await pool.query(`
      UPDATE historia_clinica SET
      paciente_id=$1, motivo_consulta=$2, examen_fisico=$3,
      diagnostico=$4, tratamiento=$5, observaciones=$6,
      peso_consulta=$7, temperatura=$8
      WHERE id=$9 RETURNING *
    `, [
      paciente_id, motivo_consulta, examen_fisico||null,
      diagnostico||null, tratamiento||null, observaciones||null,
      peso_consulta||null, temperatura||null, id
    ]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Historia no encontrada' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updateHistoria:', error);
    res.status(500).json({ error: error.message });
  }
};

const deleteHistoria = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM historia_clinica WHERE id=$1', [id]);
    res.json({ mensaje: 'Historia eliminada' });
  } catch (error) {
    console.error('Error deleteHistoria:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getHistoriasByPaciente, getHistoriaById, createHistoria, updateHistoria, deleteHistoria };