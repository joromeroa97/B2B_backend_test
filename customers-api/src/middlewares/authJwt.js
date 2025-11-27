import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/env.js';

export function authJwt(req, res, next) {
  const authHeader = req.headers['authorization'] || '';
  const [, token] = authHeader.split(' '); // "Bearer <token>"

  if (!token) {
    return res.status(401).json({
      error: { message: 'Missing Authorization token' },
    });
  }

  if (!JWT_SECRET) {
    console.error('JWT_SECRET not defined');
    return res.status(500).json({
      error: { message: 'Server misconfiguration: JWT_SECRET not set' },
    });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    console.error('JWT error:', err.message);
    return res.status(401).json({
      error: { message: 'Invalid or expired token' },
    });
  }
}
