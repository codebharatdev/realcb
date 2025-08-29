'use client';

import { useState } from 'react';

export default function TestTokenPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testTokenConsumption = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/test-token-system?userId=4DZy3ysvIWZUtbL4mR45SpWCW5e2');
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: (error as Error).message });
    } finally {
      setLoading(false);
    }
  };

  const testConsumeActual = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/tokens/consume-actual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: '4DZy3ysvIWZUtbL4mR45SpWCW5e2',
          actualTokens: 500,
          description: 'Test actual consumption'
        }),
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: (error as Error).message });
    } finally {
      setLoading(false);
    }
  };

  const testCheckBalance = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/tokens/check-balance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: '4DZy3ysvIWZUtbL4mR45SpWCW5e2',
          requiredTokens: 1000,
        }),
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: (error as Error).message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Token System Test</h1>
        
        <div className="space-y-4 mb-8">
          <button
            onClick={testTokenConsumption}
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test Token Consumption'}
          </button>
          
          <button
            onClick={testConsumeActual}
            disabled={loading}
            className="bg-green-500 hover:bg-green-600 px-4 py-2 rounded disabled:opacity-50 ml-4"
          >
            {loading ? 'Testing...' : 'Test Consume Actual'}
          </button>
          
          <button
            onClick={testCheckBalance}
            disabled={loading}
            className="bg-yellow-500 hover:bg-yellow-600 px-4 py-2 rounded disabled:opacity-50 ml-4"
          >
            {loading ? 'Testing...' : 'Test Check Balance'}
          </button>
        </div>

        {result && (
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Result:</h2>
            <pre className="text-sm overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
