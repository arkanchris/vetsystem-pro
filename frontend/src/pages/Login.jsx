import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast, { Toaster } from 'react-hot-toast';

// ── ANIMALES FLOTANTES (emojis que flotan en el fondo) ────────────────────────
const ANIMALES = ['🐶','🐱','🐾','🐕','🐈','🦮','🐩','😸','🐈‍⬛','🦴','❤️','🐾',
                  '🐶','🐱','🐕‍🦺','😺','🐾','🦴','🐩','🐈'];

function AnimalFlotante({ emoji, style }) {
  return (
    <div style={{
      position: 'absolute',
      fontSize: style.size,
      opacity: style.opacity,
      left: style.left,
      top: style.top,
      animation: `flotar ${style.duration}s ease-in-out infinite`,
      animationDelay: style.delay,
      userSelect: 'none',
      pointerEvents: 'none',
      filter: 'blur(0.3px)',
    }}>
      {emoji}
    </div>
  );
}

const animalesConfig = ANIMALES.map((emoji, i) => ({
  emoji,
  style: {
    size:     `${Math.random() * 2 + 1.5}rem`,
    opacity:  Math.random() * 0.15 + 0.08,
    left:     `${Math.random() * 95}%`,
    top:      `${Math.random() * 95}%`,
    duration: Math.random() * 4 + 4,
    delay:    `${Math.random() * 4}s`,
  }
}));

