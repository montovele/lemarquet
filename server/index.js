import 'dotenv/config'
import crypto from 'node:crypto'
import express from 'express'
import rateLimit from 'express-rate-limit'
import mysql from 'mysql2/promise'
import SupportEmailService from '../MailEngine/services/SupportEmailService.js'

const requiredEnvironment = [
  'MYSQL_HOST',
  'MYSQL_DATABASE',
  'MYSQL_USER',
  'MYSQL_PASSWORD',
  'ASSISTANCE_USERNAME',
  'ASSISTANCE_PASSWORD',
  'AUTH_TOKEN_SECRET'
]

for (const name of requiredEnvironment) {
  if (!process.env[name]) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
}

if (process.env.AUTH_TOKEN_SECRET.length < 32) {
  throw new Error('AUTH_TOKEN_SECRET must contain at least 32 characters')
}

const port = Number(process.env.PORT || 3220)
const tokenLifetimeSeconds = 8 * 60 * 60
const customerTokenLifetimeSeconds = 15 * 60
const emailCodeLifetimeSeconds = 10 * 60
let emailService
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT || 3306),
  database: process.env.MYSQL_DATABASE,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  waitForConnections: true,
  connectionLimit: 10,
  timezone: 'Z'
})

const app = express()
app.disable('x-powered-by')
app.use(express.json({ limit: '16kb' }))

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.' }
})

const chatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Se alcanzó el límite temporal de mensajes. Inténtalo más tarde.' }
})

const emailCodeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Se alcanzó el límite de solicitudes de código. Inténtalo más tarde.' }
})

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next)
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer)
}

function createToken(username) {
  const payload = Buffer.from(JSON.stringify({
    type: 'agent',
    username,
    exp: Math.floor(Date.now() / 1000) + tokenLifetimeSeconds
  })).toString('base64url')
  const signature = crypto.createHmac('sha256', process.env.AUTH_TOKEN_SECRET).update(payload).digest('base64url')
  return `${payload}.${signature}`
}

function createCustomerToken(email, purpose) {
  const payload = Buffer.from(JSON.stringify({
    type: 'customer',
    email,
    purpose,
    exp: Math.floor(Date.now() / 1000) + customerTokenLifetimeSeconds
  })).toString('base64url')
  const signature = crypto.createHmac('sha256', process.env.AUTH_TOKEN_SECRET).update(payload).digest('base64url')
  return `${payload}.${signature}`
}

function readToken(req) {
  const [scheme, token] = (req.get('authorization') || '').split(' ')
  if (scheme !== 'Bearer' || !token) return null

  const [payload, signature, extra] = token.split('.')
  if (!payload || !signature || extra) return null
  const expected = crypto.createHmac('sha256', process.env.AUTH_TOKEN_SECRET).update(payload).digest('base64url')
  if (!safeEqual(signature, expected)) return null

  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    return Number.isInteger(claims.exp) && claims.exp > Date.now() / 1000 ? claims : null
  } catch (error) {
    return null
  }
}

function requireAgent(req, res, next) {
  const claims = readToken(req)
  if (!claims || (claims.type && claims.type !== 'agent') || claims.username !== process.env.ASSISTANCE_USERNAME) {
    return res.status(401).json({ error: 'La sesión no es válida. Inicia sesión de nuevo.' })
  }

  next()
}

function requireCustomer(purpose) {
  return (req, res, next) => {
    const claims = readToken(req)
    if (!claims || claims.type !== 'customer' || claims.purpose !== purpose || !validEmail(claims.email)) {
      return res.status(401).json({ error: 'Verifica tu correo para continuar.' })
    }
    req.customerEmail = claims.email
    next()
  }
}

function normalizeText(value, maxLength) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

function normalizeEmail(value) {
  return normalizeText(value, 254).toLowerCase()
}

