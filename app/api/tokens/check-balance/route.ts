import { NextRequest, NextResponse } from 'next/server';
import { tokenManager } from '@/lib/token-manager';

export async function POST(request: NextRequest) {
  try {
    const { userId, requiredTokens } = await request.json();

    if (!userId || !requiredTokens) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Get current balance
    const balance = await tokenManager.getUserTokenBalance(userId);
    
    if (balance.tokens < requiredTokens) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Insufficient tokens',
          currentBalance: balance.tokens,
          requiredTokens: requiredTokens
        },
        { status: 402 }
      );
    }

    return NextResponse.json({
      success: true,
      currentBalance: balance.tokens,
      requiredTokens: requiredTokens
    });

  } catch (error) {
    console.error('[check-balance] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check token balance' },
      { status: 500 }
    );
  }
}
