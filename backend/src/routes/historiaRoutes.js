const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middlewares/authMiddleware');
const { getHistoriasByPaciente, getHistoriaById, createHistoria, updateHistoria, deleteHistoria } = require('../controllers/historiaController');

router.get('/paciente/:pacienteId', verificarToken, getHistoriasByPaciente);
router.get('/:id', verificarToken, getHistoriaById);
router.post('/', verificarToken, createHistoria);
router.put('/:id', verificarToken, updateHistoria);
router.delete('/:id', verificarToken, deleteHistoria);

module.exports = router;