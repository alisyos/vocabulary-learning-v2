import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { dryRun = true } = await request.json();

    console.log('📊 main_topic + sub_topic + grade 조합별 필드 값 검증 시작...');

    // 1. 모든 content_sets 조회
    let allSets: any[] = [];
    let currentPage = 0;
    const pageSize = 1000;
    let hasMoreData = true;

    while (hasMoreData) {
      const { data: pageData, error: fetchError } = await supabase
        .from('content_sets')
        .select('*')
        .range(currentPage * pageSize, (currentPage + 1) * pageSize - 1);

      if (fetchError) throw fetchError;

      if (pageData && pageData.length > 0) {
        allSets.push(...pageData);
        console.log(`  페이지 ${currentPage + 1}: ${pageData.length}개 조회 (누적: ${allSets.length}개)`);
        if (pageData.length < pageSize) hasMoreData = false;
      } else {
        hasMoreData = false;
      }
      currentPage++;
    }

    console.log(`✅ 총 ${allSets.length}개 콘텐츠 세트 조회 완료`);

    // 2. main_topic + sub_topic + grade 조합으로 그룹화 (✅ grade 추가)
    const groupedByTopic = new Map<string, any[]>();

    for (const record of allSets) {
      const { main_topic, sub_topic, grade } = record;

      if (!main_topic || !sub_topic || !grade) {
        continue;
      }

      // ✅ grade 포함: main_topic + sub_topic + grade 조합
      const key = `${main_topic}|||${sub_topic}|||${grade}`;
      if (!groupedByTopic.has(key)) {
        groupedByTopic.set(key, []);
      }
      groupedByTopic.get(key)!.push(record);
    }

    console.log(`📊 총 ${groupedByTopic.size}개의 main_topic + sub_topic + grade 조합 발견`);

    // 3. 각 그룹에서 필드 값 불일치 검사
    const fieldsToCheck = ['division', 'passage_length', 'text_type', 'session_number', 'grade_number'];
    const inconsistencies: any[] = [];

    for (const [key, records] of groupedByTopic) {
      const [main_topic, sub_topic, grade] = key.split('|||'); // ✅ grade 추가

      // 그룹 내 레코드가 2개 이상일 때만 검사
      if (records.length < 2) {
        continue;
      }

      // 각 필드별로 값의 분포 확인
      const fieldDistribution: any = {};

      for (const field of fieldsToCheck) {
        const values = records.map(r => r[field] || '(null)');
        const valueCounts = new Map<string, number>();

        for (const value of values) {
          valueCounts.set(value, (valueCounts.get(value) || 0) + 1);
        }

        // 2개 이상의 서로 다른 값이 있으면 불일치
        if (valueCounts.size > 1) {
          fieldDistribution[field] = {
            values: Array.from(valueCounts.entries()).map(([value, count]) => ({
              value,
              count,
              percentage: ((count / records.length) * 100).toFixed(1) + '%'
            })),
            inconsistent: true
          };
        }
      }

      // 불일치하는 필드가 있으면 기록
      if (Object.keys(fieldDistribution).length > 0) {
        // 가장 많이 사용된 값을 추천값으로 선택
        const recommendedValues: any = {};

        for (const [field, distribution] of Object.entries(fieldDistribution)) {
          const sorted = (distribution as any).values.sort((a: any, b: any) => b.count - a.count);
          recommendedValues[field] = sorted[0].value === '(null)' ? null : sorted[0].value;
        }

        // 수정이 필요한 레코드들 찾기
        const recordsToUpdate = records.filter(record => {
          return Object.entries(recommendedValues).some(([field, recommendedValue]) => {
            const currentValue = record[field] || '(null)';
            const recommended = recommendedValue === null ? '(null)' : recommendedValue;
            return currentValue !== recommended;
          });
        });

        inconsistencies.push({
          main_topic,
          sub_topic,
          grade, // ✅ grade 정보 추가
          totalRecords: records.length,
          recordsToUpdate: recordsToUpdate.length,
          fieldDistribution,
          recommendedValues,
          updates: recordsToUpdate.map(record => ({
            id: record.id,
            title: record.title,
            current: fieldsToCheck.reduce((acc, field) => {
              acc[field] = record[field] || '(null)';
              return acc;
            }, {} as any),
            recommended: recommendedValues
          }))
        });
      }
    }

    console.log(`⚠️ ${inconsistencies.length}개의 main_topic + sub_topic 조합에서 불일치 발견`);

    // 전체 업데이트 대상 레코드 수 계산
    const totalRecordsToUpdate = inconsistencies.reduce((sum, item) => sum + item.recordsToUpdate, 0);

    // 4. 드라이런 모드
    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        message: `드라이런 모드: ${inconsistencies.length}개 조합에서 총 ${totalRecordsToUpdate}개 레코드가 수정됩니다.`,
        totalGroups: groupedByTopic.size,
        inconsistentGroups: inconsistencies.length,
        totalRecordsToUpdate,
        inconsistencies: inconsistencies.slice(0, 30) // 최대 30개 샘플
      });
    }

    // 5. 실제 업데이트
    let successCount = 0;
    let errorCount = 0;

    console.log(`🔄 ${totalRecordsToUpdate}개 레코드 업데이트 시작...`);

    for (const inconsistency of inconsistencies) {
      for (const update of inconsistency.updates) {
        try {
          const updateData: any = {};

          // 추천값과 다른 필드만 업데이트
          for (const field of fieldsToCheck) {
            const currentValue = update.current[field];
            const recommendedValue = update.recommended[field];

            if (currentValue !== recommendedValue) {
              updateData[field] = recommendedValue === '(null)' ? null : recommendedValue;
            }
          }

          if (Object.keys(updateData).length > 0) {
            const { error } = await supabase
              .from('content_sets')
              .update(updateData)
              .eq('id', update.id);

            if (error) {
              console.error(`❌ 레코드 ${update.id} 업데이트 실패:`, error);
              errorCount++;
            } else {
              console.log(`✅ 레코드 ${update.id} 업데이트 성공`);
              successCount++;
            }
          }

          // API 부하 방지를 위한 대기 (50ms)
          await new Promise(resolve => setTimeout(resolve, 50));
        } catch (err) {
          console.error(`❌ 레코드 ${update.id} 업데이트 예외:`, err);
          errorCount++;
        }
      }
    }

    console.log(`✅ 완료 - 성공: ${successCount}, 실패: ${errorCount}`);

    return NextResponse.json({
      success: true,
      dryRun: false,
      message: `필드 값 검증 및 수정 완료: ${successCount}개 성공, ${errorCount}개 실패`,
      successCount,
      errorCount,
      totalProcessed: totalRecordsToUpdate
    });

  } catch (error) {
    console.error('필드 값 검증 오류:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 });
  }
}
