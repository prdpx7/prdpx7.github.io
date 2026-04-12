/* Hardware animations — shared library.
   Exposes window.Anims with primitives, DOM helpers, and per-widget inits. */

window.Anims = (() => {
  'use strict';

  const PALETTE = {
    bg: '#1a1a1f', panel: '#161628', ink: '#c8c8d0', dim: '#555',
    blue: '#3498db', green: '#2ecc71', yellow: '#f1c40f',
    red: '#e74c3c', purple: '#9b59b6', focus: '#3498db',
  };

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

  // --- Primitives (filled in Tasks 3 & 4) ---
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
