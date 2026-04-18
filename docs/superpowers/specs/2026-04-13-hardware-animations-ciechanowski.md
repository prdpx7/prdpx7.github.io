# Hardware-is-Hard — Interactive Animations (Ciechanowski Redesign)

**Status:** approved (pending user review of written spec)
**Date:** 2026-04-13
**Related post:** `content/posts/hardware-is-hard/index.md`
**Supersedes:** `docs/superpowers/specs/2026-04-13-hardware-animations-design.md` (flat-2D direction, rejected)
**North star:** https://ciechanow.ski/mechanical-watch/
**Secondary reference:** https://samwho.dev/turing-machines/

## 1. Goal

Three interactive SVG animations embedded inline in the "Hardware is hard?" blog post. Each widget concentrates a single "aha" moment:

1. **anim-cell** — voltage drives a motor; a bipolar slider through −V ... 0 ... +V pushes electrons through wires and spins the rotor accordingly.
2. **anim-hbridge** — the TB6612FNG routes current through 4 MOSFETs to flip motor direction without swapping wires, with Coast vs Brake as distinct modes.
3. **anim-car** — the full control loop: D-pad → ESP32 → TB6612FNG (two channels) → 4 wheels, including tank-style turning.

Every illustration is drawn to the fidelity bar established by the wheel mockup in `.superpowers/brainstorm/.../wheel-fidelity.html`: tread-blocked tires, yellow hub with D-shaped spokes, chrome axle stubs, radial-gradient shading, ambient ground shadow. Same level of care applied to every component.

## 2. Scope

### In scope

- Three Hugo shortcodes (`layouts/shortcodes/anim-{cell,hbridge,car}.html`) embedded inline in the blog post via `{{< anim-cell >}}`, etc.
- Shared runtime: `animations/core.css` + `animations/core.js` with primitives used by all three widgets.
- Three widget logic files: `animations/anim-{cell,hbridge,car}.js`, one `initX(rootId)` export each.
- One Hugo partial (`layouts/partials/hardware-anims-assets.html`) that injects the `<link>` + `<script>` tags. Gets included once per page that uses any animation.
- Ciechanowski-grade SVG illustrations: pseudo-3D gradient-shaded components, warm paper background, serif typography, italic captions.
- Responsive behavior down to 320px, with touch-sized controls and `prefers-reduced-motion` support.
- Keyboard input for the D-pad widget when focused (arrow keys + space + Esc).
- Deletion of the old `animations/hardware-anims.{js,css}` + standalone `anim-*.html` files — incompatible with the new aesthetic, superseded.

### Out of scope (v1)

- WebGL, canvas, or 3D. Pure SVG only.
- Physics engine. No real V/I/R math. Numbers on screen are illustrative; motion is tuned for feel, not accuracy.
- Spring-damper motion, shake, or particle systems. Motion is rAF + eased-toward-target velocity (L2).
- Global "pause all animations" toggle.
- Saved state across page reloads.
- Dark mode. Post reads on warm paper only.
- Prose in the blog post introducing H-bridge and D-pad sections — author writes that separately; widgets are ready to be dropped in at appropriate paragraphs.

## 3. Aesthetic

### Palette (`core.css`, as CSS custom properties)

| var              | hex / gradient        | role                                            |
|-|-|-|
| `--paper`        | `#f4ede0`             | page + widget background                         |
| `--paper-edge`   | `#e4d9b8`             | subtle border / separator                        |
| `--ink`          | `#3a2510`             | primary text, strokes, headings                  |
| `--dim`          | `#8a7a55`             | secondary text, dormant components, labels       |
| `--amber`        | `#c77d2a`             | active current, accent                           |
| `--amber-glow`   | `#ffa94d`             | electron particles, glow bloom                   |
| `--amber-deep`   | `#a5651c`             | current on the "return" side, button hover       |
| `--yellow-hub`   | `#f2c034` → `#6e4d08` | wheel hub, positive terminal                     |
| `--yellow-dark`  | `#b88618`             | recessed hub detail                              |
| `--chrome`       | `#fff` → `#d0d0d0` → `#6a6a6a` → `#2a2a2a` | axles, caps, metal terminals    |
| `--metal-dark`   | `#5a5a62` → `#1b1b20` | motor body, MOSFET silicon                       |
| `--rubber`       | `#2c2c2c` → `#0d0d0d` | tire                                             |
| `--silicon`      | `#1a1a1a` → `#2a2a2a` | DIP chip body                                    |
| `--shadow`       | `rgba(0,0,0,0.25)`    | drop-shadow filter                               |

