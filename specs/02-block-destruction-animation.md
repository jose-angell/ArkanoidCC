# SPEC 02 — Animación de destrucción de bloques

> **Status:** Implementado
> **Depends on:** SPEC 01
> **Date:** 2026-10-18
> **Objective:** Al romperse un bloque se reproduce una animación de explosión de 4 frames (150 ms) en su posición, en lugar de desaparecer al instante.

## Scope

**In:**

- Animación de explosión con los 4 frames de `EXPLOSION_FRAMES[color]` durante `EXPLOSION_DURATION` (150 ms), dibujada con `drawFrame` en el rectángulo del bloque.
- Lista de explosiones activas en el estado, independiente de los bloques.
- Los puntos (10) y la colisión se resuelven al impacto; la animación es solo visual.
- Nueva fase `clearing`: se rompió el último bloque y se espera a que acaben las explosiones antes de pasar a `won`.
- Las explosiones se descartan al reiniciar la partida.

**Out of scope (for future specs):**

- Efectos de sonido (`break-sound.mp3`, `ball-bounce.mp3`).
- Partículas, sacudida de pantalla, fundidos u otros efectos extra.
- Bloques resistentes (`gray`) con animación o daño por fases.
- Power-ups, varios niveles, persistencia.

## Data model

Se añade `explosions` al estado de `game.js`. Tiempo en milisegundos, coordenadas con origen arriba a la izquierda.

```js
const state = {
  // ...campos de SPEC 01
  phase: 'ready', // añade 'clearing': sin bloques vivos, esperando a que terminen las explosiones
  explosions: [/* { x, y, w, h, color, elapsed: 0 } */],
};
```

- Una explosión se crea en `collideBlocks()` con la posición, tamaño y color del bloque roto.
- Frame a dibujar: `Math.min(3, Math.floor(elapsed / (EXPLOSION_DURATION / 4)))`.
- La explosión se elimina cuando `elapsed >= EXPLOSION_DURATION`.
- `EXPLOSION_FRAMES` y `EXPLOSION_DURATION` se reutilizan sin cambios de `assets/spritesheet.js`.

## Implementation plan

1. Añadir `explosions: []` al estado y vaciarlo en `resetGame()`. Prueba: el juego se comporta igual que antes, sin errores en consola.
2. En `collideBlocks()`, al marcar `alive = false`, añadir la entrada correspondiente a `state.explosions`. Prueba: inspeccionar `state.explosions` en consola tras romper un bloque.
3. En `update(dt)`, avanzar `elapsed` de cada explosión con `dt * 1000` y eliminar las terminadas. Debe ejecutarse en cualquier fase, incluidas `gameover` y `clearing`. Prueba: la lista se vacía ~150 ms después de romper un bloque.
4. En `draw()`, dibujar cada explosión con `drawFrame(ctx, EXPLOSION_FRAMES[color][frame], x, y, w, h)` entre los bloques y la pala. Prueba: al romper un bloque se ve la secuencia de 4 frames y luego desaparece.
5. Fase `clearing`: en `updateBall`, si no quedan bloques vivos, pasar a `clearing` (bola detenida, `vx = vy = 0`) en vez de `won`. En `update`, pasar de `clearing` a `won` cuando `explosions` esté vacío. `onActionInput` ignora `clearing`. Prueba: al romper el último bloque se ve su explosión completa y después aparece el overlay de victoria.

## Acceptance criteria

- [x] Al romper un bloque no desaparece al instante: se muestran 4 frames de explosión de su color durante 150 ms.
- [x] La explosión se dibuja exactamente en la posición y tamaño (64x24) del bloque roto.
- [x] El bloque deja de colisionar y los 10 puntos se suman en el momento del impacto, no al final de la animación.
- [x] Varios bloques rotos en rápida sucesión animan sus explosiones a la vez, sin cortarse entre sí.
- [x] `state.explosions` queda vacío ~150 ms después de la última rotura.
- [x] Al romper el último bloque se ve su explosión completa y después aparece el overlay de victoria; Espacio o clic durante `clearing` no hacen nada.
- [x] Perder la última vida mientras hay explosiones en curso muestra Game Over y las explosiones terminan con normalidad.
- [x] Reiniciar desde Game Over o victoria deja `state.explosions` vacío y 60 bloques vivos.
- [x] La consola no muestra errores y el comportamiento restante de SPEC 01 no cambia.

## Decisions

- **Yes:** lista `explosions` separada de `blocks`. Los bloques conservan `alive` y la colisión no depende de la animación.
- **No:** campo de animación dentro de cada bloque. Mezclaría estado de colisión con estado visual.
- **Yes:** puntos y colisión al impacto. Decisión del usuario; la animación es solo visual.
- **Yes:** esperar a que termine la última explosión antes de mostrar la victoria, mediante la fase `clearing`. Decisión del usuario; evita tapar la explosión final con el overlay.
- **No:** victoria inmediata al impacto. Cortaría la animación del último bloque.
- **Yes:** usar los 4 frames de `EXPLOSION_FRAMES` en 150 ms, sin efectos extra. Decisión del usuario.
- **Yes:** las explosiones siguen avanzando en `gameover` y `clearing`. Evita que queden congeladas en pantalla.
- **No:** sonidos en esta spec. Decisión del usuario; van en una spec aparte.

## Risks

| Risk                                                             | Mitigation                                                                                       |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `dt` acotado (`MAX_DT`) alarga la animación si la pestaña va lenta | Aceptable: la animación es cosmética y dura como máximo unos frames más.                         |
| Nueva fase `clearing` no contemplada en otros `if (phase === ...)` | Revisar `onActionInput`, `update` y `drawOverlay` en el paso 5; `clearing` no muestra overlay.   |

## What is **not** in this spec

- Sonidos de rotura o rebote.
- Partículas, sacudida de pantalla u otros efectos visuales.
- Bloques resistentes (`gray`), power-ups o varios niveles.
- Persistencia de récords.

Cada uno de ellos, si se hace, va en su propia spec.
