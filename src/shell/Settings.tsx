import { resetPenDetection } from '../core/ink/pointer'
import { useSettings } from '../core/settings'
import type { Level } from '../core/stroke/types'

const LEVELS: { id: Level; label: string; hint: string }[] = [
  { id: 'easy', label: '🐣 Easy', hint: 'Order and direction mistakes are only hints' },
  { id: 'normal', label: '🙂 Normal', hint: 'Order and direction must be right' },
  { id: 'strict', label: '🎓 Strict', hint: 'Tight shapes, textbook stroke counts only' },
]

export function Settings() {
  const [settings, update] = useSettings()
  return (
    <section class="settings">
      <h1>⚙️ Settings</h1>
      <fieldset>
        <legend>Checking level</legend>
        {LEVELS.map(l => (
          <label key={l.id} class="radio-card">
            <input type="radio" name="level" value={l.id} checked={settings.level === l.id} onChange={() => update({ level: l.id })} />
            <span>{l.label}</span>
            <small>{l.hint}</small>
          </label>
        ))}
      </fieldset>
      <fieldset>
        <legend>Stylus</legend>
        <p>✏️ When an Apple Pencil is used, finger touches in the writing box are ignored.</p>
        <button onClick={() => { resetPenDetection(); alert('Finger drawing is back on.') }}>☝️ Allow finger drawing again</button>
      </fieldset>
    </section>
  )
}
