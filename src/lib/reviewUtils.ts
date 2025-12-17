import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * 전체 테이블을 페이지네이션으로 조회한 후 JavaScript에서 필터링하는 함수
 * Supabase의 .in() + .range() 조합 문제를 해결하기 위한 안전한 방식
 */
export async function fetchAllFromTable(
  tableName: string,
  contentSetIdSet: Set<string>,
  selectFields: string = '*'
): Promise<any[]> {
  const allRecords: any[] = [];
  const pageSize = 1000;
  let currentPage = 0;
  let hasMore = true;

  console.log(`    [${tableName}] 전체 레코드 페이지네이션 조회 시작...`);

  while (hasMore) {
    const { data, error } = await supabase
      .from(tableName)
      .select(selectFields)
      .range(currentPage * pageSize, (currentPage + 1) * pageSize - 1);

    if (error) {
      console.error(`    [${tableName}] 페이지 ${currentPage + 1} 조회 오류:`, error);
      throw error;
    }

    if (data && data.length > 0) {
      // JavaScript에서 content_set_id 필터링
      // content_sets 테이블은 id로 필터링, 나머지는 content_set_id로 필터링
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

/**
 * content_sets 테이블에서 전체 데이터를 페이지네이션으로 조회하는 함수
 */
export async function fetchAllContentSets(): Promise<any[]> {
  const allSets: any[] = [];
  const pageSize = 1000;
  let currentPage = 0;
  let hasMore = true;

  console.log(`📝 content_sets 전체 조회 시작...`);

  while (hasMore) {
    const { data, error } = await supabase
      .from('content_sets')
      .select('id, session_number, status')
      .range(currentPage * pageSize, (currentPage + 1) * pageSize - 1);

    if (error) throw error;

    if (data && data.length > 0) {
      allSets.push(...data);
      console.log(`  페이지 ${currentPage + 1}: ${data.length}개 조회 (누적: ${allSets.length}개)`);
      if (data.length < pageSize) hasMore = false;
    } else {
      hasMore = false;
    }
    currentPage++;
  }

  console.log(`  content_sets 전체 조회 완료: ${allSets.length}개`);
  return allSets;
}

/**
 * 상태 및 차시 범위로 content_sets를 필터링하는 함수
 */
export function filterContentSets(
  allSets: any[],
  statuses: string[],
  sessionRange: { start: number; end: number } | null
): any[] {
  let filteredSets = allSets;

  // 상태 필터링
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

  return filteredSets;
}

/**
 * 배치 업데이트를 수행하는 공통 함수
 */
export async function batchUpdate(
  tableName: string,
  updates: { id: string; data: Record<string, any> }[],
  batchSize: number = 50
): Promise<{ successCount: number; errorCount: number }> {
  let successCount = 0;
  let errorCount = 0;

  console.log(`  ${tableName} 업데이트 중 (${updates.length}개)...`);

  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = updates.slice(i, i + batchSize);

    const batchPromises = batch.map(async (update) => {
      try {
        const { error } = await supabase
          .from(tableName)
          .update(update.data)
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

    console.log(`    배치 ${Math.floor(i / batchSize) + 1}/${Math.ceil(updates.length / batchSize)}: ${batchResults.filter(r => r.success).length}개 성공`);

    // API 부하 방지를 위한 대기
    if (i + batchSize < updates.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return { successCount, errorCount };
}

/**
 * 배치 삭제를 수행하는 공통 함수
 */
export async function batchDelete(
  tableName: string,
  ids: string[],
  batchSize: number = 50
): Promise<{ successCount: number; errorCount: number }> {
  let successCount = 0;
  let errorCount = 0;

  console.log(`  ${tableName} 삭제 중 (${ids.length}개)...`);

  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);

    const batchPromises = batch.map(async (id) => {
      try {
        const { error } = await supabase
          .from(tableName)
          .delete()
          .eq('id', id);

        return error ? { success: false } : { success: true };
      } catch (err) {
        console.error(`Error deleting ${tableName} ${id}:`, err);
        return { success: false };
      }
    });

    const batchResults = await Promise.all(batchPromises);
    successCount += batchResults.filter(r => r.success).length;
    errorCount += batchResults.filter(r => !r.success).length;

    // API 부하 방지를 위한 대기
    if (i + batchSize < ids.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return { successCount, errorCount };
}
