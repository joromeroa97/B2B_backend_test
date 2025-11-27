import { Router } from 'express';
import { authJwt } from '../middlewares/authJwt.js';
import {
  createProduct,
  updateProduct,
  getProductById,
  listProducts,
} from '../controllers/product.controller.js';

const router = Router();

// Todas las rutas se validan con JWT
router.post('/', authJwt, createProduct);
router.patch('/:id', authJwt, updateProduct);
router.get('/:id', authJwt, getProductById);
router.get('/', authJwt, listProducts);

export default router;
