'use client'

import React, { useEffect, useState } from 'react';
import { Coin } from '../types';
import { ExternalLink, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { formatMarketCap } from '../utils/formatters';

interface TokenInfoBarProps {
    coin: Coin;
    currentPriceOverride?: number;
}

interface DbTokenSnapshot {
    marketcap?: string | number;
    volume_24h?: string | number;
    price_change_5m?: string | number;
    price_change_1h?: string | number;
    price_change_6h?: string | number;
    price_snapshot_value?: string | number;
    image_url?: string;
}

const TokenInfoBar: React.FC<TokenInfoBarProps> = ({ coin, currentPriceOverride }) => {
    const [metrics, setMetrics] = useState<any>(null);
    const [dbToken, setDbToken] = useState<DbTokenSnapshot | null>(null);
    const [imageFailed, setImageFailed] = useState(false);
    const [loading, setLoading] = useState(true);
    const OASIS_EXPLORER_URL = 'https://testnet.explorer.sapphire.oasis.io/address';

    useEffect(() => {
        const fetchData = async () => {
            if (!coin.tokenAddress && !coin.id) {
                setLoading(false);
                return;
            }

            try {
                if (coin.id) {
                    const dbResponse = await fetch(`/api/tokens/${coin.id}`);
                    const dbData = await dbResponse.json();
                    if (dbData.success && dbData.data) {
                        setDbToken(dbData.data);
                    }
                }

                if (coin.id || coin.tokenAddress || coin.contractAddress) {
                    const response = await fetch('/api/tokens/calculate-metrics', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            token_id: coin.id,
                            token_address: coin.tokenAddress || coin.contractAddress,
                        }),
                    });
                    const data = await response.json();
                    if (data.success && data.data) {
                        setMetrics(data.data);
                    }
                }
            } catch (error) {
                console.error('Error fetching token info bar data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 10000);
        const onMetricsUpdated = () => {
            fetchData();
        };
        window.addEventListener('token-metrics-updated', onMetricsUpdated as EventListener);
        return () => {
            clearInterval(interval);
            window.removeEventListener('token-metrics-updated', onMetricsUpdated as EventListener);
        };
    }, [coin.tokenAddress, coin.id, coin.contractAddress]);

    const openExplorer = (address: string) => {
        window.open(`${OASIS_EXPLORER_URL}/${address}`, '_blank');
    };

    const formatVolume = (volume: number) => {
        if (volume >= 1000000) return `${(volume / 1000000).toFixed(2)}M`;
        if (volume >= 1000) return `${(volume / 1000).toFixed(2)}K`;
        return volume.toFixed(2);
    };

    const formatPrice = (price: number) => {
        if (price < 0.00001) return price.toFixed(8);
        if (price < 0.01) return price.toFixed(6);
        return price.toFixed(8);
    };

    const getPriceChangeColor = (change: number) => {
        if (change > 0) return 'text-pump-green';
        if (change < 0) return 'text-pump-red';
        return 'text-gray-400';
    };

    const getPriceChangeIcon = (change: number) => {
        if (change > 0) return <ArrowUpRight className="w-4 h-4 inline" />;
        if (change < 0) return <ArrowDownRight className="w-4 h-4 inline" />;
        return null;
    };

    const parseMetricNullable = (value: unknown): number | null => {
        if (value === null || value === undefined) return null;
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    };

    const pickMetric = (...values: Array<number | null | undefined>) => {
        const picked = values.find((value) => value !== null && value !== undefined);
        return picked ?? 0;
    };

    const dbMarketCap = parseMetricNullable(dbToken?.marketcap);
    const dbVolume = parseMetricNullable(dbToken?.volume_24h);
    const dbPriceSnapshot = parseMetricNullable(dbToken?.price_snapshot_value);
    const dbChange5m = parseMetricNullable(dbToken?.price_change_5m);
    const dbChange1h = parseMetricNullable(dbToken?.price_change_1h);
    const dbChange6h = parseMetricNullable(dbToken?.price_change_6h);

    const metricsMarketCap = parseMetricNullable(metrics?.marketcap);
    const metricsVolume = parseMetricNullable(metrics?.volume_24h);
    const metricsPrice = parseMetricNullable(metrics?.price_snapshot_value);
    const metricsChange5m = parseMetricNullable(metrics?.price_change_5m);
    const metricsChange1h = parseMetricNullable(metrics?.price_change_1h);
    const metricsChange6h = parseMetricNullable(metrics?.price_change_6h);

    const coinPrice = coin.priceHistory?.length ? parseMetricNullable(coin.priceHistory[coin.priceHistory.length - 1]?.price) : null;
    const coinMarketCap = parseMetricNullable(coin.marketCap);
    const coinVolume = parseMetricNullable(coin.volume24h);
    const coinChange5m = parseMetricNullable(coin.priceChange5m);
    const coinChange1h = parseMetricNullable(coin.priceChange1h);
    const coinChange6h = parseMetricNullable(coin.priceChange6h);

    const price = currentPriceOverride && currentPriceOverride > 0
        ? currentPriceOverride
        : pickMetric(dbPriceSnapshot, coinPrice, metricsPrice);
    const marketCap = pickMetric(dbMarketCap, coinMarketCap, metricsMarketCap);
    const volume = pickMetric(dbVolume, coinVolume, metricsVolume);
    const change5m = pickMetric(dbChange5m, coinChange5m, metricsChange5m);
    const change1h = pickMetric(dbChange1h, coinChange1h, metricsChange1h);
    const change6h = pickMetric(dbChange6h, coinChange6h, metricsChange6h);
    const tokenImage = coin.imageUrl || dbToken?.image_url || '';

    useEffect(() => {
        setImageFailed(false);
    }, [tokenImage]);

    return (
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between bg-white dark:bg-pump-card border border-gray-300 dark:border-gray-800 rounded-lg p-4 mb-4 gap-4 md:gap-8">
            {/* Left: Token Info */}
            <div className="flex items-center gap-4 flex-1">
                <div className="w-14 h-14 rounded-xl overflow-hidden border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 shrink-0">
                    {tokenImage && !imageFailed ? (
                        <img
                            src={tokenImage}
                            alt={`${coin.name} logo`}
                            className="w-full h-full object-cover"
                            onError={() => setImageFailed(true)}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500 dark:text-gray-400 text-xs font-bold">
                            {coin.ticker?.slice(0, 3) || 'N/A'}
                        </div>
                    )}
                </div>
                <div className="flex flex-col">
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                        {coin.name}
                    </h1>
                    <div className="text-lg text-gray-600 dark:text-gray-500 font-mono">
                        {coin.ticker}
                    </div>
                    <div className="flex items-center gap-3 text-xs mt-1">
                        <button
                            onClick={() => openExplorer(coin.creator)}
                            className="bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded flex items-center gap-1 cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
                            title="View creator on Oasis Explorer"
                        >
                            {coin.creator.slice(0, 6)}...{coin.creator.slice(-4)} <ExternalLink className="w-3 h-3" />
                        </button>
                        {coin.contractAddress && (
                            <button
                                onClick={() => openExplorer(coin.contractAddress!)}
                                className="bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded flex items-center gap-1 cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
                                title="View contract on Oasis Explorer"
                            >
                                {coin.contractAddress.slice(0, 6)}...{coin.contractAddress.slice(-4)} <ExternalLink className="w-3 h-3" />
                            </button>
                        )}
                        <span className="text-gray-600 dark:text-gray-500">Created {new Date(coin.createdAt).toLocaleDateString()}</span>
                    </div>
                </div>
            </div>

            {/* Right: Metrics */}
            <div className="flex gap-4 md:gap-6 flex-wrap md:flex-nowrap md:justify-end overflow-x-auto">
                {loading ? (
                    <>
                        <div className="animate-pulse h-12 bg-gray-300 dark:bg-gray-800 rounded w-24"></div>
                        <div className="animate-pulse h-12 bg-gray-300 dark:bg-gray-800 rounded w-24"></div>
                        <div className="animate-pulse h-12 bg-gray-300 dark:bg-gray-800 rounded w-24"></div>
                        <div className="animate-pulse h-12 bg-gray-300 dark:bg-gray-800 rounded w-24"></div>
                        <div className="animate-pulse h-12 bg-gray-300 dark:bg-gray-800 rounded w-24"></div>
                        <div className="animate-pulse h-12 bg-gray-300 dark:bg-gray-800 rounded w-24"></div>
                    </>
                ) : (
                    <>
                        <div className="flex flex-col justify-center min-w-fit">
                            <div className="text-[10px] text-gray-600 dark:text-gray-400 uppercase font-semibold tracking-wider">
                                Market Cap
                            </div>
                            <div className="text-lg font-bold text-gray-900 dark:text-white font-mono">
                                {formatMarketCap(marketCap)}
                            </div>
                        </div>

                        <div className="flex flex-col justify-center min-w-fit">
                            <div className="text-[10px] text-gray-600 dark:text-gray-400 uppercase font-semibold tracking-wider">
                                Vol 24h
                            </div>
                            <div className="text-lg font-bold text-gray-900 dark:text-white font-mono">
                                {formatVolume(volume)}
                            </div>
                        </div>

                        <div className="flex flex-col justify-center min-w-fit">
                            <div className="text-[10px] text-gray-600 dark:text-gray-400 uppercase font-semibold tracking-wider">
                                Price
                            </div>
                            <div className="text-lg font-bold text-gray-900 dark:text-white font-mono">
                                {formatPrice(price)}
                            </div>
                        </div>

                        <div className="flex flex-col justify-center min-w-fit">
                            <div className="text-[10px] text-gray-400 uppercase font-semibold tracking-wider">
                                5m
                            </div>
                            <div className={`text-lg font-bold font-mono flex items-center gap-1 ${getPriceChangeColor(change5m)}`}>
                                {getPriceChangeIcon(change5m)}
                                {change5m.toFixed(2)}%
                            </div>
                        </div>

                        <div className="flex flex-col justify-center min-w-fit">
                            <div className="text-[10px] text-gray-400 uppercase font-semibold tracking-wider">
                                1h
                            </div>
                            <div className={`text-lg font-bold font-mono flex items-center gap-1 ${getPriceChangeColor(change1h)}`}>
                                {getPriceChangeIcon(change1h)}
                                {change1h.toFixed(2)}%
                            </div>
                        </div>

                        <div className="flex flex-col justify-center min-w-fit">
                            <div className="text-[10px] text-gray-400 uppercase font-semibold tracking-wider">
                                6h
                            </div>
                            <div className={`text-lg font-bold font-mono flex items-center gap-1 ${getPriceChangeColor(change6h)}`}>
                                {getPriceChangeIcon(change6h)}
                                {change6h.toFixed(2)}%
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default TokenInfoBar;
