import { initializeApp } from 'firebase/app';
import { getFirestore, doc, collection, getDocs, updateDoc, writeBatch } from 'firebase/firestore';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fixTokenCalculation() {
  try {
    console.log('🔧 Starting token calculation fix...');
    
    // Get all user token documents
    const userTokensRef = collection(db, 'userTokens');
    const userTokensSnapshot = await getDocs(userTokensRef);
    
    console.log(`📊 Found ${userTokensSnapshot.size} user token records`);
    
    for (const userDoc of userTokensSnapshot.docs) {
      const userId = userDoc.id;
      console.log(`\n👤 Processing user: ${userId}`);
      
      // Get all transactions for this user
      const transactionsRef = collection(db, 'tokenTransactions');
      const transactionsQuery = await getDocs(transactionsRef);
      
      let totalFromPayments = 0;
      let totalSpent = 0;
      let calculatedBalance = 0;
      
      // Calculate from transactions
      transactionsQuery.forEach((txnDoc) => {
        const txn = txnDoc.data();
        if (txn.userId === userId) {
          if (txn.type === 'recharge' && txn.paymentId) {
            totalFromPayments += txn.amount;
            calculatedBalance += txn.amount;
          } else if (txn.type === 'consumption') {
            totalSpent += Math.abs(txn.amount);
            calculatedBalance += txn.amount; // amount is negative for consumption
          }
        }
      });
      
      console.log(`📈 Calculated totals:`);
      console.log(`   Total from payments: ${totalFromPayments.toLocaleString()}`);
      console.log(`   Total spent: ${totalSpent.toLocaleString()}`);
      console.log(`   Calculated balance: ${calculatedBalance.toLocaleString()}`);
      
      // Update the user's token balance
      const userTokenRef = doc(db, 'userTokens', userId);
      await updateDoc(userTokenRef, {
        tokens: Math.max(0, calculatedBalance),
        totalSpent: totalSpent,
        totalFromPayments: totalFromPayments,
        totalRecharged: totalFromPayments, // Assuming all recharges are from payments
        updatedAt: new Date()
      });
      
      console.log(`✅ Updated user ${userId} balance to ${Math.max(0, calculatedBalance).toLocaleString()}`);
    }
    
    console.log('\n🎉 Token calculation fix completed successfully!');
    console.log('📝 All user balances have been recalculated based on transaction history');
    
  } catch (error) {
    console.error('❌ Error fixing token calculation:', error);
    process.exit(1);
  }
}

// Run the fix
fixTokenCalculation();
