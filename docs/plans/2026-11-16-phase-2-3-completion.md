# Fase 2–3 Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the remaining Phase 2 architecture work and Phase 3 UI/accessibility/responsive verification in `task/update.md`.

**Architecture:** Complete Phase 2 first: extract the existing narration workflow into a dedicated section, add a FilmCreate library picker using existing library APIs, then run the primary workflow manually. Phase 3 follows in independently verifiable slices: storyboard/task progress, styling and responsive cleanup, accessibility/contrast, then browser/Electron verification. Keep existing Vue 3, Element Plus, Pinia, composables, and Node built-in test conventions; avoid adding dependencies unless an existing capability cannot meet a stated acceptance criterion.

**Tech Stack:** Vue 3 SFCs, JavaScript, Element Plus, Pinia, Vite, Node.js built-in test runner, Electron.

**Spec:** `task/update.md` (Phase 2 sections 2.1–2.3 and Phase 3 sections 3.1–3.7).

## Global Constraints

- Preserve existing project data/API contracts and support previously saved projects.
- Keep `FilmCreate.vue` under 800 lines.
- Do not add fake success or empty-result behavior to API routes.
- User-visible strings must use the existing i18n dictionaries; keep zh/en parity for new keys.
- Follow existing Vue/JavaScript patterns and Node built-in test runner; no lint tool is configured.
- UI changes must remain usable with keyboard, dark/light themes, English labels, and the minimum Electron window target of 1024×700.
- Do not claim visual, contrast, or Electron verification without recording the actual tested viewport/theme/runtime.

## Review Focus

- Dialogs or menus opened from the new library picker must close and restore focus correctly on cancel, selection, and Escape.
- Narration controls must use the selected episode/storyboards and preserve current SRT/audio behavior without duplicate generation.
- Per-shot progress must not display fabricated percentages when the task/API provides only running/done/failed states.
- English labels and narrow widths must not clip controls or create horizontal overflow.
- Contrast and icon-name checks must include Element Plus states, focus/hover states, disabled controls, and both themes.

---

## File Map

- `frontweb/src/components/filmCreate/NarrationSection.vue` — standalone narration/export controls, consuming props and emitting actions rather than duplicating workflow logic.
- `frontweb/src/components/filmCreate/FilmCreateDialogs.vue` — host the library picker dialog alongside existing FilmCreate dialogs.
- `frontweb/src/components/filmCreate/LibraryPickerDialog.vue` — reusable character/scene public-library picker UI.
- `frontweb/src/views/FilmCreate.vue` — wire extracted sections/dialog state; keep orchestration only.
- `frontweb/src/components/filmCreate/StoryboardCard.vue` and `StoryboardSection.vue` — expose status and truthful progress/retry per shot.
- `frontweb/src/stores/generationTaskStore.js` and related task API/service only if progress data must be propagated; preserve existing contracts where possible.
- `frontweb/src/components/filmCreate/*.vue`, `frontweb/src/views/FilmCreate.css`, and `frontweb/src/styles/theme.css` — inline-style, fixed-width, focus, and theme cleanup.
- `frontweb/src/i18n/locales/{en,zh}.js` — localized labels/help/status text introduced by the work.
- `frontweb/test/*.test.js` — focused unit/smoke tests for extracted logic, navigation, and per-shot status/progress.
- `task/update.md` — update checkboxes and verification evidence only after each deliverable is complete.

## Execution Order

### Task 1: Extract narration UI into a standalone section

**Files:**
- Create: `frontweb/src/components/filmCreate/NarrationSection.vue`
- Modify: `frontweb/src/views/FilmCreate.vue`
- Modify: `frontweb/src/components/filmCreate/StoryboardSection.vue` only if narration controls currently live there
- Test: `frontweb/test/film-create-narration.test.js` (or the existing colocated smoke-test convention)

**Interfaces:**
- Consume existing `useNarration` state/actions and storyboard/episode props; do not move audio-generation or SRT business logic into the component.
- Emit explicit events for narration generation, playback, and SRT export, or accept the existing composable action object if that is the established FilmCreate pattern.
- The section owns only presentation and user interaction.

- [ ] Trace current narration controls and composable consumers; record the exact state/action contract before moving markup.
- [ ] Add a smoke test proving narration state/actions are passed through without changing IDs or text values.
- [ ] Extract narration markup into `NarrationSection.vue` and replace the old markup with the new section.
- [ ] Run `cd frontweb && node --test test/*.test.js` and `cd frontweb && npm run build`.
- [ ] Manually verify dialogue TTS, narration TTS, playback, and SRT export for the selected episode.

### Task 2: Verify existing FilmCreate public-library pickers

**Files:**
- Existing: `frontweb/src/components/filmCreate/CharacterBlock.vue`
- Existing: `frontweb/src/components/filmCreate/SceneBlock.vue`
- Existing logic: `frontweb/src/composables/filmCreate/useCharacters.js`, `useScenes.js`
- Existing APIs: `frontweb/src/api/characterLibrary.js`, `sceneLibrary.js`
- Update: `task/update.md` with evidence

**Interfaces:**
- Existing dialogs are embedded in their asset blocks and already use the existing library APIs/composables.
- Do not add a duplicate centralized dialog unless a concrete missing user flow is found.

- [ ] Verify character and scene dialogs expose list/search/loading/empty/error/pagination and add-to-episode behavior.
- [ ] Verify selection updates the current episode and handles already-added resources without duplicates.
- [ ] Add/adjust tests only for any uncovered pure behavior; no duplicate UI component.
- [ ] Run frontend tests and build.

### Task 3: Close Phase 2 with a manual workflow regression pass

**Files:**
- Modify: `task/update.md`
- No product-code changes unless a reproducible regression is found; any fix gets its own focused test.

