import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseForAPI } from '@/lib/firebase-utils';

export async function POST(request: NextRequest) {
  try {
    const { userId, operation, creditsConsumed, details, timestamp, balanceBefore, balanceAfter } = await request.json();
    
    if (!userId || !operation || !creditsConsumed) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: userId, operation, and creditsConsumed are required'
      }, { status: 400 });
    }

    const { db, firestore } = getFirebaseForAPI();
    
    if (!db || !firestore) {
      return NextResponse.json({
        success: false,
        error: 'Firebase not configured'
      }, { status: 500 });
    }

    // Store consumption record in Firestore
    const consumptionRecord = {
      userId,
      operation,
      creditsConsumed,
      details: details || {},
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      balanceBefore: balanceBefore || 0,
      balanceAfter: balanceAfter || 0,
      createdAt: new Date()
    };

    await firestore.addDoc(firestore.collection(db, 'creditConsumptionHistory'), consumptionRecord);

    return NextResponse.json({
      success: true,
      message: 'Consumption tracked successfully'
    });

  } catch (error) {
    console.error('[track-consumption] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to track consumption' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'userId parameter is required'
      }, { status: 400 });
    }

    const { db, firestore } = getFirebaseForAPI();
    
    if (!db || !firestore) {
      return NextResponse.json({
        success: true,
        history: []
      });
    }

    // Get user's consumption history
    const historyQuery = firestore.query(
      firestore.collection(db, 'creditConsumptionHistory'),
      firestore.where('userId', '==', userId),
      firestore.limit(limit)
    );

    const querySnapshot = await firestore.getDocs(historyQuery);
    const history = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate?.() || doc.data().timestamp
    }));

    // Sort by timestamp (newest first)
    history.sort((a, b) => {
      const dateA = a.timestamp instanceof Date ? a.timestamp : new Date(a.timestamp);
      const dateB = b.timestamp instanceof Date ? b.timestamp : new Date(b.timestamp);
      return dateB.getTime() - dateA.getTime();
    });

    return NextResponse.json({
      success: true,
      history
    });

  } catch (error) {
    console.error('[track-consumption] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get consumption history' },
      { status: 500 }
    );
  }
}
