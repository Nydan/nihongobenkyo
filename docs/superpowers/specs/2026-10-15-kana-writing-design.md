# Nihongo Benkyō — Kana Writing (Module 1) Design

- **Date:** 2026-10-15
- **Status:** Draft — awaiting review
- **Scope:** App shell + kana writing module (hiragana & katakana). Grammar (文法) is a future module; this spec only defines the slot it plugs into.

## 1. Goal and audience

A web app that teaches writing hiragana and katakana stroke by stroke, for children through adults. Learners watch each stroke, trace it with a finger or stylus, copy it, and finally write it with no guide while the app checks correctness.

### Agreed decisions

| Topic | Decision |
|---|---|
| Checking strictness | Adjustable: Easy / Normal / Strict (default Normal) |
| UI language | Icon-first, English text |
| Navigation | Guided path **and** free-browse grid; progress saved on device |
| Tech approach | Vite + TypeScript + Preact, bundled to one HTML with `vite-plugin-singlefile` |
| Extensibility | Module-based shell; future grammar lessons are one Markdown file each |
| Pronunciation | Browser text-to-speech (`speechSynthesis`), hidden when no Japanese voice |
| iPad delivery | GitHub Pages + offline caching + Add to Home Screen |
| Licensing | Code: MIT. Stroke data: KanjiVG, CC BY-SA 3.0, kept separately with its own license |

### Assumptions

- Character set: 46 basic hiragana + 46 basic katakana (92 total). Voiced/semi-voiced kana (が, ぱ…) and small kana are out of scope for now.
- Fully offline after first load; no server, no accounts, no network calls at runtime.
- Stroke shapes and order come from KanjiVG; checking is pure on-device geometry (no ML, no external service).
- Progress is per device/browser; no sync.
- Not commercial; may be open-sourced.

## 2. Architecture and repo layout

```
nohonggobenkyo/
  src/
    main.tsx              entry: registers modules, mounts shell
    shell/                home, navigation, settings, About/credits
    core/
      module.ts           LearningModule contract + registry
      router.ts           hash router (#/kana/hiragana/a)
      storage.ts          versioned, namespaced localStorage with in-memory fallback
      speech.ts           speechSynthesis wrapper
      stroke/             resample, normalize, checkCharacter (shared; reusable by a future kanji module)
    modules/
      kana/               Module 1
      grammar/            (future) renders content/grammar/*.md
  data/kanjivg/
    kana.json             generated stroke data (committed)
    LICENSE               CC BY-SA 3.0 + attribution
  content/                Markdown lesson files for future content modules
  scripts/
    build-kana-data.ts    KanjiVG SVG → kana.json
  public/
    sw.js                 hand-written cache-first service worker
    manifest.webmanifest
    icon-*.png
  tests/                  Vitest unit tests + Playwright smoke test
  LICENSE                 MIT (code)
  README.md
```

### Module contract

```ts
interface LearningModule {
  id: string            // "kana", "grammar"
  title: string         // "Kana Writing"
  icon: string          // home-screen tile icon
  routes: Route[]       // module screens, mounted under #/<id>/...
  progressKey: string   // namespace in storage
}
```

The shell renders one home tile per registered module. Modules depend on `core/` only, never on each other.

### Future content modules (grammar)

A content module discovers its lessons at build time with
`import.meta.glob('/content/grammar/*.md', { eager: true, query: '?raw', import: 'default' })`,
parses frontmatter (`title`, `level`, `order`) and renders Markdown with two custom extensions: furigana (`{漢字|かんじ}`) and fenced ```` ```quiz ```` blocks. Adding a lesson = add a file + rebuild; no code changes. The grammar module itself is a separate spec.

### Build outputs

- `npm run dev` — local dev server.
- `npm run build` — `dist/` containing:
  - `index.html` — fully self-contained (all JS, CSS, stroke data inlined). Opening it directly via `file://` works on desktop browsers.
  - `sw.js`, `manifest.webmanifest`, icons — only used when served over HTTP(S) (GitHub Pages). A service worker cannot be inlined, so "single file" means *the app runs from `index.html` alone*; the extra files add offline/installable behavior when hosted.
