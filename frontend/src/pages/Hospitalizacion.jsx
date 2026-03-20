import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import toast, { Toaster } from 'react-hot-toast';

const PRONOSTICO_COLOR = { bueno:'bg-green-100 text-green-700', reservado:'bg-yellow-100 text-yellow-700', grave:'bg-orange-100 text-orange-700', critico:'bg-red-100 text-red-700' };
const ESTADO_GRAL_COLOR = { estable:'text-green-600', mejorando:'text-teal-600', sin_cambio:'text-gray-500', empeorando:'text-orange-600', critico:'text-red-600' };
const JAULA_COLOR = { libre:'bg-green-100 text-green-700 border-green-300', ocupada:'bg-red-100 text-red-700 border-red-300', en_limpieza:'bg-yellow-100 text-yellow-700 border-yellow-300', mantenimiento:'bg-gray-100 text-gray-600 border-gray-300' };
const JAULA_TIPO_COLOR = { standard:'bg-blue-50', uci:'bg-red-50', aislamiento:'bg-orange-50', recuperacion:'bg-teal-50' };

export default function Hospitalizacion() {
  const [tab, setTab]               = useState('panel');
  const [jaulas, setJaulas]         = useState([]);
  const [hospitalizaciones, setHospitalizaciones] = useState([]);
  const [hospSel, setHospSel]       = useState(null);
  const [pacientes, setPacientes]   = useState([]);
  const [medicamentos, setMedicamentos] = useState([]);
  const [filtroEstado, setFiltroEstado] = useState('activo');
  const [cargando, setCargando]     = useState(true);

  const [busqueda, setBusqueda]             = useState('');
  const [historiasPaciente, setHistoriasPaciente] = useState(null); // { historias, vacunas }
  const [modalHistorias, setModalHistorias] = useState(false);
  const [modalDocHosp, setModalDocHosp]     = useState(false);
  const [archivoHosp, setArchivoHosp]       = useState(null);
  const [nombreDocHosp, setNombreDocHosp]   = useState('');
  const [subiendoHosp, setSubiendoHosp]     = useState(false);
  const docHospRef = useRef(null);
  const [modalIngreso, setModalIngreso]   = useState(false);
  const [modalEvolucion, setModalEvolucion] = useState(false);
  const [modalMedicamento, setModalMedicamento] = useState(false);
  const [modalAltaMedica, setModalAltaMedica] = useState(false);

  const [formIngreso, setFormIngreso] = useState({ paciente_id:'', jaula_id:'', motivo_ingreso:'', diagnostico_ingreso:'', pronostico:'reservado', costo_dia:'' });
  const [formEvolucion, setFormEvolucion] = useState({ temperatura:'', pulso:'', frecuencia_respiratoria:'', peso:'', estado_general:'estable', descripcion:'', tratamiento_aplicado:'', alimentacion:'normal', hidratacion:'normal' });
  const [formMed, setFormMed] = useState({ medicamento_id:'', nombre_medicamento:'', dosis:'', via_administracion:'', frecuencia:'', fecha_inicio:'', fecha_fin:'', notas:'' });
  const [formAlta, setFormAlta] = useState({ estado:'alta', notas_alta:'' });

  useEffect(() => { cargarDatos(); }, []);

  const cargarDatos = async () => {
    try {
      const [j, h, pac, med] = await Promise.all([
        api.get('/hospitalizacion/jaulas'),
        api.get('/hospitalizacion', { params: { estado: filtroEstado } }),
        api.get('/pacientes'),
        api.get('/medicamentos')
      ]);
      setJaulas(j.data);
      setHospitalizaciones(h.data);
      setPacientes(pac.data);
      setMedicamentos(med.data);
    } catch { toast.error('Error al cargar datos'); }
    finally { setCargando(false); }
  };

  const verHistorialesPaciente = async (pacienteId) => {
    try {
      const r = await api.get(`/hospitalizacion/historiales/${pacienteId}`);
      setHistoriasPaciente(r.data);
      setModalHistorias(true);
    } catch { toast.error('Error al cargar historial clínico'); }
  };

  const subirDocHosp = async () => {
    if (!archivoHosp) return toast.error('Selecciona un archivo');
    setSubiendoHosp(true);
    try {
      const fd = new FormData();
      fd.append('archivo', archivoHosp);
      fd.append('hospitalizacion_id', hospSel.id);
      fd.append('nombre', nombreDocHosp || archivoHosp.name);
      await api.post('/hospitalizacion/documentos', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('✅ Documento subido');
      setArchivoHosp(null); setNombreDocHosp('');
      if (docHospRef.current) docHospRef.current.value = '';
      await cargarHosp(hospSel.id);
    } catch { toast.error('Error al subir'); }
    finally { setSubiendoHosp(false); }
  };

  const eliminarDocHosp = async (docId) => {
    if (!confirm('¿Eliminar este documento?')) return;
    try {
      await api.delete(`/hospitalizacion/documentos/${docId}`);
      toast.success('✅ Eliminado');
      await cargarHosp(hospSel.id);
    } catch { toast.error('Error'); }
  };

  const cargarHosp = async (id) => {
    try {
      const r = await api.get(`/hospitalizacion/${id}`);
      setHospSel(r.data);
    } catch { toast.error('Error'); }
  };

  useEffect(() => { cargarDatos(); }, [filtroEstado]);

  const handleIngreso = async (e) => {
    e.preventDefault();
    try {
      await api.post('/hospitalizacion', formIngreso);
      toast.success('✅ Paciente hospitalizado');
      setModalIngreso(false);
      await cargarDatos();
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  const handleEvolucion = async (e) => {
    e.preventDefault();
    try {
      await api.post('/hospitalizacion/evoluciones', { ...formEvolucion, hospitalizacion_id: hospSel.id });
      toast.success('✅ Evolución registrada');
      setModalEvolucion(false);
      await cargarHosp(hospSel.id);
    } catch { toast.error('Error'); }
  };

  const handleMedicamento = async (e) => {
    e.preventDefault();
    try {
      await api.post('/hospitalizacion/medicamentos', { ...formMed, hospitalizacion_id: hospSel.id });
      toast.success('✅ Medicamento registrado');
      setModalMedicamento(false);
      await cargarHosp(hospSel.id);
    } catch { toast.error('Error'); }
  };

  const handleAlta = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/hospitalizacion/${hospSel.id}`, formAlta);
      toast.success(`✅ ${formAlta.estado === 'alta' ? 'Alta médica registrada' : 'Estado actualizado'}`);
      setModalAltaMedica(false);
      await cargarDatos();
      setHospSel(null);
    } catch { toast.error('Error'); }
  };

  const jaulasLibres   = jaulas.filter(j => j.estado === 'libre').length;
  const jaulasOcupadas = jaulas.filter(j => j.estado === 'ocupada').length;

  return (
    <div className="p-6">
      <Toaster position="top-right" />
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">🏥 Hospitalización</h1>
          <p className="text-gray-500">Control de pacientes hospitalizados</p>
        </div>
        <button onClick={() => { setFormIngreso({ paciente_id:'', jaula_id:'', motivo_ingreso:'', diagnostico_ingreso:'', pronostico:'reservado', costo_dia:'' }); setModalIngreso(true); }}
          className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl font-medium">
          + Nuevo Ingreso
        </button>
      </div>

      {/* Stats rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow p-4 border-l-4 border-red-400">
          <p className="text-xs text-gray-500 font-semibold uppercase">Hospitalizados</p>
          <p className="text-2xl font-bold text-red-600">{hospitalizaciones.filter(h=>h.estado==='activo').length}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 border-l-4 border-green-400">
          <p className="text-xs text-gray-500 font-semibold uppercase">Jaulas libres</p>
          <p className="text-2xl font-bold text-green-600">{jaulasLibres}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 border-l-4 border-orange-400">
          <p className="text-xs text-gray-500 font-semibold uppercase">Jaulas ocupadas</p>
          <p className="text-2xl font-bold text-orange-600">{jaulasOcupadas}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 border-l-4 border-blue-400">
          <p className="text-xs text-gray-500 font-semibold uppercase">Total jaulas</p>
          <p className="text-2xl font-bold text-blue-600">{jaulas.length}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-white rounded-xl shadow p-2 w-fit">
        {[['panel','🗺️ Panel jaulas'],['lista','📋 Lista pacientes']].map(([k,l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-5 py-2 rounded-lg font-medium text-sm transition ${tab===k?'bg-red-600 text-white':'text-gray-600 hover:bg-gray-100'}`}>
            {l}
          </button>
        ))}
      </div>

      {/* ═══ PANEL JAULAS ══════════════════════════════════════════════════ */}
      {tab === 'panel' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className="lg:col-span-5">
            <div className="bg-white rounded-2xl shadow p-5">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-bold text-gray-800">🗺️ Mapa de Jaulas</h2>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(JAULA_COLOR).map(([k,v]) => (
                    <span key={k} className={`text-xs px-2 py-0.5 rounded-full border ${v}`}>
                      {k === 'libre' ? '🟢' : k === 'ocupada' ? '🔴' : k === 'en_limpieza' ? '🟡' : '⚪'} {k.replace('_',' ')}
                    </span>
                  ))}
                </div>
              </div>

              {/* Agrupar por tipo */}
              {['standard','recuperacion','uci','aislamiento'].map(tipo => {
                const jaulasTipo = jaulas.filter(j => j.tipo === tipo);
                if (jaulasTipo.length === 0) return null;
                const tipoLabel = { standard:'🏠 Standard', recuperacion:'💚 Recuperación', uci:'🚨 UCI', aislamiento:'⚠️ Aislamiento' }[tipo];
                return (
                  <div key={tipo} className="mb-5">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{tipoLabel}</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {jaulasTipo.map(j => (
                        <div key={j.id}
                          onClick={() => j.hospitalizacion_id && cargarHosp(j.hospitalizacion_id)}
                          className={`rounded-xl border-2 p-3 transition ${JAULA_COLOR[j.estado]} ${j.hospitalizacion_id ? 'cursor-pointer hover:shadow-md hover:scale-105' : ''}`}>
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-bold text-base">{j.numero}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                              j.estado === 'libre' ? 'bg-green-200 text-green-800' :
                              j.estado === 'ocupada' ? 'bg-red-200 text-red-800' :
                              j.estado === 'en_limpieza' ? 'bg-yellow-200 text-yellow-800' :
                              'bg-gray-200 text-gray-700'
                            }`}>
                              {j.estado === 'libre' ? 'Libre' : j.estado === 'ocupada' ? 'Ocupada' : j.estado === 'en_limpieza' ? 'Limpieza' : 'Mant.'}
                            </span>
                          </div>
                          {j.paciente_nombre ? (
                            <div>
                              <p className="text-xs font-semibold truncate">{j.paciente_nombre}</p>
                              <p className="text-xs opacity-70">{j.especie}</p>
                            </div>
                          ) : (
                            <p className="text-xs opacity-50 italic">Disponible</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detalle paciente hospitalizado */}
          <div className="lg:col-span-7">
            {!hospSel ? (
              <div className="bg-white rounded-2xl shadow p-12 text-center"><div className="text-6xl mb-3">🏥</div><p className="text-gray-500">Selecciona una jaula ocupada para ver el expediente</p></div>
            ) : (
              <div className="space-y-4">
                {/* Header paciente */}
                <div className="bg-white rounded-2xl shadow p-5">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                      {hospSel.foto_url
                        ? <img src={`http://localhost:5000${hospSel.foto_url}`} className="w-16 h-16 rounded-full object-cover border-2 border-red-200" alt=""/>
                        : <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center text-3xl">🐾</div>}
                      <div>
                        <h2 className="text-xl font-bold text-gray-800">{hospSel.paciente_nombre}</h2>
                        <p className="text-sm text-gray-500">{hospSel.especie} · {hospSel.raza||'-'} · Jaula {hospSel.jaula_numero}</p>
                        <p className="text-xs text-gray-400">Ingresó: {new Date(hospSel.fecha_ingreso).toLocaleString('es-CO')}</p>
                        <p className="text-xs text-gray-400">Vet: {hospSel.veterinario_nombre||'-'}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`text-xs px-3 py-1 rounded-full font-bold ${PRONOSTICO_COLOR[hospSel.pronostico]}`}>⚕️ {hospSel.pronostico}</span>
                      <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <button onClick={() => verHistorialesPaciente(hospSel.paciente_id)}
                          className="bg-teal-100 text-teal-700 text-xs px-3 py-1.5 rounded-lg hover:bg-teal-200 font-medium">
                          📋 H. Clínica
                        </button>
                        <button onClick={() => setModalDocHosp(true)}
                          className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${hospSel.documentos?.length>0?'bg-indigo-100 text-indigo-700 hover:bg-indigo-200':'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                          📎 Docs {hospSel.documentos?.length>0?`(${hospSel.documentos.length})`:''}
                        </button>
                      </div>
                      {hospSel.estado === 'activo' && (
                        <button onClick={() => { setFormAlta({ estado:'alta', notas_alta:'' }); setModalAltaMedica(true); }}
                          className="bg-green-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-green-700 font-medium">
                          ✅ Dar alta
                        </button>
                      )}
                    </div>
                    </div>
                  </div>
                  <div className="mt-3 bg-gray-50 rounded-xl p-3 text-sm">
                    <p className="font-medium text-gray-700">Motivo de ingreso:</p>
                    <p className="text-gray-600">{hospSel.motivo_ingreso}</p>
                    {hospSel.diagnostico_ingreso && <><p className="font-medium text-gray-700 mt-2">Diagnóstico:</p><p className="text-gray-600">{hospSel.diagnostico_ingreso}</p></>}
                  </div>
                </div>

                {/* Evoluciones */}
                <div className="bg-white rounded-2xl shadow p-5">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-gray-800">📊 Evoluciones ({hospSel.evoluciones?.length||0})</h3>
                    {hospSel.estado==='activo' && (
                      <button onClick={() => { setFormEvolucion({ temperatura:'', pulso:'', frecuencia_respiratoria:'', peso:'', estado_general:'estable', descripcion:'', tratamiento_aplicado:'', alimentacion:'normal', hidratacion:'normal' }); setModalEvolucion(true); }}
                        className="bg-blue-100 text-blue-700 text-xs px-3 py-1.5 rounded-lg hover:bg-blue-200 font-medium">
                        + Registrar evolución
                      </button>
                    )}
                  </div>
                  <div className="space-y-3 max-h-48 overflow-y-auto">
                    {(!hospSel.evoluciones || hospSel.evoluciones.length === 0)
                      ? <p className="text-center text-gray-400 py-4 text-sm">Sin evoluciones registradas</p>
                      : hospSel.evoluciones.map(ev => (
                        <div key={ev.id} className="bg-gray-50 rounded-xl p-3 border text-sm">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-xs text-gray-400">{new Date(ev.fecha).toLocaleString('es-CO')}</span>
                            <span className={`text-xs font-semibold ${ESTADO_GRAL_COLOR[ev.estado_general]}`}>● {ev.estado_general?.replace('_',' ')}</span>
                          </div>
                          {/* Signos vitales */}
                          <div className="flex gap-4 text-xs mb-2 flex-wrap">
                            {ev.temperatura && <span>🌡️ {ev.temperatura}°C</span>}
                            {ev.pulso       && <span>💗 {ev.pulso} lpm</span>}
                            {ev.frecuencia_respiratoria && <span>🫁 {ev.frecuencia_respiratoria}/min</span>}
                            {ev.peso        && <span>⚖️ {ev.peso}kg</span>}
                          </div>
                          <p className="text-gray-700">{ev.descripcion}</p>
                          {ev.tratamiento_aplicado && <p className="text-gray-500 text-xs mt-1">💊 {ev.tratamiento_aplicado}</p>}
                        </div>
                      ))
                    }
                  </div>
                </div>

                {/* Medicamentos */}
                <div className="bg-white rounded-2xl shadow p-5">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-bold text-gray-800">💊 Medicamentos ({hospSel.medicamentos?.length||0})</h3>
                    {hospSel.estado==='activo' && (
                      <button onClick={() => { setFormMed({ medicamento_id:'', nombre_medicamento:'', dosis:'', via_administracion:'', frecuencia:'', fecha_inicio:'', fecha_fin:'', notas:'' }); setModalMedicamento(true); }}
                        className="bg-orange-100 text-orange-700 text-xs px-3 py-1.5 rounded-lg hover:bg-orange-200 font-medium">
                        + Agregar
                      </button>
                    )}
                  </div>
                  {(!hospSel.medicamentos || hospSel.medicamentos.length === 0)
                    ? <p className="text-center text-gray-400 text-sm py-2">Sin medicamentos registrados</p>
                    : <div className="space-y-2">
                        {hospSel.medicamentos.map(m => (
                          <div key={m.id} className="flex justify-between items-center bg-orange-50 rounded-lg p-3 text-sm border border-orange-100">
                            <div>
                              <p className="font-medium text-gray-800">{m.nombre_medicamento || m.med_nombre}</p>
                              <p className="text-xs text-gray-500">{m.dosis} · {m.via_administracion} · {m.frecuencia}</p>
                              {(m.fecha_inicio || m.fecha_fin) && <p className="text-xs text-gray-400">{m.fecha_inicio||'-'} → {m.fecha_fin||'-'}</p>}
                            </div>
                            <button onClick={async () => { await api.delete(`/hospitalizacion/medicamentos/${m.id}`); await cargarHosp(hospSel.id); }}
                              className="text-red-400 hover:text-red-600 text-xs">🗑️</button>
                          </div>
                        ))}
                      </div>
                  }
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ LISTA PACIENTES ══════════════════════════════════════════════ */}
      {tab === 'lista' && (
        <div>
          <div className="bg-white rounded-xl shadow p-3 mb-4 flex gap-3 items-center flex-wrap">
            <div className="flex-1 min-w-48">
              <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
                placeholder="🔍 Buscar por nombre, especie, raza, jaula..."
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-300"/>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Estado:</label>
              <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none">
                <option value="">Todos</option>
                <option value="activo">Hospitalizados</option>
                <option value="alta">Con alta</option>
                <option value="fallecido">Fallecidos</option>
              </select>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>{['Paciente','Jaula','Ingreso','Pronóstico','Días','Estado','Acciones'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {hospitalizaciones
                  .filter(h => !busqueda || [h.paciente_nombre, h.especie, h.raza, h.jaula_numero, h.veterinario_nombre]
                    .some(v => v?.toLowerCase().includes(busqueda.toLowerCase())))
                  .map(h => {
                  const dias = Math.ceil((Date.now() - new Date(h.fecha_ingreso)) / 86400000);
                  return (
                    <tr key={h.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800">{h.paciente_nombre}</p>
                        <p className="text-xs text-gray-400">{h.especie} · {h.raza||'-'}</p>
                        {h.veterinario_nombre && <p className="text-xs text-gray-400">Dr. {h.veterinario_nombre}</p>}
                      </td>
                      <td className="px-4 py-3 text-sm">{h.jaula_numero||'-'} <span className="text-xs text-gray-400">({h.jaula_tipo})</span></td>
                      <td className="px-4 py-3 text-sm text-gray-600">{new Date(h.fecha_ingreso).toLocaleDateString('es-CO')}</td>
                      <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${PRONOSTICO_COLOR[h.pronostico]}`}>{h.pronostico}</span></td>
                      <td className="px-4 py-3 font-bold text-gray-800">{h.estado==='activo'?dias:'-'}</td>
                      <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${h.estado==='activo'?'bg-red-100 text-red-700':h.estado==='alta'?'bg-green-100 text-green-700':'bg-gray-100 text-gray-600'}`}>{h.estado}</span></td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => { cargarHosp(h.id); setTab('panel'); }}
                            className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs hover:bg-blue-200">🏥 Ver</button>
                          <button onClick={() => verHistorialesPaciente(h.paciente_id)}
                            className="bg-teal-100 text-teal-700 px-2 py-1 rounded text-xs hover:bg-teal-200">📋 H.Clínica</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {hospitalizaciones.length === 0 && <div className="text-center py-8 text-gray-400">Sin registros</div>}
          </div>
        </div>
      )}

      {/* ═══ MODAL HISTORIAL CLÍNICO ══════════════════════════════════════ */}
      {modalHistorias && historiasPaciente && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-4">
            <div className="p-5 border-b flex justify-between items-center">
              <h2 className="text-lg font-bold">📋 Historia Clínica del Paciente</h2>
              <button onClick={() => setModalHistorias(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>
            <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Vacunas */}
              {historiasPaciente.vacunas?.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2 text-sm">💉 Vacunas registradas</h3>
                  <div className="flex gap-2 flex-wrap">
                    {historiasPaciente.vacunas.map(v => {
                      const vencida = v.fecha_proxima && new Date(v.fecha_proxima) < new Date();
                      return (
                        <span key={v.id} className={`text-xs px-2 py-1 rounded-full ${vencida?'bg-red-100 text-red-700':'bg-green-100 text-green-700'}`}>
                          💉 {v.nombre} {v.fecha_aplicacion ? new Date(v.fecha_aplicacion).toLocaleDateString('es-CO') : ''} {vencida ? '⚠️' : '✅'}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Historias clínicas */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-3 text-sm">🩺 Consultas anteriores ({historiasPaciente.historias?.length||0})</h3>
                {historiasPaciente.historias?.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-4">Sin historias clínicas previas</p>
                ) : (
                  <div className="space-y-3">
                    {historiasPaciente.historias.map(h => (
                      <div key={h.id} className="bg-gray-50 rounded-xl p-4 border text-sm">
                        <div className="flex justify-between items-center mb-2">
                          <p className="font-semibold text-teal-700">🩺 {h.motivo_consulta}</p>
                          <div className="text-right">
                            <p className="text-xs text-gray-400">{new Date(h.fecha).toLocaleDateString('es-CO')}</p>
                            <p className="text-xs text-gray-400">Dr. {h.veterinario_nombre||'-'}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {h.diagnostico   && <div className="bg-green-50 rounded p-2"><p className="font-medium text-green-700">Diagnóstico</p><p className="text-gray-600">{h.diagnostico}</p></div>}
                          {h.tratamiento   && <div className="bg-purple-50 rounded p-2"><p className="font-medium text-purple-700">Tratamiento</p><p className="text-gray-600">{h.tratamiento}</p></div>}
                          {h.examen_fisico && <div className="bg-blue-50 rounded p-2"><p className="font-medium text-blue-700">Examen físico</p><p className="text-gray-600">{h.examen_fisico}</p></div>}
                          {h.observaciones && <div className="bg-orange-50 rounded p-2"><p className="font-medium text-orange-700">Observaciones</p><p className="text-gray-600">{h.observaciones}</p></div>}
                        </div>
                        {(h.peso_consulta || h.temperatura) && (
                          <div className="flex gap-4 mt-2 text-xs text-gray-500">
                            {h.peso_consulta && <span>⚖️ {h.peso_consulta} kg</span>}
                            {h.temperatura   && <span>🌡️ {h.temperatura}°C</span>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="p-4 border-t">
              <button onClick={() => setModalHistorias(false)}
                className="w-full py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-medium">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL DOCUMENTOS HOSPITALIZACIÓN ══════════════════════════════ */}
      {modalDocHosp && hospSel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold">📎 Documentos</h2>
                <p className="text-sm text-gray-500 mt-0.5">{hospSel.paciente_nombre}</p>
              </div>
              <button onClick={() => setModalDocHosp(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-blue-50 rounded-xl p-4 space-y-3">
                <p className="text-sm font-semibold text-blue-700">📤 Subir documento</p>
                <input value={nombreDocHosp} onChange={e => setNombreDocHosp(e.target.value)}
                  placeholder="Nombre del documento (Ej: Examen de sangre, Radiografía...)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"/>
                <input ref={docHospRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                  onChange={e => setArchivoHosp(e.target.files[0])}
                  className="w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-blue-100 file:text-blue-700"/>
                <button onClick={subirDocHosp} disabled={subiendoHosp || !archivoHosp}
                  className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium">
                  {subiendoHosp ? '⏳ Subiendo...' : '📤 Subir'}
                </button>
              </div>
              {(!hospSel.documentos || hospSel.documentos.length === 0) ? (
                <div className="text-center py-6 text-gray-400"><div className="text-4xl mb-2">📂</div><p className="text-sm">Sin documentos adjuntos</p></div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">Documentos ({hospSel.documentos.length})</p>
                  {hospSel.documentos.map(d => (
                    <div key={d.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3 border">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{d.tipo==='pdf'?'📄':d.tipo==='imagen'?'🖼️':'📎'}</span>
                        <div><p className="text-sm font-medium">{d.nombre}</p><p className="text-xs text-gray-400">{d.tipo?.toUpperCase()} · {new Date(d.created_at).toLocaleDateString('es-CO')}</p></div>
                      </div>
                      <div className="flex gap-2">
                        <a href={`http://localhost:5000${d.archivo_url}`} target="_blank" rel="noreferrer"
                          className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs hover:bg-blue-200">👁️ Ver</a>
                        <button onClick={() => eliminarDocHosp(d.id)}
                          className="bg-red-100 text-red-600 px-2 py-1 rounded text-xs hover:bg-red-200">🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL INGRESO ════════════════════════════════════════════════ */}}
      {modalIngreso && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b"><h2 className="text-lg font-bold">🏥 Nuevo Ingreso</h2></div>
            <form onSubmit={handleIngreso} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Paciente *</label>
                <select value={formIngreso.paciente_id} onChange={e => setFormIngreso(p=>({...p,paciente_id:e.target.value}))}
                  required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400">
                  <option value="">Seleccionar</option>
                  {pacientes.map(p => <option key={p.id} value={p.id}>{p.nombre} ({p.especie})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jaula</label>
                <select value={formIngreso.jaula_id} onChange={e => setFormIngreso(p=>({...p,jaula_id:e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400">
                  <option value="">Sin asignar</option>
                  {jaulas.filter(j => j.estado==='libre').map(j => <option key={j.id} value={j.id}>{j.numero} ({j.tipo})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Motivo de ingreso *</label>
                <textarea value={formIngreso.motivo_ingreso} onChange={e => setFormIngreso(p=>({...p,motivo_ingreso:e.target.value}))}
                  required rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Diagnóstico</label>
                <textarea value={formIngreso.diagnostico_ingreso} onChange={e => setFormIngreso(p=>({...p,diagnostico_ingreso:e.target.value}))}
                  rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400"/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pronóstico</label>
                  <select value={formIngreso.pronostico} onChange={e => setFormIngreso(p=>({...p,pronostico:e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400">
                    <option value="bueno">Bueno</option><option value="reservado">Reservado</option>
                    <option value="grave">Grave</option><option value="critico">Crítico</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Costo/día</label>
                  <input type="number" value={formIngreso.costo_dia} onChange={e => setFormIngreso(p=>({...p,costo_dia:e.target.value}))}
                    placeholder="0" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400"/>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalIngreso(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700">Cancelar</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium">Hospitalizar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ MODAL EVOLUCIÓN ══════════════════════════════════════════════ */}
      {modalEvolucion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b"><h2 className="text-lg font-bold">📊 Registrar Evolución</h2></div>
            <form onSubmit={handleEvolucion} className="p-5 space-y-4">
              {/* Signos vitales */}
              <div className="grid grid-cols-2 gap-3">
                {[['temperatura','Temperatura (°C)','decimal'],['pulso','Pulso (lpm)','integer'],['frecuencia_respiratoria','Frecuencia resp. (/min)','integer'],['peso','Peso (kg)','decimal']].map(([k,l,t]) => (
                  <div key={k}>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{l}</label>
                    <input type="number" step={t==='decimal'?'0.1':'1'} value={formEvolucion[k]} onChange={e => setFormEvolucion(p=>({...p,[k]:e.target.value}))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"/>
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estado general</label>
                <select value={formEvolucion.estado_general} onChange={e => setFormEvolucion(p=>({...p,estado_general:e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400">
                  {[['estable','✅ Estable'],['mejorando','📈 Mejorando'],['sin_cambio','➡️ Sin cambio'],['empeorando','📉 Empeorando'],['critico','🚨 Crítico']].map(([k,l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción *</label>
                <textarea value={formEvolucion.descripcion} onChange={e => setFormEvolucion(p=>({...p,descripcion:e.target.value}))}
                  required rows={3} placeholder="Observaciones clínicas..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tratamiento aplicado</label>
                <textarea value={formEvolucion.tratamiento_aplicado} onChange={e => setFormEvolucion(p=>({...p,tratamiento_aplicado:e.target.value}))}
                  rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Alimentación</label>
                  <select value={formEvolucion.alimentacion} onChange={e => setFormEvolucion(p=>({...p,alimentacion:e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none">
                    {[['normal','Normal'],['reducida','Reducida'],['nula','Nula'],['sonda','Por sonda']].map(([k,l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Hidratación</label>
                  <select value={formEvolucion.hidratacion} onChange={e => setFormEvolucion(p=>({...p,hidratacion:e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none">
                    {[['normal','Normal'],['reducida','Reducida'],['nula','Nula'],['suero','Con suero']].map(([k,l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalEvolucion(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700">Cancelar</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">Registrar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ MODAL MEDICAMENTO ════════════════════════════════════════════ */}
      {modalMedicamento && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-5 border-b"><h2 className="text-lg font-bold">💊 Agregar Medicamento</h2></div>
            <form onSubmit={handleMedicamento} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Medicamento del inventario</label>
                <select value={formMed.medicamento_id} onChange={e => {
                  const med = medicamentos.find(m => m.id === parseInt(e.target.value));
                  setFormMed(p => ({...p, medicamento_id: e.target.value, nombre_medicamento: med?.nombre||''}));
                }} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400">
                  <option value="">Seleccionar del inventario</option>
                  {medicamentos.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre (si no está en inventario)</label>
                <input value={formMed.nombre_medicamento} onChange={e => setFormMed(p=>({...p,nombre_medicamento:e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs text-gray-600 mb-1">Dosis</label>
                  <input value={formMed.dosis} onChange={e => setFormMed(p=>({...p,dosis:e.target.value}))} placeholder="Ej: 5mg/kg"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none"/></div>
                <div><label className="block text-xs text-gray-600 mb-1">Vía</label>
                  <select value={formMed.via_administracion} onChange={e => setFormMed(p=>({...p,via_administracion:e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none">
                    <option value="">Seleccionar</option>
                    {['oral','inyectable','topica','inhalada'].map(v => <option key={v} value={v}>{v}</option>)}
                  </select></div>
                <div><label className="block text-xs text-gray-600 mb-1">Frecuencia</label>
                  <input value={formMed.frecuencia} onChange={e => setFormMed(p=>({...p,frecuencia:e.target.value}))} placeholder="Ej: Cada 8h"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none"/></div>
                <div><label className="block text-xs text-gray-600 mb-1">Fecha inicio</label>
                  <input type="date" value={formMed.fecha_inicio} onChange={e => setFormMed(p=>({...p,fecha_inicio:e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none"/></div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalMedicamento(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700">Cancelar</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium">Agregar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ MODAL ALTA ═══════════════════════════════════════════════════ */}
      {modalAltaMedica && hospSel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-5 border-b"><h2 className="text-lg font-bold">✅ Dar de Alta — {hospSel.paciente_nombre}</h2></div>
            <form onSubmit={handleAlta} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de alta</label>
                <select value={formAlta.estado} onChange={e => setFormAlta(p=>({...p,estado:e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400">
                  <option value="alta">Alta médica ✅</option>
                  <option value="alta_voluntaria">Alta voluntaria (contra opinión médica)</option>
                  <option value="trasladado">Trasladado a otro centro</option>
                  <option value="fallecido">Fallecido 🕊️</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas de alta / recomendaciones</label>
                <textarea value={formAlta.notas_alta} onChange={e => setFormAlta(p=>({...p,notas_alta:e.target.value}))}
                  rows={3} placeholder="Tratamiento a seguir en casa, citas de control..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"/>
              </div>
              {hospSel.costo_dia > 0 && (
                <div className="bg-green-50 rounded-xl p-3 text-sm">
                  <p className="font-medium text-green-800">💰 Resumen de costos</p>
                  <p className="text-green-700">
                    {Math.ceil((Date.now()-new Date(hospSel.fecha_ingreso))/86400000)} días × ${parseFloat(hospSel.costo_dia).toLocaleString('es-CO')}/día
                    = <b>${(Math.ceil((Date.now()-new Date(hospSel.fecha_ingreso))/86400000)*parseFloat(hospSel.costo_dia)).toLocaleString('es-CO')}</b>
                  </p>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalAltaMedica(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700">Cancelar</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">Confirmar alta</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}