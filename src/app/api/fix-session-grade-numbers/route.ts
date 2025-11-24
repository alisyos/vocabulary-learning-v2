import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { dryRun = true } = await request.json();

    console.log('🔧 session_number 및 grade_number 수정 시작...');

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

    // 2. main_topic + sub_topic + grade 조합별로 다수결 값 찾기
    const groupedByKey = new Map<string, any[]>();

    for (const record of allSets) {
      const { main_topic, sub_topic, grade } = record;

      if (!main_topic || !sub_topic || !grade) {
        continue;
      }

      const key = `${main_topic}|||${sub_topic}|||${grade}`;
      if (!groupedByKey.has(key)) {
        groupedByKey.set(key, []);
      }
      groupedByKey.get(key)!.push(record);
    }

    console.log(`📊 ${groupedByKey.size}개 조합 그룹화 완료`);

    // 3. 각 그룹의 다수결 값 계산
    const correctValuesByKey = new Map<string, any>();

    for (const [key, records] of groupedByKey) {
      if (records.length < 2) {
        // 레코드가 1개뿐이면 참조할 수 없음
        continue;
      }

      const sessionNumberCounts = new Map<any, number>();
      const gradeNumberCounts = new Map<any, number>();

      for (const record of records) {
        if (record.session_number) {
          sessionNumberCounts.set(
            record.session_number,
            (sessionNumberCounts.get(record.session_number) || 0) + 1
          );
        }
        if (record.grade_number) {
          gradeNumberCounts.set(
            record.grade_number,
            (gradeNumberCounts.get(record.grade_number) || 0) + 1
          );
        }
      }

      // 다수결로 올바른 값 결정
      const sessionNumbersSorted = Array.from(sessionNumberCounts.entries())
        .sort((a, b) => b[1] - a[1]);
      const gradeNumbersSorted = Array.from(gradeNumberCounts.entries())
        .sort((a, b) => b[1] - a[1]);

      correctValuesByKey.set(key, {
        session_number: sessionNumbersSorted[0]?.[0],
        grade_number: gradeNumbersSorted[0]?.[0],
        sessionNumberDistribution: sessionNumbersSorted,
        gradeNumberDistribution: gradeNumbersSorted
      });
    }

    // 4. 수정이 필요한 레코드 찾기
    const recordsToFix: any[] = [];

    for (const record of allSets) {
      const { id, main_topic, sub_topic, grade, session_number, grade_number } = record;

      if (!main_topic || !sub_topic || !grade) {
        continue;
      }

      const key = `${main_topic}|||${sub_topic}|||${grade}`;
      const correctValues = correctValuesByKey.get(key);

      if (!correctValues) {
        // 참조값이 없으면 스킵
        continue;
      }

      const updates: any = {};
      const current: any = {};

      // session_number 확인
      if (correctValues.session_number && session_number !== correctValues.session_number) {
        updates.session_number = correctValues.session_number;
        current.session_number = session_number;
      }

      // grade_number 확인
      if (correctValues.grade_number && grade_number !== correctValues.grade_number) {
        updates.grade_number = correctValues.grade_number;
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
          updates,
          distribution: {
            session_number: correctValues.sessionNumberDistribution.map((v: any) => ({
              value: v[0],
              count: v[1]
            })),
            grade_number: correctValues.gradeNumberDistribution.map((v: any) => ({
              value: v[0],
              count: v[1]
            }))
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
        recordsToFix: recordsToFix.slice(0, 50) // 최대 50개 샘플
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
      message: `session_number 및 grade_number 수정 완료: ${successCount}개 성공, ${errorCount}개 실패`,
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
