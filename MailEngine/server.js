import dotenv from 'dotenv';
import express from 'express';
import morgan from 'morgan';
import createDiagnosticoRouter from './routes/diagnostico.routes.js';
import createAuthRouter from './routes/auth.routes.js';
import DiagnosticoController from './controllers/DiagnosticoController.js';
import authenticate from './middleware/auth.js';
import db from './services/db.js';

dotenv.config();

const app = express();

app.use(morgan('dev'));
app.use(express.json());

app.use((req, res, next) => {
  const origin = req.headers.origin || '*';
  res.header('Access-Control-Allow-Origin', origin);
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Vary', 'Origin');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
});

app.get('/health', (req, res) => {
  res.json({ success: true, status: 'ok' });
});

const diagnosticoController = new DiagnosticoController();

app.use('/auth', createAuthRouter());
app.use('/diagnosticos',  createDiagnosticoRouter({ controller: diagnosticoController }));

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Ruta no encontrada' });
});

app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: err.message || 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
  });
});

const PORT = process.env.PORT || 3010;

(async () => {
  try {
    await db.initializeSchema();
    app.listen(PORT, () => {
      console.log('======================================================');
      console.log(' DIAGNOSTICO EMPRESARIAL API');
      console.log('======================================================');
      console.log(`[BOOT] Servidor iniciado en http://localhost:${PORT}`);
      console.log('[BOOT] Router y controladores listos');
    });
  } catch (error) {
    console.error('Error al inicializar la base de datos', error);
    process.exit(1);
  }
})();
