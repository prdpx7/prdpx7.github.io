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
