import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Extract query parameters
    const filters = {
      grade: searchParams.get('grade') || undefined,
      subject: searchParams.get('subject') || undefined,
      area: searchParams.get('area') || undefined,
    };

    // Remove undefined values
    const cleanFilters = Object.fromEntries(
      Object.entries(filters).filter(([_, v]) => v !== undefined)
    );

    // Get content sets from Supabase
    const contentSets = await db.getContentSets(cleanFilters);

    // Transform data to include compatibility fields for the management page
    const transformedData = contentSets.map(item => ({
      ...item,
      // 레거시 호환성을 위한 별칭들
      setId: item.id,
      passageTitle: item.title,
      userId: item.user_id,
      division: item.division,
      mainTopic: item.main_topic,
      subTopic: item.sub_topic,
      keywords: item.keywords,
      vocabularyQuestionCount: item.total_vocabulary_questions,
      comprehensiveQuestionCount: item.total_comprehensive_questions,
      paragraphCount: item.total_passages,
      vocabularyWordsCount: item.total_vocabulary_terms,
      totalQuestions: item.total_vocabulary_questions + item.total_comprehensive_questions,
      createdAt: item.created_at,
      updatedAt: item.updated_at
    }));

    // Calculate statistics
    const stats = {
      total: contentSets.length, // 관리 페이지에서 stats.total을 참조함
      totalSets: contentSets.length,
      subjects: [...new Set(contentSets.map(set => set.subject))],
      grades: [...new Set(contentSets.map(set => set.grade))],
      areas: [...new Set(contentSets.map(set => set.area))],
      totalVocabularyQuestions: contentSets.reduce((sum, set) => sum + set.total_vocabulary_questions, 0),
      totalComprehensiveQuestions: contentSets.reduce((sum, set) => sum + set.total_comprehensive_questions, 0)
    };

    return NextResponse.json({
      success: true,
      data: transformedData,
      stats,
      total: contentSets.length,
      version: 'supabase',
      message: 'Content sets retrieved successfully from Supabase'
    });

  } catch (error) {
    console.error('Supabase retrieval error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to retrieve content sets from Supabase',
      error: error instanceof Error ? error.message : 'Unknown error',
      data: [],
      stats: { 
        total: 0, 
        totalSets: 0, 
        subjects: [], 
        grades: [], 
        areas: [], 
        totalVocabularyQuestions: 0, 
        totalComprehensiveQuestions: 0 
      },
      total: 0
    }, { status: 500 });
  }
}