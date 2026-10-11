# Working on Global Audience Pulse

Read this before changing anything (Codex, Cursor, Antigravity/Gemini, Claude).

- **The test cage is the contract.** Before you hand in, run `npm run build && npm run cage`. It must pass. If a
  rule blocks you, fix your change – do not edit the cage. See `e2e/cage/README.md` for the rules.
- Also required: `npx tsc -b`, `npm run lint` (0 errors), `npx prettier --check .`, `npm test`.
- Design tokens live in `src/styles.css` (`--text-*`, `--weight-*`, `--space-*`, colours per `[data-style]` ×
  `[data-theme]`). Use them; no raw px font sizes, no raw hex, no fluid `vw` type.
- Colour grammar: regions never wear the accent; the accent means the best time / peak moment; live/measured use
  `--live`.
- Every user-facing string exists in German and English (`const DE = {…}; const EN: typeof DE = {…}`).
