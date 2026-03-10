const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { verificarToken } = require('../middlewares/authMiddleware');
const {
  getHistoriasByPaciente, getHistoriaById,
  createHistoria, updateHistoria, deleteHistoria,
  subirDocumento, deleteDocumento
} = require('../controllers/historiaController');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads/')),
  filename: (req, file, cb) => cb(null, 'doc_' + Date.now() + path.extname(file.originalname))
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB máximo
  fileFilter: (req, file, cb) => {
    const allowed = /pdf|jpg|jpeg|png|webp|doc|docx/;
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    if (allowed.test(ext)) cb(null, true);
    else cb(new Error('Tipo de archivo no permitido'));
  }
});

router.get('/paciente/:pacienteId', verificarToken, getHistoriasByPaciente);
router.get('/:id', verificarToken, getHistoriaById);
router.post('/', verificarToken, createHistoria);
router.put('/:id', verificarToken, updateHistoria);
router.delete('/:id', verificarToken, deleteHistoria);

// Documentos adjuntos
router.post('/documentos/subir', verificarToken, upload.single('archivo'), subirDocumento);
router.delete('/documentos/:id', verificarToken, deleteDocumento);

module.exports = router;