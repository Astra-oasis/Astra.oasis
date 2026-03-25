import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

const RPC_URL = 'https://testnet.sapphire.oasis.io';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { token_id, token_address, current_price } = body;

        if (!token_id && !token_address) {
            return NextResponse.json(
                { error: 'Either token_id or token_address is required' },
                { status: 400 }
            );
        }

        let tokenId = token_id;

        // Get token_id from contract_address if not provided
        if (!tokenId && token_address) {
            const tokenResult = await query(
                'SELECT id FROM tokens WHERE contract_address = $1 LIMIT 1',
                [token_address]
            );

            if (tokenResult.rows.length === 0) {
                return NextResponse.json(
                    { success: false, error: 'Token not found' },
                    { status: 404 }
                );
            }

            tokenId = tokenResult.rows[0].id;
        }

        // Get token data
        const tokenResult = await query(
            'SELECT * FROM tokens WHERE id = $1',
            [tokenId]
        );

        if (tokenResult.rows.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Token not found' },
                { status: 404 }
            );
        }

        const token = tokenResult.rows[0];

        // Get current price from smart contract (not from frontend)
        let price = current_price ? parseFloat(current_price) : 0;
        let totalSupply = parseFloat(token.total_supply) || 0;

        // Fetch price and supply from Sapphire using direct eth_call
        if (token.contract_address && !current_price) {
            try {
                const getPriceCall = {
                    jsonrpc: '2.0',
                    method: 'eth_call',
                    params: [{
                        to: token.contract_address,
                        data: '0x79cc6790' // getCurrentPrice()
                    }, 'latest'],
                    id: 1
                };

                const getTotalSupplyCall = {
                    jsonrpc: '2.0',
                    method: 'eth_call',
                    params: [{
                        to: token.contract_address,
                        data: '0x18160ddd' // totalSupply()
                    }, 'latest'],
                    id: 2
                };

                const [priceResponse, supplyResponse] = await Promise.all([
                    fetch(RPC_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(getPriceCall)
                    }),
                    fetch(RPC_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(getTotalSupplyCall)
                    })
                ]);

                const priceData = await priceResponse.json();
                const supplyData = await supplyResponse.json();

                if (priceData?.result && supplyData?.result) {
                    price = parseInt(priceData.result, 16) / 1e18;
                    totalSupply = parseInt(supplyData.result, 16) / 1e18;
                } else {
                    price = parseFloat(token.price_snapshot_value || '0');
                    totalSupply = parseFloat(token.total_supply) || 0;
                }
            } catch (error) {
                console.warn('Error fetching from smart contract RPC:', error);
                price = parseFloat(token.price_snapshot_value || '0');
                totalSupply = parseFloat(token.total_supply) || 0;
            }
        }

        // Calculate Marketcap = current_price * total_supply (both in actual token units)
        const marketcap = price * totalSupply;

                // Calculate Volume 24h from purchases table (total token quantity)
                const volume24hResult = await query(
                        `SELECT COALESCE(SUM(quantity), 0) as volume 
                         FROM purchases 
                         WHERE token_id = $1
                             AND status = 'completed'
                             AND created_at >= NOW() - INTERVAL '24 hours'`,
                        [tokenId]
                );
        const volume_24h = parseFloat(volume24hResult.rows[0].volume) || 0;

        // Calculate Trader Count (unique buyers + sellers)
        const traderCountResult = await query(
            `SELECT COUNT(DISTINCT buyer_address) + COUNT(DISTINCT seller_address) as count
             FROM purchases
             WHERE token_id = $1 AND (buyer_address IS NOT NULL OR seller_address IS NOT NULL)`,
            [tokenId]
        );
        const trader_count = parseInt(traderCountResult.rows[0].count) || 0;

        // Calculate Price Changes
        let price_change_5m = 0;
        let price_change_1h = 0;
        let price_change_6h = 0;

        // Get current price snapshot from token (last recorded price)
        const oldSnapshotPrice = token.price_snapshot_value ? parseFloat(token.price_snapshot_value) : price;

        // Get price at different time intervals from purchases - use separate queries
        try {
            // Price 1 hour ago
            const price1hResult = await query(
                `SELECT AVG(price_per_token) as price_1h_ago 
                 FROM purchases 
                 WHERE token_id = $1 AND created_at >= NOW() - INTERVAL '65 minutes' AND created_at < NOW() - INTERVAL '60 minutes'`,
                [tokenId]
            );
            const price_1h_ago = price1hResult.rows[0]?.price_1h_ago ? parseFloat(price1hResult.rows[0].price_1h_ago) : null;
            if (price_1h_ago) {
                price_change_1h = ((price - price_1h_ago) / price_1h_ago) * 100;
            }

            // Price 6 hours ago
            const price6hResult = await query(
                `SELECT AVG(price_per_token) as price_6h_ago 
                 FROM purchases 
                 WHERE token_id = $1 AND created_at >= NOW() - INTERVAL '360 minutes' AND created_at < NOW() - INTERVAL '355 minutes'`,
                [tokenId]
            );
            const price_6h_ago = price6hResult.rows[0]?.price_6h_ago ? parseFloat(price6hResult.rows[0].price_6h_ago) : null;
            if (price_6h_ago) {
                price_change_6h = ((price - price_6h_ago) / price_6h_ago) * 100;
            }

            // 5m: If price_snapshot exists, use it. Otherwise use recent price
            const recentPriceResult = await query(
                `SELECT AVG(price_per_token) as price_recent 
                 FROM purchases 
                 WHERE token_id = $1 AND created_at >= NOW() - INTERVAL '1 minute'`,
                [tokenId]
            );
            const price_recent = recentPriceResult.rows[0]?.price_recent ? parseFloat(recentPriceResult.rows[0].price_recent) : null;

            if (oldSnapshotPrice && oldSnapshotPrice !== price) {
                price_change_5m = ((price - oldSnapshotPrice) / oldSnapshotPrice) * 100;
            } else if (price_recent) {
                price_change_5m = ((price - price_recent) / price_recent) * 100;
            }
        } catch (error) {
            console.warn('Warning calculating price changes:', error);
            // Continue with 0 price changes if query fails
        }

        // Update token with calculated metrics
        const updateResult = await query(
            `UPDATE tokens 
             SET marketcap = $2,
                 volume_24h = $3,
                 price_change_5m = $4,
                 price_change_1h = $5,
                 price_change_6h = $6,
                 trader_count = $7,
                 price_snapshot_value = $8,
                 price_snapshot_time = NOW(),
                 updated_at = NOW()
             WHERE id = $1
             RETURNING *`,
            [
                tokenId,
                marketcap,
                volume_24h,
                parseFloat(price_change_5m.toFixed(4)),
                parseFloat(price_change_1h.toFixed(4)),
                parseFloat(price_change_6h.toFixed(4)),
                trader_count,
                price,
            ]
        );

        return NextResponse.json({
            success: true,
            data: updateResult.rows[0]
        });
    } catch (error) {
        console.error('Error calculating token metrics:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to calculate token metrics',
            },
            { status: 500 }
        );
    }
}
