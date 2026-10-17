import { kanaByScript, ROWS, type Script } from './chars'

export interface PathNode { id: string; kind: 'row' | 'review'; label: string; chars: string[] }

const REVIEW_EVERY = 3

export function buildPath(script: Script): PathNode[] {
  const kana = kanaByScript(script)
  const nodes: PathNode[] = []
  let pending: string[] = []
  let reviews = 0
  ROWS.forEach((row, i) => {
    const chars = kana.filter(k => k.row === row).map(k => k.char)
    nodes.push({ id: row, kind: 'row', label: chars.join(' '), chars })
    pending.push(...chars)
    if ((i + 1) % REVIEW_EVERY === 0) {
      reviews++
      nodes.push({ id: `review-${reviews}`, kind: 'review', label: `🔁 Review ${reviews}`, chars: pending })
      pending = []
    }
  })
  return nodes
}

export const nodeKey = (script: Script, id: string): string => `${script}:${id}`

export const isUnlocked = (nodes: PathNode[], index: number, script: Script, passed: readonly string[]): boolean =>
  index === 0 || passed.includes(nodeKey(script, nodes[index].id)) || passed.includes(nodeKey(script, nodes[index - 1].id))

export const findNode = (script: Script, id: string): PathNode | undefined => buildPath(script).find(n => n.id === id)
