const pool = require('../config/database');
const path = require('path');

const getVacunasByPaciente = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM vacunas WHERE paciente_id=$1 ORDER BY fecha_aplicacion DESC',
      [req.params.paciente_id]
    );
    // Cargar documentos de cada vacuna
    for (const v of result.rows) {
      const docs = await pool.query('SELECT * FROM vacuna_documentos WHERE vacuna_id=$1 ORDER BY created_at DESC', [v.id]);
      v.documentos = docs.rows;
    }
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createVacuna = async (req, res) => {
  try {
    const { paciente_id, nombre, fecha_aplicacion, fecha_proxima, lote, laboratorio, aplicada_por, notas } = req.body;
    const result = await pool.query(`
      INSERT INTO vacunas (paciente_id, nombre, fecha_aplicacion, fecha_proxima, lote, laboratorio, aplicada_por, notas)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *
    `, [paciente_id, nombre, fecha_aplicacion||null, fecha_proxima||null, lote||null, laboratorio||null, aplicada_por||null, notas||null]);
    result.rows[0].documentos = [];
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateVacuna = async (req, res) => {
  try {
    const { nombre, fecha_aplicacion, fecha_proxima, lote, laboratorio, aplicada_por, notas } = req.body;
    const result = await pool.query(`
      UPDATE vacunas SET nombre=$1, fecha_aplicacion=$2, fecha_proxima=$3,
      lote=$4, laboratorio=$5, aplicada_por=$6, notas=$7 WHERE id=$8 RETURNING *
    `, [nombre, fecha_aplicacion||null, fecha_proxima||null, lote||null, laboratorio||null, aplicada_por||null, notas||null, req.params.id]);
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteVacuna = async (req, res) => {
  try {
    await pool.query('DELETE FROM vacunas WHERE id=$1', [req.params.id]);
    res.json({ mensaje: 'Vacuna eliminada' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ── DOCUMENTOS DE VACUNA ─────────────────────────────────────────────────────
const subirDocumentoVacuna = async (req, res) => {
  try {
    const { vacuna_id, nombre } = req.body;
    if (!req.file) return res.status(400).json({ error: 'No se recibió archivo' });
    const archivo_url = `/uploads/${req.file.filename}`;
    const ext = req.file.originalname.split('.').pop().toLowerCase();
    const tipo = ['pdf'].includes(ext) ? 'pdf' : ['jpg','jpeg','png','webp'].includes(ext) ? 'imagen' : 'otro';
    const result = await pool.query(
      'INSERT INTO vacuna_documentos (vacuna_id, nombre, archivo_url, tipo) VALUES ($1,$2,$3,$4) RETURNING *',
      [vacuna_id, nombre || req.file.originalname, archivo_url, tipo]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteDocumentoVacuna = async (req, res) => {
  try {
    await pool.query('DELETE FROM vacuna_documentos WHERE id=$1', [req.params.id]);
    res.json({ mensaje: 'Documento eliminado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getVacunasByPaciente, createVacuna, updateVacuna, deleteVacuna, subirDocumentoVacuna, deleteDocumentoVacuna };