// Arkanoid MVP — spec 01. Se completa paso a paso.

const CANVAS = { w: 800, h: 600 };

const BALL = { size: 16, speed: 360 };
const PADDLE_W = 120;

// Bola parada en el origen; stickBallToPaddle() la coloca.
function newBall() {
  return { x: 0, y: 0, vx: 0, vy: 0 };
}

const state = {
  phase: 'ready',
  lives: 3,
  score: 0,
  paddle: { x: 0, y: 560, w: PADDLE_W, h: 14, speed: 600 },
  balls: [newBall()], // en 'serving' siempre hay una
  powerups: [], // { x, y, type } cápsulas en caída
  effects: { long: 0, slow: 0 }, // ms restantes de cada efecto (0 = inactivo)
  blocks: [],
  explosions: [], // { x, y, w, h, color, elapsed } en ms
  paused: false, // congela update() y las entradas; independiente de phase
  muted: false, // no se reinicia en resetGame()
  level: 0, // índice en LEVELS; el HUD muestra level + 1
};

const BLOCK_CODES = {
  R: 'red', Y: 'yellow', C: 'cyan', M: 'magenta', H: 'hotpink', G: 'green', X: 'gray',
}; // '.' = hueco
const BLOCK_HITS = { gray: 2 }; // resto de colores: 1
const FLASH_DURATION = 100; // ms de parpadeo tras un golpe que no rompe

// 10 columnas x 6 filas; una letra de BLOCK_CODES por bloque.
const LEVELS = [
  [ // Nivel 1: el layout de SPEC 01
    'RRRRRRRRRR',
    'YYYYYYYYYY',
    'CCCCCCCCCC',
    'MMMMMMMMMM',
    'HHHHHHHHHH',
    'GGGGGGGGGG',
  ],
  [ // Nivel 2: techo gray y pasillo central
    'XXXXXXXXXX',
    'RRRRRRRRRR',
    'YYYY..YYYY',
    'CCCC..CCCC',
    'MMMMMMMMMM',
    'HHHHHHHHHH',
  ],
  [ // Nivel 3: gray intercalados y filas alternas
    'XX..XX..XX',
    'RRXXRRXXRR',
    'YYYYYYYYYY',
    'C.C.C.C.C.',
    '.M.M.M.M.M',
    'GGGGGGGGGG',
  ],
];

const LAYOUT = { cols: 10, rows: 6, blockW: 64, blockH: 24, offsetX: 80, offsetY: 60 };

const POINTS_PER_BLOCK = 10;

const POWERUP_TYPES = {
  long: { letter: 'L', label: 'Pala larga', weight: 30, color: '#3b82f6' },
  multi: { letter: 'M', label: 'Multibola', weight: 30, color: '#f97316' },
  slow: { letter: 'S', label: 'Bola lenta', weight: 30, color: '#22c55e' },
  life: { letter: 'V', label: 'Vida extra', weight: 10, color: '#ef4444' },
};
const POWERUP = { chance: 0.25, fallSpeed: 150, w: 40, h: 16, duration: 10000, longPaddleW: 200, slowFactor: 0.5 };
const MAX_LIVES = 5;

const MAX_DT = 0.05; // segundos; acota el delta time para evitar saltos grandes

const SOUNDS = {
  bounce: new Audio('assets/sounds/ball-bounce.mp3'),
  break: new Audio('assets/sounds/break-sound.mp3'),
};

// Clona el audio para que varias reproducciones se solapen; ignora el rechazo del navegador.
function playSound(name) {
  if (state.muted) return;
  SOUNDS[name].cloneNode().play().catch(() => {});
}

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
  if (state.paused) return;
  const rect = canvas.getBoundingClientRect();
  const mouseX = (e.clientX - rect.left) * (CANVAS.w / rect.width);
  state.paddle.x = mouseX - state.paddle.w / 2;
  clampPaddle();
  paddleInput = 'mouse';
});

const LAUNCH_ANGLE = Math.PI / 6; // 30° respecto a la vertical, hacia la derecha

function stickBallToPaddle() {
  const p = state.paddle;
  const b = state.balls[0];
  b.x = p.x + (p.w - BALL.size) / 2;
  b.y = p.y - BALL.size;
}

// Velocidad de saque: BALL.speed, reducida mientras la bola lenta está activa.
function ballSpeed() {
  return state.effects.slow > 0 ? BALL.speed * POWERUP.slowFactor : BALL.speed;
}

function launchBall() {
  const b = state.balls[0];
  b.vx = ballSpeed() * Math.sin(LAUNCH_ANGLE);
  b.vy = -ballSpeed() * Math.cos(LAUNCH_ANGLE);
  state.phase = 'playing';
}

