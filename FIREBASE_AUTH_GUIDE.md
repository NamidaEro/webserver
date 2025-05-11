# Firebase Authentication 설정 가이드

이 문서는 Firebase Authentication을 설정하고 애플리케이션에서 사용하는 방법을 안내합니다.

## 1. Firebase 콘솔에서 Authentication 설정

1. [Firebase 콘솔](https://console.firebase.google.com/)에 로그인합니다.
2. 프로젝트를 선택합니다.
3. 왼쪽 메뉴에서 "Authentication"을 클릭하고 "시작하기"를 선택합니다.
4. "Sign-in method" 탭에서 "Google"을 선택하고 활성화합니다.
5. Google 제공업체 설정에서 "프로젝트 공개 이름"과 "프로젝트 지원 이메일"을 입력합니다.
6. "저장" 버튼을 클릭합니다.

## 2. Firebase Admin SDK 비공개 키 생성

서버 측 인증을 위해 Firebase Admin SDK의 비공개 키가 필요합니다:

1. Firebase 콘솔에서 "프로젝트 설정" > "서비스 계정"으로 이동합니다.
2. "Firebase Admin SDK" 섹션에서 "새 비공개 키 생성"을 클릭합니다.
3. 다운로드된 JSON 파일에서 필요한 정보를 환경 변수에 설정합니다.

## 3. 환경 변수 설정

프로젝트 루트에 `.env.local` 파일을 생성하고 다음 변수를 설정합니다:

```
# Firebase Client SDK 환경 변수
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

# Firebase Admin SDK 환경 변수
FIREBASE_ADMIN_PROJECT_ID=your-project-id
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxx@your-project-id.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
```

## 4. 필요한 패키지 설치

다음 명령어로 필요한 패키지를 설치합니다:

```bash
npm install firebase firebase-admin react-firebase-hooks
```

## 5. 애플리케이션에서 인증 사용하기

1. `/auth` 페이지에서 "Google로 로그인" 버튼을 클릭합니다.
2. rkseksgkrns@gmail.com Google 계정으로 로그인하면 자동으로 Firebase 권한이 적용됩니다.
3. 로그인 후에는 Firestore 쓰기 작업이 가능해집니다.
4. 다른 Google 계정은 권한이 없으므로 접근이 거부됩니다.

## 문제 해결

- **인증 오류**: Firebase 콘솔에서 Authentication 설정과 사용자 계정을 확인하세요.
- **권한 오류**: Firestore 보안 규칙이 올바르게 설정되었는지 확인하세요.
- **환경 변수 오류**: `.env.local` 파일의 값이 올바르게 설정되었는지 확인하세요.

## 참고 자료

- [Firebase Authentication 문서](https://firebase.google.com/docs/auth)
- [Next.js와 Firebase 통합 가이드](https://firebase.google.com/docs/web/setup)
