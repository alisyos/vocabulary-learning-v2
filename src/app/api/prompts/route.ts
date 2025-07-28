import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { SystemPrompt, PromptGroup, PromptsResponse, PromptCategory, PromptSubCategory } from '@/types';

export async function GET(request: NextRequest) {
  try {
    // 하이브리드 방식: DB에서 먼저 시도하고, 실패하면 하드코딩된 프롬프트 사용
    let prompts;
    let isFromDatabase = false;
    
    try {
      // 데이터베이스에서 프롬프트 조회 시도
      prompts = await db.getSystemPrompts();
      if (prompts && prompts.length > 0) {
        console.log(`🗄️ 데이터베이스에서 ${prompts.length}개 프롬프트를 로드했습니다.`);
        isFromDatabase = true;
      } else {
        throw new Error('데이터베이스가 비어있음');
      }
    } catch (dbError) {
      // 데이터베이스 실패 시 하드코딩된 프롬프트 사용
      console.log('📂 데이터베이스 조회 실패, 하드코딩된 프롬프트를 사용합니다.');
      const { DEFAULT_PROMPTS_V2 } = await import('@/lib/promptsV2');
      prompts = DEFAULT_PROMPTS_V2;
      isFromDatabase = false;
    }
    
    console.log(`📚 로드된 프롬프트 수: ${prompts.length}개`);
    console.log(`🔍 첫 번째 프롬프트 확인: ${prompts[0]?.name || 'undefined'}`);
    console.log(`🔧 데이터베이스 사용 여부: ${isFromDatabase}`)
    
    // 카테고리별로 그룹화
    const groups: PromptGroup[] = [];
    
    // 카테고리 정의
    const categories = [
      { category: 'passage', categoryName: '지문 생성' },
      { category: 'vocabulary', categoryName: '어휘 문제 생성' },
      { category: 'paragraph', categoryName: '문단 문제 생성' },
      { category: 'comprehensive', categoryName: '종합 문제 생성' },
      { category: 'subject', categoryName: '과목' },
      { category: 'area', categoryName: '영역' },
      { category: 'division', categoryName: '구분(학습단계)' }
    ];

    // 서브카테고리 정의
    const subCategoryNames: { [key: string]: string } = {
      // 지문 생성
      'system': '전체 시스템 프롬프트',
      'length': '지문 길이별 프롬프트',
      'textType': '유형별 프롬프트',
      // 어휘 문제 생성
      'vocabularySystem': '전체 시스템 프롬프트',
      'vocabularyType': '문제 유형별 프롬프트',
      // 문단 문제 생성
      'paragraphSystem': '전체 시스템 프롬프트',
      'paragraphType': '문제 유형별 프롬프트',
      // 종합 문제 생성
      'comprehensiveSystem': '전체 시스템 프롬프트',
      'comprehensiveType': '문제 유형별 프롬프트',
      // 과목
      'subjectScience': '과학',
      'subjectSocial': '사회',
      // 영역
      'areaGeography': '지리',
      'areaSocial': '일반사회',
      'areaPolitics': '정치',
      'areaEconomy': '경제',
      'areaChemistry': '화학',
      'areaPhysics': '물리',
      'areaBiology': '생명',
      'areaEarth': '지구과학',
      'areaScienceInquiry': '과학탐구',
      // 구분
      'divisionMiddle': '중학생(1~3학년)',
      'divisionElemHigh': '초등학교 고학년(5~6학년)',
      'divisionElemMid': '초등학교 중학년(3~4학년)'
    };

    categories.forEach(cat => {
      const categoryPrompts = prompts.filter(p => p.category === cat.category);
      
      // 서브카테고리별로 그룹화
      const subCategories: { [key: string]: SystemPrompt[] } = {};
      
      categoryPrompts.forEach(prompt => {
        if (!subCategories[prompt.subCategory]) {
          subCategories[prompt.subCategory] = [];
        }
        subCategories[prompt.subCategory].push(prompt);
      });

      // 서브카테고리 배열로 변환 (순서 유지)
      const subCategoryOrder: Record<string, string[]> = {
        'passage': ['system', 'length', 'textType'],
        'vocabulary': ['vocabularySystem', 'vocabularyType'],
        'paragraph': ['paragraphSystem', 'paragraphType'],
        'comprehensive': ['comprehensiveSystem', 'comprehensiveType'],
        'subject': ['subjectScience', 'subjectSocial'],
        'area': ['areaGeography', 'areaSocial', 'areaPolitics', 'areaEconomy', 'areaChemistry', 'areaPhysics', 'areaBiology', 'areaEarth', 'areaScienceInquiry'],
        'division': ['divisionMiddle', 'divisionElemHigh', 'divisionElemMid']
      };

      const orderedSubCategories = (subCategoryOrder[cat.category] || [])
        .filter(subCat => subCategories[subCat])
        .map(subCat => ({
          subCategory: subCat as PromptSubCategory,
          subCategoryName: subCategoryNames[subCat] || subCat,
          prompts: subCategories[subCat]
        }));

      // 순서가 정의되지 않은 서브카테고리 추가
      Object.entries(subCategories).forEach(([subCat, subPrompts]) => {
        if (!orderedSubCategories.find(s => s.subCategory === subCat)) {
          orderedSubCategories.push({
            subCategory: subCat as PromptSubCategory,
            subCategoryName: subCategoryNames[subCat] || subCat,
            prompts: subPrompts
          });
        }
      });

      const subCategoryArray = orderedSubCategories;

      groups.push({
        category: cat.category as PromptCategory,
        categoryName: cat.categoryName,
        subCategories: subCategoryArray
      });
    });

    const response: PromptsResponse = {
      success: true,
      data: groups,
      version: '1.0',
      message: isFromDatabase ? '프롬프트 데이터를 성공적으로 조회했습니다.' : '기본 프롬프트를 사용합니다.',
      isFromDatabase: isFromDatabase
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching prompts:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '프롬프트 조회 중 오류가 발생했습니다.',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// 프롬프트 수정 API
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { promptId, promptText, changeReason } = body;

    if (!promptId || !promptText) {
      return NextResponse.json(
        { success: false, error: '필수 필드가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // 하드코딩된 프롬프트 중에서 해당 프롬프트 찾기
    const { DEFAULT_PROMPTS_V2 } = await import('@/lib/promptsV2');
    const originalPrompt = DEFAULT_PROMPTS_V2.find(p => p.promptId === promptId);
    
    if (!originalPrompt) {
      return NextResponse.json(
        { success: false, error: '프롬프트를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 데이터베이스에 수정된 프롬프트 저장 시도 (모든 카테고리 지원)
    try {
      // system_prompts_v3 테이블에 직접 저장
      const { supabase } = await import('@/lib/supabase');
      
      const updateData = {
        prompt_id: promptId,
        category: originalPrompt.category,
        sub_category: originalPrompt.subCategory,
        name: originalPrompt.name,
        key: originalPrompt.key,
        prompt_text: promptText, // 수정된 내용
        description: originalPrompt.description || '',
        is_active: true,
        is_default: false, // 수정된 버전은 기본값이 아님
        version: 2, // 수정된 버전
        created_by: 'user',
        updated_by: 'user'
      };

      // UPSERT로 저장
      const { data, error } = await supabase
        .from('system_prompts_v3')
        .upsert(updateData, { 
          onConflict: 'prompt_id',
          returning: 'minimal'
        });

      if (error) {
        console.error('프롬프트 저장 실패:', error);
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        
        // 실제 DB 저장 실패 시 에러 반환
        return NextResponse.json({
          success: false,
          error: '프롬프트 저장에 실패했습니다.',
          message: error.message
        }, { status: 500 });
      } else {
        console.log(`✅ 프롬프트 DB 저장 성공: ${promptId} (카테고리: ${originalPrompt.category})`);
      }

    } catch (dbError) {
      console.error('데이터베이스 저장 중 오류:', dbError);
      return NextResponse.json({
        success: false,
        error: '데이터베이스 연결 중 오류가 발생했습니다.',
        message: dbError instanceof Error ? dbError.message : 'Unknown error'
      }, { status: 500 });
    }

    // 캐시 업데이트 (DB 저장 성공 여부와 관계없이)
    const { updatePromptCache } = await import('@/lib/prompts');
    updatePromptCache(originalPrompt.category, originalPrompt.subCategory, originalPrompt.key, promptText);
    
    return NextResponse.json({
      success: true,
      message: `프롬프트가 데이터베이스에 저장되었습니다. (카테고리: ${originalPrompt.category})`,
      promptId: promptId,
      updatedAt: new Date().toISOString(),
      category: originalPrompt.category
    });

  } catch (error) {
    console.error('프롬프트 수정 중 오류:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '프롬프트 수정 중 오류가 발생했습니다.',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}