const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { verificarToken, soloMaster, soloAdmin } = require('../middlewares/authMiddleware');
const {
  getClientes, createCliente, updateCliente, deleteCliente,
  getAdmins, createAdmin, deleteAdmin,
  getModulosAdmin, setModulosAdmin, getTodosModulos,
  getAuxiliaresConModulos, setModulosAuxiliar,
  cambiarPasswordMaster
} = require('../controllers/modulosController');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads/')),
  filename: (req, file, cb) => cb(null, 'logo_cliente_' + Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// ── CLIENTES ──────────────────────────────────────────────────────────────────
router.get('/clientes',          verificarToken, soloMaster, getClientes);
router.post('/clientes',         verificarToken, soloMaster, upload.single('logo'), createCliente);
router.put('/clientes/:id',      verificarToken, soloMaster, upload.single('logo'), updateCliente);
router.delete('/clientes/:id',   verificarToken, soloMaster, deleteCliente);

// ── ADMINS ────────────────────────────────────────────────────────────────────
router.get('/admins',            verificarToken, soloMaster, getAdmins);
router.post('/admins',           verificarToken, soloMaster, createAdmin);
router.delete('/admins/:id',     verificarToken, soloMaster, deleteAdmin);

// ── MÓDULOS ───────────────────────────────────────────────────────────────────
router.get('/todos',             verificarToken, soloMaster, getTodosModulos);
router.get('/admin/:adminId',    verificarToken, soloMaster, getModulosAdmin);
router.post('/admin/:adminId',   verificarToken, soloMaster, setModulosAdmin);

// ── MASTER ────────────────────────────────────────────────────────────────────
router.post('/master/cambiar-password', verificarToken, soloMaster, cambiarPasswordMaster);

// ── AUXILIARES ────────────────────────────────────────────────────────────────
router.get('/auxiliares',              verificarToken, soloAdmin, getAuxiliaresConModulos);
router.post('/auxiliar/:auxiliarId',   verificarToken, soloAdmin, setModulosAuxiliar);

module.exports = router;