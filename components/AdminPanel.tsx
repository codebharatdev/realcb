'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface ModelConfig {
  activeModel: string;
  availableModels: string[];
}

export default function AdminPanel() {
  const [modelConfig, setModelConfig] = useState<ModelConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const fetchModelConfig = async () => {
    try {
      const response = await fetch('/api/model-config');
      const data = await response.json();
      
      if (data.success) {
        setModelConfig(data);
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (error) {
      setMessage(`Error: ${(error as Error).message}`);
    }
  };

  const updateModel = async (modelName: string) => {
    setLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/model-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          activeModel: modelName,
          updatedBy: 'admin-panel'
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setMessage(`✅ Model updated to: ${data.activeModel}`);
        fetchModelConfig(); // Refresh the config
      } else {
        setMessage(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      setMessage(`❌ Error: ${(error as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModelConfig();
  }, []);

  if (!modelConfig) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-sm border">
        <h2 className="text-lg font-semibold mb-4">AI Model Configuration</h2>
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm border">
      <h2 className="text-lg font-semibold mb-4">AI Model Configuration</h2>
      
      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-2">Current Active Model:</p>
        <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-3 py-1 rounded-md text-sm font-medium">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          {modelConfig.activeModel}
        </div>
      </div>

      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-2">Available Models:</p>
        <div className="grid grid-cols-1 gap-2">
          {modelConfig.availableModels.map((model) => (
            <div
              key={model}
              className={`flex items-center justify-between p-3 rounded-md border ${
                model === modelConfig.activeModel
                  ? 'bg-green-50 border-green-200'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <span className="text-sm font-medium">{model}</span>
              {model === modelConfig.activeModel ? (
                <span className="text-xs text-green-600 font-medium">Active</span>
              ) : (
                <Button
                  size="sm"
                  onClick={() => updateModel(model)}
                  disabled={loading}
                  className="text-xs"
                >
                  {loading ? 'Updating...' : 'Set Active'}
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      {message && (
        <div className={`p-3 rounded-md text-sm ${
          message.startsWith('✅') 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {message}
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          Changes take effect immediately. The active model will be used for all new code generations.
        </p>
      </div>
    </div>
  );
}
