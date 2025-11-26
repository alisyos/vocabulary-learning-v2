import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface KeywordRow {
  content_set_id: string;
  session_number: string;
  status: string;
  keywords: string;
}

function convertToCSV(data: KeywordRow[]): string {
  if (data.length === 0) {
    return '';
  }

  const headers = ['콘텐츠세트 ID', '차시', '상태값', '키워드 리스트'];
  const csvContent = [
    headers.join(','),
    ...data.map(row => {
      const values = [
        row.content_set_id,
        row.session_number,
        row.status,
        row.keywords.includes(',') || row.keywords.includes('"') || row.keywords.includes('\n')
          ? `"${row.keywords.replace(/"/g, '""')}"`
          : row.keywords
      ];
      return values.join(',');
    })
  ].join('\n');

  return csvContent;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get('status');
  const sessionRangeParam = searchParams.get('sessionRange');

  try {
    // 1. content_sets 테이블에서 필터링된 세트 조회
    let query = supabase.from('content_sets').select('id, session_number, status');

    // status 필터링
    if (statusParam && statusParam !== 'all') {
      const statuses = statusParam.split(',').map(s => s.trim());
      query = query.in('status', statuses);
    }

    // session_number 범위 필터링
    if (sessionRangeParam) {
      const rangeMatch = sessionRangeParam.match(/^(\d+)-(\d+)$/);
      if (!rangeMatch) {
        return NextResponse.json(
          { error: 'Invalid session range format. Use "start-end" format (e.g., "1-100")' },
          { status: 400 }
        );
      }

      const startSession = parseInt(rangeMatch[1], 10);
      const endSession = parseInt(rangeMatch[2], 10);

      if (startSession > endSession) {
        return NextResponse.json(
          { error: 'Start session number cannot be greater than end session number' },
          { status: 400 }
        );
      }

      // session_number는 문자열로 저장되어 있으므로, 범위 내 모든 숫자를 문자열 배열로 변환
      const sessionNumbers = [];
      for (let i = startSession; i <= endSession; i++) {
        sessionNumbers.push(i.toString());
      }
      query = query.in('session_number', sessionNumbers);
    }

    // created_at 기준 정렬
    query = query.order('created_at', { ascending: false });

    const { data: contentSets, error: contentSetError } = await query;

    if (contentSetError) {
      console.error('Error fetching content_sets:', contentSetError);
      return NextResponse.json({ error: 'Failed to fetch content sets' }, { status: 500 });
    }

    if (!contentSets || contentSets.length === 0) {
      return NextResponse.json({ error: 'No data found with the specified filters' }, { status: 404 });
    }

    console.log(`Found ${contentSets.length} content sets with filters:`, {
      status: statusParam,
      sessionRange: sessionRangeParam
    });

    // 2. 모든 content_set_id에 대해 has_question_generated = TRUE인 키워드 조회
    // Supabase .in() 제한 때문에 청크 단위로 나누어 조회
    const contentSetIds = contentSets.map(cs => cs.id);
    const chunkSize = 100; // 한 번에 100개씩 처리
    const allVocabularyTerms: any[] = [];

    for (let i = 0; i < contentSetIds.length; i += chunkSize) {
      const chunk = contentSetIds.slice(i, i + chunkSize);

      const { data: chunkTerms, error: vocabError } = await supabase
        .from('vocabulary_terms')
        .select('content_set_id, term, created_at')
        .in('content_set_id', chunk)
        .eq('has_question_generated', true)
        .order('content_set_id', { ascending: true })
        .order('created_at', { ascending: true });

      if (vocabError) {
        console.error(`Error fetching vocabulary_terms for chunk ${i / chunkSize + 1}:`, vocabError);
        return NextResponse.json({ error: 'Failed to fetch vocabulary terms' }, { status: 500 });
      }

      if (chunkTerms && chunkTerms.length > 0) {
        allVocabularyTerms.push(...chunkTerms);
      }
    }

    console.log(`Fetched vocabulary_terms in ${Math.ceil(contentSetIds.length / chunkSize)} chunks, total: ${allVocabularyTerms.length}`);

    // 3. content_set_id별로 키워드 그룹화
    const keywordsByContentSet: { [key: string]: string[] } = {};
    let totalKeywordCount = 0;

    if (allVocabularyTerms && allVocabularyTerms.length > 0) {
      allVocabularyTerms.forEach(vt => {
        if (!keywordsByContentSet[vt.content_set_id]) {
          keywordsByContentSet[vt.content_set_id] = [];
        }
        keywordsByContentSet[vt.content_set_id].push(vt.term);
        totalKeywordCount++;
      });
    }

    // 4. 결과 행 생성
    const resultRows: KeywordRow[] = contentSets.map(contentSet => {
      const keywords = keywordsByContentSet[contentSet.id]?.join('/') || '';
      return {
        content_set_id: contentSet.id,
        session_number: contentSet.session_number || '',
        status: contentSet.status || '',
        keywords: keywords
      };
    });

    console.log(`Successfully collected ${resultRows.length} content sets with ${totalKeywordCount} total keywords`);

    if (resultRows.length === 0) {
      return NextResponse.json({
        error: 'No content sets found with the specified filters',
        hint: 'Try adjusting your status or session range filters'
      }, { status: 404 });
    }

    if (totalKeywordCount === 0) {
      console.warn('Warning: No keywords with has_question_generated=true found in any content sets');
      // 키워드가 없어도 CSV는 생성 (빈 키워드 리스트로)
    }

    // 5. CSV 생성
    const csvContent = convertToCSV(resultRows);

    // BOM(Byte Order Mark) 추가하여 Excel에서 UTF-8 한글 올바르게 인식하도록 함
    const bomPrefix = '\uFEFF';
    const csvWithBOM = bomPrefix + csvContent;

    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const filename = `keywords_has_question_generated_${timestamp}.csv`;

    return new NextResponse(csvWithBOM, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache'
      },
    });

  } catch (error) {
    console.error('Error downloading keywords:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
