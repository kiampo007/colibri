/* ============================================
   COLIBRÍ BOBA TEA v2.0 - APP.JS
   IndexedDB | Carrito Flotante | Glassmorphism
   Lógica completa auditada y corregida
   ============================================ */

// ============== CONFIGURACIÓN ==============
const DB_NAME = 'colibri_boba_tea_db';
const DB_VERSION = 1;
const STORE_PRODUCTS = 'products';
const STORE_SALES = 'sales';
const STORE_CLIENTS = 'clients';
const STORE_DEBTS = 'debts';
const STORE_PAYMENTS = 'payments';
const STORE_CONFIG = 'config';

// URLs de imágenes de prueba funcionales y confiables
const DEMO_IMAGES = {
    bubble_tea: [
        'https://images.unsplash.com/photo-1558855410-3112e3d2bb30?w=400&h=400&fit=crop',
        'https://images.unsplash.com/photo-1546173159-315724a31696?w=400&h=400&fit=crop',
        'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&h=400&fit=crop',
        'https://images.unsplash.com/photo-1577803645773-f96470509666?w=400&h=400&fit=crop',
        'https://images.unsplash.com/photo-1558160074-4d7d8bdf4256?w=400&h=400&fit=crop'
    ],
    smoothie: [
        'https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?w=400&h=400&fit=crop',
        'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400&h=400&fit=crop',
        'https://images.unsplash.com/photo-1505252585461-04db1eb84625?w=400&h=400&fit=crop'
    ],
    coffee: [
        'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=400&fit=crop',
        'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&h=400&fit=crop',
        'https://images.unsplash.com/photo-1514432324607-a09d9b4aefda?w=400&h=400&fit=crop'
    ],
    postre: [
        'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=400&h=400&fit=crop',
        'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400&h=400&fit=crop',
        'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&h=400&fit=crop'
    ],
    logo: 'https://cdn-icons-png.flaticon.com/512/3081/3081840.png'
};

// ============== ESTADO GLOBAL ==============
let db = null;
let cart = [];
let currentModule = 'productos';
let currentPaymentMethod = 'efectivo';
let deleteTarget = null;
let deleteCallback = null;

// ============== INICIALIZACIÓN ==============
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

async function initApp() {
    // Splash screen
    const splash = document.getElementById('splash-screen');
    const app = document.getElementById('app');

    // Inicializar IndexedDB
    try {
        db = await initDB();
        console.log('✅ IndexedDB inicializada');
    } catch (error) {
        console.error('❌ Error al inicializar IndexedDB:', error);
        showToast('Error al inicializar la base de datos', 'error');
    }

    // Cargar configuración
    await loadConfig();

    // Cargar datos iniciales si está vacío
    await loadDemoData();

    // Setup event listeners
    setupEventListeners();

    // Cargar módulo inicial
    loadModule('productos');

    // Ocultar splash
    setTimeout(() => {
        splash.style.opacity = '0';
        setTimeout(() => {
            splash.style.display = 'none';
            app.style.display = 'flex';
        }, 500);
    }, 2000);
}

// ============== INDEXEDDB ==============
function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const database = event.target.result;

            // Productos
            if (!database.objectStoreNames.contains(STORE_PRODUCTS)) {
                const productsStore = database.createObjectStore(STORE_PRODUCTS, { keyPath: 'id', autoIncrement: true });
                productsStore.createIndex('name', 'name', { unique: false });
                productsStore.createIndex('category', 'category', { unique: false });
            }

            // Ventas
            if (!database.objectStoreNames.contains(STORE_SALES)) {
                const salesStore = database.createObjectStore(STORE_SALES, { keyPath: 'id', autoIncrement: true });
                salesStore.createIndex('date', 'date', { unique: false });
                salesStore.createIndex('clientId', 'clientId', { unique: false });
            }

            // Clientes
            if (!database.objectStoreNames.contains(STORE_CLIENTS)) {
                const clientsStore = database.createObjectStore(STORE_CLIENTS, { keyPath: 'id', autoIncrement: true });
                clientsStore.createIndex('name', 'name', { unique: false });
                clientsStore.createIndex('phone', 'phone', { unique: false });
            }

            // Deudas
            if (!database.objectStoreNames.contains(STORE_DEBTS)) {
                const debtsStore = database.createObjectStore(STORE_DEBTS, { keyPath: 'id', autoIncrement: true });
                debtsStore.createIndex('clientId', 'clientId', { unique: false });
                debtsStore.createIndex('status', 'status', { unique: false });
                debtsStore.createIndex('dueDate', 'dueDate', { unique: false });
            }

            // Pagos
            if (!database.objectStoreNames.contains(STORE_PAYMENTS)) {
                const paymentsStore = database.createObjectStore(STORE_PAYMENTS, { keyPath: 'id', autoIncrement: true });
                paymentsStore.createIndex('debtId', 'debtId', { unique: false });
                paymentsStore.createIndex('date', 'date', { unique: false });
            }

            // Configuración
            if (!database.objectStoreNames.contains(STORE_CONFIG)) {
                database.createObjectStore(STORE_CONFIG, { keyPath: 'key' });
            }
        };
    });
}

