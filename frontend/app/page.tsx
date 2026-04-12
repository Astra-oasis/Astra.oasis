'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import Header, { type HeaderRef } from '../components/Header';
import KingOfTheHill from '../components/KingOfTheHill';
import CoinCard from '../components/CoinCard';
import FilterBar from '../components/FilterBar';
import Toast, { ToastMessage } from '../components/Toast';
import { Coin, ViewState, SortOption } from '../types';
import { formatMarketCap, formatPriceChange, formatPriceChangeColor, formatTraderCount, formatVolume } from '../utils/formatters';
import { BrowserProvider, Contract } from 'ethers';
import { wrapEthereumProvider } from '@oasisprotocol/sapphire-paratime';
import { FACTORY_ABI, FACTORY_ADDRESS } from '../abi/factoryAbi';
import { saveWalletInfo } from '../lib/walletHelper';

const CoinDetail    = dynamic(() => import('../components/CoinDetail'),    { ssr: false });
const CreateCoinPage = dynamic(() => import('../components/CreateCoinPage'), { ssr: false });
const LivestreamsPage = dynamic(() => import('../components/LivestreamsPage'), { ssr: false });
const SupportPage   = dynamic(() => import('../components/SupportPage'),   { ssr: false });
const ProfilePage   = dynamic(() => import('../components/ProfilePage'),   { ssr: false });

const getTimeAgoShort = (timestamp: number) => {
  const diffInMs = Date.now() - timestamp;
  const diffInMinutes = Math.floor(diffInMs / 60000);
  if (diffInMinutes < 60) return `${Math.max(1, diffInMinutes)}m`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h`;
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}d`;
};

const buildSparkPathFromValues = (values: number[]) => {
  if (values.length === 0) return '';
  if (values.length === 1) return 'M0 20 L132 20';

  const width = 132;
  const height = 40;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1e-9);

  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const normalized = (value - min) / range;
      const y = height - 4 - normalized * (height - 8);
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
};

type OhlcvCandle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

const getPercentChangeFromCandleSet = (candles: OhlcvCandle[], windowSeconds: number) => {
  if (candles.length < 2) return null;

  const sorted = [...candles].sort((a, b) => a.time - b.time);
  const latest = sorted[sorted.length - 1];
  const reference = [...sorted].reverse().find((c) => c.time <= latest.time - windowSeconds);

  if (!reference || reference.close <= 0) return null;
  return ((latest.close - reference.close) / reference.close) * 100;
};

const formatChangeValue = (value: number | null) => {
  if (value === null || !Number.isFinite(value)) return '--';
  return formatPriceChange(value);
};

