import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * GET /api/tokens-images
 * Fetch all tokens with their image URLs from database
 * Returns map of contract_address -> image_url for quick lookup
 */
export async function GET(request: NextRequest) {
  try {
    const result = await query(
      `SELECT contract_address, image_url FROM tokens WHERE image_url IS NOT NULL ORDER BY created_at DESC`,
      []
    );

    // Convert to map for easy lookup
    const imageMap: { [key: string]: string } = {};
    result.rows.forEach((row: any) => {
      if (row.contract_address && row.image_url) {
        imageMap[row.contract_address.toLowerCase()] = row.image_url;
      }
    });

    return NextResponse.json({
      success: true,
      images: imageMap,
      count: Object.keys(imageMap).length,
    });
  } catch (error) {
    console.error('Error fetching token images:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch images',
      },
      { status: 500 }
    );
  }
}
