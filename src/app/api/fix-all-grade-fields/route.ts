import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Grade별 올바른 필드 값 정의
const CORRECT_VALUES_BY_GRADE: Record<string, any> = {
  '중1': { division: '중학생(1-3학년)', passage_length: '2개의 지문 생성. 지문당 500자 내외 - 총 1,000자', text_type: '설명문' },
  '중2': { division: '중학생(1-3학년)', passage_length: '2개의 지문 생성. 지문당 500자 내외 - 총 1,000자', text_type: '설명문' },
  '중3': { division: '중학생(1-3학년)', passage_length: '2개의 지문 생성. 지문당 500자 내외 - 총 1,000자', text_type: '설명문' },
  '초3': { division: '초등학교 중학년(3-4학년)', passage_length: '2개의 지문 생성. 지문당 300자 내외 - 총 600자', text_type: '기행문' },
  '초4': { division: '초등학교 중학년(3-4학년)', passage_length: '2개의 지문 생성. 지문당 300자 내외 - 총 600자', text_type: '기행문' },
  '초5': { division: '초등학교 고학년(5-6학년)', passage_length: '2개의 지문 생성. 지문당 400자 내외 - 총 800자', text_type: '논설문' },
  '초6': { division: '초등학교 고학년(5-6학년)', passage_length: '2개의 지문 생성. 지문당 400자 내외 - 총 800자', text_type: '논설문' }
};

export async function POST(request: NextRequest) {
  try {
    const { dryRun = true } = await request.json();

    console.log('🔧 전체 필드 값 수정 시작 (division, passage_length, text_type, session_number, grade_number)...');

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

    // 2. main_topic + sub_topic + grade 조합별로 참조값 찾기
    const referenceValues = new Map<string, any>();

    for (const record of allSets) {
      const { main_topic, sub_topic, grade, division, passage_length, text_type, session_number, grade_number } = record;

      if (!main_topic || !sub_topic || !grade || !CORRECT_VALUES_BY_GRADE[grade]) {
        continue;
      }

      const key = `${main_topic}|||${sub_topic}|||${grade}`;
      const correctValues = CORRECT_VALUES_BY_GRADE[grade];

      // 올바른 division, passage_length, text_type을 가진 레코드만 참조값으로 사용
      if (division === correctValues.division &&
          passage_length === correctValues.passage_length &&
          text_type === correctValues.text_type) {

        if (!referenceValues.has(key)) {
          referenceValues.set(key, {
            session_numbers: new Map<any, number>(),
            grade_numbers: new Map<any, number>()
          });
        }

        const ref = referenceValues.get(key)!;

        // session_number 카운트
        if (session_number) {
          ref.session_numbers.set(session_number, (ref.session_numbers.get(session_number) || 0) + 1);
        }

        // grade_number 카운트
        if (grade_number) {
          ref.grade_numbers.set(grade_number, (ref.grade_numbers.get(grade_number) || 0) + 1);
        }
      }
    }

    console.log(`📊 ${referenceValues.size}개 조합의 참조값 계산 완료`);

    // 3. 각 조합의 최빈값 결정
    const correctValuesByKey = new Map<string, any>();

    for (const [key, ref] of referenceValues) {
      const sessionNumbersSorted = Array.from(ref.session_numbers.entries())
        .sort((a, b) => b[1] - a[1]);
      const gradeNumbersSorted = Array.from(ref.grade_numbers.entries())
        .sort((a, b) => b[1] - a[1]);

      correctValuesByKey.set(key, {
        session_number: sessionNumbersSorted[0]?.[0],
        grade_number: gradeNumbersSorted[0]?.[0]
      });
    }

    // 4. 잘못된 값을 가진 레코드 찾기
    const recordsToFix: any[] = [];

    for (const record of allSets) {
      const { id, grade, main_topic, sub_topic, division, passage_length, text_type, session_number, grade_number } = record;

      if (!grade || !CORRECT_VALUES_BY_GRADE[grade]) {
        continue;
      }

      const key = `${main_topic}|||${sub_topic}|||${grade}`;
      const correctBasicValues = CORRECT_VALUES_BY_GRADE[grade];
      const correctSpecificValues = correctValuesByKey.get(key);

      const updates: any = {};
      const current: any = {};

      // division 확인
      if (division !== correctBasicValues.division) {
        updates.division = correctBasicValues.division;
        current.division = division;
      }

      // passage_length 확인
      if (passage_length !== correctBasicValues.passage_length) {
        updates.passage_length = correctBasicValues.passage_length;
        current.passage_length = passage_length;
      }

      // text_type 확인
      if (text_type !== correctBasicValues.text_type) {
        updates.text_type = correctBasicValues.text_type;
        current.text_type = text_type;
      }

      // session_number 확인 (참조값이 있을 경우만)
      if (correctSpecificValues?.session_number && session_number !== correctSpecificValues.session_number) {
        updates.session_number = correctSpecificValues.session_number;
        current.session_number = session_number;
      }

      // grade_number 확인 (참조값이 있을 경우만)
      if (correctSpecificValues?.grade_number && grade_number !== correctSpecificValues.grade_number) {
        updates.grade_number = correctSpecificValues.grade_number;
        current.grade_number = grade_number;
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

    // 5. 드라이런 모드
    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        message: `드라이런 모드: ${recordsToFix.length}개 레코드가 수정됩니다.`,
        totalRecordsToFix: recordsToFix.length,
        recordsToFix: recordsToFix.slice(0, 100) // 최대 100개 샘플
      });
    }

    // 6. 실제 수정
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
          console.log(`✅ 레코드 ${record.id} 수정 성공`);
          successCount++;
        }

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
      message: `전체 필드 값 수정 완료: ${successCount}개 성공, ${errorCount}개 실패`,
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
