import { Router } from 'express';
import { authJwt } from '../middlewares/authJwt.js';
import { serviceAuth } from '../middlewares/serviceAuth.js';
import {
  createCustomer,
  getCustomerById,
  listCustomers,
  updateCustomer,
  deleteCustomer,
} from '../controllers/customer.controller.js';

const router = Router();

// Rutas públicas protegidas por JWT (
router.post('/', authJwt, createCustomer);
router.get('/', authJwt, listCustomers);
router.get('/:id', authJwt, getCustomerById);
router.put('/:id', authJwt, updateCustomer);
router.delete('/:id', authJwt, deleteCustomer);

// Endpoint interno: GET /internal/customers/:id
// Usa SERVICE_TOKEN en lugar de JWT
router.get(
  '/internal/:id',
  serviceAuth,
  async (req, res, next) => {
    // reaprovechamos la lógica de getCustomerById, pero cambiando el param
    try {
      req.params.id = req.params.id;
      await getCustomerById(req, res, next);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
