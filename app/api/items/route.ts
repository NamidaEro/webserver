import fs from 'fs/promises';
import path from 'path';
import pLimit from 'p-limit';

const REGION = process.env.REGION || '';
const LOCALE = process.env.NEXT_PUBLIC_LOCALE || 'ko_KR';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const auctions = body.auctions;

    if (!Array.isArray(auctions)) {
      return new Response(JSON.stringify({ error: 'Invalid auctions data' }), { status: 400 });
    }

    const itemInfoDir = path.join(process.cwd(), 'app', 'iteminfo');

    const itemIds = [...new Set(auctions.map((auction: any) => auction.item?.id).filter(Boolean))];


    const limit = pLimit(5); // 병렬 요청을 5개로 제한

    const itemDetails = await Promise.all(
      itemIds.map((itemId) =>
        limit(async () => {
          const itemFilePath = path.join(itemInfoDir, `${itemId}.json`);

          // Check if the item file already exists
          try {
            const cachedData = await fs.readFile(itemFilePath, 'utf-8');
            const parsedData = JSON.parse(cachedData);
            // console.log('LOCALE:', LOCALE);
            console.log('Parsed Data:', parsedData);
            // console.log('Parsed Data Name Keys:', Object.keys(parsedData.name || {}));
            // console.log('Cache hit for itemId:', itemId, parsedData.name?.[LOCALE]);
            return { id: itemId, name: parsedData.name?.[LOCALE] || 'Unknown', classid: parsedData.item_class?.id || null };
          } catch (err: any) {
            if (err.code !== 'ENOENT') {
              console.error(`Error reading file for item ${itemId}:`, err);
              return null;
            }
          }

          // Fetch item data if not cached
          const baseUrl = 'http://localhost:3000';
          const url = `${baseUrl}/api/item?itemId=${itemId}`;
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 5000); // 5초 타임아웃 설정

          try {
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeout);

            if (!response.ok) {
              console.error(`Failed to fetch item ${itemId}: ${response.statusText}`);
              return null;
            }

            const data = await response.json();
            // console.log(`Fetched data for item ${itemId}:`, data);
            return { id: itemId, name: data.name?.[LOCALE] || 'Unknown', classid: data.item_class?.id || null };
          } catch (fetchError) {
            clearTimeout(timeout);
            console.error(`Error fetching item ${itemId}:`, fetchError);
            return null;
          }
        })
      )
    );

    const validItemDetails = itemDetails.filter(Boolean);

    return new Response(JSON.stringify(validItemDetails), { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
}
