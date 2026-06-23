// ============================================
// Script: Generar Datos de Prueba Mockaroo
// node database/seed.js
// ============================================

import pool from '../src/config/database.js';
import bcrypt from 'bcrypt';

/**
 * Datos de prueba con nombres en español
 * y ciudades de LATAM
 */

const CIUDADES = [
  'Santa Cruz de la Sierra', 'Montero', 'Warnes', 'Yacuiba', 'Puerto Quijarro',
  'Roboré', 'Camiri', 'Villamontes', 'San José de Chiquitos', 'Boyuibe'
];

const USUARIOS_SEED = [
  {
    nombre: 'María García López',
    email: 'maria.garcia@ferroviariaoriental.com.bo',
    documento_identidad: '5896214',
    id_rol: 2, // Gerente
    id_estacion: 1
  },
  {
    nombre: 'Carlos Rodríguez Martínez',
    email: 'carlos.rodriguez@ferroviariaoriental.com.bo',
    documento_identidad: '6321478',
    id_rol: 3, // Operador
    id_estacion: 1
  },
  {
    nombre: 'Ana Pérez Gómez',
    email: 'ana.perez@ferroviariaoriental.com.bo',
    documento_identidad: '7458963',
    id_rol: 3, // Operador
    id_estacion: 2
  },
  {
    nombre: 'Juan Hernández López',
    email: 'juan.hernandez@ferroviariaoriental.com.bo',
    documento_identidad: '8965214',
    id_rol: 2, // Gerente
    id_estacion: 2
  },
  {
    nombre: 'Sofía Moreno García',
    email: 'sofia.moreno@ferroviariaoriental.com.bo',
    documento_identidad: '3214569',
    id_rol: 3, // Operador
    id_estacion: 3
  },
  {
    nombre: 'Fernando Díaz Sánchez',
    email: 'fernando.diaz@ferroviariaoriental.com.bo',
    documento_identidad: '9874563',
    id_rol: 1, // Admin
    id_estacion: 1
  },
  {
    nombre: 'Valentina Castillo Ruiz',
    email: 'valentina.castillo@ferroviariaoriental.com.bo',
    documento_identidad: '6587412',
    id_rol: 3, // Operador
    id_estacion: 3
  },
  {
    nombre: 'Roberto Flores Vega',
    email: 'roberto.flores@ferroviariaoriental.com.bo',
    documento_identidad: '1236547',
    id_rol: 2, // Gerente
    id_estacion: 3
  }
];

async function seed() {
  const cliente = await pool.connect();

  try {
    console.log('🌱 Generando datos de prueba...\n');

    for (let i = 0; i < USUARIOS_SEED.length; i++) {
      const usuario = USUARIOS_SEED[i];
      const passwordHash = await bcrypt.hash('Password123!', 10);

      try {
        await cliente.query(
          `INSERT INTO dw.usuarios
            (nombre, email, documento_identidad, password_hash, id_rol, id_estacion, estado, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
          [
            usuario.nombre,
            usuario.email,
            usuario.documento_identidad,
            passwordHash,
            usuario.id_rol,
            usuario.id_estacion,
            true
          ]
        );

        console.log(`✅ [${i + 1}/${USUARIOS_SEED.length}] ${usuario.nombre}`);
      } catch (error) {
        if (error.message.includes('unique')) {
          console.log(`⚠️  [${i + 1}/${USUARIOS_SEED.length}] ${usuario.email} ya existe`);
        } else {
          throw error;
        }
      }
    }

    console.log('\n✅ Datos de prueba generados exitosamente!\n');

    // Mostrar resumen
    const resultado = await cliente.query(
      'SELECT id_rol, COUNT(*) as total FROM dw.usuarios GROUP BY id_rol'
    );

    console.log('📊 Usuarios por Rol:\n');
    for (const row of resultado.rows) {
      const rolMap = { '1': 'Administrador', '2': 'Gerente', '3': 'Operador' };
      console.log(`  ${rolMap[row.id_rol]}: ${row.total}`);
    }

    console.log('\n👤 Credenciales para Testing:\n');
    USUARIOS_SEED.forEach(u => {
      console.log(`  Email: ${u.email}`);
      console.log(`  Contraseña: Password123!\n`);
    });

  } catch (error) {
    console.error('❌ Error al generar datos:', error);
  } finally {
    cliente.release();
    await pool.end();
  }
}

seed();
