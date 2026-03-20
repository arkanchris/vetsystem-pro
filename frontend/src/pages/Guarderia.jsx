import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import toast, { Toaster } from 'react-hot-toast';

const COMPORTAMIENTO_COLOR = {
  excelente: 'bg-green-100 text-green-700',
  bueno:     'bg-teal-100 text-teal-700',
  normal:    'bg-gray-100 text-gray-600',
  agitado:   'bg-orange-100 text-orange-700',
  agresivo:  'bg-red-100 text-red-700',
};

export default function Guarderia() {
  const [tab, setTab]               = useState('activas');
  const [estancias, setEstancias]   = useState([]);
  const [estanciaSel, setEstanciaSel] = useState(null);
  const [aforo, setAforo]           = useState({ capacidad:20, actual:0, disponibles:20, porcentaje:0 });
  const [config, setConfig]         = useState({});
  const [pacientes, setPacientes]   = useState([]);
  const [cargando, setCargando]     = useState(true);

  // Modales
  const [modalEstancia,  setModalEstancia]  = useState(false);
  const [modalRegistro,  setModalRegistro]  = useState(false);
  const [modalDocumento, setModalDocumento] = useState(false);
  const [modalConfig,    setModalConfig]    = useState(false);
  const [modalFinalizar, setModalFinalizar] = useState(false);

  // Forms
  const [formEstancia, setFormEstancia] = useState({
    paciente_id:'', fecha_ingreso:'', fecha_salida_estimada:'',
    incluye_adiestramiento:false, incluye_transporte:false,
    direccion_recogida:'', condicion_medica:'', observaciones:''
  });
  const [formRegistro, setFormRegistro] = useState({
    fecha:'', hora_entrada:'', hora_salida:'',
    comportamiento:'normal', alimentacion:'normal', observaciones:''
  });
  const [formConfig, setFormConfig] = useState({
    capacidad_maxima:20, precio_dia:30000,
    precio_dia_con_adiestramiento:50000, precio_transporte:15000,
    horario_apertura:'07:00', horario_cierre:'19:00', requisitos:''
  });
  const [formFinalizar, setFormFinalizar] = useState({
    fecha_salida_real:'', pagado:false, metodo_pago:'', observaciones:''
  });

  // Documentos
  const [archivoDoc,   setArchivoDoc]   = useState(null);
  const [nombreDoc,    setNombreDoc]    = useState('');
  const [subiendoDoc,  setSubiendoDoc]  = useState(false);
  const docRef = useRef(null);

  useEffect(() => { cargarDatos(); }, []);

  const cargarDatos = async (estado = 'activo') => {
    setCargando(true);
    try {
      const [est, afo, conf, pac] = await Promise.all([
        api.get('/guarderia/estancias', { params: { estado } }),
        api.get('/guarderia/aforo'),
        api.get('/guarderia/config'),
        api.get('/pacientes'),
      ]);
      setEstancias(est.data);
      setAforo(afo.data);
      setConfig(conf.data || {});
      setPacientes(pac.data);
    } catch { toast.error('Error al cargar datos'); }
    finally { setCargando(false); }
  };

  const cargarEstancia = async (id) => {
    try {
      const r = await api.get(`/guarderia/estancias/${id}`);
      setEstanciaSel(r.data);
    } catch { toast.error('Error al cargar estancia'); }
  };

  useEffect(() => {
    const mapa = { activas:'activo', historial:'finalizada' };
    cargarDatos(mapa[tab] || 'activo');
    setEstanciaSel(null);
  }, [tab]);

  // ── HANDLERS ──────────────────────────────────────────────────────────────
  const handleEstancia = async (e) => {
    e.preventDefault();
    try {
      await api.post('/guarderia/estancias', formEstancia);
      toast.success('✅ Estancia registrada');
      setModalEstancia(false);
      await cargarDatos();
    } catch (err) { toast.error(err.response?.data?.error || 'Error al registrar'); }
  };

  const handleRegistro = async (e) => {
    e.preventDefault();
    try {
      await api.post('/guarderia/registros', { ...formRegistro, estancia_id: estanciaSel.id });
      toast.success('✅ Registro guardado');
      setModalRegistro(false);
      await cargarEstancia(estanciaSel.id);
    } catch { toast.error('Error'); }
  };

  const handleFinalizar = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/guarderia/estancias/${estanciaSel.id}`, {
        estado: 'finalizada', ...formFinalizar
      });
      toast.success('✅ Estancia finalizada');
      setModalFinalizar(false);
      setEstanciaSel(null);
      await cargarDatos();
    } catch { toast.error('Error al finalizar'); }
  };

  const handleConfig = async (e) => {
    e.preventDefault();
    try {
      await api.put('/guarderia/config', formConfig);
      toast.success('✅ Configuración guardada');
      setModalConfig(false);
      const r = await api.get('/guarderia/config');
      setConfig(r.data || {});
    } catch { toast.error('Error'); }
  };

  const subirDocumento = async () => {
    if (!archivoDoc) return toast.error('Selecciona un archivo');
    setSubiendoDoc(true);
    try {
      const fd = new FormData();
      fd.append('archivo', archivoDoc);
      fd.append('estancia_id', estanciaSel.id);
      fd.append('nombre', nombreDoc || archivoDoc.name);
      await api.post('/guarderia/documentos', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('✅ Documento subido');
      setArchivoDoc(null);
      setNombreDoc('');
      if (docRef.current) docRef.current.value = '';
      await cargarEstancia(estanciaSel.id);
    } catch { toast.error('Error al subir'); }
    finally { setSubiendoDoc(false); }
  };

  const eliminarDocumento = async (docId) => {
    if (!confirm('¿Eliminar este documento?')) return;
    try {
      await api.delete(`/guarderia/documentos/${docId}`);
      toast.success('✅ Eliminado');
      await cargarEstancia(estanciaSel.id);
    } catch { toast.error('Error'); }
  };

  const calcularCostoFinalizar = () => {
    if (!estanciaSel) return 0;
    const fechaSalida = formFinalizar.fecha_salida_real || new Date().toISOString().split('T')[0];
    const dias = Math.ceil((new Date(fechaSalida) - new Date(estanciaSel.fecha_ingreso)) / 86400000) || 1;
    return dias * (parseFloat(estanciaSel.precio_dia) || 0);
  };

  const diasTranscurridos = (est) =>
    Math.ceil((Date.now() - new Date(est.fecha_ingreso)) / 86400000) || 0;

  return (
    <div className="p-6">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">🏡 Guardería</h1>
          <p className="text-gray-500">Control de estancias y cuidado diario</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setFormConfig({ ...config }); setModalConfig(true); }}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-200">
            ⚙️ Configurar
          </button>
          <button onClick={() => {
            setFormEstancia({ paciente_id:'', fecha_ingreso:'', fecha_salida_estimada:'', incluye_adiestramiento:false, incluye_transporte:false, direccion_recogida:'', condicion_medica:'', observaciones:'' });
            setModalEstancia(true);
          }} className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-xl font-semibold shadow-md shadow-amber-200 border border-amber-600">
            🏡 + Nueva Estancia
          </button>
        </div>
      </div>

      {/* Panel de aforo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow p-4 border-l-4 border-amber-400">
          <p className="text-xs text-gray-500 font-semibold uppercase">Ocupación</p>
          <p className="text-2xl font-bold text-amber-600">{aforo.actual}/{aforo.capacidad}</p>
        </div>
        <div className={`bg-white rounded-xl shadow p-4 border-l-4 ${aforo.disponibles > 3 ? 'border-green-400' : aforo.disponibles > 0 ? 'border-orange-400' : 'border-red-400'}`}>
          <p className="text-xs text-gray-500 font-semibold uppercase">Disponibles</p>
          <p className={`text-2xl font-bold ${aforo.disponibles > 3 ? 'text-green-600' : aforo.disponibles > 0 ? 'text-orange-600' : 'text-red-600'}`}>
            {aforo.disponibles}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 border-l-4 border-blue-300">
          <p className="text-xs text-gray-500 font-semibold uppercase">Precio/día</p>
          <p className="text-xl font-bold text-blue-600">${parseFloat(config.precio_dia||0).toLocaleString('es-CO')}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 border-l-4 border-purple-300">
          <p className="text-xs text-gray-500 font-semibold uppercase">Horario</p>
          <p className="text-sm font-bold text-purple-600">{config.horario_apertura||'07:00'} – {config.horario_cierre||'19:00'}</p>
        </div>
      </div>

      {/* Barra de ocupación */}
      <div className="bg-white rounded-xl shadow p-4 mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Ocupación del espacio</span>
          <span className="font-bold">{aforo.porcentaje}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-5">
          <div className={`h-5 rounded-full transition-all flex items-center justify-center text-xs text-white font-bold ${
            aforo.porcentaje >= 90 ? 'bg-red-500' : aforo.porcentaje >= 70 ? 'bg-orange-500' : 'bg-green-500'
          }`} style={{ width: `${Math.max(aforo.porcentaje, 4)}%` }}>
            {aforo.porcentaje > 15 ? `${aforo.actual}/${aforo.capacidad}` : ''}
          </div>
        </div>
        {aforo.porcentaje >= 90 && (
          <p className="text-xs text-red-600 font-medium mt-2">⚠️ Guardería casi llena — considera ampliar capacidad</p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-white rounded-xl shadow p-2 w-fit">
        {[['activas','🐾 Activas'],['historial','📋 Historial']].map(([k,l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-5 py-2 rounded-lg font-medium text-sm transition ${tab===k?'bg-amber-500 text-white':'text-gray-600 hover:bg-gray-100'}`}>
            {l}
          </button>
        ))}
      </div>

      {/* ═══ CONTENIDO PRINCIPAL ═══════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Lista */}
        <div className="lg:col-span-4">
          <div className="bg-white rounded-2xl shadow p-4">
            <h2 className="font-bold text-gray-800 mb-3">
              {tab === 'activas' ? '🐾 En guardería ahora' : '📋 Historial de estancias'}
            </h2>
            {cargando ? (
              <div className="text-center py-8 text-gray-400">⏳ Cargando...</div>
            ) : estancias.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <p className="text-3xl mb-2">🏡</p>
                <p className="text-sm">{tab==='activas' ? 'No hay mascotas actualmente' : 'Sin historial'}</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[65vh] overflow-y-auto pr-1">
                {estancias.map(e => (
                  <button key={e.id} onClick={() => cargarEstancia(e.id)}
                    className={`w-full text-left rounded-xl p-3 border-2 transition ${
                      estanciaSel?.id===e.id ? 'border-amber-400 bg-amber-50' : 'border-gray-100 hover:border-amber-200'
                    }`}>
                    <div className="flex items-center gap-3">
                      {e.foto_url
                        ? <img src={`http://localhost:5000${e.foto_url}`} className="w-11 h-11 rounded-full object-cover border-2 border-amber-200 flex-shrink-0" alt=""/>
                        : <div className="w-11 h-11 rounded-full bg-amber-100 flex items-center justify-center text-xl flex-shrink-0">🐾</div>}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 text-sm truncate">{e.paciente_nombre}</p>
                        <p className="text-xs text-gray-500 truncate">{e.especie} · {e.propietario_nombre||'Sin tutor'}</p>
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {e.incluye_adiestramiento && <span className="text-xs bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded-full">🎓</span>}
                          {e.incluye_transporte     && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">🚗</span>}
                          {e.condicion_medica       && <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">⚕️</span>}
                          {e.vacunas_verificadas    && <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">💉✓</span>}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        {tab === 'activas'
                          ? <p className="font-bold text-amber-600 text-lg">{diasTranscurridos(e)}d</p>
                          : <p className="text-xs text-gray-400">{new Date(e.fecha_salida_real||e.fecha_ingreso).toLocaleDateString('es-CO')}</p>}
                        <p className="text-xs text-gray-400">{new Date(e.fecha_ingreso).toLocaleDateString('es-CO')}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Detalle */}
        <div className="lg:col-span-8">
          {!estanciaSel ? (
            <div className="bg-white rounded-2xl shadow p-12 text-center">
              <div className="text-6xl mb-4">🏡</div>
              <p className="text-gray-500 font-medium">Selecciona una estancia para ver el detalle</p>
            </div>
          ) : (
            <div className="space-y-4">

              {/* Header del paciente */}
              <div className="bg-white rounded-2xl shadow p-5">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4">
                    {estanciaSel.foto_url
                      ? <img src={`http://localhost:5000${estanciaSel.foto_url}`} className="w-16 h-16 rounded-full object-cover border-2 border-amber-200" alt=""/>
                      : <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center text-3xl">🐾</div>}
                    <div>
                      <h2 className="text-xl font-bold text-gray-800">{estanciaSel.paciente_nombre}</h2>
                      <p className="text-sm text-gray-500">{estanciaSel.especie} · {estanciaSel.raza||'-'}</p>
                      {estanciaSel.propietario_nombre && (
                        <p className="text-xs text-gray-400">
                          👤 {estanciaSel.propietario_nombre} {estanciaSel.propietario_apellido||''} · 📞 {estanciaSel.propietario_telefono||'-'}
                        </p>
                      )}
                      {estanciaSel.propietario_email && <p className="text-xs text-gray-400">✉️ {estanciaSel.propietario_email}</p>}
                      <p className="text-xs text-gray-400 mt-1">
                        📅 Ingreso: {new Date(estanciaSel.fecha_ingreso).toLocaleDateString('es-CO')}
                        {estanciaSel.fecha_salida_estimada && ` · Salida est: ${new Date(estanciaSel.fecha_salida_estimada).toLocaleDateString('es-CO')}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex gap-1 flex-wrap justify-end">
                      {estanciaSel.incluye_adiestramiento && <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">🎓 Adiestramiento</span>}
                      {estanciaSel.incluye_transporte     && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">🚗 Transporte</span>}
                      {estanciaSel.vacunas_verificadas    && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">💉 Vacunas OK</span>}
                    </div>
                    {estanciaSel.condicion_medica && (
                      <span className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded-lg border border-red-200 max-w-40 text-right">
                        ⚕️ {estanciaSel.condicion_medica}
                      </span>
                    )}
                    {estanciaSel.estado === 'activo' && (
                      <div className="flex gap-2 mt-1">
                        <button onClick={() => {
                          setFormFinalizar({ fecha_salida_real: new Date().toISOString().split('T')[0], pagado:false, metodo_pago:'', observaciones:'' });
                          setModalFinalizar(true);
                        }} className="bg-amber-500 text-white text-xs px-4 py-2 rounded-xl hover:bg-amber-600 font-medium">
                          🏁 Finalizar
                        </button>
                      </div>
                    )}
                    {estanciaSel.estado === 'finalizada' && (
                      <div className="text-right">
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">Finalizada</span>
                        {estanciaSel.costo_total > 0 && (
                          <p className="text-sm font-bold text-green-700 mt-1">${parseFloat(estanciaSel.costo_total).toLocaleString('es-CO')}</p>
                        )}
                        {estanciaSel.pagado && <p className="text-xs text-green-600">✅ Pagado</p>}
                      </div>
                    )}
                  </div>
                </div>
                {estanciaSel.observaciones && (
                  <div className="mt-3 bg-amber-50 rounded-xl p-3 text-sm text-gray-600">
                    📝 {estanciaSel.observaciones}
                  </div>
                )}
              </div>

              {/* Estado de vacunas del paciente */}
              {estanciaSel.vacunas?.length > 0 && (
                <div className="bg-white rounded-2xl shadow p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-bold text-gray-800 text-sm">💉 Vacunas del paciente</h3>
                    {estanciaSel.estado === 'activo' && (
                      <button onClick={async () => {
                        await api.put(`/guarderia/estancias/${estanciaSel.id}`, { ...estanciaSel, vacunas_verificadas: true });
                        toast.success('✅ Vacunas verificadas');
                        await cargarEstancia(estanciaSel.id);
                      }} className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-lg hover:bg-green-200">
                        ✅ Marcar como verificadas
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {estanciaSel.vacunas.map(v => {
                      const vencida = v.fecha_proxima && new Date(v.fecha_proxima) < new Date();
                      return (
                        <span key={v.id} className={`text-xs px-2 py-1 rounded-full ${vencida?'bg-red-100 text-red-700':'bg-green-100 text-green-700'}`}>
                          💉 {v.nombre} {v.fecha_proxima ? (vencida ? '⚠️ Vencida' : '✅') : ''}
                        </span>
                      );
                    })}
                  </div>
                  {config.requisitos && (
                    <p className="text-xs text-gray-400 mt-2 italic">📋 Requisitos: {config.requisitos}</p>
                  )}
                </div>
              )}

              {/* Registros diarios */}
              <div className="bg-white rounded-2xl shadow p-5">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-800">📅 Registros Diarios ({estanciaSel.registros?.length||0})</h3>
                  {estanciaSel.estado === 'activo' && (
                    <button onClick={() => {
                      setFormRegistro({ fecha: new Date().toISOString().split('T')[0], hora_entrada:'', hora_salida:'', comportamiento:'normal', alimentacion:'normal', observaciones:'' });
                      setModalRegistro(true);
                    }} className="bg-amber-100 text-amber-700 text-xs px-3 py-1.5 rounded-lg hover:bg-amber-200 font-medium">
                      + Registrar día
                    </button>
                  )}
                </div>
                {(!estanciaSel.registros || estanciaSel.registros.length === 0) ? (
                  <div className="text-center py-4 text-gray-400 bg-gray-50 rounded-xl">
                    <p className="text-2xl mb-1">📋</p>
                    <p className="text-sm">Sin registros diarios aún</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto">
                    {estanciaSel.registros.map(r => (
                      <div key={r.id} className="flex justify-between items-start bg-gray-50 rounded-xl p-3 border text-sm">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-gray-800">{new Date(r.fecha + 'T12:00:00').toLocaleDateString('es-CO', { weekday:'short', day:'numeric', month:'short' })}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${COMPORTAMIENTO_COLOR[r.comportamiento]}`}>{r.comportamiento}</span>
                            <span className="text-xs text-gray-400">🍽️ {r.alimentacion}</span>
                          </div>
                          {r.observaciones && <p className="text-xs text-gray-500">{r.observaciones}</p>}
                        </div>
                        <div className="text-xs text-gray-400 text-right flex-shrink-0">
                          {r.hora_entrada && <p>🔼 {r.hora_entrada}</p>}
                          {r.hora_salida  && <p>🔽 {r.hora_salida}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Documentos */}
              <div className="bg-white rounded-2xl shadow p-5">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-bold text-gray-800">📎 Documentos ({estanciaSel.documentos?.length||0})</h3>
                  {estanciaSel.estado === 'activo' && (
                    <button onClick={() => setModalDocumento(true)}
                      className="bg-indigo-100 text-indigo-700 text-xs px-3 py-1.5 rounded-lg hover:bg-indigo-200 font-medium">
                      + Subir
                    </button>
                  )}
                </div>
                {(!estanciaSel.documentos || estanciaSel.documentos.length === 0) ? (
                  <p className="text-center text-gray-400 text-sm py-2">Sin documentos adjuntos</p>
                ) : (
                  <div className="flex gap-2 flex-wrap">
                    {estanciaSel.documentos.map(d => (
                      <div key={d.id} className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-3 py-2 rounded-lg border border-indigo-200 text-xs">
                        <span>{d.tipo==='pdf'?'📄':d.tipo==='imagen'?'🖼️':'📎'}</span>
                        <a href={`http://localhost:5000${d.archivo_url}`} target="_blank" rel="noreferrer" className="hover:underline">{d.nombre}</a>
                        <button onClick={() => eliminarDocumento(d.id)} className="text-red-400 hover:text-red-600 ml-1 font-bold">×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══ MODAL NUEVA ESTANCIA ═══════════════════════════════════════════ */}
      {modalEstancia && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-4 max-h-[95vh] flex flex-col">
            <div className="p-5 border-b"><h2 className="text-lg font-bold">🏡 Nueva Estancia en Guardería</h2></div>
            <form onSubmit={handleEstancia} className="p-5 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Paciente *</label>
                <select value={formEstancia.paciente_id} onChange={e => setFormEstancia(p=>({...p,paciente_id:e.target.value}))}
                  required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400">
                  <option value="">Seleccionar paciente</option>
                  {pacientes.map(p => <option key={p.id} value={p.id}>{p.nombre} ({p.especie})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha ingreso *</label>
                  <input type="date" value={formEstancia.fecha_ingreso} onChange={e => setFormEstancia(p=>({...p,fecha_ingreso:e.target.value}))}
                    required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Salida estimada</label>
                  <input type="date" value={formEstancia.fecha_salida_estimada} onChange={e => setFormEstancia(p=>({...p,fecha_salida_estimada:e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"/>
                </div>
              </div>

              {/* Servicios adicionales */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                <p className="text-sm font-semibold text-amber-700">🛎️ Servicios adicionales</p>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={formEstancia.incluye_adiestramiento}
                    onChange={e => setFormEstancia(p=>({...p,incluye_adiestramiento:e.target.checked}))}
                    className="w-4 h-4 accent-amber-500"/>
                  <span className="text-sm text-gray-700">
                    🎓 Adiestramiento incluido
                    <span className="text-xs text-amber-600 ml-1">(+${parseFloat(config.precio_dia_con_adiestramiento||50000).toLocaleString('es-CO')}/día)</span>
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={formEstancia.incluye_transporte}
                    onChange={e => setFormEstancia(p=>({...p,incluye_transporte:e.target.checked}))}
                    className="w-4 h-4 accent-amber-500"/>
                  <span className="text-sm text-gray-700">
                    🚗 Transporte de recogida
                    <span className="text-xs text-amber-600 ml-1">(+${parseFloat(config.precio_transporte||15000).toLocaleString('es-CO')})</span>
                  </span>
                </label>
              </div>

              {formEstancia.incluye_transporte && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dirección de recogida</label>
                  <input value={formEstancia.direccion_recogida} onChange={e => setFormEstancia(p=>({...p,direccion_recogida:e.target.value}))}
                    placeholder="Calle, barrio, ciudad..." className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"/>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Condición médica especial</label>
                <input value={formEstancia.condicion_medica} onChange={e => setFormEstancia(p=>({...p,condicion_medica:e.target.value}))}
                  placeholder="Ej: epilepsia, diabetes, ansiedad, alergia..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
                <textarea value={formEstancia.observaciones} onChange={e => setFormEstancia(p=>({...p,observaciones:e.target.value}))}
                  rows={2} placeholder="Instrucciones especiales, alimentación, rutinas..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"/>
              </div>

              {config.requisitos && (
                <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700">
                  📋 <b>Requisitos:</b> {config.requisitos}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalEstancia(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancelar</button>
                <button type="submit"
                  className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 font-medium">Registrar estancia</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ MODAL REGISTRO DIARIO ══════════════════════════════════════════ */}
      {modalRegistro && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-5 border-b">
              <h2 className="text-lg font-bold">📅 Registro del Día</h2>
              <p className="text-sm text-gray-500 mt-0.5">{estanciaSel?.paciente_nombre}</p>
            </div>
            <form onSubmit={handleRegistro} className="p-5 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Fecha *</label>
                  <input type="date" value={formRegistro.fecha} onChange={e => setFormRegistro(p=>({...p,fecha:e.target.value}))}
                    required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-400"/>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Hora entrada</label>
                  <input type="time" value={formRegistro.hora_entrada} onChange={e => setFormRegistro(p=>({...p,hora_entrada:e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-400"/>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Hora salida</label>
                  <input type="time" value={formRegistro.hora_salida} onChange={e => setFormRegistro(p=>({...p,hora_salida:e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-400"/>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Comportamiento</label>
                  <select value={formRegistro.comportamiento} onChange={e => setFormRegistro(p=>({...p,comportamiento:e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none">
                    {[['excelente','⭐ Excelente'],['bueno','👍 Bueno'],['normal','😐 Normal'],['agitado','😬 Agitado'],['agresivo','⚠️ Agresivo']].map(([k,l]) => (
                      <option key={k} value={k}>{l}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Alimentación</label>
                  <select value={formRegistro.alimentacion} onChange={e => setFormRegistro(p=>({...p,alimentacion:e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none">
                    {[['normal','✅ Normal'],['reducida','⬇️ Reducida'],['nula','❌ No comió']].map(([k,l]) => (
                      <option key={k} value={k}>{l}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones del día</label>
                <textarea value={formRegistro.observaciones} onChange={e => setFormRegistro(p=>({...p,observaciones:e.target.value}))}
                  rows={2} placeholder="¿Jugó? ¿Estuvo tranquilo? ¿Alguna novedad?"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"/>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalRegistro(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancelar</button>
                <button type="submit"
                  className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 font-medium">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ MODAL DOCUMENTOS ═══════════════════════════════════════════════ */}
      {modalDocumento && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-5 border-b flex justify-between items-center">
              <h2 className="text-lg font-bold">📎 Subir Documento</h2>
              <button onClick={() => setModalDocumento(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del documento</label>
                <input value={nombreDoc} onChange={e => setNombreDoc(e.target.value)}
                  placeholder="Ej: Carnet de vacunas, Autorización..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Archivo (PDF o imagen)</label>
                <input ref={docRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={e => setArchivoDoc(e.target.files[0])}
                  className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-indigo-100 file:text-indigo-700 hover:file:bg-indigo-200"/>
              </div>
              <button onClick={subirDocumento} disabled={subiendoDoc || !archivoDoc}
                className="w-full py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 font-medium">
                {subiendoDoc ? '⏳ Subiendo...' : '📤 Subir documento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL FINALIZAR ESTANCIA ═══════════════════════════════════════ */}
      {modalFinalizar && estanciaSel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-5 border-b">
              <h2 className="text-lg font-bold">🏁 Finalizar Estancia</h2>
              <p className="text-sm text-gray-500 mt-0.5">{estanciaSel.paciente_nombre}</p>
            </div>
            <form onSubmit={handleFinalizar} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de salida real</label>
                <input type="date" value={formFinalizar.fecha_salida_real}
                  onChange={e => setFormFinalizar(p=>({...p,fecha_salida_real:e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"/>
              </div>

              {/* Resumen de costos */}
              <div className="bg-green-50 rounded-xl p-4 space-y-1 text-sm">
                <p className="font-semibold text-green-800">💰 Resumen de costos</p>
                {(() => {
                  const costo = calcularCostoFinalizar();
                  const dias = Math.ceil((new Date(formFinalizar.fecha_salida_real||new Date().toISOString().split('T')[0]) - new Date(estanciaSel.fecha_ingreso)) / 86400000) || 1;
                  return (
                    <>
                      <p className="text-green-700">{dias} día{dias!==1?'s':''} × ${parseFloat(estanciaSel.precio_dia||0).toLocaleString('es-CO')}/día</p>
                      <p className="text-green-800 font-bold text-lg">Total: ${costo.toLocaleString('es-CO')}</p>
                    </>
                  );
                })()}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Método de pago</label>
                  <select value={formFinalizar.metodo_pago} onChange={e => setFormFinalizar(p=>({...p,metodo_pago:e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400">
                    <option value="">Seleccionar</option>
                    <option value="efectivo">Efectivo</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="tarjeta">Tarjeta</option>
                  </select>
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={formFinalizar.pagado}
                      onChange={e => setFormFinalizar(p=>({...p,pagado:e.target.checked}))}
                      className="w-4 h-4 accent-amber-500"/>
                    <span className="text-sm font-medium text-gray-700">Marcar como pagado</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones de salida</label>
                <textarea value={formFinalizar.observaciones} onChange={e => setFormFinalizar(p=>({...p,observaciones:e.target.value}))}
                  rows={2} placeholder="Recomendaciones, novedades..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"/>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalFinalizar(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancelar</button>
                <button type="submit"
                  className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 font-medium">Finalizar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ MODAL CONFIGURACIÓN ════════════════════════════════════════════ */}
      {modalConfig && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md my-4">
            <div className="p-5 border-b"><h2 className="text-lg font-bold">⚙️ Configuración Guardería</h2></div>
            <form onSubmit={handleConfig} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Capacidad máxima</label>
                  <input type="number" value={formConfig.capacidad_maxima} onChange={e => setFormConfig(p=>({...p,capacidad_maxima:e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Precio por día ($)</label>
                  <input type="number" value={formConfig.precio_dia} onChange={e => setFormConfig(p=>({...p,precio_dia:e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Precio c/ adiestramiento ($)</label>
                  <input type="number" value={formConfig.precio_dia_con_adiestramiento} onChange={e => setFormConfig(p=>({...p,precio_dia_con_adiestramiento:e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Precio transporte ($)</label>
                  <input type="number" value={formConfig.precio_transporte} onChange={e => setFormConfig(p=>({...p,precio_transporte:e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hora apertura</label>
                  <input type="time" value={formConfig.horario_apertura} onChange={e => setFormConfig(p=>({...p,horario_apertura:e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hora cierre</label>
                  <input type="time" value={formConfig.horario_cierre} onChange={e => setFormConfig(p=>({...p,horario_cierre:e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"/>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Requisitos de ingreso</label>
                <textarea value={formConfig.requisitos} onChange={e => setFormConfig(p=>({...p,requisitos:e.target.value}))}
                  rows={3} placeholder="Vacunas requeridas, documentos, etc."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"/>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalConfig(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancelar</button>
                <button type="submit"
                  className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 font-medium">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}