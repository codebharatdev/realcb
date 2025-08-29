import { getFirebaseForAPI } from './firebase-utils';
import { adminConfigManager } from './admin-config';

export interface TokenBalance {
  userId: string;
  tokens: number;
  lastRecharge: Date;
  totalSpent: number;
  totalRecharged: number;
  totalFromPayments: number; // New field to track only payment tokens
  createdAt: Date;
  updatedAt: Date;
}

export interface TokenTransaction {
  id: string;
  userId: string;
  type: 'recharge' | 'consumption' | 'refund';
  amount: number;
  description: string;
  paymentId?: string;
  createdAt: Date;
}

export interface PricingPlan {
  id: string;
  name: string;
  tokens: number;
  price: number; // in INR
  description: string;
  isPopular?: boolean;
}

// Default pricing plans - Single plan for simplicity
export const DEFAULT_PRICING_PLANS: PricingPlan[] = [
  {
    id: 'app-builder',
    name: 'App Builder Pack',
    tokens: 20000,
    price: 100,
    description: 'Build unlimited apps with AI assistance',
    isPopular: true
  }
];

// Get pricing plans from admin config
export async function getPricingPlans(): Promise<PricingPlan[]> {
  try {
    const config = await adminConfigManager.getAdminConfig();
    return config?.pricingPlans || DEFAULT_PRICING_PLANS;
  } catch (error) {
    console.error('Error getting pricing plans from admin config:', error);
    return DEFAULT_PRICING_PLANS;
  }
}

export class TokenManager {
  private static instance: TokenManager;
  
  private constructor() {}
  
