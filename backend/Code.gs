/**
 * Sistema POS y ERP para Pastelería
 * Archivo principal - Code.gs
 * 
 * Este archivo maneja:
 * - Servir la aplicación web (doGet)
 * - Enrutamiento de API (doPost)
 * - Configuración global
 */

// ============================================
// CONFIGURACIÓN GLOBAL
// ============================================

const CONFIG = {
  // ID Hoja de Producción: https://docs.google.com/spreadsheets/d/1JIIXGDwi5JrJkSXqQrgWMfJgBkaljgpFJNQYPFaGzgU/edit
  SHEET_ID: '1JIIXGDwi5JrJkSXqQrgWMfJgBkaljgpFJNQYPFaGzgU', 
  SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 horas
  APP_NAME: 'Sistema POS Pastelería',
  VERSION: '1.0.0'
};

// ============================================
// SERVIR APLICACIÓN WEB
// ============================================

function doGet(e) {
  const template = HtmlService.createTemplateFromFile('index');
  template.scriptUrl = ScriptApp.getService().getUrl();
  
  return template.evaluate()
    .setTitle(CONFIG.APP_NAME)
    .setFaviconUrl('https://img.icons8.com/color/48/000000/cake.png')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ============================================
// API ENDPOINTS
// ============================================

function doPost(e) {
  try {
    const params = JSON.parse(e.postData.contents);
    const action = params.action;
    
    // Log para debugging
    console.log('API Call:', action, params);
    
    // Enrutamiento de acciones
    switch(action) {
      // ===== AUTENTICACIÓN =====
      case 'login':
        return createResponse(AuthService.login(params.email, params.password));
      
      case 'logout':
        return createResponse(AuthService.logout(params.token));
      
      case 'validateSession':
        return createResponse(AuthService.validateSession(params.token));
      
      // ===== PRODUCTOS =====
      case 'getProducts':
        return createResponse(ProductService.getProducts(params.activos));
      
      case 'getProduct':
        return createResponse(ProductService.getProduct(params.id));
      
      case 'createProduct':
        validateRole(params.token, ['administrador', 'gerente', 'director']);
        return createResponse(ProductService.createProduct(params.data));
      
      case 'updateProduct':
        validateRole(params.token, ['administrador', 'gerente', 'director']);
        return createResponse(ProductService.updateProduct(params.id, params.data));
      
      case 'deleteProduct':
        validateRole(params.token, ['gerente', 'director']);
        return createResponse(ProductService.deleteProduct(params.id));
      
      case 'registerProduction':
        validateRole(params.token, ['administrador', 'gerente', 'director']);
        return createResponse(ProductService.registerProduction(params.id, params.cantidad));

      case 'updateProductStock':
        validateRole(params.token, ['administrador', 'gerente', 'director']);
        return createResponse(ProductService.updateStock(params.id, params.cantidad));
      
      // ===== INSUMOS =====
      case 'getInsumos':
        return createResponse(InventoryService.getInsumos());
      
      case 'createInsumo':
        validateRole(params.token, ['administrador', 'gerente', 'director']);
        return createResponse(InventoryService.createInsumo(params.data));
      
      case 'updateInsumo':
        validateRole(params.token, ['administrador', 'gerente', 'director']);
        return createResponse(InventoryService.updateInsumo(params.id, params.data));
      
      case 'updateStock':
        validateRole(params.token, ['administrador', 'gerente', 'director']);
        return createResponse(InventoryService.updateStock(params.id, params.cantidad));
      
      case 'getStockAlerts':
        return createResponse(InventoryService.getStockAlerts());
      
      // ===== BOM (Bill of Materials) =====
      case 'getBOM':
        return createResponse(BOMService.getBOM(params.productId));
      
      case 'setBOM':
        validateRole(params.token, ['administrador', 'gerente', 'director']);
        return createResponse(BOMService.setBOM(params.productId, params.insumos));
      
      case 'calculateBOMCost':
        return createResponse(BOMService.calculateBOMCost(params.productId));
      
      // ===== VENTAS =====
      case 'createSale':
        validateRole(params.token, ['cajero', 'administrador', 'gerente', 'director']);
        return createResponse(SalesService.createSale(
          params.items,
          params.metodoPago,
          params.descuento,
          params.cajero
        ));
      
      case 'getSales':
        return createResponse(SalesService.getSales(params.fechaInicio, params.fechaFin));
      
      case 'getSaleDetail':
        return createResponse(SalesService.getSaleDetail(params.idVenta));
      
      case 'cancelSale':
        validateRole(params.token, ['gerente', 'director']);
        return createResponse(SalesService.cancelSale(params.idVenta));
      
      // ===== REPORTES =====
      case 'getSalesReport':
        validateRole(params.token, ['administrador', 'gerente', 'director']);
        return createResponse(ReportService.getSalesReport(params.periodo));
      
      case 'getProductSalesReport':
        validateRole(params.token, ['administrador', 'gerente', 'director']);
        return createResponse(ReportService.getProductSalesReport(params.periodo));
      
      case 'getProfitReport':
        validateRole(params.token, ['gerente', 'director']);
        return createResponse(ReportService.getProfitReport(params.periodo));
      
      case 'getCashierReport':
        validateRole(params.token, ['gerente', 'director']);
        return createResponse(ReportService.getCashierReport(params.cajero, params.periodo));
      
      case 'getPaymentMethodReport':
        validateRole(params.token, ['gerente', 'director']);
        return createResponse(ReportService.getPaymentMethodReport(params.periodo));
      
      // ===== PROYECCIONES =====
      case 'getHistoricalProjection':
        validateRole(params.token, ['gerente', 'director', 'administrador']);
        return createResponse(ProjectionService.getHistoricalProjection());

      case 'calculateProjectionDetails':
        validateRole(params.token, ['gerente', 'director', 'administrador']);
        return createResponse(ProjectionService.calculateProjectionDetails(params.items));

      case 'createManualProjection':
        validateRole(params.token, ['gerente', 'director', 'administrador']);
        return createResponse(ProjectionService.createManualProjection(params.data));
      
      case 'generateAutoProjection':
        validateRole(params.token, ['gerente', 'director', 'administrador']);
        return createResponse(ProjectionService.generateAutoProjection(params.periodo));
      
      case 'getProjections':
        validateRole(params.token, ['gerente', 'director', 'administrador']);
        return createResponse(ProjectionService.getProjections(params.periodo));
      
      // ===== COMPRAS =====
      case 'calculatePurchases':
        validateRole(params.token, ['gerente', 'director']);
        return createResponse(PurchaseService.calculatePurchases(params.proyeccionId));
      
      case 'getPurchaseSuggestions':
        validateRole(params.token, ['gerente', 'director']);
        return createResponse(PurchaseService.getPurchaseSuggestions());
      
      default:
        throw new Error('Acción no reconocida: ' + action);
    }
    
  } catch (error) {
    console.error('Error en API:', error);
    return createResponse({
      success: false,
      error: error.message
    });
  }
}

// ============================================
// FUNCIONES AUXILIARES
// ============================================

function createResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function validateRole(token, allowedRoles) {
  const session = AuthService.validateSession(token);
  
  if (!session.success) {
    throw new Error('Sesión inválida o expirada');
  }
  
  if (!allowedRoles.includes(session.user.rol)) {
    throw new Error('No tienes permisos para realizar esta acción');
  }
  
  return session.user;
}

// ============================================
// UTILIDADES GLOBALES
// ============================================

function getSpreadsheet() {
  return SpreadsheetApp.openById(CONFIG.SHEET_ID);
}

function getSheet(sheetName) {
  return getSpreadsheet().getSheetByName(sheetName);
}

function generateId(prefix = '', sheetName = '') {
  const months = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
  const now = new Date();
  const monthStr = months[now.getMonth()];
  
  if (!sheetName) {
    // Fallback if no sheetName is provided
    return prefix + monthStr + Math.random().toString(36).substr(2, 4).toUpperCase();
  }

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); // 10 seconds timeout
    
    const sheet = getSheet(sheetName);
    const lastRow = sheet.getLastRow();
    let nextNum = 1;
    
    if (lastRow > 1) {
      const lastId = sheet.getRange(lastRow, 1).getValue().toString();
      const parts = lastId.split('_');
      const lastMonth = parts[parts.length - 2];
      const lastNum = parseInt(parts[parts.length - 1]);
      
      // If it's the same month, increment. If not, reset to 1.
      if (lastMonth === monthStr && !isNaN(lastNum)) {
        nextNum = lastNum + 1;
      }
    }
    
    return `${prefix}_${monthStr}_${nextNum}`;
    
  } catch (error) {
    console.error('Error in generateId:', error);
    return prefix + monthStr + Date.now().toString().slice(-4);
  } finally {
    lock.releaseLock();
  }
}

