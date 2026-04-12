# Hardware-is-Hard — Interactive Animations Design

**Status:** draft (awaiting user review)
**Date:** 2026-04-13
**Related post:** `content/posts/hardware-is-hard/index.md`
**Related reference:** `wiring-guide.html` (existing schematic)

## 1. Goal

Three interactive animations for the "Hardware is hard?" blog post that let readers *discover* how a DIY 4WD robot car works by manipulating sliders and buttons:

1. **anim-cell** — voltage drives a motor; slider through −V ... 0 ... +V smoothly reverses current and spin.
2. **anim-hbridge** — how the TB6612FNG routes current to flip motor direction without flipping wires.
3. **anim-car** — the full loop: D-pad → ESP32 GPIO → TB6612FNG Channel A + B → 4 wheels, including tank-style turning.

Each one concentrates a single "aha" moment. Together they translate the static wiring diagram in `wiring-guide.html` into lived understanding.

## 2. Scope

### In scope

- Three standalone HTML files, each self-contained and independently shareable.
- Shared JS library and CSS for common primitives (electron flow, motor spin, palette, controls).
- Flat-2D, PlanetScale-inspired aesthetic: labeled rectangular blocks, small colored squares moving along straight wire paths, a single scrubbable slider or D-pad per widget.
- Mobile-responsive layouts (tested down to 340px wide).
- Keyboard input as a bonus for the D-pad widget when focused.

### Out of scope (v1)

- Hugo shortcode integration. The post author will drop the HTML fragments into the blog himself.
- Physics-accurate simulation. Motor RPM and electron speed are visual metaphors tuned for aesthetic, not derived from real V/I/R equations.
- Press-and-hold D-pad (click-to-latch only).
- WebGL / 3D / drag-to-rotate (Ciechanowski-style). Flat 2D SVG only.
- Brake vs coast flicker, PWM burst visualization, latency trail. Listed as v2 polish below.
- Global "pause all animations" toggle.

## 3. Tech stack

**Inline SVG + vanilla JavaScript + CSS.** No WebGL, no frameworks, no build step.

Rationale: every shape in all three widgets is a flat rectangle, a straight line, or a small moving square. SVG handles these natively; vanilla JS drives the state. DOM-inspectable in DevTools; trivially hackable by the author; no toolchain dependency. Matches the existing `wiring-guide.html` stack.

## 4. File layout

```text
newblog/
├── animations/
│   ├── hardware-anims.css      # palette + widget base styles
│   └── hardware-anims.js       # shared library (electron flow, motor spin, helpers)
├── anim-cell.html              # Animation 1 — standalone page
├── anim-hbridge.html           # Animation 2 — standalone page
└── anim-car.html               # Animation 3 — standalone page
```

Each `anim-*.html` is ~150–250 lines: HTML skeleton, inline SVG, two `<link>`/`<script>` tags pointing at `animations/hardware-anims.{css,js}`, and a small inline `<script>` calling the widget's init function.

Files live at the repo root alongside `wiring-guide.html`, matching the author's existing pattern.

## 5. Aesthetic principles

Distilled from the PlanetScale I/O-latency visualization that the author flagged as reference:

1. **Flat filled rectangles**, not rounded schematic panels. No shadows, no gradients.
2. **Small colored squares (6×6px) move along paths** — not circles. Visual metaphor for "chunks of charge."
3. **Labels inline on the shapes** (`CELL · 3.7 V`, `MOTOR · 120 rpm ⟳`). No external legends.
4. **One scrubbable control at the top**, with an italicized caption ("*Voltage — push, pull, or hold at zero*").
5. **Dark neutral background** (`#1a1a1f`), 2–3 accent colors max per widget.
6. **Zero ornamentation.** The information IS the design.

### Palette (applied via CSS custom properties)

| var | hex | use |
|-|-|-|
| `--bg`          | `#1a1a1f` | page + wrapper |
| `--panel`       | `#161628` | block fill |
| `--ink`         | `#c8c8d0` | primary text |
| `--dim`         | `#555`    | secondary text, inactive MOSFETs, return wires |
| `--blue`        | `#3498db` | electrons (default), AIN1/BIN1 |
| `--green`       | `#2ecc71` | active / ON, AIN2/BIN2 |
| `--yellow`      | `#f1c40f` | motor wire A, PWM accent |
| `--red`         | `#e74c3c` | VM / battery + / reverse current |
| `--purple`      | `#9b59b6` | PWM pin |
| `--focus`       | `#3498db` | keyboard focus outline |

