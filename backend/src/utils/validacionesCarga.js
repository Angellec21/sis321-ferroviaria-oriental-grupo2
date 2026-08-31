// ============================================
// Reglas de validación de envíos de carga (HU-12), extraídas de
// cargaController.js como funciones puras para poder probarlas con TDD.
// ============================================

/**
 * Valida el peso declarado de un envío de carga.
 * @param {number} pesoKg peso del envío
 * @param {number} pesoDisponibleKg capacidad restante del vagón para ese viaje
 * @returns {{valido: boolean, motivo?: string}}
 */
export function validarPesoEnvio(pesoKg, pesoDisponibleKg) {
  if (Number(pesoKg) <= 0) {
    return { valido: false, motivo: 'El peso debe ser mayor a 0' };
  }
  if (Number(pesoKg) > Number(pesoDisponibleKg)) {
    return { valido: false, motivo: `Excede la capacidad disponible del vagón (${pesoDisponibleKg} kg libres)` };
  }
  return { valido: true };
}
