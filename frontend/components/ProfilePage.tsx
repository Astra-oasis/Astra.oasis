'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { ArrowLeft, Edit2, Copy, Check } from 'lucide-react';
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
}

const ProfilePage: React.FC<ProfilePageProps> = ({ walletAddress, onBack }) => {
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
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

  const fetchWalletInfo = useCallback(async () => {
    try {
      setLoading(true);
      const result = await getWalletInfo(walletAddress);

      if (!result.success || !result.wallet) {
        setLoading(false);
        return;
      }

      setWalletInfo(result.wallet);

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

      // Display coins immediately (with quantity = 0 initially)
      setOwnedCoinDetails(ownedCoins.map((coin: any) => ({ ...coin, quantity: 0, pricePerToken: 0 })));
      setMintedCoinDetails(mintedCoins);

      // Loading is done - render UI immediately
      setLoading(false);

      // Fetch purchase details in background (don't block rendering)
      if (ownedCoins.length > 0) {
        setPurchasesLoading(true);
        fetchPurchaseDetails(ownedCoins);
      }
    } catch (error) {
      console.error('Error fetching wallet info:', error);
      setLoading(false);
    }
  }, [walletAddress]);

  const fetchPurchaseDetails = useCallback(async (coins: any[]) => {
    try {
      const coinsWithQuantity = await Promise.all(
        coins.map(async (coin: any) => {
          try {
            const purchaseRes = await fetch(`/api/purchases?wallet_address=${walletAddress}&contract_address=${coin.contract_address}`);
            const purchaseData = await purchaseRes.json();
            const totalQuantity = purchaseData.data?.reduce((sum: number, p: any) => sum + (parseFloat(p.quantity) || 0), 0) || 0;
            const avgPrice = purchaseData.data?.length > 0 ? (parseFloat(purchaseData.data[0]?.price_per_token) || 0) : 0;
            return { ...coin, quantity: totalQuantity, pricePerToken: avgPrice };
          } catch (e) {
            console.error(`Error fetching purchases for ${coin.symbol}:`, e);
            return { ...coin, quantity: 0, pricePerToken: 0 };
          }
        })
      );
      setOwnedCoinDetails(coinsWithQuantity);
    } finally {
      setPurchasesLoading(false);
    }
  }, [walletAddress]);

  const handleProfileUpdated = () => {
    setShowEditModal(false);
    fetchWalletInfo();
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
              Portfolio ({ownedCoinDetails.length}) {purchasesLoading && <span className="text-xs text-gray-500">updating...</span>}
            </h3>
            {ownedCoinDetails.length > 0 ? (
              <div className="space-y-3">
                {ownedCoinDetails.map((coin) => (
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
                ))}
              </div>
            ) : (
              <div className="bg-gray-900/20 rounded-xl p-8 border border-gray-800 text-center">
                <p className="text-gray-400">No coins in portfolio yet</p>
              </div>
            )}
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
