// src/models/PaymentTransaction.js
import supabase from '../config/database.js';

const PaymentTransaction = {
  // Create a new payment transaction
  async create(transactionData) {
    const { data, error } = await supabase
      .from('payment_transactions')
      .insert([{
        order_id: transactionData.orderId,
        user_id: transactionData.userId,
        checkout_request_id: transactionData.checkoutRequestId,
        phone_number: transactionData.phoneNumber,
        amount: transactionData.amount,
        status: transactionData.status || 'pending',
        mpesa_receipt_number: transactionData.mpesaReceiptNumber || null
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Find transaction by checkout request ID
  async findByCheckoutRequestId(checkoutRequestId) {
    const { data, error } = await supabase
      .from('payment_transactions')
      .select(`
        *,
        order:order_id (*)
      `)
      .eq('checkout_request_id', checkoutRequestId)
      .single();
    
    if (error) return null;
    return data;
  },

  // Find transaction by order ID
  async findByOrderId(orderId) {
    const { data, error } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  // Find transaction by ID
  async findById(id) {
    const { data, error } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) return null;
    return data;
  },

  // Get all transactions for a user
  async findByUserId(userId, limit = 50) {
    const { data, error } = await supabase
      .from('payment_transactions')
      .select(`
        *,
        order:order_id (*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data;
  },

  // Update transaction on successful payment
  async markAsCompleted(checkoutRequestId, mpesaReceiptNumber) {
    const { data, error } = await supabase
      .from('payment_transactions')
      .update({
        status: 'completed',
        mpesa_receipt_number: mpesaReceiptNumber,
        completed_at: new Date()
      })
      .eq('checkout_request_id', checkoutRequestId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Update transaction on failed payment
  async markAsFailed(checkoutRequestId) {
    const { data, error } = await supabase
      .from('payment_transactions')
      .update({
        status: 'failed',
        failed_at: new Date()
      })
      .eq('checkout_request_id', checkoutRequestId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Update transaction with result details
  async updateWithResult(checkoutRequestId, resultData) {
    const updates = {
      updated_at: new Date()
    };
    
    if (resultData.resultCode === 0) {
      updates.status = 'completed';
      updates.mpesa_receipt_number = resultData.mpesaReceiptNumber;
      updates.completed_at = new Date();
    } else {
      updates.status = 'failed';
      updates.failed_at = new Date();
    }
    
    const { data, error } = await supabase
      .from('payment_transactions')
      .update(updates)
      .eq('checkout_request_id', checkoutRequestId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Get transaction statistics
  async getStats(startDate, endDate, userId = null) {
    let query = supabase
      .from('payment_transactions')
      .select('*')
      .gte('created_at', startDate)
      .lte('created_at', endDate);
    
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    const stats = {
      totalTransactions: data.length,
      successful: data.filter(t => t.status === 'completed').length,
      failed: data.filter(t => t.status === 'failed').length,
      pending: data.filter(t => t.status === 'pending').length,
      totalAmount: data
        .filter(t => t.status === 'completed')
        .reduce((sum, t) => sum + t.amount, 0)
    };
    
    return stats;
  },

  // Get pending transactions (for cron jobs)
  async getPendingTransactions(minutesOld = 5) {
    const cutoffTime = new Date(Date.now() - minutesOld * 60 * 1000);
    
    const { data, error } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('status', 'pending')
      .lt('created_at', cutoffTime.toISOString());
    
    if (error) throw error;
    return data;
  },

  // Delete transaction (for testing/cleanup)
  async delete(id) {
    const { error } = await supabase
      .from('payment_transactions')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  }
};

export default PaymentTransaction;