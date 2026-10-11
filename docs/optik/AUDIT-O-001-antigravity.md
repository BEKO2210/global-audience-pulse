# Visual Critique: Global Audience Pulse

**Design System Audit: "diagram-design"**  
_Evaluator: Senior Product Design (Apple / Samsung level)_  
_Target File: `AUDIT-O-001.md`_  
_Scope: 85 screenshots across desktop (1440px) and mobile (360px), light and dark themes, German (de) and English (en)._

---

## Executive Critique

The "diagram-design" system establishes an intentional premise: warm tactile paper, a restrained single-ink value scale, hairline precision rules, monospaced tabular data, serif editorial display headlines, and a solitary orange accent reserved strictly for the single most critical signal.

In execution, however, the interface frequently breaks its own rules. Across the 17 sections, the system suffers from **severe palette contamination** (uncontrolled multi-color sparklines, rainbow city bars, and rogue cyan hyperlinks), **broken dark-mode adaptations** (blinding pure-white cards that invert unpredictably against black paper), **glaring mobile rendering bugs** (duplicated characters, clipped insight callouts, and overlapping cartographic labels), **unlocalized German text leaking into English views**, and **chaotic interactive component fragmentation** (outline chips, segmented pills, solid orange buttons, and repetitive double-action rows competing without hierarchy).

Below is the definitive visual critique, ranking the top 15 issues from critical layout breaks (P0) to systemic polish (P3), followed by per-section notes and five signature design transformations.

---

## Top 15 Findings (Ranked P0 → P3)

### P0 – Looks Broken / Unprofessional

#### 1. Heatmap "Now" Badge Character Duplication & Mobile Matrix Truncation

- **Section**: `05-heatmap`
- **Screenshot File Names**: `1440-light-de-05-heatmap.png`, `1440-dark-de-05-heatmap.png`, `360-light-de-05-heatmap.png`, `360-light-en-05-heatmap.png`, `360-dark-de-05-heatmap.png`
- **What is wrong**: The floating current-time pill positioned above the first column renders duplicated trailing characters: in German it displays as `[jetzt]zt` (the word "jetzt" inside the black/white capsule with "zt" rendered directly outside on the right), and in English as `[now]ow` ("now" in the capsule, "ow" rendered outside). Furthermore, on mobile (`360px`), the 24-hour grid is rigidly cropped on the right edge at hour 17:00; hours 18:00 through 04:00 are completely truncated with zero scroll affordance or responsive compression.
- **Why it hurts**: Immediate loss of software credibility. Text rendering glitches look like broken string concatenation or misaligned pseudo-elements. Cropping half the 24-hour matrix on mobile destroys the primary value proposition of the widget: seeing global 24-hour overlap.
- **Concrete fix**:
  1. Fix the pill DOM: wrap the time tag in a single atomic container: `display: inline-flex; align-items: center; justify-content: center; height: 18px; padding: 0 6px; font-size: 11px; font-family: var(--font-mono); white-space: nowrap; overflow: visible;`. Eliminate whatever rogue `::after` or duplicated text node is printing the redundant suffix.
  2. For mobile (360px), remove fixed `24px` column widths. Implement an adaptive SVG matrix with fluid column widths (`width: calc(100% / 24)`) or wrap the grid in a scroll container with `overflow-x: auto; -webkit-overflow-scrolling: touch;` and a sticky city label column (`position: sticky; left: 0; background: var(--bg-paper); z-index: 2;`).

---

#### 2. Cartographic Pin Collisions, Heavy Text Halos & Bottom Card Clipping in Map & Forecast

- **Section**: `02-map-forecast`
- **Screenshot File Names**: `360-light-de-02-map-forecast.png`, `360-light-en-02-map-forecast.png`, `360-dark-de-02-map-forecast.png`
- **What is wrong**: On mobile viewports, the map pins and city labels collide aggressively: "London" and "Berlin" collide into an unreadable mass of text, "New York" floats into the Atlantic Ocean overlapping transit arches, and "Dubai" / "Mumbai" are crammed together. The text uses an aggressive, heavy white/black text-stroke/halo that obscures the underlying map silhouette. In the adjacent 24-hour forecast card, the bottom summary sentence (`"Höhepunkt der nächsten 24 Stunden: Score 73 um 21:00 (jetzt 38)"`) is completely sheared off and clipped by the card’s fixed-height bottom boundary.
- **Why it hurts**: Map pins that overlap text fail basic cartographic readability. A predictive analytics card that silently truncates its punchline due to rigid container heights feels neglected and broken.
- **Concrete fix**:
  1. For mobile viewports (<640px), replace full city labels on the map with 5px circular markers with 2-letter airport/city codes (`BER`, `LON`, `NYC`, `TYO`) positioned with collision offsets, or use an interactive tap-to-focus state. Strip the heavy `text-stroke` halo in favor of a subtle 1px semi-transparent backdrop pill (`background: rgba(var(--bg-paper), 0.85); padding: 1px 4px; font-size: 9px;`).
  2. Remove fixed CSS `height` or `overflow: hidden` on the 24-hour forecast card: set `height: auto; min-height: min-content; padding-bottom: 20px;` so the orange callout bar and summary text render with guaranteed 16px bottom clearance.

