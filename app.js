/* ============================================
   COLIBRÍ BOBA TEA v3.0 - APP.JS CON BODEGA
   Módulo Ingredientes + Recetas integrado
   ============================================ */

const DB_NAME = 'colibri_boba_tea_db';
const DB_VERSION = 2;
const STORE_PRODUCTS = 'products';
const STORE_SALES = 'sales';
const STORE_CLIENTS = 'clients';
const STORE_DEBTS = 'debts';
const STORE_PAYMENTS = 'payments';
const STORE_CONFIG = 'config';
const STORE_INGREDIENTS = 'ingredients';
const STORE_RECIPES = 'recipes';

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
    ingredient: [
        'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&h=400&fit=crop',
        'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=400&fit=crop',
        'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400&h=400&fit=crop'
    ],
    logo: 'https://cdn-icons-png.flaticon.com/512/3081/3081840.png'
};

let db = null;
let cart = [];
let currentModule = 'productos';
let currentPaymentMethod = 'efectivo';
let deleteCallback = null;
let recipeItems = [];

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

async function initApp() {
    const splash = document.getElementById('splash-screen');
    const app = document.getElementById('app');

    try {
        db = await initDB();
        console.log('✅ IndexedDB v2 con Bodega inicializada');
    } catch (error) {
        console.error('❌ Error IndexedDB:', error);
        showToast('Error al inicializar base de datos', 'error');
    }

    await loadConfig();
    await loadDemoData();
    setupEventListeners();
    loadModule('productos');

    setTimeout(() => {
        splash.style.opacity = '0';
        setTimeout(() => {
            splash.style.display = 'none';
            app.style.display = 'flex';
        }, 500);
    }, 2000);
}

function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const database = event.target.result;
            const oldVersion = event.oldVersion;

            if (!database.objectStoreNames.contains(STORE_PRODUCTS)) {
                const ps = database.createObjectStore(STORE_PRODUCTS, { keyPath: 'id', autoIncrement: true });
                ps.createIndex('name', 'name', { unique: false });
                ps.createIndex('category', 'category', { unique: false });
            }
            if (!database.objectStoreNames.contains(STORE_SALES)) {
                const ss = database.createObjectStore(STORE_SALES, { keyPath: 'id', autoIncrement: true });
                ss.createIndex('date', 'date', { unique: false });
            }
            if (!database.objectStoreNames.contains(STORE_CLIENTS)) {
                const cs = database.createObjectStore(STORE_CLIENTS, { keyPath: 'id', autoIncrement: true });
                cs.createIndex('name', 'name', { unique: false });
            }
            if (!database.objectStoreNames.contains(STORE_DEBTS)) {
                const ds = database.createObjectStore(STORE_DEBTS, { keyPath: 'id', autoIncrement: true });
                ds.createIndex('clientId', 'clientId', { unique: false });
                ds.createIndex('status', 'status', { unique: false });
            }
            if (!database.objectStoreNames.contains(STORE_PAYMENTS)) {
                const ps = database.createObjectStore(STORE_PAYMENTS, { keyPath: 'id', autoIncrement: true });
                ps.createIndex('debtId', 'debtId', { unique: false });
            }
            if (!database.objectStoreNames.contains(STORE_CONFIG)) {
                database.createObjectStore(STORE_CONFIG, { keyPath: 'key' });
            }
            // 🆕 BODEGA
            if (!database.objectStoreNames.contains(STORE_INGREDIENTS)) {
                const is = database.createObjectStore(STORE_INGREDIENTS, { keyPath: 'id', autoIncrement: true });
                is.createIndex('name', 'name', { unique: false });
                is.createIndex('category', 'category', { unique: false });
            }
            // 🆕 RECETAS
            if (!database.objectStoreNames.contains(STORE_RECIPES)) {
                const rs = database.createObjectStore(STORE_RECIPES, { keyPath: 'id', autoIncrement: true });
                rs.createIndex('productId', 'productId', { unique: false });
            }
            console.log(`🔄 BD migrada: v${oldVersion} → v${DB_VERSION}`);
        };
    });
}

async function dbAdd(store, data) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction([store], 'readwrite');
        const os = tx.objectStore(store);
        const req = os.add(data);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function dbGetAll(store) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction([store], 'readonly');
        const os = tx.objectStore(store);
        const req = os.getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function dbGet(store, id) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction([store], 'readonly');
        const os = tx.objectStore(store);
        const req = os.get(id);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function dbPut(store, data) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction([store], 'readwrite');
        const os = tx.objectStore(store);
        const req = os.put(data);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function dbDelete(store, id) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction([store], 'readwrite');
        const os = tx.objectStore(store);
        const req = os.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}

