// ===== DASHBOARD =====
const updateDashboard = () => {
  document.getElementById('dash-ventas').textContent = formatMoney(getTotalVentasHoy());
  document.getElementById('dash-deudas').textContent = getDeudasActivas().length;
  document.getElementById('dash-stock').textContent = getStockBajo();
  document.getElementById('dash-clientes').textContent = getClientes().length;

  // Ventas recientes
  const recientes = getVentas().slice(0, 5);
  const container = document.getElementById('dash-recent-ventas');
  if (recientes.length === 0) {
    container.innerHTML = '<p class="empty">Sin ventas aún</p>';
  } else {
    container.innerHTML = recientes.map(v => `
      <div class="activity-item">
        <div class="activity-info">
          <strong>${v.productos ? v.productos.length + ' productos' : 'Venta'}</strong>
          <span>${formatDateTime(v.fecha)}</span>
        </div>
        <div class="activity-monto">${formatMoney(v.total)}</div>
      </div>
    `).join('');
  }
};

// ===== VENTA RÁPIDA =====
let cart = [];

const renderVentaRapida = () => {
  renderVRProductos(getProductos());
};

const renderVRProductos = (productos) => {
  const container = document.getElementById('vr-productos');
  if (productos.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="icon">📦</div><p>Sin productos registrados</p></div>';
    return;
  }

  container.innerHTML = productos.map(p => {
    const inCart = cart.find(c => c.id === p.id);
    const qty = inCart ? inCart.qty : 0;
    return `
      <div class="vr-product-card" onclick="addToCart('${p.id}')">
        ${p.foto ? 
          `<div class="prod-img"><img src="${p.foto}" alt="${p.nombre}"></div>` :
          `<div class="prod-placeholder">${getInitials(p.nombre)}</div>`
        }
        <div class="prod-info">
          <div class="prod-nombre">${p.nombre}</div>
          <div class="prod-precio">${formatMoney(p.precio)}</div>
          <div class="prod-stock">Stock: ${p.stock}</div>
        </div>
        <button class="add-btn" onclick="event.stopPropagation();addToCart('${p.id}')">+</button>
        ${qty > 0 ? `<span style="position:absolute;top:8px;left:8px;background:var(--turquesa);color:white;padding:2px 8px;border-radius:12px;font-size:12px;font-weight:700;">${qty}</span>` : ''}
      </div>
    `;
  }).join('');
};

const buscarProductoVR = (query) => {
  const productos = getProductos().filter(p => 
    p.nombre.toLowerCase().includes(query.toLowerCase()) ||
    p.marca.toLowerCase().includes(query.toLowerCase())
  );
  renderVRProductos(productos);
};

const filtrarVRCat = (cat) => {
  document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');

  let productos = getProductos();
  if (cat !== 'todos') {
    productos = productos.filter(p => p.categoria === cat);
  }
  renderVRProductos(productos);
};

const addToCart = (productoId) => {
  const producto = getProductoById(productoId);
  if (!producto) return;
  if (producto.stock <= 0) {
    showToast('❌ Sin stock disponible', 'error');
    return;
  }

  const existing = cart.find(c => c.id === productoId);
  if (existing) {
    if (existing.qty >= producto.stock) {
      showToast('❌ No hay más stock', 'error');
      return;
    }
    existing.qty++;
  } else {
    cart.push({
      id: productoId,
      nombre: producto.nombre,
      precio: producto.precio,
      foto: producto.foto,
      qty: 1,
      stock: producto.stock
    });
  }

  updateCartUI();
  renderVentaRapida(); // Actualizar badges
  showToast('✅ Agregado al carrito');
};

const removeFromCart = (productoId) => {
  cart = cart.filter(c => c.id !== productoId);
  updateCartUI();
  renderVentaRapida();
};

const updateCartQty = (productoId, delta) => {
  const item = cart.find(c => c.id === productoId);
  if (!item) return;

  item.qty += delta;
  if (item.qty <= 0) {
    removeFromCart(productoId);
    return;
  }
  if (item.qty > item.stock) {
    item.qty = item.stock;
    showToast('❌ Stock máximo alcanzado', 'error');
  }
  updateCartUI();
};

