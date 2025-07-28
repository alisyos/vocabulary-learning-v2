import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // system_prompts 테이블 확인
    const { data: oldPrompts, error: oldError } = await supabase
      .from('system_prompts')
      .select('*')
      .limit(5);
    
    // system_prompts_v2 테이블 확인  
    const { data: newPrompts, error: newError } = await supabase
      .from('system_prompts_v2')
      .select('*')
      .limit(5);
    
    return NextResponse.json({
      oldTable: {
        count: oldPrompts?.length || 0,
        error: oldError?.message,
        sample: oldPrompts?.[0]
      },
      newTable: {
        count: newPrompts?.length || 0,
        error: newError?.message,
        sample: newPrompts?.[0]
      }
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
}