import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Pacientes from './pages/Pacientes';
import Propietarios from './pages/Propietarios';
import Medicamentos from './pages/Medicamentos';
import Citas from './pages/Citas';
import Historias from './pages/Historias';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="pacientes" element={<Pacientes />} />
            <Route path="propietarios" element={<Propietarios />} />
            <Route path="medicamentos" element={<Medicamentos />} />
            <Route path="citas" element={<Citas />} />
            <Route path="historias" element={<Historias />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;