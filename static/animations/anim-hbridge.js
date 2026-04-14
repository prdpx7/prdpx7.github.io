import * as THREE from 'three';

// Truth-table semantics from wiring-guide.html:
//   AIN1=H, AIN2=L  → forward   (VM → AO1 → motor → AO2 → GND)
//   AIN1=L, AIN2=H  → backward  (VM → AO2 → motor → AO1 → GND)
//   AIN1=H, AIN2=H  → brake     (motor leads shorted to GND)
const MODES = {
  forward:  { ain1: true,  ain2: false, sign:  1, brake: false, wire: 'A' },
  backward: { ain1: false, ain2: true,  sign: -1, brake: false, wire: 'B' },
  brake:    { ain1: true,  ain2: true,  sign:  0, brake: true,  wire: null },
};

// Signal colors (match wiring-guide.html palette)
const SIG = {
  AIN1:   0x3498db,
  AIN2:   0x2ecc71,
  PWMA:   0x9b59b6,
  GND:    0x4a4a4a,
  VM:     0xe74c3c,
  OUT_A:  0xf1c40f,   // motor wire A — yellow
  OUT_B:  0xbcc3c8,   // motor wire B — gray/white
  DIM:    0x8a7a55,
  ACTIVE: 0xc77d2a,
};

// --------- Label sprite helper ---------
function makeLabel(text, { color = '#f4ede0', bg = null, pad = 10, size = 38, family = 'ui-monospace, Menlo, Consolas, monospace', weight = '600', scale = 1 } = {}) {
  const dpr = 2;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.font = `${weight} ${size * dpr}px ${family}`;
  const w = Math.ceil(ctx.measureText(text).width) + pad * 2 * dpr;
  const h = size * dpr + pad * 2 * dpr;
  canvas.width = w;
  canvas.height = h;
  ctx.font = `${weight} ${size * dpr}px ${family}`;
  if (bg) {
    ctx.fillStyle = bg;
    const r = 6 * dpr;
    ctx.beginPath();
    ctx.moveTo(r, 0); ctx.lineTo(w - r, 0); ctx.quadraticCurveTo(w, 0, w, r);
    ctx.lineTo(w, h - r); ctx.quadraticCurveTo(w, h, w - r, h);
    ctx.lineTo(r, h); ctx.quadraticCurveTo(0, h, 0, h - r);
    ctx.lineTo(0, r); ctx.quadraticCurveTo(0, 0, r, 0);
    ctx.fill();
  }
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, w / 2, h / 2);
  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  const unitsPerPx = 0.0085 * scale;
  sprite.scale.set(w / dpr * unitsPerPx, h / dpr * unitsPerPx, 1);
  sprite.renderOrder = 100;
  return sprite;
}

