import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
    try {
        const result = await query(
            `SELECT * FROM livestreams WHERE is_active = true ORDER BY viewers DESC`
        );

        return NextResponse.json({
            success: true,
            data: result.rows,
        });
    } catch (error) {
        console.error('Error fetching livestreams:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to fetch livestreams',
            },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { user_address, title, token, thumbnail_url, avatar_url } = body;

        if (!user_address || !title || !token) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const result = await query(
            `INSERT INTO livestreams (user_address, title, token, thumbnail_url, avatar_url, viewers, is_active, created_at)
             VALUES ($1, $2, $3, $4, $5, 0, true, NOW() + INTERVAL '7 hours')
             RETURNING *`,
            [user_address, title, token, thumbnail_url || '', avatar_url || '']
        );

        return NextResponse.json({
            success: true,
            data: result.rows[0],
        });
    } catch (error) {
        console.error('Error creating livestream:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to create livestream',
            },
            { status: 500 }
        );
    }
}
