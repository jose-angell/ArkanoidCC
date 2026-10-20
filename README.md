# Juego de Arkanoid

Clon del clásico Arkanoid (Breakout) para el navegador, hecho con HTML, CSS y JavaScript sobre un `<canvas>` de 800x600 px, sin dependencias ni build.

## Cómo ejecutarlo

El juego carga el spritesheet y los sonidos con rutas relativas, así que hay que servirlo desde la raíz del repo con un servidor estático:

```bash
python -m http.server 8000
# o
npx serve .
```

Después abre `http://localhost:8000`.

## Controles

| Acción | Control |
| --- | --- |
| Mover la pala | Flechas izquierda/derecha, `A`/`D` o ratón |
| Iniciar / lanzar la bola / continuar | `Espacio` o clic |
| Pausar / reanudar | `P` |
| Silenciar / activar sonido | `M` |

## Características

- 3 niveles con distintas disposiciones de bloques; los puntos y las vidas se conservan al pasar de nivel.
- Bloques de color (1 golpe, 10 puntos) y bloques grises resistentes (2 golpes, 20 puntos).
- Animación de explosión al romper bloques.
- Efectos de sonido para rebotes y roturas, con opción de silencio.
- HUD con puntos, vidas, nivel actual e indicador de silencio.
- Pausa, pantalla de Game Over y de victoria, con reinicio inmediato.
- Power-ups: cada bloque roto tiene un 25% de soltar una cápsula que cae a 150 px/s; se recoge con la pala (suena el rebote, no suma puntos).

## Power-ups

| Cápsula | Efecto | Duración | Probabilidad |
| --- | --- | --- | --- |
| `L` Pala larga | La pala pasa de 120 a 200 px, creciendo desde su centro | 10 s | 30% |
| `M` Multibola | Añade 2 bolas extra a partir de la primera (±25°); solo pierdes vida al caer la última | Hasta perder las bolas | 30% |
| `S` Bola lenta | Todas las bolas van al 50% de velocidad (360 → 180 px/s) | 10 s | 30% |
| `V` Vida extra | +1 vida (máximo 5) | Instantáneo | 10% |

- Recoger un efecto con duración ya activo reinicia su temporizador; efectos distintos conviven.
- El HUD muestra los efectos activos con sus segundos restantes.
- Perder una vida, pasar de nivel o reiniciar borra las cápsulas y los efectos.
- La pausa congela cápsulas y temporizadores.

## Estructura del proyecto

```
index.html      Página y canvas
game.js         Lógica del juego (estado, entrada, colisiones, dibujo)
style.css       Estilos
assets/         Spritesheet (spritesheet.js + PNG) y sonidos
specs/          Especificaciones del proyecto
.claude/skills/ Skills /spec y /spec-impl
```

## Desarrollo guiado por specs

El proyecto se construye con un flujo spec-driven: `/spec` genera una especificación en `specs/` y `/spec-impl` la implementa una vez aprobada.

| Spec | Contenido | Estado |
| --- | --- | --- |
| 01 | MVP jugable de Arkanoid | Implementado |
| 02 | Animación de destrucción de bloques | Implementado |
| 03 | Sonidos, bloques resistentes y niveles | Implementado |
| 04 | Power-ups (pala larga, multibola, bola lenta, vida extra) | Implementado |

La funcionalidad de pausa se añadió después de las specs.
