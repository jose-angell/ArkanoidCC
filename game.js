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

const LAUNCH_ANGLE = Math.PI / 6; // 30° respecto a la vertical, hacia la derecha

function stickBallToPaddle() {
  const { paddle: p, ball: b } = state;
  b.x = p.x + (p.w - b.size) / 2;
  b.y = p.y - b.size;
}

function launchBall() {
  const b = state.ball;
  b.vx = b.speed * Math.sin(LAUNCH_ANGLE);
  b.vy = -b.speed * Math.cos(LAUNCH_ANGLE);
  state.phase = 'playing';
}

function onLaunchInput() {
  if (state.phase === 'serving') launchBall();
}

window.addEventListener('keydown', (e) => {
  if (e.code !== 'Space') return;
  e.preventDefault();
  if (!e.repeat) onLaunchInput();
});

canvas.addEventListener('click', onLaunchInput);

function init() {
  state.paddle.x = (CANVAS.w - state.paddle.w) / 2;
  // Provisional: el overlay de inicio ('ready') llega en el Paso 8.
  state.phase = 'serving';
  stickBallToPaddle();
}

function updateBall(dt) {
  const b = state.ball;
  b.x += b.vx * dt;
  b.y += b.vy * dt;

  if (b.x < 0) {
    b.x = 0;
    b.vx = Math.abs(b.vx);
  } else if (b.x + b.size > CANVAS.w) {
    b.x = CANVAS.w - b.size;
    b.vx = -Math.abs(b.vx);
  }
  if (b.y < 0) {
    b.y = 0;
    b.vy = Math.abs(b.vy);
  }

  // Pala: solo rebota si la bola baja, para no quedar atrapada dentro de ella.
  const p = state.paddle;
  if (
    b.vy > 0 &&
    b.x + b.size > p.x && b.x < p.x + p.w &&
    b.y + b.size > p.y && b.y < p.y + p.h
  ) {
    b.y = p.y - b.size;
    b.vy = -b.vy;
  }

  if (b.y > CANVAS.h) loseBall();
}

function loseBall() {
  state.lives -= 1;
  state.ball.vx = 0;
  state.ball.vy = 0;
  // Provisional: el overlay de Game Over llega en el Paso 8.
  state.phase = state.lives > 0 ? 'serving' : 'gameover';
}

function update(dt) {
  const p = state.paddle;
  if (paddleInput === 'keyboard') {
    p.x += (Number(keys.right) - Number(keys.left)) * p.speed * dt;
    clampPaddle();
  }

  if (state.phase === 'serving') stickBallToPaddle();
  else if (state.phase === 'playing') updateBall(dt);
}

function draw() {
  ctx.clearRect(0, 0, CANVAS.w, CANVAS.h);
  const p = state.paddle;
  drawSprite(ctx, 'paddle', p.x, p.y, p.w, p.h);
  const b = state.ball;
  drawSprite(ctx, 'ball', b.x, b.y, b.size, b.size);
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
