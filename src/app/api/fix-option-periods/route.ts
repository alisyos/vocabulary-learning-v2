import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// 5자 이상이면서 "~다"로 끝나는 문자열을 "~다."로 변환하는 함수
// (짧은 단어인 "바다", "수다" 등은 제외)
function addPeriodIfNeeded(text: string | null): { converted: string | null; changed: boolean } {
  if (!text) return { converted: text, changed: false };

  const trimmed = text.trim();
  // 5자 이상이면서 "다"로 끝나고 마침표가 없는 경우
  if (trimmed.length >= 5 && trimmed.endsWith('다') && !trimmed.endsWith('다.')) {
    return { converted: trimmed + '.', changed: true };
  }

  return { converted: text, changed: false };
}

interface UpdateRecord {
  id: string;
  tableName: string;
  changes: {
    field: string;
    original: string | null;
    converted: string | null;
  }[];
}

export async function POST(request: NextRequest) {
  try {
    const { dryRun = true } = await request.json();

    const tables = ['vocabulary_questions', 'paragraph_questions', 'comprehensive_questions'];
    const optionFields = ['option_1', 'option_2', 'option_3', 'option_4', 'option_5'];

    let allUpdates: UpdateRecord[] = [];

    // 각 테이블에서 레코드 조회 및 변환 확인
    for (const tableName of tables) {
      console.log(`\n처리 중: ${tableName}`);

      let allRecords: any[] = [];
      let currentPage = 0;
      const pageSize = 1000;
      let hasMoreData = true;

      // 페이지네이션으로 전체 레코드 조회
      while (hasMoreData) {
        const { data: pageData, error: fetchError } = await supabase
          .from(tableName)
          .select('*')
          .range(currentPage * pageSize, (currentPage + 1) * pageSize - 1);

        if (fetchError) {
          console.error(`${tableName} 조회 오류:`, fetchError);
          throw fetchError;
        }

        if (pageData && pageData.length > 0) {
          allRecords.push(...pageData);
          console.log(`  - 페이지 ${currentPage + 1}: ${pageData.length}개 레코드 조회`);
          if (pageData.length < pageSize) hasMoreData = false;
        } else {
          hasMoreData = false;
        }
        currentPage++;
      }

      console.log(`  - 총 ${allRecords.length}개 레코드 조회 완료`);

      // 각 레코드의 옵션 필드 확인 및 변환
      for (const record of allRecords) {
        const changes: UpdateRecord['changes'] = [];

        for (const field of optionFields) {
          const result = addPeriodIfNeeded(record[field]);
          if (result.changed) {
            changes.push({
              field,
              original: record[field],
              converted: result.converted
            });
          }
        }

        if (changes.length > 0) {
          allUpdates.push({
            id: record.id,
            tableName,
            changes
          });
        }
      }

      console.log(`  - 변경 필요: ${allUpdates.filter(u => u.tableName === tableName).length}개`);
    }

    console.log(`\n전체 변경 필요 레코드: ${allUpdates.length}개`);

    // 드라이런 모드: 샘플 반환
    if (dryRun) {
      const samples = allUpdates.slice(0, 20).map(update => ({
        id: update.id,
        tableName: update.tableName,
        changes: update.changes
      }));

      const summary = {
        vocabulary_questions: allUpdates.filter(u => u.tableName === 'vocabulary_questions').length,
        paragraph_questions: allUpdates.filter(u => u.tableName === 'paragraph_questions').length,
        comprehensive_questions: allUpdates.filter(u => u.tableName === 'comprehensive_questions').length
      };

      return NextResponse.json({
        success: true,
        dryRun: true,
        message: `드라이런 모드: 총 ${allUpdates.length}개 레코드가 변경됩니다.`,
        summary,
        totalChanges: allUpdates.length,
        samples
      });
    }

    // 실제 업데이트 실행
    let successCount = 0;
    let errorCount = 0;
    const batchSize = 50;

    for (let i = 0; i < allUpdates.length; i += batchSize) {
      const batch = allUpdates.slice(i, i + batchSize);

      const batchPromises = batch.map(async (update) => {
        try {
          // 변경할 필드들을 객체로 구성
          const updateData: any = {};
          for (const change of update.changes) {
            updateData[change.field] = change.converted;
          }

          const { error } = await supabase
            .from(update.tableName)
            .update(updateData)
            .eq('id', update.id);

          if (error) {
            console.error(`업데이트 실패 [${update.tableName}/${update.id}]:`, error);
            return { success: false, error };
          }

          return { success: true };
        } catch (err) {
          console.error(`예외 발생 [${update.tableName}/${update.id}]:`, err);
          return { success: false, error: err };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      const batchSuccess = batchResults.filter(r => r.success).length;
      const batchError = batchResults.filter(r => !r.success).length;

      successCount += batchSuccess;
      errorCount += batchError;

      console.log(`배치 ${Math.floor(i / batchSize) + 1}/${Math.ceil(allUpdates.length / batchSize)}: 성공 ${batchSuccess}, 실패 ${batchError}`);

      // API 부하 방지를 위한 대기
      if (i + batchSize < allUpdates.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return NextResponse.json({
      success: true,
      dryRun: false,
      message: `마침표 통일 완료: ${successCount}개 성공, ${errorCount}개 실패`,
      successCount,
      errorCount,
      totalProcessed: allUpdates.length
    });

  } catch (error) {
    console.error('마침표 통일 작업 오류:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 });
  }
}
