import { NextRequest, NextResponse } from 'next/server';
import { razorpayClient } from '@/lib/razorpay-client';

export async function GET(request: NextRequest) {
  try {
    // Test if Razorpay client can be initialized
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    return NextResponse.json({
      success: true,
      hasKeyId: !!keyId,
      hasKeySecret: !!keySecret,
      keyIdLength: keyId?.length || 0,
      keySecretLength: keySecret?.length || 0,
      message: 'Razorpay client test completed'
    });

  } catch (error) {
    console.error('[test-razorpay] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
  }
}