async function loadDemoData() {
    // Productos
    const products = await dbGetAll(STORE_PRODUCTS);
    if (products.length === 0) {
        const demo = [
            { name: 'Bubble Tea Taro', price: 5500, cost: 2500, stock: 50, category: 'bubble-tea', image: DEMO_IMAGES.bubble_tea[0], createdAt: new Date().toISOString() },
            { name: 'Bubble Tea Matcha', price: 6000, cost: 2800, stock: 35, category: 'bubble-tea', image: DEMO_IMAGES.bubble_tea[1], createdAt: new Date().toISOString() },
            { name: 'Bubble Tea Fresa', price: 5000, cost: 2200, stock: 42, category: 'bubble-tea', image: DEMO_IMAGES.bubble_tea[2], createdAt: new Date().toISOString() },
            { name: 'Smoothie Mango', price: 4800, cost: 2000, stock: 30, category: 'smoothie', image: DEMO_IMAGES.smoothie[0], createdAt: new Date().toISOString() },
            { name: 'Smoothie Maracuyá', price: 5200, cost: 2300, stock: 25, category: 'smoothie', image: DEMO_IMAGES.smoothie[1], createdAt: new Date().toISOString() },
            { name: 'Café Helado', price: 4500, cost: 1800, stock: 60, category: 'coffee', image: DEMO_IMAGES.coffee[0], createdAt: new Date().toISOString() },
            { name: 'Latte Caramel', price: 5800, cost: 2600, stock: 40, category: 'coffee', image: DEMO_IMAGES.coffee[1], createdAt: new Date().toISOString() },
            { name: 'Cheesecake Oreo', price: 6500, cost: 3000, stock: 15, category: 'postre', image: DEMO_IMAGES.postre[0], createdAt: new Date().toISOString() },
            { name: 'Brownie Chocolate', price: 4800, cost: 2200, stock: 20, category: 'postre', image: DEMO_IMAGES.postre[1], createdAt: new Date().toISOString() }
        ];
        for (const p of demo) await dbAdd(STORE_PRODUCTS, p);
    }

    // Clientes
    const clients = await dbGetAll(STORE_CLIENTS);
    if (clients.length === 0) {
        const demo = [
            { name: 'María González', phone: '+56 9 1234 5678', email: 'maria@email.com', address: 'Santiago Centro', notes: 'Cliente frecuente', createdAt: new Date().toISOString() },
            { name: 'Carlos Rodríguez', phone: '+56 9 8765 4321', email: 'carlos@email.com', address: 'Providencia', notes: 'Paga puntual', createdAt: new Date().toISOString() },
            { name: 'Ana Silva', phone: '+56 9 5555 6666', email: 'ana@email.com', address: 'Las Condes', notes: 'Prefiere delivery', createdAt: new Date().toISOString() }
        ];
        for (const c of demo) await dbAdd(STORE_CLIENTS, c);
    }

    // 🆕 INGREDIENTES
    const ingredients = await dbGetAll(STORE_INGREDIENTS);
    if (ingredients.length === 0) {
        const demo = [
            { name: 'Perlas de Tapioca', category: 'tapioca', unit: 'kg', stock: 5, minStock: 1, cost: 8500, supplier: 'Proveedor Tapioca SA', location: 'Estante A1', image: DEMO_IMAGES.ingredient[0], createdAt: new Date().toISOString() },
            { name: 'Té Verde Matcha', category: 'te', unit: 'g', stock: 500, minStock: 100, cost: 12000, supplier: 'Importadora Japón', location: 'Estante B2', image: DEMO_IMAGES.ingredient[1], createdAt: new Date().toISOString() },
            { name: 'Leche Entera', category: 'lacteo', unit: 'L', stock: 20, minStock: 5, cost: 1200, supplier: 'Colun', location: 'Refrigerador', image: DEMO_IMAGES.ingredient[2], createdAt: new Date().toISOString() },
            { name: 'Leche Condensada', category: 'lacteo', unit: 'L', stock: 8, minStock: 2, cost: 3500, supplier: 'Nestlé', location: 'Refrigerador', image: DEMO_IMAGES.ingredient[2], createdAt: new Date().toISOString() },
            { name: 'Azúcar Morena', category: 'endulzante', unit: 'kg', stock: 10, minStock: 2, cost: 2500, supplier: 'Iansa', location: 'Estante A3', image: DEMO_IMAGES.ingredient[0], createdAt: new Date().toISOString() },
            { name: 'Jarabe de Taro', category: 'saborizante', unit: 'L', stock: 3, minStock: 1, cost: 15000, supplier: 'Taiwan Imports', location: 'Estante C1', image: DEMO_IMAGES.ingredient[1], createdAt: new Date().toISOString() },
            { name: 'Jarabe de Fresa', category: 'saborizante', unit: 'L', stock: 4, minStock: 1, cost: 12000, supplier: 'Taiwan Imports', location: 'Estante C1', image: DEMO_IMAGES.ingredient[1], createdAt: new Date().toISOString() },
            { name: 'Crema para Batir', category: 'lacteo', unit: 'L', stock: 6, minStock: 2, cost: 4500, supplier: 'Nestlé', location: 'Refrigerador', image: DEMO_IMAGES.ingredient[2], createdAt: new Date().toISOString() },
            { name: 'Hielo', category: 'otro', unit: 'kg', stock: 50, minStock: 10, cost: 500, supplier: 'Fábrica Local', location: 'Congelador', image: DEMO_IMAGES.ingredient[0], createdAt: new Date().toISOString() },
            { name: 'Vasos 500ml', category: 'empaque', unit: 'un', stock: 200, minStock: 50, cost: 80, supplier: 'Packaging Chile', location: 'Estante D1', image: DEMO_IMAGES.ingredient[0], createdAt: new Date().toISOString() },
            { name: 'Popotes Ancho', category: 'empaque', unit: 'un', stock: 300, minStock: 100, cost: 30, supplier: 'Packaging Chile', location: 'Estante D1', image: DEMO_IMAGES.ingredient[0], createdAt: new Date().toISOString() },
            { name: 'Tapas Domo', category: 'empaque', unit: 'un', stock: 200, minStock: 50, cost: 40, supplier: 'Packaging Chile', location: 'Estante D1', image: DEMO_IMAGES.ingredient[0], createdAt: new Date().toISOString() }
        ];
        for (const i of demo) await dbAdd(STORE_INGREDIENTS, i);
        showToast('📦 Ingredientes de bodega cargados', 'success');
    }

    // 🆕 RECETAS
    const recipes = await dbGetAll(STORE_RECIPES);
    if (recipes.length === 0) {
        const allProducts = await dbGetAll(STORE_PRODUCTS);
        const allIngredients = await dbGetAll(STORE_INGREDIENTS);

        const findProd = (name) => allProducts.find(p => p.name.includes(name))?.id;
        const findIng = (name) => allIngredients.find(i => i.name.includes(name))?.id;

        const demo = [
            {
                productId: findProd('Taro'),
                name: 'Bubble Tea Taro',
                items: [
                    { ingredientId: findIng('Tapioca'), amount: 0.05, unit: 'kg' },
                    { ingredientId: findIng('Taro'), amount: 0.03, unit: 'L' },
                    { ingredientId: findIng('Leche Entera'), amount: 0.2, unit: 'L' },
                    { ingredientId: findIng('Azúcar'), amount: 0.02, unit: 'kg' },
                    { ingredientId: findIng('Hielo'), amount: 0.1, unit: 'kg' },
                    { ingredientId: findIng('Vasos'), amount: 1, unit: 'un' },
                    { ingredientId: findIng('Popotes'), amount: 1, unit: 'un' },
                    { ingredientId: findIng('Tapas'), amount: 1, unit: 'un' }
                ],
                createdAt: new Date().toISOString()
            },
            {
                productId: findProd('Matcha'),
                name: 'Bubble Tea Matcha',
                items: [
                    { ingredientId: findIng('Tapioca'), amount: 0.05, unit: 'kg' },
                    { ingredientId: findIng('Matcha'), amount: 3, unit: 'g' },
                    { ingredientId: findIng('Leche Entera'), amount: 0.25, unit: 'L' },
                    { ingredientId: findIng('Azúcar'), amount: 0.015, unit: 'kg' },
                    { ingredientId: findIng('Hielo'), amount: 0.1, unit: 'kg' },
                    { ingredientId: findIng('Vasos'), amount: 1, unit: 'un' },
                    { ingredientId: findIng('Popotes'), amount: 1, unit: 'un' },
                    { ingredientId: findIng('Tapas'), amount: 1, unit: 'un' }
                ],
                createdAt: new Date().toISOString()
            },
            {
                productId: findProd('Fresa'),
                name: 'Bubble Tea Fresa',
                items: [
                    { ingredientId: findIng('Tapioca'), amount: 0.05, unit: 'kg' },
                    { ingredientId: findIng('Fresa'), amount: 0.03, unit: 'L' },
                    { ingredientId: findIng('Leche Entera'), amount: 0.2, unit: 'L' },
                    { ingredientId: findIng('Azúcar'), amount: 0.02, unit: 'kg' },
                    { ingredientId: findIng('Hielo'), amount: 0.1, unit: 'kg' },
                    { ingredientId: findIng('Vasos'), amount: 1, unit: 'un' },
                    { ingredientId: findIng('Popotes'), amount: 1, unit: 'un' },
                    { ingredientId: findIng('Tapas'), amount: 1, unit: 'un' }
                ],
                createdAt: new Date().toISOString()
            }
        ];

        for (const r of demo) {
            if (r.productId) await dbAdd(STORE_RECIPES, r);
        }
    }
}

