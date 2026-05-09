/* ============================================
   COLIBRÍ BOBA TEA POS v2.0 — APP.JS
   Floating Cart | Glass UI | Enhanced UX
   ============================================ */

const CONFIG = {
  VERSION: '2.0',
  ITEMS_PER_ROW: 2,
  ROW_HEIGHT: 200,
  VISIBLE_BUFFER: 3,
  DEBOUNCE_MS: 150,
  DB_NAME: 'colibri_boba_tea_db',
  DB_VERSION: 1
};

const state = {
  products: [],
  cart: [],
  clients: [],
  sales: [],
  debts: [],
  logo: null,
  currentTab: 'ventas',
  currentCategory: 'all',
  searchQuery: { venta: '', prod: '', cliente: '' },
  reportRange: 'hoy',
  editingProduct: null,
  editingClient: null,
  notifications: [],
  confirmCallback: null,
  virtualStart: 0,
  virtualEnd: 0,
  isFiado: false,
  lastScrollY: 0
};

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
  initDB().then(() => {
    loadAllData().then(() => {
      loadLogo();
      startDateTime();
      hideSplash();
      renderAll();
      checkDueInstallments();
      setupPullRefresh();
      setupParallaxHeader();
      setupExitConfirm();
      setupFabBehavior();
    });
  });
  
  const grid = document.getElementById('productsGrid');
  if (grid) {
    grid.parentElement.addEventListener('scroll', debounce(handleVirtualScroll, 16), { passive: true });
  }
});

// --- DATETIME HEADER ---
function startDateTime() {
  const update = () => {
    const el = document.getElementById('headerDatetime');
    if (el) {
      const now = new Date();
      el.textContent = now.toLocaleDateString('es-CL', { 
        weekday: 'short', 
        day: 'numeric', 
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };
  update();
  setInterval(update, 30000);
}

// --- EXIT CONFIRM ---
function setupExitConfirm() {
  window.addEventListener('beforeunload', (e) => {
    if (state.cart.length > 0 || hasUnsavedChanges()) {
      e.preventDefault();
      e.returnValue = '';
    }
  });
}

function hasUnsavedChanges() {
  return state.products.length > 0 || state.clients.length > 0 || state.sales.length > 0;
}

function showExitModal() {
  document.getElementById('exitModal').classList.remove('hidden');
}

function cancelExit() {
  document.getElementById('exitModal').classList.add('hidden');
}

function exitWithBackup() {
  exportExcel();
  setTimeout(() => {
    window.location.reload();
  }, 500);
}

function exitWithoutBackup() {
  window.location.reload();
}

// --- SPLASH ---
function hideSplash() {
  const splash = document.getElementById('splash');
  const app = document.getElementById('app');
  
  setTimeout(() => {
    splash.classList.add('hidden');
    app.classList.remove('hidden');
    setTimeout(() => splash.remove(), 600);
  }, 1500);
}

// --- PARALLAX HEADER ---
function setupParallaxHeader() {
  const main = document.querySelector('.main-content');
  const header = document.getElementById('appHeader');
  if (!main || !header) return;
  
  main.addEventListener('scroll', debounce(() => {
    const scroll = main.scrollTop;
    header.classList.toggle('compact', scroll > 50);
  }, 50), { passive: true });
}

// --- PULL TO REFRESH ---
function setupPullRefresh() {
  const main = document.querySelector('.main-content');
  const pull = document.getElementById('pullRefresh');
  if (!main || !pull) return;
  
  let startY = 0;
  let pulling = false;
  
  main.addEventListener('touchstart', (e) => {
    if (main.scrollTop === 0) {
      startY = e.touches[0].clientY;
      pulling = true;
    }
  }, { passive: true });
  
  main.addEventListener('touchmove', (e) => {
    if (!pulling) return;
    const diff = e.touches[0].clientY - startY;
    if (diff > 60 && diff < 150) {
      pull.style.transform = `translateY(${diff}px)`;
      pull.classList.add('visible');
    }
  }, { passive: true });
  
  main.addEventListener('touchend', () => {
    if (!pulling) return;
    pulling = false;
    const transform = pull.style.transform;
    if (transform && parseInt(transform.replace(/[^0-9-]/g, '')) > 80) {
      pull.querySelector('span').textContent = 'Actualizando...';
      setTimeout(() => {
        renderAll();
        pull.style.transform = '';
        pull.classList.remove('visible');
        pull.querySelector('span').textContent = 'Suelta para actualizar';
        showToast('Actualizado');
      }, 1000);
    } else {
      pull.style.transform = '';
      pull.classList.remove('visible');
    }
  });
}

// --- FAB BEHAVIOR (Floating Cart) ---
function setupFabBehavior() {
  const main = document.querySelector('.main-content');
  const fab = document.getElementById('fabCart');
  if (!main || !fab) return;
  
  main.addEventListener('scroll', debounce(() => {
    const currentY = main.scrollTop;
    const wrapper = document.getElementById('fabCartWrapper');
    
    if (currentY > state.lastScrollY && currentY > 100) {
      // Scrolling down - subtle hide
      wrapper.style.transform = 'translateY(20px) scale(0.9)';
      wrapper.style.opacity = '0.7';
    } else {
      // Scrolling up - show prominently
      wrapper.style.transform = 'translateY(0) scale(1)';
      wrapper.style.opacity = '1';
    }
    
    state.lastScrollY = currentY;
  }, 80), { passive: true });
}

function animateFab() {
  const fab = document.getElementById('fabCart');
  const count = document.getElementById('fabCount');
  if (!fab || !count) return;
  
  const qty = state.cart.reduce((sum, item) => sum + item.qty, 0);
  
  if (qty > 0) {
    fab.classList.add('fab-float');
    count.classList.remove('hidden');
    
    // Trigger bounce animation
    count.classList.remove('bounce');
    void count.offsetWidth; // Force reflow
    count.classList.add('bounce');
  } else {
    fab.classList.remove('fab-float');
  }
}

// --- INDEXEDDB ---
let db;

function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(CONFIG.DB_NAME, CONFIG.DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => { db = request.result; resolve(); };
    request.onupgradeneeded = (e) => {
      const d = e.target.result;
      d.createObjectStore('products', { keyPath: 'id' });
      d.createObjectStore('clients', { keyPath: 'id' });
      d.createObjectStore('sales', { keyPath: 'id' });
      d.createObjectStore('debts', { keyPath: 'id' });
      d.createObjectStore('settings', { keyPath: 'key' });
    };
  });
}

function dbGet(store, id) {
  return new Promise((resolve) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}

function dbPut(store, data) {
  return new Promise((resolve) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).put(data);
    tx.oncomplete = () => resolve();
  });
}

function dbGetAll(store) {
  return new Promise((resolve) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => resolve([]);
  });
}

function dbDelete(store, id) {
  return new Promise((resolve) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).delete(id);
    tx.oncomplete = () => resolve();
  });
}