Matches `wiring-guide.html` colors, with unused schematic colors dropped.

## 6. Shared library — `hardware-anims.js`

One IIFE exposing `window.Anims`. Structure:

### 6.1 Public API

```js
window.Anims = {
  PALETTE: { /* same as §5 table */ },

  // DOM helpers
  bindSlider(inputEl, onChange),       // input event → onChange(Number)
  bindToggle(buttonEl, onChange),      // click → flip bool, onChange(bool)
  bindRadioGroup(buttonEls, onChange), // click → onChange(value)
  bindPressHold(btnEl, onDown, onUp),  // pointerdown/up + key Enter/Space

  // Animation primitives
  flowElectrons(pathEl, state),        // returns { update, destroy }
  spinMotor(rotorEl, state),           // returns { update, destroy }

  // Per-widget entry points (called from each HTML file)
  initCell(rootId, opts),
  initHBridge(rootId, opts),
  initCar(rootId, opts),
};
```

Each `init*()` returns a destroy function for dev hot-reload.

### 6.2 `flowElectrons(pathEl, state)` — the core primitive

Used by all three widgets. Given an SVG `<path>` (or `<line>`), draws N small `<rect width=6 height=6>` squares moving along it.

- `pathEl`: target SVG `<path>` or `<line>` element. It must sit inside an `<g class="electrons-host">` parent; the function creates and appends the square `<rect>` elements as siblings of `pathEl` inside that same host group.
- `state`: `{ speed: Number, direction: -1|0|+1, paused: Boolean, color: String }`
  - `speed`: abstract units, 0 = frozen, positive = flow. Typically 0–4 in widgets.
  - `direction`: sign; 0 halts flow.
  - `paused`: hard stop (rAF short-circuits).
  - `color`: fill color; defaults to `--blue`.
- Loop: single `requestAnimationFrame` per widget instance. On each tick, each square's `t ∈ [0, 1)` advances by `(speed * dt / periodSec) * direction`, wrapping at boundaries. Square position computed via `SVGPathElement.getPointAtLength(t * L)` and written to `cx/cy` (or `x/y` for rects).
- No DOM creation per frame. Squares are created once at `flowElectrons()` call, recycled.
- `update(newState)` merges into current state; `destroy()` cancels rAF and removes squares.

### 6.3 `spinMotor(rotorEl, state)` — motor visualization

- `rotorEl`: the `<g class="rotor">` inside the motor block.
- `state`: `{ rpm: Number, direction: -1|0|+1, decayModel: 'coast'|'brake'|null }`
- Implementation: sets CSS custom property `--spin-duration: calc(60s / max(rpm, 1))` on the rotor element, applies `.spinning` and `.reverse` classes. CSS keyframe does the actual rotation (`transform: rotate(360deg)`). JS only updates CSS vars and classes.
- `decayModel`: optional deceleration behavior applied when rpm is set to 0.
  - `coast`: linear decay of displayed rpm over ~2s.
  - `brake`: linear decay over ~0.3s.
  - `null` / unset: immediate stop.

### 6.4 Non-goals for the lib

- No SVG generation. SVG markup lives inline in each HTML file, making it easy to tweak per-widget.
- No physics. Speed/rpm are visual knobs, not derived.
- No drag or 3D interactions.
- No sound, no haptics.

## 7. Animation 1 — `anim-cell`

### 7.1 Concept

One cell, two wires, one motor. A single bipolar voltage slider (−vmax ... 0 ... +vmax) that controls both speed AND direction. Sliding through zero reverses everything smoothly.

### 7.2 Layout (one SVG, viewBox ~900×280)

