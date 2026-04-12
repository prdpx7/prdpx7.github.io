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

      espAin1.textContent = m.ain1;
      espAin2.textContent = m.ain2;
      espPwm.textContent = String(state.pwm);
      setAinButton(ain1Btn, m.ain1);
      setAinButton(ain2Btn, m.ain2);

      for (const key of ['Q1', 'Q2', 'Q3', 'Q4']) {
        qEls[key].classList.toggle('on', m.mosfets[key] === 1);
      }

      modeBtns.forEach(b => b.classList.toggle('active', b.dataset.mode === state.mode));

      const dutyScale = state.pwm / 255;
      const rpm = m.motorDir === 0 ? 0 : dutyScale * 120;
      const flowSpeed = m.motorDir === 0 ? 0 : dutyScale * 4;

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

      wheelMotors.L1.update({ rpm, direction: chAMode.motorDir, decayModel: chAMode.decay });
      wheelMotors.L2.update({ rpm, direction: chAMode.motorDir, decayModel: chAMode.decay });
      wheelMotors.R1.update({ rpm, direction: chBMode.motorDir, decayModel: chBMode.decay });
      wheelMotors.R2.update({ rpm, direction: chBMode.motorDir, decayModel: chBMode.decay });

      dpadBtns.forEach(b => b.classList.toggle('active', b.dataset.cmd === state.command));
    }

    dpadBtns.forEach(b => b.addEventListener('click', () => {
      state.command = b.dataset.cmd;
      render();
      root.focus();
    }));

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

  return {
    PALETTE,
    bindSlider, bindToggle, bindRadioGroup, bindPressHold,
    spinMotor, flowElectrons,
    initCell, initHBridge, initCar,
  };
})();
