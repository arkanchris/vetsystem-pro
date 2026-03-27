const express = require('express');
const router  = express.Router();
const { verificarToken } = require('../middlewares/authMiddleware');
const ctrl = require('../controllers/propietarioController');

router.get('/',           verificarToken, ctrl.getAll);
router.get('/buscar',     verificarToken, ctrl.buscar);
router.get('/:id',        verificarToken, ctrl.getById);
router.post('/',          verificarToken, ctrl.create);
router.put('/:id',        verificarToken, ctrl.update);
router.delete('/:id',     verificarToken, ctrl.remove);

module.exports = router;