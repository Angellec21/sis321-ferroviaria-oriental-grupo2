// ============================================
// Validadores de entrada (express-validator)
// ============================================

import { body, validationResult } from 'express-validator';

/**
 * Middleware: revisa los resultados de las reglas anteriores
 * y corta la petición con 400 si alguna falló.
 */
export const validar = (req, res, next) => {
  const errores = validationResult(req);
  if (!errores.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Datos inválidos',
      code: 'VALIDATION_ERROR',
      errores: errores.array().map((e) => ({ campo: e.path, mensaje: e.msg }))
    });
  }
  next();
};

export const reglasRegistro = [
  body('nombre').trim().notEmpty().withMessage('El nombre es requerido').isLength({ max: 150 }),
  body('email').trim().isEmail().withMessage('Email inválido').normalizeEmail(),
  body('documento_identidad').trim().notEmpty().withMessage('El documento de identidad es requerido'),
  body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
  validar
];

export const reglasLogin = [
  body('email').trim().isEmail().withMessage('Email inválido').normalizeEmail(),
  body('password').notEmpty().withMessage('La contraseña es requerida'),
  validar
];

export const reglasOlvidePassword = [
  body('email').trim().isEmail().withMessage('Email inválido').normalizeEmail(),
  validar
];

export const reglasResetearConToken = [
  body('token').trim().notEmpty().withMessage('Token requerido'),
  body('password_nueva').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
  validar
];

export const reglasCrearUsuario = [
  body('nombre').trim().notEmpty().withMessage('El nombre es requerido').isLength({ max: 150 }),
  body('email').trim().isEmail().withMessage('Email inválido').normalizeEmail(),
  body('documento_identidad').trim().notEmpty().withMessage('El documento de identidad es requerido'),
  body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
  body('id_rol').isInt({ min: 1 }).withMessage('id_rol inválido'),
  validar
];

export default {
  validar,
  reglasRegistro,
  reglasLogin,
  reglasOlvidePassword,
  reglasResetearConToken,
  reglasCrearUsuario
};
