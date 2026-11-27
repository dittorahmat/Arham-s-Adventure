# AGENTS.md

Engineering guidelines and architectural invariants for AI coding agents working on **Arham's Adventure**.

---

## 1. Project Overview

**Arham's Adventure** is a client-side 3D *Stumble Guys*-style educational obstacle-course race game and **Progressive Web App (PWA)** built with **React 19, TypeScript, Tailwind CSS v4, Three.js, Vite 8, and `vite-plugin-pwa`**. Players race 5 AI classmates across five playable modes (`classic`, `tile_fall`, `ice_slide`, `laser_dash`, `honey_drop`) with **`random` ("Mode Acak")** as the default selection, choose a persisted **Difficulty** (`easy`, `medium`, `hard`) that scales obstacle speeds and quiz complexity, and answer Indonesian Elementary School (SD Kelas 1–6, defaulting to Kelas 5) quiz questions.

All 3D geometry, textures (`CanvasTexture`), particle systems (`InstancedMesh`), and audio/music (Web Audio API) are **100% procedural**—there are no external image, model, or audio asset fetches (only local static PWA app icons in `public/`).

---

## 2. Core Commands

Run commands from the repository root:

```bash
# Start dev server on port 3000
npm run dev

# Type-check (strict TypeScript check; configured as the lint script)
npm run lint

# Production bundle build (also generates dist/manifest.json & Workbox dist/sw.js)
npm run build

# Run all pure logic unit tests (Node's built-in test runner via tsx)
npx --yes tsx --test src/game/*.test.ts
```

> **Note on testing**: Always use `npx --yes tsx --test <files>` rather than plain `node --test` so extensionless TypeScript imports resolve cleanly.

---

## 3. Architecture & Separation of Concerns

Keep simulation/domain logic decoupled from React UI and Three.js rendering:

- **`src/game/*.ts` (Pure Logic Modules — zero React / DOM / Three.js dependencies)**:
  - `physics.ts`, `gameModes.ts`, `difficulty.ts`, `tileFall.ts`, `courseData.ts`, `questions.ts`, `replay.ts`, `particlePresets.ts`, `musicTempo.ts`, `achievements.ts`, `leaderboard.ts`, `dailyChallenges.ts`, `touchControls.ts`, `spriteMood.ts`, `pwa.ts`, `types.ts`.
  - Every new gameplay rule, math helper, state transition, or storage parser should live in a pure module with a sibling `*.test.ts` file tested via `node:test` + `node:assert/strict`.
- **`src/game/ThreeEngine.ts` + `models.ts` + `textures.ts` + `particles.ts` + `audio.ts`**:
  - Owns the Three.js `WebGLRenderer`, scene graph, instanced meshes, animation loop, keyboard/virtual input buffers, procedural Web Audio synthesizer, and collision/quiz haptic triggers.
  - Emits throttled `HudSnapshot` updates (~10Hz or on discrete score/quiz events) to React via callbacks.
- **`src/hooks/*.ts` (Browser Lifecycle Hooks)**:
  - `usePWAInstall.ts` (tracks `beforeinstallprompt`, `appinstalled`, standalone mode, and iOS install hints) and `useOnlineStatus.ts` (tracks `navigator.onLine` / `online` / `offline` events).
- **`src/components/*.tsx` (Thin Presentation Layer)**:
  - `TitleOverlay.tsx`, `PlayingHud.tsx`, `ReplayOverlay.tsx`, `TouchControls.tsx`, `StatusModals.tsx`, `AchievementBadges.tsx`, `TopScoresModal.tsx`, `DailyChallengesModal.tsx`, `ArhamSprite.tsx`, `PWAInstallButton.tsx`, `OfflineIndicator.tsx`.
  - Never run simulation ticks or `requestAnimationFrame` loops inside React components.
- **`public/` (Static PWA Assets)**:
  - `icon.svg`, `icon-maskable.svg`, `pwa-192x192.png`, `pwa-512x512.png`, `pwa-maskable-512x512.png`, `apple-touch-icon.png`.

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
1. **Viewport Fit (No Fold Clipping)**: `TitleOverlay.tsx` and HUD overlays must fit cleanly above the fold without vertical or horizontal clipping on both standard laptop viewports (`1280x800`) and mobile viewports (`375x812`, `390x844`). Keep action rows (`Mabar`, `Top Skor`, `Misi Harian`) compact enough to avoid unintended wrapping/clipping on `375px` width.
2. **State Mirroring**: Always keep `document.body.dataset.state` synced to `'title' | 'playing' | 'paused' | 'replay' | 'gameover'`.
3. **Start & Testability Hooks**:
   - Keep `data-start="true"` on the primary start CTA.
   - Preserve URL query hooks: `?autostart=1`, `?grade=<1..6>`, `?difficulty=<easy|medium|hard>`, `?mode=<random|classic|tile_fall|ice_slide|laser_dash|honey_drop>`, `?preview_replay=1`, and `?preview_gameover=1`.
   - Call `e.currentTarget.blur()` on clickable HUD/title buttons so pressing `Space` during gameplay jumps instead of re-clicking focused buttons.
