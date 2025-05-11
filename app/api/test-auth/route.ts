import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // 환경 변수 확인
    const clientId = process.env.CLIENT_ID;
    const clientSecret = process.env.CLIENT_SECRET;
    const region = process.env.REGION || 'kr';
    const locale = process.env.LOCALE || 'ko_KR';
    const oauthHost = process.env.OAUTH_TOKEN_HOST || 'https://kr.battle.net';
    
    // 환경 변수 존재 여부 확인
    const envCheck = {
      clientIdExists: !!clientId,
      clientSecretExists: !!clientSecret,
      clientIdValue: clientId ? `${clientId.substring(0, 3)}...` : 'missing',
      region,
      locale,
      oauthHost
    };
    
    // 직접 토큰 요청 테스트
    let tokenResult: {
      success: boolean;
      message: string;
      tokenPrefix: string;
      error?: string;
    } = { 
      success: false, 
      message: '', 
      tokenPrefix: '' 
    };
    
    if (clientId && clientSecret) {
      try {
        const tokenResponse = await fetch(`${oauthHost}/oauth/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          // 토큰 요청 방식 변경 - URL 인코딩된 본문으로 자격 증명 전송
          body: new URLSearchParams({
            'grant_type': 'client_credentials',
            'client_id': clientId,
            'client_secret': clientSecret
          }).toString()
        });
        
        if (tokenResponse.ok) {
          const data = await tokenResponse.json();
          tokenResult = { 
            success: true, 
            message: 'Token successfully retrieved',
            tokenPrefix: data.access_token ? `${data.access_token.substring(0, 10)}...` : ''
          };
        } else {
          const errorText = await tokenResponse.text();
          tokenResult = { 
            success: false, 
            message: `Failed to get token: ${tokenResponse.status} ${tokenResponse.statusText}`,
            tokenPrefix: '',
            error: errorText
          };
        }
      } catch (error) {
        tokenResult = { 
          success: false, 
          message: `Exception during token request: ${error instanceof Error ? error.message : 'Unknown error'}`,
          tokenPrefix: '',
          error: error instanceof Error ? error.stack : ''
        };
      }
    } else {
      tokenResult = { 
        success: false, 
        message: 'Missing client credentials',
        tokenPrefix: ''
      };
    }
    
    return NextResponse.json({ 
      message: 'Auth test endpoint',
      environmentCheck: envCheck,
      tokenTest: tokenResult
    });
  } catch (error) {
    return NextResponse.json({ 
      error: 'Error in test-auth endpoint', 
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : ''
    }, { status: 500 });
  }
}