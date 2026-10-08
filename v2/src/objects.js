/* Ctrl+S — brand objects built in code: the ^S window avatar, keycaps,
   a cursor and a paper plane. Shared by the hero scene and by the
   offline renders of the About-section icons. */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { Font } from 'three/examples/jsm/loaders/FontLoader.js';
import glyphs from './glyphs.json';

export const LIME = 0xb8f53a;
const font = new Font(glyphs);

function text(str, size, depth, mat) {
  const g = new TextGeometry(str, { font, size, depth, curveSegments: 10, bevelEnabled: true, bevelThickness: depth * 0.25, bevelSize: size * 0.025, bevelSegments: 4 });
  g.computeBoundingBox(); g.center();
  return new THREE.Mesh(g, mat);
}

/* the caret of ^S: two rounded strokes meeting at the top */
function chevron(w, h, t, depth, mat) {
  const grp = new THREE.Group();
  const len = Math.hypot(w / 2, h) + t * 0.4, ang = Math.atan2(w / 2, h);
  [-1, 1].forEach(s => {
    const bar = new THREE.Mesh(new RoundedBoxGeometry(t, len, depth, 4, t * 0.45), mat);
    bar.position.set(s * w / 4, 0, 0); bar.rotation.z = s * ang; grp.add(bar);
  });
  return grp;
}

/* additive glow sprite, so the object glows on a transparent canvas without post */
export function glowSprite(color, size, opacity) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const m = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false });
  const s = new THREE.Sprite(m); s.scale.set(size, size, 1);
  return s;
}

/* the avatar: a dark app window with traffic lights and ^S */
export function avatar() {
  const grp = new THREE.Group();
  const body = new THREE.Mesh(new RoundedBoxGeometry(3.3, 2.75, 0.62, 8, 0.34),
    new THREE.MeshPhysicalMaterial({ color: 0x16191f, roughness: 0.32, metalness: 0.25, clearcoat: 1, clearcoatRoughness: 0.18 }));
  grp.add(body);
  // lime rim, like the glow around the avatar
  const rim = new THREE.Mesh(new RoundedBoxGeometry(3.42, 2.87, 0.5, 8, 0.38),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(LIME).multiplyScalar(0.55), transparent: true, opacity: 0.35 }));
  rim.position.z = -0.08; grp.add(rim);
  const face = new THREE.Mesh(new RoundedBoxGeometry(3.06, 2.5, 0.06, 6, 0.2),
    new THREE.MeshPhysicalMaterial({ color: 0x0d0f13, roughness: 0.5, metalness: 0.1, clearcoat: 0.6 }));
  face.position.z = 0.3; grp.add(face);
  const bar = new THREE.Mesh(new RoundedBoxGeometry(3.06, 0.46, 0.07, 6, 0.06),
    new THREE.MeshPhysicalMaterial({ color: 0x23272f, roughness: 0.45, metalness: 0.2, clearcoat: 0.8 }));
  bar.position.set(0, 1.02, 0.31); grp.add(bar);
  [0xff5f57, 0xfebc2e, 0x28c840].forEach((c, i) => {
    const d = new THREE.Mesh(new THREE.SphereGeometry(0.085, 24, 16),
      new THREE.MeshPhysicalMaterial({ color: c, emissive: c, emissiveIntensity: 0.35, roughness: 0.2, clearcoat: 1 }));
    d.scale.z = 0.5; d.position.set(-1.27 + i * 0.27, 1.02, 0.36); grp.add(d);
  });
  const white = new THREE.MeshPhysicalMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.25, roughness: 0.25, clearcoat: 1 });
  const caret = chevron(0.66, 0.5, 0.2, 0.18, white); caret.position.set(-0.55, 0.12, 0.42); grp.add(caret);
  const limeMat = new THREE.MeshPhysicalMaterial({ color: LIME, emissive: LIME, emissiveIntensity: 0.55, roughness: 0.22, clearcoat: 1 });
  const S = text('S', 1.18, 0.22, limeMat); S.position.set(0.5, -0.12, 0.45); grp.add(S);
  const sGlow = glowSprite(LIME, 2.2, 0.32); sGlow.position.set(0.5, -0.12, 0.55); grp.add(sGlow);
  grp.userData = { S, sGlow, rim, limeMat };
  return grp;
}

