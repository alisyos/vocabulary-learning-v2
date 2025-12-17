import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// 테이블별 검수 대상 필드 정의
const TABLE_FIELDS: Record<string, string[]> = {
  passages: ['title', 'paragraph_1', 'paragraph_2', 'paragraph_3', 'paragraph_4', 'paragraph_5', 'paragraph_6', 'paragraph_7', 'paragraph_8', 'paragraph_9', 'paragraph_10'],
  vocabulary_terms: ['term', 'definition', 'example_sentence'],
  vocabulary_questions: ['question_text', 'option_1', 'option_2', 'option_3', 'option_4', 'option_5', 'correct_answer', 'explanation', 'term'],
  paragraph_questions: ['question_text', 'option_1', 'option_2', 'option_3', 'option_4', 'option_5', 'correct_answer', 'explanation', 'word_segments'],
  comprehensive_questions: ['question_text', 'option_1', 'option_2', 'option_3', 'option_4', 'option_5', 'correct_answer', 'explanation'],
  content_sets: ['title']
};

// 테이블 라벨
const TABLE_LABELS: Record<string, string> = {
  passages: '지문',
  vocabulary_terms: '어휘',
  vocabulary_questions: '어휘문제',
  paragraph_questions: '문단문제',
  comprehensive_questions: '종합문제',
  content_sets: '콘텐츠세트'
};

// 전체 테이블을 페이지네이션으로 조회하는 함수
async function fetchAllRecordsFromTable(
  tableName: string,
  contentSetIdSet: Set<string>
): Promise<any[]> {
  const allRecords: any[] = [];
  const pageSize = 1000;
  let currentPage = 0;
  let hasMore = true;

  console.log(`    [${tableName}] 전체 레코드 페이지네이션 조회 시작...`);

  while (hasMore) {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .range(currentPage * pageSize, (currentPage + 1) * pageSize - 1);

    if (error) {
      console.error(`    [${tableName}] 페이지 ${currentPage + 1} 조회 오류:`, error);
      throw error;
    }

    if (data && data.length > 0) {
      // JavaScript에서 content_set_id 필터링
      const filteredData = tableName === 'content_sets'
        ? data.filter(record => contentSetIdSet.has(record.id))
        : data.filter(record => contentSetIdSet.has(record.content_set_id));

      allRecords.push(...filteredData);

      console.log(`    [${tableName}] 페이지 ${currentPage + 1}: ${data.length}개 조회, ${filteredData.length}개 필터 통과 (누적: ${allRecords.length}개)`);

      if (data.length < pageSize) {
        hasMore = false;
      }
    } else {
      hasMore = false;
    }
    currentPage++;
  }

  console.log(`    [${tableName}] 조회 완료: 총 ${allRecords.length}개 레코드`);
  return allRecords;
}

