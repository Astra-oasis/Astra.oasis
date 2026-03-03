'use client'

<<<<<<< Updated upstream
import dynamic from 'next/dynamic'
import { useState, useEffect, useRef } from 'react'

const CreateToken = dynamic(() => import('../components/CreateToken'), { ssr: false })
const TokenMarketplace = dynamic(() => import('../components/TokenMarketplace'), { ssr: false })

export default function Home() {
  const [connected, setConnected] = useState(false)
  const [address, setAddress] = useState('')
  const [createdTokens, setCreatedTokens] = useState<string[]>([])
  const [showMarketplace, setShowMarketplace] = useState(false)
  const marketplaceRef = useRef<any>(null)

  const handleTokenCreated = (tokenAddress: string) => {
    const updatedTokens = [...createdTokens, tokenAddress]
    setCreatedTokens(updatedTokens)
    localStorage.setItem('createdTokens', JSON.stringify(updatedTokens))
    
    // Show marketplace after first token is created
    if (!showMarketplace) {
      setShowMarketplace(true)
=======
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
>>>>>>> Stashed changes
    }
  };

  const handleDisconnectWallet = () => {
    setConnected(false);
    setAddress('');
    addToast('success', 'Wallet Disconnected', 'Your wallet has been disconnected.');
  };

<<<<<<< Updated upstream
  // Load saved tokens on mount and check wallet connection
  useEffect(() => {
    const saved = localStorage.getItem('createdTokens')
    if (saved) {
      const tokens = JSON.parse(saved)
      setCreatedTokens(tokens)
    }

    // Check if wallet is already connected
    const checkConnection = async () => {
      if (typeof window !== 'undefined' && window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' })
          if (accounts.length > 0) {
            setConnected(true)
            setAddress(accounts[0])
            console.log('Auto-detected wallet connection:', accounts[0])
          }
        } catch (error) {
          console.log('No wallet connection detected')
=======
  useEffect(() => {
    const checkConnection = async () => {
      if (window.ethereum) {
        const accounts = await window.ethereum.request({
          method: 'eth_accounts',
        });
        if (accounts.length > 0) {
          setConnected(true);
          setAddress(accounts[0]);
>>>>>>> Stashed changes
        }
      }
    };
    checkConnection();
  }, []);

  return (
<<<<<<< Updated upstream
    <main className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 py-12" style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #faf5ff 0%, #fdf2f8 50%, #eef2ff 100%)',
      padding: '3rem 0'
    }}>
      <div className="container mx-auto px-4" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1rem' }}>
        <div className="text-center mb-12" style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4" style={{
            fontSize: '3rem',
            fontWeight: 'bold',
            background: 'linear-gradient(90deg, #9333ea, #db2777)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '1rem'
          }}>
            Oasis Token Creator
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto" style={{
            fontSize: '1.25rem',
            color: '#4b5563',
            maxWidth: '42rem',
            margin: '0 auto'
          }}>
            Create and deploy your own ERC20 tokens on Oasis Sapphire Testnet with just a few clicks
          </p>
        </div>

        <CreateToken 
          onTokenCreated={handleTokenCreated}
          onConnectionChange={(connected, address) => {
            setConnected(connected)
            setAddress(address)
          }}
          onTokenCreatedSuccess={() => {
            // Refresh marketplace when token is created
            if (marketplaceRef.current?.refreshTokens) {
              marketplaceRef.current.refreshTokens()
            }
          }}
        />

        {connected && (
          <TokenMarketplace 
            ref={marketplaceRef}
            connected={connected}
            address={address}
            createdTokens={createdTokens}
          />
        )}

        <div className="text-center mt-12" style={{ textAlign: 'center', marginTop: '3rem' }}>
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto" style={{
            background: 'white',
            borderRadius: '0.5rem',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            padding: '1.5rem',
            maxWidth: '28rem',
            margin: '0 auto'
          }}>
            <h3 className="text-lg font-semibold text-gray-800 mb-4" style={{
              fontSize: '1.125rem',
              fontWeight: '600',
              color: '#1f2937',
              marginBottom: '1rem'
            }}>Network Info</h3>
            <div className="space-y-2 text-sm text-gray-600" style={{ color: '#4b5563', fontSize: '0.875rem' }}>
              <div className="flex justify-between" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span>Network:</span>
                <span className="font-medium" style={{ fontWeight: '500' }}>Oasis Sapphire Testnet</span>
              </div>
              <div className="flex justify-between" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span>Chain ID:</span>
                <span className="font-medium" style={{ fontWeight: '500' }}>23295</span>
              </div>
              <div className="flex justify-between" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span>Currency:</span>
                <span className="font-medium" style={{ fontWeight: '500' }}>TEST</span>
              </div>
            </div>
            <a 
              href="https://testnet.explorer.sapphire.oasis.io" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-block mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition duration-200"
              style={{
                display: 'inline-block',
                marginTop: '1rem',
                padding: '0.5rem 1rem',
                background: '#9333ea',
                color: 'white',
                fontSize: '0.875rem',
                borderRadius: '0.5rem',
                textDecoration: 'none',
                transition: 'background-color 0.2s'
              }}
            >
              View Explorer
            </a>
          </div>
        </div>

        <div className="text-center mt-8 text-gray-500 text-sm" style={{
          textAlign: 'center',
          marginTop: '2rem',
          color: '#6b7280',
          fontSize: '0.875rem'
        }}>
          <p>Powered by Oasis Sapphire - Privacy-enabled EVM</p>
        </div>
      </div>
    </main>
  )
=======
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
>>>>>>> Stashed changes
}
