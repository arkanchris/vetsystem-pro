import { useState, useEffect } from 'react';
import api from '../services/api';
import toast, { Toaster } from 'react-hot-toast';

const NIVEL_COLOR = {
  basico:        'bg-green-100 text-green-700',
  intermedio:    'bg-blue-100 text-blue-700',
  avanzado:      'bg-purple-100 text-purple-700',
  especializado: 'bg-red-100 text-red-700',
};
const ESTADO_MATRICULA = {
  activo:    'bg-teal-100 text-teal-700',
  pausado:   'bg-yellow-100 text-yellow-700',
  graduado:  'bg-purple-100 text-purple-700',
  abandonado:'bg-gray-100 text-gray-500',
};
const COMPORTAMIENTO_COLOR = {
  excelente:   'text-green-600',
  bueno:       'text-teal-600',
  normal:      'text-gray-600',
  dificil:     'text-orange-600',
  muy_dificil: 'text-red-600',
};
const NIVEL_LOGRO = { 1:'🌱 Iniciado', 2:'📈 En progreso', 3:'⭐ Dominado' };

export default function Adiestramiento() {
  const [tab, setTab]                   = useState('matriculas');
  const [matriculas, setMatriculas]     = useState([]);
  const [programas, setProgramas]       = useState([]);
  const [habilidades, setHabilidades]   = useState([]);
  const [pacientes, setPacientes]       = useState([]);
  const [matriculaSel, setMatriculaSel] = useState(null);
  const [cargando, setCargando]         = useState(true);
  const [filtroEstado, setFiltroEstado] = useState('activo');

  // Modales
  const [modalMatricula,   setModalMatricula]   = useState(false);
  const [modalSesion,      setModalSesion]       = useState(false);
  const [modalPrograma,    setModalPrograma]     = useState(false);
  const [modalHabilidades, setModalHabilidades] = useState(false);
  const [editandoPrograma,  setEditandoPrograma]  = useState(null);
  const [editandoHabilidad, setEditandoHabilidad] = useState(null);

  // Forms
  const [formMatricula, setFormMatricula] = useState({
    paciente_id:'', programa_id:'', entrenador_id:'', fecha_inicio:'', precio_acordado:'', notas_generales:''
  });
  const [formSesion, setFormSesion] = useState({
    fecha:'', duracion_minutos:60, comportamiento:'normal', descripcion:'', notas:''
  });
  const [formPrograma, setFormPrograma] = useState({
    nombre:'', descripcion:'', nivel:'basico', duracion_semanas:4, sesiones_total:8, precio:''
  });
  const [formHabilidad, setFormHabilidad] = useState({ nombre:'', categoria:'' });

  useEffect(() => { cargarDatos(); }, []);

  const cargarDatos = async () => {
    try {
      const [mat, prog, hab, pac] = await Promise.all([
        api.get('/adiestramiento/matriculas', { params: { estado: filtroEstado } }),
        api.get('/adiestramiento/programas'),
        api.get('/adiestramiento/habilidades'),
        api.get('/pacientes'),
      ]);
      setMatriculas(mat.data);
      setProgramas(prog.data);
      setHabilidades(hab.data);
      setPacientes(pac.data);
    } catch { toast.error('Error al cargar datos'); }
    finally { setCargando(false); }
  };

  const cargarMatricula = async (id) => {
    try {
      const r = await api.get(`/adiestramiento/matriculas/${id}`);
      setMatriculaSel(r.data);
    } catch { toast.error('Error'); }
  };

  useEffect(() => {
    if (tab === 'matriculas') cargarDatos();
  }, [filtroEstado]);

  // ── MATRÍCULAS ──────────────────────────────────────────────────────────────
  const handleSubmitMatricula = async (e) => {
    e.preventDefault();
    try {
      await api.post('/adiestramiento/matriculas', formMatricula);
      toast.success('✅ Matrícula registrada');
      setModalMatricula(false);
      await cargarDatos();
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  const actualizarEstadoMatricula = async (id, estado) => {
    try {
      await api.put(`/adiestramiento/matriculas/${id}`, { estado });
      toast.success('✅ Estado actualizado');
      await cargarDatos();
      if (matriculaSel?.id === id) await cargarMatricula(id);
    } catch { toast.error('Error'); }
  };

  // ── SESIONES ────────────────────────────────────────────────────────────────
  const handleSubmitSesion = async (e) => {
    e.preventDefault();
    try {
      await api.post('/adiestramiento/sesiones', { ...formSesion, matricula_id: matriculaSel.id });
      toast.success('✅ Sesión registrada');
      setModalSesion(false);
      await cargarMatricula(matriculaSel.id);
      await cargarDatos();
    } catch { toast.error('Error'); }
  };

  const eliminarSesion = async (sesionId) => {
    if (!confirm('¿Eliminar esta sesión?')) return;
    try {
      await api.delete(`/adiestramiento/sesiones/${sesionId}`);
      toast.success('✅ Eliminada');
      await cargarMatricula(matriculaSel.id);
    } catch { toast.error('Error'); }
  };

  // ── LOGROS ──────────────────────────────────────────────────────────────────
  const setLogro = async (habilidadId, nivel) => {
    // 1. Actualizar visualmente de inmediato (optimistic update)
    setMatriculaSel(prev => {
      if (!prev) return prev;
      const logroExistente = prev.logros?.find(l => l.habilidad_id === habilidadId);
      let nuevosLogros;
      if (logroExistente) {
        nuevosLogros = prev.logros.map(l =>
          l.habilidad_id === habilidadId ? { ...l, nivel_dominio: nivel } : l
        );
      } else {
        nuevosLogros = [...(prev.logros || []), { habilidad_id: habilidadId, nivel_dominio: nivel }];
      }
      return { ...prev, logros: nuevosLogros };
    });
    // 2. Guardar en backend
    try {
      await api.post('/adiestramiento/logros', {
        matricula_id: matriculaSel.id,
        habilidad_id: habilidadId,
        nivel_dominio: nivel,
      });
      toast.success('✅ Logro actualizado');
    } catch {
      toast.error('Error al guardar');
      await cargarMatricula(matriculaSel.id); // revertir si falla
    }
  };

  const quitarLogro = async (habilidadId) => {
    // 1. Quitar visualmente de inmediato
    setMatriculaSel(prev => {
      if (!prev) return prev;
      return { ...prev, logros: (prev.logros || []).filter(l => l.habilidad_id !== habilidadId) };
    });
    // 2. Guardar en backend
    try {
      await api.delete(`/adiestramiento/logros/${matriculaSel.id}/${habilidadId}`);
      toast.success('✅ Logro eliminado');
    } catch {
      toast.error('Error al eliminar');
      await cargarMatricula(matriculaSel.id); // revertir si falla
    }
  };

  const getLogroNivel = (matricula, habilidadId) =>
    matricula?.logros?.find(l => l.habilidad_id === habilidadId)?.nivel_dominio || 0;

  // ── PROGRAMAS ───────────────────────────────────────────────────────────────
  const handleSubmitPrograma = async (e) => {
    e.preventDefault();
    try {
      if (editandoPrograma) {
        await api.put(`/adiestramiento/programas/${editandoPrograma.id}`, formPrograma);
        toast.success('✅ Programa actualizado');
      } else {
        await api.post('/adiestramiento/programas', formPrograma);
        toast.success('✅ Programa creado');
      }
      setModalPrograma(false);
      const r = await api.get('/adiestramiento/programas');
      setProgramas(r.data);
    } catch { toast.error('Error'); }
  };

  // ── HABILIDADES ─────────────────────────────────────────────────────────────
  const handleSubmitHabilidad = async (e) => {
    e.preventDefault();
    try {
      if (editandoHabilidad) {
        await api.put(`/adiestramiento/habilidades/${editandoHabilidad.id}`, formHabilidad);
        toast.success('✅ Habilidad actualizada');
      } else {
        await api.post('/adiestramiento/habilidades', formHabilidad);
        toast.success('✅ Habilidad creada');
      }
      setEditandoHabilidad(null);
      setFormHabilidad({ nombre:'', categoria:'' });
      const r = await api.get('/adiestramiento/habilidades');
      setHabilidades(r.data);
    } catch { toast.error('Error al guardar habilidad'); }
  };

  const eliminarHabilidad = async (id) => {
    if (!confirm('¿Eliminar esta habilidad? Se eliminarán también los logros asociados.')) return;
    try {
      await api.delete(`/adiestramiento/habilidades/${id}`);
      toast.success('✅ Habilidad eliminada');
      const r = await api.get('/adiestramiento/habilidades');
      setHabilidades(r.data);
      if (matriculaSel) await cargarMatricula(matriculaSel.id);
    } catch { toast.error('Error'); }
  };

  const categorias = [...new Set(habilidades.map(h => h.categoria))];

  return (
    <div className="p-6">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">🎓 Adiestramiento</h1>
          <p className="text-gray-500">Escuela de entrenamiento canino</p>
        </div>
        <div className="flex gap-2">
          {tab === 'matriculas' && (
            <button onClick={() => setModalMatricula(true)}
              className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl font-medium">
              + Nueva Matrícula
            </button>
          )}
          {tab === 'programas' && (
            <div className="flex gap-2">
              <button onClick={() => setModalHabilidades(true)}
                className="bg-teal-100 text-teal-700 px-4 py-2.5 rounded-xl font-medium text-sm hover:bg-teal-200 border border-teal-200">
                🏆 Gestionar Habilidades
              </button>
              <button onClick={() => {
                setEditandoPrograma(null);
                setFormPrograma({ nombre:'', descripcion:'', nivel:'basico', duracion_semanas:4, sesiones_total:8, precio:'' });
                setModalPrograma(true);
              }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium">
                + Nuevo Programa
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-white rounded-xl shadow p-2 w-fit">
        {[['matriculas','📋 Matrículas'],['programas','📚 Programas']].map(([k,l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-5 py-2 rounded-lg font-medium text-sm transition ${tab===k?'bg-teal-600 text-white':'text-gray-600 hover:bg-gray-100'}`}>
            {l}
          </button>
        ))}
      </div>

      {/* ═══ TAB MATRÍCULAS ══════════════════════════════════════════════════ */}
      {tab === 'matriculas' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Lista alumnos */}
          <div className="lg:col-span-4">
            <div className="bg-white rounded-2xl shadow p-4">
              <div className="flex justify-between items-center mb-3">
                <h2 className="font-bold text-gray-800">Alumnos</h2>
                <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none">
                  <option value="">Todos</option>
                  <option value="activo">Activos</option>
                  <option value="graduado">Graduados</option>
                  <option value="pausado">Pausados</option>
                  <option value="abandonado">Abandonados</option>
                </select>
              </div>

              {cargando ? (
                <div className="text-center py-8 text-gray-400">⏳</div>
              ) : matriculas.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-3xl mb-2">🎓</p>
                  <p className="text-sm">Sin matrículas</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[65vh] overflow-y-auto pr-1">
                  {matriculas.map(m => (
                    <button key={m.id} onClick={() => cargarMatricula(m.id)}
                      className={`w-full text-left rounded-xl p-3 border-2 transition ${
                        matriculaSel?.id===m.id ? 'border-teal-500 bg-teal-50' : 'border-gray-100 hover:border-teal-200'
                      }`}>
                      <div className="flex items-center gap-3">
                        {m.foto_url
                          ? <img src={`http://localhost:5000${m.foto_url}`} className="w-10 h-10 rounded-full object-cover border flex-shrink-0" alt=""/>
                          : <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-xl flex-shrink-0">🐾</div>}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-800 text-sm truncate">{m.paciente_nombre}</p>
                          <p className="text-xs text-gray-500 truncate">{m.programa_nombre}</p>
                          <div className="flex items-center gap-1 mt-1">
                            <span className={`text-xs px-1.5 py-0.5 rounded-full ${ESTADO_MATRICULA[m.estado]}`}>{m.estado}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded-full ${NIVEL_COLOR[m.nivel]}`}>{m.nivel}</span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-2">
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                          <span>{m.sesiones_completadas}/{m.sesiones_total} sesiones</span>
                          <span>{m.progreso_porcentaje}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div className="bg-teal-500 h-1.5 rounded-full" style={{width:`${m.progreso_porcentaje}%`}}/>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Detalle matrícula */}
          <div className="lg:col-span-8">
            {!matriculaSel ? (
              <div className="bg-white rounded-2xl shadow p-12 text-center">
                <div className="text-6xl mb-4">👈</div>
                <p className="text-gray-500">Selecciona un alumno para ver su expediente</p>
              </div>
            ) : (
              <div className="space-y-4">

                {/* Header alumno */}
                <div className="bg-white rounded-2xl shadow p-5">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                      {matriculaSel.foto_url
                        ? <img src={`http://localhost:5000${matriculaSel.foto_url}`} className="w-16 h-16 rounded-full object-cover border-2 border-teal-200" alt=""/>
                        : <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center text-3xl">🐾</div>}
                      <div>
                        <h2 className="text-xl font-bold text-gray-800">{matriculaSel.paciente_nombre}</h2>
                        <p className="text-sm text-gray-500">
                          {matriculaSel.programa_nombre} ·{' '}
                          <span className={`text-xs px-2 py-0.5 rounded-full ${NIVEL_COLOR[matriculaSel.nivel]}`}>{matriculaSel.nivel}</span>
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          📅 Inicio: {new Date(matriculaSel.fecha_inicio).toLocaleDateString('es-CO')}
                          {matriculaSel.fecha_fin_estimada && ` · Fin est: ${new Date(matriculaSel.fecha_fin_estimada).toLocaleDateString('es-CO')}`}
                        </p>
                        {matriculaSel.entrenador_nombre && (
                          <p className="text-xs text-gray-400">👨‍🏫 {matriculaSel.entrenador_nombre}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <select value={matriculaSel.estado}
                        onChange={e => actualizarEstadoMatricula(matriculaSel.id, e.target.value)}
                        className={`text-xs px-3 py-1 rounded-full border-0 font-medium ${ESTADO_MATRICULA[matriculaSel.estado]} focus:outline-none cursor-pointer`}>
                        <option value="activo">Activo</option>
                        <option value="pausado">Pausado</option>
                        <option value="graduado">Graduado 🎓</option>
                        <option value="abandonado">Abandonado</option>
                      </select>
                      <p className="text-2xl font-bold text-teal-600 mt-2">{matriculaSel.progreso_porcentaje}%</p>
                      <p className="text-xs text-gray-400">{matriculaSel.sesiones_completadas}/{matriculaSel.sesiones_total} sesiones</p>
                    </div>
                  </div>
                  <div className="mt-4 w-full bg-gray-200 rounded-full h-3">
                    <div className="bg-gradient-to-r from-teal-400 to-teal-600 h-3 rounded-full transition-all"
                      style={{width:`${matriculaSel.progreso_porcentaje}%`}}/>
                  </div>
                </div>

                {/* Logros por categoría */}
                <div className="bg-white rounded-2xl shadow p-5">
                  <h3 className="font-bold text-gray-800 mb-4">🏆 Habilidades y Logros</h3>
                  <p className="text-xs text-gray-400 mb-3">Clic en una habilidad para avanzar el nivel · × para quitar el logro</p>
                  <div className="space-y-4">
                    {categorias.map(cat => (
                      <div key={cat}>
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">{cat}</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {habilidades.filter(h => h.categoria === cat).map(h => {
                            const nivel = getLogroNivel(matriculaSel, h.id);
                            return (
                              <div key={h.id} className={`p-3 rounded-xl border-2 text-xs transition ${
                                nivel===3 ? 'border-yellow-400 bg-yellow-50' :
                                nivel===2 ? 'border-blue-400 bg-blue-50' :
                                nivel===1 ? 'border-green-400 bg-green-50' :
                                'border-gray-200 bg-white hover:border-teal-300'
                              }`}>
                                {/* Nombre + botón quitar/iniciar */}
                                <div className="flex justify-between items-center mb-2">
                                  <p className="font-semibold text-gray-800 truncate flex-1 text-xs leading-tight">{h.nombre}</p>
                                  {nivel > 0 ? (
                                    <button onClick={() => quitarLogro(h.id)}
                                      className="ml-2 w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center hover:bg-red-400 flex-shrink-0 transition"
                                      title="Quitar logro — clic para eliminar">✓</button>
                                  ) : (
                                    <button onClick={() => setLogro(h.id, 1)}
                                      className="ml-2 w-5 h-5 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center hover:bg-teal-500 hover:text-white flex-shrink-0 transition font-bold"
                                      title="Clic para iniciar">+</button>
                                  )}
                                </div>

                                {/* Niveles — 3 botones grandes con texto */}
                                {nivel > 0 ? (
                                  <div className="flex gap-1">
                                    <button onClick={() => setLogro(h.id, 1)}
                                      className={`flex-1 py-1 px-1 rounded-lg text-xs font-semibold transition border ${
                                        nivel===1
                                          ? 'bg-green-500 text-white border-green-600 shadow-sm'
                                          : 'bg-white text-gray-400 border-gray-200 hover:border-green-300 hover:text-green-600'
                                      }`}>
                                      🌱 Iniciado
                                    </button>
                                    <button onClick={() => setLogro(h.id, 2)}
                                      className={`flex-1 py-1 px-1 rounded-lg text-xs font-semibold transition border ${
                                        nivel===2
                                          ? 'bg-blue-500 text-white border-blue-600 shadow-sm'
                                          : 'bg-white text-gray-400 border-gray-200 hover:border-blue-300 hover:text-blue-600'
                                      }`}>
                                      📈 Progreso
                                    </button>
                                    <button onClick={() => setLogro(h.id, 3)}
                                      className={`flex-1 py-1 px-1 rounded-lg text-xs font-semibold transition border ${
                                        nivel===3
                                          ? 'bg-yellow-500 text-white border-yellow-600 shadow-sm'
                                          : 'bg-white text-gray-400 border-gray-200 hover:border-yellow-300 hover:text-yellow-600'
                                      }`}>
                                      ⭐ Dominado
                                    </button>
                                  </div>
                                ) : (
                                  <p className="text-gray-400 italic">Sin iniciar · presiona + para comenzar</p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sesiones */}
                <div className="bg-white rounded-2xl shadow p-5">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-gray-800">📅 Sesiones ({matriculaSel.sesiones?.length||0})</h3>
                    <button onClick={() => {
                      setFormSesion({ fecha:'', duracion_minutos:60, comportamiento:'normal', descripcion:'', notas:'' });
                      setModalSesion(true);
                    }} className="bg-teal-100 text-teal-700 text-xs px-3 py-1.5 rounded-lg hover:bg-teal-200 font-medium">
                      + Registrar sesión
                    </button>
                  </div>
                  {(!matriculaSel.sesiones || matriculaSel.sesiones.length === 0) ? (
                    <p className="text-center text-gray-400 py-4 text-sm">Sin sesiones registradas</p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {matriculaSel.sesiones.map(s => (
                        <div key={s.id} className="flex justify-between items-start bg-gray-50 rounded-lg p-3 border">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-gray-800">{new Date(s.fecha).toLocaleDateString('es-CO')}</p>
                              <span className={`text-xs font-medium ${COMPORTAMIENTO_COLOR[s.comportamiento]}`}>
                                ● {s.comportamiento?.replace('_',' ')}
                              </span>
                              <span className="text-xs text-gray-400">⏱️ {s.duracion_minutos}min</span>
                            </div>
                            {s.descripcion && <p className="text-xs text-gray-500 mt-1">{s.descripcion}</p>}
                            {s.notas && <p className="text-xs text-gray-400 italic mt-0.5">{s.notas}</p>}
                          </div>
                          <button onClick={() => eliminarSesion(s.id)}
                            className="text-red-400 hover:text-red-600 text-xs ml-2 flex-shrink-0">🗑️</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ TAB PROGRAMAS ═══════════════════════════════════════════════════ */}
      {tab === 'programas' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {programas.map(p => (
            <div key={p.id} className="bg-white rounded-2xl shadow p-5">
              <div className="flex justify-between items-start mb-3">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${NIVEL_COLOR[p.nivel]}`}>{p.nivel}</span>
                <button onClick={() => { setEditandoPrograma(p); setFormPrograma({...p}); setModalPrograma(true); }}
                  className="text-gray-400 hover:text-yellow-500">✏️</button>
              </div>
              <h3 className="font-bold text-gray-800 mb-1">{p.nombre}</h3>
              {p.descripcion && <p className="text-sm text-gray-500 mb-3">{p.descripcion}</p>}
              <div className="grid grid-cols-3 gap-2 text-center text-xs border-t pt-3">
                <div><p className="text-gray-400">Semanas</p><p className="font-bold text-gray-800">{p.duracion_semanas}</p></div>
                <div><p className="text-gray-400">Sesiones</p><p className="font-bold text-gray-800">{p.sesiones_total}</p></div>
                <div><p className="text-gray-400">Precio</p><p className="font-bold text-teal-600">${parseFloat(p.precio).toLocaleString('es-CO')}</p></div>
              </div>
            </div>
          ))}
          {programas.length === 0 && (
            <div className="col-span-3 text-center py-10 text-gray-400">
              <p className="text-4xl mb-2">📚</p>
              <p>No hay programas creados</p>
            </div>
          )}
        </div>
      )}

      {/* ═══ MODAL MATRÍCULA ══════════════════════════════════════════════════ */}
      {modalMatricula && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b"><h2 className="text-lg font-bold">🎓 Nueva Matrícula</h2></div>
            <form onSubmit={handleSubmitMatricula} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Paciente *</label>
                <select value={formMatricula.paciente_id}
                  onChange={e => setFormMatricula(p=>({...p,paciente_id:e.target.value}))}
                  required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500">
                  <option value="">Seleccionar</option>
                  {pacientes.map(p => <option key={p.id} value={p.id}>{p.nombre} ({p.especie})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Programa *</label>
                <select value={formMatricula.programa_id}
                  onChange={e => {
                    const prog = programas.find(p => p.id === parseInt(e.target.value));
                    setFormMatricula(p => ({...p, programa_id: e.target.value, precio_acordado: prog?.precio||''}));
                  }}
                  required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500">
                  <option value="">Seleccionar</option>
                  {programas.map(p => <option key={p.id} value={p.id}>{p.nombre} — {p.nivel}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha inicio *</label>
                  <input type="date" value={formMatricula.fecha_inicio}
                    onChange={e => setFormMatricula(p=>({...p,fecha_inicio:e.target.value}))}
                    required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Precio acordado</label>
                  <input type="number" value={formMatricula.precio_acordado}
                    onChange={e => setFormMatricula(p=>({...p,precio_acordado:e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"/>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                <textarea value={formMatricula.notas_generales}
                  onChange={e => setFormMatricula(p=>({...p,notas_generales:e.target.value}))}
                  rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"/>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalMatricula(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancelar</button>
                <button type="submit"
                  className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium">Matricular</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ MODAL SESIÓN ═════════════════════════════════════════════════════ */}
      {modalSesion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b"><h2 className="text-lg font-bold">📅 Registrar Sesión</h2></div>
            <form onSubmit={handleSubmitSesion} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha *</label>
                  <input type="date" value={formSesion.fecha}
                    onChange={e => setFormSesion(p=>({...p,fecha:e.target.value}))}
                    required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duración (min)</label>
                  <input type="number" value={formSesion.duracion_minutos}
                    onChange={e => setFormSesion(p=>({...p,duracion_minutos:e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"/>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Comportamiento</label>
                <select value={formSesion.comportamiento}
                  onChange={e => setFormSesion(p=>({...p,comportamiento:e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500">
                  {[['excelente','⭐ Excelente'],['bueno','👍 Bueno'],['normal','😐 Normal'],
                    ['dificil','😬 Difícil'],['muy_dificil','😰 Muy difícil']].map(([k,l]) => (
                    <option key={k} value={k}>{l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción de la sesión *</label>
                <textarea value={formSesion.descripcion}
                  onChange={e => setFormSesion(p=>({...p,descripcion:e.target.value}))}
                  required rows={3} placeholder="¿Qué se trabajó? ¿Cómo respondió el perro?"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas adicionales</label>
                <textarea value={formSesion.notas}
                  onChange={e => setFormSesion(p=>({...p,notas:e.target.value}))}
                  rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"/>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalSesion(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancelar</button>
                <button type="submit"
                  className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium">Registrar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ MODAL PROGRAMA ═══════════════════════════════════════════════════ */}
      {modalPrograma && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b">
              <h2 className="text-lg font-bold">{editandoPrograma ? '✏️ Editar Programa' : '📚 Nuevo Programa'}</h2>
            </div>
            <form onSubmit={handleSubmitPrograma} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input value={formPrograma.nombre}
                  onChange={e => setFormPrograma(p=>({...p,nombre:e.target.value}))}
                  required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea value={formPrograma.descripcion}
                  onChange={e => setFormPrograma(p=>({...p,descripcion:e.target.value}))}
                  rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nivel</label>
                  <select value={formPrograma.nivel}
                    onChange={e => setFormPrograma(p=>({...p,nivel:e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="basico">Básico</option>
                    <option value="intermedio">Intermedio</option>
                    <option value="avanzado">Avanzado</option>
                    <option value="especializado">Especializado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Precio</label>
                  <input type="number" value={formPrograma.precio}
                    onChange={e => setFormPrograma(p=>({...p,precio:e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Semanas</label>
                  <input type="number" value={formPrograma.duracion_semanas}
                    onChange={e => setFormPrograma(p=>({...p,duracion_semanas:e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sesiones total</label>
                  <input type="number" value={formPrograma.sesiones_total}
                    onChange={e => setFormPrograma(p=>({...p,sesiones_total:e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalPrograma(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancelar</button>
                <button type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium">
                  {editandoPrograma ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ MODAL GESTIÓN HABILIDADES ════════════════════════════════════════ */}
      {modalHabilidades && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b flex justify-between items-center">
              <h2 className="text-lg font-bold">🏆 Gestionar Habilidades</h2>
              <button onClick={() => {
                setModalHabilidades(false);
                setEditandoHabilidad(null);
                setFormHabilidad({ nombre:'', categoria:'' });
              }} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>
            <div className="p-5 space-y-5">

              {/* Form nueva/editar habilidad */}
              <form onSubmit={handleSubmitHabilidad}
                className="bg-teal-50 border border-teal-200 rounded-xl p-4">
                <p className="text-sm font-semibold text-teal-700 mb-3">
                  {editandoHabilidad ? '✏️ Editar habilidad' : '➕ Nueva habilidad'}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Nombre *</label>
                    <input value={formHabilidad.nombre}
                      onChange={e => setFormHabilidad(p=>({...p,nombre:e.target.value}))}
                      required placeholder="Ej: Sentado, Quieto, Talón..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"/>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Categoría</label>
                    <input value={formHabilidad.categoria}
                      onChange={e => setFormHabilidad(p=>({...p,categoria:e.target.value}))}
                      placeholder="obediencia, socialización..."
                      list="categorias-list"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"/>
                    <datalist id="categorias-list">
                      {categorias.map(cat => <option key={cat} value={cat}/>)}
                    </datalist>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  {editandoHabilidad && (
                    <button type="button"
                      onClick={() => { setEditandoHabilidad(null); setFormHabilidad({ nombre:'', categoria:'' }); }}
                      className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                      Cancelar edición
                    </button>
                  )}
                  <button type="submit"
                    className="px-4 py-1.5 bg-teal-600 text-white rounded-lg text-sm hover:bg-teal-700 font-medium">
                    {editandoHabilidad ? '💾 Actualizar' : '+ Agregar'}
                  </button>
                </div>
              </form>

              {/* Lista habilidades por categoría */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-3">
                  Habilidades registradas ({habilidades.length})
                </p>
                {categorias.length === 0 ? (
                  <p className="text-center text-gray-400 text-sm py-4">Sin habilidades registradas</p>
                ) : (
                  <div className="space-y-4">
                    {categorias.map(cat => (
                      <div key={cat}>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{cat}</p>
                        <div className="space-y-1">
                          {habilidades.filter(h => h.categoria === cat).map(h => (
                            <div key={h.id}
                              className="flex justify-between items-center bg-gray-50 rounded-lg px-3 py-2 border">
                              <p className="text-sm text-gray-800">{h.nombre}</p>
                              <div className="flex gap-1">
                                <button onClick={() => {
                                  setEditandoHabilidad(h);
                                  setFormHabilidad({ nombre: h.nombre, categoria: h.categoria });
                                }} className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-xs hover:bg-yellow-200">
                                  ✏️
                                </button>
                                <button onClick={() => eliminarHabilidad(h.id)}
                                  className="bg-red-100 text-red-600 px-2 py-0.5 rounded text-xs hover:bg-red-200">
                                  🗑️
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}