export function initHBridge(root) {
  if (!root) return;
  const mount = root.querySelector('[data-3d-mount]');
  const modeBtns = Array.from(root.querySelectorAll('[data-mode]'));
  const pwmIn = root.querySelector('[data-pwm]');
  const pwmOut = root.querySelector('[data-pwm-readout]');
  const status = root.querySelector('[data-status]');
  if (!mount || !modeBtns.length || !pwmIn) { console.warn('[anim-hbridge] missing controls'); return; }

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // --- Renderer ---
  const getSize = () => ({ w: mount.clientWidth || 720, h: mount.clientHeight || 420 });
  let { w: width, h: height } = getSize();

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(width, height);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  mount.appendChild(renderer.domElement);
  const loading = mount.querySelector('.hw-canvas-loading'); if (loading) loading.remove();

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf4ede0);

  // --- Orthographic top-down camera. World: XZ = floor, Y = up (toward camera). ---
  // Frustum sized to fit: x ∈ [-7, 7], z ∈ [-3.5, 3.5]
  const FRUSTUM_H = 8;
  const aspect = width / height;
  const camera = new THREE.OrthographicCamera(
    -FRUSTUM_H * aspect / 2,  FRUSTUM_H * aspect / 2,
     FRUSTUM_H / 2,           -FRUSTUM_H / 2,
    0.1, 40
  );
  camera.position.set(0, 12, 1.4);
  camera.lookAt(0, 0, 0);
  camera.up.set(0, 0, -1); // make -Z point "up" on screen (so +Z is toward viewer bottom)

  // --- Lights ---
  scene.add(new THREE.AmbientLight(0xfff6df, 0.6));
  const key = new THREE.DirectionalLight(0xffffff, 1.0);
  key.position.set(3, 10, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  const s = key.shadow.camera;
  s.near = 0.1; s.far = 30; s.left = -10; s.right = 10; s.top = 10; s.bottom = -10;
  key.shadow.bias = -0.0003;
  scene.add(key);
  scene.add(new THREE.HemisphereLight(0xfff1d8, 0xc9b084, 0.3));

  // Ground (shadow receiver, subtle)
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.ShadowMaterial({ opacity: 0.18 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.05;
  ground.receiveShadow = true;
  scene.add(ground);

  // --- Shared materials ---
  const MAT = {
    pcbGreen:  new THREE.MeshStandardMaterial({ color: 0x1b5a3a, roughness: 0.7, metalness: 0.0 }),
    pcbEdge:   new THREE.MeshStandardMaterial({ color: 0x0e3824, roughness: 0.7 }),
    silicon:   new THREE.MeshStandardMaterial({ color: 0x1a1a1f, roughness: 0.6, metalness: 0.35 }),
    chrome:    new THREE.MeshStandardMaterial({ color: 0xdcdcdc, roughness: 0.25, metalness: 0.95 }),
    chromeDark:new THREE.MeshStandardMaterial({ color: 0x9e9e9e, roughness: 0.4,  metalness: 0.85 }),
    yellow:    new THREE.MeshStandardMaterial({ color: 0xf2c034, roughness: 0.5,  metalness: 0.05 }),
    yellowDark:new THREE.MeshStandardMaterial({ color: 0xb88618, roughness: 0.55, metalness: 0.05 }),
    ink:       new THREE.MeshStandardMaterial({ color: 0x3a2510, roughness: 0.7 }),
    motorShell:new THREE.MeshStandardMaterial({ color: 0x2a2a2e, roughness: 0.4,  metalness: 0.6 }),
    rubber:    new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.95, metalness: 0.0 }),
    cell:      new THREE.MeshStandardMaterial({ color: 0xb38b4a, roughness: 0.55, metalness: 0.15 }),
  };

  // ==============================================================
  // ESP32 BOARD — top-left quadrant, flat on ground, label on top
  // ==============================================================
  const esp32 = new THREE.Group();
  {
    // PCB (small height for top view)
    const pcb = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.18, 2.8), MAT.pcbGreen);
    pcb.position.y = 0.09;
    pcb.castShadow = true; pcb.receiveShadow = true;
    esp32.add(pcb);

    // USB-C (dark port on the far z-edge)
    const usb = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.18, 0.22), MAT.chrome);
    usb.position.set(0, 0.18, -1.5);
    esp32.add(usb);

    // "ESP32" name label — top edge of PCB so pin labels own the rest
    const nameLbl = makeLabel('ESP32', { color: '#d9ecff', size: 36, weight: '700', bg: null });
    nameLbl.position.set(0, 0.3, -1.2);
    esp32.add(nameLbl);

    // Header pin rail on right edge (x=+1.1). 4 labeled signal pins.
    // Labels sit ON the PCB (left of pin) to leave the wire clear for H/L state badges.
    const pinData = [
      { id: 'GPIO 27',  z: -0.9, color: '#3498db' },
      { id: 'GPIO 26',  z: -0.3, color: '#2ecc71' },
      { id: 'GPIO 14',  z:  0.3, color: '#b36cc4' },
      { id: 'GND',      z:  0.9, color: '#cfcfcf' },
    ];
    for (const p of pinData) {
      const pin = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.14), MAT.chrome);
      pin.position.set(1.2, 0.15, p.z);
      esp32.add(pin);
      const lbl = makeLabel(p.id, { color: p.color, bg: 'rgba(10,30,20,0.88)', size: 26, scale: 0.75 });
      lbl.position.set(0.55, 0.3, p.z);
      esp32.add(lbl);
    }
  }
  esp32.position.set(-5.2, 0, -0.4);
  scene.add(esp32);

  // ==============================================================
  // TB6612FNG CHIP — center, flat, with 4 MOSFETs visible on top
  // ==============================================================
  const chipGroup = new THREE.Group();
  {
    // Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.32, 2.4), MAT.silicon);
    body.position.y = 0.16;
    body.castShadow = true; body.receiveShadow = true;
    chipGroup.add(body);

    // "TB6612FNG" text on top
    const nameLbl = makeLabel('TB6612FNG', { color: '#f4ede0', size: 36, weight: '700', bg: null });
    nameLbl.position.set(0, 0.34, -0.75);
    chipGroup.add(nameLbl);

    // Orientation dot (pin 1 marker)
    const dot = new THREE.Mesh(new THREE.CircleGeometry(0.07, 18), new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.4 }));
    dot.rotation.x = -Math.PI / 2;
    dot.position.set(-1.35, 0.33, -1.0);
    chipGroup.add(dot);

    // Silver pins — 8 on each long side
    const pinGeo = new THREE.BoxGeometry(0.14, 0.1, 0.1);
    for (let i = 0; i < 8; i++) {
      const x = -1.28 + i * 0.365;
      const pinFront = new THREE.Mesh(pinGeo, MAT.chromeDark);
      pinFront.position.set(x, 0.08, -1.28);
      chipGroup.add(pinFront);
      const pinBack = new THREE.Mesh(pinGeo, MAT.chromeDark);
      pinBack.position.set(x, 0.08, 1.28);
      chipGroup.add(pinBack);
    }

    // Labeled input pins on the LEFT edge (AIN1, AIN2, PWMA, GND)
    const inputs = [
      { id: 'AIN1', z: -0.9, color: '#3498db' },
      { id: 'AIN2', z: -0.3, color: '#2ecc71' },
      { id: 'PWMA', z:  0.3, color: '#b36cc4' },
      { id: 'GND',  z:  0.9, color: '#cfcfcf' },
    ];
    for (const p of inputs) {
      const pin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.14), MAT.chrome);
      pin.position.set(-1.66, 0.14, p.z);
      chipGroup.add(pin);
      const lbl = makeLabel(p.id, { color: p.color, bg: 'rgba(18,18,22,0.9)', size: 26, scale: 0.85 });
      lbl.position.set(-2.0, 0.3, p.z);
      chipGroup.add(lbl);
    }

    // Labeled output pins on the RIGHT edge (AO1, AO2)
    const outputs = [
      { id: 'AO1', z: -0.4, color: '#f1c40f' },
      { id: 'AO2', z:  0.4, color: '#cfcfcf' },
    ];
    for (const p of outputs) {
      const pin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.14), MAT.chrome);
      pin.position.set(1.66, 0.14, p.z);
      chipGroup.add(pin);
      const lbl = makeLabel(p.id, { color: p.color, bg: 'rgba(18,18,22,0.9)', size: 26, scale: 0.85 });
      lbl.position.set(2.0, 0.3, p.z);
      chipGroup.add(lbl);
    }

    // Power pins (VM, GND) on the BOTTOM edge (+Z in top-down view)
    const power = [
      { id: 'GND', x: -0.5, color: '#cfcfcf' },
      { id: 'VM',  x:  0.5, color: '#ff9090' },
    ];
    for (const p of power) {
      const pin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.14), MAT.chrome);
      pin.position.set(p.x, 0.14, 1.28);
      chipGroup.add(pin);
      const lbl = makeLabel(p.id, { color: p.color, bg: 'rgba(18,18,22,0.9)', size: 26, scale: 0.85 });
      lbl.position.set(p.x, 0.3, 1.55);
      chipGroup.add(lbl);
    }

  }
  chipGroup.position.set(-0.9, 0, 0);
  scene.add(chipGroup);

  // ==============================================================
  // MOTOR + WHEEL — right side; wheel face-up (normal = +Y) for top view
  // ==============================================================
  const motorGroup = new THREE.Group();
  let wheelMesh;
  {
    // Motor body — cylinder along X axis (horizontal in the top view)
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 1.6, 48), MAT.motorShell);
    body.rotation.z = Math.PI / 2;
    body.position.set(-0.9, 0.5, 0);
    body.castShadow = true;
    motorGroup.add(body);

    // End caps (dark rings)
    const capA = new THREE.Mesh(new THREE.CylinderGeometry(0.61, 0.61, 0.05, 48), MAT.ink);
    capA.rotation.z = Math.PI / 2; capA.position.set(-1.7, 0.5, 0);
    motorGroup.add(capA);
    const capB = new THREE.Mesh(new THREE.CylinderGeometry(0.61, 0.61, 0.05, 48), MAT.ink);
    capB.rotation.z = Math.PI / 2; capB.position.set(-0.1, 0.5, 0);
    motorGroup.add(capB);

    // Terminal tabs on LEFT end (where motor wires A/B land)
    const termA = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.14), MAT.chrome);
    termA.position.set(-1.78, 0.5, -0.22); motorGroup.add(termA);
    const termB = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.14), MAT.chrome);
    termB.position.set(-1.78, 0.5,  0.22); motorGroup.add(termB);
    const lblA = makeLabel('A', { color: '#f1c40f', bg: 'rgba(30,30,34,0.88)', size: 26, scale: 0.75 });
    lblA.position.set(-2.05, 0.5, -0.22); motorGroup.add(lblA);
    const lblB = makeLabel('B', { color: '#cfcfcf', bg: 'rgba(30,30,34,0.88)', size: 26, scale: 0.75 });
    lblB.position.set(-2.05, 0.5,  0.22); motorGroup.add(lblB);

    // Drive shaft from motor into wheel hub
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.6, 20), MAT.chrome);
    shaft.rotation.z = Math.PI / 2;
    shaft.position.set(0.2, 0.5, 0);
    motorGroup.add(shaft);

    // Second (bare) shaft on the other end of the motor — dual-shaft TT style
    const shaft2 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.35, 16), MAT.chrome);
    shaft2.rotation.z = Math.PI / 2;
    shaft2.position.set(-2.0, 0.5, 0);
    motorGroup.add(shaft2);

    // ---- WHEEL (face-up) ----
    // In top view, the wheel's axis is the Y axis, so rotate.y drives the spin.
    // Real wheel would have horizontal shaft; we cheat orientation for clarity,
    // since the goal here is identifiability from above.
    const wheel = new THREE.Group();

    // Tire — torus lying flat (ring in XZ plane), normal = Y
    const tire = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.22, 16, 56), MAT.rubber);
    tire.rotation.x = Math.PI / 2;
    tire.castShadow = true; tire.receiveShadow = true;
    wheel.add(tire);

    // 6 chunky tread blocks around circumference
    const treadMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.95 });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const t = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, 0.52), treadMat);
      t.position.set(Math.sin(a) * 1.1, 0.06, Math.cos(a) * 1.1);
      t.rotation.y = a;
      wheel.add(t);
    }

    // Yellow hub (cylinder with axis Y — already correct)
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.32, 40), MAT.yellow);
    hub.position.y = 0.02;
    hub.castShadow = true;
    wheel.add(hub);

    // Cross/X spokes — two perpendicular bars lying flat
    const spokeMat = MAT.yellowDark;
    const bar1 = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.18, 0.32), spokeMat);
    bar1.position.y = 0.2; wheel.add(bar1);
    const bar2 = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.18, 1.3), spokeMat);
    bar2.position.y = 0.2; wheel.add(bar2);

    // Chrome hub cap
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.42, 24), MAT.chrome);
    cap.position.y = 0.22; wheel.add(cap);

    // Unambiguous-direction marker stud on one spoke-bar tip
    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(0.065, 16, 12),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25, metalness: 0.9 })
    );
    marker.position.set(0.5, 0.32, 0);
    wheel.add(marker);

    wheel.position.set(0.7, 0.05, 0);
    motorGroup.add(wheel);
    wheelMesh = wheel;
  }
  motorGroup.position.set(4.7, 0, 0);
  scene.add(motorGroup);

  // ==============================================================
  // BATTERY PACK — bottom (behind chip in top view, at +Z)
  // ==============================================================
  {
    const pack = new THREE.Group();
    for (let i = 0; i < 2; i++) {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 2.2, 36), MAT.cell);
      c.rotation.z = Math.PI / 2;
      c.position.set(0, 0.45, -0.6 + i * 1.2);
      c.castShadow = true;
      pack.add(c);
      const capL = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.08, 36), MAT.chrome);
      capL.rotation.z = Math.PI / 2; capL.position.set(-1.13, 0.45, -0.6 + i * 1.2);
      pack.add(capL);
      const capR = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.08, 36), MAT.chrome);
      capR.rotation.z = Math.PI / 2; capR.position.set(1.13, 0.45, -0.6 + i * 1.2);
      pack.add(capR);
    }
    const lbl = makeLabel('2× 18650  7.4 V', { color: '#f4ede0', bg: 'rgba(58,37,16,0.85)', size: 30, scale: 0.9 });
    lbl.position.set(0, 0.9, 0);
    pack.add(lbl);
    pack.position.set(-0.9, 0, 2.9);
    scene.add(pack);
  }

  // ==============================================================
  // WIRES — color-coded per signal (ESP32 → chip → motor; battery → chip)
  // ==============================================================
  const WIRE_R = 0.06;
  const WIRE_Y = 0.32; // raised above ground / below labels

  function tubeMat(hex, emissiveHex = 0x000000, intensity = 0) {
    return new THREE.MeshStandardMaterial({
      color: hex, roughness: 0.45, metalness: 0.3,
      emissive: emissiveHex, emissiveIntensity: intensity,
    });
  }
  function makeWire(p0, p1, p2, p3, mat) {
    const curve = new THREE.CubicBezierCurve3(p0, p1, p2, p3);
    const geom = new THREE.TubeGeometry(curve, 64, WIRE_R, 12, false);
    const m = new THREE.Mesh(geom, mat);
    m.castShadow = true;
    return { mesh: m, curve };
  }

  // ESP32 right-edge pins (world coords):
  //   AIN1 @ (-3.88, _, -1.30)
  //   AIN2 @ (-3.88, _, -0.70)
  //   PWMA @ (-3.88, _, -0.10)
  //   GND  @ (-3.88, _,  0.50)
  // Chip LEFT-edge pins:
  //   AIN1 @ (-2.56, _, -0.90)   (offset from chipGroup by -0.9x, 0z)
  //   AIN2 @ (-2.56, _, -0.30)
  //   PWMA @ (-2.56, _,  0.30)
  //   GND  @ (-2.56, _,  0.90)

  function route(p0, p3, mat) {
    const p1 = new THREE.Vector3(p0.x + 0.2, WIRE_Y + 0.15, p0.z);
    const p2 = new THREE.Vector3(p3.x - 0.2, WIRE_Y + 0.15, p3.z);
    const w = makeWire(p0, p1, p2, p3, mat);
    scene.add(w.mesh);
    return w;
  }

  const ain1Mat = tubeMat(SIG.AIN1);
  const ain2Mat = tubeMat(SIG.AIN2);
  const wAIN1 = route(new THREE.Vector3(-3.88, WIRE_Y, -1.30),
                      new THREE.Vector3(-2.56, WIRE_Y, -0.90), ain1Mat);
  const wAIN2 = route(new THREE.Vector3(-3.88, WIRE_Y, -0.70),
                      new THREE.Vector3(-2.56, WIRE_Y, -0.30), ain2Mat);
  route(new THREE.Vector3(-3.88, WIRE_Y, -0.10),
        new THREE.Vector3(-2.56, WIRE_Y,  0.30), tubeMat(SIG.PWMA));
  route(new THREE.Vector3(-3.88, WIRE_Y,  0.50),
        new THREE.Vector3(-2.56, WIRE_Y,  0.90), tubeMat(SIG.GND));

  // H/L state badges sitting on the AIN1 / AIN2 wires
  function makeStateBadge(curve) {
    const p = curve.getPoint(0.45);
    const y = p.y + 0.55;
    const hi = makeLabel('H', { color: '#0b1a10', bg: '#2ecc71', size: 34, weight: '800', scale: 0.9 });
    hi.position.set(p.x, y, p.z);
    scene.add(hi);
    const lo = makeLabel('L', { color: '#d8d8d8', bg: '#3a3a3a', size: 34, weight: '800', scale: 0.9 });
    lo.position.set(p.x, y, p.z);
    scene.add(lo);
    return (high) => { hi.visible = high; lo.visible = !high; };
  }
  const setAIN1 = makeStateBadge(wAIN1.curve);
  const setAIN2 = makeStateBadge(wAIN2.curve);

  // Chip bottom pins (VM, GND) → battery (+, −)
  const wVM = makeWire(
    new THREE.Vector3(-0.4, WIRE_Y, 1.38),  // chip VM pin
    new THREE.Vector3(-0.4, WIRE_Y + 0.25, 1.8),
    new THREE.Vector3( 0.25, WIRE_Y + 0.25, 2.2),
    new THREE.Vector3( 0.23, WIRE_Y, 2.9),  // battery + (right cap)
    tubeMat(SIG.VM));
  scene.add(wVM.mesh);
  const wBGND = makeWire(
    new THREE.Vector3(-1.4, WIRE_Y, 1.38),
    new THREE.Vector3(-1.4, WIRE_Y + 0.25, 1.8),
    new THREE.Vector3(-2.1, WIRE_Y + 0.25, 2.4),
    new THREE.Vector3(-2.03, WIRE_Y, 2.9),
    tubeMat(SIG.GND));
  scene.add(wBGND.mesh);

  // Chip output pins → motor terminals (A, B)
  const outAMat = tubeMat(SIG.DIM);
  const outBMat = tubeMat(SIG.DIM);
  const wOUT_A = makeWire(
    new THREE.Vector3(0.76, WIRE_Y, -0.4),   // chip AO1 (world coords)
    new THREE.Vector3(1.8,  WIRE_Y + 0.2, -0.3),
    new THREE.Vector3(2.6,  WIRE_Y + 0.2, -0.22),
    new THREE.Vector3(2.85, WIRE_Y, -0.22),  // motor terminal A
    outAMat);
  scene.add(wOUT_A.mesh);
  const wOUT_B = makeWire(
    new THREE.Vector3(0.76, WIRE_Y,  0.4),   // chip AO2
    new THREE.Vector3(1.8,  WIRE_Y + 0.2,  0.3),
    new THREE.Vector3(2.6,  WIRE_Y + 0.2,  0.22),
    new THREE.Vector3(2.85, WIRE_Y,  0.22),  // motor terminal B
    outBMat);
  scene.add(wOUT_B.mesh);

  // ==============================================================
  // ELECTRON PARTICLES on the active output wire
  // ==============================================================
  const electronGeo = new THREE.SphereGeometry(0.065, 14, 10);
  const electronMat = new THREE.MeshStandardMaterial({
    color: 0xffeaa0, emissive: 0xff7a10, emissiveIntensity: 2.8, roughness: 0.3,
  });
  const PCOUNT = 2;
  const flowA = [], flowB = [];
  for (let i = 0; i < PCOUNT; i++) {
    const a = new THREE.Mesh(electronGeo, electronMat); a.visible = false; scene.add(a);
    flowA.push({ mesh: a, t: i / PCOUNT });
    const b = new THREE.Mesh(electronGeo, electronMat); b.visible = false; scene.add(b);
    flowB.push({ mesh: b, t: i / PCOUNT });
  }

  // ==============================================================
  // STATE + CONTROLS
  // ==============================================================
  let currentMode = 'forward';
  let pwm = parseInt(pwmIn.value, 10);
  let wheelVel = 0;
  let targetWheelVel = 0;

  function applyMode() {
    const m = MODES[currentMode];

    setAIN1(m.ain1);
    setAIN2(m.ain2);
    ain1Mat.emissive.setHex(m.ain1 ? SIG.AIN1 : 0x000000);
    ain1Mat.emissiveIntensity = m.ain1 ? 0.6 : 0;
    ain2Mat.emissive.setHex(m.ain2 ? SIG.AIN2 : 0x000000);
    ain2Mat.emissiveIntensity = m.ain2 ? 0.6 : 0;

    outAMat.color.setHex(m.wire === 'A' ? SIG.ACTIVE : SIG.DIM);
    outAMat.emissive.setHex(m.wire === 'A' ? 0xff7a10 : 0x000000);
    outAMat.emissiveIntensity = m.wire === 'A' ? 0.35 : 0;
    outBMat.color.setHex(m.wire === 'B' ? SIG.ACTIVE : SIG.DIM);
    outBMat.emissive.setHex(m.wire === 'B' ? 0xff7a10 : 0x000000);
    outBMat.emissiveIntensity = m.wire === 'B' ? 0.35 : 0;

    targetWheelVel = m.sign * (pwm / 255) * 0.08;

    const pretty = currentMode[0].toUpperCase() + currentMode.slice(1);
    const states = `AIN1=${m.ain1 ? 'H' : 'L'}, AIN2=${m.ain2 ? 'H' : 'L'}`;
    status.textContent = m.brake
      ? `${pretty} — ${states} (motor shorted)`
      : `${pretty} @ ${pwm} / 255 — ${states}`;
  }

  function highlightBtn() {
    for (const b of modeBtns) b.setAttribute('data-active', 'false');
    const a = modeBtns.find(b => b.dataset.mode === currentMode);
    if (a) a.setAttribute('data-active', 'true');
  }

  for (const btn of modeBtns) {
    btn.addEventListener('click', () => {
      currentMode = btn.dataset.mode;
      highlightBtn();
      applyMode();
    });
  }
  pwmIn.addEventListener('input', () => {
    pwm = parseInt(pwmIn.value, 10);
    pwmOut.textContent = String(pwm);
    applyMode();
  });

  applyMode();

  // ==============================================================
  // ANIMATION LOOP
  // ==============================================================
  let destroyed = false;
  function tick() {
    if (destroyed) return;
    const m = MODES[currentMode];

    const k = m.brake ? 0.2 : (targetWheelVel === 0 ? 0.035 : 0.1);
    wheelVel += (targetWheelVel - wheelVel) * k;
    if (Math.abs(wheelVel) < 0.0005 && targetWheelVel === 0) wheelVel = 0;

    // Wheel spins around its vertical (Y) axis in this top-down orientation.
    if (!reduced) wheelMesh.rotation.y += wheelVel;

    // Electrons on active output wire
    const speed = (pwm / 255) * 0.006;
    const showA = m.wire === 'A' && pwm > 0 && !reduced;
    const showB = m.wire === 'B' && pwm > 0 && !reduced;
    for (const p of flowA) {
      if (showA) {
        p.t = (p.t + speed + 1) % 1;
        p.mesh.position.copy(wOUT_A.curve.getPoint(p.t));
        p.mesh.visible = true;
      } else p.mesh.visible = false;
    }
    for (const p of flowB) {
      if (showB) {
        p.t = (p.t + speed + 1) % 1;
        p.mesh.position.copy(wOUT_B.curve.getPoint(p.t));
        p.mesh.visible = true;
      } else p.mesh.visible = false;
    }

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();

  // ==============================================================
  // RESIZE
  // ==============================================================
  const ro = new ResizeObserver(() => {
    const { w, h } = getSize();
    renderer.setSize(w, h);
    const a = w / h;
    camera.left = -FRUSTUM_H * a / 2;
    camera.right = FRUSTUM_H * a / 2;
    camera.top = FRUSTUM_H / 2;
    camera.bottom = -FRUSTUM_H / 2;
    camera.updateProjectionMatrix();
  });
  ro.observe(mount);

  return function destroy() {
    destroyed = true;
    ro.disconnect();
    mount.removeChild(renderer.domElement);
    renderer.dispose();
    scene.traverse(obj => {
      if (obj.isMesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) obj.material.forEach(x => x.dispose());
        else if (obj.material) obj.material.dispose();
      }
    });
  };
}
