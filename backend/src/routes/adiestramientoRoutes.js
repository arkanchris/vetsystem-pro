const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middlewares/authMiddleware');
const ctrl = require('../controllers/adiestramientoController');

router.get('/programas',              verificarToken, ctrl.getProgramas);
router.post('/programas',             verificarToken, ctrl.createPrograma);
router.put('/programas/:id',          verificarToken, ctrl.updatePrograma);

router.get('/habilidades',              verificarToken, ctrl.getHabilidades);
router.post('/habilidades',             verificarToken, ctrl.createHabilidad);
router.put('/habilidades/:id',          verificarToken, ctrl.updateHabilidad);
router.delete('/habilidades/:id',       verificarToken, ctrl.deleteHabilidad);
router.delete('/logros/:matricula_id/:habilidad_id', verificarToken, ctrl.deleteLogro);

router.get('/matriculas',             verificarToken, ctrl.getMatriculas);
router.get('/matriculas/:id',         verificarToken, ctrl.getMatriculaById);
router.post('/matriculas',            verificarToken, ctrl.createMatricula);
router.put('/matriculas/:id',         verificarToken, ctrl.updateMatricula);

router.post('/sesiones',              verificarToken, ctrl.addSesion);
router.delete('/sesiones/:id',        verificarToken, ctrl.deleteSesion);

router.post('/logros',                verificarToken, ctrl.setLogro);

module.exports = router;