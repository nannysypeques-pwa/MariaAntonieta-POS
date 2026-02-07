/**
 * Main Application Logic
 * Controller for UI and Business Logic
 */

const App = {
    // State
    state: {
        cart: [],
        products: [],
        inventory: [],
        insumos: [], // Raw materials for BOM
        currentView: 'pos-view',
        currentUser: null
    },

    // Initialization
    init: async function () {
        this.cacheDOM();
        this.bindEvents();

        // Check Session
        if (API.token) {
            this.state.currentUser = API.user;
            this.showDashboard();
        } else {
            this.showLogin();
        }
    },

    // Cache DOM Elements
    cacheDOM: function () {
        this.dom = {
            loginScreen: document.getElementById('login-screen'),
            dashboardScreen: document.getElementById('dashboard-screen'),
            loginForm: document.getElementById('login-form'),
            emailInput: document.getElementById('email'),
            passwordInput: document.getElementById('password'),
            sidebar: document.querySelector('.sidebar'),
            navLinks: document.querySelectorAll('.nav-links li'),
            views: document.querySelectorAll('.view'),
            userName: document.getElementById('user-name'),
            userRole: document.getElementById('user-role'),
            logoutBtn: document.getElementById('logout-btn'),

            // POS
            posProducts: document.getElementById('pos-products'),
            cartItems: document.getElementById('cart-items'),
            cartSubtotal: document.getElementById('cart-subtotal'),
            cartDiscount: document.getElementById('cart-discount'),
            cartTotal: document.getElementById('cart-total'),
            checkoutBtn: document.getElementById('checkout-btn'),
            posSearch: document.getElementById('pos-search'),
            paymentMethods: document.querySelectorAll('.btn-method'),

            // Inventory
            inventoryTable: document.querySelector('#inventory-table tbody'),
            lowStockKpi: document.querySelector('#low-stock-kpi .value'),
            criticalStockKpi: document.querySelector('#critical-stock-kpi .value'),
            addInsumoBtn: document.getElementById('add-insumo-btn'),

            // Sales
            salesTable: document.querySelector('#sales-table tbody'),
            salesStartDate: document.getElementById('sales-start-date'),
            salesEndDate: document.getElementById('sales-end-date'),
            filterSalesBtn: document.getElementById('filter-sales-btn'),
            salesTodayBtn: document.getElementById('sales-today-btn'),
            salesWeekBtn: document.getElementById('sales-week-btn'),
            salesMonthBtn: document.getElementById('sales-month-btn'),

            // Products
            productsTable: document.querySelector('#products-table tbody'),
            addProductBtn: document.getElementById('add-product-btn'),

            // Projections
            purchasesList: document.getElementById('purchases-list'),
            projRevenue: document.getElementById('proj-revenue'),
            projCost: document.getElementById('proj-cost'),
            projProfit: document.getElementById('proj-profit'),
            projItemsBody: document.getElementById('proj-items-body'),
            projShoppingBody: document.getElementById('proj-shopping-body'),
            btnModeAuto: document.getElementById('btn-mode-auto'),
            btnModeManual: document.getElementById('btn-mode-manual'),
            btnAddProjItem: document.getElementById('add-proj-item'),
            btnCalcProjections: document.getElementById('btn-calculate-projections'),

            // Reports
            reportPeriod: document.getElementById('report-period'),

            // Modals
            modalContainer: document.getElementById('modal-container'),
            modalTitle: document.getElementById('modal-title'),
            modalContent: document.getElementById('modal-content'),
            modalActionBtn: document.getElementById('modal-action-btn'),
            closeModalBtns: document.querySelectorAll('.close-modal'),
            modal: document.querySelector('.modal'),

            // Toasts
            toastContainer: document.getElementById('toast-container')
        };
    },

    // Bind Event Listeners
    bindEvents: function () {
        // Login
        this.dom.loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Logout
        this.dom.logoutBtn.addEventListener('click', () => {
            API.logout();
        });

        // Navigation
        this.dom.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                const target = e.currentTarget.dataset.target;
                this.navigate(target);
            });
        });

        // Products
        this.dom.addProductBtn.addEventListener('click', () => {
            this.showProductModal();
        });

        // Inventory
        this.dom.addInsumoBtn.addEventListener('click', () => {
            this.showInsumoModal();
        });

        // Modals
        this.dom.closeModalBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.closeModal();
            });
        });

        // POS Search

        // POS Search
        this.dom.posSearch.addEventListener('input', (e) => {
            this.renderProducts(e.target.value);
        });

        // Cart Discount
        this.dom.cartDiscount.addEventListener('input', () => {
            this.renderCart();
        });

        // Payment Methods
        this.dom.paymentMethods.forEach(method => {
            method.addEventListener('click', (e) => {
                this.dom.paymentMethods.forEach(m => m.classList.remove('active'));
                e.currentTarget.classList.add('active');
            });
        });

        // Checkout
        this.dom.checkoutBtn.addEventListener('click', () => {
            this.handleCheckout();
        });

        // Sales Filters
        this.dom.filterSalesBtn.addEventListener('click', () => this.loadSales());
        this.dom.salesTodayBtn.addEventListener('click', () => this.setSalesFilter('today'));
        this.dom.salesWeekBtn.addEventListener('click', () => this.setSalesFilter('week'));
        this.dom.salesMonthBtn.addEventListener('click', () => this.setSalesFilter('month'));

        // Reports
        this.dom.reportPeriod.addEventListener('change', () => this.loadReports());

        // Projections
        this.dom.btnModeAuto.addEventListener('click', () => this.setProjectionMode('auto'));
        this.dom.btnModeManual.addEventListener('click', () => this.setProjectionMode('manual'));
        this.dom.btnCalcProjections.addEventListener('click', () => this.updateManualCalculation());
    },

    setSalesFilter: function (period) {
        const now = new Date();
        let start = new Date();
        let end = new Date();

        switch (period) {
            case 'today':
                start.setHours(0, 0, 0, 0);
                end.setHours(23, 59, 59, 999);
                break;
            case 'week':
                const day = now.getDay() || 7; // Get current day of week (1-7), Sunday is 7
                start.setDate(now.getDate() - day + 1);
                start.setHours(0, 0, 0, 0);
                end.setHours(23, 59, 59, 999);
                break;
            case 'month':
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                break;
        }

        this.dom.salesStartDate.value = start.toISOString().split('T')[0];
        this.dom.salesEndDate.value = end.toISOString().split('T')[0];
        this.loadSales();
    },

    // ============================================
    // LOGIC
    // ============================================

    handleLogin: async function () {
        const email = this.dom.emailInput.value;
        const password = this.dom.passwordInput.value;

        try {
            const response = await API.login(email, password);
            if (response.success) {
                this.showToast('Bienvenido ' + response.user.nombre, 'success');
                this.state.currentUser = response.user;
                this.showDashboard();
            }
        } catch (error) {
            this.showToast(error, 'error');
        }
    },

    navigate: function (viewId) {
        // Update Sidebar
        this.dom.navLinks.forEach(link => {
            link.classList.toggle('active', link.dataset.target === viewId);
        });

        // Update View
        this.dom.views.forEach(view => {
            view.classList.remove('active');
            if (view.id === viewId) {
                view.classList.add('active');
            }
        });

        // Load Data for View
        this.loadViewData(viewId);
    },

    loadViewData: function (viewId) {
        switch (viewId) {
            case 'pos-view':
                this.loadProducts();
                break;
            case 'products-view':
                this.loadProductsTable();
                break;
            case 'inventory-view':
                this.loadInventory();
                break;
            case 'sales-view':
                this.loadSales();
                break;
            case 'reports-view':
                this.loadReports();
                break;
            case 'projections-view':
                this.loadProjections();
                break;
        }
    },

    showDashboard: function () {
        this.dom.loginScreen.classList.remove('active');
        this.dom.dashboardScreen.classList.add('active');
        this.dom.userName.textContent = this.state.currentUser.nombre;
        this.dom.userRole.textContent = this.state.currentUser.rol.toUpperCase();
        this.loadProducts(); // Initial load
    },

    showLogin: function () {
        this.dom.loginScreen.classList.add('active');
        this.dom.dashboardScreen.classList.remove('active');
    },

    // ============================================
    // POS FUNCTIONS
    // ============================================

    loadProducts: async function () {
        try {
            const response = await API.call('getProducts', { activos: true });
            if (response.success) {
                this.state.products = response.products;
                this.renderProducts();
            }
        } catch (error) {
            console.error('Error loading products:', error);
        }
    },

    renderProducts: function (filter = '') {
        this.dom.posProducts.innerHTML = '';
        const filtered = this.state.products.filter(p =>
            p.nombre.toLowerCase().includes(filter.toLowerCase())
        );

        filtered.forEach(product => {
            const card = document.createElement('div');
            card.className = 'product-card';
            card.innerHTML = `
                <img src="${product.imagenUrl || 'https://via.placeholder.com/100'}" class="product-image" alt="${product.nombre}">
                <h4>${product.nombre}</h4>
                <p class="price">$${parseFloat(product.precioVenta).toFixed(2)}</p>
            `;
            card.addEventListener('click', () => this.addToCart(product));
            this.dom.posProducts.appendChild(card);
        });
    },

    addToCart: function (product) {
        const existing = this.state.cart.find(item => item.id === product.id);
        if (existing) {
            existing.cantidad++;
        } else {
            this.state.cart.push({ ...product, cantidad: 1 });
        }
        this.renderCart();
    },

    renderCart: function () {
        this.dom.cartItems.innerHTML = '';
        let subtotal = 0;

        this.state.cart.forEach((item, index) => {
            subtotal += item.precioVenta * item.cantidad;

            const div = document.createElement('div');
            div.className = 'cart-item';
            div.innerHTML = `
                <div>
                    <strong>${item.nombre}</strong><br>
                    <small>$${item.precioVenta} x ${item.cantidad}</small>
                </div>
                <div style="display:flex; gap:8px; align-items:center;">
                    <span>$${(item.precioVenta * item.cantidad).toFixed(2)}</span>
                    <button class="btn-icon" style="width:24px; height:24px; color:var(--danger)">
                        <span class="material-icons-round" style="font-size:16px;">delete</span>
                    </button>
                </div>
            `;
            // Delete button logic
            div.querySelector('button').addEventListener('click', () => {
                this.state.cart.splice(index, 1);
                this.renderCart();
            });
            this.dom.cartItems.appendChild(div);
        });

        const discount = parseFloat(this.dom.cartDiscount.value) || 0;
        const total = Math.max(0, subtotal - discount);

        this.dom.cartSubtotal.textContent = `$${subtotal.toFixed(2)}`;
        this.dom.cartTotal.textContent = `$${total.toFixed(2)}`;
        this.dom.checkoutBtn.textContent = `Cobrar $${total.toFixed(2)}`;
    },

    handleCheckout: async function () {
        if (this.state.cart.length === 0) {
            this.showToast('El carrito está vacío', 'warning');
            return;
        }

        const activeMethod = document.querySelector('.btn-method.active');
        const metodoPago = activeMethod ? activeMethod.dataset.method : 'efectivo';
        const descuento = parseFloat(this.dom.cartDiscount.value) || 0;

        const items = this.state.cart.map(item => ({
            idProducto: item.id,
            cantidad: item.cantidad,
            precioUnitario: item.precioVenta
        }));

        try {
            const response = await API.call('createSale', {
                items: items,
                metodoPago: metodoPago,
                descuento: descuento,
                cajero: this.state.currentUser.nombre
            });

            if (response.success) {
                this.showToast('Venta realizada con éxito', 'success');

                // Print Ticket
                const saleData = {
                    idVenta: response.idVenta,
                    items: items.map(i => {
                        const product = this.state.products.find(p => p.id === i.idProducto);
                        return { ...i, nombreProducto: product ? product.nombre : 'Producto' };
                    }),
                    subtotal: items.reduce((sum, i) => sum + (i.cantidad * i.precioUnitario), 0),
                    descuento: descuento,
                    total: items.reduce((sum, i) => sum + (i.cantidad * i.precioUnitario), 0) - descuento,
                    metodoPago: metodoPago,
                    fecha: new Date().toLocaleString()
                };

                if (window.Printer) {
                    Printer.printTicket(saleData);
                }

                this.state.cart = [];
                this.dom.cartDiscount.value = '';
                this.renderCart();
            }
        } catch (error) {
            this.showToast('Error al procesar venta', 'error');
        }
    },

    // ============================================
    // INVENTORY FUNCTIONS
    // ============================================

    loadInventory: async function () {
        try {
            const response = await API.call('getInsumos');
            const alertsResponse = await API.call('getStockAlerts');

            if (response.success) {
                this.renderInventoryTable(response.insumos);
            }
            if (alertsResponse.success) {
                const low = alertsResponse.alerts.filter(a => a.nivel === 'bajo').length;
                const critical = alertsResponse.alerts.filter(a => a.nivel === 'critico').length;
                this.dom.lowStockKpi.textContent = low;
                this.dom.criticalStockKpi.textContent = critical;
            }
        } catch (error) {
            console.error(error);
        }
    },

    renderInventoryTable: function (insumos) {
        this.dom.inventoryTable.innerHTML = '';
        insumos.forEach(insumo => {
            const tr = document.createElement('tr');

            const statusClass = insumo.stockActual <= insumo.stockMinimo ? 'text-danger' : 'text-success';
            const statusText = insumo.stockActual <= insumo.stockMinimo ? 'Bajo Stock' : 'OK';

            tr.innerHTML = `
                <td>${insumo.nombre}</td>
                <td>${insumo.unidadMedida}</td>
                <td>$${insumo.costoUnitario}</td>
                <td>${insumo.stockActual}</td>
                <td>${insumo.stockMinimo}</td>
                <td class="${statusClass}"><strong>${statusText}</strong></td>
                <td>
                    <div style="display:flex; gap:5px;">
                        <button class="btn-icon add-stock-btn" title="Sumar Stock" style="color:var(--success)">
                            <span class="material-icons-round">add_circle</span>
                        </button>
                        <button class="btn-icon sub-stock-btn" title="Restar Stock" style="color:var(--danger)">
                            <span class="material-icons-round">remove_circle</span>
                        </button>
                        <button class="btn-icon edit-insumo-btn" title="Editar">
                            <span class="material-icons-round">edit</span>
                        </button>
                    </div>
                </td>
            `;
            this.dom.inventoryTable.appendChild(tr);

            tr.querySelector('.add-stock-btn').onclick = () => this.handleAdjustInsumoStock(insumo, 'add');
            tr.querySelector('.sub-stock-btn').onclick = () => this.handleAdjustInsumoStock(insumo, 'sub');
            tr.querySelector('.edit-insumo-btn').onclick = () => this.showInsumoModal(insumo);
        });
    },

    handleAdjustInsumoStock: function (insumo, type) {
        this.showAdjustmentModal(insumo, type, 'insumo');
    },

    handleAdjustProductStock: function (product, type) {
        this.showAdjustmentModal(product, type, 'producto');
    },

    showAdjustmentModal: function (item, type, entityType) {
        const isAdd = type === 'add';
        const title = isAdd ? 'Sumar Stock' : 'Restar Stock';
        const modalTitlePrefix = entityType === 'insumo' ? 'Insumo' : 'Producto';

        this.dom.modalTitle.textContent = `${title}: ${item.nombre}`;
        this.dom.modalContent.innerHTML = `
            <div class="adjustment-form" style="padding:10px; text-align:center;">
                <p style="margin-bottom:20px;">
                    Introduce la cantidad a ${isAdd ? 'AGREGAR' : 'RESTAR'} para <strong>${item.nombre}</strong>.
                    ${entityType === 'producto' ? '<br><small>(Nota: Ajuste manual, no afecta insumos)</small>' : ''}
                </p>
                <div class="input-group" style="max-width:200px; margin: 0 auto;">
                    <label>Cantidad</label>
                    <input type="number" id="adj-qty" min="0.01" step="any" value="1" style="text-align:center; font-size:24px;">
                </div>
            </div>
        `;

        this.dom.modalActionBtn.textContent = 'Aplicar';
        this.dom.modalActionBtn.onclick = async () => {
            const rawQty = document.getElementById('adj-qty').value;
            let qty = parseFloat(rawQty);

            if (isNaN(qty) || qty <= 0) {
                this.showToast('Cantidad inválida', 'warning');
                return;
            }

            if (!isAdd) qty = -qty;

            try {
                this.dom.modalActionBtn.disabled = true;
                this.dom.modalActionBtn.textContent = 'Procesando...';

                const apiAction = entityType === 'insumo' ? 'updateStock' : 'updateProductStock';
                const response = await API.call(apiAction, { id: item.id, cantidad: qty });

                if (response.success) {
                    this.showToast('Stock actualizado correctamente', 'success');
                    this.closeModal();
                    if (entityType === 'insumo') {
                        this.loadInventory();
                    } else {
                        this.loadProductsTable();
                        this.loadProducts();
                    }
                }
            } catch (error) {
                this.showToast('Error: ' + error, 'error');
            } finally {
                this.dom.modalActionBtn.disabled = false;
                this.dom.modalActionBtn.textContent = 'Aplicar';
            }
        };

        this.dom.modalContainer.classList.remove('hidden');
    },

    // ============================================
    // PRODUCTS TABLE FUNCTIONS
    // ============================================
    loadProductsTable: async function () {
        try {
            // Load products and insumos in parallel
            const [prodResponse, insResponse] = await Promise.all([
                API.call('getProducts', { activos: false }),
                API.call('getInsumos')
            ]);

            if (insResponse.success) {
                this.state.insumos = insResponse.insumos;
            }

            if (prodResponse.success) {
                this.dom.productsTable.innerHTML = '';
                prodResponse.products.forEach(p => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td><img src="${p.imagenUrl || 'https://via.placeholder.com/40'}" width="40" height="40" style="border-radius:50%"></td>
                        <td>${p.nombre}</td>
                        <td>${p.categoria}</td>
                        <td>$${p.precioVenta}</td>
                        <td>$${p.costoProduccion || 0}</td>
                        <td>${p.margen || 0}%</td>
                        <td><strong>${p.stock || 0}</strong></td>
                        <td>
                            <div style="display:flex; gap:5px;">
                                <button class="btn-icon add-product-stock-btn" title="Sumar Stock" style="color:var(--success)">
                                    <span class="material-icons-round">add_circle</span>
                                </button>
                                <button class="btn-icon sub-product-stock-btn" title="Restar Stock" style="color:var(--danger)">
                                    <span class="material-icons-round">remove_circle</span>
                                </button>
                                <button class="btn-icon prod-btn" title="Registrar Producción" style="color:var(--secondary)">
                                    <span class="material-icons-round">precision_manufacturing</span>
                                </button>
                                <button class="btn-icon edit-btn" title="Editar">
                                    <span class="material-icons-round">edit</span>
                                </button>
                                <button class="btn-icon delete-btn" title="Eliminar" style="color:var(--danger)">
                                    <span class="material-icons-round">delete</span>
                                </button>
                            </div>
                        </td>
                    `;
                    this.dom.productsTable.appendChild(tr);

                    tr.querySelector('.add-product-stock-btn').onclick = () => this.handleAdjustProductStock(p, 'add');
                    tr.querySelector('.sub-product-stock-btn').onclick = () => this.handleAdjustProductStock(p, 'sub');
                    tr.querySelector('.prod-btn').addEventListener('click', () => this.showProductionModal(p));
                    tr.querySelector('.edit-btn').addEventListener('click', () => this.showProductModal(p));
                    tr.querySelector('.delete-btn').addEventListener('click', () => this.handleDeleteProduct(p.id));
                });
            }
        } catch (error) {
            console.error('Error loading products table:', error);
        }
    },

    handleDeleteProduct: async function (id) {
        if (!confirm('¿Estás seguro de eliminar este producto?')) return;

        try {
            const response = await API.call('deleteProduct', { id: id });
            if (response.success) {
                this.showToast('Producto eliminado', 'success');
                this.loadProductsTable();
                this.loadProducts();
            }
        } catch (error) {
            this.showToast('Error al eliminar: ' + error, 'error');
        }
    },

    showProductionModal: function (product) {
        this.dom.modalTitle.textContent = 'Registrar Producción: ' + product.nombre;
        this.dom.modalContent.innerHTML = `
            <div class="production-form glass-panel" style="padding:20px; text-align:center;">
                <p style="margin-bottom:20px">Indica cuántas unidades de <strong>${product.nombre}</strong> has producido. 
                Se descontarán automáticamente los insumos de acuerdo a la receta definida.</p>
                <div class="input-group" style="max-width:200px; margin: 0 auto;">
                    <label>Cantidad Producida</label>
                    <input type="number" id="prod-qty" min="1" step="1" value="1" style="text-align:center; font-size:24px;">
                </div>
            </div>
        `;

        const newBtn = this.dom.modalActionBtn.cloneNode(true);
        this.dom.modalActionBtn.parentNode.replaceChild(newBtn, this.dom.modalActionBtn);
        this.dom.modalActionBtn = newBtn;

        this.dom.modalActionBtn.textContent = 'Registrar y Descontar Insumos';
        this.dom.modalActionBtn.onclick = () => {
            const qty = parseInt(document.getElementById('prod-qty').value);
            if (qty > 0) this.handleRegisterProduction(product.id, qty);
        };

        this.dom.modalContainer.classList.remove('hidden');
    },

    handleRegisterProduction: async function (id, qty) {
        try {
            const response = await API.call('registerProduction', { id, cantidad: qty });
            if (response.success) {
                this.showToast(`Producción registrada. Nuevo stock: ${response.stockNuevo}`, 'success');
                this.closeModal();
                this.loadProductsTable();
            }
        } catch (error) {
            this.showToast('Error: ' + error, 'error');
        }
    },

    showProductModal: async function (product = null) {
        this.dom.modalTitle.textContent = product ? 'Editar Producto' : 'Nuevo Producto';
        this.dom.modalContent.innerHTML = `
            <form id="product-form" style="display:grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                <div class="basic-info">
                    <h4>Información Básica</h4>
                    <div class="input-group" style="margin-bottom:12px">
                        <label>Nombre del Producto</label>
                        <input type="text" id="prod-name" required>
                    </div>
                    <div class="input-group" style="margin-bottom:12px">
                        <label>Categoría</label>
                        <select id="prod-category">
                            <option value="Pasteles">Pasteles</option>
                            <option value="Galletas">Galletas</option>
                            <option value="Pays">Pays</option>
                            <option value="Individual">Individual</option>
                            <option value="Panqué">Panqué</option>
                            <option value="Bebidas">Bebidas</option>
                        </select>
                    </div>
                    <div class="input-group" style="margin-bottom:12px">
                        <label>Precio Venta</label>
                        <input type="number" id="prod-price" min="0" step="0.5" required>
                    </div>
                    <div class="input-group" style="margin-bottom:12px">
                        <label>Costo Producción (Calculado)</label>
                        <input type="number" id="prod-cost" min="0" step="0.5" readonly style="background:#f5f5f5">
                    </div>
                    <div class="input-group" style="margin-bottom:12px">
                        <label>URL Imagen</label>
                        <input type="text" id="prod-image" placeholder="https://...">
                    </div>
                </div>
                <div class="bom-section">
                    <h4>Materia Prima (Receta)</h4>
                    <div id="bom-items-container" style="max-height: 300px; overflow-y: auto; margin-bottom: 10px; border: 1px solid #eee; padding: 10px; border-radius: 8px;">
                        <!-- BOM items here -->
                    </div>
                    <button type="button" class="btn-secondary w-100" id="add-bom-item-btn">
                        <span class="material-icons-round">add</span> Agregar Insumo
                    </button>
                </div>
            </form>
        `;

        if (product) {
            document.getElementById('prod-name').value = product.nombre;
            document.getElementById('prod-category').value = product.categoria;
            document.getElementById('prod-price').value = product.precioVenta;
            document.getElementById('prod-cost').value = product.costoProduccion || 0;
            document.getElementById('prod-image').value = product.imagenUrl || '';

            // Load BOM
            try {
                const bomResponse = await API.call('getBOM', { productId: product.id });
                if (bomResponse.success) {
                    bomResponse.bom.forEach(item => this.addBOMRow(item));
                }
            } catch (e) { console.error('Error loading BOM:', e); }
        }

        document.getElementById('add-bom-item-btn').onclick = () => this.addBOMRow();

        // Remove old event listeners
        const newBtn = this.dom.modalActionBtn.cloneNode(true);
        this.dom.modalActionBtn.parentNode.replaceChild(newBtn, this.dom.modalActionBtn);
        this.dom.modalActionBtn = newBtn;

        this.dom.modalActionBtn.textContent = product ? 'Actualizar' : 'Guardar Producto';
        this.dom.modalActionBtn.onclick = () => this.handleSaveProduct(product ? product.id : null);

        this.dom.modal.classList.add('modal-lg');
        this.dom.modalContainer.classList.remove('hidden');
    },

    closeModal: function () {
        this.dom.modal.classList.remove('modal-lg');
        this.dom.modalContainer.classList.add('hidden');
    },

    addBOMRow: function (item = null) {
        const container = document.getElementById('bom-items-container');
        const row = document.createElement('div');
        row.className = 'bom-row';
        row.style = 'display: grid; grid-template-columns: 2fr 1fr 1fr 40px; gap: 8px; margin-bottom: 8px; align-items: center;';

        const insumosOptions = this.state.insumos.map(ins =>
            `<option value="${ins.id}" ${item && item.idInsumo === ins.id ? 'selected' : ''}>${ins.nombre}</option>`
        ).join('');

        row.innerHTML = `
            <select class="bom-insumo-select">${insumosOptions}</select>
            <input type="number" class="bom-qty" placeholder="Cant" step="0.01" value="${item ? item.cantidad : ''}" required>
            <select class="bom-unit">
                <option value="kg" ${item && item.unidad === 'kg' ? 'selected' : ''}>kg</option>
                <option value="g" ${item && item.unidad === 'g' ? 'selected' : ''}>g</option>
                <option value="L" ${item && item.unidad === 'L' ? 'selected' : ''}>L</option>
                <option value="ml" ${item && item.unidad === 'ml' ? 'selected' : ''}>ml</option>
                <option value="pza" ${item && item.unidad === 'pza' ? 'selected' : ''}>pza</option>
            </select>
            <button type="button" class="btn-icon remove-bom-row" style="color:var(--danger)">
                <span class="material-icons-round">remove_circle</span>
            </button>
        `;

        row.querySelector('.remove-bom-row').onclick = () => row.remove();
        container.appendChild(row);
    },

    handleSaveProduct: async function (id = null) {
        const name = document.getElementById('prod-name').value;
        const category = document.getElementById('prod-category').value;
        const price = parseFloat(document.getElementById('prod-price').value);
        const image = document.getElementById('prod-image').value;

        if (!name || isNaN(price)) {
            this.showToast('Por favor completa los campos obligatorios', 'warning');
            return;
        }

        // Collect BOM data
        const bomRows = document.querySelectorAll('.bom-row');
        const bomData = Array.from(bomRows).map(row => ({
            idInsumo: row.querySelector('.bom-insumo-select').value,
            cantidad: parseFloat(row.querySelector('.bom-qty').value),
            unidad: row.querySelector('.bom-unit').value
        })).filter(item => !isNaN(item.cantidad));

        const productData = {
            nombre: name,
            categoria: category,
            precioVenta: price,
            imagenUrl: image
        };

        try {
            let response;
            if (id) {
                response = await API.call('updateProduct', { id, data: productData });
            } else {
                response = await API.call('createProduct', { data: productData });
                if (response.success) id = response.productId;
            }

            if (response.success) {
                // Save BOM
                await API.call('setBOM', { productId: id, insumos: bomData });

                this.showToast(id ? 'Producto guardado' : 'Producto creado con éxito', 'success');
                this.closeModal();
                this.loadProductsTable();
                this.loadProducts();
            }
        } catch (error) {
            this.showToast('Error al guardar: ' + error, 'error');
        }
    },

    showInsumoModal: function (insumo = null) {
        this.dom.modalTitle.textContent = insumo ? 'Editar Insumo' : 'Nuevo Insumo';
        this.dom.modalContent.innerHTML = `
            <form id="insumo-form">
                <div class="input-group" style="margin-bottom:12px">
                    <label>Nombre del Insumo</label>
                    <input type="text" id="insumo-name" value="${insumo ? insumo.nombre : ''}" required>
                </div>
                <div class="input-group" style="margin-bottom:12px">
                    <label>Unidad de Medida</label>
                    <select id="insumo-unit">
                        <option value="kg" ${insumo && insumo.unidadMedida === 'kg' ? 'selected' : ''}>Kilogramos (kg)</option>
                        <option value="g" ${insumo && insumo.unidadMedida === 'g' ? 'selected' : ''}>Gramos (g)</option>
                        <option value="L" ${insumo && insumo.unidadMedida === 'L' ? 'selected' : ''}>Litros (L)</option>
                        <option value="ml" ${insumo && insumo.unidadMedida === 'ml' ? 'selected' : ''}>Mililitros (ml)</option>
                        <option value="pza" ${insumo && insumo.unidadMedida === 'pza' ? 'selected' : ''}>Piezas (pza)</option>
                    </select>
                </div>
                <div class="input-group" style="margin-bottom:12px">
                    <label>Costo Unitario</label>
                    <input type="number" id="insumo-cost" min="0" step="0.01" value="${insumo ? insumo.costoUnitario : ''}" required>
                </div>
                <div class="input-group" style="margin-bottom:12px">
                    <label>Stock Actual</label>
                    <input type="number" id="insumo-stock" min="0" step="0.1" value="${insumo ? insumo.stockActual : ''}" required>
                </div>
                <div class="input-group" style="margin-bottom:12px">
                    <label>Stock Mínimo</label>
                    <input type="number" id="insumo-min" min="0" step="0.1" value="${insumo ? insumo.stockMinimo : ''}" required>
                </div>
            </form>
        `;

        const newBtn = this.dom.modalActionBtn.cloneNode(true);
        this.dom.modalActionBtn.parentNode.replaceChild(newBtn, this.dom.modalActionBtn);
        this.dom.modalActionBtn = newBtn;

        this.dom.modalActionBtn.textContent = insumo ? 'Actualizar Insumo' : 'Guardar Insumo';
        this.dom.modalActionBtn.onclick = () => this.handleSaveInsumo(insumo ? insumo.id : null);

        this.dom.modalContainer.classList.remove('hidden');
    },

    handleSaveInsumo: async function (id = null) {
        const name = document.getElementById('insumo-name').value;
        const unit = document.getElementById('insumo-unit').value;
        const cost = parseFloat(document.getElementById('insumo-cost').value);
        const stock = parseFloat(document.getElementById('insumo-stock').value);
        const min = parseFloat(document.getElementById('insumo-min').value);

        if (!name || isNaN(cost) || isNaN(stock) || isNaN(min)) {
            this.showToast('Por favor completa los campos obligatorios', 'warning');
            return;
        }

        const insumoData = {
            nombre: name,
            unidadMedida: unit,
            costoUnitario: cost,
            stockActual: stock,
            stockMinimo: min
        };

        try {
            const response = id
                ? await API.call('updateInsumo', { id, data: insumoData })
                : await API.call('createInsumo', { data: insumoData });

            if (response.success) {
                this.showToast(id ? 'Insumo actualizado' : 'Insumo creado con éxito', 'success');
                this.closeModal();
                this.loadInventory(); // Refresh table
            }
        } catch (error) {
            this.showToast('Error: ' + error, 'error');
        }
    },

    // ============================================
    // SALES FUNCTIONS
    // ============================================
    loadSales: async function () {
        try {
            let start = this.dom.salesStartDate.value;
            let end = this.dom.salesEndDate.value;

            // Default to current month if dates are empty
            if (!start || !end) {
                const now = new Date();
                const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
                const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                start = firstDay.toISOString().split('T')[0];
                end = lastDay.toISOString().split('T')[0];
                this.dom.salesStartDate.value = start;
                this.dom.salesEndDate.value = end;
            }

            const response = await API.call('getSales', { fechaInicio: start + ' 00:00:00', fechaFin: end + ' 23:59:59' });

            this.dom.salesTable.innerHTML = '';

            if (response.success) {
                if (response.sales.length === 0) {
                    this.dom.salesTable.innerHTML = '<tr><td colspan="7" style="text-align:center">No hay ventas en este periodo</td></tr>';
                    return;
                }

                response.sales.forEach(sale => {
                    const tr = document.createElement('tr');
                    const fechaObj = new Date(sale.fecha);
                    const fechaFormat = isNaN(fechaObj.getTime()) ? sale.fecha : fechaObj.toLocaleString();

                    tr.innerHTML = `
                        <td>${sale.idVenta}</td>
                        <td>${fechaFormat}</td>
                        <td>${sale.cajero}</td>
                        <td>$${parseFloat(sale.total).toFixed(2)}</td>
                        <td>${sale.metodoPago}</td>
                        <td><span class="badge ${sale.estado}">${sale.estado}</span></td>
                        <td>
                            <button class="btn-icon" title="Ver Detalle">
                                <span class="material-icons-round">visibility</span>
                            </button>
                        </td>
                    `;
                    tr.querySelector('button').onclick = () => this.showSaleDetail(sale.idVenta);
                    this.dom.salesTable.appendChild(tr);
                });
            } else {
                this.showToast('Error: ' + response.error, 'error');
            }
        } catch (error) {
            console.error(error);
            this.showToast('Error al cargar ventas', 'error');
        }
    },

    showSaleDetail: async function (idVenta) {
        try {
            const response = await API.call('getSaleDetail', { idVenta });
            if (response.success) {
                const v = response.venta;
                this.dom.modalTitle.textContent = `Detalle de Venta: ${v.idVenta}`;
                let itemsHtml = v.items.map(item => `
                    <tr>
                        <td>${item.nombreProducto}</td>
                        <td>${item.cantidad}</td>
                        <td>$${item.precioUnitario}</td>
                        <td>$${item.subtotal}</td>
                    </tr>
                `).join('');

                this.dom.modalContent.innerHTML = `
                    <div class="sale-detail">
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:20px;">
                            <p><strong>Fecha:</strong> ${new Date(v.fecha).toLocaleString()}</p>
                            <p><strong>Cajero:</strong> ${v.cajero}</p>
                            <p><strong>Método:</strong> ${v.metodoPago}</p>
                            <p><strong>Estado:</strong> ${v.estado}</p>
                        </div>
                        <table class="simple-table">
                            <thead>
                                <tr>
                                    <th>Producto</th>
                                    <th>Cant.</th>
                                    <th>Precio</th>
                                    <th>Total</th>
                                </tr>
                            </thead>
                            <tbody>${itemsHtml}</tbody>
                        </table>
                        <div style="text-align:right; margin-top:15px; font-size:1.2em;">
                            <p>Subtotal: $${v.subtotal}</p>
                            <p>Descuento: -$${v.descuento}</p>
                            <p><strong>Total: $${v.total}</strong></p>
                        </div>
                    </div>
                `;

                const newBtn = this.dom.modalActionBtn.cloneNode(true);
                this.dom.modalActionBtn.parentNode.replaceChild(newBtn, this.dom.modalActionBtn);
                this.dom.modalActionBtn = newBtn;
                this.dom.modalActionBtn.textContent = 'Cerrar';
                this.dom.modalActionBtn.onclick = () => this.closeModal();

                this.dom.modalContainer.classList.remove('hidden');
            }
        } catch (error) {
            this.showToast('Error al cargar detalle', 'error');
        }
    },

    // ============================================
    // REPORTS FUNCTIONS
    // ============================================
    charts: {},

    loadReports: async function () {
        try {
            const periodo = this.dom.reportPeriod.value;

            // 1. Obtener datos de ventas y métodos
            const salesRes = await API.call('getSalesReport', { periodo });
            // 2. Obtener datos de productos (Top ventas)
            const prodRes = await API.call('getProductSalesReport', { periodo });

            if (salesRes.success && prodRes.success) {
                this.renderSalesReport(salesRes.reporte, prodRes.reporte);
            }
        } catch (error) {
            console.error('Error loading reports:', error);
            this.showToast('Error al cargar informes', 'error');
        }
    },

    renderSalesReport: function (salesReport, prodReport) {
        // --- 1. Ventas por Día (Time Line) ---
        const salesDates = Object.keys(salesReport.ventasPorDia).sort();
        const salesTotals = salesDates.map(d => salesReport.ventasPorDia[d].total);
        this.updateChart('sales-chart', 'line', {
            labels: salesDates,
            datasets: [{
                label: 'Ventas ($)',
                data: salesTotals,
                borderColor: '#ff6b6b',
                backgroundColor: 'rgba(255, 107, 107, 0.2)',
                tension: 0.4,
                fill: true
            }]
        });

        // --- 2. Top Productos (Cantidad) ---
        const topQty = prodReport.slice(0, 5);
        this.updateChart('products-qty-chart', 'bar', {
            labels: topQty.map(p => p.nombre),
            datasets: [{
                label: 'Cantidad Vendida',
                data: topQty.map(p => p.cantidadVendida),
                backgroundColor: '#feca57'
            }]
        }, { indexAxis: 'y' });

        // --- 3. Top Productos (Dinero) ---
        const topRev = [...prodReport].sort((a, b) => b.totalVentas - a.totalVentas).slice(0, 5);
        this.updateChart('products-rev-chart', 'bar', {
            labels: topRev.map(p => p.nombre),
            datasets: [{
                label: 'Ventas ($)',
                data: topRev.map(p => p.totalVentas),
                backgroundColor: '#48dbfb'
            }]
        });

        // --- 4. Métodos de Pago ---
        const methodsLabels = Object.keys(salesReport.ventasPorMetodo);
        const methodsData = methodsLabels.map(l => salesReport.ventasPorMetodo[l].total);
        this.updateChart('methods-chart', 'doughnut', {
            labels: methodsLabels.map(l => l.toUpperCase()),
            datasets: [{
                data: methodsData,
                backgroundColor: ['#ff6b6b', '#feca57', '#48dbfb', '#1dd1a1', '#5f27cd']
            }]
        });
    },

    updateChart: function (canvasId, type, data, options = {}) {
        const ctx = document.getElementById(canvasId).getContext('2d');

        // Destruir si ya existe
        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }

        this.charts[canvasId] = new Chart(ctx, {
            type,
            data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                ...options
            }
        });
    },

    // ============================================
    // PROJECTIONS FUNCTIONS
    // ============================================
    projectionMode: 'auto',
    projectionItems: [], // Para modo manual [{idProducto, cantidad}]

    loadProjections: async function () {
        // Asegurar visibilidad del botón según el modo actual
        this.dom.btnCalcProjections.style.display = (this.projectionMode === 'auto') ? 'none' : 'flex';

        if (this.projectionMode === 'auto') {
            await this.loadAutoProjection();
        } else {
            this.renderManualProjection();
        }
    },

    setProjectionMode: function (mode) {
        this.projectionMode = mode;
        this.dom.btnModeAuto.classList.toggle('active', mode === 'auto');
        this.dom.btnModeManual.classList.toggle('active', mode === 'manual');

        // Mostrar/Ocultar botón de calcular solo en manual
        this.dom.btnCalcProjections.style.display = (mode === 'auto') ? 'none' : 'flex';

        this.loadProjections();
    },

    loadAutoProjection: async function () {
        try {
            this.dom.projItemsBody.innerHTML = '<tr><td colspan="2" style="text-align:center">Calculando histórico...</td></tr>';
            const response = await API.call('getHistoricalProjection');
            if (response.success) {
                this.renderProjectionResults(response);
            } else {
                this.showToast('Error al cargar proyección histórica', 'error');
            }
        } catch (error) {
            console.error(error);
        }
    },

    renderManualProjection: function () {
        // Si no hay items, precargar todos los productos con cantidad 0
        if (this.projectionItems.length === 0 && this.state.products.length > 0) {
            this.projectionItems = this.state.products
                .filter(p => p.activo)
                .map(p => ({ idProducto: p.id, nombre: p.nombre, cantidad: 0 }));
        }
        this.updateManualCalculation();
    },

    updateManualCalculation: async function () {
        const activeItems = this.projectionItems.filter(item => item.cantidad > 0);

        if (activeItems.length === 0) {
            this.renderProjectionResults({
                success: true,
                summary: { ingresoEst: 0, costoMatEst: 0, gananciaEst: 0 },
                shoppingList: [],
                items: this.projectionItems
            });
            return;
        }

        try {
            this.dom.btnCalcProjections.disabled = true;
            this.dom.btnCalcProjections.innerHTML = '<span class="material-icons-round">sync</span> Calculando...';

            const response = await API.call('calculateProjectionDetails', { items: activeItems });
            if (response.success) {
                this.renderProjectionResults(response);
            }
        } catch (error) {
            console.error(error);
            this.showToast('Error al calcular proyección', 'error');
        } finally {
            this.dom.btnCalcProjections.disabled = false;
            this.dom.btnCalcProjections.innerHTML = '<span class="material-icons-round">calculate</span> Calcular Proyección';
        }
    },

    renderProjectionResults: function (data) {
        // 1. KPIs
        this.dom.projRevenue.textContent = `$${parseFloat(data.summary.ingresoEst).toFixed(2)}`;
        this.dom.projCost.textContent = `$${parseFloat(data.summary.costoMatEst).toFixed(2)}`;
        this.dom.projProfit.textContent = `$${parseFloat(data.summary.gananciaEst).toFixed(2)}`;

        // 2. Metas de Venta
        this.dom.projItemsBody.innerHTML = '';
        const itemsToRender = this.projectionMode === 'auto' ? data.items : this.projectionItems;

        itemsToRender.forEach((item, index) => {
            // Buscar nombre si es auto (enriquecer)
            let nombre = item.nombre;
            if (!nombre) {
                const p = this.state.products.find(prod => prod.id === item.idProducto);
                nombre = p ? p.nombre : item.idProducto;
            }

            const tr = document.createElement('tr');
            if (this.projectionMode === 'auto') {
                tr.innerHTML = `<td>${nombre}</td><td style="text-align:center">${item.cantidad}</td>`;
            } else {
                tr.innerHTML = `
                    <td>${nombre}</td>
                    <td>
                        <input type="number" value="${item.cantidad}" min="0" 
                        style="width:60px; padding:5px; text-align:center"
                        data-index="${index}">
                    </td>
                `;
                tr.querySelector('input').onchange = (e) => {
                    this.projectionItems[index].cantidad = parseFloat(e.target.value) || 0;
                };
            }
            this.dom.projItemsBody.appendChild(tr);
        });

        // 3. Materia Prima
        this.dom.projShoppingBody.innerHTML = '';
        if (data.shoppingList.length === 0) {
            this.dom.projShoppingBody.innerHTML = '<tr><td colspan="3" style="text-align:center">No se requieren materiales</td></tr>';
            return;
        }

        data.shoppingList.forEach(ins => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${ins.nombre}</td>
                <td>${ins.cantidad.toFixed(2)} ${ins.unidad}</td>
                <td>$${(ins.cantidad * ins.costoUnitario).toFixed(2)}</td>
            `;
            this.dom.projShoppingBody.appendChild(tr);
        });
    },

    // ============================================
    // UTILS
    // ============================================

    showToast: function (message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;

        // Basic toast styles for JS creation
        toast.style.position = 'fixed';
        toast.style.bottom = '20px';
        toast.style.right = '20px';
        toast.style.padding = '12px 24px';
        toast.style.background = 'white';
        toast.style.borderRadius = '8px';
        toast.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        toast.style.zIndex = '10000';
        toast.style.borderLeft = `4px solid ${type === 'success' ? '#1dd1a1' : type === 'error' ? '#ff6b6b' : '#54a0ff'}`;
        toast.style.animation = 'slideIn 0.3s ease';

        this.dom.toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
};

// Start App
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
