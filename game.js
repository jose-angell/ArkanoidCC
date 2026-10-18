// Arkanoid MVP — spec 01. Se completa paso a paso.

const CANVAS = { w: 800, h: 600 };

const state = {
  phase: 'ready',
  lives: 3,
  score: 0,
  paddle: { x: 0, y: 560, w: 120, h: 14, speed: 600 },
  ball: { x: 0, y: 0, size: 16, vx: 0, vy: 0, speed: 360 },
  blocks: [],
};

const MAX_DT = 0.05; // segundos; acota el delta time para evitar saltos grandes

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

let lastTime = 0;

// Entrada: el último dispositivo usado (teclado o ratón) manda sobre la pala.
const keys = { left: false, right: false };
let paddleInput = 'keyboard';

const KEY_MAP = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
};

function clampPaddle() {
  const p = state.paddle;
  p.x = Math.max(0, Math.min(CANVAS.w - p.w, p.x));
}

window.addEventListener('keydown', (e) => {
  const dir = KEY_MAP[e.code];
  if (!dir) return;
  e.preventDefault();
  keys[dir] = true;
  paddleInput = 'keyboard';
});

window.addEventListener('keyup', (e) => {
  const dir = KEY_MAP[e.code];
  if (dir) keys[dir] = false;
});

canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  const mouseX = (e.clientX - rect.left) * (CANVAS.w / rect.width);
  state.paddle.x = mouseX - state.paddle.w / 2;
  clampPaddle();
  paddleInput = 'mouse';
});

function init() {
  state.paddle.x = (CANVAS.w - state.paddle.w) / 2;
}

function update(dt) {
  const p = state.paddle;
  if (paddleInput === 'keyboard') {
    p.x += (Number(keys.right) - Number(keys.left)) * p.speed * dt;
    clampPaddle();
  }
}

function draw() {
  ctx.clearRect(0, 0, CANVAS.w, CANVAS.h);
  const p = state.paddle;
  drawSprite(ctx, 'paddle', p.x, p.y, p.w, p.h);
}

function frame(now) {
  const dt = Math.min((now - lastTime) / 1000, MAX_DT);
  lastTime = now;
  update(dt);
  draw();
  requestAnimationFrame(frame);
}

init();
loadSpritesheet(() => {
  lastTime = performance.now();
  requestAnimationFrame(frame);
});
