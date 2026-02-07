/**
 * ReportService.gs
 * Servicio de Generación de Reportes
 */

const ReportService = {
  
  /**
   * Reporte general de ventas
   */
  getSalesReport: function(periodo) {
    try {
      const { fechaInicio, fechaFin } = this.parsePeriodo(periodo);
      const salesResult = SalesService.getSales(fechaInicio, fechaFin);
      
      if (!salesResult.success) {
        return salesResult;
      }
      
      const sales = salesResult.sales.filter(s => s.estado === 'completada');
      
      let totalVentas = 0;
      let totalDescuentos = 0;
      let totalNeto = 0;
      const ventasPorDia = {};
      const ventasPorMetodo = {};
      
      sales.forEach(sale => {
        totalVentas += sale.subtotal;
        totalDescuentos += sale.descuento;
        totalNeto += sale.total;
        
        // Agrupar por día (asegurando que sea string)
        let fechaStr = sale.fecha;
        if (fechaStr instanceof Date) {
          fechaStr = Utilities.formatDate(fechaStr, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
        }
        const dia = fechaStr.split(' ')[0];
        if (!ventasPorDia[dia]) {
          ventasPorDia[dia] = { ventas: 0, total: 0 };
        }
        ventasPorDia[dia].ventas++;
        ventasPorDia[dia].total += sale.total;
        
        // Agrupar por método de pago
        if (!ventasPorMetodo[sale.metodoPago]) {
          ventasPorMetodo[sale.metodoPago] = { ventas: 0, total: 0 };
        }
        ventasPorMetodo[sale.metodoPago].ventas++;
        ventasPorMetodo[sale.metodoPago].total += sale.total;
      });
      
      return {
        success: true,
        reporte: {
          periodo: periodo,
          fechaInicio: fechaInicio,
          fechaFin: fechaFin,
          totalVentas: sales.length,
          montoTotal: totalVentas,
          descuentos: totalDescuentos,
          neto: totalNeto,
          promedioVenta: sales.length > 0 ? totalNeto / sales.length : 0,
          ventasPorDia: ventasPorDia,
          ventasPorMetodo: ventasPorMetodo
        }
      };
      
    } catch (error) {
      console.error('Error en getSalesReport:', error);
      return {
        success: false,
        error: 'Error al generar reporte de ventas'
      };
    }
  },
  
  /**
   * Reporte de ventas por producto
   */
  getProductSalesReport: function(periodo) {
    try {
      const { fechaInicio, fechaFin } = this.parsePeriodo(periodo);
      const salesResult = SalesService.getSales(fechaInicio, fechaFin);
      
      if (!salesResult.success) {
        return salesResult;
      }
      
      const sales = salesResult.sales.filter(s => s.estado === 'completada');
      const detalleSheet = getSheet('Detalle Ventas');
      const productosSheet = getSheet('Productos');
      const detalleData = detalleSheet.getDataRange().getValues();
      const productosData = productosSheet.getDataRange().getValues();
      
      const productoVentas = {};
      
      // Obtener IDs de ventas del periodo
      const ventasIds = sales.map(s => s.idVenta);
      
      // Procesar detalle de ventas
      for (let i = 1; i < detalleData.length; i++) {
        const idVenta = detalleData[i][0];
        
        if (ventasIds.includes(idVenta)) {
          const idProducto = detalleData[i][1];
          const cantidad = detalleData[i][2];
          const subtotal = detalleData[i][4];
          
          if (!productoVentas[idProducto]) {
            productoVentas[idProducto] = {
              cantidad: 0,
              total: 0
            };
          }
          
          productoVentas[idProducto].cantidad += cantidad;
          productoVentas[idProducto].total += subtotal;
        }
      }
      
      // Enriquecer con datos de productos
      const reporte = [];
      for (const idProducto in productoVentas) {
        let nombreProducto = '';
        let categoria = '';
        
        for (let i = 1; i < productosData.length; i++) {
          if (productosData[i][0] === idProducto) {
            nombreProducto = productosData[i][1];
            categoria = productosData[i][3];
            break;
          }
        }
        
        reporte.push({
          idProducto: idProducto,
          nombre: nombreProducto,
          categoria: categoria,
          cantidadVendida: productoVentas[idProducto].cantidad,
          totalVentas: productoVentas[idProducto].total
        });
      }
      
      // Ordenar por cantidad vendida
      reporte.sort((a, b) => b.cantidadVendida - a.cantidadVendida);
      
      return {
        success: true,
        reporte: reporte
      };
      
    } catch (error) {
      console.error('Error en getProductSalesReport:', error);
      return {
        success: false,
        error: 'Error al generar reporte de productos'
      };
    }
  },
  
  /**
   * Reporte de ganancias
   */
  getProfitReport: function(periodo) {
    try {
      const { fechaInicio, fechaFin } = this.parsePeriodo(periodo);
      const salesResult = SalesService.getSales(fechaInicio, fechaFin);
      
      if (!salesResult.success) {
        return salesResult;
      }
      
      const sales = salesResult.sales.filter(s => s.estado === 'completada');
      const detalleSheet = getSheet('Detalle Ventas');
      const productosSheet = getSheet('Productos');
      const detalleData = detalleSheet.getDataRange().getValues();
      const productosData = productosSheet.getDataRange().getValues();
      
      let totalIngresos = 0;
      let totalCostos = 0;
      
      const ventasIds = sales.map(s => s.idVenta);
      
      for (let i = 1; i < detalleData.length; i++) {
        const idVenta = detalleData[i][0];
        
        if (ventasIds.includes(idVenta)) {
          const idProducto = detalleData[i][1];
          const cantidad = detalleData[i][2];
          const subtotal = detalleData[i][4];
          
          totalIngresos += subtotal;
          
          // Buscar costo del producto
          for (let j = 1; j < productosData.length; j++) {
            if (productosData[j][0] === idProducto) {
              const costoProduccion = productosData[j][5];
              totalCostos += costoProduccion * cantidad;
              break;
            }
          }
        }
      }
      
      const ganancia = totalIngresos - totalCostos;
      const margen = totalIngresos > 0 ? (ganancia / totalIngresos * 100).toFixed(2) : 0;
      
      return {
        success: true,
        reporte: {
          periodo: periodo,
          ingresos: totalIngresos,
          costos: totalCostos,
          ganancia: ganancia,
          margen: margen
        }
      };
      
    } catch (error) {
      console.error('Error en getProfitReport:', error);
      return {
        success: false,
        error: 'Error al generar reporte de ganancias'
      };
    }
  },
  
  /**
   * Reporte por cajero
   */
  getCashierReport: function(cajero, periodo) {
    try {
      const { fechaInicio, fechaFin } = this.parsePeriodo(periodo);
      const salesResult = SalesService.getSales(fechaInicio, fechaFin);
      
      if (!salesResult.success) {
        return salesResult;
      }
      
      const sales = salesResult.sales.filter(s => 
        s.estado === 'completada' && s.cajero === cajero
      );
      
      let totalVentas = 0;
      let totalNeto = 0;
      
      sales.forEach(sale => {
        totalVentas++;
        totalNeto += sale.total;
      });
      
      return {
        success: true,
        reporte: {
          cajero: cajero,
          periodo: periodo,
          totalVentas: totalVentas,
          montoTotal: totalNeto,
          promedioVenta: totalVentas > 0 ? totalNeto / totalVentas : 0
        }
      };
      
    } catch (error) {
      console.error('Error en getCashierReport:', error);
      return {
        success: false,
        error: 'Error al generar reporte de cajero'
      };
    }
  },
  
  /**
   * Reporte por método de pago
   */
  getPaymentMethodReport: function(periodo) {
    try {
      const { fechaInicio, fechaFin } = this.parsePeriodo(periodo);
      const salesResult = SalesService.getSales(fechaInicio, fechaFin);
      
      if (!salesResult.success) {
        return salesResult;
      }
      
      const sales = salesResult.sales.filter(s => s.estado === 'completada');
      const metodos = {};
      
      sales.forEach(sale => {
        if (!metodos[sale.metodoPago]) {
          metodos[sale.metodoPago] = {
            ventas: 0,
            total: 0
          };
        }
        metodos[sale.metodoPago].ventas++;
        metodos[sale.metodoPago].total += sale.total;
      });
      
      return {
        success: true,
        reporte: metodos
      };
      
    } catch (error) {
      console.error('Error en getPaymentMethodReport:', error);
      return {
        success: false,
        error: 'Error al generar reporte de métodos de pago'
      };
    }
  },
  
  /**
   * Parsear periodo a fechas
   */
  parsePeriodo: function(periodo) {
    const hoy = new Date();
    let fechaInicio, fechaFin;
    
    if (periodo.tipo === 'personalizado') {
      fechaInicio = periodo.fechaInicio;
      fechaFin = periodo.fechaFin;
    } else if (periodo === 'hoy') {
      fechaInicio = new Date(hoy.setHours(0, 0, 0, 0));
      fechaFin = new Date(hoy.setHours(23, 59, 59, 999));
    } else if (periodo === 'semana') {
      const primerDia = hoy.getDate() - hoy.getDay();
      fechaInicio = new Date(hoy.setDate(primerDia));
      fechaInicio.setHours(0, 0, 0, 0);
      fechaFin = new Date(hoy.setDate(primerDia + 6));
      fechaFin.setHours(23, 59, 59, 999);
    } else if (periodo === 'mes') {
      fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      fechaFin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
      fechaFin.setHours(23, 59, 59, 999);
    }
    
    return {
      fechaInicio: formatDate(fechaInicio),
      fechaFin: formatDate(fechaFin)
    };
  }
  
};
