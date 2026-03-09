const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middlewares/authMiddleware');
const { getPropietarios, getPropietarioById, createPropietario, updatePropietario, deletePropietario, searchPropietarios } = require('../controllers/propietarioController');

router.get('/', verificarToken, getPropietarios);
router.get('/search', verificarToken, searchPropietarios);
router.get('/:id', verificarToken, getPropietarioById);
router.post('/', verificarToken, createPropietario);
router.put('/:id', verificarToken, updatePropietario);
router.delete('/:id', verificarToken, deletePropietario);

module.exports = router;