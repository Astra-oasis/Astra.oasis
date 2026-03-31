import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
    try {
        const { wallet_address, coin_addresses, type } = await request.json();

        if (!wallet_address || !coin_addresses || !Array.isArray(coin_addresses)) {
            return NextResponse.json(
                { success: false, error: 'wallet_address and coin_addresses array required' },
                { status: 400 }
            );
        }

        // type should be 'owned' or 'minted'
        if (type !== 'owned' && type !== 'minted') {
            return NextResponse.json(
                { success: false, error: 'type must be "owned" or "minted"' },
                { status: 400 }
            );
        }

        const columnName = type === 'owned' ? 'owned_coins' : 'minted_coins';

        // Get current coins array and merge with new ones (avoid duplicates)
        const getResult = await query(
            `SELECT ${columnName} FROM wallets WHERE wallet_address = $1`,
            [wallet_address]
        );

        let existingCoins: string[] = [];
        if (getResult.rows.length > 0) {
            existingCoins = getResult.rows[0][columnName] || [];
        }

        // Merge and deduplicate
        const mergedCoins = [...new Set([...existingCoins, ...coin_addresses])];

        // Update with merged coins
        const updateResult = await query(
            `UPDATE wallets SET ${columnName} = $1, updated_at = CURRENT_TIMESTAMP 
             WHERE wallet_address = $2
             RETURNING *`,
            [mergedCoins, wallet_address]
        );

        if (updateResult.rows.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Wallet not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: `${type} coins updated successfully`,
            wallet: updateResult.rows[0],
        });
    } catch (error) {
        console.error('Error updating wallet coins:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to update wallet coins',
            },
            { status: 500 }
        );
    }
}
