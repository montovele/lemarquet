import mysql from 'mysql2/promise';

const {
  DB_HOST = 'localhost',
  DB_PORT = '3306',
  DB_USER = 'root',
  DB_PASS = 'Metroman_1',
  DB_NAME = 'ssaxxon_ct_db'
} = process.env;

const db = {
  pool: null,
  async initializeSchema() {
    if (this.pool) {
      return this.pool;
    }

    const rootPool = await mysql.createPool({
      host: DB_HOST,
      port: Number(DB_PORT),
      user: DB_USER,
      password: DB_PASS,
      database: 'mysql',
      waitForConnections: true,
      connectionLimit: 1,
      queueLimit: 0
    });

    await rootPool.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await rootPool.end();

    this.pool = await mysql.createPool({
      host: DB_HOST,
      port: Number(DB_PORT),
      user: DB_USER,
      password: DB_PASS,
      database: DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      namedPlaceholders: true
    });

    await this.pool.execute(`
      CREATE TABLE IF NOT EXISTS diagnosticos (
        id VARCHAR(50) PRIMARY KEY,
        createdAt DATETIME NOT NULL,
        empresa VARCHAR(255) NOT NULL,
        contacto VARCHAR(255),
        correo VARCHAR(255),
        telefono VARCHAR(100),
        ciudad VARCHAR(100),
        estado VARCHAR(100),
        giro VARCHAR(255),
        tipo_empresa VARCHAR(100),
        empleados INT UNSIGNED DEFAULT 0,
        sucursales INT UNSIGNED DEFAULT 0,
        antiguedad INT UNSIGNED DEFAULT 0,
        objetivo TEXT,
        soluciones TEXT,
        erp VARCHAR(255),
        crm VARCHAR(255),
        website VARCHAR(255),
        ecommerce VARCHAR(255),
        presupuesto VARCHAR(255),
        fecha_inicio VARCHAR(100),
        observaciones TEXT,
        privacy TINYINT UNSIGNED DEFAULT 0,
        status VARCHAR(50) DEFAULT 'nuevo'
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    return this.pool;
  }
};

export default db;
