'use client';

import { useState } from 'react';

export default function TestPaymentPage() {
  const [orderData, setOrderData] = useState<any>(null);

  const createTestOrderAndShowUPI = async () => {
    try {
      const response = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: '4DZy3ysvIWZUtbL4mR45SpWCW5e2',
          planId: 'app-builder',
        }),
      });

      const data = await response.json();
      if (data.success) {
        setOrderData(data);
        // Immediately show UPI payment after order creation
        handlePaymentWithOrder(data);
      } else {
        alert('Failed to create order: ' + data.error);
      }
    } catch (error) {
      alert('Error creating order: ' + error);
    }
  };

    const handlePaymentWithOrder = (orderData: any) => {
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
        order_id: orderData.order.id,
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
                userId: '4DZy3ysvIWZUtbL4mR45SpWCW5e2'
              }),
            });

            const verifyData = await verifyResponse.json();
            
            if (verifyData.success) {
              console.log('Payment verified and tokens added:', verifyData);
              alert(`Payment successful! ${verifyData.tokensAdded.toLocaleString()} AI credits added. New balance: ${verifyData.newBalance.toLocaleString()} credits. Redirecting to app generation...`);
              
              // Redirect to the main app generation page after a short delay
              setTimeout(() => {
                window.location.href = '/';
              }, 1000);
            } else {
              console.error('Payment verification failed:', verifyData.error);
              alert('Payment verification failed: ' + verifyData.error);
            }
          } catch (error) {
            console.error('Error verifying payment:', error);
            alert('Payment verification failed. Please contact support.');
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
      alert('Failed to load payment gateway. Please try again.');
    };
    document.head.appendChild(script);
  };

  const handlePayment = () => {
    if (orderData?.order?.id) {
      handlePaymentWithOrder(orderData);
    }
  };

    return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-2xl mx-auto">
                 <div className="text-center mb-8">
           <h1 className="text-3xl font-bold mb-4">Buy AI Credits</h1>
           <p className="text-gray-400">Get more AI credits to continue building apps</p>
         </div>
        
                 <div className="bg-gray-800 rounded-xl p-6 mb-6">
           <h2 className="text-xl font-semibold mb-4">App Builder Pack</h2>
           <div className="flex items-center justify-between mb-4">
             <div>
               <p className="text-2xl font-bold text-orange-400">₹100</p>
               <p className="text-gray-400">20,000 AI credits</p>
             </div>
             <div className="text-right">
               <p className="text-sm text-gray-400">₹5.00 per 1K credits</p>
             </div>
           </div>
                       <button
              onClick={createTestOrderAndShowUPI}
              className="w-full bg-gradient-to-r from-orange-500 to-green-500 text-white py-3 px-6 rounded-lg font-medium hover:shadow-lg transition-all duration-200"
            >
              Buy AI Credits - Pay ₹100
            </button>
         </div>

        
      </div>
    </div>
  );
}
