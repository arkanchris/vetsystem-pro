const pool = require('../config/database');
const { autoRegistrarEnAdopciones } = require('./adopcionController');

const parseFecha = (fecha) => {
  if (!fecha) return null;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(fecha)) {
    const [dia, mes, anio] = fecha.split('/');
    return `${anio}-${mes}-${dia}`;
  }
  return fecha;
};

const parsePropietarioId = (val) => {
  if (!val || val === 'null' || val === '' || val === '0' || val === 0) return null;
  return parseInt(val);
};

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
    const { nombre, especie, raza, sexo, fecha_nacimiento, color, peso, propietario_id, tipo_ingreso } = req.body;

    if (!nombre || !especie) {
      return res.status(400).json({ error: 'Nombre y especie son requeridos' });
    }

    const foto_url = req.file ? `/uploads/${req.file.filename}` : null;
    const tipo = tipo_ingreso || 'con_dueno';
    const propId = ['callejero', 'comunitario', 'abandonado'].includes(tipo)
      ? null
      : parsePropietarioId(propietario_id);

    const result = await pool.query(`
      INSERT INTO pacientes (nombre, especie, raza, sexo, fecha_nacimiento, color, peso, foto_url, propietario_id, tipo_ingreso)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      nombre, especie, raza || null, sexo || null,
      parseFecha(fecha_nacimiento), color || null,
      peso ? parseFloat(peso) : null,
      foto_url, propId, tipo
    ]);

    // Auto-registrar en adopciones si no tiene dueño
    await autoRegistrarEnAdopciones(result.rows[0].id, tipo);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error createPaciente:', error);
    res.status(500).json({ error: error.message });
  }
};

const updatePaciente = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, especie, raza, sexo, fecha_nacimiento, color, peso, propietario_id, tipo_ingreso } = req.body;

    const tipo = tipo_ingreso || 'con_dueno';
    const propId = ['callejero', 'comunitario', 'abandonado'].includes(tipo)
      ? null
      : parsePropietarioId(propietario_id);

    let query, params;
    if (req.file) {
      const foto_url = `/uploads/${req.file.filename}`;
      query = `UPDATE pacientes SET nombre=$1, especie=$2, raza=$3, sexo=$4,
        fecha_nacimiento=$5, color=$6, peso=$7, propietario_id=$8, foto_url=$9, tipo_ingreso=$10
        WHERE id=$11 RETURNING *`;
      params = [
        nombre, especie, raza || null, sexo || null,
        parseFecha(fecha_nacimiento), color || null,
        peso ? parseFloat(peso) : null,
        propId, foto_url, tipo, id
      ];
    } else {
      query = `UPDATE pacientes SET nombre=$1, especie=$2, raza=$3, sexo=$4,
        fecha_nacimiento=$5, color=$6, peso=$7, propietario_id=$8, tipo_ingreso=$9
        WHERE id=$10 RETURNING *`;
      params = [
        nombre, especie, raza || null, sexo || null,
        parseFecha(fecha_nacimiento), color || null,
        peso ? parseFloat(peso) : null,
        propId, tipo, id
      ];
    }

    const result = await pool.query(query, params);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Paciente no encontrado' });

    // Auto-registrar en adopciones si cambió a sin dueño
    await autoRegistrarEnAdopciones(parseInt(id), tipo);

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
    if (!q) return res.json([]);
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


