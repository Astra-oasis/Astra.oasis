'use client';

import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { getWalletInfo } from '@/lib/walletHelper';

interface WalletInfo {
  id: number;
  wallet_address: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  owned_coins: string[];
  minted_coins: string[];
  created_at: string;
  updated_at: string;
}

interface CoinInfo {
  id: number;
  name: string;
  symbol: string;
  contract_address: string;
  marketcap: number;
  image_url: string;
  created_at?: string;
}

interface ProfileModalProps {
  walletAddress: string;
  onClose: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ walletAddress, onClose }) => {
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
  const [ownedCoinDetails, setOwnedCoinDetails] = useState<(CoinInfo & { quantity?: number; pricePerToken?: number })[]>([]);
  const [mintedCoinDetails, setMintedCoinDetails] = useState<CoinInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const formatCompactNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toFixed(2);
  };

  const formatRelativeTime = (dateString?: string) => {
    if (!dateString) return 'unknown';
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'now';
    if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
    if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
    if (seconds < 604800) return Math.floor(seconds / 86400) + 'd ago';
    return Math.floor(seconds / 604800) + 'w ago';
  };

  useEffect(() => {
    fetchWalletInfo();
  }, [walletAddress]);

  const fetchWalletInfo = async () => {
    try {
      setLoading(true);
      const result = await getWalletInfo(walletAddress);
      
      if (result.success && result.wallet) {
        setWalletInfo(result.wallet);
        
        // Fetch coin details
        if (result.wallet.owned_coins?.length > 0) {
          await fetchCoinDetails(result.wallet.owned_coins, 'owned');
        }
        if (result.wallet.minted_coins?.length > 0) {
          await fetchCoinDetails(result.wallet.minted_coins, 'minted');
        }
      }
    } catch (error) {
      console.error('Error fetching wallet info:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCoinDetails = async (coinAddresses: string[], type: 'owned' | 'minted') => {
    try {
      const response = await fetch('/api/tokens');
      const data = await response.json();
      
      if (data.success && data.data) {
        const coins = data.data.filter((coin: any) =>
          coinAddresses.includes(coin.contract_address)
        );
        
        if (type === 'owned') {
          // Fetch quantity info for owned coins
          const coinsWithQuantity = await Promise.all(
            coins.map(async (coin: any) => {
              try {
                const purchaseRes = await fetch(`/api/purchases?wallet_address=${walletAddress}&contract_address=${coin.contract_address}`);
                const purchaseData = await purchaseRes.json();
                const totalQuantity = purchaseData.data?.reduce((sum: number, p: any) => sum + (parseFloat(p.quantity) || 0), 0) || 0;
                const avgPrice = purchaseData.data?.length > 0 ? (parseFloat(purchaseData.data[0]?.price_per_token) || 0) : 0;
                console.log(`Coin ${coin.symbol}: quantity=${totalQuantity}, price=${avgPrice}`);
                return { ...coin, quantity: totalQuantity, pricePerToken: avgPrice };
              } catch (e) {
                console.error(`Error fetching purchases for ${coin.symbol}:`, e);
                return { ...coin, quantity: 0, pricePerToken: 0 };
              }
            })
          );
          setOwnedCoinDetails(coinsWithQuantity);
        } else {
          setMintedCoinDetails(coins);
        }
      }
    } catch (error) {
      console.error('Error fetching coin details:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-pump-card border border-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-pump-card border-b border-gray-800 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Wallet Profile</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-400">Loading wallet info...</p>
            </div>
          ) : walletInfo ? (
            <>
              {/* Wallet Info */}
              <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
                <div className="flex items-start gap-4">
                  {walletInfo.avatar_url && (
                    <img
                      src={walletInfo.avatar_url}
                      alt="Avatar"
                      className="w-16 h-16 rounded-full object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-1">
                      {walletInfo.display_name || 'Unnamed Wallet'}
                    </h3>
                    <p className="text-sm font-mono text-gray-400 break-all mb-2">
                      {walletInfo.wallet_address}
                    </p>
                    {walletInfo.bio && (
                      <p className="text-gray-300 text-sm">{walletInfo.bio}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-2">
                      Joined {new Date(walletInfo.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Owned Coins */}
              <div>
                <h4 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                  <span className="text-pump-green">📊</span>
                  Owned Coins ({ownedCoinDetails.length})
                </h4>
                {ownedCoinDetails.length > 0 ? (
                  <div className="space-y-2">
                    {ownedCoinDetails.map((coin) => (
                      <div
                        key={coin.contract_address}
                        className="bg-gray-900/30 rounded-lg p-3 border border-gray-800 hover:border-gray-700 transition-colors flex items-center gap-3"
                      >
                        <img
                          src={coin.image_url || 'https://picsum.photos/40/40'}
                          alt={coin.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-white">{coin.name}</p>
                          <p className="text-xs text-gray-400">
                            {Number(coin.quantity || 0).toLocaleString(undefined, {
                              maximumFractionDigits: 2,
                            })} {coin.symbol}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-pump-green">
                            {formatCompactNumber(Number((coin.pricePerToken || 0) * (coin.quantity || 0)))} TEST
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm">No owned coins yet</p>
                )}
              </div>

              {/* Minted Coins */}
              <div>
                <h4 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                  <span className="text-pump-accent">⭐</span>
                  Minted Coins ({mintedCoinDetails.length})
                </h4>
                {mintedCoinDetails.length > 0 ? (
                  <div className="space-y-2">
                    {mintedCoinDetails.map((coin) => (
                      <div
                        key={coin.contract_address}
                        className="bg-gray-900/30 rounded-lg p-3 border border-gray-800 hover:border-gray-700 transition-colors flex items-center gap-3"
                      >
                        <img
                          src={coin.image_url || 'https://picsum.photos/40/40'}
                          alt={coin.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-white">{coin.name}</p>
                          <p className="text-xs text-gray-400">{coin.symbol}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-pump-accent">
                            ${formatCompactNumber(coin.marketcap)}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatRelativeTime(coin.created_at)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm">No minted coins yet</p>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-400">Failed to load wallet info</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
