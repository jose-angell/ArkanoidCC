// Arkanoid MVP — spec 01. Se completa paso a paso.

const CANVAS = { w: 800, h: 600 };

const state = {
  phase: 'ready',
  lives: 3,
  score: 0,
  paddle: { x: 0, y: 560, w: 120, h: 14, speed: 600 },
  ball: { x: 0, y: 0, size: 16, vx: 0, vy: 0, speed: 360 },
  blocks: [],
  explosions: [], // { x, y, w, h, color, elapsed } en ms
};

const BLOCK_COLORS = ['red', 'yellow', 'cyan', 'magenta', 'hotpink', 'green']; // fila 0..5
const LAYOUT = { cols: 10, rows: 6, blockW: 64, blockH: 24, offsetX: 80, offsetY: 60 };

const POINTS_PER_BLOCK = 10;

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

// Espacio o clic: empieza, lanza o reinicia según la fase.
function onActionInput() {
  if (state.phase === 'ready') state.phase = 'serving';
  else if (state.phase === 'serving') launchBall();
  else if (state.phase === 'gameover' || state.phase === 'won') resetGame();
}

window.addEventListener('keydown', (e) => {
  if (e.code !== 'Space') return;
  e.preventDefault();
  if (!e.repeat) onActionInput();
});

canvas.addEventListener('click', onActionInput);

function createBlocks() {
  const blocks = [];
  for (let row = 0; row < LAYOUT.rows; row++) {
    for (let col = 0; col < LAYOUT.cols; col++) {
      blocks.push({
        x: LAYOUT.offsetX + col * LAYOUT.blockW,
        y: LAYOUT.offsetY + row * LAYOUT.blockH,
        w: LAYOUT.blockW,
        h: LAYOUT.blockH,
        color: BLOCK_COLORS[row],
        alive: true,
      });
    }
  }
  return blocks;
}

// Reinicia el estado completo y deja la bola pegada a la pala.
function resetGame() {
  state.lives = 3;
  state.score = 0;
  state.blocks = createBlocks();
  state.explosions = [];
  state.paddle.x = (CANVAS.w - state.paddle.w) / 2;
  state.ball.vx = 0;
  state.ball.vy = 0;
  state.phase = 'serving';
  stickBallToPaddle();
}

function init() {
  resetGame();
  state.phase = 'ready';
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

  collideBlocks();
  if (state.blocks.every((k) => !k.alive)) {
    state.phase = 'won';
    return;
  }

  if (b.y > CANVAS.h) loseBall();
}

// Rompe como máximo un bloque por frame e invierte el eje de menor penetración.
function collideBlocks() {
  const b = state.ball;
  for (const k of state.blocks) {
    if (!k.alive) continue;
    if (
      b.x + b.size <= k.x || b.x >= k.x + k.w ||
      b.y + b.size <= k.y || b.y >= k.y + k.h
    ) continue;

    const overlapX = Math.min(b.x + b.size - k.x, k.x + k.w - b.x);
    const overlapY = Math.min(b.y + b.size - k.y, k.y + k.h - b.y);
    const ballCx = b.x + b.size / 2;
    const ballCy = b.y + b.size / 2;

    if (overlapX < overlapY) {
      const fromLeft = ballCx < k.x + k.w / 2;
      b.x = fromLeft ? k.x - b.size : k.x + k.w;
      b.vx = fromLeft ? -Math.abs(b.vx) : Math.abs(b.vx);
    } else {
      const fromTop = ballCy < k.y + k.h / 2;
      b.y = fromTop ? k.y - b.size : k.y + k.h;
      b.vy = fromTop ? -Math.abs(b.vy) : Math.abs(b.vy);
    }

    k.alive = false;
    state.explosions.push({ x: k.x, y: k.y, w: k.w, h: k.h, color: k.color, elapsed: 0 });
    state.score += POINTS_PER_BLOCK;
    return;
  }
}

function loseBall() {
  state.lives -= 1;
  state.ball.vx = 0;
  state.ball.vy = 0;
  state.phase = state.lives > 0 ? 'serving' : 'gameover';
}

function update(dt) {
  const p = state.paddle;
  if (paddleInput === 'keyboard') {
    p.x += (Number(keys.right) - Number(keys.left)) * p.speed * dt;
    clampPaddle();
  }

  // Las explosiones avanzan en cualquier fase y se descartan al terminar.
  for (const e of state.explosions) e.elapsed += dt * 1000;
  state.explosions = state.explosions.filter((e) => e.elapsed < EXPLOSION_DURATION);

  if (state.phase === 'serving') stickBallToPaddle();
  else if (state.phase === 'playing') updateBall(dt);
}

function draw() {
  ctx.clearRect(0, 0, CANVAS.w, CANVAS.h);
  for (const k of state.blocks) {
    if (k.alive) drawSprite(ctx, `block_${k.color}`, k.x, k.y, k.w, k.h);
  }
  const p = state.paddle;
  drawSprite(ctx, 'paddle', p.x, p.y, p.w, p.h);
  const b = state.ball;
  drawSprite(ctx, 'ball', b.x, b.y, b.size, b.size);
  drawHud();
  drawOverlay();
}

function drawHud() {
  ctx.fillStyle = '#fff';
  ctx.font = '18px sans-serif';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText(`Puntos: ${state.score}`, 20, 30);
  ctx.textAlign = 'right';
  // Vidas: un sprite de bola por vida restante, alineados a la derecha.
  const size = 16;
  const gap = 6;
  for (let i = 0; i < state.lives; i++) {
    const x = CANVAS.w - 20 - size - i * (size + gap);
    drawSprite(ctx, 'ball', x, 30 - size / 2, size, size);
  }
}

// Único overlay para inicio, game over y victoria.
function drawOverlay() {
  const texts = {
    ready: ['ARKANOID', 'Espacio o clic para empezar'],
    gameover: ['Game Over', `Puntuación final: ${state.score}`, 'Espacio o clic para reiniciar'],
    won: ['¡Victoria!', `Puntuación final: ${state.score}`, 'Espacio o clic para reiniciar'],
  }[state.phase];
  if (!texts) return;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, CANVAS.w, CANVAS.h);
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  texts.forEach((line, i) => {
    ctx.font = i === 0 ? 'bold 48px sans-serif' : '22px sans-serif';
    ctx.fillText(line, CANVAS.w / 2, CANVAS.h / 2 - 40 + i * 44);
  });
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
