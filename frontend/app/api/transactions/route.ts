import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { token_id, from_address, to_address, amount, transaction_hash } = body;

        if (!token_id || !from_address || !to_address || !amount) {
            return NextResponse.json(
                { error: 'Missing required fields: token_id, from_address, to_address, amount' },
                { status: 400 }
            );
        }

        const result = await query(
            `INSERT INTO transactions (token_id, from_address, to_address, amount, transaction_hash, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING *`,
            [token_id, from_address, to_address, amount, transaction_hash || null]
        );

        return NextResponse.json({
            success: true,
            data: result.rows[0],
        });
    } catch (error) {
        console.error('Error creating transaction:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to create transaction',
            },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        const tokenId = request.nextUrl.searchParams.get('token_id');
        const fromAddress = request.nextUrl.searchParams.get('from_address');
        const toAddress = request.nextUrl.searchParams.get('to_address');

        const params: any[] = [];
        const conditions: string[] = [];

        if (tokenId) {
            conditions.push(`token_id = $${conditions.length + 1}`);
            params.push(parseInt(tokenId));
        }

        if (fromAddress) {
            conditions.push(`from_address = $${conditions.length + 1}`);
            params.push(fromAddress);
        }

        if (toAddress) {
            conditions.push(`to_address = $${conditions.length + 1}`);
            params.push(toAddress);
        }

        let sql = 'SELECT * FROM transactions';

        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }

        sql += ' ORDER BY created_at DESC';

        const result = await query(sql, params.length > 0 ? params : undefined);

        return NextResponse.json({
            success: true,
            data: result.rows,
        });
    } catch (error) {
        console.error('Error fetching transactions:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to fetch transactions',
            },
            { status: 500 }
        );
    }
}
