// src/services/mpesaService.js
import axios from 'axios';
import mpesaConfig from '../config/mpesa.js';
import Order from '../models/Order.js';
import PaymentTransaction from '../models/PaymentTransaction.js';
import Product from '../models/Product.js';

class MpesaService {
  // ✅ FIX: Added userId parameter so PaymentTransaction gets a real user_id
  async stkPush(phoneNumber, amount, orderId, productName, userId) {
    try {
      const formattedPhone = mpesaConfig.formatPhoneNumber(phoneNumber);
      
      if (!mpesaConfig.validatePhoneNumber(formattedPhone)) {
        throw new Error('Invalid phone number format. Use 254XXXXXXXX');
      }
      
      const accessToken = await mpesaConfig.getAccessToken();
      const timestamp = mpesaConfig.getTimestamp();
      const password = mpesaConfig.generatePassword(timestamp);
      
      const requestBody = {
        BusinessShortCode: mpesaConfig.shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: Math.round(amount),
        PartyA: formattedPhone,
        PartyB: mpesaConfig.shortcode,
        PhoneNumber: formattedPhone,
        CallBackURL: mpesaConfig.callbackUrl,
        AccountReference: `ORDER-${orderId}`,
        TransactionDesc: `Payment for ${productName}`
      };
      
      console.log('Initiating STK Push:', {
        phone: formattedPhone,
        amount: amount,
        orderId: orderId,
        callbackUrl: mpesaConfig.callbackUrl
      });
      
      const response = await axios.post(
        `${mpesaConfig.baseUrl}/mpesa/stkpush/v1/processrequest`,
        requestBody,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('STK Push Response:', response.data);
      
      if (response.data.ResponseCode === '0') {
        // Update order with checkout request ID
        await Order.updateCheckoutRequest(
          orderId,
          response.data.CheckoutRequestID,
          response.data.MerchantRequestID
        );
        
        // ✅ FIX: Pass real userId instead of null
        await PaymentTransaction.create({
          orderId: orderId,
          userId: userId,
          checkoutRequestId: response.data.CheckoutRequestID,
          phoneNumber: formattedPhone,
          amount: amount,
          status: 'pending'
        });
        
        return {
          success: true,
          checkoutRequestId: response.data.CheckoutRequestID,
          merchantRequestId: response.data.MerchantRequestID,
          responseCode: response.data.ResponseCode,
          responseDescription: response.data.ResponseDescription
        };
      } else {
        throw new Error(response.data.ResponseDescription || 'STK push failed');
      }
      
    } catch (error) {
      console.error('STK Push Error:', error.response?.data || error.message);
      
      if (orderId) {
        await Order.updatePaymentStatus(orderId, {
          paymentStatus: 'failed',
          paymentError: error.response?.data?.errorMessage || error.message
        });
      }
      
      return {
        success: false,
        error: error.response?.data?.errorMessage || error.message
      };
    }
  }
  
  // Query payment status
  async queryPaymentStatus(checkoutRequestId) {
    try {
      const accessToken = await mpesaConfig.getAccessToken();
      const timestamp = mpesaConfig.getTimestamp();
      const password = mpesaConfig.generatePassword(timestamp);
      
      const requestBody = {
        BusinessShortCode: mpesaConfig.shortcode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId
      };
      
      const response = await axios.post(
        `${mpesaConfig.baseUrl}/mpesa/stkpushquery/v1/query`,
        requestBody,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return {
        success: true,
        resultCode: response.data.ResultCode,
        resultDesc: response.data.ResultDesc
      };
      
    } catch (error) {
      console.error('Query Payment Status Error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.errorMessage || error.message
      };
    }
  }
  
  // Process M-Pesa callback
  async processCallback(callbackData) {
    try {
      const { Body } = callbackData;
      const { stkCallback } = Body;
      const {
        CheckoutRequestID,
        ResultCode,
        ResultDesc,
        CallbackMetadata
      } = stkCallback;
      
      console.log('Processing callback for:', CheckoutRequestID);
      
      const transaction = await PaymentTransaction.findByCheckoutRequestId(CheckoutRequestID);
      
      if (!transaction) {
        console.log('Transaction not found:', CheckoutRequestID);
        return { success: false, error: 'Transaction not found' };
      }

      if (transaction.status === 'completed' || transaction.order?.payment_status === 'paid') {
        console.log('Callback already processed:', CheckoutRequestID);
        return {
          success: true,
          resultCode: ResultCode,
          resultDesc: 'Callback already processed'
        };
      }
      
      if (ResultCode === 0) {
        const metadata = {};
        if (CallbackMetadata && CallbackMetadata.Item) {
          CallbackMetadata.Item.forEach(item => {
            metadata[item.Name] = item.Value;
          });
        }
        
        const mpesaReceiptNumber = metadata.MpesaReceiptNumber;
        
        await PaymentTransaction.markAsCompleted(CheckoutRequestID, mpesaReceiptNumber);
        
        await Order.updateFromMpesaCallback(CheckoutRequestID, {
          resultCode: ResultCode,
          resultDesc: ResultDesc,
          mpesaReceiptNumber: mpesaReceiptNumber
        });

        const order = transaction.order;
        if (order?.product_id) {
          const quantity = order.product_price
            ? Math.max(1, Math.round(Number(order.total_amount) / Number(order.product_price)))
            : 1;

          await Product.decrementStock(order.product_id, quantity);
          console.log('Stock updated after payment:', {
            productId: order.product_id,
            quantity
          });
        }
        
        console.log('Payment successful for transaction:', CheckoutRequestID);
        
        return {
          success: true,
          resultCode: ResultCode,
          resultDesc: ResultDesc,
          receiptNumber: mpesaReceiptNumber
        };
      } else {
        await PaymentTransaction.markAsFailed(CheckoutRequestID);
        
        await Order.updateFromMpesaCallback(CheckoutRequestID, {
          resultCode: ResultCode,
          resultDesc: ResultDesc
        });
        
        console.log('Payment failed for transaction:', CheckoutRequestID, ResultDesc);
        
        return {
          success: false,
          resultCode: ResultCode,
          resultDesc: ResultDesc
        };
      }
      
    } catch (error) {
      console.error('Process callback error:', error);
      throw error;
    }
  }
  
  // Get test credentials info
  getTestCredentials() {
    return {
      environment: mpesaConfig.environment,
      testPhoneNumber: mpesaConfig.getTestPhoneNumber(),
      testPin: '123456',
      shortcode: mpesaConfig.shortcode,
      note: 'Use test phone number and PIN for sandbox testing'
    };
  }
}

export default new MpesaService();
