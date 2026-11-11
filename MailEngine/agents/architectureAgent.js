import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ArchitectureAgent {
  constructor({ rootDir = path.resolve(__dirname, '..') } = {}) {
    this.rootDir = rootDir;
    this.requiredDirectories = ['controllers', 'repositories', 'services', 'routes', 'templates', 'agents'];
    this.requiredFiles = {
      controllers: path.join(this.rootDir, 'controllers', 'DiagnosticoController.js'),
      repositories: path.join(this.rootDir, 'repositories', 'DiagnosticoRepository.js'),
      services: path.join(this.rootDir, 'services', 'EmailService.js'),
      routes: path.join(this.rootDir, 'routes', 'diagnostico.routes.js'),
      templates: path.join(this.rootDir, 'templates', 'diagnosticoEmail.html')
    };
  }

  ensureBaseStructure() {
    const created = [];
    for (const directory of this.requiredDirectories) {
      const absolutePath = path.join(this.rootDir, directory);
      if (!fs.existsSync(absolutePath)) {
        fs.mkdirSync(absolutePath, { recursive: true });
        created.push(directory);
      }
    }
    return { created, directories: this.requiredDirectories };
  }

  ensureCoreModules() {
    const controllerContent = `import DiagnosticoRepository from '../repositories/DiagnosticoRepository.js';
import EmailService from '../services/EmailService.js';

class DiagnosticoController {
  constructor({ repository, emailService } = {}) {
    this.repository = repository || new DiagnosticoRepository();
    this.emailService = emailService || new EmailService();
  }

  async createDiagnostico(payload) {
    return this.repository.create(payload);
  }

  async getDiagnostico(id) {
    return this.repository.findById(id);
  }

  async listDiagnosticos() {
    return this.repository.list();
  }

  async sendEmail(id, recipient) {
    const diagnostico = await this.getDiagnostico(id);
    if (!diagnostico) {
      throw new Error('Diagnóstico no encontrado');
    }

    return this.emailService.send({
      to: recipient,
      subject: 'Diagnóstico Empresarial',
      data: diagnostico
    });
  }
}

export default DiagnosticoController;
`;

    const repositoryContent = `import fs from 'node:fs';
import path from 'node:path';

class DiagnosticoRepository {
  constructor({ storage, storageFilePath } = {}) {
    this.storage = storage || [];
    this.storageFilePath = storageFilePath || path.join(__dirname, '..', 'data', 'diagnosticos.json');
    this.ensureStorageFile();
  }

  ensureStorageFile() {
    const directory = path.dirname(this.storageFilePath);
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }

    if (!fs.existsSync(this.storageFilePath)) {
      fs.writeFileSync(this.storageFilePath, '[]', 'utf8');
    }
  }

  readStorage() {
    const raw = fs.readFileSync(this.storageFilePath, 'utf8');
    return JSON.parse(raw);
  }

  writeStorage(items) {
    fs.writeFileSync(this.storageFilePath, JSON.stringify(items, null, 2), 'utf8');
  }

  async create(payload) {
    const items = this.readStorage();
    const item = {
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      ...payload
    };

    items.push(item);
    this.writeStorage(items);
    return item;
  }

  async findById(id) {
    const items = this.readStorage();
    return items.find((item) => item.id === id) || null;
  }

  async list() {
    return this.readStorage();
  }
}

export default DiagnosticoRepository;
`;

    const serviceContent = `import fs from 'node:fs';
import path from 'node:path';

class EmailService {
  constructor({ templatePath } = {}) {
    this.templatePath = templatePath || path.join(__dirname, '..', 'templates', 'diagnosticoEmail.html');
  }

  renderTemplate(data = {}) {
    const template = fs.readFileSync(this.templatePath, 'utf8');
    return template
      .replace('{{empresa}}', data.empresa || 'Empresa')
      .replace('{{resumen}}', data.resumen || 'Resumen no disponible');
  }

  async send({ to, subject, data }) {
    const html = this.renderTemplate(data || {});
    return {
      ok: true,
      to,
      subject,
      html,
      sentAt: new Date().toISOString()
    };
  }
}

export default EmailService;
`;

    const routeContent = `import DiagnosticoController from '../controllers/DiagnosticoController.js';

function createDiagnosticoRouter({ controller } = {}) {
  const diagnosticsController = controller || new DiagnosticoController();

  return {
    prefix: '/diagnosticos',
    routes: [
      {
        method: 'POST',
        path: '/diagnosticos',
        handler: async (req) => diagnosticsController.createDiagnostico(req.body)
      },
      {
        method: 'GET',
        path: '/diagnosticos/:id',
        handler: async (req) => diagnosticsController.getDiagnostico(req.params.id)
      },
      {
        method: 'GET',
        path: '/diagnosticos',
        handler: async () => diagnosticsController.listDiagnosticos()
      },
      {
        method: 'POST',
        path: '/diagnosticos/:id/send-email',
        handler: async (req) => diagnosticsController.sendEmail(req.params.id, req.body?.recipient)
      }
    ]
  };
}

export default createDiagnosticoRouter;
`;

    const templateContent = `<html>
  <body>
    <h1>Diagnóstico Empresarial</h1>
    <p>Empresa: {{empresa}}</p>
    <p>Resumen: {{resumen}}</p>
  </body>
</html>
`;

    const filesToWrite = [
      { path: this.requiredFiles.controllers, content: controllerContent },
      { path: this.requiredFiles.repositories, content: repositoryContent },
      { path: this.requiredFiles.services, content: serviceContent },
      { path: this.requiredFiles.routes, content: routeContent },
      { path: this.requiredFiles.templates, content: templateContent }
    ];

    const written = [];
    for (const file of filesToWrite) {
      fs.writeFileSync(file.path, file.content, 'utf8');
      written.push(path.relative(this.rootDir, file.path));
    }

    return { written };
  }

  validateArchitecture() {
    const checks = [];
    const violations = [];

    for (const [layer, absolutePath] of Object.entries(this.requiredFiles)) {
      const exists = fs.existsSync(absolutePath);
      checks.push({ layer, exists });
      if (!exists) {
        violations.push(`Falta ${layer}: ${path.relative(this.rootDir, absolutePath)}`);
      }
    }

    if (fs.existsSync(this.requiredFiles.controllers)) {
      const controllerContent = fs.readFileSync(this.requiredFiles.controllers, 'utf8');
      const hasSeparation = controllerContent.includes("import DiagnosticoRepository from '../repositories/DiagnosticoRepository.js'") && controllerContent.includes("import EmailService from '../services/EmailService.js'");
      checks.push({ layer: 'controller-separation', exists: hasSeparation });
      if (!hasSeparation) {
        violations.push('El controlador no separa correctamente responsabilidades');
      }
    }

    if (fs.existsSync(this.requiredFiles.repositories)) {
      const repositoryContent = fs.readFileSync(this.requiredFiles.repositories, 'utf8');
      const hasRepositoryMethods = repositoryContent.includes('async create(payload)') && repositoryContent.includes('async findById(id)') && repositoryContent.includes('async list()');
      checks.push({ layer: 'repository-contract', exists: hasRepositoryMethods });
      if (!hasRepositoryMethods) {
        violations.push('El repositorio no expone un contrato claro de persistencia');
      }
    }

    if (fs.existsSync(this.requiredFiles.services)) {
      const serviceContent = fs.readFileSync(this.requiredFiles.services, 'utf8');
      const hasEmailContract = serviceContent.includes('renderTemplate') && serviceContent.includes('async send');
      checks.push({ layer: 'service-contract', exists: hasEmailContract });
      if (!hasEmailContract) {
        violations.push('El servicio de correo no sigue un contrato claro');
      }
    }

    if (fs.existsSync(this.requiredFiles.routes)) {
      const routeContent = fs.readFileSync(this.requiredFiles.routes, 'utf8');
      const usesController = routeContent.includes("import DiagnosticoController from '../controllers/DiagnosticoController.js'");
      checks.push({ layer: 'route-controller-binding', exists: usesController });
      if (!usesController) {
        violations.push('La ruta no está conectada al controlador');
      }
    }

    return {
      ok: violations.length === 0,
      checks,
      violations,
      summary: {
        structure: {
          controllers: fs.existsSync(this.requiredFiles.controllers),
          repositories: fs.existsSync(this.requiredFiles.repositories),
          services: fs.existsSync(this.requiredFiles.services),
          routes: fs.existsSync(this.requiredFiles.routes),
          templates: fs.existsSync(this.requiredFiles.templates)
        }
      }
    };
  }

  run() {
    const structure = this.ensureBaseStructure();
    const modules = this.ensureCoreModules();
    const report = this.validateArchitecture();

    return { structure, modules, report };
  }
}

if (require.main === module) {
  const agent = new ArchitectureAgent();
  const result = agent.run();
  console.log(JSON.stringify(result, null, 2));
}

export { ArchitectureAgent };
