/**
 * AuthService.gs
 * Servicio de Autenticación y Gestión de Sesiones
 */

const AuthService = {
  
  /**
   * Iniciar sesión
   */
  login: function(email, password) {
    try {
      const sheet = getSheet('Usuarios');
      const data = sheet.getDataRange().getValues();
      
      // Buscar usuario (empezar desde fila 2 para saltar encabezados)
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const userEmail = row[0];
        const nombre = row[1];
        const passwordHash = row[2];
        const rol = row[3];
        const activo = row[4];
        
        if (userEmail === email) {
          // Verificar si está activo
          if (!activo) {
            return {
              success: false,
              error: 'Usuario desactivado'
            };
          }
          
          // Verificar contraseña
          if (passwordHash === hashPassword(password)) {
            // Crear token de sesión
            const token = generateId('token_');
            const sessionData = {
              token: token,
              email: email,
              nombre: nombre,
              rol: rol,
              timestamp: new Date().getTime()
            };
            
            // Guardar sesión en caché
            CacheService.getScriptCache().put(
              token,
              JSON.stringify(sessionData),
              CONFIG.SESSION_TIMEOUT / 1000 // en segundos
            );
            
            return {
              success: true,
              token: token,
              user: {
                email: email,
                nombre: nombre,
                rol: rol
              }
            };
          } else {
            return {
              success: false,
              error: 'Contraseña incorrecta'
            };
          }
        }
      }
      
      return {
        success: false,
        error: 'Usuario no encontrado'
      };
      
    } catch (error) {
      console.error('Error en login:', error);
      return {
        success: false,
        error: 'Error al iniciar sesión: ' + error.message
      };
    }
  },
  
  /**
   * Validar sesión activa
   */
  validateSession: function(token) {
    try {
      if (!token) {
        return {
          success: false,
          error: 'Token no proporcionado'
        };
      }
      
      const cache = CacheService.getScriptCache();
      const sessionData = cache.get(token);
      
      if (!sessionData) {
        return {
          success: false,
          error: 'Sesión expirada o inválida'
        };
      }
      
      const session = JSON.parse(sessionData);
      
      return {
        success: true,
        user: {
          email: session.email,
          nombre: session.nombre,
          rol: session.rol
        }
      };
      
    } catch (error) {
      console.error('Error en validateSession:', error);
      return {
        success: false,
        error: 'Error al validar sesión'
      };
    }
  },
  
  /**
   * Cerrar sesión
   */
  logout: function(token) {
    try {
      if (token) {
        CacheService.getScriptCache().remove(token);
      }
      
      return {
        success: true,
        message: 'Sesión cerrada correctamente'
      };
      
    } catch (error) {
      console.error('Error en logout:', error);
      return {
        success: false,
        error: 'Error al cerrar sesión'
      };
    }
  },
  
  /**
   * Obtener rol del usuario
   */
  getUserRole: function(token) {
    const session = this.validateSession(token);
    if (session.success) {
      return session.user.rol;
    }
    return null;
  },
  
  /**
   * Cambiar contraseña
   */
  changePassword: function(email, oldPassword, newPassword) {
    try {
      const sheet = getSheet('Usuarios');
      const data = sheet.getDataRange().getValues();
      
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === email) {
          // Verificar contraseña actual
          if (data[i][2] === hashPassword(oldPassword)) {
            // Actualizar contraseña
            sheet.getRange(i + 1, 3).setValue(hashPassword(newPassword));
            
            return {
              success: true,
              message: 'Contraseña actualizada correctamente'
            };
          } else {
            return {
              success: false,
              error: 'Contraseña actual incorrecta'
            };
          }
        }
      }
      
      return {
        success: false,
        error: 'Usuario no encontrado'
      };
      
    } catch (error) {
      console.error('Error en changePassword:', error);
      return {
        success: false,
        error: 'Error al cambiar contraseña'
      };
    }
  }
  
};
