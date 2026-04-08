'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import Header, { type HeaderRef } from '../components/Header';
import KingOfTheHill from '../components/KingOfTheHill';
import CoinCard from '../components/CoinCard';
import FilterBar from '../components/FilterBar';
import Toast, { ToastMessage } from '../components/Toast';
import { Coin, ViewState, SortOption } from '../types';
import { BrowserProvider, Contract } from 'ethers';
import { wrapEthereumProvider } from '@oasisprotocol/sapphire-paratime';
import { FACTORY_ABI, FACTORY_ADDRESS } from '../abi/factoryAbi';
import { saveWalletInfo } from '../lib/walletHelper';

const CoinDetail    = dynamic(() => import('../components/CoinDetail'),    { ssr: false });
const CreateCoinPage = dynamic(() => import('../components/CreateCoinPage'), { ssr: false });
const LivestreamsPage = dynamic(() => import('../components/LivestreamsPage'), { ssr: false });
const SupportPage   = dynamic(() => import('../components/SupportPage'),   { ssr: false });
const ProfilePage   = dynamic(() => import('../components/ProfilePage'),   { ssr: false });

export default function Home() {
  const [viewState, setViewState]     = useState<ViewState>(ViewState.GRID);
  const [selectedCoin, setSelectedCoin] = useState<Coin | null>(null);
  const [sortOption, setSortOption]   = useState<SortOption>('creationTime');
  const [toasts, setToasts]           = useState<ToastMessage[]>([]);
  const [connected, setConnected]     = useState(false);
  const [address, setAddress]         = useState('');
  const [realTokens, setRealTokens]   = useState<Coin[]>([]);
  const [loadingTokens, setLoadingTokens] = useState(false);

  const headerRef = useRef<HeaderRef>(null);

  const addToast = (type: ToastMessage['type'], title: string, message: string) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, type, title, message }]);
    return id;
  };

  const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

  const handleCoinClick = (coin: Coin) => { setSelectedCoin(coin); setViewState(ViewState.DETAIL); };
  const handleGoHome    = () => { setSelectedCoin(null); setViewState(ViewState.GRID); fetchRealTokens(); };
  const handleGoCreate  = () => setViewState(ViewState.CREATE);
  const handleGoLivestreams = () => setViewState(ViewState.LIVESTREAMS);
  const handleGoSupport = () => setViewState(ViewState.SUPPORT);
  const handleGoProfile = () => setViewState(ViewState.PROFILE);

  const handleSelectTokenFromSearch = (contractAddress: string) => {
    const token = realTokens.find(t => t.contractAddress === contractAddress);
    if (token) {
      setSelectedCoin(token);
      setViewState(ViewState.DETAIL);
    }
  };

  const handleProfileUpdated = async () => {
    if (headerRef.current) await headerRef.current.refreshWalletInfo();
  };

  const fetchRealTokens = async () => {
    setLoadingTokens(true);
    try {
      const response = await fetch('/api/tokens');
      const data = await response.json();
      if (data.success && data.data) {
        const formattedTokens: Coin[] = data.data.map((token: any, idx: number) => {
          const maxReserve = parseFloat(token.max_reserve) || 0;
          const bondingCurveProgress = Math.min(100, (maxReserve / 10000) * 100);
          return {
            id: String(token.id ?? idx),
            name: token.name,
            ticker: token.symbol,
            description: token.description || 'Token created on Oasis Sapphire',
            imageUrl: token.image_url || `https://picsum.photos/200/200?random=${idx + 500}`,
            creator: token.owner,
            marketCap: parseFloat(token.marketcap) || 0,
            replies: 0,
            bondingCurveProgress,
            createdAt: new Date(token.created_at).getTime(),
            lastReply: new Date(token.created_at).getTime(),
            priceHistory: [],
            tokenAddress: token.contract_address,
            contractAddress: token.contract_address,
          };
        });
        setRealTokens(formattedTokens);
      } else {
        setRealTokens([]);
      }
    } catch (error) {
      console.error('Error fetching tokens:', error);
      setRealTokens([]);
    } finally {
      setLoadingTokens(false);
    }
  };

  useEffect(() => { fetchRealTokens(); }, []);

  useEffect(() => {
    if (viewState !== ViewState.GRID) return;
    const interval = setInterval(fetchRealTokens, 10000);
    return () => clearInterval(interval);
  }, [viewState]);

  const topCoinByMarketCap = useMemo(() => {
    const coins = [...realTokens];
    return coins.length > 0 ? coins.sort((a, b) => b.marketCap - a.marketCap)[0] : null;
  }, [realTokens]);

  const sortedCoins = useMemo(() => {
    const coins = [...realTokens];
    switch (sortOption) {
      case 'marketCap':    return coins.sort((a, b) => b.marketCap - a.marketCap);
      case 'creationTime': return coins.sort((a, b) => b.createdAt - a.createdAt);
      case 'lastReply':    return coins.sort((a, b) => b.lastReply - a.lastReply);
      default:             return coins.sort((a, b) => b.marketCap - a.marketCap);
    }
  }, [sortOption, realTokens]);

  const handleConnectWallet = async () => {
    if (!window.ethereum) { addToast('error', 'No Wallet', 'Please install MetaMask.'); return; }
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (accounts.length > 0) {
        const walletAddress = accounts[0];
        setConnected(true);
        setAddress(walletAddress);
        try { await saveWalletInfo(walletAddress); } catch { /* silent */ }
        addToast('success', 'Wallet Connected', `Connected to ${walletAddress.slice(0, 6)}...`);
      }
    } catch {
      addToast('error', 'Connection Failed', 'Failed to connect wallet.');
    }
  };

  const handleDisconnectWallet = () => {
    setConnected(false);
    setAddress('');
    addToast('success', 'Wallet Disconnected', 'Your wallet has been disconnected.');
  };

  useEffect(() => {
    const checkConnection = async () => {
      if (!window.ethereum) return;
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts.length > 0) {
        const walletAddress = accounts[0];
        setConnected(true);
        setAddress(walletAddress);
        try { await saveWalletInfo(walletAddress); } catch { /* silent */ }
      }
    };
    checkConnection();
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-pump-bg text-gray-900 dark:text-pump-text font-sans pb-20 relative">
      <Header
        ref={headerRef}
        onGoHome={handleGoHome}
        onGoCreate={handleGoCreate}
        onGoLivestreams={handleGoLivestreams}
        onGoSupport={handleGoSupport}
        onGoProfile={handleGoProfile}
        onConnectWallet={handleConnectWallet}
        onDisconnectWallet={handleDisconnectWallet}
        onSelectToken={handleSelectTokenFromSearch}
        walletConnected={connected}
        walletAddress={address}
        currentView={viewState}
      />

      <div className="fixed top-20 right-4 z-[100] flex flex-col gap-2 w-full max-w-sm pointer-events-none">
        {toasts.map(toast => <Toast key={toast.id} toast={toast} onClose={removeToast} />)}
      </div>

      <main className="container mx-auto px-4 py-6">
        {viewState === ViewState.GRID && (
          <>
            <KingOfTheHill coin={topCoinByMarketCap} onClick={handleCoinClick} />
            <div className="mt-8">
              <FilterBar currentSort={sortOption} onSortChange={setSortOption} />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-4">
                {sortedCoins.map(coin => <CoinCard key={coin.id} coin={coin} onClick={handleCoinClick} />)}
              </div>
            </div>
          </>
        )}

        {viewState === ViewState.DETAIL && selectedCoin && (
          <CoinDetail coin={selectedCoin} onBack={handleGoHome} showToast={addToast} removeToast={removeToast} />
        )}

        {viewState === ViewState.CREATE && (
          <CreateCoinPage
            onCancel={handleGoHome}
            onTokenCreated={(addr, tokenName, tokenSymbol) => {
              const shortAddress = `${addr.slice(0, 6)}...${addr.slice(-4)}`;
              addToast('success', `Launched ${tokenSymbol}`, `${tokenName} is live on-chain. Contract ${shortAddress}`);
              fetchRealTokens();
              handleGoHome();
            }}
          />
        )}

        {viewState === ViewState.LIVESTREAMS && <LivestreamsPage />}
        {viewState === ViewState.SUPPORT && <SupportPage />}
        {viewState === ViewState.PROFILE && address && (
          <ProfilePage walletAddress={address} onBack={handleGoHome} onProfileUpdated={handleProfileUpdated} onCoinClick={handleCoinClick} />
        )}
      </main>
    </div>
  );
}
