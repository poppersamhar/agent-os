/**
 * Session 管理服务（抄袭 KodaX JSONL + 分支树）
 *
 * 存储格式：JSONL，每行一条消息
 * 分支：通过 branchId + parentBranchId + rootMessageIndex 实现
 * 压缩：thresholdRatio 触发，保留最近 N 条 + 摘要
 */
import {
  type Session,
  type SessionBranch,
  type AgentMessage,
  type CompactionPolicy,
  type CreateBranchDTO,
} from '../../types/index.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createHash } from 'crypto';

export interface SessionStorage {
  save(session: Session): Promise<void>;
  load(sessionId: string): Promise<Session | null>;
  list(userId: string): Promise<Session[]>;
  delete(sessionId: string): Promise<void>;
}

/** 文件系统存储 */
export class FileSystemStorage implements SessionStorage {
  private basePath: string;

  constructor(basePath = '~/.agentos/sessions') {
    this.basePath = basePath.replace(/^~/, process.env.HOME || '');
  }

  private sessionPath(id: string): string {
    const hash = createHash('md5').update(id).digest('hex').slice(0, 8);
    return path.join(this.basePath, `${hash}_${id}`);
  }

  private async ensureDir(dir: string): Promise<void> {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch {
      // ignore
    }
  }

  async save(session: Session): Promise<void> {
    const dir = this.sessionPath(session.id);
    await this.ensureDir(dir);

    // 保存 session 元数据
    await fs.writeFile(
      path.join(dir, 'meta.json'),
      JSON.stringify({
        id: session.id,
        userId: session.userId,
        projectId: session.projectId,
        taskId: session.taskId,
        title: session.title,
        branches: session.branches,
        activeBranchId: session.activeBranchId,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        contextWindow: session.contextWindow,
        autoCompaction: session.autoCompaction,
        compactionPolicy: session.compactionPolicy,
      }, null, 2)
    );

    // 保存消息 JSONL
    const lines = session.messages
      .map((m) => JSON.stringify(m))
      .join('\n');
    await fs.writeFile(path.join(dir, 'messages.jsonl'), lines + '\n');
  }

  async load(sessionId: string): Promise<Session | null> {
    const dir = this.sessionPath(sessionId);
    try {
      const metaRaw = await fs.readFile(path.join(dir, 'meta.json'), 'utf-8');
      const meta = JSON.parse(metaRaw);

      const messagesRaw = await fs.readFile(
        path.join(dir, 'messages.jsonl'),
        'utf-8'
      );
      const messages = messagesRaw
        .split('\n')
        .filter((line) => line.trim())
        .map((line) => JSON.parse(line) as AgentMessage);

      return { ...meta, messages };
    } catch {
      return null;
    }
  }

  async list(userId: string): Promise<Session[]> {
    try {
      const dirs = await fs.readdir(this.basePath);
      const sessions: Session[] = [];
      for (const dir of dirs) {
        try {
          const metaRaw = await fs.readFile(
            path.join(this.basePath, dir, 'meta.json'),
            'utf-8'
          );
          const meta = JSON.parse(metaRaw);
          if (meta.userId === userId) {
            const messagesRaw = await fs.readFile(
              path.join(this.basePath, dir, 'messages.jsonl'),
              'utf-8'
            );
            const messages = messagesRaw
              .split('\n')
              .filter((line) => line.trim())
              .map((line) => JSON.parse(line) as AgentMessage);
            sessions.push({ ...meta, messages });
          }
        } catch {
          // skip invalid
        }
      }
      return sessions;
    } catch {
      return [];
    }
  }

  async delete(sessionId: string): Promise<void> {
    const dir = this.sessionPath(sessionId);
    try {
      await fs.rm(dir, { recursive: true });
    } catch {
      // ignore
    }
  }
}

/** 内存存储（用于测试） */
export class InMemoryStorage implements SessionStorage {
  private sessions = new Map<string, Session>();

  async save(session: Session): Promise<void> {
    this.sessions.set(session.id, JSON.parse(JSON.stringify(session)));
  }

  async load(sessionId: string): Promise<Session | null> {
    const s = this.sessions.get(sessionId);
    return s ? JSON.parse(JSON.stringify(s)) : null;
  }

  async list(userId: string): Promise<Session[]> {
    return Array.from(this.sessions.values()).filter(
      (s) => s.userId === userId
    );
  }

  async delete(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
  }
}

export class SessionManager {
  private storage: SessionStorage;
  private activeSessions = new Map<string, Session>();

  constructor(storage?: SessionStorage) {
    this.storage = storage || new InMemoryStorage();
  }

  /** 创建会话 */
  async create(params: {
    userId: string;
    projectId: string;
    taskId: string;
    title: string;
  }): Promise<Session> {
    const id = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const mainBranch: SessionBranch = {
      id: 'main',
      name: '主会话',
      active: true,
      rootMessageIndex: 0,
      createdAt: new Date().toISOString(),
    };

    const session: Session = {
      id,
      ...params,
      branches: [mainBranch],
      activeBranchId: 'main',
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      contextWindow: { usedTokens: 0, maxTokens: 20000 },
      autoCompaction: true,
      compactionPolicy: { thresholdRatio: 0.8, keepRecent: 10 },
    };

    await this.storage.save(session);
    this.activeSessions.set(id, session);
    return session;
  }