// Pasa al siguiente nivel conservando puntos y vidas.
function loadNextLevel() {
  state.level += 1;
  state.blocks = createBlocks(state.level);
  resetPowerUps();
  state.explosions = [];
  state.paddle.x = (CANVAS.w - state.paddle.w) / 2;
  state.balls = [newBall()];
  state.phase = 'serving';
  stickBallToPaddle();
}

// Espacio o clic: empieza, lanza, continúa o reinicia según la fase.
function onActionInput() {
  if (state.paused) return;
  if (state.phase === 'ready') state.phase = 'serving';
  else if (state.phase === 'serving') launchBall();
  else if (state.phase === 'levelclear') loadNextLevel();
  else if (state.phase === 'gameover' || state.phase === 'won') resetGame();
}

window.addEventListener('keydown', (e) => {
  if (e.code !== 'Space') return;
  e.preventDefault();
  if (!e.repeat) onActionInput();
});

canvas.addEventListener('click', onActionInput);

window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyM' && !e.repeat) state.muted = !state.muted;
});

// Solo se pausa mientras hay partida (bola pegada o en juego).
window.addEventListener('keydown', (e) => {
  if (e.code !== 'KeyP' || e.repeat) return;
  if (state.phase === 'serving' || state.phase === 'playing') state.paused = !state.paused;
});

function createBlocks(levelIndex) {
  const blocks = [];
  LEVELS[levelIndex].forEach((rowCodes, row) => {
    [...rowCodes].forEach((code, col) => {
      if (code === '.') return;
      const color = BLOCK_CODES[code];
      blocks.push({
        x: LAYOUT.offsetX + col * LAYOUT.blockW,
        y: LAYOUT.offsetY + row * LAYOUT.blockH,
        w: LAYOUT.blockW,
        h: LAYOUT.blockH,
        color,
        alive: true,
        hits: BLOCK_HITS[color] ?? 1,
        flash: 0,
      });
    });
  });
  return blocks;
}

// Reinicia el estado completo y deja la bola pegada a la pala.
function resetGame() {
  state.lives = 3;
  state.score = 0;
  state.paused = false;
  state.level = 0;
  state.blocks = createBlocks(state.level);
  resetPowerUps();
  state.explosions = [];
  state.paddle.x = (CANVAS.w - state.paddle.w) / 2;
  state.balls = [newBall()];
  state.phase = 'serving';
  stickBallToPaddle();
}

function init() {
  resetGame();
  state.phase = 'ready';
}

function updateBall(b, dt) {
  b.x += b.vx * dt;
  b.y += b.vy * dt;

  if (b.x < 0) {
    b.x = 0;
    b.vx = Math.abs(b.vx);
    playSound('bounce');
  } else if (b.x + BALL.size > CANVAS.w) {
    b.x = CANVAS.w - BALL.size;
    b.vx = -Math.abs(b.vx);
    playSound('bounce');
  }
  if (b.y < 0) {
    b.y = 0;
    b.vy = Math.abs(b.vy);
    playSound('bounce');
  }

  // Pala: solo rebota si la bola baja, para no quedar atrapada dentro de ella.
  const p = state.paddle;
  if (
    b.vy > 0 &&
    b.x + BALL.size > p.x && b.x < p.x + p.w &&
    b.y + BALL.size > p.y && b.y < p.y + p.h
  ) {
    b.y = p.y - BALL.size;
    b.vy = -b.vy;
    playSound('bounce');
  }

  collideBlocks(b);
}

// Mueve todas las bolas; el nivel limpiado se comprueba una vez tras moverlas todas.
function updateBalls(dt) {
  for (const b of state.balls) updateBall(b, dt);

  if (state.blocks.every((k) => !k.alive)) {
    // Se espera a que acaben las explosiones antes de mostrar la victoria.
    state.phase = 'clearing';
    resetPowerUps();
    for (const b of state.balls) {
      b.vx = 0;
      b.vy = 0;
    }
    return;
  }

  // Solo se pierde vida cuando ninguna bola queda en pantalla.
  const inPlay = state.balls.filter((b) => b.y <= CANVAS.h);
  if (inPlay.length === 0) loseBall(state.balls[0]);
  else state.balls = inPlay;
}

