import { NextRequest, NextResponse } from 'next/server';
import { razorpayClient } from '@/lib/razorpay-client';
import { tokenManager, DEFAULT_PRICING_PLANS } from '@/lib/token-manager';

export async function POST(request: NextRequest) {
  try {
    const { userId, planId } = await request.json();

    if (!userId || !planId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: userId and planId'
      }, { status: 400 });
    }

    // Find the selected plan
    const plan = DEFAULT_PRICING_PLANS.find(p => p.id === planId);
    if (!plan) {
      return NextResponse.json({
        success: false,
        error: 'Invalid plan selected'
      }, { status: 400 });
    }

    // Create Razorpay order with shorter receipt (max 40 chars for Razorpay)
    const receipt = `tokens_${Date.now()}`;
    console.log('[create-order] Creating order with:', { plan, receipt, userId });
    
    const order = await razorpayClient.createOrder(
      plan.price,
      receipt,
      {
        userId,
        planId,
        tokens: plan.tokens.toString(),
        description: `App Builder Pack - ${plan.tokens.toLocaleString()} AI credits`
      }
    );
    
    console.log('[create-order] Order created:', order);

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt
      },
      plan: {
        id: plan.id,
        name: plan.name,
        tokens: plan.tokens,
        price: plan.price,
        description: plan.description
      },
      paymentUrl: razorpayClient.generateUPIPaymentLink(
        order.id,
        plan.price,
        `App Builder Pack - ${plan.tokens.toLocaleString()} AI credits`
      )
    });

  } catch (error) {
    console.error('[create-order] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create payment order',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
  }
}