  /** 获取会话 */
  async get(sessionId: string): Promise<Session | null> {
    const cached = this.activeSessions.get(sessionId);
    if (cached) return cached;

    const loaded = await this.storage.load(sessionId);
    if (loaded) this.activeSessions.set(sessionId, loaded);
    return loaded;
  }

  /** 添加消息 */
  async addMessage(sessionId: string, message: AgentMessage): Promise<void> {
    const session = await this.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    session.messages.push(message);
    session.updatedAt = new Date().toISOString();

    // 更新 token 使用
    const textLen = message.content.length;
    session.contextWindow.usedTokens += Math.ceil(textLen * 0.5);

    // 自动压缩
    if (this.shouldCompact(session)) {
      await this.compact(session);
    }

    await this.storage.save(session);
  }

  /** 创建分支 */
  async createBranch(
    sessionId: string,
    dto: CreateBranchDTO
  ): Promise<SessionBranch> {
    const session = await this.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    const branchId = `branch_${Date.now()}`;
    const fromIndex =
      dto.fromMessageIndex ?? session.messages.length - 1;

    const branch: SessionBranch = {
      id: branchId,
      name: dto.name,
      parentBranchId: session.activeBranchId,
      rootMessageIndex: fromIndex,
      createdAt: new Date().toISOString(),
      active: true,
    };

    // 将其他分支设为非激活
    session.branches.forEach((b) => (b.active = false));
    session.branches.push(branch);
    session.activeBranchId = branchId;

    await this.storage.save(session);
    return branch;
  }

  /** 切换分支 */
  async switchBranch(sessionId: string, branchId: string): Promise<void> {
    const session = await this.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    const branch = session.branches.find((b) => b.id === branchId);
    if (!branch) throw new Error(`Branch ${branchId} not found`);

    session.branches.forEach((b) => (b.active = false));
    branch.active = true;
    session.activeBranchId = branchId;

    await this.storage.save(session);
  }

  /** 获取分支消息 */
  getBranchMessages(session: Session, branchId?: string): AgentMessage[] {
    const bid = branchId || session.activeBranchId;
    const branch = session.branches.find((b) => b.id === bid);
    if (!branch) return [];

    // 继承父分支消息 + 当前分支消息
    if (branch.parentBranchId && branch.rootMessageIndex > 0) {
      const parentMsgs = session.messages.slice(0, branch.rootMessageIndex);
      const branchMsgs = session.messages.filter((m) => m.branchId === bid);
      return [...parentMsgs, ...branchMsgs];
    }

    return branch.id === 'main'
      ? session.messages
      : session.messages.filter((m) => m.branchId === bid);
  }

  private shouldCompact(session: Session): boolean {
    if (!session.autoCompaction) return false;
    const ratio =
      session.contextWindow.usedTokens / session.contextWindow.maxTokens;
    return ratio >= session.compactionPolicy.thresholdRatio;
  }

  /** 压缩会话：保留最近 N 条，前面生成摘要 */
  private async compact(session: Session): Promise<void> {
    const policy = session.compactionPolicy;
    const messages = session.messages;

    if (messages.length <= policy.keepRecent) return;

    const toSummarize = messages.slice(0, -policy.keepRecent);
    const summary = this.generateSummary(toSummarize);

    const summaryMsg: AgentMessage = {
      id: `summary_${Date.now()}`,
      branchId: session.activeBranchId,
      role: 'system',
      senderName: 'System',
      content: `[会话摘要] ${summary}`,
      timestamp: new Date().toISOString(),
    };

    session.messages = [summaryMsg, ...messages.slice(-policy.keepRecent)];

    // 重新计算 token
    session.contextWindow.usedTokens = session.messages.reduce(
      (sum, m) => sum + Math.ceil(m.content.length * 0.5),
      0
    );
  }

  private generateSummary(messages: AgentMessage[]): string {
    // 简化版摘要：统计角色和数量
    const roles = messages.reduce(
      (acc, m) => {
        acc[m.role] = (acc[m.role] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const toolCalls = messages.filter((m) => m.metadata?.toolCall).length;
    const reports = messages.filter((m) => m.metadata?.report).length;

    return `历史对话共 ${messages.length} 条消息：user ${roles.user || 0} 条, assistant ${roles.assistant || 0} 条, tool ${roles.tool || 0} 条, subagent ${roles.subagent || 0} 条。包含 ${toolCalls} 次工具调用，${reports} 份报告。`;
  }

  /** 列出用户会话 */
  async list(userId: string): Promise<Session[]> {
    return this.storage.list(userId);
  }

  /** 删除会话 */
  async delete(sessionId: string): Promise<void> {
    this.activeSessions.delete(sessionId);
    await this.storage.delete(sessionId);
  }
}
