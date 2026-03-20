import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
    try {
        const tokenId = request.nextUrl.searchParams.get('tokenId');

        if (!tokenId) {
            return NextResponse.json(
                { error: 'Missing tokenId parameter' },
                { status: 400 }
            );
        }

        const result = await query(
            `SELECT * FROM comments WHERE token_id = $1 ORDER BY created_at DESC`,
            [tokenId]
        );

        return NextResponse.json({
            success: true,
            data: result.rows,
        });
    } catch (error) {
        console.error('Error fetching comments:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to fetch comments',
            },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { tokenId, user, text } = body;

        if (!tokenId || !user || !text) {
            return NextResponse.json(
                { error: 'Missing required fields: tokenId, user, text' },
                { status: 400 }
            );
        }

        const result = await query(
            `INSERT INTO comments (token_id, user_address, comment_text, created_at)
             VALUES ($1, $2, $3, NOW())
             RETURNING *`,
            [tokenId, user, text]
        );

        return NextResponse.json({
            success: true,
            data: result.rows[0],
        });
    } catch (error) {
        console.error('Error creating comment:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to create comment',
            },
            { status: 500 }
        );
    }
}
