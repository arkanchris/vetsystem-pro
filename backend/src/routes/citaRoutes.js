const express = require('express');
const router = express.Router();
const citaController = require('../controllers/citaController');
const { verificarToken } = require('../middlewares/authMiddleware');

router.get('/', verificarToken, citaController.getCitas);
router.get('/hoy', verificarToken, citaController.getCitasHoy);
router.get('/:id', verificarToken, citaController.getCitaById);
router.post('/', verificarToken, citaController.createCita);
router.put('/:id', verificarToken, citaController.updateCita);
router.delete('/:id', verificarToken, citaController.deleteCita);

module.exports = router;