export default function Login() {
  const [login_input, setLoginInput] = useState('');
  const [password,    setPassword]   = useState('');
  const [cargando,    setCargando]   = useState(false);
  const [verPassword, setVerPassword] = useState(false);

  const [modalRecuperar, setModalRecuperar] = useState(false);
  const [recUsername,    setRecUsername]    = useState('');
  const [recEmail,       setRecEmail]       = useState('');
  const [enviando,       setEnviando]       = useState(false);
  const [enviado,        setEnviado]        = useState(false);

  const { login } = useAuth();
  const navigate  = useNavigate();

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
    <>
      {/* ── CSS de la animación ────────────────────────────────────────────── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fredoka+One&family=Nunito:wght@400;600;700;800&display=swap');

        @keyframes flotar {
          0%, 100% { transform: translateY(0px) rotate(-5deg); }
          50%       { transform: translateY(-18px) rotate(5deg); }
        }

        @keyframes aparecer {
          from { opacity: 0; transform: translateY(30px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .login-card {
          animation: aparecer 0.6s ease forwards;
        }

        .titulo-vetsystem {
          font-family: 'Fredoka One', cursive;
          letter-spacing: 1px;
        }

        .subtitulo-login {
          font-family: 'Nunito', sans-serif;
        }
      `}</style>

      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f1f4b 0%, #1a3a6b 30%, #0d4d6b 60%, #0a5c55 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: 'Nunito, sans-serif',
      }}>
        <Toaster position="top-right" />

        {/* ── FONDO: animales flotantes ─────────────────────────────────── */}
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
          {animalesConfig.map((a, i) => (
            <AnimalFlotante key={i} emoji={a.emoji} style={a.style} />
          ))}
        </div>

        {/* ── CARD PRINCIPAL ────────────────────────────────────────────── */}
        <div className="login-card" style={{
          width: '100%',
          maxWidth: '420px',
          position: 'relative',
          zIndex: 10,
        }}>

          {/* Logo y título */}
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            {/* Logo — puedes cambiar el emoji o poner una <img> con tu logo */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '88px',
              height: '88px',
              background: 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(10px)',
              borderRadius: '50%',
              marginBottom: '1rem',
              border: '3px solid rgba(255,255,255,0.3)',
              fontSize: '2.8rem',
            }}>
              🐾
              {/*
                Para poner TU PROPIO LOGO, reemplaza el emoji por:
                <img src="/logo.png" alt="Logo" style={{width:'60px',height:'60px',objectFit:'contain',borderRadius:'50%'}} />
                Y sube tu logo a la carpeta frontend/public/ con el nombre logo.png
              */}
            </div>

            {/* Título con fuente especial */}
            <h1 className="titulo-vetsystem" style={{
              fontSize: '2.4rem',
              color: '#ffffff',
              margin: 0,
              textShadow: '0 2px 10px rgba(0,0,0,0.3)',
            }}>
              VetSystem Pro
              {/*
                Para cambiar la fuente, cambia 'Fredoka One' por cualquiera de estas:
                'Pacifico' — redondeada y amigable
                'Righteous' — moderna y tecnológica
                'Baloo 2' — amigable con animales
                Solo actualiza el @import al inicio del <style> con la nueva fuente
              */}
            </h1>
            <p className="subtitulo-login" style={{
              color: 'rgba(255,255,255,0.75)',
              fontSize: '0.95rem',
              marginTop: '0.3rem',
            }}>
              Sistema de Gestión Veterinaria
            </p>
          </div>

          {/* Formulario */}
          <div style={{
            background: 'rgba(255,255,255,0.97)',
            borderRadius: '20px',
            padding: '2rem',
            boxShadow: '0 25px 60px rgba(0,0,0,0.35)',
          }}>
            <h2 style={{
              fontFamily: 'Nunito, sans-serif',
              fontWeight: 800,
              fontSize: '1.4rem',
              color: '#1e2d5a',
              textAlign: 'center',
              marginBottom: '1.5rem',
            }}>
              Iniciar Sesión
            </h2>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display:'block', fontSize:'0.875rem', fontWeight:600, color:'#374151', marginBottom:'0.4rem' }}>
                  Usuario
                </label>
                <input
                  type="text"
                  value={login_input}
                  onChange={e => setLoginInput(e.target.value)}
                  required
                  autoComplete="username"
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    border: '2px solid #e5e7eb',
                    borderRadius: '10px',
                    fontSize: '1rem',
                    fontFamily: 'Nunito, sans-serif',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => e.target.style.borderColor='#3b82f6'}
                  onBlur={e  => e.target.style.borderColor='#e5e7eb'}
                />
              </div>

              <div>
                <label style={{ display:'block', fontSize:'0.875rem', fontWeight:600, color:'#374151', marginBottom:'0.4rem' }}>
                  Contraseña
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={verPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    style={{
                      width: '100%',
                      padding: '0.75rem 3rem 0.75rem 1rem',
                      border: '2px solid #e5e7eb',
                      borderRadius: '10px',
                      fontSize: '1rem',
                      fontFamily: 'Nunito, sans-serif',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                    onFocus={e => e.target.style.borderColor='#3b82f6'}
                    onBlur={e  => e.target.style.borderColor='#e5e7eb'}
                  />
                  <button
                    type="button"
                    onClick={() => setVerPassword(v => !v)}
                    style={{
                      position:'absolute', right:'0.75rem', top:'50%',
                      transform:'translateY(-50%)', background:'none', border:'none',
                      cursor:'pointer', fontSize:'1.2rem', color:'#9ca3af',
                    }}>
                    {verPassword ? '🙈' : '👁️'}
                  </button>
                </div>
                <div style={{ textAlign:'right', marginTop:'0.3rem' }}>
                  <button type="button"
                    onClick={() => { setModalRecuperar(true); setEnviado(false); setRecUsername(''); setRecEmail(''); }}
                    style={{ background:'none', border:'none', color:'#3b82f6', fontSize:'0.8rem', cursor:'pointer' }}>
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={cargando}
                style={{
                  width: '100%',
                  padding: '0.85rem',
                  background: cargando ? '#93c5fd' : 'linear-gradient(135deg, #1e3a8a, #2563eb)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '1rem',
                  fontFamily: 'Nunito, sans-serif',
                  fontWeight: 700,
                  cursor: cargando ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 15px rgba(37,99,235,0.4)',
                  transition: 'all 0.2s',
                  marginTop: '0.5rem',
                }}>
                {cargando ? '⏳ Ingresando...' : '🔐 Ingresar'}
              </button>
            </form>
          </div>

          <p style={{ textAlign:'center', color:'rgba(255,255,255,0.5)', fontSize:'0.8rem', marginTop:'1.5rem' }}>
            © {new Date().getFullYear()} VetSystem Pro — Todos los derechos reservados
          </p>
        </div>

        {/* ── MODAL RECUPERAR CONTRASEÑA ─────────────────────────────────── */}
        {modalRecuperar && (
          <div style={{
            position:'fixed', inset:0, background:'rgba(0,0,0,0.6)',
            display:'flex', alignItems:'center', justifyContent:'center',
            zIndex:50, padding:'1rem',
          }}>
            <div style={{
              background:'#fff', borderRadius:'20px', width:'100%',
              maxWidth:'440px', boxShadow:'0 25px 60px rgba(0,0,0,0.4)',
            }}>
              <div style={{ padding:'1.5rem 1.5rem 1rem', borderBottom:'1px solid #e5e7eb', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <h2 style={{ fontWeight:700, fontSize:'1.1rem', color:'#1e2d5a', margin:0 }}>🔐 Recuperar contraseña</h2>
                  <p style={{ fontSize:'0.85rem', color:'#6b7280', margin:'0.2rem 0 0' }}>Ingresa tu usuario y correo registrado</p>
                </div>
                <button onClick={() => setModalRecuperar(false)}
                  style={{ background:'none', border:'none', fontSize:'1.5rem', cursor:'pointer', color:'#9ca3af' }}>×</button>
              </div>

              {!enviado ? (
                <form onSubmit={handleRecuperar} style={{ padding:'1.5rem', display:'flex', flexDirection:'column', gap:'1rem' }}>
                  <div style={{ background:'#eff6ff', borderRadius:'10px', padding:'0.75rem 1rem', fontSize:'0.85rem', color:'#1d4ed8' }}>
                    📋 Necesitamos tu nombre de usuario y correo registrado para verificar tu identidad.
                  </div>
                  {[
                    ['text',  recUsername, setRecUsername, 'Nombre de usuario *', 'tuusuario'],
                    ['email', recEmail,    setRecEmail,    'Correo electrónico *', 'correo@ejemplo.com'],
                  ].map(([type, val, setVal, label, ph]) => (
                    <div key={label}>
                      <label style={{ display:'block', fontSize:'0.875rem', fontWeight:600, color:'#374151', marginBottom:'0.3rem' }}>{label}</label>
                      <input type={type} value={val} onChange={e => setVal(e.target.value)} required placeholder={ph}
                        style={{ width:'100%', padding:'0.65rem 1rem', border:'2px solid #e5e7eb', borderRadius:'10px', fontSize:'0.95rem', fontFamily:'Nunito,sans-serif', outline:'none', boxSizing:'border-box' }}
                        onFocus={e=>e.target.style.borderColor='#3b82f6'}
                        onBlur={e=>e.target.style.borderColor='#e5e7eb'}
                      />
                    </div>
                  ))}
                  <div style={{ display:'flex', gap:'0.75rem', paddingTop:'0.5rem' }}>
                    <button type="button" onClick={() => setModalRecuperar(false)}
                      style={{ flex:1, padding:'0.65rem', border:'2px solid #e5e7eb', borderRadius:'10px', background:'#fff', cursor:'pointer', fontFamily:'Nunito,sans-serif', fontWeight:600 }}>
                      Cancelar
                    </button>
                    <button type="submit" disabled={enviando}
                      style={{ flex:1, padding:'0.65rem', background:'#2563eb', color:'#fff', border:'none', borderRadius:'10px', cursor:'pointer', fontFamily:'Nunito,sans-serif', fontWeight:700 }}>
                      {enviando ? '⏳ Enviando...' : '📧 Enviar enlace'}
                    </button>
                  </div>
                </form>
              ) : (
                <div style={{ padding:'2rem', textAlign:'center' }}>
                  <div style={{ fontSize:'3rem', marginBottom:'0.5rem' }}>📬</div>
                  <h3 style={{ fontWeight:700, color:'#1e2d5a', marginBottom:'0.5rem' }}>¡Correo enviado!</h3>
                  <p style={{ color:'#6b7280', fontSize:'0.9rem', marginBottom:'1rem' }}>
                    Si los datos coinciden con una cuenta registrada, recibirás un correo con instrucciones.
                  </p>
                  <button onClick={() => setModalRecuperar(false)}
                    style={{ width:'100%', padding:'0.75rem', background:'#2563eb', color:'#fff', border:'none', borderRadius:'10px', cursor:'pointer', fontFamily:'Nunito,sans-serif', fontWeight:700 }}>
                    Entendido
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}