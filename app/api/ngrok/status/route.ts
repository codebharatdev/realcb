import { NextRequest, NextResponse } from 'next/server';
import { ngrokManager } from '@/lib/ngrok-utils';

export async function GET(request: NextRequest) {
  try {
    const isRunning = ngrokManager.isTunnelRunning();
    const tunnelUrl = ngrokManager.getTunnelUrl();
    const webhookUrl = ngrokManager.getWebhookUrl();

    return NextResponse.json({
      success: true,
      isRunning,
      tunnelUrl,
      webhookUrl,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[ngrok-status] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get ngrok status',
      details: (error as Error).message
    }, { status: 500 });
  }
}