  static getInstance(): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager();
    }
    return TokenManager.instance;
  }

  async getUserTokenBalance(userId: string): Promise<TokenBalance | null> {
    const { db, firestore } = await getFirebaseForAPI();
    
    if (!db || !firestore) {
      throw new Error('Firebase not configured');
    }

    try {
      const tokenDoc = await firestore.getDoc(firestore.doc(db, 'userTokens', userId));
      
      if (tokenDoc.exists()) {
        const data = tokenDoc.data();
        return {
          userId,
          tokens: data.tokens || 0,
          lastRecharge: data.lastRecharge?.toDate() || new Date(),
          totalSpent: data.totalSpent || 0,
          totalRecharged: data.totalRecharged || 0,
          totalFromPayments: data.totalFromPayments || 0,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        };
      }
      
      // Create new token balance for user
      const newBalance: TokenBalance = {
        userId,
        tokens: 0,
        lastRecharge: new Date(),
        totalSpent: 0,
        totalRecharged: 0,
        totalFromPayments: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await firestore.setDoc(firestore.doc(db, 'userTokens', userId), newBalance);
      return newBalance;
    } catch (error) {
      console.error('Error getting user token balance:', error);
      throw error;
    }
  }

  async consumeTokens(userId: string, amount: number, description: string): Promise<boolean> {
    const { db, firestore } = await getFirebaseForAPI();
    
    if (!db || !firestore) {
      throw new Error('Firebase not configured');
    }

    try {
      const balance = await this.getUserTokenBalance(userId);
      
      if (!balance) {
        throw new Error('User token balance not found');
      }

      if (balance.tokens < amount) {
        return false; // Insufficient tokens
      }

      // Update token balance
      const newBalance = balance.tokens - amount;
      const newTotalSpent = balance.totalSpent + amount;

      await firestore.updateDoc(firestore.doc(db, 'userTokens', userId), {
        tokens: newBalance,
        totalSpent: newTotalSpent,
        updatedAt: new Date()
      });

      // Record transaction
      const transaction: TokenTransaction = {
        id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        type: 'consumption',
        amount: -amount,
        description,
        createdAt: new Date()
      };

      await firestore.addDoc(firestore.collection(db, 'tokenTransactions'), transaction);

      return true;
    } catch (error) {
      console.error('Error consuming tokens:', error);
      throw error;
    }
  }

  async addTokens(userId: string, amount: number, paymentId?: string, description?: string): Promise<void> {
    const { db, firestore } = await getFirebaseForAPI();
    
    if (!db || !firestore) {
      throw new Error('Firebase not configured');
    }

    try {
      const balance = await this.getUserTokenBalance(userId);
      
      if (!balance) {
        throw new Error('User token balance not found');
      }

      // Note: Removed token limit check - users can accumulate tokens from multiple payments
      // The tokenLimit in admin config represents tokens per payment, not maximum balance

      // Update token balance
      const newBalance = balance.tokens + amount;
      const newTotalRecharged = balance.totalRecharged + amount;
      const newTotalFromPayments = paymentId ? balance.totalFromPayments + amount : balance.totalFromPayments;

      await firestore.updateDoc(firestore.doc(db, 'userTokens', userId), {
        tokens: newBalance,
        totalRecharged: newTotalRecharged,
        totalFromPayments: newTotalFromPayments,
        lastRecharge: new Date(),
        updatedAt: new Date()
      });

      // Record transaction
      const transaction: TokenTransaction = {
        id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        type: 'recharge',
        amount,
        description: description || 'Token recharge',
        paymentId,
        createdAt: new Date()
      };

      await firestore.addDoc(firestore.collection(db, 'tokenTransactions'), transaction);
    } catch (error) {
      console.error('Error adding tokens:', error);
      throw error;
    }
  }

  async getTokenTransactions(userId: string, limit: number = 10): Promise<TokenTransaction[]> {
    const { db, firestore } = await getFirebaseForAPI();
    
    if (!db || !firestore) {
      throw new Error('Firebase not configured');
    }

    try {
      // Simplified query without complex ordering to avoid index requirements
      const q = firestore.query(
        firestore.collection(db, 'tokenTransactions'),
        firestore.where('userId', '==', userId),
        firestore.limit(limit)
      );

      const querySnapshot = await firestore.getDocs(q);
      const transactions: TokenTransaction[] = [];

      querySnapshot.forEach((doc: any) => {
        const data = doc.data();
        transactions.push({
          id: doc.id,
          userId: data.userId,
          type: data.type,
          amount: data.amount,
          description: data.description,
          paymentId: data.paymentId,
          createdAt: data.createdAt?.toDate() || new Date()
        });
      });

      // Sort in memory instead of in Firestore
      return transactions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      console.error('Error getting token transactions:', error);
      throw error;
    }
  }

  async checkTokenSufficiency(userId: string, requiredTokens: number): Promise<boolean> {
    try {
      const balance = await this.getUserTokenBalance(userId);
      return balance ? balance.tokens >= requiredTokens : false;
    } catch (error) {
      console.error('Error checking token sufficiency:', error);
      return false;
    }
  }

  // Adjust token consumption based on actual usage
  async adjustTokenConsumption(userId: string, estimatedTokens: number, actualTokens: number, description: string): Promise<boolean> {
    const { db, firestore } = await getFirebaseForAPI();
    
    if (!db || !firestore) {
      throw new Error('Firebase not configured');
    }

    try {
      const balance = await this.getUserTokenBalance(userId);
      
      if (!balance) {
        throw new Error('User token balance not found');
      }

      // Calculate the difference
      const tokenDifference = actualTokens - estimatedTokens;
      
      if (tokenDifference > 0) {
        // Need to consume more tokens
        if (balance.tokens < tokenDifference) {
          return false; // Insufficient tokens for adjustment
        }
        
        // Consume additional tokens
        await this.consumeTokens(userId, tokenDifference, `Token adjustment: ${description}`);
      } else if (tokenDifference < 0) {
        // Refund excess tokens
        await this.addTokens(userId, Math.abs(tokenDifference), undefined, `Token refund: ${description}`);
      }
      
      return true;
    } catch (error) {
      console.error('Error adjusting token consumption:', error);
      throw error;
    }
  }

  // Estimate tokens needed for a prompt (realistic estimation for app generation)
  estimateTokensForPrompt(prompt: string): number {
    // Base tokens from user prompt
    const promptTokens = Math.ceil(prompt.length / 4);
    
    // System context tokens (instructions, conversation history, etc.)
    const systemContextTokens = 800;
    
    // Determine if this is a full app generation or a simple edit
    const isFullAppGeneration = this.isFullAppGeneration(prompt);
    
    let estimatedOutputTokens: number;
    if (isFullAppGeneration) {
      // Full app generation: multiple files, components, styling
      estimatedOutputTokens = 4000;
    } else if (this.isComponentEdit(prompt)) {
      // Component edit: single file modification
      estimatedOutputTokens = 1500;
    } else if (this.isSimpleEdit(prompt)) {
      // Simple edit: minor changes
      estimatedOutputTokens = 800;
    } else {
      // Default: moderate generation
      estimatedOutputTokens = 2500;
    }
    
    // Buffer for AI processing and variations
    const processingBuffer = Math.ceil((promptTokens + systemContextTokens + estimatedOutputTokens) * 0.2);
    
    // Total estimated tokens
    const totalTokens = promptTokens + systemContextTokens + estimatedOutputTokens + processingBuffer;
    
    // Minimum tokens for any request
    const minTokens = 1000;
    
    return Math.max(minTokens, totalTokens);
  }

  // Helper methods to determine request type
  private isFullAppGeneration(prompt: string): boolean {
    const fullAppKeywords = [
      'build', 'create', 'generate', 'make', 'develop', 'build a', 'create a', 'generate a', 'make a', 'develop a',
      'app', 'application', 'website', 'web app', 'react app', 'vue app', 'angular app', 'full stack',
      'todo', 'ecommerce', 'blog', 'portfolio', 'dashboard', 'admin panel', 'landing page'
    ];
    
    const lowerPrompt = prompt.toLowerCase();
    return fullAppKeywords.some(keyword => lowerPrompt.includes(keyword));
  }

  private isComponentEdit(prompt: string): boolean {
    const componentKeywords = [
      'edit', 'modify', 'update', 'change', 'fix', 'improve', 'component', 'button', 'form', 'header', 'footer',
      'add', 'remove', 'style', 'styling', 'css', 'design'
    ];
    
    const lowerPrompt = prompt.toLowerCase();
    return componentKeywords.some(keyword => lowerPrompt.includes(keyword));
  }

  private isSimpleEdit(prompt: string): boolean {
    const simpleKeywords = [
      'text', 'color', 'size', 'font', 'margin', 'padding', 'border', 'background', 'typo', 'spelling'
    ];
    
    const lowerPrompt = prompt.toLowerCase();
    return simpleKeywords.some(keyword => lowerPrompt.includes(keyword));
  }
}

export const tokenManager = TokenManager.getInstance();
