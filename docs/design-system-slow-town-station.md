# Handoff: Commute — Slow Town Station design system

A bilingual (EN/中文) commute-tracking app with a Riso/risograph pastoral aesthetic. Users tap a paper-ticket button to BOARD their morning bus, watch a live ride card during the trip, and end up with a diary of tickets that doubles as personal commute data.

The design system in this bundle defines the complete visual language (tokens, components, motion, illustrations) plus how the app behaves in three edge states (loading, dark mode, notifications).

---

## About these files

The HTML files in this bundle are **design references** — high-fidelity prototypes built in HTML/CSS demonstrating the intended look, feel, and behavior. **They are not production code to copy verbatim.**

Your task is to **recreate these designs in the target codebase's existing environment** — React, SwiftUI, Jetpack Compose, Vue, whatever the project uses — following that codebase's established patterns, component library, and state-management conventions. If the project is greenfield, pick the framework best suited to the platform (likely React Native or SwiftUI/Compose for a mobile app like this) and implement there.

What you should lift from these files:
- **Exact token values** (hex codes, px scales, font stacks, motion curves) — these are final
- **Component anatomy** (perforation lines, punch holes, layout grids) — these are final
- **Voice and copy patterns** — these are final
- **Animation rules** (lurch/smooth/bouncy curves, durations) — these are final

What you should adapt:
- **DOM structure** — restructure to fit your component model
- **CSS architecture** — convert tokens to your styling system (CSS-in-JS, Tailwind theme, SwiftUI ViewModifiers, Compose Theme)
- **State management** — wire to your app's data layer

---

## Fidelity

**Hi-fi.** Every color, font size, spacing value, and motion curve in this bundle is final and intentional. Treat hex codes as exact. Treat the bus mascot PNGs as the canonical brand artwork. Treat the four font families as required (no Inter / Roboto substitutes).

---

## Bundled files

| File | What it covers |
|---|---|
| `Style Guide.html` | **Vol. I** — seven sections: §01 color · §02 type · §03 spacing/radius/motion · §04 three states (morning / on-road / evening) · §05 bus anatomy + time-of-day + arrival animations · §06 log & glance · §07 charts |
| `Quiet Moments.html` | **Vol. II** — three sections: §08 loading & skeletons · §09 dark mode · §10 notifications (lockscreen, live activity, widgets, watch) |
| `Mascot Brief.html` | Brand brief for the bus mascot — character, expressions, do/don't |
| `assets/bus-right-512.png` | Bus mascot facing right (used in morning + on-road scenes) |
| `assets/bus-left-512.png` | Bus mascot facing left (used in evening scenes) |

Open the HTML files in any modern browser to view. They are self-contained except for the two bus PNGs and the four Google Fonts (loaded via CDN — pin these in your build).

---

## Product overview

**Commute** (通勤) is a once-per-trip commute logger. Two taps a day:

1. **BOARD** in the morning when you get on the bus (state A → state B)
2. **ALIGHT** when you arrive (state B → state A or state C depending on time)
3. Same again in the evening: **BOARD** (state C → B) → **ALIGHT** (B → A)

The app draws a paper ticket on tap, runs a live ride card with ETA during the trip, then files the torn ticket into a chronological log. Over weeks the log becomes a personal commute diary with stats (averages, weather correlation, best times).

The visual language is **slow, warm, pastoral**: cream paper, riso-overprint accents, hand-stamped verbs, a friendly bus mascot. Nothing flashes. Nothing exclaims. The brand voice is a quiet stationmaster, not a salesman.

---

## Design tokens

### Colors

All colors are warm and never pure. Black is `#2B2417` (warm dark), white is `#F2EBD3` (cream paper).

