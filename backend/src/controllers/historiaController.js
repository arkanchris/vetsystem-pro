const pool = require('../config/database');

const getHistoriasByPaciente = async (req, res) => {
  try {
    const { pacienteId } = req.params;
    const result = await pool.query(`
      SELECT h.*, u.nombre as veterinario_nombre,
             -- Estado de adopción del paciente
             a.estado as adopcion_estado,
             a.id as adopcion_id,
             hp.nombre as hogar_nombre
      FROM historia_clinica h
      LEFT JOIN usuarios u ON h.usuario_id = u.id
      LEFT JOIN adopciones a ON a.paciente_id = h.paciente_id
      LEFT JOIN hogares_paso hp ON a.hogar_paso_id = hp.id
      WHERE h.paciente_id = $1
      ORDER BY h.fecha DESC
    `, [pacienteId]);

    // Para cada historia, traer sus documentos
    const historias = result.rows;
    for (const h of historias) {
      const docs = await pool.query(
        'SELECT * FROM historia_documentos WHERE historia_id = $1 ORDER BY created_at DESC',
        [h.id]
      );
      h.documentos = docs.rows;
    }

    res.json(historias);
  } catch (error) {
    console.error('Error getHistoriasByPaciente:', error);
    res.status(500).json({ error: error.message });
  }
};

const getHistoriaById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT h.*, u.nombre as veterinario_nombre,
             a.estado as adopcion_estado, a.id as adopcion_id,
             hp.nombre as hogar_nombre
      FROM historia_clinica h
      LEFT JOIN usuarios u ON h.usuario_id = u.id
      LEFT JOIN adopciones a ON a.paciente_id = h.paciente_id
      LEFT JOIN hogares_paso hp ON a.hogar_paso_id = hp.id
      WHERE h.id = $1
    `, [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Historia no encontrada' });
    const historia = result.rows[0];
    const docs = await pool.query(
      'SELECT * FROM historia_documentos WHERE historia_id = $1 ORDER BY created_at DESC',
      [id]
    );
    historia.documentos = docs.rows;
    res.json(historia);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createHistoria = async (req, res) => {
  try {
    const { paciente_id, motivo_consulta, examen_fisico, diagnostico, tratamiento, observaciones, peso_consulta, temperatura } = req.body;
    const result = await pool.query(`
      INSERT INTO historia_clinica
      (paciente_id, usuario_id, motivo_consulta, examen_fisico, diagnostico, tratamiento, observaciones, peso_consulta, temperatura)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *
    `, [
      paciente_id, req.usuario.id, motivo_consulta,
      examen_fisico || null, diagnostico || null,
      tratamiento || null, observaciones || null,
      peso_consulta || null, temperatura || null
    ]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
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
      paciente_id, motivo_consulta, examen_fisico || null,
      diagnostico || null, tratamiento || null, observaciones || null,
      peso_consulta || null, temperatura || null, id
    ]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Historia no encontrada' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteHistoria = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM historia_clinica WHERE id=$1', [id]);
    res.json({ mensaje: 'Historia eliminada' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ── DOCUMENTOS ADJUNTOS ──────────────────────────────────────────────────────
const subirDocumento = async (req, res) => {
  try {
    const { historia_id, nombre } = req.body;
    if (!req.file) return res.status(400).json({ error: 'No se recibió archivo' });

    const archivo_url = `/uploads/${req.file.filename}`;
    const ext = req.file.originalname.split('.').pop().toLowerCase();
    const tipo = ['pdf'].includes(ext) ? 'pdf' : ['jpg','jpeg','png','webp'].includes(ext) ? 'imagen' : 'otro';

    const result = await pool.query(`
      INSERT INTO historia_documentos (historia_id, nombre, archivo_url, tipo)
      VALUES ($1, $2, $3, $4) RETURNING *
    `, [historia_id, nombre || req.file.originalname, archivo_url, tipo]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteDocumento = async (req, res) => {
  try {
    await pool.query('DELETE FROM historia_documentos WHERE id=$1', [req.params.id]);
    res.json({ mensaje: 'Documento eliminado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getHistoriasByPaciente, getHistoriaById, createHistoria, updateHistoria, deleteHistoria, subirDocumento, deleteDocumento };