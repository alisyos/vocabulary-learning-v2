import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// 큰따옴표를 작은따옴표로 변환하는 함수
// 모든 종류의 큰따옴표를 일반 작은따옴표(')로 변환
function convertDoubleToSingleQuotes(text: string): string {
  if (!text) return text;

  // 다양한 큰따옴표 유형들
  // U+0022 ("), U+201C ("), U+201D ("), U+201E („), U+201F (‟)
  // 일반 작은따옴표(')로 변환
  return text
    .replace(/\u0022/g, "'")  // " -> '
    .replace(/\u201C/g, "'")  // " -> '
    .replace(/\u201D/g, "'")  // " -> '
    .replace(/\u201E/g, "'")  // „ -> '
    .replace(/\u201F/g, "'"); // ‟ -> '
}

// 큰따옴표가 있는지 확인하는 함수
function hasDoubleQuotes(text: string): boolean {
  if (!text) return false;
  return /[\u0022\u201C\u201D\u201E\u201F]/.test(text);
}

// 테이블별 질문 데이터를 조회하는 헬퍼 함수
async function fetchQuestionsFromTable(
  tableName: string,
  contentSetIds: string[],
  chunkSize: number = 100
): Promise<any[]> {
  const allQuestions: any[] = [];

  for (let i = 0; i < contentSetIds.length; i += chunkSize) {
    const chunk = contentSetIds.slice(i, i + chunkSize);
    let pageNum = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
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
  }

  return allQuestions;
}

