import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import toast, { Toaster } from 'react-hot-toast';

const ADOPCION_BADGE = {
  disponible:    { label: '🐾 Disponible para adopción', color: 'bg-green-100 text-green-700 border-green-300' },
  en_hogar:      { label: '🏠 En hogar de paso',         color: 'bg-blue-100 text-blue-700 border-blue-300' },
  en_tratamiento:{ label: '💊 En tratamiento',           color: 'bg-orange-100 text-orange-700 border-orange-300' },
  adoptado:      { label: '❤️ Adoptado',                 color: 'bg-purple-100 text-purple-700 border-purple-300' },
};

export default function Historias() {
  const [historias, setHistorias]             = useState([]);
  const [pacientes, setPacientes]             = useState([]);
  const [vacunas, setVacunas]                 = useState([]);
  const [configClinica, setConfigClinica]     = useState({});
  const [cargando, setCargando]               = useState(true);
  const [tabPaciente, setTabPaciente]         = useState('historias');
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState('');
  const [pacienteInfo, setPacienteInfo]       = useState(null);

  // Modales
  const [modalHistoria, setModalHistoria]     = useState(false);
  const [modalVacuna, setModalVacuna]         = useState(false);
  const [modalDocHistoria, setModalDocHistoria] = useState(null); // historia obj
  const [modalDocVacuna, setModalDocVacuna]   = useState(null);   // vacuna obj
  const [editando, setEditando]               = useState(null);
  const [editandoVacuna, setEditandoVacuna]   = useState(null);

  // Forms
  const [form, setForm] = useState({
    paciente_id:'', motivo_consulta:'', examen_fisico:'',
    diagnostico:'', tratamiento:'', observaciones:'',
    peso_consulta:'', temperatura:''
  });
  const [formVacuna, setFormVacuna] = useState({
    nombre:'', fecha_aplicacion:'', fecha_proxima:'',
    lote:'', laboratorio:'', aplicada_por:'', notas:''
  });

  // Subida de documentos
  const [archivoDoc, setArchivoDoc]   = useState(null);
  const [nombreDoc, setNombreDoc]     = useState('');
  const [subiendoDoc, setSubiendoDoc] = useState(false);
  const docInputRef  = useRef(null);
  const docVacRef    = useRef(null);

  useEffect(() => { cargarDatos(); }, []);

  const cargarDatos = async () => {
    try {
      const [pac, conf] = await Promise.all([api.get('/pacientes'), api.get('/configuracion')]);
      setPacientes(pac.data);
      const m = {};
      (conf.data||[]).forEach(c => { m[c.clave] = c.valor; });
      setConfigClinica(m);
      if (pac.data.length > 0) {
        const p = pac.data[0];
        setPacienteSeleccionado(p.id);
        setPacienteInfo(p);
        await Promise.all([cargarHistorias(p.id), cargarVacunas(p.id)]);
      }
    } catch { toast.error('Error al cargar'); }
    finally { setCargando(false); }
  };

  const cargarHistorias = async (id) => {
    try { const r = await api.get(`/historias/paciente/${id}`); setHistorias(r.data); }
    catch { setHistorias([]); }
  };
  const cargarVacunas = async (id) => {
    try { const r = await api.get(`/vacunas/paciente/${id}`); setVacunas(r.data); }
    catch { setVacunas([]); }
  };

  const cambiarPaciente = async (e) => {
    const id = e.target.value;
    setPacienteSeleccionado(id);
    const info = pacientes.find(p => p.id === parseInt(id));
    setPacienteInfo(info||null);
    if (id) await Promise.all([cargarHistorias(id), cargarVacunas(id)]);
    else { setHistorias([]); setVacunas([]); }
  };

  // ── HISTORIAS ─────────────────────────────────────────────────────────────
  const abrirModalHistoria = (h = null) => {
    if (h) {
      setEditando(h);
      setForm({ paciente_id: h.paciente_id||'', motivo_consulta: h.motivo_consulta||'',
        examen_fisico: h.examen_fisico||'', diagnostico: h.diagnostico||'',
        tratamiento: h.tratamiento||'', observaciones: h.observaciones||'',
        peso_consulta: h.peso_consulta||'', temperatura: h.temperatura||'' });
    } else {
      setEditando(null);
      setForm({ paciente_id: pacienteSeleccionado||'', motivo_consulta:'', examen_fisico:'',
        diagnostico:'', tratamiento:'', observaciones:'', peso_consulta:'', temperatura:'' });
    }
    setModalHistoria(true);
  };

  const handleSubmitHistoria = async (e) => {
    e.preventDefault();
    try {
      if (editando) { await api.put(`/historias/${editando.id}`, form); toast.success('✅ Historia actualizada'); }
      else          { await api.post('/historias', form); toast.success('✅ Historia registrada'); }
      setModalHistoria(false);
      if (pacienteSeleccionado) await cargarHistorias(pacienteSeleccionado);
    } catch { toast.error('Error al guardar'); }
  };

  const eliminarHistoria = async (id) => {
    if (!confirm('¿Eliminar esta historia?')) return;
    try { await api.delete(`/historias/${id}`); toast.success('✅ Eliminada'); await cargarHistorias(pacienteSeleccionado); }
    catch { toast.error('Error'); }
  };

  // ── DOCUMENTOS HISTORIA ───────────────────────────────────────────────────
  const subirDocHistoria = async (historiaId) => {
    if (!archivoDoc) return toast.error('Selecciona un archivo');
    setSubiendoDoc(true);
    try {
      const fd = new FormData();
      fd.append('archivo', archivoDoc);
      fd.append('historia_id', historiaId);
      fd.append('nombre', nombreDoc || archivoDoc.name);
      await api.post('/historias/documentos/subir', fd, { headers: { 'Content-Type': 'multipart/form-data' }});
      toast.success('✅ Documento subido');
      setArchivoDoc(null); setNombreDoc('');
      if (docInputRef.current) docInputRef.current.value = '';
      await cargarHistorias(pacienteSeleccionado);
      const r = await api.get(`/historias/paciente/${pacienteSeleccionado}`);
      setModalDocHistoria(r.data.find(x => x.id === historiaId) || null);
    } catch { toast.error('Error al subir'); }
    finally { setSubiendoDoc(false); }
  };

  const eliminarDocHistoria = async (docId, historiaId) => {
    if (!confirm('¿Eliminar este documento?')) return;
    try {
      await api.delete(`/historias/documentos/${docId}`);
      toast.success('✅ Eliminado');
      await cargarHistorias(pacienteSeleccionado);
      const r = await api.get(`/historias/paciente/${pacienteSeleccionado}`);
      setModalDocHistoria(r.data.find(x => x.id === historiaId) || null);
    } catch { toast.error('Error'); }
  };

  // ── DOCUMENTOS VACUNA ─────────────────────────────────────────────────────
  const [archivoVac, setArchivoVac] = useState(null);
  const [nombreVac, setNombreVac]   = useState('');
  const [subiendoVac, setSubiendoVac] = useState(false);

  const subirDocVacuna = async (vacunaId) => {
    if (!archivoVac) return toast.error('Selecciona un archivo');
    setSubiendoVac(true);
    try {
      const fd = new FormData();
      fd.append('archivo', archivoVac);
      fd.append('vacuna_id', vacunaId);
      fd.append('nombre', nombreVac || archivoVac.name);
      await api.post('/vacunas/documentos/subir', fd, { headers: { 'Content-Type': 'multipart/form-data' }});
      toast.success('✅ Constancia subida');
      setArchivoVac(null); setNombreVac('');
      if (docVacRef.current) docVacRef.current.value = '';
      await cargarVacunas(pacienteSeleccionado);
      const r = await api.get(`/vacunas/paciente/${pacienteSeleccionado}`);
      setModalDocVacuna(r.data.find(x => x.id === vacunaId) || null);
    } catch { toast.error('Error al subir'); }
    finally { setSubiendoVac(false); }
  };

  const eliminarDocVacuna = async (docId, vacunaId) => {
    if (!confirm('¿Eliminar este documento?')) return;
    try {
      await api.delete(`/vacunas/documentos/${docId}`);
      toast.success('✅ Eliminado');
      await cargarVacunas(pacienteSeleccionado);
      const r = await api.get(`/vacunas/paciente/${pacienteSeleccionado}`);
      setModalDocVacuna(r.data.find(x => x.id === vacunaId) || null);
    } catch { toast.error('Error'); }
  };

  // ── VACUNAS ───────────────────────────────────────────────────────────────
  const abrirModalVacuna = (v = null) => {
    if (v) {
      setEditandoVacuna(v);
      setFormVacuna({ nombre: v.nombre||'', fecha_aplicacion: v.fecha_aplicacion?.split('T')[0]||'',
        fecha_proxima: v.fecha_proxima?.split('T')[0]||'', lote: v.lote||'',
        laboratorio: v.laboratorio||'', aplicada_por: v.aplicada_por||'', notas: v.notas||'' });
    } else {
      setEditandoVacuna(null);
      setFormVacuna({ nombre:'', fecha_aplicacion:'', fecha_proxima:'', lote:'', laboratorio:'', aplicada_por:'', notas:'' });
    }
    setModalVacuna(true);
  };

  const handleSubmitVacuna = async (e) => {
    e.preventDefault();
    try {
      const datos = { ...formVacuna, paciente_id: pacienteSeleccionado };
      if (editandoVacuna) { await api.put(`/vacunas/${editandoVacuna.id}`, datos); toast.success('✅ Actualizada'); }
      else                { await api.post('/vacunas', datos); toast.success('✅ Vacuna registrada'); }
      setModalVacuna(false);
      await cargarVacunas(pacienteSeleccionado);
    } catch { toast.error('Error'); }
  };

  const eliminarVacuna = async (id) => {
    if (!confirm('¿Eliminar esta vacuna?')) return;
    try { await api.delete(`/vacunas/${id}`); toast.success('✅ Eliminada'); await cargarVacunas(pacienteSeleccionado); }
    catch { toast.error('Error'); }
  };

  const estadoVacuna = (fp) => {
    if (!fp) return null;
    const dias = Math.ceil((new Date(fp) - new Date()) / 86400000);
    if (dias < 0)   return { label: 'Vencida',   color: 'bg-red-100 text-red-700' };
    if (dias <= 30) return { label: `${dias}d`,  color: 'bg-orange-100 text-orange-700' };
    return              { label: 'Al día',        color: 'bg-green-100 text-green-700' };
  };

  // ── IMPRESIÓN ─────────────────────────────────────────────────────────────
  const imprimir = (h) => {
    const logo    = configClinica.clinica_logo_url ? `http://localhost:5000${configClinica.clinica_logo_url}` : null;
    const firma   = configClinica.firma_medico_url ? `http://localhost:5000${configClinica.firma_medico_url}` : null;
    const clinica = configClinica.clinica_nombre || 'VetSystem Pro';
    const nit     = configClinica.clinica_nit    ? `NIT: ${configClinica.clinica_nit}` : '';
    const tel     = configClinica.clinica_telefono  || '';
    const dir     = configClinica.clinica_direccion || '';
    const email   = configClinica.clinica_email     || '';
    const adopBadge = h.adopcion_estado ? ADOPCION_BADGE[h.adopcion_estado] : null;

    const vacunasHtml = vacunas.length > 0 ? `
      <div style="margin-top:16px"><h4 style="color:#0d9488;border-bottom:1px solid #ccc;padding-bottom:4px;margin-bottom:8px;font-size:12px">💉 Vacunas</h4>
      <table style="width:100%;border-collapse:collapse;font-size:10px">
        <thead><tr style="background:#f0fdfa">
          <th style="padding:4px 8px;text-align:left;border:1px solid #ccc">Vacuna</th>
          <th style="padding:4px 8px;text-align:left;border:1px solid #ccc">Aplicada</th>
          <th style="padding:4px 8px;text-align:left;border:1px solid #ccc">Próxima</th>
          <th style="padding:4px 8px;text-align:left;border:1px solid #ccc">Laboratorio</th>
        </tr></thead><tbody>
        ${vacunas.map(v=>`<tr>
          <td style="padding:4px 8px;border:1px solid #eee">${v.nombre}</td>
          <td style="padding:4px 8px;border:1px solid #eee">${v.fecha_aplicacion?new Date(v.fecha_aplicacion).toLocaleDateString('es-CO'):'-'}</td>
          <td style="padding:4px 8px;border:1px solid #eee">${v.fecha_proxima?new Date(v.fecha_proxima).toLocaleDateString('es-CO'):'-'}</td>
          <td style="padding:4px 8px;border:1px solid #eee">${v.laboratorio||'-'}</td>
        </tr>`).join('')}
        </tbody></table></div>` : '';

    const docsHtml = h.documentos?.length>0 ? `
      <div style="margin-top:12px"><h4 style="color:#6366f1;border-bottom:1px solid #ccc;padding-bottom:4px;margin-bottom:6px;font-size:12px">📎 Documentos adjuntos</h4>
      <ul style="font-size:11px;color:#555;padding-left:16px">${h.documentos.map(d=>`<li>${d.nombre} (${d.tipo})</li>`).join('')}</ul></div>` : '';

    const win = window.open('','_blank');
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Historia - ${pacienteInfo?.nombre||''}</title>
    <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:12px;color:#333;padding:24px}
    .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #0d9488;padding-bottom:12px;margin-bottom:16px}
    .logo-area{display:flex;align-items:center;gap:14px}.logo-area img{height:70px;object-fit:contain}
    .clinica-info h2{font-size:18px;color:#0d9488}.clinica-info p{font-size:11px;color:#555;margin-top:2px}
    .header-right{text-align:right;font-size:11px;color:#555}
    .pac-box{background:#f0fdfa;border:1px solid #0d9488;border-radius:8px;padding:12px;display:flex;gap:14px;align-items:center;margin-bottom:12px}
    .pac-box img{width:70px;height:70px;border-radius:50%;object-fit:cover;border:2px solid #0d9488}
    .motivo{background:#0d9488;color:white;padding:8px 14px;border-radius:6px;font-weight:bold;margin-bottom:12px}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px}
    .campo{background:#f9f9f9;border-left:3px solid #0d9488;padding:8px 10px;border-radius:4px}
    .campo-label{font-size:10px;font-weight:bold;color:#0d9488;text-transform:uppercase;margin-bottom:3px}
    .vitales{display:flex;gap:20px;background:#eff6ff;padding:8px 12px;border-radius:6px;margin-bottom:12px}
    .firma-area{text-align:center;margin-top:28px}.firma-area img{height:55px;object-fit:contain}
    .firma-linea{border-top:1px solid #333;width:200px;margin:8px auto 4px}
    .footer{margin-top:20px;border-top:1px solid #ccc;padding-top:8px;display:flex;justify-content:space-between;font-size:10px;color:#888}
    @media print{body{padding:10px}}</style></head><body>
    <div class="header">
      <div class="logo-area">
        ${logo?`<img src="${logo}" alt="Logo"/>`:'<div style="width:64px;height:64px;background:#e0f2f1;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:26px">🐾</div>'}
        <div class="clinica-info"><h2>${clinica}</h2>
          ${nit?`<p>${nit}</p>`:''}${tel?`<p>📞 ${tel}</p>`:''}${email?`<p>✉️ ${email}</p>`:''}${dir?`<p>📍 ${dir}</p>`:''}
        </div>
      </div>
      <div class="header-right"><strong>Historia N° ${h.id}</strong><br/>Dr. ${h.veterinario_nombre||'-'}<br/>
        ${new Date(h.fecha).toLocaleDateString('es-CO',{year:'numeric',month:'long',day:'numeric'})}
      </div>
    </div>
    <div class="pac-box">
      ${pacienteInfo?.foto_url?`<img src="http://localhost:5000${pacienteInfo.foto_url}" alt=""/>`:'<div style="width:70px;height:70px;background:#b2dfdb;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:28px">🐾</div>'}
      <div><h3 style="font-size:16px;color:#0d9488">${pacienteInfo?.nombre||''}</h3>
        <p>${pacienteInfo?.especie||''} | ${pacienteInfo?.raza||'-'} | ${pacienteInfo?.sexo||'-'}</p>
        <p>Tutor: ${pacienteInfo?.propietario_nombre?`${pacienteInfo.propietario_nombre} ${pacienteInfo.propietario_apellido||''}`:'Sin tutor'}</p>
        ${adopBadge?`<div style="display:inline-block;margin-top:4px;padding:2px 10px;border-radius:20px;font-size:10px;font-weight:bold;background:#ede9fe;color:#6d28d9">${adopBadge.label}</div>`:''}
        ${h.hogar_nombre?`<p style="font-size:10px;color:#555;margin-top:2px">🏠 ${h.hogar_nombre}</p>`:''}
      </div>
    </div>
    <div class="motivo">🩺 ${h.motivo_consulta}</div>
    <div class="grid">
      ${h.examen_fisico?`<div class="campo"><div class="campo-label">Examen Físico</div>${h.examen_fisico}</div>`:''}
      ${h.diagnostico  ?`<div class="campo"><div class="campo-label">Diagnóstico</div>${h.diagnostico}</div>`:''}
      ${h.tratamiento  ?`<div class="campo"><div class="campo-label">Tratamiento</div>${h.tratamiento}</div>`:''}
      ${h.observaciones?`<div class="campo"><div class="campo-label">Observaciones</div>${h.observaciones}</div>`:''}
    </div>
    ${(h.peso_consulta||h.temperatura)?`<div class="vitales">${h.peso_consulta?`<span>⚖️ <b>${h.peso_consulta} kg</b></span>`:''}${h.temperatura?`<span>🌡️ <b>${h.temperatura} °C</b></span>`:''}</div>`:''}
    ${vacunasHtml}${docsHtml}
    <div class="firma-area">${firma?`<img src="${firma}" alt="Firma"/>`:''}
      <div class="firma-linea"></div><p>Firma del Veterinario</p><p>Dr. ${h.veterinario_nombre||'-'}</p>
    </div>
    <div class="footer"><span>${clinica}${nit?` — ${nit}`:''}</span><span>Impreso: ${new Date().toLocaleString('es-CO')}</span></div>
    <script>window.onload=()=>{window.print()}</script></body></html>`);
    win.document.close();
  };

  const adopcionPaciente = historias[0] || null;

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className="p-6">
      <Toaster position="top-right" />
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">📋 Historia Clínica</h1>
          <p className="text-gray-500">Historial médico, vacunas y documentos</p>
        </div>
        <div className="flex gap-2">
          {tabPaciente === 'vacunas' && pacienteSeleccionado && (
            <button onClick={() => abrirModalVacuna()} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2.5 rounded-xl font-medium text-sm">+ Nueva Vacuna</button>
          )}
          {tabPaciente === 'historias' && (
            <button onClick={() => abrirModalHistoria()} className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl font-medium">+ Nueva Historia</button>
          )}
        </div>
      </div>

      {/* Selector paciente */}
      <div className="bg-white rounded-xl shadow p-4 mb-4">
        <div className="flex items-center gap-4">
          {pacienteInfo?.foto_url
            ? <img src={`http://localhost:5000${pacienteInfo.foto_url}`} alt="" className="w-14 h-14 rounded-full object-cover border-2 border-teal-300"/>
            : <div className="w-14 h-14 rounded-full bg-teal-100 flex items-center justify-center text-2xl border-2 border-teal-200">🐾</div>}
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">Seleccionar Paciente:</label>
            <select value={pacienteSeleccionado} onChange={cambiarPaciente}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500">
              <option value="">-- Seleccionar --</option>
              {pacientes.map(p => <option key={p.id} value={p.id}>{p.nombre} ({p.especie})</option>)}
            </select>
          </div>
          {pacienteInfo && (
            <div className="text-sm text-right space-y-1">
              <p className="font-medium text-gray-700">{pacienteInfo.especie} · {pacienteInfo.raza||'-'}</p>
              {adopcionPaciente?.adopcion_estado && ADOPCION_BADGE[adopcionPaciente.adopcion_estado] && (
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${ADOPCION_BADGE[adopcionPaciente.adopcion_estado].color}`}>
                  {ADOPCION_BADGE[adopcionPaciente.adopcion_estado].label}
                </span>
              )}
              <div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  vacunas.length===0 ? 'bg-gray-100 text-gray-500' :
                  vacunas.some(v=>v.fecha_proxima&&new Date(v.fecha_proxima)<new Date()) ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                  💉 {vacunas.length} vacuna{vacunas.length!==1?'s':''}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      {pacienteSeleccionado && (
        <div className="flex gap-2 mb-4 bg-white rounded-xl shadow p-2 w-fit">
          <button onClick={() => setTabPaciente('historias')}
            className={`px-5 py-2 rounded-lg font-medium text-sm transition ${tabPaciente==='historias'?'bg-teal-600 text-white':'text-gray-600 hover:bg-gray-100'}`}>
            📋 Historias ({historias.length})
          </button>
          <button onClick={() => setTabPaciente('vacunas')}
            className={`px-5 py-2 rounded-lg font-medium text-sm transition flex items-center gap-2 ${tabPaciente==='vacunas'?'bg-blue-600 text-white':'text-gray-600 hover:bg-gray-100'}`}>
            💉 Vacunas ({vacunas.length})
            {vacunas.some(v=>v.fecha_proxima&&new Date(v.fecha_proxima)<new Date()) && (
              <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">!</span>
            )}
          </button>
        </div>
      )}

      {/* ═══ TAB HISTORIAS ══════════════════════════════════════════════════ */}
      {tabPaciente === 'historias' && (
        <div className="space-y-4">
          {cargando ? (
            <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">⏳ Cargando...</div>
          ) : historias.length === 0 ? (
            <div className="bg-white rounded-xl shadow p-8 text-center">
              <span className="text-6xl">📋</span>
              <p className="mt-3 text-gray-500">No hay historias clínicas</p>
              <button onClick={() => abrirModalHistoria()} className="mt-4 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700">Crear primera</button>
            </div>
          ) : historias.map(h => (
            <div key={h.id} className="bg-white rounded-xl shadow p-6">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm text-gray-500">📅 {new Date(h.fecha).toLocaleDateString('es-CO')} — Dr. {h.veterinario_nombre||'Sin asignar'}</p>
                    {h.adopcion_estado && ADOPCION_BADGE[h.adopcion_estado] && (
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${ADOPCION_BADGE[h.adopcion_estado].color}`}>{ADOPCION_BADGE[h.adopcion_estado].label}</span>
                    )}
                    {h.hogar_nombre && <span className="text-xs text-gray-400">🏠 {h.hogar_nombre}</span>}
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 mt-1">🩺 {h.motivo_consulta}</h3>
                </div>
                <div className="flex gap-2 flex-wrap justify-end">
                  <button onClick={() => setModalDocHistoria(h)} className={`px-3 py-1 rounded-lg text-sm flex items-center gap-1 ${h.documentos?.length>0?'bg-indigo-100 text-indigo-700 hover:bg-indigo-200':'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    📎 {h.documentos?.length>0?`(${h.documentos.length})`:'Docs'}
                  </button>
                  <button onClick={() => imprimir(h)} className="bg-teal-100 text-teal-700 px-3 py-1 rounded-lg text-sm hover:bg-teal-200">🖨️</button>
                  <button onClick={() => abrirModalHistoria(h)} className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-lg text-sm hover:bg-yellow-200">✏️</button>
                  <button onClick={() => eliminarHistoria(h.id)} className="bg-red-100 text-red-700 px-3 py-1 rounded-lg text-sm hover:bg-red-200">🗑️</button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {h.examen_fisico && <div className="bg-blue-50 rounded-lg p-3"><p className="text-xs font-semibold text-blue-600 uppercase mb-1">Examen Físico</p><p className="text-sm">{h.examen_fisico}</p></div>}
                {h.diagnostico   && <div className="bg-green-50 rounded-lg p-3"><p className="text-xs font-semibold text-green-600 uppercase mb-1">Diagnóstico</p><p className="text-sm">{h.diagnostico}</p></div>}
                {h.tratamiento   && <div className="bg-purple-50 rounded-lg p-3"><p className="text-xs font-semibold text-purple-600 uppercase mb-1">Tratamiento</p><p className="text-sm">{h.tratamiento}</p></div>}
                {h.observaciones && <div className="bg-orange-50 rounded-lg p-3"><p className="text-xs font-semibold text-orange-600 uppercase mb-1">Observaciones</p><p className="text-sm">{h.observaciones}</p></div>}
              </div>
              {(h.peso_consulta||h.temperatura) && (
                <div className="flex gap-4 mt-3">
                  {h.peso_consulta && <span className="text-sm text-gray-600">⚖️ <b>{h.peso_consulta} kg</b></span>}
                  {h.temperatura   && <span className="text-sm text-gray-600">🌡️ <b>{h.temperatura}°C</b></span>}
                </div>
              )}
              {h.documentos?.length>0 && (
                <div className="flex gap-2 mt-3 flex-wrap">
                  {h.documentos.map(d => (
                    <a key={d.id} href={`http://localhost:5000${d.archivo_url}`} target="_blank" rel="noreferrer"
                      className="flex items-center gap-1 bg-indigo-50 text-indigo-700 text-xs px-3 py-1.5 rounded-lg hover:bg-indigo-100 border border-indigo-200">
                      {d.tipo==='pdf'?'📄':d.tipo==='imagen'?'🖼️':'📎'} {d.nombre}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ═══ TAB VACUNAS ════════════════════════════════════════════════════ */}
      {tabPaciente === 'vacunas' && (
        <div>
          {vacunas.length === 0 ? (
            <div className="bg-white rounded-xl shadow p-10 text-center">
              <div className="text-6xl mb-3">💉</div>
              <p className="text-gray-500 font-medium">No hay vacunas registradas</p>
              <button onClick={() => abrirModalVacuna()} className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm">+ Registrar vacuna</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {vacunas.map(v => {
                const est = estadoVacuna(v.fecha_proxima);
                return (
                  <div key={v.id} className="bg-white rounded-xl shadow p-5 border-l-4 border-blue-400">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                          💉 {v.nombre}
                          {est && <span className={`text-xs px-2 py-0.5 rounded-full ${est.color}`}>{est.label}</span>}
                        </h3>
                        {v.laboratorio && <p className="text-xs text-gray-400 mt-0.5">{v.laboratorio}</p>}
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => setModalDocVacuna(v)} className={`px-2 py-1 rounded text-xs ${v.documentos?.length>0?'bg-indigo-100 text-indigo-700':'bg-gray-100 text-gray-500'} hover:bg-indigo-200`}>
                          📎{v.documentos?.length>0?` (${v.documentos.length})`:''}
                        </button>
                        <button onClick={() => abrirModalVacuna(v)} className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs hover:bg-yellow-200">✏️</button>
                        <button onClick={() => eliminarVacuna(v.id)} className="bg-red-100 text-red-600 px-2 py-1 rounded text-xs hover:bg-red-200">🗑️</button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {v.fecha_aplicacion && <div className="bg-gray-50 rounded p-2"><p className="text-gray-400">Aplicada</p><p className="font-medium">{new Date(v.fecha_aplicacion).toLocaleDateString('es-CO')}</p></div>}
                      {v.fecha_proxima    && <div className={`rounded p-2 ${est?.label==='Vencida'?'bg-red-50':'bg-green-50'}`}><p className="text-gray-400">Próxima</p><p className="font-medium">{new Date(v.fecha_proxima).toLocaleDateString('es-CO')}</p></div>}
                      {v.lote            && <div className="bg-gray-50 rounded p-2"><p className="text-gray-400">Lote</p><p className="font-medium">{v.lote}</p></div>}
                      {v.aplicada_por    && <div className="bg-gray-50 rounded p-2"><p className="text-gray-400">Aplicada por</p><p className="font-medium">{v.aplicada_por}</p></div>}
                    </div>
                    {v.notas && <p className="text-xs text-gray-400 italic mt-2">{v.notas}</p>}
                    {v.documentos?.length>0 && (
                      <div className="mt-2 flex gap-1 flex-wrap">
                        {v.documentos.map(d => (
                          <a key={d.id} href={`http://localhost:5000${d.archivo_url}`} target="_blank" rel="noreferrer"
                            className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded border border-indigo-200 hover:bg-indigo-100">
                            📎 {d.nombre}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══ MODAL DOCS HISTORIA ════════════════════════════════════════════ */}
      {modalDocHistoria && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b flex justify-between items-center">
              <div><h2 className="text-lg font-bold">📎 Documentos</h2><p className="text-sm text-gray-500">🩺 {modalDocHistoria.motivo_consulta}</p></div>
              <button onClick={() => setModalDocHistoria(null)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>
            <div className="p-5 space-y-5">
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                <p className="text-sm font-semibold text-indigo-700 mb-3">📤 Subir documento</p>
                <div className="space-y-3">
                  <input value={nombreDoc} onChange={e => setNombreDoc(e.target.value)}
                    placeholder="Nombre del documento (ej: Examen de sangre)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none"/>
                  <input ref={docInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                    onChange={e => setArchivoDoc(e.target.files[0])}
                    className="w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-indigo-100 file:text-indigo-700"/>
                  <button onClick={() => subirDocHistoria(modalDocHistoria.id)} disabled={subiendoDoc||!archivoDoc}
                    className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium">
                    {subiendoDoc ? '⏳ Subiendo...' : '📤 Subir'}
                  </button>
                </div>
              </div>
              {modalDocHistoria.documentos?.length===0 ? (
                <div className="text-center py-6 text-gray-400"><div className="text-4xl mb-2">📂</div><p className="text-sm">Sin documentos</p></div>
              ) : (
                <div className="space-y-2">
                  {modalDocHistoria.documentos?.map(d => (
                    <div key={d.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3 border">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{d.tipo==='pdf'?'📄':d.tipo==='imagen'?'🖼️':'📎'}</span>
                        <div><p className="text-sm font-medium">{d.nombre}</p><p className="text-xs text-gray-400">{d.tipo?.toUpperCase()}</p></div>
                      </div>
                      <div className="flex gap-2">
                        <a href={`http://localhost:5000${d.archivo_url}`} target="_blank" rel="noreferrer" className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">👁️</a>
                        <button onClick={() => eliminarDocHistoria(d.id, modalDocHistoria.id)} className="bg-red-100 text-red-600 px-2 py-1 rounded text-xs">🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL DOCS VACUNA ══════════════════════════════════════════════ */}
      {modalDocVacuna && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b flex justify-between items-center">
              <div><h2 className="text-lg font-bold">📎 Constancias de Vacuna</h2><p className="text-sm text-gray-500">💉 {modalDocVacuna.nombre}</p></div>
              <button onClick={() => setModalDocVacuna(null)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>
            <div className="p-5 space-y-5">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-sm font-semibold text-blue-700 mb-3">📤 Subir constancia</p>
                <div className="space-y-3">
                  <input value={nombreVac} onChange={e => setNombreVac(e.target.value)}
                    placeholder="Nombre (ej: Carnet de vacunación)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"/>
                  <input ref={docVacRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp"
                    onChange={e => setArchivoVac(e.target.files[0])}
                    className="w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-blue-100 file:text-blue-700"/>
                  <button onClick={() => subirDocVacuna(modalDocVacuna.id)} disabled={subiendoVac||!archivoVac}
                    className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium">
                    {subiendoVac ? '⏳ Subiendo...' : '📤 Subir constancia'}
                  </button>
                </div>
              </div>
              {(!modalDocVacuna.documentos||modalDocVacuna.documentos.length===0) ? (
                <div className="text-center py-6 text-gray-400"><div className="text-4xl mb-2">📂</div><p className="text-sm">Sin constancias adjuntas</p></div>
              ) : (
                <div className="space-y-2">
                  {modalDocVacuna.documentos.map(d => (
                    <div key={d.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3 border">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{d.tipo==='pdf'?'📄':'🖼️'}</span>
                        <div><p className="text-sm font-medium">{d.nombre}</p><p className="text-xs text-gray-400">{d.tipo?.toUpperCase()}</p></div>
                      </div>
                      <div className="flex gap-2">
                        <a href={`http://localhost:5000${d.archivo_url}`} target="_blank" rel="noreferrer" className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">👁️</a>
                        <button onClick={() => eliminarDocVacuna(d.id, modalDocVacuna.id)} className="bg-red-100 text-red-600 px-2 py-1 rounded text-xs">🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL HISTORIA ═════════════════════════════════════════════════ */}
      {modalHistoria && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b"><h2 className="text-xl font-bold">{editando?'✏️ Editar':'📋 Nueva Historia Clínica'}</h2></div>
            <form onSubmit={handleSubmitHistoria} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Paciente *</label>
                <select value={form.paciente_id} onChange={e => setForm({...form, paciente_id: e.target.value})}
                  required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500">
                  <option value="">Seleccionar</option>
                  {pacientes.map(p => <option key={p.id} value={p.id}>{p.nombre} ({p.especie})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Motivo de Consulta *</label>
                <input value={form.motivo_consulta} onChange={e => setForm({...form, motivo_consulta: e.target.value})}
                  required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"/>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Peso (kg)</label>
                  <input type="number" step="0.01" value={form.peso_consulta} onChange={e => setForm({...form, peso_consulta: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Temperatura (°C)</label>
                  <input type="number" step="0.1" value={form.temperatura} onChange={e => setForm({...form, temperatura: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"/>
                </div>
              </div>
              {[['examen_fisico','Examen Físico'],['diagnostico','Diagnóstico'],['tratamiento','Tratamiento'],['observaciones','Observaciones']].map(([f,l]) => (
                <div key={f}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{l}</label>
                  <textarea value={form[f]} onChange={e => setForm({...form, [f]: e.target.value})}
                    rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"/>
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalHistoria(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancelar</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium">{editando?'Actualizar':'Registrar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ MODAL VACUNA ═══════════════════════════════════════════════════ */}
      {modalVacuna && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-5 border-b">
              <h2 className="text-lg font-bold">{editandoVacuna?'✏️ Editar Vacuna':'💉 Nueva Vacuna'}</h2>
              {pacienteInfo && <p className="text-sm text-gray-500 mt-0.5">{pacienteInfo.nombre}</p>}
            </div>
            <form onSubmit={handleSubmitVacuna} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input value={formVacuna.nombre} onChange={e => setFormVacuna({...formVacuna, nombre: e.target.value})}
                  required placeholder="Ej: Parvovirus, Rabia, Triple Felina..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs text-gray-600 mb-1">Fecha aplicación</label>
                  <input type="date" value={formVacuna.fecha_aplicacion} onChange={e => setFormVacuna({...formVacuna, fecha_aplicacion: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"/></div>
                <div><label className="block text-xs text-gray-600 mb-1">Próxima dosis</label>
                  <input type="date" value={formVacuna.fecha_proxima} onChange={e => setFormVacuna({...formVacuna, fecha_proxima: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"/></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs text-gray-600 mb-1">Laboratorio</label>
                  <input value={formVacuna.laboratorio} onChange={e => setFormVacuna({...formVacuna, laboratorio: e.target.value})}
                    placeholder="MSD, Zoetis..." className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"/></div>
                <div><label className="block text-xs text-gray-600 mb-1">Lote</label>
                  <input value={formVacuna.lote} onChange={e => setFormVacuna({...formVacuna, lote: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"/></div>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Aplicada por</label>
                <input value={formVacuna.aplicada_por} onChange={e => setFormVacuna({...formVacuna, aplicada_por: e.target.value})}
                  placeholder="Nombre del veterinario" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"/>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Notas</label>
                <textarea value={formVacuna.notas} onChange={e => setFormVacuna({...formVacuna, notas: e.target.value})}
                  rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"/>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalVacuna(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancelar</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">{editandoVacuna?'Actualizar':'Registrar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}