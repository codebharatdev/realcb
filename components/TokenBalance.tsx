'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Coins, Zap, TrendingUp } from 'lucide-react';

interface TokenBalanceProps {
  userId: string;
  onRechargeClick: () => void;
}

interface TokenData {
  balance: {
    tokens: number;
    totalSpent: number;
    totalRecharged: number;
    totalFromPayments: number;
    lastRecharge: string;
  };
  recentTransactions: Array<{
    id: string;
    type: 'recharge' | 'consumption' | 'refund';
    amount: number;
    description: string;
    createdAt: string;
  }>;
}

export default function TokenBalance({ userId, onRechargeClick }: TokenBalanceProps) {
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTokenBalance = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/tokens/balance?userId=${userId}`);
      const data = await response.json();

      if (data.success) {
        setTokenData(data);
      } else {
        setError(data.error || 'Failed to fetch token balance');
      }
    } catch (err) {
      setError('Failed to fetch token balance');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchTokenBalance();
    }
  }, [userId]);

  if (loading) {
    return (
      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20 w-48">
        <div className="animate-pulse">
          <div className="h-3 bg-white/20 rounded w-1/3 mb-2"></div>
          <div className="h-6 bg-white/20 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-orange-500/10 backdrop-blur-sm rounded-xl p-3 border border-orange-500/20 w-48">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
          <span className="text-orange-400 text-xs font-medium">Setup Required</span>
        </div>
        <p className="text-orange-300 text-xs mb-2">
          Firebase needed for credits system.
        </p>
        <button
          onClick={onRechargeClick}
          className="w-full bg-orange-500/20 text-orange-300 py-1 px-2 rounded text-xs hover:bg-orange-500/30 transition-colors"
        >
          Setup Guide
        </button>
      </div>
    );
  }

  if (!tokenData) {
    return null;
  }

  const { balance, recentTransactions } = tokenData;
  const isLowBalance = balance.tokens < 1000;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 w-full"
    >
      <div className="mb-4">
        <div className="text-3xl font-bold text-white mb-1">
          {balance.tokens.toLocaleString()}
        </div>
        <div className="text-white/60 text-sm">Available Credits</div>
        
                 {/* Progress Bar */}
         {balance.totalFromPayments > 0 && (
           <div className="mt-3">
             <div className="flex justify-between text-xs text-white/60 mb-1">
               <span>Usage</span>
               <span>{Math.round((balance.totalSpent / balance.totalFromPayments) * 100)}%</span>
             </div>
             <div className="w-full bg-white/20 rounded-full h-2">
               <div 
                 className="bg-gradient-to-r from-orange-500 to-green-500 h-2 rounded-full transition-all duration-300"
                 style={{ 
                   width: `${Math.min((balance.totalSpent / balance.totalFromPayments) * 100, 100)}%` 
                 }}
               ></div>
             </div>
           </div>
         )}
      </div>

             <div className="grid grid-cols-3 gap-3 mb-4 text-sm">
         <div>
           <div className="text-white/60">Total Added</div>
           <div className="text-white font-medium">
             {balance.totalFromPayments.toLocaleString()}
           </div>
         </div>
         <div>
           <div className="text-white/60">Total Spent</div>
           <div className="text-white font-medium">
             {balance.totalSpent.toLocaleString()}
           </div>
         </div>
         <div>
           <div className="text-white/60">Remaining</div>
           <div className="text-white font-medium">
             {balance.tokens.toLocaleString()}
           </div>
         </div>
       </div>

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onRechargeClick}
        className="w-full bg-gradient-to-r from-orange-500 to-green-500 text-white py-2.5 px-4 rounded-lg font-medium hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
      >
        <TrendingUp className="w-4 h-4" />
        Buy AI Credits
      </motion.button>

      {recentTransactions.length > 0 && (
        <div className="mt-4 pt-3 border-t border-white/10">
          <h4 className="text-white/80 text-sm font-medium mb-2">Recent Activity</h4>
          <div className="space-y-2">
            {recentTransactions.slice(0, 3).map((txn) => (
              <div key={txn.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    txn.type === 'recharge' ? 'bg-green-400' : 'bg-red-400'
                  }`} />
                  <span className="text-white/70 truncate max-w-32">
                    {txn.description}
                  </span>
                </div>
                <span className={`font-medium ${
                  txn.type === 'recharge' ? 'text-green-400' : 'text-red-400'
                }`}>
                  {txn.type === 'recharge' ? '+' : ''}{txn.amount.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