export async function POST(request: NextRequest) {
  try {
    const {
      dryRun = true,
      statuses = [],
      sessionRange = null,
      searchText = '',
      replaceText = ''
    } = await request.json();

    // 검색어 유효성 검사
    if (!searchText || searchText.trim() === '') {
      return NextResponse.json({
        success: false,
        error: '검색어를 입력해주세요.'
      }, { status: 400 });
    }

    const trimmedSearch = searchText.trim();
    const trimmedReplace = replaceText; // 빈 문자열도 허용 (삭제 용도)

    console.log(`📊 텍스트 일괄 수정 검수 시작`);
    console.log(`   검색어: "${trimmedSearch}" → 대체어: "${trimmedReplace}"`);
    console.log(`   상태: ${statuses.join(', ')}, 차시: ${sessionRange ? `${sessionRange.start}-${sessionRange.end}` : '전체'}`);

    // 1. content_sets 전체 조회 (페이지네이션)
    let allSets: any[] = [];
    let currentPage = 0;
    const pageSize = 1000;
    let hasMoreData = true;

    console.log(`📝 content_sets 조회 시작...`);

    while (hasMoreData) {
      const { data: pageData, error: setsError } = await supabase
        .from('content_sets')
        .select('id, session_number, status')
        .range(currentPage * pageSize, (currentPage + 1) * pageSize - 1);

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

    console.log(`  content_sets 전체 조회 완료: ${allSets.length}개`);

    // 상태 필터링 (JavaScript에서 수행)
    let filteredSets = allSets;
    if (statuses && statuses.length > 0) {
      filteredSets = filteredSets.filter(set => statuses.includes(set.status));
      console.log(`  상태 필터링 후: ${filteredSets.length}개`);
    }

    // 차시 범위 필터링
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
    const contentSetIdSet = new Set(contentSetIds);

    if (contentSetIds.length === 0) {
      return NextResponse.json({
        success: true,
        dryRun,
        message: `검수 대상이 없습니다. (상태: ${statuses.join(', ')})`,
        samples: []
      });
    }

    console.log(`📝 총 ${contentSetIds.length}개 콘텐츠 세트 대상`);

    // 2. 각 테이블에서 검색 및 변환 대상 찾기
    const allUpdates: any[] = [];
    const tableStats: Record<string, number> = {};

    for (const [tableName, fields] of Object.entries(TABLE_FIELDS)) {
      console.log(`  ${TABLE_LABELS[tableName]}(${tableName}) 조회 중...`);
      const records = await fetchAllRecordsFromTable(tableName, contentSetIdSet);
      console.log(`    → ${records.length}개 레코드 필터 완료`);

      let tableUpdateCount = 0;

      for (const record of records) {
        const changedFields: Record<string, { original: string; converted: string }> = {};

        for (const field of fields) {
          const originalValue = record[field];
          if (!originalValue || typeof originalValue !== 'string') continue;

          // 검색어가 포함되어 있는지 확인
          if (originalValue.includes(trimmedSearch)) {
            const convertedValue = originalValue.split(trimmedSearch).join(trimmedReplace);
            if (originalValue !== convertedValue) {
              changedFields[field] = {
                original: originalValue,
                converted: convertedValue
              };
            }
          }
        }

        if (Object.keys(changedFields).length > 0) {
          allUpdates.push({
            id: record.id,
            content_set_id: tableName === 'content_sets' ? record.id : record.content_set_id,
            tableName,
            tableLabel: TABLE_LABELS[tableName],
            changedFields,
            // 샘플 표시용 추가 정보
            question_number: record.question_number,
            question_type: record.question_type,
            term: record.term,
            title: record.title
          });
          tableUpdateCount++;
        }
      }

      tableStats[tableName] = tableUpdateCount;
      console.log(`    → ${tableUpdateCount}개 레코드에서 검색어 발견`);
    }

    console.log(`✅ 총 ${allUpdates.length}개 레코드에서 검색어 발견`);

    // 3. 드라이런 모드
    if (dryRun) {
      // 샘플 준비 (각 테이블별로 최대 3개씩)
      const samplesByTable: Record<string, any[]> = {};
      for (const update of allUpdates) {
        if (!samplesByTable[update.tableName]) {
          samplesByTable[update.tableName] = [];
        }
        if (samplesByTable[update.tableName].length < 3) {
          samplesByTable[update.tableName].push(update);
        }
      }
      const samples = Object.values(samplesByTable).flat();

      return NextResponse.json({
        success: true,
        dryRun: true,
        message: `드라이런 모드: "${trimmedSearch}" → "${trimmedReplace}" 변환이 ${allUpdates.length}개 레코드에서 수행됩니다.`,
        totalRecords: allUpdates.length,
        searchText: trimmedSearch,
        replaceText: trimmedReplace,
        tableStats,
        samples: samples.slice(0, 18) // 최대 18개 샘플
      });
    }

    // 4. 실제 업데이트 (배치 처리)
    let successCount = 0;
    let errorCount = 0;
    const tableSuccessStats: Record<string, number> = {};
    const batchSize = 50;

    console.log(`🔄 ${allUpdates.length}개 레코드 업데이트 시작`);

    // 테이블별로 그룹화
    const updatesByTable: Record<string, any[]> = {};
    for (const update of allUpdates) {
      if (!updatesByTable[update.tableName]) {
        updatesByTable[update.tableName] = [];
      }
      updatesByTable[update.tableName].push(update);
    }

    // 테이블별 업데이트 실행
    for (const [tableName, updates] of Object.entries(updatesByTable)) {
      console.log(`  ${TABLE_LABELS[tableName]} 업데이트 중 (${updates.length}개)...`);
      let tableSuccess = 0;

      for (let i = 0; i < updates.length; i += batchSize) {
        const batch = updates.slice(i, i + batchSize);

        const batchPromises = batch.map(async (update) => {
          try {
            // 변경된 필드들만 업데이트
            const updateData: Record<string, string> = {};
            for (const [field, values] of Object.entries(update.changedFields)) {
              updateData[field] = (values as any).converted;
            }

            const { error } = await supabase
              .from(tableName)
              .update(updateData)
              .eq('id', update.id);

            return error ? { success: false } : { success: true };
          } catch (err) {
            console.error(`Error updating ${tableName} ${update.id}:`, err);
            return { success: false };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        const batchSuccess = batchResults.filter(r => r.success).length;
        const batchError = batchResults.filter(r => !r.success).length;

        tableSuccess += batchSuccess;
        successCount += batchSuccess;
        errorCount += batchError;

        console.log(`    배치 ${Math.floor(i / batchSize) + 1}/${Math.ceil(updates.length / batchSize)}: ${batchSuccess}개 성공, ${batchError}개 실패`);

        // API 부하 방지를 위한 대기
        if (i + batchSize < updates.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      tableSuccessStats[tableName] = tableSuccess;
    }

    console.log(`✅ 완료 - 성공: ${successCount}, 실패: ${errorCount}`);

    return NextResponse.json({
      success: true,
      dryRun: false,
      message: `텍스트 일괄 수정 완료: "${trimmedSearch}" → "${trimmedReplace}" (${successCount}개 성공, ${errorCount}개 실패)`,
      successCount,
      errorCount,
      searchText: trimmedSearch,
      replaceText: trimmedReplace,
      tableStats: tableSuccessStats,
      totalProcessed: allUpdates.length
    });

  } catch (error) {
    console.error('텍스트 일괄 수정 검수 오류:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 });
  }
}
