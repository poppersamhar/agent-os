/**
 * WebSocket 实时通信层
 *
 * 事件类型（KodaX 风格流式输出）：
 * - message: 新消息
 * - stream: 流式文本增量
 * - tool_call: 工具调用通知
 * - tool_result: 工具结果通知
 * - permission_request: 权限请求
 * - state_change: 状态变更
 * - subagent: 子 Agent 事件
 */
import { WebSocketServer, WebSocket } from 'ws';
import { type Server } from 'http';
import { WorkAgentEngine } from '../core/agent/engine.js';
import {
  type WSEvent,
  type WorkAgentConfig,
  type ExecutionMode,
} from '../types/index.js';

interface ClientConnection {
  ws: WebSocket;
  userId: string;
  sessionId?: string;
}

export class WorkAgentWebSocket {
  private wss: WebSocketServer;
  private clients = new Map<string, ClientConnection>();
  private engine: WorkAgentEngine;
  private clientIdCounter = 0;

  constructor(server: Server, engine: WorkAgentEngine) {
    this.engine = engine;
    this.wss = new WebSocketServer({ server, path: '/ws/workagent' });
    this.setupHandlers();
  }

  private setupHandlers(): void {
    this.wss.on('connection', (ws, req) => {
      const clientId = `client_${++this.clientIdCounter}`;
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const userId = url.searchParams.get('userId') || 'anonymous';

      const client: ClientConnection = { ws, userId };
      this.clients.set(clientId, client);

      console.log(`[WS] Client connected: ${clientId} (user: ${userId})`);

      ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString());
          this.handleClientMessage(clientId, msg);
        } catch (err) {
          this.sendToClient(clientId, {
            type: 'error',
            payload: { message: 'Invalid JSON' },
            timestamp: new Date().toISOString(),
          });
        }
      });

      ws.on('close', () => {
        this.clients.delete(clientId);
        console.log(`[WS] Client disconnected: ${clientId}`);
      });

      ws.on('error', (err) => {
        console.error(`[WS] Client error: ${clientId}`, err);
      });

      // 发送连接确认
      this.sendToClient(clientId, {
        type: 'connected',
        payload: { clientId, userId },
        timestamp: new Date().toISOString(),
      });
    });
  }

  private async handleClientMessage(
    clientId: string,
    msg: { type: string; payload: Record<string, unknown> }
  ): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client) return;

    switch (msg.type) {
      case 'send_message': {
        const { sessionId, content } = msg.payload as { sessionId: string; content: string };
        client.sessionId = sessionId;

        await this.engine.sendMessage(sessionId, content, client.userId, {
          onTextDelta: (text) => {
            this.sendToClient(clientId, {
              type: 'stream',
              payload: { sessionId, chunk: text, done: false },
              timestamp: new Date().toISOString(),
            });
          },
          onThinkingDelta: (text) => {
            this.sendToClient(clientId, {
              type: 'thinking',
              payload: { sessionId, text },
              timestamp: new Date().toISOString(),
            });
          },
          onToolCall: (toolCall) => {
            this.sendToClient(clientId, {
              type: 'tool_call',
              payload: { sessionId, toolCall },
              timestamp: new Date().toISOString(),
            });
          },
          onToolResult: (result) => {
            this.sendToClient(clientId, {
              type: 'tool_result',
              payload: { sessionId, result },
              timestamp: new Date().toISOString(),
            });
          },
          onStateChange: (state, step) => {
            this.sendToClient(clientId, {
              type: 'state_change',
              payload: { sessionId, state, step },
              timestamp: new Date().toISOString(),
            });
          },
          onPermissionRequest: (request) => {
            this.sendToClient(clientId, {
              type: 'permission_request',
              payload: { sessionId, requestId: `perm_${Date.now()}`, ...request },
              timestamp: new Date().toISOString(),
            });
          },
          onSubAgent: (subAgent) => {
            this.sendToClient(clientId, {
              type: 'subagent',
              payload: { sessionId, subAgent },
              timestamp: new Date().toISOString(),
            });
          },
          onMessage: (message) => {
            this.sendToClient(clientId, {
              type: 'message',
              payload: { sessionId, message },
              timestamp: new Date().toISOString(),
            });
          },
          onComplete: () => {
            this.sendToClient(clientId, {
              type: 'stream',
              payload: { sessionId, chunk: '', done: true },
              timestamp: new Date().toISOString(),
            });
          },
          onError: (error) => {
            this.sendToClient(clientId, {
              type: 'error',
              payload: { sessionId, message: error.message },
              timestamp: new Date().toISOString(),
            });
          },
        });
        break;
      }

      case 'approve_plan': {
        const { sessionId, approved } = msg.payload as { sessionId: string; approved: boolean };
        await this.engine.approvePlan(sessionId, approved);
        break;
      }

      case 'set_mode': {
        // 产品只保留 auto 模式，set_mode 为兼容保留空操作
        const { sessionId } = msg.payload as { sessionId: string };
        this.sendToClient(clientId, {
          type: 'mode_changed',
          payload: { sessionId, mode: 'auto' as ExecutionMode },
          timestamp: new Date().toISOString(),
        });
        break;
      }

      default:
        this.sendToClient(clientId, {
          type: 'error',
          payload: { message: `Unknown message type: ${msg.type}` },
          timestamp: new Date().toISOString(),
        });
    }
  }

  private sendToClient(clientId: string, event: WSEvent): void {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(event));
    }
  }

  /** 广播给所有连接的客户端 */
  broadcast(event: WSEvent, filter?: (client: ClientConnection) => boolean): void {
    for (const [id, client] of this.clients) {
      if (filter && !filter(client)) continue;
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(event));
      }
    }
  }
}
