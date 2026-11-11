import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import nodemailer from 'nodemailer'

const servicesDirectory = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(servicesDirectory, '..', '..', '.env') })
dotenv.config({ path: path.resolve(servicesDirectory, '..', '.env') })

export default class SupportEmailService {
  constructor({ transporter } = {}) {
    this.transporter = transporter || this.createTransporter()
  }

  createTransporter() {
    const port = Number(process.env.SMTP_PORT || process.env.SMTP_PORT_HostGator || 587)
    const host = process.env.SMTP_HOST || process.env.SMTP_HOST_HostGator
    const user = process.env.SMTP_USER || process.env.SMTP_USER_HostGator
    const password = process.env.SMTP_PASS || process.env.SMTP_PASS_HostGator
    if (!host || !user || !password) {
      throw new Error('Falta configurar el servidor SMTP de MailEngine.')
    }

    return nodemailer.createTransport({
      host,
      port,
      secure: (process.env.SMTP_SECURE || process.env.SMTP_SECURE_HostGator || String(port === 465)) === 'true',
      requireTLS: (process.env.SMTP_REQUIRE_TLS || process.env.SMTP_REQUIRE_TLS_HostGator || String(port === 587)) === 'true',
      ignoreTLS: (process.env.SMTP_IGNORE_TLS || process.env.SMTP_IGNORE_TLS_HostGator) === 'true',
      auth: { user, pass: password },
      connectionTimeout: 10000,
      greetingTimeout: 5000,
      socketTimeout: 10000,
      tls: { rejectUnauthorized: true }
    })
  }

  async sendVerificationCode(to, code) {
    const from = process.env.SMTP_FROM || process.env.SMTP_FROM_HostGator || process.env.SMTP_USER || process.env.SMTP_USER_HostGator
    const fromName = process.env.SMTP_FROM_NAME || process.env.SMTP_FROM_NAME_HostGator || 'Lemarquet'
    if (!from) {
      throw new Error('Falta configurar el remitente SMTP de MailEngine.')
    }

    return this.transporter.sendMail({
      from: { name: fromName, address: from },
      to,
      subject: 'Tu código para recuperar el chat de Lemarquet',
      text: `Tu código de verificación es ${code}. Vence en 10 minutos. Si no solicitaste este código, puedes ignorar este correo.`,
      html: `<div style="font-family:Arial,sans-serif;color:#17241f;max-width:520px;margin:auto;padding:28px"><h1 style="font-size:22px">Recupera tu chat</h1><p>Usa este código para verificar tu correo y consultar tus conversaciones de atención:</p><p style="font-size:30px;font-weight:700;letter-spacing:8px;color:#287348">${code}</p><p>El código vence en 10 minutos. Si no solicitaste este código, puedes ignorar este correo.</p></div>`
    })
  }
}
