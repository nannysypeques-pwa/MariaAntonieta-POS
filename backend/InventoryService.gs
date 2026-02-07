/**
 * InventoryService.gs
 * Servicio de Gestión de Inventario de Insumos
 */

const InventoryService = {
  
  /**
   * Obtener todos los insumos
   */
  getInsumos: function() {
    try {
      const sheet = getSheet('Insumos');
      const data = sheet.getDataRange().getValues();
      const insumos = [];
      
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        insumos.push({
          id: row[0],
          nombre: row[1],
          unidadMedida: row[2],
          costoUnitario: row[3],
          stockActual: row[4],
          stockMinimo: row[5],
          proveedor: row[6],
          ultimaActualizacion: row[7]
        });
      }
      
      return {
        success: true,
        insumos: insumos
      };
      
    } catch (error) {
      console.error('Error en getInsumos:', error);
      return {
        success: false,
        error: 'Error al obtener insumos: ' + error.message
      };
    }
  },
  
  /**
   * Crear nuevo insumo
   */
  createInsumo: function(data) {
    try {
      const sheet = getSheet('Insumos');
      
      const id = generateId('INS', 'Insumos');
      const newRow = [
        id,
        data.nombre,
        data.unidadMedida,
        data.costoUnitario || 0,
        data.stockActual || 0,
        data.stockMinimo || 0,
        data.proveedor || '',
        formatDate(new Date())
      ];
      
      sheet.appendRow(newRow);
      
      return {
        success: true,
        message: 'Insumo creado correctamente',
        insumoId: id
      };
      
    } catch (error) {
      console.error('Error en createInsumo:', error);
      return {
        success: false,
        error: 'Error al crear insumo: ' + error.message
      };
    }
  },
  
  /**
   * Actualizar insumo existente
   */
  updateInsumo: function(id, data) {
    try {
      const sheet = getSheet('Insumos');
      const sheetData = sheet.getDataRange().getValues();
      
      for (let i = 1; i < sheetData.length; i++) {
        if (sheetData[i][0] === id) {
          const rowNum = i + 1;
          
          if (data.nombre !== undefined) {
            sheet.getRange(rowNum, 2).setValue(data.nombre);
          }
          if (data.unidadMedida !== undefined) {
            sheet.getRange(rowNum, 3).setValue(data.unidadMedida);
          }
          if (data.costoUnitario !== undefined) {
            sheet.getRange(rowNum, 4).setValue(data.costoUnitario);
          }
          if (data.stockActual !== undefined) {
            sheet.getRange(rowNum, 5).setValue(data.stockActual);
          }
          if (data.stockMinimo !== undefined) {
            sheet.getRange(rowNum, 6).setValue(data.stockMinimo);
          }
          if (data.proveedor !== undefined) {
            sheet.getRange(rowNum, 7).setValue(data.proveedor);
          }
          
          // Actualizar timestamp
          sheet.getRange(rowNum, 8).setValue(formatDate(new Date()));
          
          return {
            success: true,
            message: 'Insumo actualizado correctamente'
          };
        }
      }
      
      return {
        success: false,
        error: 'Insumo no encontrado'
      };
      
    } catch (error) {
      console.error('Error en updateInsumo:', error);
      return {
        success: false,
        error: 'Error al actualizar insumo: ' + error.message
      };
    }
  },
  
  /**
   * Actualizar stock de insumo
   */
  updateStock: function(id, cantidad) {
    try {
      const sheet = getSheet('Insumos');
      const data = sheet.getDataRange().getValues();
      
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === id) {
          const rowNum = i + 1;
          const stockActual = data[i][4];
          const nuevoStock = stockActual + cantidad;
          
          sheet.getRange(rowNum, 5).setValue(nuevoStock);
          sheet.getRange(rowNum, 8).setValue(formatDate(new Date()));
          
          return {
            success: true,
            message: 'Stock actualizado correctamente',
            stockAnterior: stockActual,
            stockNuevo: nuevoStock
          };
        }
      }
      
      return {
        success: false,
        error: 'Insumo no encontrado'
      };
      
    } catch (error) {
      console.error('Error en updateStock:', error);
      return {
        success: false,
        error: 'Error al actualizar stock'
      };
    }
  },
  
  /**
   * Obtener alertas de stock bajo
   */
  getStockAlerts: function() {
    try {
      const sheet = getSheet('Insumos');
      const data = sheet.getDataRange().getValues();
      const alerts = [];
      
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const stockActual = row[4];
        const stockMinimo = row[5];
        
        if (stockActual <= stockMinimo) {
          const nivel = stockActual <= (stockMinimo * 0.2) ? 'critico' : 'bajo';
          
          alerts.push({
            id: row[0],
            nombre: row[1],
            stockActual: stockActual,
            stockMinimo: stockMinimo,
            unidadMedida: row[2],
            nivel: nivel
          });
        }
      }
      
      return {
        success: true,
        alerts: alerts
      };
      
    } catch (error) {
      console.error('Error en getStockAlerts:', error);
      return {
        success: false,
        error: 'Error al obtener alertas'
      };
    }
  }
  
};