function validEmail(value) {
  return typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function validReference(value) {
  return typeof value === 'string' && /^LMQ-[A-F0-9]{16}$/.test(value)
}

function hashEmailCode(email, purpose, code) {
  return crypto.createHmac('sha256', process.env.AUTH_TOKEN_SECRET)
    .update(`${email}:${purpose}:${code}`)
    .digest('hex')
}

async function initializeSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS support_conversations (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      reference VARCHAR(20) NOT NULL,
      customer_username VARCHAR(120) NOT NULL,
      customer_name VARCHAR(120) NOT NULL,
      status ENUM('open', 'pending', 'closed') NOT NULL DEFAULT 'open',
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      UNIQUE KEY uq_support_conversations_reference (reference),
      KEY idx_support_conversations_username (customer_username),
      KEY idx_support_conversations_status_updated (status, updated_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS support_messages (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      conversation_id BIGINT UNSIGNED NOT NULL,
      sender ENUM('customer', 'agent') NOT NULL,
      body TEXT NOT NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      KEY idx_support_messages_conversation_created (conversation_id, created_at),
      CONSTRAINT fk_support_messages_conversation
        FOREIGN KEY (conversation_id) REFERENCES support_conversations(id)
        ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)
  const [conversationColumns] = await pool.query('SHOW COLUMNS FROM support_conversations LIKE ?', ['customer_email'])
  if (!conversationColumns.length) {
    await pool.query('ALTER TABLE support_conversations ADD COLUMN customer_email VARCHAR(254) NULL AFTER customer_username')
  }
  const [conversationIndexes] = await pool.query(
    'SHOW INDEX FROM support_conversations WHERE Key_name = ?',
    ['idx_support_conversations_customer_email']
  )
  if (!conversationIndexes.length) {
    await pool.query('ALTER TABLE support_conversations ADD KEY idx_support_conversations_customer_email (customer_email)')
  }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS support_email_verifications (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      email VARCHAR(254) NOT NULL,
      purpose ENUM('start', 'recovery') NOT NULL,
      code_hash CHAR(64) NOT NULL,
      attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
      expires_at DATETIME(3) NOT NULL,
      consumed_at DATETIME(3) NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      KEY idx_support_email_verifications_lookup (email, purpose, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)
}

app.post('/api/auth/login', loginLimiter, asyncRoute(async (req, res) => {
  const username = normalizeText(req.body?.username, 120)
  const password = typeof req.body?.password === 'string' ? req.body.password : ''
  const validUsername = safeEqual(username, process.env.ASSISTANCE_USERNAME)
  const validPassword = safeEqual(password, process.env.ASSISTANCE_PASSWORD)

  if (!validUsername || !validPassword) {
    return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' })
  }

  res.json({ token: createToken(username), expiresIn: tokenLifetimeSeconds, username })
}))

app.post('/api/public/email-verification/request', emailCodeLimiter, asyncRoute(async (req, res) => {
  const email = normalizeEmail(req.body?.email)
  const purpose = req.body?.purpose
  if (!validEmail(email) || !['start', 'recovery'].includes(purpose)) {
    return res.status(400).json({ error: 'Escribe un correo válido para continuar.' })
  }

  const code = String(crypto.randomInt(100000, 1000000))
  const connection = await pool.getConnection()
  let verificationId
  try {
    await connection.beginTransaction()
    await connection.execute(`
      UPDATE support_email_verifications
      SET consumed_at = UTC_TIMESTAMP(3)
      WHERE email = ? AND purpose = ? AND consumed_at IS NULL
    `, [email, purpose])
    const [result] = await connection.execute(`
      INSERT INTO support_email_verifications (email, purpose, code_hash, expires_at)
      VALUES (?, ?, ?, ?)
    `, [email, purpose, hashEmailCode(email, purpose, code), new Date(Date.now() + emailCodeLifetimeSeconds * 1000)])
    verificationId = result.insertId
    await connection.commit()
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }

  try {
    emailService ||= new SupportEmailService()
    await emailService.sendVerificationCode(email, code)
  } catch (error) {
    await pool.execute(
      'UPDATE support_email_verifications SET consumed_at = UTC_TIMESTAMP(3) WHERE id = ?',
      [verificationId]
    )
    console.error('Unable to send customer email verification message', {
      code: error.code || error.cause?.code || 'UNKNOWN',
      responseCode: error.responseCode || null,
      command: error.command || null
    })
    return res.status(503).json({ error: 'No pudimos enviar el código. Inténtalo más tarde.' })
  }

  res.status(202).json({
    message: 'Si el correo está disponible, recibirás un código de verificación.'
  })
}))

app.post('/api/public/email-verification/verify', emailCodeLimiter, asyncRoute(async (req, res) => {
  const email = normalizeEmail(req.body?.email)
  const purpose = req.body?.purpose
  const code = normalizeText(req.body?.code, 6)
  if (!validEmail(email) || !['start', 'recovery'].includes(purpose) || !/^\d{6}$/.test(code)) {
    return res.status(400).json({ error: 'El correo o el código no son válidos.' })
  }

  const connection = await pool.getConnection()
  let verified = false
  try {
    await connection.beginTransaction()
    const [rows] = await connection.execute(`
      SELECT id, code_hash, attempts
      FROM support_email_verifications
      WHERE email = ? AND purpose = ? AND consumed_at IS NULL
        AND expires_at > UTC_TIMESTAMP(3)
      ORDER BY id DESC
      LIMIT 1
      FOR UPDATE
    `, [email, purpose])
    const challenge = rows[0]
    if (challenge && Number(challenge.attempts) < 5
      && safeEqual(challenge.code_hash, hashEmailCode(email, purpose, code))) {
      await connection.execute(
        'UPDATE support_email_verifications SET consumed_at = UTC_TIMESTAMP(3) WHERE id = ?',
        [challenge.id]
      )
      verified = true
    } else if (challenge) {
      await connection.execute(`
        UPDATE support_email_verifications
        SET consumed_at = IF(attempts >= 4, UTC_TIMESTAMP(3), consumed_at),
          attempts = attempts + 1
        WHERE id = ?
      `, [challenge.id])
    }
    await connection.commit()
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }

  if (!verified) {
    return res.status(400).json({ error: 'El código es incorrecto o venció. Solicita uno nuevo.' })
  }
  res.json({
    token: createCustomerToken(email, purpose),
    expiresIn: customerTokenLifetimeSeconds
  })
}))

app.get('/api/public/customer/conversations', requireCustomer('recovery'), asyncRoute(async (req, res) => {
  const [rows] = await pool.execute(`
    SELECT c.id, c.reference, c.customer_username AS customerUsername,
      c.customer_name AS customerName, c.status, c.created_at AS createdAt,
      c.updated_at AS updatedAt,
      (SELECT m.body FROM support_messages m
       WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) AS lastMessage
    FROM support_conversations c
    WHERE c.customer_email = ?
    ORDER BY c.updated_at DESC, c.id DESC
    LIMIT 100
  `, [req.customerEmail])
  res.json({ conversations: rows })
}))

app.post('/api/public/customer/conversations/link', requireCustomer('recovery'), asyncRoute(async (req, res) => {
  const reference = normalizeText(req.body?.reference, 20).toUpperCase()
  if (!validReference(reference)) {
    return res.status(400).json({ error: 'Escribe una referencia de chat válida.' })
  }
  const [rows] = await pool.execute(
    'SELECT customer_email FROM support_conversations WHERE reference = ?',
    [reference]
  )
  if (!rows.length) {
    return res.status(404).json({ error: 'No encontramos una conversación con esa referencia.' })
  }
  if (rows[0].customer_email && rows[0].customer_email !== req.customerEmail) {
    return res.status(409).json({ error: 'Esta conversación ya está asociada a otro correo.' })
  }
  await pool.execute(
    'UPDATE support_conversations SET customer_email = ? WHERE reference = ? AND customer_email IS NULL',
    [req.customerEmail, reference]
  )
  res.json({ linked: true })
}))

app.get('/api/public/customer/conversations/:id/messages', requireCustomer('recovery'), asyncRoute(async (req, res) => {
  if (!/^\d+$/.test(req.params.id)) {
    return res.status(400).json({ error: 'El identificador de conversación no es válido.' })
  }
  const [rows] = await pool.execute(`
    SELECT m.id, m.sender, m.body, m.created_at AS createdAt
    FROM support_messages m
    INNER JOIN support_conversations c ON c.id = m.conversation_id
    WHERE c.id = ? AND c.customer_email = ?
    ORDER BY m.id ASC
    LIMIT 500
  `, [req.params.id, req.customerEmail])
  res.json({ messages: rows })
}))

app.post('/api/public/customer/conversations/:id/messages', requireCustomer('recovery'), asyncRoute(async (req, res) => {
  const body = normalizeText(req.body?.message, 5000)
  if (!/^\d+$/.test(req.params.id) || !body) {
    return res.status(400).json({ error: 'El identificador o el mensaje no son válidos.' })
  }
  const [result] = await pool.execute(`
    INSERT INTO support_messages (conversation_id, sender, body)
    SELECT id, 'customer', ? FROM support_conversations
    WHERE id = ? AND customer_email = ?
  `, [body, req.params.id, req.customerEmail])
  if (!result.affectedRows) {
    return res.status(404).json({ error: 'No encontramos una conversación con ese correo.' })
  }
  await pool.execute(`
    UPDATE support_conversations
    SET status = 'open', updated_at = CURRENT_TIMESTAMP(3)
    WHERE id = ? AND customer_email = ?
  `, [req.params.id, req.customerEmail])
  res.status(201).json({ sent: true })
}))

app.post('/api/public/conversations', chatLimiter, requireCustomer('start'), asyncRoute(async (req, res) => {
  const customerName = normalizeText(req.body?.customerName, 120)
  const customerUsername = normalizeText(req.body?.customerUsername, 120)
  const body = normalizeText(req.body?.message, 5000)
  if (customerName.length < 2 || customerUsername.length < 2 || body.length < 1) {
    return res.status(400).json({ error: 'Indica tu nombre, usuario y mensaje para iniciar el chat.' })
  }

  const reference = `LMQ-${crypto.randomBytes(8).toString('hex').toUpperCase()}`
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const [conversationResult] = await connection.execute(
      'INSERT INTO support_conversations (reference, customer_username, customer_email, customer_name) VALUES (?, ?, ?, ?)',
      [reference, customerUsername, req.customerEmail, customerName]
    )
    await connection.execute(
      'INSERT INTO support_messages (conversation_id, sender, body) VALUES (?, ?, ?)',
      [conversationResult.insertId, 'customer', body]
    )
    await connection.commit()
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }

  res.status(201).json({ reference })
}))

app.get('/api/public/conversations/:reference/messages', chatLimiter, asyncRoute(async (req, res) => {
  if (!validReference(req.params.reference)) {
    return res.status(400).json({ error: 'La referencia del chat no es válida.' })
  }

  const [rows] = await pool.execute(`
    SELECT m.id, m.sender, m.body, m.created_at AS createdAt
    FROM support_messages m
    INNER JOIN support_conversations c ON c.id = m.conversation_id
    WHERE c.reference = ?
    ORDER BY m.id ASC
    LIMIT 500
  `, [req.params.reference])
  if (!rows.length) {
    const [conversations] = await pool.execute(
      'SELECT id FROM support_conversations WHERE reference = ?',
      [req.params.reference]
    )
    if (!conversations.length) {
      return res.status(404).json({ error: 'No encontramos una conversación con esa referencia.' })
    }
  }
  res.json({ messages: rows })
}))

app.post('/api/public/conversations/:reference/messages', chatLimiter, asyncRoute(async (req, res) => {
  const body = normalizeText(req.body?.message, 5000)
  if (!validReference(req.params.reference)) {
    return res.status(400).json({ error: 'La referencia del chat no es válida.' })
  }
  if (!body) {
    return res.status(400).json({ error: 'Escribe un mensaje antes de enviarlo.' })
  }

  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const [conversations] = await connection.execute(
      'SELECT id FROM support_conversations WHERE reference = ? FOR UPDATE',
      [req.params.reference]
    )
    if (!conversations.length) {
      await connection.rollback()
      return res.status(404).json({ error: 'No encontramos una conversación con esa referencia.' })
    }
    await connection.execute(
      'INSERT INTO support_messages (conversation_id, sender, body) VALUES (?, ?, ?)',
      [conversations[0].id, 'customer', body]
    )
    await connection.execute(
      "UPDATE support_conversations SET status = 'open', updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?",
      [conversations[0].id]
    )
    await connection.commit()
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
  res.status(201).json({ sent: true })
}))

app.use('/api', requireAgent)

app.get('/api/conversations', asyncRoute(async (req, res) => {
  const search = normalizeText(req.query.q, 120)
  const status = ['open', 'pending', 'closed'].includes(req.query.status) ? req.query.status : 'all'
  const filters = []
  const parameters = []

  if (status !== 'all') {
    filters.push('c.status = ?')
    parameters.push(status)
  }
  if (search) {
    filters.push('(c.reference LIKE ? OR c.customer_username LIKE ? OR c.customer_name LIKE ?)')
    const term = `%${search}%`
    parameters.push(term, term, term)
  }

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : ''
  const [rows] = await pool.execute(`
    SELECT c.id, c.reference, c.customer_username AS customerUsername,
      c.customer_name AS customerName, c.status, c.created_at AS createdAt,
      c.updated_at AS updatedAt,
      (SELECT m.body FROM support_messages m
       WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) AS lastMessage
    FROM support_conversations c
    ${where}
    ORDER BY c.updated_at DESC, c.id DESC
    LIMIT 100
  `, parameters)
  res.json({ conversations: rows })
}))

app.get('/api/conversations/:id/messages', asyncRoute(async (req, res) => {
  if (!/^\d+$/.test(req.params.id)) {
    return res.status(400).json({ error: 'El identificador de conversación no es válido.' })
  }

  const [rows] = await pool.execute(`
    SELECT id, sender, body, created_at AS createdAt
    FROM support_messages
    WHERE conversation_id = ?
    ORDER BY id ASC
    LIMIT 500
  `, [req.params.id])
  res.json({ messages: rows })
}))

app.post('/api/conversations/:id/messages', asyncRoute(async (req, res) => {
  const body = normalizeText(req.body?.message, 5000)
  if (!/^\d+$/.test(req.params.id)) {
    return res.status(400).json({ error: 'El identificador de conversación no es válido.' })
  }
  if (!body) {
    return res.status(400).json({ error: 'Escribe un mensaje antes de enviarlo.' })
  }

  const [result] = await pool.execute(`
    INSERT INTO support_messages (conversation_id, sender, body)
    SELECT id, 'agent', ? FROM support_conversations WHERE id = ?
  `, [body, req.params.id])
  if (!result.affectedRows) {
    return res.status(404).json({ error: 'No encontramos esta conversación.' })
  }
  await pool.execute(
    "UPDATE support_conversations SET status = 'pending', updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?",
    [req.params.id]
  )
  res.status(201).json({ sent: true })
}))

app.patch('/api/conversations/:id/status', asyncRoute(async (req, res) => {
  const status = req.body?.status
  if (!/^\d+$/.test(req.params.id) || !['open', 'pending', 'closed'].includes(status)) {
    return res.status(400).json({ error: 'El identificador o estado de conversación no es válido.' })
  }

  const [result] = await pool.execute(
    'UPDATE support_conversations SET status = ? WHERE id = ?',
    [status, req.params.id]
  )
  if (!result.affectedRows) {
    return res.status(404).json({ error: 'No encontramos esta conversación.' })
  }
  res.json({ status })
}))

app.use((error, req, res, next) => {
  console.error(error)
  if (res.headersSent) {
    return next(error)
  }
  res.status(500).json({ error: 'Ocurrió un error interno. Inténtalo de nuevo más tarde.' })
})

async function start() {
  await initializeSchema()
  app.listen(port, '0.0.0.0', () => {
    console.log(`Lemarquet assistance API listening on port ${port}`)
  })
}

start().catch((error) => {
  console.error('Unable to initialize the assistance API:', error)
  process.exitCode = 1
})