const updateCartUI = () => {
  const count = cart.reduce((sum, c) => sum + c.qty, 0);
  document.getElementById('cart-count').textContent = count;
  document.getElementById('cart-fab').style.display = count > 0 ? 'flex' : 'none';

  const total = cart.reduce((sum, c) => sum + (c.precio * c.qty), 0);
  document.getElementById('cart-total').textContent = formatMoney(total);

  const itemsContainer = document.getElementById('cart-items');
  if (cart.length === 0) {
    itemsContainer.innerHTML = '<p class="empty">Carrito vacío</p>';
  } else {
    itemsContainer.innerHTML = cart.map(c => `
      <div class="cart-item">
        <div class="cart-item-img">
          ${c.foto ? `<img src="${c.foto}" alt="${c.nombre}">` : getInitials(c.nombre)}
        </div>
        <div class="cart-item-info">
          <p>${c.nombre}</p>
          <span>${formatMoney(c.precio)} c/u</span>
        </div>
        <div class="cart-item-qty">
          <button class="qty-btn" onclick="updateCartQty('${c.id}', -1)">−</button>
          <span>${c.qty}</span>
          <button class="qty-btn" onclick="updateCartQty('${c.id}', 1)">+</button>
        </div>
        <button class="cart-item-remove" onclick="removeFromCart('${c.id}')">🗑️</button>
      </div>
    `).join('');
  }
};

const toggleCart = () => {
  document.getElementById('cart-panel').classList.toggle('open');
};

const pagarCart = (metodo) => {
  if (cart.length === 0) {
    showToast('❌ Carrito vacío', 'error');
    return;
  }

  const total = cart.reduce((sum, c) => sum + (c.precio * c.qty), 0);

  if (metodo === 'credito') {
    // Guardar total para fiado y abrir modal
    window.fiadoTotal = total;
    window.fiadoCart = [...cart];
    document.getElementById('fiado-total').value = formatMoney(total);
    calcularCuota();
    toggleCart();
    showModal('modal-fiado');
    return;
  }

  // Procesar venta normal
  procesarVenta(metodo, total, null, cart);
};

const procesarVenta = (metodo, total, clienteId, items, cuotasData = null) => {
  // Descontar stock
  items.forEach(item => {
    updateProductoStock(item.id, item.qty, 'venta');
  });

  // Registrar venta
  const venta = {
    id: generateId(),
    productos: items.map(i => ({ id: i.id, nombre: i.nombre, precio: i.precio, qty: i.qty })),
    total,
    metodo,
    clienteId,
    cuotas: cuotasData,
    fecha: now()
  };

  const ventas = getVentas();
  ventas.unshift(venta);
  saveVentas(ventas);

  // Generar ticket
  mostrarTicket(venta);

  // Limpiar carrito
  cart = [];
  updateCartUI();
  toggleCart();

  showToast(`✅ Venta ${metodo === 'credito' ? 'a crédito' : 'registrada'}: ${formatMoney(total)}`);
  updateDashboard();
  updateNotificaciones();
};

// ===== FIADO / CRÉDITO =====
const calcularCuota = () => {
  const total = window.fiadoTotal || 0;
  const cuotas = parseInt(document.getElementById('fiado-cuotas').value) || 1;
  const valor = calcularCuota(total, cuotas);
  document.getElementById('fiado-valor-cuota').value = formatMoney(valor);
};