```text
        ─4V  [━━━━━━━●━━━━━━━]  +4V
                     │
            Voltage · push, pull, or hold at zero

┌─────────────────────────────────────────────────────────┐
│                                                         │
│   ┌──────┐   ▪ ▪ ▪ ▪ ▪ ▪ →    ┌─────────────┐          │
│   │ CELL │                     │   MOTOR     │          │
│   │ 3.7V │                     │  ⟳ 120 rpm  │          │
│   └──────┘   ← ▪ ▪ ▪ ▪ ▪ ▪    └─────────────┘          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

- **Cell block** — flat rect, 140×80, labeled `CELL · {voltage} V` (live).
- **Motor block** — flat rect, 180×100, containing two children:
  - `<g class="rotor">` — a simple cross/shaft drawing centered inside the rect; rotated by CSS keyframes when `.spinning` class is set.
  - A static text label positioned inside the rect (below the rotor): `MOTOR · {rpm} rpm {⟳|⟲|stopped}`. Updated by `render()` via `textContent`.
- **Two straight horizontal wires** as `<line>` elements. Top wire: cell+ to motor-A. Bottom wire: motor-B to cell−. Both are hosts for `flowElectrons`.
- Moving squares are blue (`--blue`), 6×6px, evenly spaced at rest. Density is constant; visual speed comes from rAF position updates.

### 7.3 State

```js
{ voltage: 0 }   // signed Number in [-vmax, +vmax]
```

All derivations live inside `render(state)`:

```js
const mag = Math.abs(state.voltage);
const dir = Math.sign(state.voltage);  // -1 | 0 | +1
topWire.update({ speed: mag, direction: dir });
bottomWire.update({ speed: mag, direction: -dir });  // return path
motor.update({ rpm: mag * 30, direction: dir });
readoutEl.textContent = formatReadout(state.voltage);
cellEl.querySelector('.v-label').textContent = `${state.voltage.toFixed(1)} V`;
```

Readout text:
- `voltage > 0.05`: `"+{v} V → forward"`
- `voltage < −0.05`: `"−{|v|} V → reverse"`
- otherwise: `"0.0 V — motor stopped"`

### 7.4 Interaction

`<input type="range" min="-vmax" max="vmax" step="0.1" value="0">` above the SVG, centered, full-width up to 420px. A CSS pseudo-element draws a notch at the center (0V) of the track. `oninput` updates `state.voltage` and calls `render()`.

### 7.5 Defaults

- `vmax` = 4.0 (matches 18650 nominal range comfortably)
- initial `voltage` = 0.0 (invites the reader to push it)
- rpm scale factor = 30 (so 4V → 120 rpm, a pleasant visible spin)

### 7.6 Init signature

```js
Anims.initCell("anim-cell-root", { vmax: 4.0 });
```

Called from a `<script>` at the bottom of `anim-cell.html` after the SVG is in the DOM.

## 8. Animation 2 — `anim-hbridge`

### 8.1 Concept

Two 18650s → TB6612FNG → motor. User picks one of 4 modes (Forward / Backward / Coast / Brake); the 4 MOSFETs inside the TB6612FNG light up accordingly; current reroutes; motor spins the new direction. The "aha": same wires, opposite current, because different switches are closed.

### 8.2 Layout (one SVG, viewBox ~1000×420)

```text
                              PWMA   [━━━━●━━━━━]   192/255
                    Forward ▣  Backward ▢  Coast ▢  Brake ▢

┌────────┐              ┌─── TB6612FNG ───────┐         ┌───────────┐
│ ESP32  │ AIN1 ●───────│─▶ [Q1]         [Q2]│         │           │
│AIN1=H  │ AIN2 ●───────│─▶                   │── AO1 ─▶│  MOTOR ⟳  │
│AIN2=L  │ PWMA ●───────│─▶                   │── AO2 ─▶│           │
│PWMA=192│              │   ●──▪─▪─▪─▪─▪──●   │         └───────────┘
└────────┘              │   [Q3]         [Q4] │              │
                        └─────────────────────┘              ▼
                                                       ┌─────────┐
                                                       │ 2x18650 │
                                                       │  7.4V   │
                                                       └─────────┘