async function loadConfig() {
    const config = await dbGet(STORE_CONFIG, 'main');
    if (config) {
        document.getElementById('config-business-name').value = config.businessName || 'Colibrí Boba Tea';
        document.getElementById('config-currency').value = config.currency || 'CLP';
        document.getElementById('config-tax').value = config.tax || 0;
    }
}

function setupEventListeners() {
    document.getElementById('menu-btn').addEventListener('click', openSidebar);
    document.getElementById('close-sidebar').addEventListener('click', closeSidebar);
    document.getElementById('sidebar-overlay').addEventListener('click', closeSidebar);

    document.querySelectorAll('.menu-list li').forEach(item => {
        item.addEventListener('click', () => {
            loadModule(item.dataset.module);
            closeSidebar();
        });
    });

    document.getElementById('cart-toggle-btn').addEventListener('click', toggleCart);
    document.getElementById('close-cart').addEventListener('click', toggleCart);

    document.getElementById('notif-btn').addEventListener('click', () => {
        openModal('notifications-modal');
        loadNotifications();
    });

    document.getElementById('add-product-btn').addEventListener('click', () => openProductModal());
    document.getElementById('save-product-btn').addEventListener('click', saveProduct);
    document.getElementById('product-search').addEventListener('input', (e) => loadProducts(e.target.value));

    document.getElementById('save-quick-sale-btn').addEventListener('click', saveQuickSale);

    document.getElementById('inventory-add-btn').addEventListener('click', () => openProductModal());
    document.getElementById('inventory-search').addEventListener('input', (e) => loadInventory(e.target.value));

    document.getElementById('add-client-btn').addEventListener('click', () => openClientModal());
    document.getElementById('save-client-btn').addEventListener('click', saveClient);
    document.getElementById('client-search').addEventListener('input', (e) => loadClients(e.target.value));

    document.getElementById('save-debt-btn').addEventListener('click', saveDebt);
    document.getElementById('save-payment-btn').addEventListener('click', savePayment);

    // 🆕 BODEGA
    document.getElementById('add-ingredient-btn').addEventListener('click', () => openIngredientModal());
    document.getElementById('save-ingredient-btn').addEventListener('click', saveIngredient);
    document.getElementById('ingredient-search').addEventListener('input', (e) => loadIngredients(e.target.value));

    // 🆕 RECETAS
    document.getElementById('add-recipe-btn').addEventListener('click', () => openRecipeModal());
    document.getElementById('save-recipe-btn').addEventListener('click', saveRecipe);
    document.getElementById('recipe-product').addEventListener('change', updateRecipePreview);
    document.getElementById('recipe-add-item').addEventListener('click', addRecipeItemRow);

    document.querySelectorAll('.calc-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const value = parseInt(btn.dataset.value);
            const input = document.getElementById('calc-received');
            input.value = (parseInt(input.value) || 0) + value;
            calculateChange();
        });
    });
    document.getElementById('calc-received').addEventListener('input', calculateChange);
    document.getElementById('calc-clear').addEventListener('click', () => {
        document.getElementById('calc-received').value = '';
        calculateChange();
    });

    document.getElementById('save-config-btn').addEventListener('click', saveConfig);
    document.getElementById('export-data-btn').addEventListener('click', exportData);
    document.getElementById('clear-data-btn').addEventListener('click', () => {
        showConfirm('¿Eliminar TODOS los datos?', clearAllData);
    });

    document.querySelectorAll('.payment-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.payment-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentPaymentMethod = btn.id.replace('pay-', '');
        });
    });

    document.getElementById('checkout-btn').addEventListener('click', processCheckout);

    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', (e) => closeModal(e.target.closest('.modal').id));
    });

    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(modal.id); });
    });

    document.getElementById('confirm-yes').addEventListener('click', () => {
        if (deleteCallback) deleteCallback();
        closeModal('confirm-modal');
    });
    document.getElementById('confirm-no').addEventListener('click', () => closeModal('confirm-modal'));

    document.getElementById('debt-amount').addEventListener('input', updateInstallmentPreview);
    document.getElementById('debt-installments').addEventListener('input', updateInstallmentPreview);

    document.getElementById('product-image-file').addEventListener('change', previewImageFile);
    document.getElementById('product-image-url').addEventListener('input', previewImageUrl);
}

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
    document.querySelectorAll('.menu-list li').forEach(item => {
        item.classList.toggle('active', item.dataset.module === module);
    });

    const titles = {
        productos: '🧋 Productos', ventas: '💰 Ventas', inventario: '📦 Inventario',
        clientes: '👥 Clientes', deudas: '💳 Deudas / Créditos',
        bodega: '📦 Bodega / Ingredientes', catalogo: '🌐 Catálogo Web', config: '⚙️ Configuración'
    };
    document.getElementById('module-title').textContent = titles[module] || module;

    document.querySelectorAll('.module').forEach(m => m.classList.remove('active'));
    document.getElementById(`module-${module}`).classList.add('active');

    switch(module) {
        case 'productos': loadProducts(); break;
        case 'ventas': loadSales(); break;
        case 'inventario': loadInventory(); break;
        case 'clientes': loadClients(); break;
        case 'deudas': loadDebts(); break;
        case 'bodega': loadIngredients(); loadRecipes(); break;
    }
}

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
    const filtered = search ? products.filter(p => p.name.toLowerCase().includes(search.toLowerCase())) : products;

    if (filtered.length === 0) {
        grid.innerHTML = `<div class="empty-state" style="grid-column: 1/-1;"><div class="empty-state-icon">🧋</div><p class="empty-state-text">No hay productos${search ? ' que coincidan' : ''}</p><button class="btn-primary" onclick="openProductModal()">+ Agregar Producto</button></div>`;
        return;
    }

    grid.innerHTML = filtered.map(product => `
        <div class="product-card" onclick="addToCart(${product.id})" data-id="${product.id}">
            <div class="product-image">${product.image ? `<img src="${product.image}" alt="${product.name}" loading="lazy" onerror="this.parentElement.innerHTML='🧋'">` : '🧋'}</div>
            <div class="product-info">
                <div class="product-name">${product.name}</div>
                <div class="product-price">${formatMoney(product.price)}</div>
                <div class="product-stock ${product.stock <= 5 ? 'low' : ''}">${product.stock} en stock</div>
            </div>
        </div>
    `).join('');
}

