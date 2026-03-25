import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import toast, { Toaster } from 'react-hot-toast';

export default function ResetPassword() {
  const [searchParams]          = useSearchParams();
  const token                   = searchParams.get('token');
  const navigate                = useNavigate();

  const [verificando, setVerificando] = useState(true);
  const [tokenValido, setTokenValido] = useState(false);
  const [infoUsuario, setInfoUsuario] = useState(null);
  const [nueva, setNueva]             = useState('');
  const [confirmar, setConfirmar]     = useState('');
  const [verNueva, setVerNueva]       = useState(false);
  const [verConf, setVerConf]         = useState(false);
  const [guardando, setGuardando]     = useState(false);
  const [exito, setExito]             = useState(false);

  useEffect(() => {
    if (!token) { setVerificando(false); return; }
    api.get(`/auth/reset-password/${token}`)
      .then(r => { setTokenValido(true); setInfoUsuario(r.data); })
      .catch(() => { setTokenValido(false); })
      .finally(() => setVerificando(false));
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (nueva.length < 6)
      return toast.error('La contraseña debe tener al menos 6 caracteres');
    if (nueva !== confirmar)
      return toast.error('Las contraseñas no coinciden');

    setGuardando(true);
    try {
      await api.post('/auth/reset-password', { token, nueva_password: nueva });
      setExito(true);
      toast.success('✅ Contraseña actualizada');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al cambiar contraseña');
    } finally {
      setGuardando(false);
    }
  };

  // Calcular fortaleza de contraseña
  const fortaleza = () => {
    if (!nueva) return null;
    let pts = 0;
    if (nueva.length >= 6)  pts++;
    if (nueva.length >= 10) pts++;
    if (/[A-Z]/.test(nueva)) pts++;
    if (/[0-9]/.test(nueva)) pts++;
    if (/[^A-Za-z0-9]/.test(nueva)) pts++;
    if (pts <= 1) return { label: 'Débil',    color: 'bg-red-500',    w: 'w-1/5' };
    if (pts <= 2) return { label: 'Regular',  color: 'bg-orange-400', w: 'w-2/5' };
    if (pts <= 3) return { label: 'Buena',    color: 'bg-yellow-400', w: 'w-3/5' };
    if (pts <= 4) return { label: 'Fuerte',   color: 'bg-teal-500',   w: 'w-4/5' };
    return               { label: 'Excelente',color: 'bg-green-500',  w: 'w-full' };
  };

  const f = fortaleza();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-teal-700 flex items-center justify-center p-4">
      <Toaster position="top-right" />
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full shadow-lg mb-3">
            <span className="text-3xl">🐾</span>
          </div>
          <h1 className="text-3xl font-bold text-white">VetSystem Pro</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">

          {/* ── VERIFICANDO TOKEN ── */}
          {verificando && (
            <div className="text-center py-8">
              <div className="text-4xl mb-4 animate-pulse">⏳</div>
              <p className="text-gray-500">Verificando enlace...</p>
            </div>
          )}

          {/* ── TOKEN INVÁLIDO ── */}
          {!verificando && !tokenValido && (
            <div className="text-center space-y-4">
              <div className="text-5xl">❌</div>
              <h2 className="text-xl font-bold text-gray-800">Enlace inválido o expirado</h2>
              <p className="text-gray-500 text-sm">
                Este enlace ya fue usado o ha pasado más de 1 hora desde que fue generado.
              </p>
              <button onClick={() => navigate('/login')}
                className="w-full py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium">
                Volver al inicio de sesión
              </button>
            </div>
          )}

          {/* ── ÉXITO ── */}
          {!verificando && tokenValido && exito && (
            <div className="text-center space-y-4">
              <div className="text-6xl">✅</div>
              <h2 className="text-xl font-bold text-gray-800">¡Contraseña actualizada!</h2>
              <p className="text-gray-500 text-sm">
                Tu contraseña ha sido cambiada correctamente.
                Ya puedes iniciar sesión con tu nueva contraseña.
              </p>
              <button onClick={() => navigate('/login')}
                className="w-full py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold">
                🔐 Ir a iniciar sesión
              </button>
            </div>
          )}

          {/* ── FORMULARIO ── */}
          {!verificando && tokenValido && !exito && (
            <>
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Nueva contraseña</h2>
                {infoUsuario && (
                  <p className="text-gray-500 text-sm mt-1">
                    Para <strong>@{infoUsuario.username}</strong> · {infoUsuario.email}
                  </p>
                )}
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Nueva contraseña */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nueva contraseña *
                  </label>
                  <div className="relative">
                    <input type={verNueva ? 'text' : 'password'} value={nueva}
                      onChange={e => setNueva(e.target.value)}
                      required placeholder="Mínimo 6 caracteres"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-12"/>
                    <button type="button" onClick={() => setVerNueva(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {verNueva ? '🙈' : '👁️'}
                    </button>
                  </div>
                  {/* Indicador de fortaleza */}
                  {f && (
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div className={`h-1.5 rounded-full transition-all ${f.color} ${f.w}`}/>
                      </div>
                      <p className={`text-xs mt-1 font-medium ${
                        f.label === 'Débil' ? 'text-red-500' :
                        f.label === 'Regular' ? 'text-orange-500' :
                        f.label === 'Buena' ? 'text-yellow-600' :
                        'text-green-600'
                      }`}>{f.label}</p>
                    </div>
                  )}
                </div>

                {/* Confirmar contraseña */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirmar contraseña *
                  </label>
                  <div className="relative">
                    <input type={verConf ? 'text' : 'password'} value={confirmar}
                      onChange={e => setConfirmar(e.target.value)}
                      required placeholder="Repite la nueva contraseña"
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 pr-12 ${
                        confirmar && nueva !== confirmar
                          ? 'border-red-400 focus:ring-red-400'
                          : confirmar && nueva === confirmar
                          ? 'border-green-400 focus:ring-green-400'
                          : 'border-gray-300 focus:ring-blue-500'
                      }`}/>
                    <button type="button" onClick={() => setVerConf(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {verConf ? '🙈' : '👁️'}
                    </button>
                  </div>
                  {confirmar && nueva !== confirmar && (
                    <p className="text-xs text-red-500 mt-1">❌ Las contraseñas no coinciden</p>
                  )}
                  {confirmar && nueva === confirmar && nueva.length >= 6 && (
                    <p className="text-xs text-green-600 mt-1">✅ Las contraseñas coinciden</p>
                  )}
                </div>

                <button type="submit" disabled={guardando || nueva !== confirmar || nueva.length < 6}
                  className="w-full py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold disabled:opacity-50 transition">
                  {guardando ? '⏳ Guardando...' : '🔐 Cambiar contraseña'}
                </button>
              </form>
            </>
          )}

        </div>

        <p className="text-center text-blue-200 text-sm mt-6">
          © {new Date().getFullYear()} VetSystem Pro
        </p>
      </div>
    </div>
  );
}