```

- **ESP32 block (left):** flat rect, internal text shows live `AIN1 = HIGH`, `AIN2 = LOW`, `PWMA = 192`.
- **TB6612FNG block (center):** dashed outline. Inside: 4 small MOSFET rects labeled `Q1 Q2 Q3 Q4` at the corners of an "H" topology. VM rail across the top, GND rail across the bottom, A and B midpoints exit right.
- **Motor block (top-right):** rotor that spins.
- **Battery block (bottom-right):** two stacked cells labeled `18650`, combined `7.4V`, two wires (VM up + GND up) joining the TB6612FNG rails.

### 8.3 State

```js
{
  mode: 'forward',  // 'forward' | 'backward' | 'coast' | 'brake'
  pwm: 192,         // 0..255
}
```

### 8.4 Lookup table (single source of truth)

```js
const MODES = {
  forward:  { ain1: 'H', ain2: 'L', mosfets: { Q1:1, Q2:0, Q3:0, Q4:1 }, motorDir:+1 },
  backward: { ain1: 'L', ain2: 'H', mosfets: { Q1:0, Q2:1, Q3:1, Q4:0 }, motorDir:-1 },
  coast:    { ain1: 'L', ain2: 'L', mosfets: { Q1:0, Q2:0, Q3:0, Q4:0 }, motorDir: 0, decay:'coast' },
  brake:    { ain1: 'H', ain2: 'H', mosfets: { Q1:0, Q2:0, Q3:1, Q4:1 }, motorDir: 0, decay:'brake' },
};
```

`render(state)`:

1. Update ESP32 text from `MODES[state.mode].ain1 / ain2` and `state.pwm`.
2. Toggle `.on` class on each MOSFET rect from `MODES[state.mode].mosfets`.
3. Configure the electron-flow engine for the currently active current path (`forward`: VM → Q1 → wire-A → motor → wire-B → Q4 → GND). Path segments stored in a const map keyed by mode.
4. Compute motor rpm: `(state.pwm / 255) * 120 * MODES[state.mode].motorDir`. In `coast` and `brake`, pass `decayModel` so the lib decelerates from the last active rpm.

### 8.5 Interaction

Two control surfaces, bidirectionally synced:

- **Mode buttons (primary):** `[Forward] [Backward] [Coast] [Brake]` as radio buttons. Clicking sets `mode`. Active button has `.active` class (filled background).
- **AIN toggles (secondary, below):** two pill switches `AIN1 [L | H]`, `AIN2 [L | H]`. Flipping either recomputes `mode` from the reverse lookup `{ HL: forward, LH: backward, LL: coast, HH: brake }`.
- **PWM slider:** `<input type="range" min="0" max="255" step="1" value="192">` above the SVG, centered, with caption "*Speed — PWM duty cycle*".

### 8.6 Init signature

```js
Anims.initHBridge("anim-hbridge-root");
```

No options; widget is opinionated for this specific hardware.

## 9. Animation 3 — `anim-car`

### 9.1 Concept

The full control loop: D-pad press → ESP32 GPIOs → TB6612FNG Channel A (left motors) + Channel B (right motors) → 4 wheels spin with correct direction. The "aha": tank-turning has no steering wheel; turning = sides spinning opposite directions.

### 9.2 Layout — vertical stack (3 regions)

On all viewports, the widget is a vertical stack:

```text
┌─────────── car view (top) ─────────────┐    <-- 1: physical outcome
│   ┌──┐                  ┌──┐           │
│   │L1│                  │R1│           │
│   │⟳ │                  │⟳ │           │
│   └──┘                  └──┘           │
│        ┌──────────┐                    │
│        │  (car)   │                    │
│        └──────────┘                    │
│   ┌──┐                  ┌──┐           │
│   │L2│                  │R2│           │
│   │⟳ │                  │⟳ │           │
│   └──┘                  └──┘           │
└────────────────────────────────────────┘

┌─────── control schematic (middle) ─────┐    <-- 2: internals
│  ESP32       TB6612FNG                 │
│  GPIO 27 ●──AIN1──▶ Ch A  → fwd 100%   │
│  GPIO 26 ●──AIN2──▶         wheels L   │
│  GPIO 14 ●──PWMA──▶                    │
│  GPIO 25 ●──BIN1──▶ Ch B  → fwd 100%   │
│  GPIO 33 ●──BIN2──▶         wheels R   │
│  GPIO 12 ●──PWMB──▶                    │
│                    2x18650 7.4V        │
└────────────────────────────────────────┘

              [ ↑ ]                          <-- 3: input (bottom)
         [ ← ][ ⬛ ][ → ]
              [ ↓ ]
