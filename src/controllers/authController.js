// ============================================
// Controlador: Autenticación (Login, Registro, JWT)
// ============================================

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import Usuario from '../models/Usuario.js';
import { loginsTotal } from '../config/metrics.js';
import { query } from '../config/database.js';

/**
 * POST /api/auth/registro
 * Registrar nuevo usuario
 */
export const registro = async (req, res) => {
  try {
    const { nombre, email, documento_identidad, password, id_estacion = null } = req.body;
    // Formato y presencia de campos ya validados por express-validator (reglasRegistro)

    // Crear usuario (rol por defecto: operador)
    const nuevoUsuario = await Usuario.crear({
      nombre,
      email,
      documento_identidad,
      password,
      id_estacion,
      id_rol: 3 // Operador
    });

    // Generar token
    const token = jwt.sign(
      {
        id_usuario: nuevoUsuario.id_usuario,
        email: nuevoUsuario.email
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRATION || '24h' }
    );

    // Log de auditoría
    await query(
      `INSERT INTO dw.audit_logs (tipo_evento, modulo, accion, ip_address, estado, detalles)
       VALUES ('registro_usuario', 'usuarios', 'crear', $1, 'exitoso', $2)`,
      [req.ip, JSON.stringify({ email })]
    );

    res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente',
      data: {
        id_usuario: nuevoUsuario.id_usuario,
        nombre: nuevoUsuario.nombre,
        email: nuevoUsuario.email,
        rol: 'operador'
      },
      token
    });
  } catch (error) {
    console.error('[AUTH REGISTRO] Error:', error);
    
    if (error.message.includes('ya está registrado')) {
      return res.status(400).json({
        success: false,
        message: error.message,
        code: 'EMAIL_EXISTS'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error al registrar usuario',
      code: 'REGISTER_ERROR'
    });
  }
};

/**
 * POST /api/auth/login
 * Autenticación y generación de JWT
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    // Formato y presencia de campos ya validados por express-validator (reglasLogin)

    // Buscar usuario
    const usuario = await Usuario.porEmail(email);

    if (!usuario) {
      // Log de intento fallido
      await query(
        `INSERT INTO dw.audit_logs (tipo_evento, modulo, accion, ip_address, estado, detalles)
         VALUES ('login_fallido', 'autenticacion', 'leer', $1, 'fallido', $2)`,
        [req.ip, JSON.stringify({ email, razon: 'usuario_no_existe' })]
      );

      loginsTotal.labels('fallido').inc();
      return res.status(401).json({
        success: false,
        message: 'Email o contraseña incorrectos',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Verificar si usuario está activo
    if (!usuario.estado) {
      return res.status(401).json({
        success: false,
        message: 'Usuario inactivo. Contacta con administración.',
        code: 'USER_INACTIVE'
      });
    }

    // Verificar bloqueo
    const estaBloqueado = await Usuario.estaBloqueado(usuario.id_usuario);
    if (estaBloqueado) {
      return res.status(429).json({
        success: false,
        message: 'Demasiados intentos fallidos. Intenta más tarde.',
        code: 'TOO_MANY_ATTEMPTS'
      });
    }

    // Validar contraseña
    const passwordValida = await Usuario.validarPassword(password, usuario.password_hash);

    if (!passwordValida) {
      const intentos = await Usuario.incrementarIntentosFallidos(usuario.id_usuario);

      // Log de intento fallido
      await query(
        `INSERT INTO dw.audit_logs (id_usuario, tipo_evento, modulo, accion, ip_address, estado, detalles)
         VALUES ($1, 'login_fallido', 'autenticacion', 'leer', $2, 'fallido', $3)`,
        [usuario.id_usuario, req.ip, JSON.stringify({ intentos })]
      );

      loginsTotal.labels('fallido').inc();
      return res.status(401).json({
        success: false,
        message: 'Email o contraseña incorrectos',
        code: 'INVALID_CREDENTIALS',
        intentos_restantes: 5 - intentos
      });
    }

    // Actualizar último login
    await Usuario.actualizarUltimoLogin(usuario.id_usuario);

    // Obtener permisos
    const permisos = await Usuario.obtenerPermisos(usuario.id_rol);

    // Generar tokens
    const accessToken = jwt.sign(
      {
        id_usuario: usuario.id_usuario,
        email: usuario.email,
        rol: usuario.rol_nombre,
        nivel_acceso: usuario.nivel_acceso
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRATION || '24h' }
    );

    const refreshToken = jwt.sign(
      {
        id_usuario: usuario.id_usuario,
        email: usuario.email,
        jti: crypto.randomUUID() // garantiza unicidad aunque dos logins ocurran en el mismo segundo
      },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: process.env.REFRESH_TOKEN_EXPIRATION || '7d' }
    );

    // Guardar refresh token en BD
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 días

    await query(
      `INSERT INTO dw.refresh_tokens (id_usuario, token, expires_at)
       VALUES ($1, $2, $3)`,
      [usuario.id_usuario, refreshToken, expiresAt]
    );

    // Log de login exitoso
    await query(
      `INSERT INTO dw.audit_logs (id_usuario, tipo_evento, modulo, accion, ip_address, estado)
       VALUES ($1, 'login_exitoso', 'autenticacion', 'leer', $2, 'exitoso')`,
      [usuario.id_usuario, req.ip]
    );

    loginsTotal.labels('exitoso').inc();
    res.status(200).json({
      success: true,
      message: 'Login exitoso',
      data: {
        id_usuario: usuario.id_usuario,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol_nombre,
        nivel_acceso: usuario.nivel_acceso,
        permisos
      },
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: '24h'
      }
    });
  } catch (error) {
    console.error('[AUTH LOGIN] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error durante la autenticación',
      code: 'LOGIN_ERROR'
    });
  }
};

/**
 * POST /api/auth/refresh
 * Renovar access token usando refresh token
 */
