const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rutas
const authRoutes = require('./routes/authRoutes');
const propietarioRoutes = require('./routes/propietarioRoutes');
const pacienteRoutes = require('./routes/pacienteRoutes');
const historiaRoutes = require('./routes/historiaRoutes');
const medicamentoRoutes = require('./routes/medicamentoRoutes');
const citaRoutes = require('./routes/citaRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/propietarios', propietarioRoutes);
app.use('/api/pacientes', pacienteRoutes);
app.use('/api/historias', historiaRoutes);
app.use('/api/medicamentos', medicamentoRoutes);
app.use('/api/citas', citaRoutes);

app.get('/', (req, res) => res.json({ mensaje: '🐾 VetSystem Pro API funcionando' }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});