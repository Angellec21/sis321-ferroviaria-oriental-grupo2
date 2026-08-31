// ============================================
// TDD real: estos tests se escribieron ANTES de crear
// src/utils/validacionesCarga.js. Pruebas unitarias puras (sin red,
// sin base de datos) sobre la regla de negocio de HU-12: un envío de
// carga no puede exceder la capacidad disponible del vagón.
// ============================================

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validarPesoEnvio } from '../src/utils/validacionesCarga.js';

test('rechaza un peso menor o igual a 0', () => {
  const resultado = validarPesoEnvio(0, 500);
  assert.equal(resultado.valido, false);
  assert.match(resultado.motivo, /mayor a 0/);
});

test('rechaza un peso que excede la capacidad disponible del vagón', () => {
  const resultado = validarPesoEnvio(600, 500);
  assert.equal(resultado.valido, false);
  assert.match(resultado.motivo, /capacidad disponible/);
});

test('acepta un peso positivo dentro de la capacidad disponible', () => {
  const resultado = validarPesoEnvio(300, 500);
  assert.equal(resultado.valido, true);
  assert.equal(resultado.motivo, undefined);
});
