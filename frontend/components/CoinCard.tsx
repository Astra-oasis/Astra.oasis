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
      className="bg-white dark:bg-pump-card border border-gray-300 dark:border-gray-800 rounded-xl overflow-hidden cursor-pointer hover:border-pump-accent dark:hover:border-pump-accent transition-all duration-300 hover:scale-[1.08] group animate-float shadow-sm hover:shadow-lg"
    >
      <div className="relative aspect-square overflow-hidden bg-gray-200 dark:bg-gray-800">
        {/* Shimmer effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-shimmer pointer-events-none"></div>
        
        <img
          src={coin.imageUrl}
          alt={coin.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 group-hover:brightness-110"
        />
      </div>

      <div className="p-1.5">
        <div className="flex justify-between items-start mb-0.5">
          <h3 className="font-bold text-xs text-gray-900 dark:text-white group-hover:text-pump-accent transition-colors duration-300 truncate flex-1">{coin.name}</h3>
          <span className="text-[10px] text-gray-600 dark:text-gray-500 font-mono ml-0.5 shrink-0 group-hover:text-pump-accent transition-colors duration-300">{coin.ticker}</span>
        </div>

        <p className="text-[10px] text-gray-600 dark:text-gray-400 line-clamp-1 mb-1 h-5">
          {coin.description}
        </p>

        <div className="space-y-1">
          <div className="flex justify-between items-center text-[9px] text-gray-600 dark:text-gray-500 font-bold uppercase group-hover:text-pump-accent transition-colors duration-300">
            <span>Bonding Curve</span>
            <span>{coin.bondingCurveProgress}%</span>
          </div>
          <BondingCurve progress={coin.bondingCurveProgress} />

          <div className="flex justify-between items-center pt-0.5 border-t border-gray-300 dark:border-gray-800/50 group-hover:border-pump-accent/50 transition-colors duration-300">
            <div className="flex items-center gap-1 text-[10px] text-gray-600 dark:text-gray-500 group-hover:text-pump-accent transition-colors duration-300">
              <MessageSquare className="w-3 h-3" />
              {coin.replies}
            </div>
            <div className="text-[10px] text-gray-600 dark:text-gray-500 group-hover:text-pump-accent transition-colors duration-300">
              Created by {coin.creator.slice(0, 4)}...{coin.creator.slice(-4)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoinCard;
