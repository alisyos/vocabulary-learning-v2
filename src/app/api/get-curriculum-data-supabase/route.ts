import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/supabase';
import { VocabularyTerm, VocabularyQuestion, ComprehensiveQuestionDB } from '@/types';

export async function GET(request: NextRequest) {
  try {
    console.log('Supabase에서 콘텐츠 세트 데이터를 가져오는 중...');
    
    // URL 파라미터에서 필터 조건 추출
    const { searchParams } = new URL(request.url);
    const setId = searchParams.get('setId');
    const filters = {
      subject: searchParams.get('subject') || undefined,
      grade: searchParams.get('grade') || undefined,
      area: searchParams.get('area') || undefined
    };
    
    // setId가 있으면 개별 콘텐츠 세트 상세 정보 가져오기
    if (setId) {
      try {
        const setDetails = await db.getContentSetById(setId);
        console.log('개별 콘텐츠 세트 상세 정보 조회:', setId);
        
        // 상세보기용 응답 형태로 변환 (상세보기 페이지가 기대하는 구조로)
        const detailResponse = {
          success: true,
          data: {
            contentSet: {
              id: setDetails.id,
              title: setDetails.title,
              passageTitle: setDetails.title, // 상세보기 페이지에서 기대하는 필드
              user_id: setDetails.user_id,
              userId: setDetails.user_id,
              division: setDetails.division,
              grade: setDetails.grade,
              subject: setDetails.subject,
              area: setDetails.area,
              main_topic: setDetails.main_topic,
              sub_topic: setDetails.sub_topic,
              mainTopic: setDetails.main_topic,
              subTopic: setDetails.sub_topic,
              keywords: setDetails.keywords,
              passage_length: setDetails.passage_length, // DB 필드명 그대로
              passageLength: setDetails.passage_length, // camelCase 별칭
              text_type: setDetails.text_type, // DB 필드명 그대로
              textType: setDetails.text_type, // camelCase 별칭
              introduction_question: setDetails.introduction_question, // 도입 질문 추가
              total_passages: setDetails.total_passages,
              total_vocabulary_terms: setDetails.total_vocabulary_terms,
              total_vocabulary_questions: setDetails.total_vocabulary_questions,
              total_paragraph_questions: setDetails.total_paragraph_questions,
              total_comprehensive_questions: setDetails.total_comprehensive_questions,
              status: setDetails.status,
              created_at: setDetails.created_at,
              updated_at: setDetails.updated_at,
              createdAt: setDetails.created_at,
              updatedAt: setDetails.updated_at
            },
            // 관련 데이터들
            // 첫 번째 지문 (기존 호환성 유지)
            passage: setDetails.passages?.[0] ? {
              title: setDetails.passages[0].title,
              paragraphs: [
                setDetails.passages[0].paragraph_1,
                setDetails.passages[0].paragraph_2,
                setDetails.passages[0].paragraph_3,
                setDetails.passages[0].paragraph_4,
                setDetails.passages[0].paragraph_5,
                setDetails.passages[0].paragraph_6,
                setDetails.passages[0].paragraph_7,
                setDetails.passages[0].paragraph_8,
                setDetails.passages[0].paragraph_9,
                setDetails.passages[0].paragraph_10
              ].filter(p => p && p.trim() !== '')
            } : null,
            // 모든 지문 배열 (여러 지문 지원)
            passages: (setDetails.passages || []).map((passage: any) => ({
              id: passage.id,
              title: passage.title,
              paragraphs: [
                passage.paragraph_1,
                passage.paragraph_2,
                passage.paragraph_3,
                passage.paragraph_4,
                passage.paragraph_5,
                passage.paragraph_6,
                passage.paragraph_7,
                passage.paragraph_8,
                passage.paragraph_9,
                passage.paragraph_10
              ].filter(p => p && p.trim() !== '')
            })),
            vocabularyTerms: (setDetails.vocabulary_terms || []).map((term: VocabularyTerm) => {
              // passage_id로 해당 지문 정보 찾기
              const relatedPassage = (setDetails.passages || []).find((p: any) => p.id === term.passage_id);
              return {
                id: term.id,
                term: term.term,
                definition: term.definition,
                example_sentence: term.example_sentence,
                has_question_generated: term.has_question_generated, // has_question_generated 필드 추가
                passage_id: term.passage_id, // 지문 ID 추가
                passage_number: relatedPassage?.passage_number || 1, // 지문 번호
                passage_title: relatedPassage?.title || '지문' // 지문 제목
              };
            }),
            vocabularyQuestions: (setDetails.vocabulary_questions || []).map((q: VocabularyQuestion) => {
              console.log('어휘문제 DB 데이터:', q);
              const result = {
                id: q.id,
                questionId: `vocab-${q.id}`,
                term: q.term || '', // DB에서 가져온 어휘 용어
                question: q.question_text,
                options: [q.option_1, q.option_2, q.option_3, q.option_4, q.option_5].filter(opt => opt && opt.trim() !== ''),
                correctAnswer: q.correct_answer,
                answer: q.correct_answer, // 호환성을 위한 별칭
                explanation: q.explanation,
                // 🆕 상세 문제 유형과 난이도 필드 추가
                question_type: q.question_type,
                detailed_question_type: q.detailed_question_type,
                difficulty: q.difficulty,
                // 🆕 초성힌트 필드 추가
                answer_initials: q.answer_initials,
                answerInitials: q.answer_initials, // camelCase 별칭
                // 추가 필드들 (디버깅용 및 호환성)
                detailedQuestionType: q.detailed_question_type,
                questionType: q.question_type
              };
              console.log('어휘문제 변환 결과:', result);
              return result;
            }),
            paragraphQuestions: (setDetails.paragraph_questions || []).map((q: any) => {
              const isWordOrderQuestion = q.question_type === '어절 순서 맞추기';
              
              // 기존 데이터 호환성: word_segments가 null이고 어절 순서 맞추기 문제인 경우
              // 문제 텍스트에서 어절들을 추출하거나 첫 번째 옵션에서 추출
              let wordSegments = q.word_segments || [];
              if (isWordOrderQuestion && (!wordSegments || wordSegments.length === 0)) {
                // 문제 텍스트에서 '/' 구분자로 추출 (예: "1) 잘게 / 음식이 / 부서지고...")
                if (q.question_text && q.question_text.includes('/')) {
                  const lines = q.question_text.split('\n');
                  for (const line of lines) {
                    if (line.includes('/') && (line.includes('1)') || line.includes('2)') || line.includes('3)'))) {
                      const parts = line.split(')');
                      if (parts.length > 1) {
                        wordSegments = parts[1].split('/').map(w => w.trim().replace(/\.$/, '')).filter(w => w.length > 0);
                        break;
                      }
                    }
                  }
                }
                
                // 그래도 없으면 옵션 1에서 어절들을 추출 (기존 정답에서)
                if (wordSegments.length === 0 && q.option_1) {
                  wordSegments = q.option_1.split(/\s+/).filter(w => w.trim() !== '');
                }
              }
              
              return {
                id: q.id,
                questionId: `paragraph-${q.id}`,
                questionNumber: q.question_number,
                questionType: q.question_type,
                paragraphNumber: q.paragraph_number,
                paragraphText: q.paragraph_text,
                question: q.question_text,
                options: isWordOrderQuestion ? [] : [q.option_1, q.option_2, q.option_3, q.option_4, q.option_5].filter(opt => opt && opt.trim() !== ''),
                correctAnswer: isWordOrderQuestion ? (q.option_1 || q.correct_answer) : q.correct_answer, // 어절 순서 맞추기는 정답 문장을 표시
                answerInitials: q.answer_initials, // 초성 힌트 필드 추가
                explanation: q.explanation,
                wordSegments: wordSegments // 어절 순서 맞추기용 어절 배열
              };
            }),
            comprehensiveQuestions: (setDetails.comprehensive_questions || []).map((q: ComprehensiveQuestionDB) => {
              // original_question_id를 기준으로 questionId 생성
              let questionId;
              if (q.is_supplementary) {
                // 보완문제: original_question_id + _supp + question_number
                const baseId = q.original_question_id || 'comp_unknown';
                const questionNum = q.question_number || 1;
                questionId = `${baseId}_supp${questionNum}`;
              } else {
                // 기본문제: original_question_id를 그대로 사용 (저장 시 questionId가 original_question_id로 설정됨)
                questionId = q.original_question_id || `comp_${q.id}`;
              }
              
              return {
                id: q.id,
                questionId: questionId,
                questionType: q.question_type,
                type: q.question_type, // 호환성을 위한 별칭
                questionFormat: q.question_format,
                question: q.question_text,
                options: q.question_format === '객관식' 
                  ? [q.option_1, q.option_2, q.option_3, q.option_4, q.option_5].filter(opt => opt && opt.trim() !== '')
                  : [],
                correctAnswer: q.correct_answer,
                answerInitials: q.answer_initials, // 초성 힌트 필드 추가
                explanation: q.explanation,
                isSupplementary: q.is_supplementary || false,
                originalQuestionId: q.original_question_id,
                questionSetNumber: q.question_set_number || 1
              };
            })
          }
        };
        
        return NextResponse.json(detailResponse);
      } catch (error) {
        console.error('개별 콘텐츠 세트 조회 실패:', error);
        return NextResponse.json({
          success: false,
          error: '콘텐츠 세트를 찾을 수 없습니다.',
          message: '해당 ID의 콘텐츠 세트가 존재하지 않습니다.'
        }, { status: 404 });
      }
    }

    // Supabase에서 콘텐츠 세트 목록 가져오기
    let contentSets;
    try {
      contentSets = await db.getContentSets(filters);
      console.log(`Supabase에서 ${contentSets.length}개의 콘텐츠 세트를 가져왔습니다.`);
    } catch (supabaseError) {
      console.error('Supabase 데이터 조회 실패:', supabaseError);
      throw supabaseError;
    }
    
    // 통계 데이터 계산
    const subjects = [...new Set(contentSets.map(item => item.subject))];
    const grades = [...new Set(contentSets.map(item => item.grade))];
    const areas = [...new Set(contentSets.map(item => item.area))];
    
    const stats = {
      totalSets: contentSets.length,
      subjects,
      grades,
      areas,
      totalVocabularyQuestions: contentSets.reduce((sum, item) => sum + (item.total_vocabulary_questions || 0), 0),
      totalParagraphQuestions: contentSets.reduce((sum, item) => sum + (item.total_paragraph_questions || 0), 0),
      totalComprehensiveQuestions: contentSets.reduce((sum, item) => sum + (item.total_comprehensive_questions || 0), 0)
    };

    // 데이터에 camelCase 별칭 추가
    const dataWithAliases = contentSets.map(item => ({
      ...item,
      userId: item.user_id,
      mainTopic: item.main_topic,
      subTopic: item.sub_topic,
      passageTitle: item.title,
      passageLength: item.passage_length, // DB 필드를 camelCase로 매핑
      textType: item.text_type, // DB 필드를 camelCase로 매핑
      vocabularyQuestionCount: item.total_vocabulary_questions,
      comprehensiveQuestionCount: item.total_comprehensive_questions,
      paragraphCount: item.total_passages,
      vocabularyWordsCount: item.total_vocabulary_terms,
      setId: item.id,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      totalQuestions: item.total_vocabulary_questions + (item.total_paragraph_questions || 0) + item.total_comprehensive_questions
    }));

    const response = {
      success: true,
      data: dataWithAliases,
      stats: {
        ...stats,
        totalVocabularyQuestions: contentSets.reduce((sum, item) => sum + (item.total_vocabulary_questions || 0), 0),
        totalParagraphQuestions: contentSets.reduce((sum, item) => sum + (item.total_paragraph_questions || 0), 0),
        totalComprehensiveQuestions: contentSets.reduce((sum, item) => sum + (item.total_comprehensive_questions || 0), 0)
      },
      total: contentSets.length,
      version: '2.0',
      message: '콘텐츠 세트 데이터를 성공적으로 조회했습니다.'
    };

    return NextResponse.json(response, {
      headers: {
        'X-Data-Source': 'supabase',
        'X-Records-Count': contentSets.length.toString()
      }
    });

  } catch (error) {
    console.error('Supabase 콘텐츠 세트 조회 중 오류:', error);
    
    return NextResponse.json({
      success: false,
      data: [],
      stats: {
        totalSets: 0,
        subjects: [],
        grades: [],
        areas: [],
        totalVocabularyQuestions: 0,
        totalComprehensiveQuestions: 0
      },
      total: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: '콘텐츠 세트 조회 중 오류가 발생했습니다.'
    }, { 
      status: 500,
      headers: {
        'X-Data-Source': 'error',
        'X-Error': error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
} 