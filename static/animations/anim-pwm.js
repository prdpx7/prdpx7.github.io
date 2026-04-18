import * as THREE from 'three';

// PWM frequency we simulate visually: 5 kHz is realistic for TB6612 but
// far too fast to see individual pulses. We show ~3 Hz so one full cycle
// takes ~333 ms — slow enough to read, fast enough to feel like a signal.
const VISUAL_HZ = 3;

const MAT = {
  rubber:    () => new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.95, metalness: 0.0 }),
  yellowABS: () => new THREE.MeshStandardMaterial({ color: 0xf2c034, roughness: 0.5,  metalness: 0.05 }),
  yellowDark:() => new THREE.MeshStandardMaterial({ color: 0xc4921c, roughness: 0.55, metalness: 0.05 }),
  chrome:    () => new THREE.MeshStandardMaterial({ color: 0xd6d6d6, roughness: 0.22, metalness: 0.92 }),
  motorShell:() => new THREE.MeshStandardMaterial({ color: 0x1f1f20, roughness: 0.35, metalness: 0.55 }),
  ink:       () => new THREE.MeshStandardMaterial({ color: 0x3a2510, roughness: 0.7 }),
};

export function initPWM(root) {
  if (!root) return;

  const scopeEl   = root.querySelector('[id^="anim-pwm-scope"]');
  const mountEl   = root.querySelector('[data-3d-mount]');
  const slider    = root.querySelector('[data-pwm-duty]');
  const readout   = root.querySelector('[data-pwm-readout]');
  const statusEl  = root.querySelector('[data-status]');
  const dutyBtns  = Array.from(root.querySelectorAll('[data-duty]'));

  if (!scopeEl || !mountEl || !slider) { console.warn('[anim-pwm] missing elements'); return; }

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let duty = parseInt(slider.value, 10); // 0–255

  // ─── STATUS helper ───────────────────────────────────────────────
  function updateStatus() {
    const pct = Math.round(duty / 255 * 100);
    const desc = duty === 0   ? 'motor stopped'
               : duty < 80   ? 'motor at low speed'
               : duty < 160  ? 'motor at half speed'
               : duty < 240  ? 'motor at high speed'
               :               'motor at full speed';
    if (statusEl) statusEl.textContent = `ledcWrite(PWMA, ${duty})  — ${pct}% duty — ${desc}`;
  }

  // ─── OSCILLOSCOPE (2D canvas) ─────────────────────────────────────
  // We draw a scrolling waveform: a square wave whose HIGH fraction = duty/255.
  // The wave scrolls left at constant speed; the HIGH segments light up amber,
  // LOW segments stay dark. Axis labels "ON" / "OFF" are drawn on the right edge.
  const scopeCanvas = document.createElement('canvas');
  scopeEl.appendChild(scopeCanvas);
  const ctx2d = scopeCanvas.getContext('2d');

  // Phase in [0, 1) advances each frame. At phase < duty/255 we are HIGH.
  let phase = 0;

  // Ring buffer: one column per pixel-width, storing 1 (HIGH) or 0 (LOW).
  // We push one new column per frame at the right edge and shift left.
  let scopeW = 0, scopeH = 0;
  let waveBuffer = new Uint8Array(0);

  function resizeScope() {
    const dpr = window.devicePixelRatio || 1;
    const r = scopeEl.getBoundingClientRect();
    const newW = Math.round(r.width)  || 320;
    const newH = Math.round(r.height) || 240;
    if (newW === scopeW && newH === scopeH) return;
    scopeW = newW;
    scopeH = newH;
    scopeCanvas.width  = Math.round(scopeW * dpr);
    scopeCanvas.height = Math.round(scopeH * dpr);
    // ctx2d scale is reset via setTransform in drawScope — don't accumulate here
    const oldBuf = waveBuffer;
    waveBuffer = new Uint8Array(scopeW);
    // Copy as much of the old buffer as fits
    if (oldBuf.length) waveBuffer.set(oldBuf.slice(0, Math.min(oldBuf.length, scopeW)));
  }
  resizeScope();

  const SCOPE_PAD_L = 40; // px left for axis label
  const SCOPE_PAD_R = 36; // px right for ON/OFF labels
  const SCOPE_PAD_T = 18;
  const SCOPE_PAD_B = 18;

  function drawScope(newSample) {
    // Shift buffer left by 1, append new sample at right
    waveBuffer.copyWithin(0, 1);
    waveBuffer[scopeW - 1] = newSample;

    const W = scopeW, H = scopeH;
    const dpr = window.devicePixelRatio || 1;

    // Reset transform to identity (resizeScope set a cumulative scale)
    ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx2d.clearRect(0, 0, W, H);

    // Background
    ctx2d.fillStyle = '#1a1410';
    ctx2d.fillRect(0, 0, W, H);

    // Grid — 4 horizontal lines
    ctx2d.strokeStyle = 'rgba(255,200,100,0.08)';
    ctx2d.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = SCOPE_PAD_T + (H - SCOPE_PAD_T - SCOPE_PAD_B) * (i / 4);
      ctx2d.beginPath();
      ctx2d.moveTo(SCOPE_PAD_L, y);
      ctx2d.lineTo(W - SCOPE_PAD_R, y);
      ctx2d.stroke();
    }

    // Grid — vertical lines every ~80px
    const vStep = 80;
    for (let x = SCOPE_PAD_L; x < W - SCOPE_PAD_R; x += vStep) {
      ctx2d.beginPath();
      ctx2d.moveTo(x, SCOPE_PAD_T);
      ctx2d.lineTo(x, H - SCOPE_PAD_B);
      ctx2d.stroke();
    }

    // Axis labels (left side)
    ctx2d.font = '11px ui-monospace, Menlo, Consolas, monospace';
    ctx2d.textAlign = 'right';
    ctx2d.fillStyle = '#c77d2a';
    ctx2d.fillText('ON',  SCOPE_PAD_L - 4, SCOPE_PAD_T + 6);
    ctx2d.fillStyle = '#5a4a30';
    ctx2d.fillText('OFF', SCOPE_PAD_L - 4, H - SCOPE_PAD_B - 2);

    // "5 kHz" label top-right corner
    ctx2d.textAlign = 'right';
    ctx2d.fillStyle = 'rgba(200,160,80,0.45)';
    ctx2d.fillText('5 kHz', W - SCOPE_PAD_R - 4, SCOPE_PAD_T - 4);

    // Duty % label top-left
    ctx2d.textAlign = 'left';
    ctx2d.fillStyle = '#ffa94d';
    ctx2d.font = 'bold 13px ui-monospace, Menlo, Consolas, monospace';
    ctx2d.fillText(Math.round(duty / 255 * 100) + '%', SCOPE_PAD_L + 4, SCOPE_PAD_T + 14);

    // Waveform path
    const drawW = W - SCOPE_PAD_L - SCOPE_PAD_R;
    const yHigh = SCOPE_PAD_T + 4;
    const yLow  = H - SCOPE_PAD_B - 4;

    ctx2d.lineWidth = 2.5;
    ctx2d.lineJoin = 'miter';
    ctx2d.beginPath();

    let inPath = false;
    for (let i = 0; i < scopeW; i++) {
      const x = SCOPE_PAD_L + (i / scopeW) * drawW;
      const y = waveBuffer[i] ? yHigh : yLow;
      if (!inPath) { ctx2d.moveTo(x, y); inPath = true; }
      else {
        // Vertical jump when previous sample differs
        if (waveBuffer[i] !== waveBuffer[i - 1]) {
          const xPrev = SCOPE_PAD_L + ((i - 1) / scopeW) * drawW;
          // close previous horizontal segment
          ctx2d.lineTo(xPrev + 1.5, waveBuffer[i - 1] ? yHigh : yLow);
          // vertical edge
          ctx2d.lineTo(xPrev + 1.5, y);
        }
        ctx2d.lineTo(x, y);
      }
    }

    // Glow: draw twice (shadow blur + solid)
    ctx2d.shadowColor = '#ff7a10';
    ctx2d.shadowBlur = 6;
    ctx2d.strokeStyle = '#ffa94d';
    ctx2d.stroke();
    ctx2d.shadowBlur = 0;
  }

  // Warm up buffer with current duty so waveform is visible immediately
  ;(function prefillBuffer() {
    const cycleLen = Math.max(1, Math.round(scopeW / 4)); // 4 cycles visible
    for (let i = 0; i < scopeW; i++) {
      const p = (i % cycleLen) / cycleLen;
      waveBuffer[i] = p < duty / 255 ? 1 : 0;
    }
  })();

  // ─── THREE.JS WHEEL ──────────────────────────────────────────────
  const getSize = () => {
    const r = mountEl.getBoundingClientRect();
    return { w: Math.round(r.width) || 360, h: Math.round(r.height) || 270 };
  };
  let { w: width, h: height } = getSize();

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(Math.max(width, 100), Math.max(height, 80));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  mountEl.appendChild(renderer.domElement);
  const loading = mountEl.querySelector('.hw-canvas-loading');
  if (loading) loading.remove();

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf4ede0);

  // Wheel occupies x ∈ [-1.1, 1.8], y ∈ [-1.1, 1.2] (with 0.6 padding).
  const SCENE_W = 3.5;
  const SCENE_H = 2.9;
  const SCENE_CX = 0.35;
  const SCENE_CY = 0.05;

  function makeFrustum(w, h) {
    const sceneAspect = SCENE_W / SCENE_H;
    const vpAspect = w / h;
    let fw, fh;
    if (vpAspect >= sceneAspect) {
      fh = SCENE_H; fw = fh * vpAspect;
    } else {
      fw = SCENE_W; fh = fw / vpAspect;
    }
    return { fw, fh };
  }

  const { fw: initFW, fh: initFH } = makeFrustum(width, height);
  const camera = new THREE.OrthographicCamera(
    SCENE_CX - initFW / 2, SCENE_CX + initFW / 2,
    SCENE_CY + initFH / 2, SCENE_CY - initFH / 2,
    0.1, 40
  );
  camera.position.set(0, 0.4, 10);
  camera.lookAt(0, 0.1, 0);

  // Lighting — same warm palette as anim-cell
  scene.add(new THREE.AmbientLight(0xfff6df, 0.55));
  const key = new THREE.DirectionalLight(0xffffff, 1.15);
  key.position.set(4, 7, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  const sc = key.shadow.camera;
  sc.near = 0.1; sc.far = 25;
  sc.left = -6; sc.right = 6; sc.top = 6; sc.bottom = -6;
  key.shadow.bias = -0.0002;
  scene.add(key);
  scene.add(new THREE.HemisphereLight(0xfff1d8, 0xc9b084, 0.25));

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 20),
    new THREE.ShadowMaterial({ opacity: 0.18 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -1.1;
  ground.receiveShadow = true;
  scene.add(ground);

  // ── Wheel (same geometry as anim-cell) ──
  const wheel = new THREE.Group();

  const tire = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.19, 18, 56), MAT.rubber());
  tire.castShadow = true; tire.receiveShadow = true;
  wheel.add(tire);

  const treadMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.95 });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.46), treadMat);
    t.position.set(Math.cos(a) * 0.95, Math.sin(a) * 0.95, 0);
    t.rotation.z = a;
    wheel.add(t);
  }

  // White marker stud for unambiguous direction
  const marker = new THREE.Mesh(
    new THREE.SphereGeometry(0.055, 16, 12),
    new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.25, metalness: 0.9 })
  );
  marker.position.set(0, 0.55, 0.18);
  wheel.add(marker);

  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.28, 40), MAT.yellowABS());
  hub.rotation.x = Math.PI / 2;
  hub.castShadow = true;
  wheel.add(hub);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.03, 8, 40), MAT.yellowDark());
  wheel.add(rim);

  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const sg = new THREE.Group(); sg.rotation.z = a;
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.4, 0.22), MAT.yellowDark());
    spoke.position.set(0, 0.24, 0);
    sg.add(spoke);
    wheel.add(sg);
  }

  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.36, 24), MAT.chrome());
  cap.rotation.x = Math.PI / 2;
  wheel.add(cap);

  wheel.position.set(0.3, 0, 0.2);
  scene.add(wheel);

  // Speed readout label — "SPEED: 50%" drawn as canvas sprite, updated each frame
  function makeSpeedSprite() {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 64;
    const c = canvas.getContext('2d');
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(2.2, 0.55, 1);
    sprite.position.set(0.3, -1.05, 0.5);
    sprite.renderOrder = 100;
    scene.add(sprite);

    function update(pct) {
      c.clearRect(0, 0, 256, 64);
      c.font = 'bold 28px ui-monospace, Menlo, Consolas, monospace';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillStyle = pct === 0 ? '#8a7a55' : '#c77d2a';
      c.fillText(pct + '% speed', 128, 32);
      tex.needsUpdate = true;
    }
    update(Math.round(duty / 255 * 100));
    return update;
  }
  const updateSpeedLabel = makeSpeedSprite();

  // ─── CONTROLS ─────────────────────────────────────────────────────
  function setDuty(val) {
    duty = Math.max(0, Math.min(255, val));
    slider.value = duty;
    if (readout) readout.textContent = String(duty);
    updateSpeedLabel(Math.round(duty / 255 * 100));
    updateStatus();
    // Highlight matching preset button
    const pct = Math.round(duty / 255 * 100);
    for (const b of dutyBtns) {
      b.setAttribute('data-active', String(parseInt(b.dataset.duty, 10) === pct));
    }
  }

  for (const btn of dutyBtns) {
    btn.addEventListener('click', () => {
      setDuty(Math.round(parseInt(btn.dataset.duty, 10) / 100 * 255));
    });
  }
  slider.addEventListener('input', () => setDuty(parseInt(slider.value, 10)));

  // Init highlight for default 128 (≈50%)
  setDuty(duty);

  // ─── ANIMATION LOOP ───────────────────────────────────────────────
  // PWM "on" fraction per frame = duty/255.
  // Phase advances each frame; when it crosses 1 it wraps.
  // The wheel gets a velocity proportional to duty — exactly like the real motor.

  let wheelVel = 0;
  let lastTime = null;
  let destroyed = false;

  function tick(now) {
    if (destroyed) return;
    requestAnimationFrame(tick);

    const dt = lastTime === null ? 1 / 60 : Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;

    // Advance PWM phase at VISUAL_HZ
    phase = (phase + VISUAL_HZ * dt) % 1;
    const isHigh = phase < duty / 255 ? 1 : 0;

    if (!reduced) {
      drawScope(isHigh);

      // Wheel speed: smooth toward target
      const targetVel = (duty / 255) * 0.06;
      wheelVel += (targetVel - wheelVel) * (duty === 0 ? 0.04 : 0.08);
      if (Math.abs(wheelVel) < 0.0003 && duty === 0) wheelVel = 0;
      wheel.rotation.z -= wheelVel;
    }

    renderer.render(scene, camera);
  }
  requestAnimationFrame(tick);

  // ─── RESIZE ───────────────────────────────────────────────────────
  const ro = new ResizeObserver(() => {
    resizeScope();
    const cycleLen = Math.max(1, Math.round(scopeW / 4));
    for (let i = 0; i < scopeW; i++) {
      const p = (i % cycleLen) / cycleLen;
      waveBuffer[i] = p < duty / 255 ? 1 : 0;
    }

    const { w, h } = getSize();
    if (w > 0 && h > 0) {
      renderer.setSize(w, h);
      const { fw, fh } = makeFrustum(w, h);
      camera.left   = SCENE_CX - fw / 2;
      camera.right  = SCENE_CX + fw / 2;
      camera.top    = SCENE_CY + fh / 2;
      camera.bottom = SCENE_CY - fh / 2;
      camera.updateProjectionMatrix();
    }
  });
  ro.observe(root);

  return function destroy() {
    destroyed = true;
    ro.disconnect();
    renderer.dispose();
    scene.traverse(obj => {
      if (obj.isMesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else if (obj.material) obj.material.dispose();
      }
    });
  };
}
