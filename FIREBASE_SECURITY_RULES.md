# Firebase Firestore 보안 규칙 설정 방법

현재 애플리케이션에서 Firebase Firestore에 접근할 때 권한 오류가 발생하고 있습니다. 이 문서는 Firebase 보안 규칙을 설정하는 방법을 안내합니다.

## 현재 문제

애플리케이션이 Firestore에 데이터를 쓰거나 읽을 때 `permission-denied` 오류가 발생합니다. 이는 Firestore의 보안 규칙이 적절히 설정되지 않았기 때문입니다.

## 해결 방법

### 1. Firebase Console에서 보안 규칙 수정

1. [Firebase Console](https://console.firebase.google.com/)에 접속하세요.
2. 프로젝트를 선택하고 왼쪽 메뉴에서 "Firestore Database"를 클릭하세요.
3. "Rules" 탭을 선택하세요.
4. 아래의 보안 규칙 중 하나를 선택하여 적용하세요.

### 2. 테스트 환경용 규칙 (개발 중에만 사용)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      // 개발 중에만 사용하세요! 프로덕션에서는 위험합니다.
      allow read, write: if true;
    }
  }
}
```

⚠️ **주의**: 이 규칙은 모든 사용자에게 모든 데이터에 대한 읽기/쓰기 권한을 부여합니다. 개발 중에만 사용하고 프로덕션에서는 사용하지 마세요.

### 3. 인증된 사용자 규칙 (권장)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /auctions/{document} {
      // 인증된 사용자만 읽기 가능
      allow read: if request.auth != null;
      // 인증된 사용자만 쓰기 가능
      allow write: if request.auth != null;
    }
    
    // 다른 컬렉션에 대한 규칙도 여기에 추가
  }
}
```

이 규칙을 사용하려면 애플리케이션에서 Firebase Authentication을 구현해야 합니다.

### 4. 특정 도메인에서만 접근 허용

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /auctions/{document} {
      allow read, write: if request.auth != null || 
                          request.origin.matches("https://yourdomain.com");
    }
  }
}
```

### 5. 구조화된 규칙 예시 (프로덕션용)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Auctions 컬렉션 규칙
    match /auctions/{auctionId} {
      // 누구나 읽기 가능
      allow read: if true;
      
      // 인증된 사용자와 특정 역할을 가진 사용자만 쓰기 가능
      allow write: if request.auth != null && 
                    (request.auth.token.admin == true || 
                     request.auth.token.dataCollector == true);
                     
      // 문서의 구조 검증
      allow create: if request.resource.data.realmId is string &&
                     request.resource.data.id is number;
    }
    
    // 다른 컬렉션들...
  }
}
```

## 인증 구현하기

Firebase 인증을 구현하려면:

1. `firebase.ts` 파일을 수정하여 인증 모듈을 추가합니다:

```typescript
import { getAuth } from "firebase/auth";

// Firebase 초기화 코드...

export const auth = getAuth(app);
```

2. 로그인 기능을 구현합니다 (이메일/비밀번호, Google, 익명 로그인 등).
3. 인증된 사용자 상태를 애플리케이션 전체에서 관리합니다.

## 로컬 에뮬레이터 사용

개발 중에는 로컬 Firestore 에뮬레이터를 사용하여 실제 Firebase 프로젝트에 영향을 주지 않고 테스트할 수 있습니다:

1. Firebase CLI 설치: `npm install -g firebase-tools`
2. 에뮬레이터 시작: `firebase emulators:start --only firestore`
3. 클라이언트 코드에서 에뮬레이터 연결:

```typescript
import { connectFirestoreEmulator } from "firebase/firestore";

if (process.env.NODE_ENV === 'development') {
  connectFirestoreEmulator(db, 'localhost', 8080);
}
```

## 도움이 필요하신가요?

Firebase 보안 규칙에 대한 자세한 내용은 [공식 문서](https://firebase.google.com/docs/firestore/security/get-started)를 참조하세요.
