'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Play, Square, Copy, ExternalLink, Settings, AlertCircle } from 'lucide-react';

interface NgrokStatus {
  isRunning: boolean;
  tunnelUrl: string | null;
  webhookUrl: string | null;
  timestamp: string;
}

export default function NgrokManager() {
  const [status, setStatus] = useState<NgrokStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    port: 3000,
    authtoken: '',
    region: 'us',
    subdomain: ''
  });

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/ngrok/status');
      const data = await response.json();
      
      if (data.success) {
        setStatus(data);
        setError(null);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to fetch ngrok status');
    }
  };

  const startTunnel = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/ngrok/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      const data = await response.json();

      if (data.success) {
        setStatus({
          isRunning: true,
          tunnelUrl: data.tunnelUrl,
          webhookUrl: data.webhookUrl,
          timestamp: new Date().toISOString()
        });
        setShowSettings(false);
      } else {
        setError(data.error || 'Failed to start tunnel');
      }
    } catch (err) {
      setError('Failed to start ngrok tunnel');
    } finally {
      setLoading(false);
    }
  };

  const stopTunnel = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/ngrok/stop', {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        setStatus({
          isRunning: false,
          tunnelUrl: null,
          webhookUrl: null,
          timestamp: new Date().toISOString()
        });
      } else {
        setError(data.error || 'Failed to stop tunnel');
      }
    } catch (err) {
      setError('Failed to stop ngrok tunnel');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  useEffect(() => {
    fetchStatus();
    // Poll status every 10 seconds
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-blue-400" />
          <h3 className="text-white font-semibold">Webhook Tunnel</h3>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="text-white/60 hover:text-white transition-colors"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 p-3 bg-white/5 rounded-lg border border-white/10"
          >
            <h4 className="text-white/80 text-sm font-medium mb-3">Tunnel Settings</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <label className="text-white/60 text-xs">Port</label>
                <input
                  type="number"
                  value={settings.port}
                  onChange={(e) => setSettings({ ...settings, port: parseInt(e.target.value) || 3000 })}
                  className="w-full bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-xs"
                />
              </div>
              <div>
                <label className="text-white/60 text-xs">Region</label>
                <select
                  value={settings.region}
                  onChange={(e) => setSettings({ ...settings, region: e.target.value })}
                  className="w-full bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-xs"
                >
                  <option value="us">US</option>
                  <option value="eu">EU</option>
                  <option value="au">AU</option>
                  <option value="ap">AP</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-white/60 text-xs">Auth Token (Optional)</label>
                <input
                  type="password"
                  value={settings.authtoken}
                  onChange={(e) => setSettings({ ...settings, authtoken: e.target.value })}
                  placeholder="ngrok authtoken"
                  className="w-full bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-xs"
                />
              </div>
              <div className="col-span-2">
                <label className="text-white/60 text-xs">Subdomain (Optional)</label>
                <input
                  type="text"
                  value={settings.subdomain}
                  onChange={(e) => setSettings({ ...settings, subdomain: e.target.value })}
                  placeholder="your-subdomain"
                  className="w-full bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-xs"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status Display */}
      {status && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <div className={`w-2 h-2 rounded-full ${status.isRunning ? 'bg-green-400' : 'bg-red-400'}`} />
            <span className="text-white/80 text-sm">
              {status.isRunning ? 'Tunnel Active' : 'Tunnel Inactive'}
            </span>
          </div>

          {status.isRunning && status.tunnelUrl && (
            <div className="space-y-2">
              <div className="bg-white/5 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-white/60 text-xs">Public URL</span>
                  <button
                    onClick={() => copyToClipboard(status.tunnelUrl!)}
                    className="text-white/40 hover:text-white transition-colors"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-white text-sm font-mono truncate">{status.tunnelUrl}</span>
                  <a
                    href={status.tunnelUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {status.webhookUrl && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-green-400 text-xs font-medium">Webhook URL</span>
                    <button
                      onClick={() => copyToClipboard(status.webhookUrl!)}
                      className="text-green-400/60 hover:text-green-400 transition-colors"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-300 text-sm font-mono truncate">{status.webhookUrl}</span>
                    <a
                      href={status.webhookUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-400 hover:text-green-300 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <p className="text-green-300/60 text-xs mt-1">
                    Add this URL to your Razorpay webhook settings
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <span className="text-red-400 text-sm">{error}</span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        {!status?.isRunning ? (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={startTunnel}
            disabled={loading}
            className="flex-1 bg-green-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            Start Tunnel
          </motion.button>
        ) : (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={stopTunnel}
            disabled={loading}
            className="flex-1 bg-red-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Square className="w-4 h-4" />
            )}
            Stop Tunnel
          </motion.button>
        )}

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={fetchStatus}
          disabled={loading}
          className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Refresh
        </motion.button>
      </div>

      {/* Instructions */}
      {status?.isRunning && (
        <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <h4 className="text-blue-400 text-sm font-medium mb-2">Next Steps:</h4>
          <ol className="text-blue-300/80 text-xs space-y-1">
            <li>1. Copy the webhook URL above</li>
            <li>2. Add it to your Razorpay dashboard webhook settings</li>
            <li>3. Make a test payment to trigger the webhook</li>
            <li>4. Check the console logs for webhook events</li>
          </ol>
        </div>
      )}
    </div>
  );
}
