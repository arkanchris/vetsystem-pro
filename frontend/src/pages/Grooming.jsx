import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import toast, { Toaster } from 'react-hot-toast';

const ESTADOS = {
  agendada:   { label: 'Agendada',    color: 'bg-blue-100 text-blue-700',   dot: 'bg-blue-500' },
  en_espera:  { label: 'En espera',   color: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' },
  en_proceso: { label: 'En proceso',  color: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
  listo:      { label: 'Listo',       color: 'bg-green-100 text-green-700',  dot: 'bg-green-500' },
  entregado:  { label: 'Entregado',   color: 'bg-gray-100 text-gray-600',    dot: 'bg-gray-400' },
  cancelada:  { label: 'Cancelada',   color: 'bg-red-100 text-red-600',      dot: 'bg-red-400' },
};

export default function Grooming() {
  const [tab, setTab]                   = useState('agenda'); // agenda | catalogo | historial
  const [citas, setCitas]               = useState([]);
  const [catalogo, setCatalogo]         = useState([]);
  const [pacientes, setPacientes]       = useState([]);
  const [cargando, setCargando]         = useState(true);
  const [fechaFiltro, setFechaFiltro]   = useState(new Date().toISOString().split('T')[0]);
  const [estadoFiltro, setEstadoFiltro] = useState('');
  const [pacienteHistorial, setPacienteHistorial] = useState('');
  const [historial, setHistorial]       = useState([]);

  // Modales
  const [modalCita, setModalCita]       = useState(false);
  const [modalServicio, setModalServicio] = useState(false);
  const [modalFotos, setModalFotos]     = useState(null);
  const [editandoCita, setEditandoCita] = useState(null);
  const [editandoServicio, setEditandoServicio] = useState(null);

  // Forms
  const [formCita, setFormCita] = useState({
    paciente_id:'', fecha_cita:'', hora_fin_estimada:'', observaciones_ingreso:'',
    estado:'agendada', pagado:false, metodo_pago:'', servicios:[]
  });
  const [formServicio, setFormServicio] = useState({ nombre:'', descripcion:'', precio:'', duracion_minutos:60, aplica_a:'todos', es_personalizado:true });

  // Fotos
  const [fotoAntes, setFotoAntes]   = useState(null);
  const [fotoDespues, setFotoDespues] = useState(null);
  const fotoAntesRef   = useRef(null);
  const fotoDespuesRef = useRef(null);

  useEffect(() => { cargarDatos(); }, []);

  const cargarDatos = async () => {
    try {
      const [pac, cat] = await Promise.all([api.get('/pacientes'), api.get('/grooming/catalogo')]);
      setPacientes(pac.data);
      setCatalogo(cat.data);
    } catch { toast.error('Error al cargar datos'); }
    finally { setCargando(false); }
  };

  const cargarCitas = async () => {
    try {
      const params = {};
      if (fechaFiltro)   params.fecha  = fechaFiltro;
      if (estadoFiltro)  params.estado = estadoFiltro;
      const r = await api.get('/grooming/citas', { params });
      setCitas(r.data);
    } catch { toast.error('Error al cargar citas'); }
  };

  useEffect(() => { if (tab === 'agenda') cargarCitas(); }, [tab, fechaFiltro, estadoFiltro]);

  const cargarHistorial = async (id) => {
    if (!id) return;
    try {
      const r = await api.get(`/grooming/historial/${id}`);
      setHistorial(r.data);
    } catch { toast.error('Error al cargar historial'); }
  };

  // ── CITAS ─────────────────────────────────────────────────────────────────
  const abrirModalCita = (c = null) => {
    if (c) {
      setEditandoCita(c);
      setFormCita({
        paciente_id: c.paciente_id||'', fecha_cita: c.fecha_cita?.slice(0,16)||'',
        hora_fin_estimada: c.hora_fin_estimada?.slice(0,16)||'',
        observaciones_ingreso: c.observaciones_ingreso||'',
        estado: c.estado||'agendada', pagado: c.pagado||false,
        metodo_pago: c.metodo_pago||'', servicios: c.servicios||[]
      });
    } else {
      setEditandoCita(null);
      setFormCita({ paciente_id:'', fecha_cita:'', hora_fin_estimada:'', observaciones_ingreso:'', estado:'agendada', pagado:false, metodo_pago:'', servicios:[] });
    }
    setModalCita(true);
  };

  const toggleServicioEnCita = (servicio) => {
    const existe = formCita.servicios.find(s => s.servicio_id === servicio.id);
    if (existe) {
      setFormCita(p => ({ ...p, servicios: p.servicios.filter(s => s.servicio_id !== servicio.id) }));
    } else {
      setFormCita(p => ({ ...p, servicios: [...p.servicios, { servicio_id: servicio.id, nombre_servicio: servicio.nombre, precio: servicio.precio }] }));
    }
  };

  const totalCita = formCita.servicios.reduce((s, sv) => s + parseFloat(sv.precio||0), 0);

  const handleSubmitCita = async (e) => {
    e.preventDefault();
    if (formCita.servicios.length === 0) return toast.error('Selecciona al menos un servicio');
    try {
      if (editandoCita) {
        await api.put(`/grooming/citas/${editandoCita.id}`, formCita);
        toast.success('✅ Cita actualizada');
      } else {
        await api.post('/grooming/citas', formCita);
        toast.success('✅ Cita agendada');
      }
      setModalCita(false);
      await cargarCitas();
    } catch (err) { toast.error(err.response?.data?.error || 'Error al guardar'); }
  };

  const cambiarEstado = async (id, estado) => {
    try {
      const cita = citas.find(c => c.id === id);
      await api.put(`/grooming/citas/${id}`, { ...cita, estado, servicios: cita.servicios });
      toast.success(`✅ Estado: ${ESTADOS[estado]?.label}`);
      await cargarCitas();
    } catch { toast.error('Error'); }
  };

  const eliminarCita = async (id) => {
    if (!confirm('¿Eliminar esta cita?')) return;
    try {
      await api.delete(`/grooming/citas/${id}`);
      toast.success('✅ Cita eliminada');
      await cargarCitas();
    } catch { toast.error('Error'); }
  };

  const subirFoto = async (citaId, tipo, archivo) => {
    if (!archivo) return;
    const fd = new FormData();
    fd.append('foto', archivo);
    fd.append('tipo', tipo);
    try {
      await api.post(`/grooming/citas/${citaId}/foto`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(`✅ Foto ${tipo === 'antes' ? 'antes' : 'después'} subida`);
      await cargarCitas();
      const updated = await api.get('/grooming/citas', { params: { fecha: fechaFiltro } });
      setCitas(updated.data);
      setModalFotos(updated.data.find(c => c.id === citaId) || null);
    } catch { toast.error('Error al subir foto'); }
  };

  // ── CATÁLOGO ──────────────────────────────────────────────────────────────
  const handleSubmitServicio = async (e) => {
    e.preventDefault();
    try {
      if (editandoServicio) {
        await api.put(`/grooming/catalogo/${editandoServicio.id}`, formServicio);
        toast.success('✅ Servicio actualizado');
      } else {
        await api.post('/grooming/catalogo', formServicio);
        toast.success('✅ Servicio creado');
      }
      setModalServicio(false);
      const r = await api.get('/grooming/catalogo');
      setCatalogo(r.data);
    } catch { toast.error('Error al guardar servicio'); }
  };

  const serviciosBase        = catalogo.filter(s => !s.es_personalizado);
  const serviciosPersonalizados = catalogo.filter(s => s.es_personalizado);

  return (
    <div className="p-6">
      <Toaster position="top-right" />
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">✂️ Estética Canina / Felina</h1>
          <p className="text-gray-500">Servicios de estética, agenda y catálogo</p>
        </div>
        {tab === 'agenda' && (
          <button onClick={() => abrirModalCita()}
            className="bg-pink-600 hover:bg-pink-700 text-white px-5 py-2.5 rounded-xl font-medium">
            + Nueva Cita
          </button>
        )}
        {tab === 'catalogo' && (
          <button onClick={() => { setEditandoServicio(null); setFormServicio({ nombre:'', descripcion:'', precio:'', duracion_minutos:60, aplica_a:'todos', es_personalizado:true }); setModalServicio(true); }}
            className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl font-medium">
            + Nuevo Servicio
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-white rounded-xl shadow p-2 w-fit">
        {[['agenda','📅 Agenda'],['catalogo','🗂️ Catálogo'],['historial','📋 Historial']].map(([k,l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-5 py-2 rounded-lg font-medium text-sm transition ${tab===k?'bg-pink-600 text-white':'text-gray-600 hover:bg-gray-100'}`}>
            {l}
          </button>
        ))}
      </div>

      {/* ═══ AGENDA ═══════════════════════════════════════════════════════════ */}
      {tab === 'agenda' && (
        <div>
          {/* Filtros */}
          <div className="bg-white rounded-xl shadow p-4 mb-4 flex gap-4 flex-wrap items-center">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Fecha</label>
              <input type="date" value={fechaFiltro} onChange={e => setFechaFiltro(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"/>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Estado</label>
              <select value={estadoFiltro} onChange={e => setEstadoFiltro(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-400">
                <option value="">Todos</option>
                {Object.entries(ESTADOS).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div className="ml-auto flex gap-3 text-sm">
              {Object.entries(ESTADOS).map(([k,v]) => (
                <span key={k} className="flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${v.dot}`}/>
                  <span className="text-gray-500">{citas.filter(c=>c.estado===k).length} {v.label}</span>
                </span>
              ))}
            </div>
          </div>

          {citas.length === 0 ? (
            <div className="bg-white rounded-xl shadow p-10 text-center">
              <div className="text-6xl mb-3">✂️</div>
              <p className="text-gray-500 font-medium">No hay citas para esta fecha</p>
              <button onClick={() => abrirModalCita()} className="mt-4 bg-pink-600 text-white px-4 py-2 rounded-xl hover:bg-pink-700 text-sm">Agendar cita</button>
            </div>
          ) : (
            <div className="space-y-3">
              {citas.map(c => (
                <div key={c.id} className="bg-white rounded-xl shadow p-5">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                      {c.foto_url
                        ? <img src={`http://localhost:5000${c.foto_url}`} className="w-12 h-12 rounded-full object-cover border-2 border-pink-200" alt=""/>
                        : <div className="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center text-2xl">🐾</div>}
                      <div>
                        <h3 className="font-bold text-gray-800">{c.paciente_nombre}</h3>
                        <p className="text-xs text-gray-500">{c.especie} · {c.raza||'-'}</p>
                        <p className="text-xs text-gray-400">
                          🕐 {new Date(c.fecha_cita).toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit'})}
                          {c.hora_fin_estimada && ` → ${new Date(c.hora_fin_estimada).toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit'})}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${ESTADOS[c.estado]?.color}`}>{ESTADOS[c.estado]?.label}</span>
                      {/* Cambio rápido de estado */}
                      <select value={c.estado}
                        onChange={e => cambiarEstado(c.id, e.target.value)}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-pink-400">
                        {Object.entries(ESTADOS).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                      <button onClick={() => setModalFotos(c)} className="bg-purple-100 text-purple-700 px-2 py-1 rounded-lg text-xs hover:bg-purple-200">📸 Fotos</button>
                      <button onClick={() => abrirModalCita(c)} className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-lg text-xs hover:bg-yellow-200">✏️</button>
                      <button onClick={() => eliminarCita(c.id)} className="bg-red-100 text-red-600 px-2 py-1 rounded-lg text-xs hover:bg-red-200">🗑️</button>
                    </div>
                  </div>

                  {/* Servicios y total */}
                  <div className="mt-3 flex gap-2 flex-wrap items-center">
                    {c.servicios?.map(sv => (
                      <span key={sv.id} className="bg-pink-50 text-pink-700 text-xs px-2 py-1 rounded-full border border-pink-200">
                        {sv.nombre_servicio} — ${parseFloat(sv.precio).toLocaleString('es-CO')}
                      </span>
                    ))}
                    <span className="ml-auto font-bold text-gray-800">Total: ${parseFloat(c.total||0).toLocaleString('es-CO')}</span>
                    {c.pagado && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✅ Pagado</span>}
                  </div>
                  {c.observaciones_ingreso && <p className="text-xs text-gray-400 mt-2">📝 {c.observaciones_ingreso}</p>}

                  {/* Fotos antes/después preview */}
                  {(c.foto_antes_url || c.foto_despues_url) && (
                    <div className="flex gap-3 mt-3">
                      {c.foto_antes_url && (
                        <div className="text-center">
                          <p className="text-xs text-gray-400 mb-1">Antes</p>
                          <img src={`http://localhost:5000${c.foto_antes_url}`} className="w-16 h-16 rounded-lg object-cover border" alt="antes"/>
                        </div>
                      )}
                      {c.foto_despues_url && (
                        <div className="text-center">
                          <p className="text-xs text-gray-400 mb-1">Después</p>
                          <img src={`http://localhost:5000${c.foto_despues_url}`} className="w-16 h-16 rounded-lg object-cover border" alt="después"/>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══ CATÁLOGO ═══════════════════════════════════════════════════════ */}
      {tab === 'catalogo' && (
        <div className="space-y-6">
          {/* Servicios base */}
          <div className="bg-white rounded-2xl shadow p-5">
            <h2 className="font-bold text-gray-800 mb-4">📋 Servicios estándar</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {serviciosBase.map(s => (
                <div key={s.id} className="border border-gray-100 rounded-xl p-4 hover:border-pink-200 transition">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-800 text-sm">{s.nombre}</h3>
                    <button onClick={() => { setEditandoServicio(s); setFormServicio({...s}); setModalServicio(true); }}
                      className="text-gray-400 hover:text-yellow-600 text-xs">✏️</button>
                  </div>
                  {s.descripcion && <p className="text-xs text-gray-400 mb-2">{s.descripcion}</p>}
                  <div className="flex justify-between items-center">
                    <span className="text-pink-600 font-bold">${parseFloat(s.precio).toLocaleString('es-CO')}</span>
                    <span className="text-xs text-gray-400">⏱️ {s.duracion_minutos} min</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Servicios personalizados */}
          {serviciosPersonalizados.length > 0 && (
            <div className="bg-white rounded-2xl shadow p-5">
              <h2 className="font-bold text-gray-800 mb-4">✨ Servicios personalizados</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {serviciosPersonalizados.map(s => (
                  <div key={s.id} className="border border-purple-100 bg-purple-50 rounded-xl p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-purple-800 text-sm">{s.nombre}</h3>
                      <div className="flex gap-1">
                        <button onClick={() => { setEditandoServicio(s); setFormServicio({...s}); setModalServicio(true); }} className="text-yellow-500 text-xs">✏️</button>
                        <button onClick={async () => { await api.delete(`/grooming/catalogo/${s.id}`); const r = await api.get('/grooming/catalogo'); setCatalogo(r.data); }} className="text-red-400 text-xs">🗑️</button>
                      </div>
                    </div>
                    {s.descripcion && <p className="text-xs text-purple-600 mb-2">{s.descripcion}</p>}
                    <span className="text-purple-700 font-bold">${parseFloat(s.precio).toLocaleString('es-CO')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ HISTORIAL ══════════════════════════════════════════════════════ */}
      {tab === 'historial' && (
        <div>
          <div className="bg-white rounded-xl shadow p-4 mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Seleccionar paciente:</label>
            <select value={pacienteHistorial} onChange={e => { setPacienteHistorial(e.target.value); cargarHistorial(e.target.value); }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-400">
              <option value="">-- Seleccionar --</option>
              {pacientes.map(p => <option key={p.id} value={p.id}>{p.nombre} ({p.especie})</option>)}
            </select>
          </div>
          {historial.length === 0 && pacienteHistorial && (
            <div className="text-center py-8 text-gray-400"><div className="text-5xl mb-2">📋</div><p>Sin historial de grooming</p></div>
          )}
          <div className="space-y-3">
            {historial.map(c => (
              <div key={c.id} className="bg-white rounded-xl shadow p-5">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-sm text-gray-500">📅 {new Date(c.fecha_cita).toLocaleDateString('es-CO')}</p>
                    <p className="text-xs text-gray-400">{c.groomer_nombre || 'Sin groomer asignado'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${ESTADOS[c.estado]?.color}`}>{ESTADOS[c.estado]?.label}</span>
                    <span className="font-bold text-gray-800">${parseFloat(c.total||0).toLocaleString('es-CO')}</span>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap mb-2">
                  {c.servicios?.map(sv => (
                    <span key={sv.id} className="bg-pink-50 text-pink-700 text-xs px-2 py-1 rounded-full">{sv.nombre_servicio}</span>
                  ))}
                </div>
                {(c.foto_antes_url || c.foto_despues_url) && (
                  <div className="flex gap-3 mt-2">
                    {c.foto_antes_url && <div className="text-center"><p className="text-xs text-gray-400 mb-1">Antes</p><img src={`http://localhost:5000${c.foto_antes_url}`} className="w-20 h-20 rounded-lg object-cover border" alt=""/></div>}
                    {c.foto_despues_url && <div className="text-center"><p className="text-xs text-gray-400 mb-1">Después</p><img src={`http://localhost:5000${c.foto_despues_url}`} className="w-20 h-20 rounded-lg object-cover border" alt=""/></div>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ MODAL CITA ═══════════════════════════════════════════════════════ */}
      {modalCita && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b"><h2 className="text-lg font-bold">{editandoCita?'✏️ Editar Cita':'✂️ Nueva Cita de Grooming'}</h2></div>
            <form onSubmit={handleSubmitCita} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Paciente *</label>
                  <select value={formCita.paciente_id} onChange={e => setFormCita(p => ({...p, paciente_id: e.target.value}))}
                    required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500">
                    <option value="">Seleccionar</option>
                    {pacientes.map(p => <option key={p.id} value={p.id}>{p.nombre} ({p.especie})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha y hora *</label>
                  <input type="datetime-local" value={formCita.fecha_cita} onChange={e => setFormCita(p => ({...p, fecha_cita: e.target.value}))}
                    required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hora fin estimada</label>
                  <input type="datetime-local" value={formCita.hora_fin_estimada} onChange={e => setFormCita(p => ({...p, hora_fin_estimada: e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"/>
                </div>
              </div>

              {/* Selección de servicios */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Servicios * (selecciona uno o más)</label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-gray-200 rounded-xl p-3">
                  {catalogo.map(sv => {
                    const sel = formCita.servicios.find(s => s.servicio_id === sv.id);
                    return (
                      <button key={sv.id} type="button" onClick={() => toggleServicioEnCita(sv)}
                        className={`text-left p-2 rounded-lg border-2 text-xs transition ${sel?'border-pink-400 bg-pink-50':'border-gray-100 hover:border-pink-200'}`}>
                        <p className="font-medium text-gray-800">{sv.nombre}</p>
                        <p className="text-pink-600">${parseFloat(sv.precio).toLocaleString('es-CO')} · {sv.duracion_minutos}min</p>
                      </button>
                    );
                  })}
                </div>
                {formCita.servicios.length > 0 && (
                  <p className="text-sm font-semibold text-gray-800 mt-2">
                    Total: <span className="text-pink-600">${totalCita.toLocaleString('es-CO')}</span>
                    <span className="text-gray-400 font-normal"> ({formCita.servicios.length} servicio{formCita.servicios.length>1?'s':''})</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones de ingreso</label>
                <textarea value={formCita.observaciones_ingreso} onChange={e => setFormCita(p => ({...p, observaciones_ingreso: e.target.value}))}
                  rows={2} placeholder="Piel sensible, perro nervioso, corte específico..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm"/>
              </div>

              {editandoCita && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                    <select value={formCita.estado} onChange={e => setFormCita(p => ({...p, estado: e.target.value}))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500">
                      {Object.entries(ESTADOS).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Método de pago</label>
                    <select value={formCita.metodo_pago} onChange={e => setFormCita(p => ({...p, metodo_pago: e.target.value}))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500">
                      <option value="">Seleccionar</option>
                      <option value="efectivo">Efectivo</option>
                      <option value="transferencia">Transferencia</option>
                      <option value="tarjeta">Tarjeta</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={formCita.pagado} onChange={e => setFormCita(p => ({...p, pagado: e.target.checked}))} className="w-4 h-4 accent-pink-600"/>
                      <span className="text-sm font-medium text-gray-700">Marcar como pagado (registra ingreso financiero)</span>
                    </label>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalCita(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancelar</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 font-medium">{editandoCita?'Actualizar':'Agendar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ MODAL SERVICIO ═══════════════════════════════════════════════════ */}
      {modalServicio && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b sticky top-0 bg-white z-10"><h2 className="text-lg font-bold">{editandoServicio?'✏️ Editar Servicio':'✨ Nuevo Servicio'}</h2></div>
            <form onSubmit={handleSubmitServicio} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input value={formServicio.nombre} onChange={e => setFormServicio(p => ({...p, nombre: e.target.value}))}
                  required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea value={formServicio.descripcion} onChange={e => setFormServicio(p => ({...p, descripcion: e.target.value}))}
                  rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Precio *</label>
                  <input type="number" value={formServicio.precio} onChange={e => setFormServicio(p => ({...p, precio: e.target.value}))}
                    required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duración (min)</label>
                  <input type="number" value={formServicio.duracion_minutos} onChange={e => setFormServicio(p => ({...p, duracion_minutos: e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"/>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalServicio(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancelar</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 font-medium">{editandoServicio?'Actualizar':'Crear'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ MODAL FOTOS ══════════════════════════════════════════════════════ */}
      {modalFotos && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="p-5 border-b flex justify-between items-center">
              <h2 className="text-lg font-bold">📸 Fotos — {modalFotos.paciente_nombre}</h2>
              <button onClick={() => setModalFotos(null)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-6">
              {/* Antes */}
              <div className="text-center">
                <p className="font-semibold text-gray-700 mb-3">📷 Antes</p>
                {modalFotos.foto_antes_url
                  ? <img src={`http://localhost:5000${modalFotos.foto_antes_url}`} className="w-full h-40 object-cover rounded-xl border mb-3" alt="antes"/>
                  : <div className="w-full h-40 bg-gray-50 rounded-xl border-2 border-dashed flex items-center justify-center text-gray-400 mb-3">Sin foto</div>}
                <input ref={fotoAntesRef} type="file" accept="image/*" className="hidden" onChange={e => setFotoAntes(e.target.files[0])}/>
                <button onClick={() => fotoAntesRef.current?.click()} className="w-full py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">📤 {modalFotos.foto_antes_url?'Cambiar':'Subir'}</button>
                {fotoAntes && <button onClick={() => subirFoto(modalFotos.id, 'antes', fotoAntes)} className="w-full mt-2 py-2 bg-blue-600 text-white rounded-lg text-sm">✅ Confirmar</button>}
              </div>
              {/* Después */}
              <div className="text-center">
                <p className="font-semibold text-gray-700 mb-3">✨ Después</p>
                {modalFotos.foto_despues_url
                  ? <img src={`http://localhost:5000${modalFotos.foto_despues_url}`} className="w-full h-40 object-cover rounded-xl border mb-3" alt="después"/>
                  : <div className="w-full h-40 bg-gray-50 rounded-xl border-2 border-dashed flex items-center justify-center text-gray-400 mb-3">Sin foto</div>}
                <input ref={fotoDespuesRef} type="file" accept="image/*" className="hidden" onChange={e => setFotoDespues(e.target.files[0])}/>
                <button onClick={() => fotoDespuesRef.current?.click()} className="w-full py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">📤 {modalFotos.foto_despues_url?'Cambiar':'Subir'}</button>
                {fotoDespues && <button onClick={() => subirFoto(modalFotos.id, 'despues', fotoDespues)} className="w-full mt-2 py-2 bg-blue-600 text-white rounded-lg text-sm">✅ Confirmar</button>}
              </div>
            </div>
            <div className="p-5 pt-0">
              <button onClick={() => setModalFotos(null)} className="w-full py-2 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200">Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}