```

Each region is its own `<div>` wrapping its own SVG (or, for the D-pad, a button grid). Stacked with CSS flex column; the wrapper has `max-width: 560px; margin: 0 auto`.

### 9.3 State

```js
{
  command: 'stop',  // 'up' | 'down' | 'left' | 'right' | 'stop'
  pwm: 255,         // fixed at full speed in v1
}
```

### 9.4 Command → channel states (the tank-turn truth table)

```js
const COMMANDS = {
  up:    { chA: 'forward',  chB: 'forward'  },
  down:  { chA: 'backward', chB: 'backward' },
  left:  { chA: 'backward', chB: 'forward'  },   // tank-turn left
  right: { chA: 'forward',  chB: 'backward' },   // tank-turn right
  stop:  { chA: 'coast',    chB: 'coast'    },
};
```

Each channel's mode then maps to GPIO states via the same `MODES` lookup from Animation 2, so the schematic region can display the 6 GPIO dots (AIN1, AIN2, PWMA, BIN1, BIN2, PWMB) with correct H/L/0-255.

### 9.5 Interaction

- **On-screen D-pad:** 4 direction buttons + central stop. `pointerdown` (or `click`) sets `command`. Click-to-latch — the button stays highlighted until a different command is issued. Tap the central `⬛` or the same direction twice to stop.
- **Keyboard (bonus):** arrow keys set command; Space/Escape = stop. Only active when the widget has focus. The widget's outer wrapper has `tabindex="0"` and a visible focus ring (`outline: 2px solid var(--focus)` on `:focus-visible`).
- **No press-and-hold** in v1.

### 9.6 Render

`render(state)`:

1. Resolve `{ chA, chB }` from `COMMANDS[state.command]`.
2. Resolve each channel's `{ ain1/ain2, mosfets, motorDir }` from `MODES[chX]`.
3. Update the 6 GPIO indicator rects in the schematic region (green `.on` class when HIGH or PWM active).
4. Update channel summary arrows/labels in the schematic (`→ fwd`, `← rev`, `coast`).
5. Call `spinMotor` on each of the 4 wheel rotors in the car region with the matching direction and rpm.
6. Animate flow squares along the two main current paths (battery → Ch A → left wheels → battery; battery → Ch B → right wheels → battery). When command = stop, flow freezes and rotors decay via coast model.

### 9.7 Init signature

```js
Anims.initCar("anim-car-root");
```

No options.

## 10. Responsiveness

All three widgets live inside a wrapper:

```css
.hw-anim {
  max-width: 720px;
  margin: 2rem auto;
  padding: 0 1rem;
  color: var(--ink);
  font-family: -apple-system, 'Segoe UI', system-ui, sans-serif;
  font-size: clamp(12px, 2.5vw, 14px);
}
.hw-anim svg { width: 100%; height: auto; display: block; }
.hw-controls { display: flex; gap: .75rem; justify-content: center; flex-wrap: wrap; margin: 1rem 0; }
```

| widget | desktop | mobile |
|-|-|-|
| anim-cell    | single horizontal SVG | same SVG scales; slider stays centered above |
| anim-hbridge | single horizontal SVG (3 blocks) | same SVG scales proportionally; at 340px wrapper it just fits; below 340px the SVG wrapper gets `overflow-x: auto` as a fallback |
| anim-car     | 3-region vertical stack | same vertical stack; D-pad and car region both `max-width: 360px` so they stay touch-friendly |

Minimum supported width: **340px** (comfortably covers any phone in current circulation).

## 11. Accessibility

- All controls are real `<input>` / `<button>` elements with visible labels; no div-as-button.
- Focus outlines preserved (`:focus-visible` ring).
- D-pad buttons have `aria-label="Move forward"` etc.
- Readouts update via `textContent`, no ARIA live regions needed since the user initiated the change.
- Motion-sensitive users: `prefers-reduced-motion: reduce` CSS rule freezes rotor spin and reduces square flow to a static dashed pattern. All state changes still reflect in text readouts.

## 12. Testing approach

Manual verification per widget in browsers (Safari, Chrome, Firefox) at three widths: 375px, 768px, 1280px. Specific checks:

- **anim-cell:** sliding through 0 smoothly reverses direction; at exactly 0 the motor stops and readout says "motor stopped"; readout signs match slider sign.
- **anim-hbridge:** each of 4 modes lights the correct MOSFETs; forward vs backward visibly shows squares moving opposite direction through the same two wires; PWM slider at 0 stops the motor; brake decelerates visibly faster than coast.
- **anim-car:** each of 5 commands produces the expected 4-wheel spin pattern (especially ← and → showing opposite sides); keyboard arrows work when focused; D-pad is touch-friendly (≥44×44px hit targets).

No automated tests in v1. The widgets are purely presentational with no data layer.

## 13. v2 polish (deferred)

- PWM flicker at low duty cycles (pulse the squares in on-off bursts hinting at the underlying waveform).
- Latency trail in anim-car (GPIO lights → channel state → wheel spin cascade with ~100ms stage delays so the reader sees direction of causation).
- Global "pause all animations" link.
- Tooltips on block labels explaining each component.
- Dark / light theme toggle.

## 14. Open questions

None at time of writing. All decisions recorded above are load-bearing for the implementation plan. If the author wants any of the v2 items pulled forward, they can flag during plan review.