const confirmarFiado = () => {
  const clienteId = document.getElementById('fiado-cliente').value;
  const numCuotas = parseInt(document.getElementById('fiado-cuotas').value) || 1;
  const primeraPagada = document.getElementById('fiado-primera').value === 'si';

  if (!clienteId) {
    showToast('❌ Selecciona un cliente', 'error');
    return;
  }

  const total = window.fiadoTotal || 0;
  const valorCuota = calcularCuota(total, numCuotas);
  const cliente = getClienteById(clienteId);

  // Generar cuotas
  const cuotas = [];
  const hoy = new Date();
  for (let i = 0; i < numCuotas; i++) {
    const fechaVenc = new Date(hoy);
    fechaVenc.setMonth(fechaVenc.getMonth() + i);
    fechaVenc.setDate(fechaVenc.getDate() + 30); // 30 días entre cuotas

    cuotas.push({
      numero: i + 1,
      monto: valorCuota,
      fechaVencimiento: fechaVenc.toISOString(),
      estado: (i === 0 && primeraPagada) ? 'pagada' : 'pendiente',
      fechaPago: (i === 0 && primeraPagada) ? now() : null,
      metodoPago: (i === 0 && primeraPagada) ? 'efectivo' : null
    });
  }

  // Crear deuda
  const deuda = {
    id: generateId(),
    clienteId,
    clienteNombre: cliente ? cliente.nombre : 'Desconocido',
    total,
    saldoPendiente: primeraPagada ? total - valorCuota : total,
    cuotas,
    numCuotasTotal: numCuotas,
    cuotasPagadas: primeraPagada ? 1 : 0,
    estado: 'activa',
    fecha: now()
  };

  const deudas = getDeudas();
  deudas.unshift(deuda);
  saveDeudas(deudas);

  // Procesar venta
  procesarVenta('credito', total, clienteId, window.fiadoCart || cart, cuotas);

  closeModal('modal-fiado');
  showToast('📝 Crédito registrado correctamente');
};

// ===== TICKET =====
const mostrarTicket = (venta) => {
  const config = getConfig();
  const itemsHtml = venta.productos.map(p => `
    <div class="ticket-item">
      <span>${p.qty}x ${p.nombre}</span>
      <span>${formatMoney(p.precio * p.qty)}</span>
    </div>
  `).join('');

  const ticketHtml = `
    <div class="ticket-header">
      <h2>${config.nombre || 'Dulces Aromas'}</h2>
      <p>${formatDateTime(venta.fecha)}</p>
      <p>Venta #${venta.id.slice(-6).toUpperCase()}</p>
    </div>
    <div class="ticket-items">
      ${itemsHtml}
    </div>
    <div class="ticket-totals">
      <div class="ticket-total-row">
        <span>Subtotal</span>
        <span>${formatMoney(venta.total)}</span>
      </div>
      ${venta.metodo === 'tarjeta' ? `
        <div class="ticket-total-row">
          <span>Recargo tarjeta</span>
          <span>${formatMoney(venta.total * 0.05)}</span>
        </div>
      ` : ''}
      <div class="ticket-total-row final">
        <span>TOTAL</span>
        <span>${formatMoney(venta.total)}</span>
      </div>
      <div class="ticket-total-row">
        <span>Método</span>
        <span>${venta.metodo.toUpperCase()}</span>
      </div>
    </div>
    <div class="ticket-footer">
      <p>¡Gracias por su compra!</p>
      <p>Dulces Aromas - Perfumería</p>
    </div>
  `;

  document.getElementById('ticket-body').innerHTML = ticketHtml;
  showModal('modal-ticket');
};

const imprimirTicket = () => {
  const ticket = document.getElementById('ticket-body').innerHTML;
  const w = window.open('', '_blank');
  w.document.write(`
    <html>
      <head><title>Ticket - Dulces Aromas</title></head>
      <body style="font-family:monospace;padding:20px;max-width:300px;margin:0 auto;">
        ${ticket}
      </body>
    </html>
  `);
  w.document.close();
  w.print();
};

// ===== PRODUCTOS =====
let editingProductId = null;

const renderProductos = () => {
  filtrarProductos();
};

const filtrarProductos = () => {
  const query = document.getElementById('prod-buscar').value.toLowerCase();
  let productos = getProductos();

  if (query) {
    productos = productos.filter(p => 
      p.nombre.toLowerCase().includes(query) ||
      p.marca.toLowerCase().includes(query) ||
      p.categoria.toLowerCase().includes(query)
    );
  }

  // Ordenar alfabéticamente
  productos.sort((a, b) => a.nombre.localeCompare(b.nombre));

  const container = document.getElementById('productos-lista');
  if (productos.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="icon">📦</div><p>Sin productos</p></div>';
    return;
  }

  container.innerHTML = productos.map(p => `
    <div class="product-card" onclick="editarProducto('${p.id}')">
      <div class="card-img">
        ${p.foto ? `<img src="${p.foto}" alt="${p.nombre}">` : getInitials(p.nombre)}
      </div>
      <div class="card-body">
        <div class="card-title">${p.nombre}</div>
        <div class="card-brand">${p.marca || 'Sin marca'}</div>
        <div class="card-footer">
          <span class="card-price">${formatMoney(p.precio)}</span>
          <span class="card-stock ${p.stock <= 3 ? 'low' : ''}">${p.stock} uds</span>
        </div>
      </div>
    </div>
  `).join('');
};

