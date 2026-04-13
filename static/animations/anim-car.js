(function () {
  'use strict';
  if (!window.Anims) { console.error('[anim-car] Anims runtime missing'); return; }

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

    var motors = {
      L1: Anims.spinMotor(rotors.L1, { center: [150,  80] }),
      R1: Anims.spinMotor(rotors.R1, { center: [580,  80] }),
      L2: Anims.spinMotor(rotors.L2, { center: [150, 220] }),
      R2: Anims.spinMotor(rotors.R2, { center: [580, 220] }),
    };
    var flA = Anims.flowCurrent(wireA, flowA, { color: '#ffa94d' });
    var flB = Anims.flowCurrent(wireB, flowB, { color: '#ffa94d' });

    function apply(cmd) {
      var c = COMMANDS[cmd] || { a: 0, b: 0, brake: false, label: 'idle' };
      var mag = 10;
      motors.L1.setVelocity(c.a * mag, { brake: c.brake });
      motors.L2.setVelocity(c.a * mag, { brake: c.brake });
      motors.R1.setVelocity(c.b * mag, { brake: c.brake });
      motors.R2.setVelocity(c.b * mag, { brake: c.brake });

      flA.setRate(c.a === 0 ? 0 : (c.a > 0 ? 1 : -1));
      flB.setRate(c.b === 0 ? 0 : (c.b > 0 ? 1 : -1));

      wireA.setAttribute('stroke', c.a !== 0 ? '#c77d2a' : '#8a7a55');
      wireB.setAttribute('stroke', c.b !== 0 ? '#c77d2a' : '#8a7a55');

      btnIds.forEach(function (id) {
        if (!btns[id]) return;
        var active = id === cmd;
        btns[id].setAttribute('data-active', active ? 'true' : 'false');
        var ring = btns[id].querySelector('circle');
        if (ring) ring.setAttribute('stroke', active ? '#c77d2a' : '#5a5a5a');
      });

      status.textContent = cmd ? (cmd + ' — ' + c.label) : 'idle — press arrow keys or click the D-pad';
    }

    btnIds.forEach(function (id) {
      if (!btns[id]) return;
      btns[id].addEventListener('click', function () { apply(id); });
    });

    function onKey(e) {
      if (e.key === 'Escape') { root.blur(); e.preventDefault(); return; }
      var cmd = KEY_TO_CMD[e.key];
      if (cmd) { apply(cmd); e.preventDefault(); }
    }
    root.addEventListener('keydown', onKey);

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
