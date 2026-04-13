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
