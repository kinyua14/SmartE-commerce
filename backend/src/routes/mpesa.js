// src/routes/mpesa.js
import express from 'express';
import { requireAuth } from '@clerk/express';
import {
  createOrderAndPay,
  initiatePayment,
  mpesaCallback,
  checkPaymentStatus,
  getUserOrders,
  getSellerOrders,
  getOrderDetails,
  getSellerStats,
  getBuyerStats,
  cancelOrder,
  queryPaymentStatus,
  getTestCredentials
} from '../controllers/mpesaController.js';

const router = express.Router();


// Public Routes (No Authentication Required)


// M-Pesa callback endpoint - Safaricom calls this
// IMPORTANT: This must be publicly accessible
router.post('/callback', mpesaCallback);

// Get test credentials (only available in development)
router.get('/test-credentials', getTestCredentials);

// Query payment status by checkout request ID (public for callback verification)
router.get('/query/:checkoutRequestId', queryPaymentStatus);


// Protected Routes (Authentication Required)


// Create order and initiate payment in one step
router.post('/create-and-pay', requireAuth(), createOrderAndPay);

// Initiate payment for existing order
router.post('/initiate', requireAuth(), initiatePayment);

// Check payment status for an order
router.get('/status/:orderId', requireAuth(), checkPaymentStatus);

// Get user's orders (buyer)
router.get('/my-orders', requireAuth(), getUserOrders);

// Get seller's orders
router.get('/seller/orders', requireAuth(), getSellerOrders);

// Get seller statistics
router.get('/seller/stats', requireAuth(), getSellerStats);

// Get buyer statistics
router.get('/buyer/stats', requireAuth(), getBuyerStats);

// Get single order details
router.get('/order/:orderId', requireAuth(), getOrderDetails);

// Cancel an order
router.delete('/order/:orderId/cancel', requireAuth(), cancelOrder);


// Optional: Webhook verification endpoint

router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    environment: process.env.MPESA_ENVIRONMENT || 'sandbox',
    timestamp: new Date().toISOString()
  });
});

export default router;