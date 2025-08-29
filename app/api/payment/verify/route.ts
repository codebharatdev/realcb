import { NextRequest, NextResponse } from 'next/server';
import { razorpayClient } from '@/lib/razorpay-client';
import { tokenManager } from '@/lib/token-manager';
import { adminConfigManager } from '@/lib/admin-config';

export async function POST(request: NextRequest) {
  try {
    const { 
      razorpay_payment_id, 
      razorpay_order_id, 
      razorpay_signature,
      userId 
    } = await request.json();

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !userId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required payment verification parameters'
      }, { status: 400 });
    }

    // Verify payment signature
    const isValidSignature = await razorpayClient.verifyPayment(
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature
    );

    if (!isValidSignature) {
      return NextResponse.json({
        success: false,
        error: 'Invalid payment signature'
      }, { status: 400 });
    }

    // Get payment and order details
    const payment = await razorpayClient.getPaymentDetails(razorpay_payment_id);
    const order = await razorpayClient.getOrderDetails(razorpay_order_id);

    // Verify payment status
    if (payment.status !== 'captured') {
      return NextResponse.json({
        success: false,
        error: 'Payment not completed'
      }, { status: 400 });
    }

    // Get admin configuration for token limit
    const adminConfig = await adminConfigManager.getAdminConfig();
    if (!adminConfig) {
      return NextResponse.json({
        success: false,
        error: 'Admin configuration not found'
      }, { status: 500 });
    }

    // Use admin-configured token limit
    const tokensToAdd = adminConfig.tokenLimit;
    const expectedAmount = 100 * 100; // ₹100 in paise

    if (payment.amount !== expectedAmount) {
      return NextResponse.json({
        success: false,
        error: 'Payment amount mismatch'
      }, { status: 400 });
    }

    // Add tokens to user account
    await tokenManager.addTokens(
      userId,
      tokensToAdd,
      razorpay_payment_id,
      `Purchase ${tokensToAdd.toLocaleString()} tokens - App Builder Pack`
    );

    // Get updated token balance
    const updatedBalance = await tokenManager.getUserTokenBalance(userId);

    return NextResponse.json({
      success: true,
      message: 'Payment verified and tokens added successfully',
      payment: {
        id: payment.id,
        amount: payment.amount,
        method: payment.method,
        status: payment.status,
        upi: payment.upi
      },
      tokensAdded: tokensToAdd,
      newBalance: updatedBalance?.tokens || 0
    });

  } catch (error) {
    console.error('[payment-verify] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to verify payment'
    }, { status: 500 });
  }
}
