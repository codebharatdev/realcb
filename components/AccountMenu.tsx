'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Coins, Settings, LogOut, ChevronDown, Zap, TrendingUp, FolderOpen, Github } from 'lucide-react';
import TokenBalance from './TokenBalance';

interface AccountMenuProps {
  user: any;
  onSignOut: () => void;
  onRechargeClick: () => void;
  onMyAppsClick: () => void;
  onGitHubClick: () => void;
  onAdminClick: () => void;
  githubConnected: boolean;
}

export default function AccountMenu({ 
  user, 
  onSignOut, 
  onRechargeClick, 
  onMyAppsClick, 
  onGitHubClick,
  onAdminClick,
  githubConnected 
}: AccountMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      {/* Account Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2 border border-white/20 hover:bg-white/20 transition-all duration-200"
      >
        <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-green-500 rounded-full flex items-center justify-center">
          <User className="w-4 h-4 text-white" />
        </div>
        <div className="hidden md:block text-left">
          <div className="text-white font-medium text-sm">
            {user.displayName || user.email?.split('@')[0] || 'User'}
          </div>
          <div className="text-white/60 text-xs">
            {user.email}
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-white/60 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 top-full mt-2 w-80 bg-gray-900 rounded-xl border border-white/20 shadow-2xl backdrop-blur-sm z-50"
          >
            {/* User Info Header */}
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-green-500 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-white font-semibold">
                    {user.displayName || user.email?.split('@')[0] || 'User'}
                  </div>
                  <div className="text-white/60 text-sm">
                    {user.email}
                  </div>
                </div>
              </div>
            </div>

            {/* AI Credits Section */}
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center gap-2 mb-3">
                <Coins className="w-4 h-4 text-orange-400" />
                <span className="text-white font-medium">AI Credits</span>
              </div>
              
              {/* Token Balance Component */}
              <div className="scale-90 origin-top-left">
                <TokenBalance
                  userId={user.uid}
                  onRechargeClick={() => {
                    onRechargeClick();
                    setIsOpen(false);
                  }}
                />
              </div>
            </div>

            {/* Menu Items */}
            <div className="p-2">
              <button
                onClick={() => {
                  onMyAppsClick();
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <FolderOpen className="w-4 h-4" />
                <span className="text-sm">My Apps</span>
              </button>
              
              <button
                onClick={() => {
                  onGitHubClick();
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <Github className="w-4 h-4" />
                <span className="text-sm">{githubConnected ? 'GitHub' : 'Connect GitHub'}</span>
              </button>
              
              {user.isAdmin && (
                <button
                  onClick={() => {
                    onAdminClick();
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 rounded-lg transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  <span className="text-sm">Admin Panel</span>
                </button>
              )}
              
              <button
                onClick={() => {
                  // TODO: Add settings functionality
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <Settings className="w-4 h-4" />
                <span className="text-sm">Settings</span>
              </button>
              
              <button
                onClick={() => {
                  onSignOut();
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm">Sign Out</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
