const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middlewares/authMiddleware');
const {
  getCitas, getCitaById, createCita, updateCita, deleteCita,
  getCitasHoy, checkDisponibilidad, marcarAsistido
} = require('../controllers/citaController');

router.get('/', verificarToken, getCitas);
router.get('/hoy', verificarToken, getCitasHoy);
router.get('/disponibilidad', verificarToken, checkDisponibilidad);
router.get('/:id', verificarToken, getCitaById);
router.post('/', verificarToken, createCita);
router.put('/:id', verificarToken, updateCita);
router.put('/:id/asistido', verificarToken, marcarAsistido);
router.delete('/:id', verificarToken, deleteCita);

module.exports = router;