const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middlewares/authMiddleware');
const { getCitas, getCitaById, createCita, updateCita, deleteCita, getCitasHoy } = require('../controllers/citaController');

router.get('/', verificarToken, getCitas);
router.get('/hoy', verificarToken, getCitasHoy);
router.get('/:id', verificarToken, getCitaById);
router.post('/', verificarToken, createCita);
router.put('/:id', verificarToken, updateCita);
router.delete('/:id', verificarToken, deleteCita);

module.exports = router;