// --- DATA LOADING ---
async function loadAllData() {
  state.products = await dbGetAll('products');
  state.clients = await dbGetAll('clients');
  state.sales = await dbGetAll('sales');
  state.debts = await dbGetAll('debts');
  
  const logoSetting = await dbGet('settings', 'logo');
  if (logoSetting) state.logo = logoSetting.value;
  
  if (state.products.length === 0) {
    const legacy = localStorage.getItem('da_products');
    if (legacy) {
      try {
        state.products = JSON.parse(legacy);
        await saveChunked('products', state.products);
      } catch(e) {}
    }
  }
  
  if (state.products.length === 0) addDemoProducts();
}

async function saveChunked(store, items) {
  for (const item of items) await dbPut(store, item);
}

function addDemoProducts() {
  const demos = [
    { id: genId(), nombre: 'Té Negro Clásico', categoria: 'clasicos', costo: 2500, precio: 4500, stock: 20, variante: 'Grande', foto: '' },
    { id: genId(), nombre: 'Té Verde Matcha', categoria: 'clasicos', costo: 3000, precio: 5500, stock: 15, variante: 'Grande', foto: '' },
    { id: genId(), nombre: 'Mango Bubble', categoria: 'frutales', costo: 2800, precio: 5000, stock: 18, variante: 'Grande', foto: '' },
    { id: genId(), nombre: 'Fresa Cream', categoria: 'frutales', costo: 3200, precio: 5800, stock: 12, variante: 'Grande', foto: '' },
    { id: genId(), nombre: 'Brown Sugar Boba', categoria: 'especiales', costo: 3500, precio: 6500, stock: 10, variante: 'Grande', foto: '' },
    { id: genId(), nombre: 'Oreo Milk Tea', categoria: 'especiales', costo: 3800, precio: 6800, stock: 8, variante: 'Grande', foto: '' },
    { id: genId(), nombre: 'Extra Boba', categoria: 'toppings', costo: 500, precio: 1000, stock: 50, variante: 'Porción', foto: '' },
    { id: genId(), nombre: 'Pudding', categoria: 'toppings', costo: 400, precio: 800, stock: 40, variante: 'Porción', foto: '' }
  ];
  state.products = demos;
  saveChunked('products', demos);
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// --- LOGO ---
function loadLogo() {
  if (!state.logo) return;
  
  const splashImg = document.getElementById('splashLogoImg');
  const splashFallback = document.getElementById('splashLogoFallback');
  const headerImg = document.getElementById('headerLogo');
  const headerFallback = document.getElementById('headerLogoFallback');
  
  if (splashImg) {
    splashImg.src = state.logo;
    splashImg.classList.remove('hidden');
    splashFallback.classList.add('hidden');
  }
  if (headerImg) {
    headerImg.src = state.logo;
    headerImg.classList.remove('hidden');
    headerFallback.classList.add('hidden');
  }
}

function openLogoModal() {
  document.getElementById('logoModal').classList.remove('hidden');
}

function handleLogoUpload(input) {
  const file = input.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) { showToast('Máx 2MB'); return; }
  
  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById('logoBase64').value = e.target.result;
    const preview = document.getElementById('logoPreview');
    preview.innerHTML = `<img src="${e.target.result}" alt="Logo">`;
    preview.classList.add('has-image');
  };
  reader.readAsDataURL(file);
}

async function saveLogo() {
  const base64 = document.getElementById('logoBase64').value;
  if (!base64) { showToast('Selecciona un logo'); return; }
  
  state.logo = base64;
  await dbPut('settings', { key: 'logo', value: base64 });
  loadLogo();
  closeModal('logo');
  showToast('Logo guardado');
}

// --- BOTTOM SHEET MENU ---
function toggleMenu() {
  document.getElementById('bottomSheet').classList.remove('hidden');
}

function closeBottomSheet(e) {
  if (e && e.target !== e.currentTarget) return;
  document.getElementById('bottomSheet').classList.add('hidden');
}

// --- TAB SWITCHING ---
function switchTab(tab) {
  state.currentTab = tab;
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  document.querySelectorAll('.tab-panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === `tab-${tab}`);
  });
  
  if (tab === 'ventas') renderProducts();
  if (tab === 'productos') renderInventory();
  if (tab === 'clientes') renderClients();
  if (tab === 'deudas') renderDebts();
  if (tab === 'reportes') renderReports();
  
  document.querySelector('.main-content').scrollTop = 0;
}

