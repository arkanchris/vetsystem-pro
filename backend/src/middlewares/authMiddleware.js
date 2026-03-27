const jwt = require('jsonwebtoken');
require('dotenv').config();

const verificarToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: '❌ Token no proporcionado.' });
  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = verified;
    next();
  } catch {
    res.status(403).json({ error: '❌ Token inválido o expirado.' });
  }
};

const soloMaster = (req, res, next) => {
  if (req.usuario?.rol !== 'master')
    return res.status(403).json({ error: '❌ Acceso exclusivo del usuario Máster.' });
  next();
};

const soloAdmin = (req, res, next) => {
  if (!['master','admin','admin_veterinario'].includes(req.usuario?.rol))
    return res.status(403).json({ error: '❌ Se requiere rol admin o superior.' });
  next();
};

module.exports = { verificarToken, soloMaster, soloAdmin };