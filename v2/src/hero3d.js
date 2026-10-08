/* The hero object: the ^S avatar floating over CTRL+S. It follows the
   pointer like a magnet, turns as the page scrolls, and every few
   seconds presses Ctrl+S: the S dips, a lime wave rolls out and the
   page shows "Сохранено". Built into ../js/hero3d.js with esbuild. */
import * as THREE from 'three';
import { avatar, lights, glowSprite, LIME } from './objects.js';

(function () {
  const host = document.querySelector('[data-hero3d]');
  if (!host) return;
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' }); } catch (e) { return; }
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0, 0, 10);
  lights(scene, renderer);

  const obj = avatar();
  scene.add(obj);
  const halo = glowSprite(LIME, 7, 0.12); halo.position.z = -1; scene.add(halo);
  // the save wave: a ring that rolls outward from the S
  const wave = new THREE.Mesh(new THREE.RingGeometry(0.98, 1, 96), new THREE.MeshBasicMaterial({ color: new THREE.Color(LIME).multiplyScalar(1.4), transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
  scene.add(wave);

  function size() {
    const w = host.clientWidth, h = host.clientHeight;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  size(); addEventListener('resize', size);

  // magnet: pointer within reach of the object pulls it toward the cursor
  let tx = 0, ty = 0, cx = 0, cy = 0;
  addEventListener('pointermove', e => {
    if (e.pointerType === 'touch') return;
    const r = host.getBoundingClientRect(), pad = 150;
    const inside = e.clientX > r.left - pad && e.clientX < r.right + pad && e.clientY > r.top - pad && e.clientY < r.bottom + pad;
    if (inside) { tx = ((e.clientX - (r.left + r.width / 2)) / (r.width / 2)); ty = ((e.clientY - (r.top + r.height / 2)) / (r.height / 2)); }
    else { tx = 0; ty = 0; }
  }, { passive: true });
  document.addEventListener('pointerleave', () => { tx = 0; ty = 0; });

  let saveT = -10, visible = true, t0 = performance.now(), last = -1;
  function save(now) {
    saveT = now;
    window.dispatchEvent(new Event('ctrls:save'));
  }
  host.addEventListener('click', () => save(performance.now()));
  const PERIOD = 5200;

  function frame(now) {
    if (!visible) return;
    const t = (now - t0) / 1000;
    cx += (tx - cx) * 0.06; cy += (ty - cy) * 0.06;
    const sc = Math.min(1, scrollY / innerHeight);
    obj.rotation.y = (RM ? 0 : Math.sin(t * 0.5) * 0.28) + cx * 0.45 + sc * 1.4;
    obj.rotation.x = (RM ? 0 : Math.sin(t * 0.7) * 0.06) + cy * 0.3 - 0.06;
    obj.position.x = cx * 0.35;
    obj.position.y = (RM ? 0 : Math.sin(t * 1.1) * 0.12) - cy * 0.25;
    // the automatic save, every PERIOD ms
    if (!RM && Math.floor((now - t0) / PERIOD) !== last) { last = Math.floor((now - t0) / PERIOD); if (last > 0) save(now); }
    const k = (now - saveT) / 1000;
    const press = k < 0.35 ? Math.sin(k / 0.35 * Math.PI) : 0;
    const { S, sGlow, limeMat } = obj.userData;
    S.position.z = 0.45 - press * 0.16; S.scale.setScalar(1 - press * 0.06);
    limeMat.emissiveIntensity = 0.55 + press * 1.4;
    sGlow.material.opacity = 0.32 + press * 0.5;
    if (k < 1.4) {
      const e = k / 1.4;
      wave.scale.setScalar(0.8 + e * 3.6); wave.material.opacity = (1 - e) * 0.55;
      wave.position.copy(obj.position); wave.rotation.copy(obj.rotation);
    } else wave.material.opacity = 0;
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  new IntersectionObserver(es => { const was = visible; visible = es[0].isIntersecting; if (visible && !was) requestAnimationFrame(frame); }).observe(host);
  requestAnimationFrame(frame);
  requestAnimationFrame(() => host.classList.add('live'));
})();
