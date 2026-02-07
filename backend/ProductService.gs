/**
 * ProductService.gs
 * Servicio de Gestión de Productos
 */

const ProductService = {
  
  /**
   * Obtener todos los productos
   */
  getProducts: function(activosOnly = true) {
    try {
      const sheet = getSheet('Productos');
      const data = sheet.getDataRange().getValues();
      const products = [];
      
      // Saltar encabezados (fila 1)
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        
        // Si solo queremos activos y este no lo es, saltar
        if (activosOnly && !row[7]) continue;
        
        products.push({
          id: row[0],
          nombre: row[1],
          descripcion: row[2],
          categoria: row[3],
          precioVenta: row[4],
          costoProduccion: row[5],
          margen: row[6],
          activo: row[7],
          imagenUrl: row[8],
          stock: row[9] || 0
        });
      }
      
      return {
        success: true,
        products: products
      };
      
    } catch (error) {
      console.error('Error en getProducts:', error);
      return {
        success: false,
        error: 'Error al obtener productos: ' + error.message
      };
    }
  },
  
  /**
   * Obtener un producto específico
   */
  getProduct: function(id) {
    try {
      const sheet = getSheet('Productos');
      const data = sheet.getDataRange().getValues();
      
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === id) {
          return {
            success: true,
            product: {
              id: data[i][0],
              nombre: data[i][1],
              descripcion: data[i][2],
              categoria: data[i][3],
              precioVenta: data[i][4],
              costoProduccion: data[i][5],
              margen: data[i][6],
              activo: data[i][7],
              imagenUrl: data[i][8],
              stock: data[i][9] || 0
            }
          };
        }
      }
      
      return {
        success: false,
        error: 'Producto no encontrado'
      };
      
    } catch (error) {
      console.error('Error en getProduct:', error);
      return {
        success: false,
        error: 'Error al obtener producto'
      };
    }
  },
  
  /**
   * Crear nuevo producto
   */
  createProduct: function(data) {
    try {
      const sheet = getSheet('Productos');
      
      const id = generateId('PROD', 'Productos');
      const costoProduccion = data.costoProduccion || 0;
      const precioVenta = data.precioVenta || 0;
      const margen = precioVenta > 0 ? 
        ((precioVenta - costoProduccion) / precioVenta * 100).toFixed(2) : 0;
      
      const newRow = [
        id,
        data.nombre,
        data.descripcion || '',
        data.categoria || '',
        precioVenta,
        costoProduccion,
        margen,
        true, // activo por defecto
        data.imagenUrl || '',
        0 // stock inicial
      ];
      
      sheet.appendRow(newRow);
      
      return {
        success: true,
        message: 'Producto creado correctamente',
        productId: id
      };
      
    } catch (error) {
      console.error('Error en createProduct:', error);
      return {
        success: false,
        error: 'Error al crear producto: ' + error.message
      };
    }
  },
  
  /**
   * Actualizar producto existente
   */
  updateProduct: function(id, data) {
    try {
      const sheet = getSheet('Productos');
      const sheetData = sheet.getDataRange().getValues();
      
      for (let i = 1; i < sheetData.length; i++) {
        if (sheetData[i][0] === id) {
          const rowNum = i + 1;
          
          // Actualizar campos proporcionados
          if (data.nombre !== undefined) {
            sheet.getRange(rowNum, 2).setValue(data.nombre);
          }
          if (data.descripcion !== undefined) {
            sheet.getRange(rowNum, 3).setValue(data.descripcion);
          }
          if (data.categoria !== undefined) {
            sheet.getRange(rowNum, 4).setValue(data.categoria);
          }
          if (data.precioVenta !== undefined) {
            sheet.getRange(rowNum, 5).setValue(data.precioVenta);
            
            // Recalcular margen
            const costoProduccion = sheet.getRange(rowNum, 6).getValue();
            const margen = data.precioVenta > 0 ?
              ((data.precioVenta - costoProduccion) / data.precioVenta * 100).toFixed(2) : 0;
            sheet.getRange(rowNum, 7).setValue(margen);
          }
          if (data.costoProduccion !== undefined) {
            sheet.getRange(rowNum, 6).setValue(data.costoProduccion);
            
            // Recalcular margen
            const precioVenta = sheet.getRange(rowNum, 5).getValue();
            const margen = precioVenta > 0 ?
              ((precioVenta - data.costoProduccion) / precioVenta * 100).toFixed(2) : 0;
            sheet.getRange(rowNum, 7).setValue(margen);
          }
          if (data.activo !== undefined) {
            sheet.getRange(rowNum, 8).setValue(data.activo);
          }
          if (data.imagenUrl !== undefined) {
            sheet.getRange(rowNum, 9).setValue(data.imagenUrl);
          }
          
          return {
            success: true,
            message: 'Producto actualizado correctamente'
          };
        }
      }
      
      return {
        success: false,
        error: 'Producto no encontrado'
      };
      
    } catch (error) {
      console.error('Error en updateProduct:', error);
      return {
        success: false,
        error: 'Error al actualizar producto: ' + error.message
      };
    }
  },
  
  /**
   * Eliminar (desactivar) producto
   */
  deleteProduct: function(id) {
    try {
      const sheet = getSheet('Productos');
      const data = sheet.getDataRange().getValues();
      
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === id) {
          sheet.getRange(i + 1, 8).setValue(false); // Desactivar
          
          return {
            success: true,
            message: 'Producto desactivado correctamente'
          };
        }
      }
      
      return {
        success: false,
        error: 'Producto no encontrado'
      };
      
    } catch (error) {
      console.error('Error en deleteProduct:', error);
      return {
        success: false,
        error: 'Error al eliminar producto'
      };
    }
  },
  
  /**
   * Calcular costo de producción desde BOM
   */
  calculateProductCost: function(id) {
    try {
      const bomResult = BOMService.calculateBOMCost(id);
      
      if (!bomResult.success) {
        return bomResult;
      }
      
      // Actualizar costo en la hoja de productos
      const sheet = getSheet('Productos');
      const data = sheet.getDataRange().getValues();
      
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === id) {
          const rowNum = i + 1;
          const precioVenta = data[i][4];
          const costoProduccion = bomResult.costo;
          
          sheet.getRange(rowNum, 6).setValue(costoProduccion);
          
          // Recalcular margen
          const margen = precioVenta > 0 ?
            ((precioVenta - costoProduccion) / precioVenta * 100).toFixed(2) : 0;
          sheet.getRange(rowNum, 7).setValue(margen);
          
          return {
            success: true,
            costo: costoProduccion,
            margen: margen
          };
        }
      }
      
      return {
        success: false,
        error: 'Producto no encontrado'
      };
      
    } catch (error) {
      console.error('Error en calculateProductCost:', error);
      return {
        success: false,
        error: 'Error al calcular costo'
      };
    }
  },

  /**
   * Actualizar stock del producto
   */
  updateStock: function(id, cantidad) {
    try {
      const sheet = getSheet('Productos');
      const data = sheet.getDataRange().getValues();
      
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === id) {
          const rowNum = i + 1;
          const stockActual = data[i][9] || 0;
          const nuevoStock = stockActual + cantidad;
          
          sheet.getRange(rowNum, 10).setValue(nuevoStock);
          
          return {
            success: true,
            message: 'Stock de producto actualizado',
            stockNuevo: nuevoStock
          };
        }
      }
      return { success: false, error: 'Producto no encontrado' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Registrar producción
   */
  registerProduction: function(id, cantidad) {
    try {
      // 1. Validar BOM (Insumos suficientes)
      const validation = BOMService.validateBOM(id, cantidad);
      if (!validation.success) return validation;
      if (!validation.disponible) {
        return {
          success: false,
          error: 'Insumos insuficientes para producir ' + cantidad + ' unidades',
          faltantes: validation.faltantes
        };
      }

      // 2. Descontar Insumos
      const deductResult = BOMService.deductInventory(id, cantidad);
      if (!deductResult.success) return deductResult;

      // 3. Aumentar Stock del producto terminado
      return this.updateStock(id, cantidad);

    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
};