All gradients defined as reusable `<defs>` inside each shortcode's SVG: `tire-outer`, `tire-inner`, `hub-yellow`, `hub-yellow-dark`, `chrome`, `metal-dark`, `silicon`, `cell-outer`, `cell-cap`.

### Typography

- Body labels: `ui-serif, Georgia, 'Times New Roman', serif`.
- Monospace for pin names (AIN1, AO1, etc.): `ui-monospace, Menlo, Consolas, monospace`.
- Captions: italic serif, color `--dim`, size 13px at default zoom.
- Everything scales via `em` units inside SVG `<text>`.

### Drawing conventions

- **Radial gradients** on every solid-body component (tires, motors, cells, caps). Highlight at 30% / 30%, radius 0.8–0.9 of shape extent.
- **Drop-shadow filter** (`feGaussianBlur` + `feOffset`, slope 0.35–0.4) applied to every detached component, never to wires or text.
- **Ambient ground shadow** as a thin dark ellipse beneath wheels and motors.
- **Wires** are curved paths (`C` beziers), stroke-linecap round, thickness 3px. Active wires are `--amber`; dormant/return wires are `--dim`.
- **Current glow** is small `<circle>` particles (`r=2.5–3.5`, `fill=--amber-glow`, `opacity` scaled by local current density) drifting along a wire path, spawned and recycled by `flowCurrent()` primitive.
- **Chrome highlights** — a small white circle at ~35% inset on every chrome surface.

## 4. File layout

```text
newblog/
├── animations/
│   ├── core.css             # palette, base widget styles, keyframes, reduced-motion
│   ├── core.js              # primitives: spinMotor, flowCurrent, bindSlider, bindPress, bindRadioGroup
│   ├── anim-cell.js         # widget 1 logic (~200 lines)
│   ├── anim-hbridge.js      # widget 2 logic (~250 lines)
│   └── anim-car.js          # widget 3 logic (~300 lines)
├── layouts/
│   ├── partials/
│   │   └── hardware-anims-assets.html
│   └── shortcodes/
│       ├── anim-cell.html   # SVG illustration + <script> calling Anims.initCell
│       ├── anim-hbridge.html
│       └── anim-car.html
└── content/posts/hardware-is-hard/
    └── index.md             # contains {{< anim-cell >}} etc.
```

Files to delete as part of this work (superseded):
- `animations/hardware-anims.js`
- `animations/hardware-anims.css`
- `anim-cell.html` (root-level scratch)
- `anim-hbridge.html` (root-level scratch)
- `anim-car.html` (root-level scratch)
- `wiring-guide.html` (root-level scratch — not used by Hugo)

The old spec file (`2026-04-13-hardware-animations-design.md`) stays in place for history but is marked superseded by this file's header.

## 5. Shared runtime — `core.js`

Single IIFE, exposes `window.Anims`. No dependencies.

### 5.1 Public API

