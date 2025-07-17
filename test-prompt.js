// 프롬프트 테스트 파일
const fs = require('fs');

// prompts.ts 파일 내용을 읽어서 footnote 부분 확인
const promptsContent = fs.readFileSync('./src/lib/prompts.ts', 'utf8');

console.log('=== FOOTNOTE 템플릿 확인 ===');
console.log('');

// 첫 번째 출력 형식에서 footnote 부분 추출
const lines = promptsContent.split('\n');
let inFootnote = false;
let footnoteLines = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  if (line.includes('"footnote": [')) {
    inFootnote = true;
    footnoteLines.push(line);
    continue;
  }
  
  if (inFootnote) {
    footnoteLines.push(line);
    if (line.includes(']')) {
      break; // 첫 번째 footnote 섹션만 확인
    }
  }
}

console.log('첫 번째 출력 형식의 footnote 템플릿:');
footnoteLines.slice(0, 8).forEach((line, index) => {
  console.log(`${index + 1}: ${line}`);
});

console.log('');
console.log('=== 예시문장 포함 여부 확인 ===');
const hasExample = footnoteLines.some(line => line.includes('(예시:'));
console.log('예시문장 포함됨:', hasExample);

if (hasExample) {
  console.log('✅ 프롬프트에 예시문장 형식이 올바르게 포함되어 있습니다.');
} else {
  console.log('❌ 프롬프트에 예시문장 형식이 포함되지 않았습니다.');
} 