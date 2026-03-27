import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast, { Toaster } from 'react-hot-toast';

export default function Login() {
  const [login_input, setLoginInput] = useState('');
  const [password, setPassword]      = useState('');
  const [cargando, setCargando]      = useState(false);
  const [verPassword, setVerPassword] = useState(false);

  // Recuperar contraseña
  const [modalRecuperar, setModalRecuperar] = useState(false);
  const [recUsername, setRecUsername]       = useState('');
  const [recEmail, setRecEmail]             = useState('');
  const [enviando, setEnviando]             = useState(false);
  const [enviado, setEnviado]               = useState(false);

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

  const handleRecuperar = async (e) => {
    e.preventDefault();
    if (!recUsername.trim() || !recEmail.trim())
      return toast.error('Ingresa tu usuario y correo');
    setEnviando(true);
    try {
      await api.post('/auth/recuperar-password', {
        username: recUsername.trim().replace(/^@/, ''),
        email:    recEmail.trim(),
      });
      setEnviado(true);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al enviar');
    } finally {
      setEnviando(false);
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
                Usuario
              </label>
              <input type="text" value={login_input}
                onChange={e => setLoginInput(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                placeholder=""
                required autoComplete="username"/>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <div className="relative">
                <input type={verPassword ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition pr-12"
                  placeholder="" required autoComplete="current-password"/>
                <button type="button" onClick={() => setVerPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg">
                  {verPassword ? '🙈' : '👁️'}
                </button>
              </div>
              {/* Olvidaste tu contraseña */}
              <div className="text-right mt-1.5">
                <button type="button" onClick={() => { setModalRecuperar(true); setEnviado(false); setRecUsername(''); setRecEmail(''); }}
                  className="text-xs text-blue-600 hover:text-blue-800 hover:underline">
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            </div>

            <button type="submit" disabled={cargando}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition disabled:opacity-50">
              {cargando ? '⏳ Ingresando...' : '🔐 Ingresar'}
            </button>
          </form>


        </div>

        <p className="text-center text-blue-200 text-sm mt-6">
          © {new Date().getFullYear()} VetSystem Pro — Todos los derechos reservados
        </p>
      </div>

      {/* ═══ MODAL RECUPERAR CONTRASEÑA ═══════════════════════════════════════ */}
      {modalRecuperar && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-gray-800">🔐 Recuperar contraseña</h2>
                <p className="text-sm text-gray-500 mt-0.5">Ingresa tu usuario y correo registrado</p>
              </div>
              <button onClick={() => setModalRecuperar(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>

            {!enviado ? (
              <form onSubmit={handleRecuperar} className="p-6 space-y-4">
                <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-700">
                  <p>📋 Para restablecer tu contraseña necesitamos verificar tu identidad con:</p>
                  <ul className="mt-1 ml-4 list-disc">
                    <li>Tu nombre de usuario</li>
                    <li>El correo con el que te registraste</li>
                  </ul>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre de usuario *
                  </label>
                  <div className="relative">
                    <input type="text" value={recUsername}
                      onChange={e => setRecUsername(e.target.value.replace(/^@/, ''))}
                      required placeholder="tuusuario"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Correo electrónico *
                  </label>
                  <input type="email" value={recEmail}
                    onChange={e => setRecEmail(e.target.value)}
                    required placeholder="correo@ejemplo.com"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setModalRecuperar(false)}
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                    Cancelar
                  </button>
                  <button type="submit" disabled={enviando}
                    className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50">
                    {enviando ? '⏳ Enviando...' : '📧 Enviar enlace'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-6 text-center space-y-4">
                <div className="text-5xl mb-2">📬</div>
                <h3 className="text-lg font-bold text-gray-800">¡Correo enviado!</h3>
                <p className="text-gray-600 text-sm">
                  Si los datos ingresados coinciden con una cuenta registrada, recibirás un correo
                  con instrucciones para restablecer tu contraseña.
                </p>
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-xs text-yellow-700">
                  ⏰ El enlace es válido por <strong>1 hora</strong>. Revisa también tu carpeta de spam.
                </div>
                <button onClick={() => setModalRecuperar(false)}
                  className="w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                  Entendido
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}