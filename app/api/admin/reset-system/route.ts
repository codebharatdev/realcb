import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseForAPI } from '@/lib/firebase-utils';

export async function POST(request: NextRequest) {
  try {
    const { adminKey } = await request.json();

    // Simple admin key verification (you can enhance this)
    const expectedAdminKey = process.env.ADMIN_RESET_KEY || 'reset-all-data-2024';
    
    if (adminKey !== expectedAdminKey) {
      return NextResponse.json({
        success: false,
        error: 'Invalid admin key'
      }, { status: 401 });
    }

    const { db, firestore } = getFirebaseForAPI();
    
    if (!db || !firestore) {
      return NextResponse.json({
        success: false,
        error: 'Firebase not configured'
      }, { status: 500 });
    }

    console.log('[admin-reset-system] Starting complete system reset...');

    const resetResults = {
      userTokens: 0,
      savedApps: 0,
      creditConsumptionHistory: 0,
      tokenTransactions: 0,
      sandboxFiles: 0,
      totalDocuments: 0
    };

    // 1. Reset all user token balances to default
    console.log('[admin-reset-system] Resetting user token balances...');
    const userTokensQuery = firestore.query(firestore.collection(db, 'userTokens'));
    const userTokensSnapshot = await firestore.getDocs(userTokensQuery);
    
    const tokenResetPromises = userTokensSnapshot.docs.map(doc => 
      firestore.updateDoc(doc.ref, {
        balance: 1000, // Default starting tokens
        lastUpdated: new Date()
      })
    );
    await Promise.all(tokenResetPromises);
    resetResults.userTokens = userTokensSnapshot.size;

    // 2. Delete all saved apps
    console.log('[admin-reset-system] Deleting all saved apps...');
    const appsQuery = firestore.query(firestore.collection(db, 'savedApps'));
    const appsSnapshot = await firestore.getDocs(appsQuery);
    const appsDeletePromises = appsSnapshot.docs.map(doc => 
      firestore.deleteDoc(doc.ref)
    );
    await Promise.all(appsDeletePromises);
    resetResults.savedApps = appsSnapshot.size;

    // 3. Delete all credit consumption history
    console.log('[admin-reset-system] Deleting credit consumption history...');
    const consumptionQuery = firestore.query(firestore.collection(db, 'creditConsumptionHistory'));
    const consumptionSnapshot = await firestore.getDocs(consumptionQuery);
    const consumptionDeletePromises = consumptionSnapshot.docs.map(doc => 
      firestore.deleteDoc(doc.ref)
    );
    await Promise.all(consumptionDeletePromises);
    resetResults.creditConsumptionHistory = consumptionSnapshot.size;

    // 4. Delete all token transactions
    console.log('[admin-reset-system] Deleting token transactions...');
    const transactionsQuery = firestore.query(firestore.collection(db, 'tokenTransactions'));
    const transactionsSnapshot = await firestore.getDocs(transactionsQuery);
    const transactionsDeletePromises = transactionsSnapshot.docs.map(doc => 
      firestore.deleteDoc(doc.ref)
    );
    await Promise.all(transactionsDeletePromises);
    resetResults.tokenTransactions = transactionsSnapshot.size;

    // 5. Clear all sandbox files
    console.log('[admin-reset-system] Clearing sandbox files...');
    try {
      const sandboxQuery = firestore.query(firestore.collection(db, 'sandboxFiles'));
      const sandboxSnapshot = await firestore.getDocs(sandboxQuery);
      const sandboxDeletePromises = sandboxSnapshot.docs.map(doc => 
        firestore.deleteDoc(doc.ref)
      );
      await Promise.all(sandboxDeletePromises);
      resetResults.sandboxFiles = sandboxSnapshot.size;
    } catch (error) {
      console.log('[admin-reset-system] No sandbox files to delete');
    }

    // Calculate total documents processed
    resetResults.totalDocuments = Object.values(resetResults).reduce((sum, count) => sum + count, 0);

    console.log('[admin-reset-system] System reset completed successfully');
    console.log('[admin-reset-system] Reset summary:', resetResults);

    return NextResponse.json({
      success: true,
      message: 'Complete system reset successful',
      resetSummary: {
        ...resetResults,
        timestamp: new Date().toISOString(),
        status: 'All data cleared, all users reset to 1000 credits'
      }
    });

  } catch (error) {
    console.error('[admin-reset-system] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reset system' },
      { status: 500 }
    );
  }
}
