import { NextRequest, NextResponse } from 'next/server';
import { tokenManager } from '@/lib/token-manager';

export async function POST(request: NextRequest) {
  try {
    const { userId, estimatedTokens, actualTokens, description } = await request.json();

    if (!userId || estimatedTokens === undefined || actualTokens === undefined) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: userId, estimatedTokens, and actualTokens'
      }, { status: 400 });
    }

    console.log('[tokens-adjust] Adjusting token consumption:', {
      userId,
      estimatedTokens,
      actualTokens,
      difference: actualTokens - estimatedTokens
    });

    // Adjust token consumption based on actual usage
    const adjusted = await tokenManager.adjustTokenConsumption(
      userId,
      estimatedTokens,
      actualTokens,
      description || 'Token adjustment'
    );

    if (!adjusted) {
      return NextResponse.json({
        success: false,
        error: 'Failed to adjust token consumption'
      }, { status: 500 });
    }

    // Get updated balance
    const updatedBalance = await tokenManager.getUserTokenBalance(userId);
    const tokensAdjusted = actualTokens - estimatedTokens;

    return NextResponse.json({
      success: true,
      message: 'Token consumption adjusted successfully',
      estimatedTokens,
      actualTokens,
      tokensAdjusted,
      newBalance: updatedBalance?.tokens || 0,
      adjustmentType: tokensAdjusted > 0 ? 'additional_charge' : 'refund'
    });

  } catch (error) {
    console.error('[tokens-adjust] Error:', error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 });
  }
}
