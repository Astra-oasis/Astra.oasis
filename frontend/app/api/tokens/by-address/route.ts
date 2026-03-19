import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
    try {
        const contractAddress = request.nextUrl.searchParams.get('contract_address');

        if (!contractAddress) {
            return NextResponse.json(
                { error: 'Missing contract_address parameter' },
                { status: 400 }
            );
        }

        const result = await query(
            'SELECT id FROM tokens WHERE contract_address = $1 LIMIT 1',
            [contractAddress]
        );

        if (result.rows.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Token not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            token_id: result.rows[0].id,
        });
    } catch (error) {
        console.error('Error fetching token ID:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to fetch token ID',
            },
            { status: 500 }
        );
    }
}
