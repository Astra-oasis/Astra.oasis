'use client'

import React, { useEffect, useState } from 'react';
import { Coin, Comment, Trade } from '../types';
import TradingChart from './TradingChart';
import TradeForm from './TradeForm';
import CommentSection from './CommentSection';
import TransactionTable from './TransactionTable';
import BondingCurve from './BondingCurve';
import TokenInfoBar from './TokenInfoBar';
import HoldersList from './HoldersList';
import { MOCK_COMMENTS } from '../services/mockData';
import { ArrowLeft, Sparkles, AlertTriangle } from 'lucide-react';
import { ToastMessage } from './Toast';
import { BrowserProvider, Contract, formatEther } from 'ethers';
import { wrapEthereumProvider } from '@oasisprotocol/sapphire-paratime';
import { TOKEN_ABI } from '../abi/factoryAbi';

interface CoinDetailProps {
  coin: Coin;
  onBack: () => void;
  showToast: (type: ToastMessage['type'], title: string, message: string) => void;
}

const CoinDetail: React.FC<CoinDetailProps> = ({ coin, onBack, showToast }) => {
  const [comments, setComments] = useState<Comment[]>(MOCK_COMMENTS);
  const [analysis, setAnalysis] = useState<string>('Analyzing this gem on Oasis Sapphire... WAGMI! 🚀');
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [liveTrades, setLiveTrades] = useState<Trade[]>([]);
  
  // Real Token Data
  const [tokenData, setTokenData] = useState<Coin>(coin);

  const getProvider = async () => {
    let ethereum = window.ethereum;
    if (window.ethereum?.providers) {
      ethereum = window.ethereum.providers.find((p: any) => p.isMetaMask) || window.ethereum;
    }
    const wrappedProvider = wrapEthereumProvider(ethereum);
    return new BrowserProvider(wrappedProvider);
  };

  const loadRealTokenData = async () => {
    if (!coin.tokenAddress || !window.ethereum) return;
    try {
      const provider = await getProvider();
      const tokenContract = new Contract(coin.tokenAddress, TOKEN_ABI, provider);

      const [price, progress, sold, available] = await Promise.all([
        tokenContract.getCurrentPrice(),
        tokenContract.getBondingProgress(),
        tokenContract.soldSupply(),
        tokenContract.getAvailableTokens()
      ]);

      const priceEth = parseFloat(formatEther(price));
      const soldEth = parseFloat(formatEther(sold));
      
      setTokenData(prev => ({
        ...prev,
        bondingCurveProgress: Number(progress),
        marketCap: soldEth * priceEth * 1000000, // Mock MC calculation
        priceHistory: [
          ...prev.priceHistory,
          { time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), price: priceEth }
        ]
      }));
    } catch (error) {
      console.error('Error loading real token data:', error);
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    loadRealTokenData();
    
    // Initial dummy trades
    const initialTrades: Trade[] = [];
    const now = Date.now();
    for(let i=0; i<5; i++) {
        initialTrades.push({
            type: Math.random() > 0.5 ? 'buy' : 'sell',
            amount: Math.random() * 500 + 10,
            price: 0.45 + (Math.random() * 0.05 - 0.025),
            timestamp: (now - i * 5000).toString(),
            user: `0x${Math.random().toString(16).substring(2, 10)}...`
        });
    }
    setLiveTrades(initialTrades);

  }, [coin]);

  // Effect to simulate live random trades
  useEffect(() => {
    const interval = setInterval(() => {
        const isBuy = Math.random() > 0.4; // Slightly more buys
        const newTrade: Trade = {
            type: isBuy ? 'buy' : 'sell',
            amount: Math.random() * 200 + 10,
            price: 0.45 + (Math.random() * 0.02 - 0.01),
            timestamp: Date.now().toString(),
            user: `0x${Math.random().toString(16).substring(2, 10)}...`
        };

        setLiveTrades(prev => {
          const updated = [newTrade, ...prev].slice(0, 15);
          return updated;
        });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const handleAddComment = (text: string) => {
    const newComment: Comment = {
        id: Date.now().toString(),
        user: 'You',
        text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'chat'
    };
    setComments([...comments, newComment]);
  };

  return (
    <div className="container mx-auto px-4 py-4 max-w-[1600px] animate-fade-in">
      <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-white mb-4 text-sm font-bold uppercase transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to board
      </button>

      <TokenInfoBar coin={tokenData} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Chart, Analysis, Info */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-6">
            
            <TradingChart data={tokenData.priceHistory} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {/* AI Analysis Card */}
                 <div className="bg-pump-card border border-gray-800 rounded-lg p-5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-100 transition-opacity">
                        <Sparkles className="text-pump-accent w-6 h-6 animate-pulse" />
                    </div>
                    <h3 className="text-xs font-black text-pump-accent uppercase tracking-widest mb-3 flex items-center gap-2">
                        Astra AI Analysiss
                    </h3>
                    {loadingAnalysis ? (
                        <div className="space-y-2 animate-pulse">
                            <div className="h-4 bg-gray-800 rounded w-full"></div>
                            <div className="h-4 bg-gray-800 rounded w-5/6"></div>
                            <div className="h-4 bg-gray-800 rounded w-4/6"></div>
                        </div>
                    ) : (
                        <p className="text-gray-300 italic leading-relaxed">
                            "{analysis}"
                        </p>
                    )}
                </div>

                {/* Bonding Curve Status */}
                <div className="bg-pump-card border border-gray-800 rounded-lg p-5">
                    <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3">Bonding Curve Progress</h3>
                    <BondingCurve progress={tokenData.bondingCurveProgress} />
                    <div className="mt-4 flex gap-3 items-start bg-yellow-900/10 border border-yellow-700/20 p-3 rounded text-[11px] text-yellow-500/80">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <p>When the market cap reaches <b>$69,420</b> all the liquidity from the bonding curve will be deposited into <b>Oasis DEX</b> and burned.</p>
                    </div>
                </div>
            </div>

            {/* Comment & Trade Desktop view */}
            <div className="hidden lg:block">
               <TransactionTable trades={liveTrades} />
            </div>
        </div>

        {/* Right Column: Trade Form, Holders, Chat */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-6">
            <TradeForm coin={tokenData} showToast={showToast} onSuccess={loadRealTokenData} />
            
            <CommentSection comments={comments} onAddComment={handleAddComment} />
            
            <HoldersList />

            {/* Mobile Transaction table */}
            <div className="lg:hidden">
                <TransactionTable trades={liveTrades} />
            </div>
        </div>
      </div>
    </div>
  );
};

export default CoinDetail;
