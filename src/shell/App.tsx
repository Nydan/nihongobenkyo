import type { LearningModule } from '../core/module'
import { resolveModuleRoute } from '../core/module'
import { NotFound } from '../core/NotFound'
import { href, useHashSegments } from '../core/router'
import { About } from './About'
import { Banner } from './Banner'
import { Home } from './Home'
import { Settings } from './Settings'

function renderRoute(modules: LearningModule[], segments: string[]) {
  if (segments.length === 0) return <Home modules={modules} />
  if (segments.length === 1 && segments[0] === 'settings') return <Settings />
  if (segments.length === 1 && segments[0] === 'about') return <About />
  const resolved = resolveModuleRoute(modules, segments)
  return resolved ? resolved.route.render(resolved.params) : <NotFound />
}

export function App({ modules }: { modules: LearningModule[] }) {
  const segments = useHashSegments()
  return (
    <div class="app">
      <nav class="topbar">
        <a class="button" href={href()}>🏠 Home</a>
        <span class="topbar-right">
          <a class="button" href={href('settings')}>⚙️ Settings</a>
          <a class="button" href={href('about')}>ℹ️ About</a>
        </span>
      </nav>
      <Banner />
      <main>{renderRoute(modules, segments)}</main>
    </div>
  )
}
