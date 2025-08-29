import { NextRequest, NextResponse } from 'next/server';
import { tokenManager } from '@/lib/token-manager';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Missing userId parameter' },
        { status: 400 }
      );
    }

    // Get current balance
    const balance = await tokenManager.getUserTokenBalance(userId);
    
    // Test consuming 100 tokens
    const consumeResult = await tokenManager.consumeTokens(userId, 100, 'Test consumption');
    
    // Get updated balance
    const updatedBalance = await tokenManager.getUserTokenBalance(userId);

    return NextResponse.json({
      success: true,
      originalBalance: balance,
      consumeResult,
      updatedBalance,
      tokensConsumed: balance.tokens - updatedBalance.tokens
    });

  } catch (error) {
    console.error('[test-token-system] Error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
