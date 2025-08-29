import { NextRequest, NextResponse } from 'next/server';
import { tokenManager } from '@/lib/token-manager';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('[consume-actual] Received request body:', body);
    
    const { userId, actualTokens, description } = body;

    console.log('[consume-actual] Parsed parameters:', {
      userId,
      actualTokens,
      description,
      hasUserId: !!userId,
      hasActualTokens: !!actualTokens,
      actualTokensType: typeof actualTokens,
      actualTokensValue: actualTokens
    });

    if (!userId || !actualTokens || actualTokens <= 0) {
      console.log('[consume-actual] Validation failed:', {
        hasUserId: !!userId,
        hasActualTokens: !!actualTokens,
        actualTokensValue: actualTokens,
        actualTokensValid: actualTokens > 0
      });
      return NextResponse.json(
        { success: false, error: 'Missing or invalid parameters' },
        { status: 400 }
      );
    }

    // Get current balance
    const balance = await tokenManager.getUserTokenBalance(userId);
    
    if (balance.tokens < actualTokens) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Insufficient tokens',
          currentBalance: balance.tokens,
          requiredTokens: actualTokens
        },
        { status: 402 }
      );
    }

    // Consume the actual tokens
    await tokenManager.consumeTokens(userId, actualTokens, description || 'AI Code Generation');

    // Get updated balance
    const updatedBalance = await tokenManager.getUserTokenBalance(userId);

    return NextResponse.json({
      success: true,
      tokensConsumed: actualTokens,
      remainingBalance: updatedBalance.tokens,
      previousBalance: balance.tokens
    });

  } catch (error) {
    console.error('[consume-actual] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to consume tokens' },
      { status: 500 }
    );
  }
}
