import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import KnowledgeGraphDemo from './components/KnowledgeGraphDemo.tsx'

const isKnowledgeGraphDemo = ['/knowledge-graph-demo', '/knowledge-graph-demo.html'].includes(window.location.pathname)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isKnowledgeGraphDemo ? <KnowledgeGraphDemo /> : <App />}
  </StrictMode>,
)