function openProductModal(product = null) {
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
        document.getElementById('image-preview').innerHTML = product.image ? `<img src="${product.image}" alt="Preview">` : '';
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

    if (!name || !price) { showToast('❌ Nombre y precio obligatorios', 'error'); return; }

    const product = { name, price, cost, stock, category, image: imageUrl, updatedAt: new Date().toISOString() };
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
    document.getElementById('image-preview').innerHTML = url ? `<img src="${url}" alt="Preview" onerror="this.style.display='none'">` : '';
}

// ============== CARRITO ==============
function addToCart(productId) {
    const product = cart.find(item => item.id === productId);
    if (product) { product.qty++; } else { cart.push({ id: productId, qty: 1 }); }
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
    if (item.qty <= 0) { removeFromCart(productId); return; }
    updateCartUI();
}

async function updateCartUI() {
    const cartItems = document.getElementById('cart-items');
    const cartCount = document.getElementById('cart-count');
    const cartTotal = document.getElementById('cart-total-amount');

    if (cart.length === 0) {
        cartItems.innerHTML = '<p class="empty-cart">Carrito vacío</p>';
        cartCount.textContent = '0'; cartCount.style.display = 'none';
        cartTotal.textContent = formatMoney(0); return;
    }

    const products = await dbGetAll(STORE_PRODUCTS);
    let total = 0, count = 0;

    const itemsHTML = await Promise.all(cart.map(async item => {
        const product = products.find(p => p.id === item.id);
        if (!product) return '';
        const itemTotal = product.price * item.qty;
        total += itemTotal; count += item.qty;
        return `
            <div class="cart-item">
                <div class="cart-item-image">${product.image ? `<img src="${product.image}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;">` : '🧋'}</div>
                <div class="cart-item-info"><div class="cart-item-name">${product.name}</div><div class="cart-item-price">${formatMoney(product.price)} c/u</div></div>
                <div class="cart-item-qty"><button class="qty-btn" onclick="updateCartQty(${item.id}, -1)">−</button><span>${item.qty}</span><button class="qty-btn" onclick="updateCartQty(${item.id}, 1)">+</button></div>
                <div class="cart-item-total">${formatMoney(itemTotal)}</div>
            </div>`;
    }));

    cartItems.innerHTML = itemsHTML.join('');
    cartCount.textContent = count; cartCount.style.display = count > 0 ? 'flex' : 'none';
    cartTotal.textContent = formatMoney(total);
}

function toggleCart() {
    document.getElementById('floating-cart').classList.toggle('open');
}

// ============== CHECKOUT CON DESCUENTO AUTOMÁTICO DE BODEGA ==============
async function processCheckout() {
    if (cart.length === 0) { showToast('❌ Carrito vacío', 'error'); return; }

    const products = await dbGetAll(STORE_PRODUCTS);
    const ingredients = await dbGetAll(STORE_INGREDIENTS);
    const recipes = await dbGetAll(STORE_RECIPES);

    let total = 0;
    const items = [];
    const bodegaUpdates = [];

    for (const cartItem of cart) {
        const product = products.find(p => p.id === cartItem.id);
        if (!product) continue;

        const itemTotal = product.price * cartItem.qty;
        total += itemTotal;
        items.push({ productId: product.id, name: product.name, price: product.price, qty: cartItem.qty, total: itemTotal });

        // 🆕 DESCONTAR DE BODEGA según receta
        const recipe = recipes.find(r => r.productId === product.id);
        if (recipe && recipe.items) {
            for (const recipeItem of recipe.items) {
                const ingredient = ingredients.find(i => i.id === recipeItem.ingredientId);
                if (ingredient) {
                    const amountNeeded = recipeItem.amount * cartItem.qty;
                    if (ingredient.stock < amountNeeded) {
                        showToast(`❌ Sin stock en bodega: ${ingredient.name} (necesita ${amountNeeded} ${ingredient.unit})`, 'error');
                        return;
                    }
                    ingredient.stock -= amountNeeded;
                    bodegaUpdates.push(ingredient);
                }
            }
        }
        product.stock -= cartItem.qty;
        await dbPut(STORE_PRODUCTS, product);
    }

    // 🆕 Guardar actualizaciones de bodega
    for (const ingredient of bodegaUpdates) {
        await dbPut(STORE_INGREDIENTS, ingredient);
    }

    // Fiado
    if (currentPaymentMethod === 'fiado') {
        const clients = await dbGetAll(STORE_CLIENTS);
        if (clients.length === 0) { showToast('❌ No hay clientes', 'error'); return; }
        const clientName = prompt(`Cliente para fiado:\n${clients.map((c, i) => `${i + 1}. ${c.name}`).join('\n')}\nNúmero:`);
        const clientIndex = parseInt(clientName) - 1;
        if (clientIndex >= 0 && clientIndex < clients.length) {
            const client = clients[clientIndex];
            await dbAdd(STORE_DEBTS, {
                clientId: client.id, clientName: client.name, amount: total, paid: 0, remaining: total,
                installments: 1, status: 'pending', description: `Venta fiada: ${items.map(i => i.name).join(', ')}`,
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                createdAt: new Date().toISOString()
            });
            showToast(`📝 Fiado: ${client.name}`, 'success');
        }
    }

    await dbAdd(STORE_SALES, { items, total, paymentMethod: currentPaymentMethod, date: new Date().toISOString(), timestamp: Date.now() });

    cart = []; updateCartUI(); toggleCart();
    if (currentPaymentMethod === 'efectivo') showCalculator(total);
    showToast(`✅ Venta: ${formatMoney(total)}`, 'success');

    if (currentModule === 'productos') loadProducts();
    if (currentModule === 'ventas') loadSales();
    if (currentModule === 'inventario') loadInventory();
    if (currentModule === 'bodega') loadIngredients();
}

function showCalculator(total) {
    document.getElementById('calc-total').textContent = formatMoney(total);
    document.getElementById('calc-received').value = '';
    document.getElementById('calc-change').textContent = '$0';
    openModal('calculator-modal');
}

function calculateChange() {
    const total = parseMoney(document.getElementById('calc-total').textContent);
    const received = parseFloat(document.getElementById('calc-received').value) || 0;
    const change = received - total;
    document.getElementById('calc-change').textContent = formatMoney(change > 0 ? change : 0);
    document.getElementById('calc-change').style.color = change >= 0 ? '#ffd93d' : '#e74c3c';
}

