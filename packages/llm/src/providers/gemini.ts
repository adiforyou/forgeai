import { GoogleGenerativeAI } from '@google/generative-ai';
import type { LLMResponse } from '@prr/types';

export class GeminiProvider {
  private client: GoogleGenerativeAI;
  private model: string;

  constructor(apiKey: string, model: string = 'gemini-2.5-flash') {
    this.client = new GoogleGenerativeAI(apiKey);
    this.model = model;
  }

  async complete(systemPrompt: string, userPrompt: string): Promise<LLMResponse> {
    const startTime = Date.now();

    const model = this.client.getGenerativeModel({
      model: this.model,
      systemInstruction: systemPrompt,
    });

    const result = await model.generateContent(userPrompt);
    const response = result.response;

    const duration = Date.now() - startTime;

    // Gemini usage metadata
    const usage = response.usageMetadata || { promptTokenCount: 0, candidatesTokenCount: 0 };
    const inputTokens = usage.promptTokenCount;
    const outputTokens = usage.candidatesTokenCount;

    return {
      content: response.text(),
      tokensUsed: {
        input: inputTokens,
        output: outputTokens,
        total: inputTokens + outputTokens,
      },
      costUsd: this.calculateCost(inputTokens, outputTokens),
      model: this.model,
      duration,
    };
  }

  async *stream(systemPrompt: string, userPrompt: string): AsyncGenerator<string> {
    const model = this.client.getGenerativeModel({
      model: this.model,
      systemInstruction: systemPrompt,
    });

    const result = await model.generateContentStream(userPrompt);

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        yield text;
      }
    }
  }

  private calculateCost(inputTokens: number, outputTokens: number): number {
    // Gemini 2.0 Flash pricing (very cheap)
    const inputCostPer1k = 0.0001;
    const outputCostPer1k = 0.0004;

    const inputCost = (inputTokens / 1000) * inputCostPer1k;
    const outputCost = (outputTokens / 1000) * outputCostPer1k;

    return inputCost + outputCost;
  }
}
