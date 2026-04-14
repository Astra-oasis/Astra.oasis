'use client'

import React, { useState, useEffect } from 'react';
import { Coin } from '../types';
import { Settings, Wallet, Loader2 } from 'lucide-react';
import SettingsModal from './SettingsModal';
import { ToastMessage } from './Toast';
import { BrowserProvider, Contract, formatEther, parseEther } from 'ethers';
import { wrapEthereumProvider } from '@oasisprotocol/sapphire-paratime';
import { TOKEN_ABI } from '../abi/factoryAbi';

const CREATOR_FEE_RATE = 0.003; // 0.300%
const PROTOCOL_FEE_RATE = 0.008; // 0.800%
const WATCH_ASSET_KEY_PREFIX = 'watch-asset-prompted';

interface TradeFormProps {
  coin: Coin;
  showToast: (type: ToastMessage['type'], title: string, message: string) => void;
  removeToast: (id: string) => void;
  onSuccess?: (tradeType: 'buy' | 'sell', totalPrice: number) => Promise<void>;
}

const TradeForm: React.FC<TradeFormProps> = ({ coin, showToast, removeToast, onSuccess }) => {
  const symbol = coin.ticker.toUpperCase();
  const [mode, setMode] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState<string>('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState('0');
  const [tokenBalance, setTokenBalance] = useState('0');
  const [estimatedCost, setEstimatedCost] = useState('0');
  const [userAddress, setUserAddress] = useState('');
  const [currentPrice, setCurrentPrice] = useState('0');
  const [priceImpact, setPriceImpact] = useState('0');
  const [creatorFee, setCreatorFee] = useState('0');
  const [protocolFee, setProtocolFee] = useState('0');
  const [totalFee, setTotalFee] = useState('0');
  const [baseAmount, setBaseAmount] = useState('0');
  const [processingToastId, setProcessingToastId] = useState<string | null>(null);

  const getProvider = async () => {
    let ethereum = window.ethereum;
    if (window.ethereum?.providers) {
      ethereum = window.ethereum.providers.find((p: any) => p.isMetaMask) || window.ethereum;
    }
    const wrappedProvider = wrapEthereumProvider(ethereum);
    return new BrowserProvider(wrappedProvider);
  };

  const getWatchAssetKey = (walletAddress: string, tokenAddress: string) => {
    return `${WATCH_ASSET_KEY_PREFIX}:${walletAddress.toLowerCase()}:${tokenAddress.toLowerCase()}`;
  };

  const loadBalances = async () => {
    if (!window.ethereum || !coin.tokenAddress) return;
    try {
      const provider = await getProvider();
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      setUserAddress(address);

      const ethBalance = await provider.getBalance(address);
      setBalance(formatEther(ethBalance));

      const tokenContract = new Contract(coin.tokenAddress, TOKEN_ABI, provider);
      const tBalance = await tokenContract.balanceOf(address);
      setTokenBalance(formatEther(tBalance));

      // Get current price
      const price = await tokenContract.getCurrentPrice();
      setCurrentPrice(formatEther(price));
    } catch (error) {
      console.error('Error loading balances:', error);
    }
  };

  useEffect(() => {
    loadBalances();
  }, [coin.tokenAddress]);

  useEffect(() => {
    calculateEstimatedCost();
  }, [amount, mode, coin.tokenAddress]);

  const calculateEstimatedCost = async () => {
    if (!amount || parseFloat(amount) <= 0 || !coin.tokenAddress) {
      setEstimatedCost('0');
      setPriceImpact('0');
      setCreatorFee('0');
      setProtocolFee('0');
      setTotalFee('0');
      setBaseAmount('0');
      return;
    }

    try {
      const provider = await getProvider();
      const tokenContract = new Contract(coin.tokenAddress, TOKEN_ABI, provider);
      const amountWei = parseEther(amount);

      if (mode === 'buy') {
        const cost = await tokenContract.getBuyPrice(amountWei);
        const costEth = parseFloat(formatEther(cost));
        setBaseAmount(costEth.toString());

        const creatorFeeValue = costEth * CREATOR_FEE_RATE;
        const protocolFeeValue = costEth * PROTOCOL_FEE_RATE;
        const totalFeeValue = creatorFeeValue + protocolFeeValue;
        const totalCost = costEth + totalFeeValue;

        setCreatorFee(creatorFeeValue.toString());
        setProtocolFee(protocolFeeValue.toString());
        setTotalFee(totalFeeValue.toString());
        setEstimatedCost(totalCost.toString());

        // Calculate price impact
        const expectedCost = parseFloat(currentPrice) * parseFloat(amount);
        const impact = expectedCost > 0 ? ((costEth - expectedCost) / expectedCost) * 100 : 0;
        setPriceImpact(impact.toFixed(2));

      } else {
        const returnAmount = await tokenContract.getSellPrice(amountWei);
        const returnEth = parseFloat(formatEther(returnAmount));
        setBaseAmount(returnEth.toString());

        const creatorFeeValue = returnEth * CREATOR_FEE_RATE;
        const protocolFeeValue = returnEth * PROTOCOL_FEE_RATE;
        const totalFeeValue = creatorFeeValue + protocolFeeValue;
        const netReceive = Math.max(0, returnEth - totalFeeValue);

        setCreatorFee(creatorFeeValue.toString());
        setProtocolFee(protocolFeeValue.toString());
        setTotalFee(totalFeeValue.toString());
        setEstimatedCost(netReceive.toString());

        // Calculate price impact for sell
        const expectedReturn = parseFloat(currentPrice) * parseFloat(amount);
        const impact = expectedReturn > 0 ? ((returnEth - expectedReturn) / expectedReturn) * 100 : 0;
        setPriceImpact(impact.toFixed(2));

      }
    } catch (error) {
      console.error('Error calculating cost:', error);
      setEstimatedCost('0');
      setPriceImpact('0');
      setCreatorFee('0');
      setProtocolFee('0');
      setTotalFee('0');
      setBaseAmount('0');
    }
  };

  const savePurchaseToDatabase = async (type: 'buy' | 'sell', txHash: string, amount: string, totalPrice: string, pricePerToken: string) => {
    try {
      // Get token_id from database
      const tokenResponse = await fetch(`/api/tokens/by-address?contract_address=${coin.tokenAddress}`);
      const tokenData = await tokenResponse.json();

      if (!tokenData.success || !tokenData.token_id) {
        console.warn('Could not find token in database');
        return;
      }

      let resolvedAddress = userAddress;
      if (!resolvedAddress && window.ethereum) {
        try {
          const provider = await getProvider();
          const signer = await provider.getSigner();
          resolvedAddress = await signer.getAddress();
        } catch (error) {
          console.warn('Could not resolve wallet address:', error);
        }
      }

      if (!resolvedAddress) {
        console.warn('Missing wallet address for purchase record');
        return;
      }

      const response = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token_id: tokenData.token_id,
          buyer_address: type === 'buy' ? resolvedAddress : null,
          seller_address: type === 'sell' ? resolvedAddress : null,
          quantity: amount,
          price_per_token: pricePerToken,
          total_price: totalPrice,
          transaction_hash: txHash,
          status: 'completed',
        }),
      });

      if (response.ok) {
        console.log('Purchase saved to database');

        // Update bonding progress in DB (buy increases reserve, sell decreases)
        try {
          const delta = type === 'buy' ? parseFloat(totalPrice) : -parseFloat(totalPrice);
          await fetch('/api/bonding-progress', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token_id: tokenData.token_id, amount_test: delta }),
          });
        } catch { /* silent */ }

      } else {
        const errorText = await response.text();
        console.warn('Failed to save purchase to database:', errorText);
      }
    } catch (error) {
      console.warn('Error saving purchase to database:', error);
    }
  };

  const calculateAndUpdateMetrics = async (tokenId: number) => {
    try {
      const metricsResponse = await fetch('/api/tokens/calculate-metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token_id: tokenId,
        }),
      });

      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json();
        console.log('Metrics updated:', metricsData.data.metrics);
        window.dispatchEvent(new CustomEvent('token-metrics-updated'));
      } else {
        console.warn('Failed to update metrics');
      }
    } catch (error) {
      console.warn('Error calculating metrics:', error);
    }
  };

  const handleTrade = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      showToast('error', 'Trade Failed', 'Please enter a valid amount.');
      return;
    }

    if (!coin.tokenAddress) {
      showToast('error', 'Trade Failed', 'Token address not found.');
      return;
    }

    setLoading(true);
    const toastId = Date.now().toString();
    setProcessingToastId(toastId);
    showToast('processing', 'Processing Transaction', 'Interacting with Oasis Sapphire...');

    try {
      const provider = await getProvider();
      const signer = await provider.getSigner();
      const tokenContract = new Contract(coin.tokenAddress, TOKEN_ABI, signer);
      const amountWei = parseEther(amount);

      let tx;
      let returnAmount: string;

      if (mode === 'buy') {
        const cost: bigint = await tokenContract.getBuyPrice(amountWei);
        const [, , tradeTotalFee]: [bigint, bigint, bigint] = await tokenContract.getTradeFees(cost);
        const totalCost = cost + tradeTotalFee;

        tx = await tokenContract.buyTokens(amountWei, {
          value: totalCost,
        });
        returnAmount = formatEther(cost);
      } else {
        const sellReturn = await tokenContract.getSellPrice(amountWei);
        tx = await tokenContract.sellTokens(amountWei);
        returnAmount = formatEther(sellReturn);
      }

      const receipt = await tx.wait();
      const txHash = receipt.hash;
      const pricePerToken = (parseFloat(returnAmount) / parseFloat(amount)).toString();

      await savePurchaseToDatabase(mode, txHash, amount, returnAmount, pricePerToken);

      removeToast(toastId);
      showToast('success', 'Transaction Successful', `${mode === 'buy' ? 'Buy' : 'Sell'} ${amount} ${symbol}`);
      setAmount('');
      loadBalances();

      // Auto-add token to MetaMask only once per wallet+token pair (first successful buy)
      if (mode === 'buy' && coin.tokenAddress) {
        try {
          let signerAddress = userAddress;
          if (!signerAddress && window.ethereum) {
            const provider = await getProvider();
            const signer = await provider.getSigner();
            signerAddress = await signer.getAddress();
          }

          if (signerAddress) {
            const storageKey = getWatchAssetKey(signerAddress, coin.tokenAddress);
            const hasPrompted = localStorage.getItem(storageKey) === '1';

            if (!hasPrompted) {
              const wasAdded = await window.ethereum.request({
                method: 'wallet_watchAsset',
                params: {
                  type: 'ERC20',
                  options: {
                    address: coin.tokenAddress,
                    symbol: coin.ticker.slice(0, 11),
                    decimals: 18,
                    image: coin.imageUrl || '',
                  },
                },
              });

              if (wasAdded) {
                localStorage.setItem(storageKey, '1');
              }
            }
          }
        } catch { /* user dismissed, silent */ }
      }

      if (onSuccess) await onSuccess(mode, parseFloat(returnAmount));
    } catch (error: any) {
      console.error('Trade error:', error);
      removeToast(toastId);
      showToast('error', 'Transaction Failed', error.reason || error.message);
    } finally {
      setLoading(false);
      setProcessingToastId(null);
    }
  };

  return (
    <>
      <div className="bg-white dark:bg-pump-card border border-gray-300 dark:border-gray-800 rounded-lg overflow-hidden shadow-lg">
        <div className="flex border-b border-gray-300 dark:border-gray-800">
          <button
            className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-all relative ${mode === 'buy'
              ? 'text-pump-green bg-green-50 dark:bg-pump-green/5'
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 bg-gray-100 dark:bg-gray-900/50'
              }`}
            onClick={() => setMode('buy')}
          >
            Buy
            {mode === 'buy' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-pump-green" />}
          </button>
          <button
            className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-all relative ${mode === 'sell'
              ? 'text-pump-red bg-red-50 dark:bg-pump-red/5'
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 bg-gray-100 dark:bg-gray-900/50'
              }`}
            onClick={() => setMode('sell')}
          >
            Sell
            {mode === 'sell' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-pump-red" />}
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="flex justify-between items-center text-xs">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-1.5 text-gray-600 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors bg-gray-200 dark:bg-gray-900 px-2 py-1 rounded"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Set max slippage</span>
            </button>
            <div className="flex items-center gap-1 text-gray-600 dark:text-gray-500">
              <Wallet className="w-3.5 h-3.5" />
              <span>{mode === 'buy' ? `${parseFloat(balance).toFixed(4)} TEST` : `${parseFloat(tokenBalance).toFixed(2)} ${symbol}`}</span>
            </div>
          </div>

          <div className="bg-gray-100 dark:bg-gray-900/80 rounded-lg p-4 border border-gray-300 dark:border-gray-800 focus-within:border-pump-green/50 transition-colors">
            <div className="flex justify-between text-xs font-bold text-gray-600 dark:text-gray-500 mb-2">
              <span className="uppercase">{mode === 'buy' ? `Amount (${symbol})` : `Amount (${symbol})`}</span>
              <span className="uppercase cursor-pointer hover:text-gray-900 dark:hover:text-white" onClick={() => setAmount(mode === 'buy' ? '100' : tokenBalance)}>Max</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.0"
                className="bg-transparent text-2xl font-mono font-bold w-full outline-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-700"
              />
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold bg-gray-300 dark:bg-gray-800 px-2 py-1 rounded text-gray-700 dark:text-gray-300">
                  {symbol}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Buttons */}
          {mode === 'buy' ? (
            <div className="flex gap-2">
              <button onClick={() => setAmount('')} className="bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded text-xs font-bold transition-colors">Reset</button>
              {[10, 50, 100, 500].map((val) => (
                <button
                  key={val}
                  onClick={() => setAmount(val.toString())}
                  className="flex-1 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-xs py-2 rounded text-gray-700 dark:text-gray-300 font-mono transition-colors border border-transparent hover:border-gray-400 dark:hover:border-gray-600"
                >
                  {val} {symbol}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => setAmount('')} className="bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded text-xs font-bold transition-colors">Reset</button>
              {['25%', '50%', '75%', '100%'].map((val) => (
                <button
                  key={val}
                  onClick={() => {
                    const percent = parseInt(val) / 100;
                    setAmount((parseFloat(tokenBalance) * percent).toString());
                  }}
                  className="flex-1 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-xs py-2 rounded text-gray-700 dark:text-gray-300 font-mono transition-colors border border-transparent hover:border-gray-400 dark:hover:border-gray-600"
                >
                  {val}
                </button>
              ))}
            </div>
          )}

          {/* Summary Details */}
          <div className="space-y-2 p-3 bg-gray-100 dark:bg-gray-900/50 rounded-lg text-xs border border-gray-300 dark:border-gray-800/50">
            <div className="flex justify-between items-center text-gray-700 dark:text-gray-500">
              <span>Price Impact</span>
              <span className={`font-mono ${parseFloat(priceImpact) >= 0 ? 'text-pump-green' : 'text-pump-red'}`}>
                {parseFloat(priceImpact) >= 0 ? '~' : ''}{parseFloat(priceImpact).toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between items-center text-gray-700 dark:text-gray-500">
              <span>Base Trade Value</span>
              <span className="font-mono text-gray-600 dark:text-gray-400">{parseFloat(baseAmount).toFixed(6)} TEST</span>
            </div>
            <div className="flex justify-between items-center text-gray-700 dark:text-gray-500">
              <span>Creator Fee (0.300%)</span>
              <span className="font-mono text-gray-600 dark:text-gray-400">{parseFloat(creatorFee).toFixed(6)} TEST</span>
            </div>
            <div className="flex justify-between items-center text-gray-700 dark:text-gray-500">
              <span>Protocol Fee (0.800%)</span>
              <span className="font-mono text-gray-600 dark:text-gray-400">{parseFloat(protocolFee).toFixed(6)} TEST</span>
            </div>
            <div className={`flex justify-between items-center font-bold text-sm mt-2 pt-2 border-t ${mode === 'buy' ? 'border-pump-green/20' : 'border-pump-red/20'}`}>
              <span className="text-gray-900 dark:text-white">{mode === 'buy' ? 'Total Cost:' : 'You Receive:'}</span>
              <span className={`font-mono ${mode === 'buy' ? 'text-pump-green' : 'text-pump-red'}`}>
                {parseFloat(estimatedCost || '0').toFixed(6)} TEST
              </span>
            </div>
          </div>

          <button
            onClick={handleTrade}
            disabled={loading}
            className={`w-full py-4 rounded-lg text-lg font-black uppercase tracking-widest shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-2 ${mode === 'buy'
              ? 'bg-pump-green text-black hover:bg-green-400 shadow-[0_0_20px_rgba(74,222,128,0.2)]'
              : 'bg-pump-red text-white hover:bg-red-400 shadow-[0_0_20px_rgba(248,113,113,0.2)]'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : mode === 'buy' ? 'Place Buy Order' : 'Place Sell Order'}
          </button>
        </div>
      </div>

      {isSettingsOpen && <SettingsModal onClose={() => setIsSettingsOpen(false)} />}
    </>
  );
};

export default TradeForm;