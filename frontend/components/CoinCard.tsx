import React from 'react';
import { Coin } from '../types';
import BondingCurve from './BondingCurve';
import { MessageSquare } from 'lucide-react';
import { formatMarketCap } from '../utils/formatters';

interface CoinCardProps {
  coin: Coin;
  onClick: (coin: Coin) => void;
}

const CoinCard: React.FC<CoinCardProps> = ({ coin, onClick }) => {
  return (
    <div 
      onClick={() => onClick(coin)}
      className="bg-pump-card border border-gray-800 rounded-xl overflow-hidden cursor-pointer hover:border-gray-600 transition-all hover:scale-[1.02] group"
    >
      <div className="relative aspect-square">
        <img 
            src={coin.imageUrl} 
            alt={coin.name} 
            className="w-full h-full object-cover"
        />
        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-[10px] font-bold text-pump-green">
            {formatMarketCap(coin.marketCap)}
        </div>
      </div>
      
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
            <h3 className="font-bold text-white group-hover:text-pump-accent transition-colors truncate flex-1">{coin.name}</h3>
            <span className="text-xs text-gray-500 font-mono ml-2 shrink-0">{coin.ticker}</span>
        </div>
        
        <p className="text-xs text-gray-400 line-clamp-2 mb-4 h-8">
            {coin.description}
        </p>
        
        <div className="space-y-3">
            <div className="flex justify-between items-center text-[10px] text-gray-500 font-bold uppercase">
                <span>Bonding Curve</span>
                <span>{coin.bondingCurveProgress}%</span>
            </div>
            <BondingCurve progress={coin.bondingCurveProgress} />
            
            <div className="flex justify-between items-center pt-2 border-t border-gray-800/50">
                <div className="flex items-center gap-1 text-[10px] text-gray-500">
                    <MessageSquare className="w-3 h-3" />
                    {coin.replies}
                </div>
                <div className="text-[10px] text-gray-500">
                    Created by {coin.creator.slice(0, 4)}...{coin.creator.slice(-4)}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default CoinCard;