---

#### 3. Unlocalized Strings & Raw German Content Leaking into English Views

- **Section**: `01-hero`, `09-ask`, `12-report`
- **Screenshot File Names**: `360-light-en-01-hero.png`, `360-light-en-09-ask.png`, `360-light-en-12-report.png`
- **What is wrong**: When the interface language is switched to English (`EN`), raw German text continues to display across critical data cards:
  - In `01-hero`: The red/orange AI alert line reads: `"■ Berlin 28% quieter than usual · Aktueller Ges..."` (mixing English with truncated German `"Aktueller Gesamtwert"`).
  - In `09-ask`: The AI briefing block reads: `Briefing (AI): “Später posten zwischen 20:00 und 21:30 Uhr”` in German.
  - In `12-report`: The primary display headline is `"Aktueller Gesamtwert von 36 Punkten in der Ruhephase"`, the subtitle is `"Später posten. Bestes Fenster liegt..."`, and all audience cards state `"Später posten zwischen..."` accompanied by a disclaimer: `"The AI briefing is written in German for now."`
- **Why it hurts**: Bilingual users expect complete localized experiences. Shipping an English UI that presents German headlines, German AI verdicts, and mixed sentences destroys international utility and signals an unready product.
- **Concrete fix**:
  1. Pass the active locale (`de` vs `en`) into the inference pipeline prompt so the LLM outputs native English copy (`"Current overall score: 36 (Rest phase)"`, `"Post later: optimal window between 20:00 and 21:30"`).
  2. Ensure all deterministic string templates have robust dictionary fallbacks: `"Aktueller Gesamtwert von {x} Punkten"` → `"Current overall score: {x} points"`.
  3. Never ship disclaimer text admitting the model only writes German; fallback to translated template strings until the English pipeline is live.

---

#### 4. Orphaned Status Dot Floating in Mobile Header

- **Section**: `00-header`
- **Screenshot File Names**: `360-light-de-00-header.png`, `360-light-en-00-header.png`, `360-dark-de-00-header.png`
- **What is wrong**: On mobile viewports (`360px`), a single teal bullet dot (`●`) sits completely isolated in the blank space between the logo text `"Global Audience Pulse"` and the language selector `[DE | EN]`. While the accompanying label `"MESSDATEN VOR 2 STD"` and the digital clock were hidden on small screens via media queries, the status indicator bullet was left visible without an anchor or label.
- **Why it hurts**: An unlabelled floating dot triggers immediate confusion—users wonder whether it is an unread notification, a recording indicator, an error state, or a dead pixel. It degrades the top navigation bar, which should be the cleanest element on the page.
- **Concrete fix**: Encapsulate the status dot and text inside a single parent container (`.header-status-badge`) and apply `display: none;` below `640px`. If a live status indicator is desired on mobile, nest a 4px green dot directly inside the logo lockup to the right of "Pulse" with an explicit tooltip and `aria-label="Live data connected"`.

---

#### 5. German Headline Text Expansion Slicing Primary CTAs into Sticky Footer

- **Section**: `13-weekly`
- **Screenshot File Names**: `360-light-de-13-weekly.png` (compared with `360-light-en-13-weekly.png`)
- **What is wrong**: In the German mobile view, the long headline (`"Die Woche 41 zeigte stabile Werte mit einem hohen Niveau am Dienstag"`) wraps across 4 lines. Combined with verbose body copy, it pushes the bottom section content downward so that the primary recommendation chips (`Beste Stunden der Woche`: `[20:00 ø 72]`, `[19:00 ø 71]`, `[18:00 ø 65]`) are sliced in half and obscured beneath the fixed bottom ticker bar. In English (`360-light-en-13-weekly.png`), the 3-line headline allows the chips to remain fully visible.
- **Why it hurts**: Tappable recommendation chips that are cut in half cannot be interacted with, breaking user flow and violating mobile touch accessibility.
- **Concrete fix**:
  1. Add a global bottom padding cushion to the main layout (`padding-bottom: 96px`) to guarantee clearance above the fixed bottom ticker across all viewports.
  2. On mobile, scale display headlines down from `28px` to `21px / line-height: 1.25` and enforce concise German AI copy generation (maximum 2 lines, e.g. `"Woche 41: Stabiles Niveau, Peak am Dienstag"`).

