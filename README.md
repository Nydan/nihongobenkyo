# Nihongo Benkyō

A web app for learning Japanese, starting with **writing hiragana and katakana stroke by stroke**. It works for children and adults, with a finger on a tablet, an Apple Pencil, or a mouse.

> Status: in design. See [`docs/superpowers/specs/2026-10-15-kana-writing-design.md`](docs/superpowers/specs/2026-10-15-kana-writing-design.md).

## Features (Kana Writing module)

- **Guided path** row by row (あ・か・さ…), plus a **grid** to jump to any character
- Four steps per character:
  1. 👀 **Watch**: stroke-by-stroke animation with order and direction
  2. ✍️ **Trace**: trace over the guide, with each stroke checked as you go
  3. 👁️ **Copy**: write it with the model shown beside the box
  4. 🎯 **Test**: write it from memory, then get it checked
- Checks stroke **count, order, direction and shape**, with 🐣 Easy / 🙂 Normal / 🎓 Strict levels
- 🔊 Pronunciation through the device's Japanese voice
- ⭐ Progress saved on the device; works offline

<!-- Screenshots: TODO once the UI exists -->

## Using the app

| Device | How |
|---|---|
| Computer | Open `dist/index.html` directly, or use the hosted URL |
| iPad / tablet | Open the hosted (GitHub Pages) URL in Safari → Share → **Add to Home Screen**. It works offline after the first visit. |

iPad can't run a local HTML file as an app, which is why it needs the hosted URL.

## Development

Requires Node.js.

```sh
npm install
npm run dev                          # local dev server
npm test                             # unit tests (Vitest)
npm run build                        # → dist/index.html (self-contained) + offline files
npm run data:kana -- <kanjivg-svgs>  # regenerate data/kanjivg/kana.json
```

## Project layout

```
src/shell/        home, navigation, settings, About
src/core/         module registry, router, storage, speech, stroke checking
src/modules/kana/ Kana Writing module
data/kanjivg/     stroke data (CC BY-SA 3.0)
content/          Markdown lessons for future modules (e.g. grammar)
scripts/          data generation
docs/             design specs
```

## Extending

- **Add a module:** create `src/modules/<id>/` exporting a `LearningModule` (`id`, `title`, `icon`, `routes`, `progressKey`) and register it in `src/main.tsx`. It appears as a tile on the home screen.
- **Add a grammar lesson** (once the grammar module exists): add a Markdown file to `content/grammar/` with `title`, `level` and `order` frontmatter, then rebuild.

## License and credits

- **Code:** MIT.
- **Stroke data:** derived from [KanjiVG](https://kanjivg.tagaini.net/) © Ulrich Apel, licensed under [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/). The derived data in `data/kanjivg/` is distributed under the same license.
