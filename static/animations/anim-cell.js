import * as THREE from 'three';

const MAT = {
  batteryWrap: () => new THREE.MeshStandardMaterial({ color: 0xb38b4a, roughness: 0.55, metalness: 0.15 }),
  chrome:      () => new THREE.MeshStandardMaterial({ color: 0xd6d6d6, roughness: 0.22, metalness: 0.92 }),
  yellowABS:   () => new THREE.MeshStandardMaterial({ color: 0xf2c034, roughness: 0.5,  metalness: 0.05 }),
  yellowDark:  () => new THREE.MeshStandardMaterial({ color: 0xc4921c, roughness: 0.55, metalness: 0.05 }),
  motorShell:  () => new THREE.MeshStandardMaterial({ color: 0x1f1f20, roughness: 0.35, metalness: 0.55 }),
  rubber:      () => new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.95, metalness: 0.0 }),
  ink:         () => new THREE.MeshStandardMaterial({ color: 0x3a2510, roughness: 0.7 }),
  copper:      () => new THREE.MeshStandardMaterial({ color: 0xc77d2a, roughness: 0.4,  metalness: 0.6 }),
};

export function initCell(root) {
  if (!root) return;
  const mount  = root.querySelector('[data-3d-mount]');
  const slider = root.querySelector('input[type="range"]');
  const readout = root.querySelector('[data-readout]');
  if (!mount || !slider) { console.warn('[anim-cell] missing elements'); return; }

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const getSize = () => ({
    w: mount.clientWidth  || 720,
    h: mount.clientHeight || 420,
  });
  let { w: width, h: height } = getSize();

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(width, height);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  mount.appendChild(renderer.domElement);

  const loading = mount.querySelector('.hw-canvas-loading');
  if (loading) loading.remove();

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf4ede0);

  // Near-side orthographic view — battery, motor, wheel read as one horizontal line.
  // Scene content spans x ∈ [-3.9, 3.5], y ∈ [-0.9, 1.4] (with 0.5 padding each side).
  const SCENE_W = 8.4;   // 3.5 - (-3.9) + 1.0 padding
  const SCENE_H = 3.8;   // 1.4 - (-0.9) + 1.3 padding
  const SCENE_CX = -0.2; // (3.5 + -3.9) / 2
  const SCENE_CY = 0.35; // (1.4 + -0.9) / 2

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
  camera.position.set(1.4, 0.6, 10);
  camera.lookAt(0, 0.2, 0.6);

  // Lighting
  scene.add(new THREE.AmbientLight(0xfff6df, 0.55));
  const key = new THREE.DirectionalLight(0xffffff, 1.15);
  key.position.set(4, 7, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  const s = key.shadow.camera;
  s.near = 0.1; s.far = 25;
  s.left = -6; s.right = 6; s.top = 6; s.bottom = -6;
  key.shadow.bias = -0.0002;
  scene.add(key);
  scene.add(new THREE.DirectionalLight(0xffd9a8, 0.3).translateOnAxis(new THREE.Vector3(-1, 0.6, 0.4).normalize(), 6));
  scene.add(new THREE.HemisphereLight(0xfff1d8, 0xc9b084, 0.25));

  // Ground plane (shadow-receiver only)
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 30),
    new THREE.ShadowMaterial({ opacity: 0.22 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.9;
  ground.receiveShadow = true;
  scene.add(ground);

  // ---------------- BATTERY (18650) ----------------
  const battery = new THREE.Group();
  {
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 2.0, 40), MAT.batteryWrap());
    body.rotation.z = Math.PI / 2;
    body.castShadow = true; body.receiveShadow = true;
    battery.add(body);

    const neg = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.08, 40), MAT.chrome());
    neg.rotation.z = Math.PI / 2;
    neg.position.x = -1.04;
    neg.castShadow = true;
    battery.add(neg);

    const pos = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.08, 40), MAT.chrome());
    pos.rotation.z = Math.PI / 2;
    pos.position.x = 1.04;
    pos.castShadow = true;
    battery.add(pos);

    const nub = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.12, 24), MAT.chrome());
    nub.rotation.z = Math.PI / 2;
    nub.position.x = 1.14;
    nub.castShadow = true;
    battery.add(nub);

    // Label band (slightly darker)
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.485, 0.485, 0.55, 40, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x8a5a20, roughness: 0.7, metalness: 0.1, side: THREE.DoubleSide }));
    band.rotation.z = Math.PI / 2;
    battery.add(band);
  }
  battery.position.set(-2.8, -0.1, 0);
  scene.add(battery);

  // ---------------- MOTOR ASSEMBLY (gearbox + motor + shaft) ----------------
  const motorAssembly = new THREE.Group();
  {
    const gearbox = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.0, 0.95), MAT.yellowABS());
    gearbox.position.y = -0.1;
    gearbox.castShadow = true; gearbox.receiveShadow = true;
    motorAssembly.add(gearbox);

    // Subtle recessed line on gearbox (horizontal)
    const groove = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.05, 0.05), MAT.yellowDark());
    groove.position.set(0, -0.1, 0.48);
    motorAssembly.add(groove);

    // Motor cylinder on top of gearbox, oriented horizontally
    const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 1.3, 28), MAT.motorShell());
    motor.rotation.z = Math.PI / 2;
    motor.position.set(0, 0.6, 0);
    motor.castShadow = true;
    motorAssembly.add(motor);

    // Motor end caps (dark)
    const capA = new THREE.Mesh(new THREE.CylinderGeometry(0.345, 0.345, 0.04, 28), MAT.ink());
    capA.rotation.z = Math.PI / 2; capA.position.set(-0.65, 0.6, 0);
    motorAssembly.add(capA);
    const capB = new THREE.Mesh(new THREE.CylinderGeometry(0.345, 0.345, 0.04, 28), MAT.ink());
    capB.rotation.z = Math.PI / 2; capB.position.set(0.65, 0.6, 0);
    motorAssembly.add(capB);

    // Terminals on left end of motor (where wires land)
    const term1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.22, 0.08), MAT.chrome());
    term1.position.set(-0.7, 0.78, 0.08); motorAssembly.add(term1);
    const term2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.22, 0.08), MAT.chrome());
    term2.position.set(-0.7, 0.78, -0.08); motorAssembly.add(term2);

    // Output shaft from the SIDE of the gearbox (+Z direction, toward camera)
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.1, 20), MAT.chrome());
    shaft.rotation.x = Math.PI / 2;
    shaft.position.set(0, -0.15, 1.02);
    shaft.castShadow = true;
    motorAssembly.add(shaft);

    // Shaft bushing collar (where shaft enters gearbox)
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.1, 20), MAT.ink());
    collar.rotation.x = Math.PI / 2;
    collar.position.set(0, -0.15, 0.52);
    motorAssembly.add(collar);

    // ------------- WHEEL (mounted on the shaft) -------------
    const wheel = new THREE.Group();

    // Tire
    const tire = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.19, 18, 56), MAT.rubber());
    tire.castShadow = true; tire.receiveShadow = true;
    wheel.add(tire);

    // Tread blocks — chunky, few (6) so per-frame rotation never exceeds
    // half a tread-spacing at max voltage, avoiding wagon-wheel aliasing.
    const treadMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.95 });
    const treadCount = 6;
    for (let i = 0; i < treadCount; i++) {
      const a = (i / treadCount) * Math.PI * 2;
      const t = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.46), treadMat);
      t.position.set(Math.cos(a) * 0.95, Math.sin(a) * 0.95, 0);
      t.rotation.z = a;
      wheel.add(t);
    }

    // One bright chrome marker stud so direction is always unambiguous
    // (single feature = aliasing threshold at ω=π, well above our max).
    const markerGroup = new THREE.Group();
    markerGroup.rotation.z = Math.PI / 2;
    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(0.055, 16, 12),
      new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.25, metalness: 0.9 })
    );
    marker.position.set(0, 0.4, 0.18);
    markerGroup.add(marker);
    wheel.add(markerGroup);

    // Yellow hub disk
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.28, 40), MAT.yellowABS());
    hub.rotation.x = Math.PI / 2;
    hub.castShadow = true;
    wheel.add(hub);

    // Hub rim darker ring
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.03, 8, 40), MAT.yellowDark());
    wheel.add(rim);

    // 5 D-shaped spokes
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const spokeGroup = new THREE.Group();
      spokeGroup.rotation.z = a;
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.4, 0.22), MAT.yellowDark());
      spoke.position.set(0, 0.24, 0);
      spokeGroup.add(spoke);
      wheel.add(spokeGroup);
    }

    // Chrome center hub cap
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.36, 24), MAT.chrome());
    cap.rotation.x = Math.PI / 2;
    wheel.add(cap);

    // Position wheel at end of shaft
    wheel.position.set(0, -0.15, 1.55);
    motorAssembly.add(wheel);

    motorAssembly.userData.wheel = wheel;
  }
  motorAssembly.position.set(1.8, 0.15, 0);
  scene.add(motorAssembly);

  // ---------------- WIRES (copper tubes) ----------------
  const WIRE_RADIUS = 0.09;
  function makeWire(p0, p1, p2, p3, mat) {
    const curve = new THREE.CubicBezierCurve3(p0, p1, p2, p3);
    const geom = new THREE.TubeGeometry(curve, 48, WIRE_RADIUS, 14, false);
    const m = new THREE.Mesh(geom, mat);
    m.castShadow = true;
    return { mesh: m, curve };
  }
  // Positive wire: battery + (right cap) → motor terminal 1
  const posWire = makeWire(
    new THREE.Vector3(-1.64, -0.1, 0),
    new THREE.Vector3(-0.5, 0.6, 0.2),
    new THREE.Vector3(0.5, 0.9, 0.15),
    new THREE.Vector3(1.1,  0.68, 0.08),
    MAT.copper()
  );
  scene.add(posWire.mesh);
  // Negative wire: battery − (left cap) → motor terminal 2
  const negWire = makeWire(
    new THREE.Vector3(-3.94, -0.1, 0),
    new THREE.Vector3(-4.3, -0.7, 0.2),
    new THREE.Vector3(0.4, -0.65, -0.2),
    new THREE.Vector3(1.1,  0.68, -0.08),
    new THREE.MeshStandardMaterial({ color: 0x4a3c22, roughness: 0.6 })
  );
  scene.add(negWire.mesh);

  // ---------------- ELECTRON PARTICLES ----------------
  // 2 per wire spaced half-a-wire apart reads as "sparks traveling through"
  // rather than a chain/belt, even at high flow rates.
  const PCOUNT = 2;
  const electronGeo = new THREE.SphereGeometry(0.14, 16, 12);
  const electronMat = new THREE.MeshStandardMaterial({
    color: 0xffeaa0,
    emissive: 0xff7a10,
    emissiveIntensity: 2.8,
    roughness: 0.3,
    metalness: 0.0,
  });
  const posElectrons = [];
  const negElectrons = [];
  for (let i = 0; i < PCOUNT; i++) {
    const pe = new THREE.Mesh(electronGeo, electronMat);
    pe.visible = false;
    scene.add(pe);
    posElectrons.push({ mesh: pe, t: i / PCOUNT });

    const ne = new THREE.Mesh(electronGeo, electronMat);
    ne.visible = false;
    scene.add(ne);
    negElectrons.push({ mesh: ne, t: i / PCOUNT });
  }

  let vel = 0;

  function onSlider() {
    const v = parseFloat(slider.value);
    // Direction reverses ONLY when sign(V) flips.
    // Magnitude is strictly linear in |V|. Max = 0.08 rad/frame at |V|=4,
    // which is ~0.76 rev/sec at 60fps — slow enough that the viewer can
    // track individual rotations at every voltage, and clearly sees speed
    // increase as |V| grows.
    vel = -Math.sign(v) * (Math.abs(v) / 4) * 0.08;
    if (readout) {
      const t = (v >= 0 ? '+' : '') + v.toFixed(1) + ' V';
      readout.textContent = t;
      readout.classList.toggle('active', Math.abs(v) > 0.05);
    }
  }
  slider.addEventListener('input', onSlider);
  onSlider();

  const wheelMesh = motorAssembly.userData.wheel;
  let destroyed = false;
  function tick() {
    if (destroyed) return;

    // Wheel rotation
    if (!reduced) wheelMesh.rotation.z += vel;

    // Showing CONVENTIONAL CURRENT direction (+ → motor → −) to match
    // schematic arrows and the wiring-guide. Electrons physically move the
    // opposite way; noted in the post body.
    //   POS wire: battery(+) → motor  (t: 0 → 1 at +V)
    //   NEG wire: motor → battery(−)  (t: 1 → 0 at +V)
    const v = parseFloat(slider.value);
    const show = Math.abs(v) > 0.05;
    const speed = (Math.abs(v) / 4) * 0.04;  // max ~2.4 trips/sec at 60fps
    const sgn = Math.sign(v);

    if (show && !reduced) {
      const dNeg = -sgn * speed;
      const dPos =  sgn * speed;
      for (const p of negElectrons) {
        p.t = (p.t + dNeg + 1) % 1;
        p.mesh.position.copy(negWire.curve.getPoint(p.t));
        p.mesh.visible = true;
      }
      for (const p of posElectrons) {
        p.t = (p.t + dPos + 1) % 1;
        p.mesh.position.copy(posWire.curve.getPoint(p.t));
        p.mesh.visible = true;
      }
    } else {
      for (const p of negElectrons) p.mesh.visible = false;
      for (const p of posElectrons) p.mesh.visible = false;
    }

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();

  // ---------------- RESIZE ----------------
  const ro = new ResizeObserver(() => {
    const w = mount.clientWidth  || 720;
    const h = mount.clientHeight || 405;
    renderer.setSize(w, h);
    const { fw, fh } = makeFrustum(w, h);
    camera.left   = SCENE_CX - fw / 2;
    camera.right  = SCENE_CX + fw / 2;
    camera.top    = SCENE_CY + fh / 2;
    camera.bottom = SCENE_CY - fh / 2;
    camera.updateProjectionMatrix();
  });
  ro.observe(mount);

  return function destroy() {
    destroyed = true;
    ro.disconnect();
    slider.removeEventListener('input', onSlider);
    mount.removeChild(renderer.domElement);
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