export const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token requerido',
        code: 'NO_REFRESH_TOKEN'
      });
    }

    // Verificar refresh token
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

    // Validar en BD
    const tokenEnBD = await query(
      `SELECT id_usuario FROM dw.refresh_tokens 
       WHERE token = $1 AND revoked = FALSE AND expires_at > NOW()`,
      [refreshToken]
    );

    if (tokenEnBD.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token inválido o expirado',
        code: 'INVALID_REFRESH_TOKEN'
      });
    }

    // Generar nuevo access token
    const usuario = await Usuario.porId(decoded.id_usuario);

    const nuevoAccessToken = jwt.sign(
      {
        id_usuario: usuario.id_usuario,
        email: usuario.email,
        rol: usuario.rol_nombre,
        nivel_acceso: usuario.nivel_acceso
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRATION || '24h' }
    );

    res.json({
      success: true,
      message: 'Token renovado',
      tokens: {
        accessToken: nuevoAccessToken,
        expiresIn: '24h'
      }
    });
  } catch (error) {
    console.error('[AUTH REFRESH] Error:', error);
    res.status(401).json({
      success: false,
      message: 'Error al renovar token',
      code: 'REFRESH_ERROR'
    });
  }
};

/**
 * POST /api/auth/logout
 * Cerrar sesión (revocar refresh token)
 */
export const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const idUsuario = req.usuario?.id_usuario;

    if (refreshToken) {
      // Revocar refresh token
      await query(
        'UPDATE dw.refresh_tokens SET revoked = TRUE WHERE token = $1',
        [refreshToken]
      );
    }

    // Log de logout
    if (idUsuario) {
      await query(
        `INSERT INTO dw.audit_logs (id_usuario, tipo_evento, modulo, accion, ip_address, estado)
         VALUES ($1, 'logout', 'autenticacion', 'leer', $2, 'exitoso')`,
        [idUsuario, req.ip]
      );
    }

    res.json({
      success: true,
      message: 'Sesión cerrada exitosamente'
    });
  } catch (error) {
    console.error('[AUTH LOGOUT] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cerrar sesión',
      code: 'LOGOUT_ERROR'
    });
  }
};

/**
 * POST /api/auth/olvide-password
 * Solicitar recuperación de contraseña. Siempre responde igual
 * (no revela si el email existe) para evitar enumeración de usuarios.
 * En desarrollo, devuelve el link directamente (no hay SMTP configurado).
 */
export const olvidePassword = async (req, res) => {
  try {
    const { email } = req.body;
    const token = await Usuario.generarTokenRecuperacion(email);

    if (token) {
      await query(
        `INSERT INTO dw.audit_logs (tipo_evento, modulo, accion, ip_address, estado, detalles)
         VALUES ('solicitud_reset_password', 'autenticacion', 'crear', $1, 'exitoso', $2)`,
        [req.ip, JSON.stringify({ email })]
      );
    }

    const respuesta = {
      success: true,
      message: 'Si el email existe en el sistema, se enviaron instrucciones para restablecer la contraseña.'
    };

    // En producción esto se enviaría por correo (SMTP), nunca en la respuesta HTTP.
    if (token && process.env.NODE_ENV !== 'production') {
      respuesta.dev_reset_link = `${process.env.API_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
      respuesta.dev_token = token;
    }

    res.json(respuesta);
  } catch (error) {
    console.error('[AUTH OLVIDE PASSWORD] Error:', error);
    res.status(500).json({ success: false, message: 'Error al procesar la solicitud', code: 'FORGOT_PASSWORD_ERROR' });
  }
};

/**
 * POST /api/auth/resetear-password
 * Completa la recuperación de contraseña usando el token recibido por email.
 */
export const resetearPasswordConToken = async (req, res) => {
  try {
    const { token, password_nueva } = req.body;

    if (!token || !password_nueva) {
      return res.status(400).json({
        success: false,
        message: 'Token y nueva contraseña son requeridos',
        code: 'MISSING_FIELDS'
      });
    }

    const resultado = await Usuario.resetearPasswordConToken(token, password_nueva);
    res.json(resultado);
  } catch (error) {
    console.error('[AUTH RESET TOKEN] Error:', error);

    if (error.message.includes('inválido') || error.message.includes('expirado')) {
      return res.status(400).json({ success: false, message: error.message, code: 'INVALID_TOKEN' });
    }

    res.status(500).json({ success: false, message: 'Error al restablecer la contraseña', code: 'RESET_ERROR' });
  }
};

/**
 * GET /api/auth/me
 * Obtener datos del usuario autenticado
 */
export const me = async (req, res) => {
  try {
    const usuario = req.usuario;

    res.json({
      success: true,
      data: {
        id_usuario: usuario.id_usuario,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol_nombre,
        nivel_acceso: usuario.nivel_acceso,
        permisos: usuario.permisos
      }
    });
  } catch (error) {
    console.error('[AUTH ME] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener datos del usuario',
      code: 'GET_USER_ERROR'
    });
  }
};

export default {
  registro,
  login,
  refresh,
  logout,
  me,
  olvidePassword,
  resetearPasswordConToken
};
