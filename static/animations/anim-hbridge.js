(function () {
  'use strict';
  if (!window.Anims) { console.error('[anim-hbridge] Anims runtime missing'); return; }

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

      Object.keys(mosfets).forEach(function (k) {
        var on = m.on.indexOf(k) !== -1;
        mosfets[k].setAttribute('fill', on ? '#ffa94d' : '#4a4a52');
        mosfets[k].setAttribute('data-on', on ? 'true' : 'false');
      });

      wireA.setAttribute('stroke', m.wire === 'A' ? '#c77d2a' : '#8a7a55');
      wireB.setAttribute('stroke', m.wire === 'B' ? '#c77d2a' : '#8a7a55');

      var scaled = (pwm / 255) * 12;
      motor.setVelocity(m.sign * scaled, { brake: m.brake });

      flA.setRate(m.wire === 'A' ? pwm / 255 : 0);
      flB.setRate(m.wire === 'B' ? pwm / 255 : 0);

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
