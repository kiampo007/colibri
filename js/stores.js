// ===== STORE MANAGER =====
const Store = {
  get: (key) => {
    try {
      const data = localStorage.getItem('colibri_' + key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  },

  set: (key, value) => {
    localStorage.setItem('colibri_' + key, JSON.stringify(value));
  },

  init: () => {
    // Inicializar stores si no existen (usando prefijo colibri_)
    if (!Store.get('productos')) Store.set('productos', []);
    if (!Store.get('ventas')) Store.set('ventas', []);
    if (!Store.get('clientes')) Store.set('clientes', []);
    if (!Store.get('deudas')) Store.set('deudas', []);
    if (!Store.get('movimientos')) Store.set('movimientos', []);
    if (!Store.get('config')) {
      Store.set('config', { nombre: 'Dulces Aromas', logo: null });
    }

    // Productos de prueba si está vacío
    const productos = Store.get('productos');
    if (!productos || productos.length === 0) {
      Store.set('productos', [
        {
          id: generateId(),
          nombre: 'Lancôme Trésor',
          marca: 'Lancôme',
          precio: 66500,
          stock: 15,
          categoria: 'perfume',
          foto: null,
          fecha: now()
        },
        {
          id: generateId(),
          nombre: 'Chanel N°5',
          marca: 'Chanel',
          precio: 89000,
          stock: 8,
          categoria: 'perfume',
          foto: null,
          fecha: now()
        },
        {
          id: generateId(),
          nombre: 'Set Dolce & Gabbana',
          marca: 'Dolce & Gabbana',
          precio: 125000,
          stock: 5,
          categoria: 'set',
          foto: null,
          fecha: now()
        }
      ]);
    }
  }
};

// ===== DATA HELPERS =====
const getProductos = () => Store.get('productos') || [];
const getVentas = () => Store.get('ventas') || [];
const getClientes = () => Store.get('clientes') || [];
const getDeudas = () => Store.get('deudas') || [];
const getMovimientos = () => Store.get('movimientos') || [];
const getConfig = () => Store.get('config') || { nombre: 'Dulces Aromas', logo: null };

const saveProductos = (data) => Store.set('productos', data);
const saveVentas = (data) => Store.set('ventas', data);
const saveClientes = (data) => Store.set('clientes', data);
const saveDeudas = (data) => Store.set('deudas', data);
const saveMovimientos = (data) => Store.set('movimientos', data);
const saveConfig = (data) => Store.set('config', data);

const getProductoById = (id) => getProductos().find(p => p.id === id);
const getClienteById = (id) => getClientes().find(c => c.id === id);
const getDeudaById = (id) => getDeudas().find(d => d.id === id);

const updateProductoStock = (productoId, cantidad, tipo = 'venta') => {
  const productos = getProductos();
  const idx = productos.findIndex(p => p.id === productoId);
  if (idx === -1) return false;

  if (tipo === 'venta' || tipo === 'merma') {
    productos[idx].stock = Math.max(0, productos[idx].stock - cantidad);
  } else if (tipo === 'reintegro') {
    productos[idx].stock += cantidad;
  }

  saveProductos(productos);
  return true;
};

const addMovimiento = (tipo, productoId, cantidad, motivo) => {
  const movimientos = getMovimientos();
  const producto = getProductoById(productoId);
  movimientos.unshift({
    id: generateId(),
    tipo,
    productoId,
    productoNombre: producto ? producto.nombre : 'Desconocido',
    cantidad,
    motivo: motivo || 'Sin motivo',
    fecha: now()
  });
  saveMovimientos(movimientos);
};

const getVentasHoy = () => {
  const hoy = new Date().toDateString();
  return getVentas().filter(v => new Date(v.fecha).toDateString() === hoy);
};

const getTotalVentasHoy = () => {
  return getVentasHoy().reduce((sum, v) => sum + v.total, 0);
};

const getStockBajo = () => {
  return getProductos().filter(p => p.stock <= 3).length;
};

const getDeudasActivas = () => {
  return getDeudas().filter(d => d.estado === 'activa');
};

const getTotalDeudas = () => {
  return getDeudasActivas().reduce((sum, d) => sum + d.saldoPendiente, 0);
};