// ============== OPERACIONES DB ==============
async function dbAdd(store, data) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([store], 'readwrite');
        const objectStore = transaction.objectStore(store);
        const request = objectStore.add(data);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function dbGetAll(store) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([store], 'readonly');
        const objectStore = transaction.objectStore(store);
        const request = objectStore.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function dbGet(store, id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([store], 'readonly');
        const objectStore = transaction.objectStore(store);
        const request = objectStore.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function dbPut(store, data) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([store], 'readwrite');
        const objectStore = transaction.objectStore(store);
        const request = objectStore.put(data);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function dbDelete(store, id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([store], 'readwrite');
        const objectStore = transaction.objectStore(store);
        const request = objectStore.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// ============== DATOS DE PRUEBA ==============
async function loadDemoData() {
    const products = await dbGetAll(STORE_PRODUCTS);

    if (products.length === 0) {
        const demoProducts = [
            {
                name: 'Bubble Tea Taro',
                price: 5500,
                cost: 2500,
                stock: 50,
                category: 'bubble-tea',
                image: DEMO_IMAGES.bubble_tea[0],
                createdAt: new Date().toISOString()
            },
            {
                name: 'Bubble Tea Matcha',
                price: 6000,
                cost: 2800,
                stock: 35,
                category: 'bubble-tea',
                image: DEMO_IMAGES.bubble_tea[1],
                createdAt: new Date().toISOString()
            },
            {
                name: 'Bubble Tea Fresa',
                price: 5000,
                cost: 2200,
                stock: 42,
                category: 'bubble-tea',
                image: DEMO_IMAGES.bubble_tea[2],
                createdAt: new Date().toISOString()
            },
            {
                name: 'Smoothie Mango',
                price: 4800,
                cost: 2000,
                stock: 30,
                category: 'smoothie',
                image: DEMO_IMAGES.smoothie[0],
                createdAt: new Date().toISOString()
            },
            {
                name: 'Smoothie Maracuyá',
                price: 5200,
                cost: 2300,
                stock: 25,
                category: 'smoothie',
                image: DEMO_IMAGES.smoothie[1],
                createdAt: new Date().toISOString()
            },
            {
                name: 'Café Helado',
                price: 4500,
                cost: 1800,
                stock: 60,
                category: 'coffee',
                image: DEMO_IMAGES.coffee[0],
                createdAt: new Date().toISOString()
            },
            {
                name: 'Latte Caramel',
                price: 5800,
                cost: 2600,
                stock: 40,
                category: 'coffee',
                image: DEMO_IMAGES.coffee[1],
                createdAt: new Date().toISOString()
            },
            {
                name: 'Cheesecake Oreo',
                price: 6500,
                cost: 3000,
                stock: 15,
                category: 'postre',
                image: DEMO_IMAGES.postre[0],
                createdAt: new Date().toISOString()
            },
            {
                name: 'Brownie Chocolate',
                price: 4800,
                cost: 2200,
                stock: 20,
                category: 'postre',
                image: DEMO_IMAGES.postre[1],
                createdAt: new Date().toISOString()
            }
        ];

        for (const product of demoProducts) {
            await dbAdd(STORE_PRODUCTS, product);
        }

        showToast('🧋 Productos de prueba cargados', 'success');
    }

    // Clientes de prueba
    const clients = await dbGetAll(STORE_CLIENTS);
    if (clients.length === 0) {
        const demoClients = [
            { name: 'María González', phone: '+56 9 1234 5678', email: 'maria@email.com', address: 'Santiago Centro', notes: 'Cliente frecuente', createdAt: new Date().toISOString() },
            { name: 'Carlos Rodríguez', phone: '+56 9 8765 4321', email: 'carlos@email.com', address: 'Providencia', notes: 'Paga puntual', createdAt: new Date().toISOString() },
            { name: 'Ana Silva', phone: '+56 9 5555 6666', email: 'ana@email.com', address: 'Las Condes', notes: 'Prefiere delivery', createdAt: new Date().toISOString() }
        ];

        for (const client of demoClients) {
            await dbAdd(STORE_CLIENTS, client);
        }
    }
}

// ============== CONFIGURACIÓN ==============
async function loadConfig() {
    const config = await dbGet(STORE_CONFIG, 'main');
    if (config) {
        document.getElementById('config-business-name').value = config.businessName || 'Colibrí Boba Tea';
        document.getElementById('config-currency').value = config.currency || 'CLP';
        document.getElementById('config-tax').value = config.tax || 0;
    }
}

async function saveConfig() {
    const config = {
        key: 'main',
        businessName: document.getElementById('config-business-name').value,
        currency: document.getElementById('config-currency').value,
        tax: parseFloat(document.getElementById('config-tax').value) || 0
    };

    await dbPut(STORE_CONFIG, config);
    showToast('⚙️ Configuración guardada', 'success');
}

// ============== EVENT LISTENERS ==============
function setupEventListeners() {
    // Menú
    document.getElementById('menu-btn').addEventListener('click', openSidebar);
    document.getElementById('close-sidebar').addEventListener('click', closeSidebar);
    document.getElementById('sidebar-overlay').addEventListener('click', closeSidebar);

    // Navegación
    document.querySelectorAll('.menu-list li').forEach(item => {
        item.addEventListener('click', () => {
            const module = item.dataset.module;
            loadModule(module);
            closeSidebar();
        });
    });

    // Carrito
    document.getElementById('cart-toggle-btn').addEventListener('click', toggleCart);
    document.getElementById('close-cart').addEventListener('click', toggleCart);

    // Notificaciones
    document.getElementById('notif-btn').addEventListener('click', () => {
        openModal('notifications-modal');
        loadNotifications();
    });

    // Productos
    document.getElementById('add-product-btn').addEventListener('click', () => openProductModal());
    document.getElementById('save-product-btn').addEventListener('click', saveProduct);
    document.getElementById('product-search').addEventListener('input', (e) => loadProducts(e.target.value));

    // Venta rápida
    document.getElementById('save-quick-sale-btn').addEventListener('click', saveQuickSale);

    // Inventario
    document.getElementById('inventory-add-btn').addEventListener('click', () => openProductModal());
    document.getElementById('inventory-search').addEventListener('input', (e) => loadInventory(e.target.value));

    // Clientes
    document.getElementById('add-client-btn').addEventListener('click', () => openClientModal());
    document.getElementById('save-client-btn').addEventListener('click', saveClient);
    document.getElementById('client-search').addEventListener('input', (e) => loadClients(e.target.value));

    // Deudas
    document.getElementById('save-debt-btn').addEventListener('click', saveDebt);
    document.getElementById('save-payment-btn').addEventListener('click', savePayment);

    // Calculadora
    document.querySelectorAll('.calc-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const value = parseInt(btn.dataset.value);
            const receivedInput = document.getElementById('calc-received');
            const current = parseInt(receivedInput.value) || 0;
            receivedInput.value = current + value;
            calculateChange();
        });
    });

    document.getElementById('calc-received').addEventListener('input', calculateChange);
    document.getElementById('calc-clear').addEventListener('click', () => {
        document.getElementById('calc-received').value = '';
        calculateChange();
    });

    // Configuración
    document.getElementById('save-config-btn').addEventListener('click', saveConfig);
    document.getElementById('export-data-btn').addEventListener('click', exportData);
    document.getElementById('clear-data-btn').addEventListener('click', () => {
        showConfirm('¿Eliminar TODOS los datos? Esta acción no se puede deshacer.', clearAllData);
    });

    // Métodos de pago
    document.querySelectorAll('.payment-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.payment-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentPaymentMethod = btn.id.replace('pay-', '');
        });
    });

    // Checkout
    document.getElementById('checkout-btn').addEventListener('click', processCheckout);

    // Cerrar modales
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            closeModal(modal.id);
        });
    });

    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal(modal.id);
        });
    });

    // Confirmación
    document.getElementById('confirm-yes').addEventListener('click', () => {
        if (deleteCallback) deleteCallback();
        closeModal('confirm-modal');
    });

    document.getElementById('confirm-no').addEventListener('click', () => {
        closeModal('confirm-modal');
    });

    // Preview de cuotas
    document.getElementById('debt-amount').addEventListener('input', updateInstallmentPreview);
    document.getElementById('debt-installments').addEventListener('input', updateInstallmentPreview);

    // Preview de imagen
    document.getElementById('product-image-file').addEventListener('change', previewImageFile);
    document.getElementById('product-image-url').addEventListener('input', previewImageUrl);
}

