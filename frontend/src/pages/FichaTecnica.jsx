import { useState, useEffect, useRef, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast, { Toaster } from 'react-hot-toast';
import { AuthContext } from '../context/AuthContext';

export default function FichaTecnica() {
  const { paciente_id } = useParams();
  const navigate = useNavigate();
  const { usuario } = useContext(AuthContext);

  const [paciente,  setPaciente]  = useState(null);
  const [clinica,   setClinica]   = useState({});
  const [ficha,     setFicha]     = useState(null);
  const [cargando,  setCargando]  = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [tab, setTab] = useState('datos');

  const canvasTutorRef       = useRef(null);
  const [dibujandoTutor,     setDibujandoTutor]     = useState(false);
  const [firmaTutorDibujada, setFirmaTutorDibujada] = useState(false);

  const [adjuntoFile,   setAdjuntoFile]   = useState(null);
  const [adjuntoNombre, setAdjuntoNombre] = useState('');
  const [subiendoAdj,   setSubiendoAdj]   = useState(false);
  const adjRef        = useRef(null);
  const [docFirmadoFile, setDocFirmadoFile] = useState(null);
  const docFirmadoRef    = useRef(null);

  const [form, setForm] = useState({
    motivo_ingreso:'', condicion_llegada:'buena',
    peso_ingreso:'', temperatura_ingreso:'',
    vacunas_al_dia:false, desparasitado:false,
    fecha_ultima_desparasitacion:'', esterilizado:false,
    enfermedades_previas:'', cirugias_previas:'',
    alergias:'', medicacion_actual:'', condiciones_especiales:'',
    autoriza_cirugia:false, autoriza_anestesia:false,
    autoriza_hospitalizacion:false, autoriza_eutanasia:false,
    autoriza_transfusion:false, observaciones_autorizacion:'',
    contacto_emergencia_nombre:'', contacto_emergencia_telefono:'',
    contacto_emergencia_relacion:'',
    tutor_nombre:'', tutor_documento:'', tutor_telefono:'', tutor_email:'',
    observaciones_generales:'', estado:'borrador', firma_tutor_url:'',
  });

  useEffect(() => { cargarDatos(); }, [paciente_id]);

  const cargarDatos = async () => {
    try {
      const [pac, fic, conf] = await Promise.all([
        api.get(`/pacientes/${paciente_id}`),
        api.get(`/fichas/paciente/${paciente_id}`),
        api.get('/configuracion'),
      ]);
      const confMap = {};
      (conf.data || []).forEach(item => { confMap[item.clave] = item.valor; });
      setClinica(confMap);
      setPaciente(pac.data);

      if (fic.data) {
        setFicha(fic.data);
        const fd = fic.data;
        setForm({
          motivo_ingreso:               fd.motivo_ingreso || '',
          condicion_llegada:            fd.condicion_llegada || 'buena',
          peso_ingreso:                 fd.peso_ingreso || '',
          temperatura_ingreso:          fd.temperatura_ingreso || '',
          vacunas_al_dia:               fd.vacunas_al_dia || false,
          desparasitado:                fd.desparasitado || false,
          fecha_ultima_desparasitacion: fd.fecha_ultima_desparasitacion ? fd.fecha_ultima_desparasitacion.split('T')[0] : '',
          esterilizado:                 fd.esterilizado || false,
          enfermedades_previas:         fd.enfermedades_previas || '',
          cirugias_previas:             fd.cirugias_previas || '',
          alergias:                     fd.alergias || '',
          medicacion_actual:            fd.medicacion_actual || '',
          condiciones_especiales:       fd.condiciones_especiales || '',
          autoriza_cirugia:             fd.autoriza_cirugia || false,
          autoriza_anestesia:           fd.autoriza_anestesia || false,
          autoriza_hospitalizacion:     fd.autoriza_hospitalizacion || false,
          autoriza_eutanasia:           fd.autoriza_eutanasia || false,
          autoriza_transfusion:         fd.autoriza_transfusion || false,
          observaciones_autorizacion:   fd.observaciones_autorizacion || '',
          contacto_emergencia_nombre:   fd.contacto_emergencia_nombre || '',
          contacto_emergencia_telefono: fd.contacto_emergencia_telefono || '',
          contacto_emergencia_relacion: fd.contacto_emergencia_relacion || '',
          tutor_nombre:                 fd.tutor_nombre || '',
          tutor_documento:              fd.tutor_documento || '',
          tutor_telefono:               fd.tutor_telefono || '',
          tutor_email:                  fd.tutor_email || '',
          observaciones_generales:      fd.observaciones_generales || '',
          estado:                       fd.estado || 'borrador',
          firma_tutor_url:              fd.firma_tutor_url || '',
        });
        if (fd.firma_tutor_url) setFirmaTutorDibujada(true);
      } else if (pac.data.propietario_id) {
        try {
          const prop = await api.get(`/propietarios/${pac.data.propietario_id}`);
          setForm(prev => ({
            ...prev,
            tutor_nombre:    `${prop.data.nombre || ''} ${prop.data.apellido || ''}`.trim(),
            tutor_documento: prop.data.documento || '',
            tutor_telefono:  prop.data.telefono  || '',
            tutor_email:     prop.data.email     || '',
          }));
        } catch {}
      }
    } catch { toast.error('Error al cargar datos'); }
    finally { setCargando(false); }
  };

  const set    = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const toggle = (k)    => setForm(p => ({ ...p, [k]: !p[k] }));

  const iniciarTrazo = (e, ref, setDib) => {
    setDib(true);
    const c = ref.current, ctx = c.getContext('2d'), r = c.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo((e.touches?.[0]?.clientX || e.clientX) - r.left, (e.touches?.[0]?.clientY || e.clientY) - r.top);
  };
  const dibujar = (e, ref, dib) => {
    if (!dib) return;
    e.preventDefault();
    const c = ref.current, ctx = c.getContext('2d'), r = c.getBoundingClientRect();
    ctx.lineWidth = 2; ctx.strokeStyle = '#1e3a5f'; ctx.lineCap = 'round';
    ctx.lineTo((e.touches?.[0]?.clientX || e.clientX) - r.left, (e.touches?.[0]?.clientY || e.clientY) - r.top);
    ctx.stroke();
  };
  const terminarTrazo = (ref, setDib, setFirmaDib, key) => {
    setDib(false); setFirmaDib(true);
    set(key, ref.current.toDataURL('image/png'));
  };
  const limpiarCanvas = (ref, setFirmaDib, key) => {
    ref.current.getContext('2d').clearRect(0, 0, ref.current.width, ref.current.height);
    setFirmaDib(false); set(key, '');
  };

  const guardarFicha = async (estadoOverride = null) => {
    setGuardando(true);
    try {
      const datos = { ...form };
      if (estadoOverride) datos.estado = estadoOverride;
      const resp = await api.post(`/fichas/paciente/${paciente_id}`, datos);
      if (resp.data?.ficha) setFicha(resp.data.ficha);
      toast.success('✅ Ficha guardada');
      await cargarDatos();
    } catch (e) { toast.error(e.response?.data?.error || 'Error al guardar'); }
    finally { setGuardando(false); }
  };

  const generarPDF = async () => {
    await guardarFicha('completada');
    const win = window.open('', '_blank');
    const f = { ...form }, p = paciente, cl = clinica;
    const boolIcon = v => v ? '✅ Sí' : '❌ No';
    const val = v => v || '—';
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>Ficha Técnica — ${p?.nombre}</title>
    <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:11px;color:#1a1a2e;padding:20px}.header{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #1e3a5f;padding-bottom:12px;margin-bottom:16px}.clinica-nombre{font-size:18px;font-weight:bold;color:#1e3a5f}.badge{display:inline-block;padding:3px 10px;border-radius:12px;font-size:10px;font-weight:bold;background:#e0f2fe;color:#0369a1}h2{color:#1e3a5f;font-size:12px;border-bottom:1px solid #bfdbfe;padding-bottom:3px;margin:14px 0 8px;text-transform:uppercase}.grid{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px}.grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:10px}.campo{background:#f8fafc;border-left:3px solid #1e3a5f;padding:5px 8px;border-radius:3px}.campo-label{font-size:9px;font-weight:bold;color:#64748b;text-transform:uppercase;margin-bottom:2px}.campo-valor{font-size:11px;color:#1e293b}.autz-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;margin-bottom:10px}.autz-item{padding:5px 8px;border-radius:6px;text-align:center;font-size:10px;font-weight:bold}.autz-si{background:#dcfce7;color:#166534}.autz-no{background:#fee2e2;color:#991b1b}.firmas{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:24px;border-top:2px solid #1e3a5f;padding-top:16px}.firma-box{text-align:center}.firma-img{border:1px solid #ddd;border-radius:6px;padding:4px;min-height:70px;display:flex;align-items:center;justify-content:center;margin-bottom:8px;background:#fafafa}.firma-img img{max-height:70px;max-width:200px}.firma-linea{border-top:1px solid #333;margin:8px auto;width:80%}.footer{margin-top:16px;padding-top:8px;border-top:1px solid #ddd;display:flex;justify-content:space-between;font-size:9px;color:#94a3b8}.alerta{background:#fef3c7;border:1px solid #fbbf24;padding:6px 10px;border-radius:6px;font-size:10px;color:#92400e;margin-bottom:10px}@media print{body{padding:8px}}</style></head><body>
    <div class="header"><div><div class="clinica-nombre">${cl.clinica_nombre||'Clínica Veterinaria'}</div><div style="font-size:10px;color:#555">${cl.clinica_telefono||''} ${cl.clinica_email||''}</div></div><div><div class="badge">📋 FICHA N° ${ficha?.id||'Nueva'}</div><p style="font-size:10px;color:#555;margin-top:4px">Fecha: ${new Date().toLocaleDateString('es-CO')}</p></div></div>
    <h2>📋 Datos del Paciente</h2>
    <div class="grid3"><div class="campo"><div class="campo-label">Nombre</div><div class="campo-valor"><b>${val(p?.nombre)}</b></div></div><div class="campo"><div class="campo-label">Especie</div><div class="campo-valor">${val(p?.especie)}</div></div><div class="campo"><div class="campo-label">Raza</div><div class="campo-valor">${val(p?.raza)}</div></div><div class="campo"><div class="campo-label">Peso ingreso</div><div class="campo-valor">${f.peso_ingreso?f.peso_ingreso+' kg':'—'}</div></div><div class="campo"><div class="campo-label">Temperatura</div><div class="campo-valor">${f.temperatura_ingreso?f.temperatura_ingreso+'°C':'—'}</div></div><div class="campo"><div class="campo-label">Condición</div><div class="campo-valor"><b>${val(f.condicion_llegada)?.toUpperCase()}</b></div></div></div>
    ${f.motivo_ingreso?`<div class="campo" style="margin-bottom:10px"><div class="campo-label">Motivo de ingreso</div><div class="campo-valor">${f.motivo_ingreso}</div></div>`:''}
    <h2>🩺 Antecedentes</h2>
    <div class="grid3"><div class="campo"><div class="campo-label">Vacunas al día</div><div class="campo-valor">${boolIcon(f.vacunas_al_dia)}</div></div><div class="campo"><div class="campo-label">Desparasitado</div><div class="campo-valor">${boolIcon(f.desparasitado)}</div></div><div class="campo"><div class="campo-label">Esterilizado</div><div class="campo-valor">${boolIcon(f.esterilizado)}</div></div></div>
    <h2>✍️ Autorizaciones</h2>
    <div class="autz-grid"><div class="autz-item ${f.autoriza_cirugia?'autz-si':'autz-no'}">Cirugía: ${f.autoriza_cirugia?'AUTORIZA':'NO'}</div><div class="autz-item ${f.autoriza_anestesia?'autz-si':'autz-no'}">Anestesia: ${f.autoriza_anestesia?'AUTORIZA':'NO'}</div><div class="autz-item ${f.autoriza_hospitalizacion?'autz-si':'autz-no'}">Hospitalización: ${f.autoriza_hospitalizacion?'AUTORIZA':'NO'}</div><div class="autz-item ${f.autoriza_transfusion?'autz-si':'autz-no'}">Transfusión: ${f.autoriza_transfusion?'AUTORIZA':'NO'}</div><div class="autz-item ${f.autoriza_eutanasia?'autz-si':'autz-no'}">Eutanasia: ${f.autoriza_eutanasia?'AUTORIZA':'NO'}</div></div>
    <h2>👤 Datos del Tutor</h2>
    <div class="grid"><div class="campo"><div class="campo-label">Nombre</div><div class="campo-valor"><b>${val(f.tutor_nombre)}</b></div></div><div class="campo"><div class="campo-label">Documento</div><div class="campo-valor">${val(f.tutor_documento)}</div></div><div class="campo"><div class="campo-label">Teléfono</div><div class="campo-valor">${val(f.tutor_telefono)}</div></div><div class="campo"><div class="campo-label">Email</div><div class="campo-valor">${val(f.tutor_email)}</div></div></div>
    <div class="alerta">⚠️ Al firmar, el tutor declara que la información es verídica y autoriza los procedimientos indicados.</div>
    <div class="firmas"><div class="firma-box"><p style="font-weight:bold;margin-bottom:8px;font-size:11px">FIRMA DEL TUTOR</p><div class="firma-img">${f.firma_tutor_url&&f.firma_tutor_url.startsWith('data:')?`<img src="${f.firma_tutor_url}" alt="Firma tutor"/>`:'<span style="color:#ccc;font-size:10px">Sin firma</span>'}</div><div class="firma-linea"></div><p style="font-size:10px"><b>${val(f.tutor_nombre)}</b></p><p style="font-size:9px;color:#555">Fecha: ${new Date().toLocaleDateString('es-CO')}</p></div><div class="firma-box"><p style="font-weight:bold;margin-bottom:8px;font-size:11px">FIRMA DE QUIEN RECIBE</p><div class="firma-img">${ficha?.firma_receptor_url?`<img src="${ficha.firma_receptor_url}" style="max-height:70px"/>`:'<span style="color:#ccc;font-size:10px">Sin firma</span>'}</div><div class="firma-linea"></div><p style="font-size:10px"><b>${ficha?.receptor_nombre||usuario?.nombre||'—'}</b></p><p style="font-size:9px;color:#555">${ficha?.receptor_cargo||'Veterinario'}</p></div></div>
    <div class="footer"><span>${cl.clinica_nombre||'VetSystem Pro'} — Ficha N° ${ficha?.id||'-'}</span><span>Generado: ${new Date().toLocaleString('es-CO')}</span></div>
    <script>window.onload=()=>{window.print()}</script></body></html>`);
    win.document.close();
  };

  const subirAdjunto = async () => {
    if (!adjuntoFile || !ficha?.id) return toast.error('Guarda la ficha primero');
    setSubiendoAdj(true);
    const fd = new FormData();
    fd.append('archivo', adjuntoFile);
    fd.append('ficha_id', ficha.id);
    fd.append('nombre', adjuntoNombre || adjuntoFile.name);
    try {
      await api.post('/fichas/adjunto', fd, { headers: { 'Content-Type': 'multipart/form-data' }});
      toast.success('✅ Adjunto subido');
      setAdjuntoFile(null); setAdjuntoNombre('');
      if (adjRef.current) adjRef.current.value = '';
      await cargarDatos();
    } catch { toast.error('Error al subir adjunto'); }
    finally { setSubiendoAdj(false); }
  };

  const subirDocFirmado = async () => {
    if (!docFirmadoFile || !ficha?.id) return toast.error('Guarda la ficha primero');
    const fd = new FormData();
    fd.append('archivo', docFirmadoFile);
    fd.append('ficha_id', ficha.id);
    try {
      await api.post('/fichas/documento-firmado', fd, { headers: { 'Content-Type': 'multipart/form-data' }});
      toast.success('✅ Documento firmado registrado');
      setDocFirmadoFile(null);
      if (docFirmadoRef.current) docFirmadoRef.current.value = '';
      await cargarDatos();
    } catch { toast.error('Error'); }
  };

  if (cargando) return <div className="p-10 text-center text-gray-400">⏳ Cargando ficha técnica...</div>;
  if (!paciente) return <div className="p-10 text-center text-red-400">❌ Paciente no encontrado</div>;

  const TABS = [
    ['datos',          '📋 Datos'],
    ['antecedentes',   '🩺 Antecedentes'],
    ['autorizaciones', '✍️ Autorizaciones'],
    ['firmas',         '✒️ Firmas'],
    ['adjuntos',       '📎 Adjuntos'],
  ];

  const BACKEND = import.meta.env.VITE_API_URL?.replace('/api','') || 'http://localhost:5000';

  return (
    <div className="p-3 md:p-6 max-w-5xl mx-auto">
      <Toaster position="top-right" />

      {/* ── HEADER RESPONSIVE ─────────────────────────────────────────────── */}
      <div className="mb-4">
        {/* Fila 1: Volver + título */}
        <div className="flex items-start gap-3 mb-3">
          <button onClick={() => navigate(-1)}
            className="bg-gray-100 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-200 flex-shrink-0 text-sm">
            ← Volver
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl md:text-2xl font-bold text-gray-800">📋 Ficha Técnica</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              {paciente.foto_url && (
                <img src={`${BACKEND}${paciente.foto_url}`}
                  className="w-7 h-7 rounded-full object-cover border flex-shrink-0" alt=""/>
              )}
              <p className="text-gray-600 font-medium text-sm">{paciente.nombre}</p>
              <span className="text-xs text-gray-400">{paciente.especie} · {paciente.raza}</span>
              {ficha && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  ficha.estado==='firmada'    ? 'bg-green-100 text-green-700' :
                  ficha.estado==='completada' ? 'bg-blue-100 text-blue-700'  :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {ficha.estado==='firmada' ? '✅ Firmada' : ficha.estado==='completada' ? '📋 Completada' : '📝 Borrador'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Fila 2: Botones Guardar y PDF — ancho completo en móvil */}
        <div className="flex gap-2">
          <button onClick={() => guardarFicha()} disabled={guardando}
            className="flex-1 md:flex-none bg-blue-600 text-white px-4 py-2.5 rounded-xl hover:bg-blue-700 font-medium disabled:opacity-50 text-sm">
            {guardando ? '⏳ Guardando...' : '💾 Guardar'}
          </button>
          <button onClick={generarPDF}
            className="flex-1 md:flex-none bg-red-600 text-white px-4 py-2.5 rounded-xl hover:bg-red-700 font-medium text-sm">
            🖨️ PDF
          </button>
        </div>
      </div>

      {/* ── TABS ──────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 mb-4 bg-white rounded-xl shadow p-1.5 overflow-x-auto">
        {TABS.map(([k,l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-3 py-2 rounded-lg font-medium text-xs md:text-sm whitespace-nowrap transition ${
              tab===k ? 'bg-blue-600 text-white shadow' : 'text-gray-600 hover:bg-gray-100'
            }`}>
            {l}
          </button>
        ))}
      </div>

      {/* ── DATOS BÁSICOS ─────────────────────────────────────────────────── */}
      {tab === 'datos' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl shadow p-4 md:p-6 space-y-4">
            <h2 className="font-bold text-gray-800">🐾 Datos del Paciente en este Ingreso</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Peso al ingreso (kg)</label>
                <input type="number" step="0.1" value={form.peso_ingreso}
                  onChange={e => set('peso_ingreso', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"/>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Temperatura (°C)</label>
                <input type="number" step="0.1" value={form.temperatura_ingreso}
                  onChange={e => set('temperatura_ingreso', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"/>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Condición de llegada</label>
                <select value={form.condicion_llegada} onChange={e => set('condicion_llegada', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400">
                  <option value="buena">✅ Buena</option>
                  <option value="regular">⚠️ Regular</option>
                  <option value="mala">🔴 Mala</option>
                  <option value="critica">🚨 Crítica</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Motivo de ingreso / consulta</label>
              <textarea value={form.motivo_ingreso} onChange={e => set('motivo_ingreso', e.target.value)}
                rows={3} placeholder="Describe el motivo..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"/>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow p-4 md:p-6 space-y-4">
            <h2 className="font-bold text-gray-800">👤 Datos del Tutor</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                ['tutor_nombre',    'Nombre completo *'],
                ['tutor_documento', 'Número de documento *'],
                ['tutor_telefono',  'Teléfono'],
                ['tutor_email',     'Email'],
              ].map(([key, label]) => (
                <div key={key}>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{label}</label>
                  <input value={form[key]} onChange={e => set(key, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"/>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow p-4 md:p-6 space-y-4">
            <h2 className="font-bold text-gray-800">🚨 Contacto de Emergencia</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                ['contacto_emergencia_nombre',   'Nombre'],
                ['contacto_emergencia_telefono', 'Teléfono'],
                ['contacto_emergencia_relacion', 'Relación'],
              ].map(([key, label]) => (
                <div key={key}>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{label}</label>
                  <input value={form[key]} onChange={e => set(key, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"/>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow p-4 md:p-6">
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Observaciones generales</label>
            <textarea value={form.observaciones_generales} onChange={e => set('observaciones_generales', e.target.value)}
              rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"/>
          </div>
        </div>
      )}

      {/* ── ANTECEDENTES ──────────────────────────────────────────────────── */}
      {tab === 'antecedentes' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl shadow p-4 md:p-6">
            <h2 className="font-bold text-gray-800 mb-4">💊 Estado de Salud Previo</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
              {[
                ['vacunas_al_dia', '💉 Vacunas al día'],
                ['desparasitado',  '🐛 Desparasitado'],
                ['esterilizado',   '🔬 Esterilizado/Castrado'],
              ].map(([key, label]) => (
                <label key={key} onClick={() => toggle(key)}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition ${
                    form[key] ? 'border-green-400 bg-green-50' : 'border-gray-200'
                  }`}>
                  <div className={`w-5 h-5 rounded flex items-center justify-center text-sm flex-shrink-0 ${form[key]?'bg-green-500 text-white':'bg-gray-200'}`}>
                    {form[key] ? '✓' : ''}
                  </div>
                  <span className="text-sm font-medium">{label}</span>
                </label>
              ))}
            </div>
            {form.desparasitado && (
              <div className="mb-4">
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Fecha última desparasitación</label>
                <input type="date" value={form.fecha_ultima_desparasitacion}
                  onChange={e => set('fecha_ultima_desparasitacion', e.target.value)}
                  className="w-full sm:w-48 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"/>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                ['enfermedades_previas', '🏥 Enfermedades previas', 'Ej: Parvovirosis...'],
                ['cirugias_previas',     '🔪 Cirugías previas',     'Ej: Castración...'],
                ['alergias',             '⚠️ Alergias conocidas',   'Ej: Penicilina...'],
                ['medicacion_actual',    '💊 Medicación actual',    'Nombre y dosis...'],
              ].map(([key, label, ph]) => (
                <div key={key}>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{label}</label>
                  <textarea value={form[key]} onChange={e => set(key, e.target.value)}
                    rows={2} placeholder={ph}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 text-sm ${
                      key==='alergias' && form[key] ? 'border-red-300 bg-red-50' : 'border-gray-300 focus:ring-blue-400'
                    }`}/>
                </div>
              ))}
              <div className="col-span-1 sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">🔴 Condiciones especiales</label>
                <textarea value={form.condiciones_especiales} onChange={e => set('condiciones_especiales', e.target.value)}
                  rows={2} placeholder="Diabetes, epilepsia..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"/>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── AUTORIZACIONES ────────────────────────────────────────────────── */}
      {tab === 'autorizaciones' && (
        <div className="bg-white rounded-2xl shadow p-4 md:p-6">
          <h2 className="font-bold text-gray-800 mb-2">✍️ Autorización de Procedimientos</h2>
          <p className="text-sm text-gray-500 mb-4">El tutor autoriza o deniega los siguientes procedimientos.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
            {[
              ['autoriza_cirugia',        '🔪 Cirugía',               'Procedimientos quirúrgicos'],
              ['autoriza_anestesia',       '💉 Anestesia general',     'Anestesia general o local'],
              ['autoriza_hospitalizacion', '🏥 Hospitalización',       'Internación necesaria'],
              ['autoriza_transfusion',     '🩸 Transfusión de sangre', 'En caso de emergencia'],
              ['autoriza_eutanasia',       '🕊️ Eutanasia',            'Solo en sufrimiento extremo'],
            ].map(([key, label, desc]) => (
              <label key={key} onClick={() => toggle(key)}
                className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition ${
                  form[key] ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-gray-50'
                }`}>
                <div className={`w-6 h-6 rounded flex items-center justify-center text-sm mt-0.5 flex-shrink-0 ${form[key]?'bg-green-500 text-white':'bg-gray-300'}`}>
                  {form[key] ? '✓' : ''}
                </div>
                <div>
                  <p className="font-semibold text-sm">{label}</p>
                  <p className="text-xs text-gray-500">{desc}</p>
                  <p className={`text-xs font-bold mt-1 ${form[key]?'text-green-600':'text-red-500'}`}>
                    {form[key] ? '✅ AUTORIZADO' : '❌ NO AUTORIZADO'}
                  </p>
                </div>
              </label>
            ))}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Observaciones adicionales</label>
            <textarea value={form.observaciones_autorizacion} onChange={e => set('observaciones_autorizacion', e.target.value)}
              rows={3} placeholder="Condiciones especiales..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"/>
          </div>
        </div>
      )}

      {/* ── FIRMAS ────────────────────────────────────────────────────────── */}
      {tab === 'firmas' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl shadow p-4 md:p-5">
            <h2 className="font-bold text-gray-800 mb-1">✒️ Firma del Tutor</h2>
            <p className="text-xs text-gray-400 mb-3">Dibuja la firma o sube una imagen</p>
            {form.firma_tutor_url ? (
              <div>
                <img src={form.firma_tutor_url.startsWith('data:') ? form.firma_tutor_url : `${BACKEND}${form.firma_tutor_url}`}
                  className="border rounded-xl w-full max-h-32 object-contain bg-gray-50 p-2" alt="Firma tutor"/>
                <button onClick={() => { set('firma_tutor_url',''); setFirmaTutorDibujada(false); if(canvasTutorRef.current) canvasTutorRef.current.getContext('2d').clearRect(0,0,400,150); }}
                  className="mt-2 text-xs text-red-500 hover:underline">🗑️ Borrar firma</button>
              </div>
            ) : (
              <div>
                <div className="border-2 border-dashed border-gray-300 rounded-xl overflow-hidden mb-2">
                  <canvas ref={canvasTutorRef} width={400} height={150}
                    className="w-full cursor-crosshair touch-none"
                    onMouseDown={e => iniciarTrazo(e, canvasTutorRef, setDibujandoTutor)}
                    onMouseMove={e => dibujar(e, canvasTutorRef, dibujandoTutor)}
                    onMouseUp={() => terminarTrazo(canvasTutorRef, setDibujandoTutor, setFirmaTutorDibujada, 'firma_tutor_url')}
                    onMouseLeave={() => { if(dibujandoTutor) terminarTrazo(canvasTutorRef, setDibujandoTutor, setFirmaTutorDibujada, 'firma_tutor_url'); }}
                    onTouchStart={e => iniciarTrazo(e, canvasTutorRef, setDibujandoTutor)}
                    onTouchMove={e => dibujar(e, canvasTutorRef, dibujandoTutor)}
                    onTouchEnd={() => terminarTrazo(canvasTutorRef, setDibujandoTutor, setFirmaTutorDibujada, 'firma_tutor_url')}
                  />
                </div>
                <div className="flex gap-2">
                  {firmaTutorDibujada && (
                    <button onClick={() => limpiarCanvas(canvasTutorRef, setFirmaTutorDibujada, 'firma_tutor_url')}
                      className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-lg">🗑️ Limpiar</button>
                  )}
                  <label className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-lg cursor-pointer">
                    📷 Subir imagen
                    <input type="file" accept="image/*" className="hidden"
                      onChange={e => { const f=e.target.files[0]; if(!f) return; const r=new FileReader(); r.onload=ev=>{set('firma_tutor_url',ev.target.result);setFirmaTutorDibujada(true);}; r.readAsDataURL(f); }}/>
                  </label>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow p-4 md:p-5">
            <h2 className="font-bold text-gray-800 mb-1">🏥 Firma del Receptor</h2>
            <p className="text-xs text-gray-400 mb-3">Se toma de tu perfil de usuario</p>
            <div className="border rounded-xl bg-gray-50 p-3 min-h-32 flex items-center justify-center">
              {(ficha?.firma_receptor_url || usuario?.firma_url) ? (
                <img src={`${BACKEND}${ficha?.firma_receptor_url || usuario?.firma_url}`}
                  className="max-h-28 object-contain" alt="Firma receptor"/>
              ) : (
                <div className="text-center">
                  <p className="text-gray-400 text-sm">⚠️ Sin firma configurada</p>
                  <p className="text-xs text-gray-400 mt-1">Ve a <b>Configuración → Mi perfil</b></p>
                </div>
              )}
            </div>
            <div className="mt-3 bg-blue-50 rounded-xl p-3 text-xs text-blue-700">
              <p><b>Receptor:</b> {ficha?.receptor_nombre || usuario?.nombre || '—'}</p>
              <p><b>Cargo:</b> {ficha?.receptor_cargo || usuario?.cargo || 'Veterinario / Receptor'}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── ADJUNTOS ──────────────────────────────────────────────────────── */}
      {tab === 'adjuntos' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl shadow p-4 md:p-5">
            <h2 className="font-bold text-gray-800 mb-1">📄 Documento Firmado por el Tutor</h2>
            <p className="text-xs text-gray-500 mb-3">Si el tutor devuelve el PDF firmado, súbelo aquí.</p>
            {ficha?.documento_firmado_url ? (
              <div className="flex items-center gap-3 bg-green-50 rounded-xl p-3 border border-green-200">
                <span className="text-2xl">📄</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-green-800 truncate">{ficha.documento_firmado_nombre||'Documento firmado'}</p>
                  <p className="text-xs text-green-600">✅ Recibido</p>
                </div>
                <a href={`${BACKEND}${ficha.documento_firmado_url}`} target="_blank" rel="noreferrer"
                  className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs">👁️ Ver</a>
              </div>
            ) : (
              <div className="space-y-2">
                <input ref={docFirmadoRef} type="file" accept=".pdf,.jpg,.jpeg,.png"
                  onChange={e => setDocFirmadoFile(e.target.files[0])}
                  className="w-full text-sm"/>
                {docFirmadoFile && (
                  <button onClick={subirDocFirmado}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm w-full">
                    📤 Subir documento firmado
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow p-4 md:p-5">
            <h2 className="font-bold text-gray-800 mb-3">📎 Adjuntos Adicionales</h2>
            <div className="space-y-2 mb-4">
              <input value={adjuntoNombre} onChange={e => setAdjuntoNombre(e.target.value)}
                placeholder="Nombre del documento (opcional)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"/>
              <input ref={adjRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                onChange={e => setAdjuntoFile(e.target.files[0])}
                className="w-full text-sm"/>
              {adjuntoFile && (
                <button onClick={subirAdjunto} disabled={subiendoAdj}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm w-full disabled:opacity-50">
                  {subiendoAdj ? '⏳ Subiendo...' : '📤 Subir adjunto'}
                </button>
              )}
            </div>
            {(!ficha?.adjuntos || ficha.adjuntos.length===0) ? (
              <div className="text-center py-6 text-gray-400 bg-gray-50 rounded-xl">
                <p className="text-3xl mb-2">📂</p><p className="text-sm">Sin adjuntos</p>
              </div>
            ) : (
              <div className="space-y-2">
                {ficha.adjuntos.map(a => (
                  <div key={a.id} className="flex items-center justify-between bg-gray-50 rounded-xl p-3 border">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="flex-shrink-0">{a.tipo==='pdf'?'📄':a.tipo==='imagen'?'🖼️':'📎'}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{a.nombre}</p>
                        <p className="text-xs text-gray-400">{new Date(a.created_at).toLocaleDateString('es-CO')}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <a href={`${BACKEND}${a.archivo_url}`} target="_blank" rel="noreferrer"
                        className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">👁️</a>
                      <button onClick={async()=>{await api.delete(`/fichas/adjunto/${a.id}`);await cargarDatos();}}
                        className="bg-red-100 text-red-600 px-2 py-1 rounded text-xs">🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}