const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
require('dotenv').config();

// LOGIN — acepta username O email
const login = async (req, res) => {
  const { email, password } = req.body; // "email" puede ser username o email
  try {
    // Buscar por username O por email
    const result = await pool.query(
      `SELECT * FROM usuarios
       WHERE (username = $1 OR email = $1) AND activo = true
       LIMIT 1`,
      [email?.toLowerCase().trim()]
    );

    if (result.rows.length === 0)
      return res.status(401).json({ error: '❌ Usuario no encontrado.' });

    const usuario = result.rows[0];
    const ok = await bcrypt.compare(password, usuario.password);
    if (!ok) return res.status(401).json({ error: '❌ Contraseña incorrecta.' });

    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, rol: usuario.rol, cliente_id: usuario.cliente_id || null },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    // Módulos según rol
    let modulosActivos = [];
    if (usuario.rol === 'master') {
      const mods = await pool.query('SELECT clave FROM modulos ORDER BY orden');
      modulosActivos = mods.rows.map(m => m.clave);
      modulosActivos.push('master');
    } else if (usuario.rol === 'admin') {
      const mods = await pool.query(
        `SELECT modulo_clave FROM modulos_admin WHERE admin_id=$1 AND activo=true`, [usuario.id]
      );
      modulosActivos = mods.rows.map(m => m.modulo_clave);
      if (!modulosActivos.includes('configuracion')) modulosActivos.push('configuracion');
    } else {
      const mods = await pool.query(
        `SELECT modulo_clave FROM modulos_auxiliar WHERE auxiliar_id=$1 AND activo=true`, [usuario.id]
      );
      modulosActivos = mods.rows.map(m => m.modulo_clave);
    }
    if (!modulosActivos.includes('dashboard')) modulosActivos.unshift('dashboard');

    res.json({
      mensaje: '✅ Login exitoso',
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        username: usuario.username,
        rol: usuario.rol,
        puede_ver_finanzas: usuario.puede_ver_finanzas,
        clinica_nombre: usuario.clinica_nombre,
        cliente_id: usuario.cliente_id,
        modulos: modulosActivos
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '❌ Error en el servidor.' });
  }
};

// REGISTRO (interno — usado por authRoutes para auxiliares)
const registro = async (req, res) => {
  const { nombre, email, password, rol, clinica_nombre, admin_id, username } = req.body;
  try {
    if (rol === 'master')
      return res.status(403).json({ error: '❌ No se puede crear rol master desde aquí.' });
    if (['admin'].includes(rol) && req.usuario?.rol !== 'master')
      return res.status(403).json({ error: '❌ Solo el Máster puede crear admins.' });

    const existe = await pool.query('SELECT id FROM usuarios WHERE email=$1', [email]);
    if (existe.rows.length > 0)
      return res.status(400).json({ error: '❌ El email ya está registrado.' });

    // Generar username si no viene
    const usernameBase = username || email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '');
    const usernameUnico = await generarUsernameUnico(usernameBase);

    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO usuarios (nombre, email, username, password, rol, clinica_nombre, admin_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, nombre, email, username, rol`,
      [nombre, email, usernameUnico, hash, rol||'auxiliar', clinica_nombre||null, admin_id||null]
    );
    res.status(201).json({ mensaje: '✅ Usuario registrado', usuario: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '❌ Error en el servidor.' });
  }
};

// Perfil
const perfil = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, nombre, email, username, rol, clinica_nombre, created_at FROM usuarios WHERE id=$1',
      [req.usuario.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: '❌ Error en el servidor.' });
  }
};

// Helper: username único
const generarUsernameUnico = async (base) => {
  const limpio = base.toLowerCase().replace(/[^a-z0-9_]/g, '').substring(0, 20);
  const existe = await pool.query('SELECT id FROM usuarios WHERE username=$1', [limpio]);
  if (existe.rows.length === 0) return limpio;
  // Agregar número
  for (let i = 2; i <= 99; i++) {
    const intento = `${limpio}${i}`;
    const ex = await pool.query('SELECT id FROM usuarios WHERE username=$1', [intento]);
    if (ex.rows.length === 0) return intento;
  }
  return `${limpio}_${Date.now()}`;
};

module.exports = { login, registro, perfil, generarUsernameUnico };