import { NextRequest, NextResponse } from 'next/server';

interface QuestionData {
  id: string;
  question_text: string;
  option_1?: string;
  option_2?: string;
  option_3?: string;
  option_4?: string;
  option_5?: string;
  correct_answer: string;
  explanation: string;
  answer_initials?: string;
  term?: string;
  content_set: {
    division: string;
    grade: string;
    subject: string;
    area: string;
    main_topic?: string;
    sub_topic?: string;
  };
}

function generateHTML(
  questions: QuestionData[],
  subject: string,
  division: string
): string {
  const timestamp = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const questionsHTML = questions
    .map((question, index) => {
      const questionNumber = index + 1;
      const hasOptions = !!question.option_1;

      let optionsHTML = '';
      if (hasOptions) {
        // 정답 비교를 위해 문자열로 변환 및 trim
        const correctAnswerStr = String(question.correct_answer).trim();

        optionsHTML = `
          <div class="options">
            ${[1, 2, 3, 4, 5]
              .map((num) => {
                const optionKey = `option_${num}` as keyof QuestionData;
                const option = question[optionKey];
                if (!option) return '';

                // 정답 여부 확인 (선택지 텍스트와 정답 텍스트 비교)
                const optionText = String(option).trim();
                const isCorrect = optionText === correctAnswerStr;

                return `
                  <div class="option ${isCorrect ? 'correct-answer' : ''}">
                    <span class="option-number">${num}.</span>
                    <span class="option-text">${option}</span>
                    ${isCorrect ? '<span class="answer-badge">✓ 정답</span>' : ''}
                  </div>
                `;
              })
              .join('')}
          </div>
          <div class="explanation-box">
            <div class="explanation-header">💡 해설</div>
            <div class="explanation-text">${question.explanation}</div>
          </div>
        `;
      } else {
        optionsHTML = `
          <div class="answer-box">
            <strong>정답:</strong> ${question.correct_answer}
            ${question.answer_initials ? `<span class="initials-hint">초성 힌트: ${question.answer_initials}</span>` : ''}
          </div>
          <div class="explanation-box">
            <div class="explanation-header">💡 해설</div>
            <div class="explanation-text">${question.explanation}</div>
          </div>
        `;
      }

      return `
        <div class="question-container">
          <div class="question-header">
            <div class="question-number">문제 ${questionNumber}</div>
            <div class="question-meta">
              <span class="meta-item">학년: ${question.content_set.grade}</span>
              <span class="meta-item">영역: ${question.content_set.area}</span>
              ${question.content_set.main_topic ? `<span class="meta-item">대주제: ${question.content_set.main_topic}</span>` : ''}
              ${question.content_set.sub_topic ? `<span class="meta-item">소주제: ${question.content_set.sub_topic}</span>` : ''}
              ${question.term ? `<span class="meta-item">어휘: ${question.term}</span>` : ''}
            </div>
          </div>
          <div class="question-text">${question.question_text}</div>
          ${optionsHTML}
        </div>
      `;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>진단평가 - ${subject} ${division}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Malgun Gothic', '맑은 고딕', sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f5f5f5;
      padding: 20px;
    }

    .container {
      max-width: 900px;
      margin: 0 auto;
      background-color: white;
      padding: 40px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }

    .header {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 3px solid #2563eb;
    }

    .header h1 {
      font-size: 32px;
      color: #1e40af;
      margin-bottom: 10px;
    }

    .header .info {
      font-size: 16px;
      color: #6b7280;
      margin-top: 10px;
    }

    .summary {
      background-color: #eff6ff;
      border-left: 4px solid #2563eb;
      padding: 15px 20px;
      margin-bottom: 30px;
    }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 10px;
    }

    .summary-item {
      font-size: 14px;
      color: #374151;
    }

    .summary-item strong {
      color: #1e40af;
      margin-right: 8px;
    }

    .question-container {
      margin-bottom: 30px;
      padding: 25px;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      background-color: #fafafa;
      page-break-inside: avoid;
    }

    .question-header {
      margin-bottom: 15px;
    }

    .question-number {
      display: inline-block;
      background-color: #2563eb;
      color: white;
      padding: 6px 16px;
      border-radius: 20px;
      font-weight: bold;
      font-size: 16px;
      margin-bottom: 10px;
    }

    .question-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 10px;
    }

    .meta-item {
      display: inline-block;
      background-color: #dbeafe;
      border: 1px solid #3b82f6;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 13px;
      color: #1e40af;
      font-weight: 500;
    }

    .question-text {
      font-size: 17px;
      font-weight: 500;
      color: #111827;
      margin: 20px 0;
      line-height: 1.8;
    }

    .options {
      margin-top: 15px;
    }

    .option {
      padding: 12px 15px;
      margin-bottom: 8px;
      background-color: white;
      border: 2px solid #d1d5db;
      border-radius: 6px;
      display: flex;
      align-items: center;
      gap: 10px;
      transition: all 0.2s;
    }

    .option.correct-answer {
      background-color: #dcfce7;
      border: 3px solid #16a34a;
      font-weight: 500;
    }

    .option-number {
      font-weight: bold;
      color: #2563eb;
      min-width: 20px;
    }

    .option-text {
      flex: 1;
      font-size: 15px;
    }

    .answer-badge {
      background-color: #16a34a;
      color: white;
      padding: 3px 10px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: bold;
    }

    .answer-box {
      padding: 15px;
      background-color: #dcfce7;
      border: 2px solid #86efac;
      border-radius: 6px;
      margin-top: 15px;
      font-size: 15px;
    }

    .answer-box strong {
      color: #16a34a;
      margin-right: 10px;
    }

    .initials-hint {
      display: inline-block;
      margin-left: 15px;
      padding: 4px 10px;
      background-color: #fef3c7;
      border: 1px solid #fcd34d;
      border-radius: 4px;
      font-size: 13px;
      color: #92400e;
    }

    .explanation-box {
      margin-top: 15px;
      padding: 15px;
      background-color: #f0f9ff;
      border-left: 4px solid #3b82f6;
      border-radius: 6px;
    }

    .explanation-header {
      font-weight: bold;
      color: #1e40af;
      margin-bottom: 8px;
      font-size: 14px;
    }

    .explanation-text {
      color: #1e40af;
      font-size: 14px;
      line-height: 1.6;
    }

    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e5e7eb;
      text-align: center;
      color: #6b7280;
      font-size: 14px;
    }

    @media print {
      body {
        background-color: white;
        padding: 0;
      }

      .container {
        box-shadow: none;
        padding: 20px;
      }

      .question-container {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📝 아몬드 진단평가지 문제 리스트</h1>
    </div>

    <div class="summary">
      <div class="summary-grid">
        <div class="summary-item">
          <strong>과목:</strong>${subject}
        </div>
        <div class="summary-item">
          <strong>과정:</strong>${division}
        </div>
        <div class="summary-item">
          <strong>문제 수:</strong>${questions.length}개
        </div>
      </div>
    </div>

    ${questionsHTML}

    <div class="footer">
      <p>본 진단평가는 학습 지문/문제 생성 시스템에서 생성되었습니다.</p>
      <p>생성일: ${timestamp}</p>
      <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #d1d5db;">
        <p style="font-size: 13px; color: #6b7280;"><strong>포함된 문제 ID:</strong></p>
        <p style="font-size: 12px; color: #9ca3af; word-break: break-all; margin-top: 5px;">
          ${questions.map(q => q.id).join(', ')}
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export async function POST(request: NextRequest) {
  try {
    const { questions, subject, division } = await request.json();

    // 입력 검증
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json(
        { success: false, error: '문제 데이터가 필요합니다.' },
        { status: 400 }
      );
    }

    if (!subject || !division) {
      return NextResponse.json(
        { success: false, error: '과목과 과정 정보가 필요합니다.' },
        { status: 400 }
      );
    }

    console.log('진단평가 HTML 생성 시작:', {
      questionCount: questions.length,
      subject,
      division,
    });

    // HTML 생성
    const html = generateHTML(questions, subject, division);

    // UTF-8로 인코딩된 바이트 배열로 변환
    const encoder = new TextEncoder();
    const htmlBytes = encoder.encode(html);

    // 파일명 생성 (한글 포함이므로 RFC 5987 형식 사용)
    const timestamp = Date.now();
    const filename = `진단평가_${subject}_${division}_${timestamp}.html`;
    const encodedFilename = encodeURIComponent(filename);

    // HTML 파일로 응답
    return new NextResponse(htmlBytes, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="assessment_${timestamp}.html"; filename*=UTF-8''${encodedFilename}`,
      },
    });
  } catch (error) {
    console.error('HTML 생성 중 오류:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
      },
      { status: 500 }
    );
  }
}
