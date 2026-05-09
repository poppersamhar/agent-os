/**
 * LLM Provider 层 — 支持真实 API 调用 + Mock 演示模式
 *
 * 支持的 Provider：
 * - OpenAI (gpt-4o, gpt-4o-mini 等)
 * - Anthropic Claude (claude-sonnet-4-6 等)
 * - DeepSeek (deepseek-chat, deepseek-coder 等)
 * - 智谱 GLM (glm-4 等) — 兼容 OpenAI 格式
 * - Mock (演示模式，无需 API Key)
 *
 * 统一接口：streamCompletion(messages, options) → AsyncGenerator<LLMStreamChunk>
 */
import OpenAI from 'openai';
import {
  type LLMProvider,
  type LLMMessage,
  type LLMCompletionOptions,
  type LLMStreamChunk,
} from '../../types/index.js';

/** Token 估算（基于 GPT-3.5 的粗略估算） */
export function estimateTokens(text: string): number {
  let tokens = 0;
  for (const char of text) {
    tokens += char.charCodeAt(0) > 127 ? 1 : 0.25;
  }
  return Math.ceil(tokens);
}

// ─── OpenAI SDK 封装（支持 OpenAI、DeepSeek、智谱等兼容格式）───

export class OpenAIProvider implements LLMProvider {
  readonly name = 'openai';
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, baseURL?: string, model = 'gpt-4o') {
    this.client = new OpenAI({ apiKey, baseURL });
    this.model = model;
  }

  async *streamCompletion(
    messages: LLMMessage[],
    options: LLMCompletionOptions = {}
  ): AsyncGenerator<LLMStreamChunk> {
    const model = options.model || this.model;

    // 转换消息格式（使用类型断言绕过 OpenAI SDK 的严格类型检查）
    const apiMessages = messages.map((m) => {
      const msg: Record<string, unknown> = {
        role: m.role,
        content: m.content,
      };
      if (m.name) msg.name = m.name;
      if (m.tool_calls) msg.tool_calls = m.tool_calls;
      if (m.tool_call_id) msg.tool_call_id = m.tool_call_id;
      return msg as unknown as OpenAI.Chat.ChatCompletionMessageParam;
    });

    // 转换工具定义
    const tools = options.tools?.map((t) => ({
      type: 'function' as const,
      function: {
        name: t.function.name,
        description: t.function.description,
        parameters: t.function.parameters as OpenAI.FunctionParameters,
      },
    }));

    try {
      const stream = await this.client.chat.completions.create({
        model,
        messages: apiMessages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens,
        tools: tools?.length ? tools : undefined,
        stream: true,
      });

      let toolCallBuffer: { id: string; name: string; arguments: string } | null = null;

      for await (const chunk of stream) {
        const delta = chunk.choices?.[0]?.delta;
        if (!delta) continue;

        // DeepSeek 思考过程 (reasoning_content)
        const reasoning = (delta as Record<string, unknown>).reasoning_content;
        if (reasoning && typeof reasoning === 'string') {
          yield { type: 'thinking', text: reasoning };
        }

        // 文本内容
        if (delta.content) {
          yield { type: 'text', text: delta.content };
        }

        // 工具调用（分 chunk 累积）
        if (delta.tool_calls) {
          for (const tc of delta.tool_calls) {
            if (!toolCallBuffer && tc.id) {
              toolCallBuffer = {
                id: tc.id,
                name: tc.function?.name || '',
                arguments: tc.function?.arguments || '',
              };
            } else if (toolCallBuffer && tc.function?.arguments) {
              toolCallBuffer.arguments += tc.function.arguments;
            }
          }
        }
      }

      // 流结束后，如果有累积的工具调用，yield 它
      if (toolCallBuffer && toolCallBuffer.name) {
        yield {
          type: 'tool_use',
          toolCall: {
            id: toolCallBuffer.id || `call_${Date.now()}`,
            type: 'function',
            function: {
              name: toolCallBuffer.name,
              arguments: toolCallBuffer.arguments,
            },
          },
        };
      }

      yield { type: 'done' };
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      throw new Error(`OpenAI API error: ${error.message}`);
    }
  }

  estimateTokens(text: string): number {
    return estimateTokens(text);
  }
}

// ─── Anthropic Claude Provider（原生 fetch，支持 Tool Calling）───

export class AnthropicProvider implements LLMProvider {
  readonly name = 'anthropic';
  private apiKey: string;
  private baseURL: string;
  private model: string;

  constructor(apiKey: string, baseURL = 'https://api.anthropic.com/v1', model = 'claude-sonnet-4-6') {
    this.apiKey = apiKey;
    this.baseURL = baseURL;
    this.model = model;
  }

  async *streamCompletion(
    messages: LLMMessage[],
    options: LLMCompletionOptions = {}
  ): AsyncGenerator<LLMStreamChunk> {
    const model = options.model || this.model;
    const systemMsg = messages.find((m) => m.role === 'system');

    // Anthropic 格式转换
    const chatMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => {
        if (m.role === 'tool') {
          return {
            role: 'user' as const,
            content: [
              {
                type: 'tool_result' as const,
                tool_use_id: m.tool_call_id || '',
                content: m.content,
              },
            ],
          };
        }
        return {
          role: m.role as 'user' | 'assistant',
          content: m.content,
        };
      });

