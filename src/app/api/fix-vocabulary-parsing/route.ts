import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// 어휘 데이터 파싱 함수 (PassageReview.tsx와 동일한 로직)
const parseFootnoteToVocabularyTerm = (footnote: string): { term: string; definition: string; example_sentence: string } => {
  // 첫 번째 콜론으로 term과 나머지 부분 분리
  const colonIndex = footnote.indexOf(':');

  if (colonIndex === -1) {
    // 콜론이 없는 경우 전체를 term으로
    return { term: footnote.trim(), definition: '', example_sentence: '' };
  }

  const term = footnote.substring(0, colonIndex).trim();
  const definitionPart = footnote.substring(colonIndex + 1).trim();

  // 다양한 예시 패턴 매칭
  // 1. "(예:" 또는 "(예시:" 패턴
  let exampleMatch = definitionPart.match(/\(예시?:\s*([^)]+)\)/);

  // 2. "(예:"나 "(예시:" 없이 단순히 괄호만 있는 경우
  if (!exampleMatch) {
    // 마지막 괄호 안의 내용을 예시로 간주 (단, 너무 짧지 않은 경우)
    // 공백이 있는 경우: " (예시문장)" 또는 " (예시문장)."
    // 공백이 없는 경우: "(예시문장)" 또는 "(예시문장)."
    exampleMatch = definitionPart.match(/\s*\(([^)]{5,})\)\.?$/);
  }

  let definition = definitionPart;
  let example_sentence = '';

  if (exampleMatch) {
    // 예시 부분 제거한 정의
    definition = definitionPart.replace(exampleMatch[0], '').trim();
    // 예시 문장
    example_sentence = exampleMatch[1].trim();
  }

  return { term, definition, example_sentence };
};