---

### P1 – Severe Usability Issues, Contrast Failures & System Violations

#### 6. Inverted Pure-White Flashcard Containers Blinding Users in Dark Mode

- **Section**: `15-method`, `11-playbooks`, `14-pipeline`
- **Screenshot File Names**: `1440-dark-de-15-method.png`, `1440-dark-de-11-playbooks.png`, `1440-dark-de-14-pipeline.png`
- **What is wrong**: In dark mode, several active state containers invert into harsh, solid `#FFFFFF` backgrounds with solid black text:
  - In `15-method`: The selected `Werbewert` radio card turns into a solid pure white box, while `Reichweite` next to it remains dark.
  - In `11-playbooks`: The active `Instagram` tab button renders as a solid `#FFFFFF` block with black text.
  - In `14-pipeline`: The `Schreiber` segment of stacked bar charts becomes pure white.
- **Why it hurts**: In a dark theme supposed to evoke warm paper at night, dropping solid `#FFFFFF` rectangular flashlights completely destroys eye dark-adaptation, induces glare, and looks like an unstyled browser default CSS rule (`background: white; color: black;`).
- **Concrete fix**: Prohibit `#FFFFFF` backgrounds in dark mode entirely. Active cards and selected tabs should use elevated warm charcoal tones (`#242220` or `#2a2825`) with a 1px warm hairline border (`#4a463f`) or subtle orange hairline border (`#d96b27`), with primary text rendered in warm cream `#edeae4`. Stacked bars should use muted ivory (`#b8b2a7`) or secondary ink (`#7c776e`).

---

#### 7. Rainbow Palette Explosion & Orange Toggle Saturation in Regions

- **Section**: `07-regions`
- **Screenshot File Names**: `1440-light-de-07-regions.png`, `1440-dark-de-07-regions.png`, `360-light-de-07-regions.png`
- **What is wrong**:
  1. Each of the 8 regional cards features a sparkline rendered in a completely different arbitrary hue: coral red, mustard gold, dark teal, slate blue, magenta, khaki olive, lavender, seafoam green. This directly violates the "one ink ramp, one orange accent only" design mandate.
  2. Every single card features an active iOS-style toggle switch in bright orange, creating 8 competing orange focal points that completely deafen the user's eye.
  3. The primary display element in each card is a massive display serif digital clock with running seconds (`01:47:48`), while the actual audience score (`18 /100`) is relegated to tiny, illegible secondary text.
- **Why it hurts**: Arbitrary rainbow hues degrade an editorial data tool into an uncoordinated children's dashboard. When 8 toggles are permanently bright orange, the accent loses all meaning. Prioritizing running seconds over audience scores inverts the functional hierarchy of an audience planner.
- **Concrete fix**:
  1. Render all 8 sparklines in neutral hairline ink (`1px stroke: var(--ink-secondary)`). Only apply the orange accent line to the single top-ranked region (Tokyo, score 80).
  2. Replace heavy skeuomorphic orange iOS switches with understated hairline checkboxes or monospaced text indicators (`[AKTIV]` / `[AUS]`) in neutral ink.
  3. Swap the visual hierarchy: make the audience score (`80 / 100`) the primary bold monospaced hero figure (24px mono bold), and downscale the local time to a secondary mono metadata label (`17:47 MESZ`, 12px mono regular).

---

#### 8. Asymmetric 40% Empty Void in Report Layout

- **Section**: `12-report`
- **Screenshot File Names**: `1440-light-de-12-report.png`, `1440-dark-de-12-report.png`
- **What is wrong**: On desktop (1440px), the section is split into two asymmetrical columns. The left column terminates after line 4 (`Ganze Analyse lesen`), leaving an enormous empty beige canyon (~1200px tall) with zero content. Meanwhile, the right column is severely over-crammed, vertically stacking a 9-color stacked bar, 8 individual city bars, a trend line chart, a Wikipedia signal table, and a 2x2 grid of audience cards.
- **Why it hurts**: Extreme compositional imbalance. The left side feels like a broken layout where content failed to load, while the right side subjects the user to excessive vertical scroll and cognitive overload.
- **Concrete fix**: Convert the section into an editorial 12-column Swiss grid:
  - Place the executive summary, current score (36), 3-hour trend graph, and key takeaway in a persistent left-hand card (5 columns, sticky).
  - Place the granular regional breakdowns, Wikipedia live-signal delta table, and audience cards in the right container (7 columns).
  - This eliminates the dead-space void and aligns the visual weight perfectly.

