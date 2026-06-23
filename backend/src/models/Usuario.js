// ============================================
// Modelo: Usuario (Autenticación)
// ============================================

import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { query, getOne, insert, update } from '../config/database.js';

class Usuario {
  /**
   * Crear nuevo usuario (Registro)
   */
  static async crear(datos) {
    const { nombre, email, documento_identidad, password, id_rol = 3, id_estacion = null } = datos;

    // Validar que el email no exista
    const emailExiste = await getOne(
      'SELECT id_usuario FROM dw.usuarios WHERE email = $1',
      [email]
    );

    if (emailExiste) {
      throw new Error('El email ya está registrado');
    }

    // Hash de contraseña
    const passwordHash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS || 10));

    // Insertar usuario
    const usuario = await insert('dw.usuarios', {
      nombre,
      email,
      documento_identidad,
      password_hash: passwordHash,
      id_rol,
      id_estacion,
      estado: true
    });

    // Retornar sin la contraseña
    delete usuario.password_hash;
    return usuario;
  }

  /**
   * Buscar usuario por email (para login)
   */
  static async porEmail(email) {
    return getOne(
      `SELECT u.id_usuario, u.nombre, u.email, u.documento_identidad, 
              u.password_hash, u.id_rol, u.id_estacion, u.estado, u.ultimo_login,
              u.bloqueado_hasta, u.intentos_fallidos,
              r.nombre as rol_nombre, r.nivel_acceso
       FROM dw.usuarios u
       JOIN dw.roles r ON u.id_rol = r.id_rol
       WHERE u.email = $1`,
      [email]
    );
  }

  /**
   * Buscar usuario por ID
   */
  static async porId(idUsuario) {
    return getOne(
      `SELECT u.id_usuario, u.nombre, u.email, u.documento_identidad,
              u.id_rol, u.id_estacion, u.estado, u.ultimo_login,
              r.nombre as rol_nombre, r.nivel_acceso
       FROM dw.usuarios u
       JOIN dw.roles r ON u.id_rol = r.id_rol
       WHERE u.id_usuario = $1`,
      [idUsuario]
    );
  }

  /**
   * Validar contraseña (bcrypt)
   */
  static async validarPassword(passwordIngresada, passwordHash) {
    return bcrypt.compare(passwordIngresada, passwordHash);
  }

  /**
   * Actualizar último login
   */
  static async actualizarUltimoLogin(idUsuario) {
    await query(
      'UPDATE dw.usuarios SET ultimo_login = NOW(), intentos_fallidos = 0 WHERE id_usuario = $1',
      [idUsuario]
    );
  }

  /**
   * Incrementar intentos fallidos
   */
  static async incrementarIntentosFallidos(idUsuario) {
    const usuario = await this.porId(idUsuario);
    const intentos = (usuario?.intentos_fallidos || 0) + 1;

    // Bloquear después de 5 intentos por 15 minutos
    let bloqueadoHasta = null;
    if (intentos >= 5) {
      const ahora = new Date();
      bloqueadoHasta = new Date(ahora.getTime() + 15 * 60000); // 15 minutos
    }

    await query(
      `UPDATE dw.usuarios 
       SET intentos_fallidos = $1, bloqueado_hasta = $2 
       WHERE id_usuario = $3`,
      [intentos, bloqueadoHasta, idUsuario]
    );

    return intentos;
  }

  /**
   * Verificar si usuario está bloqueado
   */
  static async estaBloqueado(idUsuario) {
    const usuario = await this.porId(idUsuario);
    
    if (!usuario || !usuario.bloqueado_hasta) {
      return false;
    }

    const ahora = new Date();
    if (usuario.bloqueado_hasta > ahora) {
      return true; // Aún bloqueado
    }

    // Desbloquear si ya pasó el tiempo
    await query(
      'UPDATE dw.usuarios SET bloqueado_hasta = NULL, intentos_fallidos = 0 WHERE id_usuario = $1',
      [idUsuario]
    );

    return false;
  }

  /**
   * Obtener permisos de usuario
   */
  static async obtenerPermisos(idRol) {
    const result = await query(
      `SELECT p.id_permiso, p.nombre, p.modulo, p.accion
       FROM dw.roles_permisos rp
       JOIN dw.permisos p ON rp.id_permiso = p.id_permiso
       WHERE rp.id_rol = $1
       ORDER BY p.modulo, p.accion`,
      [idRol]
    );

    return result.rows.map(p => p.nombre);
  }

  /**
   * Cambiar contraseña
   */
  static async cambiarPassword(idUsuario, passwordAntigua, passwordNueva) {
    const usuario = await this.porId(idUsuario);

    if (!usuario) {
      throw new Error('Usuario no encontrado');
    }

    // Obtener hash actual
    const usuarioConHash = await getOne(
      'SELECT password_hash FROM dw.usuarios WHERE id_usuario = $1',
      [idUsuario]
    );

    // Validar contraseña antigua
    const esValida = await this.validarPassword(passwordAntigua, usuarioConHash.password_hash);
    if (!esValida) {
      throw new Error('Contraseña actual incorrecta');
    }

    // Hash de nueva contraseña
    const nuevoHash = await bcrypt.hash(passwordNueva, parseInt(process.env.BCRYPT_ROUNDS || 10));

    // Actualizar
    await query(
      'UPDATE dw.usuarios SET password_hash = $1, updated_at = NOW() WHERE id_usuario = $2',
      [nuevoHash, idUsuario]
    );

    return { success: true, message: 'Contraseña actualizada correctamente' };
  }

  /**
   * Generar token de recuperación de contraseña ("olvidé mi contraseña")
   * Válido por 1 hora. No revela si el email existe (mismo mensaje siempre).
   */
  static async generarTokenRecuperacion(email) {
    const usuario = await getOne('SELECT id_usuario FROM dw.usuarios WHERE email = $1 AND estado = TRUE', [email]);
    if (!usuario) return null;

    const token = crypto.randomBytes(32).toString('hex');
    const expira = new Date(Date.now() + 60 * 60000); // 1 hora

    await query(
      'UPDATE dw.usuarios SET reset_token = $1, reset_token_expira = $2 WHERE id_usuario = $3',
      [token, expira, usuario.id_usuario]
    );

    return token;
  }

  /**
   * Cambiar contraseña usando el token de recuperación
   */
  static async resetearPasswordConToken(token, passwordNueva) {
    const usuario = await getOne(
      'SELECT id_usuario FROM dw.usuarios WHERE reset_token = $1 AND reset_token_expira > NOW()',
      [token]
    );

    if (!usuario) {
      throw new Error('Token inválido o expirado');
    }

    const nuevoHash = await bcrypt.hash(passwordNueva, parseInt(process.env.BCRYPT_ROUNDS || 10));

    await query(
      `UPDATE dw.usuarios
       SET password_hash = $1, reset_token = NULL, reset_token_expira = NULL, updated_at = NOW()
       WHERE id_usuario = $2`,
      [nuevoHash, usuario.id_usuario]
    );

    return { success: true, message: 'Contraseña restablecida correctamente' };
  }

  /**
   * Resetear contraseña (por admin)
   */
  static async resetearPassword(idUsuario, nuevaPassword) {
    const nuevoHash = await bcrypt.hash(nuevaPassword, parseInt(process.env.BCRYPT_ROUNDS || 10));

    await query(
      'UPDATE dw.usuarios SET password_hash = $1, updated_at = NOW() WHERE id_usuario = $2',
      [nuevoHash, idUsuario]
    );

    return { success: true, message: 'Contraseña reseteada' };
  }

  /**
   * Listar todos los usuarios (con paginación)
   */
  static async listar(page = 1, limit = 10, filtros = {}) {
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    // Filtro por rol
    if (filtros.id_rol) {
      whereClause += ` AND u.id_rol = $${paramIndex++}`;
      params.push(filtros.id_rol);
    }

    // Filtro por estación
    if (filtros.id_estacion) {
      whereClause += ` AND u.id_estacion = $${paramIndex++}`;
      params.push(filtros.id_estacion);
    }

    // Búsqueda por nombre o email
    if (filtros.buscar) {
      whereClause += ` AND (u.nombre ILIKE $${paramIndex++} OR u.email ILIKE $${paramIndex++})`;
      const termino = `%${filtros.buscar}%`;
      params.push(termino, termino);
    }

    const offset = (page - 1) * limit;

    // Contar total
    const countResult = await query(
      `SELECT COUNT(*) as total FROM dw.usuarios u ${whereClause}`,
      params
    );

    // Obtener registros
    const offset_param = paramIndex;
    const limit_param = paramIndex + 1;
    params.push(offset, limit);

    const usuarios = await query(
      `SELECT u.id_usuario, u.nombre, u.email, u.id_rol, r.nombre as rol_nombre,
              u.id_estacion, e.nombre as estacion_nombre, u.estado, u.ultimo_login, u.created_at
       FROM dw.usuarios u
       JOIN dw.roles r ON u.id_rol = r.id_rol
       LEFT JOIN dw.estacion e ON u.id_estacion = e.id_estacion
       ${whereClause}
       ORDER BY u.created_at DESC
       LIMIT $${limit_param} OFFSET $${offset_param}`,
      params
    );

    return {
      data: usuarios.rows,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].total),
        pages: Math.ceil(parseInt(countResult.rows[0].total) / limit)
      }
    };
  }

  /**
   * Actualizar datos de usuario
   */
  static async actualizar(idUsuario, datos) {
    const permitidos = ['nombre', 'documento_identidad', 'id_rol', 'id_estacion', 'estado'];
    const datosLimpiados = {};

    Object.keys(datos).forEach(key => {
      if (permitidos.includes(key)) {
        datosLimpiados[key] = datos[key];
      }
    });

    if (Object.keys(datosLimpiados).length === 0) {
      throw new Error('No hay datos para actualizar');
    }

    return update('dw.usuarios', datosLimpiados, { id_usuario: idUsuario });
  }

  /**
   * Eliminar usuario (soft delete)
   */
  static async eliminar(idUsuario) {
    const result = await query(
      'UPDATE dw.usuarios SET estado = FALSE, updated_at = NOW() WHERE id_usuario = $1 RETURNING id_usuario',
      [idUsuario]
    );

    return result.rows[0];
  }
}

export default Usuario;