```css
/* Paper & ink — warm, never pure */
--paper:        #F2EBD3;   /* sun-bleached cream — primary surface */
--paper-light:  #F8F2DE;   /* lighter wash — card surfaces */
--paper-deep:   #E8DCBA;   /* shaded paper — page bg */
--paper-edge:   #D9C9A0;   /* worn edge */
--ink:          #2B2417;   /* warm dark — body text */
--ink-soft:     #3F3520;   /* slightly softer */
--ink-muted:    #7A6B52;   /* secondary text */
--ink-faint:    #B7A887;   /* tertiary / disabled */
--ink-line:     #C7B894;   /* hairline rules */

/* Three accents — same chroma, three hues */
--am:           #D9A441;   /* sun mustard — MORNING */
--am-soft:      #F2DDA8;
--am-deep:      #B07F2A;
--am-overprint: rgba(217,164,65,.55);

--pm:           #A65A3A;   /* clay terracotta — EVENING */
--pm-soft:      #ECC2AC;
--pm-deep:      #7C3D24;
--pm-overprint: rgba(166,90,58,.5);

--leaf:         #5C8C4A;   /* grass green — LIVE / on-road */
--leaf-soft:    #C7DDB2;
--leaf-deep:    #3F6A2E;
--leaf-overprint: rgba(92,140,74,.5);

/* Sky — time-of-day backdrops for illustrations */
--sky-dawn:     #F1D4A6;
--sky-day:      #DDE3CD;
--sky-dusk:     #E89060;
--sky-night:    #1F2940;
--sky-night-2:  #2D3A5A;
--star:         #F4E8C2;
```

**Semantic meaning is strict** — sun (am) is *always* morning, clay (pm) is *always* evening, leaf is *always* live / on-road. Do not use clay for an error state or sun for a primary CTA button.

**Riso overprint**: where two accents overlap, use `mix-blend-mode: multiply` with `opacity: 0.85` in light mode, or `mix-blend-mode: screen` in dark mode. Offset overlaps by 2–6px deliberately — the misregistration is the style.

### Dark mode

Triggered by **time of day, not by toggle**. Lerp begins 10 min before sunset, ends 10 min after. A manual override exists (long-press the stop dot on the brand mark).

```css
/* Night overrides */
--paper:        #232E48;   /* ink-pool blue */
--paper-light:  #2D3A5A;
--paper-deep:   #1F2940;
--paper-edge:   #404C70;
--ink:          #F4E8C2;   /* warm star paper */
--ink-soft:     #DCCB9C;
--ink-muted:    #95876A;
--ink-faint:    #6B6048;
--ink-line:     #3E4A6C;

--am:           #E6B255;   /* +6% lightness for AAA */
--pm:           #C27050;
--leaf:         #7AAB60;
```

**Critical rule**: tickets themselves stay warm-amber in dark mode. They look like reading an orange paper ticket under a streetlamp — not like a dark-themed card. Only the chrome around tickets flips. See `Quiet Moments.html` §09 for the night sampler.

### Typography

Four families. No substitutes.

```css
--font-display: "DM Serif Display", "Noto Serif TC", Georgia, serif;
--font-body:    "Noto Serif TC", "DM Serif Display", Georgia, serif;
--font-hand:    "Caveat", "DM Serif Display", cursive;
--font-mono:    "JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace;
```

Load from Google Fonts (or self-host equivalents):
```
DM Serif Display: regular + italic
Noto Serif TC: 400, 500, 600, 700
Caveat: 500, 600, 700
JetBrains Mono: 400, 500, 600
```

Each family has a fixed semantic role:

| Family | Used for |
|---|---|
| **DM Serif Display** | Stop signs, section heads, station names (Chinese characters), brand mark |
| **Noto Serif TC** | All Chinese running text, buttons, body copy |
| **Caveat** | Hand notes, paper stamps, "early +5'", verbs like "all aboard" |
| **JetBrains Mono** | All numerals (times, ETA, °C, Nº0518), labels, table headers |

Always use `font-feature-settings: "tnum" 1` on JetBrains Mono — tabular numerals are required for the time-line alignment in tickets and log rows.

### Type scale

| Token | Size / Family | Use |
|---|---|---|
| `--fs-xs` | 11px mono | Labels, table headers, stamp captions |
| `--fs-sm` | 13px body | Table body, captions, paper notes |
| `--fs-base` | 15px body | Default UI text |
| `--fs-lg` | 19px body | Buttons, card titles |
| `--fs-xl` | 26px display | Block titles |
| `--fs-2xl` | 36px mono | ETA / time hero |
| `--fs-3xl` | 56px display | Section titles |
| `--fs-hand` | 22px hand | Hand notes, early/late annotations |

