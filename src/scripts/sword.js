/* KNGHT: one steel sword that walks the homepage with you.
   It waits in the margin, carries your regulator's name once you pick a category,
   is forged as you reach the offer, and ends driven into a stone that holds the call button.
   Three.js renders it behind the page's raised text, ahead of the page's sections. */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const root = document.documentElement;
const $ = (s, c = document) => c.querySelector(s);
const snd = () => (window.KNGHT && window.KNGHT.Sound) || null;
const play = (fn, ...a) => { const s = snd(); if (s && s[fn]) s[fn](...a); };
const mobile = !matchMedia('(hover: hover) and (pointer: fine)').matches || innerWidth < 900;

export default function sword() {
  const canvas = document.createElement('canvas');
  canvas.className = 'sword3d';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile, alpha: true, powerPreference: 'high-performance' });
  } catch (e) { canvas.remove(); return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1 : 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const FOV = 30, CAMZ = 12;
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);
  camera.position.set(0, 0, CAMZ);

  const key = new THREE.DirectionalLight(0xffffff, 1.2); key.position.set(-3, 5, 6); scene.add(key);
  const torch = new THREE.PointLight(0xffffff, 18, 14, 1.6); torch.position.set(0, 0, 3); scene.add(torch);
  const forgeLight = new THREE.PointLight(0xffffff, 0, 6, 2); scene.add(forgeLight);

  /* ---------- The engraving: a canvas painted onto the blade ---------- */
  const EC = document.createElement('canvas'); EC.width = 2048; EC.height = 192;
  const ex = EC.getContext('2d');
  const etchTex = new THREE.CanvasTexture(EC);
  etchTex.colorSpace = THREE.SRGBColorSpace;
  etchTex.anisotropy = 4;
  let etchText = 'KNGHT', nextText = null, etchP = 1;
  const paintEtch = () => {
    ex.fillStyle = '#e9e9e9'; ex.fillRect(0, 0, EC.width, EC.height);
    // the fuller: a long groove down the blade
    const g = ex.createLinearGradient(0, EC.height * 0.38, 0, EC.height * 0.62);
    g.addColorStop(0, '#e9e9e9'); g.addColorStop(0.5, '#a8a8a8'); g.addColorStop(1, '#e9e9e9');
    ex.fillStyle = g; ex.fillRect(EC.width * 0.04, EC.height * 0.38, EC.width * 0.66, EC.height * 0.24);
    // the words, cut along the blade from the guard
    ex.save();
    ex.beginPath(); ex.rect(0, 0, EC.width * 0.08 + EC.width * 0.8 * etchP, EC.height); ex.clip();
    ex.font = '500 64px Georgia, "Times New Roman", serif';
    ex.textBaseline = 'middle';
    ex.fillStyle = '#2e2e2e';
    let x = EC.width * 0.08;
    for (const ch of etchText) { ex.fillText(ch, x, EC.height * 0.5 + 2); x += ex.measureText(ch).width + 14; if (x > EC.width * 0.9) break; }
    ex.restore();
    etchTex.needsUpdate = true;
  };
  paintEtch();

  /* ---------- The sword: blade, guard, grip, pommel (the mark's own parts) ---------- */
  const steel = new THREE.MeshStandardMaterial({ color: 0xdadada, metalness: 1, roughness: 0.26, map: etchTex, emissive: 0xffffff, emissiveIntensity: 0, envMapIntensity: 1.15 });
  const darkSteel = new THREE.MeshStandardMaterial({ color: 0x9a9a9a, metalness: 1, roughness: 0.34, envMapIntensity: 1, emissive: 0xffffff, emissiveIntensity: 0 });
  const leather = new THREE.MeshStandardMaterial({ color: 0x1c1c1c, metalness: 0.1, roughness: 0.85 });

  const LEN = 3.0, W = 0.24;
  const shape = new THREE.Shape();
  shape.moveTo(-W / 2, 0); shape.lineTo(W / 2, 0); shape.lineTo(W * 0.4, LEN * 0.86); shape.lineTo(0, LEN); shape.lineTo(-W * 0.4, LEN * 0.86); shape.closePath();
  const bladeGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.035, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.035, bevelSegments: 2, curveSegments: 1 });
  bladeGeo.translate(0, 0, -0.0175);
  { // the engraving runs along the blade: u from guard to tip, v across
    const pos = bladeGeo.attributes.position, uv = bladeGeo.attributes.uv;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getY(i) / LEN, (pos.getX(i) + W / 2) / W);
    uv.needsUpdate = true;
    bladeGeo.computeVertexNormals();
  }
  const blade = new THREE.Mesh(bladeGeo, steel);

  const hilt = new THREE.Group();
  const guard = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.075, 0.13, 1, 1, 1), darkSteel); guard.position.y = -0.04; hilt.add(guard);
  [-1, 1].forEach((s) => { const cap = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), darkSteel); cap.position.set(s * 0.5, -0.04, 0); hilt.add(cap); });
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.052, 0.56, 20), leather); grip.position.y = -0.36; hilt.add(grip);
  for (let i = 0; i < 7; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.052, 0.008, 6, 20), leather); r.rotation.x = Math.PI / 2; r.position.y = -0.12 - i * 0.075; hilt.add(r); }
  const pommel = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.03, 14, 32), darkSteel); pommel.position.y = -0.78; hilt.add(pommel);
  const pommelCore = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), darkSteel); pommelCore.position.y = -0.78; hilt.add(pommelCore);

  const swordBody = new THREE.Group(); swordBody.add(blade, hilt);
  swordBody.position.y = -0.95; // balance near the guard, so it turns like a real sword
  const spinner = new THREE.Group(); spinner.add(swordBody);
  const pose = new THREE.Group(); pose.add(spinner);
  scene.add(pose);
  const TIP = LEN - 0.95; // tip distance from the pivot, in sword units

  /* ---------- The stone ---------- */
  const stoneGeo = new THREE.BoxGeometry(1, 1, 1, 18, 10, 8);
  { const p = stoneGeo.attributes.position;
    const n3 = (x, y, z) => Math.sin(x * 11.3 + y * 4.1) * Math.cos(z * 9.7 - x * 3.3) * 0.6 + Math.sin(y * 23.1 + z * 5.9 + x * 2.2) * 0.25 + Math.sin(x * 41.7 - z * 37.3) * 0.12;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const n = n3(x, y, z);
      const top = y > 0.49 ? 0.35 : 1; // the top stays fairly flat, where the blade goes in
      const r = 1 - Math.max(0, Math.abs(x) - 0.42) * 0.9 - Math.max(0, Math.abs(z) - 0.4) * 0.5; // round the corners a little
      p.setXYZ(i, x * r + n * 0.022 * top, y + n * 0.014 * top - (y > 0.49 ? Math.abs(x) * 0.05 : 0), z * r + n * 0.03);
    }
    stoneGeo.computeVertexNormals(); }
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x1d1d1d, roughness: 1, metalness: 0, flatShading: true, transparent: true, opacity: 0, envMapIntensity: 0.22 });
  const stone = new THREE.Mesh(stoneGeo, stoneMat);
  stone.visible = false;
  scene.add(stone);

  /* ---------- Sparks for the hammer ---------- */
  const NS = 90;
  const sparkGeo = new THREE.BufferGeometry();
  const sp = new Float32Array(NS * 3), sv = new Float32Array(NS * 3), sl = new Float32Array(NS);
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const sparkMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.05, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
  const sparks = new THREE.Points(sparkGeo, sparkMat); sparks.frustumCulled = false; scene.add(sparks);
  const strikeSparks = (at) => {
    for (let i = 0; i < NS; i++) {
      sp[i * 3] = at.x; sp[i * 3 + 1] = at.y; sp[i * 3 + 2] = at.z + 0.1;
      const a = Math.random() * Math.PI * 2, v = 1.2 + Math.random() * 3.2;
      sv[i * 3] = Math.cos(a) * v; sv[i * 3 + 1] = Math.abs(Math.sin(a)) * v + 1.2; sv[i * 3 + 2] = (Math.random() - 0.5) * 1.5;
      sl[i] = 0.5 + Math.random() * 0.6;
    }
  };
  for (let i = 0; i < NS; i++) sl[i] = 0;

  /* ---------- Screen to world ---------- */
  let vw = innerWidth, vh = innerHeight, unit = 1;
  const resize = () => {
    vw = innerWidth; vh = innerHeight;
    renderer.setSize(vw, vh, false);
    camera.aspect = vw / vh; camera.updateProjectionMatrix();
    unit = (2 * CAMZ * Math.tan((FOV * Math.PI) / 360)) / vh; // world units per pixel at the sword's depth
  };
  resize();
  addEventListener('resize', resize);
  const wx = (px) => (px - vw / 2) * unit;
  const wy = (py) => (vh / 2 - py) * unit;

  /* ---------- The path: where the sword stands at each part of the page ---------- */
  const hero = $('.hero');
  const engage = $('#engage');
  const forgeBand = engage && engage.previousElementSibling && engage.previousElementSibling.classList.contains('chap') ? engage.previousElementSibling : null;
  const verdict = $('.verdict');
  const cta = verdict && $('.btn', verdict);

  const cur = { x: vw - 46, y: vh * 0.5, rot: Math.PI, scale: 0.0001, vis: 0 };
  let mode = 'hidden', forged = false, forgeT = -1, plunged = false, plungeT = -1, stoneVis = 0, spinV = 0.35, spinBoost = 0, heat = 0;

  const target = () => {
    const out = { x: vw - (mobile ? 30 : 48), y: vh * 0.52, rot: Math.PI, scale: mobile ? 0.3 : 0.44, vis: mobile ? 0 : 1, mode: 'rail' };
    if (hero) { const r = hero.getBoundingClientRect(); if (r.bottom > vh * 0.55) { out.vis = 0; out.mode = 'hidden'; return out; } }
    if (forgeBand) {
      const r = forgeBand.getBoundingClientRect();
      const c = r.top + r.height / 2;
      if (c > vh * 0.12 && c < vh * 0.88) {
        return { x: vw * (mobile ? 0.5 : 0.56), y: c, rot: -Math.PI / 2, scale: mobile ? 0.42 : 0.62, vis: 1, mode: 'forge', center: c };
      }
    }
    if (verdict && cta) {
      const vr = verdict.getBoundingClientRect();
      if (vr.top < vh * 0.45) {
        const b = cta.getBoundingClientRect();
        const s = mobile ? 0.5 : 0.7;
        const stoneTop = b.top - (mobile ? 16 : 30);
        const tipY = stoneTop + (plunged ? 46 : -170);
        // Pointing down, the pivot sits one blade-length above the tip
        return { x: b.left + b.width / 2, y: tipY - (TIP * s) / unit, rot: Math.PI, scale: s, vis: 1, mode: 'stone', btn: b };
      }
    }
    return out;
  };

  /* ---------- Engraving follows the visitor's category ---------- */
  const REG = {
    clinic: 'CPSO · CCO · CPO · HEALTH CANADA', dental: 'RCDSO · PHIPA', medspa: 'CPSO · CNO · HEALTH CANADA',
    law: 'LAW SOCIETY OF ONTARIO', spirits: 'AGCO · CRTC · CFIA', food: 'CFIA · HEALTH CANADA',
  };
  const wantText = () => REG[root.dataset.cat] || 'KNGHT';
  new MutationObserver(() => { const t = wantText(); if (t !== etchText) nextText = t; }).observe(root, { attributes: true, attributeFilter: ['data-cat'] });
  etchText = wantText(); paintEtch();

  /* ---------- Chapter turns: the sword flips as each chapter opens ---------- */
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting && mode === 'rail' && cur.vis > 0.8) { spinBoost = Math.PI * 2; play('shing', 0.28); }
    }), { rootMargin: '-48% 0px -48% 0px' });
    document.querySelectorAll('.chap').forEach((c) => io.observe(c));
  }

  /* ---------- The torch: the page light shines on the steel ---------- */
  let lx = vw * 0.5, ly = vh * 0.3;
  if (!mobile) addEventListener('pointermove', (e) => { lx = e.clientX; ly = e.clientY; }, { passive: true });

  /* ---------- Loop ---------- */
  const clock = new THREE.Clock();
  let running = true, etching = false, etchStart = 0;
  document.addEventListener('visibilitychange', () => { running = !document.hidden; if (running) { clock.getDelta(); requestAnimationFrame(frame); } });

  const frame = () => {
    if (!running) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    const tg = target();
    mode = tg.mode;

    // The forge: heat, three strikes, the quench
    if (mode === 'forge' && !forged && Math.abs(tg.center - vh / 2) < vh * 0.2) { forged = true; forgeT = 0; play('roar', 1.4); }
    if (forgeT >= 0) {
      forgeT += dt;
      heat = Math.min(1, forgeT / 1.2);
      [1.3, 1.85, 2.4].forEach((at) => {
        if (forgeT - dt < at && forgeT >= at) {
          play('clang', 1);
          const tip = new THREE.Vector3(0, -0.95 + LEN * 0.55, 0).applyMatrix4(swordBody.matrixWorld);
          strikeSparks(tip);
          spinBoost += 0.0001; cur.y += 6; // the blade jumps under the hammer
        }
      });
      if (forgeT > 2.8) heat = Math.max(0, 1 - (forgeT - 2.8) / 1.6);
      if (forgeT - dt < 2.9 && forgeT >= 2.9) play('hiss');
      if (forgeT > 4.6) forgeT = -1;
    }

    // The stone: the sword waits above, then drives in
    if (mode === 'stone') {
      stoneVis += (1 - stoneVis) * 0.06;
      if (!plunged && tg.btn && tg.btn.top < vh * 0.8 && stoneVis > 0.85) { plunged = true; plungeT = 0; }
    } else stoneVis += (0 - stoneVis) * 0.08;
    if (plungeT >= 0) {
      plungeT += dt;
      if (plungeT - dt < 0.32 && plungeT >= 0.32) { play('thud'); play('shing', 0.5); }
      if (plungeT > 1) plungeT = -1;
    }

    // Glide toward the pose (the plunge itself is fast)
    const k = mode === 'stone' && plunged && plungeT >= 0 && plungeT < 0.4 ? 0.35 : 0.075;
    cur.x += (tg.x - cur.x) * k; cur.y += (tg.y - cur.y) * k;
    let dr = tg.rot - cur.rot; dr = Math.atan2(Math.sin(dr), Math.cos(dr)); cur.rot += dr * 0.07;
    cur.scale += (tg.scale - cur.scale) * 0.07;
    cur.vis += (tg.vis - cur.vis) * 0.08;

    pose.position.set(wx(cur.x), wy(cur.y) + (mode === 'rail' ? Math.sin(t * 0.9) * 0.04 : 0), 0);
    pose.rotation.z = cur.rot;
    pose.scale.setScalar(Math.max(0.0001, cur.scale * (0.6 + 0.4 * cur.vis)));
    const settled = mode === 'stone' && plunged;
    spinBoost *= 0.94;
    const spin = settled ? 0 : spinV * dt + spinBoost * 0.06;
    spinner.rotation.y = settled ? spinner.rotation.y * 0.9 + (Math.round(spinner.rotation.y / Math.PI) * Math.PI) * 0.1 : spinner.rotation.y + spin;
    spinner.rotation.x = mode === 'forge' ? 0.18 : Math.sin(t * 0.5) * 0.06;
    pose.visible = cur.vis > 0.02;

    steel.emissiveIntensity = heat * 1.4; darkSteel.emissiveIntensity = heat * 0.5;
    forgeLight.intensity = heat * 30; forgeLight.position.copy(pose.position).add(new THREE.Vector3(0, 0, 1.2));

    // Etch a new name when the sword is in view and steady
    if (nextText && !etching && cur.vis > 0.9 && mode !== 'hidden' && forgeT < 0) {
      etchText = nextText; nextText = null; etching = true; etchStart = t; etchP = 0; play('scrape', 1.8);
      spinBoost = 0; spinner.rotation.y = Math.round(spinner.rotation.y / (Math.PI * 2)) * Math.PI * 2; // face the visitor
    }
    if (etching) { etchP = Math.min(1, (t - etchStart) / 1.8); paintEtch(); if (etchP >= 1) etching = false; }
    if (etching) spinner.rotation.y *= 0.9;

    // Stone placement, behind the call button
    if (tg.btn || stone.visible) {
      const b = tg.btn || (cta && cta.getBoundingClientRect());
      if (b) {
        const lift = mobile ? 16 : 30;
        const w = b.width + (mobile ? 70 : 170), h = b.height + (mobile ? 44 : 96);
        stone.scale.set(w * unit, h * unit, mobile ? 0.9 : 1.2);
        stone.position.set(wx(b.left + b.width / 2), wy(b.top - lift + h / 2) - (1 - stoneVis) * 0.6, -0.1);
      }
      stone.visible = stoneVis > 0.02;
      stoneMat.opacity = Math.min(1, stoneVis * 1.2);
    }

    // Sparks
    let anyLive = false;
    for (let i = 0; i < NS; i++) {
      if (sl[i] <= 0) { sp[i * 3 + 1] = 999; continue; }
      anyLive = true;
      sl[i] -= dt;
      sv[i * 3 + 1] -= 6 * dt;
      sp[i * 3] += sv[i * 3] * dt; sp[i * 3 + 1] += sv[i * 3 + 1] * dt; sp[i * 3 + 2] += sv[i * 3 + 2] * dt;
    }
    sparkGeo.attributes.position.needsUpdate = true;
    sparks.visible = anyLive;

    torch.position.set(wx(lx), wy(ly), 3);

    if (pose.visible || stone.visible || anyLive) { canvas.style.opacity = '1'; renderer.render(scene, camera); }
    else canvas.style.opacity = '0';
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  root.classList.add('has-sword');
}
