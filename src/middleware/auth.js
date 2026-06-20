// ============================================
// Middleware de Autenticación y Autorización
// ============================================

import jwt from 'jsonwebtoken';
import pool, { getOne } from '../config/database.js';

/**
 * Middleware: Verificar JWT y cargar usuario
 */
export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Token no proporcionado. Por favor autentícate.',
      code: 'NO_TOKEN'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Cargar usuario de la BD para obtener permisos actuales
    const usuario = await getOne(
      `SELECT u.id_usuario, u.nombre, u.email, u.id_rol, r.nombre as rol_nombre, r.nivel_acceso
       FROM dw.usuarios u
       JOIN dw.roles r ON u.id_rol = r.id_rol
       WHERE u.id_usuario = $1 AND u.estado = TRUE`,
      [decoded.id_usuario]
    );

    if (!usuario) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no encontrado o inactivo',
        code: 'USER_NOT_FOUND'
      });
    }

    // Cargar permisos del usuario
    const permisosRes = await getOne(
      `SELECT ARRAY_AGG(p.nombre) as permisos
       FROM dw.roles_permisos rp
       JOIN dw.permisos p ON rp.id_permiso = p.id_permiso
       WHERE rp.id_rol = $1`,
      [usuario.id_rol]
    );

    // Adjuntar usuario al request
    req.usuario = {
      ...usuario,
      permisos: permisosRes?.permisos || []
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expirado. Por favor vuelve a autenticarte.',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    return res.status(403).json({
      success: false,
      message: 'Token inválido',
      code: 'INVALID_TOKEN'
    });
  }
};

/**
 * Middleware: Verificar rol específico
 */
export const requireRole = (rolesPermitidos) => {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({
        success: false,
        message: 'No autenticado',
        code: 'NOT_AUTHENTICATED'
      });
    }

    if (!rolesPermitidos.includes(req.usuario.rol_nombre)) {
      return res.status(403).json({
        success: false,
        message: `Acceso denegado. Se requiere uno de estos roles: ${rolesPermitidos.join(', ')}`,
        code: 'INSUFFICIENT_ROLE'
      });
    }

    next();
  };
};

/**
 * Middleware: Verificar permiso específico
 */
export const requirePermission = (permisosRequeridos) => {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({
        success: false,
        message: 'No autenticado',
        code: 'NOT_AUTHENTICATED'
      });
    }

    const tienePermiso = permisosRequeridos.some(p => req.usuario.permisos.includes(p));

    if (!tienePermiso) {
      return res.status(403).json({
        success: false,
        message: `Permiso insuficiente. Se requiere: ${permisosRequeridos.join(' o ')}`,
        code: 'INSUFFICIENT_PERMISSION'
      });
    }

    next();
  };
};

/**
 * Middleware: Verificar nivel de acceso (numérico)
 */
export const requireLevel = (nivelMinimo) => {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({
        success: false,
        message: 'No autenticado',
        code: 'NOT_AUTHENTICATED'
      });
    }

    if (req.usuario.nivel_acceso < nivelMinimo) {
      return res.status(403).json({
        success: false,
        message: `Nivel de acceso insuficiente. Se requiere nivel ${nivelMinimo}`,
        code: 'INSUFFICIENT_LEVEL'
      });
    }

    next();
  };
};

/**
 * Middleware: Logging de auditoría
 */
export const auditLog = (tipoEvento) => {
  return async (req, res, next) => {
    // Capturar la respuesta original
    const originalJson = res.json;
    let responseStatus = res.statusCode;
    let responseData = null;

    res.json = function(data) {
      responseStatus = res.statusCode;
      responseData = data;
      return originalJson.call(this, data);
    };

    next();

    // Log asíncrono (no bloquea la respuesta)
    setImmediate(async () => {
      try {
        const idUsuario = req.usuario?.id_usuario || null;
        const estado = responseStatus === 200 ? 'exitoso' : 'fallido';

        await pool.query(
          `INSERT INTO dw.audit_logs 
           (id_usuario, tipo_evento, modulo, accion, ip_address, user_agent, detalles, estado)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            idUsuario,
            tipoEvento,
            req.baseUrl.split('/')[2] || 'system',
            req.method,
            req.ip,
            req.get('user-agent'),
            JSON.stringify({
              body: req.body,
              query: req.query,
              statusCode: responseStatus
            }),
            estado
          ]
        );
      } catch (error) {
        console.error('[AUDIT] Error al registrar evento:', error);
      }
    });
  };
};

export default {
  authenticateToken,
  requireRole,
  requirePermission,
  requireLevel,
  auditLog
};
