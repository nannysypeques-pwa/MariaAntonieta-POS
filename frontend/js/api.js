/**
 * API Client
 * Handles communication with Google Apps Script Backend
 * Includes Mock Data for Local Development
 */

const API = {
    // URL del Web App de Google Apps Script (Despliega "Como aplicación web" y pega la URL aquí)
    API_URL: 'https://script.google.com/macros/s/AKfycbyVhLoDfSA2ZiZwR5pYZEy6xap7oRJ6Pz1yI3sBuMhAGeoo1zCE_mDllOueA6sb0f0/exec',

    // Check if running in Google Apps Script environment
    isProd: typeof google !== 'undefined' && google.script,

    // Current Session
    token: localStorage.getItem('auth_token'),
    user: JSON.parse(localStorage.getItem('user_info') || 'null'),

    /**
     * Generic API Call
     */
    call: function (action, params = {}) {
        return new Promise((resolve, reject) => {
            const payload = { ...params, action, token: this.token };

            if (this.isProd) {
                // Modo 1: Ejecutando dentro de Google Apps Script (iframe)
                google.script.run
                    .withSuccessHandler(response => {
                        const data = JSON.parse(response);
                        if (data.success) resolve(data);
                        else reject(data.error);
                    })
                    .withFailureHandler(error => reject(error))
                    .doPost({ postData: { contents: JSON.stringify(payload) } });

            } else if (this.API_URL && this.API_URL.startsWith('https://script.google.com')) {
                // Modo 2: PWA Externa (Localhost o Dominio Propio) -> Conecta al Backend Real
                fetch(this.API_URL, {
                    method: 'POST',
                    body: JSON.stringify(payload)
                    // NOTA: No enviamos header 'Content-Type: application/json' para evitar 
                    // preflight OPTIONS que Apps Script no soporta. Se envía como text/plain.
                })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) resolve(data);
                        else reject(data.error);
                    })
                    .catch(error => {
                        console.error('API Error:', error);
                        reject('Error de conexión con el servidor. Verifica tu internet y la URL del script.');
                    });

            } else {
                // Modo 3: Desarrollo Local sin Backend (Mock Data)
                console.log(`[MOCK API] Call: ${action}`, payload);
                setTimeout(() => {
                    const mockResponse = this.getMockResponse(action, payload);
                    if (mockResponse.success) resolve(mockResponse);
                    else reject(mockResponse.error);
                }, 500);
            }
        });
    },

    /**
     * Mock Responses for Local Development
     */
    getMockResponse: function (action, params) {
        switch (action) {
            case 'login':
                if (params.password === '123') {
                    return {
                        success: true,
                        token: 'mock_token_' + Date.now(),
                        user: { email: params.email, nombre: 'Usuario Demo', rol: 'director' }
                    };
                }
                return { success: false, error: 'Credenciales inválidas (Use pass: 123)' };

            case 'validateSession':
                return { success: true, user: this.user };

            case 'getProducts':
                return {
                    success: true,
                    products: [
                        { id: '1', nombre: 'Pastel de Chocolate', categoria: 'Pasteles', precioVenta: 350, imagenUrl: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=200' },
                        { id: '2', nombre: 'Galletas de Avena', categoria: 'Galletas', precioVenta: 15, imagenUrl: 'https://images.unsplash.com/photo-1499636138143-bd630f5cf38a?w=200' },
                        { id: '3', nombre: 'Pay de Limón', categoria: 'Pays', precioVenta: 280, imagenUrl: 'https://images.unsplash.com/photo-1519915028121-7d3463d20b13?w=200' },
                        { id: '4', nombre: 'Cupcake Red Velvet', categoria: 'Individual', precioVenta: 45, imagenUrl: 'https://images.unsplash.com/photo-1614707267537-b85aaf00c4b7?w=200' },
                        { id: '5', nombre: 'Panqué de Naranja', categoria: 'Panqué', precioVenta: 120, imagenUrl: 'https://images.unsplash.com/photo-1557308536-ee471ef2c39a?w=200' },
                    ]
                };

            case 'getInsumos':
                return {
                    success: true,
                    insumos: [
                        { id: '1', nombre: 'Harina', unidadMedida: 'kg', stockActual: 50, stockMinimo: 10, costoUnitario: 15 },
                        { id: '2', nombre: 'Azúcar', unidadMedida: 'kg', stockActual: 8, stockMinimo: 10, costoUnitario: 22 }, // Bajo stock
                        { id: '3', nombre: 'Huevo', unidadMedida: 'pza', stockActual: 100, stockMinimo: 30, costoUnitario: 2.5 },
                        { id: '4', nombre: 'Leche', unidadMedida: 'L', stockActual: 2, stockMinimo: 12, costoUnitario: 24 }, // Crítico
                        { id: '5', nombre: 'Chocolate', unidadMedida: 'kg', stockActual: 15, stockMinimo: 5, costoUnitario: 120 },
                    ]
                };

            case 'getStockAlerts':
                return {
                    success: true,
                    alerts: [
                        { id: '2', nombre: 'Azúcar', stockActual: 8, stockMinimo: 10, nivel: 'bajo' },
                        { id: '4', nombre: 'Leche', stockActual: 2, stockMinimo: 12, nivel: 'critico' }
                    ]
                };

            case 'getSales':
                return {
                    success: true,
                    sales: [
                        { idVenta: 'V001', fecha: '2023-10-25 10:30:00', cajero: 'Ana', total: 450, metodoPago: 'efectivo', estado: 'completada' },
                        { idVenta: 'V002', fecha: '2023-10-25 11:15:00', cajero: 'Ana', total: 1200, metodoPago: 'tarjeta', estado: 'completada' },
                        { idVenta: 'V003', fecha: '2023-10-26 09:45:00', cajero: 'Juan', total: 85, metodoPago: 'efectivo', estado: 'completada' },
                    ]
                };

            case 'createSale':
                return { success: true, message: 'Venta registrada con éxito', idVenta: 'V-MOCK-' + Date.now() };

            case 'createProduct':
                return { success: true, message: 'Producto creado con éxito', productId: 'P-MOCK-' + Date.now() };

            case 'deleteProduct':
                return { success: true, message: 'Producto eliminado' };

            case 'getBOM':
                return {
                    success: true,
                    bom: [
                        { idProducto: params.productId, idInsumo: '1', cantidad: 0.5, unidad: 'kg' },
                        { idProducto: params.productId, idInsumo: '3', cantidad: 2, unidad: 'pza' }
                    ]
                };

            case 'setBOM':
                return { success: true, message: 'BOM actualizado' };

            case 'registerProduction':
                return { success: true, message: 'Producción registrada', stockNuevo: 10 };

            case 'updateProductStock':
                return { success: true, message: 'Stock actualizado', stockNuevo: 20 };

            case 'getProjections':
                return {
                    success: true,
                    projections: [
                        { id: 'P01', tipo: 'automática', periodo: 'semana', fechaCreacion: '2023-10-20' }
                    ]
                };

            case 'getPurchaseSuggestions':
                return {
                    success: true,
                    suggestions: [
                        { idInsumo: '4', nombre: 'Leche', stockActual: 2, stockMinimo: 12, cantidadAComprar: 22, prioridad: 'critico' },
                        { idInsumo: '2', nombre: 'Azúcar', stockActual: 8, stockMinimo: 10, cantidadAComprar: 12, prioridad: 'bajo' }
                    ]
                };

            default:
                return { success: true };
        }
    },

    // Auth Methods
    login: async function (email, password) {
        try {
            const response = await this.call('login', { email, password });
            this.token = response.token;
            this.user = response.user;
            localStorage.setItem('auth_token', this.token);
            localStorage.setItem('user_info', JSON.stringify(this.user));
            return response;
        } catch (e) { throw e; }
    },

    logout: function () {
        this.token = null;
        this.user = null;
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_info');
        window.location.reload();
    }
};
