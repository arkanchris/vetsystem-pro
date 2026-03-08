const pool = require('../config/database');

// OBTENER TODOS LOS PACIENTES
const getPacientes = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, pr.nombre as propietario_nombre, pr.apellido as propietario_apellido,
      pr.telefono as propietario_telefono
      FROM pacientes p
      LEFT JOIN propietarios pr ON p.propietario_id = pr.id
      WHERE p.activo = true
      ORDER BY p.nombre ASC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: '❌ Error al obtener pacientes.' });
  }
};

// OBTENER UN PACIENTE POR ID
const getPacienteById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`
      SELECT p.*, pr.nombre as propietario_nombre, pr.apellido as propietario_apellido,
      pr.telefono as propietario_telefono, pr.email as propietario_email
      FROM pacientes p
      LEFT JOIN propietarios pr ON p.propietario_id = pr.id
      WHERE p.id = $1
    `, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '❌ Paciente no encontrado.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: '❌ Error al obtener paciente.' });
  }
};

// CREAR PACIENTE
const createPaciente = async (req, res) => {
  const { nombre, especie, raza, sexo, fecha_nacimiento, 
          color, peso, propietario_id } = req.body;
  const foto_url = req.file ? `/uploads/${req.file.filename}` : null;
  try {
    const result = await pool.query(`
      INSERT INTO pacientes (nombre, especie, raza, sexo, fecha_nacimiento, 
      color, peso, foto_url, propietario_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [nombre, especie, raza, sexo, fecha_nacimiento, color, peso, foto_url, propietario_id]
    );
    res.status(201).json({
      mensaje: '✅ Paciente registrado exitosamente',
      paciente: result.rows[0]
    });
  } catch (err) {
    res.status(500).json({ error: '❌ Error al crear paciente.' });
  }
};

// ACTUALIZAR PACIENTE
const updatePaciente = async (req, res) => {
  const { id } = req.params;
  const { nombre, especie, raza, sexo, fecha_nacimiento, 
          color, peso, propietario_id } = req.body;
  const foto_url = req.file ? `/uploads/${req.file.filename}` : undefined;
  try {
    let query, params;
    if (foto_url) {
      query = `UPDATE pacientes SET nombre=$1, especie=$2, raza=$3, sexo=$4,
               fecha_nacimiento=$5, color=$6, peso=$7, propietario_id=$8, 
               foto_url=$9 WHERE id=$10 RETURNING *`;
      params = [nombre, especie, raza, sexo, fecha_nacimiento, color, peso, propietario_id, foto_url, id];
    } else {
      query = `UPDATE pacientes SET nombre=$1, especie=$2, raza=$3, sexo=$4,
               fecha_nacimiento=$5, color=$6, peso=$7, propietario_id=$8 
               WHERE id=$9 RETURNING *`;
      params = [nombre, especie, raza, sexo, fecha_nacimiento, color, peso, propietario_id, id];
    }
    const result = await pool.query(query, params);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '❌ Paciente no encontrado.' });
    }
    res.json({
      mensaje: '✅ Paciente actualizado exitosamente',
      paciente: result.rows[0]
    });
  } catch (err) {
    res.status(500).json({ error: '❌ Error al actualizar paciente.' });
  }
};

// ELIMINAR PACIENTE (desactivar)
const deletePaciente = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'UPDATE pacientes SET activo = false WHERE id = $1 RETURNING *', [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '❌ Paciente no encontrado.' });
    }
    res.json({ mensaje: '✅ Paciente eliminado exitosamente' });
  } catch (err) {
    res.status(500).json({ error: '❌ Error al eliminar paciente.' });
  }
};

// BUSCAR PACIENTES
const searchPacientes = async (req, res) => {
  const { q } = req.query;
  try {
    const result = await pool.query(`
      SELECT p.*, pr.nombre as propietario_nombre, pr.apellido as propietario_apellido
      FROM pacientes p
      LEFT JOIN propietarios pr ON p.propietario_id = pr.id
      WHERE p.activo = true AND (
        p.nombre ILIKE $1 OR p.especie ILIKE $1 OR p.raza ILIKE $1
      )`, [`%${q}%`]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: '❌ Error al buscar pacientes.' });
  }
};

module.exports = { 
  getPacientes, getPacienteById, createPaciente, 
  updatePaciente, deletePaciente, searchPacientes 
};