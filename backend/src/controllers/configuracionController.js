const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');

// --- USUARIOS ---
const getUsuarios = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, nombre, email, rol, activo, created_at FROM usuarios ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createUsuario = async (req, res) => {
  try {
    const { nombre, email, password, rol } = req.body;
    const existe = await pool.query('SELECT id FROM usuarios WHERE email=$1', [email]);
    if (existe.rows.length > 0)
      return res.status(400).json({ error: 'El email ya está registrado' });
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO usuarios (nombre, email, password, rol) VALUES ($1,$2,$3,$4) RETURNING id, nombre, email, rol',
      [nombre, email, hash, rol || 'veterinario']
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, email, rol, activo, password } = req.body;
    if (password && password.trim() !== '') {
      const hash = await bcrypt.hash(password, 10);
      await pool.query(
        'UPDATE usuarios SET nombre=$1, email=$2, rol=$3, activo=$4, password=$5 WHERE id=$6',
        [nombre, email, rol, activo, hash, id]
      );
    } else {
      await pool.query(
        'UPDATE usuarios SET nombre=$1, email=$2, rol=$3, activo=$4 WHERE id=$5',
        [nombre, email, rol, activo, id]
      );
    }
    res.json({ mensaje: 'Usuario actualizado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('UPDATE usuarios SET activo=false WHERE id=$1', [id]);
    res.json({ mensaje: 'Usuario desactivado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// --- CONFIGURACION CLÍNICA ---
const getConfiguracion = async (req, res) => {
  try {
    const result = await pool.query('SELECT clave, valor FROM configuracion');
    const config = {};
    result.rows.forEach(r => { config[r.clave] = r.valor; });
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateConfiguracion = async (req, res) => {
  try {
    const datos = req.body;
    for (const [clave, valor] of Object.entries(datos)) {
      await pool.query(
        'INSERT INTO configuracion (clave, valor) VALUES ($1,$2) ON CONFLICT (clave) DO UPDATE SET valor=$2, updated_at=NOW()',
        [clave, valor]
      );
    }
    // Si hay firma subida
    if (req.file) {
      const firmaUrl = `/uploads/${req.file.filename}`;
      await pool.query(
        'INSERT INTO configuracion (clave, valor) VALUES ($1,$2) ON CONFLICT (clave) DO UPDATE SET valor=$2, updated_at=NOW()',
        ['firma_medico_url', firmaUrl]
      );
    }
    res.json({ mensaje: 'Configuración guardada' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getUsuarios, createUsuario, updateUsuario, deleteUsuario, getConfiguracion, updateConfiguracion };