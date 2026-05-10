/* ============================================
   COLIBRÍ BOBA TEA v4.1 - APP.JS CORREGIDO
   Fix para GitHub Pages: errores robustos, fallback DB
   ============================================ */

const DB_NAME = 'colibri_boba_tea_db';
const DB_VERSION = 3;
const STORE_PRODUCTS = 'products';
const STORE_SALES = 'sales';
const STORE_CLIENTS = 'clients';
const STORE_DEBTS = 'debts';
const STORE_PAYMENTS = 'payments';
const STORE_CONFIG = 'config';
const STORE_INGREDIENTS = 'ingredients';
const STORE_RECIPES = 'recipes';
const STORE_PURCHASES = 'purchases';
const STORE_WASTE = 'waste';
const STORE_SUPPLIERS = 'suppliers';
const STORE_BATCHES = 'batches';

const DEMO_IMAGES = {
    bubble_tea: ['https://images.unsplash.com/photo-1558855410-3112e3d2bb30?w=400&h=400&fit=crop','https://images.unsplash.com/photo-1546173159-315724a31696?w=400&h=400&fit=crop','https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&h=400&fit=crop'],
    smoothie: ['https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?w=400&h=400&fit=crop','https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400&h=400&fit=crop'],
    coffee: ['https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=400&fit=crop','https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&h=400&fit=crop'],
    postre: ['https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=400&h=400&fit=crop','https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400&h=400&fit=crop'],
    ingredient: ['https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&h=400&fit=crop','https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=400&fit=crop'],
    logo: 'https://cdn-icons-png.flaticon.com/512/3081/3081840.png'
};

let db = null;
let cart = [];
let currentModule = 'productos';
let currentPaymentMethod = 'efectivo';
let deleteCallback = null;
let recipeItems = [];
let purchaseItems = [];
let useLocalStorageFallback = false;

// ============== INICIALIZACIÓN CON FALLBACK ==============
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM Content Loaded - Iniciando Colibrí Boba Tea v4.1');
    initApp();
});

async function initApp() {
    const splash = document.getElementById('splash-screen');
    const app = document.getElementById('app');

    try {
        // Intentar abrir IndexedDB
        db = await initDB();
        console.log('✅ IndexedDB inicializada correctamente');
    } catch (error) {
        console.error('❌ Error IndexedDB:', error);
        // Fallback: usar localStorage si IndexedDB falla
        useLocalStorageFallback = true;
        console.log('⚠️ Usando localStorage como fallback');
        showToast('Modo fallback activado (sin base de datos)', 'warning');
    }

    try {
        await loadConfig();
        await loadDemoData();
        setupEventListeners();
        loadModule('productos');
    } catch (error) {
        console.error('❌ Error cargando datos:', error);
        showToast('Error al cargar datos iniciales', 'error');
    }

    // SIEMPRE ocultar splash, incluso si hay errores
    setTimeout(() => {
        splash.style.opacity = '0';
        setTimeout(() => {
            splash.style.display = 'none';
            app.style.display = 'flex';
            console.log('✅ App visible');
        }, 500);
    }, 1500);
}

// ============== INDEXEDDB CON MANEJO DE ERRORES ==============
function initDB() {
    return new Promise((resolve, reject) => {
        if (!window.indexedDB) {
            reject(new Error('IndexedDB no soportado'));
            return;
        }

        let request;
        try {
            request = indexedDB.open(DB_NAME, DB_VERSION);
        } catch (e) {
            reject(e);
            return;
        }

        request.onerror = () => reject(request.error || new Error('Error abriendo IndexedDB'));
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const database = event.target.result;
            const oldVersion = event.oldVersion;

            if (!database.objectStoreNames.contains(STORE_PRODUCTS)) {
                const ps = database.createObjectStore(STORE_PRODUCTS, { keyPath: 'id', autoIncrement: true });
                ps.createIndex('name', 'name', { unique: false });
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
            if (!database.objectStoreNames.contains(STORE_INGREDIENTS)) {
                const is = database.createObjectStore(STORE_INGREDIENTS, { keyPath: 'id', autoIncrement: true });
                is.createIndex('name', 'name', { unique: false });
            }
            if (!database.objectStoreNames.contains(STORE_RECIPES)) {
                const rs = database.createObjectStore(STORE_RECIPES, { keyPath: 'id', autoIncrement: true });
                rs.createIndex('productId', 'productId', { unique: false });
            }
            if (!database.objectStoreNames.contains(STORE_PURCHASES)) {
                const pus = database.createObjectStore(STORE_PURCHASES, { keyPath: 'id', autoIncrement: true });
                pus.createIndex('date', 'date', { unique: false });
            }
            if (!database.objectStoreNames.contains(STORE_WASTE)) {
                const ws = database.createObjectStore(STORE_WASTE, { keyPath: 'id', autoIncrement: true });
                ws.createIndex('date', 'date', { unique: false });
            }
            if (!database.objectStoreNames.contains(STORE_SUPPLIERS)) {
                const sus = database.createObjectStore(STORE_SUPPLIERS, { keyPath: 'id', autoIncrement: true });
                sus.createIndex('name', 'name', { unique: false });
            }
            if (!database.objectStoreNames.contains(STORE_BATCHES)) {
                const bs = database.createObjectStore(STORE_BATCHES, { keyPath: 'id', autoIncrement: true });
                bs.createIndex('ingredientId', 'ingredientId', { unique: false });
                bs.createIndex('expiryDate', 'expiryDate', { unique: false });
            }
            // 🆕 Stores de turnos
            if (typeof initShiftStores === 'function') initShiftStores(database);
            console.log(`🔄 BD migrada: v${oldVersion} → v${DB_VERSION}`);
        };

        request.onblocked = () => {
            console.warn('⚠️ IndexedDB bloqueada - cerrar otras pestañas');
            reject(new Error('Base de datos bloqueada'));
        };
    });
}

