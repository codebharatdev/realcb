import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseForAPI } from '@/lib/firebase-utils';

// Default model from environment variable
const DEFAULT_MODEL = process.env.DEFAULT_AI_MODEL || 'moonshotai/kimi-k2-instruct';

export async function GET() {
  try {
    const { db, firestore } = getFirebaseForAPI();
    
    if (!db || !firestore) {
      return NextResponse.json({
        success: true,
        activeModel: DEFAULT_MODEL,
        availableModels: [
          'moonshotai/kimi-k2-instruct',
          'openai/gpt-5',
          'anthropic/claude-sonnet-4-20250514',
          'google/gemini-2.5-pro'
        ]
      });
    }
    
    // Try to get model from database first
    const configRef = firestore.doc(db, 'config', 'ai-model');
    const configSnap = await firestore.getDoc(configRef);
    
    let activeModel = DEFAULT_MODEL;
    
    if (configSnap.exists()) {
      const config = configSnap.data();
      activeModel = config.activeModel || DEFAULT_MODEL;
    } else {
      // Initialize with default model if no config exists
      await firestore.setDoc(configRef, {
        activeModel: DEFAULT_MODEL,
        updatedAt: new Date(),
        updatedBy: 'system'
      });
    }
    
    return NextResponse.json({
      success: true,
      activeModel,
      availableModels: [
        'moonshotai/kimi-k2-instruct',
        'openai/gpt-5',
        'anthropic/claude-sonnet-4-20250514',
        'google/gemini-2.5-pro'
      ]
    });
  } catch (error) {
    console.error('[model-config] Error:', error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { activeModel, updatedBy = 'admin' } = await request.json();
    
    if (!activeModel) {
      return NextResponse.json({
        success: false,
        error: 'activeModel is required'
      }, { status: 400 });
    }
    
    // Validate model
    const validModels = [
      'moonshotai/kimi-k2-instruct',
      'openai/gpt-5',
      'anthropic/claude-sonnet-4-20250514',
      'google/gemini-2.5-pro'
    ];
    
    if (!validModels.includes(activeModel)) {
      return NextResponse.json({
        success: false,
        error: `Invalid model. Must be one of: ${validModels.join(', ')}`
      }, { status: 400 });
    }
    
         const { db, firestore } = getFirebaseForAPI();
     
     if (!db || !firestore) {
       return NextResponse.json({
         success: true,
         message: `Model updated to ${activeModel}`,
         activeModel
       });
     }
    
    // Update model in database
    const configRef = firestore.doc(db, 'config', 'ai-model');
    await firestore.setDoc(configRef, {
      activeModel,
      updatedAt: new Date(),
      updatedBy
    });
    
    return NextResponse.json({
      success: true,
      message: `Model updated to ${activeModel}`,
      activeModel
    });
  } catch (error) {
    console.error('[model-config] Error:', error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 });
  }
}
