# Hardware-is-Hard Ciechanowski Animations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build three Ciechanowski-grade pseudo-3D SVG animations (anim-cell, anim-hbridge, anim-car) embedded inline in `content/posts/hardware-is-hard/index.md` via Hugo shortcodes.

**Architecture:** Inline SVG illustrations live in Hugo shortcode templates (`layouts/shortcodes/anim-*.html`). Pure vanilla-JS behavior lives in `static/animations/anim-*.js`, backed by shared primitives in `static/animations/core.js`. One CSS file (`static/animations/core.css`) defines palette and base styles. A Hugo partial injects the bundle only when the post's front matter has `animations: true`.

**Tech Stack:** Inline SVG, vanilla JavaScript (IIFE, no build step, no framework), CSS custom properties, Hugo shortcodes + partial.

**Spec:** [`docs/superpowers/specs/2026-04-13-hardware-animations-ciechanowski.md`](../specs/2026-04-13-hardware-animations-ciechanowski.md)

## Testing approach

This project has zero test tooling (no `package.json`, no Node runner). Adding a test framework contradicts the "no bloat" constraint in the spec. Instead, each task ends with **explicit browser verification steps** — run `hugo server`, open a URL, observe specific behavior. Commits land only after verification passes.

## File structure (end state)

```text
static/animations/
  core.css                 # palette, base widget styles, reduced-motion
  core.js                  # Anims primitives: spinMotor, flowCurrent, DOM helpers
  anim-cell.js             # Anims.initCell()
  anim-hbridge.js          # Anims.initHBridge()
  anim-car.js              # Anims.initCar()

layouts/
  partials/
    hardware-anims-assets.html    # conditional <link>/<script> injection
  shortcodes/
    anim-cell.html
    anim-hbridge.html
    anim-car.html
  _default/
    baseof.html            # MODIFIED: include partial in <head>

content/posts/hardware-is-hard/
  index.md                 # MODIFIED: add `animations: true`, drop shortcodes

DELETED (end of plan):
  animations/hardware-anims.js
  animations/hardware-anims.css
  animations/               (directory, becomes empty)
  anim-cell.html            (repo root scratch)
  anim-hbridge.html         (repo root scratch)
  anim-car.html             (repo root scratch)
  wiring-guide.html         (repo root scratch)
```

---

## Task 1: Create `core.css` with palette + base styles

**Files:**
- Create: `static/animations/core.css`

- [ ] **Step 1: Create the CSS file**

Create `static/animations/core.css` with the exact content:

```css
/* Hardware-is-Hard animations — shared base styles */

.hw-anim {
  --paper:       #f4ede0;
  --paper-edge:  #e4d9b8;
  --ink:         #3a2510;
  --dim:         #8a7a55;
  --amber:       #c77d2a;
  --amber-glow:  #ffa94d;
  --amber-deep:  #a5651c;
  --yellow-hub:  #f2c034;
  --yellow-dark: #b88618;
  --shadow:      rgba(0, 0, 0, 0.25);

  display: block;
  max-width: 720px;
  margin: 2rem auto;
  padding: 1.25rem;
  background: var(--paper);
  border: 1px solid var(--paper-edge);
  border-radius: 10px;
  color: var(--ink);
  font-family: ui-serif, Georgia, "Times New Roman", serif;
}

.hw-anim svg {
  width: 100%;
  height: auto;
  display: block;
}

.hw-anim figcaption {
  margin-top: 0.75rem;
  text-align: center;
  font-style: italic;
  color: var(--dim);
  font-size: 0.9rem;
}

.hw-controls {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 1rem;
  flex-wrap: wrap;
  justify-content: center;
}

.hw-slider {
  flex: 1 1 200px;
  min-width: 160px;
  height: 44px;
  accent-color: var(--amber);
  touch-action: manipulation;
}

.hw-readout {
  font-family: ui-monospace, Menlo, Consolas, monospace;
  color: var(--dim);
  min-width: 5ch;
  text-align: center;
}
.hw-readout.active { color: var(--amber); }

.hw-btn {
  min-width: 44px;
  min-height: 44px;
  padding: 0.4rem 0.9rem;
  background: var(--paper);
  border: 1.5px solid var(--paper-edge);
  border-radius: 6px;
  color: var(--ink);
  font-family: inherit;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background 120ms, border-color 120ms, box-shadow 120ms;
}
.hw-btn:hover  { border-color: var(--amber); }
.hw-btn:focus-visible { outline: 2px solid var(--amber); outline-offset: 2px; }
.hw-btn[data-active="true"],
.hw-btn[aria-pressed="true"] {
  background: var(--amber);
  color: var(--paper);
  border-color: var(--amber-deep);
  box-shadow: 0 1px 3px var(--shadow) inset;
}

.hw-status {
  margin-top: 0.5rem;
  text-align: center;
  font-family: ui-monospace, Menlo, Consolas, monospace;
  font-size: 0.85rem;
  color: var(--dim);
}

/* Breathing idle used by anim-cell */
@keyframes hw-breathe {
  0%, 100% { opacity: 0.7; }
  50%      { opacity: 0.95; }
}
.hw-breathe { animation: hw-breathe 2s ease-in-out infinite; }

/* SVG-drawn D-pad focus ring (anim-car) */
.hw-svg-btn:focus-visible > .hw-svg-btn-ring {
  stroke: var(--amber);
  stroke-width: 3;
  fill: none;
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .hw-breathe { animation: none; opacity: 0.85; }
  .hw-anim .rotor { transform: none !important; }
}
```

- [ ] **Step 2: Verify file exists**

Run: `ls -la static/animations/core.css`
Expected: file listed, size > 1KB.

- [ ] **Step 3: Commit**

```bash
git add static/animations/core.css
git commit -m "animations: palette and base widget CSS"
```

---

## Task 2: Create `core.js` — DOM helpers + utilities

**Files:**
- Create: `static/animations/core.js`

- [ ] **Step 1: Write the file**

Create `static/animations/core.js` with the exact content:

```javascript
// Hardware-is-Hard animations — shared runtime primitives.
// Exposes `window.Anims`. No external dependencies.
(function (global) {
  'use strict';

  function clamp(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
  }

  function prefersReducedMotion() {
    return typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function bindSlider(inputEl, onChange) {
    if (!inputEl) return function () {};
    var handler = function () { onChange(parseFloat(inputEl.value)); };
    inputEl.addEventListener('input', handler);
    handler(); // initial sync
    return function destroy() { inputEl.removeEventListener('input', handler); };
  }

  function bindToggle(btnEl, onChange) {
    if (!btnEl) return function () {};
    var state = btnEl.getAttribute('aria-pressed') === 'true';
    var handler = function () {
      state = !state;
      btnEl.setAttribute('aria-pressed', state ? 'true' : 'false');
      onChange(state);
    };
    btnEl.addEventListener('click', handler);
    return function destroy() { btnEl.removeEventListener('click', handler); };
  }

  function bindRadioGroup(btnEls, onChange) {
    if (!btnEls || !btnEls.length) return function () {};
    var handlers = [];
    btnEls.forEach(function (btn) {
      var h = function () {
        btnEls.forEach(function (b) { b.setAttribute('data-active', 'false'); });
        btn.setAttribute('data-active', 'true');
        onChange(btn.getAttribute('data-value'));
      };
      btn.addEventListener('click', h);
      handlers.push({ btn: btn, h: h });
    });
    return function destroy() {
      handlers.forEach(function (x) { x.btn.removeEventListener('click', x.h); });
    };
  }

  function bindPress(btnEl, onDown, onUp) {
    if (!btnEl) return function () {};
    var pressed = false;
    var down = function (e) {
      if (pressed) return;
      pressed = true;
      onDown();
      if (e && e.preventDefault) e.preventDefault();
    };
    var up = function () {
      if (!pressed) return;
      pressed = false;
      onUp();
    };
    var keyDown = function (e) {
      if (e.key === ' ' || e.key === 'Enter') down(e);
    };
    var keyUp = function (e) {
      if (e.key === ' ' || e.key === 'Enter') up();
    };
    btnEl.addEventListener('pointerdown', down);
    btnEl.addEventListener('pointerup', up);
    btnEl.addEventListener('pointerleave', up);
    btnEl.addEventListener('pointercancel', up);
    btnEl.addEventListener('keydown', keyDown);
    btnEl.addEventListener('keyup', keyUp);
    return function destroy() {
      btnEl.removeEventListener('pointerdown', down);
      btnEl.removeEventListener('pointerup', up);
      btnEl.removeEventListener('pointerleave', up);
      btnEl.removeEventListener('pointercancel', up);
      btnEl.removeEventListener('keydown', keyDown);
      btnEl.removeEventListener('keyup', keyUp);
    };
  }

  global.Anims = global.Anims || {};
  global.Anims.clamp = clamp;
  global.Anims.prefersReducedMotion = prefersReducedMotion;
  global.Anims.bindSlider = bindSlider;
  global.Anims.bindToggle = bindToggle;
  global.Anims.bindRadioGroup = bindRadioGroup;
  global.Anims.bindPress = bindPress;
})(window);
```

