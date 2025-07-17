import { NextRequest, NextResponse } from 'next/server';
import { readFromSheet } from '@/lib/google-sheets';

export async function GET(request: NextRequest) {
  try {
    console.log('Fetching saved data sets from Google Sheets...');
    
    // URL 파라미터에서 필터 옵션 추출
    const { searchParams } = new URL(request.url);
    const subject = searchParams.get('subject');
    const grade = searchParams.get('grade');
    const area = searchParams.get('area');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    
    // final_sets 시트에서 메인 데이터 조회
    const rawData = await readFromSheet('final_sets');
    
    if (!rawData || rawData.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        total: 0,
        message: '저장된 데이터가 없습니다.'
      });
    }
    
    // 헤더 제외하고 데이터 파싱
    const [headers, ...rows] = rawData;
    
    if (!headers || headers.length < 16) {
      return NextResponse.json({
        success: false,
        error: 'Google Sheets 스키마가 올바르지 않습니다.',
        details: 'final_sets 시트에 필요한 컬럼이 부족합니다.'
      }, { status: 500 });
    }
    
    // 데이터 변환
    const dataSets = rows
      .filter(row => row.length >= 10) // 최소한의 데이터가 있는 행만
      .map(row => ({
        timestamp: row[0] || '',
        setId: row[1] || '',
        division: row[2] || '',
        subject: row[3] || '',
        grade: row[4] || '',
        area: row[5] || '',
        maintopic: row[6] || '',
        subtopic: row[7] || '',
        keyword: row[8] || '',
        passageTitle: row[9] || '',
        vocabularyCount: parseInt(row[10]) || 0,
        comprehensiveCount: parseInt(row[11]) || 0,
        inputData: row[12] ? JSON.parse(row[12]) : null,
        passageData: row[13] ? JSON.parse(row[13]) : null,
        vocabularyData: row[14] ? JSON.parse(row[14]) : null,
        comprehensiveData: row[15] ? JSON.parse(row[15]) : null,
        createdAt: new Date(row[0]).toISOString(),
        totalQuestions: (parseInt(row[10]) || 0) + (parseInt(row[11]) || 0)
      }))
      .filter(item => {
        // 필터 적용
        if (subject && item.subject !== subject) return false;
        if (grade && item.grade !== grade) return false;
        if (area && item.area !== area) return false;
        return true;
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()); // 최신순 정렬
    
    // 제한 적용
    const limitedData = limit ? dataSets.slice(0, limit) : dataSets;
    
    // 통계 정보 생성
    const stats = {
      total: dataSets.length,
      subjects: [...new Set(dataSets.map(item => item.subject))],
      grades: [...new Set(dataSets.map(item => item.grade))],
      areas: [...new Set(dataSets.map(item => item.area))],
      totalVocabularyQuestions: dataSets.reduce((sum, item) => sum + item.vocabularyCount, 0),
      totalComprehensiveQuestions: dataSets.reduce((sum, item) => sum + item.comprehensiveCount, 0),
      mostRecentUpdate: dataSets.length > 0 ? dataSets[0].timestamp : null
    };
    
    console.log(`Found ${dataSets.length} data sets`);
    
    return NextResponse.json({
      success: true,
      data: limitedData,
      stats,
      total: dataSets.length,
      filtered: limitedData.length,
      filters: { subject, grade, area, limit }
    });
    
  } catch (error) {
    console.error('Error fetching saved data sets:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Google Sheets에서 데이터를 가져오는 중 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 });
  }
} 