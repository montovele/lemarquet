import db from '../services/db.js';

class DiagnosticoRepository {
  constructor({ database } = {}) {
    this.database = database || db;
  }

  parseRow(row) {
    if (!row) return null;
    return {
      ...row,
      // Parsear JSON si la columna viene serializada desde MySQL
      soluciones: typeof row.soluciones === 'string'
        ? JSON.parse(row.soluciones)
        : row.soluciones || null,
      privacy: Number(row.privacy),
      empleados: Number(row.empleados),
      sucursales: Number(row.sucursales),
      antiguedad: Number(row.antiguedad)
    };
  }

  async create(payload) {
    // 1. Preparar campos opcionales / JSON
    const solucionesJson = payload.soluciones ? JSON.stringify(payload.soluciones) : null;

    // 2. Omitimos 'id' y 'created_at' para apoyarnos en AUTO_INCREMENT y CURRENT_TIMESTAMP
    const sql = `INSERT INTO diagnosticos
      (empresa, contacto, correo, telefono, ciudad, estado, giro, tipo_empresa,
       empleados, sucursales, antiguedad, objetivo, soluciones, erp, crm, website, ecommerce,
       presupuesto, fecha_inicio, observaciones, privacy, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const values = [
      payload.empresa,
      payload.contacto,
      payload.correo,
      payload.telefono || null,
      payload.ciudad || null,
      payload.estado || null,
      payload.giro || null,
      payload.tipo_empresa || null,
      payload.empleados || 0,
      payload.sucursales || 0,
      payload.antiguedad || 0,
      payload.objetivo,
      solucionesJson,
      payload.erp || null,
      payload.crm || null,
      payload.website || null,
      payload.ecommerce || null,
      payload.presupuesto || null,
      payload.fecha_inicio || null,
      payload.observaciones || null,
      payload.privacy ? 1 : 0,
      payload.status || 'nuevo'
    ];

    const [result] = await this.database.pool.execute(sql, values);

    // Retornamos el objeto recién insertado buscando por el ID autogenerado
    return this.findById(result.insertId);
  }

  async findById(id) {
    const sql = 'SELECT * FROM diagnosticos WHERE id = ? LIMIT 1';
    const [rows] = await this.database.pool.execute(sql, [id]);
    return this.parseRow(rows[0]);
  }

  async list({ page = 1, limit = 50, q = '' } = {}) {
    const numericLimit = parseInt(limit, 10) || 50;
    const numericPage = parseInt(page, 10) || 1;
    const offset = Math.max(numericPage - 1, 0) * numericLimit;
    const trimmedQuery = String(q || '').trim();

    let sql = 'SELECT * FROM diagnosticos';
    const params = [];

    if (trimmedQuery) {
      sql += ' WHERE empresa LIKE ? OR objetivo LIKE ? OR contacto LIKE ?';
      const queryPattern = `%${trimmedQuery}%`;
      params.push(queryPattern, queryPattern, queryPattern);
    }

    // Aseguramos el orden por created_at y convertimos limit/offset a enteros para la consulta
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(numericLimit, offset);

    const [rows] = await this.database.pool.execute(sql, params);
    return rows.map((row) => this.parseRow(row));
  }
}

export default DiagnosticoRepository;