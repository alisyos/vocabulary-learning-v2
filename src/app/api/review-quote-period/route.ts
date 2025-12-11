import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// 완성형 문장 어미 패턴 (마침표가 필요한 경우)
// 한글 문장의 종결 어미들
const SENTENCE_ENDING_PATTERNS = [
  // 평서형 종결 어미
  '다', '요', '죠', '네', '군', '구나', '구요', '네요', '군요',
  // 해요체/합쇼체
  '니다', '습니다', '입니다', '됩니다', '합니다', '있습니다', '없습니다',
  '세요', '에요', '이에요', '예요', '래요', '대요', '나요', '까요',
  // 해체 (반말)
  '어', '아', '야', '지', '래', '대', '냐', '니', '나',
  // 구어체/방언 종결 어미
  '돼', '겨', '사', '써', '져', '줘',
  // 명령형/청유형
  '해', '자', '라', '렴', '려무나',
  // 의문형
  '냐', '니', '나', '까', '가',
  // 감탄형
  '구나', '군', '네', '로구나', '는구나', '는군',
];

// 인용 내 완성형 문장에 마침표를 추가하는 함수
function addPeriodToQuotedSentence(text: string): { converted: string; changes: string[] } {
  if (!text) return { converted: text, changes: [] };

  const changes: string[] = [];

  // 작은따옴표로 감싸진 내용 찾기
  // 접미사와 관계없이 모든 '내용' 패턴을 찾음
  const quotePattern = /'([^']+)'/g;

  const converted = text.replace(quotePattern, (match, content) => {
    // 이미 마침표, 물음표, 느낌표로 끝나면 변경 없음
    if (content.endsWith('.') || content.endsWith('?') || content.endsWith('!')) {
      return match;
    }

    // 완성형 문장 어미로 끝나는지 확인
    const endsWithSentenceEnding = SENTENCE_ENDING_PATTERNS.some(ending => {
      return content.endsWith(ending);
    });

    if (endsWithSentenceEnding) {
      changes.push(`'${content}' → '${content}.'`);
      return `'${content}.'`;
    }

    return match;
  });

  return { converted, changes };
}

export async function POST(request: NextRequest) {
  try {
    const { dryRun = true, statuses = [], sessionRange = null } = await request.json();

    // 1. 상태별 필터링하여 content_set_id 조회 (페이지네이션 적용)
    let allSets: any[] = [];
    let currentPage = 0;
    const pageSize = 1000;
    let hasMoreData = true;

    console.log(`📊 인용문 마침표 검수 시작 - 상태: ${statuses.join(', ')}, 차시: ${sessionRange ? `${sessionRange.start}-${sessionRange.end}` : '전체'}`);

    while (hasMoreData) {
      let query = supabase
        .from('content_sets')
        .select('id, session_number, status')
        .range(currentPage * pageSize, (currentPage + 1) * pageSize - 1);

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

    // 차시 범위 필터링
    let filteredSets = allSets;
    if (sessionRange && sessionRange.start && sessionRange.end) {
      filteredSets = filteredSets.filter(set => {
        if (!set.session_number) return false;
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

    // 결과 저장
    const allUpdates: any[] = [];
    let paragraphCount = 0;
    let comprehensiveCount = 0;

    const chunkSize = 100;

    // 2. paragraph_questions 테이블 검사
    console.log('🔍 문단문제(paragraph_questions) 검사 중...');
    for (let i = 0; i < contentSetIds.length; i += chunkSize) {
      const chunk = contentSetIds.slice(i, i + chunkSize);
      let pageNum = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('paragraph_questions')
          .select('id, content_set_id, question_number, explanation')
          .in('content_set_id', chunk)
          .range(pageNum * 1000, (pageNum + 1) * 1000 - 1);

        if (error) throw error;

        if (data && data.length > 0) {
          for (const question of data) {
            if (!question.explanation) continue;

            const { converted, changes } = addPeriodToQuotedSentence(question.explanation);

            if (changes.length > 0) {
              allUpdates.push({
                id: question.id,
                content_set_id: question.content_set_id,
                question_number: question.question_number,
                tableName: 'paragraph_questions',
                tableLabel: '문단문제',
                original: question.explanation,
                converted,
                changes
              });
              paragraphCount++;
            }
          }
          if (data.length < 1000) hasMore = false;
        } else {
          hasMore = false;
        }
        pageNum++;
      }
    }
    console.log(`  문단문제: ${paragraphCount}개 발견`);

    // 3. comprehensive_questions 테이블 검사
    console.log('🔍 종합문제(comprehensive_questions) 검사 중...');
    for (let i = 0; i < contentSetIds.length; i += chunkSize) {
      const chunk = contentSetIds.slice(i, i + chunkSize);
      let pageNum = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('comprehensive_questions')
          .select('id, content_set_id, question_number, question_type, explanation')
          .in('content_set_id', chunk)
          .range(pageNum * 1000, (pageNum + 1) * 1000 - 1);

        if (error) throw error;

        if (data && data.length > 0) {
          for (const question of data) {
            if (!question.explanation) continue;

            const { converted, changes } = addPeriodToQuotedSentence(question.explanation);

            if (changes.length > 0) {
              allUpdates.push({
                id: question.id,
                content_set_id: question.content_set_id,
                question_number: question.question_number,
                question_type: question.question_type,
                tableName: 'comprehensive_questions',
                tableLabel: '종합문제',
                original: question.explanation,
                converted,
                changes
              });
              comprehensiveCount++;
            }
          }
          if (data.length < 1000) hasMore = false;
        } else {
          hasMore = false;
        }
        pageNum++;
      }
    }
    console.log(`  종합문제: ${comprehensiveCount}개 발견`);

    console.log(`✅ 총 ${allUpdates.length}개의 해설에서 인용문 마침표 누락 발견`);

    // 4. 드라이런 모드
    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        message: `드라이런 모드: ${allUpdates.length}개의 해설이 수정됩니다.`,
        totalRecords: allUpdates.length,
        affectedRecords: allUpdates.length,
        paragraphCount,
        comprehensiveCount,
        samples: allUpdates.slice(0, 20)
      });
    }

    // 5. 실제 업데이트
    let successCount = 0;
    let errorCount = 0;
    const batchSize = 100;

    console.log(`🔄 ${allUpdates.length}개 해설 업데이트 시작`);

    const updatesByTable: Record<string, any[]> = {
      paragraph_questions: [],
      comprehensive_questions: []
    };

    for (const update of allUpdates) {
      updatesByTable[update.tableName].push(update);
    }

    for (const [tableName, updates] of Object.entries(updatesByTable)) {
      if (updates.length === 0) continue;

      console.log(`  ${tableName}: ${updates.length}개 업데이트 중...`);

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
        successCount += batchResults.filter(r => r.success).length;
        errorCount += batchResults.filter(r => !r.success).length;

        if (i + batchSize < updates.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    }

    console.log(`✅ 완료 - 성공: ${successCount}, 실패: ${errorCount}`);

    return NextResponse.json({
      success: true,
      dryRun: false,
      message: `인용문 마침표 검수 완료: ${successCount}개 성공, ${errorCount}개 실패`,
      successCount,
      errorCount,
      paragraphCount,
      comprehensiveCount,
      totalProcessed: allUpdates.length
    });

  } catch (error) {
    console.error('인용문 마침표 검수 오류:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 });
  }
}
