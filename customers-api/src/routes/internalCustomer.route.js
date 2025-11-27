import { Router } from 'express';
import { serviceAuth } from '../middlewares/serviceAuth.js';
import { getCustomerById } from '../controllers/customer.controller.js';

const router = Router();

// GET /internal/customers/:id
router.get('/:id', serviceAuth, getCustomerById);

export default router;
