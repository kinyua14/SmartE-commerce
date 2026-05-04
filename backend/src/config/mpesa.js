// src/config/mpesa.js
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

class MpesaConfig {
  constructor() {
    // Sandbox credentials (from Safaricom Developer Portal)
    this.consumerKey = process.env.MPESA_CONSUMER_KEY;
    this.consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    this.shortcode = process.env.MPESA_SHORTCODE || '174379'; // Sandbox shortcode
    this.passkey = process.env.MPESA_PASSKEY;
    this.environment = 'sandbox'; // Force sandbox for testing
    
    // Sandbox API URL
    this.baseUrl = 'https://sandbox.safaricom.co.ke';
    this.callbackUrl = process.env.MPESA_CALLBACK_URL;
  }

  // Generate access token
  async getAccessToken() {
    const auth = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64');
    
    try {
      console.log('Requesting access token from M-Pesa sandbox...');
      
      const response = await axios.get(
        `${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
        {
          headers: {
            Authorization: `Basic ${auth}`
          }
        }
      );
      
      console.log('Access token obtained successfully');
      return response.data.access_token;
    } catch (error) {
      console.error('Error getting M-Pesa access token:', error.response?.data || error.message);
      throw new Error('Failed to get M-Pesa access token', { cause: error });
    }
  }

  // Generate timestamp in required format (YYYYMMDDHHMMSS)
  getTimestamp() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}${month}${day}${hours}${minutes}${seconds}`;
  }

  // Generate password for STK push
  generatePassword(timestamp) {
    const passwordString = `${this.shortcode}${this.passkey}${timestamp}`;
    return Buffer.from(passwordString).toString('base64');
  }

  // Format phone number to international format (254XXXXXXXX)
  formatPhoneNumber(phoneNumber) {
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    if (cleaned.startsWith('0')) {
      cleaned = '254' + cleaned.substring(1);
    } else if (!cleaned.startsWith('254')) {
      cleaned = '254' + cleaned;
    }
    
    return cleaned;
  }

  // Validate phone number (must be 254XXXXXXXX format)
  validatePhoneNumber(phoneNumber) {
    const formatted = this.formatPhoneNumber(phoneNumber);
    return formatted.length === 12 && formatted.startsWith('254');
  }

  // Get test phone number (Safaricom sandbox test number)
  getTestPhoneNumber() {
    return '254708374149'; // Safaricom sandbox test number
  }

  // Check if using sandbox environment
  isSandbox() {
    return this.environment === 'sandbox';
  }
}

export default new MpesaConfig();