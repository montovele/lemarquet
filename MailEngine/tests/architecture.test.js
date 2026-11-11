import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import DiagnosticoRepository from '../repositories/DiagnosticoRepository.js';
import DiagnosticoController from '../controllers/DiagnosticoController.js';
import EmailService from '../services/EmailService.js';
import createDiagnosticoRouter from '../routes/diagnostico.routes.js';

test('el repositorio crea y lista diagnósticos persistidos', async () => {
  const storageFile = path.join(__dirname, '..', 'data', 'test-diagnosticos.json');
  fs.rmSync(storageFile, { force: true });

  const repository = new DiagnosticoRepository({ storageFilePath: storageFile });
  const created = await repository.create({ empresa: 'Acme', resumen: 'Revisión inicial' });

  assert.ok(created.id);
  assert.equal(created.empresa, 'Acme');

  const list = await repository.list();
  assert.equal(list.length, 1);
  assert.equal(list[0].empresa, 'Acme');
});

test('el controlador envía un correo con plantilla renderizada', async () => {
  const storageFile = path.join(__dirname, '..', 'data', 'test-diagnosticos-email.json');
  fs.rmSync(storageFile, { force: true });

  const repository = new DiagnosticoRepository({ storageFilePath: storageFile });
  const controller = new DiagnosticoController({ repository, emailService: new EmailService() });

  const created = await controller.createDiagnostico({ empresa: 'Beta', resumen: 'Análisis de negocio' });
  const result = await controller.sendEmail(created.id, 'cliente@example.com');

  assert.equal(result.ok, true);
  assert.match(result.html, /Beta/);
  assert.match(result.html, /Análisis de negocio/);
});

test('el controlador transforma el payload del frontend al esquema de la tabla', async () => {
  const repository = {
    create: async (payload) => payload
  };

  const controller = new DiagnosticoController({ repository, emailService: new EmailService() });
  const created = await controller.createDiagnostico({
    empresa: 'Acme',
    contacto: 'Ana',
    correo: 'ana@acme.com',
    telefono: '555',
    ciudad: 'CDMX',
    estado: 'CDMX',
    giro: 'Software',
    tipo_empresa: 'Pyme',
    empleados: 10,
    sucursales: 2,
    antiguedad: 3,
    objetivo: 'Crecimiento',
    soluciones: ['ERP'],
    erp: 'SAP',
    crm: 'HubSpot',
    website: 'https://acme.com',
    ecommerce: 'Shopify',
    presupuesto: '50k',
    fecha: '2026-08-01',
    observaciones: 'Prueba',
    privacy: true
  });

  assert.equal(created.empresa, 'Acme');
  assert.equal(created.correo, 'ana@acme.com');
  assert.equal(created.fecha_inicio, '2026-08-01');
  assert.equal(created.privacy, 1);
  assert.equal(created.status, 'nuevo');
});

test('la ruta expone handlers funcionales para cada operación', () => {
  const controller = {
    createDiagnostico: async (payload) => ({ ok: true, payload }),
    getDiagnostico: async (id) => ({ ok: true, id }),
    listDiagnosticos: async () => ({ ok: true, items: [] })
  };

  const router = createDiagnosticoRouter({ controller });

  assert.equal(router.prefix, '/diagnosticos');
  assert.equal(router.routes.length, 4);
  assert.equal(router.routes[0].method, 'POST');
  assert.equal(router.routes[1].path, '/diagnosticos/:id');
  assert.equal(router.routes[3].path, '/diagnosticos/:id/send-email');
});
