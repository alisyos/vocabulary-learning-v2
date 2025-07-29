import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 물리 프롬프트 키 수정 시작...')
    
    // 1. 손상된 키를 가진 레코드 찾기
    const { data: brokenPrompts, error: findError } = await supabase
      .from('system_prompts_v3')
      .select('*')
      .eq('category', 'area')
      .eq('subcategory', 'areaPhysics')
      .or('key.like.*physics*,prompt_id.like.*physics*')
    
    if (findError) {
      console.error('손상된 프롬프트 찾기 실패:', findError)
      throw findError
    }
    
    console.log('발견된 물리 프롬프트들:', brokenPrompts)
    
    // 2. 손상된 키를 가진 레코드가 있으면 수정
    if (brokenPrompts && brokenPrompts.length > 0) {
      const updates = []
      
      for (const prompt of brokenPrompts) {
        if (prompt.key.includes('유rnwhfmf') || prompt.key !== 'physics') {
          console.log(`🔧 손상된 키 발견: ${prompt.key} -> physics로 수정`)
          
          const { data: updated, error: updateError } = await supabase
            .from('system_prompts_v3')
            .update({ 
              key: 'physics',
              prompt_id: 'area-physics',
              updated_at: new Date().toISOString()
            })
            .eq('id', prompt.id)
            .select()
          
          if (updateError) {
            console.error(`프롬프트 ${prompt.id} 수정 실패:`, updateError)
          } else {
            console.log(`✅ 프롬프트 ${prompt.id} 수정 완료:`, updated)
            updates.push(updated[0])
          }
        }
      }
      
      return NextResponse.json({
        success: true,
        message: `${updates.length}개 프롬프트 수정 완료`,
        updated: updates,
        originalPrompts: brokenPrompts
      })
    } else {
      return NextResponse.json({
        success: true,
        message: '수정할 손상된 프롬프트가 없습니다',
        prompts: brokenPrompts
      })
    }
    
  } catch (error) {
    console.error('물리 프롬프트 수정 실패:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // 현재 물리 프롬프트 상태 확인
    const { data: physicsPrompts, error } = await supabase
      .from('system_prompts_v3')
      .select('*')
      .eq('category', 'area')
      .eq('subcategory', 'areaPhysics')
    
    if (error) {
      throw error
    }
    
    return NextResponse.json({
      success: true,
      physicsPrompts: physicsPrompts || [],
      count: physicsPrompts?.length || 0
    })
    
  } catch (error) {
    console.error('물리 프롬프트 조회 실패:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}