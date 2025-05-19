import { NextResponse } from 'next/server';

export async function GET() {
  console.log('[API] GET /api/realms 호출됨');
  
  try {
    const url = 'http://20.168.3.131:8080/realms';
    console.log('[API] realm 데이터 요청 중:', url);
    
    const res = await fetch(url);
    console.log('[API] realm 응답 상태:', res.status);
    
    const data = await res.json();
    console.log('[API] realm 데이터 받음:', data);
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('[API] realm 데이터 가져오기 오류:', error);
    return NextResponse.json({ 
      status: 'error', 
      message: '서버에서 realm 데이터를 가져올 수 없습니다.' 
    }, { status: 500 });
  }
} 