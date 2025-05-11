'use client';

import React, { useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut 
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';

const AuthComponent: React.FC = () => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [user, loading, authError] = useAuthState(auth);

  // Google 로그인 처리
  const handleGoogleLogin = async () => {
    setError(null);
    setMessage(null);
    
    try {
      const provider = new GoogleAuthProvider();
      // rkseksgkrns@gmail.com 계정만 허용하도록 설정
      provider.setCustomParameters({
        'login_hint': 'rkseksgkrns@gmail.com'
      });
      
      const result = await signInWithPopup(auth, provider);
      
      // 특정 이메일만 허용
      if (result.user.email === 'rkseksgkrns@gmail.com') {
        setMessage('Google 로그인 성공!');
      } else {
        // 권한이 없는 계정으로 로그인한 경우 로그아웃 처리
        await signOut(auth);
        setError('권한이 없는 계정입니다. rkseksgkrns@gmail.com으로 로그인하세요.');
      }
    } catch (err) {
      console.error('Google 로그인 에러:', err);
      setError('Google 로그인 실패: ' + (err instanceof Error ? err.message : '알 수 없는 오류'));
    }
  };

  // 이메일/비밀번호 로그인 처리 (선택적으로 유지)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setMessage('로그인 성공!');
    } catch (err) {
      console.error('로그인 에러:', err);
      setError('로그인 실패: 이메일 또는 비밀번호를 확인하세요.');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setMessage('로그아웃 되었습니다.');
    } catch (err) {
      console.error('로그아웃 에러:', err);
      setError('로그아웃 중 오류가 발생했습니다.');
    }
  };

  if (loading) {
    return <div className="auth-container">로딩 중...</div>;
  }
  return (
    <div className="auth-container" style={{
      maxWidth: '400px',
      margin: '0 auto',
      padding: '20px',
      backgroundColor: '#000000',
      color: '#ffffff',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(255,255,255,0.1)'
    }}>
      <h2 style={{ marginBottom: '20px' }}>Firebase 인증</h2>
        {user ? (
        <div className="logged-in-container">
          <p style={{ marginBottom: '10px' }}>
            <strong>로그인됨:</strong> {user.email}
          </p>
          <div style={{ marginTop: '10px', color: '#4a9c4a', backgroundColor: '#ebfaeb', padding: '10px', borderRadius: '4px' }}>
            <strong>인증 상태:</strong> 인증되었습니다. 이제 Firebase 쓰기 작업이 가능합니다.
          </div>
          <button
            onClick={handleLogout}
            style={{
              padding: '8px 16px',
              backgroundColor: '#333',
              color: 'white',
              border: '1px solid #444',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            로그아웃
          </button>
        </div>
      ) : (
        <div>
          {/* Google 로그인 버튼 */}
          <button
            onClick={handleGoogleLogin}
            style={{
              width: '100%',
              padding: '10px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#333',
              color: '#ffffff',
              border: '1px solid #444',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            <span style={{ 
              display: 'inline-block', 
              width: '20px', 
              height: '20px', 
              marginRight: '10px',
              backgroundImage: 'url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTgiIGhlaWdodD0iMTgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGcgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIj48cGF0aCBkPSJNMTcuNiA5LjJsLS4xLTEuOEg5djMuNGg0LjhDMTMuNiAxMiAxMyAxMyAxMiAxMy42djIuMmgzYTguOCA4LjggMCAwIDAgMi42LTYuNnoiIGZpbGw9IiM0Mjg1RjQiIGZpbGwtcnVsZT0ibm9uemVybyIvPjxwYXRoIGQ9Ik05IDE4YzIuNCAwIDQuNS0uOCA2LTIuMmwtMy0yLjJhNS40IDUuNCAwIDAgMS04LTIuOUgxVjEzYTkgOSAwIDAgMCA4IDV6IiBmaWxsPSIjMzRBODUzIiBmaWxsLXJ1bGU9Im5vbnplcm8iLz48cGF0aCBkPSJNNCAxMC43YTUuNCA1LjQgMCAwIDEgMC0zLjRWNUgxYTkgOSAwIDAgMCAwIDhsMy0yLjN6IiBmaWxsPSIjRkJCQzA1IiBmaWxsLXJ1bGU9Im5vbnplcm8iLz48cGF0aCBkPSJNOSAzLjZjMS4zIDAgMi41LjQgMy40IDEuM0wxNSAyLjNBOSA5IDAgMCAwIDEgNWwzIDIuNGE1LjQgNS40IDAgMCAxIDUtMy43eiIgZmlsbD0iI0VBNDMzNSIgZmlsbC1ydWxlPSJub256ZXJvIi8+PHBhdGggZD0iTTAgMGgxOHYxOEgweiIvPjwvZz48L3N2Zz4=)' 
            }}></span>
            Google로 로그인
          </button>

          <div style={{ 
            margin: '20px 0',
            textAlign: 'center',
            position: 'relative',
            borderTop: '1px solid #444',
          }}>
            <span style={{ 
              position: 'relative',
              top: '-10px',
              background: '#000000',
              padding: '0 10px',
              color: '#ccc',
              fontSize: '14px'
            }}>또는 이메일로 로그인</span>
          </div>

          {/* 기존 이메일/비밀번호 로그인 폼 */}
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', color: '#e0e0e0' }}>이메일:</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #444',
                  backgroundColor: '#222',
                  color: '#fff'
                }}
              />
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', color: '#e0e0e0' }}>비밀번호:</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #444',
                  backgroundColor: '#222',
                  color: '#fff'
                }}
              />
            </div>
            
            <button 
              type="submit" 
              style={{
                padding: '10px 16px',
                backgroundColor: '#4285F4',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                width: '100%'
              }}
            >
              이메일로 로그인
            </button>
          </form>
        </div>
      )}
      
      {error && (
        <div style={{ marginTop: '15px', color: '#ff6b6b', backgroundColor: '#331111', padding: '10px', borderRadius: '4px', border: '1px solid #662222' }}>
          {error}
        </div>
      )}
      
      {message && (
        <div style={{ marginTop: '15px', color: '#4ade80', backgroundColor: '#113322', padding: '10px', borderRadius: '4px', border: '1px solid #226644' }}>
          {message}
        </div>
      )}
        {!user && (
        <div style={{ marginTop: '20px', fontSize: '0.9em', color: '#cccccc' }}>
          <p>사용자 인증이 필요합니다. Google 로그인을 통해 Firebase 쓰기 권한을 얻으세요.</p>
          <p style={{ marginTop: '5px' }}>
            <strong style={{ color: '#ffffff' }}>참고:</strong> rkseksgkrns@gmail.com Google 계정으로만 인증이 가능합니다.
          </p>
        </div>
      )}
    </div>
  );
};

export default AuthComponent;
