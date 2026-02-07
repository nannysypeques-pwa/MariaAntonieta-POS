/**
 * ProjectionService.gs
 * Servicio de Proyecciones de Ventas
 */

const ProjectionService = {
  
  /**
   * Crear proyección manual
   */
  createManualProjection: function(data) {
    try {
      const sheet = getSheet('Proyecciones Ventas');
      const idProyeccion = generateId('PROJ_');
      const fechaCreacion = formatDate(new Date());
      
      data.items.forEach(item => {
        const row = [
          idProyeccion,
          'manual',
          data.periodo,
          data.fechaInicio,
          data.fechaFin,
          item.idProducto,
          item.cantidadProyectada,
          data.creadoPor,
          fechaCreacion
        ];
        sheet.appendRow(row);
      });
      
      return {
        success: true,
        message: 'Proyección manual creada correctamente',
        idProyeccion: idProyeccion
      };
      
    } catch (error) {
      console.error('Error en createManualProjection:', error);
      return {
        success: false,
        error: 'Error al crear proyección manual'
      };
    }
  },
  
  /**
   * Generar proyección automática basada en históricos
   */
  generateAutoProjection: function(periodo) {
    try {
      const { fechaInicio, fechaFin } = ReportService.parsePeriodo(periodo.tipo);
      
      // Obtener datos históricos (últimos 3 meses para simplificar)
      const hoy = new Date();
      const tresMesesAtras = new Date(hoy.setMonth(hoy.getMonth() - 3));
      
      const salesResult = SalesService.getSales(
        formatDate(tresMesesAtras),
        formatDate(new Date())
      );
      
      if (!salesResult.success) {
        return salesResult;
      }
      
      const sales = salesResult.sales.filter(s => s.estado === 'completada');
      const productosVendidos = {};
      
      // Analizar ventas históricas
      const detalleSheet = getSheet('Detalle Ventas');
      const detalleData = detalleSheet.getDataRange().getValues();
      const ventasIds = sales.map(s => s.idVenta);
      
      for (let i = 1; i < detalleData.length; i++) {
        if (ventasIds.includes(detalleData[i][0])) {
          const idProducto = detalleData[i][1];
          const cantidad = detalleData[i][2];
          
          if (!productosVendidos[idProducto]) {
            productosVendidos[idProducto] = 0;
          }
          productosVendidos[idProducto] += cantidad;
        }
      }
      
      // Calcular promedio simple (se puede mejorar con algoritmos más complejos)
      const projectionItems = [];
      const userEmail = Session.getActiveUser().getEmail(); // O el usuario actual del sistema
      
      for (const idProducto in productosVendidos) {
        // Promedio mensual simple
        const promedioMensual = Math.ceil(productosVendidos[idProducto] / 3);
        
        // Ajustar según periodo solicitado
        let cantidadProyectada = promedioMensual;
        if (periodo.tipo === 'semana') cantidadProyectada = Math.ceil(promedioMensual / 4);
        if (periodo.tipo === 'semestre') cantidadProyectada = promedioMensual * 6;
        
        projectionItems.push({
          idProducto: idProducto,
          cantidadProyectada: cantidadProyectada
        });
      }
      
      // Guardar proyección
      return this.createManualProjection({
        periodo: periodo.tipo,
        fechaInicio: fechaInicio,
        fechaFin: fechaFin,
        creadoPor: 'SISTEMA',
        items: projectionItems
      });
      
    } catch (error) {
      console.error('Error en generateAutoProjection:', error);
      return {
        success: false,
        error: 'Error al generar proyección automática'
      };
    }
  },
  
  /**
   * Obtener proyección basada en el historial de los últimos 30 días
   */
  getHistoricalProjection: function() {
    try {
      const hoy = new Date();
      const hace30Dias = new Date(hoy.getTime() - (30 * 24 * 60 * 60 * 1000));
      
      const salesRes = SalesService.getSales(formatDate(hace30Dias), formatDate(hoy));
      if (!salesRes.success) return salesRes;

      const sales = salesRes.sales.filter(s => s.estado === 'completada');
      const prodQty = {};

      // Obtener detalle de ventas para saber qué productos se vendieron
      const detalleSheet = getSheet('Detalle Ventas');
      const detalleData = detalleSheet.getDataRange().getValues();
      const ventaIds = sales.map(s => s.idVenta);

      for (let i = 1; i < detalleData.length; i++) {
        if (ventaIds.includes(detalleData[i][0])) {
          const idProd = detalleData[i][1];
          const qty = detalleData[i][2];
          prodQty[idProd] = (prodQty[idProd] || 0) + qty;
        }
      }

      const items = Object.keys(prodQty).map(id => ({
        idProducto: id,
        cantidad: Math.ceil(prodQty[id]) // Meta igual al mes pasado
      }));

      return this.calculateProjectionDetails(items);
    } catch (error) {
      console.error('Error en getHistoricalProjection:', error);
      return { success: false, error: 'Error al calcular histórico' };
    }
  },

  /**
   * Calcula ingresos, costos de materiales y lista de compras para un set de metas
   */
  calculateProjectionDetails: function(items) {
    try {
      const productosSheet = getSheet('Productos');
      const prodData = productosSheet.getDataRange().getValues();
      const insumosSheet = getSheet('Insumos');
      const insData = insumosSheet.getDataRange().getValues();
      
      let ingresoEst = 0;
      let costoMatEst = 0;
      const insumosRequeridos = {}; // { idInsumo: { nombre, unidad, cantidad, costo } }

      items.forEach(item => {
        // Buscar info del producto
        const prod = prodData.find(r => r[0] === item.idProducto);
        if (!prod) return;

        const precioVenta = prod[4] || 0;
        ingresoEst += precioVenta * item.cantidad;

        // Obtener BOM para explotar insumos
        const bomRes = BOMService.getBOM(item.idProducto);
        if (bomRes.success && bomRes.bom) {
          bomRes.bom.forEach(ing => {
            const idIns = ing.idInsumo;
            // Calcular cantidad total de este insumo para este producto (convertida a unidad base)
            const cantRecetaTotal = ing.cantidad * item.cantidad;
            const cantTotal = BOMService.convertUnit(cantRecetaTotal, ing.unidad, ing.unidadInsumo);
            
            if (!insumosRequeridos[idIns]) {
              insumosRequeridos[idIns] = {
                nombre: ing.nombreInsumo,
                unidad: ing.unidadInsumo, // Debería ser la unidad base del insumo
                cantidad: 0,
                costoUnitario: 0
              };
              // Buscar costo unitario del insumo en la hoja Insumos
              const insumoRow = insData.find(r => r[0] === idIns);
              if (insumoRow) {
                insumosRequeridos[idIns].costoUnitario = insumoRow[3] || 0;
              }
            }
            insumosRequeridos[idIns].cantidad += cantTotal;
          });
        }
      });

      // Calcular costo total de materiales
      for (const id in insumosRequeridos) {
        costoMatEst += insumosRequeridos[id].cantidad * insumosRequeridos[id].costoUnitario;
      }

      return {
        success: true,
        summary: {
          ingresoEst: ingresoEst,
          costoMatEst: costoMatEst,
          gananciaEst: ingresoEst - costoMatEst
        },
        shoppingList: Object.values(insumosRequeridos),
        items: items // Devolver los items para el UI manual
      };
    } catch (error) {
      console.error('Error en calculateProjectionDetails:', error);
      return { success: false, error: 'Error al calcular detalles' };
    }
  },

  /**
   * Obtener proyecciones (Se mantiene por compatibilidad si se usa en otro lado)
   */
  getProjections: function(periodo) {
    // ... logic ...
    return { success: true, projections: [] };
  }
  
};
