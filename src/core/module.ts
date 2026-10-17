import type { ComponentChildren } from 'preact'
import { matchRoute } from './router'

export interface Route {
  /** Path under `#/<module id>/`, e.g. ":script/char/:char". "" is the module's home. */
  path: string
  render: (params: Record<string, string>) => ComponentChildren
}

export interface LearningModule {
  id: string
  title: string
  icon: string
  routes: Route[]
  /** Storage namespace for this module's progress. */
  progressKey: string
}

export interface ResolvedRoute {
  module: LearningModule
  route: Route
  params: Record<string, string>
}

export function resolveModuleRoute(modules: LearningModule[], segments: string[]): ResolvedRoute | null {
  const [id, ...rest] = segments
  const module = modules.find(m => m.id === id)
  if (!module) return null
  for (const route of module.routes) {
    const params = matchRoute(route.path, rest)
    if (params) return { module, route, params }
  }
  return null
}
