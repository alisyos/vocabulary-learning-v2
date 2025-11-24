import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { db } from '@/lib/supabase';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Helper function to infer division from grade
function inferDivisionFromGrade(grade: string): string {
  const gradeNum = grade.replace(/[^0-9]/g, '');
  const numGrade = parseInt(gradeNum, 10);

  if (numGrade >= 3 && numGrade <= 4) {
    return '초등학교 중학년(3-4학년)';
  } else if (numGrade >= 5 && numGrade <= 6) {
    return '초등학교 고학년(5-6학년)';
  } else if (numGrade >= 1 && numGrade <= 3 && (grade.includes('중') || grade.includes('7') || grade.includes('8') || grade.includes('9'))) {
    return '중학생(1-3학년)';
  }

  // Default fallback
  return '초등학교 중학년(3-4학년)';
}

export async function POST(request: NextRequest) {
  try {
    const { dryRun = true } = await request.json();

    console.log('🚀 누락된 content_set 필드 수정 시작...');
    console.log(`📋 모드: ${dryRun ? '드라이런 (미리보기)' : '실제 업데이트'}`);

    // 1. 모든 content_sets 조회 (페이지네이션)
    let allContentSets: any[] = [];
    let currentPage = 0;
    const pageSize = 1000;
    let hasMoreData = true;

    console.log('📊 content_sets 레코드 조회 중...');

    while (hasMoreData) {
      const { data: pageData, error: fetchError } = await supabase
        .from('content_sets')
        .select('*')
        .range(currentPage * pageSize, (currentPage + 1) * pageSize - 1);

      if (fetchError) {
        console.error('❌ content_sets 조회 실패:', fetchError);
        throw fetchError;
      }

      if (pageData && pageData.length > 0) {
        allContentSets.push(...pageData);
        if (pageData.length < pageSize) hasMoreData = false;
      } else {
        hasMoreData = false;
      }
      currentPage++;
    }

    console.log(`📊 총 ${allContentSets.length}개의 content_sets 레코드 조회 완료`);

    // 2. 누락된 필드가 있는 레코드 필터링
    const recordsWithMissingFields = allContentSets.filter(record => {
      return (
        !record.division ||
        !record.grade_number ||
        !record.session_number ||
        !record.grade ||
        record.grade === '3학년' // 기본값인 경우도 체크
      );
    });

    console.log(`🔍 누락된 필드가 있는 레코드: ${recordsWithMissingFields.length}개`);

    // 3. curriculum_data 전체 조회 (캐싱용)
    console.log('📚 curriculum_data 조회 중...');
    const allCurriculumData = await db.getCurriculumData();
    console.log(`📚 총 ${allCurriculumData.length}개의 curriculum_data 레코드 조회 완료`);

    // 4. 각 레코드에 대해 매칭 및 업데이트 준비
    const updates: any[] = [];

    for (const record of recordsWithMissingFields) {
      if (!record.main_topic || !record.sub_topic) {
        console.log(`⚠️ 레코드 ${record.id}: main_topic 또는 sub_topic 없음 - 건너뜀`);
        continue;
      }

      // curriculum_data에서 매칭되는 레코드 찾기
      const curriculumMatch = allCurriculumData.find(
        (item: any) =>
          item.subject === record.subject &&
          item.area === record.area &&
          item.main_topic === record.main_topic &&
          item.sub_topic === record.sub_topic
      );

      if (!curriculumMatch) {
        console.log(`⚠️ 레코드 ${record.id}: curriculum_data에서 매칭 레코드 없음`);
        updates.push({
          id: record.id,
          title: record.title,
          main_topic: record.main_topic,
          sub_topic: record.sub_topic,
          current: {
            division: record.division,
            grade: record.grade,
            grade_number: record.grade_number,
            session_number: record.session_number
          },
          updated: null,
          needsUpdate: false,
          reason: 'curriculum_data에서 매칭 레코드 없음'
        });
        continue;
      }

      // 업데이트할 값 결정
      const updatedValues: any = {};
      let needsUpdate = false;

      // grade_number
      if (!record.grade_number && curriculumMatch.grade_number) {
        updatedValues.grade_number = curriculumMatch.grade_number;
        needsUpdate = true;
      }

      // session_number
      if (!record.session_number && curriculumMatch.session_number) {
        updatedValues.session_number = curriculumMatch.session_number;
        needsUpdate = true;
      }

      // grade
      if (!record.grade || record.grade === '3학년') {
        if (curriculumMatch.grade) {
          updatedValues.grade = curriculumMatch.grade;
          needsUpdate = true;
        }
      }

      // division - grade로부터 추론
      if (!record.division) {
        const gradeForDivision = updatedValues.grade || record.grade || curriculumMatch.grade || '3학년';
        updatedValues.division = inferDivisionFromGrade(gradeForDivision);
        needsUpdate = true;
      }

      updates.push({
        id: record.id,
        title: record.title,
        main_topic: record.main_topic,
        sub_topic: record.sub_topic,
        current: {
          division: record.division,
          grade: record.grade,
          grade_number: record.grade_number,
          session_number: record.session_number
        },
        updated: needsUpdate ? updatedValues : null,
        needsUpdate,
        reason: needsUpdate ? '업데이트 필요' : '변경 없음'
      });
    }

    const updatesNeeded = updates.filter(u => u.needsUpdate);

    console.log(`✅ 업데이트가 필요한 레코드: ${updatesNeeded.length}개`);

    // 5. 드라이런 모드
    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        message: `드라이런 모드: ${updatesNeeded.length}개 레코드가 업데이트됩니다.`,
        stats: {
          total: allContentSets.length,
          withMissingFields: recordsWithMissingFields.length,
          needsUpdate: updatesNeeded.length
        },
        samples: updatesNeeded.slice(0, 20) // 샘플 20개 제공
      });
    }

    // 6. 실제 업데이트 (배치 처리)
    console.log('💾 실제 업데이트 시작...');
    let successCount = 0;
    let errorCount = 0;
    const errors: any[] = [];
    const batchSize = 50;

    for (let i = 0; i < updatesNeeded.length; i += batchSize) {
      const batch = updatesNeeded.slice(i, i + batchSize);

      console.log(`📦 배치 ${Math.floor(i / batchSize) + 1}/${Math.ceil(updatesNeeded.length / batchSize)} 처리 중... (${batch.length}개)`);

      const batchPromises = batch.map(async (update) => {
        try {
          const { error } = await supabase
            .from('content_sets')
            .update(update.updated)
            .eq('id', update.id);

          if (error) {
            console.error(`❌ 레코드 ${update.id} 업데이트 실패:`, error);
            errors.push({ id: update.id, error: error.message });
            return { success: false };
          }

          return { success: true };
        } catch (err) {
          console.error(`❌ 레코드 ${update.id} 업데이트 중 예외:`, err);
          errors.push({ id: update.id, error: String(err) });
          return { success: false };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      const batchSuccess = batchResults.filter(r => r.success).length;
      const batchErrors = batchResults.filter(r => !r.success).length;

      successCount += batchSuccess;
      errorCount += batchErrors;

      console.log(`✅ 배치 ${Math.floor(i / batchSize) + 1} 완료: 성공 ${batchSuccess}, 실패 ${batchErrors}`);

      // API 부하 방지를 위한 대기
      if (i + batchSize < updatesNeeded.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`🎉 업데이트 완료: 성공 ${successCount}, 실패 ${errorCount}`);

    return NextResponse.json({
      success: true,
      dryRun: false,
      message: `업데이트 완료: ${successCount}개 성공, ${errorCount}개 실패`,
      stats: {
        total: allContentSets.length,
        withMissingFields: recordsWithMissingFields.length,
        needsUpdate: updatesNeeded.length,
        successCount,
        errorCount
      },
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('❌ 일괄 수정 중 오류:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
      details: error instanceof Error ? error.stack : String(error)
    }, { status: 500 });
  }
}
