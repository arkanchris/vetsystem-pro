const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middlewares/authMiddleware');
const { getCategorias, getMovimientos, createMovimiento, updateMovimiento, deleteMovimiento, getResumen } = require('../controllers/financieroController');

// Solo usuarios con permiso financiero o admin
const soloFinanzas = (req, res, next) => {
  if (req.usuario.rol !== 'admin' && !req.usuario.puede_ver_finanzas) {
    return res.status(403).json({ error: 'Sin permisos para ver finanzas' });
  }
  next();
};

router.get('/categorias', verificarToken, soloFinanzas, getCategorias);
router.get('/resumen', verificarToken, soloFinanzas, getResumen);
router.get('/', verificarToken, soloFinanzas, getMovimientos);
router.post('/', verificarToken, soloFinanzas, createMovimiento);
router.put('/:id', verificarToken, soloFinanzas, updateMovimiento);
router.delete('/:id', verificarToken, soloFinanzas, deleteMovimiento);

module.exports = router;