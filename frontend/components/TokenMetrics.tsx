'use client'

import React from 'react'
import { formatMarketCap, formatVolume, formatPriceChange, formatPriceChangeColor, formatTraderCount } from '../utils/formatters'

interface TokenMetricsProps {
    token?: {
        marketcap?: number | string
        volume_24h?: number | string
        price_change_5m?: number | string
        price_change_1h?: number | string
        price_change_6h?: number | string
        trader_count?: number | string
    }
}

export default function TokenMetrics({ token }: TokenMetricsProps) {
    if (!token) {
        return null;
    }

    const metrics = [
        {
            label: 'Market Cap',
            value: formatMarketCap(token.marketcap || 0),
            icon: '📊'
        },
        {
            label: '24h Volume',
            value: formatVolume(token.volume_24h || 0),
            icon: '📈'
        },
        {
            label: '5m Change',
            value: formatPriceChange(token.price_change_5m || 0),
            color: formatPriceChangeColor(token.price_change_5m || 0)
        },
        {
            label: '1h Change',
            value: formatPriceChange(token.price_change_1h || 0),
            color: formatPriceChangeColor(token.price_change_1h || 0)
        },
        {
            label: '6h Change',
            value: formatPriceChange(token.price_change_6h || 0),
            color: formatPriceChangeColor(token.price_change_6h || 0)
        },
        {
            label: 'Traders',
            value: formatTraderCount(token.trader_count || 0),
            icon: '👥'
        }
    ]

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 p-4 bg-gray-900/50 rounded-lg border border-gray-800">
            {metrics.map((metric, index) => (
                <div key={index} className="flex flex-col items-center gap-1">
                    <span className="text-xs text-gray-500 uppercase tracking-wider">{metric.label}</span>
                    <span className={`text-sm md:text-base font-bold ${metric.color || 'text-white'}`}>
                        {metric.icon && <span className="mr-1">{metric.icon}</span>}
                        {metric.value}
                    </span>
                </div>
            ))}
        </div>
    )
}