// ============== OPERACIONES DB CON FALLBACK ==============
async function dbAdd(store, data) {
    if (useLocalStorageFallback) {
        const items = JSON.parse(localStorage.getItem(store) || '[]');
        data.id = Date.now() + Math.random();
        items.push(data);
        localStorage.setItem(store, JSON.stringify(items));
        return data.id;
    }
    return new Promise((resolve, reject) => {
        const tx = db.transaction([store], 'readwrite');
        const os = tx.objectStore(store);
        const req = os.add(data);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function dbGetAll(store) {
    if (useLocalStorageFallback) {
        return JSON.parse(localStorage.getItem(store) || '[]');
    }
    return new Promise((resolve, reject) => {
        const tx = db.transaction([store], 'readonly');
        const os = tx.objectStore(store);
        const req = os.getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function dbGet(store, id) {
    if (useLocalStorageFallback) {
        const items = JSON.parse(localStorage.getItem(store) || '[]');
        return items.find(item => item.id == id) || null;
    }
    return new Promise((resolve, reject) => {
        const tx = db.transaction([store], 'readonly');
        const os = tx.objectStore(store);
        const req = os.get(id);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function dbPut(store, data) {
    if (useLocalStorageFallback) {
        const items = JSON.parse(localStorage.getItem(store) || '[]');
        const index = items.findIndex(item => item.id == data.id);
        if (index >= 0) items[index] = data;
        else items.push(data);
        localStorage.setItem(store, JSON.stringify(items));
        return data.id;
    }
    return new Promise((resolve, reject) => {
        const tx = db.transaction([store], 'readwrite');
        const os = tx.objectStore(store);
        const req = os.put(data);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function dbDelete(store, id) {
    if (useLocalStorageFallback) {
        const items = JSON.parse(localStorage.getItem(store) || '[]');
        const filtered = items.filter(item => item.id != id);
        localStorage.setItem(store, JSON.stringify(filtered));
        return;
    }
    return new Promise((resolve, reject) => {
        const tx = db.transaction([store], 'readwrite');
        const os = tx.objectStore(store);
        const req = os.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}

// ============== DATOS DEMO ==============
async function loadDemoData() {
    try {
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

        // Proveedores
        const suppliers = await dbGetAll(STORE_SUPPLIERS);
        if (suppliers.length === 0) {
            const demo = [
                { name: 'Proveedor Tapioca SA', contact: 'Juan Pérez', phone: '+56 9 1111 2222', email: 'ventas@tapioca.cl', address: 'Av. Industrial 1230', taxId: '76.123.456-7', paymentTerms: '30 días', notes: 'Entrega los lunes', createdAt: new Date().toISOString() },
                { name: 'Importadora Japón', contact: 'Yuki Tanaka', phone: '+56 9 3333 4444', email: 'chile@japonimport.cl', address: 'Cerro El Plomo 5430', taxId: '77.987.654-3', paymentTerms: '15 días', notes: 'Productos importados', createdAt: new Date().toISOString() },
                { name: 'Colun', contact: 'Distribuidor Local', phone: '+56 9 5555 6666', email: 'distribucion@colun.cl', address: 'Los Ángeles, Bío Bío', taxId: '81.234.567-8', paymentTerms: '7 días', notes: 'Delivery gratis', createdAt: new Date().toISOString() },
                { name: 'Taiwan Imports', contact: 'David Chen', phone: '+56 9 7777 8888', email: 'david@taiwanimport.cl', address: 'Barrio Brasil, Santiago', taxId: '78.345.678-9', paymentTerms: 'Contado', notes: 'Solo transferencia', createdAt: new Date().toISOString() },
                { name: 'Packaging Chile', contact: 'Laura Martínez', phone: '+56 9 9999 0000', email: 'ventas@packaging.cl', address: 'Quilicura 8900', taxId: '79.456.789-0', paymentTerms: '30 días', notes: 'Descuento por volumen', createdAt: new Date().toISOString() }
            ];
            for (const s of demo) await dbAdd(STORE_SUPPLIERS, s);
        }

        // Ingredientes
        const ingredients = await dbGetAll(STORE_INGREDIENTS);
        if (ingredients.length === 0) {
            const demo = [
                { name: 'Perlas de Tapioca', category: 'tapioca', unit: 'kg', stock: 5, minStock: 1, cost: 8500, supplierId: 1, location: 'Estante A1', image: DEMO_IMAGES.ingredient[0], createdAt: new Date().toISOString() },
                { name: 'Té Verde Matcha', category: 'te', unit: 'g', stock: 500, minStock: 100, cost: 12000, supplierId: 2, location: 'Estante B2', image: DEMO_IMAGES.ingredient[1], createdAt: new Date().toISOString() },
                { name: 'Leche Entera', category: 'lacteo', unit: 'L', stock: 20, minStock: 5, cost: 1200, supplierId: 3, location: 'Refrigerador', image: DEMO_IMAGES.ingredient[2], createdAt: new Date().toISOString() },
                { name: 'Leche Condensada', category: 'lacteo', unit: 'L', stock: 8, minStock: 2, cost: 3500, supplierId: 3, location: 'Refrigerador', image: DEMO_IMAGES.ingredient[2], createdAt: new Date().toISOString() },
                { name: 'Azúcar Morena', category: 'endulzante', unit: 'kg', stock: 10, minStock: 2, cost: 2500, supplierId: 4, location: 'Estante A3', image: DEMO_IMAGES.ingredient[0], createdAt: new Date().toISOString() },
                { name: 'Jarabe de Taro', category: 'saborizante', unit: 'L', stock: 3, minStock: 1, cost: 15000, supplierId: 4, location: 'Estante C1', image: DEMO_IMAGES.ingredient[1], createdAt: new Date().toISOString() },
                { name: 'Jarabe de Fresa', category: 'saborizante', unit: 'L', stock: 4, minStock: 1, cost: 12000, supplierId: 4, location: 'Estante C1', image: DEMO_IMAGES.ingredient[1], createdAt: new Date().toISOString() },
                { name: 'Crema para Batir', category: 'lacteo', unit: 'L', stock: 6, minStock: 2, cost: 4500, supplierId: 3, location: 'Refrigerador', image: DEMO_IMAGES.ingredient[2], createdAt: new Date().toISOString() },
                { name: 'Hielo', category: 'otro', unit: 'kg', stock: 50, minStock: 10, cost: 500, supplierId: 5, location: 'Congelador', image: DEMO_IMAGES.ingredient[0], createdAt: new Date().toISOString() },
                { name: 'Vasos 500ml', category: 'empaque', unit: 'un', stock: 200, minStock: 50, cost: 80, supplierId: 5, location: 'Estante D1', image: DEMO_IMAGES.ingredient[0], createdAt: new Date().toISOString() },
                { name: 'Popotes Ancho', category: 'empaque', unit: 'un', stock: 300, minStock: 100, cost: 30, supplierId: 5, location: 'Estante D1', image: DEMO_IMAGES.ingredient[0], createdAt: new Date().toISOString() },
                { name: 'Tapas Domo', category: 'empaque', unit: 'un', stock: 200, minStock: 50, cost: 40, supplierId: 5, location: 'Estante D1', image: DEMO_IMAGES.ingredient[0], createdAt: new Date().toISOString() }
            ];
            for (const i of demo) await dbAdd(STORE_INGREDIENTS, i);
        }

        // Recetas
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
            for (const r of demo) { if (r.productId) await dbAdd(STORE_RECIPES, r); }
        }

        // Lotes
        const batches = await dbGetAll(STORE_BATCHES);
        if (batches.length === 0) {
            const ingredients = await dbGetAll(STORE_INGREDIENTS);
            const demo = [
                { ingredientId: ingredients[0]?.id, batchNumber: 'TAPI-2026-001', quantity: 5, unit: 'kg', expiryDate: '2026-12-31', receivedDate: '2026-05-01', cost: 8500, notes: 'Lote inicial', createdAt: new Date().toISOString() },
                { ingredientId: ingredients[1]?.id, batchNumber: 'MATCHA-2026-001', quantity: 500, unit: 'g', expiryDate: '2026-11-30', receivedDate: '2026-05-01', cost: 12000, notes: 'Importado', createdAt: new Date().toISOString() },
                { ingredientId: ingredients[2]?.id, batchNumber: 'LECHE-2026-001', quantity: 20, unit: 'L', expiryDate: '2026-05-20', receivedDate: '2026-05-05', cost: 1200, notes: 'Fresca', createdAt: new Date().toISOString() }
            ];
            for (const b of demo) { if (b.ingredientId) await dbAdd(STORE_BATCHES, b); }
        }

        console.log('✅ Datos demo cargados');
    } catch (error) {
        console.error('❌ Error en loadDemoData:', error);
        throw error;
    }
}

// ============== CONFIGURACIÓN ==============
async function loadConfig() {
    try {
        const config = await dbGet(STORE_CONFIG, 'main');
        if (config) {
            const el1 = document.getElementById('config-business-name');
            const el2 = document.getElementById('config-currency');
            const el3 = document.getElementById('config-tax');
            if (el1) el1.value = config.businessName || 'Colibrí Boba Tea';
            if (el2) el2.value = config.currency || 'CLP';
            if (el3) el3.value = config.tax || 0;
        }
    } catch (e) {
        console.log('⚠️ No se pudo cargar config:', e);
    }
}

// ============== EVENT LISTENERS ==============
function setupEventListeners() {
    // Menú
    const menuBtn = document.getElementById('menu-btn');
    const closeSidebarBtn = document.getElementById('close-sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');

    if (menuBtn) menuBtn.addEventListener('click', openSidebar);
    if (closeSidebarBtn) closeSidebarBtn.addEventListener('click', closeSidebar);
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);

    // Navegación
    document.querySelectorAll('.menu-list li').forEach(item => {
        item.addEventListener('click', () => {
            loadModule(item.dataset.module);
            closeSidebar();
        });
    });

    // Carrito
    const cartToggle = document.getElementById('cart-toggle-btn');
    const closeCart = document.getElementById('close-cart');
    if (cartToggle) cartToggle.addEventListener('click', toggleCart);
    if (closeCart) closeCart.addEventListener('click', toggleCart);

    // Notificaciones
    const notifBtn = document.getElementById('notif-btn');
    if (notifBtn) notifBtn.addEventListener('click', () => {
        openModal('notifications-modal');
        loadNotifications();
    });

    // Productos
    const addProductBtn = document.getElementById('add-product-btn');
    const saveProductBtn = document.getElementById('save-product-btn');
    const productSearch = document.getElementById('product-search');
    if (addProductBtn) addProductBtn.addEventListener('click', () => openProductModal());
    if (saveProductBtn) saveProductBtn.addEventListener('click', saveProduct);
    if (productSearch) productSearch.addEventListener('input', (e) => loadProducts(e.target.value));

    // Venta rápida
    const saveQuickSaleBtn = document.getElementById('save-quick-sale-btn');
    if (saveQuickSaleBtn) saveQuickSaleBtn.addEventListener('click', saveQuickSale);

    // Inventario
    const inventoryAddBtn = document.getElementById('inventory-add-btn');
    const inventorySearch = document.getElementById('inventory-search');
    if (inventoryAddBtn) inventoryAddBtn.addEventListener('click', () => openProductModal());
    if (inventorySearch) inventorySearch.addEventListener('input', (e) => loadInventory(e.target.value));

    // Clientes
    const addClientBtn = document.getElementById('add-client-btn');
    const saveClientBtn = document.getElementById('save-client-btn');
    const clientSearch = document.getElementById('client-search');
    if (addClientBtn) addClientBtn.addEventListener('click', () => openClientModal());
    if (saveClientBtn) saveClientBtn.addEventListener('click', saveClient);
    if (clientSearch) clientSearch.addEventListener('input', (e) => loadClients(e.target.value));

    // Deudas
    const saveDebtBtn = document.getElementById('save-debt-btn');
    const savePaymentBtn = document.getElementById('save-payment-btn');
    if (saveDebtBtn) saveDebtBtn.addEventListener('click', saveDebt);
    if (savePaymentBtn) savePaymentBtn.addEventListener('click', savePayment);

    // BODEGA
    const addIngredientBtn = document.getElementById('add-ingredient-btn');
    const saveIngredientBtn = document.getElementById('save-ingredient-btn');
    const ingredientSearch = document.getElementById('ingredient-search');
    if (addIngredientBtn) addIngredientBtn.addEventListener('click', () => openIngredientModal());
    if (saveIngredientBtn) saveIngredientBtn.addEventListener('click', saveIngredient);
    if (ingredientSearch) ingredientSearch.addEventListener('input', (e) => loadIngredients(e.target.value));

    const addRecipeBtn = document.getElementById('add-recipe-btn');
    const saveRecipeBtn = document.getElementById('save-recipe-btn');
    const recipeProduct = document.getElementById('recipe-product');
    const recipeAddItem = document.getElementById('recipe-add-item');
    if (addRecipeBtn) addRecipeBtn.addEventListener('click', () => openRecipeModal());
    if (saveRecipeBtn) saveRecipeBtn.addEventListener('click', saveRecipe);
    if (recipeProduct) recipeProduct.addEventListener('change', updateRecipePreview);
    if (recipeAddItem) recipeAddItem.addEventListener('click', addRecipeItemRow);

    // Compras
    const addPurchaseBtn = document.getElementById('add-purchase-btn');
    const savePurchaseBtn = document.getElementById('save-purchase-btn');
    const purchaseAddItem = document.getElementById('purchase-add-item');
    if (addPurchaseBtn) addPurchaseBtn.addEventListener('click', () => openPurchaseModal());
    if (savePurchaseBtn) savePurchaseBtn.addEventListener('click', savePurchase);
    if (purchaseAddItem) purchaseAddItem.addEventListener('click', addPurchaseItemRow);

    // Mermas
    const addWasteBtn = document.getElementById('add-waste-btn');
    const saveWasteBtn = document.getElementById('save-waste-btn');
    if (addWasteBtn) addWasteBtn.addEventListener('click', () => openWasteModal());
    if (saveWasteBtn) saveWasteBtn.addEventListener('click', saveWaste);

    // Proveedores
    const addSupplierBtn = document.getElementById('add-supplier-btn');
    const saveSupplierBtn = document.getElementById('save-supplier-btn');
    const supplierSearch = document.getElementById('supplier-search');
    if (addSupplierBtn) addSupplierBtn.addEventListener('click', () => openSupplierModal());
    if (saveSupplierBtn) saveSupplierBtn.addEventListener('click', saveSupplier);
    if (supplierSearch) supplierSearch.addEventListener('input', (e) => loadSuppliers(e.target.value));

    // Lotes
    const addBatchBtn = document.getElementById('add-batch-btn');
    const saveBatchBtn = document.getElementById('save-batch-btn');
    if (addBatchBtn) addBatchBtn.addEventListener('click', () => openBatchModal());
    if (saveBatchBtn) saveBatchBtn.addEventListener('click', saveBatch);

    // 🆕 TURNOS
    const shiftOpenBtn = document.getElementById('shift-open-btn');
    const shiftWithdrawBtn = document.getElementById('shift-withdraw-btn');
    const shiftDepositBtn = document.getElementById('shift-deposit-btn');
    const shiftCloseBtn = document.getElementById('shift-close-btn');
    const shiftCloseAmount = document.getElementById('shift-close-amount');
    if (shiftOpenBtn) shiftOpenBtn.addEventListener('click', openShift);
    if (shiftWithdrawBtn) shiftWithdrawBtn.addEventListener('click', withdrawFromShift);
    if (shiftDepositBtn) shiftDepositBtn.addEventListener('click', depositToShift);
    if (shiftCloseBtn) shiftCloseBtn.addEventListener('click', closeShift);
    if (shiftCloseAmount) shiftCloseAmount.addEventListener('input', updateClosePreview);

    // Calculadora
    document.querySelectorAll('.calc-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const value = parseInt(btn.dataset.value);
            const input = document.getElementById('calc-received');
            if (input) {
                input.value = (parseInt(input.value) || 0) + value;
                calculateChange();
            }
        });
    });
    const calcReceived = document.getElementById('calc-received');
    const calcClear = document.getElementById('calc-clear');
    if (calcReceived) calcReceived.addEventListener('input', calculateChange);
    if (calcClear) calcClear.addEventListener('click', () => {
        const input = document.getElementById('calc-received');
        if (input) input.value = '';
        calculateChange();
    });

    // Configuración
    const saveConfigBtn = document.getElementById('save-config-btn');
    const exportDataBtn = document.getElementById('export-data-btn');
    const clearDataBtn = document.getElementById('clear-data-btn');
    if (saveConfigBtn) saveConfigBtn.addEventListener('click', saveConfig);
    if (exportDataBtn) exportDataBtn.addEventListener('click', exportData);
    
    // Robustez
    const exportCsvBtn = document.getElementById('export-csv-btn');
    const viewAuditBtn = document.getElementById('view-audit-btn');
    const restoreBackupBtn = document.getElementById('restore-backup-btn');
    if (exportCsvBtn) exportCsvBtn.addEventListener('click', exportToCSV);
    if (viewAuditBtn) viewAuditBtn.addEventListener('click', viewAuditLogs);
    if (restoreBackupBtn) restoreBackupBtn.addEventListener('click', restoreFromBackup);
    if (clearDataBtn) clearDataBtn.addEventListener('click', () => {
        showConfirm('¿Eliminar TODOS los datos?', clearAllData);
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
    const checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn) checkoutBtn.addEventListener('click', processCheckout);

    // Cerrar modales
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            if (modal) closeModal(modal.id);
        });
    });

    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal(modal.id);
        });
    });

    // Confirmación
    const confirmYes = document.getElementById('confirm-yes');
    const confirmNo = document.getElementById('confirm-no');
    if (confirmYes) confirmYes.addEventListener('click', () => {
        if (deleteCallback) deleteCallback();
        closeModal('confirm-modal');
    });
    if (confirmNo) confirmNo.addEventListener('click', () => closeModal('confirm-modal'));

    // Preview de cuotas
    const debtAmount = document.getElementById('debt-amount');
    const debtInstallments = document.getElementById('debt-installments');
    if (debtAmount) debtAmount.addEventListener('input', updateInstallmentPreview);
    if (debtInstallments) debtInstallments.addEventListener('input', updateInstallmentPreview);

    // Preview de imagen
    const productImageFile = document.getElementById('product-image-file');
    const productImageUrl = document.getElementById('product-image-url');
    if (productImageFile) productImageFile.addEventListener('change', previewImageFile);
    if (productImageUrl) productImageUrl.addEventListener('input', previewImageUrl);

    console.log('✅ Event listeners configurados');
}

// ============== NAVEGACIÓN ==============
function openSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.add('open');
    if (overlay) overlay.classList.add('active');
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('active');
}

function loadModule(module) {
    currentModule = module;
    document.querySelectorAll('.menu-list li').forEach(item => {
        item.classList.toggle('active', item.dataset.module === module);
    });

    const titles = {
        productos: '🧋 Productos', ventas: '💰 Ventas', inventario: '📦 Inventario',
        clientes: '👥 Clientes', deudas: '💳 Deudas / Créditos',
        turnos: '📊 Turnos / Caja',
        bodega: '📦 Bodega / Ingredientes', catalogo: '🌐 Catálogo Web', config: '⚙️ Configuración'
    };
    const titleEl = document.getElementById('module-title');
    if (titleEl) titleEl.textContent = titles[module] || module;

    document.querySelectorAll('.module').forEach(m => m.classList.remove('active'));
    const moduleEl = document.getElementById(`module-${module}`);
    if (moduleEl) moduleEl.classList.add('active');

    switch(module) {
        case 'productos': loadProducts(); break;
        case 'ventas': loadSales(); break;
        case 'inventario': loadInventory(); break;
        case 'clientes': loadClients(); break;
        case 'deudas': loadDebts(); break;
        case 'turnos': loadShifts(); break;
        case 'bodega': loadIngredients(); loadRecipes(); loadSuppliers(); loadBatches(); break;
    }
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function showConfirm(message, callback) {
    const msgEl = document.getElementById('confirm-message');
    if (msgEl) msgEl.textContent = message;
    deleteCallback = callback;
    openModal('confirm-modal');
}

// ============== PRODUCTOS ==============
async function loadProducts(search = '') {
    try {
        const products = await dbGetAll(STORE_PRODUCTS);
        const grid = document.getElementById('products-grid');
        if (!grid) return;

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
    } catch (error) {
        console.error('❌ Error loadProducts:', error);
    }
}

function openProductModal(product = null) {
    try {
        const title = document.getElementById('product-modal-title');
        if (product) {
            if (title) title.textContent = 'Editar Producto';
            document.getElementById('product-id').value = product.id;
            document.getElementById('product-name').value = product.name;
            document.getElementById('product-price').value = product.price;
            document.getElementById('product-cost').value = product.cost || '';
            document.getElementById('product-stock').value = product.stock;
            document.getElementById('product-category').value = product.category;
            document.getElementById('product-image-url').value = product.image || '';
            const preview = document.getElementById('image-preview');
            if (preview) preview.innerHTML = product.image ? `<img src="${product.image}" alt="Preview">` : '';
        } else {
            if (title) title.textContent = 'Nuevo Producto';
            document.getElementById('product-id').value = '';
            document.getElementById('product-name').value = '';
            document.getElementById('product-price').value = '';
            document.getElementById('product-cost').value = '';
            document.getElementById('product-stock').value = '0';
            document.getElementById('product-category').value = 'bubble-tea';
            document.getElementById('product-image-url').value = '';
            const preview = document.getElementById('image-preview');
            if (preview) preview.innerHTML = '';
        }
        openModal('product-modal');
    } catch (error) {
        console.error('❌ Error openProductModal:', error);
    }
}

async function saveProduct() {
    try {
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
            if (existing) product.createdAt = existing.createdAt;
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
    } catch (error) {
        console.error('❌ Error saveProduct:', error);
        showToast('❌ Error al guardar producto', 'error');
    }
}

function previewImageFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        const urlInput = document.getElementById('product-image-url');
        const preview = document.getElementById('image-preview');
        if (urlInput) urlInput.value = event.target.result;
        if (preview) preview.innerHTML = `<img src="${event.target.result}" alt="Preview">`;
    };
    reader.readAsDataURL(file);
}

