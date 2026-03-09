const pool = require('../config/database');

const getPacientes = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, pr.nombre as propietario_nombre, pr.apellido as propietario_apellido
      FROM pacientes p
      LEFT JOIN propietarios pr ON p.propietario_id = pr.id
      WHERE p.activo = true
      ORDER BY p.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error getPacientes:', error);
    res.status(500).json({ error: error.message });
  }
};

const getPacienteById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT p.*, pr.nombre as propietario_nombre, pr.apellido as propietario_apellido
      FROM pacientes p
      LEFT JOIN propietarios pr ON p.propietario_id = pr.id
      WHERE p.id = $1
    `, [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Paciente no encontrado' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error getPacienteById:', error);
    res.status(500).json({ error: error.message });
  }
};

const createPaciente = async (req, res) => {
  try {
    const { nombre, especie, raza, sexo, fecha_nacimiento, color, peso, propietario_id } = req.body;
    const foto_url = req.file ? `/uploads/${req.file.filename}` : null;
    const result = await pool.query(`
      INSERT INTO pacientes (nombre, especie, raza, sexo, fecha_nacimiento, color, peso, foto_url, propietario_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      nombre, especie, raza||null, sexo||null,
      fecha_nacimiento||null, color||null,
      peso||null, foto_url,
      propietario_id||null
    ]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error createPaciente:', error);
    res.status(500).json({ error: error.message });
  }
};

const updatePaciente = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, especie, raza, sexo, fecha_nacimiento, color, peso, propietario_id } = req.body;
    const result = await pool.query(`
      UPDATE pacientes SET nombre=$1, especie=$2, raza=$3, sexo=$4,
      fecha_nacimiento=$5, color=$6, peso=$7, propietario_id=$8
      WHERE id=$9 RETURNING *
    `, [
      nombre, especie, raza||null, sexo||null,
      fecha_nacimiento||null, color||null,
      peso||null, propietario_id||null, id
    ]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Paciente no encontrado' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updatePaciente:', error);
    res.status(500).json({ error: error.message });
  }
};

const deletePaciente = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('UPDATE pacientes SET activo=false WHERE id=$1', [id]);
    res.json({ mensaje: 'Paciente eliminado' });
  } catch (error) {
    console.error('Error deletePaciente:', error);
    res.status(500).json({ error: error.message });
  }
};

const searchPacientes = async (req, res) => {
  try {
    const { q } = req.query;
    const result = await pool.query(`
      SELECT p.*, pr.nombre as propietario_nombre, pr.apellido as propietario_apellido
      FROM pacientes p
      LEFT JOIN propietarios pr ON p.propietario_id = pr.id
      WHERE p.activo = true AND (
        p.nombre ILIKE $1 OR p.especie ILIKE $1 OR p.raza ILIKE $1
      )
    `, [`%${q}%`]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error searchPacientes:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getPacientes, getPacienteById, createPaciente, updatePaciente, deletePaciente, searchPacientes };