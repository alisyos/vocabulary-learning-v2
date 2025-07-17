import { NextResponse } from 'next/server';
import { getFieldData } from '@/lib/google-sheets';

export async function GET() {
  try {
    console.log('Fetching field data from Google Sheets...');
    
    const fieldData = await getFieldData();
    
    console.log('Field data fetched successfully:', fieldData.length, 'records');
    
    if (fieldData.length === 0) {
      console.warn('Field data is empty - Google Sheets field sheet may be empty or missing');
    }
    
    return NextResponse.json(fieldData);
  } catch (error) {
    console.error('Error fetching field data:', error);
    
    // 구체적인 오류 정보 로깅
    if (error instanceof Error) {
      if (error.message.includes('field')) {
        console.error('Field sheet may not exist in the spreadsheet');
      } else if (error.message.includes('authentication')) {
        console.error('Google Sheets authentication failed');
      } else if (error.message.includes('spreadsheet')) {
        console.error('Spreadsheet access failed - check SPREADSHEET_ID and permissions');
      }
    }
    
    // Google Sheets 연결 실패 시 기본값 반환
    const fallbackData = [
      // 사회 과목 데이터
      { subject: '사회', grade: '3학년', area: '일반사회', maintopic: '우리나라의 정치', subtopic: '민주주의와 시민 참여', keyword: '민주주의, 시민 참여, 선거' },
      { subject: '사회', grade: '4학년', area: '일반사회', maintopic: '사회 제도와 기관', subtopic: '지방 자치와 시민 생활', keyword: '지방자치, 시민참여, 공공서비스' },
      { subject: '사회', grade: '5학년', area: '지리', maintopic: '우리나라의 자연환경', subtopic: '산지와 평야', keyword: '산맥, 평야, 지형' },
      { subject: '사회', grade: '6학년', area: '역사', maintopic: '조선시대의 문화', subtopic: '과학 기술의 발달', keyword: '한글, 인쇄술, 측우기' },
      { subject: '사회', grade: '중1', area: '지리', maintopic: '세계의 기후', subtopic: '기후 요소와 기후 인자', keyword: '기온, 강수량, 위도' },
      { subject: '사회', grade: '중2', area: '역사', maintopic: '고려시대', subtopic: '몽골 침입과 극복', keyword: '몽골침입, 강화도, 항몽투쟁' },
      { subject: '사회', grade: '중3', area: '경제', maintopic: '시장경제체제', subtopic: '수요와 공급의 원리', keyword: '수요, 공급, 균형가격' },
      
      // 과학 과목 데이터
      { subject: '과학', grade: '3학년', area: '생물', maintopic: '동물의 생활', subtopic: '동물의 특징', keyword: '서식지, 먹이, 생김새' },
      { subject: '과학', grade: '4학년', area: '물리', maintopic: '물질의 상태', subtopic: '물의 상태 변화', keyword: '고체, 액체, 기체' },
      { subject: '과학', grade: '5학년', area: '지구과학', maintopic: '날씨와 기후', subtopic: '구름과 비', keyword: '수증기, 응결, 강수' },
      { subject: '과학', grade: '6학년', area: '화학', maintopic: '연소와 소화', subtopic: '연소의 조건', keyword: '산소, 가연성물질, 발화점' },
      { subject: '과학', grade: '중1', area: '물리', maintopic: '힘과 운동', subtopic: '뉴턴의 운동 법칙', keyword: '관성, 가속도, 작용반작용' },
      { subject: '과학', grade: '중2', area: '화학', maintopic: '물질의 구성', subtopic: '원소와 화합물', keyword: '원소, 화합물, 분자' },
      { subject: '과학', grade: '중3', area: '생물', maintopic: '유전과 진화', subtopic: '멘델의 유전 법칙', keyword: '우성, 열성, 유전자' }
    ];
    
    return NextResponse.json(fallbackData, { status: 200 });
  }
} 