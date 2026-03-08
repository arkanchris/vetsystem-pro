const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verificarToken } = require('../middlewares/authMiddleware');

router.post('/login', authController.login);
router.post('/registro', authController.registro);
router.get('/perfil', verificarToken, authController.perfil);

module.exports = router;