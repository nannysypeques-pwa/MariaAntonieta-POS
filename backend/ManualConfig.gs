/**
 * Función MANUAL para configurar el ID
 * 1. Copia el ID de tu URL de Google Sheets
 *    URL: https://docs.google.com/spreadsheets/d/123456789/edit
 *    ID: 123456789
 * 2. Pégalo abajo donde dice "PEGA_TU_ID_AQUI"
 * 3. Ejecuta esta función "setManualId" una sola vez
 */
function setManualId() {
  const MI_ID = "PEGA_TU_ID_AQUI"; // <--- Pega tu ID aquí entre las comillas
  
  if (MI_ID === "PEGA_TU_ID_AQUI") {
    console.error("❌ Error: No has pegado tu ID todavía.");
    return;
  }
  
  PropertiesService.getScriptProperties().setProperty('SHEET_ID', MI_ID);
  console.log("✅ ÉXITO: ID configurado correctamente a: " + MI_ID);
}
