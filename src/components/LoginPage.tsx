import { useState } from 'react';
import {
  Mail, Lock, Eye, EyeOff, Globe
} from 'lucide-react';

interface LoginPageProps {
  onLogin: (type: 'member' | 'admin') => void;
}



export default function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (activeTab === 'login') {
      if (password === '123') {
        // 统一密码为 123，默认以 member 身份登录
        onLogin('member');
      } else {
        setError('密码错误，请输入 123');
      }
    } else {
      setError('注册功能暂未开放');
    }
  };

  return (
    <div className="w-full h-full flex bg-white">
      {/* ─── 左侧：品牌展示区 ─── */}
      <div
        className="hidden lg:flex w-[58%] relative overflow-hidden"
        style={{ backgroundColor: '#faf6f3' }}
      >
        {/* 背景图：cover 铺满，偏右显示裁掉左侧空白 */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'url(/login-bg-clean.png)',
            backgroundSize: 'cover',
            backgroundPosition: '75% center',
          }}
        />

        {/* 文本内容叠加在背景图上 */}
        <div className="relative z-10 px-12 pt-10 mt-6">
          <div className="flex items-center gap-3 mb-10">
            <img src="/logo-agentos.png" alt="Agent-OS" className="w-10 h-10" draggable={false} />
            <span className="text-2xl font-semibold text-text tracking-tight">Agent-OS</span>
          </div>

          <h1 className="text-[32px] font-semibold leading-tight tracking-tight text-text">
            企业下一位骨干成员，
            <br />
            <span style={{ color: '#e17055' }}>是 AI Agent。</span>
          </h1>
          <p className="mt-4 text-[15px] text-text-secondary leading-relaxed max-w-sm">
            AI Native 管理的操作系统 · 用数字员工重塑企业运行方式
          </p>
        </div>
      </div>

      {/* ─── 右侧：登录表单 ─── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 sm:px-12 relative min-h-0 overflow-y-auto bg-white">
        {/* 移动端 Logo */}
        <div className="lg:hidden absolute top-6 left-6 flex items-center gap-2">
          <img src="/logo-agentos.png" alt="Agent-OS" className="w-9 h-9" draggable={false} />
          <span className="text-xl font-semibold text-text">Agent-OS</span>
        </div>

        {/* 语言选择 */}
        <div className="absolute top-6 right-8 flex items-center gap-1.5 text-[13px] text-text-secondary cursor-pointer hover:text-text transition-colors">
          <Globe className="w-4 h-4" strokeWidth={1.5} />
          <span>简体中文</span>
          <svg width="10" height="6" viewBox="0 0 10 6" className="ml-0.5 text-text-muted">
            <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          </svg>
        </div>

        <div className="w-full max-w-[360px] py-10">
          {/* 标题 */}
          <div className="text-center mb-8">
            <h2 className="text-[22px] font-semibold text-text tracking-tight">欢迎回到 Agent-OS</h2>
            <p className="mt-1.5 text-[13px] text-text-muted">登录或注册账号以继续</p>
          </div>

          {/* Tab 切换 */}
          <div className="flex items-center justify-center gap-8 mb-8 relative">
            <button
              onClick={() => { setActiveTab('login'); setError(''); }}
              className={`text-[14px] font-medium pb-2 transition-colors ${activeTab === 'login' ? 'text-text' : 'text-text-muted hover:text-text'}`}
            >
              登录
            </button>
            <button
              onClick={() => { setActiveTab('signup'); setError(''); }}
              className={`text-[14px] font-medium pb-2 transition-colors ${activeTab === 'signup' ? 'text-text' : 'text-text-muted hover:text-text'}`}
            >
              注册
            </button>
            <div
              className="absolute bottom-0 h-[2px] rounded-full transition-all duration-300"
              style={{
                backgroundColor: '#e17055',
                width: '40px',
                left: activeTab === 'login' ? 'calc(50% - 68px)' : 'calc(50% + 12px)',
              }}
            />
          </div>

          {/* 表单 */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[13px] font-medium text-text mb-1.5">邮箱</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" strokeWidth={1.5} />
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full h-11 pl-10 pr-4 rounded-lg border border-border bg-white text-[14px] text-text placeholder:text-text-placeholder outline-none transition-all focus:border-text-muted focus:ring-2 focus:ring-border"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[13px] font-medium text-text">密码</label>
                <button type="button" className="text-[12px] text-text-muted hover:text-text underline underline-offset-2 transition-colors">
                  忘记密码？
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" strokeWidth={1.5} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  className="w-full h-11 pl-10 pr-10 rounded-lg border border-border bg-white text-[14px] text-text placeholder:text-text-placeholder outline-none transition-all focus:border-text-muted focus:ring-2 focus:ring-border"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" strokeWidth={1.5} /> : <Eye className="w-4 h-4" strokeWidth={1.5} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-[13px] text-danger bg-danger-subtle rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full h-11 rounded-lg text-[14px] font-medium text-white transition-all hover:opacity-90 active:scale-[0.98]"
              style={{ backgroundColor: '#e17055' }}
            >
              {activeTab === 'login' ? '登录' : '注册'}
            </button>
          </form>

          <p className="mt-6 text-center text-[12px] text-text-muted leading-relaxed">
            继续使用即表示您同意我们的{' '}
            <button type="button" className="underline underline-offset-2 hover:text-text transition-colors">服务条款</button>
            {' '}和{' '}
            <button type="button" className="underline underline-offset-2 hover:text-text transition-colors">隐私政策</button>。
          </p>
        </div>
      </div>
    </div>
  );
}
