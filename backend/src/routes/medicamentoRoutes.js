const express = require('express');
const router = express.Router();
const { 
  getMedicamentos, 
  getMedicamentoById, 
  createMedicamento, 
  updateMedicamento, 
  deleteMedicamento,
  getStockBajo
} = require('../controllers/medicamentoController');
const { verificarToken } = require('../middlewares/authMiddleware');

router.get('/', verificarToken, getMedicamentos);
router.get('/stock-bajo', verificarToken, getStockBajo);
router.get('/:id', verificarToken, getMedicamentoById);
router.post('/', verificarToken, createMedicamento);
router.put('/:id', verificarToken, updateMedicamento);
router.delete('/:id', verificarToken, deleteMedicamento);

module.exports = router;