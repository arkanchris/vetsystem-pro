import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast, { Toaster } from 'react-hot-toast';

const ESTADOS = {
  pendiente:    { label: 'Pendiente',     color: 'bg-yellow-100 text-yellow-700',  icono: '⏳' },
  confirmada:   { label: 'Confirmada',    color: 'bg-blue-100 text-blue-700',      icono: '✅' },
  en_consulta:  { label: 'En Consulta',   color: 'bg-purple-100 text-purple-700',  icono: '🩺' },
  completada:   { label: 'Completada',    color: 'bg-green-100 text-green-700',    icono: '🏁' },
  cancelada:    { label: 'Cancelada',     color: 'bg-red-100 text-red-700',        icono: '❌' },
};

const ESTADOS_PAGO = {
  pendiente_pago: { label: 'Pendiente',    color: 'bg-gray-100 text-gray-600',     icono: '💳' },
  pagado:         { label: 'Pagado',       color: 'bg-green-100 text-green-700',   icono: '✅' },
  sin_cobro:      { label: 'Sin cobro',    color: 'bg-blue-100 text-blue-600',     icono: '🆓' },
};

const METODOS_PAGO = [
  { value: 'efectivo',      label: '💵 Efectivo' },
  { value: 'transferencia', label: '🏦 Transferencia' },
  { value: 'tarjeta',       label: '💳 Tarjeta' },
];

