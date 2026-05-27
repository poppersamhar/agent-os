/**
 * REST API 路由
 *
 * 会话管理、消息历史、Skill/Tool 查询
 */
import { Router } from 'express';
import { WorkAgentEngine } from '../core/agent/engine.js';
import { SessionManager } from '../core/session/manager.js';
import { config } from '../config/env.js';

export function createRoutes(engine: WorkAgentEngine): Router {
  const router = Router();
  const sessionManager = new SessionManager();

  /* ─── 会话管理 ─── */

  /** POST /api/sessions - 创建会话 */
  router.post('/sessions', async (req, res) => {
    try {
      const { userId, projectId, taskId, title } = req.body;
      const session = await engine.createSession({ userId, projectId, taskId, title });
      res.json({ success: true, data: session });
    } catch (err) {
      res.status(500).json({ success: false, error: (err as Error).message });
    }
  });

  /** GET /api/sessions - 列出用户会话 */
  router.get('/sessions', async (req, res) => {
    try {
      const userId = req.query.userId as string;
      const sessions = await sessionManager.list(userId);
      res.json({ success: true, data: sessions });
    } catch (err) {
      res.status(500).json({ success: false, error: (err as Error).message });
    }
  });

  /** GET /api/sessions/:id - 获取会话详情 */
  router.get('/sessions/:id', async (req, res) => {
    try {
      const session = await sessionManager.get(req.params.id);
      if (!session) {
        return res.status(404).json({ success: false, error: 'Session not found' });
      }
      res.json({ success: true, data: session });
    } catch (err) {
      res.status(500).json({ success: false, error: (err as Error).message });
    }
  });

  /** DELETE /api/sessions/:id - 删除会话 */
  router.delete('/sessions/:id', async (req, res) => {
    try {
      await sessionManager.delete(req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: (err as Error).message });
    }
  });

  /** POST /api/sessions/:id/branches - 创建分支 */
  router.post('/sessions/:id/branches', async (req, res) => {
    try {
      const { name, fromMessageIndex } = req.body;
      const branch = await sessionManager.createBranch(req.params.id, {
        sessionId: req.params.id,
        name,
        fromMessageIndex,
      } as any);
      res.json({ success: true, data: branch });
    } catch (err) {
      res.status(500).json({ success: false, error: (err as Error).message });
    }
  });

  /** POST /api/sessions/:id/switch-branch - 切换分支 */
  router.post('/sessions/:id/switch-branch', async (req, res) => {
    try {
      const { branchId } = req.body;
      await sessionManager.switchBranch(req.params.id, branchId);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: (err as Error).message });
    }
  });

  /* ─── Skill & Tool ─── */

  /** GET /api/skills - 列出所有 Skill */
  router.get('/skills', (_req, res) => {
    const skills = engine.getSkillRegistry().list();
    res.json({ success: true, data: skills });
  });

  /** GET /api/skills/:id - 获取 Skill 详情 */
  router.get('/skills/:id', (req, res) => {
    const skill = engine.getSkillRegistry().get(req.params.id);
    if (!skill) {
      return res.status(404).json({ success: false, error: 'Skill not found' });
    }
    res.json({ success: true, data: skill });
  });

  /** GET /api/connectors - 列出所有连接器（含工具与数字员工） */
  router.get('/connectors', (_req, res) => {
    const tools = engine.getToolRegistry().list();
    res.json({
      success: true,
      data: tools.map((t) => ({
        name: t.name,
        description: t.description,
        category: t.category,
        type: 'tool',
        parameters: t.parameters,
      })),
    });
  });

  /* ─── 知识库 ─── */

  /** GET /api/knowledge/sources - 知识源列表 */
  router.get('/knowledge/sources', (_req, res) => {
    res.json({
      success: true,
      data: [
        { id: 'k1', name: '企业知识库', type: '内部', description: '规章制度、应急预案、技术文档', status: 'connected', entries: 1240 },
        { id: 'k2', name: '项目知识沉淀', type: '内部', description: '所有项目任务上下文自动汇总', status: 'connected', entries: 356 },
        { id: 'k3', name: '供应链数据库', type: '第三方', description: '供应商信息、合同数据', status: 'connected', entries: 89 },
        { id: 'k4', name: '企查查 MCP', type: 'MCP', description: '企业工商信息、信用数据', status: 'connected', entries: 5600 },
        { id: 'k5', name: '外部评级数据', type: 'API', description: '行业报告、评级数据', status: 'disconnected', entries: 0 },
        { id: 'k6', name: '数字员工经验', type: '内部', description: 'Skill 执行日志与最佳实践', status: 'connected', entries: 2100 },
      ],
    });
  });

  /** GET /api/knowledge/graph - 全局知识图谱数据 */
  router.get('/knowledge/graph', (_req, res) => {
    res.json({
      success: true,
      data: {
        nodes: [
          { id: 'global-center', label: '组织知识图谱', type: 'core_entity', detail: '全组织知识资产总览' },
          { id: 'proj-risk', label: '财报分析', type: 'property', detail: '项目 · 3 成员' },
          { id: 'proj-supply', label: '供应商评估', type: 'property', detail: '项目 · 4 成员' },
          { id: 'agent-workagent', label: '管理智能体', type: 'property', detail: '任务编排与调度' },
          { id: 'agent-sub', label: '数字员工', type: 'property', detail: '原子任务执行' },
          { id: 's1', label: 'SQL分析', type: 'leaf', detail: '数据分析 Skill' },
          { id: 's2', label: 'Python沙箱', type: 'leaf', detail: '代码执行 Skill' },
        ],
        edges: [
          { source: 'global-center', target: 'proj-risk' },
          { source: 'global-center', target: 'proj-supply' },
          { source: 'global-center', target: 'agent-workagent' },
          { source: 'global-center', target: 'agent-sub' },
          { source: 'global-center', target: 's1' },
          { source: 'global-center', target: 's2' },
        ],
      },
    });
  });

  /* ─── 状态查询 ─── */

  /** GET /api/sessions/:id/state - 获取会话状态 */
  router.get('/sessions/:id/state', (req, res) => {
    const state = engine.getState(req.params.id);
    res.json({ success: true, data: { state } });
  });

  /** GET /api/health - 健康检查 */
  router.get('/health', (_req, res) => {
    const cfg = config.llm;
    res.json({
      success: true,
      data: {
        status: 'ok',
        version: '0.1.0',
        provider: cfg.provider,
        model: cfg.model,
        ready: config.isReady(),
      },
    });
  });

  return router;
}