- [ ] **Step 2: Verify via in-browser smoke check**

1. Run: `hugo server`
2. Open DevTools console at any page on `http://localhost:1313`.
3. Reload — the script isn't loaded yet (no partial wired). That's fine. Instead verify syntax by opening `http://localhost:1313/animations/core.js` directly and confirming it loads without errors.

Expected: raw JS text served, no 404.

- [ ] **Step 3: Commit**

```bash
git add static/animations/core.js
git commit -m "animations: core.js DOM helpers and utilities"
```

---

## Task 3: Add `spinMotor` primitive to `core.js`

**Files:**
- Modify: `static/animations/core.js`

- [ ] **Step 1: Append the primitive**

Insert the following BEFORE the final `global.Anims = global.Anims || {}` line, so it becomes part of the IIFE:

```javascript
  // Shared rAF loop for all motors across all widgets on the page.
  var motors = [];
  var rafId = null;

  function tick() {
    var reduced = prefersReducedMotion();
    for (var i = 0; i < motors.length; i++) {
      var m = motors[i];
      if (reduced) {
        // Snap to zero; primitive is a no-op under reduced-motion.
        m.vel = 0;
        m.angle = 0;
      } else {
        var diff = m.target - m.vel;
        var approaching = Math.abs(m.target) > Math.abs(m.vel);
        var k = m.brake ? 0.08 : (approaching ? 0.06 : 0.015);
        m.vel += diff * k;
        if (Math.abs(m.vel) < 0.01 && m.target === 0) m.vel = 0;
        m.angle = (m.angle + m.vel) % 360;
      }
      m.el.setAttribute('transform', 'rotate(' + m.angle + ' ' + m.cx + ' ' + m.cy + ')');
    }
    rafId = motors.length ? requestAnimationFrame(tick) : null;
  }

  function ensureTicking() {
    if (rafId == null && motors.length) rafId = requestAnimationFrame(tick);
  }

  function spinMotor(rotorEl, opts) {
    opts = opts || {};
    var center = opts.center || [0, 0];
    var entry = {
      el: rotorEl,
      cx: center[0],
      cy: center[1],
      vel: 0,
      target: 0,
      brake: false,
      angle: 0,
    };
    motors.push(entry);
    ensureTicking();
    return {
      setVelocity: function (target, opts2) {
        entry.target = clamp(target, -18, 18);
        entry.brake = !!(opts2 && opts2.brake);
        ensureTicking();
      },
      destroy: function () {
        var idx = motors.indexOf(entry);
        if (idx >= 0) motors.splice(idx, 1);
      },
    };
  }
```

Then add `global.Anims.spinMotor = spinMotor;` alongside the other exports at the bottom.

- [ ] **Step 2: Verify with a scratch test page**

Create `static/animations/__scratch.html` (temporary — we delete it after verification):

```html
<!doctype html><meta charset="utf-8">
<title>spinMotor scratch</title>
<script src="/animations/core.js"></script>
<svg width="200" height="200" viewBox="0 0 200 200" style="background:#f4ede0">
  <g id="rotor"><rect x="96" y="20" width="8" height="80" fill="#c77d2a"/></g>
</svg>
<button onclick="m.setVelocity(10)">spin</button>
<button onclick="m.setVelocity(0)">stop</button>
<button onclick="m.setVelocity(0,{brake:true})">brake</button>
<script>
  var m = Anims.spinMotor(document.getElementById('rotor'), { center: [100, 100] });
</script>
```

Run `hugo server`, open `http://localhost:1313/animations/__scratch.html`. Click spin → rotor eases up to speed; stop → coasts down slowly; brake → stops fast.

- [ ] **Step 3: Delete scratch**

```bash
rm static/animations/__scratch.html
```

- [ ] **Step 4: Commit**

```bash
git add static/animations/core.js
git commit -m "animations: spinMotor primitive with eased accel/decay/brake"
```

---

## Task 4: Add `flowCurrent` primitive to `core.js`

**Files:**
- Modify: `static/animations/core.js`

- [ ] **Step 1: Append the primitive**

Insert inside the same IIFE, after `spinMotor`:

```javascript
  var flows = [];
  var flowRaf = null;

  function flowTick() {
    var reduced = prefersReducedMotion();
    var t = performance.now();
    for (var i = 0; i < flows.length; i++) {
      var f = flows[i];
      if (reduced) { f.host.style.display = 'none'; continue; }
      f.host.style.display = '';

      // Ease particle speed toward target.
      f.speed += (f.targetSpeed - f.speed) * 0.04;

      // Spawn cadence.
      if (Math.abs(f.targetSpeed) > 0.01 && t - f.lastSpawn > 120 / Math.max(0.1, Math.abs(f.targetSpeed))) {
        if (f.particles.length < f.max) {
          var c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          c.setAttribute('r', f.radius);
          c.setAttribute('fill', f.color);
          c.setAttribute('opacity', '0');
          f.host.appendChild(c);
          f.particles.push({ el: c, p: f.targetSpeed > 0 ? 0 : f.length, born: t });
        }
        f.lastSpawn = t;
      }

      // Advance, fade, recycle.
      for (var j = f.particles.length - 1; j >= 0; j--) {
        var part = f.particles[j];
        part.p += f.speed * 1.6;
        var fade = Math.min(1, (t - part.born) / 200);
        part.el.setAttribute('opacity', fade * 0.95);
        if (part.p < 0 || part.p > f.length) {
          f.host.removeChild(part.el);
          f.particles.splice(j, 1);
          continue;
        }
        var pt = f.path.getPointAtLength(part.p);
        part.el.setAttribute('cx', pt.x);
        part.el.setAttribute('cy', pt.y);
      }
    }
    flowRaf = flows.length ? requestAnimationFrame(flowTick) : null;
  }

  function ensureFlowTicking() {
    if (flowRaf == null && flows.length) flowRaf = requestAnimationFrame(flowTick);
  }

  function flowCurrent(pathEl, hostEl, opts) {
    opts = opts || {};
    var entry = {
      path: pathEl,
      host: hostEl,
      length: pathEl.getTotalLength(),
      color: opts.color || '#ffa94d',
      max: opts.count || 8,
      radius: opts.radius || 3,
      particles: [],
      speed: 0,
      targetSpeed: 0,
      lastSpawn: 0,
    };
    flows.push(entry);
    ensureFlowTicking();
    return {
      setRate: function (r) {
        entry.targetSpeed = clamp(r, -1, 1) * 3; // r=1 → ~3 units/frame
        ensureFlowTicking();
      },
      destroy: function () {
        entry.particles.forEach(function (p) { if (p.el.parentNode) p.el.parentNode.removeChild(p.el); });
        var idx = flows.indexOf(entry);
        if (idx >= 0) flows.splice(idx, 1);
      },
    };
  }
```

Add `global.Anims.flowCurrent = flowCurrent;` to the exports block.

- [ ] **Step 2: Verify with scratch page**

Create `static/animations/__scratch2.html`:

```html
<!doctype html><meta charset="utf-8">
<title>flowCurrent scratch</title>
<script src="/animations/core.js"></script>
<svg width="400" height="100" viewBox="0 0 400 100" style="background:#f4ede0">
  <path id="p" d="M 20 50 C 100 20, 300 80, 380 50" stroke="#c77d2a" stroke-width="3" fill="none"/>
  <g id="host"></g>
</svg>
<button onclick="f.setRate(1)">forward</button>
<button onclick="f.setRate(-1)">reverse</button>
<button onclick="f.setRate(0)">stop</button>
<script>
  var f = Anims.flowCurrent(document.getElementById('p'), document.getElementById('host'));
</script>
```

Open `http://localhost:1313/animations/__scratch2.html`. Click forward → particles drift left-to-right along the curve. Reverse → drift right-to-left. Stop → particles complete their runs and fade.

- [ ] **Step 3: Delete scratch + commit**

```bash
rm static/animations/__scratch2.html
git add static/animations/core.js
git commit -m "animations: flowCurrent primitive with particle drift and fade"
```

---

## Task 5: Hugo partial + baseof wiring + blog front matter opt-in

**Files:**
- Create: `layouts/partials/hardware-anims-assets.html`
- Modify: `layouts/_default/baseof.html` (insert partial call in `<head>`)
- Modify: `content/posts/hardware-is-hard/index.md` (front matter)

- [ ] **Step 1: Create the partial**

Create `layouts/partials/hardware-anims-assets.html`:

```html
{{ if .Params.animations }}
<link rel="stylesheet" href="{{ "animations/core.css" | relURL }}">
<script src="{{ "animations/core.js" | relURL }}" defer></script>
<script src="{{ "animations/anim-cell.js" | relURL }}" defer></script>
<script src="{{ "animations/anim-hbridge.js" | relURL }}" defer></script>
<script src="{{ "animations/anim-car.js" | relURL }}" defer></script>
{{ end }}
```

- [ ] **Step 2: Include partial in baseof**

Edit `layouts/_default/baseof.html`. Insert the partial call immediately before the closing `</head>` tag (after the existing `<script>` tag that restores theme):

The current `<head>` ends like:
```html
  <script>
  (function() {
    var t = localStorage.getItem('theme');
    if (t === 'dark') document.documentElement.classList.add('dark');
  })();
  </script>
</head>
```

Change to:
```html
  <script>
  (function() {
    var t = localStorage.getItem('theme');
    if (t === 'dark') document.documentElement.classList.add('dark');
  })();
  </script>
  {{ partial "hardware-anims-assets.html" . }}
</head>
```

- [ ] **Step 3: Add front matter flag**

Edit `content/posts/hardware-is-hard/index.md`. Change the front matter from:
```
---
title: "Hardware is hard?"
date: 2026-04-06
---
```
to:
```
---
title: "Hardware is hard?"
date: 2026-04-06
animations: true
---
```

- [ ] **Step 4: Verify bundle loads**