```js
window.Anims = {
  // Motor primitive.
  // rotorEl: SVG group to rotate. Must have a stable center — element is
  // rotated via the SVG `transform` attribute around its own center.
  // Returns { setVelocity(v), destroy() }.
  // Velocity eases toward target: vel += (target - vel) * k,
  // where k = 0.06 when |target| > |vel| (accel), else 0.015 (decay).
  // Velocity is in degrees per frame, capped at 18 (~1080°/s at 60fps).
  spinMotor(rotorEl, { center: [cx, cy] }),

  // Current-flow primitive.
  // pathEl: SVG <path> defining the wire geometry.
  // hostEl: SVG <g> where particle circles are inserted.
  // Returns { setRate(r), destroy() }.
  // r in [-1, 1]: sign = direction, magnitude = particle drift speed + spawn rate.
  // Rate 0 => particles slow to rest and fade out over ~600ms.
  flowCurrent(pathEl, hostEl, { color, count: 8, radius: 3 }),

  // DOM helpers
  bindSlider(inputEl, onChange),        // input event → onChange(Number); fires once with initial value
  bindPress(btnEl, onDown, onUp),       // pointer + keyboard (Space/Enter) press-and-hold
  bindRadioGroup(btnEls, onChange),     // click → onChange(value), manages [data-active] attr
  bindToggle(btnEl, onChange),          // click → flip boolean, onChange(bool), manages aria-pressed

  // Utility
  clamp(v, lo, hi),
  prefersReducedMotion(),               // returns boolean, updates live on mq change
};
```

### 5.2 Implementation notes

- `spinMotor` uses a single shared rAF loop across all motors on the page (registered via `addRotor` internally). On `prefersReducedMotion`, the loop is skipped and each rotor shows a static arrow indicating direction.
- `flowCurrent` precomputes the path via `pathEl.getTotalLength()` and `getPointAtLength()`. Each particle carries its own `[0, totalLength]` progress and wraps. On rate 0, the spawn cadence drops to 0 and existing particles animate to completion.
- All primitives return a `destroy()` function that cancels rAF and removes DOM nodes, so widgets can be re-initialized cleanly.

## 6. Widget specs

### 6.1 anim-cell

**SVG viewBox:** `0 0 720 320`.

**Illustration:**
- Left (`x=80`): 18650 lithium cell. Cylindrical body with `cell-outer` radial gradient (amber-brown fade), left negative cap (flat silver), right positive cap (raised silver nipple). Monospace label "18650" on the body, serif label "3.7 V" below.
- Right (`x=540`): DC motor. Dark metallic cylindrical body with `metal-dark` gradient, silver shaft on the right, rotor disk on the face showing a 4-spoke wheel (same geometry as the fidelity wheel, scaled down). Drop shadow + ground shadow.
- Middle: two curved copper-colored wire paths connecting cell terminals to motor terminals. Top path → positive route, bottom path → negative return.
- Below illustration: horizontal bipolar range slider `[-4, +4]`, step `0.1`, default `0`. Tick marks at −4, −2, 0, +2, +4. Slider thumb is chrome. Track is paper-edge.
- Italic serif caption below slider: *"voltage — drag to push electrons"*.
- Live readout to the right of slider: `"+2.4 V"`, updates on input.

**Behavior:**
- Slider value `v ∈ [-4, +4]` feeds into `Anims.spinMotor(rotor, ...)` with target velocity = `sign(v) * |v|/4 * 12` (deg/frame). So |v|=4 → 12°/frame ≈ 720°/s.
- `Anims.flowCurrent` on each wire with rate = `v/4` (so full forward at v=+4, full reverse at v=−4, stopped at v=0).
- At v=0: motor eases to stop, electrons fade out, cell shows a gentle "breathing" pulse on the positive cap (subtle opacity oscillation, ~2s cycle) to signal the cell is alive and ready.
- Voltage readout color: `--amber` when |v|>0, `--dim` when v=0.

### 6.2 anim-hbridge

**SVG viewBox:** `0 0 880 480`.

