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

  var motors = [];
  var rafId = null;

  function tick() {
    var reduced = prefersReducedMotion();
    for (var i = 0; i < motors.length; i++) {
      var m = motors[i];
      if (reduced) {
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

  global.Anims = global.Anims || {};
  global.Anims.clamp = clamp;
  global.Anims.prefersReducedMotion = prefersReducedMotion;
  global.Anims.bindSlider = bindSlider;
  global.Anims.bindToggle = bindToggle;
  global.Anims.bindRadioGroup = bindRadioGroup;
  global.Anims.bindPress = bindPress;
  global.Anims.spinMotor = spinMotor;
})(window);