// Rompe como máximo un bloque por frame e invierte el eje de menor penetración.
function collideBlocks(b) {
  for (const k of state.blocks) {
    if (!k.alive) continue;
    if (
      b.x + BALL.size <= k.x || b.x >= k.x + k.w ||
      b.y + BALL.size <= k.y || b.y >= k.y + k.h
    ) continue;

    const overlapX = Math.min(b.x + BALL.size - k.x, k.x + k.w - b.x);
    const overlapY = Math.min(b.y + BALL.size - k.y, k.y + k.h - b.y);
    const ballCx = b.x + BALL.size / 2;
    const ballCy = b.y + BALL.size / 2;

    if (overlapX < overlapY) {
      const fromLeft = ballCx < k.x + k.w / 2;
      b.x = fromLeft ? k.x - BALL.size : k.x + k.w;
      b.vx = fromLeft ? -Math.abs(b.vx) : Math.abs(b.vx);
    } else {
      const fromTop = ballCy < k.y + k.h / 2;
      b.y = fromTop ? k.y - BALL.size : k.y + k.h;
      b.vy = fromTop ? -Math.abs(b.vy) : Math.abs(b.vy);
    }

    // Cada golpe suma puntos; el bloque solo se rompe al agotar sus golpes.
    k.hits -= 1;
    state.score += POINTS_PER_BLOCK;
    if (k.hits > 0) {
      k.flash = FLASH_DURATION;
      playSound('bounce');
      return;
    }

    k.alive = false;
    state.explosions.push({ x: k.x, y: k.y, w: k.w, h: k.h, color: k.color, elapsed: 0 });
    playSound('break');
    if (Math.random() < POWERUP.chance) spawnPowerUp(k);
    return;
  }
}

// Recibe la última bola perdida: queda parada fuera de pantalla hasta el siguiente saque.
function loseBall(lost) {
  state.lives -= 1;
  lost.vx = 0;
  lost.vy = 0;
  state.balls = [lost];
  resetPowerUps();
  state.phase = state.lives > 0 ? 'serving' : 'gameover';
}

// Cambia el ancho de la pala manteniendo su centro.
function setPaddleWidth(w) {
  const p = state.paddle;
  const center = p.x + p.w / 2;
  p.w = w;
  p.x = center - w / 2;
  clampPaddle();
}

// Borra cápsulas y efectos activos y devuelve la pala a su ancho normal.
function resetPowerUps() {
  state.powerups = [];
  state.effects.long = 0;
  state.effects.slow = 0;
  setPaddleWidth(PADDLE_W);
}

// Descuenta los efectos; al llegar a 0 se desactivan.
function updateEffects(dt) {
  const fx = state.effects;
  if (fx.long > 0) {
    fx.long = Math.max(0, fx.long - dt * 1000);
    if (fx.long === 0) setPaddleWidth(PADDLE_W);
  }
  if (fx.slow > 0) {
    fx.slow = Math.max(0, fx.slow - dt * 1000);
    if (fx.slow === 0) scaleBallSpeeds(1 / POWERUP.slowFactor);
  }
}

function scaleBallSpeeds(factor) {
  for (const b of state.balls) {
    b.vx *= factor;
    b.vy *= factor;
  }
}

// Elige un tipo al azar ponderado por POWERUP_TYPES[type].weight.
function pickPowerUpType() {
  const types = Object.keys(POWERUP_TYPES);
  const total = types.reduce((sum, t) => sum + POWERUP_TYPES[t].weight, 0);
  let r = Math.random() * total;
  for (const t of types) {
    r -= POWERUP_TYPES[t].weight;
    if (r < 0) return t;
  }
  return types[types.length - 1];
}

// La cápsula nace centrada en el bloque roto.
function spawnPowerUp(block) {
  state.powerups.push({
    x: block.x + (block.w - POWERUP.w) / 2,
    y: block.y + (block.h - POWERUP.h) / 2,
    type: pickPowerUpType(),
  });
}

function applyPowerUp(type) {
  if (type === 'life') state.lives = Math.min(MAX_LIVES, state.lives + 1);
  else if (type === 'long') {
    state.effects.long = POWERUP.duration;
    setPaddleWidth(POWERUP.longPaddleW);
  } else if (type === 'slow') {
    // Solo se escala al activarse desde inactivo; recoger otra reinicia el contador.
    if (state.effects.slow === 0) scaleBallSpeeds(POWERUP.slowFactor);
    state.effects.slow = POWERUP.duration;
  }
}

// Las cápsulas caen; la pala las recoge y por abajo se pierden.
function updatePowerUps(dt) {
  const p = state.paddle;
  state.powerups = state.powerups.filter((c) => {
    c.y += POWERUP.fallSpeed * dt;
    if (
      c.x + POWERUP.w > p.x && c.x < p.x + p.w &&
      c.y + POWERUP.h > p.y && c.y < p.y + p.h
    ) {
      applyPowerUp(c.type);
      playSound('bounce');
      return false;
    }
    return c.y <= CANVAS.h;
  });
}

