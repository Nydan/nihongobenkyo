import type { ComponentChildren } from 'preact'
import type { LearningModule } from '../../core/module'
import { NotFound } from '../../core/NotFound'
import { CharacterScreen } from './CharacterScreen'
import { findKana } from './chars'
import type { Script } from './chars'
import { KanaHome } from './KanaHome'
import { LessonScreen } from './LessonScreen'
import { PROGRESS_NS } from './progress'
import { QuizScreen } from './QuizScreen'
import { ScriptScreen } from './ScriptScreen'

const asScript = (s: string): Script | null => (s === 'hiragana' || s === 'katakana' ? s : null)
const withScript = (render: (script: Script, p: Record<string, string>) => ComponentChildren) =>
  (p: Record<string, string>) => {
    const script = asScript(p.script)
    return script ? render(script, p) : <NotFound />
  }

export const kanaModule: LearningModule = {
  id: 'kana',
  title: 'Kana Writing',
  icon: 'あ',
  progressKey: PROGRESS_NS,
  routes: [
    { path: '', render: () => <KanaHome /> },
    { path: ':script', render: withScript(s => <ScriptScreen script={s} tab="path" />) },
    { path: ':script/grid', render: withScript(s => <ScriptScreen script={s} tab="grid" />) },
    {
      path: ':script/char/:char',
      // A character under the wrong script (ア in /hiragana/) is not a page.
      render: withScript((script, p) =>
        findKana(p.char)?.script === script ? <CharacterScreen key={p.char} char={p.char} /> : <NotFound />),
    },
    // LessonScreen and QuizScreen render NotFound themselves for an unknown node or an out-of-range index.
    { path: ':script/lesson/:node/:i', render: withScript((s, p) => <LessonScreen key={`${s}/${p.node}/${p.i}`} script={s} nodeId={p.node} index={Number(p.i)} />) },
    { path: ':script/quiz/:node', render: withScript((s, p) => <QuizScreen key={`${s}/${p.node}`} script={s} nodeId={p.node} />) },
  ],
}
