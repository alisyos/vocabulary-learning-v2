const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Read .env.local
const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    let value = match[2].trim();
    // Remove quotes if present
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

async function getRecentlyUpdated() {
  try {
    // Get records updated in the last 3 hours
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('content_sets')
      .select('id, title, main_topic, sub_topic, grade, updated_at')
      .gte('updated_at', threeHoursAgo)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    console.log(`\n📊 최근 3시간 내 업데이트된 레코드: ${data.length}개\n`);
    console.log('='.repeat(80));

    data.forEach((record, index) => {
      console.log(`\n${index + 1}. ${record.id}`);
      console.log(`   제목: ${record.title}`);
      console.log(`   주제: ${record.main_topic} / ${record.sub_topic}`);
      console.log(`   학년: ${record.grade}`);
      console.log(`   수정: ${record.updated_at}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log(`\n📋 전체 ${data.length}개 ID 목록:\n`);
    data.forEach(record => console.log(record.id));

    // Save to file
    const idList = data.map(r => r.id).join('\n');
    fs.writeFileSync('/tmp/recent_update_ids.txt', idList);
    console.log('\n✅ ID 목록이 /tmp/recent_update_ids.txt에 저장되었습니다.');

  } catch (error) {
    console.error('오류:', error.message);
  }
}

getRecentlyUpdated();
