// app/products/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  getProducts, 
  Product,
} from '@/lib/service/productService';
import { 
  Package, 
  Search, 
  Filter, 
  Grid3x3, 
  List, 
  ShoppingBag,
} from 'lucide-react'; 

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'newest' | 'price-low' | 'price-high' | 'name'>('newest');

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    let result = [...products];

    if (searchTerm) {
      result = result.filter(product => 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    switch (sortBy) {
      case 'newest':
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'price-low':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'name':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    setFilteredProducts(result);
  }, [products, searchTerm, sortBy]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await getProducts();
      setProducts(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      setProducts([]);
      setFilteredProducts([]);
      setError('Failed to load products. Please try again later.');
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'KSH',
    }).format(price);
  };

  const getPrimaryImage = (product: Product) => {
    return product.images && product.images.length > 0 
      ? product.images[0] 
      : null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-4"></div>
            <div className="h-4 w-96 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="mb-6 flex flex-wrap gap-4">
            <div className="h-10 w-64 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm border border-blue-100 p-4">
                <div className="aspect-square bg-gray-200 rounded-lg mb-4 animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2 animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-4 animate-pulse"></div>
                <div className="h-8 bg-gray-200 rounded w-full animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Package className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">Oops! Something went wrong</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={fetchProducts}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Products</h1>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="mb-6 space-y-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search products by name or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 pl-12 pr-4 text-sm border border-blue-200 rounded-lg 
                       focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent bg-white"
            />
            <Search className="absolute left-4 top-3.5 h-4 w-4 text-gray-400" />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-4 top-3 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">Filter by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 text-sm border border-blue-200 rounded-lg 
                         focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
              >
                <option value="newest">Newest First</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="name">Name</option>
              </select>
            </div>

            <div className="flex items-center space-x-2 border border-blue-200 rounded-lg p-1 bg-white">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'grid' ? 'bg-blue-500 text-white' : 'text-gray-500 hover:text-blue-500'
                }`}
              >
                <Grid3x3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'list' ? 'bg-blue-500 text-white' : 'text-gray-500 hover:text-blue-500'
                }`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-4 text-sm text-gray-600">
          Showing {filteredProducts.length} of {products.length} products
        </div>

        {/* Products Grid/List */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingBag className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm 
                ? `No products matching "${searchTerm}"` 
                : "You haven't added any products yet"}
            </p>
          </div>
        ) : (
          <div className={
            viewMode === 'grid' 
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
              : "space-y-4"
          }>
            {filteredProducts.map((product) => {
              const primaryImage = getPrimaryImage(product);

              return viewMode === 'grid' ? (
                // Grid View
                <div
                  key={product.id}
                  className="group bg-white rounded-lg shadow-sm border border-blue-100 overflow-hidden 
                           hover:shadow-md transition-all duration-200"
                >
                  <Link href={`/products/${product.id}`} className="block">
                    <div className="aspect-square relative bg-gray-100">
                      {primaryImage ? (
                        <Image
                          src={primaryImage}
                          alt={product.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-12 w-12 text-gray-300" />
                        </div>
                      )}
                      {product.stock === 0 && (
                        <span className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
                          Out of Stock
                        </span>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-800 mb-1 line-clamp-1">
                        {product.name}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                        {product.description || 'No description'}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-blue-600">
                          {formatPrice(product.price)}
                        </span>
                        <span className="text-xs text-gray-500">
                          Stock: {product.stock}
                        </span>
                      </div>
                    </div>
                  </Link>
                </div>
              ) : (
                // List View
                <div
                  key={product.id}
                  className="bg-white rounded-lg shadow-sm border border-blue-100 p-4 
                           hover:shadow-md transition-all duration-200"
                >
                  <div className="flex gap-4">
                    <Link href={`/products/${product.id}`} className="flex-shrink-0">
                      <div className="w-24 h-24 bg-gray-100 rounded-lg relative">
                        {primaryImage ? (
                          <Image
                            src={primaryImage}
                            alt={product.name}
                            fill
                            className="object-cover rounded-lg"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="h-8 w-8 text-gray-300" />
                          </div>
                        )}
                      </div>
                    </Link>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <Link href={`/products/${product.id}`}>
                            <h3 className="font-semibold text-gray-800 hover:text-blue-600">
                              {product.name}
                            </h3>
                          </Link>
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {product.description || 'No description'}
                          </p>
                        </div>
                        <span className="text-xl font-bold text-blue-600">
                          {formatPrice(product.price)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className={`text-sm ${
                          product.is_active ? 'text-green-600' : 'text-gray-500'
                        }`}>
                          {product.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <span className={`text-sm ${
                          product.stock > 0 ? 'text-green-600' : 'text-red-500'
                        }`}>
                          Stock: {product.stock}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
