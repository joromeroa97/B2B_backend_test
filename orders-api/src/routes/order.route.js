import { Router } from 'express';
import { authJwt } from '../middlewares/authJwt.js';
import {
  createOrder,
  getOrderById,
  listOrders,
  confirmOrder,
  cancelOrder,
} from '../controllers/order.controller.js';

const router = Router();

// POST /orders
router.post('/', authJwt, createOrder);

// GET /orders/:id
router.get('/:id', authJwt, getOrderById);

// GET /orders
router.get('/', authJwt, listOrders);

// POST /orders/:id/confirm
router.post('/:id/confirm', authJwt, confirmOrder);

// POST /orders/:id/cancel
router.post('/:id/cancel', authJwt, cancelOrder);

export default router;