---

#### 9. Mid-Word Ellipsis Truncation in Hero Headline & Insights

- **Section**: `01-hero`
- **Screenshot File Names**: `1440-light-de-01-hero.png`, `1440-dark-de-01-hero.png`, `360-light-de-01-hero.png`
- **What is wrong**: In the desktop hero, the primary automated AI analysis line is truncated mid-word with an ellipsis: `"■ Berlin 28 % ruhiger als üblich · Aktueller Gesamtwert von 36 Punk..."` (cutting off "Punkten"). On mobile (`360px`), the truncation is even worse: `"Aktueller Ges..."`, while the left-side summary cuts off mid-word at `"und São..."`.
- **Why it hurts**: The hero is the user's primary anchor. Truncating words mid-syllable (`Punk...`, `Ges...`, `São...`) looks careless and unfinished, revealing rigid CSS `text-overflow: ellipsis; white-space: nowrap;` rules applied without testing variable string lengths.
- **Concrete fix**: Never truncate structured data strings with ellipses. Allow text to wrap naturally across two lines with `white-space: normal; line-height: 1.35;`. Alternatively, craft concise adaptive templates: `"Berlin: -28% vs. Schnitt · Gesamt: 36 Pkt."`. On mobile, break the city list cleanly beneath the status badge.

---

#### 10. Multi-Color Palette Chaos & Asymmetric Chip Clutter in 24h Dial

- **Section**: `06-dial`
- **Screenshot File Names**: `1440-light-de-06-dial.png`, `360-light-de-06-dial.png`, `1440-dark-de-06-dial.png`, `360-dark-de-06-dial.png`
- **What is wrong**:
  1. The concentric activity wheel introduces 5 competing color families (mustard brown for active day, slate purple for late evening, teal for morning, orange for primetime, and dark grey for night).
  2. Below the dial, the 8 numbered market chips wrap into irregular, asymmetric clusters: 5 chips on row 1 and 3 chips on row 2 on desktop; 3 / 3 / 2 on mobile.
  3. The instructional text `"Außen Los Angeles, innen Tokio"` sits as a floating, disconnected caption.
- **Why it hurts**: Clashes directly with the quiet, authoritative diagram aesthetic. Concentric rainbow arcs cause visual vibration. The ragged 5/3 and 3/3/2 chip layout leaves unsightly dead space.
- **Concrete fix**:
  1. Harmonize the dial segments into a monochromatic ink ramp: Nachtruhe = transparent hairline ring; Aktiver Tag = 20% ink tint; Morgen/Spätabend = 45% ink tint; Primetime = solitary orange accent (`#d96b27`).
  2. Structure the 8 market chips into a strict 4x2 grid on desktop (`display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;`) and an equal-width 2x4 grid on mobile, ensuring uniform widths and baselines.
  3. Integrate the radial index (`1` to `8`) directly into the dial ring headers rather than requiring a disconnected explanatory sentence.

---

### P2 – Structural Inconsistencies, Button Chaos & Component Fragmentation

#### 11. Scrambled Alignment & Floating Elements in 7-Day Planner

- **Section**: `08-planner`
- **Screenshot File Names**: `360-light-de-08-planner.png`, `1440-light-de-08-planner.png`
- **What is wrong**: On mobile, the date header `"So., 11.10., 20:00 MESZ"` is horizontally centered, while its subtext `"bis 21:30 · Score 72"` floats right-of-center, the market detail list is left-aligned, and a giant square download button `[ ⤓ ]` sits isolated on the right. On desktop, the row spans 1440px with a massive horizontal void separating the left market list from the far-right date and download button. Additionally, the primary button `[ Plan kopieren ]` is solid orange, making it the only solid filled button on the entire page.
- **Why it hurts**: Scrambled alignments (centered header, left-aligned body, right-floating square button) create an awkward, amateur layout. Using a solid orange button here while buttons in the Hero, Map, and Playbooks are hairline outlines creates interactive inconsistency.
- **Concrete fix**:
  1. Align all elements to a strict left edge on mobile:
     - Top line: `So., 11.10., 20:00 MESZ` (15px bold mono, left-aligned).
     - Second line: `bis 21:30 · Score 72` (13px mono, secondary ink).
     - Third line: Market breakdown list (12px regular).
     - Bottom line: Action row with `[ Plan kopieren ]` and `[ Link teilen ]` side-by-side with equal heights (36px).
  2. Standardize button styles: use hairline borders with transparent backgrounds across the entire page; reserve solid orange fills strictly for the single global primary CTA.

