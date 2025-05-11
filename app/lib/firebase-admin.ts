import { initializeApp, cert, getApps } from 'firebase-admin/app';

// 이미 Firebase Admin 앱이 초기화되었는지 확인
const adminApp = !getApps().length 
  ? initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    })
  : getApps()[0];

export { adminApp };