**Illustration:**
- Top-left: ESP32 mini-board. Green-tinted PCB rectangle, silver USB-C port on top, 4 silver header pins on the right labeled AIN1 / AIN2 / PWMA / GND (monospace). Subtle drop shadow.
- Center: TB6612FNG as a realistic SOP16 DIP chip. Black silicon body (`silicon` gradient), silver pins protruding on both long edges, white silkscreen text "TB6612FNG" on top. Inside the chip silhouette (slightly transparent to suggest X-ray), 4 MOSFETs drawn as small silicon squares labeled Q1–Q4, arranged in an H pattern (Q1 top-left, Q2 top-right, Q3 bottom-left, Q4 bottom-right).
- Right: DC motor (same illustration as anim-cell).
- Bottom: battery block (two 18650 cells stacked, showing +/− rails going up to VM and GND on the chip).
- Wires: AIN1/AIN2 from ESP32 to chip (thin, labeled). VM→Q1, VM→Q2, Q3→GND, Q4→GND, Q1/Q3→motor-A, Q2/Q4→motor-B. Active MOSFETs and their connecting wires go `--amber`; inactive go `--dim`.
- Controls (below illustration):
  - 4 radio-button-style mode buttons: **Forward / Backward / Coast / Brake**. Styled as paper tabs with subtle shadow on active.
  - Horizontal PWM slider `[0, 255]`, step `1`, default `192`. Labeled "PWM — motor speed".
  - Live status line: *"Forward @ 192 / 255 — MOSFETs Q1+Q4 on"*.

**Behavior:**
- Modes map to MOSFET states (`highSide=Q1|Q2`, `lowSide=Q3|Q4`):
  - Forward: Q1 on, Q4 on → current VM → Q1 → motor A → B → Q4 → GND. Motor spins CW.
  - Backward: Q2 on, Q3 on → current mirrors. Motor spins CCW.
  - Coast: all off. Motor eases to stop via natural decay (no brake).
  - Brake: Q3 on, Q4 on (both low-side shorting motor leads). Motor decays to stop rapidly (decay k bumped from 0.015 to 0.08).
- PWM slider scales target velocity linearly: `target = sign * pwm/255 * 12` deg/frame.
- Current flow particles appear only along active MOSFET paths; rate ∝ PWM/255.
- Status line updates on any change.

### 6.3 anim-car

**SVG viewBox:** `0 0 720 720` (square, stacks vertically on narrow screens via `preserveAspectRatio=xMidYMid meet` + CSS flex in the outer wrapper).

**Illustration:** three stacked rows in one SVG.

- **Row 1 — Car chassis (overhead view), `y: 0–280`**: wood-grain MDF rectangle with chrome screws at corners, 4 wheels (tiny variant of the fidelity wheel) at positions L1 top-left, R1 top-right, L2 bottom-left, R2 bottom-right. ESP32 + TB6612FNG visible on the deck in the center, interconnects drawn as thin traces. Subtle top-down shadow on the wheels.
- **Row 2 — Current-flow schematic, `y: 280–520`**: simplified: ESP32 GPIO on left, two TB6612FNG channel blocks (Channel A, Channel B), current paths branching to wheel pairs. Channel A → (L1, L2). Channel B → (R1, R2). Arrows showing direction when active.
- **Row 3 — D-pad, `y: 520–720`**: a chrome-finished circular D-pad with 5 buttons: Up, Left, Stop (center), Right, Down. Each button is a raised chrome pill with serif label. Stop button is accent-amber. Drawn inside the SVG (scales with illustration), each button is a `<g role="button" tabindex="0" aria-label="...">` with `pointer-events: all` and an invisible hit-rect overlay ≥44×44px viewBox-units. Focus ring is a visible amber stroke, drawn via CSS `:focus-visible`.

**Commands (single latch, not press-hold):**
- `up` → Channel A forward, Channel B forward → all 4 wheels spin CW (viewed from outside).
- `down` → both channels backward → all 4 wheels CCW.
- `left` → Channel A backward, Channel B forward → L-side reverses, R-side forwards → tank-turn left.
- `right` → Channel A forward, Channel B backward → tank-turn right.
- `stop` → both channels set to brake mode → all wheels decay fast.

**Interaction:**
- Click D-pad buttons to set command (latching). Current command has amber glow border.
- Keyboard (when widget has focus, `tabindex=0`): Arrow keys = corresponding D-pad button, Space = Stop, Esc = blur.
- Current flow particles animate along the active channel paths in Row 2. Wheels in Row 1 rotate via `spinMotor`, each tied to the appropriate channel direction.

