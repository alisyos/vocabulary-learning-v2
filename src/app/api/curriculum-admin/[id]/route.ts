import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

// PUT: 교육과정 데이터 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
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

    // 데이터 수정
    const updateData = {
      subject: body.subject,
      grade: body.grade,
      grade_number: body.grade_number || '',
      area: body.area,
      session_number: body.session_number || '',
      main_topic: body.main_topic,
      sub_topic: body.sub_topic,
      keywords: body.keywords,
      keywords_for_passages: body.keywords_for_passages || '',
      keywords_for_questions: body.keywords_for_questions || '',
      is_active: body.is_active !== false
    };

    const result = await db.updateCurriculumData(id, updateData);

    return NextResponse.json({
      success: true,
      message: '데이터가 성공적으로 수정되었습니다.',
      data: result
    });

  } catch (error) {
    console.error('교육과정 데이터 수정 오류:', error);
    return NextResponse.json({
      success: false,
      message: '데이터 수정 중 오류가 발생했습니다.',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// DELETE: 교육과정 데이터 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    await db.deleteCurriculumData(id);

    return NextResponse.json({
      success: true,
      message: '데이터가 성공적으로 삭제되었습니다.'
    });

  } catch (error) {
    console.error('교육과정 데이터 삭제 오류:', error);
    return NextResponse.json({
      success: false,
      message: '데이터 삭제 중 오류가 발생했습니다.',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 