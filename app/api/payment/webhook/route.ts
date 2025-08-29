import { NextRequest, NextResponse } from 'next/server';
import { razorpayClient } from '@/lib/razorpay-client';
import { tokenManager } from '@/lib/token-manager';
import { adminConfigManager } from '@/lib/admin-config';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-razorpay-signature');

    if (!signature) {
      return NextResponse.json({
        success: false,
        error: 'Missing signature'
      }, { status: 400 });
    }

    // Verify webhook signature
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
      .update(body)
      .digest('hex');

    if (expectedSignature !== signature) {
      return NextResponse.json({
        success: false,
        error: 'Invalid signature'
      }, { status: 400 });
    }

    const event = JSON.parse(body);

    // Handle payment.captured event
    if (event.event === 'payment.captured') {
      console.log('[payment-webhook] Processing payment.captured event:', JSON.stringify(event, null, 2));
      
      const payment = event.payload.payment?.entity;
      const order = event.payload.order?.entity;

      if (!payment || !order) {
        console.error('[payment-webhook] Missing payment or order entity:', { payment: !!payment, order: !!order });
        return NextResponse.json({
          success: false,
          error: 'Missing payment or order information'
        }, { status: 400 });
      }

      // Extract user ID from order notes
      const userId = order.notes?.userId;
      const planId = order.notes?.planId;

      if (!userId || !planId) {
        console.error('Missing userId or planId in order notes:', order.notes);
        return NextResponse.json({
          success: false,
          error: 'Missing user or plan information'
        }, { status: 400 });
      }

      // Get admin configuration for token limit
      const adminConfig = await adminConfigManager.getAdminConfig();
      if (!adminConfig) {
        console.error('Failed to get admin configuration');
        return NextResponse.json({
          success: false,
          error: 'Admin configuration not found'
        }, { status: 500 });
      }

      // Use admin-configured token limit
      const tokensToAdd = adminConfig.tokenLimit;
      const expectedAmount = 100 * 100; // ₹100 in paise

      if (payment.amount !== expectedAmount) {
        console.error('Payment amount mismatch:', payment.amount, expectedAmount);
        return NextResponse.json({
          success: false,
          error: 'Payment amount mismatch'
        }, { status: 400 });
      }

      // Add tokens to user account
      try {
        await tokenManager.addTokens(
          userId,
          tokensToAdd,
          payment.id,
          `Purchase ${tokensToAdd.toLocaleString()} tokens - App Builder Pack`
        );

        console.log(`[payment-webhook] Payment successful: ${tokensToAdd} tokens added to user ${userId}`);
      } catch (error) {
        console.error('[payment-webhook] Error adding tokens:', error);
        return NextResponse.json({
          success: false,
          error: 'Failed to add tokens to user account'
        }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Webhook processed successfully'
    });

  } catch (error) {
    console.error('[payment-webhook] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Webhook processing failed'
    }, { status: 500 });
  }
}