// ============== VENTAS ==============
async function loadSales() {
    const sales = await dbGetAll(STORE_SALES);
    const list = document.getElementById('sales-list');

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

    sales.sort((a, b) => b.timestamp - a.timestamp);

    if (sales.length === 0) {
        list.innerHTML = `<div class="empty-state"><div class="empty-state-icon">💰</div><p class="empty-state-text">No hay ventas</p></div>`;
        return;
    }

    const icons = { efectivo: '💵', tarjeta: '💳', transferencia: '📱', fiado: '📝' };
    list.innerHTML = sales.map(sale => {
        const date = new Date(sale.date);
        return `<div class="list-item"><div class="list-icon">${icons[sale.paymentMethod] || '💰'}</div><div class="list-content"><div class="list-title">${sale.items.map(i => i.name).join(', ')}</div><div class="list-subtitle">${date.toLocaleDateString('es-CL')} ${date.toLocaleTimeString('es-CL', {hour:'2-digit', minute:'2-digit'})} • ${sale.items.length} productos</div></div><div class="list-amount">${formatMoney(sale.total)}</div></div>`;
    }).join('');
}

// ============== INVENTARIO ==============
async function loadInventory(search = '') {
    const products = await dbGetAll(STORE_PRODUCTS);
    const list = document.getElementById('inventory-list');
    const filtered = search ? products.filter(p => p.name.toLowerCase().includes(search.toLowerCase())) : products;
    filtered.sort((a, b) => a.name.localeCompare(b.name));

    if (filtered.length === 0) {
        list.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📦</div><p class="empty-state-text">No hay productos</p></div>`;
        return;
    }

    const emojis = { 'bubble-tea': '🧋', 'smoothie': '🥤', 'coffee': '☕', 'postre': '🍰', 'otro': '📦' };
    list.innerHTML = filtered.map(p => `
        <div class="list-item">
            <div class="list-icon">${emojis[p.category] || '📦'}</div>
            <div class="list-content"><div class="list-title">${p.name}</div><div class="list-subtitle">Stock: <strong class="${p.stock <= 5 ? 'low' : ''}">${p.stock}</strong> • Costo: ${formatMoney(p.cost)} • Venta: ${formatMoney(p.price)}</div></div>
            <div class="list-actions"><button class="action-btn edit" onclick="editProduct(${p.id})">✏️</button><button class="action-btn delete" onclick="deleteProduct(${p.id})">🗑️</button></div>
        </div>
    `).join('');
}

async function editProduct(id) {
    const product = await dbGet(STORE_PRODUCTS, id);
    if (product) openProductModal(product);
}

async function deleteProduct(id) {
    showConfirm('¿Eliminar producto?', async () => {
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
    const filtered = search ? clients.filter(c => c.name.toLowerCase().includes(search.toLowerCase())) : clients;
    filtered.sort((a, b) => a.name.localeCompare(b.name));

    if (filtered.length === 0) {
        list.innerHTML = `<div class="empty-state"><div class="empty-state-icon">👥</div><p class="empty-state-text">No hay clientes</p><button class="btn-primary" onclick="openClientModal()">+ Agregar Cliente</button></div>`;
        return;
    }

    list.innerHTML = filtered.map(c => `
        <div class="list-item">
            <div class="list-icon">👤</div>
            <div class="list-content"><div class="list-title">${c.name}</div><div class="list-subtitle">${c.phone || 'Sin teléfono'} • ${c.email || 'Sin email'}</div></div>
            <div class="list-actions"><button class="action-btn edit" onclick="editClient(${c.id})">✏️</button><button class="action-btn delete" onclick="deleteClient(${c.id})">🗑️</button></div>
        </div>
    `).join('');
}

function openClientModal(client = null) {
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

    if (!name) { showToast('❌ Nombre obligatorio', 'error'); return; }

    const client = { name, phone, email, address, notes, updatedAt: new Date().toISOString() };
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
    if (client) openClientModal(client);
}

async function deleteClient(id) {
    showConfirm('¿Eliminar cliente?', async () => {
        await dbDelete(STORE_CLIENTS, id);
        showToast('🗑️ Cliente eliminado', 'success');
        loadClients();
    });
}

// ============== DEUDAS ==============
async function loadDebts() {
    const debts = await dbGetAll(STORE_DEBTS);
    const list = document.getElementById('debts-list');

    let totalDebt = 0, totalPaid = 0;
    debts.forEach(d => { totalDebt += d.amount; totalPaid += d.paid || 0; });
    document.getElementById('total-debt').textContent = formatMoney(totalDebt);
    document.getElementById('total-paid').textContent = formatMoney(totalPaid);

    debts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (debts.length === 0) {
        list.innerHTML = `<div class="empty-state"><div class="empty-state-icon">💳</div><p class="empty-state-text">No hay deudas</p><button class="btn-primary" onclick="openDebtModal()">+ Registrar Deuda</button></div>`;
        return;
    }

    list.innerHTML = debts.map(debt => {
        const status = getDebtStatus(debt);
        const progress = debt.amount > 0 ? ((debt.paid || 0) / debt.amount * 100).toFixed(0) : 0;
        return `
            <div class="list-item">
                <div class="list-content" style="flex:1;">
                    <div class="list-title">${debt.clientName || 'Desconocido'}</div>
                    <div class="list-subtitle">${debt.description || ''}<br>Vence: ${debt.dueDate || 'Sin fecha'} • <span class="debt-status ${status.class}">${status.text}</span></div>
                    <div style="margin-top:8px;background:rgba(255,255,255,0.1);border-radius:4px;height:6px;overflow:hidden;"><div style="width:${progress}%;height:100%;background:linear-gradient(90deg, var(--primary), var(--secondary));"></div></div>
                    <div style="font-size:12px;color:rgba(255,255,255,0.5);margin-top:4px;">Pagado: ${formatMoney(debt.paid || 0)} de ${formatMoney(debt.amount)} (${progress}%)</div>
                </div>
                <div class="list-actions" style="flex-direction:column;gap:6px;">
                    <button class="action-btn edit" onclick="payDebt(${debt.id})">💵</button>
                    <button class="action-btn edit" onclick="viewDebtHistory(${debt.id})">📋</button>
                    <button class="action-btn delete" onclick="deleteDebt(${debt.id})">🗑️</button>
                </div>
            </div>`;
    }).join('');
}

function getDebtStatus(debt) {
    if (debt.remaining <= 0) return { text: 'Pagado', class: 'paid' };
    const dueDate = new Date(debt.dueDate);
    if (dueDate < new Date() && debt.remaining > 0) return { text: 'Vencido', class: 'overdue' };
    return { text: 'Pendiente', class: 'pending' };
}

async function openDebtModal() {
    const clients = await dbGetAll(STORE_CLIENTS);
    const select = document.getElementById('debt-client');
    select.innerHTML = '<option value="">Seleccionar cliente...</option>' + clients.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

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
    if (amount <= 0 || installments <= 0) { preview.innerHTML = ''; return; }

    const installmentAmount = Math.round(amount / installments);
    const dueDate = document.getElementById('debt-due-date').value;
    let html = '<h4>📅 Vista previa de cuotas:</h4>';
    for (let i = 1; i <= installments; i++) {
        let dateStr = 'Fecha por definir';
        if (dueDate) { const d = new Date(dueDate); d.setMonth(d.getMonth() + (i - 1)); dateStr = d.toLocaleDateString('es-CL'); }
        html += `<div class="installment-item"><span>Cuota ${i} de ${installments}</span><span><strong>${formatMoney(installmentAmount)}</strong> - ${dateStr}</span></div>`;
    }
    preview.innerHTML = html;
}

async function saveDebt() {
    const clientId = parseInt(document.getElementById('debt-client').value);
    const amount = parseFloat(document.getElementById('debt-amount').value);
    const installments = parseInt(document.getElementById('debt-installments').value) || 1;
    const dueDate = document.getElementById('debt-due-date').value;
    const description = document.getElementById('debt-description').value.trim();

    if (!clientId || !amount) { showToast('❌ Cliente y monto obligatorios', 'error'); return; }

    const clients = await dbGetAll(STORE_CLIENTS);
    const client = clients.find(c => c.id === clientId);
    const debt = {
        clientId, clientName: client ? client.name : 'Desconocido', amount, paid: 0, remaining: amount,
        installments, installmentAmount: Math.round(amount / installments), status: 'pending', description,
        dueDate: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        createdAt: new Date().toISOString()
    };
    await dbAdd(STORE_DEBTS, debt);
    showToast('✅ Deuda registrada', 'success');
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

    if (!debtId || !amount || amount <= 0) { showToast('❌ Monto inválido', 'error'); return; }

    const debt = await dbGet(STORE_DEBTS, debtId);
    if (!debt) { showToast('❌ Deuda no encontrada', 'error'); return; }

    await dbAdd(STORE_PAYMENTS, { debtId, amount, method, note, date: new Date().toISOString(), timestamp: Date.now() });
    debt.paid = (debt.paid || 0) + amount;
    debt.remaining = Math.max(0, debt.amount - debt.paid);
    if (debt.remaining <= 0) debt.status = 'paid';
    await dbPut(STORE_DEBTS, debt);
    showToast(`✅ Pago: ${formatMoney(amount)}`, 'success');
    closeModal('payment-modal');
    loadDebts();
}

async function viewDebtHistory(debtId) {
    const payments = await dbGetAll(STORE_PAYMENTS);
    const debtPayments = payments.filter(p => p.debtId === debtId).sort((a, b) => b.timestamp - a.timestamp);
    if (debtPayments.length === 0) { showToast('ℹ️ Sin pagos registrados', 'warning'); return; }

    const history = debtPayments.map(p => {
        const d = new Date(p.date);
        return `📅 ${d.toLocaleDateString('es-CL')} ${d.toLocaleTimeString('es-CL')} - ${formatMoney(p.amount)} (${p.method})${p.note ? ' - ' + p.note : ''}`;
    }).join('\n');
    alert(`📋 Historial de Pagos:\n\n${history}`);
}

async function deleteDebt(id) {
    showConfirm('¿Eliminar deuda e historial?', async () => {
        const payments = await dbGetAll(STORE_PAYMENTS);
        for (const p of payments.filter(p => p.debtId === id)) await dbDelete(STORE_PAYMENTS, p.id);
        await dbDelete(STORE_DEBTS, id);
        showToast('🗑️ Deuda eliminada', 'success');
        loadDebts();
    });
}

// ============== 🆕 BODEGA / INGREDIENTES ==============
async function loadIngredients(search = '') {
    const ingredients = await dbGetAll(STORE_INGREDIENTS);
    const list = document.getElementById('ingredients-list');
    const filtered = search ? ingredients.filter(i => i.name.toLowerCase().includes(search.toLowerCase())) : ingredients;
    filtered.sort((a, b) => a.name.localeCompare(b.name));

    let totalValue = 0, lowStock = 0;
    ingredients.forEach(i => {
        totalValue += (i.stock * i.cost);
        if (i.stock <= i.minStock) lowStock++;
    });
    document.getElementById('bodega-total-value').textContent = formatMoney(totalValue);
    document.getElementById('bodega-low-stock').textContent = lowStock;

    if (filtered.length === 0) {
        list.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📦</div><p class="empty-state-text">No hay ingredientes</p><button class="btn-primary" onclick="openIngredientModal()">+ Agregar Ingrediente</button></div>`;
        return;
    }

    const catEmojis = { tapioca: '⚫', te: '🍃', lacteo: '🥛', endulzante: '🍯', saborizante: '🧪', empaque: '📦', otro: '🔧' };

    list.innerHTML = filtered.map(ing => {
        const isLow = ing.stock <= ing.minStock;
        const statusClass = isLow ? 'overdue' : 'paid';
        const statusText = isLow ? '¡Stock bajo!' : 'OK';
        return `
            <div class="list-item">
                <div class="list-icon">${catEmojis[ing.category] || '📦'}</div>
                <div class="list-content" style="flex:1;">
                    <div class="list-title">${ing.name}</div>
                    <div class="list-subtitle">
                        ${ing.supplier || 'Sin proveedor'} • Ubicación: ${ing.location || 'N/A'}<br>
                        Stock: <strong class="${isLow ? 'low' : ''}">${ing.stock} ${ing.unit}</strong> • 
                        Mínimo: ${ing.minStock} ${ing.unit} • 
                        <span class="debt-status ${statusClass}">${statusText}</span>
                    </div>
                    <div style="margin-top:6px;font-size:13px;color:var(--primary);">
                        Costo: ${formatMoney(ing.cost)}/${ing.unit} • Valor total: ${formatMoney(ing.stock * ing.cost)}
                    </div>
                </div>
                <div class="list-actions" style="flex-direction:column;gap:6px;">
                    <button class="action-btn edit" onclick="editIngredient(${ing.id})">✏️</button>
                    <button class="action-btn delete" onclick="deleteIngredient(${ing.id})">🗑️</button>
                </div>
            </div>`;
    }).join('');
}

