'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { motion } from 'framer-motion';
import { Shield, CheckCircle, AlertCircle, Settings } from 'lucide-react';

export default function AdminSetupPage() {
  const { user } = useAuth();
  const [adminStatus, setAdminStatus] = useState<{
    isAdmin: boolean;
    needsSetup: boolean;
    loading: boolean;
    error: string | null;
  }>({
    isAdmin: false,
    needsSetup: false,
    loading: true,
    error: null
  });

  const [settingUp, setSettingUp] = useState(false);

  useEffect(() => {
    if (user) {
      checkAdminStatus();
    }
  }, [user]);

  const checkAdminStatus = async () => {
    if (!user) return;

    setAdminStatus(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch(`/api/test-admin-access?userId=${user.uid}`);
      const data = await response.json();

      if (data.success) {
        setAdminStatus({
          isAdmin: data.isAdmin,
          needsSetup: data.needsSetup,
          loading: false,
          error: null
        });
      } else {
        setAdminStatus({
          isAdmin: false,
          needsSetup: true,
          loading: false,
          error: data.error
        });
      }
    } catch (error) {
      setAdminStatus({
        isAdmin: false,
        needsSetup: true,
        loading: false,
        error: 'Failed to check admin status'
      });
    }
  };

  const setupAdmin = async () => {
    if (!user) return;

    setSettingUp(true);
    try {
      const response = await fetch('/api/test-admin-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.uid })
      });

      const data = await response.json();

      if (data.success) {
        setAdminStatus({
          isAdmin: true,
          needsSetup: false,
          loading: false,
          error: null
        });
      } else {
        setAdminStatus(prev => ({
          ...prev,
          error: data.error
        }));
      }
    } catch (error) {
      setAdminStatus(prev => ({
        ...prev,
        error: 'Failed to setup admin access'
      }));
    } finally {
      setSettingUp(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-xl p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-gray-400">Please sign in to access admin setup.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-800 rounded-xl p-8 max-w-md w-full border border-white/20"
      >
        <div className="text-center mb-6">
          <Shield className="w-16 h-16 text-orange-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Admin Setup</h1>
          <p className="text-gray-400">Configure admin access for token management</p>
        </div>

        {adminStatus.loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-400 mx-auto"></div>
            <p className="text-gray-400 mt-2">Checking admin status...</p>
          </div>
        ) : adminStatus.isAdmin ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-6"
          >
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Admin Access Granted!</h2>
            <p className="text-gray-400 mb-6">You now have access to the admin panel.</p>
            
            <div className="space-y-3">
              <button
                onClick={() => window.location.href = '/'}
                className="w-full bg-orange-500 text-white py-3 px-4 rounded-lg hover:bg-orange-600 transition-colors"
              >
                Go to Main App
              </button>
              <p className="text-xs text-gray-500">
                Look for "Admin Panel" in your account menu
              </p>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-6">
            <div className="bg-gray-700 rounded-lg p-4">
              <h3 className="text-white font-semibold mb-2">Current User</h3>
              <div className="text-gray-300 text-sm space-y-1">
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>Name:</strong> {user.displayName || 'N/A'}</p>
                <p><strong>User ID:</strong> {user.uid}</p>
              </div>
            </div>

            {adminStatus.error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <p className="text-red-400 text-sm">{adminStatus.error}</p>
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={setupAdmin}
                disabled={settingUp}
                className="w-full bg-orange-500 text-white py-3 px-4 rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {settingUp ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Setting up...
                  </>
                ) : (
                  <>
                    <Settings className="w-4 h-4" />
                    Grant Admin Access
                  </>
                )}
              </button>
              
              <button
                onClick={checkAdminStatus}
                className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-500 transition-colors text-sm"
              >
                Refresh Status
              </button>
            </div>

            <div className="text-xs text-gray-500 text-center">
              <p>This will give you access to configure token limits and system settings.</p>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
