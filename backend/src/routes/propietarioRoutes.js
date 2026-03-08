const express = require('express');
const router = express.Router();
const propietarioController = require('../controllers/propietarioController');
const { verificarToken } = require('../middlewares/authMiddleware');

router.get('/', verificarToken, propietarioController.getPropietarios);
router.get('/buscar', verificarToken, propietarioController.searchPropietarios);
router.get('/:id', verificarToken, propietarioController.getPropietarioById);
router.post('/', verificarToken, propietarioController.createPropietario);
router.put('/:id', verificarToken, propietarioController.updatePropietario);
router.delete('/:id', verificarToken, propietarioController.deletePropietario);

module.exports = router;