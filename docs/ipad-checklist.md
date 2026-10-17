# iPad manual checklist

Run on a real iPad (Safari) against the hosted URL, or `npm run build && npm run serve` on the same Wi-Fi
(open `http://<mac-ip>:4173`; offline mode needs HTTPS, so skip steps 7 and 8 on LAN).

1. Home → Kana Writing → Hiragana → Path: only the あ row is open.
2. Watch あ: ◀ ▶ step through 3 strokes with numbers and arrows; 🔊 plays (if a Japanese voice is installed).
3. Trace with a finger: page does not scroll or zoom while drawing; each stroke is accepted or flashes red.
4. Trace with Apple Pencil while resting your palm on the screen: the palm draws nothing.
5. Settings → "Allow finger drawing again": finger drawing works again.
6. Rotate the iPad mid-lesson: the writing box resizes and the next stroke lands where you draw.
7. Share → Add to Home Screen; open it; turn on Airplane Mode; relaunch: the app still loads.
8. Update path: with the app installed, deploy a visible change twice (wait a minute between deploys), close the app,
   relaunch from the Home Screen icon (you may need to relaunch twice): the new build appears.
9. Copy/Test: write あ small in a corner → passes; write strokes out of order on Normal → order message.
   On Normal, write ぬ when asked for ね: it must fail. (れ written for わ still passes on Normal: a known limitation
   pinned in `src/modules/kana/confusion.test.ts`; note whether it bothers you.)
10. Tap ▶ or Check twice quickly: the page does not zoom.
11. Close and reopen: stars and unlocked rows are kept.
12. Note any stroke that feels unfairly rejected or accepted → tune `TOLERANCE` in `src/core/stroke/check.ts`.
