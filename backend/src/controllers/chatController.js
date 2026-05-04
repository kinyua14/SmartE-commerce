// controllers/chatController.js
import axios from 'axios';
import Product from '../models/Product.js';
import dotenv from 'dotenv';

dotenv.config();

const N8N_CHAT_WEBHOOK_URL = process.env.N8N_CHAT_WEBHOOK_URL;

export const handleChat = async (req, res) => {
  console.log('💬 handleChat hit — body:', req.body);

  try {
    const { productId, message, history } = req.body;

    if (!productId || !message) {
      return res.status(400).json({ 
        success: false, 
        message: 'productId and message are required' 
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ 
        success: false, 
        message: 'Product not found' 
      });
    }

    if (!N8N_CHAT_WEBHOOK_URL) {
      console.error('N8N_CHAT_WEBHOOK_URL not configured');
      return res.status(500).json({ 
        success: false, 
        message: 'Chat service not configured' 
      });
    }

    const chatPayload = {
      product: {
        id:          product.id,
        name:        product.name,
        price:       product.price,
        stock:       product.stock,
        description: product.description || '',
      },
      message,
      history: history || [],
      metadata: {
        source:    'smart-sales-pro',
        event:     'buyer_chat',
        timestamp: new Date().toISOString(),
      }
    };

    console.log('📤 Sending chat payload to n8n...');

    const n8nResponse = await axios.post(N8N_CHAT_WEBHOOK_URL, chatPayload, {
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      timeout: 15000
    });

    console.log('✅ n8n chat response:', n8nResponse.data);

    // Extract the reply text
    const replyText = 
      n8nResponse.data?.reply || 
      n8nResponse.data?.text  || 
      n8nResponse.data?.output ||
      "I'm not sure about that — let me connect you with the seller.";

    // 🔥 CRITICAL: Check if deal was agreed
    const dealAgreed = String(replyText).includes('[DEAL_AGREED]');
    
    // 🔥 CRITICAL: Extract the agreed price
    let agreedPrice = null;
    
    if (dealAgreed) {
      console.log('🎉 Deal detected! Extracting price...');
      
      // Try multiple patterns to extract price
      const pricePatterns = [
        /at\s+\$?(\d+(?:\.\d{2})?)/i,           // "at $190" or "at 190"
        /for\s+\$?(\d+(?:\.\d{2})?)/i,           // "for $190" or "for 190"
        /\$(\d+(?:\.\d{2})?)/,                   // "$190"
        /(\d+(?:\.\d{2})?)\s*(?:USD|dollars?)/i, // "190 USD" or "190 dollars"
        /(\d+(?:\.\d{2})?)\s*$/,                 // ends with number
      ];
      
      for (const pattern of pricePatterns) {
        const match = String(replyText).match(pattern);
        if (match && match[1]) {
          agreedPrice = parseFloat(match[1]);
          console.log(`💰 Found price: ${agreedPrice} using pattern: ${pattern}`);
          break;
        }
      }
      
      // If no price found, use 5% discount as fallback
      if (!agreedPrice) {
        agreedPrice = product.price * 0.95;
        console.log(`⚠️ Using fallback price (5% discount): ${agreedPrice}`);
      }
    }

    // Clean the reply by removing [DEAL_AGREED] tag
    const cleanReply = String(replyText)
      .replace(/\[DEAL_AGREED\]/g, '')
      .trim();

    // 🔥 IMPORTANT: This is what the frontend receives
    const responseToFrontend = { 
      success: true, 
      reply: cleanReply,
      dealAgreed: dealAgreed,
      agreedPrice: agreedPrice,
      price: product.price,
    };
    
    console.log('📦 Sending to frontend:', JSON.stringify(responseToFrontend, null, 2));

    return res.json(responseToFrontend);

  } catch (err) {
    console.error('❌ Chat webhook error:', err.message);
    const status    = err.response?.status || 500;
    const errorData = err.response?.data   || err.message;
    return res.status(status).json({ 
      success: false, 
      message: 'Failed to get AI response', 
      error: errorData 
    });
  }
};