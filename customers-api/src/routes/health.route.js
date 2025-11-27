import { Router } from 'express';

const router = Router();

/**
 * GET /health
 * Respuesta simple para saber si el servicio está arriba.
 */
router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'customers-api',
    timestamp: new Date().toISOString(),
  });
});

export default router;
