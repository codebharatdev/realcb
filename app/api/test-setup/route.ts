import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const setupStatus = {
      firebase: {
        apiKey: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: !!process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: !!process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: !!process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: !!process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      },
      razorpay: {
        keyId: !!process.env.RAZORPAY_KEY_ID,
        keySecret: !!process.env.RAZORPAY_KEY_SECRET,
        webhookSecret: !!process.env.RAZORPAY_WEBHOOK_SECRET,
      },
      ngrok: {
        tunnelUrl: 'https://099c5811de64.ngrok-free.app',
        webhookUrl: 'https://099c5811de64.ngrok-free.app/api/payment/webhook'
      }
    };

    const firebaseComplete = Object.values(setupStatus.firebase).every(Boolean);
    const razorpayComplete = Object.values(setupStatus.razorpay).every(Boolean);

    return NextResponse.json({
      success: true,
      setupStatus,
      firebaseComplete,
      razorpayComplete,
      ready: firebaseComplete && razorpayComplete,
      message: firebaseComplete && razorpayComplete 
        ? 'All configurations are ready! You can now test payments.' 
        : 'Some configurations are missing. Check the setupStatus for details.'
    });

  } catch (error) {
    console.error('[test-setup] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to check setup status'
    }, { status: 500 });
  }
}