// ============== NAVEGACIÓN ==============
function openSidebar() {
    document.getElementById('sidebar').classList.add('open');
    document.getElementById('sidebar-overlay').classList.add('active');
}

function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-overlay').classList.remove('active');
}

function loadModule(module) {
    currentModule = module;

    // Actualizar menú
    document.querySelectorAll('.menu-list li').forEach(item => {
        item.classList.toggle('active', item.dataset.module === module);
    });

    // Actualizar título
    const titles = {
        productos: '🧋 Productos',
        ventas: '💰 Ventas',
        inventario: '📦 Inventario',
        clientes: '👥 Clientes',
        deudas: '💳 Deudas / Créditos',
        catalogo: '🌐 Catálogo Web',
        config: '⚙️ Configuración'
    };

    document.getElementById('module-title').textContent = titles[module] || module;

    // Mostrar módulo
    document.querySelectorAll('.module').forEach(m => m.classList.remove('active'));
    document.getElementById(`module-${module}`).classList.add('active');

    // Cargar datos específicos
    switch(module) {
        case 'productos':
            loadProducts();
            break;
        case 'ventas':
            loadSales();
            break;
        case 'inventario':
            loadInventory();
            break;
        case 'clientes':
            loadClients();
            break;
        case 'deudas':
            loadDebts();
            break;
    }
}

// ============== MODALES ==============
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
    document.body.style.overflow = '';
}

function showConfirm(message, callback) {
    document.getElementById('confirm-message').textContent = message;
    deleteCallback = callback;
    openModal('confirm-modal');
}

