import { Router } from 'express';

const router = Router();

/**
 * GET /health
 */
router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'orders-api',
    timestamp: new Date().toISOString(),
  });
});

export default router;
