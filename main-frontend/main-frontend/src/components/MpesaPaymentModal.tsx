'use client';

import { useState, useRef, useCallback } from 'react';
import { FiX, FiCheck, FiAlertCircle, FiSmartphone, FiCreditCard, FiXCircle } from 'react-icons/fi';
import api from '@/lib/api';

interface MpesaPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: {
    id: string;
    name: string;
    price: number;
  };
  agreedPrice: number;
  buyerDetails: {
    name: string;
    email: string;
    phoneNumber: string;
  };
  onPaymentSuccess?: (orderId: string, receiptNumber?: string) => void;
}

export default function MpesaPaymentModal({
  isOpen,
  onClose,
  product,
  agreedPrice,
  buyerDetails,
  onPaymentSuccess,
}: MpesaPaymentModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'form' | 'stk_push' | 'success' | 'declined' | 'error'>('form');
  const [phoneNumber, setPhoneNumber] = useState(buyerDetails.phoneNumber || '');
  const [currentOrderId, setCurrentOrderId] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [receiptNumber, setReceiptNumber] = useState('');

  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const formatKES = (price: number) =>
    new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(price);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const resetModal = useCallback(() => {
    stopPolling();
    setStep('form');
    setPhoneNumber(buyerDetails.phoneNumber || '');
    setCurrentOrderId('');
    setErrorMessage('');
    setReceiptNumber('');
    setIsProcessing(false);
  }, [stopPolling, buyerDetails.phoneNumber]);

  const startPolling = useCallback((orderId: string) => {
    console.log('[Polling] Starting for order:', orderId);

    pollingRef.current = setInterval(async () => {
      try {
        const response = await api.get(`/mpesa/status/${orderId}`);

        if (response.data.success) {
          const { paymentStatus, mpesaReceiptNumber } = response.data.data;
          console.log('[Polling] Status:', paymentStatus);

          if (paymentStatus === 'paid') {
            stopPolling();
            setReceiptNumber(mpesaReceiptNumber || '');
            setStep('success');
            onPaymentSuccess?.(orderId, mpesaReceiptNumber);
            // Auto-close after 4 seconds
            setTimeout(() => {
              onClose();
              resetModal();
            }, 4000);

          } else if (paymentStatus === 'failed') {
            // User declined STK prompt or request timed out on phone
            stopPolling();
            setStep('declined');

          } else if (paymentStatus === 'cancelled') {
            stopPolling();
            setStep('declined');
          }
          // 'pending' or 'processing' → keep polling
        }
      } catch (error: any) {
        // Network hiccup — keep polling, don't stop
        console.error('[Polling] error:', error.response?.data || error.message);
      }
    }, 3000);

    // Hard stop after 2 minutes
    timeoutRef.current = setTimeout(() => {
      stopPolling();
      setErrorMessage(
        'No response received. If you completed the payment, contact support with your M-Pesa receipt.'
      );
      setStep('error');
    }, 120000);
  }, [stopPolling, resetModal, onPaymentSuccess, onClose]);

  const handleInitiatePayment = async () => {
    setErrorMessage('');

    const cleanedPhone = phoneNumber.replace(/\D/g, '');
    if (!cleanedPhone || cleanedPhone.length < 10) {
      setErrorMessage('Please enter a valid M-Pesa phone number');
      return;
    }

    let formattedPhone = cleanedPhone;
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '254' + formattedPhone.substring(1);
    } else if (!formattedPhone.startsWith('254')) {
      formattedPhone = '254' + formattedPhone;
    }

    setIsProcessing(true);
    setStep('stk_push');

    try {
      const response = await api.post('/mpesa/create-and-pay', {
        productId: product.id,
        phoneNumber: formattedPhone,
        quantity: 1,
      });

      if (response.data.success) {
        const { orderId } = response.data.data;
        console.log('[Payment] Order created:', orderId);
        setCurrentOrderId(orderId);
        startPolling(orderId);
      } else {
        throw new Error(response.data.message || 'Payment initiation failed');
      }
    } catch (error: any) {
      console.error('[Payment] Error:', error);
      const errorMsg =
        error.response?.data?.message ||
        error.message ||
        'Failed to initiate payment. Please try again.';
      setErrorMessage(errorMsg);
      setStep('error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    stopPolling();
    onClose();
    resetModal();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">

        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 transition-colors duration-500 ${
          step === 'success' ? 'bg-green-500' :
          step === 'declined' ? 'bg-orange-500' :
          step === 'error' ? 'bg-red-500' :
          'bg-green-500'
        }`}>
          <div className="flex items-center space-x-2">
            <FiSmartphone className="w-5 h-5 text-white" />
            <h2 className="text-lg font-semibold text-white">M-Pesa Payment</h2>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
          >
            <FiX className="w-4 h-4 text-white" />
          </button>
        </div>

        <div className="p-6">

          {/* ── STEP: form ── */}
          {step === 'form' && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">{product.name}</span>
                  <span className="font-medium">{formatKES(agreedPrice)}</span>
                </div>
                <div className="border-t border-gray-200 pt-2 mt-2">
                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span className="text-green-600">{formatKES(agreedPrice)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <div className="flex items-start space-x-2">
                  <FiCreditCard className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-blue-900">Payment Details</p>
                    <p className="text-xs text-blue-700 mt-1">
                      You will receive an STK push to complete payment
                    </p>
                    <div className="mt-2 p-2 bg-white rounded-lg">
                      <p className="text-xs text-gray-600">PayBill Number:</p>
                      <p className="text-sm font-mono font-bold text-blue-800">174379</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  M-Pesa Phone Number
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="07XXXXXXXX or 2547XXXXXXXX"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-green-500"
                />
                <p className="text-xs text-gray-500">
                  You'll receive an STK push on this number
                </p>
              </div>

              {errorMessage && (
                <div className="flex items-center space-x-2 text-red-600 bg-red-50 rounded-lg p-3 text-sm">
                  <FiAlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={handleClose}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleInitiatePayment}
                  disabled={!phoneNumber || isProcessing}
                  className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors"
                >
                  {isProcessing ? 'Processing...' : 'Pay with M-Pesa'}
                </button>
              </div>
            </div>
          )}

          {/* ── STEP: stk_push — waiting for user to enter PIN ── */}
          {step === 'stk_push' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto border-4 border-green-500 border-t-transparent rounded-full animate-spin mb-4" />
              <h3 className="text-lg font-semibold">Awaiting Payment</h3>
              <p className="text-sm text-gray-500 mt-2">
                Check your phone for the M-Pesa prompt
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Enter your M-Pesa PIN to complete the payment
              </p>
              {currentOrderId && (
                <p className="text-xs text-gray-300 mt-3 font-mono">
                  Ref: {currentOrderId.substring(0, 8)}...
                </p>
              )}
              <button
                onClick={() => { stopPolling(); resetModal(); }}
                className="mt-6 text-sm text-gray-500 hover:text-gray-700 underline"
              >
                Cancel
              </button>
            </div>
          )}

          {/* ── STEP: success ── */}
          {step === 'success' && (
            <div className="text-center py-8">
              <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4 animate-bounce">
                <FiCheck className="w-10 h-10 text-green-500" />
              </div>
              <h3 className="text-xl font-bold text-green-700">Payment Successful!</h3>
              <p className="text-sm text-gray-500 mt-2">
                Your order for <span className="font-semibold text-gray-700">{product.name}</span> has been confirmed.
              </p>
              {receiptNumber && (
                <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-3">
                  <p className="text-xs text-green-700 font-medium">M-Pesa Receipt Number</p>
                  <p className="text-lg font-mono font-bold text-green-800 mt-1">{receiptNumber}</p>
                </div>
              )}
              <div className="mt-4 bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-500">Amount paid</p>
                <p className="text-lg font-bold text-gray-800">{formatKES(agreedPrice)}</p>
              </div>
              <p className="text-xs text-gray-400 mt-4">This window will close automatically...</p>
            </div>
          )}

          {/* ── STEP: declined — user pressed "Cancel" on their phone ── */}
          {step === 'declined' && (
            <div className="text-center py-8">
              <div className="w-20 h-20 mx-auto bg-orange-100 rounded-full flex items-center justify-center mb-4">
                <FiXCircle className="w-10 h-10 text-orange-500" />
              </div>
              <h3 className="text-xl font-bold text-orange-700">Payment Declined</h3>
              <p className="text-sm text-gray-500 mt-2">
                You cancelled the M-Pesa payment request on your phone.
              </p>
              <p className="text-xs text-gray-400 mt-1">
                No money has been deducted from your account.
              </p>
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={handleClose}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={resetModal}
                  className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}

          {/* ── STEP: error — something went wrong technically ── */}
          {step === 'error' && (
            <div className="text-center py-8">
              <div className="w-20 h-20 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
                <FiAlertCircle className="w-10 h-10 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-red-700">Something Went Wrong</h3>
              <p className="text-sm text-gray-500 mt-2">{errorMessage}</p>
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={handleClose}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={resetModal}
                  className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}