const guardarProducto = async () => {
  const nombre = document.getElementById('np-nombre').value.trim();
  const marca = document.getElementById('np-marca').value.trim();
  const precio = parseInt(document.getElementById('np-precio').value) || 0;
  const stock = parseInt(document.getElementById('np-stock').value) || 0;
  const categoria = document.getElementById('np-categoria').value;
  const fotoPreview = document.getElementById('np-foto-preview');
  const foto = fotoPreview.dataset.image || null;

  if (!nombre || !precio || !stock) {
    showToast('❌ Completa los campos obligatorios', 'error');
    return;
  }

  const producto = {
    id: generateId(),
    nombre,
    marca,
    precio,
    stock,
    categoria,
    foto,
    fecha: now()
  };

  const productos = getProductos();
  productos.push(producto);
  productos.sort((a, b) => a.nombre.localeCompare(b.nombre));
  saveProductos(productos);

  // Limpiar form
  document.getElementById('np-nombre').value = '';
  document.getElementById('np-marca').value = '';
  document.getElementById('np-precio').value = '';
  document.getElementById('np-stock').value = '';
  document.getElementById('np-foto').value = '';
  fotoPreview.innerHTML = '';
  delete fotoPreview.dataset.image;

  closeModal('modal-nuevo-producto');
  showToast('✅ Producto guardado');
  filtrarProductos();
  updateDashboard();
};

const editarProducto = (id) => {
  const p = getProductoById(id);
  if (!p) return;
  editingProductId = id;

  document.getElementById('edit-prod-body').innerHTML = `
    <div class="form-group">
      <label>Nombre</label>
      <input type="text" id="ep-nombre" value="${p.nombre}">
    </div>
    <div class="form-group">
      <label>Marca</label>
      <input type="text" id="ep-marca" value="${p.marca || ''}">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Precio</label>
        <input type="number" id="ep-precio" value="${p.precio}">
      </div>
      <div class="form-group">
        <label>Stock</label>
        <input type="number" id="ep-stock" value="${p.stock}">
      </div>
    </div>
    <div class="form-group">
      <label>Categoría</label>
      <select id="ep-categoria">
        <option value="perfume" ${p.categoria === 'perfume' ? 'selected' : ''}>Perfume</option>
        <option value="set" ${p.categoria === 'set' ? 'selected' : ''}>Set/Combo</option>
        <option value="accesorio" ${p.categoria === 'accesorio' ? 'selected' : ''}>Accesorio</option>
        <option value="otro" ${p.categoria === 'otro' ? 'selected' : ''}>Otro</option>
      </select>
    </div>
    <div class="form-group">
      <label>Foto</label>
      <input type="file" id="ep-foto" accept="image/*" onchange="previewEditFoto(this)">
      <div class="foto-preview" id="ep-foto-preview">
        ${p.foto ? `<img src="${p.foto}" alt="${p.nombre}">` : '<span class="placeholder">Sin foto</span>'}
      </div>
    </div>
  `;

  showModal('modal-editar-producto');
};

const previewEditFoto = async (input) => {
  const preview = document.getElementById('ep-foto-preview');
  if (input.files && input.files[0]) {
    const compressed = await compressImage(input.files[0]);
    preview.innerHTML = `<img src="${compressed}" alt="Preview">`;
    preview.dataset.image = compressed;
  }
};

const actualizarProducto = () => {
  const productos = getProductos();
  const idx = productos.findIndex(p => p.id === editingProductId);
  if (idx === -1) return;

  const preview = document.getElementById('ep-foto-preview');

  productos[idx] = {
    ...productos[idx],
    nombre: document.getElementById('ep-nombre').value.trim(),
    marca: document.getElementById('ep-marca').value.trim(),
    precio: parseInt(document.getElementById('ep-precio').value) || 0,
    stock: parseInt(document.getElementById('ep-stock').value) || 0,
    categoria: document.getElementById('ep-categoria').value,
    foto: preview.dataset.image || productos[idx].foto
  };

  productos.sort((a, b) => a.nombre.localeCompare(b.nombre));
  saveProductos(productos);

  closeModal('modal-editar-producto');
  showToast('✅ Producto actualizado');
  filtrarProductos();
  updateDashboard();
};