// ============== PRODUCTOS ==============
async function loadProducts(search = '') {
    const products = await dbGetAll(STORE_PRODUCTS);
    const grid = document.getElementById('products-grid');

    const filtered = search 
        ? products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
        : products;

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1;">
                <div class="empty-state-icon">🧋</div>
                <p class="empty-state-text">No hay productos${search ? ' que coincidan' : ''}</p>
                <button class="btn-primary" onclick="openProductModal()">+ Agregar Producto</button>
            </div>
        `;
        return;
    }

    grid.innerHTML = filtered.map(product => `
        <div class="product-card" onclick="addToCart(${product.id})" data-id="${product.id}">
            <div class="product-image">
                ${product.image ? `<img src="${product.image}" alt="${product.name}" loading="lazy" onerror="this.parentElement.innerHTML='🧋'">` : '🧋'}
            </div>
            <div class="product-info">
                <div class="product-name">${product.name}</div>
                <div class="product-price">${formatMoney(product.price)}</div>
                <div class="product-stock ${product.stock <= 5 ? 'low' : ''}">
                    ${product.stock} en stock
                </div>
            </div>
        </div>
    `).join('');
}

function openProductModal(product = null) {
    const modal = document.getElementById('product-modal');
    const title = document.getElementById('product-modal-title');

    if (product) {
        title.textContent = 'Editar Producto';
        document.getElementById('product-id').value = product.id;
        document.getElementById('product-name').value = product.name;
        document.getElementById('product-price').value = product.price;
        document.getElementById('product-cost').value = product.cost || '';
        document.getElementById('product-stock').value = product.stock;
        document.getElementById('product-category').value = product.category;
        document.getElementById('product-image-url').value = product.image || '';

        const preview = document.getElementById('image-preview');
        if (product.image) {
            preview.innerHTML = `<img src="${product.image}" alt="Preview">`;
        } else {
            preview.innerHTML = '';
        }
    } else {
        title.textContent = 'Nuevo Producto';
        document.getElementById('product-id').value = '';
        document.getElementById('product-name').value = '';
        document.getElementById('product-price').value = '';
        document.getElementById('product-cost').value = '';
        document.getElementById('product-stock').value = '0';
        document.getElementById('product-category').value = 'bubble-tea';
        document.getElementById('product-image-url').value = '';
        document.getElementById('image-preview').innerHTML = '';
    }

    openModal('product-modal');
}

async function saveProduct() {
    const id = document.getElementById('product-id').value;
    const name = document.getElementById('product-name').value.trim();
    const price = parseFloat(document.getElementById('product-price').value);
    const cost = parseFloat(document.getElementById('product-cost').value) || 0;
    const stock = parseInt(document.getElementById('product-stock').value) || 0;
    const category = document.getElementById('product-category').value;
    const imageUrl = document.getElementById('product-image-url').value.trim();

    if (!name || !price) {
        showToast('❌ Nombre y precio son obligatorios', 'error');
        return;
    }

    const product = {
        name,
        price,
        cost,
        stock,
        category,
        image: imageUrl,
        updatedAt: new Date().toISOString()
    };

    if (id) {
        product.id = parseInt(id);
        const existing = await dbGet(STORE_PRODUCTS, product.id);
        product.createdAt = existing.createdAt;
        await dbPut(STORE_PRODUCTS, product);
        showToast('✅ Producto actualizado', 'success');
    } else {
        product.createdAt = new Date().toISOString();
        await dbAdd(STORE_PRODUCTS, product);
        showToast('✅ Producto creado', 'success');
    }

    closeModal('product-modal');
    loadProducts();
    if (currentModule === 'inventario') loadInventory();
}

function previewImageFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        document.getElementById('product-image-url').value = event.target.result;
        document.getElementById('image-preview').innerHTML = `<img src="${event.target.result}" alt="Preview">`;
    };
    reader.readAsDataURL(file);
}

function previewImageUrl(e) {
    const url = e.target.value.trim();
    const preview = document.getElementById('image-preview');
    if (url) {
        preview.innerHTML = `<img src="${url}" alt="Preview" onerror="this.style.display='none'">`;
    } else {
        preview.innerHTML = '';
    }
}

// ============== CARRITO ==============
function addToCart(productId) {
    const product = cart.find(item => item.id === productId);

    if (product) {
        product.qty++;
    } else {
        cart.push({ id: productId, qty: 1 });
    }

    updateCartUI();
    showToast('🛒 Agregado al carrito', 'success');
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    updateCartUI();
}

function updateCartQty(productId, delta) {
    const item = cart.find(i => i.id === productId);
    if (!item) return;

    item.qty += delta;

    if (item.qty <= 0) {
        removeFromCart(productId);
        return;
    }

    updateCartUI();
}

async function updateCartUI() {
    const cartItems = document.getElementById('cart-items');
    const cartCount = document.getElementById('cart-count');
    const cartTotal = document.getElementById('cart-total-amount');

    if (cart.length === 0) {
        cartItems.innerHTML = '<p class="empty-cart">Carrito vacío</p>';
        cartCount.textContent = '0';
        cartCount.style.display = 'none';
        cartTotal.textContent = formatMoney(0);
        return;
    }

    const products = await dbGetAll(STORE_PRODUCTS);
    let total = 0;
    let count = 0;

    const itemsHTML = await Promise.all(cart.map(async item => {
        const product = products.find(p => p.id === item.id);
        if (!product) return '';

        const itemTotal = product.price * item.qty;
        total += itemTotal;
        count += item.qty;

        return `
            <div class="cart-item">
                <div class="cart-item-image">
                    ${product.image ? `<img src="${product.image}" alt="${product.name}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;">` : '🧋'}
                </div>
                <div class="cart-item-info">
                    <div class="cart-item-name">${product.name}</div>
                    <div class="cart-item-price">${formatMoney(product.price)} c/u</div>
                </div>
                <div class="cart-item-qty">
                    <button class="qty-btn" onclick="updateCartQty(${item.id}, -1)">−</button>
                    <span>${item.qty}</span>
                    <button class="qty-btn" onclick="updateCartQty(${item.id}, 1)">+</button>
                </div>
                <div class="cart-item-total">${formatMoney(itemTotal)}</div>
            </div>
        `;
    }));

    cartItems.innerHTML = itemsHTML.join('');
    cartCount.textContent = count;
    cartCount.style.display = count > 0 ? 'flex' : 'none';
    cartTotal.textContent = formatMoney(total);
}

function toggleCart() {
    document.getElementById('floating-cart').classList.toggle('open');
}

// ============== CHECKOUT ==============
async function processCheckout() {
    if (cart.length === 0) {
        showToast('❌ El carrito está vacío', 'error');
        return;
    }

    const products = await dbGetAll(STORE_PRODUCTS);
    let total = 0;
    const items = [];

    for (const cartItem of cart) {
        const product = products.find(p => p.id === cartItem.id);
        if (!product) continue;

        const itemTotal = product.price * cartItem.qty;
        total += itemTotal;

        items.push({
            productId: product.id,
            name: product.name,
            price: product.price,
            qty: cartItem.qty,
            total: itemTotal
        });

        // Actualizar stock
        product.stock -= cartItem.qty;
        await dbPut(STORE_PRODUCTS, product);
    }

    // Si es fiado, mostrar selector de cliente
    if (currentPaymentMethod === 'fiado') {
        const clients = await dbGetAll(STORE_CLIENTS);
        if (clients.length === 0) {
            showToast('❌ No hay clientes registrados para fiar', 'error');
            return;
        }

        const clientName = prompt(`Selecciona cliente para fiado:
${clients.map((c, i) => `${i + 1}. ${c.name}`).join('\n')}

Ingresa el número:`);
        const clientIndex = parseInt(clientName) - 1;

        if (clientIndex >= 0 && clientIndex < clients.length) {
            const client = clients[clientIndex];

            // Crear deuda
            const debt = {
                clientId: client.id,
                clientName: client.name,
                amount: total,
                paid: 0,
                remaining: total,
                installments: 1,
                status: 'pending',
                description: `Venta fiada: ${items.map(i => i.name).join(', ')}`,
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                createdAt: new Date().toISOString()
            };

            await dbAdd(STORE_DEBTS, debt);
            showToast(`📝 Fiado registrado para ${client.name}`, 'success');
        }
    }

    // Registrar venta
    const sale = {
        items,
        total,
        paymentMethod: currentPaymentMethod,
        date: new Date().toISOString(),
        timestamp: Date.now()
    };

    await dbAdd(STORE_SALES, sale);

    // Limpiar carrito
    cart = [];
    updateCartUI();
    toggleCart();

    // Mostrar calculadora de vuelto si es efectivo
    if (currentPaymentMethod === 'efectivo') {
        showCalculator(total);
    }

    showToast(`✅ Venta completada: ${formatMoney(total)}`, 'success');

    // Actualizar vistas
    if (currentModule === 'productos') loadProducts();
    if (currentModule === 'ventas') loadSales();
    if (currentModule === 'inventario') loadInventory();
}

function showCalculator(total) {
    document.getElementById('calc-total').textContent = formatMoney(total);
    document.getElementById('calc-received').value = '';
    document.getElementById('calc-change').textContent = '$0';
    openModal('calculator-modal');
}

function calculateChange() {
    const totalText = document.getElementById('calc-total').textContent;
    const total = parseMoney(totalText);
    const received = parseFloat(document.getElementById('calc-received').value) || 0;
    const change = received - total;

    document.getElementById('calc-change').textContent = formatMoney(change > 0 ? change : 0);
    document.getElementById('calc-change').style.color = change >= 0 ? '#ffd93d' : '#e74c3c';
}

// ============== VENTAS ==============
async function loadSales() {
    const sales = await dbGetAll(STORE_SALES);
    const list = document.getElementById('sales-list');

    // Calcular estadísticas
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

    let todayTotal = 0, weekTotal = 0, monthTotal = 0;

    sales.forEach(sale => {
        const saleDate = new Date(sale.date);
        if (sale.date.startsWith(today)) todayTotal += sale.total;
        if (saleDate >= weekAgo) weekTotal += sale.total;
        if (saleDate >= monthAgo) monthTotal += sale.total;
    });

    document.getElementById('today-sales').textContent = formatMoney(todayTotal);
    document.getElementById('week-sales').textContent = formatMoney(weekTotal);
    document.getElementById('month-sales').textContent = formatMoney(monthTotal);

    // Ordenar por fecha descendente
    sales.sort((a, b) => b.timestamp - a.timestamp);

    if (sales.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">💰</div>
                <p class="empty-state-text">No hay ventas registradas</p>
            </div>
        `;
        return;
    }

    list.innerHTML = sales.map(sale => {
        const date = new Date(sale.date);
        const timeStr = date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
        const dateStr = date.toLocaleDateString('es-CL');
        const paymentIcons = {
            efectivo: '💵',
            tarjeta: '💳',
            transferencia: '📱',
            fiado: '📝'
        };

        return `
            <div class="list-item">
                <div class="list-icon">${paymentIcons[sale.paymentMethod] || '💰'}</div>
                <div class="list-content">
                    <div class="list-title">${sale.items.map(i => i.name).join(', ')}</div>
                    <div class="list-subtitle">${dateStr} ${timeStr} • ${sale.items.length} productos</div>
                </div>
                <div class="list-amount">${formatMoney(sale.total)}</div>
            </div>
        `;
    }).join('');
}

