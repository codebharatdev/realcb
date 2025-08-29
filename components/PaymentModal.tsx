'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, CreditCard, Smartphone, Zap } from 'lucide-react';
import { DEFAULT_PRICING_PLANS } from '@/lib/token-manager';

interface AdminConfig {
  tokenLimit: number;
  pricingPlans: {
    id: string;
    name: string;
    tokens: number;
    price: number;
    description: string;
    isPopular?: boolean;
  }[];
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onPaymentSuccess: () => void;
}

interface OrderData {
  orderId: string;
  paymentUrl: string;
  plan: {
    id: string;
    name: string;
    tokens: number;
    price: number;
    description: string;
  };
}

export default function PaymentModal({ isOpen, onClose, userId, onPaymentSuccess }: PaymentModalProps) {
  const [selectedPlan, setSelectedPlan] = useState(DEFAULT_PRICING_PLANS[0]);
  const [adminConfig, setAdminConfig] = useState<AdminConfig | null>(null);
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'success' | 'failed'>('pending');

  // Load admin configuration
  useEffect(() => {
    const loadAdminConfig = async () => {
      try {
        const response = await fetch('/api/admin/config?userId=admin');
        const data = await response.json();
        if (data.success) {
          setAdminConfig(data.config);
          // Update selected plan with admin-configured token limit
          setSelectedPlan({
            ...DEFAULT_PRICING_PLANS[0],
            tokens: data.config.tokenLimit
          });
        }
      } catch (error) {
        console.error('Failed to load admin config:', error);
      }
    };

    if (isOpen) {
      loadAdminConfig();
    }
  }, [isOpen]);

  const createOrderAndShowUPI = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          planId: selectedPlan.id,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const orderData = {
          orderId: data.order.id,
          paymentUrl: data.paymentUrl,
          plan: data.plan,
        };
        setOrderData(orderData);
        // Immediately show UPI payment after order creation
        handlePaymentWithOrder(orderData);
      } else {
        setError(data.error || 'Failed to create payment order');
      }
    } catch (err) {
      setError('Failed to create payment order');
    } finally {
      setLoading(false);
    }
  };

  const handlePlanSelect = (plan: typeof DEFAULT_PRICING_PLANS[0]) => {
    setSelectedPlan(plan);
    setOrderData(null);
    setPaymentStatus('pending');
  };

    const handlePaymentWithOrder = (orderData: OrderData) => {
    // Load Razorpay script dynamically
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => {
      // Initialize Razorpay checkout
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_RAlWiyzIIc941o',
        amount: orderData.plan.price * 100, // Convert to paise
        currency: 'INR',
        name: 'CodeBharat.dev',
        description: `Purchase ${orderData.plan.tokens.toLocaleString()} tokens - ${orderData.plan.name}`,
        order_id: orderData.orderId,
        prefill: {
          method: 'upi'
        },
        theme: {
          color: '#F97316'
        },
        handler: async function (response: any) {
          console.log('Payment successful:', response);
          
          // Verify payment and add tokens
          try {
            const verifyResponse = await fetch('/api/payment/verify', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                userId: userId
              }),
            });

            const verifyData = await verifyResponse.json();
            
            if (verifyData.success) {
              console.log('Payment verified and tokens added:', verifyData);
              setPaymentStatus('success');
              onPaymentSuccess();
              
              // Show success message for 2 seconds, then redirect to app generation
              setTimeout(() => {
                onClose();
                // Redirect to the main app generation page
                window.location.href = '/';
              }, 2000);
            } else {
              console.error('Payment verification failed:', verifyData.error);
              setError('Payment verification failed. Please contact support.');
              setPaymentStatus('failed');
            }
          } catch (error) {
            console.error('Error verifying payment:', error);
            setError('Payment verification failed. Please contact support.');
            setPaymentStatus('failed');
          }
        },
        modal: {
          ondismiss: function() {
            console.log('Payment modal closed');
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    };
    script.onerror = () => {
      setError('Failed to load payment gateway. Please try again.');
    };
    document.head.appendChild(script);
  };

  const handlePayment = () => {
    if (orderData?.orderId) {
      handlePaymentWithOrder(orderData);
    }
  };

  const verifyPayment = async () => {
    try {
      setLoading(true);
      // In a real implementation, you would get these from the payment callback
      // For now, we'll simulate a successful payment
      setPaymentStatus('success');
      onPaymentSuccess();
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      setPaymentStatus('failed');
      setError('Payment verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
      setOrderData(null);
      setPaymentStatus('pending');
      setError(null);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-gray-900 rounded-2xl p-6 w-full max-w-md border border-white/20"
            onClick={(e) => e.stopPropagation()}
          >
                         <div className="flex items-center justify-between mb-6">
               <h2 className="text-xl font-bold text-white">Buy AI Credits</h2>
              <button
                onClick={handleClose}
                className="text-white/60 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {paymentStatus === 'success' ? (
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                className="text-center py-8"
              >
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-white" />
                </div>
                                 <h3 className="text-xl font-bold text-white mb-2">Payment Successful!</h3>
                 <p className="text-white/60">
                   {selectedPlan.tokens.toLocaleString()} AI credits have been added to your account. Redirecting you to start building apps...
                 </p>
              </motion.div>
            ) : (
              <>
                                 {/* Single Plan Display */}
                 <div className="mb-6">
                   <h3 className="text-white font-semibold mb-3">Get AI Credits to Build Apps</h3>
                  <div className="p-4 rounded-xl border-2 border-orange-500 bg-orange-500/10">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-white font-semibold">{selectedPlan.name}</h4>
                      <span className="bg-orange-500 text-white text-xs px-2 py-1 rounded-full">
                        Best Value
                      </span>
                    </div>
                    <p className="text-white/60 text-sm mb-2">{selectedPlan.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-orange-400" />
                        <span className="text-white font-medium">
                          {selectedPlan.tokens.toLocaleString()} AI credits
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-bold">₹{selectedPlan.price}</div>
                        <div className="text-white/40 text-xs">
                          ₹{(selectedPlan.price / (selectedPlan.tokens / 1000)).toFixed(2)}/1K credits
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4"
                  >
                    <p className="text-red-400 text-sm">{error}</p>
                  </motion.div>
                )}

                                 {/* Payment Button */}
                 <div className="space-y-3">
                   <motion.button
                     whileHover={{ scale: 1.02 }}
                     whileTap={{ scale: 0.98 }}
                     onClick={createOrderAndShowUPI}
                     disabled={loading}
                     className="w-full bg-gradient-to-r from-orange-500 to-green-500 text-white py-3 px-4 rounded-lg font-medium hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                     {loading ? (
                       <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                     ) : (
                       <>
                         <Smartphone className="w-5 h-5" />
                         Buy AI Credits - Pay ₹{selectedPlan.price}
                       </>
                     )}
                   </motion.button>

                  <div className="text-center">
                    <p className="text-white/40 text-xs">
                      Secure payment powered by Razorpay
                    </p>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
