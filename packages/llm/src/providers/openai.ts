import OpenAI from 'openai';
import type { LLMResponse } from '@prr/types';

export class OpenAIProvider {
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model: string = 'gpt-4o') {
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  async complete(systemPrompt: string, userPrompt: string): Promise<LLMResponse> {
    const startTime = Date.now();

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
    });

    const duration = Date.now() - startTime;
    const usage = response.usage!;

    return {
      content: response.choices[0].message.content || '',
      tokensUsed: {
        input: usage.prompt_tokens,
        output: usage.completion_tokens,
        total: usage.total_tokens,
      },
      costUsd: this.calculateCost(usage.prompt_tokens, usage.completion_tokens),
      model: this.model,
      duration,
    };
  }

  async *stream(systemPrompt: string, userPrompt: string): AsyncGenerator<string> {
    const stream = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        yield content;
      }
    }
  }

  private calculateCost(inputTokens: number, outputTokens: number): number {
    // GPT-4o pricing (as of 2024)
    const inputCostPer1k = 0.0025;
    const outputCostPer1k = 0.01;

    const inputCost = (inputTokens / 1000) * inputCostPer1k;
    const outputCost = (outputTokens / 1000) * outputCostPer1k;

    return inputCost + outputCost;
  }
}