// ============== INVENTARIO ==============
async function loadInventory(search = '') {
    const products = await dbGetAll(STORE_PRODUCTS);
    const list = document.getElementById('inventory-list');

    const filtered = search
        ? products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
        : products;

    // Ordenar por nombre
    filtered.sort((a, b) => a.name.localeCompare(b.name));

    if (filtered.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📦</div>
                <p class="empty-state-text">No hay productos en inventario</p>
            </div>
        `;
        return;
    }

    list.innerHTML = filtered.map(product => `
        <div class="list-item">
            <div class="list-icon">${getCategoryEmoji(product.category)}</div>
            <div class="list-content">
                <div class="list-title">${product.name}</div>
                <div class="list-subtitle">
                    Stock: <strong class="${product.stock <= 5 ? 'low' : ''}">${product.stock}</strong> • 
                    Costo: ${formatMoney(product.cost)} • 
                    Venta: ${formatMoney(product.price)}
                </div>
            </div>
            <div class="list-actions">
                <button class="action-btn edit" onclick="editProduct(${product.id})">✏️</button>
                <button class="action-btn delete" onclick="deleteProduct(${product.id})">🗑️</button>
            </div>
        </div>
    `).join('');
}

function getCategoryEmoji(category) {
    const emojis = {
        'bubble-tea': '🧋',
        'smoothie': '🥤',
        'coffee': '☕',
        'postre': '🍰',
        'otro': '📦'
    };
    return emojis[category] || '📦';
}

async function editProduct(id) {
    const product = await dbGet(STORE_PRODUCTS, id);
    if (product) {
        openProductModal(product);
    }
}

async function deleteProduct(id) {
    showConfirm('¿Eliminar este producto?', async () => {
        await dbDelete(STORE_PRODUCTS, id);
        showToast('🗑️ Producto eliminado', 'success');
        loadInventory();
        if (currentModule === 'productos') loadProducts();
    });
}

// ============== CLIENTES ==============
async function loadClients(search = '') {
    const clients = await dbGetAll(STORE_CLIENTS);
    const list = document.getElementById('clients-list');

    const filtered = search
        ? clients.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
        : clients;

    // Ordenar alfabéticamente
    filtered.sort((a, b) => a.name.localeCompare(b.name));

    if (filtered.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">👥</div>
                <p class="empty-state-text">No hay clientes registrados</p>
                <button class="btn-primary" onclick="openClientModal()">+ Agregar Cliente</button>
            </div>
        `;
        return;
    }

    list.innerHTML = filtered.map(client => `
        <div class="list-item">
            <div class="list-icon">👤</div>
            <div class="list-content">
                <div class="list-title">${client.name}</div>
                <div class="list-subtitle">${client.phone || 'Sin teléfono'} • ${client.email || 'Sin email'}</div>
            </div>
            <div class="list-actions">
                <button class="action-btn edit" onclick="editClient(${client.id})">✏️</button>
                <button class="action-btn delete" onclick="deleteClient(${client.id})">🗑️</button>
            </div>
        </div>
    `).join('');
}

