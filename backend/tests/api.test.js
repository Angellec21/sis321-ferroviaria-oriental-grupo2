// ============================================
// Pruebas automatizadas (node:test) — cubren los casos TC-01, TC-02,
// TC-03 y TC-06 documentados en Actividad 7 / Trabajo Final XP.
// Requiere el backend corriendo: npm run dev (u otro), en otra terminal.
// Ejecutar: npm test
// ============================================

import { test } from 'node:test';
import assert from 'node:assert/strict';

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:3000/api';
const ADMIN_EMAIL = 'admin@ferroviariaoriental.com.bo';
const ADMIN_PASSWORD = 'admin123';
const ID_ESTACION_PRUEBA = 1;

// Busca el primer viaje con al menos un asiento disponible, para no
// depender de un id_viaje fijo que pueda quedar sin cupo en ejecuciones
// repetidas de la prueba.
async function buscarViajeConAsientoDisponible(auth) {
  const viajesRes = await fetch(`${BASE_URL}/catalogo/viajes`, { headers: auth });
  const { data: viajes } = await viajesRes.json();
  for (const viaje of viajes) {
    const asientosRes = await fetch(`${BASE_URL}/catalogo/viajes/${viaje.id_viaje}/asientos`, { headers: auth });
    const { data: asientos } = await asientosRes.json();
    const libre = asientos.find((a) => a.estado === 'disponible');
    if (libre) return { idViaje: viaje.id_viaje, asiento: libre };
  }
  return null;
}

async function login(email, password) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  return { status: res.status, body: await res.json() };
}

test('TC-01: login con credenciales válidas devuelve token y rol correcto', async () => {
  const { status, body } = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
  assert.equal(status, 200);
  assert.equal(body.success, true);
  assert.ok(body.tokens?.accessToken, 'debe incluir accessToken');
  assert.equal(body.data.rol, 'administrador');
});

test('TC-02: login con contraseña incorrecta devuelve 401 sin revelar el motivo exacto', async () => {
  const { status, body } = await login(ADMIN_EMAIL, 'contrasena_incorrecta');
  assert.equal(status, 401);
  assert.equal(body.success, false);
  assert.equal(body.code, 'INVALID_CREDENTIALS');
});

test('TC-03: acceso a endpoint protegido sin token devuelve 401', async () => {
  const res = await fetch(`${BASE_URL}/usuarios`);
  const body = await res.json();
  assert.equal(res.status, 401);
  assert.equal(body.code, 'NO_TOKEN');
});

test('TC-06: vender el mismo asiento dos veces para el mismo viaje es rechazado (409)', async () => {
  const { body: loginBody } = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
  const token = loginBody.tokens.accessToken;
  const auth = { Authorization: `Bearer ${token}` };

  const disponible = await buscarViajeConAsientoDisponible(auth);
  assert.ok(disponible, 'debe existir al menos un viaje con un asiento disponible para ejecutar la prueba');

  const pasajero = {
    id_asiento: disponible.asiento.id_asiento,
    nombre_pasajero: 'Test Automatizado',
    documento_pasajero: '00000000'
  };
  const payload = { id_estacion: ID_ESTACION_PRUEBA, id_viaje: disponible.idViaje, pasajeros: [pasajero] };

  const primeraVenta = await fetch(`${BASE_URL}/ventas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...auth },
    body: JSON.stringify(payload)
  });
  assert.equal(primeraVenta.status, 201, 'la primera venta del asiento debe aceptarse');

  const segundaVenta = await fetch(`${BASE_URL}/ventas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...auth },
    body: JSON.stringify(payload)
  });
  const segundoBody = await segundaVenta.json();
  assert.equal(segundaVenta.status, 409, 'la segunda venta del mismo asiento debe rechazarse');
  assert.equal(segundoBody.code, 'SEAT_ALREADY_RESERVED');
});
