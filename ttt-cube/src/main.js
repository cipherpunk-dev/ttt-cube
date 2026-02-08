import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

/* -------------------- Scene -------------------- */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0f0f1a);

/* -------------------- Camera -------------------- */
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(3, 2, 6);

/* -------------------- Renderer -------------------- */
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

/* -------------------- Controls -------------------- */
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

/* -------------------- Lights -------------------- */
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(5, 10, 5);
scene.add(dirLight);

/* -------------------- Objects -------------------- */

// Cube
const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
const cubeMaterial = new THREE.MeshStandardMaterial({
  color: 0x00ffcc,
  roughness: 0.3,
  metalness: 0.6,
});
const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
scene.add(cube);

// Torus
const torusGeometry = new THREE.TorusGeometry(1.5, 0.3, 16, 100);
const torusMaterial = new THREE.MeshStandardMaterial({
  color: 0xff0066,
  metalness: 0.8,
  roughness: 0.2,
});
const torus = new THREE.Mesh(torusGeometry, torusMaterial);
torus.position.y = 1.5;
scene.add(torus);

// Grid
const grid = new THREE.GridHelper(20, 20, 0x444444, 0x222222);
scene.add(grid);

/* -------------------- Animation -------------------- */
const clock = new THREE.Clock();

function animate() {
  const elapsedTime = clock.getElapsedTime();

  // Cube animation
  cube.rotation.x = elapsedTime * 0.8;
  cube.rotation.y = elapsedTime * 1.2;

  // Torus animation
  torus.rotation.x = elapsedTime;
  torus.rotation.y = elapsedTime * 0.5;
  torus.position.y = 1.5 + Math.sin(elapsedTime) * 0.3;

  // Color animation
  cube.material.color.setHSL((elapsedTime * 0.1) % 1, 0.8, 0.5);

  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();

/* -------------------- Resize Handling -------------------- */
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});
