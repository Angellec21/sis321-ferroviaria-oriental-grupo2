// ============================================
// Rutas: Gestión de Usuarios (Administración)
// ============================================

import express from 'express';
import { requireRole, requirePermission } from '../middleware/auth.js';
import { reglasCrearUsuario } from '../middleware/validators.js';
import Usuario from '../models/Usuario.js';

const router = express.Router();

/**
 * GET /api/usuarios
 * @description Listar usuarios (paginado)
 * @auth required (admin, gerente)
 * @query page, limit, id_rol, id_estacion, buscar
 * @returns { success, data, pagination }
 */
router.get('/', requirePermission(['usuarios:leer']), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const filtros = {
      id_rol: req.query.id_rol ? parseInt(req.query.id_rol) : null,
      id_estacion: req.query.id_estacion ? parseInt(req.query.id_estacion) : null,
      buscar: req.query.buscar || null
    };

    const resultado = await Usuario.listar(page, limit, filtros);

    res.json({
      success: true,
      data: resultado.data,
      pagination: resultado.pagination
    });
  } catch (error) {
    console.error('[USUARIOS LIST] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al listar usuarios',
      code: 'LIST_ERROR'
    });
  }
});

/**
 * POST /api/usuarios
 * @description Crear usuario con rol específico (admin)
 * @auth required (admin)
 * @body { nombre, email, documento_identidad, password, id_rol, id_estacion? }
 * @returns { success, data }
 */
router.post('/', requireRole(['administrador']), reglasCrearUsuario, async (req, res) => {
  try {
    const { nombre, email, documento_identidad, password, id_rol, id_estacion = null } = req.body;
    // Formato y presencia de campos ya validados por express-validator (reglasCrearUsuario)

    const usuario = await Usuario.crear({ nombre, email, documento_identidad, password, id_rol, id_estacion });

    res.status(201).json({ success: true, message: 'Usuario creado exitosamente', data: usuario });
  } catch (error) {
    console.error('[USUARIOS CREAR] Error:', error);

    if (error.message.includes('ya está registrado')) {
      return res.status(400).json({ success: false, message: error.message, code: 'EMAIL_EXISTS' });
    }

    res.status(500).json({ success: false, message: 'Error al crear usuario', code: 'CREATE_ERROR' });
  }
});

/**
 * GET /api/usuarios/:id
 * @description Obtener usuario por ID
 * @auth required (admin, gerente)
 * @param id - ID del usuario
 * @returns { success, data }
 */
router.get('/:id', requirePermission(['usuarios:leer']), async (req, res) => {
  try {
    const usuario = await Usuario.porId(parseInt(req.params.id));

    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: usuario
    });
  } catch (error) {
    console.error('[USUARIOS GET] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener usuario',
      code: 'GET_ERROR'
    });
  }
});

/**
 * PUT /api/usuarios/:id
 * @description Actualizar usuario
 * @auth required (admin, gerente con permisos propios)
 * @param id - ID del usuario
 * @body { nombre?, documento_identidad?, id_rol?, id_estacion?, estado? }
 * @returns { success, data }
 */
router.put('/:id', requirePermission(['usuarios:editar']), async (req, res) => {
  try {
    const idUsuario = parseInt(req.params.id);

    // Verificar que no sea otro usuario (a menos que sea admin)
    if (idUsuario !== req.usuario.id_usuario && req.usuario.rol_nombre !== 'administrador') {
      return res.status(403).json({
        success: false,
        message: 'No puedes editar otro usuario',
        code: 'FORBIDDEN'
      });
    }

    const usuarioActualizado = await Usuario.actualizar(idUsuario, req.body);
    delete usuarioActualizado.password_hash;

    res.json({
      success: true,
      message: 'Usuario actualizado exitosamente',
      data: usuarioActualizado
    });
  } catch (error) {
    console.error('[USUARIOS UPDATE] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar usuario',
      code: 'UPDATE_ERROR'
    });
  }
});

/**
 * POST /api/usuarios/:id/resetear-password
 * @description Resetear contraseña de usuario (admin only)
 * @auth required (admin)
 * @param id - ID del usuario
 * @body { nueva_password }
 * @returns { success, message }
 */
router.post('/:id/resetear-password',
  requireRole(['administrador']),
  async (req, res) => {
    try {
      const idUsuario = parseInt(req.params.id);
      const { nueva_password } = req.body;

      if (!nueva_password) {
        return res.status(400).json({
          success: false,
          message: 'Nueva contraseña requerida',
          code: 'MISSING_PASSWORD'
        });
      }

      await Usuario.resetearPassword(idUsuario, nueva_password);

      res.json({
        success: true,
        message: 'Contraseña reseteada. Usuario debe cambiarla en siguiente login.'
      });
    } catch (error) {
      console.error('[USUARIOS RESETEAR] Error:', error);
      res.status(500).json({
        success: false,
        message: 'Error al resetear contraseña',
        code: 'RESET_ERROR'
      });
    }
  }
);

/**
 * POST /api/usuarios/cambiar-password
 * @description Cambiar contraseña del usuario autenticado
 * @auth required
 * @body { password_actual, password_nueva }
 * @returns { success, message }
 */
router.post('/cambiar-password', async (req, res) => {
  try {
    const { password_actual, password_nueva } = req.body;
    const idUsuario = req.usuario.id_usuario;

    if (!password_actual || !password_nueva) {
      return res.status(400).json({
        success: false,
        message: 'Contraseña actual y nueva requeridas',
        code: 'MISSING_FIELDS'
      });
    }

    if (password_nueva.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'La nueva contraseña debe tener al menos 6 caracteres',
        code: 'WEAK_PASSWORD'
      });
    }

    await Usuario.cambiarPassword(idUsuario, password_actual, password_nueva);

    res.json({
      success: true,
      message: 'Contraseña actualizada exitosamente'
    });
  } catch (error) {
    console.error('[CAMBIAR PASSWORD] Error:', error);

    if (error.message.includes('incorrecta')) {
      return res.status(401).json({
        success: false,
        message: error.message,
        code: 'INVALID_PASSWORD'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error al cambiar contraseña',
      code: 'CHANGE_PASSWORD_ERROR'
    });
  }
});

/**
 * DELETE /api/usuarios/:id
 * @description Eliminar usuario (soft delete)
 * @auth required (admin)
 * @param id - ID del usuario
 * @returns { success, message }
 */
router.delete('/:id', requireRole(['administrador']), async (req, res) => {
  try {
    const idUsuario = parseInt(req.params.id);

    // No permitir eliminar el propio usuario
    if (idUsuario === req.usuario.id_usuario) {
      return res.status(400).json({
        success: false,
        message: 'No puedes eliminar tu propio usuario',
        code: 'CANNOT_DELETE_SELF'
      });
    }

    await Usuario.eliminar(idUsuario);

    res.json({
      success: true,
      message: 'Usuario eliminado exitosamente'
    });
  } catch (error) {
    console.error('[USUARIOS DELETE] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar usuario',
      code: 'DELETE_ERROR'
    });
  }
});

export default router;
