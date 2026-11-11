import express from 'express';
import { body, validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@diagnostico.local';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret_2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '2h';

function createAuthRouter() {
  const router = express.Router();

  router.post(
    '/login',
    body('email').isEmail().withMessage('Email inválido'),
    body('password').notEmpty().withMessage('Password requerido'),
    (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { email, password } = req.body;

      if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
        return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
      }

      const token = jwt.sign({ email: ADMIN_EMAIL, role: 'admin' }, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN
      });

      return res.json({ success: true, token, expiresIn: JWT_EXPIRES_IN, user: { email: ADMIN_EMAIL } });
    }
  );

  return router;
}

export default createAuthRouter;
