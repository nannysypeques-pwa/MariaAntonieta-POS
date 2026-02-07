/**
 * PurchaseService.gs
 * Servicio de Cálculo de Compras
 */

const PurchaseService = {
  
  /**
   * Calcular compras necesarias basadas en proyección
   */
  calculatePurchases: function(proyeccionId) {
    try {
      // 1. Obtener la proyección
      const projectionSheet = getSheet('Proyecciones Ventas');
      const projectionData = projectionSheet.getDataRange().getValues();
      const projectionItems = [];
      
      for (let i = 1; i < projectionData.length; i++) {
        if (projectionData[i][0] === proyeccionId) {
          projectionItems.push({
            idProducto: projectionData[i][5],
            cantidad: projectionData[i][6]
          });
        }
      }
      
      if (projectionItems.length === 0) {
        return {
          success: false,
          error: 'Proyección no encontrada o sin items'
        };
      }
      
      // 2. Calcular insumos totales necesarios
      const insumosNecesarios = {};
      
      for (const item of projectionItems) {
        const bomResult = BOMService.getBOM(item.idProducto);
        
        if (bomResult.success) {
          bomResult.bom.forEach(bomItem => {
            if (!insumosNecesarios[bomItem.idInsumo]) {
              insumosNecesarios[bomItem.idInsumo] = 0;
            }
            insumosNecesarios[bomItem.idInsumo] += bomItem.cantidad * item.cantidad;
          });
        }
      }
      
      // 3. Comparar con stock actual y generar lista de compras
      const insumosResult = InventoryService.getInsumos();
      
      if (!insumosResult.success) {
        return insumosResult;
      }
      
      const listaCompras = [];
      const insumosMap = new Map(insumosResult.insumos.map(i => [i.id, i]));
      
      for (const idInsumo in insumosNecesarios) {
        const insumo = insumosMap.get(idInsumo);
        const cantidadNecesaria = insumosNecesarios[idInsumo];
        const stockActual = insumo.stockActual;
        
        // Si necesitamos más de lo que tenemos
        if (cantidadNecesaria > stockActual) {
          const cantidadAComprar = cantidadNecesaria - stockActual;
          
          listaCompras.push({
            idInsumo: idInsumo,
            nombre: insumo.nombre,
            unidad: insumo.unidadMedida,
            stockActual: stockActual,
            cantidadNecesaria: cantidadNecesaria,
            cantidadAComprar: cantidadAComprar,
            costoUnitario: insumo.costoUnitario,
            costoEstimado: cantidadAComprar * insumo.costoUnitario,
            proveedor: insumo.proveedor
          });
        }
      }
      
      // 4. Guardar sugerencias de compra (opcional, por ahora solo devolvemos)
      return {
        success: true,
        proyeccionId: proyeccionId,
        listaCompras: listaCompras,
        totalEstimado: listaCompras.reduce((sum, item) => sum + item.costoEstimado, 0)
      };
      
    } catch (error) {
      console.error('Error en calculatePurchases:', error);
      return {
        success: false,
        error: 'Error al calcular compras necesarias'
      };
    }
  },
  
  /**
   * Obtener sugerencias de compra basadas en stock mínimo
   */
  getPurchaseSuggestions: function() {
    try {
      const alertsResult = InventoryService.getStockAlerts();
      
      if (!alertsResult.success) {
        return alertsResult;
      }
      
      const suggestions = alertsResult.alerts.map(alert => {
        // Sugerir comprar hasta llegar al doble del stock mínimo (política de ejemplo)
        const cantidadAComprar = (alert.stockMinimo * 2) - alert.stockActual;
        
        return {
          idInsumo: alert.id,
          nombre: alert.nombre,
          stockActual: alert.stockActual,
          stockMinimo: alert.stockMinimo,
          cantidadAComprar: cantidadAComprar,
          prioridad: alert.nivel // 'critico' o 'bajo'
        };
      });
      
      return {
        success: true,
        suggestions: suggestions
      };
      
    } catch (error) {
      console.error('Error en getPurchaseSuggestions:', error);
      return {
        success: false,
        error: 'Error al obtener sugerencias de compra'
      };
    }
  }
  
};
