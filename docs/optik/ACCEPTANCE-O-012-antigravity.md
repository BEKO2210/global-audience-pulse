# Acceptance Critique: Global Audience Pulse (Task O-012)

**Evaluator:** Senior Product Designer  
**Scope:** Design System Acceptance Review across 3 Styles (`tafel`, `atlas`, `praezision`), Viewports (`360px`, `1440px`), and Themes (`dark`, `light`).  
**Baseline Reference:** [AUDIT-O-001.md](agy/AUDIT-O-001.md)

---

## 1. Verdict per Criterion

- **Hierarchy:** **Partial** – Primary audience scores and activity dials now lead decisively over timestamps, but action hierarchies falter in sections 09 and 10 where naked text links compete against bordered buttons.
- **Spacing rhythm:** **Partial** – The 4-px baseline grid holds on desktop, but irregular chip wrapping (3+2 and 2+3+2) and tight mobile multi-column splits disrupt rhythm on phone viewports.
- **Typography:** **Partial** – Unified type tokens eliminate micro-sizes and weight bloat, but mid-word ellipsis truncations ("Pun...", "Ges...", "Los Angel...") and punctuation letterspacing anomalies in Praezision degrade polish.
- **Colour discipline (one accent):** **Pass** – The interface strictly adheres to a single thematic accent (amber, signal red, or cobalt) paired with monochromatic ink ramps; rogue cyan links and rainbow sparklines are eliminated.
- **Consistency of controls:** **Partial** – Core buttons and segmented controls share unified token geometry, but naked text actions ("Ansehen") and divergent platform selectors between sections 10 and 11 break parity.
- **Dark mode:** **Pass** – Blinding pure-white card inversions and high-glare surfaces are eradicated, delivering deep, low-luminance paper surfaces with crisp WCAG AA-compliant hairline delineation.
- **Phone layout:** **Fail** – Pervasive viewport clearance failures cause the fixed bottom ticker to occlude primary CTAs and summary insights across multiple sections, while the 24h heatmap remains rigidly truncated at 18:00.
- **"Does not look AI-generated":** **Pass** – The removal of uppercase tracked eyebrows, middle-dot chains, generic cream/terracotta palettes, and decorative card clutter delivers an authentic, domain-tailored software aesthetic.

---

## 2. Remaining Findings (Ranked P0–P3)

### P0 – Looks Broken / Destroys Core Utility

#### 1. Sticky bottom ticker occluding primary CTAs and recommendation chips in Weekly on mobile

- **Screenshot File:** [360-tafel-dark-13-weekly.png](audit3/360-tafel-dark-13-weekly.png) (also visible in `360-tafel-light-13-weekly.png`, `360-atlas-light-13-weekly.png`, `360-praezision-dark-13-weekly.png`)
- **Concrete Element:** The recommendation footer block (`.weekly-recommendations` / "Beste Stunden der Woche") at the bottom of Section 13. Multi-line German copy pushes the header "Beste Stunden der Woche" into the viewport bottom, and the fixed bottom ticker bar (`.live-ticker`) completely covers the three tappable recommendation chips (`[ 20:00 ø 72 ]`, `[ 19:00 ø 71 ]`, `[ 18:00 ø 65 ]`).
- **Concrete Fix:** Add global bottom clearance cushion to mobile layout containers (`padding-bottom: calc(var(--bottom-bar-height, 64px) + 24px)`), and constrain mobile headline generation to a maximum of 2 lines (`line-clamp: 2` or concise copy templates).

#### 2. Bottom forecast summary insight sheared off and clipped on mobile

- **Screenshot File:** [360-atlas-light-02-map-forecast.png](audit3/360-atlas-light-02-map-forecast.png) (also visible in `360-praezision-dark-02-map-forecast.png`, `360-tafel-dark-02-map-forecast.png`)
- **Concrete Element:** The bottom callout bar and summary text in the "Das nächste Momentum" card (`| Höhepunkt der nächsten 24 Stunden: Score 74 um 21:15 (jetzt 47).`). Only a 2px sliver of the red accent pipe is visible; the text itself is completely clipped by container `overflow: hidden` and occluded by the fixed ticker bar.
- **Concrete Fix:** Remove fixed height constraints on `.forecast-card` / `.momentum-card` (`height: auto; min-height: fit-content; overflow: visible;`) and enforce a minimum 20px padding clearance below the summary text block.

#### 3. 24-Hour Heatmap matrix rigidly cropped at 18:00 on mobile without scroll affordance

