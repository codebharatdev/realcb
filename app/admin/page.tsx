'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, Save, RefreshCw, CreditCard, Shield, Users } from 'lucide-react';

interface AdminConfig {
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
    tokenEstimationBuffer: number;
    enableTokenSystem: boolean;
    requireLogin: boolean;
  };
  updatedAt: Date;
  updatedBy: string;
}

export default function AdminPage() {
  const [config, setConfig] = useState<AdminConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [tokenLimit, setTokenLimit] = useState(20000);
  const [maxTokensPerRequest, setMaxTokensPerRequest] = useState(10000);
  const [minTokensPerRequest, setMinTokensPerRequest] = useState(1000);
  const [tokenEstimationBuffer, setTokenEstimationBuffer] = useState(20);
  const [enableTokenSystem, setEnableTokenSystem] = useState(true);
  const [requireLogin, setRequireLogin] = useState(true);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // For now, we'll use a dummy admin user ID
      const response = await fetch('/api/admin/config?userId=admin');
      const data = await response.json();
      
              if (data.success) {
          setConfig(data.config);
          setTokenLimit(data.config.tokenLimit);
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
    if (!config) return;
    
    setSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
                    const updatedConfig = {
                ...config,
                tokenLimit,
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
          userId: 'admin',
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Settings className="w-8 h-8 text-orange-400" />
            <h1 className="text-3xl font-bold text-white">Admin Panel</h1>
          </div>
          <div className="text-white/60 text-sm">
            Token Management System
          </div>
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
                className="bg-red-500/10 border border-red-500/20 rounded-lg p-4"
              >
                <p className="text-red-400">{error}</p>
              </motion.div>
            )}

            {success && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-green-500/10 border border-green-500/20 rounded-lg p-4"
              >
                <p className="text-green-400">{success}</p>
              </motion.div>
            )}

            {/* Token Limits Section */}
            <div className="bg-gray-800 rounded-xl p-6 border border-white/10">
              <div className="flex items-center gap-2 mb-6">
                <CreditCard className="w-6 h-6 text-orange-400" />
                <h2 className="text-xl font-semibold text-white">Token Limits</h2>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-white/80 text-sm mb-2 font-medium">
                    Default Token Limit per Recharge
                  </label>
                  <input
                    type="number"
                    value={tokenLimit}
                    onChange={(e) => setTokenLimit(Number(e.target.value))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-orange-400 transition-colors"
                    min="1000"
                    max="100000"
                  />
                  <p className="text-white/60 text-xs mt-2">Tokens given per ₹100 recharge</p>
                </div>
                
                
              </div>
            </div>

            {/* System Settings Section */}
            <div className="bg-gray-800 rounded-xl p-6 border border-white/10">
              <div className="flex items-center gap-2 mb-6">
                <Shield className="w-6 h-6 text-orange-400" />
                <h2 className="text-xl font-semibold text-white">System Settings</h2>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-white/80 text-sm mb-2 font-medium">
                    Max Tokens per Request
                  </label>
                  <input
                    type="number"
                    value={maxTokensPerRequest}
                    onChange={(e) => setMaxTokensPerRequest(Number(e.target.value))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-orange-400 transition-colors"
                    min="1000"
                    max="50000"
                  />
                  <p className="text-white/60 text-xs mt-2">Maximum tokens allowed per AI request</p>
                </div>
                
                <div>
                  <label className="block text-white/80 text-sm mb-2 font-medium">
                    Min Tokens per Request
                  </label>
                  <input
                    type="number"
                    value={minTokensPerRequest}
                    onChange={(e) => setMinTokensPerRequest(Number(e.target.value))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-orange-400 transition-colors"
                    min="100"
                    max="10000"
                  />
                  <p className="text-white/60 text-xs mt-2">Minimum tokens required per AI request</p>
                </div>
                
                <div>
                  <label className="block text-white/80 text-sm mb-2 font-medium">
                    Token Estimation Buffer (%)
                  </label>
                  <input
                    type="number"
                    value={tokenEstimationBuffer}
                    onChange={(e) => setTokenEstimationBuffer(Number(e.target.value))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-orange-400 transition-colors"
                    min="0"
                    max="100"
                  />
                  <p className="text-white/60 text-xs mt-2">Buffer percentage for token estimation</p>
                </div>
              </div>
              
              <div className="mt-6 space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableTokenSystem}
                    onChange={(e) => setEnableTokenSystem(e.target.checked)}
                    className="w-5 h-5 text-orange-400 bg-gray-700 border-gray-600 rounded focus:ring-orange-400"
                  />
                  <span className="text-white font-medium">Enable Token System</span>
                </label>
                
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requireLogin}
                    onChange={(e) => setRequireLogin(e.target.checked)}
                    className="w-5 h-5 text-orange-400 bg-gray-700 border-gray-600 rounded focus:ring-orange-400"
                  />
                  <span className="text-white font-medium">Require Login for AI Generation</span>
                </label>
              </div>
            </div>

            {/* Current Configuration Display */}
            {config && (
              <div className="bg-gray-800 rounded-xl p-6 border border-white/10">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="w-5 h-5 text-orange-400" />
                  <h3 className="text-lg font-semibold text-white">Current Configuration</h3>
                </div>
                
                <div className="text-white/60 text-sm space-y-2">
                  <p>Last Updated: {new Date(config.updatedAt).toLocaleString()}</p>
                  <p>Updated By: {config.updatedBy}</p>
                  <p>Current Token Limit: <span className="text-white font-semibold">{config.tokenLimit.toLocaleString()} tokens</span></p>
                  <p>System Status: <span className={`font-semibold ${config.systemSettings.enableTokenSystem ? 'text-green-400' : 'text-red-400'}`}>
                    {config.systemSettings.enableTokenSystem ? 'Active' : 'Disabled'}
                  </span></p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-4 pt-6">
              <button
                onClick={loadConfig}
                disabled={loading}
                className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              
              <button
                onClick={saveConfig}
                disabled={saving}
                className="px-8 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center gap-2 font-medium"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>

            {/* Quick Actions */}
            <div className="bg-gray-800 rounded-xl p-6 border border-white/10">
              <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
              <div className="grid md:grid-cols-3 gap-4">
                                        <button
                          onClick={() => {
                            setTokenLimit(10000);
                          }}
                          className="p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors text-left"
                        >
                          <div className="text-white font-medium">Set 10K Tokens</div>
                          <div className="text-white/60 text-sm">Lower token limit</div>
                        </button>
                        
                        <button
                          onClick={() => {
                            setTokenLimit(50000);
                          }}
                          className="p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors text-left"
                        >
                          <div className="text-white font-medium">Set 50K Tokens</div>
                          <div className="text-white/60 text-sm">Higher token limit</div>
                        </button>
                
                <button
                  onClick={() => {
                    setEnableTokenSystem(false);
                    setRequireLogin(false);
                  }}
                  className="p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors text-left"
                >
                  <div className="text-white font-medium">Disable Token System</div>
                  <div className="text-white/60 text-sm">Free access mode</div>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