// --- VIRTUALIZED PRODUCTS ---
function renderProducts() {
  const grid = document.getElementById('productsGrid');
  const filtered = getFilteredProducts();
  
  if (filtered.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><div class="empty-icon">🔍</div><p>No se encontraron bebidas</p></div>`;
    return;
  }
  
  const containerHeight = grid.parentElement.clientHeight;
  const scrollTop = grid.parentElement.scrollTop;
  const rowHeight = CONFIG.ROW_HEIGHT;
  const itemsPerRow = CONFIG.ITEMS_PER_ROW;
  
  const totalRows = Math.ceil(filtered.length / itemsPerRow);
  const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - CONFIG.VISIBLE_BUFFER);
  const endRow = Math.min(totalRows, Math.ceil((scrollTop + containerHeight) / rowHeight) + CONFIG.VISIBLE_BUFFER);
  
  state.virtualStart = startRow * itemsPerRow;
  state.virtualEnd = Math.min(filtered.length, endRow * itemsPerRow);
  
  const visibleItems = filtered.slice(state.virtualStart, state.virtualEnd);
  
  grid.style.height = `${totalRows * rowHeight}px`;
  grid.style.position = 'relative';
  
  let html = '';
  visibleItems.forEach((prod, idx) => {
    const actualIdx = state.virtualStart + idx;
    const row = Math.floor(actualIdx / itemsPerRow);
    const col = actualIdx % itemsPerRow;
    const top = row * rowHeight;
    const left = (col / itemsPerRow) * 100;
    
    const stockClass = prod.stock === 0 ? 'out' : prod.stock <= 5 ? 'low' : '';
    const stockText = prod.stock === 0 ? 'Agotado' : `${prod.stock} uds`;
    const fotoHtml = prod.foto 
      ? `<img src="${prod.foto}" alt="" loading="lazy" onload="this.classList.add('loaded')">`
      : `<div class="img-placeholder">🧋</div>`;
    
    const margen = prod.costo > 0 ? ((prod.precio - prod.costo) / prod.costo * 100).toFixed(0) : 0;
    const margenColor = margen >= 50 ? 'var(--success)' : margen >= 30 ? 'var(--warning)' : 'var(--danger)';
    
    html += `
      <div class="product-card" style="position:absolute;top:${top}px;left:${left}%;width:${100/itemsPerRow}%;padding:6px;" onclick="addToCart('${prod.id}')" oncontextmenu="event.preventDefault(); quickAdjust('${prod.id}', -1);">
        <div class="product-img">${fotoHtml}</div>
        <div class="product-info">
          <div class="product-name">${escapeHtml(prod.nombre)}</div>
          ${prod.variante ? `<div class="product-variant">${escapeHtml(prod.variante)}</div>` : ''}
          <div class="product-bottom">
            <span class="product-price">$${formatNumber(prod.precio)}</span>
            <span class="product-stock ${stockClass}">${stockText}</span>
          </div>
          <div style="font-size:10px;color:${margenColor};margin-top:4px;font-weight:700;letter-spacing:0.3px;">Margen: ${margen}%</div>
        </div>
      </div>`;
  });
  
  grid.innerHTML = html;
}

function handleVirtualScroll() {
  if (state.currentTab === 'ventas') requestAnimationFrame(renderProducts);
}

function getFilteredProducts() {
  let filtered = state.products;
  if (state.currentCategory !== 'all') filtered = filtered.filter(p => p.categoria === state.currentCategory);
  const q = state.searchQuery.venta.toLowerCase().trim();
  if (q) filtered = filtered.filter(p => p.nombre.toLowerCase().includes(q) || (p.variante && p.variante.toLowerCase().includes(q)));
  return filtered.sort((a, b) => a.nombre.localeCompare(b.nombre));
}

function filterCat(cat) {
  state.currentCategory = cat;
  document.querySelectorAll('.chip').forEach(c => {
    c.classList.toggle('active', 
      (cat === 'all' && c.textContent === 'Todos') ||
      (cat === 'clasicos' && c.textContent === 'Clásicos') ||
      (cat === 'frutales' && c.textContent === 'Frutales') ||
      (cat === 'especiales' && c.textContent === 'Especiales') ||
      (cat === 'toppings' && c.textContent === 'Toppings')
    );
  });
  renderProducts();
}

// --- QUICK ADJUST ---
function quickAdjust(productId, delta) {
  const product = state.products.find(p => p.id === productId);
  if (!product) return;
  
  if (delta < 0) {
    const cartItem = state.cart.find(c => c.id === productId);
    if (cartItem && cartItem.qty > 0) {
      changeQty(productId, -1);
      showToast(`${product.nombre}: -1 del carrito`);
    } else {
      showToast('No hay en el carrito para quitar');
    }
  }
}

// --- DEBOUNCED SEARCH ---
let debounceTimer = {};

function debouncedSearch(value, type) {
  clearTimeout(debounceTimer[type]);
  debounceTimer[type] = setTimeout(() => {
    state.searchQuery[type] = value;
    document.querySelector('.clear-search')?.classList.toggle('hidden', !value);
    if (type === 'venta') renderProducts();
    if (type === 'prod') renderInventory();
    if (type === 'cliente') renderClients();
  }, CONFIG.DEBOUNCE_MS);
}

function clearSearch(type) {
  const input = document.getElementById(type === 'venta' ? 'searchVenta' : type === 'prod' ? 'searchProd' : 'searchCliente');
  if (input) { input.value = ''; state.searchQuery[type] = ''; debouncedSearch('', type); }
}

function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

// --- CART ---
function addToCart(productId) {
  const product = state.products.find(p => p.id === productId);
  if (!product || product.stock <= 0) { showToast('Producto agotado'); return; }
  
  const existing = state.cart.find(item => item.id === productId);
  if (existing) {
    if (existing.qty < product.stock) existing.qty++;
    else { showToast('Stock máximo'); return; }
  } else {
    state.cart.push({ ...product, qty: 1 });
  }
  
  updateCartUI();
  animateFab();
  showToast(`${product.nombre} agregado`);
}

function updateCartUI() {
  const count = state.cart.reduce((sum, item) => sum + item.qty, 0);
  const fab = document.getElementById('fabCart');
  const countEl = document.getElementById('fabCount');
  
  countEl.textContent = count;
  fab.classList.toggle('hidden', count === 0);
  
  if (count > 0) {
    animateFab();
  }
}

function openCart() {
  renderCartItems();
  updateCartTotals();
  populateFiadoClients();
  document.getElementById('cartModal').classList.remove('hidden');
}

function populateFiadoClients() {
  const select = document.getElementById('fiadoCliente');
  select.innerHTML = '<option value="">Seleccionar cliente...</option>' + 
    state.clients.map(c => `<option value="${c.id}">${escapeHtml(c.nombre)}</option>`).join('');
}

function renderCartItems() {
  const container = document.getElementById('cartItems');
  if (state.cart.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">🧋</div><p>Carrito vacío</p></div>';
    return;
  }
  
  container.innerHTML = state.cart.map(item => `
    <div class="cart-item">
      <div class="cart-item-info">
        <div class="cart-item-name">${escapeHtml(item.nombre)}</div>
        <div class="cart-item-price">$${formatNumber(item.precio)} c/u</div>
      </div>
      <div class="cart-item-qty">
        <button class="qty-btn ripple" onclick="changeQty('${item.id}', -1)">−</button>
        <span style="font-weight:700;min-width:20px;text-align:center;">${item.qty}</span>
        <button class="qty-btn ripple" onclick="changeQty('${item.id}', 1)">+</button>
      </div>
    </div>
  `).join('');
}

function changeQty(id, delta) {
  const item = state.cart.find(c => c.id === id);
  if (!item) return;
  
  const product = state.products.find(p => p.id === id);
  const newQty = item.qty + delta;
  
  if (newQty <= 0) state.cart = state.cart.filter(c => c.id !== id);
  else if (product && newQty <= product.stock) item.qty = newQty;
  else { showToast('Stock insuficiente'); return; }
  
  renderCartItems();
  updateCartTotals();
  updateCartUI();
}

function updateCartTotals() {
  const subtotal = state.cart.reduce((sum, item) => sum + (item.precio * item.qty), 0);
  const descuento = parseFloat(document.getElementById('descuentoInput').value) || 0;
  const total = Math.max(0, subtotal - descuento);
  
  document.getElementById('cartSubtotal').textContent = `$${formatNumber(subtotal)}`;
  document.getElementById('cartTotal').textContent = `$${formatNumber(total)}`;
  calcVuelto();
}

function applyDiscount() { updateCartTotals(); }

function calcVuelto() {
  const total = parseFloat(document.getElementById('cartTotal').textContent.replace(/[^0-9]/g, '')) || 0;
  const efectivo = parseFloat(document.getElementById('pagoEfectivo').value) || 0;
  const transf = parseFloat(document.getElementById('pagoTransf').value) || 0;
  const tarjeta = parseFloat(document.getElementById('pagoTarjeta').value) || 0;
  
  const pagado = efectivo + transf + tarjeta;
  const vuelto = Math.max(0, efectivo - Math.max(0, total - transf - tarjeta));
  
  const vueltoBox = document.getElementById('vueltoBox');
  if (pagado >= total && total > 0) {
    vueltoBox.style.display = 'block';
    document.getElementById('vueltoAmount').textContent = `$${formatNumber(vuelto)}`;
  } else {
    vueltoBox.style.display = 'none';
  }
}

// --- FIADO ---
function toggleFiado() {
  state.isFiado = document.getElementById('fiadoCheck').checked;
  document.getElementById('fiadoOptions').classList.toggle('hidden', !state.isFiado);
  if (state.isFiado) calcFiado();
}

function calcFiado() {
  const total = parseFloat(document.getElementById('cartTotal').textContent.replace(/[^0-9]/g, '')) || 0;
  const cuotas = parseInt(document.getElementById('fiadoCuotas').value) || 1;
  const montoCuota = Math.ceil(total / cuotas);
  
  document.getElementById('fiadoPreview').innerHTML = `
    ${cuotas} cuotas de $${formatNumber(montoCuota)}<br>
    <small>Total: $${formatNumber(total)}</small>
  `;
}

// --- CONFIRM SALE ---
async function confirmSale() {
  if (state.cart.length === 0) { showToast('Carrito vacío'); return; }
  
  const total = parseFloat(document.getElementById('cartTotal').textContent.replace(/[^0-9]/g, '')) || 0;
  const efectivo = parseFloat(document.getElementById('pagoEfectivo').value) || 0;
  const transf = parseFloat(document.getElementById('pagoTransf').value) || 0;
  const tarjeta = parseFloat(document.getElementById('pagoTarjeta').value) || 0;
  const descuento = parseFloat(document.getElementById('descuentoInput').value) || 0;
  
  for (const item of state.cart) {
    const product = state.products.find(p => p.id === item.id);
    if (product) {
      product.stock -= item.qty;
      await dbPut('products', product);
    }
  }
  
  const sale = {
    id: genId(),
    fecha: new Date().toISOString(),
    items: [...state.cart],
    subtotal: state.cart.reduce((s, i) => s + i.precio * i.qty, 0),
    descuento,
    total,
    pagos: { efectivo, transf, tarjeta },
    vuelto: Math.max(0, efectivo - Math.max(0, total - transf - tarjeta)),
    esFiado: state.isFiado
  };
  
  if (state.isFiado) {
    const clienteId = document.getElementById('fiadoCliente').value;
    const cuotas = parseInt(document.getElementById('fiadoCuotas').value) || 1;
    
    if (!clienteId) { showToast('Selecciona un cliente para fiado'); return; }
    
    const montoCuota = Math.ceil(total / cuotas);
    const nextDate = new Date();
    nextDate.setMonth(nextDate.getMonth() + 1);
    
    const debt = {
      id: genId(),
      clienteId,
      ventaId: sale.id,
      montoTotal: total,
      montoPendiente: total,
      cuotasTotal: cuotas,
      cuotaActual: 1,
      montoCuota,
      estado: 'pendiente',
      fecha: new Date().toISOString(),
      proximaFecha: nextDate.toISOString(),
      pagos: []
    };
    
    state.debts.push(debt);
    await dbPut('debts', debt);
    sale.debtId = debt.id;
    
    state.isFiado = false;
    document.getElementById('fiadoCheck').checked = false;
    document.getElementById('fiadoOptions').classList.add('hidden');
  }
  
  state.sales.push(sale);
  await dbPut('sales', sale);
  
  showTicket(sale);
  
  state.cart = [];
  updateCartUI();
  closeModal('cart');
  renderProducts();
  showToast('¡Venta registrada!');
}

// --- TICKET & CONFETTI ---
function showTicket(sale) {
  const date = new Date(sale.fecha);
  const itemsHtml = sale.items.map(i => `
    <div class="ticket-line">
      <span>${i.qty}x ${i.nombre}</span>
      <span>$${formatNumber(i.precio * i.qty)}</span>
    </div>
  `).join('');
  
  document.getElementById('ticketPrint').innerHTML = `
    <div class="ticket-header">
      <div style="font-size:17px;font-weight:bold;">🐦 Colibrí Boba Tea</div>
      <div>Bubble Tea & Refreshments</div>
      <div style="margin-top:8px;">${date.toLocaleDateString()} ${date.toLocaleTimeString()}</div>
    </div>
    ${itemsHtml}
    <div style="border-top:1px dashed #ccc;margin:10px 0;padding-top:10px;">
      <div class="ticket-line"><span>Subtotal</span><span>$${formatNumber(sale.subtotal)}</span></div>
      ${sale.descuento > 0 ? `<div class="ticket-line"><span>Descuento</span><span>-$${formatNumber(sale.descuento)}</span></div>` : ''}
      <div class="ticket-line" style="font-weight:bold;font-size:15px;margin-top:4px;"><span>TOTAL</span><span>$${formatNumber(sale.total)}</span></div>
    </div>
    <div style="margin-top:10px;">
      ${sale.pagos.efectivo > 0 ? `<div class="ticket-line"><span>Efectivo</span><span>$${formatNumber(sale.pagos.efectivo)}</span></div>` : ''}
      ${sale.pagos.transf > 0 ? `<div class="ticket-line"><span>Transferencia</span><span>$${formatNumber(sale.pagos.transf)}</span></div>` : ''}
      ${sale.pagos.tarjeta > 0 ? `<div class="ticket-line"><span>Tarjeta</span><span>$${formatNumber(sale.pagos.tarjeta)}</span></div>` : ''}
      ${sale.vuelto > 0 ? `<div class="ticket-line" style="color:#16a34a;font-weight:700;"><span>Vuelto</span><span>$${formatNumber(sale.vuelto)}</span></div>` : ''}
      ${sale.esFiado ? `<div class="ticket-line" style="color:var(--warning);font-weight:700;"><span>🤝 FIADO</span><span>Cuotas pendientes</span></div>` : ''}
    </div>
    <div style="text-align:center;margin-top:18px;font-size:11px;color:#666;">
      ¡Gracias por tu visita!<br>Colibrí Boba Tea 🧋
    </div>
  `;
  
  document.getElementById('ticketModal').classList.remove('hidden');
  launchConfetti();
}

function launchConfetti() {
  const container = document.getElementById('confettiContainer');
  const colors = ['#e11d48', '#f97316', '#fda4af', '#f59e0b', '#dc2626', '#16a34a', '#8b5cf6'];
  
  for (let i = 0; i < 40; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = Math.random() * 100 + '%';
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDelay = Math.random() * 0.6 + 's';
    piece.style.animationDuration = (2.5 + Math.random() * 2) + 's';
    piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
    piece.style.width = (6 + Math.random() * 6) + 'px';
    piece.style.height = piece.style.width;
    container.appendChild(piece);
  }
  
  setTimeout(() => container.innerHTML = '', 4500);
}

function printTicket() { window.print(); }

// --- INVENTORY ---
function renderInventory() {
  const container = document.getElementById('inventoryList');
  const q = state.searchQuery.prod.toLowerCase().trim();
  let filtered = state.products.sort((a, b) => a.nombre.localeCompare(b.nombre));
  if (q) filtered = filtered.filter(p => p.nombre.toLowerCase().includes(q));
  
  if (filtered.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">📦</div><p>Sin productos</p></div>';
    return;
  }
  
  container.innerHTML = filtered.map(p => {
    const stockClass = p.stock === 0 ? 'out' : p.stock <= 5 ? 'low' : '';
    const margen = p.costo > 0 ? ((p.precio - p.costo) / p.costo * 100).toFixed(0) : 0;
    const margenClass = margen >= 50 ? 'buen-margen' : margen >= 30 ? 'margen-ok' : 'margen-bajo';
    
    return `
      <div class="list-item" onclick="editProduct('${p.id}')">
        <div class="list-item-main">
          <div class="list-item-title">${escapeHtml(p.nombre)} ${p.variante ? `<span style="color:var(--text-2);font-weight:400;">(${escapeHtml(p.variante)})</span>` : ''}</div>
          <div class="list-item-sub">
            Costo: $${formatNumber(p.costo)} • Venta: $${formatNumber(p.precio)} • Stock: <span class="${stockClass}" style="font-weight:700;">${p.stock}</span>
          </div>
          <div class="margen-indicator ${margenClass}" style="margin-top:6px;padding:4px 10px;font-size:11px;display:inline-flex;border-radius:8px;">
            Margen: ${margen}% ${margen >= 50 ? '✓' : margen >= 30 ? '•' : '⚠'}
          </div>
        </div>
        <div class="list-item-actions">
          <button class="btn-icon ripple" style="background:var(--bg);color:var(--text);width:34px;height:34px;font-size:18px;" onclick="event.stopPropagation();adjustStock('${p.id}', 1)">+</button>
          <button class="btn-icon ripple" style="background:var(--bg);color:var(--danger);width:34px;height:34px;font-size:18px;" onclick="event.stopPropagation();adjustStock('${p.id}', -1)">−</button>
        </div>
      </div>
    `;
  }).join('');
}

function adjustStock(id, delta) {
  const p = state.products.find(x => x.id === id);
  if (!p) return;
  if (delta < 0 && p.stock <= 0) { showToast('Stock no puede ser negativo'); return; }
  
  p.stock += delta;
  dbPut('products', p);
  renderInventory();
  showToast(delta > 0 ? 'Stock agregado' : 'Merma registrada');
}

// --- MARGEN INDICATOR ---
function calcMargen() {
  const costo = parseFloat(document.getElementById('prodCosto').value) || 0;
  const precio = parseFloat(document.getElementById('prodPrecio').value) || 0;
  const indicator = document.getElementById('margenIndicator');
  const badge = document.getElementById('margenBadge');
  const porc = document.getElementById('margenPorc');
  
  if (costo <= 0 || precio <= 0) {
    indicator.className = 'margen-indicator';
    badge.textContent = 'Ingresa costo y precio';
    porc.textContent = '';
    return;
  }
  
  const margen = ((precio - costo) / costo * 100);
  const margenStr = margen.toFixed(0);
  
  indicator.className = 'margen-indicator';
  badge.innerHTML = `Margen: <span style="font-size:16px;">${margen >= 50 ? '🟢' : margen >= 30 ? '🟡' : '🔴'}</span>`;
  porc.textContent = `${margenStr}%`;
  
  if (margen >= 50) indicator.classList.add('buen-margen');
  else if (margen >= 30) indicator.classList.add('margen-ok');
  else indicator.classList.add('margen-bajo');
}

// --- PRODUCT MODAL ---
function openModal(type) {
  if (type === 'producto') {
    state.editingProduct = null;
    document.getElementById('prodModalTitle').textContent = 'Nuevo Producto';
    document.getElementById('prodId').value = '';
    document.getElementById('prodNombre').value = '';
    document.getElementById('prodCat').value = 'clasicos';
    document.getElementById('prodCosto').value = '';
    document.getElementById('prodPrecio').value = '';
    document.getElementById('prodStock').value = '';
    document.getElementById('prodVariante').value = '';
    clearFotoPreview();
    calcMargen();
    document.getElementById('productoModal').classList.remove('hidden');
  }
  if (type === 'cliente') {
    state.editingClient = null;
    document.getElementById('cliModalTitle').textContent = 'Nuevo Cliente';
    document.getElementById('cliId').value = '';
    document.getElementById('cliNombre').value = '';
    document.getElementById('cliTel').value = '';
    document.getElementById('cliEmail').value = '';
    document.getElementById('cliNotas').value = '';
    document.getElementById('clienteModal').classList.remove('hidden');
  }
}

function closeModal(type) { document.getElementById(`${type}Modal`).classList.add('hidden'); }

function editProduct(id) {
  const p = state.products.find(x => x.id === id);
  if (!p) return;
  
  state.editingProduct = p;
  document.getElementById('prodModalTitle').textContent = 'Editar Producto';
  document.getElementById('prodId').value = p.id;
  document.getElementById('prodNombre').value = p.nombre;
  document.getElementById('prodCat').value = p.categoria;
  document.getElementById('prodCosto').value = p.costo || '';
  document.getElementById('prodPrecio').value = p.precio;
  document.getElementById('prodStock').value = p.stock;
  document.getElementById('prodVariante').value = p.variante || '';
  
  if (p.foto) {
    document.getElementById('prodFotoBase64').value = p.foto;
    const preview = document.getElementById('fotoPreview');
    preview.innerHTML = `<img src="${p.foto}" alt="Preview">`;
    preview.classList.add('has-image');
  } else {
    clearFotoPreview();
  }
  
  calcMargen();
  document.getElementById('productoModal').classList.remove('hidden');
}

async function saveProduct(e) {
  e.preventDefault();
  
  const id = document.getElementById('prodId').value || genId();
  const product = {
    id,
    nombre: document.getElementById('prodNombre').value.trim(),
    categoria: document.getElementById('prodCat').value,
    costo: parseFloat(document.getElementById('prodCosto').value) || 0,
    precio: parseFloat(document.getElementById('prodPrecio').value) || 0,
    stock: parseInt(document.getElementById('prodStock').value) || 0,
    variante: document.getElementById('prodVariante').value.trim(),
    foto: document.getElementById('prodFotoBase64').value || ''
  };
  
  const idx = state.products.findIndex(p => p.id === id);
  if (idx >= 0) state.products[idx] = product;
  else state.products.push(product);
  
  await dbPut('products', product);
  closeModal('producto');
  renderInventory();
  if (state.currentTab === 'ventas') renderProducts();
  showToast('Producto guardado');
}

// --- FOTO UPLOAD ---
function handleFotoUpload(input) {
  const file = input.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) { showToast('Imagen muy grande. Máx 2MB'); input.value = ''; return; }
  
  const reader = new FileReader();
  reader.onload = (e) => {
    const base64 = e.target.result;
    document.getElementById('prodFotoBase64').value = base64;
    const preview = document.getElementById('fotoPreview');
    preview.innerHTML = `<img src="${base64}" alt="Preview">`;
    preview.classList.add('has-image');
    showToast('Foto cargada');
  };
  reader.readAsDataURL(file);
}

function clearFotoPreview() {
  document.getElementById('fotoPreview').innerHTML = '<span class="foto-placeholder">📷 Toca para subir foto</span>';
  document.getElementById('fotoPreview').classList.remove('has-image');
  document.getElementById('prodFotoBase64').value = '';
  document.getElementById('prodFotoFile').value = '';
}

// --- CLIENTS ---
function renderClients() {
  const container = document.getElementById('clientsList');
  const q = state.searchQuery.cliente.toLowerCase().trim();
  let filtered = state.clients.sort((a, b) => a.nombre.localeCompare(b.nombre));
  if (q) filtered = filtered.filter(c => c.nombre.toLowerCase().includes(q));
  
  if (filtered.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">👤</div><p>Sin clientes</p></div>';
    return;
  }
  
  container.innerHTML = filtered.map(c => {
    const debt = state.debts.filter(d => d.clienteId === c.id && d.estado === 'pendiente');
    const debtTotal = debt.reduce((s, d) => s + d.montoPendiente, 0);
    
    return `
      <div class="list-item" onclick="viewClient('${c.id}')">
        <div class="list-item-main">
          <div class="list-item-title">${escapeHtml(c.nombre)}</div>
          <div class="list-item-sub">${c.tel || 'Sin teléfono'} ${debtTotal > 0 ? `• <span style="color:var(--warning);font-weight:700;">Deuda: $${formatNumber(debtTotal)}</span>` : ''}</div>
        </div>
        <span style="font-size:20px;color:var(--text-2);">›</span>
      </div>
    `;
  }).join('');
}

function editClient(id) {
  const c = state.clients.find(x => x.id === id);
  if (!c) return;
  
  state.editingClient = c;
  document.getElementById('cliModalTitle').textContent = 'Editar Cliente';
  document.getElementById('cliId').value = c.id;
  document.getElementById('cliNombre').value = c.nombre;
  document.getElementById('cliTel').value = c.tel || '';
  document.getElementById('cliEmail').value = c.email || '';
  document.getElementById('cliNotas').value = c.notas || '';
  document.getElementById('clienteModal').classList.remove('hidden');
}

async function saveClient(e) {
  e.preventDefault();
  
  const id = document.getElementById('cliId').value || genId();
  const client = {
    id,
    nombre: document.getElementById('cliNombre').value.trim(),
    tel: document.getElementById('cliTel').value.trim(),
    email: document.getElementById('cliEmail').value.trim(),
    notas: document.getElementById('cliNotas').value.trim()
  };
  
  const idx = state.clients.findIndex(c => c.id === id);
  if (idx >= 0) state.clients[idx] = client;
  else state.clients.push(client);
  
  await dbPut('clients', client);
  closeModal('cliente');
  renderClients();
  showToast('Cliente guardado');
}

function viewClient(id) {
  const c = state.clients.find(x => x.id === id);
  if (!c) return;
  
  const clientDebts = state.debts.filter(d => d.clienteId === id).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  const totalDebt = clientDebts.filter(d => d.estado === 'pendiente').reduce((s, d) => s + d.montoPendiente, 0);
  
  let html = `
    <div style="padding:16px;">
      <h3 style="margin-bottom:16px;font-size:20px;font-weight:800;">${escapeHtml(c.nombre)}</h3>
      ${c.tel ? `<p style="color:var(--text-2);margin-bottom:10px;font-weight:500;">📞 ${c.tel}</p>` : ''}
      ${totalDebt > 0 ? `<p style="color:var(--warning);font-weight:800;margin-bottom:16px;font-size:16px;">💳 Deuda total: $${formatNumber(totalDebt)}</p>` : '<p style="color:var(--success);font-weight:700;margin-bottom:16px;">✓ Sin deudas pendientes</p>'}
      <h4 style="margin:18px 0 10px;font-size:14px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:var(--text-2);">Historial de créditos</h4>
  `;
  
  if (clientDebts.length === 0) {
    html += '<p style="color:var(--text-2);font-weight:500;">Sin registros</p>';
  } else {
    html += clientDebts.map(d => `
      <div style="background:var(--bg);padding:14px;border-radius:14px;margin-bottom:10px;border:1.5px solid var(--border);">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font-weight:800;font-size:15px;color:var(--text);">$${formatNumber(d.montoTotal)}</span>
          <span style="font-size:12px;color:var(--text-2);font-weight:500;">${new Date(d.fecha).toLocaleDateString()}</span>
        </div>
        <div style="font-size:13px;color:var(--text-2);margin-top:6px;font-weight:500;">
          ${d.cuotasTotal} cuotas • ${d.estado === 'pendiente' ? `<span style="color:var(--warning);font-weight:700;">$${formatNumber(d.montoPendiente)} pendiente</span>` : '<span style="color:var(--success);font-weight:700;">Pagado</span>'}
        </div>
        ${d.estado === 'pendiente' ? `<button class="btn-primary ripple" style="margin-top:12px;width:100%;" onclick="payInstallment('${d.id}')">Pagar cuota</button>` : ''}
      </div>
    `).join('');
  }
  
  html += '</div>';
  
  document.getElementById('cuotasContent').innerHTML = html;
  document.getElementById('cuotasModal').classList.remove('hidden');
}

// --- DEBTS ---
function renderDebts() {
  const container = document.getElementById('debtsList');
  const summary = document.getElementById('debtSummary');
  
  const pending = state.debts.filter(d => d.estado === 'pendiente');
  const totalPending = pending.reduce((s, d) => s + d.montoPendiente, 0);
  const overdue = pending.filter(d => d.proximaFecha && new Date(d.proximaFecha) < new Date());
  
  summary.innerHTML = `
    <div class="debt-card total">
      <div class="stat-value">$${formatNumber(totalPending)}</div>
      <div class="stat-label">Total Pendiente</div>
    </div>
    <div class="debt-card vencido">
      <div class="stat-value">${overdue.length}</div>
      <div class="stat-label">Vencidos</div>
    </div>
  `;
  
  if (pending.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">💳</div><p>Sin deudas pendientes</p></div>';
    return;
  }
  
  container.innerHTML = pending.sort((a, b) => new Date(a.proximaFecha) - new Date(b.proximaFecha)).map(d => {
    const c = state.clients.find(x => x.id === d.clienteId);
    const isOverdue = d.proximaFecha && new Date(d.proximaFecha) < new Date();
    
    return `
      <div class="list-item" style="${isOverdue ? 'border-left:4px solid var(--warning);' : ''}">
        <div class="list-item-main">
          <div class="list-item-title">${escapeHtml(c?.nombre || 'Cliente desconocido')}</div>
          <div class="list-item-sub">
            Cuota ${d.cuotaActual}/${d.cuotasTotal} • $${formatNumber(d.montoCuota)}/cuota
            ${d.proximaFecha ? `<br>Próximo: ${new Date(d.proximaFecha).toLocaleDateString()} ${isOverdue ? '<span style="color:var(--danger);font-weight:800;">⚠️ VENCIDO</span>' : ''}` : ''}
          </div>
        </div>
        <div class="list-item-actions">
          <button class="btn-primary ripple" style="padding:8px 14px;font-size:12px;" onclick="payInstallment('${d.id}')">Pagar</button>
        </div>
      </div>
    `;
  }).join('');
}

async function payInstallment(debtId) {
  const debt = state.debts.find(d => d.id === debtId);
  if (!debt) return;
  
  const monto = debt.montoCuota;
  debt.montoPendiente = Math.max(0, debt.montoPendiente - monto);
  debt.cuotaActual++;
  
  if (debt.montoPendiente <= 0 || debt.cuotaActual >= debt.cuotasTotal) {
    debt.estado = 'pagado';
    debt.montoPendiente = 0;
  } else {
    const nextDate = new Date(debt.proximaFecha || debt.fecha);
    nextDate.setMonth(nextDate.getMonth() + 1);
    debt.proximaFecha = nextDate.toISOString();
  }
  
  debt.pagos = debt.pagos || [];
  debt.pagos.push({ fecha: new Date().toISOString(), monto, metodo: 'efectivo' });
  
  await dbPut('debts', debt);
  renderDebts();
  showToast('Cuota pagada');
}

function checkDueInstallments() {
  const pending = state.debts.filter(d => d.estado === 'pendiente');
  const dueSoon = pending.filter(d => {
    if (!d.proximaFecha) return false;
    const daysUntil = Math.ceil((new Date(d.proximaFecha) - new Date()) / (1000 * 60 * 60 * 24));
    return daysUntil <= 3 && daysUntil >= 0;
  });
  
  const overdue = pending.filter(d => d.proximaFecha && new Date(d.proximaFecha) < new Date());
  
  state.notifications = [
    ...overdue.map(d => ({ type: 'warning', text: `Cuota vencida: ${state.clients.find(c => c.id === d.clienteId)?.nombre || 'Cliente'}`, debtId: d.id })),
    ...dueSoon.map(d => ({ type: 'info', text: `Cuota próxima: ${state.clients.find(c => c.id === d.clienteId)?.nombre || 'Cliente'}`, debtId: d.id }))
  ];
  
  updateNotifBadge();
}

// --- REPORTS ---
function renderReports() {
  const now = new Date();
  let startDate, endDate;
  
  if (state.reportRange === 'hoy') {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  } else if (state.reportRange === 'semana') {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
    endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
  } else {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  }
  
  const filteredSales = state.sales.filter(s => {
    const d = new Date(s.fecha);
    return d >= startDate && d < endDate;
  });
  
  const totalSales = filteredSales.reduce((s, sale) => s + sale.total, 0);
  const totalCosto = filteredSales.reduce((s, sale) => s + sale.items.reduce((is, item) => is + (item.costo || 0) * item.qty, 0), 0);
  const gananciaNeta = totalSales - totalCosto;
  const totalItems = filteredSales.reduce((s, sale) => s + sale.items.reduce((is, item) => is + item.qty, 0), 0);
  const totalTransactions = filteredSales.length;
  const avgTicket = totalTransactions > 0 ? totalSales / totalTransactions : 0;
  
  document.getElementById('statsGrid').innerHTML = `
    <div class="stat-card">
      <div class="stat-value">$${formatNumber(totalSales)}</div>
      <div class="stat-label">Ventas</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${totalTransactions}</div>
      <div class="stat-label">Transacciones</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${totalItems}</div>
      <div class="stat-label">Productos</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">$${formatNumber(Math.round(avgTicket))}</div>
      <div class="stat-label">Ticket Prom.</div>
    </div>
  `;
  
  document.getElementById('reportGanancia').innerHTML = `
    <div class="ganancia-label">Ganancia Neta Estimada</div>
    <div class="ganancia-value">$${formatNumber(gananciaNeta)}</div>
  `;
  
  renderChart(filteredSales);
  
  const list = document.getElementById('reportList');
  if (filteredSales.length === 0) {
    list.innerHTML = '<div class="empty-state"><div class="empty-icon">📊</div><p>Sin ventas en este período</p></div>';
  } else {
    list.innerHTML = filteredSales.sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).slice(0, 20).map(s => `
      <div class="list-item">
        <div class="list-item-main">
          <div class="list-item-title">$${formatNumber(s.total)}</div>
          <div class="list-item-sub">${s.items.length} items • ${new Date(s.fecha).toLocaleString()} ${s.esFiado ? '• 🤝 FIADO' : ''}</div>
        </div>
        <span style="color:var(--success);font-weight:800;font-size:18px;">✓</span>
      </div>
    `).join('');
  }
}

function renderChart(sales) {
  const canvas = document.getElementById('salesChart');
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.parentElement.getBoundingClientRect();
  
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  canvas.style.width = rect.width + 'px';
  canvas.style.height = rect.height + 'px';
  ctx.scale(dpr, dpr);
  
  const w = rect.width;
  const h = rect.height;
  const padding = 30;
  
  ctx.clearRect(0, 0, w, h);
  
  if (sales.length === 0) {
    ctx.fillStyle = '#9a3412';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Sin datos para mostrar', w/2, h/2);
    return;
  }
  
  const byDay = {};
  sales.forEach(s => {
    const day = new Date(s.fecha).toLocaleDateString();
    byDay[day] = (byDay[day] || 0) + s.total;
  });
  
  const days = Object.keys(byDay).sort();
  const values = days.map(d => byDay[d]);
  const max = Math.max(...values, 1);
  
  const barW = (w - padding * 2) / days.length * 0.6;
  const gap = (w - padding * 2) / days.length * 0.4;
  
  values.forEach((v, i) => {
    const x = padding + i * (barW + gap) + gap/2;
    const barH = (v / max) * (h - padding * 2);
    const y = h - padding - barH;
    
    const gradient = ctx.createLinearGradient(0, y, 0, y + barH);
    gradient.addColorStop(0, '#be123c');
    gradient.addColorStop(1, '#f97316');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(x, y, barW, barH, 6);
    ctx.fill();
    
    ctx.fillStyle = '#431407';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`$${(v/1000).toFixed(0)}k`, x + barW/2, y - 8);
  });
}

function setReportRange(range) {
  state.reportRange = range;
  document.querySelectorAll('.report-filters .chip').forEach(c => {
    c.classList.toggle('active', 
      (range === 'hoy' && c.textContent === 'Hoy') ||
      (range === 'semana' && c.textContent === 'Semana') ||
      (range === 'mes' && c.textContent === 'Mes')
    );
  });
  renderReports();
}

// --- EXCEL EXPORT/IMPORT ---
function exportExcel() {
  const data = [
    ['COLIBRÍ BOBA TEA - BACKUP v2.0'],
    ['Exportado:', new Date().toLocaleString()],
    [],
    ['=== PRODUCTOS ==='],
    ['ID', 'Nombre', 'Categoría', 'Costo', 'Precio', 'Stock', 'Variante', 'Margen%']
  ];
  
  state.products.forEach(p => {
    const margen = p.costo > 0 ? ((p.precio - p.costo) / p.costo * 100).toFixed(1) : 0;
    data.push([p.id, p.nombre, p.categoria, p.costo, p.precio, p.stock, p.variante || '', margen]);
  });
  
  data.push([], ['=== CLIENTES ==='], ['ID', 'Nombre', 'Teléfono', 'Email', 'Notas']);
  state.clients.forEach(c => data.push([c.id, c.nombre, c.tel || '', c.email || '', c.notas || '']));
  
  data.push([], ['=== VENTAS ==='], ['ID', 'Fecha', 'Items', 'Subtotal', 'Descuento', 'Total', 'Efectivo', 'Transferencia', 'Tarjeta', 'Vuelto', 'Fiado']);
  state.sales.forEach(s => {
    const items = s.items.map(i => `${i.qty}x ${i.nombre}`).join('; ');
    data.push([s.id, s.fecha, items, s.subtotal, s.descuento, s.total, s.pagos.efectivo, s.pagos.transf, s.pagos.tarjeta, s.vuelto, s.esFiado ? 'SI' : 'NO']);
  });
  
  data.push([], ['=== DEUDAS ==='], ['ID', 'ClienteID', 'Monto Total', 'Pendiente', 'Cuotas', 'Actual', 'Estado', 'Próxima Fecha']);
  state.debts.forEach(d => data.push([d.id, d.clienteId, d.montoTotal, d.montoPendiente, d.cuotasTotal, d.cuotaActual, d.estado, d.proximaFecha || '']));
  
  const csv = data.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'application/vnd.ms-excel;charset=utf-8' });
  
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `Colibri_Boba_Tea_Backup_${new Date().toISOString().split('T')[0]}.xls`;
  a.click();
  URL.revokeObjectURL(a.href);
  showToast('Excel exportado');
}

function importExcel() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.xls,.xlsx,.csv';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      const lines = text.split('\n').map(l => l.trim()).filter(l => l);
      
      const parseCSV = (line) => {
        const result = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
            else inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        return result.map(c => c.replace(/^"|"$/g, '').replace(/""/g, '"'));
      };
      
      let section = '';
      for (const line of lines) {
        const cells = parseCSV(line);
        if (cells[0]?.startsWith('===')) { section = cells[0]; continue; }
        if (cells[0] === 'ID' || cells[0] === 'COLIBRÍ BOBA TEA' || cells[0]?.startsWith('Exportado')) continue;
        
        if (section === '=== PRODUCTOS ===' && cells.length >= 5) {
          const p = { id: cells[0] || genId(), nombre: cells[1], categoria: cells[2] || 'clasicos', costo: parseFloat(cells[3]) || 0, precio: parseFloat(cells[4]) || 0, stock: parseInt(cells[5]) || 0, variante: cells[6] || '', foto: '' };
          const idx = state.products.findIndex(x => x.id === p.id);
          if (idx >= 0) state.products[idx] = p; else state.products.push(p);
          await dbPut('products', p);
        }
        if (section === '=== CLIENTES ===' && cells.length >= 2) {
          const c = { id: cells[0] || genId(), nombre: cells[1], tel: cells[2] || '', email: cells[3] || '', notas: cells[4] || '' };
          const idx = state.clients.findIndex(x => x.id === c.id);
          if (idx >= 0) state.clients[idx] = c; else state.clients.push(c);
          await dbPut('clients', c);
        }
      }
      
      renderAll();
      showToast('Datos importados desde Excel');
    } catch(err) {
      showToast('Error al importar: ' + err.message);
    }
  };
  input.click();
}

// --- NOTIFICATIONS ---
function showNotifs() {
  const panel = document.getElementById('notifPanel');
  const list = document.getElementById('notifList');
  
  if (state.notifications.length === 0) {
    list.innerHTML = '<div style="padding:24px;text-align:center;color:var(--text-2);font-weight:500;">Sin notificaciones</div>';
  } else {
    list.innerHTML = state.notifications.map(n => `
      <div class="notif-item ${n.type}">
        ${n.type === 'warning' ? '⚠️ ' : '🔔 '}${n.text}
      </div>
    `).join('');
  }
  
  panel.classList.toggle('hidden');
}

function closeNotifs() { document.getElementById('notifPanel').classList.add('hidden'); }
function updateNotifBadge() {
  const badge = document.getElementById('notifBadge');
  badge.textContent = state.notifications.length;
  badge.classList.toggle('hidden', state.notifications.length === 0);
}

// --- ADMIN CONFIG ---
function openAdminModal() {
  document.getElementById('adminModal').classList.remove('hidden');
}

function saveAdminPass() {
  const pass = document.getElementById('adminPass').value;
  if (!pass) { showToast('Ingresa una contraseña'); return; }
  localStorage.setItem('da_admin_pass', pass);
  showToast('Contraseña guardada');
}

function saveAdminConfig() {
  const name = document.getElementById('adminBusinessName').value;
  const currency = document.getElementById('adminCurrency').value;
  localStorage.setItem('da_business_name', name);
  localStorage.setItem('da_currency', currency);
  showToast('Configuración guardada');
}

// --- TOAST ---
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 2500);
}

// --- CONFIRM ---
function showConfirm(text, callback) {
  document.getElementById('confirmText').textContent = text;
  state.confirmCallback = callback;
  document.getElementById('confirmBtn').onclick = () => {
    callback();
    document.getElementById('confirmOverlay').classList.add('hidden');
  };
  document.getElementById('confirmOverlay').classList.remove('hidden');
}

function cancelConfirm() { document.getElementById('confirmOverlay').classList.add('hidden'); state.confirmCallback = null; }

// --- RESET ---
function resetAll() {
  showConfirm('¿Eliminar TODOS los datos? Esta acción no se puede deshacer.', async () => {
    state.products = []; state.clients = []; state.sales = []; state.debts = [];
    const stores = ['products', 'clients', 'sales', 'debts'];
    for (const store of stores) {
      const all = await dbGetAll(store);
      for (const item of all) await dbDelete(store, item.id);
    }
    addDemoProducts();
    renderAll();
    closeBottomSheet();
    showToast('Datos reseteados');
  });
}

// --- UTILITIES ---
function renderAll() {
  renderProducts();
  renderInventory();
  renderClients();
  renderDebts();
  renderReports();
}

function formatNumber(n) { return n.toLocaleString('es-CL'); }
function escapeHtml(text) { const div = document.createElement('div'); div.textContent = text; return div.innerHTML; }

// --- SERVICE WORKER ---
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}