---

#### 12. Component Schizophrenia: Platform Selectors & Repetitive Action Buttons in Plan vs. Playbooks

- **Section**: `10-plan` vs `11-playbooks`
- **Screenshot File Names**: `1440-light-de-10-plan.png`, `1440-light-de-11-playbooks.png`, `360-light-de-10-plan.png`
- **What is wrong**:
  1. In Section 10 (`Plan`), the 7 platform filters are styled as tan-filled chips with orange borders (all 7 appear active simultaneously). In Section 11 (`Playbooks`), the identical 7 platforms are styled as a segmented pill bar with stark black-and-white buttons.
  2. In Section 10's table, every single row repeats identical outline buttons: `[ 📅 ]` and `[ Ansehen → ]` across all 6 rows, generating 12 repetitive, distracting buttons.
  3. The scores in Section 10 are rendered in massive red-orange serif italics (`63`, `71`, `75`), conflicting with the monospaced tabular numerals used everywhere else.
- **Why it hurts**: Interactive components that change appearance between adjacent sections confuse users. Repeating two buttons per row on 6 rows creates button fatigue. Using serif italics for tabular numeric scores destroys numeric scannability.
- **Concrete fix**:
  1. Consolidate into a single platform selector design pattern across both sections (e.g. an understated hairline segmented control with 1px border and neutral ink active state).
  2. Remove the double buttons per row in Section 10: make the entire row clickable with a subtle hover tint, terminating in a single understated trailing arrow (`→`).
  3. Format all scores in monospaced tabular numerals (`font-family: var(--font-mono); font-weight: 600; font-variant-numeric: tabular-nums;`).

---

#### 13. Triple Orange Accent Dilution in Scenario Presets

- **Section**: `04-presets`
- **Screenshot File Names**: `1440-light-de-04-presets.png`, `360-light-de-04-presets.png`
- **What is wrong**: In `04-presets`, all three strategic cards render their score in bright orange simultaneously: `"Score 82"`, `"Score 88"`, and `"Score 71"`.
- **Why it hurts**: Violates the core design system principle: "one orange accent only for the most important thing". When all three cards scream with identical orange scores, visual hierarchy collapses; the user cannot tell which scenario is recommended.
- **Concrete fix**: Apply the orange accent strictly to the single highest-scoring scenario (`Score 88` in USA coast-to-coast). Render the other two scores in neutral secondary mono ink (`#54514b` in light, `#9c968d` in dark). Add a subtle `[ EMPFOHLEN ]` mono hairline badge to the winning card.

---

#### 14. Rogue Electric Cyan Link Color Contaminating the Editorial Ink Palette

- **Section**: `11-playbooks`, `12-report`, `15-method`, `16-footer`
- **Screenshot File Names**: `1440-light-de-11-playbooks.png`, `1440-light-de-12-report.png`, `1440-light-de-15-method.png`, `1440-light-de-16-footer.png`
- **What is wrong**: Across sections 11, 12, 15, and 16, hyperlinks (`Ganze Analyse lesen`, `Instagram Ranking Explained`, `Weltbank · Bevölkerung`, `Impressum`, `Datenschutz`, `GitHub-Repository`) are rendered in saturated electric cyan/teal (`#008080` / `#007a78`).
- **Why it hurts**: The design system explicitly defines a warm paper background, one ink ramp, and one orange accent. Default browser cyan links break the editorial dignity of the diagram aesthetic and introduce an unauthorized second chromatic accent.
- **Concrete fix**: Re-color all text links into the primary ink ramp: use `#1c1a17` in light mode and `#edeae4` in dark mode, paired with an elegant 1px hairline underline (`text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 3px; text-decoration-color: rgba(var(--ink-primary), 0.3);`). Allow links to transition to warm orange (`#d96b27`) only upon user hover/focus.

---

### P3 – Fine Typographic Polish, Hairline Borders & Dark Mode Contrast

#### 15. Sub-Threshold Contrast Ratios & Muddy Greys in Dark Mode Metadata

