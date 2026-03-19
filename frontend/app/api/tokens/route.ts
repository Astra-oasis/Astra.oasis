import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, symbol, description, image_url, social_link, totalSupply, owner, contractAddress } = body;

        if (!name || !symbol || !owner || !contractAddress) {
            return NextResponse.json(
                { error: 'Missing required fields: name, symbol, owner, contractAddress' },
                { status: 400 }
            );
        }

        const result = await query(
            `INSERT INTO tokens (name, symbol, description, image_url, social_link, total_supply, owner, contract_address, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       RETURNING *`,
            [name, symbol, description || null, image_url || null, social_link || null, totalSupply || 0, owner, contractAddress]
        );

        return NextResponse.json({
            success: true,
            data: result.rows[0],
        });
    } catch (error) {
        console.error('Error creating token:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to create token',
            },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        const owner = request.nextUrl.searchParams.get('owner');

        let sql = 'SELECT * FROM tokens ORDER BY created_at DESC';
        const params = [];

        if (owner) {
            sql = 'SELECT * FROM tokens WHERE owner = $1 ORDER BY created_at DESC';
            params.push(owner);
        }

        const result = await query(sql, params);

        return NextResponse.json({
            success: true,
            data: result.rows,
        });
    } catch (error) {
        console.error('Error fetching tokens:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to fetch tokens',
            },
            { status: 500 }
        );
    }
}