## 7. Motion model

One rAF loop per active widget on screen (not per-motor). `core.js` maintains a shared tick function that iterates over all registered primitives. Loop auto-stops when no widget is mounted.

- **Motor velocity easing:** `vel += (target - vel) * k`, where `k = 0.06` when approaching higher |vel| (accel), `k = 0.015` when decaying to lower |vel| (coast), `k = 0.08` when braking (explicit brake mode only). Capped at 18 deg/frame. When |vel| < 0.01 and target = 0, motor snaps to 0.
- **Current drift easing:** `particleSpeed += (targetSpeed - particleSpeed) * 0.04`. Spawn cadence scales linearly with |rate|.
- **Breathing idle (anim-cell at v=0):** `opacity = 0.7 + 0.25 * sin(t * 2π / 2000ms)` applied to positive cap.
- **Reduced motion:** when `prefers-reduced-motion: reduce` matches, rotors show a static directional arrow, particles are hidden, breathing is disabled. All interactive controls still work; the state just doesn't animate.

## 8. Responsive behavior

- `.hw-anim` outer wrapper: `max-width: 720px; margin: 2rem auto; padding: 0 1rem;` matches typical Hugo post column.
- SVG uses `viewBox` + `preserveAspectRatio="xMidYMid meet"`, with `width: 100%; height: auto;`. Scales cleanly to 320px minimum.
- Controls below the SVG for anim-cell (range slider, readout) and anim-hbridge (mode radios, PWM slider, status line) are plain HTML: CSS flex, wraps on narrow screens. Sliders are 100% width, buttons min 44×44px.
- anim-car's D-pad is rendered inside the SVG (per §6.3) so it scales with the illustration and doesn't reflow as HTML. On < 480px viewports the entire SVG just scales down; hit targets remain proportionally large within the SVG thanks to the invisible 44×44 viewBox-unit hit rects.
- `touch-action: manipulation` on sliders to suppress double-tap zoom.
- Tested viewports: 320, 375, 414, 768, 1200px.

## 9. Integration into Hugo

### 9.1 Partial — `layouts/partials/hardware-anims-assets.html`

```html
{{ if .Params.animations }}
<link rel="stylesheet" href="{{ "animations/core.css" | relURL }}">
<script src="{{ "animations/core.js" | relURL }}" defer></script>
<script src="{{ "animations/anim-cell.js" | relURL }}" defer></script>
<script src="{{ "animations/anim-hbridge.js" | relURL }}" defer></script>
<script src="{{ "animations/anim-car.js" | relURL }}" defer></script>
{{ end }}
```

Loaded from whichever layout renders posts (e.g. `layouts/posts/single.html` or `layouts/_default/single.html`) via `{{ partial "hardware-anims-assets.html" . }}` inside `<head>`.

The blog post's front matter adds `animations: true` to opt in. Posts without that flag don't load the bundle — zero cost.

### 9.2 Shortcode — `layouts/shortcodes/anim-cell.html` (shape)

```html
<figure class="hw-anim" id="anim-cell-{{ .Ordinal }}">
  <svg viewBox="0 0 720 320" preserveAspectRatio="xMidYMid meet" aria-label="Battery driving a motor via voltage slider">
    <defs>
      <!-- tire-outer, tire-inner, hub-yellow, chrome, metal-dark, cell-outer, cell-cap, motor-shadow -->
    </defs>
    <!-- cell, wires, motor illustration -->
  </svg>
  <div class="hw-controls">
    <input type="range" min="-4" max="4" step="0.1" value="0" class="hw-slider" />
    <span class="hw-readout">0.0 V</span>
  </div>
  <figcaption>voltage — drag to push electrons</figcaption>
  <script>Anims.initCell("anim-cell-{{ .Ordinal }}");</script>
</figure>
```

Analogous for `anim-hbridge.html` and `anim-car.html`.

