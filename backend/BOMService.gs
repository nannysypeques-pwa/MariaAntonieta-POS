/**
 * BOMService.gs
 * Servicio de Gestión de BOM (Bill of Materials)
 * Maneja las recetas de productos
 */

const BOMService = {
  
  /**
   * Factores de conversión
   */
  CONVERSION_FACTORS: {
    'g': { 'kg': 0.001, 'g': 1 },
    'kg': { 'g': 1000, 'kg': 1 },
    'ml': { 'L': 0.001, 'ml': 1 },
    'L': { 'ml': 1000, 'L': 1 }
  },

  /**
   * Convertir cantidad entre unidades
   */
  convertUnit: function(cantidad, fromUnit, toUnit) {
    if (fromUnit === toUnit) return cantidad;
    
    const factors = this.CONVERSION_FACTORS[fromUnit];
    if (factors && factors[toUnit]) {
      return cantidad * factors[toUnit];
    }
    
    // Si no son compatibles (ej: pza a kg), devolver cantidad original
    return cantidad;
  },

  
  /**
   * Obtener BOM de un producto
   */
  getBOM: function(productId) {
    try {
      const sheet = getSheet('BOM');
      const data = sheet.getDataRange().getValues();
      const bom = [];
      
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        
        if (row[0] === productId) {
          bom.push({
            idProducto: row[0],
            idInsumo: row[1],
            cantidad: row[2],
            unidad: row[3] // Unidad definida en la receta (BOM)
          });
        }
      }
      
      // Enriquecer con datos de insumos
      if (bom.length > 0) {
        const insumosSheet = getSheet('Insumos');
        const insumosData = insumosSheet.getDataRange().getValues();
        
        bom.forEach(item => {
          for (let i = 1; i < insumosData.length; i++) {
            if (insumosData[i][0] === item.idInsumo) {
              item.nombreInsumo = insumosData[i][1];
              item.unidadInsumo = insumosData[i][2]; // Unidad base en el inventario
              item.costoUnitario = insumosData[i][3];
              item.stockActual = insumosData[i][4];
              break;
            }
          }
        });
      }
      
      return {
        success: true,
        bom: bom
      };
      
    } catch (error) {
      console.error('Error en getBOM:', error);
      return {
        success: false,
        error: 'Error al obtener BOM: ' + error.message
      };
    }
  },
  
  /**
   * Establecer BOM de un producto
   * insumos: [{idInsumo, cantidad, unidad}, ...]
   */
  setBOM: function(productId, insumos) {
    try {
      const sheet = getSheet('BOM');
      const data = sheet.getDataRange().getValues();
      
      // Eliminar BOM existente del producto
      for (let i = data.length - 1; i >= 1; i--) {
        if (data[i][0] === productId) {
          sheet.deleteRow(i + 1);
        }
      }
      
      // Agregar nuevos insumos
      insumos.forEach(insumo => {
        const newRow = [
          productId,
          insumo.idInsumo,
          insumo.cantidad,
          insumo.unidad
        ];
        sheet.appendRow(newRow);
      });
      
      // Recalcular costo del producto
      ProductService.calculateProductCost(productId);
      
      return {
        success: true,
        message: 'BOM actualizado correctamente'
      };
      
    } catch (error) {
      console.error('Error en setBOM:', error);
      return {
        success: false,
        error: 'Error al establecer BOM: ' + error.message
      };
    }
  },
  
  /**
   * Calcular costo de producción desde BOM
   */
  calculateBOMCost: function(productId) {
    try {
      const bomResult = this.getBOM(productId);
      
      if (!bomResult.success) {
        return bomResult;
      }
      
      const bom = bomResult.bom;
      
      if (bom.length === 0) {
        return {
          success: false,
          error: 'El producto no tiene BOM definido'
        };
      }
      
      let costoTotal = 0;
      
      bom.forEach(item => {
        // Convertir cantidad de la receta a la unidad base del insumo
        const cantidadConvertida = this.convertUnit(item.cantidad, item.unidad, item.unidadInsumo);
        const costoInsumo = cantidadConvertida * item.costoUnitario;
        costoTotal += costoInsumo;
      });
      
      return {
        success: true,
        costo: costoTotal,
        detalles: bom.map(item => {
          const cantidadConvertida = this.convertUnit(item.cantidad, item.unidad, item.unidadInsumo);
          return {
            insumo: item.nombreInsumo,
            cantidadReceta: item.cantidad,
            unidadReceta: item.unidad,
            cantidadConvertida: cantidadConvertida,
            unidadInsumo: item.unidadInsumo,
            costoUnitario: item.costoUnitario,
            costoTotal: cantidadConvertida * item.costoUnitario
          };
        })
      };
      
    } catch (error) {
      console.error('Error en calculateBOMCost:', error);
      return {
        success: false,
        error: 'Error al calcular costo BOM'
      };
    }
  },
  
  /**
   * Validar disponibilidad de insumos para producir
   */
  validateBOM: function(productId, cantidadAProducir = 1) {
    try {
      const bomResult = this.getBOM(productId);
      
      if (!bomResult.success) {
        return bomResult;
      }
      
      const bom = bomResult.bom;
      const faltantes = [];
      
      bom.forEach(item => {
        // Cantidad necesaria para Producir X unidades, convertida a la unidad del inventario
        const necesarioReceta = item.cantidad * cantidadAProducir;
        const necesarioInventario = this.convertUnit(necesarioReceta, item.unidad, item.unidadInsumo);
        
        if (item.stockActual < necesarioInventario) {
          faltantes.push({
            insumo: item.nombreInsumo,
            necesario: necesarioInventario,
            disponible: item.stockActual,
            faltante: necesarioInventario - item.stockActual,
            unidad: item.unidadInsumo
          });
        }
      });
      
      return {
        success: true,
        disponible: faltantes.length === 0,
        faltantes: faltantes
      };
      
    } catch (error) {
      console.error('Error en validateBOM:', error);
      return {
        success: false,
        error: 'Error al validar BOM'
      };
    }
  },
  
  /**
   * Descontar insumos del inventario al producir
   */
  deductInventory: function(productId, cantidad = 1) {
    try {
      const bomResult = this.getBOM(productId);
      
      if (!bomResult.success) {
        return bomResult;
      }
      
      const bom = bomResult.bom;
      
      // Descontar cada insumo
      bom.forEach(item => {
        // Cantidad a descontar por cada producto, convertida a la unidad base
        const cantidadUnitariaBase = this.convertUnit(item.cantidad, item.unidad, item.unidadInsumo);
        const cantidadADescontar = cantidadUnitariaBase * cantidad * -1; // Negativo para restar
        InventoryService.updateStock(item.idInsumo, cantidadADescontar);
      });
      
      return {
        success: true,
        message: 'Inventario actualizado correctamente'
      };
      
    } catch (error) {
      console.error('Error en deductInventory:', error);
      return {
        success: false,
        error: 'Error al descontar inventario'
      };
    }
  }
  
};