function update(dt) {
  if (state.paused) return;
  const p = state.paddle;
  if (paddleInput === 'keyboard') {
    p.x += (Number(keys.right) - Number(keys.left)) * p.speed * dt;
    clampPaddle();
  }

  // Las explosiones avanzan en cualquier fase y se descartan al terminar.
  for (const e of state.explosions) e.elapsed += dt * 1000;
  state.explosions = state.explosions.filter((e) => e.elapsed < EXPLOSION_DURATION);

  for (const k of state.blocks) {
    if (k.flash > 0) k.flash = Math.max(0, k.flash - dt * 1000);
  }

  if (state.phase === 'clearing' && state.explosions.length === 0) {
    state.phase = state.level < LEVELS.length - 1 ? 'levelclear' : 'won';
  }

  if (state.phase === 'serving') stickBallToPaddle();
  else if (state.phase === 'playing') {
    updateEffects(dt);
    updatePowerUps(dt);
    updateBalls(dt);
  }
}

function draw() {
  ctx.clearRect(0, 0, CANVAS.w, CANVAS.h);
  for (const k of state.blocks) {
    if (!k.alive) continue;
    drawSprite(ctx, `block_${k.color}`, k.x, k.y, k.w, k.h);
    if (k.flash > 0) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.fillRect(k.x, k.y, k.w, k.h);
    }
  }
  // 4 frames repartidos a partes iguales en EXPLOSION_DURATION.
  for (const e of state.explosions) {
    const i = Math.min(3, Math.floor(e.elapsed / (EXPLOSION_DURATION / 4)));
    drawFrame(ctx, EXPLOSION_FRAMES[e.color][i], e.x, e.y, e.w, e.h);
  }
  drawPowerUps();
  const p = state.paddle;
  drawSprite(ctx, 'paddle', p.x, p.y, p.w, p.h);
  for (const b of state.balls) drawSprite(ctx, 'ball', b.x, b.y, BALL.size, BALL.size);
  drawHud();
  drawOverlay();
}

// Rectángulo redondeado de color con la letra del tipo.
function drawPowerUps() {
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const c of state.powerups) {
    const t = POWERUP_TYPES[c.type];
    ctx.fillStyle = t.color;
    ctx.beginPath();
    ctx.roundRect(c.x, c.y, POWERUP.w, POWERUP.h, 6);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillText(t.letter, c.x + POWERUP.w / 2, c.y + POWERUP.h / 2 + 1);
  }
}

function drawHud() {
  ctx.fillStyle = '#fff';
  ctx.font = '18px sans-serif';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText(`Puntos: ${state.score}`, 20, 30);
  ctx.textAlign = 'center';
  ctx.fillText(`Nivel ${state.level + 1}/${LEVELS.length}`, CANVAS.w / 2, 30);
  ctx.textAlign = 'right';
  // Vidas: un sprite de bola por vida restante, alineados a la derecha.
  const size = 16;
  const gap = 6;
  for (let i = 0; i < state.lives; i++) {
    const x = CANVAS.w - 20 - size - i * (size + gap);
    drawSprite(ctx, 'ball', x, 30 - size / 2, size, size);
  }
  if (state.muted) {
    ctx.textAlign = 'left';
    ctx.fillText('Silencio (M)', 20, CANVAS.h - 15);
  }
  // Efectos activos con sus segundos restantes, abajo a la derecha.
  ctx.textAlign = 'right';
  let line = 0;
  for (const [key, ms] of Object.entries(state.effects)) {
    if (ms <= 0) continue;
    ctx.fillStyle = POWERUP_TYPES[key].color;
    ctx.fillText(`${POWERUP_TYPES[key].label} ${Math.ceil(ms / 1000)}s`, CANVAS.w - 20, CANVAS.h - 15 - line * 24);
    line += 1;
  }
}

// Único overlay para inicio, pausa, game over y victoria.
function drawOverlay() {
  const texts = {
    paused: ['Pausa', 'P para continuar'],
    ready: ['ARKANOID', 'Espacio o clic para empezar'],
    gameover: ['Game Over', `Puntuación final: ${state.score}`, 'Espacio o clic para reiniciar'],
    levelclear: [
      `¡Nivel ${state.level + 1} completado!`,
      `Siguiente: Nivel ${state.level + 2}`,
      'Espacio o clic para continuar',
    ],
    won: ['¡Victoria!', `Puntuación final: ${state.score}`, 'Espacio o clic para reiniciar'],
  }[state.paused ? 'paused' : state.phase];
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
