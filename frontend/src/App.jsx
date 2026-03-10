import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { useContext } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Pacientes from './pages/Pacientes';
import Propietarios from './pages/Propietarios';
import Historias from './pages/Historias';
import Medicamentos from './pages/Medicamentos';
import Citas from './pages/Citas';
import Adopciones from './pages/Adopciones';
import Configuracion from './pages/Configuracion';
import Finanzas from './pages/Finanzas';
import Tienda from './pages/Tienda';
import Layout from './components/Layout';

function RutaProtegida({ children }) {
  const { usuario, token } = useContext(AuthContext);
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<RutaProtegida><Layout /></RutaProtegida>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard"     element={<Dashboard />} />
        <Route path="pacientes"     element={<Pacientes />} />
        <Route path="propietarios"  element={<Propietarios />} />
        <Route path="historias"     element={<Historias />} />
        <Route path="medicamentos"  element={<Medicamentos />} />
        <Route path="citas"         element={<Citas />} />
        <Route path="adopciones"    element={<Adopciones />} />
        <Route path="tienda"        element={<Tienda />} />
        <Route path="finanzas"      element={<Finanzas />} />
        <Route path="configuracion" element={<Configuracion />} />
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