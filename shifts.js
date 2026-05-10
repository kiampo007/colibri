
// ============== TURNOS / CAJA ULTRA PRO ==============
const STORE_SHIFTS = 'shifts';
const STORE_SHIFT_MOVEMENTS = 'shift_movements';
let currentShift = null;

// Inicializar stores de turnos en IndexedDB
function initShiftStores(database) {
    if (!database.objectStoreNames.contains(STORE_SHIFTS)) {
        const ss = database.createObjectStore(STORE_SHIFTS, { keyPath: 'id', autoIncrement: true });
        ss.createIndex('date', 'date', { unique: false });
        ss.createIndex('status', 'status', { unique: false });
        ss.createIndex('user', 'user', { unique: false });
    }
    if (!database.objectStoreNames.contains(STORE_SHIFT_MOVEMENTS)) {
        const sm = database.createObjectStore(STORE_SHIFT_MOVEMENTS, { keyPath: 'id', autoIncrement: true });
        sm.createIndex('shiftId', 'shiftId', { unique: false });
        sm.createIndex('type', 'type', { unique: false });
    }
}

// Verificar si hay turno abierto al cargar
async function checkCurrentShift() {
    try {
        const shifts = await dbGetAll(STORE_SHIFTS);
        currentShift = shifts.find(s => s.status === 'open');

        if (currentShift) {
            // Verificar si lleva más de 12 horas abierto
            const hoursOpen = (Date.now() - currentShift.openedAt) / (1000 * 60 * 60);
            if (hoursOpen > 12) {
                showToast(`⚠️ Turno abierto hace ${Math.floor(hoursOpen)} horas. Debes cerrarlo.`, 'warning');
            }
            updateShiftUI();
        } else {
            showShiftClosedUI();
        }
    } catch (error) {
        console.error('❌ Error checkCurrentShift:', error);
    }
}

function updateShiftUI() {
    const shiftBadge = document.getElementById('shift-badge');
    if (shiftBadge && currentShift) {
        const hoursOpen = Math.floor((Date.now() - currentShift.openedAt) / (1000 * 60 * 60));
        shiftBadge.innerHTML = `🟢 Turno abierto por ${currentShift.user} • ${hoursOpen}h • ${formatMoney(currentShift.initialAmount)}`;
        shiftBadge.style.display = 'block';
    }
}

function showShiftClosedUI() {
    const shiftBadge = document.getElementById('shift-badge');
    if (shiftBadge) {
        shiftBadge.innerHTML = `🔴 Sin turno abierto`;
        shiftBadge.style.display = 'block';
    }
}

// ABRIR TURNO
async function openShift() {
    try {
        // Verificar si ya hay turno abierto
        const shifts = await dbGetAll(STORE_SHIFTS);
        const openShift = shifts.find(s => s.status === 'open');
        if (openShift) {
            showToast('❌ Ya hay un turno abierto. Ciérralo primero.', 'error');
            return;
        }

        const user = document.getElementById('shift-open-user').value.trim();
        const initialAmount = parseFloat(document.getElementById('shift-open-amount').value);
        const notes = document.getElementById('shift-open-notes').value.trim();

        if (!user) { showToast('❌ Ingresa quién abre el turno', 'error'); return; }
        if (!initialAmount || initialAmount < 0) { showToast('❌ Monto inicial inválido', 'error'); return; }

        const shift = {
            user,
            initialAmount,
            currentAmount: initialAmount,
            salesTotal: 0,
            withdrawalsTotal: 0,
            depositsTotal: 0,
            expectedAmount: initialAmount,
            status: 'open',
            openedAt: Date.now(),
            date: new Date().toISOString(),
            notes,
            createdAt: new Date().toISOString()
        };

        const shiftId = await dbAdd(STORE_SHIFTS, shift);
        currentShift = { ...shift, id: shiftId };

        await addAuditLog('shift_open', `Turno abierto por ${user} con ${formatMoney(initialAmount)}`);

        showToast(`✅ Turno abierto por ${user}`, 'success');
        closeModal('shift-open-modal');
        updateShiftUI();

        // Si estamos en el módulo de turnos, recargar
        if (currentModule === 'turnos') loadShifts();
    } catch (error) {
        console.error('❌ Error openShift:', error);
        showToast('❌ Error al abrir turno', 'error');
    }
}

