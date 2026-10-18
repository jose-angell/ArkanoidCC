# SPEC 01 — MVP jugable de Arkanoid

> **Status:** Implementado
> **Depends on:** —
> **Date:** 2026-10-16
> **Objective:** Un juego de Arkanoid de un solo nivel, jugable en un canvas de 800x600 con teclado y ratón, 3 vidas y 10 puntos por bloque.

## Scope

**In:**

- Canvas de 800x600 px con HTML + JS vanilla, sin build ni dependencias.
- Pala controlada simultáneamente con teclado (flechas y A/D) y ratón.
- Una bola con rebote simple (invierte la componente del eje que choca) contra paredes, pala y bloques.
- Un único nivel: cuadrícula de 10 columnas x 6 filas, una fila por color, todos los bloques se rompen de un golpe.
- 3 vidas y puntuación fija de 10 puntos por bloque, ambas visibles en pantalla.
- Un único overlay sobre el canvas para inicio, game over y victoria, con reinicio.
- Sprites de `assets/spritesheet.js` para pala, bola y bloques. Al romperse, el bloque desaparece al instante.

**Out of scope (for future specs):**

- Varios niveles, bloques resistentes (`gray`) o con distintas puntuaciones.
- Power-ups, láseres, bolas múltiples.
- Persistencia (récord en localStorage) y tabla de puntuaciones.
- Animación de explosión al romper bloques (`EXPLOSION_FRAMES`).
- Efectos de sonido (`ball-bounce.mp3`, `break-sound.mp3`).
- Pausa, menú, música de fondo, pantalla completa o versión móvil/táctil.
- Rebote de la bola según el punto de impacto en la pala.

## Data model

Estado único del juego en `game.js`. Origen en la esquina superior izquierda, velocidades en píxeles por segundo, tiempo en milisegundos.

```js
const CANVAS = { w: 800, h: 600 };

const state = {
  phase: 'ready',      // 'ready' (overlay inicio) | 'serving' (bola pegada a la pala) | 'playing' | 'gameover' | 'won'
  lives: 3,
  score: 0,
  paddle: { x: 0, y: 560, w: 120, h: 14, speed: 600 },
  ball:   { x: 0, y: 0, size: 16, vx: 0, vy: 0, speed: 360 },
  blocks: [/* { x, y, w: 64, h: 24, color, alive: true } */],
};

const BLOCK_COLORS = ['red', 'yellow', 'cyan', 'magenta', 'hotpink', 'green']; // fila 0..5
const LAYOUT = { cols: 10, rows: 6, blockW: 64, blockH: 24, offsetX: 80, offsetY: 60 };
const POINTS_PER_BLOCK = 10;
```

Se reutilizan sin cambios `SPRITES`, `loadSpritesheet` y `drawSprite` de `assets/spritesheet.js`. La pala (sprite de 162x14) se dibuja escalada a 120x14.

## Implementation plan

1. Crear `index.html` (canvas 800x600, carga `assets/spritesheet.js` y `game.js`) y `style.css` (canvas centrado, fondo oscuro). Prueba manual: servir la raíz con un servidor estático y ver el canvas vacío sin errores en consola.
2. Crear `game.js` con el bucle `requestAnimationFrame` (delta time) y `loadSpritesheet`; dibujar la pala en su posición inicial.
3. Control de la pala: flechas/A-D con límites del canvas y seguimiento del ratón (el último input usado manda). Prueba: la pala se mueve con ambos y no sale del canvas.
4. Bola: fase `serving` con la bola pegada a la pala; Espacio o clic la lanza hacia arriba con ángulo inicial fijo. Rebote contra paredes y techo.
5. Colisión con la pala (invierte `vy`) y pérdida de bola al cruzar el borde inferior: `lives -= 1` y vuelta a `serving`.
6. Generar los 60 bloques con `LAYOUT` y `BLOCK_COLORS`, dibujarlos con `drawSprite('block_<color>')`.
7. Colisión bola-bloque: invertir el eje de menor penetración, marcar `alive = false` (el bloque desaparece al instante) y sumar `POINTS_PER_BLOCK`.
8. HUD (vidas y puntuación) y overlay único: texto de inicio en `ready`, "Game Over" con `lives === 0`, "¡Victoria!" sin bloques vivos; Espacio o clic reinician el estado completo.

## Acceptance criteria

- [x] `index.html` se abre desde un servidor estático en la raíz del repo y la consola no muestra errores.
- [x] El canvas mide exactamente 800x600 px.
- [x] Al cargar, un overlay indica cómo empezar; Espacio o clic inician la partida.
- [x] La pala se mueve con las flechas, con A/D y con el ratón, y nunca sale del canvas.
- [x] Al iniciar hay 60 bloques en 10 columnas x 6 filas, con un color distinto por fila.
- [x] La bola rebota contra paredes, techo, pala y bloques.
- [x] Romper un bloque suma exactamente 10 puntos y lo hace desaparecer al instante, sin animación.
- [x] El HUD muestra 3 vidas al empezar; perder la bola resta una y deja la bola pegada a la pala esperando lanzamiento.
- [x] Al perder la tercera vida aparece el overlay de Game Over con la puntuación final.
- [x] Al romper los 60 bloques aparece el overlay de victoria.
- [x] Desde Game Over o victoria, Espacio o clic reinician con 3 vidas, 0 puntos y 60 bloques.

## Decisions

- **Yes:** HTML + JS vanilla con `index.html`, `style.css` y `game.js` en la raíz. Encaja con `spritesheet.js`, que es un script clásico con globales, y no requiere build.
- **No:** módulos ES y Vite. Añaden complejidad innecesaria para un MVP.
- **Yes:** canvas fijo de 800x600 y un único layout de 10x6. Decisión cerrada por el usuario.
- **Yes:** rebote simple, sin ángulo según el punto de impacto. Decisión del usuario; se reconsidera en otra spec si el juego resulta muy predecible.
- **Yes:** un único overlay para inicio, game over y victoria, sin pantallas separadas. Decisión del usuario.
- **Yes:** teclado y ratón activos a la vez. Decisión del usuario.
- **Yes:** 10 puntos fijos por bloque, sin multiplicadores.
- **Yes:** pala dibujada a 120x14 (el sprite es 162x14) y bloques a 64x24 (sprite 32x16). Valores propuestos por la spec para que los 10 bloques ocupen 640 px y la pala sea manejable; ajustables en implementación.
- **Yes:** velocidades en píxeles por segundo con delta time, para que el juego no dependa de la tasa de refresco.
- **No:** animación de explosión ni sonidos en el MVP. Decisión del usuario: basta con que el bloque desaparezca; se añaden en una spec posterior.
- **No:** persistencia del récord, niveles y power-ups. Van en specs propias.

## Risks

| Risk                                                                 | Mitigation                                                                                          |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Abrir `index.html` con `file://` puede fallar al cargar el spritesheet | Servir la raíz del repo con un servidor estático (p. ej. `python -m http.server`).                   |
| La bola atraviesa bloques o la pala a alta velocidad (tunneling)     | Velocidad constante de 360 px/s y delta time acotado; la bola mide 16 px.                            |

## What is **not** in this spec

- Varios niveles, bloques resistentes o power-ups.
- Animación de explosión y sonidos.
- Persistencia de récords.
- Pausa, menú, música o versión móvil.
- Rebote según el punto de impacto en la pala.

Cada uno de ellos, si se hace, va en su propia spec.
