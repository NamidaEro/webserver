import { NextResponse } from 'next/server';
import OAuthClient from '../../oauth/client';
import fs from 'fs/promises';
import path from 'path';

const REGION = process.env.REGION || '';
const API_BASE_URL = `https://${REGION}.api.blizzard.com/data/wow`;
const LOCALE = process.env.LOCALE || 'ko_KR';

const oauthClient = new OAuthClient({
  client: {
    id: process.env.CLIENT_ID || '',
    secret: process.env.CLIENT_SECRET || '',
  },
  auth: {
    tokenHost: process.env.OAUTH_TOKEN_HOST || 'https://kr.battle.net',
  },
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const itemId = searchParams.get('itemId');

//   console.log('Received itemId:', itemId);

  if (!itemId) {
    return NextResponse.json({ error: 'itemId parameter is required' }, { status: 400 });
  }

  const itemInfoDir = path.join(process.cwd(), 'app', 'iteminfo');
  const itemFilePath = path.join(itemInfoDir, `${itemId}.json`);

  console.log('Item file path:', itemFilePath);

  try {
    // Check if the item file already exists
    try {
      const cachedData = await fs.readFile(itemFilePath, 'utf-8');
    //   console.log('Cache hit for itemId:', itemId);
      return NextResponse.json(JSON.parse(cachedData));
    } catch (err: any) {
      if (err.code !== 'ENOENT') {
        console.error('Error reading cache for itemId:', itemId, err);
        throw err;
      }
      console.log('Cache miss for itemId:', itemId);
    }

    // Fetch item data if not cached
    // console.log('Fetching item data from Blizzard API for itemId:', itemId);
    const accessToken = await oauthClient.getToken();
    const url = `${API_BASE_URL}/item/${itemId}?namespace=static-${REGION}&locale=${LOCALE}`;
    // console.log('Blizzard API URL:', url);
    const headers = {
      Authorization: `Bearer ${accessToken}`,
    };

    const response = await fetch(url, { headers });
    if (!response.ok) {
      console.error('Blizzard API error for itemId:', itemId, response.statusText);
      throw new Error(`Failed to fetch item: ${response.statusText}`);
    }

    const data = await response.json();
    // console.log('Fetched data for itemId:', itemId, data);

    // Ensure the iteminfo directory exists
    await fs.mkdir(itemInfoDir, { recursive: true });

    // Save the fetched data to a file
    await fs.writeFile(itemFilePath, JSON.stringify(data, null, 2), 'utf-8');
    // console.log('Saved data to cache for itemId:', itemId);

    return NextResponse.json(data);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('Error processing itemId:', itemId, errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
