// src/controllers/mpesaController.js
import mpesaService from '../services/mpesaService.js';
import Order from '../models/Order.js';
import PaymentTransaction from '../models/PaymentTransaction.js';
import Product from '../models/Product.js';
import User from '../models/User.js';

// Test configuration endpoint
export const testConfig = async (req, res) => {
  console.log('=== TEST CONFIGURATION ENDPOINT ===');
  
  try {
    const userId = req.auth?.()?.userId;
    
    const envVars = {
      consumerKey: process.env.MPESA_CONSUMER_KEY ? '✅ Set (length: ' + process.env.MPESA_CONSUMER_KEY.length + ')' : '❌ Missing',
      consumerSecret: process.env.MPESA_CONSUMER_SECRET ? '✅ Set (length: ' + process.env.MPESA_CONSUMER_SECRET.length + ')' : '❌ Missing',
      shortcode: process.env.MPESA_SHORTCODE || '174379',
      passkey: process.env.MPESA_PASSKEY ? '✅ Set (length: ' + process.env.MPESA_PASSKEY.length + ')' : '❌ Missing',
      environment: process.env.MPESA_ENVIRONMENT || 'sandbox',
      callbackUrl: process.env.MPESA_CALLBACK_URL || '❌ Missing'
    };
    
    console.log('Environment variables check:', envVars);
    
    let tokenStatus = 'Not tested';
    let tokenError = null;
    
    try {
      const mpesaConfig = (await import('../config/mpesa.js')).default;
      const token = await mpesaConfig.getAccessToken();
      tokenStatus = token ? '✅ Working' : '❌ Failed';
      console.log('Access token obtained successfully');
    } catch (err) {
      tokenStatus = `❌ Error: ${err.message}`;
      tokenError = err.message;
      console.error('Token error:', err);
    }
    
    res.status(200).json({
      success: true,
      environment: envVars,
      tokenStatus,
      tokenError,
      userId: userId || 'Not authenticated (test without auth)',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Test config error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Create a new order and initiate payment
export const createOrderAndPay = async (req, res) => {
  console.log('\n========================================');
  console.log('=== CREATE ORDER AND PAY START ===');
  console.log('========================================');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Request body:', JSON.stringify(req.body, null, 2));
  console.log('Auth user:', req.auth?.()?.userId);
  
  try {
    const { 
      productId, 
      phoneNumber,
      quantity = 1
    } = req.body;
    
    const { userId } = req.auth();
    
    if (!productId) {
      console.log('❌ Missing productId');
      return res.status(400).json({
        success: false,
        message: 'Product ID is required'
      });
    }
    
    if (!phoneNumber) {
      console.log('❌ Missing phoneNumber');
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }
    
    console.log('\n📦 Step 1: Getting product details...');
    console.log('Product ID:', productId);
    const product = await Product.findById(productId);
    console.log('Product found:', product ? '✅ Yes' : '❌ No');
    
    if (!product) {
      console.log('❌ Product not found in database');
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    console.log('Product details:', {
      id: product.id,
      name: product.name,
      price: product.price,
      seller_id: product.seller_id
    });
    
    console.log('\n👤 Step 2: Getting buyer details...');
    console.log('User ID:', userId);
    const buyer = await User.findByClerkId(userId);
    console.log('Buyer found:', buyer ? '✅ Yes' : '❌ No');
    
    if (!buyer) {
      console.log('❌ User not found in database');
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    console.log('Buyer details:', {
      id: buyer.id,
      name: buyer.name,
      email: buyer.email,
      role: buyer.role
    });
    
    const totalAmount = product.price * quantity;
    console.log('\n💰 Step 3: Calculating total amount...');
    console.log('Product price:', product.price);
    console.log('Quantity:', quantity);
    console.log('Total amount:', totalAmount);
    
    console.log('\n📝 Step 4: Creating order...');
    const order = await Order.create({
      userId: userId,
      productId: productId,
      sellerId: product.seller_id,
      productName: product.name,
      productPrice: product.price,
      totalAmount: totalAmount,
      paymentMethod: 'mpesa',
      paidAt: null,
      paymentStatus: 'pending'
    });
    
    console.log('✅ Order created successfully!');
    console.log('Order details:', {
      id: order.id,
      userId: order.user_id,
      productId: order.product_id,
      totalAmount: order.total_amount,
      paymentStatus: order.payment_status
    });
    
    console.log('\n📱 Step 5: Initiating M-Pesa STK Push...');
    console.log('Phone number:', phoneNumber);
    console.log('Amount:', totalAmount);
    console.log('Order ID:', order.id);
    console.log('Product name:', product.name);
    
    // ✅ FIX: userId passed as 5th argument so PaymentTransaction gets a real user_id
    const paymentResult = await mpesaService.stkPush(
      phoneNumber,
      totalAmount,
      order.id,
      product.name,
      userId
    );
    
    console.log('\n📤 Payment Result:', JSON.stringify(paymentResult, null, 2));
    
    if (paymentResult.success) {
      console.log('\n✅✅✅ PAYMENT INITIATED SUCCESSFULLY! ✅✅✅');
      console.log('Checkout Request ID:', paymentResult.checkoutRequestId);
      console.log('Merchant Request ID:', paymentResult.merchantRequestId);
      console.log('Order already set to processing inside stkPush via updateCheckoutRequest');
      
      return res.status(200).json({
        success: true,
        message: 'Payment initiated successfully',
        data: {
          orderId: order.id,
          checkoutRequestId: paymentResult.checkoutRequestId,
          amount: totalAmount,
          phoneNumber: phoneNumber,
          productName: product.name
        }
      });
    } else {
      console.log('\n❌❌❌ PAYMENT INITIATION FAILED! ❌❌❌');
      console.log('Error:', paymentResult.error);
      
      return res.status(400).json({
        success: false,
        message: paymentResult.error || 'Failed to initiate payment',
        data: {
          orderId: order.id,
          orderStatus: order.payment_status
        }
      });
    }
    
  } catch (error) {
    console.error('\n💥💥💥 CATASTROPHIC ERROR IN createOrderAndPay 💥💥💥');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
  
  console.log('\n========================================');
  console.log('=== CREATE ORDER AND PAY END ===');
  console.log('========================================\n');
};

// Initiate payment for existing order
export const initiatePayment = async (req, res) => {
  console.log('\n=== INITIATE PAYMENT ===');
  console.log('Request body:', req.body);
  console.log('Auth user:', req.auth?.()?.userId);
  
  try {
    const { orderId, phoneNumber } = req.body;
    const { userId } = req.auth();
    
    if (!orderId || !phoneNumber) {
      console.log('❌ Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Order ID and phone number are required'
      });
    }
    
    console.log('Getting order details...');
    const order = await Order.findById(orderId);
    if (!order) {
      console.log('❌ Order not found');
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    console.log('Order found:', {
      id: order.id,
      userId: order.user_id,
      paymentStatus: order.payment_status
    });
    
    if (order.user_id !== userId) {
      console.log('❌ Unauthorized access');
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: This order does not belong to you'
      });
    }
    
    if (order.payment_status === 'paid') {
      console.log('❌ Order already paid');
      return res.status(400).json({
        success: false,
        message: 'Order already paid'
      });
    }
    
    if (order.payment_status === 'processing') {
      console.log('❌ Payment already in progress');
      return res.status(400).json({
        success: false,
        message: 'Payment already in progress'
      });
    }
    
    const product = await Product.findById(order.product_id);
    
    console.log('Initiating M-Pesa payment...');
    // ✅ FIX: userId passed as 5th argument so PaymentTransaction gets a real user_id
    const paymentResult = await mpesaService.stkPush(
      phoneNumber,
      order.total_amount,
      order.id,
      product?.name || 'Order Payment',
      userId
    );
    
    console.log('Payment result:', paymentResult);
    
    if (paymentResult.success) {
      res.status(200).json({
        success: true,
        message: 'Payment initiated successfully',
        data: {
          orderId: order.id,
          checkoutRequestId: paymentResult.checkoutRequestId,
          amount: order.total_amount
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: paymentResult.error || 'Failed to initiate payment'
      });
    }
    
  } catch (error) {
    console.error('Initiate payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Handle M-Pesa callback
export const mpesaCallback = async (req, res) => {
  console.log('\n=== M-PESA CALLBACK RECEIVED ===');
  console.log('Full callback payload:', JSON.stringify(req.body, null, 2));
  
  try {
    const result = await mpesaService.processCallback(req.body);
    console.log('Callback processing result:', result);
    
    res.status(200).json({
      message: 'Callback processed successfully',
      result: result
    });
    
  } catch (error) {
    console.error('Callback processing error:', error);
    res.status(200).json({
      message: 'Error logged',
      error: error.message
    });
  }
};

// Check payment status
export const checkPaymentStatus = async (req, res) => {
  console.log('\n=== CHECK PAYMENT STATUS ===');
  console.log('Order ID:', req.params.orderId);
  console.log('Auth user:', req.auth?.()?.userId);
  
  try {
    const { orderId } = req.params;
    const { userId } = req.auth();
    
    const order = await Order.findById(orderId);
    if (!order) {
      console.log('❌ Order not found');
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    if (order.user_id !== userId) {
      console.log('❌ Unauthorized access');
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }
    
    const transactions = await PaymentTransaction.findByOrderId(orderId);
    const latestTransaction = transactions[0];
    
    console.log('Payment status:', order.payment_status);
    console.log('Has transaction:', !!latestTransaction);
    
    res.status(200).json({
      success: true,
      data: {
        orderId: order.id,
        paymentStatus: order.payment_status,
        paidAt: order.paid_at,
        mpesaReceiptNumber: order.mpesa_receipt_number,
        transaction: latestTransaction ? {
          status: latestTransaction.status,
          checkoutRequestId: latestTransaction.checkout_request_id,
          amount: latestTransaction.amount,
          createdAt: latestTransaction.created_at
        } : null
      }
    });
    
  } catch (error) {
    console.error('Check payment status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get user orders
export const getUserOrders = async (req, res) => {
  try {
    const { userId } = req.auth();
    const orders = await Order.findByUserId(userId);
    
    res.status(200).json({
      success: true,
      data: orders
    });
    
  } catch (error) {
    console.error('Get user orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get seller orders
export const getSellerOrders = async (req, res) => {
  try {
    const { userId } = req.auth();
    const user = await User.findByClerkId(userId);
    
    if (!user || user.role !== 'seller') {
      return res.status(403).json({
        success: false,
        message: 'Only sellers can access this endpoint'
      });
    }
    
    const orders = await Order.findBySellerId(userId);
    
    res.status(200).json({
      success: true,
      data: orders
    });
    
  } catch (error) {
    console.error('Get seller orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get single order details
export const getOrderDetails = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { userId } = req.auth();
    
    const order = await Order.findByIdWithDetails(orderId);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    if (order.user_id !== userId && order.seller_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to view this order'
      });
    }
    
    const transactions = await PaymentTransaction.findByOrderId(orderId);
    
    res.status(200).json({
      success: true,
      data: {
        ...order,
        transactions: transactions
      }
    });
    
  } catch (error) {
    console.error('Get order details error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get seller statistics
export const getSellerStats = async (req, res) => {
  try {
    const { userId } = req.auth();
    const user = await User.findByClerkId(userId);
    
    if (!user || user.role !== 'seller') {
      return res.status(403).json({
        success: false,
        message: 'Only sellers can access this endpoint'
      });
    }
    
    const stats = await Order.getSellerStats(userId);
    
    res.status(200).json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    console.error('Get seller stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get buyer statistics
export const getBuyerStats = async (req, res) => {
  try {
    const { userId } = req.auth();
    const stats = await Order.getBuyerStats(userId);
    
    res.status(200).json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    console.error('Get buyer stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Cancel order
export const cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { userId } = req.auth();
    
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    const user = await User.findByClerkId(userId);
    const userRole = user?.role || 'buyer';
    
    const cancelledOrder = await Order.cancelOrder(orderId, userId, userRole);
    
    res.status(200).json({
      success: true,
      message: 'Order cancelled successfully',
      data: cancelledOrder
    });
    
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to cancel order'
    });
  }
};

// Query payment status by checkout request ID
export const queryPaymentStatus = async (req, res) => {
  try {
    const { checkoutRequestId } = req.params;
    const result = await mpesaService.queryPaymentStatus(checkoutRequestId);
    
    res.status(200).json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error('Query payment status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get test credentials (only for development)
export const getTestCredentials = async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        message: 'Not available in production'
      });
    }
    
    const testCreds = mpesaService.getTestCredentials();
    
    res.status(200).json({
      success: true,
      data: testCreds
    });
    
  } catch (error) {
    console.error('Get test credentials error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
