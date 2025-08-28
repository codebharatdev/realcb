'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';

export function UserProfile() {
  const { user, loading, signOut } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      setIsDropdownOpen(false);
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  };

  // Don't render anything while loading to prevent hydration mismatch
  if (loading || !user) return null;

  return (
    <div className="relative">
      {/* User Avatar Button */}
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="flex items-center gap-3 text-white/80 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-white/10"
      >
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-orange-500 to-green-500 flex items-center justify-center">
          {user.photoURL ? (
            <img 
              src={user.photoURL} 
              alt={user.displayName || 'User'} 
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-white text-sm font-medium">
              {user.displayName?.[0] || user.email?.[0] || 'U'}
            </span>
          )}
        </div>
        
        {/* Name */}
        <span className="hidden md:block text-sm font-medium">
          {user.displayName || user.email}
        </span>
        
        {/* Dropdown Arrow */}
        <svg 
          className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isDropdownOpen && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl py-2 z-50">
          {/* User Info */}
          <div className="px-4 py-3 border-b border-gray-700">
            <p className="text-white font-medium text-sm">
              {user.displayName || 'User'}
            </p>
            <p className="text-gray-400 text-xs">
              {user.email}
            </p>
          </div>
          
          {/* Menu Items */}
          <div className="py-1">
            <button
              onClick={handleSignOut}
              className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800 transition-colors flex items-center gap-3"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign Out
            </button>
          </div>
        </div>
      )}

      {/* Backdrop to close dropdown */}
      {isDropdownOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsDropdownOpen(false)}
        />
      )}
    </div>
  );
}
