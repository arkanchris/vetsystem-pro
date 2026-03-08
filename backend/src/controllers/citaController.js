const pool = require('../config/database');

const getCitas = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*, p.nombre as paciente, pr.nombre as propietario,
      pr.apellido as propietario_apellido, u.nombre as veterinario
      FROM citas c
      LEFT JOIN pacientes p ON c.paciente_id = p.id
      LEFT JOIN propietarios pr ON p.propietario_id = pr.id
      LEFT JOIN usuarios u ON c.usuario_id = u.id
      ORDER BY c.fecha_cita DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: '❌ Error al obtener citas.' });
  }
};

const getCitaById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`
      SELECT c.*, p.nombre as paciente, u.nombre as veterinario
      FROM citas c
      LEFT JOIN pacientes p ON c.paciente_id = p.id
      LEFT JOIN usuarios u ON c.usuario_id = u.id
      WHERE c.id = $1
    `, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '❌ Cita no encontrada.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: '❌ Error al obtener cita.' });
  }
};

const createCita = async (req, res) => {
  const { paciente_id, fecha_cita, motivo, notas } = req.body;
  const usuario_id = req.usuario.id;
  try {
    const result = await pool.query(`
      INSERT INTO citas (paciente_id, usuario_id, fecha_cita, motivo, notas)
      VALUES ($1,$2,$3,$4,$5) RETURNING *
    `, [paciente_id, usuario_id, fecha_cita, motivo, notas]);
    res.status(201).json({
      mensaje: '✅ Cita creada exitosamente',
      cita: result.rows[0]
    });
  } catch (err) {
    res.status(500).json({ error: '❌ Error al crear cita.' });
  }
};

const updateCita = async (req, res) => {
  const { id } = req.params;
  const { fecha_cita, motivo, estado, notas } = req.body;
  try {
    const result = await pool.query(`
      UPDATE citas SET fecha_cita=$1, motivo=$2, estado=$3, notas=$4
      WHERE id=$5 RETURNING *
    `, [fecha_cita, motivo, estado, notas, id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '❌ Cita no encontrada.' });
    }
    res.json({ mensaje: '✅ Cita actualizada', cita: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: '❌ Error al actualizar cita.' });
  }
};

const deleteCita = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM citas WHERE id = $1', [id]);
    res.json({ mensaje: '✅ Cita eliminada exitosamente' });
  } catch (err) {
    res.status(500).json({ error: '❌ Error al eliminar cita.' });
  }
};

const getCitasHoy = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*, p.nombre as paciente, u.nombre as veterinario
      FROM citas c
      LEFT JOIN pacientes p ON c.paciente_id = p.id
      LEFT JOIN usuarios u ON c.usuario_id = u.id
      WHERE DATE(c.fecha_cita) = CURRENT_DATE
      ORDER BY c.fecha_cita ASC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: '❌ Error al obtener citas de hoy.' });
  }
};

module.exports = { 
  getCitas, getCitaById, createCita, 
  updateCita, deleteCita, getCitasHoy 
};