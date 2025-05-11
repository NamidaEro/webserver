import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAuth } from 'firebase-admin/auth';
import { adminApp } from '../../lib/firebase-admin';

/**
 * 이 API 엔드포인트는 사용자의 인증 상태를 확인합니다.
 * 클라이언트에서 발급된 Firebase ID 토큰을 검증합니다.
 */
export async function POST(request: Request) {
  try {
    const { idToken } = await request.json();
    
    if (!idToken) {
      return NextResponse.json({ authenticated: false, error: 'No token provided' }, { status: 400 });
    }

    try {
      // Firebase Admin SDK를 사용하여 토큰 검증
      const auth = getAuth(adminApp);
      const decodedToken = await auth.verifyIdToken(idToken);

      // 검증 성공
      return NextResponse.json({
        authenticated: true,
        user: {
          uid: decodedToken.uid,
          email: decodedToken.email,
          emailVerified: decodedToken.email_verified,
        },
        isAuthorized: decodedToken.email === 'rkseksgkrns@gmail.com',
      });
    } catch (verifyError) {
      console.error('토큰 검증 실패:', verifyError);
      return NextResponse.json({ authenticated: false, error: 'Invalid token' }, { status: 401 });
    }
  } catch (error) {
    console.error('인증 확인 에러:', error);
    return NextResponse.json({ authenticated: false, error: 'Authentication failed' }, { status: 500 });
  }
}