- [ ] Run backend tests: `cd backend-node && node --test test/*.test.js`.
- [ ] Run frontend tests: `cd frontweb && node --test test/*.test.js`.
- [ ] Build frontend: `cd frontweb && npm run build`.
- [ ] Manually verify FilmList → DramaDetail → FilmCreate: choose episode, edit/save script, manage characters/props/scenes, generate or edit storyboard, configure video, export storyboard/narration, and use library picker.
- [ ] Verify task status/polling remains coherent while switching episodes and navigating between FilmCreate and Canvas.
- [ ] Record tested build/runtime and any blocked external-AI/FFmpeg steps in `task/update.md`; mark Phase 2 complete only when all required checks have evidence.

### Task 4: Complete per-shot status and honest progress

**Files:**
- Modify: `frontweb/src/utils/storyboardStatus.js`
- Modify: `frontweb/src/components/filmCreate/StoryboardCard.vue`
- Modify: `frontweb/src/components/filmCreate/StoryboardSection.vue`
- Modify task store/API files only if supported progress fields already exist upstream or can be added compatibly.
- Test: `frontweb/test/storyboard-status.test.js` and any task-store test covering progress normalization.

**Interfaces:**
- Status model remains a normalized object with `status` (`queued|running|failed|done`), `error`, and optional `progress` (`0..100`) only when a real numeric source is available.
- Retry action must invoke the existing operation for that shot and respect current generation locks.

- [ ] Add status tests for queued, running without progress, running with 0/intermediate/100 progress, failed with reason, and done.
- [ ] Trace task resource IDs to storyboard IDs and determine whether backend progress is available; do not infer a percentage from elapsed time.
- [ ] Pass status/progress/error/retry action to each card and render accessible localized states.
- [ ] If no numeric progress source exists, show indeterminate running state and document that limitation; do not add an API field that has no producer.
- [ ] Verify retry works for failed image/video tasks and does not trigger duplicate simultaneous generation.

### Task 5: Finish FilmCreate styling and responsive widths

**Files:**
- Modify: remaining inline-style SFCs under `frontweb/src/components/filmCreate/`
- Modify: `frontweb/src/views/FilmCreate.vue`, `frontweb/src/views/FilmCreate.css`, and `frontweb/src/styles/theme.css`
- Test: add focused static/source check only if an existing test convention can reliably scope FilmCreate presentation markup.

- [ ] Inventory literal `style="..."` attributes and fixed widths within FilmCreate view/components; exclude dynamic `:style` used for genuinely data-driven positioning/color.
- [ ] Migrate inline presentation to descriptive local classes in batches: asset blocks (Character/Prop/Scene), storyboard cards/dialogs, then remaining FilmCreate sections.
- [ ] Replace fixed widths that clip English labels with bounded/flexible sizing; keep intentional numeric media dimensions where required.
- [ ] Add responsive rules for the controls and wrapping behavior at widths below 960px and at 1024×700.
- [ ] Re-run the inventory and record the remaining intentional inline/dynamic styles with rationale.
- [ ] Run frontend tests and build after each batch; confirm no horizontal overflow in the tested browser viewports.

### Task 6: Audit accessibility and WCAG AA contrast

**Files:**
- Modify: FilmCreate SFCs and styles where findings require fixes.
- Modify: `frontweb/src/i18n/locales/{en,zh}.js` if accessible names need new translated labels.
- Test: add/update accessibility assertions where the project has a suitable test setup; otherwise record manual keyboard/screen-reader checks.

- [ ] Inventory icon-only interactive controls in FilmCreate and add localized `aria-label` plus tooltip/title where the icon meaning is not otherwise visible.
- [ ] Check semantics and keyboard behavior for clickable headers, cards, menu triggers, dialogs, and retry/status controls.
- [ ] Calculate contrast for normal text (4.5:1), large text (3:1), and non-text controls/focus indicators (3:1) against actual dark/light backgrounds.
- [ ] Fix failing token/component combinations; do not lower contrast by adding opacity to text.
- [ ] Verify keyboard-only operation, focus visibility, Escape behavior, dialog focus return, and accessible status announcements.
- [ ] Record scope, method, theme, and findings; do not label a partial sample as a full-app audit.

### Task 7: Verify navigation, responsive UI, and Electron

**Files:**
- Modify: `frontweb/src/composables/filmCreate/useNavigation.js` and `FilmHeader.vue` only if scroll-spy edge cases are found.
- Modify: `task/update.md` with actual verification evidence.

- [ ] Test scroll-spy across all workflow anchors, including the shared storyboard anchor, near page top/bottom, after restoring saved scroll, and during smooth anchor navigation.
- [ ] Check step status text/counts for empty, partial, failed, running, and completed states; expose failure/empty context where the roadmap requires it.
- [ ] Verify UI at 1440px, 1024px, and 768px (or narrower) in both dark and light themes; inspect overflow, control wrapping, focus, and text truncation.
- [ ] Launch the Electron app at 1024×700 and repeat the critical FilmCreate path; record Electron/runtime version and any environment limitations.
- [ ] Run frontend tests, build, backend tests if backend files changed, and `git diff --check`.
- [ ] Mark Phase 3 complete only after outstanding checklist rows are checked or explicitly split into a follow-up with owner/evidence.

## Completion Gate

- Phase 2 is complete only when Tasks 1–3 pass and `FilmCreate.vue` remains below 800 lines.
- Phase 3 is complete only when Tasks 4–7 pass, remaining inline/fixed sizing is accounted for, contrast and icon audits are documented, and the requested browser/Electron checks have evidence.
- Update `task/update.md` incrementally; leave any criterion unchecked when verification has not actually been performed.
