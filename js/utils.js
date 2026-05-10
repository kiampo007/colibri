// ===== UTILIDADES =====
const formatMoney = (amount) => {
  return '$' + Math.round(amount).toLocaleString('es-CL');
};

const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatDateTime = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' }) + 
         ' ' + d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
};

const now = () => new Date().toISOString();

const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
};

const compressImage = (file, maxWidth = 300, quality = 0.8) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width, h = img.height;
        if (w > maxWidth) { h = (h * maxWidth) / w; w = maxWidth; }
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
};

const showToast = (message, type = 'success') => {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
};

const getInitials = (name) => {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

const getDaysDiff = (date1, date2) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24));
};

const getCuotaStatus = (fechaVencimiento) => {
  const days = getDaysDiff(new Date(), fechaVencimiento);
  if (days < 0) return { color: 'rojo', label: 'Vencida', icon: '🔴' };
  if (days <= 3) return { color: 'rojo', label: `${days}d restantes`, icon: '🔴' };
  if (days <= 7) return { color: 'amarillo', label: `${days}d restantes`, icon: '🟡' };
  return { color: 'verde', label: `${days}d restantes`, icon: '🟢' };
};

const calcularCuota = (monto, cuotas) => {
  return Math.ceil(monto / cuotas);
};

const calcularVuelto = (total, pago) => {
  return pago - total;
};

// ===== BACKUP / RESTORE =====
const exportarBackup = () => {
  const data = {
    productos: Store.get('productos'),
    ventas: Store.get('ventas'),
    clientes: Store.get('clientes'),
    deudas: Store.get('deudas'),
    movimientos: Store.get('movimientos'),
    config: Store.get('config'),
    fecha: now()
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `backup-dulces-aromas-${formatDate(new Date()).replace(/\//g, '-')}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('💾 Backup exportado correctamente');
};

const importarBackup = (input) => {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (data.productos) Store.set('productos', data.productos);
      if (data.ventas) Store.set('ventas', data.ventas);
      if (data.clientes) Store.set('clientes', data.clientes);
      if (data.deudas) Store.set('deudas', data.deudas);
      if (data.movimientos) Store.set('movimientos', data.movimientos);
      if (data.config) Store.set('config', data.config);
      showToast('📥 Backup importado correctamente');
      setTimeout(() => location.reload(), 1000);
    } catch (err) {
      showToast('❌ Error al importar backup', 'error');
    }
  };
  reader.readAsText(file);
  input.value = '';
};

const limpiarTodo = () => {
  if (confirm('⚠️ ¿ESTÁS SEGURO? Se borrarán TODOS los datos permanentemente.')) {
    if (confirm('¿REALMENTE SEGURO? Esta acción no se puede deshacer.')) {
      localStorage.clear();
      showToast('🗑️ Todos los datos borrados');
      setTimeout(() => location.reload(), 1000);
    }
  }
};
