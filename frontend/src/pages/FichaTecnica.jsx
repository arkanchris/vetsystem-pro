import { useState, useEffect, useRef, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast, { Toaster } from 'react-hot-toast';
import { AuthContext } from '../context/AuthContext';

const CONDICION_COLOR = {
  buena:   'bg-green-100 text-green-700',
  regular: 'bg-yellow-100 text-yellow-700',
  mala:    'bg-orange-100 text-orange-700',
  critica: 'bg-red-100 text-red-700',
};

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

  // Firma canvas
  const canvasTutorRef    = useRef(null);
  const [dibujandoTutor,  setDibujandoTutor]  = useState(false);
  const [firmaTutorDibujada, setFirmaTutorDibujada] = useState(false);

  // Adjuntos
  const [adjuntoFile, setAdjuntoFile]     = useState(null);
  const [adjuntoNombre, setAdjuntoNombre] = useState('');
  const [subiendoAdj, setSubiendoAdj]     = useState(false);
  const adjRef = useRef(null);

  // Doc firmado
  const [docFirmadoFile, setDocFirmadoFile] = useState(null);
  const docFirmadoRef = useRef(null);

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
    observaciones_generales:'', estado:'borrador',
    firma_tutor_url:'',
  });

  useEffect(() => { cargarDatos(); }, [paciente_id]);

  const cargarDatos = async () => {
    try {
      const [pac, fic, conf] = await Promise.all([
        api.get(`/pacientes/${paciente_id}`),
        api.get(`/fichas/paciente/${paciente_id}`),
        api.get('/configuracion'),
      ]);
      // Convertir array de config a objeto
      const confMap = {};
      (conf.data || []).forEach(item => { confMap[item.clave] = item.valor; });
      setClinica(confMap);
      setPaciente(pac.data);

      if (fic.data) {
        setFicha(fic.data);
        // Precargar form con TODOS los datos guardados de la ficha
        const fichaData = fic.data;
        setForm({
          motivo_ingreso:               fichaData.motivo_ingreso || '',
          condicion_llegada:            fichaData.condicion_llegada || 'buena',
          peso_ingreso:                 fichaData.peso_ingreso || '',
          temperatura_ingreso:          fichaData.temperatura_ingreso || '',
          vacunas_al_dia:               fichaData.vacunas_al_dia || false,
          desparasitado:                fichaData.desparasitado || false,
          fecha_ultima_desparasitacion: fichaData.fecha_ultima_desparasitacion
                                          ? fichaData.fecha_ultima_desparasitacion.split('T')[0]
                                          : '',
          esterilizado:                 fichaData.esterilizado || false,
          enfermedades_previas:         fichaData.enfermedades_previas || '',
          cirugias_previas:             fichaData.cirugias_previas || '',
          alergias:                     fichaData.alergias || '',
          medicacion_actual:            fichaData.medicacion_actual || '',
          condiciones_especiales:       fichaData.condiciones_especiales || '',
          autoriza_cirugia:             fichaData.autoriza_cirugia || false,
          autoriza_anestesia:           fichaData.autoriza_anestesia || false,
          autoriza_hospitalizacion:     fichaData.autoriza_hospitalizacion || false,
          autoriza_eutanasia:           fichaData.autoriza_eutanasia || false,
          autoriza_transfusion:         fichaData.autoriza_transfusion || false,
          observaciones_autorizacion:   fichaData.observaciones_autorizacion || '',
          contacto_emergencia_nombre:   fichaData.contacto_emergencia_nombre || '',
          contacto_emergencia_telefono: fichaData.contacto_emergencia_telefono || '',
          contacto_emergencia_relacion: fichaData.contacto_emergencia_relacion || '',
          tutor_nombre:                 fichaData.tutor_nombre || '',
          tutor_documento:              fichaData.tutor_documento || '',
          tutor_telefono:               fichaData.tutor_telefono || '',
          tutor_email:                  fichaData.tutor_email || '',
          observaciones_generales:      fichaData.observaciones_generales || '',
          estado:                       fichaData.estado || 'borrador',
          firma_tutor_url:              fichaData.firma_tutor_url || '',
        });
        // Si hay firma guardada, marcarla como dibujada
        if (fichaData.firma_tutor_url) setFirmaTutorDibujada(true);

      } else if (pac.data.propietario_id) {
        // Ficha nueva: precargar datos del tutor desde el propietario
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
    } catch (e) {
      console.error('Error cargarDatos ficha:', e);
      toast.error('Error al cargar datos');
    } finally {
      setCargando(false);
    }
  };

  const set    = (key, val) => setForm(p => ({ ...p, [key]: val }));
  const toggle = (key)      => setForm(p => ({ ...p, [key]: !p[key] }));

  // ── CANVAS DE FIRMA ───────────────────────────────────────────────────────
  const iniciarTrazo = (e, canvasRef, setDibujando) => {
    setDibujando(true);
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');
    const rect   = canvas.getBoundingClientRect();
    const x = (e.touches?.[0]?.clientX || e.clientX) - rect.left;
    const y = (e.touches?.[0]?.clientY || e.clientY) - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const dibujar = (e, canvasRef, dibujando) => {
    if (!dibujando) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');
    const rect   = canvas.getBoundingClientRect();
    const x = (e.touches?.[0]?.clientX || e.clientX) - rect.left;
    const y = (e.touches?.[0]?.clientY || e.clientY) - rect.top;
    ctx.lineWidth   = 2;
    ctx.strokeStyle = '#1e3a5f';
    ctx.lineCap     = 'round';
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const terminarTrazo = (canvasRef, setDibujando, setFirmaDibujada, key) => {
    setDibujando(false);
    setFirmaDibujada(true);
    const dataUrl = canvasRef.current.toDataURL('image/png');
    set(key, dataUrl);
  };

  const limpiarCanvas = (canvasRef, setFirmaDibujada, key) => {
    const canvas = canvasRef.current;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    setFirmaDibujada(false);
    set(key, '');
  };

  // ── GUARDAR FICHA ─────────────────────────────────────────────────────────
  const guardarFicha = async (estadoOverride = null) => {
    setGuardando(true);
    try {
      const datos = { ...form };
      if (estadoOverride) datos.estado = estadoOverride;

      const respuesta = await api.post(`/fichas/paciente/${paciente_id}`, datos);

      // Actualizar el estado local con la ficha que devuelve el servidor
      if (respuesta.data?.ficha) {
        setFicha(respuesta.data.ficha);
      }

      toast.success('✅ Ficha guardada');

      // Recargar datos frescos del servidor para confirmar persistencia
      await cargarDatos();
    } catch (e) {
      console.error('Error guardarFicha:', e);
      toast.error(e.response?.data?.error || 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  // ── GENERAR PDF ───────────────────────────────────────────────────────────
  const generarPDF = async () => {
    await guardarFicha('completada');
    const win = window.open('', '_blank');
    const f   = { ...form };
    const p   = paciente;

    const boolIcon = (v) => v ? '✅ Sí' : '❌ No';
    const val      = (v) => v || '—';
    const cl       = clinica;

    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>Ficha Técnica — ${p?.nombre}</title>
    <style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:Arial,sans-serif;font-size:11px;color:#1a1a2e;padding:20px}
      .header{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #1e3a5f;padding-bottom:12px;margin-bottom:16px}
      .clinica-info{display:flex;align-items:center;gap:12px}
      .clinica-logo{width:60px;height:60px;object-fit:contain;border-radius:8px}
      .clinica-logo-placeholder{width:60px;height:60px;background:#e0f2fe;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:24px}
      .clinica-nombre{font-size:18px;font-weight:bold;color:#1e3a5f}
      .clinica-datos{font-size:10px;color:#555;margin-top:2px}
      .ficha-info{text-align:right}
      .badge{display:inline-block;padding:3px 10px;border-radius:12px;font-size:10px;font-weight:bold;background:#e0f2fe;color:#0369a1}
      h2{color:#1e3a5f;font-size:12px;border-bottom:1px solid #bfdbfe;padding-bottom:3px;margin:14px 0 8px;text-transform:uppercase;letter-spacing:.5px}
      .grid{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px}
      .grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:10px}
      .campo{background:#f8fafc;border-left:3px solid #1e3a5f;padding:5px 8px;border-radius:3px}
      .campo-label{font-size:9px;font-weight:bold;color:#64748b;text-transform:uppercase;margin-bottom:2px}
      .campo-valor{font-size:11px;color:#1e293b}
      .autz-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;margin-bottom:10px}
      .autz-item{padding:5px 8px;border-radius:6px;text-align:center;font-size:10px;font-weight:bold}
      .autz-si{background:#dcfce7;color:#166534}
      .autz-no{background:#fee2e2;color:#991b1b}
      .firmas{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:24px;border-top:2px solid #1e3a5f;padding-top:16px}
      .firma-box{text-align:center}
      .firma-img{border:1px solid #ddd;border-radius:6px;padding:4px;min-height:70px;display:flex;align-items:center;justify-content:center;margin-bottom:8px;background:#fafafa}
      .firma-img img{max-height:70px;max-width:200px}
      .firma-linea{border-top:1px solid #333;margin:8px auto;width:80%}
      .footer{margin-top:16px;padding-top:8px;border-top:1px solid #ddd;display:flex;justify-content:space-between;font-size:9px;color:#94a3b8}
      .alerta{background:#fef3c7;border:1px solid #fbbf24;padding:6px 10px;border-radius:6px;font-size:10px;color:#92400e;margin-bottom:10px}
      @media print{body{padding:8px}}
    </style></head><body>

    <div class="header">
      <div class="clinica-info">
        ${cl.clinica_logo_url
          ? `<img src="http://localhost:5000${cl.clinica_logo_url}" class="clinica-logo" alt="Logo"/>`
          : `<div class="clinica-logo-placeholder">🐾</div>`}
        <div>
          <div class="clinica-nombre">${cl.clinica_nombre || 'Clínica Veterinaria'}</div>
          <div class="clinica-datos">
            ${cl.clinica_nit ? `NIT: ${cl.clinica_nit} &nbsp;|&nbsp;` : ''}
            ${cl.clinica_telefono ? `📞 ${cl.clinica_telefono} &nbsp;|&nbsp;` : ''}
            ${cl.clinica_email ? `✉️ ${cl.clinica_email}` : ''}
          </div>
          ${cl.clinica_direccion ? `<div class="clinica-datos">📍 ${cl.clinica_direccion}</div>` : ''}
        </div>
      </div>
      <div class="ficha-info">
        <div class="badge">📋 FICHA TÉCNICA N° ${ficha?.id || 'Nueva'}</div>
        <p style="margin-top:6px;color:#555;font-size:10px">Fecha: <b>${new Date().toLocaleDateString('es-CO')}</b></p>
        <p style="color:#555;font-size:10px">Hora: ${new Date().toLocaleTimeString('es-CO', {hour:'2-digit',minute:'2-digit'})}</p>
      </div>
    </div>

    <h2>📋 Datos del Paciente</h2>
    <div class="grid3">
      <div class="campo"><div class="campo-label">Nombre</div><div class="campo-valor"><b>${val(p?.nombre)}</b></div></div>
      <div class="campo"><div class="campo-label">Especie</div><div class="campo-valor">${val(p?.especie)}</div></div>
      <div class="campo"><div class="campo-label">Raza</div><div class="campo-valor">${val(p?.raza)}</div></div>
      <div class="campo"><div class="campo-label">Sexo</div><div class="campo-valor">${val(p?.sexo)}</div></div>
      <div class="campo"><div class="campo-label">Fecha nacimiento</div><div class="campo-valor">${val(p?.fecha_nac_texto || p?.fecha_nacimiento)}</div></div>
      <div class="campo"><div class="campo-label">Color</div><div class="campo-valor">${val(p?.color)}</div></div>
      <div class="campo"><div class="campo-label">Peso al ingreso</div><div class="campo-valor">${f.peso_ingreso ? f.peso_ingreso+' kg' : '—'}</div></div>
      <div class="campo"><div class="campo-label">Temperatura</div><div class="campo-valor">${f.temperatura_ingreso ? f.temperatura_ingreso+'°C' : '—'}</div></div>
      <div class="campo"><div class="campo-label">Condición de llegada</div><div class="campo-valor"><b>${val(f.condicion_llegada)?.toUpperCase()}</b></div></div>
    </div>
    ${f.motivo_ingreso ? `<div class="campo" style="margin-bottom:10px"><div class="campo-label">Motivo de ingreso</div><div class="campo-valor">${f.motivo_ingreso}</div></div>` : ''}

    <h2>🩺 Antecedentes Médicos</h2>
    <div class="grid3">
      <div class="campo"><div class="campo-label">Vacunas al día</div><div class="campo-valor">${boolIcon(f.vacunas_al_dia)}</div></div>
      <div class="campo"><div class="campo-label">Desparasitado</div><div class="campo-valor">${boolIcon(f.desparasitado)}</div></div>
      <div class="campo"><div class="campo-label">Esterilizado</div><div class="campo-valor">${boolIcon(f.esterilizado)}</div></div>
    </div>
    ${f.fecha_ultima_desparasitacion ? `<div class="campo" style="margin-bottom:6px"><div class="campo-label">Última desparasitación</div><div class="campo-valor">${new Date(f.fecha_ultima_desparasitacion).toLocaleDateString('es-CO')}</div></div>` : ''}
    <div class="grid">
      ${f.enfermedades_previas ? `<div class="campo"><div class="campo-label">Enfermedades previas</div><div class="campo-valor">${f.enfermedades_previas}</div></div>` : ''}
      ${f.cirugias_previas ? `<div class="campo"><div class="campo-label">Cirugías previas</div><div class="campo-valor">${f.cirugias_previas}</div></div>` : ''}
      ${f.alergias ? `<div class="campo"><div class="campo-label">Alergias conocidas</div><div class="campo-valor"><b style="color:#dc2626">${f.alergias}</b></div></div>` : ''}
      ${f.medicacion_actual ? `<div class="campo"><div class="campo-label">Medicación actual</div><div class="campo-valor">${f.medicacion_actual}</div></div>` : ''}
      ${f.condiciones_especiales ? `<div class="campo"><div class="campo-label">Condiciones especiales</div><div class="campo-valor">${f.condiciones_especiales}</div></div>` : ''}
    </div>

    <h2>✍️ Autorización de Procedimientos</h2>
    <div class="autz-grid">
      <div class="autz-item ${f.autoriza_cirugia?'autz-si':'autz-no'}">Cirugía: ${f.autoriza_cirugia?'AUTORIZA':'NO AUTORIZA'}</div>
      <div class="autz-item ${f.autoriza_anestesia?'autz-si':'autz-no'}">Anestesia: ${f.autoriza_anestesia?'AUTORIZA':'NO AUTORIZA'}</div>
      <div class="autz-item ${f.autoriza_hospitalizacion?'autz-si':'autz-no'}">Hospitalización: ${f.autoriza_hospitalizacion?'AUTORIZA':'NO AUTORIZA'}</div>
      <div class="autz-item ${f.autoriza_transfusion?'autz-si':'autz-no'}">Transfusión: ${f.autoriza_transfusion?'AUTORIZA':'NO AUTORIZA'}</div>
      <div class="autz-item ${f.autoriza_eutanasia?'autz-si':'autz-no'}">Eutanasia: ${f.autoriza_eutanasia?'AUTORIZA':'NO AUTORIZA'}</div>
    </div>
    ${f.observaciones_autorizacion ? `<div class="campo" style="margin-bottom:10px"><div class="campo-label">Observaciones de autorización</div><div class="campo-valor">${f.observaciones_autorizacion}</div></div>` : ''}

    <h2>👤 Datos del Tutor</h2>
    <div class="grid">
      <div class="campo"><div class="campo-label">Nombre completo</div><div class="campo-valor"><b>${val(f.tutor_nombre)}</b></div></div>
      <div class="campo"><div class="campo-label">Documento de identidad</div><div class="campo-valor">${val(f.tutor_documento)}</div></div>
      <div class="campo"><div class="campo-label">Teléfono</div><div class="campo-valor">${val(f.tutor_telefono)}</div></div>
      <div class="campo"><div class="campo-label">Email</div><div class="campo-valor">${val(f.tutor_email)}</div></div>
    </div>

    ${(f.contacto_emergencia_nombre || f.contacto_emergencia_telefono) ? `
    <h2>🚨 Contacto de Emergencia</h2>
    <div class="grid3">
      <div class="campo"><div class="campo-label">Nombre</div><div class="campo-valor">${val(f.contacto_emergencia_nombre)}</div></div>
      <div class="campo"><div class="campo-label">Teléfono</div><div class="campo-valor">${val(f.contacto_emergencia_telefono)}</div></div>
      <div class="campo"><div class="campo-label">Relación</div><div class="campo-valor">${val(f.contacto_emergencia_relacion)}</div></div>
    </div>` : ''}

    ${f.observaciones_generales ? `
    <h2>📝 Observaciones Generales</h2>
    <div class="campo" style="margin-bottom:10px"><div class="campo-valor">${f.observaciones_generales}</div></div>` : ''}

    <div class="alerta">
      ⚠️ Al firmar este documento, el tutor declara que la información suministrada es verídica y que autoriza los procedimientos indicados anteriormente. La clínica no se hace responsable por información omitida o incorrecta.
    </div>

    <div class="firmas">
      <div class="firma-box">
        <p style="font-weight:bold;margin-bottom:8px;font-size:11px">FIRMA DEL TUTOR / PROPIETARIO</p>
        <div class="firma-img">
          ${f.firma_tutor_url && f.firma_tutor_url.startsWith('data:')
            ? `<img src="${f.firma_tutor_url}" alt="Firma tutor"/>`
            : '<span style="color:#ccc;font-size:10px">Sin firma registrada</span>'}
        </div>
        <div class="firma-linea"></div>
        <p style="font-size:10px"><b>${val(f.tutor_nombre)}</b></p>
        <p style="font-size:9px;color:#555">C.C. / Doc: ${val(f.tutor_documento)}</p>
        <p style="font-size:9px;color:#555">Fecha: ${new Date().toLocaleDateString('es-CO')}</p>
      </div>
      <div class="firma-box">
        <p style="font-weight:bold;margin-bottom:8px;font-size:11px">FIRMA DE QUIEN RECIBE</p>
        <div class="firma-img">
          ${(ficha?.firma_receptor_url || f.firma_receptor_url)
            ? `<img src="http://localhost:5000${ficha?.firma_receptor_url || f.firma_receptor_url}" alt="Firma receptor" style="max-height:70px"/>`
            : (usuario?.firma_url
              ? `<img src="http://localhost:5000${usuario.firma_url}" alt="Firma receptor" style="max-height:70px"/>`
              : '<span style="color:#ccc;font-size:10px">Sin firma configurada</span>')}
        </div>
        <div class="firma-linea"></div>
        <p style="font-size:10px"><b>${ficha?.receptor_nombre || usuario?.nombre || '—'}</b></p>
        <p style="font-size:9px;color:#555">${ficha?.receptor_cargo || usuario?.cargo || 'Veterinario / Receptor'}</p>
        <p style="font-size:9px;color:#555">Fecha: ${new Date().toLocaleDateString('es-CO')}</p>
      </div>
    </div>

    <div class="footer">
      <span>${cl.clinica_nombre || 'VetSystem Pro'} — Ficha Técnica N° ${ficha?.id || '-'}</span>
      <span>Generado: ${new Date().toLocaleString('es-CO')}</span>
    </div>
    <script>window.onload=()=>{window.print()}</script>
    </body></html>`);
    win.document.close();
  };

  // ── SUBIR ADJUNTO ─────────────────────────────────────────────────────────
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

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="bg-gray-100 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-200">← Volver</button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">📋 Ficha Técnica</h1>
            <div className="flex items-center gap-2 mt-1">
              {paciente.foto_url && <img src={`http://localhost:5000${paciente.foto_url}`} className="w-8 h-8 rounded-full object-cover border" alt=""/>}
              <p className="text-gray-600 font-medium">{paciente.nombre}</p>
              <span className="text-xs text-gray-400">{paciente.especie} · {paciente.raza}</span>
              {ficha && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  ficha.estado==='firmada'    ? 'bg-green-100 text-green-700' :
                  ficha.estado==='completada' ? 'bg-blue-100 text-blue-700'  :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {ficha.estado === 'firmada' ? '✅ Firmada' : ficha.estado === 'completada' ? '📋 Completada' : '📝 Borrador'}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => guardarFicha()} disabled={guardando}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 font-medium disabled:opacity-50 text-sm">
            {guardando ? '⏳' : '💾'} Guardar
          </button>
          <button onClick={generarPDF}
            className="bg-red-600 text-white px-4 py-2 rounded-xl hover:bg-red-700 font-medium text-sm">
            🖨️ PDF
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-white rounded-xl shadow p-1.5 overflow-x-auto">
        {TABS.map(([k,l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition ${tab===k?'bg-blue-600 text-white shadow':'text-gray-600 hover:bg-gray-100'}`}>
            {l}
          </button>
        ))}
      </div>

      {/* ═══ DATOS BÁSICOS ═══════════════════════════════════════════════════ */}
      {tab === 'datos' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl shadow p-6 space-y-4">
            <h2 className="font-bold text-gray-800 text-base">🐾 Datos del Paciente en este Ingreso</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
                rows={3} placeholder="Describe el motivo por el cual el paciente ingresa..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"/>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow p-6 space-y-4">
            <h2 className="font-bold text-gray-800 text-base">👤 Datos del Tutor</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Nombre completo *</label>
                <input value={form.tutor_nombre} onChange={e => set('tutor_nombre', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"/>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Número de documento *</label>
                <input value={form.tutor_documento} onChange={e => set('tutor_documento', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"/>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Teléfono</label>
                <input value={form.tutor_telefono} onChange={e => set('tutor_telefono', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"/>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Email</label>
                <input type="email" value={form.tutor_email} onChange={e => set('tutor_email', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"/>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow p-6 space-y-4">
            <h2 className="font-bold text-gray-800 text-base">🚨 Contacto de Emergencia</h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Nombre</label>
                <input value={form.contacto_emergencia_nombre} onChange={e => set('contacto_emergencia_nombre', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"/>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Teléfono</label>
                <input value={form.contacto_emergencia_telefono} onChange={e => set('contacto_emergencia_telefono', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"/>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Relación</label>
                <input value={form.contacto_emergencia_relacion} onChange={e => set('contacto_emergencia_relacion', e.target.value)}
                  placeholder="Ej: Esposo/a, Hijo/a..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"/>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow p-6">
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Observaciones generales</label>
            <textarea value={form.observaciones_generales} onChange={e => set('observaciones_generales', e.target.value)}
              rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"/>
          </div>
        </div>
      )}

      {/* ═══ ANTECEDENTES ════════════════════════════════════════════════════ */}
      {tab === 'antecedentes' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl shadow p-6">
            <h2 className="font-bold text-gray-800 text-base mb-4">💊 Estado de Salud Previo</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
              {[
                ['vacunas_al_dia',  '💉 Vacunas al día'],
                ['desparasitado',   '🐛 Desparasitado'],
                ['esterilizado',    '🔬 Esterilizado/Castrado'],
              ].map(([key, label]) => (
                <label key={key} onClick={() => toggle(key)}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition ${
                    form[key] ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                  <div className={`w-5 h-5 rounded flex items-center justify-center text-sm ${form[key]?'bg-green-500':'bg-gray-200'}`}>
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
                  className="w-48 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"/>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {[
                ['enfermedades_previas', '🏥 Enfermedades previas', 'Ej: Parvovirosis, Distemper...'],
                ['cirugias_previas',     '🔪 Cirugías previas',     'Ej: Castración, fractura...'],
                ['alergias',             '⚠️ Alergias conocidas',   'Ej: Penicilina, mariscos...'],
                ['medicacion_actual',    '💊 Medicación actual',    'Nombre y dosis del medicamento...'],
              ].map(([key, label, ph]) => (
                <div key={key}>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{label}</label>
                  <textarea value={form[key]} onChange={e => set(key, e.target.value)}
                    rows={2} placeholder={ph}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 text-sm ${
                      key==='alergias' && form[key] ? 'border-red-300 focus:ring-red-400 bg-red-50' : 'border-gray-300 focus:ring-blue-400'
                    }`}/>
                </div>
              ))}
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">🔴 Condiciones especiales</label>
                <textarea value={form.condiciones_especiales} onChange={e => set('condiciones_especiales', e.target.value)}
                  rows={2} placeholder="Diabetes, epilepsia, cardiopatía, agresividad, ansiedad..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"/>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ AUTORIZACIONES ══════════════════════════════════════════════════ */}
      {tab === 'autorizaciones' && (
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="font-bold text-gray-800 text-base mb-2">✍️ Autorización de Procedimientos</h2>
          <p className="text-sm text-gray-500 mb-5">El tutor autoriza o deniega los siguientes procedimientos médicos.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
            {[
              ['autoriza_cirugia',        '🔪 Cirugía',               'Procedimientos quirúrgicos de cualquier tipo'],
              ['autoriza_anestesia',       '💉 Anestesia general',     'Administración de anestesia general o local'],
              ['autoriza_hospitalizacion', '🏥 Hospitalización',       'Internación por el tiempo necesario'],
              ['autoriza_transfusion',     '🩸 Transfusión de sangre', 'Transfusión sanguínea en caso de emergencia'],
              ['autoriza_eutanasia',       '🕊️ Eutanasia (emergencia)','Solo en caso de sufrimiento extremo e irremediable'],
            ].map(([key, label, desc]) => (
              <label key={key} onClick={() => toggle(key)}
                className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition ${
                  form[key] ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-gray-300 bg-gray-50'
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
              rows={3} placeholder="Condiciones especiales, límites de costo, instrucciones del tutor..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"/>
          </div>
        </div>
      )}

      {/* ═══ FIRMAS ══════════════════════════════════════════════════════════ */}
      {tab === 'firmas' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Firma del tutor */}
          <div className="bg-white rounded-2xl shadow p-5">
            <h2 className="font-bold text-gray-800 mb-1">✒️ Firma del Tutor</h2>
            <p className="text-xs text-gray-400 mb-3">El tutor puede dibujar su firma o subir una imagen</p>

            {form.firma_tutor_url ? (
              <div>
                <img src={form.firma_tutor_url.startsWith('data:') ? form.firma_tutor_url : `http://localhost:5000${form.firma_tutor_url}`}
                  className="border rounded-xl w-full max-h-32 object-contain bg-gray-50 p-2" alt="Firma tutor"/>
                <button onClick={() => {
                    set('firma_tutor_url', '');
                    setFirmaTutorDibujada(false);
                    if (canvasTutorRef.current) {
                      canvasTutorRef.current.getContext('2d').clearRect(0, 0, canvasTutorRef.current.width, canvasTutorRef.current.height);
                    }
                  }}
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
                    onMouseLeave={() => { if (dibujandoTutor) terminarTrazo(canvasTutorRef, setDibujandoTutor, setFirmaTutorDibujada, 'firma_tutor_url'); }}
                    onTouchStart={e => iniciarTrazo(e, canvasTutorRef, setDibujandoTutor)}
                    onTouchMove={e => dibujar(e, canvasTutorRef, dibujandoTutor)}
                    onTouchEnd={() => terminarTrazo(canvasTutorRef, setDibujandoTutor, setFirmaTutorDibujada, 'firma_tutor_url')}
                  />
                </div>
                <div className="flex gap-2">
                  {firmaTutorDibujada && (
                    <button onClick={() => limpiarCanvas(canvasTutorRef, setFirmaTutorDibujada, 'firma_tutor_url')}
                      className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-lg hover:bg-gray-200">
                      🗑️ Limpiar
                    </button>
                  )}
                  <label className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-lg hover:bg-blue-200 cursor-pointer">
                    📷 Subir imagen
                    <input type="file" accept="image/*" className="hidden"
                      onChange={e => {
                        const file = e.target.files[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (ev) => { set('firma_tutor_url', ev.target.result); setFirmaTutorDibujada(true); };
                        reader.readAsDataURL(file);
                      }}/>
                  </label>
                </div>
                <p className="text-xs text-gray-400 mt-1">Dibuja la firma en el recuadro o sube una imagen</p>
              </div>
            )}
          </div>

          {/* Firma del receptor */}
          <div className="bg-white rounded-2xl shadow p-5">
            <h2 className="font-bold text-gray-800 mb-1">🏥 Firma del Receptor</h2>
            <p className="text-xs text-gray-400 mb-3">La firma del receptor se toma de tu perfil de usuario</p>
            <div className="border rounded-xl bg-gray-50 p-3 min-h-32 flex items-center justify-center">
              {(ficha?.firma_receptor_url || usuario?.firma_url) ? (
                <img src={`http://localhost:5000${ficha?.firma_receptor_url || usuario?.firma_url}`}
                  className="max-h-28 object-contain" alt="Firma receptor"/>
              ) : (
                <div className="text-center">
                  <p className="text-gray-400 text-sm">⚠️ Sin firma configurada</p>
                  <p className="text-xs text-gray-400 mt-1">Ve a <b>Configuración → Mi perfil</b> para agregar tu firma</p>
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

      {/* ═══ ADJUNTOS ════════════════════════════════════════════════════════ */}
      {tab === 'adjuntos' && (
        <div className="space-y-5">

          {/* Documento firmado por el tutor */}
          <div className="bg-white rounded-2xl shadow p-5">
            <h2 className="font-bold text-gray-800 mb-1">📄 Documento Firmado por el Tutor</h2>
            <p className="text-xs text-gray-500 mb-3">Si el tutor firma el PDF y lo devuelve, sube aquí el archivo firmado.</p>

            {ficha?.documento_firmado_url ? (
              <div className="flex items-center gap-3 bg-green-50 rounded-xl p-3 border border-green-200">
                <span className="text-2xl">📄</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-800">{ficha.documento_firmado_nombre || 'Documento firmado'}</p>
                  <p className="text-xs text-green-600">✅ Documento firmado recibido</p>
                </div>
                <a href={`http://localhost:5000${ficha.documento_firmado_url}`} target="_blank" rel="noreferrer"
                  className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-green-700">
                  👁️ Ver
                </a>
              </div>
            ) : (
              <div className="space-y-2">
                <input ref={docFirmadoRef} type="file" accept=".pdf,.jpg,.jpeg,.png"
                  onChange={e => setDocFirmadoFile(e.target.files[0])}
                  className="w-full text-sm file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-green-100 file:text-green-700"/>
                {docFirmadoFile && (
                  <button onClick={subirDocFirmado}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 font-medium">
                    📤 Subir documento firmado
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Adjuntos generales */}
          <div className="bg-white rounded-2xl shadow p-5">
            <h2 className="font-bold text-gray-800 mb-3">📎 Adjuntos Adicionales</h2>
            <div className="space-y-2 mb-4">
              <input value={adjuntoNombre} onChange={e => setAdjuntoNombre(e.target.value)}
                placeholder="Nombre del documento (opcional)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"/>
              <input ref={adjRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                onChange={e => setAdjuntoFile(e.target.files[0])}
                className="w-full text-sm file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-100 file:text-blue-700"/>
              {adjuntoFile && (
                <button onClick={subirAdjunto} disabled={subiendoAdj}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 font-medium disabled:opacity-50">
                  {subiendoAdj ? '⏳ Subiendo...' : '📤 Subir adjunto'}
                </button>
              )}
            </div>

            {(!ficha?.adjuntos || ficha.adjuntos.length === 0) ? (
              <div className="text-center py-6 text-gray-400 bg-gray-50 rounded-xl">
                <p className="text-3xl mb-2">📂</p><p className="text-sm">Sin adjuntos</p>
              </div>
            ) : (
              <div className="space-y-2">
                {ficha.adjuntos.map(a => (
                  <div key={a.id} className="flex items-center justify-between bg-gray-50 rounded-xl p-3 border">
                    <div className="flex items-center gap-2">
                      <span>{a.tipo==='pdf'?'📄':a.tipo==='imagen'?'🖼️':'📎'}</span>
                      <div>
                        <p className="text-sm font-medium">{a.nombre}</p>
                        <p className="text-xs text-gray-400">{new Date(a.created_at).toLocaleDateString('es-CO')}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <a href={`http://localhost:5000${a.archivo_url}`} target="_blank" rel="noreferrer"
                        className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs hover:bg-blue-200">👁️ Ver</a>
                      <button onClick={async () => { await api.delete(`/fichas/adjunto/${a.id}`); await cargarDatos(); }}
                        className="bg-red-100 text-red-600 px-2 py-1 rounded text-xs hover:bg-red-200">🗑️</button>
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