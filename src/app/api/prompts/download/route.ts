import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const { data: prompts, error } = await supabase
      .from('system_prompts_v3')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) {
      console.error('프롬프트 조회 오류:', error)
      return NextResponse.json(
        { 
          success: false, 
          error: '프롬프트 데이터를 가져오는데 실패했습니다.' 
        },
        { status: 500 }
      )
    }

    if (!prompts || prompts.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: '다운로드할 프롬프트 데이터가 없습니다.' 
        },
        { status: 404 }
      )
    }

    // CSV 형태로 데이터 변환
    const headers = [
      'ID',
      'Prompt ID', 
      'Category',
      'Sub Category',
      'Name',
      'Key',
      'Prompt Text',
      'Description',
      'Is Active',
      'Is Default',
      'Version',
      'Created At',
      'Updated At',
      'Created By',
      'Updated By'
    ]

    const csvRows = [
      headers.join(','),
      ...prompts.map(prompt => [
        `"${prompt.id || ''}"`,
        `"${prompt.prompt_id || ''}"`,
        `"${prompt.category || ''}"`,
        `"${prompt.sub_category || ''}"`,
        `"${prompt.name || ''}"`,
        `"${prompt.key || ''}"`,
        `"${(prompt.prompt_text || '').replace(/"/g, '""')}"`, // CSV에서 큰따옴표 이스케이프
        `"${(prompt.description || '').replace(/"/g, '""')}"`,
        `"${prompt.is_active ? 'true' : 'false'}"`,
        `"${prompt.is_default ? 'true' : 'false'}"`,
        `"${prompt.version || ''}"`,
        `"${prompt.created_at || ''}"`,
        `"${prompt.updated_at || ''}"`,
        `"${prompt.created_by || ''}"`,
        `"${prompt.updated_by || ''}"`
      ].join(','))
    ]

    const csvContent = csvRows.join('\n')
    
    // UTF-8 BOM 추가하여 한글 인코딩 문제 해결
    const bom = '\uFEFF'
    const csvWithBom = bom + csvContent

    // 현재 날짜시간으로 파일명 생성
    const now = new Date()
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, -5)
    const filename = `system_prompts_v3_${timestamp}.csv`

    return new NextResponse(csvWithBom, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache'
      }
    })

  } catch (error) {
    console.error('프롬프트 다운로드 중 오류:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: '프롬프트 다운로드 중 오류가 발생했습니다.' 
      },
      { status: 500 }
    )
  }
}