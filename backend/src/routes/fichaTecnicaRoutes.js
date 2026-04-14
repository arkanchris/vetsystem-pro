const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const { verificarToken } = require('../middlewares/authMiddleware');
const ctrl = require('../controllers/fichaTecnicaController');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads/')),
  filename:    (req, file, cb) => cb(null, 'ficha_' + Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage, limits: { fileSize: 15 * 1024 * 1024 } });

router.get('/paciente/:paciente_id',          verificarToken, ctrl.getFicha);
router.post('/paciente/:paciente_id',         verificarToken, ctrl.upsertFicha);
router.put('/paciente/:paciente_id',          verificarToken, ctrl.upsertFicha);
router.post('/documento-firmado',             verificarToken, upload.single('archivo'), ctrl.subirDocumentoFirmado);
router.post('/adjunto',                       verificarToken, upload.single('archivo'), ctrl.subirAdjunto);
router.delete('/adjunto/:id',                 verificarToken, ctrl.eliminarAdjunto);
router.post('/firma-usuario',                 verificarToken, ctrl.guardarFirmaUsuario);

module.exports = router;