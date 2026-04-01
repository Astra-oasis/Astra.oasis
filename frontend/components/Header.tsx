'use client';

import React, { useState, useImperativeHandle, forwardRef } from 'react';
import { Wallet, Menu, Search, HelpCircle, LayoutGrid, PlusCircle, Tv, LifeBuoy, X, ChevronDown, Settings, LogOut } from 'lucide-react';
import DolphinLogo from './DolphinLogo';
import { ViewState } from '../types';

interface HeaderProps {
  onGoHome: () => void;
  onGoCreate: () => void;
  onGoLivestreams: () => void;
  onGoSupport: () => void;
  onGoProfile: () => void;
  onConnectWallet: () => void;
  onDisconnectWallet?: () => void;
  walletConnected: boolean;
  walletAddress?: string;
  currentView: ViewState;
}

export interface HeaderRef {
  refreshWalletInfo: () => Promise<void>;
}

const Header = forwardRef<HeaderRef, HeaderProps>(({
  onGoHome,
  onGoCreate,
  onGoLivestreams,
  onGoSupport,
  onGoProfile,
  onConnectWallet,
  onDisconnectWallet,
  walletConnected,
  walletAddress,
  currentView
}, ref) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [walletMenuOpen, setWalletMenuOpen] = useState(false);
  const [walletInfo, setWalletInfo] = useState<any>(null);

  // Expose refresh method to parent
  useImperativeHandle(ref, () => ({
    refreshWalletInfo: async () => {
      await fetchWalletInfo();
    }
  }), [walletAddress]);

  // Fetch wallet info when connected
  React.useEffect(() => {
    if (walletConnected && walletAddress) {
      fetchWalletInfo();
    }
  }, [walletConnected, walletAddress]);



  const fetchWalletInfo = async () => {
    try {
      const res = await fetch(`/api/wallets?address=${walletAddress}`);
      const data = await res.json();
      if (data.success && data.wallet) {
        setWalletInfo(data.wallet);
      }
    } catch (error) {
      console.error('Error fetching wallet info:', error);
    }
  };



  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-800 bg-pump-bg/95 backdrop-blur supports-[backdrop-filter]:bg-pump-bg/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo Section */}
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={onGoHome}>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-600/20 group-hover:scale-105 transition-transform">
              <DolphinLogo size={32} />
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="text-lg font-bold tracking-tight text-white leading-none">
                Oasis Astra
              </span>
              <span className="text-[10px] text-gray-400 font-mono">Sapphire Protocol</span>
            </div>
          </div>

          <nav className="hidden xl:flex items-center gap-6 text-sm font-medium">
            <button
              onClick={onGoHome}
              className={`flex items-center gap-2 transition-colors ${currentView === ViewState.GRID || currentView === ViewState.DETAIL
                  ? 'text-white font-bold'
                  : 'text-gray-400 hover:text-white'
                }`}
            >
              <LayoutGrid className="w-4 h-4" /> Board
            </button>
            <button
              onClick={onGoLivestreams}
              className={`flex items-center gap-2 transition-colors ${currentView === ViewState.LIVESTREAMS
                  ? 'text-white font-bold'
                  : 'text-gray-400 hover:text-white'
                }`}
            >
              <Tv className="w-4 h-4" /> Livestreams
            </button>
            <button
              onClick={onGoCreate}
              className={`flex items-center gap-2 transition-colors ${currentView === ViewState.CREATE
                  ? 'text-white font-bold'
                  : 'text-gray-400 hover:text-white'
                }`}
            >
              <PlusCircle className="w-4 h-4" /> Start Coin
            </button>
            <button
              onClick={onGoSupport}
              className={`flex items-center gap-2 transition-colors ${currentView === ViewState.SUPPORT
                  ? 'text-white font-bold'
                  : 'text-gray-400 hover:text-white'
                }`}
            >
              <LifeBuoy className="w-4 h-4" /> Support
            </button>
            <button className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
              <HelpCircle className="w-4 h-4" /> Docs
            </button>
          </nav>
        </div>

        {/* Search */}
        <div className="flex-1 max-w-md px-8 hidden lg:block">
          <div className="relative group">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500 group-focus-within:text-blue-500 transition-colors" />
            <input
              type="search"
              placeholder="Search tokens..."
              className="w-full rounded-lg bg-pump-card border border-gray-800 py-2 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:bg-gray-900 transition-all text-white placeholder-gray-600"
            />
          </div>
        </div>

        {/* Wallet & Actions */}
        <div className="flex items-center gap-3">
          {!walletConnected ? (
            <button
              onClick={onConnectWallet}
              className="flex items-center gap-2 bg-white hover:bg-gray-200 text-black px-4 py-2 rounded-lg text-sm font-bold transition-all active:scale-95"
            >
              <Wallet className="w-4 h-4" />
              <span>Connect Wallet</span>
            </button>
          ) : (
            <div className="relative">
              <div className="flex items-center gap-3 cursor-pointer" onClick={() => setWalletMenuOpen(!walletMenuOpen)}>
                <div className="hidden md:flex flex-col items-end mr-2">
                  <span className="text-sm font-bold text-white">
                    {walletInfo?.display_name || 'User'}
                  </span>
                </div>
                <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-pump-accent to-blue-500 border-2 border-gray-800 flex items-center justify-center text-white font-bold hover:scale-105 transition-transform overflow-hidden">
                  {walletInfo?.avatar_url ? (
                    <img src={walletInfo.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    walletInfo?.display_name?.[0]?.toUpperCase() || 'U'
                  )}
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${walletMenuOpen ? 'rotate-180' : ''}`} />
              </div>

              {/* Wallet Dropdown Menu */}
              {walletMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-pump-card border border-gray-800 rounded-lg shadow-xl z-50 overflow-hidden">
                  <button
                    onClick={() => {
                      onGoProfile();
                      setWalletMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-pump-green hover:bg-pump-green/10 transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Profile</span>
                  </button>
                  <button
                    onClick={() => {
                      if (onDisconnectWallet) {
                        onDisconnectWallet();
                      }
                      setWalletMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign out</span>
                  </button>
                </div>
              )}
            </div>
          )}

          <button className="xl:hidden p-2 text-gray-400 hover:text-white" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="xl:hidden bg-pump-bg border-b border-gray-800 p-4 animate-fade-in">
          <nav className="flex flex-col gap-4">
            <button onClick={() => { onGoHome(); setMobileMenuOpen(false); }} className="flex items-center gap-3 text-white font-bold"><LayoutGrid className="w-5 h-5" /> Board</button>
            <button onClick={() => { onGoCreate(); setMobileMenuOpen(false); }} className="flex items-center gap-3 text-white font-bold"><PlusCircle className="w-5 h-5" /> Start Coin</button>
            <button className="flex items-center gap-3 text-gray-400"><HelpCircle className="w-5 h-5" /> Docs</button>
            {!walletConnected && (
              <button onClick={() => { onConnectWallet(); setMobileMenuOpen(false); }} className="flex items-center gap-3 text-pump-green font-bold border border-pump-green/30 rounded-lg p-3 justify-center"><Wallet className="w-5 h-5" /> Connect Wallet</button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
});

Header.displayName = 'Header';

export default Header;
