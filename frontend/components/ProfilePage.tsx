'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { ArrowLeft, Edit2, Copy, Check } from 'lucide-react';
import Image from 'next/image';
import { getWalletInfo } from '@/lib/walletHelper';
import EditProfileModal from './EditProfileModal';

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

interface ProfilePageProps {
  walletAddress: string;
  onBack: () => void;
  onProfileUpdated?: () => Promise<void>;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ walletAddress, onBack, onProfileUpdated }) => {
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
  const [testBalance, setTestBalance] = useState<number>(0);
  const [ownedCoinDetails, setOwnedCoinDetails] = useState<(CoinInfo & { quantity?: number; pricePerToken?: number })[]>([]);
  const [mintedCoinDetails, setMintedCoinDetails] = useState<CoinInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasesLoading, setPurchasesLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const formatCompactNumber = useCallback((num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toFixed(2);
  }, []);

  const formatRelativeTime = useCallback((dateString?: string) => {
    if (!dateString) return 'unknown';
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'now';
    if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
    if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
    if (seconds < 604800) return Math.floor(seconds / 86400) + 'd ago';
    return Math.floor(seconds / 604800) + 'w ago';
  }, []);

  useEffect(() => {
    fetchWalletInfo();
  }, [walletAddress]);

  const fetchTestBalance = useCallback(async (address: string) => {
    try {
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch('https://testnet.sapphire.oasis.io', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_getBalance',
          params: [address, 'latest'],
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();
      if (data.result) {
        // Convert from wei to TEST (1 TEST = 10^18 wei)
        const balance = parseInt(data.result, 16) / 1e18;
        setTestBalance(balance);
      }
    } catch (error) {
      console.error('Error fetching TEST balance:', error);
      // Don't fail the entire wallet load if balance fetch fails
      setTestBalance(0);
    }
  }, []);

  const fetchWalletInfo = useCallback(async () => {
    try {
      setLoading(true);
      const result = await getWalletInfo(walletAddress);

      if (!result.success || !result.wallet) {
        setLoading(false);
        return;
      }

      setWalletInfo(result.wallet);
      
      // Fetch TEST balance in background (don't block)
      fetchTestBalance(walletAddress);

      // Fetch all tokens at once (not separately for owned/minted)
      const response = await fetch('/api/tokens');
      const data = await response.json();

      if (!data.success || !data.data) {
        setLoading(false);
        return;
      }

      // Filter owned and minted coins from single response
      const ownedCoins = data.data.filter((coin: any) =>
        result.wallet.owned_coins?.includes(coin.contract_address)
      );
      const mintedCoins = data.data.filter((coin: any) =>
        result.wallet.minted_coins?.includes(coin.contract_address)
      );

      setMintedCoinDetails(mintedCoins);

      // Fetch purchase details BEFORE setting ownedCoinDetails (avoid flicker)
      if (ownedCoins.length > 0) {
        setPurchasesLoading(true);
        fetchPurchaseDetails(ownedCoins);
      } else {
        setOwnedCoinDetails([]);
        setLoading(false);
      }
      
      // Loading is done - render UI immediately (only if no owned coins)
      if (ownedCoins.length === 0) {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching wallet info:', error);
      setLoading(false);
    }
  }, [walletAddress, fetchTestBalance]);

  const fetchPurchaseDetails = useCallback(async (coins: any[]) => {
    try {
      const coinsWithQuantity = await Promise.all(
        coins.map(async (coin: any) => {
          try {
            const purchaseRes = await fetch(`/api/purchases?wallet_address=${walletAddress}&contract_address=${coin.contract_address}`);
            const purchaseData = await purchaseRes.json();
            
            // Calculate: total bought - total sold
            let totalBought = 0;
            let totalSold = 0;
            let avgPrice = 0;
            
            if (purchaseData.data && purchaseData.data.length > 0) {
              purchaseData.data.forEach((p: any) => {
                const qty = parseFloat(p.quantity) || 0;
                if (p.buyer_address && p.buyer_address.toLowerCase() === walletAddress.toLowerCase()) {
                  totalBought += qty;
                }
                if (p.seller_address && p.seller_address.toLowerCase() === walletAddress.toLowerCase()) {
                  totalSold += qty;
                }
              });
              // Use first buy transaction's price as average
              const buyTransaction = purchaseData.data.find((p: any) => 
                p.buyer_address && p.buyer_address.toLowerCase() === walletAddress.toLowerCase()
              );
              avgPrice = buyTransaction ? (parseFloat(buyTransaction.price_per_token) || 0) : 0;
            }
            
            const netQuantity = totalBought - totalSold;
            return { ...coin, quantity: netQuantity > 0 ? netQuantity : 0, pricePerToken: avgPrice };
          } catch (e) {
            console.error(`Error fetching purchases for ${coin.symbol}:`, e);
            return { ...coin, quantity: 0, pricePerToken: 0 };
          }
        })
      );
      // Filter out coins with quantity = 0
      const filteredCoins = coinsWithQuantity.filter(coin => coin.quantity > 0);
      setOwnedCoinDetails(filteredCoins);
      setLoading(false);
    } finally {
      setPurchasesLoading(false);
    }
  }, [walletAddress]);

  const handleProfileUpdated = () => {
    setShowEditModal(false);
    fetchWalletInfo();
    // Notify parent to refresh Header
    if (onProfileUpdated) {
      onProfileUpdated();
    }
  };

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy address:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-pump-bg text-white p-4 flex items-center justify-center">
        <p className="text-gray-400">Loading profile...</p>
      </div>
    );
  }

  if (!walletInfo) {
    return (
      <div className="min-h-screen bg-pump-bg text-white p-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-pump-green hover:text-pump-green/80 transition-colors mb-8"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>
        <p className="text-gray-400">Failed to load profile</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-pump-bg text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-pump-bg/95 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={onBack}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold">Profile</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Profile Card */}
        <div className="bg-gradient-to-b from-gray-900/50 to-pump-card rounded-xl border border-gray-800 p-6 mb-8">
          <div className="flex items-start justify-between gap-6">
            {/* Left: Avatar + Info */}
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-pump-accent to-blue-500 border-3 border-gray-800 flex items-center justify-center text-white font-bold text-2xl overflow-hidden flex-shrink-0">
                {walletInfo.avatar_url ? (
                  <img
                    src={walletInfo.avatar_url}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  walletInfo.display_name?.[0]?.toUpperCase() || 'U'
                )}
              </div>

              {/* Profile Info */}
              <div className="flex-1">
                <h2 className="text-3xl font-black text-white mb-1">
                  {walletInfo.display_name || 'Unnamed User'}
                </h2>
                
                {/* Wallet Address with Copy & Link */}
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-gray-400 font-mono text-xs bg-gray-900/50 px-2 py-1 rounded">
                    {walletInfo.wallet_address.slice(0, 6)}...{walletInfo.wallet_address.slice(-4)}
                  </p>
                  <button
                    onClick={handleCopyAddress}
                    className="p-1 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
                    title="Copy address"
                  >
                    {copied ? (
                      <Check className="w-3 h-3" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                  <a
                    href={`https://explorer.oasis.io/testnet/sapphire/address/${walletInfo.wallet_address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-pump-green hover:text-pump-green/80 text-xs font-medium transition-colors"
                  >
                    View on Explorer ↗
                  </a>
                </div>

                {/* Bio */}
                {walletInfo.bio && (
                  <p className="text-gray-300 mb-2 text-sm">{walletInfo.bio}</p>
                )}

                {/* Joined Date */}
                <p className="text-xs text-gray-500">
                  Joined {new Date(walletInfo.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Right: Edit Button */}
            <button
              onClick={() => setShowEditModal(true)}
              className="inline-flex items-center gap-2 bg-pump-green hover:bg-pump-green/80 text-black px-4 py-2 rounded-lg font-bold text-sm transition-colors flex-shrink-0"
            >
              <Edit2 className="w-3 h-3" />
              <span>Edit</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-8 border-b border-gray-800 flex gap-8 px-4">
          <button className="py-4 px-2 font-bold text-pump-green border-b-2 border-pump-green">
            Balances
          </button>
        </div>

        {/* Balances Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Owned Coins */}
          <div>
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              Portfolio ({ownedCoinDetails.length + 1}) {purchasesLoading && <span className="text-xs text-gray-500">updating...</span>}
            </h3>
            <div className="space-y-3">
              {/* TEST Balance Item */}
              <div className="bg-gray-900/30 rounded-xl p-4 border border-gray-800 hover:border-gray-700 transition-colors flex items-center gap-4">
                <div className="w-12 h-12 rounded-full flex-shrink-0 overflow-hidden">
                  <Image 
                    src="/oasis-logo.svg" 
                    alt="Oasis TEST" 
                    width={48} 
                    height={48}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white">TEST</p>
                  <p className="text-sm text-gray-400">
                    {formatCompactNumber(testBalance)} TEST
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-pump-green">
                    -
                  </p>
                </div>
              </div>

              {/* Other Coins */}
              {ownedCoinDetails.length > 0 ? (
                ownedCoinDetails.map((coin) => (
                  <div
                    key={coin.contract_address}
                    className="bg-gray-900/30 rounded-xl p-4 border border-gray-800 hover:border-gray-700 transition-colors flex items-center gap-4"
                  >
                    <img
                      src={coin.image_url || 'https://picsum.photos/48/48'}
                      alt={coin.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-white">{coin.name}</p>
                      <p className="text-sm text-gray-400">
                        {formatCompactNumber(Number((coin as any).quantity || 0))} {coin.symbol}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-pump-green">
                        {formatCompactNumber(Number(((coin as any).pricePerToken || 0) * ((coin as any).quantity || 0)))} TEST
                      </p>
                    </div>
                  </div>
                ))
              ) : null}
            </div>
          </div>

          {/* Minted Coins */}
          <div>
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              Created Coins ({mintedCoinDetails.length})
            </h3>
            {mintedCoinDetails.length > 0 ? (
              <div className="space-y-3">
                {mintedCoinDetails.map((coin) => (
                  <div
                    key={coin.contract_address}
                    className="bg-gray-900/30 rounded-xl p-4 border border-gray-800 hover:border-gray-700 transition-colors flex items-center gap-4"
                  >
                    <img
                      src={coin.image_url || 'https://picsum.photos/48/48'}
                      alt={coin.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-white">{coin.name}</p>
                      <p className="text-xs text-gray-400">{coin.symbol}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-pump-accent">
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
              <div className="bg-gray-900/20 rounded-xl p-8 border border-gray-800 text-center">
                <p className="text-gray-400">No coins created yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <EditProfileModal
          walletAddress={walletAddress}
          walletInfo={walletInfo}
          onClose={() => setShowEditModal(false)}
          onSave={handleProfileUpdated}
        />
      )}
    </div>
  );
};

export default ProfilePage;
