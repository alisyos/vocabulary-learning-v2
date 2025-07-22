import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { SystemPrompt, PromptGroup, PromptsResponse, PromptCategory, PromptSubCategory } from '@/types';

export async function GET(request: NextRequest) {
  try {
    let prompts = await db.getSystemPrompts();
    let isFromDatabase = true;
    
    // 데이터베이스가 비어있거나 초기화되지 않은 경우, 기본 프롬프트를 사용
    if (prompts.length === 0) {
      console.log('데이터베이스가 비어있음. 기본 프롬프트를 사용합니다.');
      isFromDatabase = false;
      const { getDefaultPrompts } = await import('@/lib/prompts');
      const defaultPrompts = getDefaultPrompts();
      
      // 기본 프롬프트를 SystemPrompt 형식으로 변환
      prompts = defaultPrompts.map(p => ({
        id: undefined,
        promptId: p.promptId,
        category: p.category,
        subCategory: p.subCategory,
        name: p.name,
        key: p.key,
        promptText: p.promptText,
        description: p.description || '',
        isActive: true,
        isDefault: true,
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'system',
        updatedBy: 'system'
      }));
    }
    
    // 카테고리별로 그룹화
    const groups: PromptGroup[] = [];
    
    // 카테고리 정의
    const categories = [
      { category: 'passage', categoryName: '지문 생성' },
      { category: 'vocabulary', categoryName: '어휘 문제 생성' },
      { category: 'comprehensive', categoryName: '종합 문제 생성' }
    ];

    // 서브카테고리 정의
    const subCategoryNames: { [key: string]: string } = {
      'system': '전체 시스템 프롬프트',
      'division': '구분별 (학습 단계)',
      'area': '영역별 (교과 영역)',
      'length': '길이별 (출력 형식)',
      'textType': '유형별 (글의 유형)',
      'vocabularyBase': '기본 어휘 문제',
      'questionGrade': '학년별 (문제 난이도)',
      'questionType': '문제 유형별',
      'comprehensiveType': '종합 문제 유형별',
      'outputFormat': '출력 형식별'
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

      // 서브카테고리 배열로 변환
      const subCategoryArray = Object.entries(subCategories).map(([subCat, subPrompts]) => ({
        subCategory: subCat as PromptSubCategory,
        subCategoryName: subCategoryNames[subCat] || subCat,
        prompts: subPrompts.sort((a, b) => a.name.localeCompare(b.name))
      }));

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