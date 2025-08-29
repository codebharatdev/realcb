import { NextRequest, NextResponse } from 'next/server';
import { ngrokManager } from '@/lib/ngrok-utils';

export async function POST(request: NextRequest) {
  try {
    // Check if tunnel is running
    if (!ngrokManager.isTunnelRunning()) {
      return NextResponse.json({
        success: true,
        message: 'No ngrok tunnel running',
        isRunning: false
      });
    }

    // Stop the tunnel
    await ngrokManager.stopTunnel();

    return NextResponse.json({
      success: true,
      message: 'Ngrok tunnel stopped successfully',
      isRunning: false
    });

  } catch (error) {
    console.error('[ngrok-stop] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to stop ngrok tunnel',
      details: (error as Error).message
    }, { status: 500 });
  }
}
