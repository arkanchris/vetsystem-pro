const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middlewares/authMiddleware');
const {
  getHogares, createHogar, updateHogar, deleteHogar,
  getAdopciones, createAdopcion, updateAdopcion, deleteAdopcion
} = require('../controllers/adopcionController');

router.get('/hogares', verificarToken, getHogares);
router.post('/hogares', verificarToken, createHogar);
router.put('/hogares/:id', verificarToken, updateHogar);
router.delete('/hogares/:id', verificarToken, deleteHogar);

router.get('/', verificarToken, getAdopciones);
router.post('/', verificarToken, createAdopcion);
router.put('/:id', verificarToken, updateAdopcion);
router.delete('/:id', verificarToken, deleteAdopcion);

module.exports = router;