const eliminarProducto = () => {
  if (!confirm('¿Eliminar este producto permanentemente?')) return;

  let productos = getProductos();
  productos = productos.filter(p => p.id !== editingProductId);
  saveProductos(productos);

  closeModal('modal-editar-producto');
  showToast('🗑️ Producto eliminado');
  filtrarProductos();
  updateDashboard();
};

// ===== INVENTARIO / BODEGA =====
const renderInventario = () => {
  filtrarInventario();
};

const filtrarInventario = () => {
  const query = document.getElementById('inv-buscar').value.toLowerCase();
  let productos = getProductos();

  if (query) {
    productos = productos.filter(p => p.nombre.toLowerCase().includes(query));
  }

  productos.sort((a, b) => a.nombre.localeCompare(b.nombre));

  const container = document.getElementById('inv-lista');
  container.innerHTML = productos.map(p => `
    <div class="inv-row">
      <div class="inv-row-info">
        <strong>${p.nombre}</strong>
        <span>${p.marca || 'Sin marca'}</span>
      </div>
      <div class="inv-row-qty ${p.stock <= 3 ? 'low' : ''}">${p.stock} uds</div>
    </div>
  `).join('');
};

const renderMovimientos = () => {
  const movimientos = getMovimientos().slice(0, 50);
  const container = document.getElementById('mov-lista');

  if (movimientos.length === 0) {
    container.innerHTML = '<p class="empty">Sin movimientos registrados</p>';
    return;
  }

  container.innerHTML = movimientos.map(m => `
    <div class="mov-item ${m.tipo}">
      <div class="mov-item-header">
        <strong>${m.tipo === 'merma' ? '⚠️ Merma' : '↩️ Reintegro'}: ${m.productoNombre}</strong>
        <span>${formatDateTime(m.fecha)}</span>
      </div>
      <p>${m.cantidad} unidades - ${m.motivo || 'Sin motivo'}</p>
    </div>
  `).join('');
};

const guardarMerma = () => {
  const productoId = document.getElementById('merma-producto').value;
  const tipo = document.getElementById('merma-tipo').value;
  const cantidad = parseInt(document.getElementById('merma-cantidad').value) || 0;
  const motivo = document.getElementById('merma-motivo').value.trim();

  if (!productoId || !cantidad) {
    showToast('❌ Completa los campos', 'error');
    return;
  }

  const producto = getProductoById(productoId);
  if (tipo === 'merma' && producto.stock < cantidad) {
    showToast('❌ Stock insuficiente', 'error');
    return;
  }

  updateProductoStock(productoId, cantidad, tipo);
  addMovimiento(tipo, productoId, cantidad, motivo);

  // Limpiar
  document.getElementById('merma-cantidad').value = '';
  document.getElementById('merma-motivo').value = '';

  closeModal('modal-merma');
  showToast(`${tipo === 'merma' ? '⚠️ Merma' : '↩️ Reintegro'} registrado`);
  filtrarInventario();
  updateDashboard();
  updateNotificaciones();
};

// ===== VENTAS =====
const renderVentas = () => {
  filtrarVentas();
};

const filtrarVentas = () => {
  const desde = document.getElementById('venta-fecha-desde').value;
  const hasta = document.getElementById('venta-fecha-hasta').value;

  let ventas = getVentas();

  if (desde) {
    const d = new Date(desde);
    ventas = ventas.filter(v => new Date(v.fecha) >= d);
  }
  if (hasta) {
    const d = new Date(hasta);
    d.setDate(d.getDate() + 1);
    ventas = ventas.filter(v => new Date(v.fecha) <= d);
  }

  const total = ventas.reduce((sum, v) => sum + v.total, 0);
  document.getElementById('ventas-total-periodo').textContent = formatMoney(total);
  document.getElementById('ventas-cantidad').textContent = ventas.length;

  const container = document.getElementById('ventas-lista');
  if (ventas.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="icon">📋</div><p>Sin ventas en este período</p></div>';
    return;
  }

  container.innerHTML = ventas.map(v => `
    <div class="venta-item">
      <div class="venta-item-info">
        <strong>${v.productos ? v.productos.length + ' productos' : 'Venta'}</strong>
        <span>${formatDateTime(v.fecha)} · ${v.metodo.toUpperCase()}</span>
      </div>
      <div class="venta-item-monto">${formatMoney(v.total)}</div>
    </div>
  `).join('');
};

