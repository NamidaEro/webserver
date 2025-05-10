import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const itemClassId = searchParams.get('itemClassId');

  if (!itemClassId) {
    return NextResponse.json({ error: 'Missing itemClassId parameter' }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://kr.api.blizzard.com/data/wow/item-class/${itemClassId}/item-subclass?namespace=static-kr&locale=ko_KR`,
      {
        headers: {
          Authorization: `Bearer ${process.env.BLIZZARD_API_TOKEN}`,
        },
      }
    );

    if (!response.ok) {
      const errorDetails = await response.json();
      return NextResponse.json({ error: errorDetails.error || 'Failed to fetch item subclasses' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching item subclasses:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
