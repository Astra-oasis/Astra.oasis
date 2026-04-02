import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

async function ensureCommentsTable() {
    await query(
        `CREATE TABLE IF NOT EXISTS wallets (
            id SERIAL PRIMARY KEY,
            wallet_address VARCHAR(255) NOT NULL UNIQUE,
            display_name VARCHAR(255),
            avatar_url VARCHAR(255),
            bio TEXT,
            owned_coins TEXT[] DEFAULT ARRAY[]::TEXT[],
            minted_coins TEXT[] DEFAULT ARRAY[]::TEXT[],
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        []
    );

    await query(
        `CREATE TABLE IF NOT EXISTS comments (
            id SERIAL PRIMARY KEY,
            token_id INTEGER NOT NULL REFERENCES tokens(id) ON DELETE CASCADE,
            user_address VARCHAR(255) NOT NULL,
            comment_text TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        []
    );

    await query(
        `CREATE INDEX IF NOT EXISTS idx_comments_token_id_created_at
         ON comments(token_id, created_at)`,
        []
    );
}

export async function GET(request: NextRequest) {
    try {
        await ensureCommentsTable();
        const tokenId = request.nextUrl.searchParams.get('tokenId');

        if (!tokenId) {
            return NextResponse.json(
                { error: 'Missing tokenId parameter' },
                { status: 400 }
            );
        }

        const result = await query(
            `SELECT c.*, 
                    COALESCE(NULLIF(w.display_name, ''), c.user_address) AS username,
                    COALESCE(NULLIF(w.avatar_url, ''), '') AS avatar_url
             FROM comments c
             LEFT JOIN wallets w ON LOWER(w.wallet_address) = LOWER(c.user_address)
             WHERE c.token_id = $1
             ORDER BY c.created_at ASC`,
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
        await ensureCommentsTable();
        const body = await request.json();
        const { tokenId, user, userAddress, text } = body;
        const resolvedUser = userAddress || user;

        if (!tokenId || !resolvedUser || !text) {
            return NextResponse.json(
                { error: 'Missing required fields: tokenId, userAddress, text' },
                { status: 400 }
            );
        }

        const result = await query(
            `INSERT INTO comments (token_id, user_address, comment_text, created_at)
             VALUES ($1, $2, $3, (NOW() AT TIME ZONE 'UTC') + INTERVAL '7 hours')
             RETURNING *`,
            [tokenId, resolvedUser, text]
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
