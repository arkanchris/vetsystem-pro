import { useState, useEffect } from 'react';
import api from '../services/api';
import toast, { Toaster } from 'react-hot-toast';

const ESTADOS = {
  disponible:     { label: 'Disponible',        color: 'bg-green-100 text-green-700',  icono: '✅', desc: 'Listo para ser adoptado' },
  en_hogar:       { label: 'En Hogar de Paso',  color: 'bg-yellow-100 text-yellow-700', icono: '🏠', desc: 'Alojado temporalmente' },
  en_tratamiento: { label: 'En Tratamiento',    color: 'bg-red-100 text-red-700',       icono: '🏥', desc: 'Recibiendo atención médica' },
  adoptado:       { label: 'Adoptado',          color: 'bg-blue-100 text-blue-700',     icono: '💙', desc: 'Ya tiene hogar definitivo' },
};

const TIPO_LABEL = {
  callejero:   '🐕 Callejero',
  comunitario: '🌍 Comunitario',
  abandonado:  '💔 Abandonado',
};

const PALETA = [
  'from-violet-500 to-purple-600',
  'from-teal-500 to-cyan-600',
  'from-rose-500 to-pink-600',
  'from-blue-500 to-indigo-600',
  'from-emerald-500 to-green-600',
  'from-amber-500 to-orange-600',
  'from-sky-500 to-blue-600',
  'from-fuchsia-500 to-pink-600',
  'from-lime-600 to-green-700',
  'from-red-500 to-rose-600',
];

const getColor = (id) => PALETA[id % PALETA.length];

