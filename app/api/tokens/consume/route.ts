import { NextRequest, NextResponse } from 'next/server';
import { tokenManager } from '@/lib/token-manager';

export async function POST(request: NextRequest) {
  try {
    const { userId, prompt, estimatedTokens } = await request.json();

    if (!userId || !prompt) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: userId and prompt'
      }, { status: 400 });
    }

    // Calculate tokens to consume
    const tokensToConsume = estimatedTokens || tokenManager.estimateTokensForPrompt(prompt);

    // Check if user has sufficient tokens
    const hasSufficientTokens = await tokenManager.checkTokenSufficiency(userId, tokensToConsume);
    
    if (!hasSufficientTokens) {
      const balance = await tokenManager.getUserTokenBalance(userId);
      return NextResponse.json({
        success: false,
        error: 'Insufficient tokens',
        currentBalance: balance?.tokens || 0,
        requiredTokens: tokensToConsume,
        needsRecharge: true
      }, { status: 402 }); // Payment Required
    }

    // Consume tokens
    const consumed = await tokenManager.consumeTokens(
      userId,
      tokensToConsume,
      `AI Code Generation: "${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}"`
    );

    if (!consumed) {
      return NextResponse.json({
        success: false,
        error: 'Failed to consume tokens'
      }, { status: 500 });
    }

    // Get updated balance
    const updatedBalance = await tokenManager.getUserTokenBalance(userId);

    return NextResponse.json({
      success: true,
      message: 'Tokens consumed successfully',
      tokensConsumed: tokensToConsume,
      remainingBalance: updatedBalance?.tokens || 0
    });

  } catch (error) {
    console.error('[tokens-consume] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to consume tokens'
    }, { status: 500 });
  }
}
