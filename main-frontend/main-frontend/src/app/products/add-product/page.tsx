'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { HiOutlinePhotograph, HiOutlineX } from 'react-icons/hi';
import { FiPackage } from 'react-icons/fi';
import { useUser } from '@clerk/nextjs';
import { createProduct, CreateProductInput } from '@/lib/service/productService';
import imageCompression from 'browser-image-compression';
import Image from 'next/image';

export default function AddProductPage() {
  const { user } = useUser();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [formData, setFormData] = useState<Omit<CreateProductInput, 'sellerId'>>({
    name: '',
    price: 0,
    stock: 0,
    description: '',
    images: [],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!user?.id) {
      setSubmitError('You must be logged in to create a product.');
      return;
    }

    try {
      setIsSubmitting(true);
      await createProduct({
        ...formData,
        sellerId: user.id,
      });
      router.push('/products');
    } catch (error: any) {
      console.error('Failed to create product:', error);
      setSubmitError(
        error?.response?.data?.message ||
        error?.message ||
        'Failed to create product. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);

    try {
      setIsUploading(true);

      // Compress image before uploading
      const compressed = await imageCompression(file, {
        maxSizeMB: 2,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      });

      // Preserve original filename and mimetype after compression
      const compressedFile = new File([compressed], file.name, {
        type: file.type,
        lastModified: Date.now(),
      });

      const uploadData = new FormData();
      uploadData.append('image', compressedFile);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}/api/upload`,
        {
          method: 'POST',
          body: uploadData,
        }
      );

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Upload failed');
      }

      const data = await res.json();
      setImagePreview(data.url);
      setFormData({ ...formData, images: [data.url] });
    } catch (error: any) {
      console.error('Image upload failed:', error);
      setUploadError(error?.message || 'Image upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Navbar */}
      
        
        
     

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
            <button
            onClick={() => router.push('/products')}
            className="text-sm text-gray-500 hover:text-blue-600 transition-colors"
          >
            ← Back to products
          </button>
          <h1 className="text-2xl font-semibold text-gray-800">Add New Product</h1>
          <p className="text-sm text-gray-500 mt-1">
            Fill in the details below to list your product
          </p>

        </div>

        {/* Global submit error */}
        {submitError && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
            {submitError}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
        >
          <div className="space-y-6">

            {/* Basic Info */}
            <div>
              <h2 className="text-lg font-medium text-gray-800 mb-4">
                Basic Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Product Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Product Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                    placeholder="e.g. Wireless Headphones"
                  />
                </div>

                {/* Price */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price (KSH)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
                      KSH
                    </span>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          price: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full pl-14 pr-4 py-2 rounded-lg border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Stock */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Stock Quantity
                  </label>
                  <div className="relative">
                    <FiPackage className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="number"
                      required
                      min="0"
                      value={formData.stock}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          stock: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                  >
                    <option value="">Select category</option>
                    <option value="electronics">Electronics</option>
                    <option value="clothing">Clothing</option>
                    <option value="food">Food & Beverages</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                rows={4}
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                placeholder="Describe your product..."
              />
            </div>

            {/* Images */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Images
              </label>

              {uploadError && (
                <div className="mb-2 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-2">
                  {uploadError}
                </div>
              )}

              <div className="border-2 border-dashed border-gray-200 rounded-lg p-6">
                {isUploading ? (
                  <div className="flex flex-col items-center justify-center py-4">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-2" />
                    <span className="text-sm text-gray-500">Compressing & uploading...</span>
                  </div>
                ) : imagePreview ? (
                  <div className="relative">
                    <div className="relative aspect-square w-48 mx-auto">
                      <Image
                        src={imagePreview}
                        alt="Preview"
                        fill
                        className="object-cover rounded-lg"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setImagePreview(null);
                        setUploadError(null);
                        setFormData({ ...formData, images: [] });
                      }}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      <HiOutlineX className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center cursor-pointer">
                    <HiOutlinePhotograph className="w-12 h-12 text-gray-300 mb-2" />
                    <span className="text-sm text-gray-500 mb-1">
                      Click to upload image
                    </span>
                    <span className="text-xs text-gray-400">PNG, JPG — any size (auto compressed)</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-100">
              <motion.button
                type="button"
                onClick={() => router.push('/products')}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-6 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </motion.button>
              <motion.button
                type="submit"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={isSubmitting || isUploading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Creating...' : 'Create Product'}
              </motion.button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}