// ===== CLIENTES =====
const renderClientes = () => {
  filtrarClientes();
};

const filtrarClientes = () => {
  const query = document.getElementById('cli-buscar').value.toLowerCase();
  let clientes = getClientes();

  if (query) {
    clientes = clientes.filter(c => c.nombre.toLowerCase().includes(query));
  }

  clientes.sort((a, b) => a.nombre.localeCompare(b.nombre));

  const container = document.getElementById('clientes-lista');
  if (clientes.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="icon">👥</div><p>Sin clientes registrados</p></div>';
    return;
  }

  container.innerHTML = clientes.map(c => {
    const deudaCliente = getDeudasActivas().find(d => d.clienteId === c.id);
    return `
      <div class="cliente-card">
        <div class="cliente-avatar">${getInitials(c.nombre)}</div>
        <div class="cliente-info">
          <strong>${c.nombre}</strong>
          <span>${c.telefono || 'Sin teléfono'}</span>
        </div>
        <div class="cliente-deuda ${!deudaCliente ? 'none' : ''}">
          ${deudaCliente ? formatMoney(deudaCliente.saldoPendiente) : 'Sin deuda'}
        </div>
      </div>
    `;
  }).join('');
};

const guardarCliente = () => {
  const nombre = document.getElementById('nc-nombre').value.trim();
  const telefono = document.getElementById('nc-telefono').value.trim();
  const email = document.getElementById('nc-email').value.trim();
  const direccion = document.getElementById('nc-direccion').value.trim();

  if (!nombre) {
    showToast('❌ El nombre es obligatorio', 'error');
    return;
  }

  const cliente = {
    id: generateId(),
    nombre,
    telefono,
    email,
    direccion,
    fecha: now()
  };

  const clientes = getClientes();
  clientes.push(cliente);
  clientes.sort((a, b) => a.nombre.localeCompare(b.nombre));
  saveClientes(clientes);

  // Limpiar
  document.getElementById('nc-nombre').value = '';
  document.getElementById('nc-telefono').value = '';
  document.getElementById('nc-email').value = '';
  document.getElementById('nc-direccion').value = '';

  closeModal('modal-nuevo-cliente');
  showToast('✅ Cliente guardado');
  filtrarClientes();
  updateDashboard();
};

// ===== DEUDAS =====
let payingDeudaId = null;

const renderDeudas = () => {
  renderDeudasActivas();
};

const renderDeudasActivas = () => {
  const deudas = getDeudasActivas();

  const total = deudas.reduce((sum, d) => sum + d.saldoPendiente, 0);
  document.getElementById('deudas-total').textContent = formatMoney(total);
  document.getElementById('deudas-clientes').textContent = deudas.length;

  const container = document.getElementById('deudas-lista');
  if (deudas.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="icon">📋</div><p>Sin deudas activas</p></div>';
    return;
  }

  container.innerHTML = deudas.map(d => {
    const proximaCuota = d.cuotas.find(c => c.estado === 'pendiente');
    const status = proximaCuota ? getCuotaStatus(proximaCuota.fechaVencimiento) : { color: 'verde', label: 'Completada' };
    const progress = ((d.cuotasPagadas || 0) / d.numCuotasTotal) * 100;

    return `
      <div class="deuda-card" onclick="prepararPagoCuota('${d.id}')">
        <div class="deuda-card-header">
          <strong>${d.clienteNombre}</strong>
          <span class="deuda-status ${status.color}">${status.label}</span>
        </div>
        <div class="deuda-card-body">
          <div>
            <span>Total</span>
            <strong>${formatMoney(d.total)}</strong>
          </div>
          <div>
            <span>Pendiente</span>
            <strong>${formatMoney(d.saldoPendiente)}</strong>
          </div>
          <div>
            <span>Cuotas</span>
            <strong>${d.cuotasPagadas || 0}/${d.numCuotasTotal}</strong>
          </div>
          <div>
            <span>Próxima</span>
            <strong>${proximaCuota ? formatDate(proximaCuota.fechaVencimiento) : '—'}</strong>
          </div>
        </div>
        <div class="deuda-progress">
          <div class="deuda-progress-bar" style="width: ${progress}%"></div>
        </div>
      </div>
    `;
  }).join('');
};