### Spacing

```css
--sp-1: 4px;  --sp-2: 8px;  --sp-3: 12px; --sp-4: 16px;
--sp-5: 20px; --sp-6: 24px; --sp-8: 32px; --sp-10: 40px;
--sp-12: 56px; --sp-16: 72px;
```

Usage: `sp-4` inside cards, `sp-6` between cards, `sp-12` around sections. Be roomy — let type breathe.

### Radius

```css
--r-sm: 3px;   /* tickets, ride card */
--r-md: 6px;   /* general */
--r-lg: 14px;  /* bus shape, app icon, character faces */
```

Mostly small corners. **No pills.** Buttons have 3px or 999px (for true round chips); avoid in-between.

### Shadow

Warm-tinted, never pure black — like paper on a wooden table.

```css
--shadow-1: 0 1px 0 rgba(70,50,20,.05), 0 2px 6px rgba(80,55,20,.08);
--shadow-2: 0 2px 0 rgba(70,50,20,.06), 0 8px 22px rgba(80,55,20,.12);
```

`--shadow-1` for tickets and paper notes. `--shadow-2` for active / floating elements.

### Motion

Three named curves. Do not invent new ones.

| Name | Curve | Duration | Used for |
|---|---|---|---|
| **Lurch** | `cubic-bezier(.6,.05,.4,.95)` with explicit hold steps | 2.6s loop | Bus on the road (kick-and-stop) — pauses a beat, then goes |
| **Smooth** | `ease-in-out` or linear | Matches duration (e.g. ≥ ETA window) | Progress bars, ETA numerals counting down |
| **Bouncy** | `cubic-bezier(.34,1.56,.64,1)` | 320ms | Stamp impact, arrival hop, early-by-N′ annotation appearing |

The BOARD/ALIGHT stamp animation is the canonical bouncy: scale 1.4 → 1.05 with a -8° rotation, 320ms total, four keyframes (off-screen tilted → ghosted arriving → impact ring → settled). See `Quiet Moments.html` §08 stamp-strip for the filmstrip.

### Paper texture

All large surfaces carry a 3–4px horizontal hairline (the photocopier-paper feel):

```css
background-image: repeating-linear-gradient(
  to bottom,
  transparent 0 3px,
  rgba(120,90,30,.025) 3px 4px
);
```

In dark mode use `rgba(0,0,0,.08)` instead.

---

## Component anatomy

### Ticket (`.pas-ticket`)

The signature element. A paper ticket with perforated top/bottom edges, a vertical dashed perforation between the body and a right-hand "punch" column, and a hand-written verb in Caveat.

**Structure**:
- Outer: `1px solid` border in the accent's `-deep` shade, `border-radius: 3px`, `min-height: 128px`
- Top + bottom perforations: pseudo-elements with `radial-gradient` dots at 10px spacing
- Body (left): date (mono), hand verb ("all aboard" / "heading home"), station pair (Chinese display + English mono caption), arrow `→`
- Punch column (right, 60px): punch hole (inset shadow), large mono glyph (↑ for BOARD, ↓ for ALIGHT), 3-letter ticks label

**Variants** by accent (just swap the `--paper-t`, `--edge-t`, `--stamp` CSS vars):
- Default: sun (AM commute)
- `.pm`: clay (PM commute home)
- `.leaf`: leaf (on-road / torn / VOID state)

See `Style Guide.html` §04 for three sized examples and the state-machine diagram.

### Ride card (`.ride-pas`)

Lives during state B. A torn carbon-copy with a sawtooth bottom edge, a pulsing leaf-green LIVE dot, the time pair (`08:12 ▸ 08:47`), an ETA window (`±3'`), and an undo button (rounded-pill, 30px tall).

The LIVE pulse uses `live-pulse 1.6s ease-in-out infinite` — 1 → 0.5 opacity, 1 → 0.85 scale.

### Log row (`.log-day`)

Two-leg row per date: day stamp (date + weekday) on the left, AM leg, PM leg. Each leg shows direction arrow, time pair, duration, delta vs. expected, weather icon + °C.

