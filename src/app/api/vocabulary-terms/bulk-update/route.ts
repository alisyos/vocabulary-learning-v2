import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: '파일이 제공되지 않았습니다.' },
        { status: 400 }
      );
    }

    // CSV 파일 읽기
    const csvText = await file.text();
    const lines = csvText.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      return NextResponse.json(
        { error: 'CSV 파일에 데이터가 없습니다.' },
        { status: 400 }
      );
    }

    // 헤더 확인 - 필수 헤더만 체크
    const headers = parseCSVLine(lines[0]);
    const requiredHeaders = ['id', 'term', 'definition', 'example_sentence', 'has_question_generated'];
    const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));
    
    if (missingHeaders.length > 0) {
      return NextResponse.json(
        { 
          error: `필수 헤더가 누락되었습니다: ${missingHeaders.join(', ')}`,
          required: requiredHeaders,
          received: headers 
        },
        { status: 400 }
      );
    }

    console.log('CSV 헤더:', headers);
    console.log('필수 헤더 확인 완료');

    // 데이터 파싱
    const updates: Array<{
      id: string;
      term: string;
      definition: string;
      example_sentence: string | null;
      has_question_generated: boolean;
    }> = [];

    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      try {
        // CSV 파싱 (쉼표로 구분하되 따옴표 안의 쉼표는 무시)
        const values = parseCSVLine(line);
        
        if (values.length !== headers.length) {
          errors.push(`라인 ${i + 1}: 컬럼 수가 맞지 않습니다.`);
          continue;
        }

        const rowData: { [key: string]: string } = {};
        headers.forEach((header, index) => {
          rowData[header] = values[index] || '';
        });

        console.log(`라인 ${i + 1} 데이터:`, rowData);

        // ID 검증
        if (!rowData.id || !rowData.id.trim()) {
          errors.push(`라인 ${i + 1}: ID가 없습니다.`);
          continue;
        }

        // 필수 필드 검증 - 수정 가능한 필드만 체크
        if (!rowData.term || !rowData.definition) {
          errors.push(`라인 ${i + 1}: 용어와 정의는 필수입니다.`);
          continue;
        }

        // has_question_generated 변환
        const hasQuestionGeneratedValue = rowData.has_question_generated?.toLowerCase().trim();
        const hasQuestionGenerated = hasQuestionGeneratedValue === 'true';

        const updateData = {
          id: rowData.id.trim(),
          term: rowData.term.trim(),
          definition: rowData.definition.trim(),
          example_sentence: rowData.example_sentence?.trim() || null,
          has_question_generated: hasQuestionGenerated
        };

        console.log(`라인 ${i + 1} 업데이트 데이터:`, updateData);
        updates.push(updateData);

      } catch (error) {
        errors.push(`라인 ${i + 1}: 파싱 오류 - ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
      }
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { 
          error: '파일 파싱 중 오류가 발생했습니다.',
          details: errors.slice(0, 10) // 최대 10개 오류만 표시
        },
        { status: 400 }
      );
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: '업데이트할 유효한 데이터가 없습니다.' },
        { status: 400 }
      );
    }

    // 데이터베이스에서 기존 레코드 확인
    const ids = updates.map(u => u.id);
    const { data: existingTerms, error: fetchError } = await supabase
      .from('vocabulary_terms')
      .select('id')
      .in('id', ids);

    if (fetchError) {
      console.error('기존 데이터 조회 오류:', fetchError);
      return NextResponse.json(
        { error: '기존 데이터 조회 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    const existingIds = new Set(existingTerms?.map(t => t.id) || []);
    const validUpdates = updates.filter(u => existingIds.has(u.id));
    const invalidIds = updates.filter(u => !existingIds.has(u.id)).map(u => u.id);

    if (invalidIds.length > 0) {
      console.warn('존재하지 않는 ID들:', invalidIds);
    }

    if (validUpdates.length === 0) {
      return NextResponse.json(
        { 
          error: '업데이트할 수 있는 유효한 ID가 없습니다.',
          invalidIds: invalidIds
        },
        { status: 400 }
      );
    }

    // 일괄 업데이트 실행
    let updatedCount = 0;
    const updateErrors: string[] = [];

    console.log(`${validUpdates.length}개의 레코드 업데이트 시작`);

    for (const update of validUpdates) {
      try {
        console.log(`ID ${update.id} 업데이트 시작:`, {
          term: update.term,
          definition: update.definition,
          example_sentence: update.example_sentence,
          has_question_generated: update.has_question_generated
        });

        const { data, error: updateError } = await supabase
          .from('vocabulary_terms')
          .update({
            term: update.term,
            definition: update.definition,
            example_sentence: update.example_sentence,
            has_question_generated: update.has_question_generated
          })
          .eq('id', update.id)
          .select();

        if (updateError) {
          console.error(`ID ${update.id} 업데이트 실패:`, updateError);
          updateErrors.push(`ID ${update.id}: ${updateError.message}`);
        } else {
          console.log(`ID ${update.id} 업데이트 성공:`, data);
          updatedCount++;
        }
      } catch (error) {
        console.error(`ID ${update.id} 업데이트 예외:`, error);
        updateErrors.push(`ID ${update.id}: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: '대량 업데이트가 완료되었습니다.',
      updatedCount,
      totalProcessed: validUpdates.length,
      invalidIds: invalidIds.length > 0 ? invalidIds : undefined,
      errors: updateErrors.length > 0 ? updateErrors.slice(0, 5) : undefined
    });

  } catch (error) {
    console.error('대량 업데이트 오류:', error);
    return NextResponse.json(
      { 
        error: '서버 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}

// CSV 라인 파싱 함수 (따옴표 안의 쉼표 처리)
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  // 줄 끝의 개행 문자 제거
  line = line.replace(/\r?\n$/, '');
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // 이스케이프된 따옴표 ("" -> ")
        current += '"';
        i++; // 다음 따옴표 건너뛰기
      } else {
        // 따옴표 시작/끝
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // 필드 구분자
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  // 마지막 필드 추가
  result.push(current.trim());
  
  // 각 필드에서 앞뒤 따옴표 제거
  return result.map(field => {
    // 앞뒤에 따옴표가 있으면 제거
    if (field.startsWith('"') && field.endsWith('"')) {
      return field.slice(1, -1);
    }
    return field;
  });
}