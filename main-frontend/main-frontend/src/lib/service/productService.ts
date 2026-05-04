// lib/services/productService.ts
import api from '../api';

export interface Product {
  id: string;
  seller_id: string;
  name: string;
  price: number;
  stock: number;
  description?: string;
  images: string[];
  whatsapp_link?: string;
  qr_code?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateProductInput {
  sellerId?: string;
  name: string;
  price: number;
  stock: number;
  description?: string;
  images?: string[];
}

// Get all products for logged-in seller
export const getProducts = async (): Promise<Product[]> => {
  const res = await api.get('/products');
  return Array.isArray(res.data?.data) ? res.data.data : [];
};

// Get single product
export const getProductById = async (id: string): Promise<Product> => {
  const res = await api.get(`/products/${id}`);
  return res.data.data;
};

// Create product
export const createProduct = async (data: CreateProductInput): Promise<Product> => {
  const res = await api.post('/products', data);
  return res.data.data;
};

// Update product
export const updateProduct = async (id: string, data: Partial<CreateProductInput>): Promise<Product> => {
  const res = await api.put(`/products/${id}`, data);
  return res.data.data;
};

// Delete product
export const deleteProduct = async (id: string): Promise<void> => {
  await api.delete(`/products/${id}`);
};

// Share product to n8n 
export const shareProductToN8n = async (productId: string): Promise<void> => {
  const res = await api.post(`/n8n/product`, { productId }); 
  return res.data;
};