`{{ .Ordinal }}` gives a unique id per shortcode invocation (in case multiple widgets of the same type ever appear on one page).

### 9.3 Blog post insertion points

- `anim-cell` inserted after the "Voltage is like a gravity for electrons" paragraph (currently around line 66 of `index.md`).
- `anim-hbridge` inserted in a new "How do we reverse a motor without moving wires?" section between "Motors and Batteries" and the connecting-components section. Author adds the prose; spec only guarantees the widget works.
- `anim-car` inserted at the end of the post, right before the YouTube embed, as the payoff. Author adds a short framing paragraph.

## 10. Fidelity benchmark

Every pseudo-3D SVG component must hit the bar established by `.superpowers/brainstorm/30030-1776098669/content/wheel-fidelity.html`:

- Radial-gradient body shading, ~4 color stops.
- Ambient ground shadow (thin dark ellipse, opacity 0.18).
- Drop-shadow filter applied once per component.
- At least one chrome / highlight detail per component.
- No flat-fill rectangles for primary components — only for micro-details (text labels, tick marks).

Component checklist:
- [ ] 18650 cell (cylindrical, amber-brown fade, metal end caps, positive nipple)
- [ ] DC motor body (metallic cylinder + shaft + rotor face)
- [ ] Wheel (tread blocks, yellow hub, 5 D-spokes, chrome axle)
- [ ] ESP32 board (green PCB, silver USB-C, silver headers)
- [ ] TB6612FNG chip (black silicon, silver pins, silkscreen, X-ray MOSFETs)
- [ ] MOSFET (small silicon square with gate/source/drain hints)
- [ ] Car chassis (wood-grain MDF + chrome screws)
- [ ] D-pad (chrome ring + 5 pill buttons)
- [ ] Wires (curved beziers, amber on active, dim on return)
- [ ] Battery block (two stacked 18650s with VM/GND rails)

## 11. Existing-code migration

The current `animations/hardware-anims.js` + `animations/hardware-anims.css` and the 3 root-level `anim-*.html` scratch pages were built for the rejected flat-2D PlanetScale aesthetic. They are structurally incompatible with the new pseudo-3D SVG illustrations (palette, SVG markup, motion model all differ).

**Plan:**
1. New work starts cleanly under the new file paths in §4.
2. Once new widgets are working end-to-end, delete the old files in a single cleanup commit.
3. Old spec + plan files in `docs/superpowers/` stay for history, with this spec's header line indicating it supersedes them.

## 12. Risks & mitigations

- **SVG illustration labor is the long pole.** Each of the 10 components on the checklist takes real drawing time. Mitigation: build the primitives and one widget end-to-end first (anim-cell — fewest components), confirm the fidelity bar still feels right in the full article context, then commit to the other two.
- **Bundle size creep.** Gradients and paths are verbose. Mitigation: hard budget of ≤12 KB gzipped for all JS+CSS combined, ≤6 KB per shortcode HTML. If we breach, we drop one layer of detail (typically the X-ray MOSFETs or the wood grain) rather than cutting a whole component.
- **Motion feels off.** The chosen easing constants (`k=0.06` / `0.015` / `0.08`) are educated guesses. Mitigation: tune these once all three widgets are integrated in the live post, not before.
- **Hugo `.Params.animations` opt-in bug.** If the flag is missing, widgets silently break. Mitigation: the shortcode emits a visible error message in dev mode (`hugo server -D`) when `Anims` is undefined on mount.

## 13. Success criteria

Done when:
- All three widgets render correctly in the live blog post (embedded via shortcodes).
- Every component on §10's checklist meets the fidelity bar.
- The post loads animations only when `animations: true` is in front matter; otherwise zero extra bytes.
- All widgets respond correctly on iPhone SE–width viewport (320–375px) and desktop (≥1024px).
- `prefers-reduced-motion` is honored: widgets are still usable, just static.
- Old animation files are deleted.
- No console errors, no layout shift after initial render.
