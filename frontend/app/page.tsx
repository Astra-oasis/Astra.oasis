'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import Header from '../components/Header';
import KingOfTheHill from '../components/KingOfTheHill';
import CoinCard from '../components/CoinCard';
import FilterBar from '../components/FilterBar';
import Toast, { ToastMessage } from '../components/Toast';
import { MOCK_COINS } from '../services/mockData';
import { Coin, ViewState, SortOption } from '../types';
import { BrowserProvider, Contract } from 'ethers';
import { wrapEthereumProvider } from '@oasisprotocol/sapphire-paratime';
import { FACTORY_ABI, FACTORY_ADDRESS } from '../abi/factoryAbi';

const CoinDetail = dynamic(() => import('../components/CoinDetail'), { ssr: false });
const CreateCoinPage = dynamic(() => import('../components/CreateCoinPage'), { ssr: false });
const LivestreamsPage = dynamic(() => import('../components/LivestreamsPage'), { ssr: false });
const SupportPage = dynamic(() => import('../components/SupportPage'), { ssr: false });

export default function Home() {
  const [viewState, setViewState] = useState<ViewState>(ViewState.GRID);
  const [selectedCoin, setSelectedCoin] = useState<Coin | null>(null);
  const [sortOption, setSortOption] = useState<SortOption>('featured');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState('');
  const [realTokens, setRealTokens] = useState<Coin[]>([]);
  const [loadingTokens, setLoadingTokens] = useState(false);

  // Toast Handler
  const addToast = (type: ToastMessage['type'], title: string, message: string) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, type, title, message }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleCoinClick = (coin: Coin) => {
    setSelectedCoin(coin);
    setViewState(ViewState.DETAIL);
  };

  const handleGoHome = () => {
    setSelectedCoin(null);
    setViewState(ViewState.GRID);
  };

  const handleGoCreate = () => {
    setViewState(ViewState.CREATE);
  };

  const handleGoLivestreams = () => {
    setViewState(ViewState.LIVESTREAMS);
  };

  const handleGoSupport = () => {
    setViewState(ViewState.SUPPORT);
  };

  const fetchRealTokens = async () => {
    if (!window.ethereum) return;
    setLoadingTokens(true);
    try {
      let ethereum = window.ethereum;
      if (window.ethereum.providers) {
        ethereum = window.ethereum.providers.find((p: any) => p.isMetaMask) || window.ethereum;
      }
      const wrappedProvider = wrapEthereumProvider(ethereum);
      const provider = new BrowserProvider(wrappedProvider);
      const factory = new Contract(FACTORY_ADDRESS, FACTORY_ABI, provider);
      
      const tokens = await factory.getAllTokens();
      const formattedTokens: Coin[] = tokens.map((t: any, idx: number) => ({
        id: `real-${idx}`,
        name: t.name,
        ticker: t.symbol,
        description: t.metadataURI || `Token created on Oasis Sapphire`,
        imageUrl: `https://picsum.photos/200/200?random=${idx + 500}`,
        creator: t.creator,
        marketCap: 0, // Need to fetch price to calculate MC
        replies: 0,
        bondingCurveProgress: 0,
        createdAt: Number(t.createdAt) * 1000,
        lastReply: Number(t.createdAt) * 1000,
        priceHistory: [],
        tokenAddress: t.tokenAddress
      }));
      setRealTokens(formattedTokens);
    } catch (error) {
      console.error('Error fetching tokens:', error);
    } finally {
      setLoadingTokens(false);
    }
  };

  useEffect(() => {
    fetchRealTokens();
  }, []);

  const sortedCoins = useMemo(() => {
    const coins = [...realTokens, ...MOCK_COINS];
    switch (sortOption) {
      case 'marketCap':
        return coins.sort((a, b) => b.marketCap - a.marketCap);
      case 'creationTime':
        return coins.sort((a, b) => b.createdAt - a.createdAt);
      case 'lastReply':
        return coins.sort((a, b) => b.lastReply - a.lastReply);
      case 'featured':
      default:
        return coins;
    }
  }, [sortOption, realTokens]);

  const handleConnectWallet = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({
          method: 'eth_requestAccounts',
        });
        if (accounts.length > 0) {
          setConnected(true);
          setAddress(accounts[0]);
          addToast('success', 'Wallet Connected', `Connected to ${accounts[0].slice(0,6)}...`);
        }
      } catch (error) {
        addToast('error', 'Connection Failed', 'Failed to connect wallet.');
      }
    } else {
      addToast('error', 'No Wallet', 'Please install MetaMask.');
    }
  };

  const handleDisconnectWallet = () => {
    setConnected(false);
    setAddress('');
    addToast('success', 'Wallet Disconnected', 'Your wallet has been disconnected.');
  };

  useEffect(() => {
    const checkConnection = async () => {
      if (window.ethereum) {
        const accounts = await window.ethereum.request({
          method: 'eth_accounts',
        });
        if (accounts.length > 0) {
          setConnected(true);
          setAddress(accounts[0]);
        }
      }
    };
    checkConnection();
  }, []);

  return (
    <div className="min-h-screen bg-pump-bg text-pump-text font-sans pb-20 relative">
      <Header 
        onGoHome={handleGoHome} 
        onGoCreate={handleGoCreate} 
        onGoLivestreams={handleGoLivestreams}
        onGoSupport={handleGoSupport}
        onConnectWallet={handleConnectWallet}
        onDisconnectWallet={handleDisconnectWallet}
        walletConnected={connected}
        walletAddress={address}
        currentView={viewState}
      />
      
      {/* Toast Container */}
      <div className="fixed top-20 right-4 z-[100] flex flex-col gap-2 w-full max-w-sm pointer-events-none">
        {toasts.map((toast) => (
            <Toast key={toast.id} toast={toast} onClose={removeToast} />
        ))}
      </div>
      
      <main className="container mx-auto px-4 py-6">
        {viewState === ViewState.GRID && (
          <>
            <KingOfTheHill coin={sortedCoins[0]} onClick={handleCoinClick} />
            
            <div className="mt-8">
                <FilterBar currentSort={sortOption} onSortChange={setSortOption} />
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {sortedCoins.map((coin) => (
                    <CoinCard 
                      key={coin.id} 
                      coin={coin} 
                      onClick={handleCoinClick} 
                    />
                ))}
                </div>
            </div>
          </>
        )}

        {viewState === ViewState.DETAIL && selectedCoin && (
          <CoinDetail 
            coin={selectedCoin} 
            onBack={handleGoHome} 
            showToast={addToast} 
          />
        )}

        {viewState === ViewState.CREATE && (
          <CreateCoinPage 
            onCancel={handleGoHome} 
            onTokenCreated={(addr) => {
              addToast('success', 'Token Created', `Address: ${addr}`);
              fetchRealTokens();
              handleGoHome();
            }}
          />
        )}

        {viewState === ViewState.LIVESTREAMS && (
          <LivestreamsPage />
        )}

        {viewState === ViewState.SUPPORT && (
          <SupportPage />
        )}
      </main>
    </div>
  );
}