const renderDeudasHistorial = () => {
  const query = document.getElementById('deuda-hist-buscar').value.toLowerCase();
  let deudas = getDeudas().filter(d => d.estado !== 'activa');

  if (query) {
    deudas = deudas.filter(d => d.clienteNombre.toLowerCase().includes(query));
  }

  const container = document.getElementById('deudas-historial-lista');
  if (deudas.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="icon">📋</div><p>Sin historial</p></div>';
    return;
  }

  container.innerHTML = deudas.map(d => `
    <div class="deuda-card">
      <div class="deuda-card-header">
        <strong>${d.clienteNombre}</strong>
        <span class="deuda-status verde">Pagada</span>
      </div>
      <div class="deuda-card-body">
        <div>
          <span>Total</span>
          <strong>${formatMoney(d.total)}</strong>
        </div>
        <div>
          <span>Cuotas</span>
          <strong>${d.numCuotasTotal}/${d.numCuotasTotal}</strong>
        </div>
        <div>
          <span>Fecha inicio</span>
          <strong>${formatDate(d.fecha)}</strong>
        </div>
        <div>
          <span>Estado</span>
          <strong>Completada</strong>
        </div>
      </div>
    </div>
  `).join('');
};

const prepararPagoCuota = (deudaId) => {
  const deuda = getDeudaById(deudaId);
  if (!deuda) return;

  const proximaCuota = deuda.cuotas.find(c => c.estado === 'pendiente');
  if (!proximaCuota) {
    showToast('✅ Todas las cuotas pagadas');
    return;
  }

  payingDeudaId = deudaId;

  document.getElementById('pago-cuota-body').innerHTML = `
    <div class="form-group">
      <label>Cliente</label>
      <input type="text" value="${deuda.clienteNombre}" readonly class="readonly">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Cuota N°</label>
        <input type="text" value="${proximaCuota.numero} de ${deuda.numCuotasTotal}" readonly class="readonly">
      </div>
      <div class="form-group">
        <label>Monto</label>
        <input type="text" value="${formatMoney(proximaCuota.monto)}" readonly class="readonly">
      </div>
    </div>
    <div class="form-group">
      <label>Vencimiento</label>
      <input type="text" value="${formatDate(proximaCuota.fechaVencimiento)}" readonly class="readonly">
    </div>
    <div class="form-group">
      <label>Método de Pago</label>
      <select id="pago-metodo">
        <option value="efectivo">💵 Efectivo</option>
        <option value="transferencia">📱 Transferencia</option>
        <option value="tarjeta">💳 Tarjeta</option>
      </select>
    </div>
    <div class="form-group">
      <label>Monto recibido</label>
      <input type="number" id="pago-monto" value="${proximaCuota.monto}" placeholder="Ingresa el monto">
    </div>
    <div class="form-group">
      <label>Vuelto</label>
      <input type="text" id="pago-vuelto" value="$0" readonly class="readonly">
    </div>
  `;

  // Calcular vuelto automático
  setTimeout(() => {
    const montoInput = document.getElementById('pago-monto');
    const vueltoInput = document.getElementById('pago-vuelto');
    montoInput.addEventListener('input', () => {
      const recibido = parseInt(montoInput.value) || 0;
      const vuelto = calcularVuelto(proximaCuota.monto, recibido);
      vueltoInput.value = vuelto >= 0 ? formatMoney(vuelto) : 'Falta: ' + formatMoney(Math.abs(vuelto));
      vueltoInput.style.color = vuelto >= 0 ? 'var(--verde)' : 'var(--rojo)';
    });
  }, 100);

  showModal('modal-pago-cuota');
};

