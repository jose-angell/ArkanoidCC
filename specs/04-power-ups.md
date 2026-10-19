# SPEC 04 — Power-ups

> **Status:** Aprobado
> **Depends on:** SPEC 01, SPEC 02, SPEC 03
> **Date:** 2026-10-19
> **Objective:** Al romper bloques caen cápsulas que, recogidas con la pala, dan pala larga, multibola, bola lenta o vida extra.

## Scope

**In:**

- Cada bloque que se rompe tiene un 15% de soltar una cápsula. Los golpes que no rompen un `gray` no sueltan nada.
- Tipo de cápsula por peso: pala larga 30%, multibola 30%, bola lenta 30%, vida extra 10%.
- La cápsula cae en vertical a 150 px/s desde el centro del bloque roto.
- Se recoge al tocar la pala; si sale por abajo se pierde.
- Cápsula dibujada en canvas: rectángulo redondeado de color con una letra (`L`, `M`, `S`, `V`). Sin assets nuevos.
- Al recogerla suena `ball-bounce.mp3` (respeta el silencio). No suma puntos.
- **Pala larga (`L`):** la pala pasa de 120 a 200 px durante 10 s y crece desde su centro.
- **Bola lenta (`S`):** todas las bolas van al 50% de velocidad (360 → 180 px/s) durante 10 s.
- **Multibola (`M`):** salen 2 bolas extra desde la primera bola en juego. Solo se pierde vida cuando no queda ninguna bola en pantalla.
- **Vida extra (`V`):** +1 vida al instante, con máximo 5. Con 5 vidas se recoge sin efecto.
- Recoger un efecto con duración que ya está activo reinicia su temporizador a 10 s. Efectos distintos conviven.
- El HUD muestra los efectos activos con sus segundos restantes ("Pala larga 7s", "Bola lenta 3s").
- Perder una vida, pasar de nivel, limpiar un nivel o reiniciar la partida borra las cápsulas en caída y los efectos activos, y deja una sola bola.
- La pausa congela cápsulas y temporizadores.

**Out of scope (for future specs):**

- Otros power-ups (láser, pegamento, atravesar bloques, saltar de nivel) o power-ups negativos.
- Bloques fijos que siempre sueltan un power-up, o marcas en `LEVELS`.
- Sprites o imágenes nuevas para las cápsulas.
- Sonidos nuevos para recoger o expirar.
- Puntos por recoger cápsulas.
- Persistencia de cualquier tipo.

## Data model

Cambios en `game.js`. Tiempo en milisegundos, velocidades en px/s.

```js
const state = {
  // ...campos de SPEC 01–03 y pausa
  balls: [/* { x, y, vx, vy } */], // sustituye a state.ball; en 'serving' siempre hay una
  powerups: [/* { x, y, type } */],  // cápsulas en caída
  effects: { long: 0, slow: 0 },    // ms restantes de cada efecto (0 = inactivo)
};

const BALL = { size: 16, speed: 360 }; // antes en state.ball

const POWERUP_TYPES = {
  long:  { letter: 'L', label: 'Pala larga', weight: 30, color: '...' },
  multi: { letter: 'M', label: 'Multibola',  weight: 30, color: '...' },
  slow:  { letter: 'S', label: 'Bola lenta', weight: 30, color: '...' },
  life:  { letter: 'V', label: 'Vida extra', weight: 10, color: '...' },
};
const POWERUP = {
  chance: 0.15, fallSpeed: 150, w: 40, h: 16,
  duration: 10000, longPaddleW: 200, slowFactor: 0.5,
};
const PADDLE_W = 120;
const MAX_LIVES = 5;
```

- Los colores de cápsula los elige la implementación; deben distinguirse entre sí y del fondo.
- `newBall()` crea una bola parada; `stickBallToPaddle()` pega `balls[0]`.
- `setPaddleWidth(w)` cambia el ancho manteniendo el centro y llama a `clampPaddle()`.
- `ballSpeed()` devuelve `BALL.speed * slowFactor` si `effects.slow > 0`; si no, `BALL.speed`.
- `resetPowerUps()` vacía `powerups`, pone `effects` a 0, restaura la pala a `PADDLE_W` y deja `balls = [newBall()]`.
- Multibola: copias de la primera bola con su velocidad rotada ±25°. Como los rebotes conservan el ángulo de 30° respecto a la vertical, las nuevas salen a 5° y 55°.
- Bola lenta: al activarse (si no estaba activa) se multiplica `vx`/`vy` de cada bola por `slowFactor`. Al expirar se divide. Las bolas nuevas heredan la velocidad de la bola de la que salen.

## Implementation plan

