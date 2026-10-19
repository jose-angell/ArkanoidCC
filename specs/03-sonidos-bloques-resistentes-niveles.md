# SPEC 03 — Sonidos, bloques resistentes y niveles

> **Status:** Aprobado
> **Depends on:** SPEC 01, SPEC 02
> **Date:** 2026-10-18
> **Objective:** Añadir efectos de sonido con silencio (tecla M), bloques `gray` de 2 golpes y 3 niveles con layouts propios que se encadenan hasta la victoria.

## Scope

**In:**

- Sonidos con `HTMLAudio` precargado y `cloneNode().play()` para permitir solapes.
- `ball-bounce.mp3` al rebotar en paredes, techo y pala, y al golpear un bloque `gray` sin romperlo.
- `break-sound.mp3` al romper cualquier bloque.
- Tecla M alterna silencio; el HUD muestra un indicador mientras está silenciado. Sin persistencia.
- Bloques `gray` de 2 golpes; el resto sigue rompiéndose de 1.
- 10 puntos por golpe: un `gray` da 20 en total.
- Parpadeo blanco de ~100 ms al golpear un `gray` sin romperlo.
- 3 niveles definidos como arrays de strings en `game.js` (una letra por bloque, `.` vacío).
- Al limpiar un nivel (tras las explosiones de `clearing`) aparece el overlay "Nivel N completado"; Espacio o clic cargan el siguiente.
- Puntos y vidas se conservan entre niveles; Game Over y la victoria reinician desde el nivel 1.
- La victoria solo aparece tras limpiar el nivel 3.
- HUD con el nivel actual ("Nivel 1/3").

**Out of scope (for future specs):**

- Sonidos nuevos (perder bola, pasar de nivel, victoria) o música de fondo.
- Persistencia del silencio o de récords en localStorage.
- Web Audio API, control de volumen.
- Bloques indestructibles o resistencias distintas a la de `gray`.
- Aumento de velocidad o dificultad por nivel.
- Editor de niveles, selección de nivel o niveles cargados desde archivos.
- Power-ups, pausa, menú.

## Data model

Cambios en `game.js`. Tiempo en milisegundos.

```js
const state = {
  // ...campos de SPEC 01 y 02
  phase: 'ready', // añade 'levelclear': nivel limpiado, esperando input para cargar el siguiente
  level: 0,       // índice en LEVELS (0..2); el HUD muestra level + 1
  muted: false,   // no se reinicia en resetGame()
  blocks: [/* { x, y, w, h, color, alive, hits, flash } */],
  // hits: golpes restantes (1, o 2 para gray); flash: ms de parpadeo restantes (0 = sin parpadeo)
};

const BLOCK_CODES = {
  R: 'red', Y: 'yellow', C: 'cyan', M: 'magenta', H: 'hotpink', G: 'green', X: 'gray',
}; // '.' = hueco
const BLOCK_HITS = { gray: 2 }; // resto de colores: 1
const FLASH_DURATION = 100;

// 10 columnas x 6 filas; se reutiliza LAYOUT (blockW, blockH, offsetX, offsetY).
const LEVELS = [
  [ // Nivel 1: el layout actual de SPEC 01
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

const SOUNDS = {
  bounce: new Audio('assets/sounds/ball-bounce.mp3'),
  break: new Audio('assets/sounds/break-sound.mp3'),
};
```

- `BLOCK_COLORS` desaparece: el color sale de `BLOCK_CODES`. `LAYOUT.rows`/`cols` dejan de usarse para generar; se mantienen las medidas.
- `createBlocks(levelIndex)` recorre `LEVELS[levelIndex]` e ignora los `.`.
- `playSound(name)` no hace nada si `state.muted`; si no, `SOUNDS[name].cloneNode().play()` y descarta el rechazo de la promesa.
- La condición de victoria/nivel limpiado sigue siendo `blocks.every((k) => !k.alive)`: los `gray` también se rompen.
- `drawSprite('block_gray')` y `EXPLOSION_FRAMES.gray` se reutilizan sin cambios de `assets/spritesheet.js`.

## Implementation plan

1. Añadir `SOUNDS`, `playSound(name)` y `state.muted`. La tecla M (sin `e.repeat`) alterna `muted`. `drawHud()` muestra "Silencio (M)" mientras está activo. Prueba: `playSound('break')` en consola suena; tras pulsar M no suena y aparece el indicador.
2. Conectar sonidos: `playSound('bounce')` en paredes, techo y pala dentro de `updateBall`, y `playSound('break')` al romper un bloque en `collideBlocks`. Prueba: cada rebote y cada rotura suenan, y se solapan al romper bloques seguidos.
3. Añadir `LEVELS`, `BLOCK_CODES`, `BLOCK_HITS` y `state.level`. `createBlocks(levelIndex)` genera desde el layout, con `hits` y `flash: 0`. `resetGame()` pone `level = 0`. Quitar `BLOCK_COLORS`. El HUD muestra "Nivel 1/3" centrado arriba. Prueba: el nivel 1 se ve y juega igual que antes.
4. Resistencia en `collideBlocks`: cada golpe resta 1 a `hits` y suma `POINTS_PER_BLOCK`. Si quedan golpes: `flash = FLASH_DURATION` y `playSound('bounce')`, sin explosión. Si llega a 0: se rompe como hasta ahora. Prueba: en consola, `state.blocks = createBlocks(1)`; un `gray` necesita 2 golpes y suma 20.
5. Parpadeo: `update(dt)` descuenta `flash` en cualquier fase. `draw()` pinta un rectángulo blanco semitransparente sobre el bloque mientras `flash > 0`. Prueba: el primer golpe a un `gray` lo hace parpadear ~100 ms.
6. Paso de nivel: en `update`, al vaciarse `explosions` en `clearing`, pasar a `levelclear` si quedan niveles o a `won` si era el último. `loadNextLevel()` incrementa `level`, genera los bloques, vacía `explosions`, centra la pala y deja la bola en `serving` sin tocar puntos ni vidas. `onActionInput` llama a `loadNextLevel()` en `levelclear`. `drawOverlay` añade `levelclear`: "¡Nivel N completado!", "Siguiente: Nivel N+1", "Espacio o clic para continuar". Prueba: limpiar el nivel 1 (o vaciar `state.blocks` salvo uno en consola) lleva al overlay y luego al nivel 2.

