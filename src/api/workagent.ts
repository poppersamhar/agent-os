/**
 * WorkAgent API 客户端
 *
 * 封装 WebSocket + REST API，对接后端 WorkAgentEngine
 */
import type {
  AgentMessage,
  PlanStep,
  SubAgentTask,
  ExecutionMode,
  Session,
  Skill,
  WorkAgentState,
} from '../types/workagent';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001/api';
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001/ws/workagent';

/* ─── 事件类型 ─── */
export interface WorkAgentCallbacks {
  onMessage?: (msg: AgentMessage) => void;
  onStream?: (chunk: string, done: boolean) => void;
  onThinking?: (text: string) => void;
  onToolCall?: (toolCall: { name: string; arguments: string }) => void;
  onToolResult?: (result: { name: string; output: string; success: boolean }) => void;
  onStateChange?: (state: WorkAgentState, step?: PlanStep) => void;
  onSubAgent?: (subAgent: SubAgentTask) => void;
  onPermissionRequest?: (request: { requestId: string; type: 'bash' | 'edit' | 'dispatch'; description: string }) => void;
  onError?: (error: string) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export class WorkAgentClient {
  private ws: WebSocket | null = null;
  private callbacks: WorkAgentCallbacks = {};
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private userId: string;
  private url: string;
  private manualDisconnect = false;

  constructor(userId: string, url?: string) {
    this.userId = userId;
    this.url = url || `${WS_URL}?userId=${encodeURIComponent(userId)}`;
  }

  /** 连接 WebSocket */
  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    this.manualDisconnect = false;

    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log('[WorkAgentClient] Connected');
      this.callbacks.onConnect?.();
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        this.handleMessage(msg);
      } catch {
        console.error('[WorkAgentClient] Invalid message:', event.data);
      }
    };

    this.ws.onclose = () => {
      console.log('[WorkAgentClient] Disconnected');
      this.callbacks.onDisconnect?.();
      // 自动重连（仅非手动断开时）
      if (!this.manualDisconnect) {
        this.reconnectTimer = setTimeout(() => this.connect(), 3000);
      }
    };

    this.ws.onerror = (err) => {
      console.error('[WorkAgentClient] Error:', err);
    };
  }

  /** 断开连接 */
  disconnect(): void {
    this.manualDisconnect = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
    this.ws = null;
  }

  /** 注册回调 */
  on(callbacks: WorkAgentCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /** 发送消息 */
  sendMessage(sessionId: string, content: string): void {
    this.send({
      type: 'send_message',
      payload: { sessionId, content },
    });
  }

  /** 审批计划 */
  approvePlan(sessionId: string, approved: boolean): void {
    this.send({
      type: 'approve_plan',
      payload: { sessionId, approved },
    });
  }

  /** 审批权限 */
  approvePermission(sessionId: string, requestId: string, approved: boolean): void {
    this.send({
      type: 'approve_permission',
      payload: { sessionId, requestId, approved },
    });
  }

  /** 切换执行模式 */
  setMode(sessionId: string, mode: ExecutionMode): void {
    this.send({
      type: 'set_mode',
      payload: { sessionId, mode },
    });
  }

  private send(msg: { type: string; payload: Record<string, unknown> }): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    } else {
      console.warn('[WorkAgentClient] WebSocket not open, message queued');
    }
  }

  private handleMessage(msg: { type: string; payload: unknown; timestamp: string }): void {
    switch (msg.type) {
      case 'message': {
        const { message } = msg.payload as { message: AgentMessage };
        this.callbacks.onMessage?.(message);
        break;
      }
      case 'stream': {
        const { chunk, done } = msg.payload as { chunk: string; done: boolean };
        this.callbacks.onStream?.(chunk, done);
        break;
      }
      case 'thinking': {
        const { text } = msg.payload as { text: string };
        this.callbacks.onThinking?.(text);
        break;
      }
      case 'tool_call': {
        const { toolCall } = msg.payload as { toolCall: { name: string; arguments: string } };
        this.callbacks.onToolCall?.(toolCall);
        break;
      }
      case 'tool_result': {
        const { result } = msg.payload as { result: { name: string; output: string; success: boolean } };
        this.callbacks.onToolResult?.(result);
        break;
      }
      case 'state_change': {
        const { state, step } = msg.payload as { state: WorkAgentState; step?: PlanStep };
        this.callbacks.onStateChange?.(state, step);
        break;
      }
      case 'permission_request': {
        const { requestId, type, description } = msg.payload as {
          requestId: string;
          type: 'bash' | 'edit' | 'dispatch';
          description: string;
        };
        this.callbacks.onPermissionRequest?.({ requestId, type, description });
        break;
      }
      case 'subagent': {
        const { subAgent } = msg.payload as { subAgent: SubAgentTask };
        this.callbacks.onSubAgent?.(subAgent);
        break;
      }
      case 'error': {
        const { message } = msg.payload as { message: string };
        this.callbacks.onError?.(message);
        break;
      }
    }
  }
}

/* ─── REST API 方法 ─── */

export async function createSession(params: {
  userId: string;
  projectId: string;
  taskId: string;
  title: string;
}): Promise<Session> {
  const res = await fetch(`${API_BASE}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data;
}

export async function getSession(sessionId: string): Promise<Session> {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data;
}

export async function listSessions(userId: string): Promise<Session[]> {
  const res = await fetch(`${API_BASE}/sessions?userId=${encodeURIComponent(userId)}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data;
}

export async function createBranch(
  sessionId: string,
  name: string,
  fromMessageIndex?: number
): Promise<unknown> {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/branches`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, fromMessageIndex }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data;
}

export async function listSkills(): Promise<Skill[]> {
  const res = await fetch(`${API_BASE}/skills`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data;
}

export async function listTools(): Promise<Array<{ name: string; description: string; category: string }>> {
  const res = await fetch(`${API_BASE}/tools`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data;
}
