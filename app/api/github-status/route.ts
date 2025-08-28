import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseForAPI } from '@/lib/firebase-utils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({
        connected: false,
        error: 'User ID is required'
      });
    }

    // Check if user has connected their GitHub account
    const { db, firestore } = getFirebaseForAPI();
    
    if (!db || !firestore) {
      return NextResponse.json({
        success: false,
        error: 'Firebase not configured'
      }, { status: 500 });
    }
    
    const userRef = firestore.doc(db, 'users', userId);
    const userSnap = await firestore.getDoc(userRef);

    if (!userSnap.exists()) {
      return NextResponse.json({
        connected: false,
        error: 'User not found'
      });
    }

    const userData = userSnap.data();
    
    console.log('[github-status] User data:', {
      userId,
      githubConnected: userData.githubConnected,
      hasAccessToken: !!userData.githubAccessToken,
      githubUsername: userData.githubUsername
    });
    
    if (userData.githubConnected && userData.githubAccessToken) {
      return NextResponse.json({
        connected: true,
        username: userData.githubUsername,
        message: 'GitHub account connected'
      });
    } else {
      return NextResponse.json({
        connected: false,
        error: 'GitHub account not connected'
      });
    }
    
  } catch (error) {
    console.error('[github-status] Error:', error);
    return NextResponse.json({
      connected: false,
      error: (error as Error).message
    });
  }
}
