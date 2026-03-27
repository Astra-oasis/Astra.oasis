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
type CandleWithVolume = CandlestickData & { volume?: number };

const INTERVAL_SECONDS: Record<Interval, number> = {
    '1m': 60,
    '5m': 300,
    '15m': 900,
    '1h': 3600,
    '4h': 14400,
    '1d': 86400,
};

const pad2 = (n: number) => n.toString().padStart(2, '0');

/**
 * Tính bucket timestamp chuẩn UTC - giống TradingView
 * 1m  → floor to minute
 * 5m  → floor to 5-minute mark (0,5,10,15...)
 * 1h  → floor to hour
 * 1d  → floor to 00:00 UTC
 */
function getBucketTime(unixSec: number, intervalSec: number): number {
    return Math.floor(unixSec / intervalSec) * intervalSec;
}

/**
 * Thời gian còn lại đến khi đóng nến hiện tại
 */
function getRemainingSeconds(nowSec: number, intervalSec: number): number {
    const elapsed = nowSec % intervalSec;
    return elapsed === 0 ? intervalSec : intervalSec - elapsed;
}

function formatCountdown(seconds: number): string {
    const s = Math.max(0, seconds);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${pad2(h)}:${pad2(m)}:${pad2(sec)}`;
    return `${pad2(m)}:${pad2(sec)}`;
}

export default function TokenLightweightChart({
    tokenId,
    ticker,
    currentPrice: _currentPrice,
    refreshKey,
}: TokenLightweightChartProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
    const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);

    const [interval, setIntervalState] = useState<Interval>('5m');
    const [candles, setCandles] = useState<CandleWithVolume[]>([]);
    const [loading, setLoading] = useState(true);
    const [priceChange, setPriceChange] = useState(0);
    const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));
    const [countdownY, setCountdownY] = useState<number | null>(null);
    const isFetchingRef = useRef(false);
    const fitPendingRef = useRef(true);

    const intervalSec = INTERVAL_SECONDS[interval];
    const remaining = getRemainingSeconds(nowSec, intervalSec);
    const countdownLabel = formatCountdown(remaining);

    // ─── Build live candles - chuẩn TradingView ──────────────────────────────
    const buildLiveCandles = useCallback(
        (source: CandleWithVolume[]): CandleWithVolume[] => {
            const cp = typeof _currentPrice === 'number' && _currentPrice > 0 ? _currentPrice : null;
            const nowBucket = getBucketTime(nowSec, intervalSec);

            if (source.length === 0) {
                if (!cp) return [];
                return [{
                    time: nowBucket as Time,
                    open: cp, high: cp, low: cp, close: cp, volume: 0,
                }];
            }

            // Normalize + sort
            const sorted: CandleWithVolume[] = [...source]
                .sort((a, b) => Number(a.time) - Number(b.time))
                .map((c) => ({
                    time: getBucketTime(Number(c.time), intervalSec) as Time,
                    open: Number(c.open),
                    high: Number(c.high),
                    low: Number(c.low),
                    close: Number(c.close),
                    volume: Number(c.volume ?? 0),
                }));

            // Deduplicate buckets (keep last)
            const bucketMap = new Map<number, CandleWithVolume>();
            for (const c of sorted) {
                bucketMap.set(Number(c.time), c);
            }
            const deduped = Array.from(bucketMap.values()).sort(
                (a, b) => Number(a.time) - Number(b.time)
            );

            // Fill gap buckets với flat candle (close của nến trước)
            // Giống TradingView: không có giao dịch thì nến flat
            const filled: CandleWithVolume[] = [];
            for (let i = 0; i < deduped.length; i++) {
                filled.push(deduped[i]);
                if (i < deduped.length - 1) {
                    let t = Number(deduped[i].time) + intervalSec;
                    const nextT = Number(deduped[i + 1].time);
                    const prevClose = deduped[i].close;
                    while (t < nextT) {
                        filled.push({
                            time: t as Time,
                            open: prevClose,
                            high: prevClose,
                            low: prevClose,
                            close: prevClose,
                            volume: 0,
                        });
                        t += intervalSec;
                    }
                }
            }

            // Extend đến bucket hiện tại
            let last = filled[filled.length - 1];
            let lastT = Number(last.time);
            while (lastT < nowBucket) {
                const nextT = lastT + intervalSec;
                const flat: CandleWithVolume = {
                    time: nextT as Time,
                    open: last.close,
                    high: last.close,
                    low: last.close,
                    close: last.close,
                    volume: 0,
                };
                filled.push(flat);
                last = flat;
                lastT = nextT;
            }

            // Update nến hiện tại với currentPrice
            // Đây là nến đang hình thành - cập nhật high/low/close đúng chuẩn
            if (cp !== null) {
                const idx = filled.length - 1;
                const cur = filled[idx];
                // Wick: high = max của tất cả giá đã qua trong bucket
                //        low  = min của tất cả giá đã qua trong bucket
                filled[idx] = {
                    ...cur,
                    close: cp,
                    high: Math.max(cur.high, cur.open, cp),
                    low:  Math.min(cur.low,  cur.open, cp),
                };
            }

            return filled;
        },
        [_currentPrice, intervalSec, nowSec]
    );

    // ─── Fetch OHLCV ─────────────────────────────────────────────────────────
    const fetchCandles = useCallback(
        async (showLoader = false) => {
            if (!tokenId) { setCandles([]); setLoading(false); return; }
            if (isFetchingRef.current) return;
            if (showLoader) setLoading(true);
            isFetchingRef.current = true;
            try {
                const res = await fetch(`/api/ohlcv?tokenId=${tokenId}&interval=${interval}`);
                const data = await res.json();
                if (data.success && data.data.length > 0) {
                    setCandles(data.data);
                    const first = data.data[0];
                    const last = data.data[data.data.length - 1];
                    if (first.open > 0) {
                        setPriceChange(((last.close - first.open) / first.open) * 100);
                    }
                } else {
                    setCandles([]);
                    setPriceChange(0);
                }
            } catch {
                setCandles([]);
            } finally {
                isFetchingRef.current = false;
                if (showLoader) setLoading(false);
            }
        },
        [tokenId, interval]
    );

    // ─── Init chart ───────────────────────────────────────────────────────────
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
                scaleMargins: { top: 0.08, bottom: 0.22 },
                autoScale: true,
            },
            timeScale: {
                borderColor: 'rgba(139, 92, 246, 0.2)',
                timeVisible: true,
                // secondsVisible chỉ bật cho 1m
                secondsVisible: false,
                rightOffset: 10,
                barSpacing: 12,
                minBarSpacing: 2,
                fixLeftEdge: false,
                fixRightEdge: false,
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

        // Candlestick series - màu giống TradingView mặc định
        const candleSeries = chart.addSeries(CandlestickSeries, {
            upColor: '#26a69a',
            downColor: '#ef5350',
            borderUpColor: '#26a69a',
            borderDownColor: '#ef5350',
            wickUpColor: '#26a69a',
            wickDownColor: '#ef5350',
            priceFormat: {
                type: 'price',
                precision: 8,
                minMove: 0.00000001,
            },
        });

        // Volume histogram
        const volumeSeries = chart.addSeries(HistogramSeries, {
            color: 'rgba(139, 92, 246, 0.3)',
            priceFormat: { type: 'volume' },
            priceScaleId: 'volume',
        });

        chart.priceScale('volume').applyOptions({
            scaleMargins: { top: 0.82, bottom: 0 },
        });

        chartRef.current = chart;
        candleSeriesRef.current = candleSeries;
        volumeSeriesRef.current = volumeSeries;

        const ro = new ResizeObserver(() => {
            if (containerRef.current) {
                chart.applyOptions({ width: containerRef.current.clientWidth });
            }
        });
        ro.observe(containerRef.current);

        return () => {
            ro.disconnect();
            chart.remove();
            chartRef.current = null;
            candleSeriesRef.current = null;
            volumeSeriesRef.current = null;
        };
    }, []);

    // secondsVisible chỉ bật cho 1m
    useEffect(() => {
        chartRef.current?.applyOptions({
            timeScale: { secondsVisible: interval === '1m' },
        });
    }, [interval]);

    // Fetch khi đổi interval
    useEffect(() => {
        fitPendingRef.current = true;
        fetchCandles(true);
    }, [fetchCandles]);

    // Clock tick mỗi giây - cập nhật countdown + nến live
    useEffect(() => {
        const t = setInterval(() => setNowSec(Math.floor(Date.now() / 1000)), 1000);
        return () => clearInterval(t);
    }, []);

    // Poll mỗi 10s
    useEffect(() => {
        const t = setInterval(() => fetchCandles(false), 10000);
        return () => clearInterval(t);
    }, [fetchCandles]);

    // Refresh sau trade
    useEffect(() => {
        if (refreshKey === undefined) return;
        fetchCandles(false);
    }, [refreshKey, fetchCandles]);

    // ─── Apply data to chart ──────────────────────────────────────────────────
    useEffect(() => {
        const live = buildLiveCandles(candles);
        if (!candleSeriesRef.current || !volumeSeriesRef.current) return;

        if (live.length === 0) {
            candleSeriesRef.current.setData([]);
            volumeSeriesRef.current.setData([]);
            setPriceChange(0);
            return;
        }

        // Validate: đảm bảo high >= max(open,close) và low <= min(open,close)
        // Đây là điều kiện bắt buộc để có râu nến đúng
        const validated = live.map((c) => ({
            ...c,
            high: Math.max(c.high, c.open, c.close),
            low: Math.min(c.low, c.open, c.close),
        }));

        candleSeriesRef.current.setData(validated);
        volumeSeriesRef.current.setData(
            validated.map((c) => ({
                time: c.time,
                value: c.volume ?? 0,
                color: c.close >= c.open
                    ? 'rgba(38, 166, 154, 0.4)'
                    : 'rgba(239, 83, 80, 0.4)',
            }))
        );

        const first = validated[0];
        const last = validated[validated.length - 1];
        if (first.open > 0) {
            setPriceChange(((last.close - first.open) / first.open) * 100);
        }

        // Countdown overlay position
        const y = candleSeriesRef.current.priceToCoordinate(last.close);
        setCountdownY(typeof y === 'number' ? y : null);

        if (fitPendingRef.current) {
            chartRef.current?.timeScale().fitContent();
            fitPendingRef.current = false;
        }
    }, [buildLiveCandles, candles]);

    const liveCandles = buildLiveCandles(candles);
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
                    <span style={{ color: '#fff', fontWeight: 700, fontSize: '1rem', letterSpacing: '0.05em' }}>
                        {symbol}
                    </span>
                    {/* Countdown badge - giống TradingView */}
                    <span style={{
                        color: '#9ca3af',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        background: 'rgba(148, 163, 184, 0.1)',
                        border: '1px solid rgba(148, 163, 184, 0.18)',
                        borderRadius: '0.3rem',
                        padding: '0.12rem 0.4rem',
                        fontVariantNumeric: 'tabular-nums',
                        letterSpacing: '0.03em',
                    }}>
                        {interval} · {countdownLabel}
                    </span>
                    {candles.length > 1 && (
                        <span style={{
                            color: isPositive ? '#26a69a' : '#ef5350',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                        }}>
                            {isPositive ? '+' : ''}{priceChange.toFixed(2)}%
                        </span>
                    )}
                </div>

                {/* Interval buttons */}
                <div style={{ display: 'flex', gap: '0.2rem' }}>
                    {INTERVALS.map((iv) => (
                        <button
                            key={iv}
                            onClick={() => setIntervalState(iv)}
                            style={{
                                padding: '0.22rem 0.55rem',
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                borderRadius: '0.3rem',
                                border: 'none',
                                cursor: 'pointer',
                                background: interval === iv
                                    ? 'rgba(139, 92, 246, 0.45)'
                                    : 'rgba(139, 92, 246, 0.07)',
                                color: interval === iv ? '#fff' : '#9ca3af',
                                transition: 'all 0.15s',
                            }}
                        >
                            {iv}
                        </button>
                    ))}
                </div>
            </div>

            {/* Chart area */}
            <div style={{ position: 'relative' }}>
                {/* Countdown overlay trên price line */}
                {!loading && liveCandles.length > 0 && (
                    <div style={{
                        position: 'absolute',
                        right: '0.4rem',
                        top: countdownY !== null
                            ? `${Math.max(4, countdownY - 10)}px`
                            : '0.4rem',
                        zIndex: 11,
                        background: 'rgba(13, 17, 23, 0.85)',
                        border: '1px solid rgba(148, 163, 184, 0.25)',
                        color: '#cbd5e1',
                        borderRadius: '0.25rem',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        padding: '0.15rem 0.38rem',
                        letterSpacing: '0.05em',
                        fontVariantNumeric: 'tabular-nums',
                        pointerEvents: 'none',
                    }}>
                        {countdownLabel}
                    </div>
                )}

                {loading && (
                    <div style={{
                        position: 'absolute', inset: 0, zIndex: 10,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'rgba(13, 17, 23, 0.75)',
                    }}>
                        <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Loading chart...</span>
                    </div>
                )}

                {!loading && liveCandles.length === 0 && (
                    <div style={{
                        position: 'absolute', inset: 0, zIndex: 10,
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
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
