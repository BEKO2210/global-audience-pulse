# Test cage

The cage locks the design in. Every change – by a person or an agent – has to pass it; a failure names the element
and the rule it broke. **Fix the element, never loosen the cage.** An exception needs a written reason in the rule.

Run it: `npm run build && npm run cage` (source rules + runtime cage, ~1 min).

## Runtime cage (Playwright, `e2e/cage/*.spec.ts`)

Measured on the rendered page (`probe.ts`) in **all 4 styles × light/dark**, on the phone (390 px) and desktop
(1440 px) projects, with the live report, a region detail, the appearance menu and the map detail sheet open:

| Rule                             | What it means                                                                                                                                                                             |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Type scale                       | Every visible text is 12 / 14 / 16 / 20 / 24 / 32 / 40 / 56 px (SVG text measured on screen). Display numbers (hero, detail sheet) only 88 / 120 px.                                      |
| Weights                          | 400 / 500 / 600 only.                                                                                                                                                                     |
| No text under 12 px, no all-caps |                                                                                                                                                                                           |
| Spacing grid                     | Padding and gaps are multiples of 4 px (hairlines up to 2 px).                                                                                                                            |
| No sideways scroll               | The page never scrolls horizontally.                                                                                                                                                      |
| Colour grammar                   | A region (pin, label, bar, segment, card, sparkline, detail facts) never wears the accent. The accent means _the best time / peak moment_; UI state (switch, focus, scrubber) may use it. |
| One-line captions                | Chart captions never wrap (a wrap shifts everything below on a phone).                                                                                                                    |
| Widths                           | The type, spacing and overflow rules again at 360 … 1920 px – fluid `vw` values land between the steps.                                                                                   |
| Accessibility                    | axe WCAG 2.2 AA: 0 serious/critical in every style × theme.                                                                                                                               |
| Language                         | The English page carries no German.                                                                                                                                                       |

## Source cage (Vitest, `scripts/design-cage.test.ts`)

No `vw` inside `clamp()`, font sizes only from `--text-*`, weights 400–600, no `uppercase`, spacing literals on the
4 px grid, no raw hex outside the token blocks in `styles.css`, and region components never reference `--accent` /
`--link`.

Related guards elsewhere: the mobile bar never shifts (`e2e/layout.spec.ts`), region detail opens as a full bento
row (`e2e/features.spec.ts`).
