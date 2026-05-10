// ===== NAVEGACIÓN =====
let currentModule = 'dashboard';

const navigateTo = (module) => {
  // Ocultar todos los módulos
  document.querySelectorAll('.module').forEach(m => m.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

  // Mostrar módulo seleccionado
  const target = document.getElementById('mod-' + module);
  if (target) {
    target.classList.add('active');
    currentModule = module;
  }

  // Activar botón de nav
  const navBtn = document.querySelector(`.nav-btn[data-module="${module}"]`);
  if (navBtn) navBtn.classList.add('active');

  // Cerrar panel de notificaciones
  document.getElementById('notif-panel').classList.remove('open');

  // Actualizar datos según módulo
  if (module === 'dashboard') updateDashboard();
  if (module === 'productos') renderProductos();
  if (module === 'inventario') renderInventario();
  if (module === 'ventas') renderVentas();
  if (module === 'clientes') renderClientes();
  if (module === 'deudas') renderDeudas();
  if (module === 'catalogo') renderCatalogo();
  if (module === 'venta-rapida') renderVentaRapida();

  // Scroll al top
  document.querySelector('.main-content').scrollTop = 0;
};

// ===== MODALES =====
const showModal = (id) => {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('active');

  // Preparar selects si es necesario
  if (id === 'modal-merma') cargarSelectProductos('merma-producto');
  if (id === 'modal-fiado') {
    cargarSelectClientes('fiado-cliente');
    calcularCuota();
  }
};

const closeModal = (id) => {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('active');
};

// Cerrar modal al hacer click fuera
window.onclick = (e) => {
  if (e.target.classList.contains('modal')) {
    e.target.classList.remove('active');
  }
};

// ===== NOTIFICACIONES =====
const toggleNotifPanel = () => {
  document.getElementById('notif-panel').classList.toggle('open');
};

const updateNotificaciones = () => {
  const notifs = [];

  // Stock bajo
  const stockBajo = getProductos().filter(p => p.stock <= 3);
  stockBajo.forEach(p => {
    notifs.push({
      tipo: 'warning',
      icono: '📦',
      texto: `Stock bajo: ${p.nombre} (${p.stock} unidades)`,
      fecha: now()
    });
  });

  // Cuotas por vencer
  const deudas = getDeudasActivas();
  deudas.forEach(d => {
    const proximaCuota = d.cuotas.find(c => c.estado === 'pendiente');
    if (proximaCuota) {
      const status = getCuotaStatus(proximaCuota.fechaVencimiento);
      if (status.color !== 'verde') {
        notifs.push({
          tipo: status.color === 'rojo' ? 'danger' : 'warning',
          icono: status.icon,
          texto: `${d.clienteNombre}: cuota vence ${status.label}`,
          fecha: now()
        });
      }
    }
  });

  // Actualizar badge
  const badge = document.getElementById('notif-badge');
  badge.textContent = notifs.length;
  badge.style.display = notifs.length > 0 ? 'flex' : 'none';

  // Renderizar lista
  const list = document.getElementById('notif-list');
  if (notifs.length === 0) {
    list.innerHTML = '<p class="empty">Sin notificaciones</p>';
  } else {
    list.innerHTML = notifs.map(n => `
      <div class="notif-item ${n.tipo}">
        <div class="notif-icon">${n.icono}</div>
        <div class="notif-text">
          <p>${n.texto}</p>
          <span>${formatDateTime(n.fecha)}</span>
        </div>
      </div>
    `).join('');
  }
};

// ===== PREVIEW FOTO =====
const previewFotoProducto = async (input) => {
  const preview = document.getElementById('np-foto-preview');
  if (input.files && input.files[0]) {
    const compressed = await compressImage(input.files[0]);
    preview.innerHTML = `<img src="${compressed}" alt="Preview">`;
    preview.dataset.image = compressed;
  }
};

// ===== LOGO =====
const subirLogo = async (input) => {
  if (input.files && input.files[0]) {
    const compressed = await compressImage(input.files[0], 200, 0.9);
    const config = getConfig();
    config.logo = compressed;
    saveConfig(config);
    document.getElementById('logo-preview').innerHTML = `<img src="${compressed}" alt="Logo">`;
    document.getElementById('business-logo').innerHTML = `<img src="${compressed}" alt="Logo" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
    showToast('Logo actualizado');
  }
};

const cargarLogo = () => {
  const config = getConfig();
  if (config.logo) {
    document.getElementById('logo-preview').innerHTML = `<img src="${config.logo}" alt="Logo">`;
    document.getElementById('business-logo').innerHTML = `<img src="${config.logo}" alt="Logo" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
  }
  if (config.nombre) {
    document.getElementById('business-name').textContent = config.nombre;
    document.getElementById('config-nombre').value = config.nombre;
  }
};

const guardarConfig = () => {
  const config = getConfig();
  config.nombre = document.getElementById('config-nombre').value;
  saveConfig(config);
  document.getElementById('business-name').textContent = config.nombre;
  showToast('Configuración guardada');
};

// ===== SELECTS =====
const cargarSelectProductos = (selectId) => {
  const select = document.getElementById(selectId);
  if (!select) return;
  const productos = getProductos();
  select.innerHTML = productos.map(p => `<option value="${p.id}">${p.nombre} (Stock: ${p.stock})</option>`).join('');
};

const cargarSelectClientes = (selectId) => {
  const select = document.getElementById(selectId);
  if (!select) return;
  const clientes = getClientes();
  if (clientes.length === 0) {
    select.innerHTML = '<option value="">Sin clientes registrados</option>';
  } else {
    select.innerHTML = '<option value="">Seleccionar cliente...</option>' + 
      clientes.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
  }
};

// ===== TABS =====
const switchInvTab = (tab) => {
  document.querySelectorAll('.inv-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.inv-content').forEach(c => c.classList.remove('active'));
  event.target.classList.add('active');
  document.getElementById('inv-' + tab).classList.add('active');
  if (tab === 'movimientos') renderMovimientos();
};

const switchDeudaTab = (tab) => {
  document.querySelectorAll('.deuda-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.deudas-content').forEach(c => c.classList.remove('active'));
  event.target.classList.add('active');
  document.getElementById('deudas-' + tab).classList.add('active');
  if (tab === 'activas') renderDeudasActivas();
  if (tab === 'historial') renderDeudasHistorial();
};

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', () => {
  Store.init();
  cargarLogo();
  updateDashboard();
  updateNotificaciones();

  // Fecha en dashboard
  document.getElementById('dash-date').textContent = new Date().toLocaleDateString('es-CL', { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
  });

  // Notificaciones
  document.getElementById('notif-btn').addEventListener('click', toggleNotifPanel);
  document.querySelector('.close-panel').addEventListener('click', toggleNotifPanel);

  // Actualizar notificaciones cada minuto
  setInterval(updateNotificaciones, 60000);
});
