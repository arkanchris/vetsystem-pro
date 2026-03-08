const pool = require('../config/database');

const getHistoriasByPaciente = async (req, res) => {
  const { paciente_id } = req.params;
  try {
    const result = await pool.query(`
      SELECT h.*, u.nombre as veterinario
      FROM historia_clinica h
      LEFT JOIN usuarios u ON h.usuario_id = u.id
      WHERE h.paciente_id = $1
      ORDER BY h.fecha DESC
    `, [paciente_id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: '❌ Error al obtener historias.' });
  }
};

const getHistoriaById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`
      SELECT h.*, u.nombre as veterinario, p.nombre as paciente
      FROM historia_clinica h
      LEFT JOIN usuarios u ON h.usuario_id = u.id
      LEFT JOIN pacientes p ON h.paciente_id = p.id
      WHERE h.id = $1
    `, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '❌ Historia no encontrada.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: '❌ Error al obtener historia.' });
  }
};

const createHistoria = async (req, res) => {
  const { paciente_id, motivo_consulta, examen_fisico, 
          diagnostico, tratamiento, observaciones, 
          peso_consulta, temperatura } = req.body;
  const usuario_id = req.usuario.id;
  try {
    const result = await pool.query(`
      INSERT INTO historia_clinica 
      (paciente_id, usuario_id, motivo_consulta, examen_fisico, 
       diagnostico, tratamiento, observaciones, peso_consulta, temperatura)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *
    `, [paciente_id, usuario_id, motivo_consulta, examen_fisico,
        diagnostico, tratamiento, observaciones, peso_consulta, temperatura]);
    res.status(201).json({
      mensaje: '✅ Historia clínica creada exitosamente',
      historia: result.rows[0]
    });
  } catch (err) {
    res.status(500).json({ error: '❌ Error al crear historia.' });
  }
};

const updateHistoria = async (req, res) => {
  const { id } = req.params;
  const { motivo_consulta, examen_fisico, diagnostico, 
          tratamiento, observaciones, peso_consulta, temperatura } = req.body;
  try {
    const result = await pool.query(`
      UPDATE historia_clinica SET motivo_consulta=$1, examen_fisico=$2,
      diagnostico=$3, tratamiento=$4, observaciones=$5, 
      peso_consulta=$6, temperatura=$7 WHERE id=$8 RETURNING *
    `, [motivo_consulta, examen_fisico, diagnostico, tratamiento, 
        observaciones, peso_consulta, temperatura, id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '❌ Historia no encontrada.' });
    }
    res.json({ mensaje: '✅ Historia actualizada', historia: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: '❌ Error al actualizar historia.' });
  }
};

const deleteHistoria = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM historia_clinica WHERE id = $1', [id]);
    res.json({ mensaje: '✅ Historia eliminada exitosamente' });
  } catch (err) {
    res.status(500).json({ error: '❌ Error al eliminar historia.' });
  }
};

module.exports = { 
  getHistoriasByPaciente, getHistoriaById, 
  createHistoria, updateHistoria, deleteHistoria 
};