// ============================================
// Configuración de Conexión a PostgreSQL
// ============================================

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'dss_ferroviaria',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 20, // Máximo de conexiones en el pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Error en el pool de conexiones:', err);
});

pool.on('connect', () => {
  console.log('[DB] Nueva conexión establecida');
});

/**
 * Ejecutar query genérica
 */
export const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log(`[DB QUERY] ${duration}ms | ${text.substring(0, 50)}...`);
    return res;
  } catch (error) {
    console.error('[DB ERROR]', error);
    throw error;
  }
};

/**
 * Obtener una fila
 */
export const getOne = async (text, params) => {
  const res = await query(text, params);
  return res.rows[0] || null;
};

/**
 * Obtener todas las filas
 */
export const getAll = async (text, params) => {
  const res = await query(text, params);
  return res.rows;
};

/**
 * Insertar registro
 */
export const insert = async (table, data) => {
  const columns = Object.keys(data).join(', ');
  const values = Object.values(data);
  const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
  
  const text = `INSERT INTO ${table} (${columns}) VALUES (${placeholders}) RETURNING *`;
  return getOne(text, values);
};

/**
 * Actualizar registro
 */
export const update = async (table, data, whereClause) => {
  const columns = Object.keys(data);
  const values = Object.values(data);
  
  const setClause = columns.map((col, i) => `${col} = $${i + 1}`).join(', ');
  const whereParams = Object.values(whereClause);
  
  const text = `
    UPDATE ${table} 
    SET ${setClause}, updated_at = NOW()
    WHERE ${Object.keys(whereClause).map((col, i) => `${col} = $${columns.length + i + 1}`).join(' AND ')}
    RETURNING *
  `;
  
  return getOne(text, [...values, ...whereParams]);
};

/**
 * Conectar e inicializar BD
 */
export const testConnection = async () => {
  try {
    const res = await pool.query('SELECT NOW()');
    console.log('✅ [DB] Conexión exitosa a PostgreSQL:', res.rows[0].now);
    return true;
  } catch (error) {
    console.error('❌ [DB] Error de conexión:', error.message);
    return false;
  }
};

/**
 * Cerrar pool
 */
export const closePool = async () => {
  await pool.end();
  console.log('[DB] Pool de conexiones cerrado');
};

export default pool;
