import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Grade별 올바른 필드 값 정의
const CORRECT_VALUES_BY_GRADE: Record<string, any> = {
  '중1': {
    division: '중학생(1-3학년)',
    passage_length: '2개의 지문 생성. 지문당 500자 내외 - 총 1,000자',
    text_type: '설명문'
  },
  '중2': {
    division: '중학생(1-3학년)',
    passage_length: '2개의 지문 생성. 지문당 500자 내외 - 총 1,000자',
    text_type: '설명문'
  },
  '중3': {
    division: '중학생(1-3학년)',
    passage_length: '2개의 지문 생성. 지문당 500자 내외 - 총 1,000자',
    text_type: '설명문'
  },
  '초3': {
    division: '초등학교 중학년(3-4학년)',
    passage_length: '2개의 지문 생성. 지문당 300자 내외 - 총 600자',
    text_type: '기행문'
  },
  '초4': {
    division: '초등학교 중학년(3-4학년)',
    passage_length: '2개의 지문 생성. 지문당 300자 내외 - 총 600자',
    text_type: '기행문'
  },
  '초5': {
    division: '초등학교 고학년(5-6학년)',
    passage_length: '2개의 지문 생성. 지문당 400자 내외 - 총 800자',
    text_type: '논설문'
  },
  '초6': {
    division: '초등학교 고학년(5-6학년)',
    passage_length: '2개의 지문 생성. 지문당 400자 내외 - 총 800자',
    text_type: '논설문'
  }
};

export async function POST(request: NextRequest) {
  try {
    const { dryRun = true } = await request.json();

    console.log('🔧 Grade별 필드 값 수정 시작...');

    // 1. 모든 content_sets 조회
    let allSets: any[] = [];
    let currentPage = 0;
    const pageSize = 1000;
    let hasMoreData = true;

    while (hasMoreData) {
      const { data: pageData, error: fetchError } = await supabase
        .from('content_sets')
        .select('*')
        .range(currentPage * pageSize, (currentPage + 1) * pageSize - 1);

      if (fetchError) throw fetchError;

      if (pageData && pageData.length > 0) {
        allSets.push(...pageData);
        if (pageData.length < pageSize) hasMoreData = false;
      } else {
        hasMoreData = false;
      }
      currentPage++;
    }

    console.log(`✅ 총 ${allSets.length}개 콘텐츠 세트 조회 완료`);

    // 2. 잘못된 값을 가진 레코드 찾기
    const recordsToFix: any[] = [];

    for (const record of allSets) {
      const { id, grade, division, passage_length, text_type, main_topic, sub_topic } = record;

      if (!grade || !CORRECT_VALUES_BY_GRADE[grade]) {
        continue;
      }

      const correctValues = CORRECT_VALUES_BY_GRADE[grade];
      const updates: any = {};
      const current: any = {};

      // division 확인
      if (division !== correctValues.division) {
        updates.division = correctValues.division;
        current.division = division;
      }

      // passage_length 확인
      if (passage_length !== correctValues.passage_length) {
        updates.passage_length = correctValues.passage_length;
        current.passage_length = passage_length;
      }

      // text_type 확인
      if (text_type !== correctValues.text_type) {
        updates.text_type = correctValues.text_type;
        current.text_type = text_type;
      }

      // 수정이 필요한 필드가 있으면 기록
      if (Object.keys(updates).length > 0) {
        recordsToFix.push({
          id,
          grade,
          main_topic,
          sub_topic,
          title: record.title,
          current,
          updates
        });
      }
    }

    console.log(`⚠️ ${recordsToFix.length}개 레코드 수정 필요`);

    // 3. 드라이런 모드
    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        message: `드라이런 모드: ${recordsToFix.length}개 레코드가 수정됩니다.`,
        recordsToFix: recordsToFix.slice(0, 50) // 최대 50개 샘플
      });
    }

    // 4. 실제 수정
    let successCount = 0;
    let errorCount = 0;

    console.log(`🔄 ${recordsToFix.length}개 레코드 수정 시작...`);

    for (const record of recordsToFix) {
      try {
        const { error } = await supabase
          .from('content_sets')
          .update(record.updates)
          .eq('id', record.id);

        if (error) {
          console.error(`❌ 레코드 ${record.id} 수정 실패:`, error);
          errorCount++;
        } else {
          console.log(`✅ 레코드 ${record.id} 수정 성공 (grade: ${record.grade})`);
          successCount++;
        }

        // API 부하 방지
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (err) {
        console.error(`❌ 레코드 ${record.id} 수정 예외:`, err);
        errorCount++;
      }
    }

    console.log(`✅ 완료 - 성공: ${successCount}, 실패: ${errorCount}`);

    return NextResponse.json({
      success: true,
      dryRun: false,
      message: `필드 값 수정 완료: ${successCount}개 성공, ${errorCount}개 실패`,
      successCount,
      errorCount,
      totalProcessed: recordsToFix.length
    });

  } catch (error) {
    console.error('필드 값 수정 오류:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 });
  }
}
