export interface Coin {
  id: string | number;
  name: string;
  ticker: string;
  description: string;
  imageUrl: string;
  creator: string;
  marketCap: number;
  replies: number;
  bondingCurveProgress: number; // 0 to 100
  createdAt: number;
  lastReply: number;
  priceHistory: { time: string; price: number }[];
  tokenAddress?: string; // Added for real contract interaction
  contractAddress?: string; // Smart contract address
}

export interface Comment {
  id: string;
  user: string;
  text: string;
  timestamp: string;
  type: 'buy' | 'sell' | 'chat';
  amount?: number;
}

export enum ViewState {
  GRID = 'GRID',
  DETAIL = 'DETAIL',
  CREATE = 'CREATE',
  LIVESTREAMS = 'LIVESTREAMS',
  SUPPORT = 'SUPPORT',
  PROFILE = 'PROFILE'
}

export interface Trade {
  type: 'buy' | 'sell';
  amount?: number | null;
  price: number;
  timestamp: string;
  user: string;
  txHash?: string | null;
}

export type SortOption = 'featured' | 'marketCap' | 'lastReply' | 'creationTime';

declare global {
  interface Window {
    ethereum?: any;
  }
}
