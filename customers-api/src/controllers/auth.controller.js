// Controllador para la autenticacion

import jwt from 'jsonwebtoken';
import { JWT_SECRET, ADMIN_USER, ADMIN_PASSWORD } from '../config/env.js';

export async function login(req, res) {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({
      error: { message: 'username and password are required' },
    });
  }

  if (username !== ADMIN_USER || password !== ADMIN_PASSWORD) {
    return res.status(401).json({
      error: { message: 'Invalid credentials' },
    });
  }

  if (!JWT_SECRET) {
    console.error('JWT_SECRET not defined');
    return res.status(500).json({
      error: { message: 'Server misconfiguration: JWT_SECRET not set' },
    });
  }

  const payload = {
    sub: username,
    role: 'admin',
  };

  const token = jwt.sign(payload, JWT_SECRET, {
    expiresIn: '1h',
  });

  return res.json({
    access_token: token,
    token_type: 'Bearer',
    expires_in: 3600,
  });
}
