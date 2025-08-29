import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseForAPI } from '@/lib/firebase-utils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'Missing userId parameter'
      }, { status: 400 });
    }

    const { db, firestore } = await getFirebaseForAPI();
    if (!db || !firestore) {
      return NextResponse.json({
        success: false,
        error: 'Firebase not configured'
      }, { status: 500 });
    }

    const userRef = firestore.doc(db, 'users', userId);
    const userDoc = await firestore.getDoc(userRef);
    
    if (!userDoc.exists()) {
      return NextResponse.json({
        success: false,
        error: 'User not found',
        userId,
        isAdmin: false,
        needsSetup: true
      }, { status: 404 });
    }

    const userData = userDoc.data();
    const isAdmin = userData.isAdmin === true;

    return NextResponse.json({
      success: true,
      userId,
      isAdmin,
      userData: {
        email: userData.email,
        displayName: userData.displayName,
        isAdmin: userData.isAdmin
      },
      needsSetup: !isAdmin
    });

  } catch (error) {
    console.error('[test-admin-access] Error:', error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'Missing userId parameter'
      }, { status: 400 });
    }

    const { db, firestore } = await getFirebaseForAPI();
    if (!db || !firestore) {
      return NextResponse.json({
        success: false,
        error: 'Firebase not configured'
      }, { status: 500 });
    }

    // Set user as admin
    await firestore.updateDoc(firestore.doc(db, 'users', userId), {
      isAdmin: true,
      updatedAt: new Date()
    });

    return NextResponse.json({
      success: true,
      message: 'User has been set as admin successfully',
      userId,
      isAdmin: true
    });

  } catch (error) {
    console.error('[test-admin-access] Error:', error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 });
  }
}
