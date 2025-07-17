import { NextRequest, NextResponse } from 'next/server';
import { readFromSheet } from '@/lib/google-sheets';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const setId = searchParams.get('setId');
    
    if (!setId) {
      return NextResponse.json({
        success: false,
        error: 'setId 파라미터가 필요합니다.'
      }, { status: 400 });
    }
    
    console.log(`Fetching details for set: ${setId}`);
    
    // 메인 데이터 조회
    const finalSetsData = await readFromSheet('final_sets');
    const [, ...finalRows] = finalSetsData;
    
    const mainData = finalRows.find(row => row[1] === setId);
    if (!mainData) {
      return NextResponse.json({
        success: false,
        error: '해당 setId의 데이터를 찾을 수 없습니다.'
      }, { status: 404 });
    }
    
    // 어휘 문제 상세 데이터 조회
    const vocabDetailsData = await readFromSheet('vocabulary_details');
    const [, ...vocabRows] = vocabDetailsData;
    const vocabularyQuestions = vocabRows
      .filter(row => row[1] === setId)
      .map(row => ({
        timestamp: row[0],
        setId: row[1],
        questionId: row[2],
        term: row[3],
        question: row[4],
        options: row[5] ? JSON.parse(row[5]) : [],
        answer: row[6],
        explanation: row[7]
      }));
    
    // 종합 문제 상세 데이터 조회
    const compDetailsData = await readFromSheet('comprehensive_details');
    const [, ...compRows] = compDetailsData;
    const comprehensiveQuestions = compRows
      .filter(row => row[1] === setId)
      .map(row => {
        const isSupplementaryValue = row[8];
        const isSupplementary = isSupplementaryValue && (isSupplementaryValue.toString().toLowerCase() === 'true');
        
        // 디버깅용 로그
        console.log(`Question ${row[2]}: isSupplementaryValue = "${isSupplementaryValue}", parsed = ${isSupplementary}`);
        
        return {
          timestamp: row[0],
          setId: row[1],
          questionId: row[2],
          type: row[3],
          question: row[4],
          options: row[5] ? JSON.parse(row[5]) : null,
          answer: row[6],
          explanation: row[7],
          isSupplementary,
          originalQuestionId: row[9] || null
        };
      });
    
    // 문제 유형별 통계 조회
    const typeStatsData = await readFromSheet('question_type_stats');
    const [, ...statsRows] = typeStatsData;
    const questionTypeStats = statsRows
      .filter(row => row[1] === setId)
      .map(row => ({
        timestamp: row[0],
        setId: row[1],
        questionType: row[2],
        count: parseInt(row[3]) || 0
      }));
    
    // 메인 데이터 파싱
    const setDetails = {
      timestamp: mainData[0],
      setId: mainData[1],
      division: mainData[2],
      subject: mainData[3],
      grade: mainData[4],
      area: mainData[5],
      maintopic: mainData[6],
      subtopic: mainData[7],
      keyword: mainData[8],
      passageTitle: mainData[9],
      vocabularyCount: parseInt(mainData[10]) || 0,
      comprehensiveCount: parseInt(mainData[11]) || 0,
      inputData: mainData[12] ? JSON.parse(mainData[12]) : null,
      passageData: mainData[13] ? JSON.parse(mainData[13]) : null,
      vocabularyData: mainData[14] ? JSON.parse(mainData[14]) : null,
      comprehensiveData: mainData[15] ? JSON.parse(mainData[15]) : null,
      createdAt: new Date(mainData[0]).toISOString(),
      totalQuestions: (parseInt(mainData[10]) || 0) + (parseInt(mainData[11]) || 0)
    };
    
    // 응답 구성
    const response = {
      success: true,
      setDetails,
      vocabularyQuestions,
      comprehensiveQuestions,
      questionTypeStats,
      summary: {
        totalVocabularyQuestions: vocabularyQuestions.length,
        totalComprehensiveQuestions: comprehensiveQuestions.length,
        typeDistribution: questionTypeStats.reduce((acc, stat) => {
          acc[stat.questionType] = stat.count;
          return acc;
        }, {} as Record<string, number>),
        hasSupplementaryQuestions: comprehensiveQuestions.some(q => q.isSupplementary)
      }
    };
    
    console.log(`Set details fetched successfully for ${setId}`);
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Error fetching set details:', error);
    
    return NextResponse.json({
      success: false,
      error: '세트 상세 정보를 가져오는 중 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 });
  }
} 