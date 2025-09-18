const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase 환경변수가 설정되지 않았습니다')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function fixPhysicsPrompt() {
  try {
    console.log('🔧 물리 프롬프트 키 수정 시작...')
    
    // 1. 모든 물리 관련 프롬프트 조회
    const { data: physicsPrompts, error: selectError } = await supabase
      .from('system_prompts_v3')
      .select('*')
      .or('key.like.*physics*,category.eq.area')
    
    if (selectError) {
      console.error('❌ 프롬프트 조회 실패:', selectError)
      return
    }
    
    console.log('📋 물리 관련 프롬프트들:')
    physicsPrompts?.forEach(prompt => {
      console.log(`  - ID: ${prompt.id}, Key: "${prompt.key}", Category: ${prompt.category}, SubCategory: ${prompt.subcategory}`)
    })
    
    // 2. 손상된 키를 가진 프롬프트 찾기
    const brokenPrompt = physicsPrompts?.find(p => 
      p.key.includes('유rnwhfmf') || 
      (p.category === 'area' && p.subcategory === 'areaPhysics' && p.key !== 'physics')
    )
    
    if (brokenPrompt) {
      console.log(`🎯 손상된 프롬프트 발견: ID ${brokenPrompt.id}, Key: "${brokenPrompt.key}"`)
      
      // 3. 키 수정
      const { data: updated, error: updateError } = await supabase
        .from('system_prompts_v3')
        .update({ 
          key: 'physics',
          prompt_id: 'area-physics',
          updated_at: new Date().toISOString()
        })
        .eq('id', brokenPrompt.id)
        .select()
      
      if (updateError) {
        console.error('❌ 키 수정 실패:', updateError)
      } else {
        console.log('✅ 키 수정 완료!')
        console.log('수정된 프롬프트:', updated[0])
      }
    } else {
      console.log('✅ 손상된 프롬프트가 없거나 이미 수정되었습니다.')
    }
    
  } catch (error) {
    console.error('❌ 예상치 못한 오류:', error)
  }
}

// 실행
fixPhysicsPrompt().then(() => {
  console.log('🏁 스크립트 완료')
  process.exit(0)
})