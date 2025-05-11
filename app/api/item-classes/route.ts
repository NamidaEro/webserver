import { NextResponse } from 'next/server';
import OAuthClient from '../../oauth/client';

const REGION = process.env.REGION || 'kr';
const LOCALE = 'ko_KR';
const API_BASE_URL = `https://${REGION}.api.blizzard.com/data/wow`;

const oauthClient = new OAuthClient({
  client: {
    id: process.env.CLIENT_ID || '',
    secret: process.env.CLIENT_SECRET || '',
  },
  auth: {
    tokenHost: process.env.OAUTH_TOKEN_HOST || 'https://kr.battle.net',
  },
});

export async function GET() {
  try {
    console.log('Starting item-classes API call');
    console.log('Environment variables:', {
      REGION,
      LOCALE,
      API_BASE_URL,
      CLIENT_ID: process.env.CLIENT_ID?.substring(0, 5) + '...',
      CLIENT_SECRET: process.env.CLIENT_SECRET ? '***' : 'undefined',
      OAUTH_TOKEN_HOST: process.env.OAUTH_TOKEN_HOST
    });
    
    const accessToken = await oauthClient.getToken();
    console.log('Got access token:', accessToken ? '(valid token)' : '(no token)');
    
    const url = `${API_BASE_URL}/item-class/index?namespace=static-${REGION}&locale=${LOCALE}`;
    console.log('API URL:', url);
    
    console.log('Sending API request with headers');
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    
    console.log('API response status:', response.status, response.statusText);    if (!response.ok) {
      const errorDetails = await response.text();
      console.error('API error response body:', errorDetails);
      throw new Error(`Failed to fetch item classes: ${response.statusText}, Details: ${errorDetails}`);
    }    const data = await response.json();
    console.log('API response data received successfully');
    
    // Process item class names for Korean locale
    if (data && data.item_classes && Array.isArray(data.item_classes)) {
      data.item_classes = data.item_classes.map((itemClass: any) => {
        if (itemClass.name && typeof itemClass.name === 'object' && itemClass.name.ko_KR) {
          // Convert the name object to just use the Korean string value directly
          return {
            ...itemClass,
            name: itemClass.name.ko_KR
          };
        }
        return itemClass;
      });
    }
    
    return NextResponse.json(data);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('Error fetching item classes:', errorMessage);
    console.error('Full error object:', error);
    
    // 상세한 오류 정보 반환
    return NextResponse.json({ 
      error: errorMessage,
      details: error instanceof Error ? {
        name: error.name,
        stack: error.stack
      } : 'Unknown error type'
    }, { status: 500 });
  }
}