export default function Home() {
  const [viewState, setViewState]     = useState<ViewState>(ViewState.GRID);
  const [selectedCoin, setSelectedCoin] = useState<Coin | null>(null);
  const [sortOption, setSortOption]   = useState<SortOption>('creationTime');
  const [listMode, setListMode]       = useState<'grid' | 'table'>('grid');
  const [toasts, setToasts]           = useState<ToastMessage[]>([]);
  const [connected, setConnected]     = useState(false);
  const [address, setAddress]         = useState('');
  const [realTokens, setRealTokens]   = useState<Coin[]>([]);
  const [loadingTokens, setLoadingTokens] = useState(false);
  const [tableSparkPaths, setTableSparkPaths] = useState<Record<string, string>>({});

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
            volume24h: parseFloat(token.computed_volume_24h ?? token.volume_24h) || 0,
            priceChange5m: token.price_change_5m !== undefined && token.price_change_5m !== null ? parseFloat(token.price_change_5m) : null,
            priceChange1h: token.price_change_1h !== undefined && token.price_change_1h !== null ? parseFloat(token.price_change_1h) : null,
            priceChange6h: token.price_change_6h !== undefined && token.price_change_6h !== null ? parseFloat(token.price_change_6h) : null,
            traderCount: parseInt(token.computed_trader_count ?? token.trader_count) || 0,
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

  useEffect(() => {
    let cancelled = false;

    const loadTableSparkPaths = async () => {
      if (listMode !== 'table' || sortedCoins.length === 0) {
        setTableSparkPaths({});
        return;
      }

      const entries = await Promise.all(
        sortedCoins.map(async (coin) => {
          try {
            const fiveMinuteResponse = await fetch(`/api/ohlcv?tokenId=${coin.id}&interval=5m`);
            const fiveMinuteData = await fiveMinuteResponse.json();

            const fiveMinuteCandles = (Array.isArray(fiveMinuteData?.data) ? fiveMinuteData.data : []) as OhlcvCandle[];

            const sparkCloses = fiveMinuteCandles
              .map((candle) => Number(candle.close))
              .filter((close) => Number.isFinite(close) && close > 0);

            return [String(coin.id), buildSparkPathFromValues(sparkCloses)] as const;
          } catch {
            return [String(coin.id), ''] as const;
          }
        })
      );

      if (!cancelled) {
        setTableSparkPaths(Object.fromEntries(entries));
      }
    };

    void loadTableSparkPaths();

    return () => {
      cancelled = true;
    };
  }, [listMode, sortedCoins]);

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
              <FilterBar
                currentSort={sortOption}
                onSortChange={setSortOption}
                listMode={listMode}
                onListModeChange={setListMode}
              />

              {listMode === 'grid' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {sortedCoins.map((coin) => (
                    <div key={coin.id}>
                      <CoinCard coin={coin} onClick={handleCoinClick} />
                    </div>
                  ))}
                </div>
              )}

              {listMode === 'table' && (
                <div className="overflow-x-auto rounded-xl border border-gray-300/70 bg-white/80 shadow-lg dark:border-[#24324b] dark:bg-[#0b0f19]">
                  <table className="w-full min-w-[1080px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-200/80 bg-gradient-to-r from-slate-100 to-slate-50 text-xs uppercase tracking-wide text-gray-500 dark:border-[#22314a] dark:from-[#142238] dark:to-[#101a2d] dark:text-gray-400">
                        <th className="px-4 py-3 font-semibold">Coin</th>
                        <th className="px-4 py-3 font-semibold">Graph</th>
                        <th className="px-4 py-3 font-semibold">MCAP</th>
                        <th className="px-4 py-3 font-semibold">Age</th>
                        <th className="px-4 py-3 font-semibold">24H VOL</th>
                        <th className="px-4 py-3 font-semibold">TRADERS</th>
                        <th className="px-4 py-3 font-semibold">5M</th>
                        <th className="px-4 py-3 font-semibold">1H</th>
                        <th className="px-4 py-3 font-semibold">6H</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedCoins.map((coin, idx) => {
                        const overview = {
                          volume24h: coin.volume24h ?? 0,
                          traderCount: coin.traderCount ?? 0,
                          priceChange5m: coin.priceChange5m ?? null,
                          priceChange1h: coin.priceChange1h ?? null,
                          priceChange6h: coin.priceChange6h ?? null,
                        };
                        const sparkPath = tableSparkPaths[String(coin.id)] || '';
                        return (
                          <tr
                            key={coin.id}
                            onClick={() => handleCoinClick(coin)}
                            className="cursor-pointer border-b border-gray-200/60 text-gray-800 transition hover:bg-slate-100/70 dark:border-[#1c273a] dark:text-gray-100 dark:hover:bg-[#101726]"
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <span className="w-8 text-lg font-semibold text-gray-500 dark:text-gray-400">#{idx + 1}</span>
                                <img src={coin.imageUrl} alt={coin.name} className="h-9 w-9 rounded-full object-cover" />
                                <div className="min-w-0">
                                  <p className="truncate font-semibold">{coin.name}</p>
                                  <p className="truncate text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{coin.ticker}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {sparkPath ? (
                                <svg viewBox="0 0 132 40" className="h-8 w-[132px]">
                                  <path
                                    d={sparkPath}
                                    fill="none"
                                    stroke="#86efac"
                                    strokeWidth="2"
                                    strokeLinejoin="round"
                                    strokeLinecap="round"
                                  />
                                </svg>
                              ) : (
                                <div className="h-8 w-[132px] rounded bg-gray-200/60 dark:bg-[#1a2231]" />
                              )}
                            </td>
                            <td className="px-4 py-3 font-semibold text-emerald-500">{formatMarketCap(coin.marketCap)}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-gray-800 dark:text-gray-100">{getTimeAgoShort(coin.createdAt)}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 font-medium">{formatVolume(overview.volume24h)}</td>
                            <td className="px-4 py-3 font-medium">{formatTraderCount(overview.traderCount)}</td>
                            <td className={`px-4 py-3 font-semibold ${overview.priceChange5m !== null && overview.priceChange5m < 0 ? 'text-pump-red' : 'text-pump-green'}`}>{formatChangeValue(overview.priceChange5m)}</td>
                            <td className={`px-4 py-3 font-semibold ${overview.priceChange1h !== null && overview.priceChange1h < 0 ? 'text-pump-red' : 'text-pump-green'}`}>{formatChangeValue(overview.priceChange1h)}</td>
                            <td className={`px-4 py-3 font-semibold ${overview.priceChange6h !== null && overview.priceChange6h < 0 ? 'text-pump-red' : 'text-pump-green'}`}>{formatChangeValue(overview.priceChange6h)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {!loadingTokens && sortedCoins.length === 0 && (
                    <div className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                      No tokens to display with current filters.
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {viewState === ViewState.DETAIL && selectedCoin && (
          <CoinDetail coin={selectedCoin} onBack={handleGoHome} showToast={addToast} removeToast={removeToast} />
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

        {viewState === ViewState.LIVESTREAMS && <LivestreamsPage />}
        {viewState === ViewState.SUPPORT && <SupportPage />}
        {viewState === ViewState.PROFILE && address && (
          <ProfilePage walletAddress={address} onBack={handleGoHome} onProfileUpdated={handleProfileUpdated} />
        )}
      </main>
    </div>
  );
}
