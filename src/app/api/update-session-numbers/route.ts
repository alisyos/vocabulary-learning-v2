import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * curriculum_data 테이블의 sub_topic과 session_number를 기준으로
 * content_sets 테이블의 session_number 필드를 일괄 업데이트
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { dryRun = true } = body; // 기본값: 미리보기 모드

    console.log(`🔄 차시 번호 업데이트 시작 (${dryRun ? '미리보기 모드' : '실제 업데이트 모드'})`);

    // 1. curriculum_data에서 sub_topic → session_number 매핑 조회
    const { data: curriculumData, error: curriculumError } = await supabase
      .from('curriculum_data')
      .select('sub_topic, session_number')
      .not('session_number', 'is', null);

    if (curriculumError) {
      console.error('❌ curriculum_data 조회 실패:', curriculumError);
      throw curriculumError;
    }

    console.log(`📚 curriculum_data에서 ${curriculumData?.length || 0}개의 매핑 발견`);

    // sub_topic → session_number 맵 생성
    const sessionMap = new Map<string, string>();
    curriculumData?.forEach((item) => {
      if (item.sub_topic && item.session_number) {
        sessionMap.set(item.sub_topic, item.session_number);
      }
    });

    console.log(`🗺️ 생성된 매핑: ${sessionMap.size}개`);

    // 2. content_sets에서 session_number가 NULL인 레코드 조회
    const { data: contentSets, error: contentSetsError } = await supabase
      .from('content_sets')
      .select('id, sub_topic, session_number, title, grade, subject, area')
      .is('session_number', null);

    if (contentSetsError) {
      console.error('❌ content_sets 조회 실패:', contentSetsError);
      throw contentSetsError;
    }

    console.log(`📋 업데이트 대상 콘텐츠 세트: ${contentSets?.length || 0}개`);

    // 3. 매칭 및 업데이트 준비
    const updateTargets: Array<{
      id: string;
      sub_topic: string;
      session_number: string;
      title: string;
      grade: string;
      subject: string;
      area: string;
    }> = [];

    const noMatchRecords: Array<{
      id: string;
      sub_topic: string;
      title: string;
      reason: string;
    }> = [];

    contentSets?.forEach((contentSet) => {
      const subTopic = contentSet.sub_topic;

      if (!subTopic || subTopic.trim() === '') {
        noMatchRecords.push({
          id: contentSet.id,
          sub_topic: subTopic || '',
          title: contentSet.title,
          reason: 'sub_topic이 비어있음'
        });
        return;
      }

      const sessionNumber = sessionMap.get(subTopic);

      if (sessionNumber) {
        updateTargets.push({
          id: contentSet.id,
          sub_topic: subTopic,
          session_number: sessionNumber,
          title: contentSet.title,
          grade: contentSet.grade,
          subject: contentSet.subject,
          area: contentSet.area
        });
      } else {
        noMatchRecords.push({
          id: contentSet.id,
          sub_topic: subTopic,
          title: contentSet.title,
          reason: 'curriculum_data에 해당 sub_topic 없음'
        });
      }
    });

    console.log(`✅ 매칭 성공: ${updateTargets.length}개`);
    console.log(`⚠️ 매칭 실패: ${noMatchRecords.length}개`);

    // 4. 드라이런 모드인 경우 미리보기만 반환
    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        message: '미리보기 모드 - 실제 업데이트는 수행되지 않았습니다.',
        statistics: {
          totalChecked: contentSets?.length || 0,
          canUpdate: updateTargets.length,
          noMatch: noMatchRecords.length,
          alreadySet: 0 // NULL인 것만 조회했으므로 0
        },
        preview: {
          updateTargets: updateTargets.slice(0, 10), // 첫 10개만 미리보기
          noMatch: noMatchRecords.slice(0, 10) // 첫 10개만 미리보기
        },
        details: {
          totalUpdateTargets: updateTargets.length,
          totalNoMatch: noMatchRecords.length
        }
      });
    }

    // 5. 실제 업데이트 수행 (트랜잭션)
    console.log('💾 실제 업데이트 시작...');

    const updateResults = [];
    const updateErrors = [];

    for (const target of updateTargets) {
      try {
        const { error: updateError } = await supabase
          .from('content_sets')
          .update({
            session_number: target.session_number,
            updated_at: new Date().toISOString()
          })
          .eq('id', target.id);

        if (updateError) {
          console.error(`❌ 업데이트 실패 (ID: ${target.id}):`, updateError);
          updateErrors.push({
            id: target.id,
            sub_topic: target.sub_topic,
            error: updateError.message
          });
        } else {
          updateResults.push(target.id);
          console.log(`✅ 업데이트 성공: ${target.title} (차시: ${target.session_number})`);
        }
      } catch (err) {
        console.error(`💥 예외 발생 (ID: ${target.id}):`, err);
        updateErrors.push({
          id: target.id,
          sub_topic: target.sub_topic,
          error: err instanceof Error ? err.message : 'Unknown error'
        });
      }
    }

    console.log(`🎉 업데이트 완료: ${updateResults.length}개 성공, ${updateErrors.length}개 실패`);

    // 6. 결과 반환
    return NextResponse.json({
      success: true,
      dryRun: false,
      message: `차시 번호 업데이트 완료: ${updateResults.length}개 성공, ${updateErrors.length}개 실패`,
      statistics: {
        totalChecked: contentSets?.length || 0,
        updated: updateResults.length,
        failed: updateErrors.length,
        noMatch: noMatchRecords.length,
        alreadySet: 0
      },
      details: {
        updated: updateResults,
        errors: updateErrors,
        noMatch: noMatchRecords.slice(0, 20) // 최대 20개만 반환
      }
    });

  } catch (error) {
    console.error('💥 차시 번호 업데이트 중 오류:', error);

    return NextResponse.json({
      success: false,
      message: '차시 번호 업데이트 중 오류가 발생했습니다.',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * GET 요청: 현재 상태 확인
 */
export async function GET() {
  try {
    // 1. 전체 content_sets 수
    const { count: totalCount, error: totalError } = await supabase
      .from('content_sets')
      .select('*', { count: 'exact', head: true });

    if (totalError) throw totalError;

    // 2. session_number가 NULL인 수
    const { count: nullCount, error: nullError } = await supabase
      .from('content_sets')
      .select('*', { count: 'exact', head: true })
      .is('session_number', null);

    if (nullError) throw nullError;

    // 3. session_number가 설정된 수
    const { count: setCount, error: setError } = await supabase
      .from('content_sets')
      .select('*', { count: 'exact', head: true })
      .not('session_number', 'is', null);

    if (setError) throw setError;

    // 4. curriculum_data의 매핑 수
    const { count: mappingCount, error: mappingError } = await supabase
      .from('curriculum_data')
      .select('*', { count: 'exact', head: true })
      .not('session_number', 'is', null);

    if (mappingError) throw mappingError;

    return NextResponse.json({
      success: true,
      message: '차시 번호 상태 조회 완료',
      statistics: {
        totalContentSets: totalCount || 0,
        withSessionNumber: setCount || 0,
        withoutSessionNumber: nullCount || 0,
        curriculumMappings: mappingCount || 0
      },
      recommendation: (nullCount || 0) > 0
        ? `${nullCount}개의 콘텐츠 세트에 차시 번호가 없습니다. 업데이트를 권장합니다.`
        : '모든 콘텐츠 세트에 차시 번호가 설정되어 있습니다.'
    });

  } catch (error) {
    console.error('❌ 상태 조회 실패:', error);

    return NextResponse.json({
      success: false,
      message: '상태 조회 중 오류가 발생했습니다.',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
