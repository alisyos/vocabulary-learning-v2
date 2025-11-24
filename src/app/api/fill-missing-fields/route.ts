import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { dryRun = true } = await request.json();

    console.log('📊 누락된 필드 채우기 작업 시작...');

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
        console.log(`  페이지 ${currentPage + 1}: ${pageData.length}개 조회 (누적: ${allSets.length}개)`);
        if (pageData.length < pageSize) hasMoreData = false;
      } else {
        hasMoreData = false;
      }
      currentPage++;
    }

    console.log(`✅ 총 ${allSets.length}개 콘텐츠 세트 조회 완료`);

    // 2. 누락된 필드가 있는 레코드 찾기
    const fieldsToCheck = ['division', 'passage_length', 'text_type', 'session_number', 'grade_number'];

    const recordsWithMissingFields = allSets.filter(record => {
      // 하나라도 누락된 필드가 있으면 true
      return fieldsToCheck.some(field => !record[field] || record[field] === null || record[field] === '');
    });

    console.log(`🔍 누락된 필드가 있는 레코드: ${recordsWithMissingFields.length}개`);

    // 3. main_topic + sub_topic 조합으로 그룹화
    const updates: any[] = [];

    for (const record of recordsWithMissingFields) {
      const { id, main_topic, sub_topic } = record;

      if (!main_topic || !sub_topic) {
        console.log(`⚠️ main_topic 또는 sub_topic이 없는 레코드 건너뜀: ${id}`);
        continue;
      }

      // 같은 main_topic + sub_topic을 가진 다른 레코드 중 필드가 채워진 레코드 찾기
      const referenceRecord = allSets.find(r =>
        r.id !== id && // 자기 자신 제외
        r.main_topic === main_topic &&
        r.sub_topic === sub_topic &&
        // 적어도 하나 이상의 필드가 채워져 있어야 함
        fieldsToCheck.some(field => r[field] && r[field] !== null && r[field] !== '')
      );

      if (!referenceRecord) {
        console.log(`⚠️ 참조할 레코드를 찾을 수 없음: ${main_topic} / ${sub_topic}`);
        continue;
      }

      // 누락된 필드만 채우기
      const updateData: any = {};
      const changes: any = {};

      for (const field of fieldsToCheck) {
        const currentValue = record[field];
        const referenceValue = referenceRecord[field];

        // 현재 레코드에 값이 없고, 참조 레코드에 값이 있으면 채우기
        if ((!currentValue || currentValue === null || currentValue === '') &&
            referenceValue && referenceValue !== null && referenceValue !== '') {
          updateData[field] = referenceValue;
          changes[field] = {
            before: currentValue || '(없음)',
            after: referenceValue
          };
        }
      }

      // 변경할 필드가 있으면 업데이트 목록에 추가
      if (Object.keys(updateData).length > 0) {
        updates.push({
          id,
          main_topic,
          sub_topic,
          updateData,
          changes,
          referenceId: referenceRecord.id
        });
      }
    }

    console.log(`✅ ${updates.length}개 레코드가 업데이트됩니다.`);

    // 4. 드라이런 모드
    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        message: `드라이런 모드: ${updates.length}개 레코드가 업데이트됩니다.`,
        totalRecords: allSets.length,
        recordsWithMissingFields: recordsWithMissingFields.length,
        recordsToUpdate: updates.length,
        samples: updates.slice(0, 20) // 최대 20개 샘플
      });
    }

    // 5. 실제 업데이트
    let successCount = 0;
    let errorCount = 0;

    console.log(`🔄 ${updates.length}개 레코드 업데이트 시작...`);

    for (const update of updates) {
      try {
        const { error } = await supabase
          .from('content_sets')
          .update(update.updateData)
          .eq('id', update.id);

        if (error) {
          console.error(`❌ 레코드 ${update.id} 업데이트 실패:`, error);
          errorCount++;
        } else {
          console.log(`✅ 레코드 ${update.id} 업데이트 성공`);
          successCount++;
        }

        // API 부하 방지를 위한 대기 (100ms)
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (err) {
        console.error(`❌ 레코드 ${update.id} 업데이트 예외:`, err);
        errorCount++;
      }
    }

    console.log(`✅ 완료 - 성공: ${successCount}, 실패: ${errorCount}`);

    return NextResponse.json({
      success: true,
      dryRun: false,
      message: `누락된 필드 채우기 완료: ${successCount}개 성공, ${errorCount}개 실패`,
      successCount,
      errorCount,
      totalProcessed: updates.length
    });

  } catch (error) {
    console.error('누락된 필드 채우기 오류:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 });
  }
}