function openIngredientModal(ingredient = null) {
    const title = document.getElementById('ingredient-modal-title');
    if (ingredient) {
        title.textContent = 'Editar Ingrediente';
        document.getElementById('ingredient-id').value = ingredient.id;
        document.getElementById('ingredient-name').value = ingredient.name;
        document.getElementById('ingredient-category').value = ingredient.category;
        document.getElementById('ingredient-unit').value = ingredient.unit;
        document.getElementById('ingredient-stock').value = ingredient.stock;
        document.getElementById('ingredient-min-stock').value = ingredient.minStock;
        document.getElementById('ingredient-cost').value = ingredient.cost;
        document.getElementById('ingredient-supplier').value = ingredient.supplier || '';
        document.getElementById('ingredient-location').value = ingredient.location || '';
    } else {
        title.textContent = 'Nuevo Ingrediente';
        document.getElementById('ingredient-id').value = '';
        document.getElementById('ingredient-name').value = '';
        document.getElementById('ingredient-category').value = 'tapioca';
        document.getElementById('ingredient-unit').value = 'kg';
        document.getElementById('ingredient-stock').value = '0';
        document.getElementById('ingredient-min-stock').value = '1';
        document.getElementById('ingredient-cost').value = '';
        document.getElementById('ingredient-supplier').value = '';
        document.getElementById('ingredient-location').value = '';
    }
    openModal('ingredient-modal');
}

