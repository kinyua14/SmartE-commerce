'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useUser, useAuth } from '@clerk/nextjs';
import api from '@/lib/api';
import {
  HiOutlineArrowLeft,
  HiOutlinePencil,
  HiOutlineShare,
  HiOutlineTrash,
  HiExclamationCircle,
  HiShoppingCart,
  HiCheckCircle,
} from 'react-icons/hi';
import { FiPackage, FiSend, FiMessageCircle, FiX, FiChevronDown } from 'react-icons/fi';
import { getProductById, deleteProduct, Product } from '@/lib/service/productService';
import MpesaPaymentModal from '@/components/MpesaPaymentModal';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatPriceStatic(price: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'KSH' }).format(price);
}

// ─── Chat Widget ───────────────────────────────────────────────────────────────

function ChatWidget({
  product,
  user,
  onPaymentSuccess,
}: {
  product: Product;
  user: { name: string; email: string; phoneNumber?: string } | null;
  onPaymentSuccess?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Hi! I'm here to help you with questions about **${product.name}** (${formatPriceStatic(product.price)}). Ask me anything — specs, availability, or let's talk price! 🛍️`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [dealAgreed, setDealAgreed] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [agreedPrice, setAgreedPrice] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 150);
  }, [isOpen]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isSending) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsSending(true);

    try {
      const history = messages
        .filter(m => m.id !== 'welcome')
        .map(m => ({ role: m.role, content: m.content }));

      const response = await api.post('/chat', {
        productId: product.id,
        product,
        message: text,
        history,
      });

      console.log('n8n raw response:', response.data);

      const replyText =
        response.data.reply ||
        response.data.output ||
        "I'm not sure about that — let me connect you with the seller.";

      const isDeal =
        response.data.dealAgreed === true ||
        response.data.dealAgreed === 'true' ||
        String(replyText).includes('[DEAL_AGREED]');

      if (isDeal) {
        // Extract the agreed price
        let extractedPrice = response.data.agreedPrice || response.data.price;
        
        if (!extractedPrice) {
          const priceMatch = String(replyText).match(/(\d+)\s*(?:KSH|ksh|shillings?)/i);
          if (priceMatch) {
            extractedPrice = parseFloat(priceMatch[1]);
          } else {
            extractedPrice = product.price;
          }
        }
        
        setAgreedPrice(extractedPrice);
        setDealAgreed(true);
      }

      const cleanReply = String(replyText)
        .replace('[DEAL_AGREED]', '')
        .trim();

      setMessages(prev => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: cleanReply,
          timestamp: new Date(),
        },
      ]);

    } catch (error: unknown) {
      const err = error as {
        response?: { status?: number; data?: unknown };
        code?: string;
      };

      console.error('Chat error status:', err.response?.status);
      console.error('Chat error data:', err.response?.data);

      let errorMessage = 'Sorry, I ran into an issue. Please try again in a moment.';
      if (err.response?.status === 404) errorMessage = 'Chat service not available. Please try again later.';
      if (err.response?.status === 500) errorMessage = 'Server error. Please try again.';
      if (err.code === 'ECONNABORTED') errorMessage = 'Request timed out. Please try again.';
      if (err.code === 'ERR_NETWORK') errorMessage = 'Network error. Cannot reach the server.';

      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: errorMessage,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const unreadCount = messages.filter(m => m.role === 'assistant' && m.id !== 'welcome').length;

  return (
    <div className="mt-4">
      {/* Collapsed CTA */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="w-full flex items-center justify-between px-5 py-4 bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-200 group"
        >
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 bg-blue-50 rounded-full flex items-center justify-center group-hover:bg-blue-100 transition-colors">
              <FiMessageCircle className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-gray-800">Chat with AI assistant</p>
              <p className="text-xs text-gray-400">Ask questions or negotiate the price</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {unreadCount > 0 && (
              <span className="w-5 h-5 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                {unreadCount}
              </span>
            )}
            <FiChevronDown className="w-4 h-4 text-gray-400 group-hover:text-blue-400 transition-colors" />
          </div>
        </button>
      )}

      {/* Expanded chat panel */}
      {isOpen && (
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-blue-500">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center">
                <FiMessageCircle className="w-3.5 h-3.5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white leading-tight">AI Sales Assistant</p>
                <p className="text-xs text-blue-100 leading-tight">Ask about {product.name}</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
            >
              <FiX className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Messages */}
          <div className="h-72 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-2 flex-shrink-0 mt-0.5">
                    <FiMessageCircle className="w-3 h-3 text-blue-500" />
                  </div>
                )}
                <div
                  className={`max-w-[78%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-blue-500 text-white rounded-tr-sm'
                      : 'bg-white text-gray-700 border border-gray-100 rounded-tl-sm shadow-xs'
                  }`}
                >
                  {msg.content.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
                    part.startsWith('**') && part.endsWith('**')
                      ? <strong key={i}>{part.slice(2, -2)}</strong>
                      : <span key={i}>{part}</span>
                  )}
                  <p className={`text-xs mt-1 ${msg.role === 'user' ? 'text-blue-100' : 'text-gray-400'}`}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isSending && (
              <div className="flex justify-start">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-2 flex-shrink-0 mt-0.5">
                  <FiMessageCircle className="w-3 h-3 text-blue-500" />
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-xs">
                  <div className="flex space-x-1 items-center h-4">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Deal agreed banner - uses negotiated price */}
          {dealAgreed && agreedPrice && (
            <div className="mx-3 mb-2 mt-1 flex items-center space-x-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
              <HiCheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-green-800">Deal confirmed! 🎉</p>
                <p className="text-xs text-green-600">
                  Agreed price: {formatPriceStatic(agreedPrice)}
                </p>
              </div>
              <button
                onClick={() => setShowPaymentModal(true)}
                className="px-3 py-1.5 bg-green-500 text-white text-xs font-semibold rounded-lg hover:bg-green-600 transition-colors flex-shrink-0"
              >
                Pay with M-Pesa
              </button>
            </div>
          )}

          {/* Quick suggestion chips */}
          {messages.length <= 1 && (
            <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex flex-wrap gap-2">
              {[
                `Is ${(product.price * 0.9).toFixed(0)} possible?`,
                'Is this available?',
                'Tell me more',
              ].map(suggestion => (
                <button
                  key={suggestion}
                  onClick={() => { setInput(suggestion); inputRef.current?.focus(); }}
                  className="px-3 py-1 text-xs bg-white border border-gray-200 rounded-full text-gray-600 hover:border-blue-300 hover:text-blue-600 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          {/* Input row */}
          <div className="flex items-center space-x-2 px-3 py-3 bg-white border-t border-gray-100">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question or make an offer..."
              disabled={isSending}
              className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-blue-300 focus:bg-white transition-all placeholder-gray-400 disabled:opacity-50"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isSending}
              className="w-9 h-9 flex items-center justify-center bg-blue-500 text-white rounded-xl hover:bg-blue-600 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
            >
              <FiSend className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* M-Pesa Payment Modal - uses agreed price from chat */}
      {showPaymentModal && user && agreedPrice && (
        <MpesaPaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          product={{
            id: product.id,
            name: product.name,
            price: product.price,
          }}
          agreedPrice={agreedPrice}
          buyerDetails={{
            name: user.name,
            email: user.email,
            phoneNumber: user.phoneNumber || '',
          }}
          onPaymentSuccess={(transactionId) => {
            console.log('Payment successful:', transactionId);
            setShowPaymentModal(false);
            setDealAgreed(false);
            onPaymentSuccess?.();
          }}
        />
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();

  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  
  // State for main buy button payment modal
  const [showMainPaymentModal, setShowMainPaymentModal] = useState(false);

  const fetchProduct = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getProductById(params.id as string);
      setProduct(data);
    } catch (error) {
      console.error('Failed to fetch product:', error);
    } finally {
      setIsLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    if (params.id) fetchProduct();
  }, [params.id, fetchProduct]);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'KSH' }).format(price);

  const isSeller = Boolean(isLoaded && user && product?.seller_id === user.id);

  const handleDelete = async () => {
    if (!product) return;
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      setIsDeleting(true);
      await deleteProduct(product.id);
      router.push('/products');
    } catch (error) {
      console.error('Failed to delete product:', error);
      alert('Failed to delete product. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleShare = async () => {
    if (!product) return;
    try {
      setIsSharing(true);
      setShareError(null);
      setShareSuccess(false);
      const token = await getToken();
      const response = await api.post(
        '/n8n/product',
        { productId: product.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.success) {
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 3000);
      } else {
        setShareError('Share failed. Please try again.');
        setTimeout(() => setShareError(null), 3000);
      }
    } catch (error: unknown) {
      const err = error as {
        response?: { data?: { message?: string } };
      };
      setShareError(err.response?.data?.message || 'Failed to share. Please try again.');
      setTimeout(() => setShareError(null), 3000);
    } finally {
      setIsSharing(false);
    }
  };

  // Prepare user data for chat widget
  const userData = user ? {
    name: user.fullName || user.username || 'Customer',
    email: user.emailAddresses?.[0]?.emailAddress || '',
    phoneNumber: '',
  } : null;

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="h-64 bg-gray-200 rounded animate-pulse mb-4" />
          <div className="space-y-3">
            <div className="h-6 bg-gray-200 rounded w-3/4 animate-pulse" />
            <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse" />
            <div className="h-20 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // Not found
  if (!product) {
    return (
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
        <FiPackage className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-700 mb-2">Product not found</h3>
        <Link href="/products">
          <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Back to Products
          </button>
        </Link>
      </div>
    );
  }

  const isSellerUnavailable = !product.seller_id;
  const mainImage = product.images?.[0] || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80';
  const showChatWidget = !isSeller && !isSellerUnavailable && product.stock !== 0;

  return (
    <div className="max-w-4xl mx-auto space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <Link href="/products">
          <button className="flex items-center space-x-2 text-gray-600 hover:text-blue-600">
            <HiOutlineArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back</span>
          </button>
        </Link>

        {isSeller && (
          <div className="flex items-center space-x-2">

            <button
              onClick={handleShare}
              disabled={isSharing}
              className={`flex items-center px-3 py-2 text-sm border rounded-lg transition-all duration-200 disabled:opacity-50
                ${shareSuccess
                  ? 'text-green-600 border-green-300 bg-green-50'
                  : shareError
                  ? 'text-red-500 border-red-300 bg-red-50'
                  : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50 border-gray-200'
                }`}
            >
              {shareSuccess ? (
                <><HiCheckCircle className="w-4 h-4 mr-1" /><span>Posted!</span></>
              ) : shareError ? (
                <><HiExclamationCircle className="w-4 h-4 mr-1" /><span>{shareError}</span></>
              ) : (
                <><HiOutlineShare className="w-4 h-4 mr-1" /><span>{isSharing ? 'Sharing...' : 'Share to Social Media'}</span></>
              )}
            </button>

            <button
              onClick={() => router.push(`/products/${product.id}/edit`)}
              className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 border border-gray-200 rounded-lg transition-all duration-200"
            >
              <HiOutlinePencil className="w-4 h-4 mr-1" />
              <span>Edit</span>
            </button>

            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex items-center px-3 py-2 text-sm text-red-500 hover:text-red-700 hover:bg-red-50 border border-red-200 rounded-lg transition-all duration-200 disabled:opacity-50"
            >
              <HiOutlineTrash className="w-4 h-4 mr-1" />
              <span>{isDeleting ? 'Deleting...' : 'Delete'}</span>
            </button>

          </div>
        )}
      </div>

      {/* Seller Unavailable Banner */}
      {isSellerUnavailable && (
        <div className="flex items-center space-x-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <HiExclamationCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800">Seller Unavailable</p>
            <p className="text-xs text-amber-600">
              The seller of this product is no longer active. This item cannot be purchased.
            </p>
          </div>
        </div>
      )}

      {/* Product Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="md:flex">
          <div className="md:w-1/3 relative aspect-square">
            <Image src={mainImage} alt={product.name} fill className="object-cover" />
          </div>
          <div className="md:w-2/3 p-6">
            <div className="flex items-center space-x-2 mb-2">
              <h1 className="text-2xl font-semibold text-gray-800">{product.name}</h1>
              {isSellerUnavailable && (
                <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-600 rounded-full flex-shrink-0">
                  Seller Unavailable
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mb-4">ID: {product.id.slice(-8)}</p>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-xs text-gray-500">Price</p>
                <p className="text-xl font-bold text-gray-800">{formatPrice(product.price)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Stock</p>
                <p className="text-xl font-bold text-gray-800">{product.stock}</p>
              </div>
            </div>
            {product.description && (
              <div className="mb-4">
                <p className="text-xs text-gray-500 mb-1">Description</p>
                <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                  {product.description}
                </p>
              </div>
            )}
            <div className="mb-6">
              <p className="text-xs text-gray-500 mb-1">Seller</p>
              {isSellerUnavailable ? (
                <p className="text-sm text-red-500 flex items-center space-x-1">
                  <HiExclamationCircle className="w-4 h-4" />
                  <span>This seller is no longer available</span>
                </p>
              ) : (
                <p className="text-sm text-green-600">✓ Active Seller</p>
              )}
            </div>

            {/* Main Buy Now Button - uses original price from Supabase */}
            {!isSeller && (
              <button
                disabled={isSellerUnavailable || product.stock === 0}
                onClick={() => setShowMainPaymentModal(true)}
                className={`w-full flex items-center justify-center px-6 py-3 rounded-xl text-white font-semibold transition-all duration-200
                  ${isSellerUnavailable || product.stock === 0
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-blue-500 hover:bg-blue-600 hover:shadow-md active:scale-95'
                  }`}
              >
                <HiShoppingCart className="w-5 h-5 mr-2" />
                {isSellerUnavailable
                  ? 'Unavailable'
                  : product.stock === 0
                  ? 'Out of Stock'
                  : 'Buy Now'}
              </button>
            )}

            <div className="text-xs text-gray-400 mt-4">
              <p>Created: {product.created_at ? new Date(product.created_at).toLocaleDateString() : 'N/A'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Buy Now Payment Modal - uses original product price */}
      {showMainPaymentModal && user && (
        <MpesaPaymentModal
          isOpen={showMainPaymentModal}
          onClose={() => setShowMainPaymentModal(false)}
          product={{
            id: product.id,
            name: product.name,
            price: product.price,
          }}
          agreedPrice={product.price}
          buyerDetails={{
            name: user.fullName || user.username || 'Customer',
            email: user.emailAddresses?.[0]?.emailAddress || '',
            phoneNumber: '',
          }}
          onPaymentSuccess={(transactionId) => {
            console.log('Payment successful:', transactionId);
            setShowMainPaymentModal(false);
            fetchProduct();
          }}
        />
      )}

      {/* Chat Widget — buyers only, active seller, in stock */}
      {showChatWidget && userData && (
        <ChatWidget
          product={product}
          user={userData}
          onPaymentSuccess={fetchProduct}
        />
      )}

    </div>
  );
}
