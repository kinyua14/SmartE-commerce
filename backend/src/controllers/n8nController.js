//src/controllers/n8nController.js
import axios from 'axios';
import Product from '../models/Product.js';
import User from '../models/User.js';

const getUser = async (clerkId) => {
  if (!clerkId) throw new Error("User not authenticated");
  const user = await User.findByClerkId(clerkId);
  if (!user) throw new Error("User not found for this Clerk user");
  return user;
};

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;
const FRONTEND_URL = process.env.FRONTEND_URL;

const buildProductUrl = (productId) => {
  if (!FRONTEND_URL || !productId) return null;
  const baseUrl = FRONTEND_URL.endsWith('/') ? FRONTEND_URL.slice(0, -1) : FRONTEND_URL;
  return `${baseUrl}/products/${productId}`;
};

export const postToN8n = async (req, res) => {
  console.log('🔥 postToN8n hit — body:', req.body);
  console.log('🔥 auth:', req.auth);

  try {
    const auth   = req.auth();   // ← fixed: added parentheses
    const userId = auth?.userId;

    console.log('🔥 userId:', userId);

    if (!userId) return res.status(401).json({ success: false, message: "User not authenticated" });

    const user = await getUser(userId);

    const productId = req.params.productId || req.body.productId;
    console.log('🔥 productId:', productId);

    if (!productId) return res.status(400).json({ success: false, message: "Product ID is required" });

    const product = await Product.findById(productId);
    if (!product || product.seller_id !== userId) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const imageUrls    = (product.images || []).filter(url => url && url.trim() !== '');
    const primaryImage = imageUrls[0] || null;
    const productUrl   = buildProductUrl(product.id);

    const n8nPayload = {
      productId:          product.id,
      productUrl:         productUrl,
      productName:        product.name,
      productPrice:       product.price,
      productStock:       product.stock,
      productDescription: product.description || '',
      productStatus:      product.is_active ? 'active' : 'inactive',
      sellerId:           user.clerk_id,
      sellerEmail:        user.email,
      sellerName:         user.name  || '',
      sellerPhone:        user.phone || '',
      images:             imageUrls,
      primaryImage:       primaryImage,
      imageCount:         imageUrls.length,
      createdAt:          product.created_at,
      updatedAt:          product.updated_at,
      metadata: {
        source:         'smart-sales-pro',
        event:          'product_shared',
        timestamp:      new Date().toISOString(),
        webhookVersion: '1.0'
      }
    };

    if (!N8N_WEBHOOK_URL) {
      console.error("N8N_WEBHOOK_URL not configured");
      return res.status(500).json({ success: false, message: 'n8n webhook URL not configured' });
    }

    console.log(`📤 Sending to n8n webhook:`, N8N_WEBHOOK_URL);

    const n8nResponse = await axios.post(N8N_WEBHOOK_URL, n8nPayload, {
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      timeout: 10000
    });

    console.log(`✅ n8n webhook response:`, n8nResponse.data);

    res.json({
      success: true,
      message: 'Product posted to n8n successfully',
      data: {
        productId:    product.id,
        productUrl:   productUrl,
        productName:  product.name,
        primaryImage: primaryImage,
        n8nResponse:  n8nResponse.data
      }
    });

  } catch (err) {
    console.error('❌ n8n webhook error:', err.message);
    const status    = err.response?.status || 500;
    const errorData = err.response?.data   || err.message;
    res.status(status).json({ success: false, message: 'Failed to post to n8n', error: errorData });
  }
};

export const testN8nConnection = async (req, res) => {
  try {
    const auth   = req.auth();   // ← fixed: added parentheses
    const userId = auth?.userId;
    if (!userId) return res.status(401).json({ success: false, message: "User not authenticated" });

    const user = await getUser(userId);

    if (!N8N_WEBHOOK_URL) {
      return res.status(500).json({ success: false, message: 'n8n webhook URL not configured' });
    }

    const testPayload = {
      test:      true,
      message:   'Test connection from Smart Sales Pro',
      timestamp: new Date().toISOString(),
      source:    'smart-sales-pro-test',
      seller: {
        id:    user.clerk_id,
        email: user.email,
        name:  user.name  || '',
        phone: user.phone || ''
      }
    };

    console.log('Testing n8n connection...');

    const n8nResponse = await axios.post(N8N_WEBHOOK_URL, testPayload, {
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      timeout: 5000
    });

    console.log('✅ n8n test connection successful');
    res.json({ success: true, message: 'n8n connection successful', data: n8nResponse.data });

  } catch (err) {
    console.error('❌ n8n test connection failed:', err.message);
    res.status(500).json({ success: false, message: 'n8n connection failed', error: err.message });
  }
};

export const getN8nStatus = async (req, res) => {
  try {
    const auth   = req.auth();   // ← fixed: added parentheses
    const userId = auth?.userId;
    if (!userId) return res.status(401).json({ success: false, message: "User not authenticated" });

    const user = await getUser(userId);

    res.json({
      success: true,
      data: {
        configured: !!N8N_WEBHOOK_URL,
        url:        N8N_WEBHOOK_URL ? `${N8N_WEBHOOK_URL.substring(0, 30)}...` : null,
        seller: {
          id:    user.clerk_id,
          email: user.email,
          name:  user.name  || '',
          phone: user.phone || ''
        },
        timestamp: new Date().toISOString()
      }
    });

  } catch (err) {
    console.error('❌ Error getting n8n status:', err.message);
    res.status(500).json({ success: false, message: 'Failed to get n8n status', error: err.message });
  }
};
