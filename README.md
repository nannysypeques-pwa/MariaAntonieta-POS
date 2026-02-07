# Guía de Instalación y Despliegue - Pastelería POS & ERP

Este sistema consta de dos partes:
1. **Backend**: Scripts que se ejecutan en Google Sheets (Google Apps Script)
2. **Frontend**: Aplicación Web (PWA) que interactúa con el backend

## 1. Configuración del Backend (Google Sheets)

1. Abre tu Google Sheet de la pastelería.
2. Ve a **Extensiones > Apps Script**.
3. Copia el contenido de los archivos de la carpeta `backend/` de este proyecto a tu proyecto de Apps Script.
   - Crea un archivo para cada uno: `Code.gs`, `AuthService.gs`, `ProductService.gs`, etc.
   - **Importante**: Asegúrate de que los nombres de archivo sean exactos (sin la extensión .gs al crearlos en el editor online, ya que la pone automática).
4. Ejecuta la función `setupSheetId()` en `Code.gs` una vez para vincular el script con tu hoja de cálculo.
5. Ejecuta la función `createInitialAdmin()` en `Code.gs` para crear el primer usuario administrador.
   - Usuario: `admin@pasteleria.com`
   - Contraseña: `admin123`
6. **Despliegue**:
   - Haz clic en **Implementar > Nueva implementación**.
   - Tipo: **Aplicación web**.
   - Ejecutar como: **Yo (tu email)**.
   - Quién tiene acceso: **Cualquier persona** (necesario para que la PWA funcione sin problemas de permisos CORS complejos).
   - Copia la **URL de la aplicación web** generada.

## 2. Configuración del Frontend (PWA)

1. Abre el archivo `frontend/js/api.js`.
2. Busca la línea donde se podría configurar una URL de producción si quisieras hostear el frontend separado (GitHub Pages, Netlify), PERO:
   - **Opción Recomendada (Todo en Google)**:
     1. Crea un archivo `index.html` en el editor de Apps Script.
     2. Copia todo el contenido de `frontend/index.html` allí.
     3. Tendrás que incrustar el CSS y JS dentro del HTML (ya que Apps Script no sirve archivos estáticos fácilmente) O subir los archivos CSS/JS a un host estático.
   
   - **Opción para Desarrollo Local**:
     1. Simplemente abre `frontend/index.html` en tu navegador.
     2. El sistema detectará que no está en Google y usará **Datos de Prueba (Mock Data)** automáticamente.
     3. Podrás probar toda la interfaz y flujos de venta sin tocar tu hoja de cálculo real.

## Uso del Sistema

1. **Login**: Usa las credenciales de admin o cualquiera si estás en modo local (pass: 123).
2. **POS**: Busca productos, agrega al carrito y cobra.
3. **Impresión**: Al cobrar, se abrirá una ventana de impresión para el ticket.
4. **Inventario**: Gestiona insumos y ve alertas de stock bajo.
5. **Proyecciones**: Genera proyecciones de venta y ve sugerencias de compra.

## Notas Técnicas

- El sistema usa `localStorage` para mantener la sesión abierta.
- La impresión de tickets usa la API nativa del navegador, compatible con cualquier impresora instalada en el sistema.