Today's row gets a subtle highlight; PM leg shows `— waiting for PM —` if not yet recorded.

### Glance stat (`.glance`)

Big mono number + unit, small label above, footnote below. One sentence of context — never raw data.

### Bus mascot

Provided as **PNG assets** (`assets/bus-right-512.png`, `assets/bus-left-512.png`). Do not redraw in SVG. Treat as canonical brand artwork.

Standard sizes:
- In illustrations / scenes: 130×110 px (bus.mascot class)
- In mini contexts (widgets, arrival cards): 80×60 px or 50×38 px
- In bus-anatomy diagram: 320px width

When the bus is "lurching" on a scene road, apply two stacked animations: `bus-lurch` (horizontal travel with hold steps) and `bus-bob` (subtle Y-axis wobble). See `Style Guide.html` §04 state B.

### Scene illustrations

Pastoral CSS-only scenes with sky gradient, hills (radial gradients), road, ground, trees (circle on stick), grass clumps, optional house, office tower, stop sign, stationmaster figure. Each scene is `1px solid var(--ink-line)` framed. Height typically 200px (full scenes) or 150px (TOD strip) or 160px (arrival cards).

Time-of-day backgrounds lerp between the four `--sky-*` colors based on actual local time — never snap. See §05 and §09.

---

## State machine

```
A (morning · waiting · sun)
   │  tap BOARD →
   ▼
B (on the road · LIVE · leaf)
   │  tap ALIGHT →
   ▼
A   if local time < 16:00
C   if local time ≥ 16:00

C (evening · waiting · clay)
   │  tap BOARD →
   ▼
B (on the road · LIVE · leaf, clay-paper ticket)
   │  tap ALIGHT →
   ▼
A or C (same rule)
```

The accent color of the ride card and torn ticket reflects which direction the user is going: AM → sun-amber paper, PM → clay paper. The leaf accent is reserved for "in motion" — the LIVE pulse, the route line, the on-road bus.

See `Style Guide.html` §04 for the full diagram with state cards.

---

## Loading & skeleton states (§08)

**Rule**: loading IS waiting. The brand is literally about waiting for a bus, so loading is on-theme. Show the *shape* of what's coming (perforation, day stamp, rails) and let it breathe.

| State | Pattern |
|---|---|
| Skeleton ticket | Perforation + edge + punch hole stay solid; station names render as `display: inline-block` blocks with `background: var(--ink-faint); opacity: .25-.55` pulsing 1.8s |
| Predicting ride card | Top label says `PREDICTING` (muted, no leaf pulse); times render as `––:––` faint; ETA line as `··· ETA · ±—'` |
| Skeleton log row | Day stamp solid; each leg becomes a dashed bar (`repeating-linear-gradient` 4px on / 4px off) |
| Inline pulse pill | `mono · 11px · 6px round padding · 999px radius`, with a leading colored dot (`live-pulse 1.6s`) and trailing `···` (`dot-pulse 1.6s`) |
| Saving stamp | 4-frame bouncy: 0% off-screen tilted → 120ms ghosted (opacity .55) → 220ms impact (ring shadow) → 320ms settled. Total 320ms. |
| Pull to refresh | Threshold 120px. Bus rolls in from left of frame on pull, parks at threshold, refresh-dots appear on release. |
| First launch | 800–1200ms splash with stop sign + town name + hand-written "opening up..." |

**Never**: spinners, gray shimmer, progress percentages, "Loading…" headlines, blocking modals.

---

## Notifications (§10)

### Voice rules

Every notification answers four questions: **state, time, place, verb**. Then it stops.

| ✓ Good | ✗ Bad |
|---|---|
| "The 08:12 bus is at the corner. About 4 minutes." | "🚌 Your bus is here!!" |
| "Heading home? The 18:02 boards from Office." | "Don't miss it! Tap NOW to confirm boarding." |
| "Looks like you didn't tap off — were you on the 17:58?" | "You forgot to confirm your trip." |
| "This week, 35 min average. Clear days are faster." | "Great job! Your fastest week yet! 🎉" |

No emoji. No exclamations. No urgency. Use "looks like" instead of "you forgot".

