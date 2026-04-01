import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const id = params.id;
        const result = await query('SELECT * FROM tokens WHERE id = $1', [id]);

        if (result.rows.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Token not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: result.rows[0],
        });
    } catch (error) {
        console.error('Error fetching token:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to fetch token',
            },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const id = params.id;
        const body = await request.json();
        const { name, symbol, totalSupply } = body;

        const result = await query(
            `UPDATE tokens 
       SET name = COALESCE($1, name), 
           symbol = COALESCE($2, symbol),
           total_supply = COALESCE($3, total_supply),
           updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
            [name, symbol, totalSupply, id]
        );

        if (result.rows.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Token not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: result.rows[0],
        });
    } catch (error) {
        console.error('Error updating token:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to update token',
            },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const id = params.id;
        const result = await query('DELETE FROM tokens WHERE id = $1 RETURNING *', [id]);

        if (result.rows.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Token not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Token deleted successfully',
            data: result.rows[0],
        });
    } catch (error) {
        console.error('Error deleting token:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to delete token',
            },
            { status: 500 }
        );
    }
}
