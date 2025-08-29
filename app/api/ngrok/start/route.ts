import { NextRequest, NextResponse } from 'next/server';
import { ngrokManager } from '@/lib/ngrok-utils';

export async function POST(request: NextRequest) {
  try {
    const { port = 3000, authtoken, region, subdomain } = await request.json();

    // Validate port
    if (port < 1 || port > 65535) {
      return NextResponse.json({
        success: false,
        error: 'Invalid port number. Must be between 1 and 65535.'
      }, { status: 400 });
    }

    // Check if tunnel is already running
    if (ngrokManager.isTunnelRunning()) {
      const tunnelUrl = ngrokManager.getTunnelUrl();
      const webhookUrl = ngrokManager.getWebhookUrl();
      
      return NextResponse.json({
        success: true,
        message: 'Ngrok tunnel already running',
        tunnelUrl,
        webhookUrl,
        isRunning: true
      });
    }

    // Start the tunnel
    const tunnelUrl = await ngrokManager.startTunnel({
      port,
      authtoken,
      region,
      subdomain
    });

    const webhookUrl = ngrokManager.getWebhookUrl();

    return NextResponse.json({
      success: true,
      message: 'Ngrok tunnel started successfully',
      tunnelUrl,
      webhookUrl,
      isRunning: true,
      instructions: {
        razorpay: `Add this webhook URL to your Razorpay dashboard: ${webhookUrl}`,
        testPayment: 'Make a test payment to trigger the webhook',
        monitor: 'Check the console logs for webhook events'
      }
    });

  } catch (error) {
    console.error('[ngrok-start] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to start ngrok tunnel',
      details: (error as Error).message
    }, { status: 500 });
  }
}