const confirmarPagoCuota = () => {
  const deudas = getDeudas();
  const idx = deudas.findIndex(d => d.id === payingDeudaId);
  if (idx === -1) return;

  const deuda = deudas[idx];
  const cuotaIdx = deuda.cuotas.findIndex(c => c.estado === 'pendiente');
  if (cuotaIdx === -1) return;

  const metodo = document.getElementById('pago-metodo').value;
  const montoRecibido = parseInt(document.getElementById('pago-monto').value) || 0;

  if (montoRecibido < deuda.cuotas[cuotaIdx].monto) {
    showToast('❌ Monto insuficiente', 'error');
    return;
  }

  // Marcar cuota como pagada
  deuda.cuotas[cuotaIdx].estado = 'pagada';
  deuda.cuotas[cuotaIdx].fechaPago = now();
  deuda.cuotas[cuotaIdx].metodoPago = metodo;
  deuda.cuotasPagadas = (deuda.cuotasPagadas || 0) + 1;
  deuda.saldoPendiente -= deuda.cuotas[cuotaIdx].monto;

  // Verificar si está pagada completamente
  if (deuda.saldoPendiente <= 0 || deuda.cuotasPagadas >= deuda.numCuotasTotal) {
    deuda.estado = 'pagada';
    deuda.saldoPendiente = 0;
    deuda.fechaPagoCompleta = now();
  }

  saveDeudas(deudas);

  // Registrar venta de cuota
  const ventaCuota = {
    id: generateId(),
    productos: [{ nombre: `Cuota ${deuda.cuotas[cuotaIdx].numero} - ${deuda.clienteNombre}`, precio: deuda.cuotas[cuotaIdx].monto, qty: 1 }],
    total: deuda.cuotas[cuotaIdx].monto,
    metodo,
    clienteId: deuda.clienteId,
    esCuota: true,
    deudaId: deuda.id,
    fecha: now()
  };

  const ventas = getVentas();
  ventas.unshift(ventaCuota);
  saveVentas(ventas);

  closeModal('modal-pago-cuota');
  showToast('✅ Cuota pagada correctamente');
  renderDeudasActivas();
  updateDashboard();
  updateNotificaciones();
};

// ===== CATÁLOGO WEB =====
const renderCatalogo = () => {
  const productos = getProductos().filter(p => p.stock > 0).sort((a, b) => a.nombre.localeCompare(b.nombre));
  const container = document.getElementById('catalogo-lista');

  if (productos.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="icon">📦</div><p>Sin productos en catálogo</p></div>';
    return;
  }

  container.innerHTML = productos.map(p => `
    <div class="catalogo-item">
      <div class="cat-img">
        ${p.foto ? `<img src="${p.foto}" alt="${p.nombre}">` : getInitials(p.nombre)}
      </div>
      <div class="cat-info">
        <div class="cat-nombre">${p.nombre}</div>
        <div class="cat-precio">${formatMoney(p.precio)}</div>
      </div>
    </div>
  `).join('');
};

const previewCatalogo = () => {
  const productos = getProductos().filter(p => p.stock > 0).sort((a, b) => a.nombre.localeCompare(b.nombre));
  const config = getConfig();

  const html = `
    <div style="text-align:center;padding:20px;border-bottom:2px solid var(--gris-borde);margin-bottom:20px;">
      <h2 style="color:var(--turquesa);margin-bottom:8px;">${config.nombre || 'Dulces Aromas'}</h2>
      <p style="color:var(--gris);">Catálogo de Productos</p>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px;">
      ${productos.map(p => `
        <div style="background:white;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);border:1px solid var(--gris-borde);">
          <div style="height:200px;background:linear-gradient(135deg,var(--turquesa-light) 0%,white 100%);display:flex;align-items:center;justify-content:center;font-size:48px;">
            ${p.foto ? `<img src="${p.foto}" style="width:100%;height:100%;object-fit:cover;" alt="${p.nombre}">` : getInitials(p.nombre)}
          </div>
          <div style="padding:16px;text-align:center;">
            <div style="font-weight:600;margin-bottom:4px;">${p.nombre}</div>
            <div style="font-size:18px;font-weight:700;color:var(--turquesa-dark);">${formatMoney(p.precio)}</div>
            <div style="font-size:12px;color:var(--gris);margin-top:4px;">${p.marca || ''}</div>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  document.getElementById('catalogo-preview-content').innerHTML = html;
  showModal('modal-catalogo-preview');
};