- Vite `base: './'` so the build works under `/<repo-name>/` on GitHub Pages.
- Service worker registration is guarded by `location.protocol.startsWith('http')`.
- No `vite-plugin-pwa` (it conflicts with `vite-plugin-singlefile` asset handling); `sw.js` is a small hand-written cache-first worker keyed by build version.

## 3. Kana learning flow

**Screens:** Home → Kana Writing → Hiragana | Katakana → tabs **Path** / **Grid**.

- **Path:** lessons by gojūon row (あ・か・さ・た・な・は・ま・や・ら・わ・ん). A lesson teaches each character in the row, then a row quiz (shuffled, Test mode). The quiz passes when every character in it passes; failed characters are retried until they pass. Passing unlocks the next row. A mixed review lesson follows every 3 rows. Unlocking is advisory: the Grid opens any character.
- **Grid:** gojūon chart; each cell shows 0–3 stars; tap to open the character.

### Character screen — four steps

| Step | Behavior | Stars |
|---|---|---|
| 1. 👀 Watch | Strokes animate one at a time with stroke numbers and direction arrows. ◀ ▶ step through stroke by stroke, then the final form. 🔊 plays pronunciation. | — |
| 2. ✍️ Trace | Faint full character; next stroke highlighted with a start dot. Each stroke checked on pen lift (in-place, no normalization). Wrong stroke flashes red; redo that stroke only. | ⭐ |
| 3. 👁️ Copy | Empty box; finished character shown beside it. Checked on ✓. | ⭐⭐ |
| 4. 🎯 Test | Empty box, no reference. Checked on ✓ with feedback overlay. | ⭐⭐⭐ |

Stars are the best achieved and never decrease. A star is earned at the strictness level active at the time.

### Writing box

- Square box with the dotted 田 practice guide.
- Rendering: **SVG** for the reference/guide/feedback overlay; **canvas** for the learner's ink. Learner strokes are also kept as point arrays for checking.
- Input via Pointer Events. `touch-action: none` and `-webkit-user-select: none` on the box to prevent scroll, zoom and selection.
- **Stylus mode:** once a `pointerType === 'pen'` event is seen, `'touch'` pointers are ignored in the box (palm rejection) for the rest of the session; a settings toggle can reset it.
- `pointercancel` discards the in-progress stroke.
- Controls: ↩️ undo stroke, 🗑️ clear, ✓ check.

## 4. Stroke checking

Located in `src/core/stroke/`. Pure functions, no DOM.

```ts
type Point = { x: number; y: number }      // in reference viewBox units (KanjiVG 109×109)
type Stroke = Point[]
type Level = 'easy' | 'normal' | 'strict'
type Issue = 'shape' | 'direction' | 'order' | 'missing' | 'extra'

checkCharacter(user: Stroke[], ref: KanaRef, level: Level, mode: 'trace' | 'free'): {
  passed: boolean
  strokes: { ok: boolean; issue?: Issue; refIndex?: number }[]
  hints: Issue[]   // issues shown but not failing (Easy)
}
```

### Algorithm

1. **Normalize** (`mode: 'free'`, i.e. Copy/Test): translate the user's whole character so its bounding-box center matches the reference's, and scale uniformly by the ratio of the larger bounding-box dimensions. `mode: 'trace'` skips normalization.
2. **Resample** every stroke (user and reference) to 32 equidistant points.
3. **Count:** fewer strokes than expected → trailing reference strokes reported `missing`; more → extra user strokes reported `extra`.
4. **Per stroke i** (user i vs reference i):
   - *Shape:* mean point-to-point distance (forward order) ≤ level tolerance.
   - *Direction:* if forward distance fails but the reversed user stroke passes, issue = `direction`.
   - *Order:* if stroke i fails but matches reference j ≠ i within tolerance, issue = `order` (with `refIndex = j`).
   - Otherwise issue = `shape`.

### Levels

| | 🐣 Easy | 🙂 Normal | 🎓 Strict |
|---|---|---|---|
| Stroke count | must match (accepted variants allowed) | must match (accepted variants allowed) | must match KanjiVG |
| Order | hint only | fails | fails |
| Direction | hint only | fails | fails |
| Shape tolerance | loose | medium | tight |

Tolerances live in a single `TOLERANCE` config object, tuned against recorded fixtures (§7).

### Accepted stroke-count variants