4. **Input Safety**: Always clear held keyboard/touch inputs on `window` `blur`, `visibilitychange` (hidden), pause, and restart. Never use `window.alert` or `window.open`.
5. **Mobile Touch & Haptics**:
   - Guard **all** `navigator.vibrate()` calls through `triggerHapticFeedback()` in `src/game/touchControls.ts` so unsupported browsers (e.g., iOS Safari / desktop / restricted policies) fail silently without throwing.
   - `TouchControls.tsx` triggers `jump` and `dive` haptics on touch press.
   - `ArhamGameEngine.processEvents()` maps player-only (`ev.isPlayer === true`) collision events (`bumper`, `sweeper`, `laser_hit`, `tile_fake` / `tile_crack`) and quiz answer outcomes (`quiz_correct`, `quiz_wrong`) via `resolvePhysicsEventHaptic()` and invokes `triggerHapticFeedback()`. Never vibrate for AI bot events.

### Persistence (`localStorage`)
All persistence modules must guard `localStorage` access with `try/catch` and safely recover from corrupted JSON:
- Best score: `arham_adventure_best_score_v1` (`ThreeEngine.ts`)
- Difficulty selection: `arham_adventure_difficulty_v1` (`difficulty.ts`)
- Achievements profile: `achievements.ts`
- Top 5 fastest laps: `leaderboard.ts`
- Daily challenges (auto-reset by local `YYYY-MM-DD`): `dailyChallenges.ts`
- Touch controls visibility override: `touchControls.ts`

### Dev Server, PWA & Vite Configuration
- Keep `server.allowedHosts: true as const` in `vite.config.ts` so Vite 8 accepts proxied preview hostnames.
- Do not modify the `DISABLE_HMR` handling in `vite.config.ts` or remove the `copy-unbundled-src-assets` plugin.
- Preserve the `VitePWA` plugin configuration (`manifestFilename: 'manifest.json'`, `registerType: 'autoUpdate'`, `devOptions: { enabled: true, type: 'module' }`, Workbox precache `globPatterns`) and `"vite-plugin-pwa/client"` in `tsconfig.json` so the app remains installable and playable offline.
- When `DISABLE_HMR=true`, restart the dev server after code edits before testing in a browser.

### Cloudflare Worker, Durable Objects & Multiplayer
- **Monolith Worker Layout**: `wrangler.toml` lives at the repo root `/` (serving `dist/` via `[assets]` and `worker/src/index.ts`). Keep `--config ../wrangler.toml` on all `worker/package.json` scripts (`dev`, `deploy`, `check`).
- **Bind Every Durable Object in `wrangler.toml`**: Every Durable Object class exported by `worker/src/index.ts` (e.g. `RoomDurableObject`, `MatchmakerDurableObject`) must have a matching `[[durable_objects.bindings]]` entry and `[[migrations]]` class declaration in `wrangler.toml`.
- **D1 Match Persistence**: Never gate `persistMatchToD1()` on AI Classmates sending `player_finish`—trigger persistence once all **human** (`!p.isAi`) participants finish (or on match timeout).
- **No Duplicate `switch` Cases & Shared Request Helpers**: Keep `RoomDurableObject` message handlers free of duplicate `case` clauses, and extract shared request-body validation helpers (e.g. nickname parsing) in `worker/src/index.ts` instead of duplicating them across routes.
- **UI Button Focus**: Call `e.currentTarget.blur()` on clickable buttons in `LobbyModal.tsx` as well as HUD/title overlays.
- **Keep `bun.lock` Synced**: Cloudflare CI runs `bun install --frozen-lockfile` at the repo root. Whenever root `package.json` dependencies change, run `bun install` and commit `bun.lock`.

---

## 5. Verification Checklist Before Finishing Changes

1. Run unit tests: `npx --yes tsx --test src/game/*.test.ts` (all tests must pass).
2. Run type-check, worker bundle check, and production build: `npm run lint && npm --prefix worker run check && npm run build` (zero TypeScript, Wrangler, or Vite errors).
3. For any visual, 3D, layout, or interactive change: restart the dev server and verify both the affected flow and console output (0 runtime errors) in a headless browser before completing the task.
4. Keep UI copy in natural, kid-friendly **Bahasa Indonesia** consistent with the Indonesian Elementary School (SD Kelas 1–6) theme.

---

## Agent skills

### Issue tracker

Issues and specs are tracked in GitHub Issues (`dittorahmat/Arham-s-Adventure`) via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default triage labels (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout (`GLOSSARY.md` and `docs/adr/` at the repo root). See `docs/agents/domain.md`.
