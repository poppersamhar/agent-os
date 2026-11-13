import BotWorkspace from './components/botos/BotWorkspace';
import AvatarSheet from './components/botos/AvatarSheet';
import AgentMarket from './components/botos/AgentMarket';
import NavDraft from './components/botos/NavDraft';

export default function App() {
  const view = new URLSearchParams(window.location.search).get('view');
  if (view === 'avatars') return <AvatarSheet />;
  if (view === 'market') return <AgentMarket />;
  if (view === 'nav-draft') return <NavDraft />;
  return <BotWorkspace />;
}
