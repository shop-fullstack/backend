import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';

@Injectable()
export class GeminiService {
  private readonly ai: GoogleGenAI;

  constructor(private readonly configService: ConfigService) {
    this.ai = new GoogleGenAI({
      apiKey: this.configService.getOrThrow<string>('GEMINI_API_KEY'),
    });
  }

  /**
   * Gemini에 데이터를 전달하고 AI 인사이트를 받아온다
   * @param systemPrompt - AI의 역할/규칙 설정
   * @param dataContext - 분석할 데이터 (JSON 문자열 등)
   * @param userQuestion - 사용자 질문 또는 분석 요청
   */
  async getInsight(
    systemPrompt: string,
    dataContext: string,
    userQuestion: string,
  ): Promise<string> {
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [
          {
            role: 'user',
            parts: [{ text: systemPrompt }],
          },
          {
            role: 'model',
            parts: [
              {
                text: '네, 데이터를 분석하고 인사이트를 제공하겠습니다.',
              },
            ],
          },
          {
            role: 'user',
            parts: [
              {
                text: `다음 데이터를 분석해주세요:\n\n${dataContext}\n\n${userQuestion}`,
              },
            ],
          },
        ],
      });

      return response.text || '분석 결과를 생성하지 못했습니다.';
    } catch {
      return '현재 AI 분석 서비스를 이용할 수 없습니다.';
    }
  }
}