async function saveIngredient() {
    const id = document.getElementById('ingredient-id').value;
    const name = document.getElementById('ingredient-name').value.trim();
    const category = document.getElementById('ingredient-category').value;
    const unit = document.getElementById('ingredient-unit').value.trim();
    const stock = parseFloat(document.getElementById('ingredient-stock').value) || 0;
    const minStock = parseFloat(document.getElementById('ingredient-min-stock').value) || 0;
    const cost = parseFloat(document.getElementById('ingredient-cost').value) || 0;
    const supplier = document.getElementById('ingredient-supplier').value.trim();
    const location = document.getElementById('ingredient-location').value.trim();

    if (!name || !unit) { showToast('❌ Nombre y unidad obligatorios', 'error'); return; }

    const ingredient = { name, category, unit, stock, minStock, cost, supplier, location, updatedAt: new Date().toISOString() };
    if (id) {
        ingredient.id = parseInt(id);
        const existing = await dbGet(STORE_INGREDIENTS, ingredient.id);
        ingredient.createdAt = existing.createdAt;
        ingredient.image = existing.image;
        await dbPut(STORE_INGREDIENTS, ingredient);
        showToast('✅ Ingrediente actualizado', 'success');
    } else {
        ingredient.createdAt = new Date().toISOString();
        ingredient.image = DEMO_IMAGES.ingredient[Math.floor(Math.random() * DEMO_IMAGES.ingredient.length)];
        await dbAdd(STORE_INGREDIENTS, ingredient);
        showToast('✅ Ingrediente creado', 'success');
    }
    closeModal('ingredient-modal');
    loadIngredients();
}

async function editIngredient(id) {
    const ingredient = await dbGet(STORE_INGREDIENTS, id);
    if (ingredient) openIngredientModal(ingredient);
}

async function deleteIngredient(id) {
    showConfirm('¿Eliminar ingrediente?', async () => {
        await dbDelete(STORE_INGREDIENTS, id);
        showToast('🗑️ Ingrediente eliminado', 'success');
        loadIngredients();
    });
}