- **Screenshot File:** [360-tafel-dark-05-heatmap.png](audit3/360-tafel-dark-05-heatmap.png) (also in `360-atlas-light-05-heatmap.png`, `360-praezision-dark-05-heatmap.png`)
- **Concrete Element:** The 24-hour activity grid in Section 05 (`.heatmap-grid` / `.matrix-container`). On 360px screens, the grid terminates abruptly at hour 18:00 (showing only 7 of 24 hourly columns), slicing off the remaining 17 hours with zero horizontal scrollbar or swipe affordance.
- **Concrete Fix:** Wrap the matrix table in an `overflow-x: auto; -webkit-overflow-scrolling: touch;` container with sticky city column headers (`position: sticky; left: 0; background: var(--paper); z-index: 2;`), and add a right-edge gradient fade mask (`mask-image: linear-gradient(to right, black 85%, transparent 100%)`) to indicate scrollable content.

---

### P1 – Severe Usability Issues, Control Fragmentation & Truncation Bugs

#### 4. Unstyled bare-text "Ansehen" action in Posting Plan table and mobile cards

- **Screenshot File:** [1440-tafel-dark-10-plan.png](audit3/1440-tafel-dark-10-plan.png) (also in `1440-atlas-light-10-plan.png`, `1440-praezision-dark-10-plan.png`, `360-tafel-dark-10-plan.png`)
- **Concrete Element:** The row action column in Section 10 (`.plan-table-action` / `.action-view`). The secondary action `Ansehen` renders as raw, unbordered, unstyled inline text floating loosely beside the `[ 📅 ]` icon button without click target padding or hover styling.
- **Concrete Fix:** Incorporate `Ansehen` into the unified control system: apply the shared quiet button role (`display: inline-flex; align-items: center; height: 36px; padding: 0 12px; border: 1px solid var(--rule-solid); border-radius: var(--radius-sm); font: var(--font-ui-sm);`) or make the entire row clickable with a trailing hairline arrow (`→`).

#### 5. Fragmented action row in "Wann poste ich für...?" with dangling plain text

- **Screenshot File:** [1440-tafel-dark-09-ask.png](audit3/1440-tafel-dark-09-ask.png) (and `360-tafel-dark-09-ask.png`)
- **Concrete Element:** The CTA action cluster inside Section 09 card. While `[ In Kalender ]` and `[ Erinnern ]` are enclosed in hairline buttons, `Ganze Woche planen` and `Ansehen` sit to their right as unstyled raw text strings. On mobile (`360-atlas-light-09-ask.png`), `Ansehen` is sliced in half along its baseline by the viewport bottom.
- **Concrete Fix:** Group actions into clear visual tiers: primary actions in buttons (`[ In Kalender ]`, `[ Erinnern ]`), and secondary navigation styled as an explicit hyperlink with hairline underline (`Ganze Woche planen →` with `text-decoration: underline; text-underline-offset: 3px;`). Delete the redundant dangling `Ansehen` string.

#### 6. Control pattern divergence between Platform Selectors in Plan vs. Playbooks

- **Screenshot File:** [1440-tafel-dark-10-plan.png](audit3/1440-tafel-dark-10-plan.png) vs. [1440-tafel-dark-11-playbooks.png](audit3/1440-tafel-dark-11-playbooks.png)
- **Concrete Element:** The platform filter controls ("Meine Plattformen" in Section 10 vs. "Was die Algorithmen belohnen" in Section 11). In Section 10, platforms are individual outline chips where all 7 items appear active simultaneously; in Section 11, the identical platform list uses a segmented control where only the single selected platform (Instagram) is highlighted.
- **Concrete Fix:** Standardize both sections on the segmented control pattern (`.segmented-control` / `.choice-group`) established in Section 11, providing clear visual differentiation between active and inactive states.

#### 7. Mid-word ellipsis text truncation in Hero automated analysis

- **Screenshot File:** [1440-tafel-dark-01-hero.png](audit3/1440-tafel-dark-01-hero.png) and [360-tafel-dark-01-hero.png](audit3/360-tafel-dark-01-hero.png)
- **Concrete Element:** The automated AI status line (`.hero-ai-ticker`): `"■ Berlin 28 % ruhiger als üblich · Aktueller Gesamtwert von 36 Pun..."` on desktop (truncating "Punkten" to "Pun..."), and `"Aktueller Ges..."` on 360px mobile.
- **Concrete Fix:** Replace single-line `white-space: nowrap; text-overflow: ellipsis;` with a responsive multi-line wrap (`white-space: normal; line-height: 1.35;`) or shorten deterministic fallback strings to fit within guaranteed container widths (e.g., `Berlin: -28% · Gesamt: 36 Pkt.`).

