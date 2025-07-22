import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    console.log('Supabase에서 교육과정 구조 데이터를 가져오는 중...');
    
    // URL 파라미터에서 필터 조건 추출
    const { searchParams } = new URL(request.url);
    const filters = {
      subject: searchParams.get('subject') || undefined,
      grade: searchParams.get('grade') || undefined,
      area: searchParams.get('area') || undefined
    };
    
    // Supabase에서 교육과정 데이터 가져오기 (curriculum_data 테이블)
    let curriculumData;
    try {
      curriculumData = await db.getCurriculumData(filters);
      console.log(`Supabase에서 ${curriculumData.length}개의 교육과정 데이터를 가져왔습니다.`);
    } catch (supabaseError) {
      console.error('Supabase 교육과정 데이터 조회 실패:', supabaseError);
      throw supabaseError;
    }
    
    // 데이터가 없는 경우 기본 데이터 생성 시도
    if (curriculumData.length === 0) {
      console.log('교육과정 데이터가 비어있습니다. 기본 데이터를 생성합니다...');
      
      try {
        const defaultData = [
          // 사회 - 3학년
          { subject: '사회' as const, grade: '3학년', area: '일반사회', main_topic: '우리나라의 정치', sub_topic: '민주주의와 시민 참여', keywords: '민주주의, 시민 참여, 선거', is_active: true },
          { subject: '사회' as const, grade: '3학년', area: '지리', main_topic: '우리나라의 지형', sub_topic: '산과 강', keywords: '산맥, 하천, 지형', is_active: true },
          { subject: '사회' as const, grade: '3학년', area: '역사', main_topic: '우리나라의 역사', sub_topic: '고대 역사', keywords: '고조선, 삼국시대, 유물', is_active: true },
          
          // 사회 - 4학년
          { subject: '사회' as const, grade: '4학년', area: '일반사회', main_topic: '사회 제도와 기관', sub_topic: '정부와 지방자치', keywords: '정부, 지방자치, 공공기관', is_active: true },
          { subject: '사회' as const, grade: '4학년', area: '지리', main_topic: '우리나라의 기후', sub_topic: '계절과 날씨', keywords: '사계절, 기후, 날씨', is_active: true },
          { subject: '사회' as const, grade: '4학년', area: '경제', main_topic: '경제생활의 이해', sub_topic: '생산과 소비', keywords: '생산, 소비, 경제활동', is_active: true },
          
          // 과학 - 3학년
          { subject: '과학' as const, grade: '3학년', area: '물리', main_topic: '물질과 에너지', sub_topic: '자석의 성질', keywords: '자석, 자기력, N극, S극', is_active: true },
          { subject: '과학' as const, grade: '3학년', area: '생물', main_topic: '동물의 한살이', sub_topic: '나비의 한살이', keywords: '완전변태, 애벌레, 번데기, 성충', is_active: true },
          { subject: '과학' as const, grade: '3학년', area: '지구과학', main_topic: '지구와 달', sub_topic: '달의 모양 변화', keywords: '달, 위상, 삭, 망', is_active: true },
          
          // 과학 - 4학년
          { subject: '과학' as const, grade: '4학년', area: '물리', main_topic: '빛과 그림자', sub_topic: '빛의 성질', keywords: '빛, 그림자, 직진, 반사', is_active: true },
          { subject: '과학' as const, grade: '4학년', area: '화학', main_topic: '물질의 상태', sub_topic: '고체, 액체, 기체', keywords: '상태변화, 증발, 응축, 융해', is_active: true },
          { subject: '과학' as const, grade: '4학년', area: '생물', main_topic: '식물의 구조와 기능', sub_topic: '뿌리, 줄기, 잎의 역할', keywords: '뿌리, 줄기, 잎, 광합성', is_active: true },
        ];
        
        await db.createCurriculumData(defaultData);
        curriculumData = await db.getCurriculumData(filters);
        console.log('기본 교육과정 데이터가 생성되었습니다.');
      } catch (createError) {
        console.error('기본 데이터 생성 실패:', createError);
        // 기본 데이터 생성에 실패해도 빈 배열로 응답
      }
    }

    return NextResponse.json(curriculumData, {
      headers: {
        'X-Data-Source': 'curriculum_data',
        'X-Records-Count': curriculumData.length.toString()
      }
    });

  } catch (error) {
    console.error('Supabase 교육과정 데이터 조회 중 오류:', error);
    
    // 에러 발생 시 기본 fallback 데이터 반환
    const fallbackData = [
      { subject: '사회' as const, grade: '3학년', area: '일반사회', main_topic: '우리나라의 정치', sub_topic: '민주주의와 시민 참여', keywords: '민주주의, 시민 참여, 선거' },
      { subject: '과학' as const, grade: '3학년', area: '물리', main_topic: '물질과 에너지', sub_topic: '자석의 성질', keywords: '자석, 자기력, N극, S극' }
    ];
    
    return NextResponse.json(fallbackData, { 
      status: 200,
      headers: {
        'X-Data-Source': 'fallback',
        'X-Error': error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
} 