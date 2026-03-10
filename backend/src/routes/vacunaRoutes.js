const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { verificarToken } = require('../middlewares/authMiddleware');
const { getVacunasByPaciente, createVacuna, updateVacuna, deleteVacuna, subirDocumentoVacuna, deleteDocumentoVacuna } = require('../controllers/vacunaController');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads/')),
  filename: (req, file, cb) => cb(null, 'vac_doc_' + Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

router.get('/paciente/:paciente_id', verificarToken, getVacunasByPaciente);
router.post('/', verificarToken, createVacuna);
router.put('/:id', verificarToken, updateVacuna);
router.delete('/:id', verificarToken, deleteVacuna);

// Documentos de vacuna
router.post('/documentos/subir', verificarToken, upload.single('archivo'), subirDocumentoVacuna);
router.delete('/documentos/:id', verificarToken, deleteDocumentoVacuna);

module.exports = router;