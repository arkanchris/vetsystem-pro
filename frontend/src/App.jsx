import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { useContext } from 'react';
import Login         from './pages/Login';
import Dashboard     from './pages/Dashboard';
import Pacientes     from './pages/Pacientes';
import Propietarios  from './pages/Propietarios';
import Historias     from './pages/Historias';
import Medicamentos  from './pages/Medicamentos';
import Citas         from './pages/Citas';
import Adopciones    from './pages/Adopciones';
import Configuracion from './pages/Configuracion';
import Finanzas      from './pages/Finanzas';
import Tienda        from './pages/Tienda';
import Layout        from './components/Layout';
import PanelMaster   from './pages/PanelMaster';
import ResetPassword from './pages/ResetPassword';
import FichaTecnica  from './pages/FichaTecnica';
import Grooming      from './pages/Grooming';
import Adiestramiento   from './pages/Adiestramiento';
import Hospitalizacion  from './pages/Hospitalizacion';
import Guarderia     from './pages/Guarderia';

// ── Ruta protegida: espera a que termine de leer el localStorage ──────────────
function RutaProtegida({ children }) {
  const { usuario, token, cargando } = useContext(AuthContext);

  // Mientras está leyendo localStorage, mostrar pantalla de carga
  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-blue-700">
        <div className="text-center text-white">
          <div className="text-7xl mb-4">🐾</div>
          <p className="text-xl font-semibold">Cargando VetSystem Pro...</p>
        </div>
      </div>
    );
  }

  // Si no hay token, ir al login
  if (!token) return <Navigate to="/login" replace />;

  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login"          element={<Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route path="/" element={<RutaProtegida><Layout /></RutaProtegida>}>
        <Route index                      element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard"           element={<Dashboard />} />
        <Route path="pacientes"           element={<Pacientes />} />
        <Route path="propietarios"        element={<Propietarios />} />
        <Route path="historias"           element={<Historias />} />
        <Route path="medicamentos"        element={<Medicamentos />} />
        <Route path="citas"               element={<Citas />} />
        <Route path="adopciones"          element={<Adopciones />} />
        <Route path="tienda"              element={<Tienda />} />
        <Route path="finanzas"            element={<Finanzas />} />
        <Route path="configuracion"       element={<Configuracion />} />
        <Route path="master"              element={<PanelMaster />} />
        <Route path="grooming"            element={<Grooming />} />
        <Route path="adiestramiento"      element={<Adiestramiento />} />
        <Route path="hospitalizacion"     element={<Hospitalizacion />} />
        <Route path="guarderia"           element={<Guarderia />} />
        <Route path="ficha/:paciente_id"  element={<FichaTecnica />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}