'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
    createChart,
    IChartApi,
    ISeriesApi,
    CandlestickData,
    Time,
    ColorType,
    CrosshairMode,
    CandlestickSeries,
    HistogramSeries,
} from 'lightweight-charts';

interface TokenLightweightChartProps {
    tokenId: string | number;
    ticker: string;
    currentPrice?: number;
    refreshKey?: number;
}

const INTERVALS = ['1m', '5m', '15m', '1h', '4h', '1d'] as const;
type Interval = typeof INTERVALS[number];

export default function TokenLightweightChart({ tokenId, ticker, currentPrice, refreshKey }: TokenLightweightChartProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
    const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);

    const [interval, setInterval] = useState<Interval>('5m');
    const [candles, setCandles] = useState<CandlestickData[]>([]);
    const [loading, setLoading] = useState(true);
    const [priceChange, setPriceChange] = useState<number>(0);
    const isFetchingRef = useRef(false);
    const fitContentPendingRef = useRef(true);
    const followLatestRef = useRef(true);
    const candleCountRef = useRef(0);

    // Use ref for currentPrice to avoid re-creating fetchCandles on every price tick
    const currentPriceRef = useRef(currentPrice);
    useEffect(() => { currentPriceRef.current = currentPrice; }, [currentPrice]);

    const alignLatestCandleWithCurrentPrice = useCallback((source: CandlestickData[]): CandlestickData[] => {
        const cp = currentPriceRef.current;
        if (!cp || cp <= 0 || source.length === 0) {
            return source;
        }

        const cloned = [...source];
        const lastIndex = cloned.length - 1;
        const last = cloned[lastIndex];

        cloned[lastIndex] = {
            ...last,
            close: cp,
            high: Math.max(last.high, last.open, cp),
            low: Math.min(last.low, last.open, cp),
        };

        return cloned;
    }, []);

    const ensureVisibleBody = (data: CandlestickData[]): CandlestickData[] => {
        return data.map((candle, index) => {
            if (candle.open !== candle.close) {
                return candle;
            }

            const previous = data[index - 1];
            if (previous && previous.close !== candle.close) {
                // Sparse buckets often have a single trade; carry forward previous close as open
                // so the candle body reflects real movement between buckets.
                return {
                    ...candle,
                    open: previous.close,
                    high: Math.max(candle.high, previous.close, candle.close),
                    low: Math.min(candle.low, previous.close, candle.close),
                };
            }

            // If there is no previous movement, keep a very small body to avoid disappearing doji.
            const epsilon = Math.max(Math.abs(candle.close) * 0.001, 0.00000001);
            return {
                ...candle,
                close: candle.close + epsilon,
                high: Math.max(candle.high, candle.open, candle.close + epsilon),
                low: Math.min(candle.low, candle.open, candle.close + epsilon),
            };
        });
    };

    const fetchCandles = useCallback(async (showLoader = false) => {
        if (!tokenId) {
            setCandles([]);
            setPriceChange(0);
            setLoading(false);
            return;
        }
        if (isFetchingRef.current) return;

        if (showLoader) {
            setLoading(true);
        }
        isFetchingRef.current = true;
        try {
            const res = await fetch(`/api/ohlcv?tokenId=${tokenId}&interval=${interval}`);
            const data = await res.json();
            if (data.success && data.data.length > 0) {
                const alignedCandles = alignLatestCandleWithCurrentPrice(data.data);
                setCandles(alignedCandles);
                const last = alignedCandles[alignedCandles.length - 1];
                const first = alignedCandles[0];
                setPriceChange(((last.close - first.open) / first.open) * 100);
            } else {
                // No trades yet — show a single synthetic candle from current price
                const cp = currentPriceRef.current;
                if (cp && cp > 0) {
                    const now = Math.floor(Date.now() / 1000);
                    const syntheticCandle: CandlestickData = {
                        time: now as Time,
                        open: cp, high: cp, low: cp, close: cp,
                    };
                    setCandles([syntheticCandle]);
                    setPriceChange(0);
                } else {
                    setCandles([]);
                    setPriceChange(0);
                }
            }
        } catch (e) {
            console.error('OHLCV fetch error:', e);
            setCandles([]);
            setPriceChange(0);
        } finally {
            isFetchingRef.current = false;
            if (showLoader) {
                setLoading(false);
            }
        }
    }, [tokenId, interval, alignLatestCandleWithCurrentPrice]); // currentPrice intentionally excluded — use ref instead

    // Init chart once
    useEffect(() => {
        if (!containerRef.current) return;

        const chart = createChart(containerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: '#0d1117' },
                textColor: '#9ca3af',
                fontSize: 11,
            },
            grid: {
                vertLines: { color: 'rgba(139, 92, 246, 0.08)' },
                horzLines: { color: 'rgba(139, 92, 246, 0.08)' },
            },
            crosshair: {
                mode: CrosshairMode.Normal,
                vertLine: { color: 'rgba(139, 92, 246, 0.5)', labelBackgroundColor: '#7c3aed' },
                horzLine: { color: 'rgba(139, 92, 246, 0.5)', labelBackgroundColor: '#7c3aed' },
            },
            rightPriceScale: {
                borderColor: 'rgba(139, 92, 246, 0.2)',
                scaleMargins: { top: 0.1, bottom: 0.25 },
                autoScale: true,
            },
            timeScale: {
                borderColor: 'rgba(139, 92, 246, 0.2)',
                timeVisible: true,
                secondsVisible: false,
                rightOffset: 8,
                barSpacing: 12,
                minBarSpacing: 2,
            },
            handleScale: {
                mouseWheel: true,
                pinch: true,
                axisPressedMouseMove: { time: true, price: true },
            },
            handleScroll: {
                mouseWheel: true,
                pressedMouseMove: true,
                horzTouchDrag: true,
                vertTouchDrag: true,
            },
            width: containerRef.current.clientWidth,
            height: 420,
        });

        const candleSeries = chart.addSeries(CandlestickSeries, {
            upColor: '#22c55e',
            downColor: '#ef4444',
            borderUpColor: '#22c55e',
            borderDownColor: '#ef4444',
            wickUpColor: '#22c55e',
            wickDownColor: '#ef4444',
            priceFormat: {
                type: 'price',
                precision: 8,
                minMove: 0.00000001,
            },
        });

        const volumeSeries = chart.addSeries(HistogramSeries, {
            color: 'rgba(139, 92, 246, 0.3)',
            priceFormat: { type: 'volume' },
            priceScaleId: 'volume',
        });

        chart.priceScale('volume').applyOptions({
            scaleMargins: { top: 0.8, bottom: 0 },
        });

        chartRef.current = chart;
        candleSeriesRef.current = candleSeries;
        volumeSeriesRef.current = volumeSeries;

        chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
            if (!range) {
                followLatestRef.current = true;
                return;
            }

            // If user is still close to the latest bar, keep auto-following realtime.
            const bars = candleCountRef.current;
            const latestLogicalIndex = Math.max(0, bars - 1);
            followLatestRef.current = range.to >= latestLogicalIndex - 2;
        });

        // Responsive resize
        const resizeObserver = new ResizeObserver(() => {
            if (containerRef.current) {
                chart.applyOptions({ width: containerRef.current.clientWidth });
            }
        });
        resizeObserver.observe(containerRef.current);

        return () => {
            resizeObserver.disconnect();
            chart.remove();
            chartRef.current = null;
        };
    }, []);

    // Update data when candles change
    useEffect(() => {
        if (!candleSeriesRef.current || !volumeSeriesRef.current) return;
        if (candles.length === 0) return;
        candleCountRef.current = candles.length;

        const displayCandles = ensureVisibleBody(candles);

        candleSeriesRef.current.setData(displayCandles);
        volumeSeriesRef.current.setData(
            displayCandles.map((c: any) => ({
                time: c.time,
                value: c.volume ?? 0,
                color: c.close >= c.open ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)',
            }))
        );

        if (fitContentPendingRef.current) {
            const total = displayCandles.length;
            chartRef.current?.timeScale().setVisibleLogicalRange({
                from: Math.max(0, total - 60),
                to: total + 5,
            });
            fitContentPendingRef.current = false;
            followLatestRef.current = true;
            return;
        }

        if (followLatestRef.current) {
            chartRef.current?.timeScale().scrollToRealTime();
        }
    }, [candles]);

    // Fetch on interval change
    useEffect(() => {
        fitContentPendingRef.current = true;
        followLatestRef.current = true;
        fetchCandles(true);
    }, [fetchCandles]);

    // Live update every 10s
    useEffect(() => {
        const timer = setInterval(() => {
            fetchCandles(false);
        }, 10000);
        return () => clearInterval(timer);
    }, [fetchCandles]);

    // Keep last candle synchronized with current price source from parent.
    useEffect(() => {
        const cp = currentPriceRef.current;
        if (!cp || cp <= 0) return;

        setCandles((prev) => {
            if (prev.length === 0) return prev;
            const aligned = alignLatestCandleWithCurrentPrice(prev);
            if (aligned.length > 0) {
                const first = aligned[0];
                const last = aligned[aligned.length - 1];
                if (first.open > 0) {
                    setPriceChange(((last.close - first.open) / first.open) * 100);
                }
            }
            return aligned;
        });
    }, [currentPrice, alignLatestCandleWithCurrentPrice]);

    // Force immediate refresh after successful trade in parent component
    useEffect(() => {
        if (refreshKey === undefined) return;
        fetchCandles(false);
    }, [refreshKey, fetchCandles]);

    const symbol = `${ticker.toUpperCase()}/TEST`;
    const isPositive = priceChange >= 0;

    return (
        <div style={{
            background: '#0d1117',
            border: '1px solid rgba(139, 92, 246, 0.2)',
            borderRadius: '0.75rem',
            overflow: 'hidden',
        }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                borderBottom: '1px solid rgba(139, 92, 246, 0.15)',
                flexWrap: 'wrap',
                gap: '0.5rem',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ color: '#fff', fontWeight: '700', fontSize: '1rem', letterSpacing: '0.05em' }}>
                        {symbol}
                    </span>
                    {candles.length > 1 && (
                        <span style={{
                            color: isPositive ? '#22c55e' : '#ef4444',
                            fontSize: '0.8rem',
                            fontWeight: '600',
                        }}>
                            {isPositive ? '+' : ''}{priceChange.toFixed(2)}%
                        </span>
                    )}
                </div>

                {/* Interval selector */}
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                    {INTERVALS.map((iv) => (
                        <button
                            key={iv}
                            onClick={() => setInterval(iv)}
                            style={{
                                padding: '0.25rem 0.6rem',
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                borderRadius: '0.375rem',
                                border: 'none',
                                cursor: 'pointer',
                                background: interval === iv ? 'rgba(139, 92, 246, 0.4)' : 'rgba(139, 92, 246, 0.08)',
                                color: interval === iv ? '#fff' : '#9ca3af',
                                transition: 'all 0.15s',
                            }}
                        >
                            {iv}
                        </button>
                    ))}
                </div>
            </div>

            {/* Chart */}
            <div style={{ position: 'relative' }}>
                {loading && (
                    <div style={{
                        position: 'absolute', inset: 0, zIndex: 10,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'rgba(13, 17, 23, 0.7)',
                    }}>
                        <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Loading chart...</span>
                    </div>
                )}
                {!loading && candles.length === 0 && (
                    <div style={{
                        position: 'absolute', inset: 0, zIndex: 10,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        background: 'rgba(13, 17, 23, 0.85)',
                        gap: '0.5rem',
                    }}>
                        <span style={{ color: '#6b7280', fontSize: '0.9rem' }}>No trades yet</span>
                        <span style={{ color: '#4b5563', fontSize: '0.75rem' }}>Waiting for the first trade</span>
                    </div>
                )}
                <div ref={containerRef} style={{ width: '100%', height: '420px' }} />
            </div>
        </div>
    );
}
