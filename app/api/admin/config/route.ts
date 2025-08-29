import { NextRequest, NextResponse } from 'next/server';
import { adminConfigManager } from '@/lib/admin-config';
import { getFirebaseForAPI } from '@/lib/firebase-utils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    // For now, bypass authentication - allow any userId
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'Missing userId parameter'
      }, { status: 400 });
    }

    const config = await adminConfigManager.getAdminConfig();
    
    return NextResponse.json({
      success: true,
      config
    });

  } catch (error) {
    console.error('[admin-config] Error:', error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, config } = await request.json();

    if (!userId || !config) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: userId and config'
      }, { status: 400 });
    }

    // For now, bypass authentication - allow any userId
    const updatedConfig = await adminConfigManager.updateAdminConfig(config, userId);
    
    return NextResponse.json({
      success: true,
      config: updatedConfig,
      message: 'Configuration updated successfully'
    });

  } catch (error) {
    console.error('[admin-config] Error:', error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 });
  }
}
