const pool = require('../config/database');

// OBTENER TODOS LOS PROPIETARIOS
const getPropietarios = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM propietarios ORDER BY nombre ASC'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: '❌ Error al obtener propietarios.' });
  }
};

// OBTENER UN PROPIETARIO POR ID
const getPropietarioById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM propietarios WHERE id = $1', [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '❌ Propietario no encontrado.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: '❌ Error al obtener propietario.' });
  }
};

// CREAR PROPIETARIO
const createPropietario = async (req, res) => {
  const { nombre, apellido, telefono, email, direccion, documento } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO propietarios (nombre, apellido, telefono, email, direccion, documento)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [nombre, apellido, telefono, email, direccion, documento]
    );
    res.status(201).json({
      mensaje: '✅ Propietario creado exitosamente',
      propietario: result.rows[0]
    });
  } catch (err) {
    res.status(500).json({ error: '❌ Error al crear propietario.' });
  }
};

// ACTUALIZAR PROPIETARIO
const updatePropietario = async (req, res) => {
  const { id } = req.params;
  const { nombre, apellido, telefono, email, direccion, documento } = req.body;
  try {
    const result = await pool.query(
      `UPDATE propietarios SET nombre=$1, apellido=$2, telefono=$3, 
       email=$4, direccion=$5, documento=$6 WHERE id=$7 RETURNING *`,
      [nombre, apellido, telefono, email, direccion, documento, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '❌ Propietario no encontrado.' });
    }
    res.json({
      mensaje: '✅ Propietario actualizado exitosamente',
      propietario: result.rows[0]
    });
  } catch (err) {
    res.status(500).json({ error: '❌ Error al actualizar propietario.' });
  }
};

// ELIMINAR PROPIETARIO
const deletePropietario = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'DELETE FROM propietarios WHERE id = $1 RETURNING *', [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '❌ Propietario no encontrado.' });
    }
    res.json({ mensaje: '✅ Propietario eliminado exitosamente' });
  } catch (err) {
    res.status(500).json({ error: '❌ Error al eliminar propietario.' });
  }
};

// BUSCAR PROPIETARIOS
const searchPropietarios = async (req, res) => {
  const { q } = req.query;
  try {
    const result = await pool.query(
      `SELECT * FROM propietarios WHERE 
       nombre ILIKE $1 OR apellido ILIKE $1 OR documento ILIKE $1`,
      [`%${q}%`]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: '❌ Error al buscar propietarios.' });
  }
};

module.exports = { 
  getPropietarios, getPropietarioById, createPropietario, 
  updatePropietario, deletePropietario, searchPropietarios 
};