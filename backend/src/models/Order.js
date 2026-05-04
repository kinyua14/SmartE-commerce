import supabase from '../config/database.js';

const Order = {
  async create(orderData) {
    const { data, error } = await supabase
      .from('orders')
      .insert([{
        user_id: orderData.userId,
        product_id: orderData.productId,
        seller_id: orderData.sellerId,
        product_name: orderData.productName,
        product_price: orderData.productPrice,
        total_amount: orderData.totalAmount,
        payment_method: orderData.paymentMethod || 'mpesa',
        paid_at: orderData.paidAt || null,
        checkout_request_id: orderData.checkoutRequestId || null,
        merchant_request_id: orderData.merchantRequestId || null,
        payment_status: orderData.paymentStatus || 'pending',
        mpesa_receipt_number: orderData.mpesaReceiptNumber || null
      }])
      .select()
      .single();

    if (error) {
      console.error('Order.create error:', error);
      throw error;
    }
    return data;
  },

  // Simple findById — no joins, always works regardless of FK setup
  async findById(id) {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Order.findById error:', error.message, '| id:', id);
      return null;
    }
    return data;
  },

  // Full details with joins — used only where joins are confirmed working
  async findByIdWithDetails(id) {
    // First get the order itself (always works)
    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !order) return null;

    // Separately fetch product details
    let product = null;
    if (order.product_id) {
      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('id', order.product_id)
        .single();
      product = data;
    }

    return { ...order, product };
  },

  async findByUserId(userId) {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async findBySellerId(sellerId) {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async findByCheckoutRequestId(checkoutRequestId) {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('checkout_request_id', checkoutRequestId)
      .single();

    if (error) {
      console.error('Order.findByCheckoutRequestId error:', error.message);
      return null;
    }
    return data;
  },

  async updatePaymentStatus(orderId, { paymentStatus, mpesaReceiptNumber, paidAt, paymentError }) {
    const updates = {
      payment_status: paymentStatus,
      updated_at: new Date().toISOString()
    };

    if (mpesaReceiptNumber) updates.mpesa_receipt_number = mpesaReceiptNumber;
    if (paidAt) updates.paid_at = paidAt;

    const { data, error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateCheckoutRequest(orderId, checkoutRequestId, merchantRequestId) {
    const { data, error } = await supabase
      .from('orders')
      .update({
        checkout_request_id: checkoutRequestId,
        merchant_request_id: merchantRequestId,
        payment_status: 'processing',
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateFromMpesaCallback(checkoutRequestId, callbackData) {
    const updates = {
      updated_at: new Date().toISOString()
    };

    if (callbackData.resultCode === 0) {
      updates.payment_status = 'paid';
      updates.mpesa_receipt_number = callbackData.mpesaReceiptNumber;
      updates.paid_at = new Date().toISOString();
    } else {
      updates.payment_status = 'failed';
    }

    const { data, error } = await supabase
      .from('orders')
      .update(updates)
      .eq('checkout_request_id', checkoutRequestId)
      .select()
      .single();

    if (error) {
      console.error('Order.updateFromMpesaCallback error:', error.message);
      throw error;
    }
    return data;
  },

  async cancelOrder(orderId, userId) {
    const { data: order, error: findError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (findError || !order) throw new Error('Order not found');

    if (order.payment_status === 'paid') {
      throw new Error('Cannot cancel a paid order');
    }
    if (order.payment_status === 'processing') {
      throw new Error('Cannot cancel an order that is being processed');
    }
    if (String(order.user_id) !== String(userId)) {
      throw new Error('Unauthorized: This order does not belong to you');
    }

    const { data, error } = await supabase
      .from('orders')
      .update({
        payment_status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getSellerStats(sellerId) {
    const { data: orders, error } = await supabase
      .from('orders')
      .select('total_amount, payment_status')
      .eq('seller_id', sellerId);

    if (error) throw error;
    const list = orders || [];

    return {
      totalOrders: list.length,
      totalRevenue: list
        .filter(o => o.payment_status === 'paid')
        .reduce((sum, o) => sum + o.total_amount, 0),
      pendingPayments: list.filter(o => o.payment_status === 'pending').length,
      processingPayments: list.filter(o => o.payment_status === 'processing').length,
      completedPayments: list.filter(o => o.payment_status === 'paid').length,
      failedPayments: list.filter(o => o.payment_status === 'failed').length
    };
  },

  async getBuyerStats(userId) {
    const { data: orders, error } = await supabase
      .from('orders')
      .select('total_amount, payment_status')
      .eq('user_id', userId);

    if (error) throw error;
    const list = orders || [];

    return {
      totalOrders: list.length,
      totalSpent: list
        .filter(o => o.payment_status === 'paid')
        .reduce((sum, o) => sum + o.total_amount, 0),
      pendingOrders: list.filter(o => o.payment_status === 'pending').length,
      completedOrders: list.filter(o => o.payment_status === 'paid').length,
      failedOrders: list.filter(o => o.payment_status === 'failed').length,
      cancelledOrders: list.filter(o => o.payment_status === 'cancelled').length
    };
  }
};

export default Order;