import DiagnosticoRepository from '../repositories/DiagnosticoRepository.js';
import EmailService from '../services/EmailService.js';
import { EmailAgent } from '../agents/emailAgent.js';

class DiagnosticoController {

    constructor({
        repository,
        emailService
    } = {}) {

        console.log("\n========================================");
        console.log("[DiagnosticoController] Inicializando...");
        console.log("========================================");

        this.repository =
            repository ||
            new DiagnosticoRepository();

        this.emailService =
            emailService ||
            new EmailService();

        this.emailAgent =
            new EmailAgent({
                emailService: this.emailService
            });

        console.log(
            "[DiagnosticoController] Repository:",
            this.repository.constructor.name
        );

        console.log(
            "[DiagnosticoController] EmailService:",
            this.emailService.constructor.name
        );

    }
normalizePayload(payload = {}) {
  console.log("\n----------------------------------------");
  console.log("[normalizePayload] Payload recibido:");
  console.dir(payload, { depth: null });

  // 1. Extraer el sub-objeto formulario si existe, de lo contrario usar la raíz
  const form = payload.formulario || payload;

  // 2. Mapear agregando fallbacks universales
  const normalized = {
    empresa: form.empresa || payload.empresa || "",
    contacto: form.contacto || payload.contacto || "",
    correo: form.correo || payload.correo || "",
    telefono: form.telefono || payload.telefono || null,
    ciudad: form.ciudad || payload.ciudad || null,
    estado: form.estado || payload.estado || null,
    giro: form.giro || payload.giro || null,
    tipo_empresa: form.tipoEmpresa || form.tipo_empresa || payload.tipo_empresa || null,

    empleados: Number(form.empleados || payload.empleados || 0),
    sucursales: Number(form.sucursales || payload.sucursales || 0),
    antiguedad: Number(form.antiguedad || payload.antiguedad || 0),

    objetivo: form.objetivo || payload.objetivo || payload.resumen || "",

    soluciones: Array.isArray(form.soluciones || payload.soluciones)
      ? (form.soluciones || payload.soluciones)
      : null,

    erp: form.erp || payload.erp || null,
    crm: form.crm || payload.crm || null,
    website: form.website || payload.website || null,
    ecommerce: form.ecommerce || payload.ecommerce || null,
    presupuesto: form.presupuesto || payload.presupuesto || null,

    fecha_inicio: form.fechaVisita || form.fecha || payload.fecha_inicio || null,

    // Si la estructura trae detalles por tamaño de empresa o niveles de servicio, los concentramos en observaciones
    observaciones: form.observaciones || payload.observaciones || JSON.stringify({
      nivelServicio: payload.nivelServicio || null,
      pequena: payload.pequena || null,
      mediana: payload.mediana || null,
      grande: payload.grande || null
    }),

    privacy: (payload.privacy || form.privacy) ? 1 : 0,
    status: "nuevo"
  };

  console.log("[normalizePayload] Payload normalizado:");
  console.dir(normalized, { depth: null });

  return normalized;
}
    async createDiagnostico(payload) {

        console.log("\n========================================");
        console.log("[createDiagnostico] Iniciando...");
        console.log("========================================");

        try {

            const normalized =
                this.normalizePayload(payload);

            console.log(
                "[createDiagnostico] Guardando en Repository..."
            );

            const result =
                await this.repository.create(
                    normalized
                );

            console.log(
                "[createDiagnostico] Resultado Repository:"
            );

            console.dir(
                result,
                { depth: null }
            );

            console.log(
                "[createDiagnostico] Enviando correo administrativo..."
            );

            const emailResult =
                await this.emailAgent.notifyAdmin(result);

            console.log(
                "[createDiagnostico] Correo administrativo enviado"
            );
            console.dir(emailResult, { depth: null });

            return {
                ...result,
                email: emailResult
            };

        }

        catch(error){

            console.error(
                "[createDiagnostico] ERROR"
            );

            console.error(error);

            throw error;

        }

    }

    async getDiagnostico(id){

        console.log("\n----------------------------------------");

        console.log(
            "[getDiagnostico] Buscando ID:",
            id
        );

        try{

            const diagnostico =
                await this.repository.findById(id);

            console.log(
                "[getDiagnostico] Resultado:"
            );

            console.dir(
                diagnostico,
                { depth:null }
            );

            return diagnostico;

        }

        catch(error){

            console.error(
                "[getDiagnostico] ERROR"
            );

            console.error(error);

            throw error;

        }

    }

    async listDiagnosticos(query = {}){

        console.log("\n----------------------------------------");

        console.log(
            "[listDiagnosticos] Consultando..."
        );

        try{

            const rows =
                await this.repository.list(query);

            console.log(
                `[listDiagnosticos] Total registros: ${rows.length}`
            );

            return rows;

        }

        catch(error){

            console.error(
                "[listDiagnosticos] ERROR"
            );

            console.error(error);

            throw error;

        }

    }

    async sendEmail(id, recipient){

        console.log("\n========================================");

        console.log(
            "[sendEmail] Preparando envío..."
        );

        console.log(
            "ID:",
            id
        );

        console.log(
            "Destino:",
            recipient
        );

        try{

            const diagnostico =
                await this.getDiagnostico(id);

            if(!diagnostico){

                console.error(
                    "[sendEmail] Diagnóstico no encontrado."
                );

                throw new Error(
                    "Diagnóstico no encontrado"
                );

            }

            console.log(
                "[sendEmail] Diagnóstico localizado."
            );

            console.log(
                "[sendEmail] Enviando correo..."
            );

            const result =
                await this.emailService.send({

                    to:recipient,

                    subject:
                        "Diagnóstico Empresarial",

                    data:
                        diagnostico

                });

            console.log(
                "[sendEmail] Resultado:"
            );

            console.dir(
                result,
                { depth:null }
            );

            console.log(
                "[sendEmail] OK"
            );

            return result;

        }

        catch(error){

            console.error(
                "[sendEmail] ERROR"
            );

            console.error(error);

            throw error;

        }

    }

}

export default DiagnosticoController;