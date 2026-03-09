import { useState, useEffect } from 'react';
import api from '../services/api';
import toast, { Toaster } from 'react-hot-toast';

export default function Historias() {
  const [historias, setHistorias] = useState([]);
  const [pacientes, setPacientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState('');
  const [pacienteInfo, setPacienteInfo] = useState(null);
  const [form, setForm] = useState({
    paciente_id: '', motivo_consulta: '', examen_fisico: '',
    diagnostico: '', tratamiento: '', observaciones: '',
    peso_consulta: '', temperatura: ''
  });

  useEffect(() => { cargarDatos(); }, []);

  const cargarDatos = async () => {
    try {
      const pac = await api.get('/pacientes');
      setPacientes(pac.data);
      if (pac.data.length > 0) {
        await cargarHistorias(pac.data[0].id);
        setPacienteSeleccionado(pac.data[0].id);
        setPacienteInfo(pac.data[0]);
      }
    } catch (err) {
      toast.error('Error al cargar datos');
    } finally {
      setCargando(false);
    }
  };

  const cargarHistorias = async (pacienteId) => {
    try {
      const res = await api.get(`/historias/paciente/${pacienteId}`);
      setHistorias(res.data);
    } catch (err) {
      setHistorias([]);
    }
  };

  const cambiarPaciente = async (e) => {
    const id = e.target.value;
    setPacienteSeleccionado(id);
    if (id) {
      await cargarHistorias(id);
      const pacFound = pacientes.find(p => p.id == id);
      setPacienteInfo(pacFound || null);
    } else {
      setHistorias([]);
      setPacienteInfo(null);
    }
  };

  const abrirModal = (h = null) => {
    if (h) {
      setEditando(h);
      setForm({
        paciente_id: h.paciente_id || '',
        motivo_consulta: h.motivo_consulta || '',
        examen_fisico: h.examen_fisico || '',
        diagnostico: h.diagnostico || '',
        tratamiento: h.tratamiento || '',
        observaciones: h.observaciones || '',
        peso_consulta: h.peso_consulta || '',
        temperatura: h.temperatura || ''
      });
    } else {
      setEditando(null);
      setForm({
        paciente_id: pacienteSeleccionado || '',
        motivo_consulta: '', examen_fisico: '',
        diagnostico: '', tratamiento: '',
        observaciones: '', peso_consulta: '', temperatura: ''
      });
    }
    setModalAbierto(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editando) {
        await api.put(`/historias/${editando.id}`, form);
        toast.success('✅ Historia actualizada');
      } else {
        await api.post('/historias', form);
        toast.success('✅ Historia registrada');
      }
      setModalAbierto(false);
      if (pacienteSeleccionado) await cargarHistorias(pacienteSeleccionado);
    } catch (err) {
      toast.error('Error al guardar');
    }
  };

  const eliminar = async (id) => {
    if (!confirm('¿Eliminar esta historia clínica?')) return;
    try {
      await api.delete(`/historias/${id}`);
      toast.success('✅ Eliminada');
      if (pacienteSeleccionado) await cargarHistorias(pacienteSeleccionado);
    } catch (err) {
      toast.error('Error al eliminar');
    }
  };

  const imprimirHistoria = (h) => {
    const fotoUrl = pacienteInfo?.foto_url
      ? `http://localhost:5000${pacienteInfo.foto_url}`
      : null;

    const propietario = pacienteInfo?.propietario_nombre
      ? `${pacienteInfo.propietario_nombre} ${pacienteInfo.propietario_apellido || ''}`
      : 'Sin propietario';

    const contenido = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <title>Historia Clínica - ${pacienteInfo?.nombre || ''}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; color: #222; padding: 30px; font-size: 13px; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0d9488; padding-bottom: 16px; margin-bottom: 20px; }
          .clinic-name { font-size: 22px; font-weight: bold; color: #0d9488; }
          .clinic-sub { font-size: 12px; color: #555; margin-top: 4px; }
          .paciente-box { display: flex; gap: 16px; background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 8px; padding: 14px; margin-bottom: 20px; }
          .paciente-foto { width: 90px; height: 90px; border-radius: 8px; object-fit: cover; border: 2px solid #0d9488; }
          .paciente-foto-placeholder { width: 90px; height: 90px; border-radius: 8px; background: #ccfbf1; display: flex; align-items: center; justify-content: center; font-size: 36px; border: 2px solid #0d9488; }
          .paciente-info h2 { font-size: 18px; font-weight: bold; color: #0f766e; }
          .paciente-info p { font-size: 12px; color: #444; margin-top: 3px; }
          .consulta-header { background: #0d9488; color: white; padding: 8px 14px; border-radius: 6px; margin-bottom: 14px; font-size: 14px; font-weight: bold; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
          .campo { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; }
          .campo-label { font-size: 10px; font-weight: bold; text-transform: uppercase; color: #64748b; margin-bottom: 4px; letter-spacing: 0.5px; }
          .campo-valor { font-size: 13px; color: #1e293b; }
          .vitales { display: flex; gap: 20px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 10px; margin-top: 8px; }
          .vital { text-align: center; }
          .vital-valor { font-size: 18px; font-weight: bold; color: #1d4ed8; }
          .vital-label { font-size: 10px; color: #64748b; }
          .footer { margin-top: 40px; display: flex; justify-content: space-between; font-size: 11px; color: #888; border-top: 1px solid #ddd; padding-top: 10px; }
          .firma { text-align: center; margin-top: 40px; }
          .firma-linea { border-top: 1px solid #333; width: 200px; margin: 0 auto 6px; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="clinic-name">🐾 VetSystem Pro</div>
            <div class="clinic-sub">Historia Clínica Veterinaria</div>
            <div class="clinic-sub">Fecha: ${new Date(h.fecha).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
          </div>
          <div style="text-align:right; font-size:11px; color:#555;">
            <div>Historia N° ${h.id}</div>
            <div>Veterinario: Dr. ${h.veterinario_nombre || 'Sin asignar'}</div>
          </div>
        </div>

        <div class="paciente-box">
          ${fotoUrl
            ? `<img src="${fotoUrl}" class="paciente-foto" alt="foto paciente" />`
            : `<div class="paciente-foto-placeholder">🐾</div>`
          }
          <div class="paciente-info">
            <h2>${pacienteInfo?.nombre || ''}</h2>
            <p><b>Especie:</b> ${pacienteInfo?.especie || ''} &nbsp;|&nbsp; <b>Raza:</b> ${pacienteInfo?.raza || 'N/A'}</p>
            <p><b>Sexo:</b> ${pacienteInfo?.sexo || 'N/A'} &nbsp;|&nbsp; <b>Color:</b> ${pacienteInfo?.color || 'N/A'}</p>
            <p><b>Propietario:</b> ${propietario}</p>
          </div>
        </div>

        <div class="consulta-header">🩺 ${h.motivo_consulta}</div>

        <div class="grid">
          ${h.examen_fisico ? `<div class="campo"><div class="campo-label">Examen Físico</div><div class="campo-valor">${h.examen_fisico}</div></div>` : ''}
          ${h.diagnostico ? `<div class="campo"><div class="campo-label">Diagnóstico</div><div class="campo-valor">${h.diagnostico}</div></div>` : ''}
          ${h.tratamiento ? `<div class="campo"><div class="campo-label">Tratamiento</div><div class="campo-valor">${h.tratamiento}</div></div>` : ''}
          ${h.observaciones ? `<div class="campo"><div class="campo-label">Observaciones</div><div class="campo-valor">${h.observaciones}</div></div>` : ''}
        </div>

        ${(h.peso_consulta || h.temperatura) ? `
        <div class="vitales">
          ${h.peso_consulta ? `<div class="vital"><div class="vital-valor">${h.peso_consulta} kg</div><div class="vital-label">⚖️ Peso</div></div>` : ''}
          ${h.temperatura ? `<div class="vital"><div class="vital-valor">${h.temperatura} °C</div><div class="vital-label">🌡️ Temperatura</div></div>` : ''}
        </div>` : ''}

        <div class="firma">
          <div class="firma-linea"></div>
          <div>Firma del Veterinario</div>
          <div style="font-size:11px; color:#888;">Dr. ${h.veterinario_nombre || 'Sin asignar'}</div>
        </div>

        <div class="footer">
          <span>VetSystem Pro — Sistema de Gestión Veterinaria</span>
          <span>Impreso: ${new Date().toLocaleString('es-CO')}</span>
        </div>
      </body>
      </html>
    `;

    const ventana = window.open('', '_blank', 'width=800,height=900');
    ventana.document.write(contenido);
    ventana.document.close();
    ventana.focus();
    setTimeout(() => ventana.print(), 500);
  };

  return (
    <div className="p-6">
      <Toaster position="top-right" />
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">📋 Historia Clínica</h1>
          <p className="text-gray-500">Historial médico de pacientes</p>
        </div>
        <button onClick={() => abrirModal()}
          className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl font-medium transition">
          + Nueva Historia
        </button>
      </div>

      {/* Selector de paciente con foto */}
      <div className="bg-white rounded-xl shadow p-4 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Seleccionar Paciente:
        </label>
        <select value={pacienteSeleccionado} onChange={cambiarPaciente}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500">
          <option value="">-- Seleccionar paciente --</option>
          {pacientes.map(p => (
            <option key={p.id} value={p.id}>{p.nombre} ({p.especie})</option>
          ))}
        </select>

        {/* Info del paciente seleccionado con foto */}
        {pacienteInfo && (
          <div className="mt-4 flex items-center gap-4 p-3 bg-teal-50 rounded-lg border border-teal-100">
            {pacienteInfo.foto_url ? (
              <img
                src={`http://localhost:5000${pacienteInfo.foto_url}`}
                alt={pacienteInfo.nombre}
                className="w-16 h-16 rounded-full object-cover border-2 border-teal-400"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center text-3xl border-2 border-teal-300">
                🐾
              </div>
            )}
            <div>
              <p className="font-bold text-gray-800 text-lg">{pacienteInfo.nombre}</p>
              <p className="text-sm text-gray-500">
                {pacienteInfo.especie} · {pacienteInfo.raza || 'Sin raza'} · {pacienteInfo.sexo || 'Sin sexo'}
              </p>
              {(pacienteInfo.propietario_nombre) && (
                <p className="text-sm text-teal-600">
                  👤 {pacienteInfo.propietario_nombre} {pacienteInfo.propietario_apellido || ''}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Historias */}
      <div className="space-y-4">
        {cargando ? (
          <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">⏳ Cargando...</div>
        ) : historias.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-8 text-center">
            <span className="text-6xl">📋</span>
            <p className="mt-3 text-gray-500">No hay historias clínicas para este paciente</p>
            <button onClick={() => abrirModal()}
              className="mt-4 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700">
              Crear primera historia
            </button>
          </div>
        ) : (
          historias.map(h => (
            <div key={h.id} className="bg-white rounded-xl shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-sm text-gray-500">
                    📅 {new Date(h.fecha).toLocaleDateString()} — Dr. {h.veterinario_nombre || 'Sin asignar'}
                  </p>
                  <h3 className="text-lg font-bold text-gray-800 mt-1">
                    🩺 {h.motivo_consulta}
                  </h3>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => imprimirHistoria(h)}
                    className="bg-blue-100 text-blue-700 px-3 py-1 rounded-lg text-sm hover:bg-blue-200 font-medium">
                    🖨️ Imprimir
                  </button>
                  <button onClick={() => abrirModal(h)}
                    className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-lg text-sm hover:bg-yellow-200">
                    ✏️ Editar
                  </button>
                  <button onClick={() => eliminar(h.id)}
                    className="bg-red-100 text-red-700 px-3 py-1 rounded-lg text-sm hover:bg-red-200">
                    🗑️ Eliminar
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {h.examen_fisico && (
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-blue-600 uppercase mb-1">Examen Físico</p>
                    <p className="text-sm text-gray-700">{h.examen_fisico}</p>
                  </div>
                )}
                {h.diagnostico && (
                  <div className="bg-green-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-green-600 uppercase mb-1">Diagnóstico</p>
                    <p className="text-sm text-gray-700">{h.diagnostico}</p>
                  </div>
                )}
                {h.tratamiento && (
                  <div className="bg-purple-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-purple-600 uppercase mb-1">Tratamiento</p>
                    <p className="text-sm text-gray-700">{h.tratamiento}</p>
                  </div>
                )}
                {h.observaciones && (
                  <div className="bg-orange-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-orange-600 uppercase mb-1">Observaciones</p>
                    <p className="text-sm text-gray-700">{h.observaciones}</p>
                  </div>
                )}
              </div>
              {(h.peso_consulta || h.temperatura) && (
                <div className="flex gap-4 mt-3">
                  {h.peso_consulta && (
                    <span className="text-sm text-gray-600">⚖️ Peso: <b>{h.peso_consulta} kg</b></span>
                  )}
                  {h.temperatura && (
                    <span className="text-sm text-gray-600">🌡️ Temperatura: <b>{h.temperatura}°C</b></span>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold text-gray-800">
                {editando ? '✏️ Editar Historia' : '📋 Nueva Historia Clínica'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Paciente *</label>
                <select value={form.paciente_id} onChange={e => setForm({ ...form, paciente_id: e.target.value })}
                  required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500">
                  <option value="">Seleccionar</option>
                  {pacientes.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre} ({p.especie})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Motivo de Consulta *</label>
                <input value={form.motivo_consulta} onChange={e => setForm({ ...form, motivo_consulta: e.target.value })}
                  required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Peso (kg)</label>
                  <input type="number" step="0.01" value={form.peso_consulta}
                    onChange={e => setForm({ ...form, peso_consulta: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Temperatura (°C)</label>
                  <input type="number" step="0.1" value={form.temperatura}
                    onChange={e => setForm({ ...form, temperatura: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
              </div>
              {[['examen_fisico', 'Examen Físico'], ['diagnostico', 'Diagnóstico'],
                ['tratamiento', 'Tratamiento'], ['observaciones', 'Observaciones']].map(([field, label]) => (
                <div key={field}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <textarea value={form[field]} onChange={e => setForm({ ...form, [field]: e.target.value })}
                    rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalAbierto(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                  Cancelar
                </button>
                <button type="submit"
                  className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium">
                  {editando ? 'Actualizar' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