- **Section**: `00-header`, `01-hero`, `07-regions`, `08-planner`, `16-footer`
- **Screenshot File Names**: `1440-dark-de-01-hero.png`, `1440-dark-de-07-regions.png`, `1440-dark-de-08-planner.png`, `1440-dark-de-16-footer.png`
- **What is wrong**: In dark mode, metadata labels, eyebrows, timestamps, and card hairline borders use deep muddy greys (`#4a4844`, `#5a5752`) against a `#141413` background. Contrast ratios drop as low as 2.1:1 to 2.8:1 for text such as `AKTUELLES PUBLIKUMSRADAR`, `Statistisches Basismodell`, `Score 72 · +34 Pkt. Potenzial`, and footer legal copy.
- **Why it hurts**: Fails WCAG 2.1 AA accessibility standards (minimum 4.5:1 for normal text). In real-world lighting conditions, users must strain to read timestamps and labels, making the dark mode feel unpolished and muddy.
- **Concrete fix**: Recalibrate dark mode ink tokens:
  - `ink-primary`: `#f3efe6` (contrast ~13.5:1)
  - `ink-secondary`: `#b5b0a4` (contrast ~7.2:1)
  - `ink-tertiary` (eyebrows/meta): `#8c877d` (contrast 4.6:1, strictly meeting WCAG AA)
  - Card borders: use a crisp 1px hairline rule in `#2c2a26` without muddy grey box-shadows.

---

## Per-Section Audit Notes (Sections 00 – 16)

### `00-header`

1. **Desktop spacing lockup**: The right-hand cluster (live status, clock, language switch, theme switch) lacks unified spacing rhythm; the segmented controls feel jammed against the right viewport edge while the logo on the left has generous margin.
2. **Dark-mode logo clipping**: The black squircle app icon loses its background contrast in dark mode, appearing as a floating, borderless circular wireframe globe.
3. **Mobile orphan dot**: The orphaned green bullet floating beside the title on mobile looks like a rendering artifact and must be removed.

### `01-hero`

1. **Competing focal anchors**: The giant serif italic `38/100` score and the orange boxed `20:00-21:30` time window fight for visual dominance; the eye bounces between them instead of finding an immediate entry point.
2. **Display typography tracking**: The condensed serif display headline (`Jetzt posten oder warten?`) is tracked too tightly, causing character collision on high-density displays.
3. **Ellipsis clipping**: The primary AI analysis ticker is truncated mid-word (`Punk...` on desktop, `Ges...` on mobile), looking unfinished.

### `02-map-forecast`

1. **Cartographic label collisions**: Mobile map pins for London, Berlin, and New York overlap completely; heavy text stroke halos obscure map geometry.
2. **Forecast visual density**: The line chart attempts to highlight the orange trajectory, three shaded time columns (`Nr. 1, 2, 3`), a dotted current-time bar, and an orange checkbox simultaneously, creating visual cacophony.
3. **Card bottom overflow**: The bottom summary insight is cropped by the container's bottom border on mobile viewports.

### `03-insight`

1. **Asymmetrical desktop balance**: The two-column hairline layout leaves dead horizontal space on the right side of desktop screens; it needs clear alignment with the grid above.
2. **Typographic parity between disparate data**: A live countdown (`In 12 Min beginnt...`) and a static scheduled window (`01:30 MESZ · Score 56`) share identical typographic weight and scale without functional distinction.

### `04-presets`

1. **Accent inflation**: All three cards feature orange scores (`Score 82`, `Score 88`, `Score 71`), forfeiting the ability to guide the user to the best strategic window.
2. **Footer scannability**: The dense list of cities and local times in the card footer (`New York 14:00 · Aktiver Tag · London 19:00...`) reads as an unbroken text blob; it should be structured as clean micro-badges or a tabular list.

### `05-heatmap`

1. **Critical string duplication bug**: The "Now" indicator pill duplicates trailing letters (`[jetzt]zt` / `[now]ow`) across all themes and viewports.
2. **Mobile viewport truncation**: Hours 18:00 through 04:00 are sliced off at the right screen edge on mobile with no scroll affordance.
3. **Muddy dark-mode contrast**: Low-activity cells in dark mode turn into indistinguishable dark-brown sludge against the black background.

### `06-dial`

1. **Palette contamination**: Introduces five arbitrary colors (mustard yellow, slate purple, teal green, orange, grey) that completely violate the single-orange diagram design system.
2. **Irregular chip wrapping**: The 8 numbered market buttons wrap into asymmetrical clusters (5/3 on desktop, 3/3/2 on mobile), creating uneven margins and messy whitespace.
3. **Superfluous instructional copy**: The caption `"Außen Los Angeles, innen Tokio"` is an awkward patch for a graphic that should be self-explanatory through concentric radial numbering.

