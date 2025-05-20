import { NextResponse } from 'next/server';

// 백엔드 서버 주소
const BACKEND_URL = 'http://20.168.3.131:8080';

export async function GET(
  request: Request,
  { params }: { params: { itemId: string } }
) {
  const itemId = params.itemId;

  if (!itemId) {
    return NextResponse.json({ error: 'itemId is required' }, { status: 400 });
  }

  try {
    const response = await fetch(`${BACKEND_URL}/item-metadata?item_id=${itemId}`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error from backend API (/item-metadata): ${response.status} ${response.statusText}`, errorText);
      return NextResponse.json({ error: `Backend API error: ${response.statusText}`, details: errorText }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching from backend API (/item-metadata):', error);
    if (error instanceof Error) {
        return NextResponse.json({ error: 'Internal server error while fetching item metadata', details: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Internal server error while fetching item metadata' }, { status: 500 });
  }
} 