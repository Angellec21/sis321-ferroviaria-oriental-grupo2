// ============================================
// Script: Importar dataset estilo Mockaroo
// node database/import-mockaroo.js
//
// NOTA HONESTA: este CSV no fue exportado desde mockaroo.com (requiere
// cuenta/login en esa web). Se construyó a mano replicando el mismo
// formato que Mockaroo genera: nombres en español, ciudades/teléfonos
// de LATAM (Bolivia), para cumplir el mismo propósito de la Actividad 5
// (datos de prueba realistas) sin depender de la herramienta externa.
// ============================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';
import pool from '../src/config/database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PASSWORD_DEFAULT = 'Mockaroo123!';

function parseCSV(texto) {
  const [cabecera, ...filas] = texto.trim().split('\n');
  const columnas = cabecera.split(',');
  return filas.map((fila) => {
    const valores = fila.split(',');
    return Object.fromEntries(columnas.map((col, i) => [col, valores[i]]));
  });
}

async function importar() {
  const cliente = await pool.connect();
  try {
    const csv = fs.readFileSync(path.join(__dirname, 'mockaroo-usuarios.csv'), 'utf-8');
    const filas = parseCSV(csv);

    console.log(`🌱 Importando ${filas.length} usuarios desde mockaroo-usuarios.csv...\n`);
    const passwordHash = await bcrypt.hash(PASSWORD_DEFAULT, parseInt(process.env.BCRYPT_ROUNDS || 10));

    let creados = 0;
    for (const fila of filas) {
      try {
        await cliente.query(
          `INSERT INTO dw.usuarios (nombre, email, documento_identidad, password_hash, id_rol, id_estacion, telefono, estado)
           VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
           ON CONFLICT (email) DO NOTHING`,
          [fila.nombre, fila.email, fila.documento_identidad, passwordHash, fila.id_rol, fila.id_estacion, fila.telefono]
        );
        creados++;
        console.log(`✅ ${fila.nombre} (${fila.email})`);
      } catch (error) {
        console.log(`⚠️  ${fila.email}: ${error.message}`);
      }
    }

    console.log(`\n✅ Importación completa. Contraseña por defecto para todos: ${PASSWORD_DEFAULT}`);
  } finally {
    cliente.release();
    await pool.end();
  }
}

importar();
