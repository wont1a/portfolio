/* NØVA FITNESS — the club, drawn in code.
   One dark hall: a glossy floor, a 6.6 m light sculpture in the shape of the
   brand's Ø, power racks, a dumbbell row, cardio facing a night-time Moscow
   skyline, a glass cycle studio and a recovery zone. Each chapter of the
   rail flies the camera to its zone. Built into assets/js/scene.js with
   esbuild (see README). */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

(function () {
  'use strict';
  var host = document.querySelector('[data-scene]');
  if (!host) return;
  var RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var MOBILE = matchMedia('(max-width: 830px), (pointer: coarse)').matches;

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: !MOBILE, powerPreference: 'high-performance', alpha: false });
  } catch (e) { return; }
  if (!renderer.getContext()) return;

  renderer.setClearColor(0x04070d, 1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  var canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');
  host.appendChild(canvas);

  var scene = new THREE.Scene();
  scene.background = new THREE.Color(0x04070d);
  scene.fog = new THREE.FogExp2(0x04060b, 0.0125);

  var camera = new THREE.PerspectiveCamera(38, 16 / 10, 0.1, 260);

  /* ---------------- materials ---------------- */
  function std(c, r, m, extra) {
    var o = { color: c, roughness: r, metalness: m || 0 };
    if (extra) for (var k in extra) o[k] = extra[k];
    return new THREE.MeshStandardMaterial(o);
  }
  function glow(hex, k) {
    var c = new THREE.Color(hex).multiplyScalar(k);
    return new THREE.MeshBasicMaterial({ color: c, fog: true });
  }
  var M = {
    frame:   std(0x15171c, 0.38, 0.75),
    chrome:  std(0xc9ccd2, 0.16, 1),
    rubber:  std(0x0d0e10, 0.82, 0),
    plate:   std(0x111216, 0.55, 0.2),
    leather: std(0x1a1b20, 0.48, 0),
    wood:    std(0x3a2618, 0.62, 0),
    oak:     std(0x8a6440, 0.55, 0),
    conc:    std(0x23252a, 0.92, 0),
    wall:    std(0x101217, 0.85, 0),
    turf:    std(0x0e1d14, 1, 0),
    stone:   std(0x07080a, 0.3, 0.1),
    glass:   new THREE.MeshStandardMaterial({ color: 0x9fb4d0, roughness: 0.05, metalness: 0.9, transparent: true, opacity: 0.12, depthWrite: false }),
    warm:    glow(0xffc98a, 5.2),
    warmDim: glow(0xffb36b, 1.6),
    strip:   glow(0xdfe6ff, 1.25),
    screen:  glow(0x6fa8ff, 1.15),
    magenta: glow(0xff2f6d, 3.2),
    cyan:    glow(0x37d6ff, 2.2),
    water:   new THREE.MeshStandardMaterial({ color: 0x0b3b52, roughness: 0.08, metalness: 0.3, emissive: 0x0a5c80, emissiveIntensity: 0.9 }),
    sauna:   glow(0xff8a3d, 1.4),
    city:    null
  };

  /* ---------------- geometry batching ----------------
     Every static part is pushed into a bucket per material and merged into
     one mesh at the end, so the whole hall costs a few dozen draw calls. */
  var buckets = new Map();
  var xf = new THREE.Matrix4();
  var stack = [];
  function push(mat, geo) {
    geo.applyMatrix4(xf);
    if (geo.index) geo = geo.toNonIndexed();
    if (geo.attributes.uv === undefined) geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
    if (!buckets.has(mat)) buckets.set(mat, []);
    buckets.get(mat).push(geo);
  }
  function at(x, y, z, ry, fn) {
    stack.push(xf.clone());
    var m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry || 0, 0)), new THREE.Vector3(1, 1, 1));
    xf.multiply(m);
    fn();
    xf.copy(stack.pop());
  }
  function box(mat, w, h, d, x, y, z, rx, ry, rz) {
    var g = new THREE.BoxGeometry(w, h, d);
    if (rx) g.rotateX(rx); if (ry) g.rotateY(ry); if (rz) g.rotateZ(rz);
    g.translate(x, y, z); push(mat, g);
  }
  function cyl(mat, r, len, x, y, z, axis, seg, r2) {
    var g = new THREE.CylinderGeometry(r2 == null ? r : r2, r, len, seg || 18);
    if (axis === 'x') g.rotateZ(Math.PI / 2);
    if (axis === 'z') g.rotateX(Math.PI / 2);
    g.translate(x, y, z); push(mat, g);
  }
  function tor(mat, R, r, x, y, z, rx, ry, segR, segT) {
    var g = new THREE.TorusGeometry(R, r, segT || 10, segR || 48);
    if (rx) g.rotateX(rx); if (ry) g.rotateY(ry);
    g.translate(x, y, z); push(mat, g);
  }
  function sph(mat, r, x, y, z) {
    var g = new THREE.SphereGeometry(r, 16, 12); g.translate(x, y, z); push(mat, g);
  }

  /* deterministic random, so the hall is identical on every load */
  var seed = 7;
  function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }

  /* ---------------- the room ---------------- */
  var W = 34, ZB = -32, ZF = 26, H = 9;
  // ceiling and its linear lights
  box(M.wall, W * 2, 0.2, ZF - ZB, 0, H + 0.1, (ZF + ZB) / 2);
  for (var lx = -26; lx <= 26.1; lx += 6.5) {
    box(M.frame, 0.16, 0.06, ZF - ZB - 6, lx, H - 0.03, (ZF + ZB) / 2 - 1);
    box(M.strip, 0.07, 0.025, ZF - ZB - 6, lx, H - 0.075, (ZF + ZB) / 2 - 1);
  }
  // exposed beams
  for (var bz = ZB + 4; bz < ZF; bz += 8) box(M.frame, W * 2, 0.5, 0.3, 0, H - 0.3, bz);

  // back wall: floor-to-ceiling glazing onto the city
  for (var wx = -W; wx <= W + 0.01; wx += 3.4) box(M.frame, 0.12, H, 0.18, wx, H / 2, ZB);
  box(M.frame, W * 2, 0.14, 0.2, 0, 0.35, ZB);
  box(M.frame, W * 2, 0.14, 0.2, 0, H - 0.6, ZB);
  box(M.frame, W * 2, 0.08, 0.16, 0, 4.4, ZB);
  var glassG = new THREE.PlaneGeometry(W * 2, H);
  var glassM = new THREE.Mesh(glassG, M.glass); glassM.position.set(0, H / 2, ZB + 0.02); scene.add(glassM);

  // side walls: dark timber slats, backlit at the foot
  [-1, 1].forEach(function (s) {
    box(M.wall, 0.3, H, ZF - ZB, s * W, H / 2, (ZF + ZB) / 2);
    for (var sz = ZB + 0.6; sz < ZF; sz += 0.34) box(M.wood, 0.12, H - 1.2, 0.16, s * (W - 0.2), H / 2 + 0.2, sz);
    box(M.warmDim, 0.04, 0.04, ZF - ZB, s * (W - 0.35), 0.42, (ZF + ZB) / 2);
  });

  // columns with a warm line of light on the inner face
  [-15, 15].forEach(function (cx) {
    for (var cz = -24; cz <= 18; cz += 10.5) {
      box(M.conc, 0.85, H, 0.85, cx, H / 2, cz);
      box(M.warm, 0.03, H - 1.2, 0.07, cx - Math.sign(cx) * 0.44, H / 2 + 0.1, cz);
    }
  });

  /* ---------------- equipment builders ---------------- */
  function plate(x, y, z, r, t) {
    cyl(M.plate, r, t, x, y, z, 'x', 28);
    cyl(M.chrome, r * 0.22, t + 0.01, x, y, z, 'x', 14);
  }
  function barbell(y, z, load) {
    cyl(M.chrome, 0.014, 2.2, 0, y, z, 'x', 10);
    [-1, 1].forEach(function (s) {
      cyl(M.chrome, 0.026, 0.42, s * 0.9, y, z, 'x', 12);
      for (var i = 0; i < load; i++) plate(s * (0.74 + i * 0.055), y, z, 0.225 - i * 0.02, 0.045);
    });
  }
  function rack() {
    box(M.oak, 2.5, 0.05, 2.6, 0, 0.025, 0);
    box(M.rubber, 0.55, 0.06, 2.6, -1.0, 0.03, 0);
    box(M.rubber, 0.55, 0.06, 2.6, 1.0, 0.03, 0);
    [[-0.62, -0.55], [0.62, -0.55], [-0.62, 0.6], [0.62, 0.6]].forEach(function (p) {
      box(M.frame, 0.075, 2.35, 0.075, p[0], 1.2, p[1]);
    });
    box(M.frame, 1.32, 0.075, 0.075, 0, 2.35, -0.55);
    box(M.frame, 1.32, 0.075, 0.075, 0, 2.35, 0.6);
    box(M.frame, 0.075, 0.075, 1.2, -0.62, 2.35, 0.02);
    box(M.frame, 0.075, 0.075, 1.2, 0.62, 2.35, 0.02);
    cyl(M.chrome, 0.018, 1.32, 0, 2.2, 0.6, 'x', 10);       // pull-up bar
    box(M.frame, 0.06, 0.05, 0.9, -0.62, 0.62, 0.05);       // safeties
    box(M.frame, 0.06, 0.05, 0.9, 0.62, 0.62, 0.05);
    barbell(1.38, 0.6, 3);
    // plate horns on the back
    [-1, 1].forEach(function (s) {
      cyl(M.chrome, 0.025, 0.28, s * 0.78, 0.45, -0.55, 'x', 10);
      for (var i = 0; i < 4; i++) plate(s * (0.7 + i * 0.05), 0.45, -0.55, 0.225, 0.04);
    });
  }
  function bench(len) {
    box(M.leather, 0.3, 0.09, len, 0, 0.45, 0);
    box(M.frame, 0.08, 0.38, 0.08, 0, 0.21, -len / 2 + 0.12);
    box(M.frame, 0.08, 0.38, 0.08, 0, 0.21, len / 2 - 0.12);
    box(M.frame, 0.5, 0.05, 0.08, 0, 0.03, -len / 2 + 0.12);
    box(M.frame, 0.5, 0.05, 0.08, 0, 0.03, len / 2 - 0.12);
    box(M.frame, 0.07, 0.05, len - 0.3, 0, 0.36, 0);
  }
  function dumbbell(x, y, z, r) {
    cyl(M.chrome, 0.017, 0.13, x, y, z, 'x', 8);
    cyl(M.plate, r, 0.075, x - 0.1 - r * 0.2, y, z, 'x', 6);
    cyl(M.plate, r, 0.075, x + 0.1 + r * 0.2, y, z, 'x', 6);
  }
  function dumbbellRack(n) {
    var len = n * 0.42;
    for (var tier = 0; tier < 2; tier++) {
      var ty = 0.55 + tier * 0.38, tz = tier * -0.32;
      box(M.frame, len, 0.05, 0.36, 0, ty, tz, -0.18);
      for (var i = 0; i < n; i++) {
        var r = 0.05 + (tier * n + i) / (2 * n) * 0.06;
        dumbbell(-len / 2 + 0.21 + i * 0.42, ty + 0.05 + r, tz, r);
      }
    }
    for (var j = 0; j <= Math.round(n / 4); j++) {
      var fx = -len / 2 + j * len / Math.round(n / 4);
      box(M.frame, 0.07, 1.0, 0.07, fx, 0.5, -0.15);
      box(M.frame, 0.07, 0.05, 0.75, fx, 0.03, -0.15);
    }
  }
  function treadmill() {
    box(M.frame, 0.86, 0.22, 2.0, 0, 0.13, 0);
    box(M.rubber, 0.58, 0.02, 1.7, 0, 0.25, 0.08);
    box(M.frame, 0.07, 1.15, 0.08, -0.38, 0.75, -0.86, 0.18);
    box(M.frame, 0.07, 1.15, 0.08, 0.38, 0.75, -0.86, 0.18);
    box(M.frame, 0.86, 0.06, 0.08, 0, 1.06, -0.72);
    box(M.frame, 0.66, 0.42, 0.06, 0, 1.38, -0.98, 0.35);
    box(M.screen, 0.56, 0.32, 0.01, 0, 1.39, -0.945, 0.35);
  }
  function bike(glowMat) {
    box(M.frame, 0.12, 0.05, 1.05, 0, 0.03, 0);
    box(M.frame, 0.55, 0.05, 0.1, 0, 0.03, -0.45);
    box(M.frame, 0.55, 0.05, 0.1, 0, 0.03, 0.45);
    box(M.frame, 0.07, 0.75, 0.07, 0, 0.42, 0.25, -0.2);
    box(M.leather, 0.16, 0.06, 0.28, 0, 0.84, 0.32);
    box(M.frame, 0.07, 0.95, 0.07, 0, 0.5, -0.3, 0.22);
    box(M.frame, 0.46, 0.04, 0.05, 0, 1.0, -0.42);
    cyl(M.chrome, 0.24, 0.05, 0, 0.32, -0.32, 'x', 28);
    if (glowMat) cyl(glowMat, 0.245, 0.012, 0.03, 0.32, -0.32, 'x', 28);
  }
  function stackMachine() {
    box(M.frame, 0.9, 2.1, 0.12, 0, 1.05, -0.6);
    box(M.frame, 0.12, 2.1, 0.12, -0.4, 1.05, -0.3);
    box(M.frame, 0.12, 2.1, 0.12, 0.4, 1.05, -0.3);
    box(M.chrome, 0.36, 0.9, 0.12, 0, 0.55, -0.45);
    box(M.frame, 0.42, 1.05, 0.2, 0, 1.55, -0.45);   // shroud
    box(M.frame, 0.08, 0.08, 1.1, 0, 0.3, 0.1);
    box(M.leather, 0.42, 0.08, 0.42, 0, 0.5, 0.3);
    box(M.leather, 0.42, 0.62, 0.08, 0, 0.88, 0.08, -0.12);
    box(M.frame, 1.1, 0.05, 0.05, 0, 1.4, 0.35);
    cyl(M.rubber, 0.03, 0.18, -0.55, 1.4, 0.35, 'x', 8);
    cyl(M.rubber, 0.03, 0.18, 0.55, 1.4, 0.35, 'x', 8);
  }
  function cableTower() {
    [-1.2, 1.2].forEach(function (x) {
      box(M.frame, 0.32, 2.4, 0.32, x, 1.2, 0);
      box(M.chrome, 0.2, 0.9, 0.06, x, 0.55, 0.17);
      cyl(M.chrome, 0.06, 0.04, x, 2.0, 0.2, 'z', 14);
    });
    box(M.frame, 2.72, 0.12, 0.2, 0, 2.46, 0);
    cyl(M.chrome, 0.016, 1.2, 0, 2.3, 0.1, 'x', 8);
  }
  function kettlebell(x, z, s) {
    sph(M.plate, 0.11 * s, x, 0.11 * s, z);
    tor(M.plate, 0.07 * s, 0.016 * s, x, 0.24 * s, z, 0, 0, 16, 6);
  }
  function plyo(x, y, z, w, h) { box(M.oak, w, h, 0.6, x, y + h / 2, z); }

  /* ---------------- zones ---------------- */
  // centre: turf lane leading to the Ø
  box(M.turf, 2.6, 0.03, 15, 0, 0.015, 3.5);
  box(M.chrome, 0.05, 0.035, 15, -1.3, 0.017, 3.5);
  box(M.chrome, 0.05, 0.035, 15, 1.3, 0.017, 3.5);
  for (var ty = -3; ty <= 10; ty += 2.6) box(M.strip, 2.5, 0.032, 0.03, 0, 0.018, ty);
  // polished plinth under the sculpture
  cyl(M.stone, 4.2, 0.1, 0, 0.05, -8, 'y', 64);
  tor(M.warmDim, 4.2, 0.012, 0, 0.1, -8, Math.PI / 2, 0, 128, 6);

  // left: free weights — three racks on oak platforms, benches, kettlebells
  [-11.5, -8.3, -5.1].forEach(function (z, i) {
    at(-9.5, 0, z + 2, Math.PI / 2, rack);
    at(-9.5 + 2.3, 0, z + 2, Math.PI / 2, function () { bench(1.2); });
  });
  at(-12.2, 0, 4.5, Math.PI / 2, function () { dumbbellRack(10); });
  at(-6.8, 0, 6.4, 0.25, function () { bench(1.2); });
  for (var k = 0; k < 9; k++) kettlebell(-5.4 + (k % 3) * 0.45, 9.6 + Math.floor(k / 3) * 0.5, 0.8 + (k % 3) * 0.25);
  plyo(-4.1, 0, 12, 0.75, 0.6); plyo(-4.1, 0.6, 12, 0.6, 0.45); plyo(-3.2, 0, 12.2, 0.75, 0.75);

  // right: machines and cables
  [-11, -7.3, -3.6, 0.1].forEach(function (z) { at(10.2, 0, z, -Math.PI / 2, stackMachine); });
  [-11, -7.3, -3.6, 0.1].forEach(function (z) { at(12.6, 0, z + 1.8, -Math.PI / 2, stackMachine); });
  at(7.2, 0, 4.5, -Math.PI / 2, cableTower);
  at(7.2, 0, 9.5, -Math.PI / 2, cableTower);
  at(5.6, 0, 7, 0, function () { bench(1.2); });

  // back: cardio row facing the window
  for (var tx = -10.5; tx <= 10.6; tx += 1.5) at(tx, 0, -24.5, 0, treadmill);
  for (var bx = -9.75; bx <= 9.9; bx += 1.5) at(bx, 0, -20.6, 0, function () { bike(null); });

  // left: glass cycle studio
  (function () {
    var x0 = -31.5, x1 = -18.5, z0 = -12, z1 = 8, h = 4.2;
    box(M.stone, x1 - x0, 0.06, z1 - z0, (x0 + x1) / 2, 0.03, (z0 + z1) / 2);
    box(M.wall, x1 - x0, 0.12, z1 - z0, (x0 + x1) / 2, h, (z0 + z1) / 2);
    for (var gz = z0; gz <= z1 + 0.01; gz += 2.5) box(M.frame, 0.08, h, 0.08, x1, h / 2, gz);
    box(M.frame, 0.1, 0.08, z1 - z0, x1, h, (z0 + z1) / 2);
    box(M.magenta, 0.05, 0.05, z1 - z0 - 0.4, x1 - 0.12, h - 0.12, (z0 + z1) / 2);
    box(M.magenta, 0.05, 0.05, z1 - z0 - 0.4, x0 + 0.3, h - 0.12, (z0 + z1) / 2);
    box(M.magenta, x1 - x0 - 0.4, 0.05, 0.05, (x0 + x1) / 2, h - 0.12, z0 + 0.2);
    for (var r = 0; r < 4; r++) for (var c = 0; c < 6; c++)
      at(x0 + 3 + r * 2.3, 0.06, z0 + 2.4 + c * 2.9, -Math.PI / 2, function () { bike(M.magenta); });
    at(x0 + 1.4, 0.06, (z0 + z1) / 2, Math.PI / 2, function () { box(M.oak, 2.4, 0.45, 2.4, 0, 0.22, 0); bike(M.magenta); });
    var gl = new THREE.Mesh(new THREE.PlaneGeometry(z1 - z0, h), M.glass);
    gl.rotation.y = Math.PI / 2; gl.position.set(x1 + 0.02, h / 2, (z0 + z1) / 2); scene.add(gl);
  })();

  // right: recovery — plunge pool, sauna, loungers
  (function () {
    var x0 = 18.5, x1 = 32;
    box(M.oak, x1 - x0, 0.08, 20, (x0 + x1) / 2, 0.04, -2);
    box(M.stone, 4.6, 0.5, 3.2, 23.6, 0.25, -6.5);
    box(M.water, 4.1, 0.02, 2.7, 23.6, 0.5, -6.5);
    box(M.cyan, 4.2, 0.03, 0.03, 23.6, 0.49, -5.1);
    box(M.cyan, 4.2, 0.03, 0.03, 23.6, 0.49, -7.9);
    // sauna cabin
    box(M.wood, 4.2, 3.0, 4.0, 28.5, 1.5, 3);
    box(M.sauna, 0.02, 1.9, 1.2, 26.39, 1.35, 2.2);
    box(M.sauna, 0.02, 1.1, 1.2, 26.39, 1.6, 4.0);
    box(M.frame, 0.06, 3.0, 0.06, 26.38, 1.5, 1.0);
    // loungers
    for (var i = 0; i < 4; i++) at(21 + i * 1.6, 0.08, 4.5, 0.2, function () {
      box(M.leather, 0.7, 0.14, 1.6, 0, 0.32, 0.2);
      box(M.leather, 0.7, 0.7, 0.14, 0, 0.6, -0.65, -0.55);
      box(M.frame, 0.6, 0.25, 0.06, 0, 0.12, 0.7);
      box(M.frame, 0.6, 0.25, 0.06, 0, 0.12, -0.4);
    });
    box(M.cyan, 0.04, 0.04, 20, x0 + 0.1, 0.1, -2);
  })();

  /* ---------------- the city beyond the glass ---------------- */
  (function () {
    var c = document.createElement('canvas'); c.width = 256; c.height = 512;
    var g = c.getContext('2d');
    g.fillStyle = '#070a12'; g.fillRect(0, 0, 256, 512);
    // curtain-wall mullions
    g.fillStyle = 'rgba(120,140,180,.06)';
    for (var mx = 0; mx < 256; mx += 8) g.fillRect(mx, 0, 1, 512);
    // whole floors lit or dark, with a few occupied offices on the dark ones
    for (var y = 4; y < 512; y += 8) {
      var floorOn = rnd() < 0.18, warmF = rnd() < 0.75;
      for (var x = 1; x < 256; x += 8) {
        var on = floorOn ? rnd() < 0.85 : rnd() < 0.06;
        if (!on) continue;
        var a2 = 0.25 + rnd() * 0.55;
        g.fillStyle = (floorOn ? warmF : rnd() < 0.6) ? 'rgba(255,' + (196 + (rnd() * 40 | 0)) + ',130,' + a2 + ')'
                                                      : 'rgba(160,195,255,' + a2 + ')';
        g.fillRect(x, y, 6, 4);
      }
    }
    var tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    M.city = new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(0.9, 0.85, 0.8), fog: false });
    var dark = new THREE.MeshBasicMaterial({ color: 0x06080d, fog: false });
    var ci = 0;
    function tower(x, z, w, d, h) {
      var g2 = new THREE.BoxGeometry(w, h, d);
      var uv = g2.attributes.uv;
      var off = rnd();
      for (var i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / 26 + off, uv.getY(i) * h / 64 + off);
      g2.translate(x, h / 2 - 6, z);
      var m = new THREE.Mesh(g2, M.city); scene.add(m);
      if (h > 60) { var av = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 0.3, 0.2), fog: false })); av.position.set(x, h - 6 + 0.6, z + d / 2); scene.add(av); }
      ci++;
    }
    // a Moscow-City cluster slightly right of centre, and a long low skyline
    tower(10, -120, 9, 9, 95); tower(19, -132, 8, 8, 120); tower(3, -140, 10, 10, 78);
    tower(27, -118, 7, 7, 70); tower(14, -150, 9, 9, 140);
    for (var i = 0; i < 26; i++) {
      var x = -110 + i * 8.5 + rnd() * 4;
      if (x > -2 && x < 32) continue;
      tower(x, -95 - rnd() * 40, 6 + rnd() * 6, 6, 18 + rnd() * 36);
    }
    // the sky: deep navy fading to a warm city glow at the horizon
    var sc = document.createElement('canvas'); sc.width = 4; sc.height = 256;
    var sg = sc.getContext('2d'); var grd = sg.createLinearGradient(0, 0, 0, 256);
    grd.addColorStop(0, '#03060c'); grd.addColorStop(0.55, '#0a1426'); grd.addColorStop(0.8, '#1d2033'); grd.addColorStop(1, '#3a2a2a');
    sg.fillStyle = grd; sg.fillRect(0, 0, 4, 256);
    var st = new THREE.CanvasTexture(sc); st.colorSpace = THREE.SRGBColorSpace;
    var sky = new THREE.Mesh(new THREE.PlaneGeometry(600, 180), new THREE.MeshBasicMaterial({ map: st, fog: false }));
    sky.position.set(0, 50, -200); scene.add(sky);
    var hz = document.createElement('canvas'); hz.width = 4; hz.height = 128;
    var hg = hz.getContext('2d'); var hgr = hg.createLinearGradient(0, 0, 0, 128);
    hgr.addColorStop(0, 'rgba(40,46,70,0)'); hgr.addColorStop(0.75, 'rgba(70,60,70,.35)'); hgr.addColorStop(1, 'rgba(90,70,60,.55)');
    hg.fillStyle = hgr; hg.fillRect(0, 0, 4, 128);
    var ht = new THREE.CanvasTexture(hz); ht.colorSpace = THREE.SRGBColorSpace;
    var haze = new THREE.Mesh(new THREE.PlaneGeometry(500, 40), new THREE.MeshBasicMaterial({ map: ht, transparent: true, depthWrite: false, fog: false }));
    haze.position.set(0, 12, -90); scene.add(haze);
    var ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 200), dark);
    ground.rotation.x = -Math.PI / 2; ground.position.set(0, -6, -140); scene.add(ground);
  })();

  /* ---------------- brand sign above the glazing ---------------- */
  (function () {
    var c = document.createElement('canvas'); c.width = 1024; c.height = 256;
    var g = c.getContext('2d');
    g.clearRect(0, 0, 1024, 256);
    g.fillStyle = '#fff';
    g.font = '700 170px "Inter S", "Inter", Arial, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    if (g.letterSpacing !== undefined) g.letterSpacing = '24px';
    g.fillText('NØVA', 512, 136);
    var t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    var m = new THREE.MeshBasicMaterial({ map: t, transparent: true, color: new THREE.Color(2.2, 2.0, 1.8), depthWrite: false });
    var sign = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 1.9), m);
    sign.position.set(-11.6, 7.3, ZB + 0.4); scene.add(sign);
    window.addEventListener('nova:fonts', function () {
      g.clearRect(0, 0, 1024, 256); g.fillText('NØVA', 512, 136); t.needsUpdate = true;
    });
  })();

  /* ---------------- merge ---------------- */
  buckets.forEach(function (geos, mat) {
    var merged = mergeGeometries(geos, false);
    var mesh = new THREE.Mesh(merged, mat);
    mesh.matrixAutoUpdate = false;
    scene.add(mesh);
  });

  /* ---------------- the Ø ----------------
     A ring of light 6.6 m across, standing over the plinth, crossed by the
     slash of the brand mark. It breathes at a resting heart rate. */
  var ringY = 3.95, ringZ = -8, R = 3.25;
  var ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffc98a).multiplyScalar(7) });
  var ringGroup = new THREE.Group(); ringGroup.position.set(0, ringY, ringZ); scene.add(ringGroup);
  var ring = new THREE.Mesh(new THREE.TorusGeometry(R, 0.055, 16, 220), ringMat); ringGroup.add(ring);
  var housing = new THREE.Mesh(new THREE.TorusGeometry(R, 0.12, 16, 220), M.frame);
  housing.position.z = -0.1; ringGroup.add(housing);
  var slashLen = R * 2.35;
  var slash = new THREE.Mesh(new THREE.BoxGeometry(0.1, slashLen, 0.1), ringMat);
  slash.rotation.z = -0.62; ringGroup.add(slash);
  var slashH = new THREE.Mesh(new THREE.BoxGeometry(0.2, slashLen, 0.2), M.frame);
  slashH.rotation.z = -0.62; slashH.position.z = -0.12; ringGroup.add(slashH);
  // suspension cables
  [-1, 1].forEach(function (s) {
    var cab = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, H - ringY - R), M.chrome);
    cab.position.set(s * 0.9, R + (H - ringY - R) / 2, 0); ringGroup.add(cab);
  });
  var ringLight = new THREE.PointLight(0xffb978, 90, 22, 1.6);
  ringLight.position.set(0, ringY, ringZ + 0.6); scene.add(ringLight);
  var ringLight2 = new THREE.PointLight(0xffb978, 40, 16, 1.8);
  ringLight2.position.set(0, 2.2, ringZ + 3.5); scene.add(ringLight2);

  /* ---------------- lights ---------------- */
  scene.add(new THREE.HemisphereLight(0x2a3a60, 0x040506, 0.35));
  function spot(x, z, col, inten, ang) {
    var s = new THREE.SpotLight(col, inten, 16, ang || 0.55, 0.7, 1.4);
    s.position.set(x, H - 0.3, z); s.target.position.set(x, 0, z);
    scene.add(s); scene.add(s.target);
  }
  spot(-9.5, -7, 0xfff1de, 170); spot(-9.5, 0, 0xfff1de, 150); spot(-11, 5, 0xfff1de, 110);
  spot(10.5, -5, 0xe8eeff, 120); spot(8, 6.5, 0xe8eeff, 90);
  spot(0, -23, 0xdfe7ff, 120, 0.8); spot(-25, -2, 0xff2f6d, 160, 0.9);
  spot(25, -4, 0x37d6ff, 90, 0.9); spot(0, 9, 0xfff1de, 70, 0.6);
  var studioLight = new THREE.PointLight(0xff2f6d, 40, 18, 1.6);
  studioLight.position.set(-25, 3, -2); scene.add(studioLight);
  var poolLight = new THREE.PointLight(0x37d6ff, 25, 10, 1.6);
  poolLight.position.set(23.6, 1.4, -6.5); scene.add(poolLight);

  /* ---------------- floor: a dark mirror under polished concrete ---------------- */
  var fw = W * 2, fd = ZF - ZB;
  var reflector = new Reflector(new THREE.PlaneGeometry(fw, fd), {
    textureWidth: 512, textureHeight: 512, color: 0x8a8f99, clipBias: 0.003
  });
  reflector.rotation.x = -Math.PI / 2; reflector.position.set(0, 0, (ZF + ZB) / 2);
  scene.add(reflector);
  var fc = document.createElement('canvas'); fc.width = fc.height = 512;
  (function () {
    var g = fc.getContext('2d');
    var img = g.createImageData(512, 512);
    for (var i = 0; i < img.data.length; i += 4) {
      var v = 118 + (rnd() * 40 - 20) + Math.sin(i * 0.00007) * 8;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 2;
    for (var p = 0; p <= 512; p += 128) { g.beginPath(); g.moveTo(p, 0); g.lineTo(p, 512); g.stroke(); g.beginPath(); g.moveTo(0, p); g.lineTo(512, p); g.stroke(); }
  })();
  var ftex = new THREE.CanvasTexture(fc); ftex.wrapS = ftex.wrapT = THREE.RepeatWrapping; ftex.repeat.set(fw / 6, fd / 6);
  var floor = new THREE.Mesh(new THREE.PlaneGeometry(fw, fd), new THREE.MeshStandardMaterial({
    color: 0x0b0d12, roughness: 0.5, roughnessMap: ftex, metalness: 0.1, transparent: true, opacity: 0.8
  }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0.002, (ZF + ZB) / 2);
  scene.add(floor);

  /* environment for the metal: the hall itself, prefiltered once */
  var pmrem = new THREE.PMREMGenerator(renderer);
  reflector.visible = false;
  scene.environment = pmrem.fromScene(scene, 0.04, 0.1, 200).texture;
  scene.environmentIntensity = 0.55;
  reflector.visible = true;

  /* ---------------- post: bloom, then a film grade ---------------- */
  var composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  var bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.8, 0.6, 0.9);
  composer.addPass(bloom);
  var grade = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uAspect: { value: 1.6 } },
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: [
      'uniform sampler2D tDiffuse;uniform float uTime;uniform float uAspect;varying vec2 vUv;',
      'float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}',
      'void main(){',
      ' vec2 d=vUv-.5; d.x*=uAspect/1.6;',
      ' float r=dot(d,d);',
      ' vec3 c;',
      ' c.r=texture2D(tDiffuse,vUv+d*r*.006).r; c.g=texture2D(tDiffuse,vUv).g; c.b=texture2D(tDiffuse,vUv-d*r*.006).b;',
      ' c*=1.-smoothstep(.12,.62,r)*.62;',
      ' c=mix(c,c*vec3(.92,.98,1.12),.35);',
      ' c+=(h(vUv*vec2(1931.,1213.)+fract(uTime))-.5)*.018;',
      ' gl_FragColor=vec4(c,1.);}'
    ].join('\n')
  });
  composer.addPass(grade);
  composer.addPass(new OutputPass());

  /* ---------------- chapters: where the camera stands ---------------- */
  var SHOTS = [
    { p: [0, 1.25, 16.5],   t: [0, 2.05, -8],    drift: 0.5 },   // Ø-RING
    { p: [-5.2, 1.45, 2.6], t: [-10.2, 1.0, -7], drift: 0.3 },   // free weights
    { p: [5.2, 1.6, 3.2],  t: [11.5, 1.1, -6],  drift: 0.3 },    // machines
    { p: [0.5, 2.6, -11],   t: [4, 3.2, -40],    drift: 0.3 },    // cardio + city
    { p: [-13.2, 2.1, 1.6], t: [-27, 1.2, -2],   drift: 0.25 },   // studio
    { p: [14.2, 1.8, 1.0],  t: [26, 0.9, -4],    drift: 0.25 }    // recovery
  ];
  var cur = { p: new THREE.Vector3().fromArray(SHOTS[0].p), t: new THREE.Vector3().fromArray(SHOTS[0].t) };
  var from = { p: cur.p.clone(), t: cur.t.clone() }, to = { p: cur.p.clone(), t: cur.t.clone() };
  var flyT0 = -1, FLY = 2600, shot = 0;
  function ease(x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }

  function setChapter(i) {
    if (!SHOTS[i] || i === shot) return;
    shot = i;
    from.p.copy(cur.p); from.t.copy(cur.t);
    to.p.fromArray(SHOTS[i].p); to.t.fromArray(SHOTS[i].t);
    flyT0 = RM ? -1 : performance.now();
    if (RM) { cur.p.copy(to.p); cur.t.copy(to.t); }
    wake();
  }

  /* pointer parallax: a long ease toward the pointer, like the reference */
  var px = 0, py = 0, cx = 0, cy = 0;
  window.addEventListener('pointermove', function (e) {
    if (e.pointerType === 'touch' || RM) return;
    px = (e.clientX / innerWidth) * 2 - 1; py = (e.clientY / innerHeight) * 2 - 1; wake();
  }, { passive: true });
  document.addEventListener('pointerleave', function () { px = 0; py = 0; });

  /* ---------------- size ---------------- */
  var quality = MOBILE ? 1 : Math.min(devicePixelRatio || 1, 1.5);
  function resize() {
    var w = host.clientWidth || innerWidth, h = host.clientHeight || innerHeight;
    var a = w / h;
    camera.aspect = a;
    // keep the horizontal field roughly constant so a phone sees the same hall, cropped
    var hfov = 64 * Math.PI / 180;
    var v = 2 * Math.atan(Math.tan(hfov / 2) / a) * 180 / Math.PI;
    camera.fov = Math.min(Math.max(v, 36), 72);
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(quality);
    renderer.setSize(w, h, false);
    composer.setPixelRatio(quality);
    composer.setSize(w, h);
    grade.uniforms.uAspect.value = a;
  }
  resize();
  var rz; window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(resize, 80); });

  /* ---------------- loop ---------------- */
  var visible = true, running = false, t0 = performance.now(), slowFrames = 0, last = 0, firstFrame = true;
  function heart(t) { // a resting double beat, 62 bpm
    var ph = (t * 62 / 60) % 1;
    return Math.exp(-Math.pow((ph - 0.05) / 0.035, 2)) + 0.55 * Math.exp(-Math.pow((ph - 0.2) / 0.04, 2));
  }
  var tmpP = new THREE.Vector3(), tmpT = new THREE.Vector3();
  var beat = 0, beatT0 = 0;   // when the club's sound is on, the Ø pulses on the kick
  function frame(now) {
    if (!visible) { running = false; return; }
    var t = (now - t0) / 1000;
    if (flyT0 >= 0) {
      var k = Math.min(1, (now - flyT0) / FLY), e = ease(k);
      cur.p.lerpVectors(from.p, to.p, e); cur.t.lerpVectors(from.t, to.t, e);
      cur.p.y += Math.sin(k * Math.PI) * 1.1;          // the camera lifts as it travels
      if (k >= 1) flyT0 = -1;
    }
    cx += (px - cx) * 0.045; cy += (py - cy) * 0.045;
    var d = RM ? 0 : SHOTS[shot].drift;
    tmpP.copy(cur.p);
    tmpP.x += Math.sin(t * 0.11) * d + cx * 0.55;
    tmpP.y += Math.sin(t * 0.17) * d * 0.25 - cy * 0.25;
    tmpP.z += Math.cos(t * 0.09) * d * 0.4;
    tmpT.copy(cur.t); tmpT.x += cx * 0.25; tmpT.y -= cy * 0.2;
    camera.position.copy(tmpP); camera.lookAt(tmpT);

    var b = RM ? 0.6 : beat ? Math.exp(-(((now - beatT0) / 1000 * beat / 60) % 1) * 7) * 1.25 : heart(t);
    var k2 = 6.2 + b * 2.4;
    ringMat.color.setRGB(1 * k2, 0.79 * k2, 0.54 * k2);
    ringLight.intensity = 80 + b * 40;
    grade.uniforms.uTime.value = t;

    composer.render();

    // adaptive quality: drop resolution if frames are slow
    if (last) {
      var dt = now - last;
      if (dt > 40) slowFrames++; else slowFrames = Math.max(0, slowFrames - 1);
      if (slowFrames > 40 && quality > 0.6) { quality = Math.max(0.6, quality - 0.2); slowFrames = 0; resize(); }
    }
    last = now;
    if (firstFrame) { firstFrame = false; host.classList.add('live'); window.dispatchEvent(new Event('nova:scene-ready')); }
    requestAnimationFrame(frame);
  }
  function wake() { if (!running && visible) { running = true; last = 0; requestAnimationFrame(frame); } }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting && !document.hidden; wake(); }).observe(host);
  }
  document.addEventListener('visibilitychange', function () { visible = !document.hidden; wake(); });
  wake();

  window.NovaScene = {
    setChapter: setChapter,
    setBeat: function (bpm, startMs) { beat = bpm || 0; beatT0 = startMs || performance.now(); }
  };
  window.dispatchEvent(new Event('nova:scene-api'));
})();
