// src/routes/products.js 
import express from 'express';
import { requireAuth } from '@clerk/express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  searchProducts
} from '../controllers/productController.js';

const router = express.Router();

router.get('/', getProducts);
router.get('/search', searchProducts);
router.get('/:id', getProductById);
router.post('/', requireAuth(), createProduct);
router.put('/:id', requireAuth(), updateProduct);
router.delete('/:id', requireAuth(), deleteProduct);

export default router;
