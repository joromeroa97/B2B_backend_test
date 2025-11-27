// Servicio de autenticacion para orders-api
import { SERVICE_TOKEN } from '../config/env.js';

export function serviceAuth(req, res, next) {
  const authHeader = req.headers['authorization'] || '';
  const [, token] = authHeader.split(' ');

  if (!SERVICE_TOKEN) {
    console.error('[orders-api] SERVICE_TOKEN not defined');
    return res.status(500).json({
      error: { message: 'Server misconfiguration: SERVICE_TOKEN not set' },
    });
  }

  if (!token || token !== SERVICE_TOKEN) {
    return res.status(401).json({
      error: { message: 'Unauthorized internal service' },
    });
  }

  req.isInternalCall = true;
  next();
}
