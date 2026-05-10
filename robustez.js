
// ============== ROBUSTEZ v4.2 ==============
// Mejoras para uso profesional real

// 1. SINCRONIZACIÓN ENTRE PESTAÑAS
window.addEventListener('storage', (e) => {
    if (e.key && e.key.startsWith('colibri_sync_')) {
        const data = JSON.parse(e.newValue || '{}');
        if (data.action === 'reload') {
            showToast('🔄 Datos actualizados desde otra ventana', 'info');
            loadModule(currentModule);
        }
    }
});

function syncAcrossTabs(action) {
    localStorage.setItem('colibri_sync_' + Date.now(), JSON.stringify({
        action: action,
        timestamp: Date.now()
    }));
}

// 2. BACKUP AUTOMÁTICO ANTES DE OPERACIONES DESTRUCTIVAS
async function createBackup() {
    const data = {
        products: await dbGetAll(STORE_PRODUCTS),
        sales: await dbGetAll(STORE_SALES),
        clients: await dbGetAll(STORE_CLIENTS),
        debts: await dbGetAll(STORE_DEBTS),
        payments: await dbGetAll(STORE_PAYMENTS),
        ingredients: await dbGetAll(STORE_INGREDIENTS),
        recipes: await dbGetAll(STORE_RECIPES),
        purchases: await dbGetAll(STORE_PURCHASES),
        waste: await dbGetAll(STORE_WASTE),
        suppliers: await dbGetAll(STORE_SUPPLIERS),
        batches: await dbGetAll(STORE_BATCHES),
        timestamp: Date.now()
    };
    localStorage.setItem('colibri_backup_auto', JSON.stringify(data));
    return data;
}

async function restoreFromBackup() {
    const backup = localStorage.getItem('colibri_backup_auto');
    if (!backup) { showToast('❌ No hay backup disponible', 'error'); return false; }

    try {
        const data = JSON.parse(backup);
        // Restaurar cada store
        for (const [store, items] of Object.entries(data)) {
            if (Array.isArray(items)) {
                for (const item of items) {
                    await dbAdd(store, item);
                }
            }
        }
        showToast('✅ Backup restaurado', 'success');
        loadModule(currentModule);
        return true;
    } catch (error) {
        console.error('❌ Error restaurando backup:', error);
        showToast('❌ Error al restaurar backup', 'error');
        return false;
    }
}

// 3. VALIDACIÓN ESTRICTA DE DATOS
function validateProduct(data) {
    const errors = [];
    if (!data.name || data.name.trim().length < 2) errors.push('Nombre muy corto');
    if (!data.price || data.price <= 0) errors.push('Precio inválido');
    if (data.stock < 0) errors.push('Stock no puede ser negativo');
    if (data.cost && data.cost > data.price) errors.push('Costo mayor que precio');
    return errors;
}

function validateIngredient(data) {
    const errors = [];
    if (!data.name || data.name.trim().length < 2) errors.push('Nombre muy corto');
    if (!data.unit) errors.push('Unidad requerida');
    if (data.stock < 0) errors.push('Stock negativo');
    if (data.minStock < 0) errors.push('Stock mínimo negativo');
    if (data.cost < 0) errors.push('Costo negativo');
    return errors;
}

function validateSale(items, total) {
    const errors = [];
    if (!items || items.length === 0) errors.push('Carrito vacío');
    if (!total || total <= 0) errors.push('Total inválido');
    const calculatedTotal = items.reduce((sum, item) => sum + (item.price * item.qty), 0);
    if (Math.abs(calculatedTotal - total) > 1) errors.push('Total no coincide');
    return errors;
}

// 4. MODO OFFLINE EXPLÍCITO
let isOnline = navigator.onLine;

window.addEventListener('online', () => {
    isOnline = true;
    showToast('🌐 Conexión restaurada', 'success');
    syncPendingData();
});

window.addEventListener('offline', () => {
    isOnline = false;
    showToast('📴 Modo offline activado', 'warning');
});

async function syncPendingData() {
    const pending = JSON.parse(localStorage.getItem('colibri_pending') || '[]');
    if (pending.length === 0) return;

    let synced = 0;
    for (const operation of pending) {
        try {
            if (operation.type === 'add') {
                await dbAdd(operation.store, operation.data);
                synced++;
            }
        } catch (error) {
            console.error('❌ Error sincronizando:', error);
        }
    }

    if (synced > 0) {
        localStorage.setItem('colibri_pending', JSON.stringify(pending.slice(synced)));
        showToast(`✅ ${synced} operaciones sincronizadas`, 'success');
    }
}

function queuePendingOperation(store, data) {
    const pending = JSON.parse(localStorage.getItem('colibri_pending') || '[]');
    pending.push({ type: 'add', store, data, timestamp: Date.now() });
    localStorage.setItem('colibri_pending', JSON.stringify(pending));
}

// 5. LÍMITES DE SEGURIDAD
const LIMITS = {
    maxProducts: 1000,
    maxClients: 500,
    maxSalesPerDay: 1000,
    maxDebtAmount: 1000000,
    maxCartItems: 50,
    maxIngredientStock: 10000
};

function checkLimit(store, currentCount) {
    const limits = {
        [STORE_PRODUCTS]: LIMITS.maxProducts,
        [STORE_CLIENTS]: LIMITS.maxClients,
        [STORE_SALES]: LIMITS.maxSalesPerDay
    };
    const limit = limits[store];
    if (limit && currentCount >= limit) {
        showToast(`❌ Límite alcanzado: ${limit} items máximo`, 'error');
        return false;
    }
    return true;
}

