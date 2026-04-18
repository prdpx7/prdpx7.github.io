# Hardware-is-Hard Interactive Animations — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build three standalone interactive SVG animations (`anim-cell.html`, `anim-hbridge.html`, `anim-car.html`) that let readers manipulate voltage, H-bridge state, and D-pad commands to understand how a DIY 4WD robot car works electrically.

**Architecture:** Inline SVG + vanilla JS + CSS. A single shared library (`animations/hardware-anims.js`) provides two core primitives — `flowElectrons()` (moves 6×6 `<rect>` squares along SVG paths via `requestAnimationFrame` and `SVGPathElement.getPointAtLength`) and `spinMotor()` (drives CSS-keyframe rotation via custom properties) — plus DOM helpers and three widget init functions (`initCell`, `initHBridge`, `initCar`). Each HTML file contains inline SVG markup (so it's inspectable and tweakable), controls, and one inline `<script>` calling the appropriate init.

**Tech Stack:** HTML5, SVG, vanilla ES2020 JavaScript, CSS3 custom properties + keyframes. No bundler, no framework, no dependencies. Matches the existing `wiring-guide.html` stack.

**Reference spec:** `docs/superpowers/specs/2026-04-13-hardware-animations-design.md`

**Testing note:** Per spec §12, no automated tests in v1. Each task ends with a manual verification step: open a specific URL in a browser (use `python3 -m http.server 8000` from the repo root), confirm described behavior. Widgets are purely presentational — no data layer to unit-test.

**Working directory:** `/Users/pradeep.khileri@grofers.com/github.com/prdpx7/prdpx7.github.io/newblog` on branch `electronics`.

---

## File Structure

```text
newblog/
├── animations/
│   ├── hardware-anims.css          # NEW — palette + base widget styles + motor keyframes
│   └── hardware-anims.js           # NEW — shared library (IIFE exposing window.Anims)
├── anim-cell.html                  # NEW — Animation 1
├── anim-hbridge.html               # NEW — Animation 2
├── anim-car.html                   # NEW — Animation 3
└── _smoke.html                     # NEW (deleted at end) — scratch page for testing primitives
```

| file | responsibility |
|-|-|
| `hardware-anims.css` | palette as CSS custom properties; `.hw-anim` wrapper styles; rotor keyframes; shared control styles (slider, button, D-pad); `prefers-reduced-motion` rule |
| `hardware-anims.js` | `window.Anims` IIFE. Exposes: `PALETTE`, DOM helpers (`bindSlider`, `bindToggle`, `bindRadioGroup`, `bindPressHold`), primitives (`flowElectrons`, `spinMotor`), widget inits (`initCell`, `initHBridge`, `initCar`) |
| each `anim-*.html` | standalone HTML page with inline SVG, controls, and one inline `<script>` calling `Anims.init...()` |

---

## Task 1 — Scaffolding + palette + smoke test

Creates the directory, empty library skeleton, CSS palette, and a throwaway smoke-test page that loads them and confirms `window.Anims` is defined.

**Files:**
- Create: `animations/hardware-anims.css`
- Create: `animations/hardware-anims.js`
- Create: `_smoke.html`

- [ ] **Step 1: Create `animations/` directory**

```bash
mkdir -p animations
```

- [ ] **Step 2: Create `animations/hardware-anims.css` with palette + base styles**

```css
/* Hardware animations — shared styles */

:root {
  --bg: #1a1a1f;
  --panel: #161628;
  --ink: #c8c8d0;
  --dim: #555;
  --blue: #3498db;
  --green: #2ecc71;
  --yellow: #f1c40f;
  --red: #e74c3c;
  --purple: #9b59b6;
  --focus: #3498db;
}

body {
  background: var(--bg);
  color: var(--ink);
  font-family: -apple-system, 'Segoe UI', system-ui, sans-serif;
  margin: 0;
  padding: 2rem 1rem;
  line-height: 1.5;
}

.hw-anim {
  max-width: 720px;
  margin: 2rem auto;
  color: var(--ink);
  font-size: clamp(12px, 2.5vw, 14px);
}

.hw-anim svg {
  width: 100%;
  height: auto;
  display: block;
  background: var(--panel);
  border-radius: 4px;
}

.hw-anim .hw-caption {
  text-align: center;
  font-style: italic;
  color: var(--dim);
  font-size: 0.85em;
  margin: 0.5rem 0 1rem;
}

.hw-controls {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
  flex-wrap: wrap;
  margin: 1rem 0;
}

/* slider */
.hw-anim input[type="range"] {
  width: 100%;
  max-width: 420px;
  margin: 0.5rem auto;
  display: block;
}

/* buttons */
.hw-anim button {
  background: var(--panel);
  color: var(--ink);
  border: 1px solid var(--dim);
  padding: 0.4rem 0.9rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: inherit;
  font-family: inherit;
}
.hw-anim button.active {
  background: var(--blue);
  color: var(--bg);
  border-color: var(--blue);
}
.hw-anim button:hover:not(.active) {
  border-color: var(--ink);
}
.hw-anim button:focus-visible {
  outline: 2px solid var(--focus);
  outline-offset: 2px;
}

/* rotor spin — used by spinMotor() */
@keyframes rotor-spin {
  to { transform: rotate(360deg); }
}
.hw-anim .rotor {
  transform-origin: center;
  transform-box: fill-box;
}
.hw-anim .rotor.spinning {
  animation: rotor-spin var(--spin-duration, 1s) linear infinite;
}
.hw-anim .rotor.reverse {
  animation-direction: reverse;
}

/* reduced-motion — freeze rotation and flow */
@media (prefers-reduced-motion: reduce) {
  .hw-anim .rotor.spinning {
    animation: none;
  }
}
```

- [ ] **Step 3: Create `animations/hardware-anims.js` with IIFE skeleton**

```javascript
/* Hardware animations — shared library.
   Exposes window.Anims with primitives, DOM helpers, and per-widget inits. */

window.Anims = (() => {
  'use strict';

  const PALETTE = {
    bg: '#1a1a1f', panel: '#161628', ink: '#c8c8d0', dim: '#555',
    blue: '#3498db', green: '#2ecc71', yellow: '#f1c40f',
    red: '#e74c3c', purple: '#9b59b6', focus: '#3498db',
  };

  // --- DOM helpers (filled in Task 2) ---
  function bindSlider(inputEl, onChange) { throw new Error('not implemented'); }
  function bindToggle(buttonEl, onChange) { throw new Error('not implemented'); }
  function bindRadioGroup(buttonEls, onChange) { throw new Error('not implemented'); }
  function bindPressHold(btnEl, onDown, onUp) { throw new Error('not implemented'); }

  // --- Primitives (filled in Tasks 3 & 4) ---
  function spinMotor(rotorEl, initialState) { throw new Error('not implemented'); }
  function flowElectrons(pathEl, initialState) { throw new Error('not implemented'); }

  // --- Widget inits (filled in Tasks 5, 6, 7) ---
  function initCell(rootId, opts) { throw new Error('not implemented'); }
  function initHBridge(rootId) { throw new Error('not implemented'); }
  function initCar(rootId) { throw new Error('not implemented'); }

  return {
    PALETTE,
    bindSlider, bindToggle, bindRadioGroup, bindPressHold,
    spinMotor, flowElectrons,
    initCell, initHBridge, initCar,
  };
})();
```

- [ ] **Step 4: Create `_smoke.html` smoke-test page**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Smoke test</title>
  <link rel="stylesheet" href="animations/hardware-anims.css">
</head>
<body>
  <div class="hw-anim">
    <h1 style="font-size: 1rem">Smoke test</h1>
    <p id="status">checking...</p>
  </div>
  <script src="animations/hardware-anims.js"></script>
  <script>
    const status = document.getElementById('status');
    if (window.Anims && typeof window.Anims.PALETTE === 'object') {
      status.textContent = `OK — Anims loaded. Palette keys: ${Object.keys(window.Anims.PALETTE).join(', ')}`;
      status.style.color = window.Anims.PALETTE.green;
    } else {
      status.textContent = 'FAIL — Anims not defined';
      status.style.color = 'red';
    }
  </script>
</body>
</html>
```

- [ ] **Step 5: Serve + verify**

Start a local server (in a separate terminal, leave it running for the whole plan):

```bash
cd /Users/pradeep.khileri@grofers.com/github.com/prdpx7/prdpx7.github.io/newblog
python3 -m http.server 8000
```

Open `http://localhost:8000/_smoke.html` in a browser.

Expected: status text reads `OK — Anims loaded. Palette keys: bg, panel, ink, dim, blue, green, yellow, red, purple, focus`, colored green. Background is dark.

- [ ] **Step 6: Commit**

```bash
git add animations/hardware-anims.css animations/hardware-anims.js _smoke.html
git commit -m "animations: scaffold shared library and palette"
```

---

## Task 2 — DOM helpers

Implement the four DOM binding helpers. These are small and synchronous; verifying is a matter of clicking around in the smoke page.

**Files:**
- Modify: `animations/hardware-anims.js` (replace the `bindSlider/Toggle/RadioGroup/PressHold` stubs)
- Modify: `_smoke.html` (add interactive test harness)

- [ ] **Step 1: Replace DOM helper stubs in `hardware-anims.js`**

Find the "DOM helpers" block and replace it with:

```javascript
  // --- DOM helpers ---

  function bindSlider(inputEl, onChange) {
    const handler = () => onChange(Number(inputEl.value));
    inputEl.addEventListener('input', handler);
    handler();  // fire once to sync initial state
    return () => inputEl.removeEventListener('input', handler);
  }

  function bindToggle(buttonEl, onChange) {
    let state = buttonEl.getAttribute('aria-pressed') === 'true';
    const handler = () => {
      state = !state;
      buttonEl.setAttribute('aria-pressed', String(state));
      onChange(state);
    };
    buttonEl.addEventListener('click', handler);
    return () => buttonEl.removeEventListener('click', handler);
  }

  function bindRadioGroup(buttonEls, onChange) {
    const handler = (ev) => {
      const btn = ev.currentTarget;
      const value = btn.dataset.value;
      buttonEls.forEach(b => b.classList.toggle('active', b === btn));
      onChange(value);
    };
    buttonEls.forEach(b => b.addEventListener('click', handler));
    return () => buttonEls.forEach(b => b.removeEventListener('click', handler));
  }

  function bindPressHold(btnEl, onDown, onUp) {
    let isDown = false;
    const down = (ev) => {
      if (isDown) return;
      isDown = true;
      ev.preventDefault();
      onDown();
    };
    const up = () => {
      if (!isDown) return;
      isDown = false;
      onUp();
    };
    btnEl.addEventListener('pointerdown', down);
    btnEl.addEventListener('pointerup', up);
    btnEl.addEventListener('pointercancel', up);
    btnEl.addEventListener('pointerleave', up);
    btnEl.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') down(e);
    });
    btnEl.addEventListener('keyup', (e) => {
      if (e.key === ' ' || e.key === 'Enter') up();
    });
    return () => { /* listeners are on element; drop references */ };
  }
```

- [ ] **Step 2: Extend `_smoke.html` with a helper test harness**

Replace the contents of `<div class="hw-anim">` with:

```html
    <h1 style="font-size: 1rem">Smoke test — DOM helpers</h1>
    <p id="status"></p>

    <p>Slider test: <input type="range" id="test-slider" min="0" max="10" value="3"> <span id="slider-val">-</span></p>

    <p>Toggle test: <button id="test-toggle" aria-pressed="false">Toggle</button> <span id="toggle-val">-</span></p>

    <p>Radio test:
      <button class="r" data-value="a">A</button>
      <button class="r" data-value="b">B</button>
      <button class="r" data-value="c">C</button>
      <span id="radio-val">-</span>
    </p>

    <p>Press-hold test: <button id="test-hold">Hold me</button> <span id="hold-val">idle</span></p>
```

Replace the existing smoke `<script>` body (after `</div>`) with:

```html
  <script src="animations/hardware-anims.js"></script>
  <script>
    Anims.bindSlider(document.getElementById('test-slider'),
      v => document.getElementById('slider-val').textContent = v);
    Anims.bindToggle(document.getElementById('test-toggle'),
      v => document.getElementById('toggle-val').textContent = v);
    Anims.bindRadioGroup([...document.querySelectorAll('.r')],
      v => document.getElementById('radio-val').textContent = v);
    Anims.bindPressHold(document.getElementById('test-hold'),
      () => document.getElementById('hold-val').textContent = 'DOWN',
      () => document.getElementById('hold-val').textContent = 'UP');
  </script>
```

- [ ] **Step 3: Verify in browser**

Reload `http://localhost:8000/_smoke.html`.

Expected:
- Dragging the slider updates the number next to it live.
- Clicking the toggle button flips "true" / "false" next to it.
- Clicking each radio button (A/B/C) highlights it with the blue fill, updates the value.
- Pressing-and-holding "Hold me" shows `DOWN`; releasing shows `UP`. Works with keyboard (Tab to focus, Space to hold).

- [ ] **Step 4: Commit**

```bash
git add animations/hardware-anims.js _smoke.html
git commit -m "animations: implement DOM helpers"
```

---

## Task 3 — `spinMotor` primitive

Implements motor spin with coast/brake deceleration models.

**Files:**
- Modify: `animations/hardware-anims.js` (replace the `spinMotor` stub)
- Modify: `_smoke.html` (add a rotor test)

- [ ] **Step 1: Replace `spinMotor` stub in `hardware-anims.js`**

Find the "Primitives" section and replace the `spinMotor` stub with:

```javascript
  // --- spinMotor ---
  function spinMotor(rotorEl, initialState) {
    const state = { rpm: 0, direction: 0, decayModel: null, ...initialState };
    let displayRpm = 0;
    let lastTick = performance.now();
    let rafId = null;

    function apply() {
      // Hide rotation entirely when displayRpm ~ 0
      if (displayRpm < 1) {
        rotorEl.classList.remove('spinning', 'reverse');
        return;
      }
      rotorEl.style.setProperty('--spin-duration', `${60 / displayRpm}s`);
      rotorEl.classList.add('spinning');
      rotorEl.classList.toggle('reverse', state.direction < 0);
    }

    function tick(now) {
      const dt = (now - lastTick) / 1000;
      lastTick = now;
      const target = Math.abs(state.rpm);

      if (state.decayModel && target === 0 && displayRpm > 0) {
        // coast: ~2s to stop; brake: ~0.3s to stop
        const decayRate = state.decayModel === 'brake' ? (displayRpm / 0.3) : (displayRpm / 2);
        displayRpm = Math.max(0, displayRpm - decayRate * dt);
      } else {
        displayRpm = target;
      }
      apply();
      if (displayRpm > 0 || target > 0) {
        rafId = requestAnimationFrame(tick);
      } else {
        rafId = null;
      }
    }

    function update(partial) {
      Object.assign(state, partial);
      if (rafId === null) {
        lastTick = performance.now();
        rafId = requestAnimationFrame(tick);
      }
    }

    function destroy() {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rotorEl.classList.remove('spinning', 'reverse');
    }

    update({});  // kick off initial apply
    return { update, destroy };
  }
```

- [ ] **Step 2: Add a rotor test to `_smoke.html`**

After the press-hold paragraph, inside `<div class="hw-anim">`, add:

```html
    <p>Motor test:</p>
    <svg viewBox="0 0 200 120" style="width: 200px; background: var(--panel)">
      <rect x="20" y="20" width="160" height="80" fill="none" stroke="#555"/>
      <g class="rotor" transform="translate(100 60)">
        <rect x="-30" y="-4" width="60" height="8" fill="#f1c40f"/>
        <rect x="-4" y="-30" width="8" height="60" fill="#f1c40f"/>
        <circle r="6" fill="#e74c3c"/>
      </g>
    </svg>
    <br>
    <button id="m-fwd">Fwd 120rpm</button>
    <button id="m-rev">Rev 60rpm</button>
    <button id="m-coast">Coast (decay)</button>
    <button id="m-brake">Brake (decay)</button>
    <button id="m-stop">Stop immediately</button>
```

Append to the inline `<script>`:

```javascript
    const motor = Anims.spinMotor(document.querySelector('.rotor'), {});
    document.getElementById('m-fwd').onclick = () => motor.update({ rpm: 120, direction: 1, decayModel: null });
    document.getElementById('m-rev').onclick = () => motor.update({ rpm: 60, direction: -1, decayModel: null });
    document.getElementById('m-coast').onclick = () => motor.update({ rpm: 0, decayModel: 'coast' });
    document.getElementById('m-brake').onclick = () => motor.update({ rpm: 0, decayModel: 'brake' });
    document.getElementById('m-stop').onclick = () => motor.update({ rpm: 0, decayModel: null });
```

- [ ] **Step 3: Verify in browser**

Reload `http://localhost:8000/_smoke.html`.

Expected:
- "Fwd 120rpm": rotor spins clockwise fast (~2 rotations/sec).
- "Rev 60rpm": rotor spins counter-clockwise at half speed.
- "Coast": rotor decelerates smoothly over ~2 seconds, then stops.
- "Brake": rotor decelerates quickly (~0.3s), then stops.
- "Stop immediately": rotor halts on the current frame.

- [ ] **Step 4: Commit**

```bash
git add animations/hardware-anims.js _smoke.html
git commit -m "animations: implement spinMotor primitive with coast/brake decay"
```

---

## Task 4 — `flowElectrons` primitive

The core primitive — moves squares along an SVG path. Used by all three widgets.

**Files:**
- Modify: `animations/hardware-anims.js` (replace `flowElectrons` stub)
- Modify: `_smoke.html` (add flow test)

- [ ] **Step 1: Replace `flowElectrons` stub in `hardware-anims.js`**

```javascript
  // --- flowElectrons ---
  const SVG_NS = 'http://www.w3.org/2000/svg';

  function flowElectrons(pathEl, initialState) {
    const state = {
      speed: 0,          // 0..~4 abstract units
      direction: 1,      // -1 | 0 | +1
      paused: false,
      color: PALETTE.blue,
      count: 8,          // number of squares along the path
      size: 6,           // pixel size of each square
      ...initialState,
    };

    const host = pathEl.parentNode;
    if (!host) throw new Error('pathEl must be in the DOM before flowElectrons');

    // Create squares
    const L = pathEl.getTotalLength();
    const squares = [];
    for (let i = 0; i < state.count; i++) {
      const r = document.createElementNS(SVG_NS, 'rect');
      r.setAttribute('width', state.size);
      r.setAttribute('height', state.size);
      r.setAttribute('fill', state.color);
      r.dataset.t = String(i / state.count);
      host.appendChild(r);
      squares.push(r);
    }

    let rafId = null;
    let lastTick = performance.now();

    function placeAt(r, t) {
      const p = pathEl.getPointAtLength(t * L);
      r.setAttribute('x', p.x - state.size / 2);
      r.setAttribute('y', p.y - state.size / 2);
    }

    function tick(now) {
      const dt = (now - lastTick) / 1000;
      lastTick = now;

      // speed in path-length per second: 1 full traversal takes (1 / (speed * BASE)) seconds
      const BASE = 0.25;  // tuned for visual pleasantness at speed=4
      const delta = state.speed * BASE * dt * state.direction;

      for (const r of squares) {
        let t = Number(r.dataset.t) + delta;
        // wrap [0, 1)
        t = ((t % 1) + 1) % 1;
        r.dataset.t = String(t);
        placeAt(r, t);
      }

      if (!state.paused && state.speed > 0 && state.direction !== 0) {
        rafId = requestAnimationFrame(tick);
      } else {
        // draw once more at rest, then halt
        for (const r of squares) placeAt(r, Number(r.dataset.t));
        rafId = null;
      }
    }

    function update(partial) {
      Object.assign(state, partial);
      if (partial.color) squares.forEach(r => r.setAttribute('fill', state.color));
      if (rafId === null && !state.paused && state.speed > 0 && state.direction !== 0) {
        lastTick = performance.now();
        rafId = requestAnimationFrame(tick);
      }
    }

    function destroy() {
      if (rafId !== null) cancelAnimationFrame(rafId);
      squares.forEach(r => r.remove());
    }

    // initial placement so squares show even when stopped
    for (const r of squares) placeAt(r, Number(r.dataset.t));

    return { update, destroy };
  }
```

- [ ] **Step 2: Add a flow test to `_smoke.html`**

After the motor test `<button>`s, add:

```html
    <p>Flow test:</p>
    <svg viewBox="0 0 400 100" style="width: 400px; background: var(--panel)">
      <g class="electrons-host">
        <path id="test-path" d="M20,50 L380,50" stroke="#555" stroke-width="1" fill="none"/>
      </g>
    </svg>
    <br>
    <button id="f-off">Speed 0</button>
    <button id="f-slow">Speed 1</button>
    <button id="f-fast">Speed 4</button>
    <button id="f-rev">Reverse</button>
    <button id="f-fwd">Forward</button>
```

Append to the inline `<script>`:

```javascript
    const flow = Anims.flowElectrons(document.getElementById('test-path'),
      { speed: 0, direction: 1 });
    document.getElementById('f-off').onclick  = () => flow.update({ speed: 0 });
    document.getElementById('f-slow').onclick = () => flow.update({ speed: 1 });
    document.getElementById('f-fast').onclick = () => flow.update({ speed: 4 });
    document.getElementById('f-rev').onclick  = () => flow.update({ direction: -1, speed: 2 });
    document.getElementById('f-fwd').onclick  = () => flow.update({ direction:  1, speed: 2 });
```

- [ ] **Step 3: Verify in browser**

Reload `http://localhost:8000/_smoke.html`.

Expected:
- 8 blue squares evenly spaced along the horizontal line.
- "Speed 0": squares are frozen in place.
- "Speed 1": squares drift slowly rightward, wrapping around.
- "Speed 4": squares move visibly faster.
- "Reverse": squares drift leftward.
- "Forward": squares drift rightward again.

- [ ] **Step 4: Commit**

```bash
git add animations/hardware-anims.js _smoke.html
git commit -m "animations: implement flowElectrons primitive"
```

---

## Task 5 — Animation 1: `anim-cell.html`

The first real widget. Bipolar voltage slider → motor spins, direction reverses when voltage goes negative.

**Files:**
- Create: `anim-cell.html`
- Modify: `animations/hardware-anims.js` (implement `initCell`)

- [ ] **Step 1: Create `anim-cell.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Animation 1 — Voltage and Motor</title>
  <link rel="stylesheet" href="animations/hardware-anims.css">
</head>
<body>

<figure class="hw-anim" id="anim-cell-root">
  <div class="hw-caption">Voltage &middot; push, pull, or hold at zero</div>
  <div class="hw-controls">
    <span style="color:var(--dim)">&minus;4V</span>
    <input type="range" id="v-slider" min="-4" max="4" step="0.1" value="0">
    <span style="color:var(--dim)">+4V</span>
  </div>

  <svg viewBox="0 0 900 280" aria-label="A cell connected to a motor by two wires; voltage controls electron flow direction and motor spin.">
    <!-- cell block -->
    <rect x="60" y="100" width="140" height="80" fill="var(--panel)" stroke="var(--dim)" stroke-width="1"/>
    <text x="130" y="135" text-anchor="middle" font-size="14" fill="var(--ink)" font-weight="600">CELL</text>
    <text x="130" y="160" text-anchor="middle" font-size="12" fill="var(--ink)" font-family="monospace" class="v-label">0.0 V</text>

    <!-- top wire (cell+ -> motor A): host for electrons -->
    <g class="electrons-host">
      <line id="wire-top" x1="200" y1="120" x2="640" y2="120" stroke="var(--dim)" stroke-width="2"/>
    </g>

    <!-- bottom wire (motor B -> cell-): host for electrons -->
    <g class="electrons-host">
      <line id="wire-bot" x1="200" y1="160" x2="640" y2="160" stroke="var(--dim)" stroke-width="2"/>
    </g>

    <!-- motor block -->
    <rect x="640" y="90" width="180" height="100" fill="var(--panel)" stroke="var(--dim)" stroke-width="1"/>
    <g class="rotor" transform="translate(730 140)">
      <rect x="-25" y="-3" width="50" height="6" fill="var(--yellow)"/>
      <rect x="-3" y="-25" width="6" height="50" fill="var(--yellow)"/>
      <circle r="5" fill="var(--red)"/>
    </g>
    <text x="730" y="110" text-anchor="middle" font-size="14" fill="var(--ink)" font-weight="600">MOTOR</text>
    <text x="730" y="180" text-anchor="middle" font-size="12" fill="var(--ink)" font-family="monospace" class="rpm-label">stopped</text>
  </svg>

  <div id="v-readout" style="text-align: center; margin-top: 1rem; font-family: monospace; font-size: 14px;">0.0 V &mdash; motor stopped</div>
</figure>

<script src="animations/hardware-anims.js"></script>
<script>
  Anims.initCell('anim-cell-root', { vmax: 4.0 });
</script>

</body>
</html>
```

- [ ] **Step 2: Replace `initCell` stub in `hardware-anims.js`**

```javascript
  // --- initCell ---
  function initCell(rootId, opts) {
    const root = document.getElementById(rootId);
    if (!root) throw new Error(`initCell: no element with id ${rootId}`);
    const vmax = (opts && opts.vmax) || 4.0;

    const slider = root.querySelector('#v-slider');
    slider.min = -vmax;
    slider.max = vmax;

    const wireTop = root.querySelector('#wire-top');
    const wireBot = root.querySelector('#wire-bot');
    const rotor = root.querySelector('.rotor');
    const readout = root.querySelector('#v-readout');
    const vLabel = root.querySelector('.v-label');
    const rpmLabel = root.querySelector('.rpm-label');

    const topFlow = flowElectrons(wireTop, { speed: 0, direction: 1, color: PALETTE.blue });
    const botFlow = flowElectrons(wireBot, { speed: 0, direction: -1, color: PALETTE.blue });
    const motor = spinMotor(rotor, { rpm: 0, direction: 0 });

    const state = { voltage: 0 };

    function render() {
      const v = state.voltage;
      const mag = Math.abs(v);
      const dir = v > 0.05 ? 1 : v < -0.05 ? -1 : 0;
      const rpm = mag * 30;

      topFlow.update({ speed: mag, direction: dir });
      botFlow.update({ speed: mag, direction: -dir });
      motor.update({ rpm: dir === 0 ? 0 : rpm, direction: dir });

      vLabel.textContent = `${v.toFixed(1)} V`;
      if (dir === 0) {
        readout.textContent = '0.0 V — motor stopped';
        rpmLabel.textContent = 'stopped';
      } else if (dir > 0) {
        readout.textContent = `+${v.toFixed(1)} V → forward`;
        rpmLabel.textContent = `${Math.round(rpm)} rpm ⟳`;
      } else {
        readout.textContent = `${v.toFixed(1)} V → reverse`;
        rpmLabel.textContent = `${Math.round(rpm)} rpm ⟲`;
      }
    }

    bindSlider(slider, v => { state.voltage = v; render(); });

    return function destroy() {
      topFlow.destroy();
      botFlow.destroy();
      motor.destroy();
    };
  }
```

- [ ] **Step 3: Verify in browser at desktop width**

Open `http://localhost:8000/anim-cell.html`.

Expected at initial load:
- Slider centered at 0, motor stopped, electron squares frozen, readout `0.0 V — motor stopped`.
- Drag slider to +4: motor spins clockwise, squares drift toward the motor on the top wire, back toward the cell on the bottom wire, readout `+4.0 V → forward`, rpm label `120 rpm ⟳`.
- Drag through 0: motion smoothly reverses direction.
- At −4: motor spins counterclockwise, top-wire squares drift toward the cell, bottom-wire squares toward the motor, readout `−4.0 V → reverse`.

- [ ] **Step 4: Verify at mobile width**

Open DevTools → toggle device toolbar → select iPhone SE (375×667). Reload.

Expected:
- SVG shrinks proportionally to page width.
- Controls still readable.
- Slider still tall enough for touch (≥40px high).
- No horizontal scroll.

- [ ] **Step 5: Commit**

```bash
git add anim-cell.html animations/hardware-anims.js
git commit -m "animations: anim-cell (Animation 1) — bipolar voltage slider"
```

---

## Task 6 — Animation 2: `anim-hbridge.html`

Complex one. ESP32 + TB6612FNG (with 4 visible MOSFETs) + motor + battery. 4 mode buttons + 2 AIN toggles + PWM slider. Clear current-path rendering per mode.

**Files:**
- Create: `anim-hbridge.html`
- Modify: `animations/hardware-anims.js` (implement `initHBridge`)

- [ ] **Step 1: Create `anim-hbridge.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Animation 2 — H-bridge</title>
  <link rel="stylesheet" href="animations/hardware-anims.css">
  <style>
    /* mode buttons */
    .hw-anim .mode-row { display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; }
    .hw-anim .toggles { display: flex; gap: 1rem; justify-content: center; margin: 0.5rem 0; font-family: monospace; font-size: 12px; color: var(--dim); }
    .hw-anim .toggles button { padding: 0.15rem 0.5rem; font-size: 12px; }

    /* MOSFETs */
    .mosfet { fill: var(--panel); stroke: var(--dim); }
    .mosfet.on { fill: var(--green); stroke: var(--green); }
    .mosfet-label { font-family: monospace; font-size: 11px; fill: var(--ink); }
  </style>
</head>
<body>

<figure class="hw-anim" id="anim-hbridge-root">
  <div class="hw-caption">Speed &middot; PWM duty cycle</div>
  <div class="hw-controls">
    <span style="color:var(--dim)">0</span>
    <input type="range" id="pwm-slider" min="0" max="255" step="1" value="192">
    <span style="color:var(--dim)">255</span>
  </div>
  <div class="hw-controls mode-row">
    <button data-mode="forward" class="mode active">Forward</button>
    <button data-mode="backward" class="mode">Backward</button>
    <button data-mode="coast" class="mode">Coast</button>
    <button data-mode="brake" class="mode">Brake</button>
  </div>
  <div class="toggles">
    <span>AIN1: <button id="ain1-toggle" aria-pressed="true">HIGH</button></span>
    <span>AIN2: <button id="ain2-toggle" aria-pressed="false">LOW</button></span>
  </div>

  <svg viewBox="0 0 1000 420" aria-label="H-bridge animation showing ESP32 driving a TB6612FNG that controls a motor via four MOSFETs.">
    <!-- ESP32 block -->
    <rect x="20" y="80" width="180" height="220" fill="var(--panel)" stroke="var(--dim)"/>
    <text x="110" y="110" text-anchor="middle" font-size="14" fill="var(--ink)" font-weight="600">ESP32</text>
    <text x="40" y="160" font-size="12" fill="var(--ink)" font-family="monospace">AIN1 = <tspan id="esp-ain1">H</tspan></text>
    <text x="40" y="190" font-size="12" fill="var(--ink)" font-family="monospace">AIN2 = <tspan id="esp-ain2">L</tspan></text>
    <text x="40" y="220" font-size="12" fill="var(--ink)" font-family="monospace">PWMA= <tspan id="esp-pwm">192</tspan></text>
    <circle cx="200" cy="155" r="4" fill="var(--blue)"/>
    <circle cx="200" cy="185" r="4" fill="var(--green)"/>
    <circle cx="200" cy="215" r="4" fill="var(--purple)"/>

    <!-- ESP32 → TB6612FNG signal wires -->
    <line x1="200" y1="155" x2="360" y2="155" stroke="var(--blue)" stroke-width="1.5"/>
    <line x1="200" y1="185" x2="360" y2="185" stroke="var(--green)" stroke-width="1.5"/>
    <line x1="200" y1="215" x2="360" y2="215" stroke="var(--purple)" stroke-width="1.5"/>

    <!-- TB6612FNG block -->
    <rect x="360" y="60" width="300" height="260" fill="var(--panel)" stroke="var(--dim)" stroke-dasharray="4,3"/>
    <text x="510" y="85" text-anchor="middle" font-size="14" fill="var(--ink)" font-weight="600">TB6612FNG</text>

    <!-- MOSFETs Q1 (top-left), Q2 (top-right), Q3 (bot-left), Q4 (bot-right) -->
    <rect id="Q1" class="mosfet" x="395" y="115" width="50" height="40"/>
    <text class="mosfet-label" x="420" y="140" text-anchor="middle">Q1</text>
    <rect id="Q2" class="mosfet" x="575" y="115" width="50" height="40"/>
    <text class="mosfet-label" x="600" y="140" text-anchor="middle">Q2</text>
    <rect id="Q3" class="mosfet" x="395" y="225" width="50" height="40"/>
    <text class="mosfet-label" x="420" y="250" text-anchor="middle">Q3</text>
    <rect id="Q4" class="mosfet" x="575" y="225" width="50" height="40"/>
    <text class="mosfet-label" x="600" y="250" text-anchor="middle">Q4</text>

    <!-- VM rail and GND rail inside the TB6612FNG -->
    <line x1="400" y1="100" x2="620" y2="100" stroke="var(--red)" stroke-width="2"/>
    <text x="510" y="95" text-anchor="middle" font-size="10" fill="var(--red)" font-family="monospace">VM</text>
    <line x1="400" y1="295" x2="620" y2="295" stroke="var(--dim)" stroke-width="2"/>
    <text x="510" y="312" text-anchor="middle" font-size="10" fill="var(--dim)" font-family="monospace">GND</text>

    <!-- AO1 and AO2 are the motor output wires. Electrons flow here representing current to/from the motor.
         Forward mode: current exits AO1 (TBFNG -> motor) and returns via AO2 (motor -> TBFNG).
         Backward mode: reversed. -->
    <g class="electrons-host">
      <path id="wire-A" d="M 420,190 L 720,190" stroke="var(--yellow)" stroke-width="2" fill="none"/>
    </g>
    <text x="660" y="185" font-size="10" fill="var(--yellow)" font-family="monospace">AO1</text>
    <g class="electrons-host">
      <path id="wire-B" d="M 600,190 L 720,240" stroke="#95a5a6" stroke-width="2" fill="none"/>
    </g>
    <text x="660" y="235" font-size="10" fill="#95a5a6" font-family="monospace">AO2</text>

    <!-- Motor block -->
    <rect x="720" y="130" width="200" height="130" fill="var(--panel)" stroke="var(--dim)"/>
    <text x="820" y="155" text-anchor="middle" font-size="14" fill="var(--ink)" font-weight="600">MOTOR</text>
    <g class="rotor" transform="translate(820 205)">
      <rect x="-25" y="-3" width="50" height="6" fill="var(--yellow)"/>
      <rect x="-3" y="-25" width="6" height="50" fill="var(--yellow)"/>
      <circle r="5" fill="var(--red)"/>
    </g>
    <text x="820" y="250" text-anchor="middle" font-size="11" fill="var(--ink)" font-family="monospace" id="hb-rpm">stopped</text>

    <!-- Battery block -->
    <rect x="760" y="290" width="160" height="110" fill="var(--panel)" stroke="var(--dim)"/>
    <text x="840" y="315" text-anchor="middle" font-size="13" fill="var(--ink)" font-weight="600">2x 18650</text>
    <text x="840" y="340" text-anchor="middle" font-size="12" fill="var(--red)" font-family="monospace">+ 7.4 V</text>
    <text x="840" y="365" text-anchor="middle" font-size="11" fill="var(--dim)" font-family="monospace">GND</text>

    <!-- battery wires up to VM and GND rails -->
    <line x1="760" y1="325" x2="510" y2="100" stroke="var(--red)" stroke-width="2"/>
    <line x1="760" y1="360" x2="510" y2="295" stroke="var(--dim)" stroke-width="2"/>
  </svg>
</figure>

<script src="animations/hardware-anims.js"></script>
<script>
  Anims.initHBridge('anim-hbridge-root');
</script>

</body>
</html>
```

- [ ] **Step 2: Replace `initHBridge` stub in `hardware-anims.js`**

```javascript
  // --- initHBridge ---
  const HBRIDGE_MODES = {
    forward:  { ain1: 'H', ain2: 'L', mosfets: { Q1:1, Q2:0, Q3:0, Q4:1 }, motorDir:+1, decay: null },
    backward: { ain1: 'L', ain2: 'H', mosfets: { Q1:0, Q2:1, Q3:1, Q4:0 }, motorDir:-1, decay: null },
    coast:    { ain1: 'L', ain2: 'L', mosfets: { Q1:0, Q2:0, Q3:0, Q4:0 }, motorDir: 0, decay: 'coast' },
    brake:    { ain1: 'H', ain2: 'H', mosfets: { Q1:0, Q2:0, Q3:1, Q4:1 }, motorDir: 0, decay: 'brake' },
  };

  const AINS_TO_MODE = {
    'HL': 'forward', 'LH': 'backward', 'LL': 'coast', 'HH': 'brake',
  };

  function initHBridge(rootId) {
    const root = document.getElementById(rootId);
    if (!root) throw new Error(`initHBridge: no element with id ${rootId}`);

    const pwmSlider = root.querySelector('#pwm-slider');
    const modeBtns = [...root.querySelectorAll('.mode')];
    const ain1Btn = root.querySelector('#ain1-toggle');
    const ain2Btn = root.querySelector('#ain2-toggle');
    const rotor = root.querySelector('.rotor');
    const rpmLabel = root.querySelector('#hb-rpm');
    const espAin1 = root.querySelector('#esp-ain1');
    const espAin2 = root.querySelector('#esp-ain2');
    const espPwm = root.querySelector('#esp-pwm');

    const qEls = {
      Q1: root.querySelector('#Q1'),
      Q2: root.querySelector('#Q2'),
      Q3: root.querySelector('#Q3'),
      Q4: root.querySelector('#Q4'),
    };

    const wireA = root.querySelector('#wire-A');
    const wireB = root.querySelector('#wire-B');
    const flowA = flowElectrons(wireA, { speed: 0, color: PALETTE.blue });
    const flowB = flowElectrons(wireB, { speed: 0, color: PALETTE.blue });
    const motor = spinMotor(rotor, {});

    const state = { mode: 'forward', pwm: 192 };

    function setAinButton(btn, highLow) {
      btn.textContent = highLow;
      btn.setAttribute('aria-pressed', highLow === 'H' ? 'true' : 'false');
    }

    function render() {
      const m = HBRIDGE_MODES[state.mode];

      // ESP32 text
      espAin1.textContent = m.ain1;
      espAin2.textContent = m.ain2;
      espPwm.textContent = String(state.pwm);
      setAinButton(ain1Btn, m.ain1);
      setAinButton(ain2Btn, m.ain2);

      // MOSFETs
      for (const key of ['Q1', 'Q2', 'Q3', 'Q4']) {
        qEls[key].classList.toggle('on', m.mosfets[key] === 1);
      }

      // Mode button active state
      modeBtns.forEach(b => b.classList.toggle('active', b.dataset.mode === state.mode));

      // Flow + motor
      const dutyScale = state.pwm / 255;
      const rpm = m.motorDir === 0 ? 0 : dutyScale * 120;
      const flowSpeed = m.motorDir === 0 ? 0 : dutyScale * 4;

      // Forward: current A→B (down on wireA, up on wireB means B→A on path; using dir based on motorDir)
      flowA.update({ speed: flowSpeed, direction: m.motorDir });
      flowB.update({ speed: flowSpeed, direction: -m.motorDir });

      motor.update({ rpm, direction: m.motorDir, decayModel: m.decay });

      rpmLabel.textContent = m.motorDir === 0
        ? (m.decay === 'brake' ? 'braking' : 'coasting')
        : `${Math.round(rpm)} rpm ${m.motorDir > 0 ? '⟳' : '⟲'}`;
    }

    bindRadioGroup(modeBtns, mode => { state.mode = mode; render(); });
    bindSlider(pwmSlider, v => { state.pwm = v; render(); });

    ain1Btn.addEventListener('click', () => {
      const current = HBRIDGE_MODES[state.mode];
      const newAin1 = current.ain1 === 'H' ? 'L' : 'H';
      state.mode = AINS_TO_MODE[newAin1 + current.ain2];
      render();
    });
    ain2Btn.addEventListener('click', () => {
      const current = HBRIDGE_MODES[state.mode];
      const newAin2 = current.ain2 === 'H' ? 'L' : 'H';
      state.mode = AINS_TO_MODE[current.ain1 + newAin2];
      render();
    });

    render();

    return function destroy() {
      flowA.destroy();
      flowB.destroy();
      motor.destroy();
    };
  }
```

- [ ] **Step 3: Verify in browser**

Open `http://localhost:8000/anim-hbridge.html`.

Expected at initial load:
- Mode `Forward` button highlighted blue. ESP32 shows `AIN1 = H`, `AIN2 = L`, `PWMA = 192`. PWM slider at ~75%. AIN1 toggle shows "HIGH", AIN2 shows "LOW".
- Q1 and Q4 are filled green; Q2 and Q3 are dim/outlined.
- Electron squares flow outward on AO1 (TBFNG → motor) and inward on AO2 (motor → TBFNG), showing current loop through the motor.
- Motor rotor spins clockwise at visible speed. RPM label shows `90 rpm ⟳` (192/255 * 120 ≈ 90).

Click "Backward":
- Q2 and Q3 light up, Q1 and Q4 dim.
- Flow reverses direction.
- Motor spins counter-clockwise.
- ESP32 text updates to `AIN1 = L`, `AIN2 = H`.
- AIN1 toggle shows "LOW", AIN2 shows "HIGH".

Click "Coast":
- All MOSFETs dim.
- Flow stops.
- Motor decelerates smoothly (~2s).

Click "Brake":
- Q3 and Q4 light up, Q1 and Q2 dim.
- Flow stops.
- Motor decelerates quickly (~0.3s).

Drag PWM slider: motor RPM scales; flow speed scales; at 0 PWM motor stops.

Click AIN1 toggle (while in Forward): flips to "LOW" → mode becomes `coast`. Click AIN2 after: flips to "HIGH" → `backward`.

- [ ] **Step 4: Verify at mobile width (375px)**

Open DevTools → iPhone SE view. Reload.

Expected:
- SVG scales down to page width.
- Buttons wrap into 2 rows if needed.
- All interactions still work.

- [ ] **Step 5: Commit**

```bash
git add anim-hbridge.html animations/hardware-anims.js
git commit -m "animations: anim-hbridge (Animation 2) — 4-state H-bridge widget"
```

---

## Task 7 — Animation 3: `anim-car.html`

3-region vertical stack (car view, schematic, D-pad). Button press or arrow key sets one of 5 commands; tank-turn logic produces 4-wheel spin.

**Files:**
- Create: `anim-car.html`
- Modify: `animations/hardware-anims.js` (implement `initCar`)

- [ ] **Step 1: Create `anim-car.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Animation 3 — Full Car Loop</title>
  <link rel="stylesheet" href="animations/hardware-anims.css">
  <style>
    .hw-anim .region { background: var(--panel); border-radius: 4px; margin: 0 0 1rem; }
    .hw-anim .region svg { background: transparent; }

    /* D-pad */
    .dpad {
      display: grid;
      grid-template-columns: repeat(3, 60px);
      grid-template-rows: repeat(3, 60px);
      gap: 6px;
      justify-content: center;
      margin: 1rem auto;
    }
    .dpad button {
      width: 60px; height: 60px;
      font-size: 20px;
      padding: 0;
    }
    .dpad .up    { grid-column: 2; grid-row: 1; }
    .dpad .left  { grid-column: 1; grid-row: 2; }
    .dpad .stop  { grid-column: 2; grid-row: 2; }
    .dpad .right { grid-column: 3; grid-row: 2; }
    .dpad .down  { grid-column: 2; grid-row: 3; }

    #anim-car-root:focus-visible { outline: 2px solid var(--focus); outline-offset: 4px; }

    .gpio-dot { fill: var(--dim); }
    .gpio-dot.on { fill: var(--green); }
    .gpio-dot.on.pwm { fill: var(--purple); }
  </style>
</head>
<body>

<figure class="hw-anim" id="anim-car-root" tabindex="0" aria-label="Interactive 4-wheel robot car. Use arrow keys or the on-screen D-pad to drive.">

  <!-- Region 1: physical car view -->
  <div class="region">
    <svg viewBox="0 0 400 300" aria-label="Top-down view of 4-wheel car with labeled wheels L1, R1, L2, R2.">
      <!-- car ghost outline -->
      <rect x="130" y="90" width="140" height="120" fill="none" stroke="var(--dim)" stroke-dasharray="4,3" rx="10"/>
      <text x="200" y="155" text-anchor="middle" font-size="12" fill="var(--dim)" font-family="monospace">(car)</text>

      <!-- L1 (front-left) -->
      <rect x="70" y="60" width="50" height="50" fill="var(--panel)" stroke="var(--dim)"/>
      <text x="95" y="50" text-anchor="middle" font-size="12" fill="var(--ink)" font-family="monospace">L1</text>
      <g class="rotor" id="wheel-L1" transform="translate(95 85)">
        <rect x="-15" y="-3" width="30" height="6" fill="var(--yellow)"/>
        <rect x="-3" y="-15" width="6" height="30" fill="var(--yellow)"/>
        <circle r="4" fill="var(--red)"/>
      </g>

      <!-- R1 (front-right) -->
      <rect x="280" y="60" width="50" height="50" fill="var(--panel)" stroke="var(--dim)"/>
      <text x="305" y="50" text-anchor="middle" font-size="12" fill="var(--ink)" font-family="monospace">R1</text>
      <g class="rotor" id="wheel-R1" transform="translate(305 85)">
        <rect x="-15" y="-3" width="30" height="6" fill="var(--yellow)"/>
        <rect x="-3" y="-15" width="6" height="30" fill="var(--yellow)"/>
        <circle r="4" fill="var(--red)"/>
      </g>

      <!-- L2 (rear-left) -->
      <rect x="70" y="190" width="50" height="50" fill="var(--panel)" stroke="var(--dim)"/>
      <text x="95" y="260" text-anchor="middle" font-size="12" fill="var(--ink)" font-family="monospace">L2</text>
      <g class="rotor" id="wheel-L2" transform="translate(95 215)">
        <rect x="-15" y="-3" width="30" height="6" fill="var(--yellow)"/>
        <rect x="-3" y="-15" width="6" height="30" fill="var(--yellow)"/>
        <circle r="4" fill="var(--red)"/>
      </g>

      <!-- R2 (rear-right) -->
      <rect x="280" y="190" width="50" height="50" fill="var(--panel)" stroke="var(--dim)"/>
      <text x="305" y="260" text-anchor="middle" font-size="12" fill="var(--ink)" font-family="monospace">R2</text>
      <g class="rotor" id="wheel-R2" transform="translate(305 215)">
        <rect x="-15" y="-3" width="30" height="6" fill="var(--yellow)"/>
        <rect x="-3" y="-15" width="6" height="30" fill="var(--yellow)"/>
        <circle r="4" fill="var(--red)"/>
      </g>
    </svg>
  </div>

  <!-- Region 2: control schematic -->
  <div class="region">
    <svg viewBox="0 0 720 360" aria-label="Schematic showing ESP32 GPIO states, TB6612FNG channel directions, and battery.">
      <!-- ESP32 -->
      <rect x="20" y="40" width="170" height="280" fill="var(--panel)" stroke="var(--dim)"/>
      <text x="105" y="65" text-anchor="middle" font-size="13" fill="var(--ink)" font-weight="600">ESP32</text>

      <text x="40" y="100" font-size="11" fill="var(--ink)" font-family="monospace">GPIO 27</text>
      <circle cx="180" cy="97" r="5" class="gpio-dot" id="gp-ain1"/>
      <text x="40" y="130" font-size="11" fill="var(--ink)" font-family="monospace">GPIO 26</text>
      <circle cx="180" cy="127" r="5" class="gpio-dot" id="gp-ain2"/>
      <text x="40" y="160" font-size="11" fill="var(--ink)" font-family="monospace">GPIO 14</text>
      <circle cx="180" cy="157" r="5" class="gpio-dot pwm" id="gp-pwma"/>
      <text x="40" y="210" font-size="11" fill="var(--ink)" font-family="monospace">GPIO 25</text>
      <circle cx="180" cy="207" r="5" class="gpio-dot" id="gp-bin1"/>
      <text x="40" y="240" font-size="11" fill="var(--ink)" font-family="monospace">GPIO 33</text>
      <circle cx="180" cy="237" r="5" class="gpio-dot" id="gp-bin2"/>
      <text x="40" y="270" font-size="11" fill="var(--ink)" font-family="monospace">GPIO 12</text>
      <circle cx="180" cy="267" r="5" class="gpio-dot pwm" id="gp-pwmb"/>

      <!-- wires from ESP32 to TBFNG -->
      <line x1="180" y1="97"  x2="300" y2="97" stroke="var(--blue)" stroke-width="1.5"/>
      <line x1="180" y1="127" x2="300" y2="127" stroke="var(--green)" stroke-width="1.5"/>
      <line x1="180" y1="157" x2="300" y2="157" stroke="var(--purple)" stroke-width="1.5"/>
      <line x1="180" y1="207" x2="300" y2="207" stroke="var(--blue)" stroke-width="1.5"/>
      <line x1="180" y1="237" x2="300" y2="237" stroke="var(--green)" stroke-width="1.5"/>
      <line x1="180" y1="267" x2="300" y2="267" stroke="var(--purple)" stroke-width="1.5"/>

      <!-- TBFNG Channel A -->
      <rect x="300" y="75" width="250" height="100" fill="var(--panel)" stroke="var(--dim)" stroke-dasharray="4,3"/>
      <text x="425" y="98" text-anchor="middle" font-size="12" fill="var(--ink)" font-weight="600">Ch A — left motors</text>
      <text x="425" y="130" text-anchor="middle" font-size="14" fill="var(--ink)" font-family="monospace" id="ch-a-arrow">→ fwd</text>
      <text x="425" y="155" text-anchor="middle" font-size="11" fill="var(--ink)" font-family="monospace" id="ch-a-state">AIN1=H AIN2=L</text>

      <!-- TBFNG Channel B -->
      <rect x="300" y="185" width="250" height="100" fill="var(--panel)" stroke="var(--dim)" stroke-dasharray="4,3"/>
      <text x="425" y="208" text-anchor="middle" font-size="12" fill="var(--ink)" font-weight="600">Ch B — right motors</text>
      <text x="425" y="240" text-anchor="middle" font-size="14" fill="var(--ink)" font-family="monospace" id="ch-b-arrow">→ fwd</text>
      <text x="425" y="265" text-anchor="middle" font-size="11" fill="var(--ink)" font-family="monospace" id="ch-b-state">BIN1=H BIN2=L</text>

      <!-- flow paths from battery → channels → (abstract) motors -->
      <g class="electrons-host">
        <line id="flow-a" x1="550" y1="125" x2="640" y2="125" stroke="var(--dim)" stroke-width="1"/>
      </g>
      <g class="electrons-host">
        <line id="flow-b" x1="550" y1="235" x2="640" y2="235" stroke="var(--dim)" stroke-width="1"/>
      </g>
      <text x="660" y="128" font-size="10" fill="var(--dim)" font-family="monospace">L</text>
      <text x="660" y="238" font-size="10" fill="var(--dim)" font-family="monospace">R</text>

      <!-- Battery -->
      <rect x="280" y="305" width="160" height="50" fill="var(--panel)" stroke="var(--dim)"/>
      <text x="360" y="325" text-anchor="middle" font-size="12" fill="var(--ink)" font-weight="600">2x 18650</text>
      <text x="360" y="345" text-anchor="middle" font-size="11" fill="var(--red)" font-family="monospace">7.4 V</text>
    </svg>
  </div>

  <!-- Region 3: D-pad -->
  <div class="dpad" role="group" aria-label="Direction controls">
    <button class="up"    data-cmd="up"    aria-label="Drive forward">↑</button>
    <button class="left"  data-cmd="left"  aria-label="Turn left">←</button>
    <button class="stop active" data-cmd="stop" aria-label="Stop">■</button>
    <button class="right" data-cmd="right" aria-label="Turn right">→</button>
    <button class="down"  data-cmd="down"  aria-label="Reverse">↓</button>
  </div>

</figure>

<script src="animations/hardware-anims.js"></script>
<script>
  Anims.initCar('anim-car-root');
</script>

</body>
</html>
```

- [ ] **Step 2: Replace `initCar` stub in `hardware-anims.js`**

```javascript
  // --- initCar ---
  const CAR_COMMANDS = {
    up:    { chA: 'forward',  chB: 'forward'  },
    down:  { chA: 'backward', chB: 'backward' },
    left:  { chA: 'backward', chB: 'forward'  },
    right: { chA: 'forward',  chB: 'backward' },
    stop:  { chA: 'coast',    chB: 'coast'    },
  };

  function initCar(rootId) {
    const root = document.getElementById(rootId);
    if (!root) throw new Error(`initCar: no element with id ${rootId}`);

    const wheels = ['L1', 'R1', 'L2', 'R2'].map(id => ({
      id, el: root.querySelector('#wheel-' + id),
    }));
    const wheelMotors = Object.fromEntries(
      wheels.map(w => [w.id, spinMotor(w.el, {})])
    );

    const flowA = flowElectrons(root.querySelector('#flow-a'), { speed: 0, color: PALETTE.blue });
    const flowB = flowElectrons(root.querySelector('#flow-b'), { speed: 0, color: PALETTE.blue });

    const gpio = {
      ain1: root.querySelector('#gp-ain1'),
      ain2: root.querySelector('#gp-ain2'),
      pwma: root.querySelector('#gp-pwma'),
      bin1: root.querySelector('#gp-bin1'),
      bin2: root.querySelector('#gp-bin2'),
      pwmb: root.querySelector('#gp-pwmb'),
    };

    const chAArrow = root.querySelector('#ch-a-arrow');
    const chBArrow = root.querySelector('#ch-b-arrow');
    const chAState = root.querySelector('#ch-a-state');
    const chBState = root.querySelector('#ch-b-state');

    const dpadBtns = [...root.querySelectorAll('.dpad button')];
    const state = { command: 'stop', pwm: 255 };

    function renderChannel(mode, side, pwmOn) {
      const m = HBRIDGE_MODES[mode];
      const pinPrefix = side === 'A' ? 'ain' : 'bin';
      gpio[pinPrefix + '1'].classList.toggle('on', m.ain1 === 'H');
      gpio[pinPrefix + '2'].classList.toggle('on', m.ain2 === 'H');
      gpio[side === 'A' ? 'pwma' : 'pwmb'].classList.toggle('on', pwmOn);

      const arrowEl = side === 'A' ? chAArrow : chBArrow;
      const stateEl = side === 'A' ? chAState : chBState;
      const pinNames = side === 'A' ? ['AIN1', 'AIN2'] : ['BIN1', 'BIN2'];
      arrowEl.textContent =
        mode === 'forward'  ? '→ fwd'  :
        mode === 'backward' ? '← rev'  :
        mode === 'brake'    ? '■ brake' :
        'coast';
      stateEl.textContent = `${pinNames[0]}=${m.ain1} ${pinNames[1]}=${m.ain2}`;
    }

    function render() {
      const cmd = CAR_COMMANDS[state.command];
      const pwmOn = state.command !== 'stop';

      renderChannel(cmd.chA, 'A', pwmOn);
      renderChannel(cmd.chB, 'B', pwmOn);

      const chAMode = HBRIDGE_MODES[cmd.chA];
      const chBMode = HBRIDGE_MODES[cmd.chB];
      const flowSpeed = pwmOn ? (state.pwm / 255) * 4 : 0;
      const rpm = pwmOn ? (state.pwm / 255) * 120 : 0;

      flowA.update({ speed: flowSpeed, direction: chAMode.motorDir });
      flowB.update({ speed: flowSpeed, direction: chBMode.motorDir });

      // Left motors (L1, L2) follow Channel A; right (R1, R2) follow Channel B
      wheelMotors.L1.update({ rpm, direction: chAMode.motorDir, decayModel: chAMode.decay });
      wheelMotors.L2.update({ rpm, direction: chAMode.motorDir, decayModel: chAMode.decay });
      wheelMotors.R1.update({ rpm, direction: chBMode.motorDir, decayModel: chBMode.decay });
      wheelMotors.R2.update({ rpm, direction: chBMode.motorDir, decayModel: chBMode.decay });

      // D-pad active state
      dpadBtns.forEach(b => b.classList.toggle('active', b.dataset.cmd === state.command));
    }

    // D-pad clicks (click-to-latch)
    dpadBtns.forEach(b => b.addEventListener('click', () => {
      state.command = b.dataset.cmd;
      render();
      root.focus();
    }));

    // Keyboard (when widget focused)
    root.addEventListener('keydown', (e) => {
      const keyMap = {
        ArrowUp: 'up', ArrowDown: 'down',
        ArrowLeft: 'left', ArrowRight: 'right',
        ' ': 'stop', Escape: 'stop',
      };
      const cmd = keyMap[e.key];
      if (cmd) {
        e.preventDefault();
        state.command = cmd;
        render();
      }
    });

    render();

    return function destroy() {
      Object.values(wheelMotors).forEach(m => m.destroy());
      flowA.destroy();
      flowB.destroy();
    };
  }
```

- [ ] **Step 3: Verify in browser — directional behavior**

Open `http://localhost:8000/anim-car.html`.

Expected at initial load:
- `Stop` button highlighted (center).
- All 4 wheel rotors stopped.
- All 6 GPIO dots dim.
- Channel labels read `coast`.

Click `↑`:
- All 4 wheels spin clockwise.
- GPIO 27 + 25 turn green (HIGH); GPIO 26 + 33 stay dim (LOW); GPIO 14 + 12 turn purple (PWM active).
- Ch A arrow: `→ fwd`; Ch B arrow: `→ fwd`.
- Flow squares move left-to-right on both L and R lines.

Click `↓`:
- All 4 wheels spin counter-clockwise.
- GPIO 27 + 25 dim; 26 + 33 green.
- Both channel arrows: `← rev`.

Click `←` (turn left):
- L1 + L2 spin counter-clockwise; R1 + R2 spin clockwise.
- Ch A: `← rev`, Ch B: `→ fwd`.

Click `→` (turn right):
- L1 + L2 spin clockwise; R1 + R2 spin counter-clockwise.
- Ch A: `→ fwd`, Ch B: `← rev`.

Click `■`:
- All wheels decelerate smoothly (~2s coast).
- All GPIO dots dim.

- [ ] **Step 4: Verify keyboard focus behavior**

Tab into the widget — a blue focus outline should appear around the whole figure. Press arrow keys — they should trigger the corresponding commands without scrolling the page. Press Escape or Space — should stop. Click somewhere outside the widget, then click elsewhere — arrow keys should no longer trigger commands.

- [ ] **Step 5: Verify at mobile width (375px)**

Open DevTools → iPhone SE. Reload.

Expected:
- Car region: 4 wheel squares remain visible around the ghost car outline.
- Schematic region: scales down; text still readable.
- D-pad: buttons remain ≥44×44px touch targets.
- No horizontal scroll.

- [ ] **Step 6: Commit**

```bash
git add anim-car.html animations/hardware-anims.js
git commit -m "animations: anim-car (Animation 3) — full control loop with D-pad"
```

---

## Task 8 — Responsiveness + accessibility pass

Tighten up mobile behavior for `anim-hbridge` (the densest of the three), add ARIA niceties, verify reduced-motion behavior.

**Files:**
- Modify: `animations/hardware-anims.css`
- Modify: `anim-hbridge.html` (add overflow-x wrapper)

- [ ] **Step 1: Add horizontal-scroll fallback for dense widgets**

Append to `animations/hardware-anims.css`:

```css
/* dense widget wrapper — horizontal scroll fallback for very narrow screens */
.hw-anim .svg-scroll {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}
.hw-anim .svg-scroll svg {
  min-width: 340px;
}

/* extra reduced-motion rules: stop flow squares visually */
@media (prefers-reduced-motion: reduce) {
  .hw-anim .electrons-host rect {
    opacity: 0.5;
  }
}

/* focus state for the car widget figure */
.hw-anim[tabindex]:focus-visible {
  outline: 2px solid var(--focus);
  outline-offset: 4px;
}
```

- [ ] **Step 2: Wrap the hbridge SVG in a scroll container**

In `anim-hbridge.html`, wrap the `<svg>` with a scroll div. Find:

```html
  <svg viewBox="0 0 1000 420" aria-label="H-bridge animation...">
```

Change to:

```html
  <div class="svg-scroll">
  <svg viewBox="0 0 1000 420" aria-label="H-bridge animation...">
```

And close the div after the `</svg>`:

```html
  </svg>
  </div>
```

- [ ] **Step 3: Verify at 320px width**

Open DevTools → set custom width to 320px (iPhone 5 / very narrow). Reload `anim-hbridge.html`.

Expected:
- SVG inner content does NOT squish below readability; instead, horizontal scroll activates inside the widget wrapper.
- The page itself still has no horizontal scroll — the scroll is contained within the SVG wrapper.
- Text labels stay readable.

- [ ] **Step 4: Verify reduced-motion**

Open DevTools → Rendering panel → toggle "Emulate CSS media feature prefers-reduced-motion: reduce". Reload each of the three widgets.

Expected:
- `anim-cell`: Slider still works, readouts update, but rotor does not spin and flow squares stay dim/static.
- `anim-hbridge`: Same — motor doesn't spin, flow squares dim. Mode changes still flip MOSFETs and text.
- `anim-car`: Same — wheels don't spin, flow dim, all state changes still visible.

- [ ] **Step 5: Commit**

```bash
git add animations/hardware-anims.css anim-hbridge.html
git commit -m "animations: responsiveness + reduced-motion polish"
```

---

## Task 9 — Clean up scratch file + final verification

Remove the smoke-test page; do a final walkthrough of all three widgets.

**Files:**
- Delete: `_smoke.html`

- [ ] **Step 1: Delete smoke file**

```bash
git rm _smoke.html
```

- [ ] **Step 2: Full manual test matrix**

Open each URL in Chrome at desktop width (1280px), confirm each widget works:

1. `http://localhost:8000/anim-cell.html` — slide through 0, motor reverses smoothly. Wait 10s at each extreme to confirm no rAF leaks.
2. `http://localhost:8000/anim-hbridge.html` — click each of 4 modes, watch MOSFETs flip. Drag PWM slider at each mode.
3. `http://localhost:8000/anim-car.html` — click each of 5 D-pad buttons, verify wheel spin directions. Tab in, use arrow keys.

Then repeat all three at 375px mobile width in DevTools device toolbar.

Then open each in Safari (if on Mac) — confirm animations render identically (CSS keyframes and rAF work the same, but always good to smoke-test another engine).

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "animations: remove scratch smoke page"
```

- [ ] **Step 4: Review final file tree**

```bash
ls animations/ && ls anim-*.html
```

Expected output:
```text
hardware-anims.css
hardware-anims.js
anim-cell.html  anim-hbridge.html  anim-car.html
```

Handoff to author: the three HTML files are embeddable in the blog post however desired (inline via iframe, copy-paste SVG+script blocks into a Hugo shortcode later, or linked as standalone pages).

---

## Spec coverage map

| Spec section | Covered by task |
|-|-|
| §2 Scope (3 widgets, shared lib) | Tasks 1–7 |
| §3 Tech stack (SVG + vanilla JS) | Tasks 1–7 |
| §4 File layout | Task 1 |
| §5 Aesthetic / palette | Task 1 (CSS vars) |
| §6 Shared library API | Tasks 2 (helpers), 3 (spinMotor), 4 (flowElectrons) |
| §7 Animation 1 | Task 5 |
| §8 Animation 2 | Task 6 |
| §9 Animation 3 | Task 7 |
| §10 Responsiveness | Task 8 |
| §11 Accessibility (focus, ARIA, reduced-motion) | Tasks 7, 8 |
| §12 Testing (manual browser verification) | Embedded in every task's verify step + Task 9 matrix |
| §13 v2 polish | Deferred — not in this plan |