/* a keyboard keycap with a label */
export function keycap(label, opts) {
  opts = opts || {};
  const grp = new THREE.Group();
  const w = opts.w || 1.6, col = opts.color || 0x1b1e24, txt = opts.text || 0xffffff;
  const base = new THREE.Mesh(new RoundedBoxGeometry(w, 0.7, 1.6, 6, 0.18),
    new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.38, metalness: 0.1, clearcoat: 0.8, clearcoatRoughness: 0.2 }));
  grp.add(base);
  const top = new THREE.Mesh(new RoundedBoxGeometry(w * 0.8, 0.2, 1.24, 6, 0.1),
    new THREE.MeshPhysicalMaterial({ color: new THREE.Color(col).offsetHSL(0, 0, 0.05), roughness: 0.3, clearcoat: 1 }));
  top.position.y = 0.42; grp.add(top);
  const m = new THREE.MeshPhysicalMaterial({ color: txt, emissive: txt, emissiveIntensity: opts.glow || 0.2, roughness: 0.3, clearcoat: 1 });
  const t = text(label, opts.size || 0.42, 0.06, m); t.rotation.x = -Math.PI / 2; t.position.set(0, 0.55, 0); grp.add(t);
  return grp;
}

/* the mouse cursor */
export function cursor(color) {
  const s = new THREE.Shape();
  const P = [[0, 0], [0, -1.7], [0.42, -1.3], [0.72, -1.95], [1.0, -1.82], [0.72, -1.2], [1.25, -1.2]];
  s.moveTo(P[0][0], P[0][1]); P.slice(1).forEach(p => s.lineTo(p[0], p[1])); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.28, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.06, bevelSegments: 5 });
  g.center();
  return new THREE.Mesh(g, new THREE.MeshPhysicalMaterial({ color: color || 0xffffff, roughness: 0.22, clearcoat: 1, emissive: color || 0xffffff, emissiveIntensity: 0.08 }));
}

/* Telegram's paper plane */
export function plane() {
  const grp = new THREE.Group();
  const mat = new THREE.MeshPhysicalMaterial({ color: 0x2aabee, roughness: 0.25, clearcoat: 1, emissive: 0x2aabee, emissiveIntensity: 0.15 });
  const wing = new THREE.Shape(); wing.moveTo(-1.4, -0.1); wing.lineTo(1.5, 0.9); wing.lineTo(0.9, -1.0); wing.lineTo(0.15, -0.45); wing.closePath();
  const g = new THREE.ExtrudeGeometry(wing, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 4 }); g.center();
  const a = new THREE.Mesh(g, mat); grp.add(a);
  const fold = new THREE.Shape(); fold.moveTo(-0.2, -0.2); fold.lineTo(1.2, 0.75); fold.lineTo(0.1, -0.75); fold.closePath();
  const g2 = new THREE.ExtrudeGeometry(fold, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 3 }); g2.center();
  const b = new THREE.Mesh(g2, new THREE.MeshPhysicalMaterial({ color: 0x1a86c4, roughness: 0.3, clearcoat: 1 }));
  b.position.set(0.25, -0.1, 0.18); b.rotation.y = 0.35; grp.add(b);
  return grp;
}

export function lights(scene, renderer) {
  const pm = new THREE.PMREMGenerator(renderer);
  const env = new THREE.Scene();
  const box = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10), new THREE.MeshBasicMaterial({ color: 0x080808, side: THREE.BackSide }));
  env.add(box);
  [[0, 4.9, 0, 6, 0.3, 6, 0xffffff, 3], [-4.9, 1, 1, 0.3, 4, 3, LIME, 2.2], [4.9, 0, 2, 0.3, 3, 4, 0x9fb7ff, 1.6], [0, -1, 4.9, 3, 1.2, 0.3, 0xffffff, 1.2]].forEach(a => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(a[3], a[4], a[5]), new THREE.MeshBasicMaterial({ color: new THREE.Color(a[6]).multiplyScalar(a[7]) }));
    m.position.set(a[0], a[1], a[2]); env.add(m);
  });
  scene.environment = pm.fromScene(env, 0.02).texture;
  const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(2, 4, 5); scene.add(key);
  const lime = new THREE.PointLight(LIME, 30, 12, 1.6); lime.position.set(-3, -1.5, 2.5); scene.add(lime);
  const cool = new THREE.PointLight(0x8fb0ff, 22, 12, 1.6); cool.position.set(3.5, 2, 2); scene.add(cool);
  scene.add(new THREE.AmbientLight(0xffffff, 0.15));
}
