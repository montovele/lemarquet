import express from 'express';
import { body, param, query, validationResult } from 'express-validator';

function createDiagnosticoRouter({ controller } = {}) {
  const diagnosticsController = controller;
  const router = express.Router();

  const validate = (validators) => async (req, res, next) => {
    console.log('\n--------------------------------------------------');
    console.log(`[VALIDATOR] Iniciando validación para: ${req.method} ${req.originalUrl}`);
    console.log('[VALIDATOR] Headers recibidos:', JSON.stringify({
      authorization: req.headers.authorization ? 'Bearer [TOKEN_PRESENTE]' : 'NO_PRESENTE',
      'content-type': req.headers['content-type']
    }));
    console.log('[VALIDATOR] req.body recibido:', JSON.stringify(req.body, null, 2));

    // Ejecutar todas las reglas de validación
    await Promise.all(validators.map((validator) => validator.run(req)));
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      const errorList = errors.array();
      console.warn('❌ [VALIDATOR ERROR] Se encontraron errores de validación:');
      console.warn(JSON.stringify(errorList, null, 2));
      console.log('--------------------------------------------------\n');

      return res.status(400).json({
        success: false,
        message: 'Error de validación en la petición',
        errors: errorList
      });
    }

    console.log('✅ [VALIDATOR SUCCESS] Petición válida, pasando al controlador.');
    console.log('--------------------------------------------------\n');
    next();
  };

router.post(
  '/',
  validate([
    body('formulario.empresa').notEmpty().withMessage('Empresa es obligatoria'),
    body('formulario.correo').isEmail().withMessage('Correo inválido'),
    body('formulario.objetivo').notEmpty().withMessage('Objetivo es obligatorio'),
    body('privacy').isBoolean().withMessage('Privacy debe ser booleano').optional()
  ]),
  async (req, res, next) => {
    try {
      const result = await diagnosticsController.createDiagnostico(req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
);

  router.get(
    '/',
    validate([
      query('page').optional().isInt({ min: 1 }).withMessage('Page debe ser entero mayor o igual a 1'),
      query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit debe ser entero entre 1 y 100')
    ]),
    async (req, res, next) => {
      try {
        const result = await diagnosticsController.listDiagnosticos(req.query);
        res.json(result);
      } catch (error) {
        next(error);
      }
    }
  );

  router.get(
    '/:id',
    validate([param('id').notEmpty().withMessage('ID es obligatorio')]),
    async (req, res, next) => {
      try {
        const result = await diagnosticsController.getDiagnostico(req.params.id);
        if (!result) {
          return res.status(404).json({ success: false, message: 'Diagnóstico no encontrado' });
        }
        res.json(result);
      } catch (error) {
        next(error);
      }
    }
  );

  router.post(
    '/:id/send-email',
    validate([
      param('id').notEmpty().withMessage('ID es obligatorio'),
      body('recipient').isEmail().withMessage('Correo destinatario inválido')
    ]),
    async (req, res, next) => {
      try {
        const result = await diagnosticsController.sendEmail(req.params.id, req.body.recipient);
        res.json(result);
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
}

export default createDiagnosticoRouter;
