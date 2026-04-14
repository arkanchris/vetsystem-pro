import { useState, useEffect } from 'react';
import api from '../services/api';
import toast, { Toaster } from 'react-hot-toast';

export default function Propietarios() {
  const [propietarios, setPropietarios] = useState([]);
  const [cargando,     setCargando]     = useState(true);
  const [guardando,    setGuardando]    = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [busqueda,     setBusqueda]     = useState('');
  const [editando,     setEditando]     = useState(null);
  const [form, setForm] = useState({
    nombre: '', apellido: '', telefono: '',
    email: '', direccion: '', documento: '',
    tipo_documento: 'CC', ciudad: ''
  });

  useEffect(() => { cargarDatos(); }, []);

  const cargarDatos = async () => {
    try {
      const res = await api.get('/propietarios');
      setPropietarios(res.data);
    } catch (err) {
      toast.error('Error al cargar propietarios');
    } finally {
      setCargando(false);
    }
  };

  const abrirModal = (p = null) => {
    if (p) {
      setEditando(p);
      setForm({
        nombre:         p.nombre         || '',
        apellido:       p.apellido       || '',
        telefono:       p.telefono       || '',
        email:          p.email          || '',
        direccion:      p.direccion      || '',
        documento:      p.documento      || '',
        tipo_documento: p.tipo_documento || 'CC',
        ciudad:         p.ciudad         || '',
      });
    } else {
      setEditando(null);
      setForm({
        nombre: '', apellido: '', telefono: '',
        email: '', direccion: '', documento: '',
        tipo_documento: 'CC', ciudad: ''
      });
    }
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    if (guardando) return; // no cerrar mientras guarda
    setModalAbierto(false);
    setEditando(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (guardando) return; // evitar doble envío

    if (!form.nombre.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }

    setGuardando(true);
    try {
      if (editando) {
        await api.put(`/propietarios/${editando.id}`, form);
        toast.success('✅ Propietario actualizado');
      } else {
        await api.post('/propietarios', form);
        toast.success('✅ Propietario registrado');
      }
      setModalAbierto(false);
      setEditando(null);
      await cargarDatos();
    } catch (err) {
      // Mostrar el mensaje de error real del servidor
      const msg = err.response?.data?.error || 'Error al guardar. Intenta de nuevo.';
      toast.error(msg);
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (id) => {
    if (!confirm('¿Seguro que deseas eliminar este propietario?')) return;
    try {
      await api.delete(`/propietarios/${id}`);
      toast.success('✅ Propietario eliminado');
      cargarDatos();
    } catch (err) {
      const msg = err.response?.data?.error || 'Error al eliminar';
      toast.error(msg);
    }
  };

  const filtrados = propietarios.filter(p =>
    `${p.nombre} ${p.apellido}`.toLowerCase().includes(busqueda.toLowerCase()) ||
    (p.documento || '').includes(busqueda) ||
    (p.email || '').toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="p-6">
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">👨‍👩‍👧 Propietarios</h1>
          <p className="text-gray-500">Gestión de dueños de mascotas</p>
        </div>
        <button onClick={() => abrirModal()}
          className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl font-medium transition">
          + Nuevo Propietario
        </button>
      </div>

      {/* Buscador */}
      <div className="bg-white rounded-xl shadow p-4 mb-6">
        <input type="text"
          placeholder="🔍 Buscar por nombre, documento o email..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        {cargando ? (
          <div className="p-8 text-center text-gray-500">⏳ Cargando...</div>
        ) : filtrados.length === 0 ? (
          <div className="p-8 text-center">
            <span className="text-6xl">👨‍👩‍👧</span>
            <p className="mt-3 text-gray-500">
              {busqueda ? 'No se encontraron resultados' : 'No hay propietarios registrados'}
            </p>
            {!busqueda && (
              <button onClick={() => abrirModal()}
                className="mt-4 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
                Registrar primer propietario
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Nombre', 'Documento', 'Teléfono', 'Email', 'Dirección', 'Mascotas', 'Acciones'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtrados.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {p.nombre} {p.apellido}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{p.documento || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{p.telefono || '-'}</td>
                    <td className="px-4 py-3 text-gray-600 text-sm">{p.email || '-'}</td>
                    <td className="px-4 py-3 text-gray-600 text-sm">{p.direccion || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">
                        {p.total_mascotas || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => abrirModal(p)}
                          className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-lg text-sm hover:bg-yellow-200">
                          ✏️ Editar
                        </button>
                        <button onClick={() => eliminar(p.id)}
                          className="bg-red-100 text-red-700 px-3 py-1 rounded-lg text-sm hover:bg-red-200">
                          🗑️ Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">

            {/* Header modal */}
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">
                {editando ? '✏️ Editar Propietario' : '👨‍👩‍👧 Nuevo Propietario'}
              </h2>
              <button onClick={cerrarModal}
                disabled={guardando}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none disabled:opacity-50">
                ×
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">

                {/* Nombre */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                  <input
                    value={form.nombre}
                    onChange={e => setForm({ ...form, nombre: e.target.value })}
                    required
                    disabled={guardando}
                    placeholder="Nombre"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100" />
                </div>

                {/* Apellido */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Apellido *</label>
                  <input
                    value={form.apellido}
                    onChange={e => setForm({ ...form, apellido: e.target.value })}
                    required
                    disabled={guardando}
                    placeholder="Apellido"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100" />
                </div>

                {/* Tipo Documento */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo documento</label>
                  <select
                    value={form.tipo_documento}
                    onChange={e => setForm({ ...form, tipo_documento: e.target.value })}
                    disabled={guardando}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100">
                    <option value="CC">CC - Cédula</option>
                    <option value="CE">CE - Cédula Extranjería</option>
                    <option value="NIT">NIT</option>
                    <option value="PP">Pasaporte</option>
                    <option value="TI">TI - Tarjeta Identidad</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>

                {/* Documento */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Número de documento</label>
                  <input
                    value={form.documento}
                    onChange={e => setForm({ ...form, documento: e.target.value })}
                    disabled={guardando}
                    placeholder="Ej: 1234567890"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100" />
                </div>

                {/* Teléfono */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                  <input
                    value={form.telefono}
                    onChange={e => setForm({ ...form, telefono: e.target.value })}
                    disabled={guardando}
                    placeholder="Ej: 3001234567"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100" />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    disabled={guardando}
                    placeholder="correo@ejemplo.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100" />
                </div>

                {/* Ciudad */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad</label>
                  <input
                    value={form.ciudad}
                    onChange={e => setForm({ ...form, ciudad: e.target.value })}
                    disabled={guardando}
                    placeholder="Ciudad de residencia"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100" />
                </div>

                {/* Dirección */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                  <input
                    value={form.direccion}
                    onChange={e => setForm({ ...form, direccion: e.target.value })}
                    disabled={guardando}
                    placeholder="Dirección completa"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100" />
                </div>

              </div>

              {/* Botones */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={cerrarModal}
                  disabled={guardando}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {guardando ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      {editando ? 'Actualizando...' : 'Registrando...'}
                    </>
                  ) : (
                    editando ? '✅ Actualizar' : '✅ Registrar'
                  )}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
    </div>
  );
}