export async function POST(request: NextRequest) {
  try {
    const { dryRun = true, statuses = [], sessionRange = null } = await request.json();

    // 1. 상태별 필터링하여 content_set_id 조회 (페이지네이션 적용)
    let allSets: any[] = [];
    let currentPage = 0;
    const pageSize = 1000;
    let hasMoreData = true;

    console.log(`📊 해설 큰따옴표 검수 시작 - 상태: ${statuses.join(', ')}, 차시: ${sessionRange ? `${sessionRange.start}-${sessionRange.end}` : '전체'}`);

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

    if (contentSetIds.length === 0) {
      return NextResponse.json({
        success: true,
        dryRun,
        message: `검수 대상이 없습니다. (상태: ${statuses.join(', ')})`,
        samples: []
      });
    }

    console.log(`📝 총 ${contentSetIds.length}개 콘텐츠 세트의 문제 조회 시작`);

    // 2. 세 테이블에서 해당 content_set_id의 모든 레코드 조회
    console.log(`  어휘문제(vocabulary_questions) 조회 중...`);
    const vocabularyQuestions = await fetchQuestionsFromTable('vocabulary_questions', contentSetIds);
    console.log(`  → ${vocabularyQuestions.length}개 조회`);

    console.log(`  문단문제(paragraph_questions) 조회 중...`);
    const paragraphQuestions = await fetchQuestionsFromTable('paragraph_questions', contentSetIds);
    console.log(`  → ${paragraphQuestions.length}개 조회`);

    console.log(`  종합문제(comprehensive_questions) 조회 중...`);
    const comprehensiveQuestions = await fetchQuestionsFromTable('comprehensive_questions', contentSetIds);
    console.log(`  → ${comprehensiveQuestions.length}개 조회`);

    const totalQuestions = vocabularyQuestions.length + paragraphQuestions.length + comprehensiveQuestions.length;
    console.log(`📄 총 ${totalQuestions}개 문제 조회 완료`);

    if (totalQuestions === 0) {
      return NextResponse.json({
        success: true,
        dryRun,
        message: '검수 대상 문제가 없습니다.',
        samples: []
      });
    }

    // 3. 각 문제의 explanation 필드에서 큰따옴표 검사 및 변환
    const vocabularyUpdates: any[] = [];
    const paragraphUpdates: any[] = [];
    const comprehensiveUpdates: any[] = [];

    // 어휘문제 검사
    for (const question of vocabularyQuestions) {
      const original = question.explanation;
      if (!original || !hasDoubleQuotes(original)) continue;

      const converted = convertDoubleToSingleQuotes(original);
      if (original !== converted) {
        vocabularyUpdates.push({
          id: question.id,
          content_set_id: question.content_set_id,
          question_number: question.question_number,
          original,
          converted,
          tableName: 'vocabulary_questions',
          tableLabel: '어휘문제'
        });
      }
    }

    // 문단문제 검사
    for (const question of paragraphQuestions) {
      const original = question.explanation;
      if (!original || !hasDoubleQuotes(original)) continue;

      const converted = convertDoubleToSingleQuotes(original);
      if (original !== converted) {
        paragraphUpdates.push({
          id: question.id,
          content_set_id: question.content_set_id,
          question_number: question.question_number,
          question_type: question.question_type,
          original,
          converted,
          tableName: 'paragraph_questions',
          tableLabel: '문단문제'
        });
      }
    }

    // 종합문제 검사
    for (const question of comprehensiveQuestions) {
      const original = question.explanation;
      if (!original || !hasDoubleQuotes(original)) continue;

      const converted = convertDoubleToSingleQuotes(original);
      if (original !== converted) {
        comprehensiveUpdates.push({
          id: question.id,
          content_set_id: question.content_set_id,
          question_number: question.question_number,
          question_type: question.question_type,
          original,
          converted,
          tableName: 'comprehensive_questions',
          tableLabel: '종합문제'
        });
      }
    }

    const totalUpdates = vocabularyUpdates.length + paragraphUpdates.length + comprehensiveUpdates.length;
    console.log(`✅ 큰따옴표 발견 - 어휘: ${vocabularyUpdates.length}개, 문단: ${paragraphUpdates.length}개, 종합: ${comprehensiveUpdates.length}개 (총 ${totalUpdates}개)`);

    // 모든 업데이트를 합쳐서 샘플 준비
    const allUpdates = [...vocabularyUpdates, ...paragraphUpdates, ...comprehensiveUpdates];

    // 4. 드라이런 모드
    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        message: `드라이런 모드: ${totalUpdates}개의 해설에서 큰따옴표가 작은따옴표로 변환됩니다. (어휘: ${vocabularyUpdates.length}개, 문단: ${paragraphUpdates.length}개, 종합: ${comprehensiveUpdates.length}개)`,
        totalRecords: totalQuestions,
        affectedRecords: totalUpdates,
        vocabularyCount: vocabularyUpdates.length,
        paragraphCount: paragraphUpdates.length,
        comprehensiveCount: comprehensiveUpdates.length,
        samples: allUpdates.slice(0, 15)
      });
    }

    // 5. 실제 업데이트 (배치 처리)
    let successCount = 0;
    let errorCount = 0;
    let vocabularySuccessCount = 0;
    let paragraphSuccessCount = 0;
    let comprehensiveSuccessCount = 0;
    const batchSize = 100;

    console.log(`🔄 ${totalUpdates}개 해설 업데이트 시작`);

    // 테이블별 업데이트 함수
    const updateTable = async (updates: any[], tableName: string) => {
      let tableSuccess = 0;
      let tableError = 0;

      for (let i = 0; i < updates.length; i += batchSize) {
        const batch = updates.slice(i, i + batchSize);

        const batchPromises = batch.map(async (update) => {
          try {
            const { error } = await supabase
              .from(tableName)
              .update({ explanation: update.converted })
              .eq('id', update.id);

            return error ? { success: false } : { success: true };
          } catch (err) {
            console.error(`Error updating ${tableName} ${update.id}:`, err);
            return { success: false };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        tableSuccess += batchResults.filter(r => r.success).length;
        tableError += batchResults.filter(r => !r.success).length;

        // API 부하 방지를 위한 대기
        if (i + batchSize < updates.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      return { success: tableSuccess, error: tableError };
    };

    // 어휘문제 업데이트
    if (vocabularyUpdates.length > 0) {
      console.log(`  어휘문제 업데이트 중...`);
      const result = await updateTable(vocabularyUpdates, 'vocabulary_questions');
      vocabularySuccessCount = result.success;
      successCount += result.success;
      errorCount += result.error;
    }

    // 문단문제 업데이트
    if (paragraphUpdates.length > 0) {
      console.log(`  문단문제 업데이트 중...`);
      const result = await updateTable(paragraphUpdates, 'paragraph_questions');
      paragraphSuccessCount = result.success;
      successCount += result.success;
      errorCount += result.error;
    }

    // 종합문제 업데이트
    if (comprehensiveUpdates.length > 0) {
      console.log(`  종합문제 업데이트 중...`);
      const result = await updateTable(comprehensiveUpdates, 'comprehensive_questions');
      comprehensiveSuccessCount = result.success;
      successCount += result.success;
      errorCount += result.error;
    }

    console.log(`✅ 완료 - 성공: ${successCount}, 실패: ${errorCount}`);

    return NextResponse.json({
      success: true,
      dryRun: false,
      message: `해설 큰따옴표 검수 완료: ${successCount}개 성공, ${errorCount}개 실패`,
      successCount,
      errorCount,
      vocabularyCount: vocabularySuccessCount,
      paragraphCount: paragraphSuccessCount,
      comprehensiveCount: comprehensiveSuccessCount,
      totalProcessed: totalUpdates
    });

  } catch (error) {
    console.error('해설 큰따옴표 검수 오류:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 });
  }
}
