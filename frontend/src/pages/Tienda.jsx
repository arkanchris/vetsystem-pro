import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import toast, { Toaster } from 'react-hot-toast';

const CATEGORIAS_PROD = [
  { value: 'alimento',   label: '🥩 Alimento / Concentrado' },
  { value: 'accesorio',  label: '🦮 Accesorio' },
  { value: 'juguete',    label: '🎾 Juguete' },
  { value: 'higiene',    label: '🛁 Higiene' },
  { value: 'medicamento_ext', label: '💊 Medicamento (tienda)' },
  { value: 'otro',       label: '📦 Otro' },
];

export default function Tienda() {
  const [tab, setTab] = useState('productos');
  const [productos, setProductos] = useState([]);
  const [medicamentos, setMedicamentos] = useState([]);
  const [pacientes, setPacientes] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [ventasMed, setVentasMed] = useState([]);

  // Productos
  const [modalProducto, setModalProducto] = useState(false);
  const [editandoProducto, setEditandoProducto] = useState(null);
  const [formProducto, setFormProducto] = useState({ nombre: '', descripcion: '', categoria: 'alimento', precio: '', stock: '', stock_minimo: '5' });
  const [imgPreview, setImgPreview] = useState(null);
  const [archivoImg, setArchivoImg] = useState(null);
  const imgRef = useRef(null);

  // Carrito de venta tienda
  const [modalVenta, setModalVenta] = useState(false);
  const [carrito, setCarrito] = useState([]);
  const [ventaForm, setVentaForm] = useState({ paciente_id: '', metodo_pago: 'efectivo', notas: '' });

  // Venta medicamento
  const [modalVentaMed, setModalVentaMed] = useState(false);
  const [formVentaMed, setFormVentaMed] = useState({ medicamento_id: '', cantidad: 1, paciente_id: '', metodo_pago: 'efectivo', notas: '' });

  useEffect(() => { cargarTodo(); }, []);

  const cargarTodo = async () => {
    try {
      const [prod, med, pac, ven, venM] = await Promise.all([
        api.get('/tienda/productos'),
        api.get('/medicamentos'),
        api.get('/pacientes'),
        api.get('/tienda/ventas'),
        api.get('/tienda/ventas-medicamentos'),
      ]);
      setProductos(prod.data);
      setMedicamentos(med.data);
      setPacientes(pac.data);
      setVentas(ven.data);
      setVentasMed(venM.data);
    } catch (err) {
      toast.error('Error al cargar datos');
    }
  };

  // ── PRODUCTOS CRUD ────────────────────────────────────────────────────────
  const abrirModalProducto = (p = null) => {
    setImgPreview(null); setArchivoImg(null);
    if (p) {
      setEditandoProducto(p);
      setFormProducto({ nombre: p.nombre, descripcion: p.descripcion || '', categoria: p.categoria || 'otro', precio: p.precio, stock: p.stock, stock_minimo: p.stock_minimo || 5 });
      if (p.imagen_url) setImgPreview(`http://localhost:5000${p.imagen_url}`);
    } else {
      setEditandoProducto(null);
      setFormProducto({ nombre: '', descripcion: '', categoria: 'alimento', precio: '', stock: '', stock_minimo: '5' });
    }
    setModalProducto(true);
  };

  const handleSubmitProducto = async (e) => {
    e.preventDefault();
    try {
      const fd = new FormData();
      Object.entries(formProducto).forEach(([k, v]) => fd.append(k, v));
      if (archivoImg) fd.append('imagen', archivoImg);
      if (editandoProducto) {
        await api.put(`/tienda/productos/${editandoProducto.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('✅ Producto actualizado');
      } else {
        await api.post('/tienda/productos', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('✅ Producto creado');
      }
      setModalProducto(false);
      cargarTodo();
    } catch (err) {
      toast.error('Error al guardar');
    }
  };

  const eliminarProducto = async (id) => {
    if (!confirm('¿Desactivar este producto?')) return;
    try {
      await api.delete(`/tienda/productos/${id}`);
      toast.success('Producto desactivado');
      cargarTodo();
    } catch (err) { toast.error('Error'); }
  };

  // ── CARRITO / VENTA ───────────────────────────────────────────────────────
  const agregarAlCarrito = (prod) => {
    setCarrito(prev => {
      const existe = prev.find(i => i.producto_id === prod.id);
      if (existe) {
        if (existe.cantidad >= prod.stock) { toast.error('Stock insuficiente'); return prev; }
        return prev.map(i => i.producto_id === prod.id ? {...i, cantidad: i.cantidad + 1} : i);
      }
      if (prod.stock < 1) { toast.error('Sin stock'); return prev; }
      return [...prev, { producto_id: prod.id, nombre: prod.nombre, precio: parseFloat(prod.precio), cantidad: 1, stock: prod.stock }];
    });
  };

  const quitarDelCarrito = (producto_id) => {
    setCarrito(prev => {
      const item = prev.find(i => i.producto_id === producto_id);
      if (item && item.cantidad > 1) return prev.map(i => i.producto_id === producto_id ? {...i, cantidad: i.cantidad - 1} : i);
      return prev.filter(i => i.producto_id !== producto_id);
    });
  };

  const totalCarrito = carrito.reduce((s, i) => s + i.precio * i.cantidad, 0);

  const procesarVenta = async () => {
    if (carrito.length === 0) return toast.error('El carrito está vacío');
    try {
      await api.post('/tienda/ventas', {
        ...ventaForm,
        items: carrito.map(i => ({ producto_id: i.producto_id, cantidad: i.cantidad }))
      });
      toast.success('✅ Venta registrada');
      setCarrito([]);
      setModalVenta(false);
      cargarTodo();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error en la venta');
    }
  };

  // ── VENTA MEDICAMENTO ─────────────────────────────────────────────────────
  const handleVentaMed = async (e) => {
    e.preventDefault();
    try {
      await api.post('/tienda/ventas-medicamentos', formVentaMed);
      toast.success('✅ Venta de medicamento registrada');
      setModalVentaMed(false);
      setFormVentaMed({ medicamento_id: '', cantidad: 1, paciente_id: '', metodo_pago: 'efectivo', notas: '' });
      cargarTodo();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error');
    }
  };

  const medSeleccionado = medicamentos.find(m => m.id === parseInt(formVentaMed.medicamento_id));
  const precioMed = medSeleccionado?.precio_venta || medSeleccionado?.precio || 0;
  const subtotalMed = precioMed * formVentaMed.cantidad;

  const fmt = (n) => parseFloat(n || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });

  return (
    <div className="p-6">
      <Toaster position="top-right" />

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">🛍️ Tienda</h1>
          <p className="text-gray-500">Venta de productos, accesorios y medicamentos</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setModalVentaMed(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-medium text-sm transition">
            💊 Vender Medicamento
          </button>
          {carrito.length > 0 && (
            <button onClick={() => setModalVenta(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl font-medium text-sm transition relative">
              🛒 Carrito ({carrito.length}) — {fmt(totalCarrito)}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-white rounded-xl shadow p-2 w-fit">
        {[['productos','🛍️ Productos'],['ventas','💰 Ventas Tienda'],['ventas_med','💊 Ventas Medicamentos']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`px-4 py-2 rounded-lg font-medium transition text-sm ${tab === id ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ═══ TAB PRODUCTOS ══════════════════════════════════════════════════ */}
      {tab === 'productos' && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={() => abrirModalProducto()}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm font-medium">
              + Nuevo Producto
            </button>
          </div>
          {productos.length === 0 ? (
            <div className="bg-white rounded-xl shadow p-10 text-center">
              <div className="text-5xl mb-3">🛍️</div>
              <p className="text-gray-500">No hay productos registrados</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {productos.map(p => (
                <div key={p.id} className="bg-white rounded-xl shadow overflow-hidden hover:shadow-md transition">
                  <div className="h-36 bg-gray-100 flex items-center justify-center">
                    {p.imagen_url
                      ? <img src={`http://localhost:5000${p.imagen_url}`} alt={p.nombre} className="h-full w-full object-cover" />
                      : <span className="text-5xl">{CATEGORIAS_PROD.find(c => c.value === p.categoria)?.label.split(' ')[0] || '📦'}</span>}
                  </div>
                  <div className="p-3">
                    <h3 className="font-bold text-gray-800 text-sm">{p.nombre}</h3>
                    <p className="text-xs text-gray-400">{CATEGORIAS_PROD.find(c => c.value === p.categoria)?.label}</p>
                    <div className="flex justify-between items-center mt-2">
                      <span className="font-bold text-green-700 text-sm">{fmt(p.precio)}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${p.stock <= p.stock_minimo ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
                        Stock: {p.stock}
                      </span>
                    </div>
                    <div className="flex gap-1 mt-3">
                      <button onClick={() => agregarAlCarrito(p)}
                        className="flex-1 bg-green-500 text-white py-1.5 rounded-lg text-xs hover:bg-green-600 font-medium">
                        🛒 Añadir
                      </button>
                      <button onClick={() => abrirModalProducto(p)}
                        className="bg-yellow-100 text-yellow-700 px-2 py-1.5 rounded-lg text-xs hover:bg-yellow-200">✏️</button>
                      <button onClick={() => eliminarProducto(p.id)}
                        className="bg-red-100 text-red-600 px-2 py-1.5 rounded-lg text-xs hover:bg-red-200">🗑️</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══ TAB VENTAS TIENDA ══════════════════════════════════════════════ */}
      {tab === 'ventas' && (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          {ventas.length === 0 ? (
            <div className="p-10 text-center"><div className="text-5xl mb-3">💰</div><p className="text-gray-500">No hay ventas registradas</p></div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Fecha','Paciente','Items','Total','Pago','Vendedor'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {ventas.map(v => (
                  <tr key={v.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-600">{new Date(v.created_at).toLocaleDateString('es-CO')}</td>
                    <td className="px-4 py-3 text-sm">{v.paciente_nombre || <span className="text-gray-400">General</span>}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {v.items?.map((i, idx) => (
                        <span key={idx}>{i.producto} x{i.cantidad}{idx < v.items.length - 1 ? ', ' : ''}</span>
                      ))}
                    </td>
                    <td className="px-4 py-3 font-bold text-green-700 text-sm">{fmt(v.total)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 capitalize">{v.metodo_pago || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{v.vendedor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ═══ TAB VENTAS MEDICAMENTOS ════════════════════════════════════════ */}
      {tab === 'ventas_med' && (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          {ventasMed.length === 0 ? (
            <div className="p-10 text-center"><div className="text-5xl mb-3">💊</div><p className="text-gray-500">No hay ventas de medicamentos</p></div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Fecha','Medicamento','Paciente','Cant.','Precio Unit.','Total','Pago'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {ventasMed.map(v => (
                  <tr key={v.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-600">{new Date(v.created_at).toLocaleDateString('es-CO')}</td>
                    <td className="px-4 py-3 font-medium text-gray-800 text-sm">💊 {v.medicamento_nombre}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{v.paciente_nombre || '-'}</td>
                    <td className="px-4 py-3 text-sm text-center">{v.cantidad}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{fmt(v.precio_unitario)}</td>
                    <td className="px-4 py-3 font-bold text-green-700 text-sm">{fmt(v.subtotal)}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 capitalize">{v.metodo_pago || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* MODAL PRODUCTO */}
      {modalProducto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b">
              <h2 className="text-lg font-bold text-gray-800">{editandoProducto ? '✏️ Editar Producto' : '🛍️ Nuevo Producto'}</h2>
            </div>
            <form onSubmit={handleSubmitProducto} className="p-5 space-y-4">
              <div className="flex justify-center">
                <div className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden cursor-pointer"
                  onClick={() => imgRef.current?.click()}>
                  {imgPreview ? <img src={imgPreview} alt="" className="w-full h-full object-cover" /> : <span className="text-4xl">📦</span>}
                </div>
                <input ref={imgRef} type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files[0]; if (!f) return; setArchivoImg(f); const r = new FileReader(); r.onload = ev => setImgPreview(ev.target.result); r.readAsDataURL(f); }} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input value={formProducto.nombre} onChange={e => setFormProducto({...formProducto, nombre: e.target.value})}
                  required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                <select value={formProducto.categoria} onChange={e => setFormProducto({...formProducto, categoria: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500">
                  {CATEGORIAS_PROD.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea value={formProducto.descripcion} onChange={e => setFormProducto({...formProducto, descripcion: e.target.value})}
                  rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Precio *</label>
                  <input type="number" step="0.01" min="0" value={formProducto.precio}
                    onChange={e => setFormProducto({...formProducto, precio: e.target.value})}
                    required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Stock</label>
                  <input type="number" min="0" value={formProducto.stock}
                    onChange={e => setFormProducto({...formProducto, stock: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Stock mín.</label>
                  <input type="number" min="0" value={formProducto.stock_minimo}
                    onChange={e => setFormProducto({...formProducto, stock_minimo: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalProducto(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancelar</button>
                <button type="submit"
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">
                  {editandoProducto ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CARRITO */}
      {modalVenta && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-5 border-b">
              <h2 className="text-lg font-bold text-gray-800">🛒 Confirmar Venta</h2>
            </div>
            <div className="p-5 space-y-4">
              {/* Items carrito */}
              <div className="space-y-2">
                {carrito.map(item => (
                  <div key={item.producto_id} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                    <span className="flex-1 text-sm font-medium">{item.nombre}</span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => quitarDelCarrito(item.producto_id)}
                        className="w-6 h-6 rounded-full bg-red-100 text-red-600 text-xs hover:bg-red-200">-</button>
                      <span className="text-sm font-bold w-6 text-center">{item.cantidad}</span>
                      <button onClick={() => agregarAlCarrito({id: item.producto_id, precio: item.precio, stock: item.stock})}
                        className="w-6 h-6 rounded-full bg-green-100 text-green-600 text-xs hover:bg-green-200">+</button>
                    </div>
                    <span className="text-sm font-bold text-green-700 w-20 text-right">{fmt(item.precio * item.cantidad)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t pt-3 flex justify-between">
                <span className="font-bold text-gray-800">Total:</span>
                <span className="font-bold text-green-700 text-lg">{fmt(totalCarrito)}</span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Paciente (opcional)</label>
                <select value={ventaForm.paciente_id} onChange={e => setVentaForm({...ventaForm, paciente_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm">
                  <option value="">Venta general (sin paciente)</option>
                  {pacientes.map(p => <option key={p.id} value={p.id}>{p.nombre} ({p.especie})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Método de pago</label>
                <div className="flex gap-2">
                  {['efectivo','transferencia','tarjeta'].map(m => (
                    <button key={m} type="button" onClick={() => setVentaForm({...ventaForm, metodo_pago: m})}
                      className={`flex-1 py-2 rounded-lg border text-xs font-medium transition ${ventaForm.metodo_pago === m ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500'}`}>
                      {m === 'efectivo' ? '💵' : m === 'transferencia' ? '🏦' : '💳'} {m}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setModalVenta(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancelar</button>
                <button onClick={procesarVenta}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold">
                  ✅ Procesar venta
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL VENTA MEDICAMENTO */}
      {modalVentaMed && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-5 border-b">
              <h2 className="text-lg font-bold text-gray-800">💊 Venta de Medicamento</h2>
              <p className="text-sm text-gray-500 mt-0.5">Descuenta del inventario de medicamentos</p>
            </div>
            <form onSubmit={handleVentaMed} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Medicamento *</label>
                <select value={formVentaMed.medicamento_id} onChange={e => setFormVentaMed({...formVentaMed, medicamento_id: e.target.value})}
                  required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Seleccionar medicamento</option>
                  {medicamentos.filter(m => m.stock > 0).map(m => (
                    <option key={m.id} value={m.id}>{m.nombre} — Stock: {m.stock} — {fmt(m.precio_venta || m.precio)}</option>
                  ))}
                </select>
              </div>
              {medSeleccionado && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm">
                  <p className="font-medium text-blue-800">{medSeleccionado.nombre}</p>
                  <p className="text-blue-600">Precio unitario: {fmt(precioMed)} · Stock disponible: {medSeleccionado.stock}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad *</label>
                  <input type="number" min="1" max={medSeleccionado?.stock || 999} value={formVentaMed.cantidad}
                    onChange={e => setFormVentaMed({...formVentaMed, cantidad: parseInt(e.target.value) || 1})}
                    required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="flex items-end">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 w-full text-center">
                    <p className="text-xs text-gray-500">Total a cobrar</p>
                    <p className="font-bold text-green-700 text-lg">{fmt(subtotalMed)}</p>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Paciente (opcional)</label>
                <select value={formVentaMed.paciente_id} onChange={e => setFormVentaMed({...formVentaMed, paciente_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                  <option value="">Sin paciente vinculado</option>
                  {pacientes.map(p => <option key={p.id} value={p.id}>{p.nombre} ({p.especie})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Método de pago</label>
                <div className="flex gap-2">
                  {['efectivo','transferencia','tarjeta'].map(m => (
                    <button key={m} type="button" onClick={() => setFormVentaMed({...formVentaMed, metodo_pago: m})}
                      className={`flex-1 py-2 rounded-lg border text-xs font-medium transition ${formVentaMed.metodo_pago === m ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500'}`}>
                      {m === 'efectivo' ? '💵' : m === 'transferencia' ? '🏦' : '💳'} {m}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                <input value={formVentaMed.notas} onChange={e => setFormVentaMed({...formVentaMed, notas: e.target.value})}
                  placeholder="Ej: Recetado por Dr. García"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalVentaMed(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancelar</button>
                <button type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                  ✅ Vender
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}