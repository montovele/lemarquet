import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "..", "..", ".env") });
dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

class EmailService {
constructor({ templatePath, transporter } = {}) {

    this.templatePath =
        templatePath ??
        path.join(
            __dirname,
            "..",
            "templates",
            "diagnosticoEmail.html"
        );

    this.template = fs.readFileSync(
        this.templatePath,
        "utf8"
    );

    this.transporter =
        transporter ??
        this.createTransporter();

}
createTransporter() {
const port = Number(process.env.SMTP_PORT || process.env.SMTP_PORT_HostGator || 587);
const config = {

    host: process.env.SMTP_HOST || process.env.SMTP_HOST_HostGator,

    port,

    secure: (process.env.SMTP_SECURE || process.env.SMTP_SECURE_HostGator || String(port === 465)) === "true",

    requireTLS:
        (process.env.SMTP_REQUIRE_TLS || process.env.SMTP_REQUIRE_TLS_HostGator || String(port === 587)) === "true",

    ignoreTLS:
        (process.env.SMTP_IGNORE_TLS || process.env.SMTP_IGNORE_TLS_HostGator) === "true",

    auth: {

        user: process.env.SMTP_USER || process.env.SMTP_USER_HostGator,

        pass: process.env.SMTP_PASS || process.env.SMTP_PASS_HostGator

    },

    connectionTimeout:10000,

    greetingTimeout:5000,

    socketTimeout:10000,

    logger:false,

    debug:false,

    tls:{

        rejectUnauthorized:true

    }

};

    const transporter =
        nodemailer.createTransport(config);

    transporter.verify((error, success)=>{

        if(error){

            console.error("SMTP VERIFY ERROR", {
                code: error.code || error.cause?.code || "UNKNOWN",
                responseCode: error.responseCode || null,
                command: error.command || null
            });

        }

        else{

            console.log("SMTP READY");

        }

    });

    return transporter;

}
normalizeData(data = {}) {

    let observaciones = {};
  let  observacionesHtml
    try {

        observaciones =
            typeof data.observaciones === "string"

                ? JSON.parse(data.observaciones)

                : (data.observaciones ?? {});

                 observacionesHtml =
    this.buildObservacionesHtml(
        observaciones
    );

    }

    catch {

        observaciones = {};

    }
return {

    ...data,

    empresa:
        data.empresa ?? "No especificada",

    contacto:
        data.contacto ?? "No especificado",

    correo:
        data.correo ?? "No especificado",

    telefono:
        data.telefono ?? "No especificado",

    ciudad:
        data.ciudad ?? "No especificada",

    estado:
        data.estado ?? "No especificado",

    giro:
        data.giro ?? "No especificado",

    tipo_empresa:
        data.tipo_empresa ?? "No especificado",

    empleados:
        data.empleados ?? 0,

    sucursales:
        data.sucursales ?? 0,

    antiguedad:
        data.antiguedad ?? 0,

    objetivo:
        data.objetivo ?? "No especificado",

    soluciones:
        Array.isArray(data.soluciones)
            ? data.soluciones.join(", ")
            : (data.soluciones ?? "No especificado"),

    erp:
        data.erp ?? "No especificado",

    crm:
        data.crm ?? "No especificado",

    website:
        data.website ?? "No especificado",

    ecommerce:
        data.ecommerce ?? "No especificado",

    presupuesto:
        data.presupuesto ?? "No especificado",

    fecha_inicio:
        data.fecha_inicio
            ? new Date(data.fecha_inicio).toLocaleDateString("es-MX")
            : "No especificada",

    resumen:
        data.resumen ??
        data.objetivo ??
        "Sin resumen",

    privacy:
        data.privacy ? "Sí" : "No",

    // ESTA ES LA PARTE IMPORTANTE
    observaciones: observacionesHtml

};

}
buildCard(title, text) {

    return `
        <div style="
            margin-bottom:14px;
            border:1px solid #e5e7eb;
            border-radius:8px;
            padding:14px;
            background:#f8fafc;
        ">

            <div style="
                font-weight:bold;
                color:#334155;
                margin-bottom:8px;
            ">
                ${title}
            </div>

            <div style="
                color:#475569;
                white-space:pre-wrap;
            ">
                ${text}
            </div>

        </div>
    `;

}
buildObservacionesHtml(observaciones = {}) {

    const html = [];

    // ----------------------------------
    // NIVEL DE SERVICIO
    // ----------------------------------

    if (observaciones.nivelServicio?.nivelServicio) {

        html.push(`
            <div style="
                background:#eff6ff;
                border-left:4px solid #2563eb;
                padding:14px;
                margin-bottom:18px;
                border-radius:6px;
            ">
                <div style="
                    font-size:12px;
                    color:#64748b;
                    text-transform:uppercase;
                    font-weight:bold;
                ">
                    Nivel de Servicio
                </div>

                <div style="
                    font-size:18px;
                    color:#1d4ed8;
                    font-weight:bold;
                    margin-top:4px;
                ">
                    ${observaciones.nivelServicio.nivelServicio}
                </div>
            </div>
        `);

    }

    // ----------------------------------
    // OPERACIÓN PEQUEÑA
    // ----------------------------------

    if (observaciones.pequena?.detallePequena) {

        html.push(this.buildCard(
            "Operación pequeña",
            observaciones.pequena.detallePequena
        ));

    }

    // ----------------------------------

    if (observaciones.mediana?.detalleMediana) {

        html.push(this.buildCard(
            "Operación mediana",
            observaciones.mediana.detalleMediana
        ));

    }

    // ----------------------------------

    if (observaciones.grande?.detalleGrande) {

        html.push(this.buildCard(
            "Operación corporativa",
            observaciones.grande.detalleGrande
        ));

    }

    return html.join("");

}
renderTemplate(data = {}) {

    const normalized =
        this.normalizeData(data);

    return this.template.replace(

        /\{\{(.*?)\}\}/g,

        (_, key) => {

            key = key.trim();

            return normalized[key] ?? "";

        }

    );

}

  async send({ to, subject, data }) {
    const html = this.renderTemplate(data || {});

    if (!this.transporter) {
      return {
        ok: true,
        mode: 'simulated',
        to,
        subject,
        html,
        sentAt: new Date().toISOString()
      };
    }

    const info = await this.transporter.sendMail({
     from: {

    name:
        process.env.SMTP_FROM_NAME || process.env.SMTP_FROM_NAME_HostGator || "Lemarquet",

    address:
        process.env.SMTP_FROM || process.env.SMTP_FROM_HostGator || process.env.SMTP_USER || process.env.SMTP_USER_HostGator

},
      to,
      subject,
      html
    });

    return {
      ok: true,
      mode: 'smtp',
      messageId: info.messageId,
      to,
      subject,
      html,
      sentAt: new Date().toISOString()
    };
  }
}

export default EmailService;
