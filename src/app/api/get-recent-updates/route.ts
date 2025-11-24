import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // Get records updated in the last 3 hours
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('content_sets')
      .select('id, title, main_topic, sub_topic, grade, updated_at')
      .gte('updated_at', threeHoursAgo)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      count: data.length,
      records: data
    });

  } catch (error) {
    console.error('오류:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 });
  }
}