    // 工具定义转换
    const tools = options.tools?.map((t) => ({
      name: t.function.name,
      description: t.function.description,
      input_schema: t.function.parameters,
    }));

    try {
      const res = await fetch(`${this.baseURL}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          system: systemMsg?.content,
          messages: chatMessages,
          max_tokens: options.maxTokens || 4096,
          temperature: options.temperature ?? 0.7,
          tools: tools?.length ? tools : undefined,
          stream: true,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Anthropic API error: ${res.status} ${err}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';
      let toolCallBuffer: { id: string; name: string; arguments: string } | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;

          try {
            const data = JSON.parse(line.slice(6));

            if (data.type === 'content_block_delta') {
              const text = data.delta?.text;
              if (text) yield { type: 'text', text };
            }

            if (data.type === 'content_block_start' && data.content_block?.type === 'tool_use') {
              toolCallBuffer = {
                id: data.content_block.id || `call_${Date.now()}`,
                name: data.content_block.name || '',
                arguments: '',
              };
            }

            if (data.type === 'content_block_delta' && data.delta?.partial_json) {
              if (toolCallBuffer) {
                toolCallBuffer.arguments += data.delta.partial_json;
              }
            }

            if (data.type === 'content_block_stop' && toolCallBuffer) {
              yield {
                type: 'tool_use',
                toolCall: {
                  id: toolCallBuffer.id,
                  type: 'function',
                  function: {
                    name: toolCallBuffer.name,
                    arguments: toolCallBuffer.arguments,
                  },
                },
              };
              toolCallBuffer = null;
            }
          } catch {
            // skip malformed JSON
          }
        }
      }

      yield { type: 'done' };
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      throw new Error(`Anthropic API error: ${error.message}`);
    }
  }

  estimateTokens(text: string): number {
    return estimateTokens(text);
  }
}

// ─── Mock Provider（演示模式，无需 API Key）───

export interface MockScriptStep {
  trigger: string | RegExp;
  response: string;
  toolCall?: {
    name: string;
    arguments: Record<string, unknown>;
  };
  delayPerChar?: number;
}

export class MockProvider implements LLMProvider {
  readonly name = 'mock';
  private responses = new Map<string, string>();
  private scripts: MockScriptStep[][] = [];
  private scriptCursor = new Map<string, number>();

  setResponse(prompt: string, response: string) {
    this.responses.set(prompt, response);
  }

  loadScript(steps: MockScriptStep[]) {
    this.scripts.push(steps);
  }

  setScriptCursor(sessionId: string, index: number) {
    this.scriptCursor.set(sessionId, index);
  }

  async *streamCompletion(
    messages: LLMMessage[],
    _options: LLMCompletionOptions = {}
  ): AsyncGenerator<LLMStreamChunk> {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
    const sessionId = _options.sessionId || 'default';
    const userText = lastUserMsg?.content || '';

    const response = this.findResponse(sessionId, userText, messages);

    // 模拟流式输出
    const chunks = response.text.split(/(?<=[，。！？；\n])/);
    for (const chunk of chunks) {
      if (chunk.trim()) {
        yield { type: 'text', text: chunk };
        await new Promise((r) => setTimeout(r, response.delay || 30));
      }
    }

    if (response.toolCall) {
      yield {
        type: 'tool_use',
        toolCall: {
          id: `call_${Date.now()}`,
          type: 'function',
          function: {
            name: response.toolCall.name,
            arguments: JSON.stringify(response.toolCall.arguments),
          },
        },
      };
    }

    yield { type: 'done' };
  }

  private findResponse(
    sessionId: string,
    userText: string,
    _messages: LLMMessage[]
  ): { text: string; delay?: number; toolCall?: MockScriptStep['toolCall'] } {
    for (const script of this.scripts) {
      const cursor = this.scriptCursor.get(sessionId) || 0;
      if (cursor >= script.length) continue;

      const step = script[cursor];
      const matches =
        typeof step.trigger === 'string'
          ? userText.includes(step.trigger)
          : step.trigger.test(userText);

      if (matches) {
        this.scriptCursor.set(sessionId, cursor + 1);
        return {
          text: step.response,
          delay: step.delayPerChar || 30,
          toolCall: step.toolCall,
        };
      }
    }

    return {
      text:
        this.responses.get('default') ||
        '收到，我正在分析您的需求，请稍候...',
    };
  }

  estimateTokens(text: string): number {
    return estimateTokens(text);
  }
}

// ─── Provider 工厂 ───

export function createProvider(
  type: string,
  config: { apiKey: string; baseURL?: string; model?: string }
): LLMProvider {
  switch (type) {
    case 'openai':
      return new OpenAIProvider(config.apiKey, config.baseURL, config.model);
    case 'deepseek':
      // DeepSeek 兼容 OpenAI 格式
      return new OpenAIProvider(
        config.apiKey,
        config.baseURL || 'https://api.deepseek.com/v1',
        config.model || 'deepseek-chat'
      );
    case 'zhipu':
      // 智谱兼容 OpenAI 格式
      return new OpenAIProvider(
        config.apiKey,
        config.baseURL || 'https://open.bigmodel.cn/api/paas/v4',
        config.model || 'glm-4'
      );
    case 'anthropic':
      return new AnthropicProvider(config.apiKey, config.baseURL, config.model);
    case 'mock':
      return new MockProvider();
    default:
      throw new Error(`Unknown provider type: ${type}`);
  }
}
