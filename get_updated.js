const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// .env.local 파일 읽기
const envPath = path.join(__dirname, '.env.local');
const envFile = fs.readFileSync(envPath, 'utf8');

const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
});

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function getRecentlyUpdatedRecords() {
  try {
    // 최근 2시간 내에 업데이트된 레코드 조회 (더 넓은 범위)
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('content_sets')
      .select('id, title, main_topic, sub_topic, updated_at')
      .gte('updated_at', twoHoursAgo)
      .order('updated_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    console.log(`\n📊 최근 2시간 내 업데이트된 레코드: ${data.length}개\n`);
    console.log('='.repeat(80));

    data.forEach((record, index) => {
      console.log(`\n${index + 1}. ${record.id}`);
      console.log(`   제목: ${record.title}`);
      console.log(`   주제: ${record.main_topic} / ${record.sub_topic}`);
      console.log(`   수정: ${record.updated_at}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log(`\n📋 전체 ${data.length}개 ID (복사용):\n`);
    data.forEach(record => console.log(record.id));

    // 파일로 저장
    const idList = data.map(r => r.id).join('\n');
    fs.writeFileSync('/tmp/updated_ids.txt', idList);
    console.log('\n✅ ID 목록이 /tmp/updated_ids.txt에 저장되었습니다.');

  } catch (error) {
    console.error('오류:', error.message);
  }
}

getRecentlyUpdatedRecords();
