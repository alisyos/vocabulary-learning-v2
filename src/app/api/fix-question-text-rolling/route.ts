import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// 롤링할 3가지 질문
const ROLLING_QUESTIONS = [
  '이 글이 말하고자 하는 가장 중요한 내용은 무엇인가요?',
  '이 글의 중심 내용으로 가장 적절한 것은 무엇인가요?',
  '이 글이 주로 이야기하고 있는 중심 내용은 무엇인가요?'
];

// 대상 질문들 (이 질문들을 모두 위 3가지 질문으로 롤링)
const TARGET_QUESTIONS = [
  '다음 글의 핵심 주제로 가장 적절한 것은 무엇인가요?',
  '다음 글의 핵심 내용을 가장 잘 요약한 것은 무엇인가요?',
  '이 글의 핵심 메시지로 가장 적절한 내용을 고르세요.',
  '다음 글의 핵심 메시지로 알맞은 것을 고르세요.',
  '이 글의 핵심 내용을 바르게 정리한 것은 무엇인가요?',
  '글쓴이가 전하고자 하는 핵심 메시지는 무엇인가요?'
];

export async function POST(request: NextRequest) {
  try {
    const { dryRun = true } = await request.json();

    console.log('🔄 comprehensive_questions.question_text 롤링 변환 시작...');
    console.log(`📌 대상 질문 ${TARGET_QUESTIONS.length}개:`);
    TARGET_QUESTIONS.forEach((q, i) => console.log(`   ${i + 1}. ${q}`));
    console.log(`📝 변환할 질문 3가지:`);
    ROLLING_QUESTIONS.forEach((q, i) => console.log(`   ${i + 1}. ${q}`));

    // 모든 대상 질문에 대해 레코드 조회
    let allRecords: any[] = [];

    for (const targetQuestion of TARGET_QUESTIONS) {
      console.log(`\n🔍 "${targetQuestion}" 조회 중...`);

      let currentPage = 0;
      const pageSize = 1000;
      let hasMoreData = true;

      while (hasMoreData) {
        const { data: pageData, error: fetchError } = await supabase
          .from('comprehensive_questions')
          .select('*')
          .eq('question_text', targetQuestion)
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
          allRecords.push(...pageData);
          console.log(`   ✅ 페이지 ${currentPage + 1}: ${pageData.length}개 레코드 조회`);

          if (pageData.length < pageSize) {
            hasMoreData = false;
          }
        } else {
          hasMoreData = false;
        }

        currentPage++;
      }
    }

    console.log(`\n📊 총 대상 레코드 수: ${allRecords.length}개`);

    if (allRecords.length === 0) {
      return NextResponse.json({
        success: true,
        message: '대상 질문이 포함된 레코드가 없습니다.',
        totalFound: 0,
        needsUpdate: 0
      });
    }

    // 레코드를 3개 질문으로 순환 배분
    const updates: Array<{
      id: string;
      original: string;
      newQuestion: string;
      rollingIndex: number;
    }> = [];

    for (let i = 0; i < allRecords.length; i++) {
      const record = allRecords[i];
      const rollingIndex = i % 3; // 0, 1, 2로 순환
      const newQuestion = ROLLING_QUESTIONS[rollingIndex];

      updates.push({
        id: record.id,
        original: record.question_text,
        newQuestion,
        rollingIndex
      });
    }

    console.log(`📝 변환이 필요한 레코드 수: ${updates.length}`);
    console.log(`📊 분포: `);
    console.log(`   - 질문 1: ${updates.filter(u => u.rollingIndex === 0).length}개`);
    console.log(`   - 질문 2: ${updates.filter(u => u.rollingIndex === 1).length}개`);
    console.log(`   - 질문 3: ${updates.filter(u => u.rollingIndex === 2).length}개`);

    if (dryRun) {
      // 드라이런 모드
      return NextResponse.json({
        success: true,
        dryRun: true,
        message: `드라이런 모드: ${updates.length}개 question_text가 3가지 질문으로 롤링됩니다.`,
        totalFound: allRecords.length,
        needsUpdate: updates.length,
        distribution: {
          question1: updates.filter(u => u.rollingIndex === 0).length,
          question2: updates.filter(u => u.rollingIndex === 1).length,
          question3: updates.filter(u => u.rollingIndex === 2).length
        },
        samples: updates.slice(0, 15).map(u => ({
          id: u.id,
          before: u.original,
          after: u.newQuestion,
          rollingIndex: u.rollingIndex + 1
        }))
      });
    }

    // 실제 업데이트 실행 (배치 처리)
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];
    const batchSize = 100;

    console.log(`🔄 ${updates.length}개 레코드를 ${batchSize}개씩 배치 변환 시작...`);

    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);
      console.log(`📦 배치 ${Math.floor(i / batchSize) + 1}/${Math.ceil(updates.length / batchSize)} 처리 중... (${batch.length}개)`);

      // 배치별로 병렬 처리
      const batchPromises = batch.map(async (update) => {
        try {
          const { error } = await supabase
            .from('comprehensive_questions')
            .update({
              question_text: update.newQuestion
            })
            .eq('id', update.id);

          if (error) {
            console.error(`레코드 ${update.id} 변환 실패:`, error);
            return { success: false, id: update.id, error: error.message };
          } else {
            return { success: true, id: update.id };
          }
        } catch (error) {
          console.error(`레코드 ${update.id} 변환 중 예외:`, error);
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
      if (i + batchSize < updates.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`🎯 question_text 롤링 변환 완료: 총 성공 ${successCount}개, 실패 ${errorCount}개`);

    return NextResponse.json({
      success: true,
      dryRun: false,
      message: `question_text 롤링 변환 완료: ${successCount}개 성공, ${errorCount}개 실패`,
      totalFound: allRecords.length,
      needsUpdate: updates.length,
      successCount,
      errorCount,
      distribution: {
        question1: updates.filter(u => u.rollingIndex === 0).length,
        question2: updates.filter(u => u.rollingIndex === 1).length,
        question3: updates.filter(u => u.rollingIndex === 2).length
      },
      errors: errors.slice(0, 10) // 최대 10개 오류만 반환
    });

  } catch (error) {
    console.error('question_text 롤링 변환 중 오류:', error);
    return NextResponse.json({
      success: false,
      error: 'question_text 롤링 변환 중 서버 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : '알 수 없는 오류'
    });
  }
}
