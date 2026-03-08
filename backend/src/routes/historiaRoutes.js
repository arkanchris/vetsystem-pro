const express = require('express');
const router = express.Router();
const historiaController = require('../controllers/historiaController');
const { verificarToken } = require('../middlewares/authMiddleware');

router.get('/paciente/:paciente_id', verificarToken, historiaController.getHistoriasByPaciente);
router.get('/:id', verificarToken, historiaController.getHistoriaById);
router.post('/', verificarToken, historiaController.createHistoria);
router.put('/:id', verificarToken, historiaController.updateHistoria);
router.delete('/:id', verificarToken, historiaController.deleteHistoria);

module.exports = router;