### Triggers

| Trigger | Timing | Channel | Notes |
|---|---|---|---|
| Bus inbound | 4 min before predicted board time | Lock screen + Live activity | Once. No second nudge. |
| Time to head back | 10 min before usual PM board | Lock screen | Weekdays only. |
| Forgot to alight | 8 min after expected arrival | Lock screen | One quick yes/no. |
| Weekly note | Sunday 09:00 | Lock screen | Off by default. |
| Live activity | While riding | System pill + Watch | Silent except on arrival. |

### Channels

1. **Lock screen card** — App icon (sun-amber rounded square with ink dot), bilingual "commute" title, body wraps 2-3 lines max, BOARD + SNOOZE +1′ actions in a horizontal row below a dashed hairline divider. BOARD is leaf-deep, SNOOZE is ink-muted.

2. **Live activity / system pill** — Compact: arrival time + ETA window. Expanded: app icon + station pair + ETA hero.

3. **Home widget (sm + md)**:
   - **Small** (square): live pill at top, big mono ETA, station pair caption, hand-written verb like "+2' early"
   - **Medium** (2:1): live pill, time pair, station pair, plus a slice of the morning scene with the bus

4. **Watch complication** — Circular dial, fill ring shows minutes-to-arrival as a leaf-green arc. Center: `4'` + "to board" caption. Bottom: station pair. Tap = BOARD. Haptic: one soft tick.

The lockscreen, widget, and watch containers in the design are drawn as **generic dark-glass rounded surfaces** — not OS-specific UI. When implementing, use the platform's native notification / widget / watch SDK (iOS UNNotification, Android Notification, WidgetKit, Wear OS Tile, etc.) — these designs define *what our content looks like*, not the system chrome around it.

---

## What's NOT specified yet

The user has flagged these as undefined and may want them designed before implementation begins:

- **Empty / error states** (first launch with no data, location failure, offline)
- **Settings page** (configuring Home / Office addresses, preferred trip times)
- **Multi-route support** (weekend trips, working from different location, route switching)
- **Accessibility** (full contrast audit for AA/AAA, screen reader labels for the perforation/stamp imagery)
- **Onboarding** (the design currently skips a tour — the setup lives "inside the first tap" but the actual UX of that hasn't been drawn)

If your implementation needs any of these, flag back to the designer before inventing them.

---

## Assets

- `assets/bus-right-512.png` — 512×512 PNG, bus mascot facing right, transparent background, used for morning and on-road scenes
- `assets/bus-left-512.png` — 512×512 PNG, bus mascot facing left, used for evening scenes

These are the only raster assets. Everything else (scenes, ticket textures, icons) is drawn in CSS or inline SVG. Weather icons in `Style Guide.html` §06 and §07 are simple inline SVGs (sun, cloud, rain) at `stroke-width: 1.6-1.8` — these can be replaced with your icon library's equivalents at the same visual weight.

---

## Suggested implementation order

If you're starting from scratch:

1. **Tokens first** — port colors, type, spacing, radius, shadow, motion into your theme system
2. **Paper texture utility** — the `repeating-linear-gradient` background works as a single mixin/modifier
3. **Ticket component** — the most reused element; nail the perforation pseudo-elements and punch column
4. **Ride card + LIVE pulse** — second most reused
5. **State machine** — wire A/B/C transitions and the time-based AM/PM rule
6. **Log row + glance stats** — the diary surface
7. **Bus mascot integration** — just `<img>` the PNGs at the right sizes, don't redraw
8. **Scene composition** — the pastoral illustration grammar (sky/hills/road/ground)
9. **Loading + skeleton states** — once core components exist
10. **Dark mode** — token-swap based on `prefers-color-scheme` + local time, with the 20-min lerp
11. **Notifications + widgets + watch** — last, platform-specific

---

## Questions for the designer

When in doubt, ask. Likely topics:
- Empty/error state copy and visuals
- Settings page layout
- Whether multi-route is in scope for v1
- Exact icon set (replace inline SVGs with library equivalents)
- Sound / haptic spec beyond "one soft tick"
- Print/export from the diary view (PDF? PNG share card?)
