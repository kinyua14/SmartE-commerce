import express from 'express';
import { requireAuth } from '@clerk/express';
import {
  postToN8n,
  testN8nConnection,
  getN8nStatus
} from '../controllers/n8nController.js';

const router = express.Router();

router.use(requireAuth());

router.use((req, res, next) => {
  console.log('🔥 n8n route hit');
  console.log('🔥 Authorization header:', req.headers.authorization ? '✅ exists' : '❌ missing');
  next();
});

router.post('/product', postToN8n);
router.get('/test', testN8nConnection);
router.get('/status', getN8nStatus);

export default router;