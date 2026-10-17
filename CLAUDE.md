# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

Arkanoid (Breakout) browser game, built with a spec-driven workflow. So far the repo only contains assets and skills — there is no `index.html`, game code, build system, package manager, linter or tests yet. No build/test commands exist; the game is expected to be plain HTML/JS on a `<canvas>` (the sprite code assumes `document` and 2D canvas contexts). The README is just a title ("Juego de Arkanoid"). Project prose (README, commits) is in Spanish.

## Spec-driven workflow

Work is driven by two project skills (`.claude/skills/`, mirrored in `.agents/skills/`, pinned in `skills-lock.json` from `Klerith/fernando-skills`):

- `/spec <description>` — interviews the user, then writes `specs/NN-slug.md` (status `Draft`, plus `specs/.spec-config.yml`). It writes no code.
- `/spec-impl <spec>` — only proceeds if the spec is `Approved`; creates a branch `spec-NN-slug` (controlled by `AutoCreateBranch` in `specs/.spec-config.yml`) and implements step by step. It requires a clean working tree.

Don't mark specs `Approved` yourself; the user does that. Match the language of existing specs.

## Assets

- `assets/spritesheet-breakout.png` + `assets/spritesheet.js`: the script is a classic (non-module) script defining globals: `SPRITES` (paddle, ball, `blocks.<color>` source rects), `EXPLOSION_FRAMES` (4 frames per color) and `EXPLOSION_DURATION` (150 ms). Colors: gray, red, yellow, cyan, magenta, hotpink, green.
- API: `loadSpritesheet(cb)` must complete before drawing (draw functions silently no-op until loaded); `drawSprite(ctx, name, x, y, w, h)` where block names are `block_<color>`; `drawFrame(ctx, frame, x, y, w, h)` for explosion frames. The image path is hardcoded relative to the page: `assets/spritesheet-breakout.png`, so the HTML must be served from the repo root.
- Sounds: `assets/sounds/ball-bounce.mp3`, `assets/sounds/break-sound.mp3`.
- Note: `gray` explosion frames reuse the red row, and the sheet's `.DS_Store` files are stray.