Run `hugo server`. Open `http://localhost:1313/posts/hardware-is-hard/`. In DevTools Network tab, confirm requests for `/animations/core.css`, `/animations/core.js`, `/animations/anim-cell.js`, `/animations/anim-hbridge.js`, `/animations/anim-car.js`. The `anim-*.js` files will 404 for now (we haven't created them) — that's fine. `core.css` and `core.js` must load.

Then visit `http://localhost:1313/` (homepage). Confirm NO requests for any `animations/*` — partial should be conditional-skipped because homepage has no `animations: true`.

- [ ] **Step 5: Commit**

```bash
git add layouts/partials/hardware-anims-assets.html layouts/_default/baseof.html content/posts/hardware-is-hard/index.md
git commit -m "animations: Hugo partial + front-matter opt-in"
```

---

## Task 6: `anim-cell` shortcode — SVG illustration

**Files:**
- Create: `layouts/shortcodes/anim-cell.html`

- [ ] **Step 1: Write the shortcode**

Create `layouts/shortcodes/anim-cell.html` with the exact content below. `{{ .Ordinal }}` gives a unique index per shortcode per page so `id` values don't collide when multiple widgets render on the same page.

```html
{{ $n := .Ordinal }}
<figure class="hw-anim" id="anim-cell-{{ $n }}">
  <svg viewBox="0 0 720 320" preserveAspectRatio="xMidYMid meet"
       aria-label="18650 cell driving a DC motor through voltage slider">
    <defs>
      <radialGradient id="ac-cell-{{ $n }}" cx="0.35" cy="0.3" r="0.9">
        <stop offset="0%"  stop-color="#e8d39a"/>
        <stop offset="55%" stop-color="#b38b4a"/>
        <stop offset="100%" stop-color="#6e4a1f"/>
      </radialGradient>
      <linearGradient id="ac-chrome-{{ $n }}" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%"  stop-color="#f5f5f5"/>
        <stop offset="50%" stop-color="#cbcbcb"/>
        <stop offset="100%" stop-color="#7d7d7d"/>
      </linearGradient>
      <radialGradient id="ac-motor-{{ $n }}" cx="0.3" cy="0.3" r="0.95">
        <stop offset="0%"  stop-color="#6a6a72"/>
        <stop offset="70%" stop-color="#2a2a30"/>
        <stop offset="100%" stop-color="#0f0f13"/>
      </radialGradient>
      <radialGradient id="ac-hub-{{ $n }}" cx="0.3" cy="0.3" r="0.9">
        <stop offset="0%"  stop-color="#ffe27a"/>
        <stop offset="55%" stop-color="#f2c034"/>
        <stop offset="100%" stop-color="#6e4d08"/>
      </radialGradient>
      <filter id="ac-shadow-{{ $n }}" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="4"/>
        <feOffset dy="5" result="o"/>
        <feComponentTransfer><feFuncA type="linear" slope="0.35"/></feComponentTransfer>
        <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>

    <!-- Ambient desk shadow -->
    <ellipse cx="360" cy="260" rx="280" ry="10" fill="rgba(0,0,0,0.12)"/>

    <!-- 18650 cell, x=60..280, y=110..190 -->
    <g filter="url(#ac-shadow-{{ $n }})">
      <rect x="60" y="110" width="220" height="80" rx="6" fill="url(#ac-cell-{{ $n }})"/>
      <!-- Negative cap (left flat) -->
      <rect x="52" y="118" width="10" height="64" rx="2" fill="url(#ac-chrome-{{ $n }})"/>
      <!-- Positive cap (right with nipple) -->
      <rect x="280" y="122" width="12" height="56" rx="2" fill="url(#ac-chrome-{{ $n }})"/>
      <rect x="290" y="134" width="8" height="32" rx="2" fill="url(#ac-chrome-{{ $n }})"
            id="anim-cell-nub-{{ $n }}"/>
      <text x="170" y="148" text-anchor="middle"
            font-family="ui-monospace, Menlo, monospace" font-size="14" fill="#3a2510" font-weight="600">18650</text>
      <text x="170" y="172" text-anchor="middle"
            font-family="ui-serif, Georgia, serif" font-size="13" fill="#3a2510" font-style="italic">3.7 V nominal</text>
    </g>

    <!-- Wires (curved beziers) -->
    <path id="anim-cell-wire-top-{{ $n }}"
          d="M 298 142 C 380 142, 430 130, 490 130"
          stroke="#c77d2a" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    <path id="anim-cell-wire-bot-{{ $n }}"
          d="M 62 162 C 150 200, 350 230, 490 210"
          stroke="#8a7a55" stroke-width="3.5" fill="none" stroke-linecap="round"/>

    <!-- Particle hosts (empty - flowCurrent appends circles here) -->
    <g id="anim-cell-flow-top-{{ $n }}"></g>
    <g id="anim-cell-flow-bot-{{ $n }}"></g>

    <!-- Motor body, x=490..630 -->
    <g filter="url(#ac-shadow-{{ $n }})">
      <rect x="490" y="110" width="140" height="90" rx="42" fill="url(#ac-motor-{{ $n }})"/>
      <!-- Output shaft on right -->
      <rect x="628" y="144" width="32" height="22" rx="3" fill="url(#ac-chrome-{{ $n }})"/>
      <rect x="656" y="150" width="10" height="10" rx="1" fill="#2a2a30"/>
      <!-- Rotor face (rotates) -->
      <g id="anim-cell-rotor-{{ $n }}" class="rotor" transform="rotate(0 540 155)">
        <circle cx="540" cy="155" r="32" fill="url(#ac-hub-{{ $n }})" stroke="#6e4d08" stroke-width="2"/>
        <rect x="538" y="125" width="4" height="60" fill="#3a2510"/>
        <rect x="510" y="153" width="60" height="4" fill="#3a2510"/>
        <circle cx="540" cy="155" r="6" fill="url(#ac-chrome-{{ $n }})"/>
      </g>
    </g>
  </svg>

  <div class="hw-controls">
    <input type="range" class="hw-slider"
           id="anim-cell-slider-{{ $n }}"
           min="-4" max="4" step="0.1" value="0"
           aria-label="voltage from negative four to positive four">
    <span class="hw-readout" id="anim-cell-readout-{{ $n }}">0.0 V</span>
  </div>
  <figcaption>voltage — drag to push electrons</figcaption>

  <script>
    document.addEventListener('DOMContentLoaded', function () {
      if (window.Anims && Anims.initCell) Anims.initCell("anim-cell-{{ $n }}");
    });
  </script>
</figure>
```

- [ ] **Step 2: Temporarily drop the shortcode into the post to verify illustration**

Edit `content/posts/hardware-is-hard/index.md`. Add `{{< anim-cell >}}` on a new line immediately after line 66 ("In a way, you can say that Voltage is like a gravity for electrons — the difference make electrons move"). We'll keep it there permanently (this is the canonical insertion point from the spec).

- [ ] **Step 3: Verify illustration renders**

Run `hugo server`. Open `http://localhost:1313/posts/hardware-is-hard/`. You'll see a console error: `Anims.initCell is not a function`. That is expected — we haven't written `anim-cell.js` yet. **The SVG illustration should render fully**: cream panel, 18650 cell with caps and nipple on the right, curly amber wire top, dim return wire bottom, dark motor cylinder with yellow rotor and chrome shaft. Slider present but non-functional.

If any component is missing or misshapen, fix the shortcode markup before committing.

- [ ] **Step 4: Commit**

```bash
git add layouts/shortcodes/anim-cell.html content/posts/hardware-is-hard/index.md
git commit -m "animations: anim-cell shortcode SVG illustration"
```

---

## Task 7: `anim-cell.js` — behavior

**Files:**
- Create: `static/animations/anim-cell.js`

- [ ] **Step 1: Write the widget logic**

Create `static/animations/anim-cell.js` with the exact content:

```javascript
(function () {
  'use strict';
  if (!window.Anims) { console.error('[anim-cell] Anims runtime missing'); return; }

  function init(rootId) {
    var root = document.getElementById(rootId);
    if (!root) { console.warn('[anim-cell] root not found:', rootId); return; }
    var n = rootId.replace('anim-cell-', '');

    var slider  = document.getElementById('anim-cell-slider-'   + n);
    var readout = document.getElementById('anim-cell-readout-'  + n);
    var rotor   = document.getElementById('anim-cell-rotor-'    + n);
    var wireTop = document.getElementById('anim-cell-wire-top-' + n);
    var wireBot = document.getElementById('anim-cell-wire-bot-' + n);
    var flowTop = document.getElementById('anim-cell-flow-top-' + n);
    var flowBot = document.getElementById('anim-cell-flow-bot-' + n);
    var nub     = document.getElementById('anim-cell-nub-'      + n);

    if (!slider || !rotor || !wireTop || !wireBot) {
      console.warn('[anim-cell] required elements missing');
      return;
    }

    var motor = Anims.spinMotor(rotor, { center: [540, 155] });
    var flowT = Anims.flowCurrent(wireTop, flowTop, { color: '#ffa94d', count: 8, radius: 3 });
    var flowB = Anims.flowCurrent(wireBot, flowBot, { color: '#ffa94d', count: 8, radius: 2.5 });

    function onChange(v) {
      var absV = Math.abs(v);
      var sign = v < 0 ? -1 : v > 0 ? 1 : 0;

      // Motor target velocity: |v|/4 maps to 12 deg/frame max, signed.
      motor.setVelocity(sign * (absV / 4) * 12);

      // Current flow rate: v/4 in [-1,+1]. Forward wire drifts + direction,
      // return wire mirrors (visually returning to cell).
      flowT.setRate(v / 4);
      flowB.setRate(-v / 4);

      // Readout text + color.
      var formatted = (v >= 0 ? '+' : '') + v.toFixed(1) + ' V';
      readout.textContent = formatted;
      readout.classList.toggle('active', absV > 0.05);

      // Positive nub breathes only at rest.
      if (nub) nub.classList.toggle('hw-breathe', absV < 0.05);
    }

    var unbind = Anims.bindSlider(slider, onChange);

    return function destroy() {
      unbind();
      motor.destroy();
      flowT.destroy();
      flowB.destroy();
    };
  }

  window.Anims = window.Anims || {};
  window.Anims.initCell = init;
})();
```

- [ ] **Step 2: Verify end-to-end**

Reload `http://localhost:1313/posts/hardware-is-hard/`. Test:

1. Slider at 0 → motor still. Nub gently breathes. Readout "0.0 V" in dim color. No particles.
2. Slide to +2 → rotor spins up CW smoothly, amber particles stream along top wire left→right. Readout "+2.0 V" in amber.
3. Slide to +4 → faster spin, faster particle stream.
4. Slide to 0 → rotor coasts down slowly; particles fade out over ~0.5s.
5. Slide to -3 → rotor reverses CCW; particles flow right→left.
6. Test on iPhone width via DevTools device emulation (320px): widget still readable, slider still usable.
7. Enable `prefers-reduced-motion` in DevTools rendering panel → no rotation, no particles, slider still updates readout.

If any step fails, fix the widget code before committing. No console errors expected.

- [ ] **Step 3: Commit**

```bash
git add static/animations/anim-cell.js
git commit -m "animations: anim-cell widget behavior (voltage slider → motor + particles)"
```

---

## Task 8: `anim-hbridge` shortcode — SVG illustration

**Files:**
- Create: `layouts/shortcodes/anim-hbridge.html`

Refer to spec §6.2 for component layout. The viewBox is `0 0 880 480`. The widget has an ESP32 board on the left, a TB6612FNG DIP chip centered, a DC motor on the right, and a battery block below the chip. Controls are HTML below the SVG: 4 mode radio buttons + PWM slider + status line.

- [ ] **Step 1: Write the shortcode**

Create `layouts/shortcodes/anim-hbridge.html`:

```html
{{ $n := .Ordinal }}
<figure class="hw-anim" id="anim-hbridge-{{ $n }}">
  <svg viewBox="0 0 880 480" preserveAspectRatio="xMidYMid meet"
       aria-label="TB6612FNG H-bridge routing current through 4 MOSFETs">
    <defs>
      <linearGradient id="ah-pcb-{{ $n }}" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%"  stop-color="#2f6d4a"/>
        <stop offset="100%" stop-color="#15402a"/>
      </linearGradient>
      <linearGradient id="ah-silicon-{{ $n }}" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%"  stop-color="#303036"/>
        <stop offset="100%" stop-color="#0f0f13"/>
      </linearGradient>
      <linearGradient id="ah-chrome-{{ $n }}" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%"  stop-color="#f5f5f5"/>
        <stop offset="55%" stop-color="#c4c4c4"/>
        <stop offset="100%" stop-color="#7d7d7d"/>
      </linearGradient>
      <radialGradient id="ah-motor-{{ $n }}" cx="0.3" cy="0.3" r="0.9">
        <stop offset="0%"  stop-color="#6a6a72"/>
        <stop offset="70%" stop-color="#2a2a30"/>
        <stop offset="100%" stop-color="#0f0f13"/>
      </radialGradient>
      <radialGradient id="ah-hub-{{ $n }}" cx="0.3" cy="0.3" r="0.9">
        <stop offset="0%"  stop-color="#ffe27a"/>
        <stop offset="55%" stop-color="#f2c034"/>
        <stop offset="100%" stop-color="#6e4d08"/>
      </radialGradient>
      <radialGradient id="ah-cell-{{ $n }}" cx="0.35" cy="0.3" r="0.9">
        <stop offset="0%"  stop-color="#e8d39a"/>
        <stop offset="55%" stop-color="#b38b4a"/>
        <stop offset="100%" stop-color="#6e4a1f"/>
      </radialGradient>
      <filter id="ah-shadow-{{ $n }}" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="4"/>
        <feOffset dy="5" result="o"/>
        <feComponentTransfer><feFuncA type="linear" slope="0.35"/></feComponentTransfer>
        <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>

    <!-- ESP32 board, x=30..220, y=90..260 -->
    <g filter="url(#ah-shadow-{{ $n }})">
      <rect x="30" y="90" width="190" height="170" rx="6" fill="url(#ah-pcb-{{ $n }})"/>
      <rect x="90" y="70" width="70" height="26" rx="3" fill="url(#ah-chrome-{{ $n }})"/>
      <text x="125" y="87" text-anchor="middle" font-family="ui-monospace, Menlo, monospace"
            font-size="10" fill="#e0e0e0">USB-C</text>
      <!-- Header pins on right -->
      <g font-family="ui-monospace, Menlo, monospace" font-size="11" fill="#f4ede0">
        <rect x="200" y="120" width="20" height="8" fill="url(#ah-chrome-{{ $n }})"/>
        <text x="228" y="128">AIN1</text>
        <rect x="200" y="150" width="20" height="8" fill="url(#ah-chrome-{{ $n }})"/>
        <text x="228" y="158">AIN2</text>
        <rect x="200" y="180" width="20" height="8" fill="url(#ah-chrome-{{ $n }})"/>
        <text x="228" y="188">PWMA</text>
        <rect x="200" y="210" width="20" height="8" fill="url(#ah-chrome-{{ $n }})"/>
        <text x="228" y="218">GND</text>
      </g>
      <text x="125" y="250" text-anchor="middle" font-family="ui-serif, Georgia, serif"
            font-size="12" fill="#ffe27a" font-style="italic">ESP32</text>
    </g>

    <!-- TB6612FNG DIP chip, x=320..560, y=110..260 -->
    <g filter="url(#ah-shadow-{{ $n }})">
      <rect x="320" y="110" width="240" height="150" rx="6" fill="url(#ah-silicon-{{ $n }})"/>
      <!-- Silver pins on top + bottom -->
      {{ range $i, $_ := (seq 0 7) }}
        <rect x="{{ add 330 (mul $i 28) }}" y="102" width="14" height="10" fill="url(#ah-chrome-{{ $n }})"/>
        <rect x="{{ add 330 (mul $i 28) }}" y="260" width="14" height="10" fill="url(#ah-chrome-{{ $n }})"/>
      {{ end }}
      <text x="440" y="145" text-anchor="middle" font-family="ui-monospace, Menlo, monospace"
            font-size="11" fill="#f4ede0" letter-spacing="1">TB6612FNG</text>
      <!-- MOSFETs (Q1..Q4 in H pattern) -->
      <g id="anim-hbridge-mosfets-{{ $n }}">
        <rect id="anim-hbridge-q1-{{ $n }}" x="355" y="170" width="40" height="30" rx="3" fill="#4a4a52" data-on="false"/>
        <rect id="anim-hbridge-q2-{{ $n }}" x="485" y="170" width="40" height="30" rx="3" fill="#4a4a52" data-on="false"/>
        <rect id="anim-hbridge-q3-{{ $n }}" x="355" y="215" width="40" height="30" rx="3" fill="#4a4a52" data-on="false"/>
        <rect id="anim-hbridge-q4-{{ $n }}" x="485" y="215" width="40" height="30" rx="3" fill="#4a4a52" data-on="false"/>
        <text x="375" y="189" text-anchor="middle" font-family="ui-monospace" font-size="10" fill="#f4ede0">Q1</text>
        <text x="505" y="189" text-anchor="middle" font-family="ui-monospace" font-size="10" fill="#f4ede0">Q2</text>
        <text x="375" y="234" text-anchor="middle" font-family="ui-monospace" font-size="10" fill="#f4ede0">Q3</text>
        <text x="505" y="234" text-anchor="middle" font-family="ui-monospace" font-size="10" fill="#f4ede0">Q4</text>
      </g>
    </g>

    <!-- Control wires (AIN1/AIN2/PWM/GND from ESP32 to chip) -->
    <path d="M 248 124 L 320 180" stroke="#8a7a55" stroke-width="2" fill="none"/>
    <path d="M 248 154 L 320 195" stroke="#8a7a55" stroke-width="2" fill="none"/>
    <path d="M 248 184 L 320 210" stroke="#8a7a55" stroke-width="2" fill="none"/>
    <path d="M 248 214 L 320 250" stroke="#8a7a55" stroke-width="2" fill="none"/>

    <!-- Motor on right, x=640..820, y=130..240 -->
    <g filter="url(#ah-shadow-{{ $n }})">
      <rect x="640" y="130" width="180" height="110" rx="50" fill="url(#ah-motor-{{ $n }})"/>
      <rect x="818" y="170" width="28" height="20" rx="3" fill="url(#ah-chrome-{{ $n }})"/>
      <g id="anim-hbridge-rotor-{{ $n }}" class="rotor" transform="rotate(0 700 185)">
        <circle cx="700" cy="185" r="38" fill="url(#ah-hub-{{ $n }})" stroke="#6e4d08" stroke-width="2"/>
        <rect x="698" y="148" width="4" height="74" fill="#3a2510"/>
        <rect x="663" y="183" width="74" height="4" fill="#3a2510"/>
        <circle cx="700" cy="185" r="7" fill="url(#ah-chrome-{{ $n }})"/>
      </g>
    </g>

    <!-- Motor terminal wires Q1/Q3 → motor-A, Q2/Q4 → motor-B -->
    <path id="anim-hbridge-wire-A-{{ $n }}"
          d="M 395 185 C 500 155, 600 160, 660 185" stroke="#8a7a55" stroke-width="3" fill="none"/>
    <path id="anim-hbridge-wire-B-{{ $n }}"
          d="M 525 230 C 580 240, 620 235, 660 205" stroke="#8a7a55" stroke-width="3" fill="none"/>

    <!-- Particle hosts -->
    <g id="anim-hbridge-flow-A-{{ $n }}"></g>
    <g id="anim-hbridge-flow-B-{{ $n }}"></g>

    <!-- Battery block below chip, x=350..530, y=330..410 -->
    <g filter="url(#ah-shadow-{{ $n }})">
      <rect x="350" y="330" width="180" height="80" rx="6" fill="url(#ah-cell-{{ $n }})"/>
      <rect x="342" y="338" width="8" height="64" fill="url(#ah-chrome-{{ $n }})"/>
      <rect x="530" y="342" width="10" height="56" fill="url(#ah-chrome-{{ $n }})"/>
      <rect x="540" y="358" width="6" height="24" fill="url(#ah-chrome-{{ $n }})"/>
      <text x="440" y="378" text-anchor="middle" font-family="ui-monospace"
            font-size="12" fill="#3a2510" font-weight="600">2x 18650 · 7.4V</text>
    </g>
    <!-- Battery rails VM + GND -->
    <path d="M 540 358 C 580 340, 560 300, 520 290 L 520 260" stroke="#e74c3c" stroke-width="2" fill="none"/>
    <path d="M 342 390 C 290 380, 300 300, 370 290 L 370 260" stroke="#555" stroke-width="2" fill="none"/>
    <text x="528" y="278" font-family="ui-monospace" font-size="10" fill="#e74c3c">VM</text>
    <text x="360" y="278" font-family="ui-monospace" font-size="10" fill="#555">GND</text>
  </svg>

  <div class="hw-controls">
    <button class="hw-btn" data-value="forward"  id="anim-hbridge-mode-fwd-{{ $n }}"  data-active="true">Forward</button>
    <button class="hw-btn" data-value="backward" id="anim-hbridge-mode-bwd-{{ $n }}">Backward</button>
    <button class="hw-btn" data-value="coast"    id="anim-hbridge-mode-coast-{{ $n }}">Coast</button>
    <button class="hw-btn" data-value="brake"    id="anim-hbridge-mode-brake-{{ $n }}">Brake</button>
  </div>
  <div class="hw-controls">
    <label for="anim-hbridge-pwm-{{ $n }}" style="font-size:0.85rem;color:var(--dim)">PWM</label>
    <input type="range" class="hw-slider"
           id="anim-hbridge-pwm-{{ $n }}"
           min="0" max="255" step="1" value="192"
           aria-label="PWM duty cycle">
    <span class="hw-readout active" id="anim-hbridge-pwm-readout-{{ $n }}">192</span>
  </div>
  <div class="hw-status" id="anim-hbridge-status-{{ $n }}">Forward @ 192 / 255 — MOSFETs Q1+Q4 on</div>
  <figcaption>choose a mode — see which MOSFETs route current</figcaption>

  <script>
    document.addEventListener('DOMContentLoaded', function () {
      if (window.Anims && Anims.initHBridge) Anims.initHBridge("anim-hbridge-{{ $n }}");
    });
  </script>
</figure>
```

- [ ] **Step 2: Drop shortcode into the post (temporary spot)**

Edit `content/posts/hardware-is-hard/index.md`. Add `{{< anim-hbridge >}}` at the very end of the file (before the YouTube embed) so it renders alongside anim-cell during development. We'll reposition later if the author writes the H-bridge prose.

- [ ] **Step 3: Verify illustration renders**

Reload `http://localhost:1313/posts/hardware-is-hard/`. Scroll to the bottom. Expected:
- Cream panel containing the H-bridge widget.
- Green PCB (ESP32) on left with chrome USB-C and 4 silver header pins labeled AIN1/AIN2/PWMA/GND.
- Black TB6612FNG chip in the middle with 16 silver pins around it and 4 dim MOSFET squares Q1–Q4 in H pattern.
- Dark DC motor on the right with yellow rotor.
- Battery block below the chip with VM (red) and GND (gray) rails reaching up to the chip.
- 4 mode buttons (Forward highlighted amber by default), PWM slider, status line.

Console error `Anims.initHBridge is not a function` is expected. No other errors.

- [ ] **Step 4: Commit**

```bash
git add layouts/shortcodes/anim-hbridge.html content/posts/hardware-is-hard/index.md
git commit -m "animations: anim-hbridge shortcode SVG illustration"
```

---

## Task 9: `anim-hbridge.js` — behavior

**Files:**
- Create: `static/animations/anim-hbridge.js`

- [ ] **Step 1: Write the widget logic**

Create `static/animations/anim-hbridge.js`:

```javascript
(function () {
  'use strict';
  if (!window.Anims) { console.error('[anim-hbridge] Anims runtime missing'); return; }

  // Mode → { active MOSFETs, motor sign (-1/0/+1), brake flag, active wire }
  var MODES = {
    forward:  { on: ['q1', 'q4'], sign:  1, brake: false, wire: 'A' },
    backward: { on: ['q2', 'q3'], sign: -1, brake: false, wire: 'B' },
    coast:    { on: [],           sign:  0, brake: false, wire: null },
    brake:    { on: ['q3', 'q4'], sign:  0, brake: true,  wire: null },
  };

  function init(rootId) {
    var root = document.getElementById(rootId);
    if (!root) return;
    var n = rootId.replace('anim-hbridge-', '');

    var rotor   = document.getElementById('anim-hbridge-rotor-'       + n);
    var wireA   = document.getElementById('anim-hbridge-wire-A-'      + n);
    var wireB   = document.getElementById('anim-hbridge-wire-B-'      + n);
    var flowA   = document.getElementById('anim-hbridge-flow-A-'      + n);
    var flowB   = document.getElementById('anim-hbridge-flow-B-'      + n);
    var pwmIn   = document.getElementById('anim-hbridge-pwm-'         + n);
    var pwmOut  = document.getElementById('anim-hbridge-pwm-readout-' + n);
    var status  = document.getElementById('anim-hbridge-status-'      + n);
    var mosfets = {
      q1: document.getElementById('anim-hbridge-q1-' + n),
      q2: document.getElementById('anim-hbridge-q2-' + n),
      q3: document.getElementById('anim-hbridge-q3-' + n),
      q4: document.getElementById('anim-hbridge-q4-' + n),
    };
    var modeBtns = [
      document.getElementById('anim-hbridge-mode-fwd-'   + n),
      document.getElementById('anim-hbridge-mode-bwd-'   + n),
      document.getElementById('anim-hbridge-mode-coast-' + n),
      document.getElementById('anim-hbridge-mode-brake-' + n),
    ];

    if (!rotor || !wireA || !wireB || !pwmIn) {
      console.warn('[anim-hbridge] required elements missing');
      return;
    }

    var motor = Anims.spinMotor(rotor, { center: [700, 185] });
    var flA   = Anims.flowCurrent(wireA, flowA, { color: '#ffa94d' });
    var flB   = Anims.flowCurrent(wireB, flowB, { color: '#ffa94d' });

    var currentMode = 'forward';
    var pwm = parseInt(pwmIn.value, 10);

    function render() {
      var m = MODES[currentMode];

      // MOSFET highlighting
      Object.keys(mosfets).forEach(function (k) {
        var on = m.on.indexOf(k) !== -1;
        mosfets[k].setAttribute('fill', on ? '#ffa94d' : '#4a4a52');
        mosfets[k].setAttribute('data-on', on ? 'true' : 'false');
      });

      // Active wire color
      wireA.setAttribute('stroke', m.wire === 'A' ? '#c77d2a' : '#8a7a55');
      wireB.setAttribute('stroke', m.wire === 'B' ? '#c77d2a' : '#8a7a55');

      // Motor
      var scaled = (pwm / 255) * 12;
      motor.setVelocity(m.sign * scaled, { brake: m.brake });

      // Particles on active wire only
      flA.setRate(m.wire === 'A' ? pwm / 255 : 0);
      flB.setRate(m.wire === 'B' ? pwm / 255 : 0);

      // Status line
      var names = m.on.length ? m.on.map(function (q) { return q.toUpperCase(); }).join('+') : 'none';
      var label = currentMode.charAt(0).toUpperCase() + currentMode.slice(1);
      status.textContent = label + ' @ ' + pwm + ' / 255 — MOSFETs ' + names +
        (m.on.length ? ' on' : ' off');
    }

    var unbindMode = Anims.bindRadioGroup(modeBtns, function (mode) {
      currentMode = mode;
      render();
    });
    var unbindPwm = Anims.bindSlider(pwmIn, function (v) {
      pwm = Math.round(v);
      pwmOut.textContent = String(pwm);
      render();
    });

    render();

    return function destroy() {
      unbindMode();
      unbindPwm();
      motor.destroy();
      flA.destroy();
      flB.destroy();
    };
  }

  window.Anims = window.Anims || {};
  window.Anims.initHBridge = init;
})();
```

- [ ] **Step 2: Verify end-to-end**

Reload. Test:

1. Default "Forward" + PWM 192 → Q1 and Q4 glow amber; wire A is amber; particles stream left→right along wire A; motor spins CW; status "Forward @ 192 / 255 — MOSFETs Q1+Q4 on".
2. Click "Backward" → Q2, Q3 glow; wire B amber; particles on wire B; motor reverses CCW.
3. Click "Coast" → all MOSFETs dim; no wire highlighted; no particles; motor eases to stop slowly over ~2s.
4. Click "Brake" → Q3+Q4 glow; no wire highlighted (both low); motor decays to stop FAST (<0.5s).
5. Slide PWM to 50 → slower spin, fewer particles per second.
6. Slide PWM to 0 → motor stops, no particles, but MOSFETs still reflect the mode.
7. No console errors.

- [ ] **Step 3: Commit**

```bash
git add static/animations/anim-hbridge.js
git commit -m "animations: anim-hbridge widget behavior (modes + PWM → MOSFET routing)"
```

---

## Task 10: `anim-car` shortcode — SVG illustration (chassis + schematic + D-pad)

**Files:**
- Create: `layouts/shortcodes/anim-car.html`

- [ ] **Step 1: Write the shortcode**

The widget has 3 vertical regions inside one viewBox `0 0 720 720`: row 1 is the car chassis with 4 wheels (y: 0–280), row 2 is a simplified current-flow schematic (y: 280–520), row 3 is the D-pad (y: 520–720). Create `layouts/shortcodes/anim-car.html`:

```html
{{ $n := .Ordinal }}
<figure class="hw-anim" id="anim-car-{{ $n }}" tabindex="0"
        aria-label="4WD car control with D-pad — arrow keys or click">
  <svg viewBox="0 0 720 720" preserveAspectRatio="xMidYMid meet">
    <defs>
      <linearGradient id="acar-wood-{{ $n }}" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0%"  stop-color="#d9b982"/>
        <stop offset="50%" stop-color="#c49a5e"/>
        <stop offset="100%" stop-color="#a6824a"/>
      </linearGradient>
      <radialGradient id="acar-tire-{{ $n }}" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0.72" stop-color="#2c2c2c"/>
        <stop offset="1" stop-color="#0d0d0d"/>
      </radialGradient>
      <radialGradient id="acar-hub-{{ $n }}" cx="0.3" cy="0.3" r="0.9">
        <stop offset="0%"  stop-color="#ffe27a"/>
        <stop offset="55%" stop-color="#f2c034"/>
        <stop offset="100%" stop-color="#6e4d08"/>
      </radialGradient>
      <linearGradient id="acar-chrome-{{ $n }}" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%"  stop-color="#f5f5f5"/>
        <stop offset="55%" stop-color="#c4c4c4"/>
        <stop offset="100%" stop-color="#7d7d7d"/>
      </linearGradient>
      <radialGradient id="acar-dpad-{{ $n }}" cx="0.3" cy="0.3" r="0.9">
        <stop offset="0%"  stop-color="#fafafa"/>
        <stop offset="60%" stop-color="#b8b8b8"/>
        <stop offset="100%" stop-color="#5a5a5a"/>
      </radialGradient>
      <filter id="acar-shadow-{{ $n }}" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
        <feOffset dy="4" result="o"/>
        <feComponentTransfer><feFuncA type="linear" slope="0.35"/></feComponentTransfer>
        <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>

    <!-- ========== Row 1: chassis + 4 wheels (y: 20..260) ========== -->
    <g filter="url(#acar-shadow-{{ $n }})">
      <rect x="180" y="30" width="360" height="240" rx="10" fill="url(#acar-wood-{{ $n }})"/>
      <!-- Screws at corners -->
      <circle cx="200" cy="50"  r="5" fill="url(#acar-chrome-{{ $n }})"/>
      <circle cx="520" cy="50"  r="5" fill="url(#acar-chrome-{{ $n }})"/>
      <circle cx="200" cy="250" r="5" fill="url(#acar-chrome-{{ $n }})"/>
      <circle cx="520" cy="250" r="5" fill="url(#acar-chrome-{{ $n }})"/>
      <!-- ESP32 + TB6612FNG suggested on deck -->
      <rect x="290" y="90"  width="70" height="48" rx="3" fill="#15402a"/>
      <text x="325" y="117" text-anchor="middle" font-family="ui-monospace" font-size="9" fill="#f4ede0">ESP32</text>
      <rect x="370" y="90"  width="70" height="48" rx="3" fill="#1a1a1f"/>
      <text x="405" y="117" text-anchor="middle" font-family="ui-monospace" font-size="9" fill="#f4ede0">TB6612</text>
      <text x="360" y="175" text-anchor="middle" font-family="ui-serif, Georgia, serif"
            font-size="12" fill="#3a2510" font-style="italic">4WD chassis · overhead view</text>
    </g>

    <!-- 4 wheels: L1 top-left, R1 top-right, L2 bottom-left, R2 bottom-right -->
    {{ range $wheel := (slice
        (dict "id" "L1" "cx" "150" "cy" "80")
        (dict "id" "R1" "cx" "580" "cy" "80")
        (dict "id" "L2" "cx" "150" "cy" "220")
        (dict "id" "R2" "cx" "580" "cy" "220")) }}
      <g id="anim-car-rotor-{{ $wheel.id }}-{{ $n }}" class="rotor"
         transform="rotate(0 {{ $wheel.cx }} {{ $wheel.cy }})">
        <circle cx="{{ $wheel.cx }}" cy="{{ $wheel.cy }}" r="40" fill="url(#acar-tire-{{ $n }})"/>
        <circle cx="{{ $wheel.cx }}" cy="{{ $wheel.cy }}" r="28" fill="url(#acar-hub-{{ $n }})"/>
        <circle cx="{{ $wheel.cx }}" cy="{{ $wheel.cy }}" r="10" fill="url(#acar-chrome-{{ $n }})"/>
        <rect x="{{ add (int $wheel.cx) -2 }}" y="{{ add (int $wheel.cy) -30 }}"
              width="4" height="28" fill="#3a2510"/>
      </g>
    {{ end }}

    <!-- ========== Row 2: current-flow schematic (y: 300..500) ========== -->
    <text x="360" y="320" text-anchor="middle" font-family="ui-serif, Georgia, serif"
          font-size="13" fill="#3a2510" font-style="italic">channel A → left wheels · channel B → right wheels</text>

    <!-- ESP32 block -->
    <g filter="url(#acar-shadow-{{ $n }})">
      <rect x="80" y="350" width="120" height="120" rx="6" fill="#15402a"/>
      <text x="140" y="415" text-anchor="middle" font-family="ui-monospace" font-size="13" fill="#f4ede0">ESP32</text>
    </g>
    <!-- Channel A block -->
    <g filter="url(#acar-shadow-{{ $n }})">
      <rect x="280" y="360" width="160" height="50" rx="4" fill="#1a1a1f"/>
      <text x="360" y="390" text-anchor="middle" font-family="ui-monospace" font-size="11" fill="#ffe27a">Channel A</text>
    </g>
    <!-- Channel B block -->
    <g filter="url(#acar-shadow-{{ $n }})">
      <rect x="280" y="420" width="160" height="50" rx="4" fill="#1a1a1f"/>
      <text x="360" y="450" text-anchor="middle" font-family="ui-monospace" font-size="11" fill="#ffe27a">Channel B</text>
    </g>

    <!-- Wires ESP → ChannelA/B, Channel → wheel pairs -->
    <path id="anim-car-wire-A-{{ $n }}"
          d="M 200 385 L 280 385 M 440 385 C 560 385, 600 380, 620 370" stroke="#8a7a55" stroke-width="3" fill="none"/>
    <path id="anim-car-wire-B-{{ $n }}"
          d="M 200 445 L 280 445 M 440 445 C 560 445, 600 450, 620 460" stroke="#8a7a55" stroke-width="3" fill="none"/>
    <g id="anim-car-flow-A-{{ $n }}"></g>
    <g id="anim-car-flow-B-{{ $n }}"></g>
    <text x="635" y="372" font-family="ui-monospace" font-size="10" fill="#3a2510">L1+L2</text>
    <text x="635" y="468" font-family="ui-monospace" font-size="10" fill="#3a2510">R1+R2</text>

    <!-- ========== Row 3: D-pad (y: 520..710) ========== -->
    <g filter="url(#acar-shadow-{{ $n }})">
      <circle cx="360" cy="615" r="95" fill="url(#acar-dpad-{{ $n }})"/>
    </g>

    <!-- Buttons: reusable group. Each is role=button, tabindex=0, focusable. -->
    {{ $btns := (slice
        (dict "id" "up"    "cx" "360" "cy" "555" "label" "↑")
        (dict "id" "left"  "cx" "300" "cy" "615" "label" "←")
        (dict "id" "stop"  "cx" "360" "cy" "615" "label" "■" "accent" true)
        (dict "id" "right" "cx" "420" "cy" "615" "label" "→")
        (dict "id" "down"  "cx" "360" "cy" "675" "label" "↓")) }}

    {{ range $btn := $btns }}
      <g id="anim-car-btn-{{ $btn.id }}-{{ $n }}"
         class="hw-svg-btn" role="button" tabindex="0"
         data-value="{{ $btn.id }}"
         aria-label="{{ $btn.id }}"
         style="cursor:pointer">
        <rect class="hw-svg-btn-ring" x="{{ add (int $btn.cx) -24 }}" y="{{ add (int $btn.cy) -24 }}"
              width="48" height="48" rx="10" fill="none"/>
        <circle cx="{{ $btn.cx }}" cy="{{ $btn.cy }}" r="24"
                fill="{{ if $btn.accent }}#c77d2a{{ else }}url(#acar-chrome-{{ $n }}){{ end }}"
                stroke="#5a5a5a" stroke-width="1.5"/>
        <text x="{{ $btn.cx }}" y="{{ add (int $btn.cy) 8 }}" text-anchor="middle"
              font-family="ui-serif, Georgia, serif" font-size="22"
              fill="{{ if $btn.accent }}#f4ede0{{ else }}#3a2510{{ end }}"
              style="pointer-events:none">{{ $btn.label }}</text>
      </g>
    {{ end }}
  </svg>

  <div class="hw-status" id="anim-car-status-{{ $n }}">idle — press arrow keys or click the D-pad</div>
  <figcaption>click a direction (or use arrow keys) — watch how both channels steer the car</figcaption>

  <script>
    document.addEventListener('DOMContentLoaded', function () {
      if (window.Anims && Anims.initCar) Anims.initCar("anim-car-{{ $n }}");
    });
  </script>
</figure>
```

- [ ] **Step 2: Drop into post**

Edit `content/posts/hardware-is-hard/index.md`. Add `{{< anim-car >}}` on the line immediately after `{{< anim-hbridge >}}` (so all three widgets stack at the end of the post for now).

- [ ] **Step 3: Verify illustration renders**

Reload. Expected:
- Wood-grain chassis with 4 black-tread + yellow-hub wheels and chrome screws.
- Two dark blocks on the chassis labeled ESP32 and TB6612.
- Below: schematic row with ESP32, Channel A, Channel B blocks, dim wires going to labels "L1+L2" / "R1+R2".
- Bottom: circular chrome D-pad with 5 raised pills — Up arrow, Left arrow, amber Stop, Right arrow, Down arrow.
- Tabbing into the widget (click it once then Tab) shows an amber focus ring around buttons.

Console error `Anims.initCar is not a function` expected. No other errors.

- [ ] **Step 4: Commit**

```bash
git add layouts/shortcodes/anim-car.html content/posts/hardware-is-hard/index.md
git commit -m "animations: anim-car shortcode SVG illustration (chassis + schematic + D-pad)"
```

---

## Task 11: `anim-car.js` — behavior (D-pad + keyboard + tank-turn)

**Files:**
- Create: `static/animations/anim-car.js`

- [ ] **Step 1: Write the widget logic**

Create `static/animations/anim-car.js`:

```javascript
(function () {
  'use strict';
  if (!window.Anims) { console.error('[anim-car] Anims runtime missing'); return; }

  // command → { channelA sign, channelB sign, brake }
  // Channel A drives L-side (L1+L2). Channel B drives R-side (R1+R2).
  // NOTE: for a tank-turn LEFT, the RIGHT side wheels must spin FORWARD
  // and the LEFT side must reverse. For RIGHT turn, mirror.
  var COMMANDS = {
    up:    { a:  1, b:  1, brake: false, label: 'drive forward' },
    down:  { a: -1, b: -1, brake: false, label: 'drive backward' },
    left:  { a: -1, b:  1, brake: false, label: 'tank-turn left' },
    right: { a:  1, b: -1, brake: false, label: 'tank-turn right' },
    stop:  { a:  0, b:  0, brake: true,  label: 'brake — all wheels lock' },
  };

  var KEY_TO_CMD = {
    ArrowUp: 'up',
    ArrowDown: 'down',
    ArrowLeft: 'left',
    ArrowRight: 'right',
    ' ': 'stop',
  };

  function init(rootId) {
    var root = document.getElementById(rootId);
    if (!root) return;
    var n = rootId.replace('anim-car-', '');

    var rotors = {
      L1: document.getElementById('anim-car-rotor-L1-' + n),
      R1: document.getElementById('anim-car-rotor-R1-' + n),
      L2: document.getElementById('anim-car-rotor-L2-' + n),
      R2: document.getElementById('anim-car-rotor-R2-' + n),
    };
    var wireA = document.getElementById('anim-car-wire-A-' + n);
    var wireB = document.getElementById('anim-car-wire-B-' + n);
    var flowA = document.getElementById('anim-car-flow-A-' + n);
    var flowB = document.getElementById('anim-car-flow-B-' + n);
    var status = document.getElementById('anim-car-status-' + n);
    var btnIds = ['up', 'left', 'stop', 'right', 'down'];
    var btns = {};
    btnIds.forEach(function (id) {
      btns[id] = document.getElementById('anim-car-btn-' + id + '-' + n);
    });

    // Wheel centers match the SVG — needed so rotate transforms have the right pivot.
    var motors = {
      L1: Anims.spinMotor(rotors.L1, { center: [150,  80] }),
      R1: Anims.spinMotor(rotors.R1, { center: [580,  80] }),
      L2: Anims.spinMotor(rotors.L2, { center: [150, 220] }),
      R2: Anims.spinMotor(rotors.R2, { center: [580, 220] }),
    };
    var flA = Anims.flowCurrent(wireA, flowA, { color: '#ffa94d' });
    var flB = Anims.flowCurrent(wireB, flowB, { color: '#ffa94d' });

    var current = null; // null = idle

    function apply(cmd) {
      current = cmd;
      var c = COMMANDS[cmd] || { a: 0, b: 0, brake: false, label: 'idle' };
      var mag = 10; // deg/frame when active
      motors.L1.setVelocity(c.a * mag, { brake: c.brake });
      motors.L2.setVelocity(c.a * mag, { brake: c.brake });
      motors.R1.setVelocity(c.b * mag, { brake: c.brake });
      motors.R2.setVelocity(c.b * mag, { brake: c.brake });

      flA.setRate(c.a === 0 ? 0 : (c.a > 0 ? 1 : -1));
      flB.setRate(c.b === 0 ? 0 : (c.b > 0 ? 1 : -1));

      wireA.setAttribute('stroke', c.a !== 0 ? '#c77d2a' : '#8a7a55');
      wireB.setAttribute('stroke', c.b !== 0 ? '#c77d2a' : '#8a7a55');

      // Button feedback
      btnIds.forEach(function (id) {
        if (!btns[id]) return;
        var active = id === cmd;
        btns[id].setAttribute('data-active', active ? 'true' : 'false');
        // Highlight active button via stroke swap
        var ring = btns[id].querySelector('circle');
        if (ring) ring.setAttribute('stroke', active ? '#c77d2a' : '#5a5a5a');
      });

      status.textContent = cmd ? (cmd + ' — ' + c.label) : 'idle — press arrow keys or click the D-pad';
    }

    // Click handlers on SVG buttons
    btnIds.forEach(function (id) {
      if (!btns[id]) return;
      btns[id].addEventListener('click', function () { apply(id); });
    });

    // Keyboard (only when widget has focus)
    function onKey(e) {
      if (e.key === 'Escape') { root.blur(); e.preventDefault(); return; }
      var cmd = KEY_TO_CMD[e.key];
      if (cmd) { apply(cmd); e.preventDefault(); }
    }
    root.addEventListener('keydown', onKey);

    // Idle state on init
    apply(null);

    return function destroy() {
      root.removeEventListener('keydown', onKey);
      Object.keys(motors).forEach(function (k) { motors[k].destroy(); });
      flA.destroy();
      flB.destroy();
    };
  }

  window.Anims = window.Anims || {};
  window.Anims.initCar = init;
})();
```

- [ ] **Step 2: Verify end-to-end**

Reload the post. Test:

1. Click the figure (or Tab to it). Status: "idle …".
2. Click **↑** → status "up — drive forward". All 4 wheels spin same direction. Channel A wire and Channel B wire both amber; particles flow on both.
3. Click **↓** → all 4 wheels reverse.
4. Click **←** → L-side (L1, L2) reverse; R-side (R1, R2) forward; wires still both amber. This is tank-turn left.
5. Click **→** → mirror: L-side forward, R-side reverse.
6. Click **■** (Stop, center amber) → all wheels decay FAST to stop; wires go dim; no particles.
7. Keyboard test: click into figure, press Arrow keys — same behavior as clicks. Space → stop. Escape → blur (Tab moves away next time).
8. No console errors.
9. Mobile (320px wide in DevTools): D-pad remains big enough to tap; buttons don't overlap. Hit targets good.
10. Reduced motion: D-pad still works; wheels don't rotate; no particles.

- [ ] **Step 3: Commit**

```bash
git add static/animations/anim-car.js
git commit -m "animations: anim-car widget behavior (D-pad + keyboard + tank-turn)"
```

---

## Task 12: Responsive + reduced-motion verification + cleanup

**Files:**
- Possibly minor tweaks to: `static/animations/core.css`, shortcodes

- [ ] **Step 1: Test at 5 viewport widths**

Use Chrome DevTools device toolbar. Verify each widget at:
- 320 × 568 (iPhone SE)
- 375 × 667 (iPhone 8)
- 414 × 896 (iPhone 11)
- 768 × 1024 (iPad portrait)
- 1200 × 800 (laptop)

For each: all three widgets render without horizontal scroll; controls are tappable (≥44px); text is readable; no element overflows the article column.

If any widget overflows or has unreadable text, tweak `core.css` (widget container padding/max-width/flex-wrap) or the shortcode SVG (font sizes in text elements).

- [ ] **Step 2: Test reduced-motion**

In DevTools → Rendering → Emulate CSS media feature `prefers-reduced-motion: reduce`. Reload. Expected for all three widgets:
- No rotation on any motor/wheel.
- No particles visible.
- Breathing idle on anim-cell nub is off.
- Sliders, buttons, and keyboard all still function.
- Readouts and status lines still update.

- [ ] **Step 3: Check bundle size budget**

Run:
```bash
ls -lh static/animations/*.css static/animations/*.js
```
Expected: combined size < 40 KB uncompressed. Gzip budget is ≤12 KB; if a file is unexpectedly large, review for stray verbose patterns.

- [ ] **Step 4: Commit any polish changes**

```bash
git add static/animations/ layouts/shortcodes/
git commit -m "animations: responsive + reduced-motion polish"
```

(If no changes were needed, skip the commit.)

---

## Task 13: Delete superseded old files

**Files:**
- Delete: `animations/hardware-anims.js`, `animations/hardware-anims.css`, `animations/` directory
- Delete: `anim-cell.html` (repo root), `anim-hbridge.html` (repo root), `anim-car.html` (repo root), `wiring-guide.html` (repo root)

- [ ] **Step 1: Verify all the scratch files are indeed unused**

Run:
```bash
grep -rn "hardware-anims" layouts/ content/ static/ || echo "no refs"
grep -rn "wiring-guide"  layouts/ content/ static/ || echo "no refs"
```
Expected: "no refs" for both. (The new work lives under `static/animations/*`, so nothing references the old paths.)

- [ ] **Step 2: Delete old files**

```bash
git rm animations/hardware-anims.js animations/hardware-anims.css
git rm anim-cell.html anim-hbridge.html anim-car.html
rm -f wiring-guide.html       # untracked, plain rm
rmdir animations 2>/dev/null || true
```

- [ ] **Step 3: Verify the live site still works**

Reload `http://localhost:1313/posts/hardware-is-hard/`. All three widgets still render and work. No 404s in Network tab.

- [ ] **Step 4: Commit**

```bash
git add -u
git commit -m "animations: delete superseded flat-2D scratch files"
```

---

## Self-review checklist

After all 13 tasks are committed, run through this quickly:

- [ ] Every spec requirement in §6 (widget details), §7 (motion model), §8 (responsive), §9 (Hugo integration), §10 (fidelity) has a corresponding task.
- [ ] Spec §10 component checklist: 18650 cell ✓ (T6), DC motor body ✓ (T6, T8), Wheel ✓ (T10), ESP32 ✓ (T8, T10), TB6612FNG ✓ (T8, T10), MOSFET ✓ (T8), Chassis ✓ (T10), D-pad ✓ (T10), Wires ✓ (T6,T8,T10), Battery ✓ (T8).
- [ ] No placeholder strings (TBD/TODO/similar-to-task-N) — every step has concrete code or command.
- [ ] Function/id names match across tasks: `Anims.initCell`, `Anims.initHBridge`, `Anims.initCar`; every `id="..."` used in a JS `getElementById` call is declared in the corresponding shortcode.
- [ ] Hugo template syntax is consistent: `{{ .Ordinal }}` used for unique ids, `relURL` for asset paths.

---

## Deferred items (not part of this plan)

- Author writes prose for H-bridge and D-pad sections in the blog post. Shortcode insertion points in tasks 8 and 10 use end-of-post placement; once prose exists, the author reorders shortcode calls in the markdown.
- Any future animation added to another post inherits this machinery by setting `animations: true` in its front matter.
- Tuning of motion constants (`k=0.06/0.015/0.08`, max 18 deg/frame, particle spawn cadence) can happen post-landing based on reader feedback.