// RETIRAR DE CAJA
async function withdrawFromShift() {
    try {
        if (!currentShift) { showToast('❌ No hay turno abierto', 'error'); return; }

        const amount = parseFloat(document.getElementById('shift-withdraw-amount').value);
        const reason = document.getElementById('shift-withdraw-reason').value;
        const notes = document.getElementById('shift-withdraw-notes').value.trim();

        if (!amount || amount <= 0) { showToast('❌ Monto inválido', 'error'); return; }
        if (amount > currentShift.currentAmount) { showToast('❌ No hay suficiente en caja', 'error'); return; }

        currentShift.currentAmount -= amount;
        currentShift.withdrawalsTotal += amount;
        currentShift.expectedAmount = currentShift.initialAmount + currentShift.salesTotal - currentShift.withdrawalsTotal + currentShift.depositsTotal;

        await dbPut(STORE_SHIFTS, currentShift);

        await dbAdd(STORE_SHIFT_MOVEMENTS, {
            shiftId: currentShift.id,
            type: 'withdrawal',
            amount,
            reason,
            notes,
            timestamp: Date.now(),
            date: new Date().toISOString()
        });

        await addAuditLog('shift_withdraw', `Retiro de ${formatMoney(amount)}: ${reason}`);

        showToast(`💸 Retiro registrado: ${formatMoney(amount)}`, 'warning');
        closeModal('shift-withdraw-modal');
        updateShiftUI();
        if (currentModule === 'turnos') loadShifts();
    } catch (error) {
        console.error('❌ Error withdrawFromShift:', error);
        showToast('❌ Error al retirar', 'error');
    }
}

// METER A CAJA
async function depositToShift() {
    try {
        if (!currentShift) { showToast('❌ No hay turno abierto', 'error'); return; }

        const amount = parseFloat(document.getElementById('shift-deposit-amount').value);
        const reason = document.getElementById('shift-deposit-reason').value;
        const notes = document.getElementById('shift-deposit-notes').value.trim();

        if (!amount || amount <= 0) { showToast('❌ Monto inválido', 'error'); return; }

        currentShift.currentAmount += amount;
        currentShift.depositsTotal += amount;
        currentShift.expectedAmount = currentShift.initialAmount + currentShift.salesTotal - currentShift.withdrawalsTotal + currentShift.depositsTotal;

        await dbPut(STORE_SHIFTS, currentShift);

        await dbAdd(STORE_SHIFT_MOVEMENTS, {
            shiftId: currentShift.id,
            type: 'deposit',
            amount,
            reason,
            notes,
            timestamp: Date.now(),
            date: new Date().toISOString()
        });

        await addAuditLog('shift_deposit', `Ingreso de ${formatMoney(amount)}: ${reason}`);

        showToast(`💰 Ingreso registrado: ${formatMoney(amount)}`, 'success');
        closeModal('shift-deposit-modal');
        updateShiftUI();
        if (currentModule === 'turnos') loadShifts();
    } catch (error) {
        console.error('❌ Error depositToShift:', error);
        showToast('❌ Error al depositar', 'error');
    }
}

// ACTUALIZAR TURNO CON VENTA
async function addSaleToShift(saleTotal) {
    try {
        if (!currentShift) return;

        currentShift.salesTotal += saleTotal;
        currentShift.currentAmount += saleTotal;
        currentShift.expectedAmount = currentShift.initialAmount + currentShift.salesTotal - currentShift.withdrawalsTotal + currentShift.depositsTotal;

        await dbPut(STORE_SHIFTS, currentShift);
        updateShiftUI();
    } catch (error) {
        console.error('❌ Error addSaleToShift:', error);
    }
}

