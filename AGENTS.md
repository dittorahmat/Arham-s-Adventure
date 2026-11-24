# AGENTS.md

Engineering guidelines and architectural invariants for AI coding agents working on **Arham's Adventure**.

---

## 1. Project Overview

**Arham's Adventure** is a client-side 3D *Stumble Guys*-style educational obstacle-course race game built with **React 19, TypeScript, Tailwind CSS v4, Three.js, and Vite 8**. Players race 5 AI classmates across five playable modes (`classic`, `tile_fall`, `ice_slide`, `laser_dash`, `honey_drop`) with **`random` ("Mode Acak")** as the default selection, while answering Indonesian Elementary School (SD Kelas 1–6, defaulting to Kelas 5) quiz questions.

All 3D geometry, textures (`CanvasTexture`), particle systems (`InstancedMesh`), and audio/music (Web Audio API) are **100% procedural**—there are no external image, model, or audio asset fetches.

---

## 2. Core Commands

Run commands from the repository root:

```bash
# Start dev server on port 3000
npm run dev

# Type-check (strict TypeScript check; configured as the lint script)
npm run lint

# Production bundle build
npm run build

# Run all pure logic unit tests (Node's built-in test runner via tsx)
npx --yes tsx --test src/game/*.test.ts
```

> **Note on testing**: Always use `npx --yes tsx --test <files>` rather than plain `node --test` so extensionless TypeScript imports resolve cleanly.

---

## 3. Architecture & Separation of Concerns

Keep simulation/domain logic decoupled from React UI and Three.js rendering:

- **`src/game/*.ts` (Pure Logic Modules — zero React / DOM / Three.js dependencies)**:
  - `physics.ts`, `gameModes.ts`, `tileFall.ts`, `courseData.ts`, `questions.ts`, `replay.ts`, `particlePresets.ts`, `musicTempo.ts`, `achievements.ts`, `leaderboard.ts`, `dailyChallenges.ts`, `touchControls.ts`, `spriteMood.ts`, `types.ts`.
  - Every new gameplay rule, math helper, state transition, or storage parser should live in a pure module with a sibling `*.test.ts` file tested via `node:test` + `node:assert/strict`.
- **`src/game/ThreeEngine.ts` + `models.ts` + `textures.ts` + `particles.ts` + `audio.ts`**:
  - Owns the Three.js `WebGLRenderer`, scene graph, instanced meshes, animation loop, keyboard/virtual input buffers, and procedural Web Audio synthesizer.
  - Emits throttled `HudSnapshot` updates (~10Hz or on discrete score/quiz events) to React via callbacks.
- **`src/components/*.tsx` (Thin Presentation Layer)**:
  - `TitleOverlay.tsx`, `PlayingHud.tsx`, `ReplayOverlay.tsx`, `TouchControls.tsx`, `StatusModals.tsx`, `AchievementBadges.tsx`, `TopScoresModal.tsx`, `DailyChallengesModal.tsx`, `ArhamSprite.tsx`.
  - Never run simulation ticks or `requestAnimationFrame` loops inside React components.

---

## 4. Non-Negotiable Technical Invariants

### Three.js & WebGL Lifecycle
1. **Mount WebGL Once**: `App.tsx` mounts `<div ref={canvasMountRef} />` outside sibling HUD overlays and initializes `ArhamGameEngine` inside `useEffect(..., [])`. Keep React state setters in `callbacksRef` so HUD updates never remount the renderer or reset player state.
2. **Software-WebGL Pacing (`isSoftwareGl`)**: Detect software renderers (`SwiftShader|llvmpipe|softpipe`) via WebGL renderer string only to adjust rendering cost (pixel ratio `1`, no shadow maps, `afterDraw()` WebGL2 `fenceSync` pacing). Never alter scene objects, gameplay logic, or UI layout between GPU and software WebGL.
3. **Zero-GC Render Loop**: Pre-allocate reusable `THREE.Vector3`, `THREE.Object3D`, and `THREE.Color` scratch instances at module scope. Never allocate geometries, materials, or vectors inside `tick()`.
4. **Instancing & Frustum Culling**: Repeated dynamic objects (particles, shockwaves, Tile Fall tiles) must use `THREE.InstancedMesh` with `frustumCulled = false`.
5. **Material Color Fidelity on `InstancedMesh`**: Do **not** set `emissive: 0xffffff` on `InstancedMesh` materials that rely on `instanceColor`—Three.js does not tint `emissive` by `instanceColor`, causing white washout under ACES Filmic tone mapping.
6. **GPU Resource Cleanup**: Every dynamically rebuilt course group must dispose geometries, materials, and non-shared textures via `clearGroup()`, and `ArhamGameEngine.dispose()` must dispose `ParticleVfxSystem`, shared textures, `envRenderTarget`, `SoundEngine`, and `WebGLRenderer`.
7. **No `backdrop-filter` Over WebGL**: Never apply `backdrop-blur` / `backdrop-filter` on HUD or modal layers over the live WebGL canvas; use solid or `rgba(...)` backgrounds instead.

### Game Shell, Accessibility & Controls
1. **State Mirroring**: Always keep `document.body.dataset.state` synced to `'title' | 'playing' | 'paused' | 'replay' | 'gameover'`.
2. **Start & Testability Hooks**:
   - Keep `data-start="true"` on the primary start CTA.
   - Preserve URL query hooks: `?autostart=1`, `?grade=<1..6>`, `?mode=<random|classic|tile_fall|ice_slide|laser_dash|honey_drop>`, `?preview_replay=1`, and `?preview_gameover=1`.
   - Call `e.currentTarget.blur()` on clickable HUD/title buttons so pressing `Space` during gameplay jumps instead of re-clicking focused buttons.
3. **Input Safety**: Always clear held keyboard/touch inputs on `window` `blur`, `visibilitychange` (hidden), pause, and restart. Never use `window.alert` or `window.open`.
4. **Mobile Touch & Haptics**: Guard `navigator.vibrate()` calls through `triggerHapticFeedback()` in `src/game/touchControls.ts` so unsupported browsers (e.g., iOS Safari / desktop) fail silently without throwing.

### Persistence (`localStorage`)
All persistence modules must guard `localStorage` access with `try/catch` and safely recover from corrupted JSON:
- Best score: `arham_adventure_best_score_v1` (`ThreeEngine.ts`)
- Achievements profile: `achievements.ts`
- Top 5 fastest laps: `leaderboard.ts`
- Daily challenges (auto-reset by local `YYYY-MM-DD`): `dailyChallenges.ts`
- Touch controls visibility override: `touchControls.ts`

### Dev Server & Vite Configuration
- Keep `server.allowedHosts: true as const` in `vite.config.ts` so Vite 8 accepts proxied preview hostnames.
- Do not modify the `DISABLE_HMR` handling in `vite.config.ts` or remove the `copy-unbundled-src-assets` plugin.
- When `DISABLE_HMR=true`, restart the dev server after code edits before testing in a browser.

---

## 5. Verification Checklist Before Finishing Changes

1. Run unit tests: `npx --yes tsx --test src/game/*.test.ts` (all tests must pass).
2. Run type-check and production build: `npm run lint && npm run build` (zero TypeScript or Vite errors).
3. For any visual, 3D, layout, or interactive change: restart the dev server and verify both the affected flow and console output (0 runtime errors) in a headless browser before completing the task.
4. Keep UI copy in natural, kid-friendly **Bahasa Indonesia** consistent with the Indonesian Elementary School (SD Kelas 1–6) theme.
