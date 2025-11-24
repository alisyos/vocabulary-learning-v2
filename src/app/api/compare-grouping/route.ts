import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 2-field vs 3-field grouping comparison...');

    // 1. Fetch all content_sets
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
        if (pageData.length < pageSize) hasMoreData = false;
      } else {
        hasMoreData = false;
      }
      currentPage++;
    }

    console.log(`✅ 총 ${allSets.length}개 콘텐츠 세트 조회 완료`);

    // 2. Group by main_topic + sub_topic (2-field, incorrect grouping)
    const twoFieldGroups = new Map<string, any[]>();
    for (const record of allSets) {
      const { main_topic, sub_topic } = record;
      if (!main_topic || !sub_topic) continue;

      const key = `${main_topic}|||${sub_topic}`;
      if (!twoFieldGroups.has(key)) {
        twoFieldGroups.set(key, []);
      }
      twoFieldGroups.get(key)!.push(record);
    }

    // 3. Group by main_topic + sub_topic + grade (3-field, correct grouping)
    const threeFieldGroups = new Map<string, any[]>();
    for (const record of allSets) {
      const { main_topic, sub_topic, grade } = record;
      if (!main_topic || !sub_topic || !grade) continue;

      const key = `${main_topic}|||${sub_topic}|||${grade}`;
      if (!threeFieldGroups.has(key)) {
        threeFieldGroups.set(key, []);
      }
      threeFieldGroups.get(key)!.push(record);
    }

    // 4. Find records that were incorrectly grouped in 2-field grouping
    const fieldsToCheck = ['division', 'passage_length', 'text_type', 'session_number', 'grade_number'];
    const problematicRecords: any[] = [];

    for (const [key, records] of twoFieldGroups) {
      if (records.length < 2) continue;

      // Check if this group has records with different grades
      const grades = new Set(records.map(r => r.grade).filter(Boolean));

      if (grades.size > 1) {
        // This is a problematic group - it mixed different grades
        const [main_topic, sub_topic] = key.split('|||');

        // Check for field inconsistencies
        for (const field of fieldsToCheck) {
          const values = records.map(r => r[field] || '(null)');
          const valueCounts = new Map<string, number>();

          for (const value of values) {
            valueCounts.set(value, (valueCounts.get(value) || 0) + 1);
          }

          if (valueCounts.size > 1) {
            // This field had inconsistencies
            const sorted = Array.from(valueCounts.entries()).sort((a, b) => b[1] - a[1]);
            const mostCommon = sorted[0][0] === '(null)' ? null : sorted[0][0];

            // Find records that were changed
            for (const record of records) {
              const currentValue = record[field] || '(null)';
              const recommended = mostCommon === null ? '(null)' : mostCommon;

              if (currentValue !== recommended) {
                problematicRecords.push({
                  id: record.id,
                  title: record.title,
                  main_topic: record.main_topic,
                  sub_topic: record.sub_topic,
                  grade: record.grade,
                  field: field,
                  original_value: currentValue,
                  changed_to: recommended
                });
              }
            }
          }
        }
      }
    }

    // 5. Get unique IDs
    const uniqueIds = [...new Set(problematicRecords.map(r => r.id))];

    console.log(`⚠️ 2-field grouping으로 인해 영향받은 레코드: ${uniqueIds.length}개`);

    return NextResponse.json({
      success: true,
      twoFieldGroupCount: twoFieldGroups.size,
      threeFieldGroupCount: threeFieldGroups.size,
      affectedRecordCount: uniqueIds.length,
      affectedIds: uniqueIds,
      detailedChanges: problematicRecords.slice(0, 100) // Max 100 details
    });

  } catch (error) {
    console.error('비교 오류:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 });
  }
}
