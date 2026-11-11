import { Check } from 'lucide-react';
import type { BotChoices } from './botModel';

const letters = 'ABCDEFG';

/** 专家主动提问的选择卡：选一项就把它当作任务发给专家；最后一项「其他」把光标放回输入框。 */
export default function ChoiceCard({ choices, onPick, onOther }: { choices: BotChoices; onPick: (answer: string) => void; onOther: () => void }) {
  const done = choices.answered !== undefined;
  return <div className={`bos-choices${done ? ' is-done' : ''}`} role="group" aria-label={choices.question}>
    <strong>{choices.question}</strong>
    <ol>
      {choices.options.map((option, i) => {
        const picked = choices.answered === option;
        return <li key={option}><button type="button" disabled={done} aria-pressed={picked} onClick={() => onPick(option)}>
          <span className="bos-choice-key">{picked ? <Check size={12} /> : letters[i]}</span>{option}
        </button></li>;
      })}
      {done ? null : <li><button type="button" className="is-other" onClick={onOther}>
        <span className="bos-choice-key">{letters[choices.options.length]}</span>其他，我直接说
      </button></li>}
    </ol>
  </div>;
}
