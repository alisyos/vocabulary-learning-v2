import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function convertToCSV(data: any[], tableName: string): string {
  if (data.length === 0) {
    return '';
  }

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) {
          return '';
        }
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',')
    )
  ].join('\n');

  return csvContent;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const table = searchParams.get('table');

  if (!table) {
    return NextResponse.json({ error: 'Table parameter is required' }, { status: 400 });
  }

  const validTables = [
    'content_sets',
    'passages', 
    'vocabulary_terms',
    'vocabulary_questions',
    'paragraph_questions',
    'comprehensive_questions'
  ];

  if (!validTables.includes(table)) {
    return NextResponse.json({ error: 'Invalid table name' }, { status: 400 });
  }

  try {
    // 먼저 총 데이터 개수 확인
    const { count, error: countError } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error(`Error counting ${table}:`, countError);
    } else {
      console.log(`Total ${table} count: ${count}`);
    }

    // 모든 데이터를 가져오기 위해 페이지네이션 사용
    let allData: any[] = [];
    let from = 0;
    const limit = 1000; // Supabase 기본 제한
    let hasMore = true;

    while (hasMore) {
      let query = supabase.from(table).select('*').range(from, from + limit - 1);

      // Order by created_at or id to ensure consistent ordering
      if (table === 'content_sets') {
        query = query.order('created_at', { ascending: false });
      } else {
        query = query.order('id', { ascending: true });
      }

      const { data, error } = await query;

      if (error) {
        console.error(`Error fetching ${table}:`, error);
        return NextResponse.json({ error: `Failed to fetch ${table}` }, { status: 500 });
      }

      if (data && data.length > 0) {
        allData = allData.concat(data);

        // 가져온 데이터가 limit보다 적으면 더 이상 데이터가 없음
        if (data.length < limit) {
          hasMore = false;
        } else {
          from += limit;
        }
      } else {
        hasMore = false;
      }
    }

    console.log(`Successfully collected ${allData.length} rows from ${table}`);

    if (!allData || allData.length === 0) {
      return NextResponse.json({ error: `No data found in ${table}` }, { status: 404 });
    }

    const csvContent = convertToCSV(allData, table);
    
    // BOM(Byte Order Mark) 추가하여 Excel에서 UTF-8 한글 올바르게 인식하도록 함
    const bomPrefix = '\uFEFF';
    const csvWithBOM = bomPrefix + csvContent;
    
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const filename = `${table}_${timestamp}.csv`;

    return new NextResponse(csvWithBOM, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache'
      },
    });

  } catch (error) {
    console.error(`Error downloading ${table}:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}