### `07-regions`

1. **Rainbow sparklines**: 8 cards display sparklines in 8 distinct pastel/neon hues, destroying visual unity.
2. **Orange toggle overload**: 8 permanent bright orange iOS toggles create extreme chromatic noise.
3. **Inverted typographic hierarchy**: Display serif digital clocks with running seconds (`01:47:48`) dominate each card, while the actionable audience score (`18 /100`) is hidden in tiny secondary text.

### `08-planner`

1. **Mobile alignment fracture**: Centered date header (`So., 11.10., 20:00 MESZ`) sits awkwardly over left-aligned body text beside a floating square download button.
2. **Desktop white space void**: A massive horizontal empty gap separates the left-aligned market list from the far-right date and download button.
3. **Button style mismatch**: The solid orange `[ Plan kopieren ]` button is the only filled button on the entire page, clashing with the outlined buttons used elsewhere.

### `09-ask`

1. **Ragged tab wrapping**: The 5 audience tabs wrap into an uneven 3+2 layout on mobile with mismatched button widths.
2. **Disorganized country indicators**: The 8 country flag tags wrap into 5 jagged lines with inconsistent spacing.
3. **Button clipping**: The third CTA button (`Ansehen →`) wraps to a second row on mobile and is clipped by the bottom bar.

### `10-plan`

1. **Platform chip confusion**: All 7 platform filter pills are filled with tan/orange with orange borders simultaneously, giving no visual clue as to which platform is selected.
2. **Inappropriate score typography**: Scores are displayed in massive red-orange serif italics (`63`, `71`, `75`), conflicting with the monospaced tabular numerals used elsewhere.
3. **Repetitive button fatigue**: Every single table row repeats identical `[ 📅 ]` and `[ Ansehen → ]` outline buttons, cluttering the table.

### `11-playbooks`

1. **Platform selector inconsistency**: Completely diverges from Section 10's platform filters, using segmented black/white pill tabs instead of orange chips.
2. **Dark-mode flashlight**: The active `Instagram` tab turns into a stark, blinding `#FFFFFF` box in dark mode.
3. **Cyan footnote links**: Link colors throughout the footnotes use saturated cyan rather than the disciplined ink ramp.

### `12-report`

1. **Desktop column imbalance**: Leaves a massive 40% blank beige void on the left below line 4 while severely overcrowding the right column.
2. **Rainbow bar charts**: The top distribution bar and individual city bars introduce 8 new arbitrary pastel colors.
3. **Cramped mobile 2x2 grid**: Audience cards are forced into a narrow 2x2 grid on mobile, causing German copy (`Später posten zwischen 19:45 und 21:15 Uhr`) to wrap into 3-4 awkward lines.

### `13-weekly`

1. **Conflicting peak indicators**: Both Tuesday (75) and Friday (75) bars are rendered in bright orange, even though the text explicitly designates Tuesday as the single peak.
2. **German text expansion overflow**: 4-line German headlines push the bottom hour recommendation chips behind the sticky footer bar.

### `14-pipeline`

1. **Internal telemetry leakage**: Exposes a raw developer debugging dashboard (qwen/gemma runtimes, GPU retry stations, raw execution logs) directly on an end-user audience tool.
2. **White stacked bars in dark mode**: Stacked bar segments for `Schreiber` invert to solid pure white, blinding the user.
3. **Legend complexity**: Introduces 6 distinct status colors and cross-hatching, creating visual clutter.

### `15-method`

1. **Blinding inverted radio card**: In dark mode, the active `Werbewert` card turns into a solid pure white box with black text.
2. **Hyperlink styling**: Saturated cyan links with standard browser underlines clash with the warm paper and ink aesthetic.
3. **Left-side negative space canyon**: The left column contains only a 2-line title, leaving ~800px of empty space below it on desktop.

### `16-footer`

1. **Palette violation**: Cyan links (`#008080`) throughout legal, data, and repository columns conflict with the warm paper aesthetic.
2. **Dark-mode logo squircle**: The app logo has no border in dark mode, leaving a disconnected wireframe circle floating on black.
3. **Typographic sizing chaos**: Version, licensing, and attribution metadata mix multiple disparate font sizes and weights without hierarchy.

---

## 5 Signature Ideas (Lifting the Experience to Apple/Samsung Caliber)

