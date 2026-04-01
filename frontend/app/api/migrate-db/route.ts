import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
    try {
        // Add description, image_url and social_link columns if they don't exist
        await query(`
            ALTER TABLE tokens 
            ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '',
            ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '',
            ADD COLUMN IF NOT EXISTS social_link TEXT DEFAULT ''
        `);

        return NextResponse.json({
            success: true,
            message: 'Database migrated successfully',
        });
    } catch (error) {
        console.error('Error migrating database:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to migrate database',
            },
            { status: 500 }
        );
    }
}