function openClientModal(client = null) {
    const modal = document.getElementById('client-modal');
    const title = document.getElementById('client-modal-title');

    if (client) {
        title.textContent = 'Editar Cliente';
        document.getElementById('client-id').value = client.id;
        document.getElementById('client-name').value = client.name;
        document.getElementById('client-phone').value = client.phone || '';
        document.getElementById('client-email').value = client.email || '';
        document.getElementById('client-address').value = client.address || '';
        document.getElementById('client-notes').value = client.notes || '';
    } else {
        title.textContent = 'Nuevo Cliente';
        document.getElementById('client-id').value = '';
        document.getElementById('client-name').value = '';
        document.getElementById('client-phone').value = '';
        document.getElementById('client-email').value = '';
        document.getElementById('client-address').value = '';
        document.getElementById('client-notes').value = '';
    }

    openModal('client-modal');
}

async function saveClient() {
    const id = document.getElementById('client-id').value;
    const name = document.getElementById('client-name').value.trim();
    const phone = document.getElementById('client-phone').value.trim();
    const email = document.getElementById('client-email').value.trim();
    const address = document.getElementById('client-address').value.trim();
    const notes = document.getElementById('client-notes').value.trim();

    if (!name) {
        showToast('❌ El nombre es obligatorio', 'error');
        return;
    }

    const client = {
        name,
        phone,
        email,
        address,
        notes,
        updatedAt: new Date().toISOString()
    };

    if (id) {
        client.id = parseInt(id);
        const existing = await dbGet(STORE_CLIENTS, client.id);
        client.createdAt = existing.createdAt;
        await dbPut(STORE_CLIENTS, client);
        showToast('✅ Cliente actualizado', 'success');
    } else {
        client.createdAt = new Date().toISOString();
        await dbAdd(STORE_CLIENTS, client);
        showToast('✅ Cliente creado', 'success');
    }

    closeModal('client-modal');
    loadClients();
}

async function editClient(id) {
    const client = await dbGet(STORE_CLIENTS, id);
    if (client) {
        openClientModal(client);
    }
}

async function deleteClient(id) {
    showConfirm('¿Eliminar este cliente?', async () => {
        await dbDelete(STORE_CLIENTS, id);
        showToast('🗑️ Cliente eliminado', 'success');
        loadClients();
    });
}