// CERRAR TURNO
async function closeShift() {
    try {
        if (!currentShift) { showToast('❌ No hay turno abierto', 'error'); return; }

        const actualAmount = parseFloat(document.getElementById('shift-close-amount').value);
        const user = document.getElementById('shift-close-user').value.trim();
        const notes = document.getElementById('shift-close-notes').value.trim();

        if (!actualAmount || actualAmount < 0) { showToast('❌ Monto real inválido', 'error'); return; }
        if (!user) { showToast('❌ Ingresa quién cierra el turno', 'error'); return; }

        const difference = actualAmount - currentShift.expectedAmount;
        const isBalanced = Math.abs(difference) < 1; // Tolerancia de $1

        let discrepancyReason = '';
        let discrepancyAmount = 0;

        if (!isBalanced) {
            discrepancyReason = document.getElementById('shift-close-reason').value;
            discrepancyAmount = Math.abs(difference);

            if (!discrepancyReason) { showToast('❌ Debes explicar por qué no cuadra', 'error'); return; }
        }

        currentShift.status = 'closed';
        currentShift.closedBy = user;
        currentShift.actualAmount = actualAmount;
        currentShift.difference = difference;
        currentShift.discrepancyReason = discrepancyReason;
        currentShift.discrepancyAmount = discrepancyAmount;
        currentShift.closedAt = Date.now();
        currentShift.closeNotes = notes;

        await dbPut(STORE_SHIFTS, currentShift);

        await addAuditLog('shift_close', 
            `Turno cerrado por ${user}. Esperado: ${formatMoney(currentShift.expectedAmount)}, Real: ${formatMoney(actualAmount)}, Diferencia: ${formatMoney(difference)}${discrepancyReason ? ' (' + discrepancyReason + ')' : ''}`
        );

        if (isBalanced) {
            showToast(`✅ Turno cerrado perfecto. Cuadre exacto`, 'success');
        } else if (difference > 0) {
            showToast(`⚠️ Turno cerrado. Sobraron ${formatMoney(difference)}`, 'warning');
        } else {
            showToast(`❌ Turno cerrado. Faltaron ${formatMoney(Math.abs(difference))}`, 'error');
        }

        currentShift = null;
        closeModal('shift-close-modal');
        showShiftClosedUI();
        if (currentModule === 'turnos') loadShifts();
    } catch (error) {
        console.error('❌ Error closeShift:', error);
        showToast('❌ Error al cerrar turno', 'error');
    }
}

