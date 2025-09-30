import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

// GET: 모든 교육과정 데이터 조회
export async function GET() {
  try {
    const data = await db.getCurriculumData();
    
    return NextResponse.json({
      success: true,
      data: data || [],
      count: data?.length || 0
    });
  } catch (error) {
    console.error('교육과정 데이터 조회 오류:', error);
    return NextResponse.json({
      success: false,
      message: '데이터 조회 중 오류가 발생했습니다.',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST: 새 교육과정 데이터 추가
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 필수 필드 검증
    const requiredFields = ['subject', 'grade', 'area', 'main_topic', 'sub_topic', 'keywords'];
    for (const field of requiredFields) {
      if (!body[field] || body[field].trim() === '') {
        return NextResponse.json({
          success: false,
          message: `${field} 필드는 필수입니다.`
        }, { status: 400 });
      }
    }

    // 중복 검사 (CSV 업로드 시에는 건너뛰기)
    if (!body.skipDuplicateCheck) {
      const existingData = await db.getCurriculumData({
        subject: body.subject,
        grade: body.grade,
        area: body.area
      });

      const isDuplicate = existingData.some(item => 
        item.main_topic === body.main_topic && 
        item.sub_topic === body.sub_topic
      );

      if (isDuplicate) {
        return NextResponse.json({
          success: false,
          message: '동일한 주제의 데이터가 이미 존재합니다.'
        }, { status: 400 });
      }
    }

    // 데이터 생성
    const newData = [{
      subject: body.subject,
      grade: body.grade,
      area: body.area,
      session_number: body.session_number || '',
      main_topic: body.main_topic,
      sub_topic: body.sub_topic,
      keywords: body.keywords,
      keywords_for_passages: body.keywords_for_passages || '',
      keywords_for_questions: body.keywords_for_questions || '',
      is_active: body.is_active !== false // 기본값 true
    }];

    const result = await db.createCurriculumData(newData);

    return NextResponse.json({
      success: true,
      message: '데이터가 성공적으로 추가되었습니다.',
      data: result[0]
    });

  } catch (error) {
    console.error('교육과정 데이터 추가 오류:', error);
    return NextResponse.json({
      success: false,
      message: '데이터 추가 중 오류가 발생했습니다.',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 