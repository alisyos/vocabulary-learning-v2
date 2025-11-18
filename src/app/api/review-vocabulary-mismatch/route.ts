import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { dryRun = true, statuses = [], sessionRange = null } = await request.json();

    // 1. 상태별 필터링하여 content_set_id 조회 (페이지네이션 적용)
    let allSets: any[] = [];
    let currentPage = 0;
    const pageSize = 1000;
    let hasMoreData = true;

    console.log(`📊 검수 시작 - 상태: ${statuses.join(', ')}, 차시: ${sessionRange ? `${sessionRange.start}-${sessionRange.end}` : '전체'}`);

    while (hasMoreData) {
      let query = supabase
        .from('content_sets')
        .select('id, session_number, status')
        .range(currentPage * pageSize, (currentPage + 1) * pageSize - 1);

      // 상태 필터링을 DB 레벨에서 수행
      if (statuses && statuses.length > 0) {
        query = query.in('status', statuses);
      }

      const { data: pageData, error: setsError } = await query;
      if (setsError) throw setsError;

      if (pageData && pageData.length > 0) {
        allSets.push(...pageData);
        console.log(`  페이지 ${currentPage + 1}: ${pageData.length}개 조회 (누적: ${allSets.length}개)`);
        if (pageData.length < pageSize) hasMoreData = false;
      } else {
        hasMoreData = false;
      }
      currentPage++;
    }

    // 차시 범위 필터링 (JavaScript에서 수행)
    let filteredSets = allSets;
    if (sessionRange && sessionRange.start && sessionRange.end) {
      filteredSets = filteredSets.filter(set => {
        if (!set.session_number) return false;

        // session_number가 숫자인 경우 파싱
        const sessionNum = parseInt(set.session_number, 10);
        if (!isNaN(sessionNum)) {
          return sessionNum >= sessionRange.start && sessionNum <= sessionRange.end;
        }

        return false;
      });
      console.log(`  차시 필터링 후: ${filteredSets.length}개`);
    }

    const contentSetIds = filteredSets.map(s => s.id);

    // 디버깅용 특정 content_set_id 확인
    const DEBUG_CONTENT_SET_ID = '0cc5163d-b12c-43c9-83a8-cbf35b41a1d6';
    const debugSet = filteredSets.find(s => s.id === DEBUG_CONTENT_SET_ID);
    if (debugSet) {
      console.log(`\n🔍 [디버깅] 특정 content_set 발견:`);
      console.log(`  - ID: ${debugSet.id}`);
      console.log(`  - 상태: ${debugSet.status}`);
      console.log(`  - 차시: ${debugSet.session_number}`);
    } else {
      console.log(`\n⚠️ [디버깅] content_set_id ${DEBUG_CONTENT_SET_ID}가 필터링에서 제외됨`);
      const originalSet = allSets.find(s => s.id === DEBUG_CONTENT_SET_ID);
      if (originalSet) {
        console.log(`  - 상태: ${originalSet.status} (필터: ${statuses.join(', ')})`);
        console.log(`  - 차시: ${originalSet.session_number} (범위: ${sessionRange ? `${sessionRange.start}-${sessionRange.end}` : '전체'})`);
      } else {
        console.log(`  - 전체 데이터에서도 찾을 수 없음 (DB에 없거나 상태 필터에서 제외됨)`);
      }
    }

    if (contentSetIds.length === 0) {
      return NextResponse.json({
        success: true,
        dryRun,
        message: `검수 대상이 없습니다.`,
        samples: []
      });
    }

    console.log(`📝 총 ${contentSetIds.length}개 콘텐츠 세트의 어휘 불일치 검사 시작`);

    // 2. vocabulary_terms와 vocabulary_questions를 배치로 조회 (페이지네이션 적용)
    const chunkSize = 100;
    let allTerms: any[] = [];
    let allQuestions: any[] = [];

    // vocabulary_terms 배치 조회
    console.log(`📚 어휘 용어 조회 중...`);
    for (let i = 0; i < contentSetIds.length; i += chunkSize) {
      const chunk = contentSetIds.slice(i, i + chunkSize);

      let pageNum = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('vocabulary_terms')
          .select('content_set_id, term')
          .in('content_set_id', chunk)
          .range(pageNum * 1000, (pageNum + 1) * 1000 - 1);

        if (error) throw error;

        if (data && data.length > 0) {
          allTerms.push(...data);
          if (data.length < 1000) hasMore = false;
        } else {
          hasMore = false;
        }
        pageNum++;
      }

      console.log(`  청크 ${Math.floor(i / chunkSize) + 1}/${Math.ceil(contentSetIds.length / chunkSize)}: ${allTerms.length}개 누적`);
    }

    console.log(`📄 총 ${allTerms.length}개 어휘 용어 조회 완료`);

    // 디버깅: 특정 content_set_id의 terms 확인
    const debugTerms = allTerms.filter(t => t.content_set_id === DEBUG_CONTENT_SET_ID);
    console.log(`\n🔍 [디버깅] content_set_id ${DEBUG_CONTENT_SET_ID}의 어휘 용어: ${debugTerms.length}개`);
    if (debugTerms.length > 0) {
      console.log(`  - terms: [${debugTerms.map(t => `"${t.term}"`).join(', ')}]`);
    }

    // vocabulary_questions 배치 조회
    console.log(`\n❓ 어휘 문제 조회 중...`);
    for (let i = 0; i < contentSetIds.length; i += chunkSize) {
      const chunk = contentSetIds.slice(i, i + chunkSize);

      let pageNum = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('vocabulary_questions')
          .select('id, content_set_id, term, question_number')
          .in('content_set_id', chunk)
          .range(pageNum * 1000, (pageNum + 1) * 1000 - 1);

        if (error) throw error;

        if (data && data.length > 0) {
          allQuestions.push(...data);
          if (data.length < 1000) hasMore = false;
        } else {
          hasMore = false;
        }
        pageNum++;
      }

      console.log(`  청크 ${Math.floor(i / chunkSize) + 1}/${Math.ceil(contentSetIds.length / chunkSize)}: ${allQuestions.length}개 누적`);
    }

    console.log(`📄 총 ${allQuestions.length}개 어휘 문제 조회 완료`);

    // 디버깅: 특정 content_set_id의 questions 확인
    const debugQuestions = allQuestions.filter(q => q.content_set_id === DEBUG_CONTENT_SET_ID);
    console.log(`\n🔍 [디버깅] content_set_id ${DEBUG_CONTENT_SET_ID}의 어휘 문제: ${debugQuestions.length}개`);
    if (debugQuestions.length > 0) {
      console.log(`  - question terms: [${debugQuestions.map(q => `"${q.term}"`).join(', ')}]`);
      const hasJeongbo = debugQuestions.some(q => q.term === '정보');
      console.log(`  - "정보" 어휘 문제 존재: ${hasJeongbo}`);
    }

    // 3. content_set_id별로 terms를 Map으로 구성
    const termsMap = new Map<string, Set<string>>();
    for (const term of allTerms) {
      if (!termsMap.has(term.content_set_id)) {
        termsMap.set(term.content_set_id, new Set());
      }
      termsMap.get(term.content_set_id)!.add(term.term);
    }

    console.log(`\n🔍 불일치 검사 중...`);

    // 4. 각 question의 term이 해당 content_set의 terms에 있는지 확인
    const mismatches: any[] = [];

    for (const question of allQuestions) {
      const termSet = termsMap.get(question.content_set_id);

      // 디버깅: 특정 content_set_id 상세 로그
      if (question.content_set_id === DEBUG_CONTENT_SET_ID) {
        console.log(`\n🔍 [디버깅] content_set_id: ${DEBUG_CONTENT_SET_ID}`);
        console.log(`  - question.term: "${question.term}" (길이: ${question.term?.length})`);
        console.log(`  - termSet 존재 여부: ${!!termSet}`);
        if (termSet) {
          console.log(`  - termSet 내용: [${Array.from(termSet).join(', ')}]`);
          console.log(`  - termSet.has("${question.term}"): ${termSet.has(question.term)}`);

          // 공백이나 특수문자 확인
          const trimmedTerm = question.term?.trim();
          console.log(`  - 트림된 term: "${trimmedTerm}"`);
          console.log(`  - termSet.has(trimmedTerm): ${termSet.has(trimmedTerm)}`);

          // 유사한 term 찾기
          if (question.term) {
            const similarTerms = Array.from(termSet).filter(t =>
              t.includes(question.term) || question.term.includes(t)
            );
            if (similarTerms.length > 0) {
              console.log(`  - 유사한 term: [${similarTerms.join(', ')}]`);
            }
          }
        }
      }

      // 해당 content_set에 대한 terms가 없거나, term이 Set에 없는 경우
      if (!termSet || !termSet.has(question.term)) {
        mismatches.push({
          content_set_id: question.content_set_id,
          question_id: question.id,
          question_number: question.question_number,
          term: question.term,
          reason: `어휘 테이블에 '${question.term}'이(가) 없음`
        });

        // 디버깅: 특정 content_set_id의 불일치 케이스
        if (question.content_set_id === DEBUG_CONTENT_SET_ID) {
          console.log(`  ⚠️ [불일치 감지] 이 문제는 mismatches에 추가됨`);
        }
      }
    }

    console.log(`✅ ${mismatches.length}개의 불일치 문제 발견`);

    // 5. 드라이런 모드
    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        message: `드라이런 모드: ${mismatches.length}개의 불일치 문제가 발견되었습니다.`,
        totalChecked: contentSetIds.length,
        mismatchCount: mismatches.length,
        samples: mismatches.slice(0, 20)
      });
    }

    // 6. 실제 실행 - 불일치 문제 삭제
    let successCount = 0;
    let errorCount = 0;
    const batchSize = 100;

    const questionIdsToDelete = mismatches.map(m => m.question_id);

    console.log(`🗑️ ${questionIdsToDelete.length}개 불일치 문제 삭제 시작`);

    for (let i = 0; i < questionIdsToDelete.length; i += batchSize) {
      const batch = questionIdsToDelete.slice(i, i + batchSize);

      const batchPromises = batch.map(async (questionId) => {
        try {
          const { error } = await supabase
            .from('vocabulary_questions')
            .delete()
            .eq('id', questionId);

          return error ? { success: false } : { success: true };
        } catch (err) {
          console.error(`Error deleting question ${questionId}:`, err);
          return { success: false };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      successCount += batchResults.filter(r => r.success).length;
      errorCount += batchResults.filter(r => !r.success).length;

      // API 부하 방지를 위한 대기
      if (i + batchSize < questionIdsToDelete.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`✅ 완료 - 삭제 성공: ${successCount}, 실패: ${errorCount}`);

    return NextResponse.json({
      success: true,
      dryRun: false,
      message: `어휘 불일치 검수 완료: ${successCount}개 삭제됨, ${errorCount}개 실패`,
      successCount,
      errorCount,
      totalProcessed: mismatches.length
    });

  } catch (error) {
    console.error('어휘 불일치 검수 오류:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 });
  }
}
