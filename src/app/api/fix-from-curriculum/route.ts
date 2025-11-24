import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { dryRun = true } = await request.json();

    console.log('🔧 curriculum_data 기반 필드 값 수정 시작...');

    // 1. curriculum_data에서 모든 참조 데이터 조회
    const { data: curriculumData, error: curriculumError } = await supabase
      .from('curriculum_data')
      .select('*');

    if (curriculumError) throw curriculumError;

    console.log(`✅ curriculum_data에서 ${curriculumData.length}개 참조 데이터 조회 완료`);

    // 2. curriculum_data를 grade + main_topic + sub_topic 키로 인덱싱
    const curriculumMap = new Map<string, any>();

    for (const item of curriculumData) {
      const key = `${item.grade}|||${item.main_topic}|||${item.sub_topic}`;
      curriculumMap.set(key, item);
    }

    console.log(`📊 ${curriculumMap.size}개 참조 조합 생성 완료`);

    // 3. content_sets 조회
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

    // 4. curriculum_data와 매칭하여 수정이 필요한 레코드 찾기
    const recordsToFix: any[] = [];
    const fieldsToCheck = ['division', 'passage_length', 'text_type', 'session_number', 'grade_number'];

    for (const record of allSets) {
      const { id, grade, main_topic, sub_topic } = record;

      if (!grade || !main_topic || !sub_topic) {
        continue;
      }

      const key = `${grade}|||${main_topic}|||${sub_topic}`;
      const reference = curriculumMap.get(key);

      if (!reference) {
        // curriculum_data에 매칭되는 데이터가 없으면 스킵
        continue;
      }

      const updates: any = {};
      const current: any = {};

      // 각 필드 비교
      for (const field of fieldsToCheck) {
        const currentValue = record[field];
        const referenceValue = reference[field];

        if (currentValue !== referenceValue && referenceValue !== undefined && referenceValue !== null) {
          updates[field] = referenceValue;
          current[field] = currentValue;
        }
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
          updates,
          reference: {
            division: reference.division,
            passage_length: reference.passage_length,
            text_type: reference.text_type,
            session_number: reference.session_number,
            grade_number: reference.grade_number
          }
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
      message: `curriculum_data 기반 수정 완료: ${successCount}개 성공, ${errorCount}개 실패`,
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
