import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { clerkMiddleware } from '@clerk/express';
import supabase from './config/database.js';

// Routes
import webhookRoutes from './routes/webhook.js';
import productRoutes from './routes/products.js';
import uploadRoutes  from './routes/upload.js';
import n8nRoutes     from './routes/n8n.js';
import userRoutes    from './routes/sellers.js';
import chatRoutes    from './routes/chat.js';
import mpesaRoutes   from './routes/mpesa.js'; 

dotenv.config();

// Environment Variable Checks
console.log("CLERK_SECRET_KEY:",        process.env.CLERK_SECRET_KEY        ? "✅ loaded" : "❌ missing");
console.log("CLERK_WEBHOOK_SECRET:",    process.env.CLERK_WEBHOOK_SECRET    ? "✅ loaded" : "❌ missing");
console.log("SUPABASE_URL:",            process.env.SUPABASE_URL            ? "✅ loaded" : "❌ missing");
console.log("SUPABASE_SERVICE_KEY:",    process.env.SUPABASE_SERVICE_KEY    ? "✅ loaded" : "❌ missing");
console.log("CLOUDINARY_CLOUD_NAME:",   process.env.CLOUDINARY_CLOUD_NAME   ? "✅ loaded" : "❌ missing");
console.log("CLOUDINARY_API_KEY:",      process.env.CLOUDINARY_API_KEY      ? "✅ loaded" : "❌ missing");
console.log("CLOUDINARY_API_SECRET:",   process.env.CLOUDINARY_API_SECRET   ? "✅ loaded" : "❌ missing");
console.log("N8N_WEBHOOK_URL:",         process.env.N8N_WEBHOOK_URL         ? "✅ loaded" : "❌ missing");
console.log("N8N_CHAT_WEBHOOK_URL:",    process.env.N8N_CHAT_WEBHOOK_URL    ? "✅ loaded" : "❌ missing");
console.log("MPESA_CONSUMER_KEY:",      process.env.MPESA_CONSUMER_KEY      ? "✅ loaded" : "❌ missing"); 
console.log("MPESA_CALLBACK_URL:",      process.env.MPESA_CALLBACK_URL      ? "✅ loaded" : "❌ missing"); 

// Test Supabase connection
const { data, error } = await supabase.from('products').select('count').limit(1);
if (error && error.code !== 'PGRST116') {
  console.error("❌ Supabase connection error:", error.message);
} else {
  console.log("✅ Supabase connected");
}

const app = express();
const port = process.env.PORT || 8080;

// CORS
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      console.log('Blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// Webhooks FIRST (raw body required, before express.json())
app.use('/api/webhooks', webhookRoutes);

// JSON Middleware
app.use(express.json());

// Clerk Auth Middleware
try {
  app.use(clerkMiddleware());
  console.log("✅ Clerk middleware initialized");
} catch (err) {
  console.error("❌ Error initializing Clerk middleware:", err);
}
app.use('/api/mpesa', (req, res, next) => {
  console.log('=== MPESA REQUEST HEADERS ===');
  console.log('Authorization:', req.headers.authorization ? 
    req.headers.authorization.substring(0, 50) + '...' : '❌ MISSING');
  console.log('Auth object:', req.auth);
  next();
});

// API Routes
app.use('/api/products', productRoutes);
app.use('/api/upload',   uploadRoutes);
app.use('/api/n8n',      n8nRoutes);   
app.use('/api/chat',     chatRoutes);  
app.use('/api/users',    userRoutes);
app.use('/api/mpesa',    mpesaRoutes); 

// Test Route
app.get('/api/test', (req, res) => {
  res.json({
    message:          'Backend is working!',
    timestamp:        new Date().toISOString(),
    port,
    allowedFrontends: allowedOrigins,
  });
});

// Root
app.get('/', (req, res) => {
  res.json({
    message:      'Smart Sales Assistant API',
    status:       'running',
    port,
    frontendUrls: allowedOrigins,
    endpoints: [
      '/api/products',
      '/api/upload',
      '/api/n8n',
      '/api/chat',
      '/api/users',
      '/api/webhooks/clerk',
      '/api/mpesa', 
    ],
  });
});

// Start Server
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
  console.log(`✅ Allowed frontend origins:`, allowedOrigins);
});