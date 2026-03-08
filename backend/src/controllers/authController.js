const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
require('dotenv').config();

// LOGIN
const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Buscar usuario por email
    const result = await pool.query(
      'SELECT * FROM usuarios WHERE email = $1 AND activo = true', 
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: '❌ Usuario no encontrado.' });
    }

    const usuario = result.rows[0];

    // Verificar contraseña
    const passwordValida = await bcrypt.compare(password, usuario.password);
    if (!passwordValida) {
      return res.status(401).json({ error: '❌ Contraseña incorrecta.' });
    }

    // Generar token JWT
    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, rol: usuario.rol },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      mensaje: '✅ Login exitoso',
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '❌ Error en el servidor.' });
  }
};

// REGISTRO
const registro = async (req, res) => {
  const { nombre, email, password, rol } = req.body;

  try {
    // Verificar si el email ya existe
    const existe = await pool.query(
      'SELECT id FROM usuarios WHERE email = $1', 
      [email]
    );

    if (existe.rows.length > 0) {
      return res.status(400).json({ error: '❌ El email ya está registrado.' });
    }

    // Encriptar contraseña
    const passwordHash = await bcrypt.hash(password, 10);

    // Insertar usuario
    const result = await pool.query(
      `INSERT INTO usuarios (nombre, email, password, rol) 
       VALUES ($1, $2, $3, $4) RETURNING id, nombre, email, rol`,
      [nombre, email, passwordHash, rol || 'veterinario']
    );

    res.status(201).json({
      mensaje: '✅ Usuario registrado exitosamente',
      usuario: result.rows[0]
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '❌ Error en el servidor.' });
  }
};

// OBTENER PERFIL
const perfil = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, nombre, email, rol, created_at FROM usuarios WHERE id = $1',
      [req.usuario.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: '❌ Error en el servidor.' });
  }
};

module.exports = { login, registro, perfil };