// CARGAR HISTORIAL DE TURNOS
async function loadShifts() {
    try {
        const shifts = await dbGetAll(STORE_SHIFTS);
        const movements = await dbGetAll(STORE_SHIFT_MOVEMENTS);
        const list = document.getElementById('shifts-list');
        if (!list) return;

        shifts.sort((a, b) => b.openedAt - a.openedAt);

        if (shifts.length === 0) {
            list.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📊</div><p class="empty-state-text">No hay turnos registrados</p><button class="btn-primary" onclick="openModal('shift-open-modal')">+ Abrir Primer Turno</button></div>`;
            return;
        }

        list.innerHTML = shifts.map(shift => {
            const isOpen = shift.status === 'open';
            const date = new Date(shift.openedAt);
            const movementsList = movements.filter(m => m.shiftId === shift.id);
            const withdrawals = movementsList.filter(m => m.type === 'withdrawal');
            const deposits = movementsList.filter(m => m.type === 'deposit');

            let statusClass = 'paid';
            let statusText = 'Cuadrado';
            if (isOpen) { statusClass = 'pending'; statusText = 'Abierto'; }
            else if (shift.difference > 0) { statusClass = 'warning'; statusText = `Sobró ${formatMoney(shift.difference)}`; }
            else if (shift.difference < 0) { statusClass = 'overdue'; statusText = `Faltó ${formatMoney(Math.abs(shift.difference))}`; }

            return `
                <div class="list-item">
                    <div class="list-content" style="flex:1;">
                        <div class="list-title">
                            ${date.toLocaleDateString('es-CL')} ${date.toLocaleTimeString('es-CL', {hour:'2-digit', minute:'2-digit'})}
                            <span class="debt-status ${statusClass}">${statusText}</span>
                        </div>
                        <div class="list-subtitle">
                            Abierto por: <strong>${shift.user}</strong> • 
                            ${shift.closedBy ? `Cerrado por: <strong>${shift.closedBy}</strong>` : 'Sin cerrar'}
                        </div>
                        <div style="margin-top:8px;display:grid;grid-template-columns:repeat(3,1fr);gap:8px;font-size:12px;">
                            <div style="background:rgba(0,212,170,0.1);padding:8px;border-radius:6px;text-align:center;">
                                <div style="font-weight:700;color:var(--primary);">${formatMoney(shift.initialAmount)}</div>
                                <div style="color:rgba(255,255,255,0.5);">Inicial</div>
                            </div>
                            <div style="background:rgba(0,212,170,0.1);padding:8px;border-radius:6px;text-align:center;">
                                <div style="font-weight:700;color:var(--primary);">${formatMoney(shift.salesTotal)}</div>
                                <div style="color:rgba(255,255,255,0.5);">Ventas</div>
                            </div>
                            <div style="background:rgba(231,76,60,0.1);padding:8px;border-radius:6px;text-align:center;">
                                <div style="font-weight:700;color:#e74c3c;">${formatMoney(shift.withdrawalsTotal)}</div>
                                <div style="color:rgba(255,255,255,0.5);">Retiros</div>
                            </div>
                        </div>
                        ${shift.depositsTotal > 0 ? `<div style="margin-top:4px;font-size:12px;color:var(--primary);">💰 Ingresos extras: ${formatMoney(shift.depositsTotal)}</div>` : ''}
                        ${!isOpen ? `<div style="margin-top:6px;font-size:13px;">
                            Esperado: ${formatMoney(shift.expectedAmount)} • Real: ${formatMoney(shift.actualAmount)}
                            ${shift.discrepancyReason ? `<div style="color:#e74c3c;margin-top:2px;">📝 ${shift.discrepancyReason}</div>` : ''}
                        </div>` : ''}
                    </div>
                </div>`;
        }).join('');
    } catch (error) {
        console.error('❌ Error loadShifts:', error);
    }
}

// Actualizar modal de cierre según monto ingresado
function updateClosePreview() {
    try {
        if (!currentShift) return;
        const actualAmount = parseFloat(document.getElementById('shift-close-amount').value) || 0;
        const difference = actualAmount - currentShift.expectedAmount;
        const preview = document.getElementById('shift-close-preview');
        const reasonDiv = document.getElementById('shift-close-reason-div');

        if (!preview) return;

        if (difference === 0) {
            preview.innerHTML = `<div style="color:var(--primary);font-weight:700;font-size:18px;">✅ Cuadre perfecto</div>`;
            if (reasonDiv) reasonDiv.style.display = 'none';
        } else if (difference > 0) {
            preview.innerHTML = `<div style="color:var(--accent);font-weight:700;font-size:18px;">⚠️ Sobran ${formatMoney(difference)}</div>`;
            if (reasonDiv) reasonDiv.style.display = 'block';
        } else {
            preview.innerHTML = `<div style="color:#e74c3c;font-weight:700;font-size:18px;">❌ Faltan ${formatMoney(Math.abs(difference))}</div>`;
            if (reasonDiv) reasonDiv.style.display = 'block';
        }
    } catch (error) {
        console.error('❌ Error updateClosePreview:', error);
    }
}


// Preparar modal de cierre con datos del turno actual
async function prepareCloseShift() {
    try {
        if (!currentShift) {
            showToast('❌ No hay turno abierto para cerrar', 'error');
            return;
        }

        // Actualizar datos en el modal
        const expectedEl = document.getElementById('shift-close-expected');
        const salesEl = document.getElementById('shift-close-sales');
        const withdrawalsEl = document.getElementById('shift-close-withdrawals');
        const depositsEl = document.getElementById('shift-close-deposits');
        const amountInput = document.getElementById('shift-close-amount');
        const userInput = document.getElementById('shift-close-user');

        if (expectedEl) expectedEl.textContent = formatMoney(currentShift.expectedAmount);
        if (salesEl) salesEl.textContent = formatMoney(currentShift.salesTotal);
        if (withdrawalsEl) withdrawalsEl.textContent = formatMoney(currentShift.withdrawalsTotal);
        if (depositsEl) depositsEl.textContent = formatMoney(currentShift.depositsTotal);
        if (amountInput) amountInput.value = '';
        if (userInput) userInput.value = '';

        const preview = document.getElementById('shift-close-preview');
        if (preview) preview.innerHTML = '<div style="color:rgba(255,255,255,0.5);">Ingresa el monto real para ver el cuadre</div>';

        const reasonDiv = document.getElementById('shift-close-reason-div');
        if (reasonDiv) reasonDiv.style.display = 'none';

        openModal('shift-close-modal');
    } catch (error) {
        console.error('❌ Error prepareCloseShift:', error);
        showToast('❌ Error al preparar cierre', 'error');
    }
}