function formatDate(date) {
  if (!(date instanceof Date)) {
    date = new Date(date);
  }
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
}

function hashPassword(password) {
  return Utilities.base64Encode(Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    password + 'BAKERY_SALT_2026'
  ));
}

// ============================================
// FUNCIONES DE INICIALIZACIÓN
// ============================================

/**
 * Función para configurar el ID del Sheet
 * Ejecutar manualmente una vez después de crear el proyecto
 */
function setupSheetId() {
  try {
    // Intenta obtener la hoja activa
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    
    if (!spreadsheet) {
      throw new Error('No se pudo detectar la hoja de cálculo activa. Ejecuta este script desde la hoja vinculada o ingresa el ID manualmente.');
    }
    
    const sheetId = spreadsheet.getId();
    PropertiesService.getScriptProperties().setProperty('SHEET_ID', sheetId);
    console.log('✅ ÉXITO: Sheet ID configurado correctamente:', sheetId);
    
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.log('--- SOLUCIÓN MANUAL ---');
    console.log('1. Copia el ID de tu hoja de cálculo (es la parte larga en la URL entre /d/ y /edit)');
    console.log('2. Ejecuta esta línea en la consola o crea una función temporal:');
    console.log('   PropertiesService.getScriptProperties().setProperty("SHEET_ID", "PEGA_TU_ID_AQUI");');
  }
}

/**
 * Función para crear usuario administrador inicial
 * Ejecutar manualmente una vez para crear el primer usuario
 */
function createInitialAdmin() {
  const sheet = getSheet('Usuarios');
  
  const adminData = [
    'admin@pasteleria.com',
    'Administrador',
    hashPassword('admin123'),
    'director',
    true,
    formatDate(new Date())
  ];
  
  sheet.appendRow(adminData);
  console.log('Usuario administrador creado');
  console.log('Email: admin@pasteleria.com');
  console.log('Password: admin123');
  console.log('¡CAMBIA LA CONTRASEÑA INMEDIATAMENTE!');
}
