import { useState, type FormEvent } from 'react';
import { ArrowUp, Plug, Sparkles, X } from 'lucide-react';
import {
  connectorKinds, makeConnector, makeSkill, parseConnectorRequest, parseSkillRequest, validConnectorEndpoint, widgetChoices,
  type ConnectorDraft, type SkillDraft,
} from './capabilityDrafts';
import type { BotosAction, McpKind, WidgetKind } from './botModel';

type CreateAction = Extract<BotosAction, { type: 'create-skill' | 'create-mcp' }>;
const categories = ['通用', '调研', '分析', '写作', '数据'];

export default function MarketCreationDialog({ kind, onClose, onSave }: {
  kind: 'skill' | 'connector'; onClose: () => void; onSave: (action: CreateAction) => void;
}) {
  const skillMode = kind === 'skill';
  const title = skillMode ? '新建技能' : '接入连接器';
  const [input, setInput] = useState('');
  const [request, setRequest] = useState('');
  const [review, setReview] = useState(false);
  const [skill, setSkill] = useState<SkillDraft>({ name: '', category: '通用' });
  const [connector, setConnector] = useState<ConnectorDraft>({ name: '', endpoint: '', kind: 'custom' });
  const [tools, setTools] = useState('');

  function prepare(event: FormEvent) {
    event.preventDefault();
    const description = input.trim();
    if (!description) return;
    if (skillMode) setSkill(parseSkillRequest(description));
    else setConnector(parseConnectorRequest(description));
    setRequest(description);
    setReview(true);
  }

  function save(event: FormEvent) {
    event.preventDefault();
    if (skillMode) {
      if (skill.name.trim()) onSave({ type: 'create-skill', skill: makeSkill(skill) });
    } else if (connector.name.trim() && validConnectorEndpoint(connector.endpoint.trim())) {
      onSave({ type: 'create-mcp', mcp: makeConnector({ ...connector, tools: tools.split(/[,，、\n]/) }) });
    }
  }

  return <div className="bos-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="bos-modal mk-create-modal" role="dialog" aria-modal="true" aria-label={`${title}助手`} onKeyDown={event => {
      if (event.key === 'Escape') { event.stopPropagation(); onClose(); }
    }}>
      <header><h2>{title}</h2><button type="button" className="bos-icon" onClick={onClose} aria-label="关闭创建助手"><X size={17} /></button></header>
      <div className="mk-assistant-message">
        {skillMode ? <Sparkles size={17} aria-hidden="true" /> : <Plug size={17} aria-hidden="true" />}
        <p>{skillMode ? '告诉我技能的名称和它要完成的工作。' : '告诉我连接器的名称和 MCP 端点。凭证由 Vault 托管。'}</p>
      </div>
      {request ? <div className="mk-user-message">{request}</div> : null}
      {review ? <form className="mk-create-fields" onSubmit={save}>
        <h3>确认配置</h3>
        {skillMode ? <>
          <label className="bos-field"><span>名称</span><input autoFocus required value={skill.name} onChange={e => setSkill({ ...skill, name: e.target.value })} /></label>
          <label className="bos-field"><span>做什么</span><textarea rows={2} value={skill.description ?? ''} onChange={e => setSkill({ ...skill, description: e.target.value })} /></label>
          <div className="mk-create-columns">
            <label className="bos-field"><span>分类</span><select value={skill.category} onChange={e => setSkill({ ...skill, category: e.target.value })}>{categories.map(category => <option key={category}>{category}</option>)}</select></label>
            <label className="bos-field"><span>工作台组件</span><select value={skill.widget ?? ''} onChange={e => setSkill({ ...skill, widget: e.target.value as WidgetKind })}><option value="">无</option>{widgetChoices.map(widget => <option key={widget.kind} value={widget.kind}>{widget.title}</option>)}</select></label>
          </div>
        </> : <>
          <div className="mk-create-columns">
            <label className="bos-field"><span>名称</span><input autoFocus required value={connector.name} onChange={e => setConnector({ ...connector, name: e.target.value })} /></label>
            <label className="bos-field"><span>类型</span><select value={connector.kind} onChange={e => setConnector({ ...connector, kind: e.target.value as McpKind })}>{Object.entries(connectorKinds).map(([kind, label]) => <option key={kind} value={kind}>{label}</option>)}</select></label>
          </div>
          <label className="bos-field"><span>端点</span><input required value={connector.endpoint} onChange={e => setConnector({ ...connector, endpoint: e.target.value })} placeholder="mcp://… 或 https://…" /></label>
          {connector.endpoint && !validConnectorEndpoint(connector.endpoint.trim()) ? <p className="bos-warn" role="alert">请输入有效的 MCP 或 HTTP 端点，并移除 URL 中的凭证。</p> : null}
          <label className="bos-field"><span>工具（用逗号分隔）</span><input value={tools} onChange={e => setTools(e.target.value)} placeholder="查询工单, 更新状态" /></label>
        </>}
        <footer><button type="button" className="bos-secondary" onClick={onClose}>取消</button><button type="submit" className="bos-primary" disabled={skillMode ? !skill.name.trim() : !connector.name.trim() || !validConnectorEndpoint(connector.endpoint.trim())}>{skillMode ? '保存到技能库' : '保存到连接器库'}</button></footer>
      </form> : <>
        <form className="mk-assistant-input" onSubmit={prepare}>
          <input autoFocus aria-label="描述要创建的能力" value={input} onChange={e => setInput(e.target.value)} placeholder={skillMode ? '例如：新建「投诉分析」，整理客服工单' : '例如：接入「工单系统」，端点 mcp://tickets.internal'} />
          <button type="submit" className="bos-primary" disabled={!input.trim()} aria-label="发送给创建助手"><ArrowUp size={17} /></button>
        </form>
        <button type="button" className="bos-link-button" onClick={() => setReview(true)}>直接填写配置</button>
      </>}
    </div>
  </div>;
}