// ============== DEUDAS ==============
async function loadDebts() {
    const debts = await dbGetAll(STORE_DEBTS);
    const payments = await dbGetAll(STORE_PAYMENTS);
    const list = document.getElementById('debts-list');

    // Calcular totales
    let totalDebt = 0;
    let totalPaid = 0;

    debts.forEach(debt => {
        totalDebt += debt.amount;
        totalPaid += debt.paid || 0;
    });

    document.getElementById('total-debt').textContent = formatMoney(totalDebt);
    document.getElementById('total-paid').textContent = formatMoney(totalPaid);

    // Ordenar por fecha descendente
    debts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (debts.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">💳</div>
                <p class="empty-state-text">No hay deudas registradas</p>
                <button class="btn-primary" onclick="openDebtModal()">+ Registrar Deuda</button>
            </div>
        `;
        return;
    }

    list.innerHTML = debts.map(debt => {
        const status = getDebtStatus(debt);
        const progress = debt.amount > 0 ? ((debt.paid || 0) / debt.amount * 100).toFixed(0) : 0;

        return `
            <div class="list-item">
                <div class="list-content" style="flex:1;">
                    <div class="list-title">${debt.clientName || 'Cliente desconocido'}</div>
                    <div class="list-subtitle">
                        ${debt.description || 'Sin descripción'}<br>
                        Vence: ${debt.dueDate || 'Sin fecha'} • 
                        <span class="debt-status ${status.class}">${status.text}</span>
                    </div>
                    <div style="margin-top:8px;background:rgba(255,255,255,0.1);border-radius:4px;height:6px;overflow:hidden;">
                        <div style="width:${progress}%;height:100%;background:linear-gradient(90deg, var(--primary), var(--secondary));transition:width 0.3s;"></div>
                    </div>
                    <div style="font-size:12px;color:rgba(255,255,255,0.5);margin-top:4px;">
                        Pagado: ${formatMoney(debt.paid || 0)} de ${formatMoney(debt.amount)} (${progress}%)
                    </div>
                </div>
                <div class="list-actions" style="flex-direction:column;gap:6px;">
                    <button class="action-btn edit" onclick="payDebt(${debt.id})" title="Registrar pago">💵</button>
                    <button class="action-btn edit" onclick="viewDebtHistory(${debt.id})" title="Ver historial">📋</button>
                    <button class="action-btn delete" onclick="deleteDebt(${debt.id})" title="Eliminar">🗑️</button>
                </div>
            </div>
        `;
    }).join('');
}

function getDebtStatus(debt) {
    if (debt.remaining <= 0) return { text: 'Pagado', class: 'paid' };

    const dueDate = new Date(debt.dueDate);
    const now = new Date();

    if (dueDate < now && debt.remaining > 0) {
        return { text: 'Vencido', class: 'overdue' };
    }

    return { text: 'Pendiente', class: 'pending' };
}

async function openDebtModal() {
    const clients = await dbGetAll(STORE_CLIENTS);
    const select = document.getElementById('debt-client');

    select.innerHTML = '<option value="">Seleccionar cliente...</option>' +
        clients.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

    // Resetear campos
    document.getElementById('debt-id').value = '';
    document.getElementById('debt-amount').value = '';
    document.getElementById('debt-installments').value = '1';
    document.getElementById('debt-due-date').value = '';
    document.getElementById('debt-description').value = '';
    document.getElementById('installment-preview').innerHTML = '';

    openModal('debt-modal');
}

function updateInstallmentPreview() {
    const amount = parseFloat(document.getElementById('debt-amount').value) || 0;
    const installments = parseInt(document.getElementById('debt-installments').value) || 1;
    const preview = document.getElementById('installment-preview');

    if (amount <= 0 || installments <= 0) {
        preview.innerHTML = '';
        return;
    }

    const installmentAmount = Math.round(amount / installments);
    const dueDate = document.getElementById('debt-due-date').value;

    let html = '<h4>📅 Vista previa de cuotas:</h4>';

    for (let i = 1; i <= installments; i++) {
        let dateStr = 'Fecha por definir';
        if (dueDate) {
            const date = new Date(dueDate);
            date.setMonth(date.getMonth() + (i - 1));
            dateStr = date.toLocaleDateString('es-CL');
        }

        html += `
            <div class="installment-item">
                <span>Cuota ${i} de ${installments}</span>
                <span><strong>${formatMoney(installmentAmount)}</strong> - ${dateStr}</span>
            </div>
        `;
    }

    preview.innerHTML = html;
}

async function saveDebt() {
    const clientId = parseInt(document.getElementById('debt-client').value);
    const amount = parseFloat(document.getElementById('debt-amount').value);
    const installments = parseInt(document.getElementById('debt-installments').value) || 1;
    const dueDate = document.getElementById('debt-due-date').value;
    const description = document.getElementById('debt-description').value.trim();

    if (!clientId || !amount) {
        showToast('❌ Cliente y monto son obligatorios', 'error');
        return;
    }

    const clients = await dbGetAll(STORE_CLIENTS);
    const client = clients.find(c => c.id === clientId);

    const debt = {
        clientId,
        clientName: client ? client.name : 'Desconocido',
        amount,
        paid: 0,
        remaining: amount,
        installments,
        installmentAmount: Math.round(amount / installments),
        status: 'pending',
        description,
        dueDate: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        createdAt: new Date().toISOString()
    };

    await dbAdd(STORE_DEBTS, debt);
    showToast('✅ Deuda registrada correctamente', 'success');

    closeModal('debt-modal');
    loadDebts();
}

async function payDebt(debtId) {
    const debt = await dbGet(STORE_DEBTS, debtId);
    if (!debt) return;

    document.getElementById('payment-debt-id').value = debtId;
    document.getElementById('payment-amount').value = debt.remaining;
    document.getElementById('payment-method').value = 'efectivo';
    document.getElementById('payment-note').value = '';

    openModal('payment-modal');
}

async function savePayment() {
    const debtId = parseInt(document.getElementById('payment-debt-id').value);
    const amount = parseFloat(document.getElementById('payment-amount').value);
    const method = document.getElementById('payment-method').value;
    const note = document.getElementById('payment-note').value.trim();

    if (!debtId || !amount || amount <= 0) {
        showToast('❌ Monto inválido', 'error');
        return;
    }

    const debt = await dbGet(STORE_DEBTS, debtId);
    if (!debt) {
        showToast('❌ Deuda no encontrada', 'error');
        return;
    }

    // Registrar pago
    const payment = {
        debtId,
        amount,
        method,
        note,
        date: new Date().toISOString(),
        timestamp: Date.now()
    };

    await dbAdd(STORE_PAYMENTS, payment);

    // Actualizar deuda
    debt.paid = (debt.paid || 0) + amount;
    debt.remaining = Math.max(0, debt.amount - debt.paid);

    if (debt.remaining <= 0) {
        debt.status = 'paid';
    }

    await dbPut(STORE_DEBTS, debt);

    showToast(`✅ Pago de ${formatMoney(amount)} registrado`, 'success');

    closeModal('payment-modal');
    loadDebts();
}

async function viewDebtHistory(debtId) {
    const payments = await dbGetAll(STORE_PAYMENTS);
    const debtPayments = payments.filter(p => p.debtId === debtId).sort((a, b) => b.timestamp - a.timestamp);

    if (debtPayments.length === 0) {
        showToast('ℹ️ No hay pagos registrados para esta deuda', 'warning');
        return;
    }

    const history = debtPayments.map(p => {
        const date = new Date(p.date);
        return `📅 ${date.toLocaleDateString('es-CL')} ${date.toLocaleTimeString('es-CL')} - ${formatMoney(p.amount)} (${p.method})${p.note ? ' - ' + p.note : ''}`;
    }).join('\n');

    alert(`📋 Historial de Pagos:\n\n${history}`);
}

async function deleteDebt(id) {
    showConfirm('¿Eliminar esta deuda y todo su historial?', async () => {
        // Eliminar pagos asociados
        const payments = await dbGetAll(STORE_PAYMENTS);
        for (const payment of payments.filter(p => p.debtId === id)) {
            await dbDelete(STORE_PAYMENTS, payment.id);
        }

        await dbDelete(STORE_DEBTS, id);
        showToast('🗑️ Deuda eliminada', 'success');
        loadDebts();
    });
}

// ============== NOTIFICACIONES ==============
async function loadNotifications() {
    const debts = await dbGetAll(STORE_DEBTS);
    const notifications = [];
    const now = new Date();

    // Deudas vencidas
    debts.forEach(debt => {
        if (debt.status !== 'paid') {
            const dueDate = new Date(debt.dueDate);
            const daysDiff = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

            if (daysDiff <= 3 && daysDiff >= 0) {
                notifications.push({
                    type: 'warning',
                    title: 'Deuda próxima a vencer',
                    text: `${debt.clientName} - ${formatMoney(debt.remaining)} - Vence en ${daysDiff} días`,
                    time: new Date().toISOString()
                });
            } else if (daysDiff < 0) {
                notifications.push({
                    type: 'error',
                    title: 'Deuda vencida',
                    text: `${debt.clientName} - ${formatMoney(debt.remaining)} - Venció hace ${Math.abs(daysDiff)} días`,
                    time: new Date().toISOString()
                });
            }
        }
    });

    // Stock bajo
    const products = await dbGetAll(STORE_PRODUCTS);
    products.forEach(product => {
        if (product.stock <= 5) {
            notifications.push({
                type: 'warning',
                title: 'Stock bajo',
                text: `${product.name} - Solo quedan ${product.stock} unidades`,
                time: new Date().toISOString()
            });
        }
    });

    const list = document.getElementById('notifications-list');
    const count = document.getElementById('notif-count');

    count.textContent = notifications.length;
    count.style.display = notifications.length > 0 ? 'flex' : 'none';

    if (notifications.length === 0) {
        list.innerHTML = '<p class="empty-notifications">No hay notificaciones</p>';
        return;
    }

    list.innerHTML = notifications.map(n => {
        const icons = { warning: '⚠️', error: '❌', success: '✅' };
        const date = new Date(n.time);

        return `
            <div class="notification-item ${n.type === 'error' ? 'unread' : ''}">
                <div class="notification-icon">${icons[n.type] || 'ℹ️'}</div>
                <div class="notification-content">
                    <div class="notification-title">${n.title}</div>
                    <div class="notification-text">${n.text}</div>
                    <div class="notification-time">${date.toLocaleTimeString('es-CL')}</div>
                </div>
            </div>
        `;
    }).join('');
}

// ============== UTILIDADES ==============
function formatMoney(amount) {
    if (amount === undefined || amount === null) return '$0';
    return '$' + Math.round(amount).toLocaleString('es-CL');
}

function parseMoney(str) {
    if (!str) return 0;
    return parseInt(str.replace(/[^\d]/g, '')) || 0;
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'toastOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 2700);
}

async function exportData() {
    const data = {
        products: await dbGetAll(STORE_PRODUCTS),
        sales: await dbGetAll(STORE_SALES),
        clients: await dbGetAll(STORE_CLIENTS),
        debts: await dbGetAll(STORE_DEBTS),
        payments: await dbGetAll(STORE_PAYMENTS),
        config: await dbGet(STORE_CONFIG, 'main'),
        exportDate: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `colibri_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    showToast('📥 Datos exportados correctamente', 'success');
}

async function clearAllData() {
    const stores = [STORE_PRODUCTS, STORE_SALES, STORE_CLIENTS, STORE_DEBTS, STORE_PAYMENTS];

    for (const store of stores) {
        const items = await dbGetAll(store);
        for (const item of items) {
            await dbDelete(store, item.id);
        }
    }

    showToast('🗑️ Todos los datos eliminados', 'success');

    // Recargar datos de prueba
    await loadDemoData();

    // Recargar vista actual
    loadModule(currentModule);
}

// ============== VENTA RÁPIDA ==============
async function saveQuickSale() {
    const product = document.getElementById('quick-sale-product').value.trim();
    const price = parseFloat(document.getElementById('quick-sale-price').value);
    const qty = parseInt(document.getElementById('quick-sale-qty').value) || 1;
    const payment = document.getElementById('quick-sale-payment').value;

    if (!product || !price) {
        showToast('❌ Producto y precio son obligatorios', 'error');
        return;
    }

    const total = price * qty;

    const sale = {
        items: [{ productId: null, name: product, price, qty, total }],
        total,
        paymentMethod: payment,
        date: new Date().toISOString(),
        timestamp: Date.now()
    };

    await dbAdd(STORE_SALES, sale);

    showToast(`✅ Venta rápida: ${formatMoney(total)}`, 'success');
    closeModal('quick-sale-modal');

    if (currentModule === 'ventas') loadSales();
}

// ============== SERVICE WORKER ==============
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
        .then(reg => console.log('✅ Service Worker registrado'))
        .catch(err => console.log('❌ Error SW:', err));
}
