import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { memberBots, type Bot, type BotosState, type WidgetSlot } from './botModel';
import { hasGrant } from './capabilities';
import { createPublication, sensitivePromptFields, type ExpertPublication } from './expertDefinitions';
import { workspaceFiles } from './workspaceWidgets';
import './NewExpertDialog.css';

export default function CaptureExpertDialog({ state, bot, panelWidgets, onClose, onSave }: {
  state: BotosState; bot: Bot; panelWidgets: WidgetSlot[];
  onClose: () => void; onSave: (publication: ExpertPublication, prompt: string) => void;
}) {
  const [prompt, setPrompt] = useState(bot.prompt);
  const [includeRoutines, setIncludeRoutines] = useState(false);
  const [publish, setPublish] = useState(false);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const skills = state.skills.filter(skill => bot.skillIds.includes(skill.id));
  const connectors = state.mcps.filter(mcp => bot.mcpIds.includes(mcp.id) || bot.requiredMcpIds?.includes(mcp.id));
  const members = bot.kind === 'group' ? memberBots(state, bot) : [];
  const blockedMembers = members.filter(member => sensitivePromptFields(member.prompt).length);
  const fields = sensitivePromptFields(prompt);
  const blocked = fields.length > 0 || blockedMembers.length > 0;
  const title = bot.kind === 'group' ? '专家团' : '专家';
  const runs = bot.history.reduce((sum, [automatic, attended]) => sum + automatic + attended, 0);
  const routineTemplates = bot.routines ?? [];

  return <div className="bos-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <form className="bos-modal nx-modal nx-capture" role="dialog" aria-modal="true" aria-label={`沉淀为${title}`} onSubmit={event => {
      event.preventDefault();
      const publication = createPublication(state, bot, { prompt, publish, routineTemplates: includeRoutines ? routineTemplates : [], panelWidgets });
      if (publication) onSave(publication, publication.definition.prompt);
    }}>
      <header><h2>沉淀为{title}</h2><button type="button" className="bos-icon" aria-label="关闭" onClick={onClose}><X size={16} /></button></header>
      <div className="nx-capture-grid">
        <section>
          <h3>留下 · 定义</h3>
          <dl>
            <div><dt>身份</dt><dd>{bot.name}{members.length ? ` · ${members.map(member => member.name).join('、')}` : ''}</dd></div>
            <div><dt>技能</dt><dd>{skills.map(skill => skill.name).join('、') || '无'}</dd></div>
            <div><dt>连接器清单</dt><dd>{connectors.map(connector => connector.name).join('、') || '无'}</dd></div>
            <div><dt>面板模板</dt><dd>{panelWidgets.map(widget => widget.title).join('、')}</dd></div>
          </dl>
          <label className="bos-field"><span>提示词</span><textarea autoFocus rows={3} value={prompt} aria-invalid={fields.length > 0} onChange={event => setPrompt(event.target.value)} /></label>
          {fields.length ? <p className="bos-warn" role="alert">提示词包含疑似{fields.join('、')}，请删除后再确认。</p> : null}
          {blockedMembers.length ? <p className="bos-warn" role="alert">请先清理这些成员提示词中的敏感信息：{blockedMembers.map(member => member.name).join('、')}。</p> : null}
          <label className="nx-option"><input type="checkbox" checked={includeRoutines} disabled={!routineTemplates.length} onChange={event => setIncludeRoutines(event.target.checked)} />保存 Routine 模板（{routineTemplates.length} 项）</label>
        </section>
        <section>
          <h3>去掉 · 记忆和环境</h3>
          <dl>
            <div><dt>记忆</dt><dd>{bot.memory.length} 条</dd></div>
            <div><dt>对话历史</dt><dd>{bot.messages.length} 条</dd></div>
            <div><dt>工作区文件</dt><dd>{workspaceFiles(bot).length} 个</dd></div>
            <div><dt>凭证授权</dt><dd>{bot.mcpIds.filter(id => hasGrant(bot, 'mcp', id)).length} 个</dd></div>
            <div><dt>运行记录</dt><dd>{runs} 次</dd></div>
          </dl>
        </section>
      </div>
      <footer>
        <label className="nx-option"><input type="checkbox" checked={publish} onChange={event => setPublish(event.target.checked)} />同时提交发布到企业市场</label>
        <button type="button" className="bos-secondary" onClick={onClose}>取消</button>
        <button type="submit" className="bos-primary" disabled={blocked}>确认沉淀</button>
      </footer>
    </form>
  </div>;
}
