import { getFirebaseForAPI } from './firebase-utils';

export interface AdminConfig {
  id: string;
  tokenLimit: number;
  pricingPlans: {
    id: string;
    name: string;
    tokens: number;
    price: number;
    description: string;
    isPopular?: boolean;
  }[];
  systemSettings: {
    maxTokensPerRequest: number;
    minTokensPerRequest: number;
    tokenEstimationBuffer: number; // percentage
    enableTokenSystem: boolean;
    requireLogin: boolean;
  };
  updatedAt: Date;
  updatedBy: string;
}

export class AdminConfigManager {
  private static instance: AdminConfigManager;
  
  private constructor() {}
  
  static getInstance(): AdminConfigManager {
    if (!AdminConfigManager.instance) {
      AdminConfigManager.instance = new AdminConfigManager();
    }
    return AdminConfigManager.instance;
  }

  async getAdminConfig(): Promise<AdminConfig | null> {
    const { db, firestore } = getFirebaseForAPI();
    
    if (!db || !firestore) {
      throw new Error('Firebase not configured');
    }

    try {
      const configDoc = await firestore.getDoc(firestore.doc(db, 'adminConfig', 'main'));
      
      if (configDoc.exists()) {
        const data = configDoc.data();
                        return {
                  id: configDoc.id,
                  tokenLimit: data.tokenLimit || 20000,
                  pricingPlans: data.pricingPlans || [
                    {
                      id: 'app-builder',
                      name: 'App Builder Pack',
                      tokens: 20000,
                      price: 100,
                      description: 'Build unlimited apps with AI assistance',
                      isPopular: true
                    }
                  ],
          systemSettings: {
            maxTokensPerRequest: data.systemSettings?.maxTokensPerRequest || 10000,
            minTokensPerRequest: data.systemSettings?.minTokensPerRequest || 1000,
            tokenEstimationBuffer: data.systemSettings?.tokenEstimationBuffer || 20,
            enableTokenSystem: data.systemSettings?.enableTokenSystem !== false,
            requireLogin: data.systemSettings?.requireLogin !== false
          },
          updatedAt: data.updatedAt?.toDate() || new Date(),
          updatedBy: data.updatedBy || 'system'
        };
      }
      
                    // Create default config if none exists
              const defaultConfig: AdminConfig = {
                id: 'main',
                tokenLimit: 20000,
                pricingPlans: [
                  {
                    id: 'app-builder',
                    name: 'App Builder Pack',
                    tokens: 20000,
                    price: 100,
                    description: 'Build unlimited apps with AI assistance',
                    isPopular: true
                  }
                ],
        systemSettings: {
          maxTokensPerRequest: 10000,
          minTokensPerRequest: 1000,
          tokenEstimationBuffer: 20,
          enableTokenSystem: true,
          requireLogin: true
        },
        updatedAt: new Date(),
        updatedBy: 'system'
      };
      
      await firestore.setDoc(firestore.doc(db, 'adminConfig', 'main'), defaultConfig);
      return defaultConfig;
    } catch (error) {
      console.error('Error getting admin config:', error);
      throw error;
    }
  }

  async updateAdminConfig(config: Partial<AdminConfig>, updatedBy: string): Promise<AdminConfig> {
    const { db, firestore } = getFirebaseForAPI();
    
    if (!db || !firestore) {
      throw new Error('Firebase not configured');
    }

    try {
      const currentConfig = await this.getAdminConfig();
      const updatedConfig: AdminConfig = {
        ...currentConfig!,
        ...config,
        updatedAt: new Date(),
        updatedBy
      };
      
      await firestore.updateDoc(firestore.doc(db, 'adminConfig', 'main'), updatedConfig);
      return updatedConfig;
    } catch (error) {
      console.error('Error updating admin config:', error);
      throw error;
    }
  }

  async updateTokenLimit(newLimit: number, updatedBy: string): Promise<AdminConfig> {
    return this.updateAdminConfig({ tokenLimit: newLimit }, updatedBy);
  }

  async updatePricingPlans(pricingPlans: AdminConfig['pricingPlans'], updatedBy: string): Promise<AdminConfig> {
    return this.updateAdminConfig({ pricingPlans }, updatedBy);
  }

  async updateSystemSettings(settings: Partial<AdminConfig['systemSettings']>, updatedBy: string): Promise<AdminConfig> {
    const currentConfig = await this.getAdminConfig();
    const updatedSettings = {
      ...currentConfig!.systemSettings,
      ...settings
    };
    return this.updateAdminConfig({ systemSettings: updatedSettings }, updatedBy);
  }
}

export const adminConfigManager = AdminConfigManager.getInstance();
