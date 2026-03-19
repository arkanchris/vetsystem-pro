import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast, { Toaster } from 'react-hot-toast';

export default function Login() {
  const [login_input, setLoginInput] = useState('');
  const [password, setPassword]   = useState('');
  const [cargando, setCargando]   = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCargando(true);
    try {
      const usuario = await login(login_input.trim(), password);
      toast.success(`¡Bienvenido, ${usuario.nombre}!`);
      if (usuario.rol === 'master') navigate('/master');
      else navigate('/dashboard');
    } catch {
      toast.error('Usuario o contraseña incorrectos');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-teal-700 flex items-center justify-center p-4">
      <Toaster position="top-right" />
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full shadow-lg mb-4">
            <span className="text-4xl">🐾</span>
          </div>
          <h1 className="text-4xl font-bold text-white">VetSystem Pro</h1>
          <p className="text-blue-200 mt-2">Sistema de Gestión Veterinaria</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Iniciar Sesión</h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Usuario o correo electrónico
              </label>
              <input
                type="text"
                value={login_input}
                onChange={e => setLoginInput(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                placeholder="@usuario o email@correo.com"
                required
                autoComplete="username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            <button type="submit" disabled={cargando}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition disabled:opacity-50">
              {cargando ? '⏳ Ingresando...' : '🔐 Ingresar'}
            </button>
          </form>

          <div className="mt-5 p-3 bg-gray-50 rounded-xl text-center">
            <p className="text-xs text-gray-400">Ingresa con tu usuario (<span className="font-mono">@usuario</span>) o tu correo electrónico</p>
          </div>
        </div>

        <p className="text-center text-blue-200 text-sm mt-6">
          © {new Date().getFullYear()} VetSystem Pro — Todos los derechos reservados
        </p>
      </div>
    </div>
  );
}