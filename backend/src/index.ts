/**
 * AgentOS WorkAgent 后端入口
 *
 * 启动命令: npm run dev
 */
import { startServer } from './api/server.js';

const PORT = parseInt(process.env.PORT || '3001', 10);

startServer(PORT);