export default function Citas() {
  const navigate = useNavigate();
  const [citas, setCitas] = useState([]);
  const [pacientes, setPacientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [vistaHoy, setVistaHoy] = useState(false);
  const [disponibilidad, setDisponibilidad] = useState(null);
  const [checkingDisp, setCheckingDisp] = useState(false);

  const [form, setForm] = useState({
    paciente_id: '', fecha_cita: '', motivo: '',
    estado: 'pendiente', notas: '',
    costo: '', estado_pago: 'pendiente_pago', metodo_pago: ''
  });

  const cargarDatos = useCallback(async () => {
    try {
      const [cit, pac] = await Promise.all([
        api.get('/citas'),
        api.get('/pacientes')
      ]);
      setCitas(cit.data);
      setPacientes(pac.data);
    } catch (err) {
      toast.error('Error al cargar citas');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  // Verificar disponibilidad cuando cambia la fecha
  useEffect(() => {
    if (!form.fecha_cita) { setDisponibilidad(null); return; }
    const timer = setTimeout(async () => {
      setCheckingDisp(true);
      try {
        const params = { fecha_cita: form.fecha_cita };
        if (editando) params.excluir_id = editando.id;
        const res = await api.get('/citas/disponibilidad', { params });
        setDisponibilidad(res.data);
      } catch (err) {
        setDisponibilidad(null);
      } finally {
        setCheckingDisp(false);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [form.fecha_cita, editando]);

  const abrirModal = (c = null) => {
    setDisponibilidad(null);
    if (c) {
      setEditando(c);
      setForm({
        paciente_id: c.paciente_id || '',
        fecha_cita: c.fecha_cita?.slice(0, 16) || '',
        motivo: c.motivo || '',
        estado: c.estado || 'pendiente',
        notas: c.notas || '',
        costo: c.costo || '',
        estado_pago: c.estado_pago || 'pendiente_pago',
        metodo_pago: c.metodo_pago || ''
      });
    } else {
      setEditando(null);
      setForm({
        paciente_id: '', fecha_cita: '', motivo: '',
        estado: 'pendiente', notas: '',
        costo: '', estado_pago: 'pendiente_pago', metodo_pago: ''
      });
    }
    setModalAbierto(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (disponibilidad && !disponibilidad.disponible) {
      return toast.error('Ese horario está ocupado. Elige otro horario.');
    }
    try {
      if (editando) {
        await api.put(`/citas/${editando.id}`, form);
        toast.success('✅ Cita actualizada');
      } else {
        await api.post('/citas', form);
        toast.success('✅ Cita agendada');
      }
      setModalAbierto(false);
      cargarDatos();
    } catch (err) {
      toast.error('Error al guardar');
    }
  };

  const marcarAsistido = async (cita) => {
    if (!confirm(`¿Confirmar llegada de ${cita.paciente_nombre}? Se abrirá su historia clínica.`)) return;
    try {
      const res = await api.put(`/citas/${cita.id}/asistido`);
      toast.success('✅ Paciente en consulta — Abriendo historia clínica...');
      cargarDatos();
      // Navegar a historias después de 1 segundo
      setTimeout(() => navigate('/historias'), 1000);
    } catch (err) {
      toast.error('Error al registrar asistencia');
    }
  };

  const cambiarEstado = async (cita, nuevoEstado) => {
    try {
      await api.put(`/citas/${cita.id}`, { ...cita, estado: nuevoEstado });
      toast.success(`Estado actualizado a ${ESTADOS[nuevoEstado]?.label}`);
      cargarDatos();
    } catch (err) {
      toast.error('Error');
    }
  };

  const eliminar = async (id) => {
    if (!confirm('¿Eliminar esta cita?')) return;
    try {
      await api.delete(`/citas/${id}`);
      toast.success('✅ Eliminada');
      cargarDatos();
    } catch (err) {
      toast.error('Error al eliminar');
    }
  };

  const citasFiltradas = citas.filter(c => {
    const hoy = new Date().toDateString();
    const fechaCita = new Date(c.fecha_cita).toDateString();
    if (vistaHoy && fechaCita !== hoy) return false;
    if (filtroEstado && c.estado !== filtroEstado) return false;
    return true;
  });

  const conteo = Object.keys(ESTADOS).reduce((acc, k) => {
    acc[k] = citas.filter(c => c.estado === k).length;
    return acc;
  }, {});

  const citasHoy = citas.filter(c => new Date(c.fecha_cita).toDateString() === new Date().toDateString());

  return (
    <div className="p-6">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">📅 Citas</h1>
          <p className="text-gray-500">Agenda y gestión de consultas</p>
        </div>
        <button onClick={() => abrirModal()}
          className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl font-medium transition">
          + Nueva Cita
        </button>
      </div>

      {/* Resumen del día */}
      {citasHoy.length > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-6">
          <p className="text-sm font-semibold text-purple-700 mb-2">
            📋 Hoy tienes {citasHoy.length} cita{citasHoy.length !== 1 ? 's' : ''}
          </p>
          <div className="flex gap-2 flex-wrap">
            {citasHoy.slice(0, 4).map(c => (
              <div key={c.id} className="bg-white rounded-lg px-3 py-1.5 text-sm border border-purple-100 flex items-center gap-2">
                <span>{ESTADOS[c.estado]?.icono}</span>
                <span className="font-medium">{c.paciente_nombre}</span>
                <span className="text-gray-400">{new Date(c.fecha_cita).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            ))}
            {citasHoy.length > 4 && <span className="text-purple-500 text-sm self-center">+{citasHoy.length - 4} más</span>}
          </div>
        </div>
      )}

      {/* Tarjetas de conteo */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {Object.entries(ESTADOS).map(([k, v]) => (
          <button key={k} onClick={() => setFiltroEstado(filtroEstado === k ? '' : k)}
            className={`p-3 rounded-xl border-2 text-center transition ${
              filtroEstado === k ? 'border-purple-400 bg-purple-50' : 'bg-white border-gray-100 hover:border-purple-200'
            }`}>
            <div className="text-xl mb-0.5">{v.icono}</div>
            <div className="text-xl font-bold text-gray-800">{conteo[k] || 0}</div>
            <div className="text-xs text-gray-500">{v.label}</div>
          </button>
        ))}
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow p-3 mb-4 flex gap-2 flex-wrap items-center">
        <button onClick={() => { setFiltroEstado(''); setVistaHoy(false); }}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
            !filtroEstado && !vistaHoy ? 'bg-purple-600 text-white border-purple-600' : 'text-gray-600 border-gray-200 hover:bg-gray-50'
          }`}>Todas ({citas.length})</button>
        <button onClick={() => { setVistaHoy(!vistaHoy); setFiltroEstado(''); }}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
            vistaHoy ? 'bg-purple-600 text-white border-purple-600' : 'text-gray-600 border-gray-200 hover:bg-gray-50'
          }`}>📆 Hoy ({citasHoy.length})</button>
        {Object.entries(ESTADOS).map(([k, v]) => (
          <button key={k} onClick={() => { setFiltroEstado(filtroEstado === k ? '' : k); setVistaHoy(false); }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
              filtroEstado === k ? 'bg-purple-600 text-white border-purple-600' : 'text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}>
            {v.icono} {v.label} ({conteo[k] || 0})
          </button>
        ))}
      </div>

      {/* Lista de citas */}
      <div className="space-y-3">
        {cargando ? (
          <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">⏳ Cargando...</div>
        ) : citasFiltradas.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-10 text-center">
            <span className="text-6xl">📅</span>
            <p className="mt-3 text-gray-500">No hay citas</p>
            <button onClick={() => abrirModal()}
              className="mt-4 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700">
              Agendar primera cita
            </button>
          </div>
        ) : (
          citasFiltradas.map(c => {
            const estado = ESTADOS[c.estado] || ESTADOS.pendiente;
            const estadoPago = ESTADOS_PAGO[c.estado_pago] || ESTADOS_PAGO.pendiente_pago;
            const fechaCita = new Date(c.fecha_cita);
            const esHoy = fechaCita.toDateString() === new Date().toDateString();
            const esPasada = fechaCita < new Date() && c.estado === 'pendiente';

            return (
              <div key={c.id} className={`bg-white rounded-xl shadow p-5 border-l-4 ${
                c.estado === 'en_consulta' ? 'border-purple-500' :
                c.estado === 'confirmada' ? 'border-blue-400' :
                c.estado === 'completada' ? 'border-green-400' :
                c.estado === 'cancelada' ? 'border-red-300' :
                esPasada ? 'border-orange-300' : 'border-gray-200'
              }`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    {/* Foto paciente */}
                    {c.paciente_foto ? (
                      <img src={`http://localhost:5000${c.paciente_foto}`} alt=""
                        className="w-12 h-12 rounded-full object-cover border-2 border-purple-200 mt-0.5" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-2xl border-2 border-purple-200 mt-0.5">🐾</div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-gray-800">{c.paciente_nombre}</h3>
                        <span className="text-xs text-gray-400">{c.paciente_especie}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${estado.color}`}>
                          {estado.icono} {estado.label}
                        </span>
                        {esPasada && (
                          <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">⚠️ Vencida</span>
                        )}
                      </div>
                      <p className="text-sm text-purple-700 font-medium mt-0.5">🩺 {c.motivo}</p>
                      <div className="flex gap-4 mt-1 flex-wrap">
                        <span className="text-xs text-gray-500">
                          📅 {fechaCita.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })}
                          {' · '}
                          🕐 {fechaCita.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                          {esHoy && <span className="ml-2 bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded text-xs font-medium">HOY</span>}
                        </span>
                        {c.propietario_nombre && (
                          <span className="text-xs text-gray-400">
                            👤 {c.propietario_nombre} {c.propietario_apellido}
                            {c.propietario_telefono && ` · 📞 ${c.propietario_telefono}`}
                          </span>
                        )}
                      </div>
                      {/* Pago */}
                      <div className="flex items-center gap-3 mt-2">
                        {c.costo > 0 && (
                          <span className="text-sm font-semibold text-gray-700">
                            💰 ${parseFloat(c.costo).toLocaleString('es-CO')}
                          </span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${estadoPago.color}`}>
                          {estadoPago.icono} {estadoPago.label}
                        </span>
                        {c.metodo_pago && (
                          <span className="text-xs text-gray-400">
                            {METODOS_PAGO.find(m => m.value === c.metodo_pago)?.label}
                          </span>
                        )}
                      </div>
                      {c.notas && <p className="text-xs text-gray-400 mt-1 italic">{c.notas}</p>}
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex flex-col gap-2 min-w-[120px]">
                    {/* Botón principal según estado */}
                    {c.estado === 'pendiente' && (
                      <button onClick={() => cambiarEstado(c, 'confirmada')}
                        className="bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-600 text-center">
                        ✅ Confirmar
                      </button>
                    )}
                    {c.estado === 'confirmada' && (
                      <button onClick={() => marcarAsistido(c)}
                        className="bg-purple-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-purple-700 text-center">
                        🩺 Paciente llegó
                      </button>
                    )}
                    {c.estado === 'en_consulta' && (
                      <button onClick={() => cambiarEstado(c, 'completada')}
                        className="bg-green-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-green-600 text-center">
                        🏁 Completar
                      </button>
                    )}
                    <button onClick={() => abrirModal(c)}
                      className="bg-yellow-100 text-yellow-700 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-yellow-200 text-center">
                      ✏️ Editar
                    </button>
                    {c.estado !== 'completada' && c.estado !== 'en_consulta' && (
                      <button onClick={() => cambiarEstado(c, 'cancelada')}
                        className="bg-gray-100 text-gray-500 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-red-50 hover:text-red-500 text-center">
                        ❌ Cancelar
                      </button>
                    )}
                    <button onClick={() => eliminar(c.id)}
                      className="bg-red-50 text-red-400 px-3 py-1.5 rounded-lg text-xs hover:bg-red-100 text-center">
                      🗑️ Eliminar
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL NUEVA / EDITAR CITA */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
            <div className="p-6 border-b bg-gradient-to-r from-purple-600 to-purple-700 rounded-t-2xl">
              <h2 className="text-xl font-bold text-white">
                {editando ? '✏️ Editar Cita' : '📅 Nueva Cita'}
              </h2>
              <p className="text-purple-200 text-sm mt-0.5">
                {editando ? 'Modifica los datos de la cita' : 'Agenda una nueva consulta'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">

              {/* Paciente */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Paciente *</label>
                <select value={form.paciente_id} onChange={e => setForm({...form, paciente_id: e.target.value})}
                  required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                  <option value="">Seleccionar paciente</option>
                  {pacientes.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} ({p.especie}){p.propietario_nombre ? ` — ${p.propietario_nombre}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Fecha y hora */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha y Hora *</label>
                <input type="datetime-local" value={form.fecha_cita}
                  onChange={e => setForm({...form, fecha_cita: e.target.value})}
                  required className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                    disponibilidad === null ? 'border-gray-300' :
                    disponibilidad.disponible ? 'border-green-400 bg-green-50' : 'border-red-400 bg-red-50'
                  }`} />
                {/* Indicador de disponibilidad */}
                {checkingDisp && (
                  <p className="text-xs text-gray-400 mt-1">⏳ Verificando disponibilidad...</p>
                )}
                {!checkingDisp && disponibilidad !== null && (
                  disponibilidad.disponible ? (
                    <p className="text-xs text-green-600 mt-1 font-medium">✅ Horario disponible</p>
                  ) : (
                    <div className="mt-1 p-2 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-xs text-red-600 font-medium">❌ Horario ocupado — hay cita a las:</p>
                      {disponibilidad.conflictos.map(conf => (
                        <p key={conf.id} className="text-xs text-red-500">
                          · {new Date(conf.fecha_cita).toLocaleTimeString('es-CO', {hour:'2-digit', minute:'2-digit'})} — {conf.motivo}
                        </p>
                      ))}
                    </div>
                  )
                )}
              </div>

              {/* Motivo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Motivo de consulta *</label>
                <input value={form.motivo} onChange={e => setForm({...form, motivo: e.target.value})}
                  placeholder="Ej: Vacunación anual, revisión general..."
                  required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>

              {/* Estado */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                <div className="grid grid-cols-3 gap-2">
                  {['pendiente', 'confirmada', 'cancelada'].map(est => (
                    <button key={est} type="button"
                      onClick={() => setForm({...form, estado: est})}
                      className={`flex items-center justify-center gap-1 py-2 rounded-lg border-2 text-xs font-medium transition ${
                        form.estado === est ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}>
                      {ESTADOS[est]?.icono} {ESTADOS[est]?.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sección de pago */}
              <div className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50">
                <p className="text-sm font-semibold text-gray-700">💳 Información de Pago</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Valor de la consulta</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                      <input type="number" step="0.01" min="0" value={form.costo}
                        onChange={e => setForm({...form, costo: e.target.value})}
                        placeholder="0"
                        className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Estado del pago</label>
                    <select value={form.estado_pago} onChange={e => setForm({...form, estado_pago: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm">
                      <option value="pendiente_pago">💳 Pendiente</option>
                      <option value="pagado">✅ Ya pagado</option>
                      <option value="sin_cobro">🆓 Sin cobro</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Método de pago</label>
                  <div className="flex gap-2">
                    {METODOS_PAGO.map(m => (
                      <button key={m.value} type="button"
                        onClick={() => setForm({...form, metodo_pago: form.metodo_pago === m.value ? '' : m.value})}
                        className={`flex-1 py-1.5 rounded-lg border text-xs font-medium transition ${
                          form.metodo_pago === m.value ? 'border-purple-400 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                        }`}>
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Notas */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas adicionales</label>
                <textarea value={form.notas} onChange={e => setForm({...form, notas: e.target.value})}
                  rows={2} placeholder="Indicaciones especiales, recordatorios..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm" />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalAbierto(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium">
                  Cancelar
                </button>
                <button type="submit"
                  disabled={disponibilidad !== null && !disponibilidad.disponible}
                  className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                  {editando ? 'Actualizar' : 'Agendar Cita'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}