---

### P2 – Layout Crowding, Label Clipping & Orphaned Mobile Artifacts

#### 8. Orphaned unanchored status dot floating in mobile header

- **Screenshot File:** [360-tafel-dark-00-header.png](audit3/360-tafel-dark-00-header.png) (also in `360-atlas-light-00-header.png`, `360-praezision-dark-00-header.png`)
- **Concrete Element:** The solitary green/teal bullet (`●` / `.status-dot`) positioned between the logo text "Global Audience Pulse" and the `[ DE | EN ]` language switch on mobile.
- **Concrete Fix:** When hiding the timestamp label `"Messdaten vor 4 Std"` below 640px, hide the parent `.header-status` element completely (`display: none;`), or integrate the live status dot directly into the squircle app icon next to the globe.

#### 9. City label truncation "Los Angel..." in Praezision Desktop Report

- **Screenshot File:** [1440-praezision-dark-12-report.png](audit3/1440-praezision-dark-12-report.png)
- **Concrete Element:** The fourth city item in the regional breakdown ("Wer trägt den Wert"): the label for the US market truncates to `"Los Angel..."` next to the US flag due to a tight column width combined with the wider neo-grotesque font metrics.
- **Concrete Fix:** Expand the city name grid column `min-width` from `80px` to `96px` (`grid-template-columns: 20px minmax(96px, max-content) 1fr 24px;`), allowing standard city names up to 12 characters to render cleanly without ellipsis.

#### 10. Cramped 2-up card layout causing single-character wrapping in Methodik on mobile

- **Screenshot File:** [360-praezision-dark-15-method.png](audit3/360-praezision-dark-15-method.png) (and `360-tafel-dark-15-method.png`)
- **Concrete Element:** The "Gewichtung der Regionen" radio cards (`Werbewert` and `Reichweite`), which are forced into 2 side-by-side columns on 360px screens (~140px width each), resulting in `"Berlin führt mit 27"` with `"%"` wrapping alone onto a newline, and `"Mumbai führt mit"` with `"43 %"` wrapped awkwardly.
- **Concrete Fix:** Switch `.method-weights` to a single vertical column below 480px (`grid-template-columns: 1fr; gap: var(--space-3);`), allowing labels, percentages, and progress bars to display on a single line with generous touch area.

---

### P3 – Typographic and Alignment Micro-Polish

#### 11. Irregular staggered platform chip wrapping in Plan on mobile

- **Screenshot File:** [360-tafel-dark-10-plan.png](audit3/360-tafel-dark-10-plan.png) (and `360-atlas-light-10-plan.png`)
- **Concrete Element:** The "Meine Plattformen" chip group in Section 10 on 360px viewports, which wraps across 3 jagged rows (Row 1: 2 chips; Row 2: 3 chips with `X` squished into a tiny narrow box; Row 3: 2 chips).
- **Concrete Fix:** Convert the mobile platform selector into a single-line horizontal scroll container (`display: flex; flex-wrap: nowrap; overflow-x: auto; -webkit-overflow-scrolling: touch; gap: 8px;`) with uniform button padding (`padding: 0 12px; height: 36px; white-space: nowrap;`).

#### 12. Unnatural punctuation letterspacing in Praezision date formatting

- **Screenshot File:** [360-praezision-dark-08-planner.png](audit3/360-praezision-dark-08-planner.png) and [1440-praezision-dark-08-planner.png](audit3/1440-praezision-dark-08-planner.png)
- **Concrete Element:** The date header string in Section 08: `01   So. ,  11 . 10 . ,  20 : 30 MESZ`, where wide letterspacing is uniformly applied to punctuation, creating unnatural gaps before dots, commas, and colons.
- **Concrete Fix:** Apply `font-variant-numeric: tabular-nums;` strictly to numeric digits rather than the parent text block, and remove artificial spacing around punctuation in the date formatting template (`"So., 11.10., 20:30 MESZ"`).

---

## 3. Style Comparison & Recommendation

**Praezision** is the most premium style because its deep nocturnal canvas, restrained cobalt blue accent, and disciplined neo-grotesque typography achieve the surgical calibration and understated authority expected of an Apple- or Samsung-grade professional tool. In contrast, Tafel leans into nostalgic airport-terminal novelty with amber departures, while Atlas’s muted greenish map paper and signal red evoke printed editorial collateral rather than a responsive live instrument.
