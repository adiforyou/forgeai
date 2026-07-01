import { OpenAIProvider } from './providers/openai';
import { AnthropicProvider } from './providers/anthropic';
import { GeminiProvider } from './providers/gemini';
import type { LLMResponse, ReviewStrategy } from '@prr/types';

export interface LLMConfig {
  openaiApiKey?: string;
  anthropicApiKey?: string;
  geminiApiKey?: string;
  defaultModel?: string;
  fallbackModels?: string[];
}

export class LLMOrchestrator {
  private openai?: OpenAIProvider;
  private anthropic?: AnthropicProvider;
  private gemini?: GeminiProvider;
  private fallbackModels: string[];

  constructor(config: LLMConfig) {
    if (config.openaiApiKey) {
      this.openai = new OpenAIProvider(config.openaiApiKey, config.defaultModel?.startsWith('gpt') ? config.defaultModel : 'gpt-4o');
    }
    if (config.anthropicApiKey) {
      this.anthropic = new AnthropicProvider(config.anthropicApiKey, config.defaultModel?.startsWith('claude') ? config.defaultModel : 'claude-opus-4-20250514');
    }
    if (config.geminiApiKey) {
      this.gemini = new GeminiProvider(config.geminiApiKey, config.defaultModel?.startsWith('gemini') ? config.defaultModel : 'gemini-2.5-flash');
    }

    this.fallbackModels = config.fallbackModels || [];
  }

  async complete(
    systemPrompt: string,
    userPrompt: string,
    model?: string
  ): Promise<LLMResponse> {
    const targetModel = model || this.getDefaultModel();
    const modelsToTry = [targetModel, ...this.fallbackModels];

    let lastError: Error | null = null;

    for (const m of modelsToTry) {
      try {
        return await this.completeWithModel(systemPrompt, userPrompt, m);
      } catch (error) {
        console.error(`Model ${m} failed:`, error);
        lastError = error as Error;
        continue;
      }
    }

    throw new Error(`All models failed. Last error: ${lastError?.message}`);
  }

  async *stream(
    systemPrompt: string,
    userPrompt: string,
    model?: string
  ): AsyncGenerator<string> {
    const targetModel = model || this.getDefaultModel();
    const provider = this.getProvider(targetModel);

    if (!provider) {
      throw new Error(`No provider available for model: ${targetModel}`);
    }

    yield* provider.stream(systemPrompt, userPrompt);
  }

  async reviewWithStrategy(
    strategy: ReviewStrategy,
    systemPrompt: string,
    userPrompt: string
  ): Promise<LLMResponse> {
    switch (strategy) {
      case 'single-pass':
        // Fast review with Gemini
        return this.complete(systemPrompt, userPrompt, 'gemini-2.5-flash');

      case 'multi-pass':
        // First pass: Quick scan with Gemini
        const quickScan = await this.complete(
          'You are a code reviewer. Quickly identify obvious issues.',
          userPrompt,
          'gemini-2.5-flash'
        );

        // Second pass: Deep analysis with GPT-4o or Claude
        const deepAnalysis = await this.complete(
          systemPrompt + '\n\nPrevious quick scan found: ' + quickScan.content,
          userPrompt,
          this.openai ? 'gpt-4o' : 'claude-opus-4-20250514'
        );

        return deepAnalysis;

      case 'security-audit':
        // Security-focused review with Claude Opus
        return this.complete(
          systemPrompt + '\n\nFocus exclusively on security vulnerabilities.',
          userPrompt,
          'claude-opus-4-20250514'
        );

      default:
        return this.complete(systemPrompt, userPrompt);
    }
  }

  private async completeWithModel(
    systemPrompt: string,
    userPrompt: string,
    model: string
  ): Promise<LLMResponse> {
    const provider = this.getProvider(model);

    if (!provider) {
      throw new Error(`No provider available for model: ${model}`);
    }

    return provider.complete(systemPrompt, userPrompt);
  }

  private getProvider(model: string) {
    if (model.startsWith('gpt') || model.startsWith('o1') || model.startsWith('o3')) {
      return this.openai;
    }
    if (model.startsWith('claude')) {
      return this.anthropic;
    }
    if (model.startsWith('gemini')) {
      return this.gemini;
    }
    return null;
  }

  private getDefaultModel(): string {
    if (this.gemini) return 'gemini-2.5-flash';
    if (this.openai) return 'gpt-4o';
    if (this.anthropic) return 'claude-opus-4-20250514';
    throw new Error('No LLM provider configured');
  }
}