1. Refactor de bola a array: `state.ball` pasa a `state.balls` con `BALL` como constantes. `updateBall(b)` y `collideBlocks(b)` reciben la bola. `update` recorre todas las bolas, quita las que salen por abajo y llama a `loseBall()` solo si el array queda vacío. La comprobación de nivel limpiado se hace tras mover todas. `draw` pinta todas. Prueba: el juego se comporta exactamente igual que antes.
2. Cápsulas y vida extra: añadir `POWERUP_TYPES`, `POWERUP`, `MAX_LIVES`, `state.powerups` y `resetPowerUps()`. Al romper un bloque en `collideBlocks`, con probabilidad `chance` se crea una cápsula con tipo elegido por peso. En `playing` las cápsulas caen; si tocan la pala se llama a `applyPowerUp(type)` y suena `bounce`; si salen por abajo se descartan. `applyPowerUp('life')` suma una vida hasta `MAX_LIVES`; el resto de tipos aún no hacen nada. `drawPowerUps()` pinta rectángulo redondeado y letra. `resetPowerUps()` se llama en `resetGame`, `loadNextLevel`, `loseBall` y al entrar en `clearing`. Prueba: en consola, `POWERUP.chance = 1`; cada rotura suelta una cápsula y una `V` suma vida.
3. Efectos con duración y pala larga: añadir `state.effects`, `PADDLE_W` y `setPaddleWidth(w)`. En `playing`, `update` descuenta los efectos y al llegar a 0 los desactiva. `applyPowerUp('long')` pone `effects.long = duration` y la pala a `longPaddleW`. Al expirar vuelve a `PADDLE_W`. `drawHud` muestra los efectos activos con `Math.ceil(ms / 1000)` segundos, abajo a la derecha. Prueba: recoger `L` agranda la pala 10 s; recoger otra a los 5 s vuelve el contador a 10.
4. Bola lenta: `ballSpeed()` y aplicación/reversión de `slowFactor` sobre todas las bolas. `launchBall` usa `ballSpeed()`. Prueba: recoger `S` reduce la velocidad a la mitad 10 s y luego vuelve a 360 px/s.
5. Multibola: `applyPowerUp('multi')` añade 2 bolas desde la primera bola en juego con la velocidad rotada ±25°. Prueba: recoger `M` deja 3 bolas; perder 2 no quita vida; perder la última sí.

## Acceptance criteria

- [ ] Con `POWERUP.chance = 1` en consola, cada bloque roto suelta una cápsula y golpear un `gray` sin romperlo no suelta nada.
- [ ] Con la probabilidad por defecto, aproximadamente 1 de cada 7 bloques rotos suelta una cápsula.
- [ ] La cápsula cae en vertical, muestra su letra y desaparece al salir por abajo sin efecto.
- [ ] Recoger una cápsula con la pala suena `ball-bounce.mp3` (salvo en silencio) y no suma puntos.
- [ ] `L` agranda la pala a 200 px desde su centro durante 10 s y luego vuelve a 120 px sin salirse del canvas.
- [ ] `S` deja todas las bolas a 180 px/s durante 10 s y luego vuelven a 360 px/s.
- [ ] `M` añade 2 bolas; la vida solo se pierde cuando cae la última bola.
- [ ] `V` suma una vida; con 5 vidas no suma más.
- [ ] Recoger un `L` o `S` ya activo reinicia su contador a 10 s.
- [ ] El HUD muestra cada efecto activo con sus segundos restantes y lo oculta al expirar.
- [ ] Perder una vida, limpiar un nivel o reiniciar la partida elimina cápsulas y efectos y deja una sola bola pegada a la pala con pala de 120 px.
- [ ] Con el juego en pausa, las cápsulas no se mueven y los contadores no bajan.
- [ ] La consola no muestra errores y el resto del comportamiento de SPEC 01–03 y la pausa no cambia.

## Decisions

- **Yes:** cuatro power-ups (pala larga, multibola, bola lenta, vida extra) en una sola spec. Decisión del usuario.
- **Yes:** aparición por probabilidad (15%) al romper un bloque. Decisión del usuario; no toca `LEVELS`.
- **No:** bloques fijos que sueltan power-ups. Obligaría a ampliar el formato de los niveles.
- **Yes:** cápsula dibujada en canvas con letra. El spritesheet no tiene sprites de power-ups.
- **No:** asset nuevo. Requiere una imagen que no existe.
- **Yes:** reparto 30/30/30/10. La vida extra es la más valiosa, así que es más rara.
- **Yes:** 10 s de duración y caída a 150 px/s. Decisión del usuario.
- **Yes:** pala de 200 px y bola al 50%. Decisión del usuario, frente a 180 px y 60% propuestos.
- **Yes:** mismo efecto reinicia el temporizador y efectos distintos conviven. Decisión del usuario.
- **No:** un solo efecto activo (estilo clásico) o acumular tiempo.
- **Yes:** multibola de +2 bolas y vida solo al perder la última. Decisión del usuario.
- **Yes:** `state.ball` pasa a `state.balls`. Es la forma más simple de soportar varias bolas; se hace primero como refactor sin cambio de comportamiento.
- **Yes:** máximo 5 vidas. Evita que el HUD de vidas crezca sin fin.
- **Yes:** reiniciar cápsulas y efectos al perder vida, limpiar nivel o reiniciar. Decisión del usuario; el saque siempre empieza en estado normal.
- **Yes:** feedback con HUD de segundos y `ball-bounce.mp3`, sin puntos. Decisión del usuario; no hay más sonidos.

## Risks

| Risk                                                             | Mitigation                                                                                               |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| El refactor a `state.balls` rompe algo existente                  | Paso 1 aislado y sin cambio de comportamiento; se prueba antes de añadir power-ups.                      |
| Bola lenta deja velocidades inconsistentes si expira mal          | Se escala solo al activarse desde inactivo y se revierte al expirar; `resetPowerUps()` crea bolas nuevas. |
| La pala larga al expirar o al crecer queda fuera del canvas       | `setPaddleWidth()` siempre llama a `clampPaddle()`.                                                      |
| Varias bolas rompen el último bloque en el mismo frame            | La comprobación de nivel limpiado se hace una vez tras mover todas las bolas.                            |
| Cápsulas residuales durante `clearing` o `levelclear`             | `resetPowerUps()` al entrar en `clearing`; las cápsulas solo se mueven en `playing`.                     |

## What is **not** in this spec

- Otros power-ups o power-ups negativos.
- Power-ups fijos en los niveles.
- Sprites, imágenes o sonidos nuevos.
- Puntos por recoger cápsulas.
- Persistencia.

Cada uno de ellos, si se hace, va en su propia spec.
