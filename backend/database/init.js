// ============================================
// Script: Inicializar Base de Datos
// node database/init.js
// ============================================

import fs from 'fs';
import path from 'path';
import pool from '../src/config/database.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function inicializarBD() {
  const cliente = await pool.connect();

  try {
    console.log('🔄 Inicializando base de datos...\n');

    // Scripts en orden de dependencia:
    // 00 = MER base (empresa, estacion, tren, wagon, viaje, usuario_venta)
    // 01 = auth (roles, permisos, dw.usuarios) - depende de dw.estacion
    // 02 = MER operacional (venta, reserva, pago, metricas) - depende de dw.usuarios
    const scripts = fs.readdirSync(__dirname)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const nombreArchivo of scripts) {
      console.log(`\n📄 Ejecutando ${nombreArchivo}...\n`);
      const scriptPath = path.join(__dirname, nombreArchivo);
      const script = fs.readFileSync(scriptPath, 'utf-8');

      // Ejecutar script por bloques (separados por ;)
      const bloques = script.split(';').filter(b => b.trim().length > 0);

      for (let i = 0; i < bloques.length; i++) {
        const bloque = bloques[i].trim();
        if (bloque.length === 0) continue;

        try {
          await cliente.query(bloque);
        } catch (error) {
          if (error.message.includes('already exists')) {
            console.log(`[${i + 1}/${bloques.length}] ⚠️  Ya existe, continuando...`);
          } else {
            throw error;
          }
        }
      }
    }

    console.log('\n✅ Base de datos inicializada exitosamente!\n');

    // Mostrar información de la BD
    console.log('📊 Estado de la Base de Datos:\n');

    const roles = await cliente.query('SELECT COUNT(*) as total FROM dw.roles');
    console.log(`  • Roles: ${roles.rows[0].total}`);

    const permisos = await cliente.query('SELECT COUNT(*) as total FROM dw.permisos');
    console.log(`  • Permisos: ${permisos.rows[0].total}`);

    const usuarios = await cliente.query('SELECT COUNT(*) as total FROM dw.usuarios');
    console.log(`  • Usuarios: ${usuarios.rows[0].total}`);

    const rolesPermisos = await cliente.query('SELECT COUNT(*) as total FROM dw.roles_permisos');
    console.log(`  • Relaciones Roles-Permisos: ${rolesPermisos.rows[0].total}\n`);

    console.log('👤 Usuario administrador por defecto:');
    const admin = await cliente.query(
      'SELECT email, nombre FROM dw.usuarios WHERE id_rol = 1 LIMIT 1'
    );
    if (admin.rows.length > 0) {
      console.log(`  Email: ${admin.rows[0].email}`);
      console.log(`  Nombre: ${admin.rows[0].nombre}`);
      console.log(`  Contraseña: admin123 (⚠️  CAMBIAR EN PRODUCCIÓN)\n`);
    }

  } catch (error) {
    console.error('❌ Error al inicializar BD:', error);
    process.exit(1);
  } finally {
    cliente.release();
    await pool.end();
  }
}

inicializarBD();