export async function POST(request: NextRequest) {
  try {
    const { dryRun = true } = await request.json();

    console.log('🔍 vocabulary_terms 테이블에서 잘못 파싱된 데이터 검색 중...');

    // 페이지네이션으로 모든 데이터 조회
    let allVocabularyTerms: any[] = [];
    let currentPage = 0;
    const pageSize = 1000;
    let hasMoreData = true;

    while (hasMoreData) {
      console.log(`📄 페이지 ${currentPage + 1} 조회 중... (${currentPage * pageSize} ~ ${(currentPage + 1) * pageSize})`);

      const { data: pageData, error: fetchError } = await supabase
        .from('vocabulary_terms')
        .select('*')
        .or('definition.like.*(*),definition.like.*(예:*),definition.like.*(예시:*)')
        .range(currentPage * pageSize, (currentPage + 1) * pageSize - 1);

      if (fetchError) {
        console.error(`페이지 ${currentPage + 1} 조회 오류:`, fetchError);
        return NextResponse.json({
          success: false,
          error: '데이터 조회 중 오류가 발생했습니다.',
          details: fetchError.message
        });
      }

      if (pageData && pageData.length > 0) {
        allVocabularyTerms.push(...pageData);
        console.log(`✅ 페이지 ${currentPage + 1}: ${pageData.length}개 레코드 조회`);

        // 다음 페이지가 있는지 확인 (현재 페이지가 pageSize보다 작으면 마지막 페이지)
        if (pageData.length < pageSize) {
          hasMoreData = false;
        }
      } else {
        hasMoreData = false;
      }

      currentPage++;
    }

    console.log(`📊 총 검색된 레코드 수: ${allVocabularyTerms.length}`);

    if (allVocabularyTerms.length === 0) {
      return NextResponse.json({
        success: true,
        message: '수정이 필요한 데이터가 없습니다.',
        totalFound: 0,
        needsUpdate: 0
      });
    }

    const updates: Array<{
      id: string;
      original: { term: string; definition: string; example_sentence: string | null };
      parsed: { term: string; definition: string; example_sentence: string };
      needsUpdate: boolean;
    }> = [];

    // 각 레코드 분석
    for (const record of allVocabularyTerms) {
      // 원본 term과 definition을 조합하여 footnote 형태로 재구성
      const originalFootnote = `${record.term}: ${record.definition}`;
      const parsed = parseFootnoteToVocabularyTerm(originalFootnote);

      // 파싱 결과가 원본과 다른지 확인
      const needsUpdate =
        parsed.definition !== record.definition ||
        parsed.example_sentence !== (record.example_sentence || '');

      updates.push({
        id: record.id,
        original: {
          term: record.term,
          definition: record.definition,
          example_sentence: record.example_sentence
        },
        parsed,
        needsUpdate
      });
    }

    const updatesNeeded = updates.filter(u => u.needsUpdate);

    console.log(`📝 수정이 필요한 레코드 수: ${updatesNeeded.length}`);

    if (dryRun) {
      // 드라이런 모드: 변경사항만 보여주고 실제 업데이트는 하지 않음
      return NextResponse.json({
        success: true,
        dryRun: true,
        message: `드라이런 모드: ${updatesNeeded.length}개 레코드가 수정됩니다.`,
        totalFound: allVocabularyTerms.length,
        needsUpdate: updatesNeeded.length,
        samples: updatesNeeded.slice(0, 5).map(u => ({
          id: u.id,
          before: u.original,
          after: u.parsed
        }))
      });
    }

    // 배치 업데이트 실행 (100개씩 그룹으로 처리)
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];
    const batchSize = 100;

    console.log(`🔄 ${updatesNeeded.length}개 레코드를 ${batchSize}개씩 배치 업데이트 시작...`);

    for (let i = 0; i < updatesNeeded.length; i += batchSize) {
      const batch = updatesNeeded.slice(i, i + batchSize);
      console.log(`📦 배치 ${Math.floor(i / batchSize) + 1}/${Math.ceil(updatesNeeded.length / batchSize)} 처리 중... (${batch.length}개)`);

      // 배치별로 병렬 처리
      const batchPromises = batch.map(async (update) => {
        try {
          const { error } = await supabase
            .from('vocabulary_terms')
            .update({
              definition: update.parsed.definition,
              example_sentence: update.parsed.example_sentence || null
            })
            .eq('id', update.id);

          if (error) {
            console.error(`레코드 ${update.id} 업데이트 실패:`, error);
            return { success: false, id: update.id, error: error.message };
          } else {
            return { success: true, id: update.id };
          }
        } catch (error) {
          console.error(`레코드 ${update.id} 업데이트 중 예외:`, error);
          return {
            success: false,
            id: update.id,
            error: error instanceof Error ? error.message : '알 수 없는 오류'
          };
        }
      });

      // 배치 처리 완료 대기
      const batchResults = await Promise.all(batchPromises);

      // 결과 집계
      for (const result of batchResults) {
        if (result.success) {
          successCount++;
        } else {
          errorCount++;
          errors.push(`ID ${result.id}: ${result.error}`);
        }
      }

      console.log(`✅ 배치 ${Math.floor(i / batchSize) + 1} 완료: 성공 ${batchResults.filter(r => r.success).length}개, 실패 ${batchResults.filter(r => !r.success).length}개`);

      // 다음 배치 처리 전 잠시 대기 (API 부하 방지)
      if (i + batchSize < updatesNeeded.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`🎯 전체 업데이트 완료: 총 성공 ${successCount}개, 실패 ${errorCount}개`);


    return NextResponse.json({
      success: true,
      dryRun: false,
      message: `일괄 수정 완료: ${successCount}개 성공, ${errorCount}개 실패`,
      totalFound: allVocabularyTerms.length,
      needsUpdate: updatesNeeded.length,
      successCount,
      errorCount,
      errors: errors.slice(0, 10) // 최대 10개 오류만 반환
    });

  } catch (error) {
    console.error('일괄 수정 처리 중 오류:', error);
    return NextResponse.json({
      success: false,
      error: '일괄 수정 중 서버 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : '알 수 없는 오류'
    });
  }
}