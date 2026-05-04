// src/controllers/productController.js
import supabase from '../config/database.js';

const getAuthUserId = (req) => {
  try {
    return req.auth?.()?.userId || null;
  } catch {
    return null;
  }
};

// GET /api/products — all products (optionally filtered)
export const getProducts = async (req, res) => {
  try {
    const { sellerId, isActive, limit = 100 } = req.query;

    let query = supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (sellerId) query = query.eq('seller_id', sellerId);
    if (isActive !== undefined) query = query.eq('is_active', isActive === 'true');

    const { data, error } = await query;
    if (error) throw error;

    res.json({
      success: true,
      count: data.length,
      data,
    });
  } catch (err) {
    console.error('Get products error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/products/:id — single product
export const getProductById = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !data) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.json({ success: true, data });
  } catch (err) {
    console.error('Get product by ID error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/products — create product
export const createProduct = async (req, res) => {
  try {
    const authUserId = getAuthUserId(req);
    const { sellerId, name, price, stock, description, images } = req.body;
    const ownerId = authUserId || sellerId;

    if (!ownerId) return res.status(400).json({ success: false, message: 'sellerId is required' });
    if (!name) return res.status(400).json({ success: false, message: 'Product name is required' });
    if (!price || price <= 0) return res.status(400).json({ success: false, message: 'Valid price is required' });
    if (stock === undefined || stock < 0) return res.status(400).json({ success: false, message: 'Valid stock quantity is required' });

    const { data, error } = await supabase
      .from('products')
      .insert([{
        seller_id: ownerId,
        name,
        price,
        stock,
        description: description || '',
        images: images || [],
        is_active: true,
      }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ success: true, data });
  } catch (err) {
    console.error('Create product error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/products/:id — update product
export const updateProduct = async (req, res) => {
  try {
    const authUserId = getAuthUserId(req);
    const { data: existingProduct, error: existingError } = await supabase
      .from('products')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (existingError || !existingProduct) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    if (authUserId && existingProduct.seller_id !== authUserId) {
      return res.status(403).json({ success: false, message: 'Only the product owner can edit this product' });
    }

    const updates = { ...req.body, updated_at: new Date() };

    // Map camelCase from frontend to snake_case for Supabase
    if (updates.sellerId) { updates.seller_id = updates.sellerId; delete updates.sellerId; }
    if (updates.isActive !== undefined) { updates.is_active = updates.isActive; delete updates.isActive; }
    if (updates.whatsappLink) { updates.whatsapp_link = updates.whatsappLink; delete updates.whatsappLink; }
    if (updates.qrCode) { updates.qr_code = updates.qrCode; delete updates.qrCode; }

    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error || !data) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.json({ success: true, data });
  } catch (err) {
    console.error('Update product error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/products/:id — delete product
export const deleteProduct = async (req, res) => {
  try {
    const authUserId = getAuthUserId(req);
    const { data: existingProduct, error: existingError } = await supabase
      .from('products')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (existingError || !existingProduct) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    if (authUserId && existingProduct.seller_id !== authUserId) {
      return res.status(403).json({ success: false, message: 'Only the product owner can delete this product' });
    }

    const { data, error } = await supabase
      .from('products')
      .delete()
      .eq('id', req.params.id)
      .select()
      .single();

    if (error || !data) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (err) {
    console.error('Delete product error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/products/bulk — create multiple products
export const bulkCreateProducts = async (req, res) => {
  try {
    const { products } = req.body;

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ success: false, message: 'Products array is required' });
    }

    const formattedProducts = products.map(product => ({
      seller_id: product.sellerId,
      name: product.name,
      price: product.price,
      stock: product.stock || 0,
      description: product.description || '',
      images: product.images || [],
      is_active: product.isActive !== undefined ? product.isActive : true,
    }));

    const { data, error } = await supabase
      .from('products')
      .insert(formattedProducts)
      .select();

    if (error) throw error;

    res.status(201).json({ success: true, count: data.length, data });
  } catch (err) {
    console.error('Bulk create products error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/products/bulk — delete multiple products
export const bulkDeleteProducts = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Product IDs array is required' });
    }

    const { data, error } = await supabase
      .from('products')
      .delete()
      .in('id', ids)
      .select();

    if (error) throw error;

    res.json({ success: true, message: `${data.length} products deleted successfully` });
  } catch (err) {
    console.error('Bulk delete products error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/products/:id/stock — update only stock
export const updateProductStock = async (req, res) => {
  try {
    const { stock } = req.body;

    if (stock === undefined || stock < 0) {
      return res.status(400).json({ success: false, message: 'Valid stock quantity is required' });
    }

    const { data, error } = await supabase
      .from('products')
      .update({ stock, updated_at: new Date() })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error || !data) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.json({ success: true, data });
  } catch (err) {
    console.error('Update stock error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/products/search — search products
export const searchProducts = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({ success: false, message: 'Search query is required' });
    }

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .or(`name.ilike.%${q}%,description.ilike.%${q}%`)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    res.json({ success: true, count: data.length, data });
  } catch (err) {
    console.error('Search products error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
