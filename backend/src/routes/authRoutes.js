// ============================================
// Rutas: Autenticación
// ============================================

import express from 'express';
import * as authController from '../controllers/authController.js';
import { authenticateToken } from '../middleware/auth.js';
import { reglasRegistro, reglasLogin, reglasOlvidePassword, reglasResetearConToken } from '../middleware/validators.js';

const router = express.Router();

/**
 * POST /api/auth/registro
 * @description Registrar nuevo usuario
 * @body { nombre, email, documento_identidad, password, id_estacion? }
 * @returns { success, data, token }
 */
router.post('/registro', reglasRegistro, authController.registro);

/**
 * POST /api/auth/login
 * @description Autenticación y generación de JWT
 * @body { email, password }
 * @returns { success, data, tokens }
 */
router.post('/login', reglasLogin, authController.login);

/**
 * POST /api/auth/olvide-password
 * @description Solicitar recuperación de contraseña (no revela si el email existe)
 * @body { email }
 * @returns { success, message }
 */
router.post('/olvide-password', reglasOlvidePassword, authController.olvidePassword);

/**
 * POST /api/auth/resetear-password
 * @description Completar la recuperación de contraseña con el token recibido
 * @body { token, password_nueva }
 * @returns { success, message }
 */
router.post('/resetear-password', reglasResetearConToken, authController.resetearPasswordConToken);

/**
 * POST /api/auth/refresh
 * @description Renovar access token
 * @body { refreshToken }
 * @returns { success, tokens }
 */
router.post('/refresh', authController.refresh);

/**
 * POST /api/auth/logout
 * @description Cerrar sesión
 * @auth required
 * @body { refreshToken? }
 * @returns { success }
 */
router.post('/logout', authenticateToken, authController.logout);

/**
 * GET /api/auth/me
 * @description Obtener datos del usuario autenticado
 * @auth required
 * @returns { success, data }
 */
router.get('/me', authenticateToken, authController.me);

export default router;
