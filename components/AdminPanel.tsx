'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Settings, Users, CreditCard, Shield, RefreshCw } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

interface AdminConfig {
  id: string;
  tokenLimit: number;
  defaultTokens: number;
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
    tokenEstimationBuffer: number;
    enableTokenSystem: boolean;
    requireLogin: boolean;
  };
  updatedAt: Date;
  updatedBy: string;
}

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminPanel({ isOpen, onClose }: AdminPanelProps) {
  const { user } = useAuth();
  const [config, setConfig] = useState<AdminConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [tokenLimit, setTokenLimit] = useState(20000);
  const [defaultTokens, setDefaultTokens] = useState(20000);
  const [maxTokensPerRequest, setMaxTokensPerRequest] = useState(10000);
  const [minTokensPerRequest, setMinTokensPerRequest] = useState(1000);
  const [tokenEstimationBuffer, setTokenEstimationBuffer] = useState(20);
  const [enableTokenSystem, setEnableTokenSystem] = useState(true);
  const [requireLogin, setRequireLogin] = useState(true);

  useEffect(() => {
    if (isOpen && user) {
      loadConfig();
    }
  }, [isOpen, user]);

  const loadConfig = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/admin/config?userId=${user.uid}`);
      const data = await response.json();
      
      if (data.success) {
        setConfig(data.config);
        setTokenLimit(data.config.tokenLimit);
        setDefaultTokens(data.config.defaultTokens);
        setMaxTokensPerRequest(data.config.systemSettings.maxTokensPerRequest);
        setMinTokensPerRequest(data.config.systemSettings.minTokensPerRequest);
        setTokenEstimationBuffer(data.config.systemSettings.tokenEstimationBuffer);
        setEnableTokenSystem(data.config.systemSettings.enableTokenSystem);
        setRequireLogin(data.config.systemSettings.requireLogin);
      } else {
        setError(data.error || 'Failed to load configuration');
      }
    } catch (error) {
      setError('Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    if (!user || !config) return;
    
    setSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      const updatedConfig = {
        ...config,
        tokenLimit,
        defaultTokens,
        systemSettings: {
          ...config.systemSettings,
          maxTokensPerRequest,
          minTokensPerRequest,
          tokenEstimationBuffer,
          enableTokenSystem,
          requireLogin
        }
      };

      const response = await fetch('/api/admin/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.uid,
          config: updatedConfig
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setConfig(data.config);
        setSuccess('Configuration saved successfully!');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(data.error || 'Failed to save configuration');
      }
    } catch (error) {
      setError('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-gray-900 rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-white/20"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Settings className="w-6 h-6 text-orange-400" />
                <h2 className="text-xl font-bold text-white">Admin Panel</h2>
              </div>
              <button
                onClick={onClose}
                className="text-white/60 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-8 h-8 text-orange-400 animate-spin" />
                <span className="text-white ml-3">Loading configuration...</span>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Error/Success Messages */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-500/10 border border-red-500/20 rounded-lg p-3"
                  >
                    <p className="text-red-400 text-sm">{error}</p>
                  </motion.div>
                )}

                {success && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-green-500/10 border border-green-500/20 rounded-lg p-3"
                  >
                    <p className="text-green-400 text-sm">{success}</p>
                  </motion.div>
                )}

                {/* Token Limits Section */}
                <div className="bg-gray-800 rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <CreditCard className="w-5 h-5 text-orange-400" />
                    <h3 className="text-lg font-semibold text-white">Token Limits</h3>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-white/80 text-sm mb-2">
                        Default Token Limit per Recharge
                      </label>
                      <input
                        type="number"
                        value={tokenLimit}
                        onChange={(e) => setTokenLimit(Number(e.target.value))}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-400"
                        min="1000"
                        max="100000"
                      />
                      <p className="text-white/60 text-xs mt-1">Tokens given per ₹100 recharge</p>
                    </div>
                    
                    <div>
                      <label className="block text-white/80 text-sm mb-2">
                        Default Tokens for New Users
                      </label>
                      <input
                        type="number"
                        value={defaultTokens}
                        onChange={(e) => setDefaultTokens(Number(e.target.value))}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-400"
                        min="0"
                        max="100000"
                      />
                      <p className="text-white/60 text-xs mt-1">Free tokens for new user registration</p>
                    </div>
                  </div>
                </div>

                {/* System Settings Section */}
                <div className="bg-gray-800 rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Shield className="w-5 h-5 text-orange-400" />
                    <h3 className="text-lg font-semibold text-white">System Settings</h3>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-white/80 text-sm mb-2">
                        Max Tokens per Request
                      </label>
                      <input
                        type="number"
                        value={maxTokensPerRequest}
                        onChange={(e) => setMaxTokensPerRequest(Number(e.target.value))}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-400"
                        min="1000"
                        max="50000"
                      />
                      <p className="text-white/60 text-xs mt-1">Maximum tokens allowed per AI request</p>
                    </div>
                    
                    <div>
                      <label className="block text-white/80 text-sm mb-2">
                        Min Tokens per Request
                      </label>
                      <input
                        type="number"
                        value={minTokensPerRequest}
                        onChange={(e) => setMinTokensPerRequest(Number(e.target.value))}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-400"
                        min="100"
                        max="10000"
                      />
                      <p className="text-white/60 text-xs mt-1">Minimum tokens required per AI request</p>
                    </div>
                    
                    <div>
                      <label className="block text-white/80 text-sm mb-2">
                        Token Estimation Buffer (%)
                      </label>
                      <input
                        type="number"
                        value={tokenEstimationBuffer}
                        onChange={(e) => setTokenEstimationBuffer(Number(e.target.value))}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-400"
                        min="0"
                        max="100"
                      />
                      <p className="text-white/60 text-xs mt-1">Buffer percentage for token estimation</p>
                    </div>
                  </div>
                  
                  <div className="mt-4 space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enableTokenSystem}
                        onChange={(e) => setEnableTokenSystem(e.target.checked)}
                        className="w-4 h-4 text-orange-400 bg-gray-700 border-gray-600 rounded focus:ring-orange-400"
                      />
                      <span className="text-white">Enable Token System</span>
                    </label>
                    
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={requireLogin}
                        onChange={(e) => setRequireLogin(e.target.checked)}
                        className="w-4 h-4 text-orange-400 bg-gray-700 border-gray-600 rounded focus:ring-orange-400"
                      />
                      <span className="text-white">Require Login for AI Generation</span>
                    </label>
                  </div>
                </div>

                {/* Current Configuration Display */}
                {config && (
                  <div className="bg-gray-800 rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Users className="w-5 h-5 text-orange-400" />
                      <h3 className="text-lg font-semibold text-white">Current Configuration</h3>
                    </div>
                    
                    <div className="text-white/60 text-sm space-y-1">
                      <p>Last Updated: {new Date(config.updatedAt).toLocaleString()}</p>
                      <p>Updated By: {config.updatedBy}</p>
                      <p>Current Token Limit: {config.tokenLimit.toLocaleString()} tokens</p>
                      <p>System Status: {config.systemSettings.enableTokenSystem ? 'Active' : 'Disabled'}</p>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    onClick={loadConfig}
                    disabled={loading}
                    className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 inline mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                  
                  <button
                    onClick={saveConfig}
                    disabled={saving}
                    className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
