'use client';

import React from 'react';
import Link from 'next/link';
import AuthComponent from '../components/AuthComponent';

export default function AuthPage() {
  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'Arial, sans-serif', 
      maxWidth: '800px', 
      margin: '0 auto',
      backgroundColor: '#111',
      color: '#fff',
      minHeight: '100vh',
      borderRadius: '8px'
    }}>
      <h1 style={{ textAlign: 'center', marginBottom: '30px', color: '#ffffff' }}>Firebase 인증</h1>
      
      <AuthComponent />
      
      <div style={{ marginTop: '30px', textAlign: 'center' }}>
        <Link href="/" style={{ color: '#4285F4', textDecoration: 'none' }}>
          ← 메인으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
