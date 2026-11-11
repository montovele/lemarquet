import fs from 'node:fs';
import path from 'node:path';
import EmailService from '../services/EmailService.js';

class EmailAgent {
  constructor({ emailService, adminEmail, templatePath } = {}) {
    this.emailService = emailService || new EmailService({ templatePath });
    this.adminEmail = adminEmail || process.env.SALES_EMAIL_HostGator || 'admin@diagnostico.local';
  }

  buildAdminPayload(diagnostico = {}) {
    console.log('[buildAdminPayload] Construyendo payload para administrador...',diagnostico);
    return {
      ...diagnostico,
      empresa: diagnostico.empresa || 'Sin empresa',
      contacto: diagnostico.contacto || 'Sin contacto',
      correo: diagnostico.correo || 'Sin correo',
      telefono: diagnostico.telefono || 'Sin teléfono',
      objetivo: diagnostico.objetivo || diagnostico.resumen || 'Sin objetivo',
      observaciones: diagnostico.observaciones || 'Sin observaciones'
    };
  }

  async notifyAdmin(diagnostico) {
    const payload = this.buildAdminPayload(diagnostico);
    const result = await this.emailService.send({
      to: this.adminEmail,
      subject: `Nuevo contacto recibido: ${payload.empresa}`,
      data: payload
    });

    return {
      ok: true,
      sentTo: this.adminEmail,
      ...result
    };
  }
}

export { EmailAgent };
