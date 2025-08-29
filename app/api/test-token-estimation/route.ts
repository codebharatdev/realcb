import { NextRequest, NextResponse } from 'next/server';
import { tokenManager } from '@/lib/token-manager';

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json({
        success: false,
        error: 'Missing prompt parameter'
      }, { status: 400 });
    }

    // Test the new token estimation
    const estimatedTokens = tokenManager.estimateTokensForPrompt(prompt);
    
    // Calculate old estimation for comparison
    const oldEstimation = Math.max(100, Math.ceil(prompt.length / 4) + Math.ceil(Math.ceil(prompt.length / 4) * 0.3));

    return NextResponse.json({
      success: true,
      prompt: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''),
      promptLength: prompt.length,
      estimations: {
        new: estimatedTokens,
        old: oldEstimation,
        difference: estimatedTokens - oldEstimation,
        improvement: Math.round(((estimatedTokens - oldEstimation) / oldEstimation) * 100)
      },
      breakdown: {
        promptTokens: Math.ceil(prompt.length / 4),
        systemContextTokens: 800,
        estimatedOutputTokens: estimatedTokens - Math.ceil(prompt.length / 4) - 800 - Math.ceil((Math.ceil(prompt.length / 4) + 800 + 3000) * 0.2),
        processingBuffer: Math.ceil((Math.ceil(prompt.length / 4) + 800 + 3000) * 0.2)
      }
    });

  } catch (error) {
    console.error('[test-token-estimation] Error:', error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 });
  }
}