Some kana are commonly handwritten with a different stroke count than a typeset reference (candidates: き, さ, そ, ふ, り — to be confirmed against the actual KanjiVG data). KanjiVG provides only one stroke set per character, so variants are handled **without** hand-authored alternate paths:

- `kana.json` stores, per character, `acceptedCounts: number[]` (the KanjiVG count plus any accepted variant counts).
- If the user's stroke count equals the KanjiVG count, normal per-stroke checking applies.
- If it equals an accepted variant count (Easy/Normal only), per-stroke order/direction checks are skipped; instead all user strokes and all reference strokes are each concatenated (in drawn order) and resampled to 128 points, then compared with the shape tolerance. Pass/fail is on that merged shape; feedback says "✅ Accepted variant".
- Strict mode accepts only the KanjiVG count.

### Feedback

- Correct strokes turn green; wrong strokes red with the correct reference stroke drawn dashed beneath.
- One short message per issue, icon + English, e.g. "↔️ Stroke 2 goes the other way", "🔢 This was stroke 3 — do stroke 2 first", "➕ One stroke missing".
- Out of scope: stroke endings (tome / hane / harai). Watch mode shows them visually.

## 5. Data pipeline

- The KanjiVG release is downloaded manually once (GitHub releases of `KanjiVG/kanjivg`); SVGs are named by zero-padded hex code point (e.g. `03042.svg` for あ).
- `npm run data:kana -- <path-to-svg-dir>` produces `data/kanjivg/kana.json`:

  ```json
  { "あ": { "strokes": ["M…", "M…", "M…"], "numbers": [[x,y], …], "acceptedCounts": [3] }, … }
  ```

- Expected stroke counts come from a hand-maintained table in the script, seeded from standard handwriting references. The script fails if any of the 92 characters is missing or if a KanjiVG count disagrees with the table; mismatches are resolved by hand before `kana.json` is committed.
- `kana.json` is committed; builds never need the network. Extending to voiced kana = extend the character list and table.

## 6. Error handling

| Situation | Behavior |
|---|---|
| `localStorage` unavailable or throws | In-memory progress; banner "Progress won't be saved on this device" |
| No Japanese voice | 🔊 hidden until a `ja` voice is confirmed (voices load async on Safari: re-check on `voiceschanged`); speech only starts from a user tap |
| `pointercancel` | Discard partial stroke |
| Stored data from older version | Storage is versioned per module; unknown/old shapes are migrated or that module's data is reset — never crashes |
| Missing/invalid stroke data | Caught by the data script at generation time, not at runtime |

## 7. Testing

- **Vitest (unit):**
  - `core/stroke`: resample, normalize, `checkCharacter` against recorded fixtures — correct strokes for several characters, plus wrong direction, wrong order, missing/extra stroke, sloppy-but-acceptable shapes per level, and accepted variants.
  - Data integrity: all 92 characters present; stroke counts match the table.
  - Storage: fallback when `localStorage` throws; version migration.
- **Playwright (smoke) on built `dist/index.html`, WebKit engine:** home renders; open あ; a synthesized correct trace passes; a reversed stroke is flagged as direction.
- **Manual iPad checklist:** finger trace, Apple Pencil with resting palm, rotation, Add to Home Screen, offline relaunch.

## 8. Deployment

- GitHub Pages serves `dist/`. Pushing to any GitHub account requires the user's explicit confirmation at that time (org policy for repos outside Mercari orgs).
- iPad: open the Pages URL in Safari → Share → Add to Home Screen. After first load, the service worker caches the app for offline use.
- Desktop: open `dist/index.html` directly, or use the Pages URL.

## 9. Credits and licensing

- Code: MIT (`LICENSE`).
- Stroke data: KanjiVG © Ulrich Apel, CC BY-SA 3.0 (`data/kanjivg/LICENSE`). Derived `kana.json` stays CC BY-SA 3.0.
- Attribution shown on the in-app About screen and in the README; both notices included in the built `index.html`.

## 10. Out of scope

- Voiced/semi-voiced and small kana; kanji.
- Grammar content and the grammar module implementation (separate spec).
- Loading new lesson files without a rebuild.
- Cross-device progress sync; accounts.
- Stroke-ending detection (tome / hane / harai).
- Strict locking of path lessons.
- UI languages other than English.
