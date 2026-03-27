import React, { useEffect, useState } from 'react';
import { Trade } from '../types';

interface TransactionTableProps {
  trades: Trade[];
}

const TransactionTable: React.FC<TransactionTableProps> = ({ trades }) => {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const getRelativeTime = (timestampStr: string) => {
    let timeDiff = 0;
    
    if (timestampStr.includes(':')) {
        return timestampStr; 
    }

    const tradeTime = parseInt(timestampStr);
    if (!isNaN(tradeTime)) {
        timeDiff = now - tradeTime;
    }

    if (timeDiff < 1000) return 'just now';
    const seconds = Math.floor(timeDiff / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    return '> 1h ago';
  };

  return (
    <div className="w-full">
      <h3 className="font-bold text-gray-300 mb-2">Recent Trades</h3>
      <div className="bg-pump-card rounded-lg border border-gray-800 overflow-hidden">
        <div className="max-h-[400px] overflow-y-auto">
          <table className="w-full text-sm text-left table-fixed">
            <thead className="text-xs text-gray-500 uppercase bg-gray-900/50 sticky top-0 z-10">
                <tr>
                  <th className="w-[35%] px-3 py-3 text-left">Account</th>
                  <th className="w-[20%] px-3 py-3 text-left">Type</th>
                  <th className="w-[30%] px-3 py-3 text-right">Price</th>
                  <th className="w-[15%] px-3 py-3 text-left">Date</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
                {trades.map((trade, idx) => (
                    <tr 
                      key={`${trade.timestamp}-${trade.user}-${idx}`}
                      className={`
                        hover:bg-gray-800/30 transition-colors duration-200
                        ${idx === 0 ? 'animate-slide-in-fade bg-pump-accent/5' : ''}
                      `}
                    >
                        <td className="w-[35%] px-3 py-3 text-gray-400 font-mono text-xs truncate">
                          {trade.user.slice(0, 6)}...{trade.user.slice(-4)}
                        </td>
                        <td className="w-[20%] px-3 py-3">
                            <span className={`
                              inline-block px-2 py-1 rounded text-xs font-bold min-w-[45px] text-center
                              ${trade.type === 'buy' 
                                ? 'bg-pump-green/10 text-pump-green' 
                                : 'bg-pump-red/10 text-pump-red'
                              }
                            `}>
                              {trade.type === 'buy' ? 'BUY' : 'SELL'}
                            </span>
                        </td>
                        <td className="w-[30%] px-3 py-3 text-gray-400 font-mono text-xs text-right">
                          ROSE {trade.price.toFixed(6)}
                        </td>
                        <td className="w-[15%] px-3 py-3 text-gray-500 text-xs">
                          {getRelativeTime(trade.timestamp)}
                        </td>
                    </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TransactionTable;