export default function Adopciones() {
  const [tab, setTab] = useState('animales');
  const [adopciones, setAdopciones] = useState([]);
  const [hogares, setHogares] = useState([]);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [modalAdopcion, setModalAdopcion] = useState(false);
  const [modalHogar, setModalHogar] = useState(false);
  const [modalDetalle, setModalDetalle] = useState(null);
  const [editandoAdopcion, setEditandoAdopcion] = useState(null);
  const [editandoHogar, setEditandoHogar] = useState(null);

  const [formAdopcion, setFormAdopcion] = useState({
    hogar_paso_id: '', estado: 'disponible',
    fecha_ingreso: new Date().toISOString().split('T')[0],
    fecha_adopcion: '', adoptante_nombre: '', adoptante_telefono: '',
    adoptante_email: '', adoptante_direccion: '',
    historia_personal: '', notas: ''
  });

  const [formHogar, setFormHogar] = useState({
    nombre: '', direccion: '', telefono: '',
    contacto_nombre: '', email: '', capacidad: '', notas: ''
  });

  useEffect(() => { cargarTodo(); }, []);

  const cargarTodo = async () => {
    try {
      const [adop, hog] = await Promise.all([
        api.get('/adopciones'),
        api.get('/adopciones/hogares'),
      ]);
      setAdopciones(adop.data);
      setHogares(hog.data);
    } catch (err) {
      toast.error('Error al cargar datos');
    }
  };

  // ── Coherencia de estados según situación ──────────────────────────────────
  // "en_hogar" requiere hogar asignado
  // "adoptado" requiere datos del adoptante
  // "disponible" / "en_tratamiento" no requieren nada extra

  const estadosDisponibles = (forma) => {
    return Object.entries(ESTADOS);
  };

  // ── ADOPCIONES ─────────────────────────────────────────────────────────────

  const abrirEditar = (a) => {
    setEditandoAdopcion(a);
    setFormAdopcion({
      hogar_paso_id: a.hogar_paso_id || '',
      estado: a.estado || 'disponible',
      fecha_ingreso: a.fecha_ingreso?.split('T')[0] || '',
      fecha_adopcion: a.fecha_adopcion?.split('T')[0] || '',
      adoptante_nombre: a.adoptante_nombre || '',
      adoptante_telefono: a.adoptante_telefono || '',
      adoptante_email: a.adoptante_email || '',
      adoptante_direccion: a.adoptante_direccion || '',
      historia_personal: a.historia_personal || '',
      notas: a.notas || ''
    });
    setModalAdopcion(true);
  };

  const handleSubmitAdopcion = async (e) => {
    e.preventDefault();

    // Validaciones de coherencia
    if (formAdopcion.estado === 'en_hogar' && !formAdopcion.hogar_paso_id) {
      return toast.error('Debes asignar un hogar de paso para este estado');
    }
    if (formAdopcion.estado === 'adoptado' && !formAdopcion.adoptante_nombre) {
      return toast.error('Debes ingresar el nombre del adoptante');
    }

    try {
      const datos = {
        ...formAdopcion,
        paciente_id: editandoAdopcion.paciente_id,
        // Limpiar hogar si no está en hogar
        hogar_paso_id: formAdopcion.estado === 'en_hogar' ? formAdopcion.hogar_paso_id : null,
        // Limpiar adoptante si no fue adoptado
        adoptante_nombre: formAdopcion.estado === 'adoptado' ? formAdopcion.adoptante_nombre : null,
        adoptante_telefono: formAdopcion.estado === 'adoptado' ? formAdopcion.adoptante_telefono : null,
        adoptante_email: formAdopcion.estado === 'adoptado' ? formAdopcion.adoptante_email : null,
        adoptante_direccion: formAdopcion.estado === 'adoptado' ? formAdopcion.adoptante_direccion : null,
        fecha_adopcion: formAdopcion.estado === 'adoptado' ? formAdopcion.fecha_adopcion : null,
      };

      await api.put(`/adopciones/${editandoAdopcion.id}`, datos);
      toast.success('✅ Registro actualizado');
      setModalAdopcion(false);
      cargarTodo();
    } catch (err) {
      toast.error('Error al guardar');
    }
  };

  const eliminarAdopcion = async (id) => {
    if (!confirm('¿Eliminar este registro de adopción?')) return;
    try {
      await api.delete(`/adopciones/${id}`);
      toast.success('Eliminado');
      cargarTodo();
    } catch (err) {
      toast.error('Error');
    }
  };

  // ── HOGARES ────────────────────────────────────────────────────────────────

  const abrirModalHogar = (h = null) => {
    if (h) {
      setEditandoHogar(h);
      setFormHogar({
        nombre: h.nombre || '', direccion: h.direccion || '',
        telefono: h.telefono || '', contacto_nombre: h.contacto_nombre || '',
        email: h.email || '', capacidad: h.capacidad || '', notas: h.notas || ''
      });
    } else {
      setEditandoHogar(null);
      setFormHogar({ nombre: '', direccion: '', telefono: '', contacto_nombre: '', email: '', capacidad: '', notas: '' });
    }
    setModalHogar(true);
  };

  const handleSubmitHogar = async (e) => {
    e.preventDefault();
    try {
      if (editandoHogar) {
        await api.put(`/adopciones/hogares/${editandoHogar.id}`, formHogar);
        toast.success('✅ Hogar actualizado');
      } else {
        await api.post('/adopciones/hogares', formHogar);
        toast.success('✅ Hogar registrado');
      }
      setModalHogar(false);
      cargarTodo();
    } catch (err) {
      toast.error('Error al guardar');
    }
  };

  const eliminarHogar = async (id) => {
    if (!confirm('¿Eliminar este hogar de paso?')) return;
    try {
      await api.delete(`/adopciones/hogares/${id}`);
      toast.success('Eliminado');
      cargarTodo();
    } catch (err) {
      toast.error('Error');
    }
  };

  // ── Filtros coherentes ─────────────────────────────────────────────────────
  const adopcionesFiltradas = filtroEstado
    ? adopciones.filter(a => a.estado === filtroEstado)
    : adopciones;

  const conteo = Object.keys(ESTADOS).reduce((acc, k) => {
    acc[k] = adopciones.filter(a => a.estado === k).length;
    return acc;
  }, {});

  return (
    <div className="p-6">
      <Toaster position="top-right" />

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">🐾 Adopciones</h1>
        <p className="text-gray-500">Gestión de hogares de paso y animales en adopción</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-white rounded-xl shadow p-2 w-fit">
        {[['animales', '🐾 Animales'], ['hogares', '🏠 Hogares de Paso']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`px-5 py-2 rounded-lg font-medium transition text-sm ${
              tab === id ? 'bg-orange-500 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}>
            {label}
            {id === 'animales' && adopciones.length > 0 && (
              <span className="ml-2 bg-white/30 text-xs px-1.5 py-0.5 rounded-full">{adopciones.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* ═══ TAB ANIMALES ═══════════════════════════════════════════════════ */}
      {tab === 'animales' && (
        <div>
          {/* Tarjetas de resumen */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {Object.entries(ESTADOS).map(([k, v]) => (
              <button key={k} onClick={() => setFiltroEstado(filtroEstado === k ? '' : k)}
                className={`p-4 rounded-xl border-2 text-left transition ${
                  filtroEstado === k ? 'border-orange-400 bg-orange-50' : 'bg-white border-gray-100 hover:border-orange-200'
                }`}>
                <div className="text-2xl mb-1">{v.icono}</div>
                <div className="text-2xl font-bold text-gray-800">{conteo[k] || 0}</div>
                <div className="text-xs font-medium text-gray-600">{v.label}</div>
              </button>
            ))}
          </div>

          {/* Filtros rápidos */}
          <div className="flex gap-2 mb-4 flex-wrap">
            <button onClick={() => setFiltroEstado('')}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
                filtroEstado === '' ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}>Todos ({adopciones.length})</button>
            {Object.entries(ESTADOS).map(([k, v]) => (
              <button key={k} onClick={() => setFiltroEstado(filtroEstado === k ? '' : k)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
                  filtroEstado === k ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}>
                {v.icono} {v.label} ({conteo[k] || 0})
              </button>
            ))}
          </div>

          {adopcionesFiltradas.length === 0 ? (
            <div className="bg-white rounded-xl shadow p-12 text-center">
              <div className="text-6xl mb-3">🐾</div>
              <p className="text-gray-500 text-lg font-medium">No hay animales registrados</p>
              <p className="text-gray-400 text-sm mt-1">
                Los animales callejeros, comunitarios o abandonados aparecen aquí automáticamente al registrarlos en Pacientes.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {adopcionesFiltradas.map(a => {
                const estado = ESTADOS[a.estado] || ESTADOS.disponible;
                return (
                  <div key={a.id} className="bg-white rounded-xl shadow hover:shadow-md transition overflow-hidden">
                    {/* Header con foto */}
                    <div className={`bg-gradient-to-r ${getColor(a.id)} p-4 flex items-center gap-3`}>
                      {a.foto_url ? (
                        <img src={`http://localhost:5000${a.foto_url}`} alt={a.paciente_nombre}
                          className="w-16 h-16 rounded-full object-cover border-2 border-white/50 shadow" />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-3xl border-2 border-white/30">🐾</div>
                      )}
                      <div className="flex-1">
                        <h3 className="font-bold text-white text-lg">{a.paciente_nombre}</h3>
                        <p className="text-white/80 text-sm">{a.especie} {a.raza ? `· ${a.raza}` : ''}</p>
                        <span className="text-xs text-white/70">{TIPO_LABEL[a.tipo_ingreso] || a.tipo_ingreso}</span>
                      </div>
                    </div>

                    {/* Cuerpo */}
                    <div className="p-4 space-y-2">
                      {/* Historia personal */}
                      {a.historia_personal && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                          <p className="text-xs font-semibold text-amber-700 mb-1">💬 Mi historia</p>
                          <p className="text-sm text-gray-700 italic line-clamp-3">"{a.historia_personal}"</p>
                        </div>
                      )}

                      {/* Hogar de paso */}
                      {a.estado === 'en_hogar' && a.hogar_nombre && (
                        <div className="flex items-start gap-2 text-sm text-gray-600">
                          <span>🏠</span>
                          <div>
                            <span className="font-medium">{a.hogar_nombre}</span>
                            {a.hogar_contacto && <p className="text-xs text-gray-400">Contacto: {a.hogar_contacto}</p>}
                            {a.hogar_telefono && <p className="text-xs text-gray-400">📞 {a.hogar_telefono}</p>}
                          </div>
                        </div>
                      )}

                      {/* Adoptante */}
                      {a.estado === 'adoptado' && a.adoptante_nombre && (
                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                          <p className="text-xs font-semibold text-blue-700 mb-1">💙 Adoptado por</p>
                          <p className="text-sm font-medium text-gray-800">{a.adoptante_nombre}</p>
                          {a.adoptante_telefono && <p className="text-xs text-gray-500">📞 {a.adoptante_telefono}</p>}
                          {a.fecha_adopcion && (
                            <p className="text-xs text-gray-400">
                              Fecha: {new Date(a.fecha_adopcion).toLocaleDateString('es-CO')}
                            </p>
                          )}
                        </div>
                      )}

                      {a.fecha_ingreso && (
                        <p className="text-xs text-gray-400">
                          📅 Ingreso: {new Date(a.fecha_ingreso).toLocaleDateString('es-CO')}
                        </p>
                      )}

                      {a.notas && (
                        <p className="text-xs text-gray-500 italic">{a.notas}</p>
                      )}
                    </div>

                    {/* Acciones */}
                    <div className="px-4 pb-4 flex gap-2">
                      <button onClick={() => setModalDetalle(a)}
                        className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-200 font-medium">
                        👁️ Ver
                      </button>
                      <button onClick={() => abrirEditar(a)}
                        className="flex-1 bg-orange-100 text-orange-700 py-2 rounded-lg text-sm hover:bg-orange-200 font-medium">
                        ✏️ Editar
                      </button>
                      <button onClick={() => eliminarAdopcion(a.id)}
                        className="bg-red-100 text-red-700 px-3 py-2 rounded-lg text-sm hover:bg-red-200">
                        🗑️
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══ TAB HOGARES ════════════════════════════════════════════════════ */}
      {tab === 'hogares' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-800">🏠 Hogares de Paso</h2>
              <p className="text-sm text-gray-500">Lugares donde los animales están alojados temporalmente</p>
            </div>
            <button onClick={() => abrirModalHogar()}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition text-sm">
              + Nuevo Hogar
            </button>
          </div>

          {hogares.length === 0 ? (
            <div className="bg-white rounded-xl shadow p-12 text-center">
              <div className="text-6xl mb-3">🏠</div>
              <p className="text-gray-500">No hay hogares de paso registrados</p>
              <button onClick={() => abrirModalHogar()}
                className="mt-4 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 text-sm">
                Registrar primer hogar
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {hogares.map(h => {
                const animalesEnHogar = adopciones.filter(a => a.hogar_paso_id === h.id && a.estado === 'en_hogar').length;
                return (
                  <div key={h.id} className="bg-white rounded-xl shadow p-5">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center text-2xl">🏠</div>
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-800">{h.nombre}</h3>
                        <div className="flex gap-2 mt-1">
                          {h.capacidad > 0 && (
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                              Cap: {h.capacidad}
                            </span>
                          )}
                          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                            {animalesEnHogar} animal{animalesEnHogar !== 1 ? 'es' : ''} actualmente
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1 text-sm text-gray-600">
                      {h.contacto_nombre && <p>👤 {h.contacto_nombre}</p>}
                      {h.telefono && <p>📞 {h.telefono}</p>}
                      {h.email && <p>📧 {h.email}</p>}
                      {h.direccion && <p>📍 {h.direccion}</p>}
                      {h.notas && <p className="text-xs text-gray-400 italic mt-2">{h.notas}</p>}
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button onClick={() => abrirModalHogar(h)}
                        className="flex-1 bg-yellow-100 text-yellow-700 py-1.5 rounded-lg text-sm hover:bg-yellow-200">
                        ✏️ Editar
                      </button>
                      <button onClick={() => eliminarHogar(h.id)}
                        className="flex-1 bg-red-100 text-red-700 py-1.5 rounded-lg text-sm hover:bg-red-200">
                        🗑️ Eliminar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══ MODAL EDITAR ADOPCIÓN ══════════════════════════════════════════ */}
      {modalAdopcion && editandoAdopcion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b flex items-center gap-3">
              {editandoAdopcion.foto_url ? (
                <img src={`http://localhost:5000${editandoAdopcion.foto_url}`} alt=""
                  className="w-12 h-12 rounded-full object-cover border-2 border-orange-300" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center text-2xl">🐾</div>
              )}
              <div>
                <h2 className="text-lg font-bold text-gray-800">{editandoAdopcion.paciente_nombre}</h2>
                <p className="text-sm text-gray-500">{editandoAdopcion.especie} · {TIPO_LABEL[editandoAdopcion.tipo_ingreso]}</p>
              </div>
            </div>

            <form onSubmit={handleSubmitAdopcion} className="p-5 space-y-4">

              {/* Historia personal */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  💬 Historia personal del animal
                </label>
                <textarea
                  value={formAdopcion.historia_personal}
                  onChange={e => setFormAdopcion({...formAdopcion, historia_personal: e.target.value})}
                  rows={3}
                  placeholder={`Ej: "Hola, soy ${editandoAdopcion.paciente_nombre}! Fui rescatado de la calle y estoy buscando un hogar lleno de amor..."`}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm"
                />
              </div>

              {/* Estado — con descripción */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Estado actual *</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(ESTADOS).map(([val, info]) => (
                    <button key={val} type="button"
                      onClick={() => setFormAdopcion({...formAdopcion, estado: val})}
                      className={`flex items-center gap-2 px-3 py-3 rounded-lg border-2 text-sm transition text-left ${
                        formAdopcion.estado === val
                          ? 'border-orange-400 bg-orange-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}>
                      <span className="text-xl">{info.icono}</span>
                      <div>
                        <p className="font-medium text-gray-800 text-xs">{info.label}</p>
                        <p className="text-xs text-gray-400">{info.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Hogar de paso — solo si está en hogar */}
              {formAdopcion.estado === 'en_hogar' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-3">
                  <p className="text-sm font-semibold text-yellow-700">🏠 Asignar Hogar de Paso</p>
                  {hogares.length === 0 ? (
                    <p className="text-sm text-yellow-600">
                      No hay hogares registrados. Ve a la pestaña <b>Hogares de Paso</b> para crear uno.
                    </p>
                  ) : (
                    <select value={formAdopcion.hogar_paso_id}
                      onChange={e => setFormAdopcion({...formAdopcion, hogar_paso_id: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400">
                      <option value="">Seleccionar hogar *</option>
                      {hogares.map(h => (
                        <option key={h.id} value={h.id}>
                          {h.nombre}{h.contacto_nombre ? ` — ${h.contacto_nombre}` : ''}{h.telefono ? ` · ${h.telefono}` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Datos del adoptante — solo si fue adoptado */}
              {formAdopcion.estado === 'adoptado' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                  <p className="text-sm font-semibold text-blue-700">💙 Datos del Adoptante</p>
                  <input placeholder="Nombre completo *" value={formAdopcion.adoptante_nombre}
                    onChange={e => setFormAdopcion({...formAdopcion, adoptante_nombre: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm" />
                  <div className="grid grid-cols-2 gap-2">
                    <input placeholder="Teléfono" value={formAdopcion.adoptante_telefono}
                      onChange={e => setFormAdopcion({...formAdopcion, adoptante_telefono: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm" />
                    <input placeholder="Email" value={formAdopcion.adoptante_email}
                      onChange={e => setFormAdopcion({...formAdopcion, adoptante_email: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm" />
                  </div>
                  <input placeholder="Dirección" value={formAdopcion.adoptante_direccion}
                    onChange={e => setFormAdopcion({...formAdopcion, adoptante_direccion: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm" />
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Fecha de adopción</label>
                    <input type="date" value={formAdopcion.fecha_adopcion}
                      onChange={e => setFormAdopcion({...formAdopcion, fecha_adopcion: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm" />
                  </div>
                </div>
              )}

              {/* Fechas y notas */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Fecha de ingreso</label>
                  <input type="date" value={formAdopcion.fecha_ingreso}
                    onChange={e => setFormAdopcion({...formAdopcion, fecha_ingreso: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Notas adicionales</label>
                  <input value={formAdopcion.notas}
                    onChange={e => setFormAdopcion({...formAdopcion, notas: e.target.value})}
                    placeholder="Ej: vacunado, esterilizado..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm" />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalAdopcion(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                  Cancelar
                </button>
                <button type="submit"
                  className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-medium">
                  Guardar cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ MODAL DETALLE ══════════════════════════════════════════════════ */}
      {modalDetalle && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className={`bg-gradient-to-r ${getColor(modalDetalle.id)} p-6 text-center rounded-t-2xl`}>
              {modalDetalle.foto_url ? (
                <img src={`http://localhost:5000${modalDetalle.foto_url}`} alt={modalDetalle.paciente_nombre}
                  className="w-24 h-24 rounded-full object-cover border-4 border-white mx-auto shadow-lg" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-orange-300 flex items-center justify-center text-4xl border-4 border-white mx-auto">🐾</div>
              )}
              <h2 className="text-xl font-bold text-white mt-3">{modalDetalle.paciente_nombre}</h2>
              <p className="text-white/80 text-sm">{modalDetalle.especie} {modalDetalle.raza ? `· ${modalDetalle.raza}` : ''}</p>
              <span className={`mt-2 inline-block text-xs px-3 py-1 rounded-full font-medium ${ESTADOS[modalDetalle.estado]?.color}`}>
                {ESTADOS[modalDetalle.estado]?.icono} {ESTADOS[modalDetalle.estado]?.label}
              </span>
            </div>
            <div className="p-5 space-y-4">
              {modalDetalle.historia_personal && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-sm font-semibold text-amber-700 mb-2">💬 Mi historia</p>
                  <p className="text-sm text-gray-700 italic">"{modalDetalle.historia_personal}"</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-400">Tipo:</span> <span className="font-medium">{TIPO_LABEL[modalDetalle.tipo_ingreso]}</span></div>
                {modalDetalle.sexo && <div><span className="text-gray-400">Sexo:</span> <span className="font-medium">{modalDetalle.sexo}</span></div>}
                {modalDetalle.color && <div><span className="text-gray-400">Color:</span> <span className="font-medium">{modalDetalle.color}</span></div>}
                {modalDetalle.fecha_ingreso && (
                  <div><span className="text-gray-400">Ingreso:</span> <span className="font-medium">{new Date(modalDetalle.fecha_ingreso).toLocaleDateString('es-CO')}</span></div>
                )}
              </div>
              {modalDetalle.estado === 'en_hogar' && modalDetalle.hogar_nombre && (
                <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-3">
                  <p className="text-xs font-semibold text-yellow-700 mb-1">🏠 Hogar de Paso</p>
                  <p className="font-medium text-gray-800">{modalDetalle.hogar_nombre}</p>
                  {modalDetalle.hogar_contacto && <p className="text-sm text-gray-500">👤 {modalDetalle.hogar_contacto}</p>}
                  {modalDetalle.hogar_telefono && <p className="text-sm text-gray-500">📞 {modalDetalle.hogar_telefono}</p>}
                  {modalDetalle.hogar_direccion && <p className="text-sm text-gray-500">📍 {modalDetalle.hogar_direccion}</p>}
                </div>
              )}
              {modalDetalle.estado === 'adoptado' && modalDetalle.adoptante_nombre && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                  <p className="text-xs font-semibold text-blue-700 mb-1">💙 Adoptado por</p>
                  <p className="font-medium text-gray-800">{modalDetalle.adoptante_nombre}</p>
                  {modalDetalle.adoptante_telefono && <p className="text-sm text-gray-500">📞 {modalDetalle.adoptante_telefono}</p>}
                  {modalDetalle.adoptante_email && <p className="text-sm text-gray-500">📧 {modalDetalle.adoptante_email}</p>}
                  {modalDetalle.adoptante_direccion && <p className="text-sm text-gray-500">📍 {modalDetalle.adoptante_direccion}</p>}
                </div>
              )}
              {modalDetalle.notas && (
                <p className="text-sm text-gray-500 italic bg-gray-50 rounded-lg p-3">{modalDetalle.notas}</p>
              )}
              <div className="flex gap-2 pt-2">
                <button onClick={() => { setModalDetalle(null); abrirEditar(modalDetalle); }}
                  className="flex-1 bg-orange-500 text-white py-2 rounded-lg hover:bg-orange-600 text-sm font-medium">
                  ✏️ Editar
                </button>
                <button onClick={() => setModalDetalle(null)}
                  className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50 text-sm">
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL HOGAR ════════════════════════════════════════════════════ */}
      {modalHogar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold text-gray-800">
                {editandoHogar ? '✏️ Editar Hogar' : '🏠 Nuevo Hogar de Paso'}
              </h2>
            </div>
            <form onSubmit={handleSubmitHogar} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Hogar *</label>
                <input value={formHogar.nombre} onChange={e => setFormHogar({...formHogar, nombre: e.target.value})}
                  required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Persona de Contacto</label>
                  <input value={formHogar.contacto_nombre} onChange={e => setFormHogar({...formHogar, contacto_nombre: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                  <input value={formHogar.telefono} onChange={e => setFormHogar({...formHogar, telefono: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={formHogar.email} onChange={e => setFormHogar({...formHogar, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                <input value={formHogar.direccion} onChange={e => setFormHogar({...formHogar, direccion: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Capacidad (# animales)</label>
                <input type="number" value={formHogar.capacidad} onChange={e => setFormHogar({...formHogar, capacidad: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                <textarea value={formHogar.notas} onChange={e => setFormHogar({...formHogar, notas: e.target.value})}
                  rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalHogar(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                  Cancelar
                </button>
                <button type="submit"
                  className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-medium">
                  {editandoHogar ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}