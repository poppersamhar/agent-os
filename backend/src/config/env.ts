/**
 * 环境变量配置管理
 *
 * 加载 .env 文件并提供类型化的配置访问
 */
import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// 加载 .env（从 backend 根目录）
dotenv.config({ path: join(__dirname, '../../.env') });

export interface LLMConfig {
  provider: string;
  model: string;
  apiKey: string;
  baseURL?: string;
}

export interface ServerConfig {
  port: number;
  defaultExecutionMode: 'auto';
}

export class ConfigManager {
  private static instance: ConfigManager;
  private config: { llm: LLMConfig; server: ServerConfig };

  private constructor() {
    this.config = this.loadConfig();
  }

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  private loadConfig() {
    const provider = process.env.LLM_PROVIDER || 'mock';
    const model = process.env.LLM_MODEL || this.getDefaultModel(provider);

    // 根据 provider 自动选择对应 API Key
    const apiKey = this.getApiKey(provider);
    const baseURL = this.getBaseURL(provider);

    return {
      llm: {
        provider,
        model,
        apiKey,
        baseURL,
      },
      server: {
        port: parseInt(process.env.PORT || '3001', 10),
        defaultExecutionMode: (process.env.DEFAULT_EXECUTION_MODE || 'auto') as ServerConfig['defaultExecutionMode'],
      },
    };
  }

  private getDefaultModel(provider: string): string {
    const defaults: Record<string, string> = {
      openai: 'gpt-4o',
      anthropic: 'claude-sonnet-4-6',
      deepseek: 'deepseek-chat',
      zhipu: 'glm-4',
      mock: 'mock',
    };
    return defaults[provider] || 'mock';
  }

  private getApiKey(provider: string): string {
    const envMap: Record<string, string> = {
      openai: 'OPENAI_API_KEY',
      anthropic: 'ANTHROPIC_API_KEY',
      deepseek: 'DEEPSEEK_API_KEY',
      zhipu: 'ZHIPU_API_KEY',
    };
    const envKey = envMap[provider];
    return envKey ? (process.env[envKey] || '') : '';
  }

  private getBaseURL(provider: string): string | undefined {
    const envMap: Record<string, string> = {
      openai: 'OPENAI_BASE_URL',
      anthropic: 'ANTHROPIC_BASE_URL',
      deepseek: 'DEEPSEEK_BASE_URL',
      zhipu: 'ZHIPU_BASE_URL',
    };
    const envKey = envMap[provider];
    return envKey ? (process.env[envKey] || undefined) : undefined;
  }

  get llm(): LLMConfig {
    return this.config.llm;
  }

  get server(): ServerConfig {
    return this.config.server;
  }

  /** 检查当前配置是否可用（有 API Key 或 mock 模式） */
  isReady(): boolean {
    if (this.config.llm.provider === 'mock') return true;
    return !!this.config.llm.apiKey;
  }

  /** 获取配置摘要（用于前端展示，隐藏完整 API Key） */
  getSummary(): { provider: string; model: string; ready: boolean; keyPreview: string } {
    const key = this.config.llm.apiKey;
    const keyPreview = key ? `${key.slice(0, 8)}...${key.slice(-4)}` : '未配置';
    return {
      provider: this.config.llm.provider,
      model: this.config.llm.model,
      ready: this.isReady(),
      keyPreview,
    };
  }

  /** 运行时切换 Provider（不持久化到 .env） */
  setProvider(provider: string, apiKey?: string, baseURL?: string): void {
    this.config.llm.provider = provider;
    this.config.llm.model = this.getDefaultModel(provider);
    this.config.llm.apiKey = apiKey || this.getApiKey(provider);
    this.config.llm.baseURL = baseURL || this.getBaseURL(provider);
  }
}

export const config = ConfigManager.getInstance();
