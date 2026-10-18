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

function init() {
  state.paddle.x = (CANVAS.w - state.paddle.w) / 2;
}

function update(dt) {
  // Se rellena en los pasos siguientes.
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