function previewImageUrl(e) {
    const url = e.target.value.trim();
    const preview = document.getElementById('image-preview');
    if (preview) preview.innerHTML = url ? `<img src="${url}" alt="Preview" onerror="this.style.display='none'">` : '';
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

    if (!cartItems || !cartCount || !cartTotal) return;

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
    const cart = document.getElementById('floating-cart');
    if (cart) cart.classList.toggle('open');
}

// ============== CHECKOUT CON BODEGA ==============
async function processCheckout() {
    if (cart.length === 0) { showToast('❌ Carrito vacío', 'error'); return; }

    try {
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

            // Descontar de BODEGA según receta
            const recipe = recipes.find(r => r.productId === product.id);
            if (recipe && recipe.items) {
                for (const recipeItem of recipe.items) {
                    const ingredient = ingredients.find(i => i.id === recipeItem.ingredientId);
                    if (ingredient) {
                        const amountNeeded = recipeItem.amount * cartItem.qty;
                        if (ingredient.stock < amountNeeded) {
                            showToast(`❌ Sin stock: ${ingredient.name} (necesita ${amountNeeded} ${ingredient.unit})`, 'error');
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

        // 🆕 Agregar venta al turno actual
        if (typeof addSaleToShift === 'function') await addSaleToShift(total);

        cart = []; updateCartUI(); toggleCart();
        if (currentPaymentMethod === 'efectivo') showCalculator(total);
        showToast(`✅ Venta: ${formatMoney(total)}`, 'success');

        if (currentModule === 'productos') loadProducts();
        if (currentModule === 'ventas') loadSales();
        if (currentModule === 'inventario') loadInventory();
        if (currentModule === 'bodega') loadIngredients();
    } catch (error) {
        console.error('❌ Error processCheckout:', error);
        showToast('❌ Error al procesar venta', 'error');
    }
}

function showCalculator(total) {
    const calcTotal = document.getElementById('calc-total');
    const calcReceived = document.getElementById('calc-received');
    const calcChange = document.getElementById('calc-change');
    if (calcTotal) calcTotal.textContent = formatMoney(total);
    if (calcReceived) calcReceived.value = '';
    if (calcChange) calcChange.textContent = '$0';
    openModal('calculator-modal');
}

function calculateChange() {
    const calcTotal = document.getElementById('calc-total');
    const calcReceived = document.getElementById('calc-received');
    const calcChange = document.getElementById('calc-change');
    if (!calcTotal || !calcReceived || !calcChange) return;

    const total = parseMoney(calcTotal.textContent);
    const received = parseFloat(calcReceived.value) || 0;
    const change = received - total;
    calcChange.textContent = formatMoney(change > 0 ? change : 0);
    calcChange.style.color = change >= 0 ? '#ffd93d' : '#e74c3c';
}

// ============== VENTAS ==============
async function loadSales() {
    try {
        const sales = await dbGetAll(STORE_SALES);
        const list = document.getElementById('sales-list');
        if (!list) return;

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

        const todayEl = document.getElementById('today-sales');
        const weekEl = document.getElementById('week-sales');
        const monthEl = document.getElementById('month-sales');
        if (todayEl) todayEl.textContent = formatMoney(todayTotal);
        if (weekEl) weekEl.textContent = formatMoney(weekTotal);
        if (monthEl) monthEl.textContent = formatMoney(monthTotal);

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
    } catch (error) {
        console.error('❌ Error loadSales:', error);
    }
}

// ============== INVENTARIO ==============
async function loadInventory(search = '') {
    try {
        const products = await dbGetAll(STORE_PRODUCTS);
        const list = document.getElementById('inventory-list');
        if (!list) return;

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
    } catch (error) {
        console.error('❌ Error loadInventory:', error);
    }
}

async function editProduct(id) {
    try {
        const product = await dbGet(STORE_PRODUCTS, id);
        if (product) openProductModal(product);
    } catch (error) {
        console.error('❌ Error editProduct:', error);
    }
}

async function deleteProduct(id) {
    showConfirm('¿Eliminar producto?', async () => {
        try {
            await dbDelete(STORE_PRODUCTS, id);
            showToast('🗑️ Producto eliminado', 'success');
            loadInventory();
            if (currentModule === 'productos') loadProducts();
        } catch (error) {
            console.error('❌ Error deleteProduct:', error);
        }
    });
}

// ============== CLIENTES ==============
async function loadClients(search = '') {
    try {
        const clients = await dbGetAll(STORE_CLIENTS);
        const list = document.getElementById('clients-list');
        if (!list) return;

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
    } catch (error) {
        console.error('❌ Error loadClients:', error);
    }
}

function openClientModal(client = null) {
    try {
        const title = document.getElementById('client-modal-title');
        if (client) {
            if (title) title.textContent = 'Editar Cliente';
            document.getElementById('client-id').value = client.id;
            document.getElementById('client-name').value = client.name;
            document.getElementById('client-phone').value = client.phone || '';
            document.getElementById('client-email').value = client.email || '';
            document.getElementById('client-address').value = client.address || '';
            document.getElementById('client-notes').value = client.notes || '';
        } else {
            if (title) title.textContent = 'Nuevo Cliente';
            document.getElementById('client-id').value = '';
            document.getElementById('client-name').value = '';
            document.getElementById('client-phone').value = '';
            document.getElementById('client-email').value = '';
            document.getElementById('client-address').value = '';
            document.getElementById('client-notes').value = '';
        }
        openModal('client-modal');
    } catch (error) {
        console.error('❌ Error openClientModal:', error);
    }
}

async function saveClient() {
    try {
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
            if (existing) client.createdAt = existing.createdAt;
            await dbPut(STORE_CLIENTS, client);
            showToast('✅ Cliente actualizado', 'success');
        } else {
            client.createdAt = new Date().toISOString();
            await dbAdd(STORE_CLIENTS, client);
            showToast('✅ Cliente creado', 'success');
        }
        closeModal('client-modal');
        loadClients();
    } catch (error) {
        console.error('❌ Error saveClient:', error);
        showToast('❌ Error al guardar cliente', 'error');
    }
}

async function editClient(id) {
    try {
        const client = await dbGet(STORE_CLIENTS, id);
        if (client) openClientModal(client);
    } catch (error) {
        console.error('❌ Error editClient:', error);
    }
}

async function deleteClient(id) {
    showConfirm('¿Eliminar cliente?', async () => {
        try {
            await dbDelete(STORE_CLIENTS, id);
            showToast('🗑️ Cliente eliminado', 'success');
            loadClients();
        } catch (error) {
            console.error('❌ Error deleteClient:', error);
        }
    });
}

// ============== DEUDAS ==============
async function loadDebts() {
    try {
        const debts = await dbGetAll(STORE_DEBTS);
        const list = document.getElementById('debts-list');
        if (!list) return;

        let totalDebt = 0, totalPaid = 0;
        debts.forEach(d => { totalDebt += d.amount; totalPaid += d.paid || 0; });

        const totalDebtEl = document.getElementById('total-debt');
        const totalPaidEl = document.getElementById('total-paid');
        if (totalDebtEl) totalDebtEl.textContent = formatMoney(totalDebt);
        if (totalPaidEl) totalPaidEl.textContent = formatMoney(totalPaid);

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
    } catch (error) {
        console.error('❌ Error loadDebts:', error);
    }
}

function getDebtStatus(debt) {
    if (debt.remaining <= 0) return { text: 'Pagado', class: 'paid' };
    try {
        if (new Date(debt.dueDate) < new Date() && debt.remaining > 0) return { text: 'Vencido', class: 'overdue' };
    } catch (e) {}
    return { text: 'Pendiente', class: 'pending' };
}

async function openDebtModal() {
    try {
        const clients = await dbGetAll(STORE_CLIENTS);
        const select = document.getElementById('debt-client');
        if (select) {
            select.innerHTML = '<option value="">Seleccionar...</option>' + clients.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        }
        document.getElementById('debt-id').value = '';
        document.getElementById('debt-amount').value = '';
        document.getElementById('debt-installments').value = '1';
        document.getElementById('debt-due-date').value = '';
        document.getElementById('debt-description').value = '';
        const preview = document.getElementById('installment-preview');
        if (preview) preview.innerHTML = '';
        openModal('debt-modal');
    } catch (error) {
        console.error('❌ Error openDebtModal:', error);
    }
}

function updateInstallmentPreview() {
    try {
        const amount = parseFloat(document.getElementById('debt-amount').value) || 0;
        const installments = parseInt(document.getElementById('debt-installments').value) || 1;
        const preview = document.getElementById('installment-preview');
        if (!preview) return;
        if (amount <= 0 || installments <= 0) { preview.innerHTML = ''; return; }

        const installmentAmount = Math.round(amount / installments);
        const dueDate = document.getElementById('debt-due-date').value;
        let html = '<h4>📅 Vista previa:</h4>';
        for (let i = 1; i <= installments; i++) {
            let dateStr = 'Fecha por definir';
            if (dueDate) { const d = new Date(dueDate); d.setMonth(d.getMonth() + (i - 1)); dateStr = d.toLocaleDateString('es-CL'); }
            html += `<div class="installment-item"><span>Cuota ${i}</span><span><strong>${formatMoney(installmentAmount)}</strong> - ${dateStr}</span></div>`;
        }
        preview.innerHTML = html;
    } catch (error) {
        console.error('❌ Error updateInstallmentPreview:', error);
    }
}

async function saveDebt() {
    try {
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
    } catch (error) {
        console.error('❌ Error saveDebt:', error);
        showToast('❌ Error al registrar deuda', 'error');
    }
}

async function payDebt(debtId) {
    try {
        const debt = await dbGet(STORE_DEBTS, debtId);
        if (!debt) return;
        document.getElementById('payment-debt-id').value = debtId;
        document.getElementById('payment-amount').value = debt.remaining;
        document.getElementById('payment-method').value = 'efectivo';
        document.getElementById('payment-note').value = '';
        openModal('payment-modal');
    } catch (error) {
        console.error('❌ Error payDebt:', error);
    }
}

async function savePayment() {
    try {
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
    } catch (error) {
        console.error('❌ Error savePayment:', error);
        showToast('❌ Error al registrar pago', 'error');
    }
}

async function viewDebtHistory(debtId) {
    try {
        const payments = await dbGetAll(STORE_PAYMENTS);
        const debtPayments = payments.filter(p => p.debtId === debtId).sort((a, b) => b.timestamp - a.timestamp);
        if (debtPayments.length === 0) { showToast('ℹ️ Sin pagos', 'warning'); return; }

        const history = debtPayments.map(p => {
            const d = new Date(p.date);
            return `📅 ${d.toLocaleDateString('es-CL')} ${d.toLocaleTimeString('es-CL')} - ${formatMoney(p.amount)} (${p.method})${p.note ? ' - ' + p.note : ''}`;
        }).join('\n');
        alert(`📋 Historial:\n\n${history}`);
    } catch (error) {
        console.error('❌ Error viewDebtHistory:', error);
    }
}

async function deleteDebt(id) {
    showConfirm('¿Eliminar deuda?', async () => {
        try {
            const payments = await dbGetAll(STORE_PAYMENTS);
            for (const p of payments.filter(p => p.debtId === id)) await dbDelete(STORE_PAYMENTS, p.id);
            await dbDelete(STORE_DEBTS, id);
            showToast('🗑️ Deuda eliminada', 'success');
            loadDebts();
        } catch (error) {
            console.error('❌ Error deleteDebt:', error);
        }
    });
}

// ============== BODEGA / INGREDIENTES ==============
async function loadIngredients(search = '') {
    try {
        const ingredients = await dbGetAll(STORE_INGREDIENTS);
        const suppliers = await dbGetAll(STORE_SUPPLIERS);
        const list = document.getElementById('ingredients-list');
        if (!list) return;

        const filtered = search ? ingredients.filter(i => i.name.toLowerCase().includes(search.toLowerCase())) : ingredients;
        filtered.sort((a, b) => a.name.localeCompare(b.name));

        let totalValue = 0, lowStock = 0;
        ingredients.forEach(i => { totalValue += (i.stock * i.cost); if (i.stock <= i.minStock) lowStock++; });

        const totalValueEl = document.getElementById('bodega-total-value');
        const lowStockEl = document.getElementById('bodega-low-stock');
        if (totalValueEl) totalValueEl.textContent = formatMoney(totalValue);
        if (lowStockEl) lowStockEl.textContent = lowStock;

        if (filtered.length === 0) {
            list.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📦</div><p class="empty-state-text">No hay ingredientes</p><button class="btn-primary" onclick="openIngredientModal()">+ Agregar Ingrediente</button></div>`;
            return;
        }

        const catEmojis = { tapioca: '⚫', te: '🍃', lacteo: '🥛', endulzante: '🍯', saborizante: '🧪', empaque: '📦', otro: '🔧' };
        const catLabels = { tapioca: 'Perlas', te: 'Té', lacteo: 'Lácteo', endulzante: 'Endulzante', saborizante: 'Saborizante', empaque: 'Empaque', otro: 'Otro' };

        list.innerHTML = filtered.map(ing => {
            const supplier = suppliers.find(s => s.id == ing.supplierId);
            const isLow = ing.stock <= ing.minStock;
            return `
                <div class="list-item">
                    <div class="list-icon">${catEmojis[ing.category] || '📦'}</div>
                    <div class="list-content" style="flex:1;">
                        <div class="list-title">${ing.name} <span class="ingredient-category ${ing.category}">${catLabels[ing.category] || ing.category}</span></div>
                        <div class="list-subtitle">
                            ${supplier ? supplier.name : 'Sin proveedor'} • ${ing.location || 'Sin ubicación'}<br>
                            Stock: <strong class="${isLow ? 'low' : ''}">${ing.stock} ${ing.unit}</strong> • 
                            Mín: ${ing.minStock} ${ing.unit} • 
                            <span class="debt-status ${isLow ? 'overdue' : 'paid'}">${isLow ? '¡Stock bajo!' : 'OK'}</span>
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
    } catch (error) {
        console.error('❌ Error loadIngredients:', error);
    }
}

async function openIngredientModal(ingredient = null) {
    try {
        const title = document.getElementById('ingredient-modal-title');
        if (ingredient) {
            if (title) title.textContent = 'Editar Ingrediente';
            document.getElementById('ingredient-id').value = ingredient.id;
            document.getElementById('ingredient-name').value = ingredient.name;
            document.getElementById('ingredient-category').value = ingredient.category;
            document.getElementById('ingredient-unit').value = ingredient.unit;
            document.getElementById('ingredient-stock').value = ingredient.stock;
            document.getElementById('ingredient-min-stock').value = ingredient.minStock;
            document.getElementById('ingredient-cost').value = ingredient.cost;
            document.getElementById('ingredient-location').value = ingredient.location || '';
        } else {
            if (title) title.textContent = 'Nuevo Ingrediente';
            document.getElementById('ingredient-id').value = '';
            document.getElementById('ingredient-name').value = '';
            document.getElementById('ingredient-category').value = 'tapioca';
            document.getElementById('ingredient-unit').value = 'kg';
            document.getElementById('ingredient-stock').value = '0';
            document.getElementById('ingredient-min-stock').value = '1';
            document.getElementById('ingredient-cost').value = '';
            document.getElementById('ingredient-location').value = '';
        }

        // Cargar proveedores
        const suppliers = await dbGetAll(STORE_SUPPLIERS);
        const select = document.getElementById('ingredient-supplier');
        if (select) {
            const currentVal = ingredient ? ingredient.supplierId : '';
            select.innerHTML = '<option value="">Sin proveedor</option>' + suppliers.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
            select.value = currentVal || '';
        }
        openModal('ingredient-modal');
    } catch (error) {
        console.error('❌ Error openIngredientModal:', error);
    }
}

async function saveIngredient() {
    try {
        const id = document.getElementById('ingredient-id').value;
        const name = document.getElementById('ingredient-name').value.trim();
        const category = document.getElementById('ingredient-category').value;
        const unit = document.getElementById('ingredient-unit').value.trim();
        const stock = parseFloat(document.getElementById('ingredient-stock').value) || 0;
        const minStock = parseFloat(document.getElementById('ingredient-min-stock').value) || 0;
        const cost = parseFloat(document.getElementById('ingredient-cost').value) || 0;
        const supplierId = document.getElementById('ingredient-supplier').value ? parseInt(document.getElementById('ingredient-supplier').value) : null;
        const location = document.getElementById('ingredient-location').value.trim();

        if (!name || !unit) { showToast('❌ Nombre y unidad obligatorios', 'error'); return; }

        const ingredient = { name, category, unit, stock, minStock, cost, supplierId, location, updatedAt: new Date().toISOString() };
        if (id) {
            ingredient.id = parseInt(id);
            const existing = await dbGet(STORE_INGREDIENTS, ingredient.id);
            if (existing) {
                ingredient.createdAt = existing.createdAt;
                ingredient.image = existing.image;
            }
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
    } catch (error) {
        console.error('❌ Error saveIngredient:', error);
        showToast('❌ Error al guardar ingrediente', 'error');
    }
}

async function editIngredient(id) {
    try {
        const ingredient = await dbGet(STORE_INGREDIENTS, id);
        if (ingredient) openIngredientModal(ingredient);
    } catch (error) {
        console.error('❌ Error editIngredient:', error);
    }
}

async function deleteIngredient(id) {
    showConfirm('¿Eliminar ingrediente?', async () => {
        try {
            await dbDelete(STORE_INGREDIENTS, id);
            showToast('🗑️ Ingrediente eliminado', 'success');
            loadIngredients();
        } catch (error) {
            console.error('❌ Error deleteIngredient:', error);
        }
    });
}

// ============== RECETAS ==============
async function loadRecipes() {
    try {
        const recipes = await dbGetAll(STORE_RECIPES);
        const products = await dbGetAll(STORE_PRODUCTS);
        const ingredients = await dbGetAll(STORE_INGREDIENTS);
        const list = document.getElementById('recipes-list');
        if (!list) return;

        if (recipes.length === 0) {
            list.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🧪</div><p class="empty-state-text">No hay recetas</p><button class="btn-primary" onclick="openRecipeModal()">+ Crear Receta</button></div>`;
            return;
        }

        list.innerHTML = recipes.map(recipe => {
            const product = products.find(p => p.id === recipe.productId);
            const itemsCount = recipe.items ? recipe.items.length : 0;

            let recipeCost = 0;
            if (recipe.items) {
                recipe.items.forEach(item => {
                    const ing = ingredients.find(i => i.id === item.ingredientId);
                    if (ing) recipeCost += item.amount * ing.cost;
                });
            }
            const profit = product ? product.price - recipeCost : 0;
            const margin = product && product.price > 0 ? ((profit / product.price) * 100).toFixed(1) : 0;

            return `
                <div class="list-item">
                    <div class="list-icon">🧪</div>
                    <div class="list-content" style="flex:1;">
                        <div class="list-title">${recipe.name}</div>
                        <div class="list-subtitle">Producto: ${product ? product.name : 'Desconocido'} • ${itemsCount} ingredientes</div>
                        <div style="margin-top:6px;font-size:13px;">
                            <span style="color:var(--primary);">Costo: ${formatMoney(recipeCost)}</span> • 
                            <span style="color:${profit >= 0 ? 'var(--primary)' : '#e74c3c'};">Ganancia: ${formatMoney(profit)} (${margin}%)</span>
                        </div>
                    </div>
                    <div class="list-actions">
                        <button class="action-btn edit" onclick="viewRecipe(${recipe.id})">👁️</button>
                        <button class="action-btn delete" onclick="deleteRecipe(${recipe.id})">🗑️</button>
                    </div>
                </div>`;
        }).join('');
    } catch (error) {
        console.error('❌ Error loadRecipes:', error);
    }
}

async function openRecipeModal() {
    try {
        const products = await dbGetAll(STORE_PRODUCTS);
        const select = document.getElementById('recipe-product');
        if (select) {
            select.innerHTML = '<option value="">Seleccionar producto...</option>' + products.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
        }

        recipeItems = [];
        document.getElementById('recipe-id').value = '';
        const container = document.getElementById('recipe-items-container');
        if (container) container.innerHTML = '';
        updateRecipePreview();
        openModal('recipe-modal');
    } catch (error) {
        console.error('❌ Error openRecipeModal:', error);
    }
}

function addRecipeItemRow() {
    try {
        const container = document.getElementById('recipe-items-container');
        if (!container) return;

        const row = document.createElement('div');
        row.className = 'recipe-item-row';
        row.innerHTML = `
            <select class="recipe-item-ingredient" style="flex:2;padding:10px;background:var(--glass);border:1px solid var(--glass-border);border-radius:8px;color:var(--light);">
                <option value="">Ingrediente...</option>
            </select>
            <input type="number" class="recipe-item-amount" placeholder="Cant" step="0.01" style="width:80px;padding:10px;background:var(--glass);border:1px solid var(--glass-border);border-radius:8px;color:var(--light);">
            <span class="recipe-item-unit" style="color:rgba(255,255,255,0.5);font-size:13px;">-</span>
            <button onclick="this.parentElement.remove(); updateRecipePreview();" style="background:none;border:none;color:#e74c3c;font-size:18px;cursor:pointer;">×</button>
        `;
        container.appendChild(row);

        dbGetAll(STORE_INGREDIENTS).then(ings => {
            const select = row.querySelector('.recipe-item-ingredient');
            if (select) {
                select.innerHTML = '<option value="">Ingrediente...</option>' + ings.map(i => `<option value="${i.id}" data-unit="${i.unit}">${i.name} (${i.unit})</option>`).join('');
                select.addEventListener('change', (e) => {
                    const option = e.target.selectedOptions[0];
                    const unitSpan = row.querySelector('.recipe-item-unit');
                    if (unitSpan) unitSpan.textContent = option ? (option.dataset.unit || '-') : '-';
                    updateRecipePreview();
                });
            }
        });

        const amountInput = row.querySelector('.recipe-item-amount');
        if (amountInput) amountInput.addEventListener('input', updateRecipePreview);
    } catch (error) {
        console.error('❌ Error addRecipeItemRow:', error);
    }
}

async function updateRecipePreview() {
    try {
        const productId = document.getElementById('recipe-product').value;
        const preview = document.getElementById('recipe-preview');
        if (!preview) return;
        if (!productId) { preview.innerHTML = ''; return; }

        const product = await dbGet(STORE_PRODUCTS, parseInt(productId));
        const ingredients = await dbGetAll(STORE_INGREDIENTS);

        let totalCost = 0;
        let html = '<h4>🧪 Vista previa:</h4>';

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
    } catch (error) {
        console.error('❌ Error updateRecipePreview:', error);
    }
}

async function saveRecipe() {
    try {
        const productId = parseInt(document.getElementById('recipe-product').value);
        if (!productId) { showToast('❌ Selecciona un producto', 'error'); return; }

        const product = await dbGet(STORE_PRODUCTS, productId);
        const items = [];

        document.querySelectorAll('.recipe-item-row').forEach(row => {
            const ingId = row.querySelector('.recipe-item-ingredient').value;
            const amount = parseFloat(row.querySelector('.recipe-item-amount').value);
            const unit = row.querySelector('.recipe-item-unit').textContent;
            if (ingId && amount > 0) items.push({ ingredientId: parseInt(ingId), amount, unit: unit !== '-' ? unit : '' });
        });

        if (items.length === 0) { showToast('❌ Agrega al menos un ingrediente', 'error'); return; }

        const recipe = { productId, name: product ? product.name : 'Receta', items, createdAt: new Date().toISOString() };
        await dbAdd(STORE_RECIPES, recipe);
        showToast('✅ Receta guardada', 'success');
        closeModal('recipe-modal');
        loadRecipes();
    } catch (error) {
        console.error('❌ Error saveRecipe:', error);
        showToast('❌ Error al guardar receta', 'error');
    }
}

async function viewRecipe(id) {
    try {
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
                details += `• ${ing.name}: ${item.amount} ${item.unit || ing.unit} = ${formatMoney(cost)}\n`;
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
    } catch (error) {
        console.error('❌ Error viewRecipe:', error);
    }
}

async function deleteRecipe(id) {
    showConfirm('¿Eliminar receta?', async () => {
        try {
            await dbDelete(STORE_RECIPES, id);
            showToast('🗑️ Receta eliminada', 'success');
            loadRecipes();
        } catch (error) {
            console.error('❌ Error deleteRecipe:', error);
        }
    });
}

// ============== COMPRAS / ENTRADA DE MERCANCÍA ==============
async function loadPurchases() {
    try {
        const purchases = await dbGetAll(STORE_PURCHASES);
        const suppliers = await dbGetAll(STORE_SUPPLIERS);
        const list = document.getElementById('purchases-list');
        if (!list) return;

        let totalMonth = 0;
        const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        purchases.forEach(p => { if (new Date(p.date) >= monthAgo) totalMonth += p.total; });

        const purchasesMonthEl = document.getElementById('bodega-purchases-month');
        if (purchasesMonthEl) purchasesMonthEl.textContent = formatMoney(totalMonth);

        purchases.sort((a, b) => new Date(b.date) - new Date(a.date));

        if (purchases.length === 0) {
            list.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📥</div><p class="empty-state-text">No hay compras registradas</p><button class="btn-primary" onclick="openPurchaseModal()">+ Registrar Compra</button></div>`;
            return;
        }

        list.innerHTML = purchases.map(purchase => {
            const supplier = suppliers.find(s => s.id == purchase.supplierId);
            const date = new Date(purchase.date);
            return `
                <div class="list-item">
                    <div class="list-icon">📥</div>
                    <div class="list-content" style="flex:1;">
                        <div class="list-title">${supplier ? supplier.name : 'Proveedor desconocido'}</div>
                        <div class="list-subtitle">${date.toLocaleDateString('es-CL')} • ${purchase.items ? purchase.items.length : 0} productos • ${purchase.paymentMethod || 'Contado'}</div>
                        ${purchase.notes ? `<div style="font-size:12px;color:rgba(255,255,255,0.4);margin-top:4px;">📝 ${purchase.notes}</div>` : ''}
                    </div>
                    <div class="list-amount">${formatMoney(purchase.total)}</div>
                </div>`;
        }).join('');
    } catch (error) {
        console.error('❌ Error loadPurchases:', error);
    }
}

async function openPurchaseModal() {
    try {
        const suppliers = await dbGetAll(STORE_SUPPLIERS);
        const select = document.getElementById('purchase-supplier');
        if (select) {
            select.innerHTML = '<option value="">Seleccionar proveedor...</option>' + suppliers.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
        }

        purchaseItems = [];
        document.getElementById('purchase-id').value = '';
        const dateInput = document.getElementById('purchase-date');
        if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
        const paymentSelect = document.getElementById('purchase-payment');
        if (paymentSelect) paymentSelect.value = 'contado';
        document.getElementById('purchase-notes').value = '';
        const container = document.getElementById('purchase-items-container');
        if (container) container.innerHTML = '';
        const totalEl = document.getElementById('purchase-total');
        if (totalEl) totalEl.textContent = '$0';

        openModal('purchase-modal');
    } catch (error) {
        console.error('❌ Error openPurchaseModal:', error);
    }
}

function addPurchaseItemRow() {
    try {
        const container = document.getElementById('purchase-items-container');
        if (!container) return;

        const row = document.createElement('div');
        row.className = 'recipe-item-row';
        row.innerHTML = `
            <select class="purchase-item-ingredient" style="flex:2;padding:10px;background:var(--glass);border:1px solid var(--glass-border);border-radius:8px;color:var(--light);">
                <option value="">Ingrediente...</option>
            </select>
            <input type="number" class="purchase-item-qty" placeholder="Cant" step="0.01" style="width:80px;padding:10px;background:var(--glass);border:1px solid var(--glass-border);border-radius:8px;color:var(--light);">
            <input type="number" class="purchase-item-cost" placeholder="Costo" step="1" style="width:100px;padding:10px;background:var(--glass);border:1px solid var(--glass-border);border-radius:8px;color:var(--light);">
            <span class="purchase-item-total" style="color:var(--primary);font-weight:600;min-width:70px;text-align:right;">$0</span>
            <button onclick="this.parentElement.remove(); updatePurchaseTotal();" style="background:none;border:none;color:#e74c3c;font-size:18px;cursor:pointer;">×</button>
        `;
        container.appendChild(row);

        dbGetAll(STORE_INGREDIENTS).then(ings => {
            const select = row.querySelector('.purchase-item-ingredient');
            if (select) {
                select.innerHTML = '<option value="">Ingrediente...</option>' + ings.map(i => `<option value="${i.id}" data-cost="${i.cost}">${i.name} (${i.unit})</option>`).join('');
                select.addEventListener('change', (e) => {
                    const option = e.target.selectedOptions[0];
                    const costInput = row.querySelector('.purchase-item-cost');
                    if (costInput && option && option.dataset.cost) costInput.value = option.dataset.cost;
                    updatePurchaseTotal();
                });
            }
        });

        const qtyInput = row.querySelector('.purchase-item-qty');
        const costInput = row.querySelector('.purchase-item-cost');
        if (qtyInput) qtyInput.addEventListener('input', updatePurchaseTotal);
        if (costInput) costInput.addEventListener('input', updatePurchaseTotal);
    } catch (error) {
        console.error('❌ Error addPurchaseItemRow:', error);
    }
}

function updatePurchaseTotal() {
    try {
        let total = 0;
        document.querySelectorAll('#purchase-items-container .recipe-item-row').forEach(row => {
            const qty = parseFloat(row.querySelector('.purchase-item-qty')?.value) || 0;
            const cost = parseFloat(row.querySelector('.purchase-item-cost')?.value) || 0;
            const itemTotal = qty * cost;
            total += itemTotal;
            const totalSpan = row.querySelector('.purchase-item-total');
            if (totalSpan) totalSpan.textContent = formatMoney(itemTotal);
        });
        const totalEl = document.getElementById('purchase-total');
        if (totalEl) totalEl.textContent = formatMoney(total);
    } catch (error) {
        console.error('❌ Error updatePurchaseTotal:', error);
    }
}

async function savePurchase() {
    try {
        const supplierId = parseInt(document.getElementById('purchase-supplier').value);
        const date = document.getElementById('purchase-date').value;
        const paymentMethod = document.getElementById('purchase-payment').value;
        const notes = document.getElementById('purchase-notes').value.trim();

        if (!supplierId) { showToast('❌ Selecciona un proveedor', 'error'); return; }

        const items = [];
        let total = 0;

        document.querySelectorAll('#purchase-items-container .recipe-item-row').forEach(row => {
            const ingId = row.querySelector('.purchase-item-ingredient').value;
            const qty = parseFloat(row.querySelector('.purchase-item-qty').value);
            const cost = parseFloat(row.querySelector('.purchase-item-cost').value);
            if (ingId && qty > 0 && cost >= 0) {
                items.push({ ingredientId: parseInt(ingId), quantity: qty, cost, total: qty * cost });
                total += qty * cost;
            }
        });

        if (items.length === 0) { showToast('❌ Agrega al menos un item', 'error'); return; }

        // Actualizar stock y costo promedio
        for (const item of items) {
            const ingredient = await dbGet(STORE_INGREDIENTS, item.ingredientId);
            if (ingredient) {
                const oldTotalValue = ingredient.stock * ingredient.cost;
                const newTotalValue = item.quantity * item.cost;
                const newStock = ingredient.stock + item.quantity;
                ingredient.stock = newStock;
                if (newStock > 0) {
                    ingredient.cost = (oldTotalValue + newTotalValue) / newStock;
                }
                await dbPut(STORE_INGREDIENTS, ingredient);
            }
        }

        await dbAdd(STORE_PURCHASES, {
            supplierId, date, paymentMethod, notes, items, total,
            createdAt: new Date().toISOString()
        });

        showToast(`✅ Compra registrada: ${formatMoney(total)}`, 'success');
        closeModal('purchase-modal');
        loadPurchases();
        loadIngredients();
    } catch (error) {
        console.error('❌ Error savePurchase:', error);
        showToast('❌ Error al registrar compra', 'error');
    }
}

// ============== MERMAS ==============
async function loadWaste() {
    try {
        const waste = await dbGetAll(STORE_WASTE);
        const ingredients = await dbGetAll(STORE_INGREDIENTS);
        const list = document.getElementById('waste-list');
        if (!list) return;

        let totalMonth = 0;
        const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        waste.forEach(w => { if (new Date(w.date) >= monthAgo) totalMonth += w.cost || 0; });

        const wasteMonthEl = document.getElementById('bodega-waste-month');
        if (wasteMonthEl) wasteMonthEl.textContent = formatMoney(totalMonth);

        waste.sort((a, b) => new Date(b.date) - new Date(a.date));

        if (waste.length === 0) {
            list.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🗑️</div><p class="empty-state-text">No hay mermas registradas</p><button class="btn-primary" onclick="openWasteModal()">+ Registrar Merma</button></div>`;
            return;
        }

        list.innerHTML = waste.map(w => {
            const ingredient = ingredients.find(i => i.id === w.ingredientId);
            const date = new Date(w.date);
            return `
                <div class="list-item">
                    <div class="list-icon">🗑️</div>
                    <div class="list-content" style="flex:1;">
                        <div class="list-title">${ingredient ? ingredient.name : 'Desconocido'}</div>
                        <div class="list-subtitle">${date.toLocaleDateString('es-CL')} • ${w.quantity} ${w.unit || ''} perdidos • ${w.reason || 'Sin motivo'}</div>
                    </div>
                    <div class="list-amount" style="color:#e74c3c;">${formatMoney(w.cost || 0)}</div>
                </div>`;
        }).join('');
    } catch (error) {
        console.error('❌ Error loadWaste:', error);
    }
}

async function openWasteModal() {
    try {
        const ingredients = await dbGetAll(STORE_INGREDIENTS);
        const select = document.getElementById('waste-ingredient');
        if (select) {
            select.innerHTML = '<option value="">Seleccionar ingrediente...</option>' + ingredients.map(i => `<option value="${i.id}" data-unit="${i.unit}" data-cost="${i.cost}">${i.name} (${i.unit})</option>`).join('');
        }

        document.getElementById('waste-id').value = '';
        document.getElementById('waste-quantity').value = '';
        const reasonSelect = document.getElementById('waste-reason');
        if (reasonSelect) reasonSelect.value = 'Vencido';
        const costEl = document.getElementById('waste-cost');
        if (costEl) costEl.textContent = '$0';

        if (select) select.addEventListener('change', updateWasteCost);
        const qtyInput = document.getElementById('waste-quantity');
        if (qtyInput) qtyInput.addEventListener('input', updateWasteCost);

        openModal('waste-modal');
    } catch (error) {
        console.error('❌ Error openWasteModal:', error);
    }
}

function updateWasteCost() {
    try {
        const select = document.getElementById('waste-ingredient');
        const option = select ? select.selectedOptions[0] : null;
        const qty = parseFloat(document.getElementById('waste-quantity')?.value) || 0;
        const cost = parseFloat(option?.dataset.cost) || 0;
        const total = qty * cost;
        const costEl = document.getElementById('waste-cost');
        if (costEl) costEl.textContent = formatMoney(total);
    } catch (error) {
        console.error('❌ Error updateWasteCost:', error);
    }
}

async function saveWaste() {
    try {
        const ingredientId = parseInt(document.getElementById('waste-ingredient').value);
        const quantity = parseFloat(document.getElementById('waste-quantity').value);
        const reason = document.getElementById('waste-reason').value;

        if (!ingredientId || !quantity || quantity <= 0) { showToast('❌ Ingrediente y cantidad obligatorios', 'error'); return; }

        const ingredient = await dbGet(STORE_INGREDIENTS, ingredientId);
        if (!ingredient) { showToast('❌ Ingrediente no encontrado', 'error'); return; }

        if (ingredient.stock < quantity) { showToast(`❌ Stock insuficiente: solo ${ingredient.stock} ${ingredient.unit}`, 'error'); return; }

        const cost = quantity * ingredient.cost;
        ingredient.stock -= quantity;
        await dbPut(STORE_INGREDIENTS, ingredient);

        await dbAdd(STORE_WASTE, {
            ingredientId, quantity, unit: ingredient.unit, cost, reason,
            date: new Date().toISOString(), createdAt: new Date().toISOString()
        });

        showToast(`🗑️ Merma registrada: ${formatMoney(cost)}`, 'warning');
        closeModal('waste-modal');
        loadWaste();
        loadIngredients();
    } catch (error) {
        console.error('❌ Error saveWaste:', error);
        showToast('❌ Error al registrar merma', 'error');
    }
}

// ============== PROVEEDORES ==============
async function loadSuppliers(search = '') {
    try {
        const suppliers = await dbGetAll(STORE_SUPPLIERS);
        const list = document.getElementById('suppliers-list');
        if (!list) return;

        const filtered = search ? suppliers.filter(s => s.name.toLowerCase().includes(search.toLowerCase())) : suppliers;
        filtered.sort((a, b) => a.name.localeCompare(b.name));

        if (filtered.length === 0) {
            list.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🏭</div><p class="empty-state-text">No hay proveedores</p><button class="btn-primary" onclick="openSupplierModal()">+ Agregar Proveedor</button></div>`;
            return;
        }

        list.innerHTML = filtered.map(s => `
            <div class="list-item">
                <div class="list-icon">🏭</div>
                <div class="list-content" style="flex:1;">
                    <div class="list-title">${s.name}</div>
                    <div class="list-subtitle">${s.contact || 'Sin contacto'} • ${s.phone || 'Sin teléfono'}</div>
                    <div style="font-size:12px;color:rgba(255,255,255,0.5);margin-top:4px;">
                        ${s.taxId ? `RUT: ${s.taxId} • ` : ''}${s.paymentTerms || 'Sin condiciones'}
                    </div>
                </div>
                <div class="list-actions" style="flex-direction:column;gap:6px;">
                    <button class="action-btn edit" onclick="editSupplier(${s.id})">✏️</button>
                    <button class="action-btn delete" onclick="deleteSupplier(${s.id})">🗑️</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('❌ Error loadSuppliers:', error);
    }
}

function openSupplierModal(supplier = null) {
    try {
        const title = document.getElementById('supplier-modal-title');
        if (supplier) {
            if (title) title.textContent = 'Editar Proveedor';
            document.getElementById('supplier-id').value = supplier.id;
            document.getElementById('supplier-name').value = supplier.name;
            document.getElementById('supplier-contact').value = supplier.contact || '';
            document.getElementById('supplier-phone').value = supplier.phone || '';
            document.getElementById('supplier-email').value = supplier.email || '';
            document.getElementById('supplier-address').value = supplier.address || '';
            document.getElementById('supplier-tax').value = supplier.taxId || '';
            document.getElementById('supplier-payment').value = supplier.paymentTerms || '30 días';
            document.getElementById('supplier-notes').value = supplier.notes || '';
        } else {
            if (title) title.textContent = 'Nuevo Proveedor';
            document.getElementById('supplier-id').value = '';
            document.getElementById('supplier-name').value = '';
            document.getElementById('supplier-contact').value = '';
            document.getElementById('supplier-phone').value = '';
            document.getElementById('supplier-email').value = '';
            document.getElementById('supplier-address').value = '';
            document.getElementById('supplier-tax').value = '';
            document.getElementById('supplier-payment').value = '30 días';
            document.getElementById('supplier-notes').value = '';
        }
        openModal('supplier-modal');
    } catch (error) {
        console.error('❌ Error openSupplierModal:', error);
    }
}

async function saveSupplier() {
    try {
        const id = document.getElementById('supplier-id').value;
        const name = document.getElementById('supplier-name').value.trim();
        const contact = document.getElementById('supplier-contact').value.trim();
        const phone = document.getElementById('supplier-phone').value.trim();
        const email = document.getElementById('supplier-email').value.trim();
        const address = document.getElementById('supplier-address').value.trim();
        const taxId = document.getElementById('supplier-tax').value.trim();
        const paymentTerms = document.getElementById('supplier-payment').value.trim();
        const notes = document.getElementById('supplier-notes').value.trim();

        if (!name) { showToast('❌ Nombre obligatorio', 'error'); return; }

        const supplier = { name, contact, phone, email, address, taxId, paymentTerms, notes, updatedAt: new Date().toISOString() };
        if (id) {
            supplier.id = parseInt(id);
            const existing = await dbGet(STORE_SUPPLIERS, supplier.id);
            if (existing) supplier.createdAt = existing.createdAt;
            await dbPut(STORE_SUPPLIERS, supplier);
            showToast('✅ Proveedor actualizado', 'success');
        } else {
            supplier.createdAt = new Date().toISOString();
            await dbAdd(STORE_SUPPLIERS, supplier);
            showToast('✅ Proveedor creado', 'success');
        }
        closeModal('supplier-modal');
        loadSuppliers();
    } catch (error) {
        console.error('❌ Error saveSupplier:', error);
        showToast('❌ Error al guardar proveedor', 'error');
    }
}

async function editSupplier(id) {
    try {
        const supplier = await dbGet(STORE_SUPPLIERS, id);
        if (supplier) openSupplierModal(supplier);
    } catch (error) {
        console.error('❌ Error editSupplier:', error);
    }
}

async function deleteSupplier(id) {
    showConfirm('¿Eliminar proveedor?', async () => {
        try {
            await dbDelete(STORE_SUPPLIERS, id);
            showToast('🗑️ Proveedor eliminado', 'success');
            loadSuppliers();
        } catch (error) {
            console.error('❌ Error deleteSupplier:', error);
        }
    });
}

// ============== LOTES / TRAZABILIDAD ==============
async function loadBatches() {
    try {
        const batches = await dbGetAll(STORE_BATCHES);
        const ingredients = await dbGetAll(STORE_INGREDIENTS);
        const list = document.getElementById('batches-list');
        if (!list) return;

        const now = new Date();
        const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        let expiringSoon = 0;
        batches.forEach(b => { if (new Date(b.expiryDate) <= weekFromNow && new Date(b.expiryDate) >= now) expiringSoon++; });

        const expiringEl = document.getElementById('bodega-expiring');
        if (expiringEl) expiringEl.textContent = expiringSoon;

        batches.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));

        if (batches.length === 0) {
            list.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📅</div><p class="empty-state-text">No hay lotes registrados</p><button class="btn-primary" onclick="openBatchModal()">+ Registrar Lote</button></div>`;
            return;
        }

        list.innerHTML = batches.map(batch => {
            const ingredient = ingredients.find(i => i.id === batch.ingredientId);
            const expiryDate = new Date(batch.expiryDate);
            const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
            const isExpired = daysUntilExpiry < 0;
            const isExpiringSoon = daysUntilExpiry >= 0 && daysUntilExpiry <= 7;

            let statusClass = 'paid';
            let statusText = `${daysUntilExpiry} días`;
            if (isExpired) { statusClass = 'overdue'; statusText = 'VENCIDO'; }
            else if (isExpiringSoon) { statusClass = 'pending'; statusText = `¡Vence en ${daysUntilExpiry} días!`; }

            return `
                <div class="list-item">
                    <div class="list-icon">📅</div>
                    <div class="list-content" style="flex:1;">
                        <div class="list-title">${ingredient ? ingredient.name : 'Desconocido'} <span class="debt-status ${statusClass}">${statusText}</span></div>
                        <div class="list-subtitle">
                            Lote: ${batch.batchNumber || 'N/A'} • Cantidad: ${batch.quantity} ${batch.unit || ''}<br>
                            Vence: ${expiryDate.toLocaleDateString('es-CL')} • Recibido: ${new Date(batch.receivedDate).toLocaleDateString('es-CL')}
                        </div>
                        ${batch.notes ? `<div style="font-size:12px;color:rgba(255,255,255,0.4);margin-top:4px;">📝 ${batch.notes}</div>` : ''}
                    </div>
                    <div class="list-amount">${formatMoney(batch.cost || 0)}</div>
                </div>`;
        }).join('');
    } catch (error) {
        console.error('❌ Error loadBatches:', error);
    }
}

async function openBatchModal() {
    try {
        const ingredients = await dbGetAll(STORE_INGREDIENTS);
        const select = document.getElementById('batch-ingredient');
        if (select) {
            select.innerHTML = '<option value="">Seleccionar ingrediente...</option>' + ingredients.map(i => `<option value="${i.id}">${i.name} (${i.unit})</option>`).join('');
        }

        document.getElementById('batch-id').value = '';
        document.getElementById('batch-number').value = '';
        document.getElementById('batch-quantity').value = '';
        document.getElementById('batch-expiry').value = '';
        const receivedInput = document.getElementById('batch-received');
        if (receivedInput) receivedInput.value = new Date().toISOString().split('T')[0];
        document.getElementById('batch-cost').value = '';
        document.getElementById('batch-notes').value = '';

        openModal('batch-modal');
    } catch (error) {
        console.error('❌ Error openBatchModal:', error);
    }
}

async function saveBatch() {
    try {
        const ingredientId = parseInt(document.getElementById('batch-ingredient').value);
        const batchNumber = document.getElementById('batch-number').value.trim();
        const quantity = parseFloat(document.getElementById('batch-quantity').value);
        const expiryDate = document.getElementById('batch-expiry').value;
        const receivedDate = document.getElementById('batch-received').value;
        const cost = parseFloat(document.getElementById('batch-cost').value) || 0;
        const notes = document.getElementById('batch-notes').value.trim();

        if (!ingredientId || !batchNumber || !quantity || !expiryDate) { showToast('❌ Completa los campos obligatorios', 'error'); return; }

        const ingredient = await dbGet(STORE_INGREDIENTS, ingredientId);
        if (ingredient) {
            ingredient.stock += quantity;
            await dbPut(STORE_INGREDIENTS, ingredient);
        }

        await dbAdd(STORE_BATCHES, {
            ingredientId, batchNumber, quantity, unit: ingredient ? ingredient.unit : '',
            expiryDate, receivedDate, cost, notes, createdAt: new Date().toISOString()
        });

        showToast('✅ Lote registrado', 'success');
        closeModal('batch-modal');
        loadBatches();
        loadIngredients();
    } catch (error) {
        console.error('❌ Error saveBatch:', error);
        showToast('❌ Error al registrar lote', 'error');
    }
}

// ============== REPORTES DE BODEGA ==============
async function loadBodegaReports() {
    try {
        const ingredients = await dbGetAll(STORE_INGREDIENTS);
        const recipes = await dbGetAll(STORE_RECIPES);
        const products = await dbGetAll(STORE_PRODUCTS);
        const purchases = await dbGetAll(STORE_PURCHASES);
        const waste = await dbGetAll(STORE_WASTE);

        // Reporte de costos por producto
        const costReport = document.getElementById('cost-report');
        if (costReport) {
            let costHtml = '<h4 style="margin-bottom:12px;color:var(--primary);">💰 Costos y Ganancias por Producto</h4>';

            products.forEach(product => {
                const recipe = recipes.find(r => r.productId === product.id);
                let recipeCost = 0;
                if (recipe && recipe.items) {
                    recipe.items.forEach(item => {
                        const ing = ingredients.find(i => i.id === item.ingredientId);
                        if (ing) recipeCost += item.amount * ing.cost;
                    });
                }
                const profit = product.price - recipeCost;
                const margin = product.price > 0 ? ((profit / product.price) * 100).toFixed(1) : 0;
                const isProfitable = profit > 0;

                costHtml += `
                    <div style="padding:12px;background:var(--glass);border-radius:10px;margin-bottom:8px;border-left:3px solid ${isProfitable ? 'var(--primary)' : '#e74c3c'};">
                        <div style="display:flex;justify-content:space-between;align-items:center;">
                            <strong>${product.name}</strong>
                            <span style="color:${isProfitable ? 'var(--primary)' : '#e74c3c'};font-weight:700;">${margin}% margen</span>
                        </div>
                        <div style="font-size:13px;color:rgba(255,255,255,0.6);margin-top:4px;">
                            Costo: ${formatMoney(recipeCost)} • Venta: ${formatMoney(product.price)} • Ganancia: ${formatMoney(profit)}
                        </div>
                    </div>`;
            });
            costReport.innerHTML = costHtml;
        }

        // Reporte de movimientos
        const movementReport = document.getElementById('movement-report');
        if (movementReport) {
            const now = new Date();
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

            let totalPurchases = 0, totalWaste = 0;
            purchases.forEach(p => { if (new Date(p.date) >= monthAgo) totalPurchases += p.total; });
            waste.forEach(w => { if (new Date(w.date) >= monthAgo) totalWaste += w.cost || 0; });

            movementReport.innerHTML = `
                <h4 style="margin-bottom:12px;color:var(--primary);">📊 Movimientos del Mes</h4>
                <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;">
                    <div style="padding:16px;background:var(--glass);border-radius:10px;text-align:center;">
                        <div style="font-size:24px;font-weight:700;color:var(--primary);">${formatMoney(totalPurchases)}</div>
                        <div style="font-size:12px;color:rgba(255,255,255,0.6);">Compras</div>
                    </div>
                    <div style="padding:16px;background:var(--glass);border-radius:10px;text-align:center;">
                        <div style="font-size:24px;font-weight:700;color:#e74c3c;">${formatMoney(totalWaste)}</div>
                        <div style="font-size:12px;color:rgba(255,255,255,0.6);">Mermas</div>
                    </div>
                </div>
                <div style="margin-top:12px;padding:12px;background:rgba(0,212,170,0.1);border-radius:10px;text-align:center;">
                    <div style="font-size:18px;font-weight:700;color:var(--primary);">${formatMoney(totalPurchases - totalWaste)}</div>
                    <div style="font-size:12px;color:rgba(255,255,255,0.6);">Balance Neto</div>
                </div>
            `;
        }
    } catch (error) {
        console.error('❌ Error loadBodegaReports:', error);
    }
}

// ============== NOTIFICACIONES ==============
async function loadNotifications() {
    try {
        const debts = await dbGetAll(STORE_DEBTS);
        const ingredients = await dbGetAll(STORE_INGREDIENTS);
        const products = await dbGetAll(STORE_PRODUCTS);
        const batches = await dbGetAll(STORE_BATCHES);
        const notifications = [];
        const now = new Date();
        const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        // Deudas vencidas/próximas
        debts.forEach(debt => {
            if (debt.status !== 'paid') {
                try {
                    const dueDate = new Date(debt.dueDate);
                    const daysDiff = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
                    if (daysDiff <= 3 && daysDiff >= 0) {
                        notifications.push({ type: 'warning', title: 'Deuda próxima', text: `${debt.clientName} - ${formatMoney(debt.remaining)} - ${daysDiff} días`, time: new Date().toISOString() });
                    } else if (daysDiff < 0) {
                        notifications.push({ type: 'error', title: 'Deuda vencida', text: `${debt.clientName} - ${formatMoney(debt.remaining)} - ${Math.abs(daysDiff)} días`, time: new Date().toISOString() });
                    }
                } catch (e) {}
            }
        });

        // Stock bajo en BODEGA
        ingredients.forEach(ing => {
            if (ing.stock <= ing.minStock) {
                notifications.push({ type: 'error', title: '¡Stock bajo en bodega!', text: `${ing.name}: ${ing.stock} ${ing.unit} (mín: ${ing.minStock})`, time: new Date().toISOString() });
            }
        });

        // Lotes próximos a vencer
        batches.forEach(batch => {
            try {
                const expiryDate = new Date(batch.expiryDate);
                const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
                if (daysUntilExpiry >= 0 && daysUntilExpiry <= 7) {
                    const ingredient = ingredients.find(i => i.id === batch.ingredientId);
                    notifications.push({ type: 'warning', title: 'Lote próximo a vencer', text: `${ingredient ? ingredient.name : 'Desconocido'} - Lote ${batch.batchNumber} - ${daysUntilExpiry} días`, time: new Date().toISOString() });
                } else if (daysUntilExpiry < 0) {
                    const ingredient = ingredients.find(i => i.id === batch.ingredientId);
                    notifications.push({ type: 'error', title: '¡Lote vencido!', text: `${ingredient ? ingredient.name : 'Desconocido'} - Lote ${batch.batchNumber}`, time: new Date().toISOString() });
                }
            } catch (e) {}
        });

        // Stock bajo en productos
        products.forEach(p => {
            if (p.stock <= 5) {
                notifications.push({ type: 'warning', title: 'Stock bajo', text: `${p.name}: ${p.stock} unidades`, time: new Date().toISOString() });
            }
        });

        const list = document.getElementById('notifications-list');
        const count = document.getElementById('notif-count');
        if (count) {
            count.textContent = notifications.length;
            count.style.display = notifications.length > 0 ? 'flex' : 'none';
        }

        if (!list) return;

        if (notifications.length === 0) {
            list.innerHTML = '<p class="empty-notifications">No hay notificaciones</p>'; return;
        }

        const icons = { warning: '⚠️', error: '❌', success: '✅' };
        list.innerHTML = notifications.map(n => {
            const d = new Date(n.time);
            return `<div class="notification-item ${n.type === 'error' ? 'unread' : ''}"><div class="notification-icon">${icons[n.type] || 'ℹ️'}</div><div class="notification-content"><div class="notification-title">${n.title}</div><div class="notification-text">${n.text}</div><div class="notification-time">${d.toLocaleTimeString('es-CL')}</div></div></div>`;
        }).join('');
    } catch (error) {
        console.error('❌ Error loadNotifications:', error);
    }
}

// ============== UTILIDADES ==============
function formatMoney(amount) {
    if (amount === undefined || amount === null || isNaN(amount)) return '$0';
    return '$' + Math.round(amount).toLocaleString('es-CL');
}

function parseMoney(str) {
    if (!str) return 0;
    return parseInt(str.replace(/[^\d]/g, '')) || 0;
}

function showToast(message, type = 'success') {
    try {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.animation = 'toastOut 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, 2700);
    } catch (error) {
        console.log('Toast:', message);
    }
}

async function saveConfig() {
    try {
        const config = {
            key: 'main',
            businessName: document.getElementById('config-business-name').value,
            currency: document.getElementById('config-currency').value,
            tax: parseFloat(document.getElementById('config-tax').value) || 0
        };
        await dbPut(STORE_CONFIG, config);
        showToast('⚙️ Configuración guardada', 'success');
    } catch (error) {
        console.error('❌ Error saveConfig:', error);
        showToast('❌ Error al guardar configuración', 'error');
    }
}

async function exportData() {
    try {
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
            config: await dbGet(STORE_CONFIG, 'main'),
            exportDate: new Date().toISOString(),
            version: '4.1'
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `colibri_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('📥 Datos exportados', 'success');
    } catch (error) {
        console.error('❌ Error exportData:', error);
        showToast('❌ Error al exportar', 'error');
    }
}

async function clearAllData() {
    try {
        const stores = [STORE_PRODUCTS, STORE_SALES, STORE_CLIENTS, STORE_DEBTS, STORE_PAYMENTS, STORE_INGREDIENTS, STORE_RECIPES, STORE_PURCHASES, STORE_WASTE, STORE_SUPPLIERS, STORE_BATCHES];
        for (const store of stores) {
            const items = await dbGetAll(store);
            for (const item of items) await dbDelete(store, item.id);
        }
        showToast('🗑️ Datos eliminados', 'success');
        await loadDemoData();
        loadModule(currentModule);
    } catch (error) {
        console.error('❌ Error clearAllData:', error);
        showToast('❌ Error al limpiar datos', 'error');
    }
}

// ============== VENTA RÁPIDA ==============
async function saveQuickSale() {
    try {
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
    } catch (error) {
        console.error('❌ Error saveQuickSale:', error);
        showToast('❌ Error en venta rápida', 'error');
    }
}

// ============== SERVICE WORKER ==============
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
        .then(reg => console.log('✅ Service Worker registrado'))
        .catch(err => console.log('❌ Error SW:', err));
}

console.log('✅ Colibrí Boba Tea v4.1 cargado completamente');
