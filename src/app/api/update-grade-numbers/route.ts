import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { dryRun = true } = await request.json();

    console.log(`🔄 grade_number 일괄 업데이트 시작 (dryRun: ${dryRun})`);

    // 1. content_sets에서 session_number가 있는 레코드 조회
    const { data: contentSets, error: contentSetsError } = await supabase
      .from('content_sets')
      .select('id, session_number, grade_number, subject, grade, area, main_topic, sub_topic')
      .not('session_number', 'is', null);

    if (contentSetsError) {
      throw contentSetsError;
    }

    console.log(`📊 차시번호가 있는 콘텐츠 세트: ${contentSets?.length || 0}개`);

    // 빈 문자열 제거 필터링
    const filteredContentSets = contentSets?.filter(item =>
      item.session_number && String(item.session_number).trim() !== ''
    ) || [];

    console.log(`📊 필터링 후: ${filteredContentSets.length}개`);

    if (filteredContentSets.length === 0) {
      return NextResponse.json({
        success: true,
        message: '차시번호가 있는 콘텐츠 세트가 없습니다.',
        dryRun,
        totalRecords: 0,
        updatesNeeded: 0
      });
    }

    // 2. curriculum_data에서 모든 데이터 조회 (session_number와 grade_number 포함)
    const { data: curriculumData, error: curriculumError } = await supabase
      .from('curriculum_data')
      .select('session_number, grade_number, subject, grade, area, main_topic, sub_topic')
      .not('session_number', 'is', null);

    if (curriculumError) {
      throw curriculumError;
    }

    console.log(`📚 curriculum_data 레코드: ${curriculumData?.length || 0}개`);

    // 빈 문자열 제거 필터링
    const filteredCurriculumData = curriculumData?.filter(item =>
      item.session_number && String(item.session_number).trim() !== ''
    ) || [];

    console.log(`📚 필터링 후: ${filteredCurriculumData.length}개`);

    if (filteredCurriculumData.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'curriculum_data에 차시번호 데이터가 없습니다.',
        dryRun
      });
    }

    // 3. 매칭 및 업데이트 준비
    const updates: Array<{
      id: string;
      sessionNumber: string;
      currentGradeNumber: string | null;
      newGradeNumber: string | null;
      needsUpdate: boolean;
      matchInfo?: string;
    }> = [];

    for (const contentSet of filteredContentSets) {
      // curriculum_data에서 매칭되는 레코드 찾기 (session_number로만 매칭)
      const matchedCurriculum = filteredCurriculumData.find(
        (curr) => String(curr.session_number).trim().toLowerCase() === String(contentSet.session_number).trim().toLowerCase()
      );

      const newGradeNumber = matchedCurriculum?.grade_number || null;
      const needsUpdate = contentSet.grade_number !== newGradeNumber && newGradeNumber !== null;

      updates.push({
        id: contentSet.id,
        sessionNumber: contentSet.session_number || '',
        currentGradeNumber: contentSet.grade_number,
        newGradeNumber,
        needsUpdate,
        matchInfo: matchedCurriculum
          ? `${matchedCurriculum.subject} ${matchedCurriculum.grade} ${matchedCurriculum.area} - ${matchedCurriculum.main_topic}`
          : '매칭 안됨'
      });
    }

    const updatesNeeded = updates.filter(u => u.needsUpdate);

    console.log(`✅ 업데이트 필요: ${updatesNeeded.length}개 / 전체: ${updates.length}개`);

    // 4. 드라이런 모드
    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        message: `드라이런 모드: ${updatesNeeded.length}개 레코드가 업데이트됩니다.`,
        totalRecords: filteredContentSets.length,
        updatesNeeded: updatesNeeded.length,
        samples: updatesNeeded.slice(0, 20).map(u => ({
          sessionNumber: u.sessionNumber,
          currentGradeNumber: u.currentGradeNumber || '없음',
          newGradeNumber: u.newGradeNumber || '없음',
          matchInfo: u.matchInfo
        }))
      });
    }

    // 5. 실제 업데이트 (배치 처리)
    let successCount = 0;
    let errorCount = 0;
    const batchSize = 50;

    for (let i = 0; i < updatesNeeded.length; i += batchSize) {
      const batch = updatesNeeded.slice(i, i + batchSize);

      const batchPromises = batch.map(async (update) => {
        const { error } = await supabase
          .from('content_sets')
          .update({ grade_number: update.newGradeNumber })
          .eq('id', update.id);

        if (error) {
          console.error(`❌ 업데이트 실패 (ID: ${update.id}):`, error);
          return { success: false };
        }
        return { success: true };
      });

      const batchResults = await Promise.all(batchPromises);
      successCount += batchResults.filter(r => r.success).length;
      errorCount += batchResults.filter(r => !r.success).length;

      // API 부하 방지를 위한 대기
      if (i + batchSize < updatesNeeded.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log(`📊 진행률: ${i + batch.length}/${updatesNeeded.length} (성공: ${successCount}, 실패: ${errorCount})`);
    }

    console.log(`✅ 업데이트 완료: 성공 ${successCount}개, 실패 ${errorCount}개`);

    return NextResponse.json({
      success: true,
      dryRun: false,
      message: `${successCount}개 레코드가 성공적으로 업데이트되었습니다.`,
      totalRecords: filteredContentSets.length,
      successCount,
      errorCount
    });

  } catch (error) {
    console.error('❌ grade_number 업데이트 오류:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 });
  }
}
