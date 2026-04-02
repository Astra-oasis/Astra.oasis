import { NextRequest } from 'next/server';
import { query } from '@/lib/db';

export const runtime = 'nodejs';

async function ensureCommentsTable() {
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

async function getLatestCommentId(tokenId: string) {
    const result = await query(
        `SELECT COALESCE(MAX(id), 0) AS latest_id FROM comments WHERE token_id = $1`,
        [tokenId]
    );
    return Number(result.rows?.[0]?.latest_id || 0);
}

export async function GET(request: NextRequest) {
    const tokenId = request.nextUrl.searchParams.get('tokenId');

    if (!tokenId) {
        return new Response('Missing tokenId parameter', { status: 400 });
    }

    await ensureCommentsTable();

    const encoder = new TextEncoder();
    let interval: ReturnType<typeof setInterval> | null = null;
    let lastSeenId = await getLatestCommentId(tokenId);

    const stream = new ReadableStream<Uint8Array>({
        start(controller) {
            controller.enqueue(encoder.encode(`event: ready\ndata: ${JSON.stringify({ latestId: lastSeenId })}\n\n`));

            interval = setInterval(async () => {
                try {
                    const latestId = await getLatestCommentId(tokenId);
                    if (latestId > lastSeenId) {
                        lastSeenId = latestId;
                        controller.enqueue(encoder.encode(`event: comments-updated\ndata: ${JSON.stringify({ latestId })}\n\n`));
                    } else {
                        controller.enqueue(encoder.encode(`event: ping\ndata: {}\n\n`));
                    }
                } catch {
                    if (interval) clearInterval(interval);
                    controller.close();
                }
            }, 2000);

            request.signal.addEventListener('abort', () => {
                if (interval) clearInterval(interval);
                controller.close();
            });
        },
        cancel() {
            if (interval) clearInterval(interval);
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
        },
    });
}
