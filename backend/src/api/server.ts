/**
 * Express HTTP 服务器
 *
 * 集成 ConfigManager 加载环境配置，启动时验证 LLM Provider 可用性
 */
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WorkAgentEngine } from '../core/agent/engine.js';
import { createRoutes } from './routes.js';
import { WorkAgentWebSocket } from './websocket.js';
import { config } from '../config/env.js';

export function startServer(portOverride?: number): void {
  const app = express();
  const server = createServer(app);

  // 中间件
  app.use(cors());
  app.use(express.json());

  // 加载配置
  const cfg = config;
  const port = portOverride || cfg.server.port;

  // 验证配置
  if (!cfg.isReady()) {
    console.warn('⚠️  LLM Provider 未配置，将使用 Mock 模式运行');
    console.warn('   请复制 .env.example 为 .env 并填写你的 API Key');
  } else {
    const summary = cfg.getSummary();
    console.log(`✅ LLM Provider: ${summary.provider} (${summary.model})`);
    console.log(`   API Key: ${summary.keyPreview}`);
  }

  // WorkAgent 引擎
  const engine = new WorkAgentEngine({
    provider: cfg.llm.provider as import('../types/index.js').LLMProviderType,
    model: cfg.llm.model,
    executionMode: cfg.server.defaultExecutionMode,
    maxSubAgents: 5,
    enableStreaming: true,
    compactionPolicy: { thresholdRatio: 0.8, keepRecent: 10 },
    enableAMA: true,
  });

  // REST API
  app.use('/api', createRoutes(engine));

  // WebSocket
  const ws = new WorkAgentWebSocket(server, engine);

  server.listen(port, () => {
    console.log(`🚀 AgentOS WorkAgent backend running on http://localhost:${port}`);
    console.log(`📡 WebSocket endpoint: ws://localhost:${port}/ws/workagent`);
    console.log(`📋 REST API: http://localhost:${port}/api`);
  });
}