Without adding a single new feature, the following five design transformations would elevate Global Audience Pulse into an institutional, museum-grade piece of software:

### 1. The Astronomical Chronometer (Single-Ink Dial & Terminator Sweep)

Replace the cluttered 5-color concentric activity wheel (`06-dial`) and the overlapping world map (`02-map-forecast`) with a single, high-precision astronomical sundial:

- Draw the entire 24-hour cycle as a razor-thin single-ink hairline ring engraved with 24 subtle hour marks.
- Represent the day/night boundary as an elegant, continuous solar terminator curve using an ink density gradient (from 5% ink tone at noon to 90% ink tone at midnight).
- Micro-etch the 8 global markets along the circumference at their exact solar meridians using 3-letter tabular mono codes (`NYC`, `LON`, `BER`, `DXB`, `BOM`, `TYO`, `LAX`, `SAO`).
- Reserve the solitary warm orange accent (`#d96b27`) for a single, razor-thin chronometer needle indicating the current global audience center of mass. This transforms two cluttered widgets into a singular, iconic brand centerpiece reminiscent of a high-end Braun or Leica instrument.

### 2. The Strict Swiss Editorial Typographic Scale

Consolidate the sprawling chaos of 25+ font sizes and 5 font weights into an unwavering 5-level typographic hierarchy:

- **Display**: One serif typeface used strictly for primary section headlines (`28px / 34px` on desktop, `22px / 26px` on mobile), set with deliberate, generous letterspacing (`letter-spacing: -0.01em`).
- **Heading**: One humanist sans serif for widget titles (`15px / 20px`, medium weight).
- **Body**: One humanist sans serif for explanations and insights (`13px / 18px`, regular weight).
- **Tabular Mono**: A single monospaced font with tabular figures (`font-variant-numeric: tabular-nums`) used exclusively for numbers, scores, timestamps, and percentages. Digital times in Section 07 and scores in Section 10 are immediately converted to tabular mono, eliminating serif italic scores.
- **Eyebrows / Meta**: Tabular mono uppercase (`10px / 12px`, `letter-spacing: 0.08em`, secondary ink).

### 3. Archival Paper Materiality & Nocturnal Dark-Mode Architecture

Elevate the color architecture to evoke tactile, high-grade Japanese archival paper:

- **Light Theme**: Warm tactile base (`#f8f6f0`), crisp hairline rules (`#e4dec8`), deep sumi-ink typography (`#191816` primary, `#5a564e` secondary), and a single warm vermilion/orange accent (`#d95a1e`).
- **Dark Theme (Nocturnal Paper)**: Eliminate pure `#000000` pitch black and pure `#ffffff` inverts. Use an obsidian-wash paper base (`#161513`), elevated card surfaces (`#201e1b`), warm bone-ivory rules (`#2e2b26`), and soft parchment ink (`#ede8de` primary, `#8f897e` secondary).
- All active pills, radio cards, and tabs highlight via elevated paper tone (`#282622`) and a crisp 1px hairline border, preserving nocturnal dark adaptation and conveying understated luxury.

### 4. Semantic Action Anchoring (Eliminating Button Fatigue)

Eliminate the visual fatigue of 12 identical repetitive buttons in Section 10 (`[ 📅 ]` and `[ Ansehen → ]` on every row), 8 screaming orange toggles in Section 07, and the rogue solid orange button in Section 08:

- Make data rows natively interactive with smooth micro-hover hairline borders and subtle background shifts.
- Replace the 8 orange toggles with quiet hairline status marks: active regions display a subtle mono indicator (`✓`), inactive regions display a muted dash (`—`).
- Reserve the orange accent button strictly for the single highest-value action on the entire page: adding the optimal posting window to calendar. All secondary actions become understated hairline actions.

### 5. Asymmetric 12-Column Swiss Editorial Grid & Mobile Flow

Resolve the massive 40% empty canyons on desktop and the cramped, clipped cards on mobile:

- **Desktop (1440px)**: Deploy a 12-column Swiss grid. Left-hand editorial analysis and executive scores occupy 4 columns with sticky vertical anchoring; detailed data visualizations, tables, and regional breakdowns occupy the right 8 columns with crisp horizontal hairline dividers.
- **Mobile (360px)**: Enforce a strict single-column flow where horizontal multi-button grids (e.g. platform selectors and scenario tabs) convert into smooth, momentum-scrolling horizontal pills with edge-fade masks, preventing clumsy 3+2 line wraps and ensuring German text never shears interactive elements into the bottom chrome.

---

_End of Audit AUDIT-O-001.md_
