import Anthropic from '@anthropic-ai/sdk';
import type { LLMResponse } from '@prr/types';

export class AnthropicProvider {
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model: string = 'claude-opus-4-20250514') {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async complete(systemPrompt: string, userPrompt: string): Promise<LLMResponse> {
    const startTime = Date.now();

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
    });

    const duration = Date.now() - startTime;
    const usage = response.usage;

    return {
      content: response.content[0].type === 'text' ? response.content[0].text : '',
      tokensUsed: {
        input: usage.input_tokens,
        output: usage.output_tokens,
        total: usage.input_tokens + usage.output_tokens,
      },
      costUsd: this.calculateCost(usage.input_tokens, usage.output_tokens),
      model: this.model,
      duration,
    };
  }

  async *stream(systemPrompt: string, userPrompt: string): AsyncGenerator<string> {
    const stream = await this.client.messages.stream({
      model: this.model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
    });

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        yield chunk.delta.text;
      }
    }
  }

  private calculateCost(inputTokens: number, outputTokens: number): number {
    // Claude Opus pricing (approximate)
    const inputCostPer1k = 0.003;
    const outputCostPer1k = 0.015;

    const inputCost = (inputTokens / 1000) * inputCostPer1k;
    const outputCost = (outputTokens / 1000) * outputCostPer1k;

    return inputCost + outputCost;
  }
}
