import { initializeApp } from 'firebase/app';
import { getFirestore, doc, collection, getDocs, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
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

async function resetAllCredits() {
  try {
    console.log('🔄 Starting credit reset process...');
    
    // Get all user token documents
    const userTokensRef = collection(db, 'userTokens');
    const userTokensSnapshot = await getDocs(userTokensRef);
    
    console.log(`📊 Found ${userTokensSnapshot.size} user token records`);
    
    // Reset all user token balances to 0
    const batch = writeBatch(db);
    let resetCount = 0;
    
    userTokensSnapshot.forEach((docSnapshot) => {
      const userId = docSnapshot.id;
      const userTokenRef = doc(db, 'userTokens', userId);
      
      // Reset to 0 tokens
      batch.update(userTokenRef, {
        tokens: 0,
        totalSpent: 0,
        totalRecharged: 0,
        totalFromPayments: 0,
        updatedAt: new Date()
      });
      
      resetCount++;
    });
    
    // Commit the batch
    await batch.commit();
    console.log(`✅ Reset ${resetCount} user token balances to 0`);
    
    // Clear all token transactions
    const transactionsRef = collection(db, 'tokenTransactions');
    const transactionsSnapshot = await getDocs(transactionsRef);
    
    console.log(`📊 Found ${transactionsSnapshot.size} transaction records`);
    
    // Delete all transaction records
    const deleteBatch = writeBatch(db);
    let deleteCount = 0;
    
    transactionsSnapshot.forEach((docSnapshot) => {
      const transactionRef = doc(db, 'tokenTransactions', docSnapshot.id);
      deleteBatch.delete(transactionRef);
      deleteCount++;
    });
    
    // Commit the delete batch
    await deleteBatch.commit();
    console.log(`🗑️ Deleted ${deleteCount} transaction records`);
    
    console.log('🎉 Credit reset completed successfully!');
    console.log('📝 All users now have 0 credits and no transaction history');
    console.log('🧪 You can now test the end-to-end payment flow from scratch');
    
  } catch (error) {
    console.error('❌ Error resetting credits:', error);
    process.exit(1);
  }
}

// Run the reset
resetAllCredits();
