const express = require('express');
const router = express.Router();
const pacienteController = require('../controllers/pacienteController');
const { verificarToken } = require('../middlewares/authMiddleware');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => { cb(null, 'src/uploads/'); },
  filename: (req, file, cb) => {
    cb(null, 'paciente_' + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

router.get('/', verificarToken, pacienteController.getPacientes);
router.get('/buscar', verificarToken, pacienteController.searchPacientes);
router.get('/:id', verificarToken, pacienteController.getPacienteById);
router.post('/', verificarToken, upload.single('foto'), pacienteController.createPaciente);
router.put('/:id', verificarToken, upload.single('foto'), pacienteController.updatePaciente);
router.delete('/:id', verificarToken, pacienteController.deletePaciente);

module.exports = router;