// 6. LOGS DE AUDITORÍA
async function addAuditLog(action, details) {
    const log = {
        action,
        details,
        timestamp: Date.now(),
        date: new Date().toISOString(),
        user: 'admin', // Puedes cambiar esto si agregas usuarios
        module: currentModule
    };

    const logs = JSON.parse(localStorage.getItem('colibri_audit_logs') || '[]');
    logs.push(log);
    // Mantener solo últimos 1000 logs
    if (logs.length > 1000) logs.shift();
    localStorage.setItem('colibri_audit_logs', JSON.stringify(logs));
}

function viewAuditLogs() {
    const logs = JSON.parse(localStorage.getItem('colibri_audit_logs') || '[]');
    if (logs.length === 0) {
        showToast('ℹ️ No hay logs de auditoría', 'info');
        return;
    }

    const recent = logs.slice(-50).reverse();
    let html = '<h3>📋 Logs de Auditoría (últimos 50)</h3>';
    html += '<div style="max-height:400px;overflow-y:auto;">';
    recent.forEach(log => {
        const date = new Date(log.timestamp);
        html += `<div style="padding:8px;border-bottom:1px solid rgba(255,255,255,0.1);font-size:13px;">
            <strong>${date.toLocaleTimeString('es-CL')}</strong> - 
            <span style="color:var(--primary);">${log.action}</span>
            <div style="color:rgba(255,255,255,0.6);margin-top:2px;">${log.details || ''}</div>
        </div>`;
    });
    html += '</div>';

    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `<div class="modal-content" style="max-width:600px;"><div class="modal-header"><h3>📋 Auditoría</h3><button class="close-modal" onclick="this.closest('.modal').remove()">×</button></div><div class="modal-body">${html}</div></div>`;
    document.body.appendChild(modal);
}

// 7. COMPACTACIÓN DE BASE DE DATOS (limpieza automática)
async function compactDatabase() {
    try {
        // Eliminar ventas antiguas (> 2 años)
        const twoYearsAgo = Date.now() - (2 * 365 * 24 * 60 * 60 * 1000);
        const sales = await dbGetAll(STORE_SALES);
        let deleted = 0;
        for (const sale of sales) {
            if (sale.timestamp < twoYearsAgo) {
                await dbDelete(STORE_SALES, sale.id);
                deleted++;
            }
        }

        // Eliminar logs antiguos
        const logs = JSON.parse(localStorage.getItem('colibri_audit_logs') || '[]');
        const oneMonthAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        const filtered = logs.filter(l => l.timestamp > oneMonthAgo);
        localStorage.setItem('colibri_audit_logs', JSON.stringify(filtered));

        if (deleted > 0) {
            showToast(`🗑️ ${deleted} registros antiguos eliminados`, 'success');
        }

        // Crear backup después de compactar
        await createBackup();

    } catch (error) {
        console.error('❌ Error compactando:', error);
    }
}

// Ejecutar compactación cada 7 días
const lastCompact = parseInt(localStorage.getItem('colibri_last_compact') || '0');
if (Date.now() - lastCompact > 7 * 24 * 60 * 60 * 1000) {
    compactDatabase();
    localStorage.setItem('colibri_last_compact', Date.now().toString());
}

// 8. EXPORTAR/IMPORTAR EXCEL-FRIENDLY
async function exportToCSV() {
    try {
        const products = await dbGetAll(STORE_PRODUCTS);
        const sales = await dbGetAll(STORE_SALES);

        // CSV de productos
        let csv = 'Nombre,Categoría,Precio,Costo,Stock\n';
        products.forEach(p => {
            csv += `"${p.name}","${p.category}",${p.price},${p.cost},${p.stock}\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `colibri_productos_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);

        showToast('📊 CSV exportado', 'success');
        await addAuditLog('export_csv', 'Exportación a CSV');
    } catch (error) {
        console.error('❌ Error exportando CSV:', error);
        showToast('❌ Error al exportar CSV', 'error');
    }
}

// 9. PROTECCIÓN CONTRA DATOS CORRUPTOS
async function verifyDatabaseIntegrity() {
    try {
        const issues = [];

        // Verificar recetas huérfanas (productos eliminados)
        const products = await dbGetAll(STORE_PRODUCTS);
        const recipes = await dbGetAll(STORE_RECIPES);
        const productIds = products.map(p => p.id);

        for (const recipe of recipes) {
            if (!productIds.includes(recipe.productId)) {
                issues.push(`Receta "${recipe.name}" sin producto asociado`);
            }
        }

        // Verificar ingredientes con stock negativo
        const ingredients = await dbGetAll(STORE_INGREDIENTS);
        for (const ing of ingredients) {
            if (ing.stock < 0) {
                issues.push(`Ingrediente "${ing.name}" con stock negativo: ${ing.stock}`);
                ing.stock = 0;
                await dbPut(STORE_INGREDIENTS, ing);
            }
        }

        if (issues.length > 0) {
            console.warn('⚠️ Problemas encontrados:', issues);
            showToast(`⚠️ ${issues.length} problemas corregidos automáticamente`, 'warning');
        }

        return issues;
    } catch (error) {
        console.error('❌ Error verificando integridad:', error);
        return [];
    }
}

// Verificar integridad al iniciar
setTimeout(() => verifyDatabaseIntegrity(), 3000);