## Acceptance criteria

- [ ] La bola suena con `ball-bounce.mp3` al rebotar en paredes, techo y pala.
- [ ] Romper cualquier bloque suena con `break-sound.mp3`.
- [ ] Golpear un `gray` sin romperlo suena con `ball-bounce.mp3`, no con `break-sound.mp3`.
- [ ] Dos sonidos seguidos se solapan sin cortarse.
- [ ] Pulsar M silencia todos los sonidos y muestra "Silencio (M)" en el HUD; pulsarla otra vez los reactiva y oculta el indicador.
- [ ] El silencio se mantiene al reiniciar la partida y se pierde al recargar la página.
- [ ] Un bloque `gray` necesita exactamente 2 golpes, parpadea ~100 ms tras el primero y suma 20 puntos en total.
- [ ] Los bloques de color se rompen de 1 golpe y suman 10 puntos.
- [ ] El nivel 1 tiene los mismos 60 bloques que en SPEC 01; los niveles 2 y 3 coinciden con `LEVELS`.
- [ ] El HUD muestra "Nivel N/3" con el nivel actual.
- [ ] Al limpiar los niveles 1 y 2, tras la última explosión aparece el overlay "¡Nivel N completado!"; Espacio o clic cargan el siguiente con la bola pegada a la pala.
- [ ] Al pasar de nivel se conservan los puntos y las vidas.
- [ ] Al limpiar el nivel 3 aparece el overlay de victoria.
- [ ] Reiniciar desde Game Over o victoria vuelve al nivel 1 con 3 vidas y 0 puntos.
- [ ] La consola no muestra errores (tampoco al sonar antes de que el navegador permita audio) y el resto del comportamiento de SPEC 01 y 02 no cambia.

## Decisions

- **Yes:** una sola spec para sonidos, bloques resistentes y niveles. Decisión del usuario, aunque toca tres áreas; se propuso dividirla.
- **Yes:** `HTMLAudio` con `cloneNode().play()`. Pocas líneas y permite solapes.
- **No:** Web Audio API. Más código del necesario para dos efectos cortos.
- **Yes:** `ball-bounce` en paredes, techo y pala, y al golpear un `gray` sin romperlo; `break-sound` solo al romper. Decisión del usuario.
- **No:** sonidos extra para perder bola, pasar de nivel o victoria. Solo existen los dos mp3.
- **Yes:** tecla M para silenciar, con indicador en el HUD y sin persistencia. Decisión del usuario.
- **Yes:** solo `gray` es resistente, con 2 golpes. Usa el sprite existente y mantiene el resto igual.
- **No:** bloques indestructibles o resistencia por color. Complican la condición de victoria y el diseño.
- **Yes:** 10 puntos por golpe. Un `gray` vale 20 sin tocar `POINTS_PER_BLOCK`.
- **Yes:** parpadeo blanco de ~100 ms como feedback. No requiere sprites nuevos.
- **Yes:** 3 niveles como arrays de strings en `game.js`. Legibles y editables a mano; layouts propuestos por la spec.
- **No:** niveles generados por código o cargados de archivos. Menos control o más infraestructura.
- **Yes:** overlay "Nivel N completado" y continuar con Espacio o clic, reutilizando `clearing`. Decisión del usuario.
- **Yes:** puntos y vidas se conservan entre niveles; Game Over reinicia en el nivel 1. Decisión del usuario.
- **No:** más velocidad por nivel. Decisión del usuario; evita riesgo de tunneling.
- **Yes:** quick finish: el usuario revisó cabecera, alcance, modelo de datos y plan; pidió escribir el resto sin más confirmaciones.

## Risks

| Risk                                                                 | Mitigation                                                                                         |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| El navegador bloquea `play()` sin interacción previa                  | El primer sonido llega tras Espacio o clic; `playSound` descarta el rechazo de la promesa.          |
| Muchos `cloneNode()` seguidos generan elementos de audio              | Son sonidos cortos y se liberan al terminar; como mucho uno por frame.                              |
| Nueva fase `levelclear` no contemplada en algún `if (phase === ...)` | Revisar `onActionInput`, `update` y `drawOverlay` en el paso 6; la bola no se mueve en `levelclear`. |
| Las explosiones de `gray` usan la fila roja del spritesheet           | Aceptable: limitación conocida de `assets/spritesheet.js`.                                          |

## What is **not** in this spec

- Sonidos nuevos o música de fondo.
- Persistencia del silencio o de récords.
- Web Audio API o control de volumen.
- Bloques indestructibles o resistencias distintas a la de `gray`.
- Aumento de dificultad por nivel.
- Editor o selección de niveles.
- Power-ups, pausa o menú.

Cada uno de ellos, si se hace, va en su propia spec.
