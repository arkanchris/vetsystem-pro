const jwt = require('jsonwebtoken');
require('dotenv').config();

const verificarToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      error: '❌ Acceso denegado. Token no proporcionado.' 
    });
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = verified;
    next();
  } catch (err) {
    res.status(403).json({ 
      error: '❌ Token inválido o expirado.' 
    });
  }
};

module.exports = { verificarToken };