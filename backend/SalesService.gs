/**
 * SalesService.gs
 * Servicio de Gestión de Ventas (POS)
 */

const SalesService = {
  
  /**
   * Crear nueva venta
   */
  createSale: function(items, metodoPago, descuento = 0, cajero) {
    try {
      const ventasSheet = getSheet('Ventas');
      const detalleSheet = getSheet('Detalle Ventas');
      
      // Generar ID de venta
      const idVenta = generateId('VENTA', 'Ventas');
      const fecha = formatDate(new Date());
      
      // Calcular totales
      let subtotal = 0;
      items.forEach(item => {
        subtotal += item.cantidad * item.precioUnitario;
      });
      
      const total = subtotal - descuento;
      
      // Registrar venta principal
      const ventaRow = [
        idVenta,
        fecha,
        cajero,
        subtotal,
        descuento,
        total,
        metodoPago,
        'completada'
      ];
      
      ventasSheet.appendRow(ventaRow);
      
      // Registrar detalle de venta
      items.forEach(item => {
        const detalleRow = [
          idVenta,
          item.idProducto,
          item.cantidad,
          item.precioUnitario,
          item.cantidad * item.precioUnitario
        ];
        detalleSheet.appendRow(detalleRow);
        
        // Descontar producto terminado del inventario
        ProductService.updateStock(item.idProducto, -item.cantidad);
      });
      
      return {
        success: true,
        message: 'Venta registrada correctamente',
        idVenta: idVenta,
        total: total
      };
      
    } catch (error) {
      console.error('Error en createSale:', error);
      return {
        success: false,
        error: 'Error al crear venta: ' + error.message
      };
    }
  },
  
  /**
   * Obtener ventas por periodo
   */
  getSales: function(fechaInicio, fechaFin) {
    try {
      const sheet = getSheet('Ventas');
      const data = sheet.getDataRange().getValues();
      const sales = [];
      
      const inicio = new Date(fechaInicio);
      const fin = new Date(fechaFin);
      
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row[0]) continue; // Skip empty rows
        
        let fechaVenta = row[1];
        if (!(fechaVenta instanceof Date)) {
          fechaVenta = new Date(fechaVenta);
        }
        
        // Comparación robusta
        if (fechaVenta.getTime() >= inicio.getTime() && fechaVenta.getTime() <= fin.getTime()) {
          sales.push({
            idVenta: row[0],
            fecha: row[1],
            cajero: row[2],
            subtotal: row[3],
            descuento: row[4],
            total: row[5],
            metodoPago: row[6],
            estado: row[7]
          });
        }
      }
      
      return {
        success: true,
        sales: sales
      };
      
    } catch (error) {
      console.error('Error en getSales:', error);
      return {
        success: false,
        error: 'Error al obtener ventas: ' + error.message
      };
    }
  },
  
  /**
   * Obtener detalle de una venta
   */
  getSaleDetail: function(idVenta) {
    try {
      const ventasSheet = getSheet('Ventas');
      const detalleSheet = getSheet('Detalle Ventas');
      const productosSheet = getSheet('Productos');
      
      // Obtener venta principal
      const ventasData = ventasSheet.getDataRange().getValues();
      let venta = null;
      
      for (let i = 1; i < ventasData.length; i++) {
        if (ventasData[i][0] === idVenta) {
          venta = {
            idVenta: ventasData[i][0],
            fecha: ventasData[i][1],
            cajero: ventasData[i][2],
            subtotal: ventasData[i][3],
            descuento: ventasData[i][4],
            total: ventasData[i][5],
            metodoPago: ventasData[i][6],
            estado: ventasData[i][7]
          };
          break;
        }
      }
      
      if (!venta) {
        return {
          success: false,
          error: 'Venta no encontrada'
        };
      }
      
      // Obtener detalle
      const detalleData = detalleSheet.getDataRange().getValues();
      const productosData = productosSheet.getDataRange().getValues();
      const items = [];
      
      for (let i = 1; i < detalleData.length; i++) {
        if (detalleData[i][0] === idVenta) {
          const idProducto = detalleData[i][1];
          let nombreProducto = '';
          
          // Buscar nombre del producto
          for (let j = 1; j < productosData.length; j++) {
            if (productosData[j][0] === idProducto) {
              nombreProducto = productosData[j][1];
              break;
            }
          }
          
          items.push({
            idProducto: idProducto,
            nombreProducto: nombreProducto,
            cantidad: detalleData[i][2],
            precioUnitario: detalleData[i][3],
            subtotal: detalleData[i][4]
          });
        }
      }
      
      venta.items = items;
      
      return {
        success: true,
        venta: venta
      };
      
    } catch (error) {
      console.error('Error en getSaleDetail:', error);
      return {
        success: false,
        error: 'Error al obtener detalle de venta'
      };
    }
  },
  
  /**
   * Cancelar venta
   */
  cancelSale: function(idVenta) {
    try {
      const sheet = getSheet('Ventas');
      const data = sheet.getDataRange().getValues();
      
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === idVenta) {
          sheet.getRange(i + 1, 8).setValue('cancelada');
          
          // TODO: Devolver insumos al inventario
          
          return {
            success: true,
            message: 'Venta cancelada correctamente'
          };
        }
      }
      
      return {
        success: false,
        error: 'Venta no encontrada'
      };
      
    } catch (error) {
      console.error('Error en cancelSale:', error);
      return {
        success: false,
        error: 'Error al cancelar venta'
      };
    }
  }
  
};
