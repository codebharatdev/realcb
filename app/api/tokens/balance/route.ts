import { NextRequest, NextResponse } from 'next/server';
import { tokenManager } from '@/lib/token-manager';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'User ID is required'
      }, { status: 400 });
    }

    const balance = await tokenManager.getUserTokenBalance(userId);
    const transactions = await tokenManager.getTokenTransactions(userId, 5);

    return NextResponse.json({
      success: true,
      balance,
      recentTransactions: transactions
    });

  } catch (error) {
    console.error('[tokens-balance] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch token balance'
    }, { status: 500 });
  }
}
