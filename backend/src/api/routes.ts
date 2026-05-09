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

  /** GET /api/tools - 列出所有工具 */
  router.get('/tools', (_req, res) => {
    const tools = engine.getToolRegistry().list();
    res.json({
      success: true,
      data: tools.map((t) => ({
        name: t.name,
        description: t.description,
        category: t.category,
        parameters: t.parameters,
      })),
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