// ============== 🆕 RECETAS / FÓRMULAS ==============
async function loadRecipes() {
    const recipes = await dbGetAll(STORE_RECIPES);
    const products = await dbGetAll(STORE_PRODUCTS);
    const ingredients = await dbGetAll(STORE_INGREDIENTS);
    const list = document.getElementById('recipes-list');

    if (recipes.length === 0) {
        list.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🧪</div><p class="empty-state-text">No hay recetas</p><button class="btn-primary" onclick="openRecipeModal()">+ Crear Receta</button></div>`;
        return;
    }

    list.innerHTML = recipes.map(recipe => {
        const product = products.find(p => p.id === recipe.productId);
        const itemsCount = recipe.items ? recipe.items.length : 0;
        return `
            <div class="list-item">
                <div class="list-icon">🧪</div>
                <div class="list-content" style="flex:1;">
                    <div class="list-title">${recipe.name}</div>
                    <div class="list-subtitle">Producto: ${product ? product.name : 'Desconocido'} • ${itemsCount} ingredientes</div>
                </div>
                <div class="list-actions">
                    <button class="action-btn edit" onclick="viewRecipe(${recipe.id})">👁️</button>
                    <button class="action-btn delete" onclick="deleteRecipe(${recipe.id})">🗑️</button>
                </div>
            </div>`;
    }).join('');
}

async function openRecipeModal() {
    const products = await dbGetAll(STORE_PRODUCTS);
    const ingredients = await dbGetAll(STORE_INGREDIENTS);

    const select = document.getElementById('recipe-product');
    select.innerHTML = '<option value="">Seleccionar producto...</option>' + 
        products.map(p => `<option value="${p.id}">${p.name}</option>`).join('');

    recipeItems = [];
    document.getElementById('recipe-id').value = '';
    document.getElementById('recipe-items-container').innerHTML = '';
    updateRecipePreview();
    openModal('recipe-modal');
}

function addRecipeItemRow() {
    const container = document.getElementById('recipe-items-container');
    const ingredients = db ? [] : []; // Se cargan dinámicamente

    const row = document.createElement('div');
    row.className = 'recipe-item-row';
    row.innerHTML = `
        <select class="recipe-item-ingredient" style="flex:2;padding:10px;background:var(--glass);border:1px solid var(--glass-border);border-radius:8px;color:var(--light);">
            <option value="">Ingrediente...</option>
        </select>
        <input type="number" class="recipe-item-amount" placeholder="Cant" style="width:80px;padding:10px;background:var(--glass);border:1px solid var(--glass-border);border-radius:8px;color:var(--light);">
        <span class="recipe-item-unit" style="color:rgba(255,255,255,0.5);font-size:13px;">-</span>
        <button onclick="this.parentElement.remove(); updateRecipePreview();" style="background:none;border:none;color:#e74c3c;font-size:18px;cursor:pointer;">×</button>
    `;
    container.appendChild(row);

    // Cargar ingredientes en el select
    dbGetAll(STORE_INGREDIENTS).then(ings => {
        const select = row.querySelector('.recipe-item-ingredient');
        select.innerHTML = '<option value="">Ingrediente...</option>' + 
            ings.map(i => `<option value="${i.id}" data-unit="${i.unit}">${i.name} (${i.unit})</option>`).join('');
        select.addEventListener('change', updateRecipePreview);
    });

    row.querySelector('.recipe-item-amount').addEventListener('input', updateRecipePreview);
}

async function updateRecipePreview() {
    const productId = document.getElementById('recipe-product').value;
    const preview = document.getElementById('recipe-preview');
    if (!productId) { preview.innerHTML = ''; return; }

    const product = await dbGet(STORE_PRODUCTS, parseInt(productId));
    const ingredients = await dbGetAll(STORE_INGREDIENTS);

    let totalCost = 0;
    let html = '<h4>🧪 Vista previa de la receta:</h4>';

    document.querySelectorAll('.recipe-item-row').forEach(row => {
        const ingId = row.querySelector('.recipe-item-ingredient').value;
        const amount = parseFloat(row.querySelector('.recipe-item-amount').value) || 0;
        if (ingId && amount > 0) {
            const ing = ingredients.find(i => i.id == ingId);
            if (ing) {
                const cost = amount * ing.cost;
                totalCost += cost;
                html += `<div class="installment-item"><span>${ing.name}</span><span>${amount} ${ing.unit} = ${formatMoney(cost)}</span></div>`;
            }
        }
    });

    if (product) {
        const profit = product.price - totalCost;
        const margin = product.price > 0 ? ((profit / product.price) * 100).toFixed(1) : 0;
        html += `<div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--glass-border);">
            <div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span>Costo total:</span><span>${formatMoney(totalCost)}</span></div>
            <div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span>Precio venta:</span><span>${formatMoney(product.price)}</span></div>
            <div style="display:flex;justify-content:space-between;font-weight:700;color:${profit > 0 ? 'var(--primary)' : '#e74c3c'};">
                <span>Ganancia:</span><span>${formatMoney(profit)} (${margin}%)</span>
            </div>
        </div>`;
    }

    preview.innerHTML = html;
}

async function saveRecipe() {
    const productId = parseInt(document.getElementById('recipe-product').value);
    if (!productId) { showToast('❌ Selecciona un producto', 'error'); return; }

    const product = await dbGet(STORE_PRODUCTS, productId);
    const items = [];

    document.querySelectorAll('.recipe-item-row').forEach(row => {
        const ingId = row.querySelector('.recipe-item-ingredient').value;
        const amount = parseFloat(row.querySelector('.recipe-item-amount').value);
        if (ingId && amount > 0) {
            items.push({ ingredientId: parseInt(ingId), amount, unit: row.querySelector('.recipe-item-unit').textContent });
        }
    });

    if (items.length === 0) { showToast('❌ Agrega al menos un ingrediente', 'error'); return; }

    const recipe = { productId, name: product ? product.name : 'Receta', items, createdAt: new Date().toISOString() };
    await dbAdd(STORE_RECIPES, recipe);
    showToast('✅ Receta guardada', 'success');
    closeModal('recipe-modal');
    loadRecipes();
}

async function viewRecipe(id) {
    const recipe = await dbGet(STORE_RECIPES, id);
    if (!recipe) return;

    const ingredients = await dbGetAll(STORE_INGREDIENTS);
    const product = await dbGet(STORE_PRODUCTS, recipe.productId);

    let totalCost = 0;
    let details = `🧪 ${recipe.name}\n`;
    details += `Producto: ${product ? product.name : 'Desconocido'}\n\n`;
    details += `Ingredientes:\n`;

    recipe.items.forEach(item => {
        const ing = ingredients.find(i => i.id === item.ingredientId);
        if (ing) {
            const cost = item.amount * ing.cost;
            totalCost += cost;
            details += `• ${ing.name}: ${item.amount} ${ing.unit} = ${formatMoney(cost)}\n`;
        }
    });

    if (product) {
        const profit = product.price - totalCost;
        const margin = ((profit / product.price) * 100).toFixed(1);
        details += `\nCosto total: ${formatMoney(totalCost)}\n`;
        details += `Precio venta: ${formatMoney(product.price)}\n`;
        details += `Ganancia: ${formatMoney(profit)} (${margin}%)`;
    }

    alert(details);
}

async function deleteRecipe(id) {
    showConfirm('¿Eliminar receta?', async () => {
        await dbDelete(STORE_RECIPES, id);
        showToast('🗑️ Receta eliminada', 'success');
        loadRecipes();
    });
}

// ============== NOTIFICACIONES ==============
async function loadNotifications() {
    const debts = await dbGetAll(STORE_DEBTS);
    const ingredients = await dbGetAll(STORE_INGREDIENTS);
    const products = await dbGetAll(STORE_PRODUCTS);
    const notifications = [];
    const now = new Date();

    // Deudas vencidas/próximas
    debts.forEach(debt => {
        if (debt.status !== 'paid') {
            const dueDate = new Date(debt.dueDate);
            const daysDiff = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
            if (daysDiff <= 3 && daysDiff >= 0) {
                notifications.push({ type: 'warning', title: 'Deuda próxima a vencer', text: `${debt.clientName} - ${formatMoney(debt.remaining)} - ${daysDiff} días`, time: new Date().toISOString() });
            } else if (daysDiff < 0) {
                notifications.push({ type: 'error', title: 'Deuda vencida', text: `${debt.clientName} - ${formatMoney(debt.remaining)} - ${Math.abs(daysDiff)} días`, time: new Date().toISOString() });
            }
        }
    });

    // 🆕 Stock bajo en BODEGA
    ingredients.forEach(ing => {
        if (ing.stock <= ing.minStock) {
            notifications.push({ type: 'error', title: '¡Stock bajo en bodega!', text: `${ing.name}: ${ing.stock} ${ing.unit} (mín: ${ing.minStock})`, time: new Date().toISOString() });
        }
    });

    // Stock bajo en productos
    products.forEach(p => {
        if (p.stock <= 5) {
            notifications.push({ type: 'warning', title: 'Stock bajo', text: `${p.name}: ${p.stock} unidades`, time: new Date().toISOString() });
        }
    });

    const list = document.getElementById('notifications-list');
    const count = document.getElementById('notif-count');
    count.textContent = notifications.length;
    count.style.display = notifications.length > 0 ? 'flex' : 'none';

    if (notifications.length === 0) {
        list.innerHTML = '<p class="empty-notifications">No hay notificaciones</p>'; return;
    }

    const icons = { warning: '⚠️', error: '❌', success: '✅' };
    list.innerHTML = notifications.map(n => {
        const d = new Date(n.time);
        return `<div class="notification-item ${n.type === 'error' ? 'unread' : ''}"><div class="notification-icon">${icons[n.type] || 'ℹ️'}</div><div class="notification-content"><div class="notification-title">${n.title}</div><div class="notification-text">${n.text}</div><div class="notification-time">${d.toLocaleTimeString('es-CL')}</div></div></div>`;
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
        ingredients: await dbGetAll(STORE_INGREDIENTS),
        recipes: await dbGetAll(STORE_RECIPES),
        config: await dbGet(STORE_CONFIG, 'main'),
        exportDate: new Date().toISOString(),
        version: '3.0'
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `colibri_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('📥 Datos exportados', 'success');
}

async function clearAllData() {
    const stores = [STORE_PRODUCTS, STORE_SALES, STORE_CLIENTS, STORE_DEBTS, STORE_PAYMENTS, STORE_INGREDIENTS, STORE_RECIPES];
    for (const store of stores) {
        const items = await dbGetAll(store);
        for (const item of items) await dbDelete(store, item.id);
    }
    showToast('🗑️ Datos eliminados', 'success');
    await loadDemoData();
    loadModule(currentModule);
}

// ============== VENTA RÁPIDA ==============
async function saveQuickSale() {
    const product = document.getElementById('quick-sale-product').value.trim();
    const price = parseFloat(document.getElementById('quick-sale-price').value);
    const qty = parseInt(document.getElementById('quick-sale-qty').value) || 1;
    const payment = document.getElementById('quick-sale-payment').value;

    if (!product || !price) { showToast('❌ Producto y precio obligatorios', 'error'); return; }

    const total = price * qty;
    await dbAdd(STORE_SALES, {
        items: [{ productId: null, name: product, price, qty, total }],
        total, paymentMethod: payment,
        date: new Date().toISOString(), timestamp: Date.now()
    });

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
