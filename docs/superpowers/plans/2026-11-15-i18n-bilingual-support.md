# Bilingual (Chinese / English) Localization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement comprehensive English language support across the entire LocalMiniDrama application (frontend UI, components, dialogs, canvas, and backend prompt synchronization) with zero language leaks in both Chinese and English modes.

**Architecture:** Build a reactive, zero-dependency Vue 3 i18n core in `frontweb/src/i18n/` with dictionary files (`zh.js`, `en.js`) and dynamic Element Plus locale binding via `ElConfigProvider`. Synchronize active locale bidirectionally with backend `/api/v1/settings/language` so backend AI generation prompts automatically follow the selected language. Add a persistent language switch toggle to headers and views.

**Tech Stack:** Vue 3, Pinia, Element Plus (`zhCn` & `en` locales), Vite, Node.js / Express backend settings API.

**Spec:** Requirement from user: "tambahkan bahasa inggris untuk aplikasi ini, analisa dulu code nya dan terapkan bahasa inggris. pastikan tidak ada bahasa yang bocor di keduanya."

## Global Constraints

- Pure JavaScript (no TypeScript) throughout frontend and backend.
- Both Chinese (`zh`) and English (`en`) must be 100% supported: when `zh` is active, no untranslated English strings; when `en` is active, no hardcoded Chinese strings.
- Element Plus internal UI (pagination, dialog buttons, popconfirm, date pickers) must reactively switch with the app locale.
- Locale selection must persist in `localStorage` and sync with backend `PUT /api/v1/settings/language`.
- Build (`npm run build` in `frontweb`) must pass cleanly with zero lint/syntax errors.

## Review Focus

1. **Language Leaks in Modals & Confirmations**: `ElMessageBox.confirm` and `ElMessage` notifications across views and composables must use `t(...)` instead of hardcoded Chinese.
2. **Canvas Node & Panel Texts**: Vue Flow custom nodes (`CanvasEpisodeNode`, `CanvasAssetNode`, `CanvasStoryboardNode`, etc.) and side panels must render localized text.
3. **Style Picker & Constant Options**: `styleOptions.js` preset labels, aspect ratio options, camera angles, shot types, and role dropdowns must display in English when English is selected.
4. **Backend Prompt Language Synchronization**: Switching language in UI must trigger `/api/v1/settings/language` update so `promptI18n.js` in backend outputs matching English prompts.
5. **Fallback Safety**: Any missing translation key must safely fallback to the opposing language without crashing or showing blank text.

---

## Tasks

### Task 1: Create i18n Core Engine & Dictionaries

**Files:**
- Create: `frontweb/src/i18n/index.js`
- Create: `frontweb/src/i18n/locales/zh.js`
- Create: `frontweb/src/i18n/locales/en.js`
- Modify: `frontweb/src/main.js`
- Modify: `frontweb/src/App.vue`
- Test: `frontweb/test/i18n.test.js`

**Steps:**
- [ ] Write `frontweb/src/i18n/locales/zh.js` containing categorized Chinese keys: `common`, `header`, `filmList`, `filmCreate`, `dramaCanvas`, `dramaDetail`, `aiConfig`, `agent`, `storyboard`, `assets`, `universalOmni`, `styleOptions`.
- [ ] Write `frontweb/src/i18n/locales/en.js` containing exact 1-to-1 English translations for all keys in `zh.js`.
- [ ] Write `frontweb/src/i18n/index.js`:
  - Reactive `currentLocale` ('zh' or 'en') initialized from `localStorage` or browser language.
  - `t(key, params)` helper supporting nested keys and `{param}` interpolation.
  - `setLocale(lang)` helper that updates `currentLocale`, writes to `localStorage`, and calls `/api/v1/settings/language`.
  - `elementLocale` computed property mapping `zh` -> `element-plus/dist/locale/zh-cn.mjs` and `en` -> `element-plus/dist/locale/en.mjs`.
  - Vue plugin exposing `$t` and `$locale` globally.
- [ ] Update `frontweb/src/main.js` and `frontweb/src/App.vue` to mount i18n plugin and dynamically bind `ElConfigProvider` locale.
- [ ] Add unit test `frontweb/test/i18n.test.js` verifying key parity between `zh.js` and `en.js` (no missing keys), interpolation, and fallback.
- [ ] Run test: `node --test frontweb/test/i18n.test.js`.

### Task 2: Implement Language Switcher Component & Header Integration

**Files:**
- Create: `frontweb/src/components/LanguageToggle.vue`
- Modify: `frontweb/src/views/FilmList.vue`
- Modify: `frontweb/src/views/FilmCreate.vue`
- Modify: `frontweb/src/views/DramaCanvas.vue`
- Modify: `frontweb/src/views/DramaDetail.vue`
- Modify: `frontweb/src/views/AiConfig.vue`

**Steps:**
- [ ] Create `LanguageToggle.vue`: clean button toggle (e.g. `中文 / EN`) with tooltip and active state styling matching theme.
- [ ] Add `LanguageToggle` to `FilmList.vue` header actions.
- [ ] Add `LanguageToggle` to `FilmCreate.vue` header.
- [ ] Add `LanguageToggle` to `DramaCanvas.vue` header / floating toolbar.
- [ ] Add `LanguageToggle` to `DramaDetail.vue` header.
- [ ] Add `LanguageToggle` to `AiConfig.vue` header.
- [ ] Verify switching immediately updates UI text and calls backend settings API.

### Task 3: Localize FilmList & Project Management

**Files:**
- Modify: `frontweb/src/views/FilmList.vue`
- Modify: `frontweb/src/views/MediaLibrary.vue`
- Modify: `frontweb/src/views/FreeCreate.vue`

**Steps:**
- [ ] Replace all hardcoded Chinese in `FilmList.vue`:
  - Header: logo subtitle, library buttons ("素材角色", "素材场景", "素材道具"), theme toggle, AI config button, import/new project buttons.
  - Quick start card: "快速开始", "新建短剧项目", "导入短剧项目", beginner hints, example projects.
  - Project cards: status badges, action tooltips ("导出项目", "编辑", "删除"), empty states ("未命名项目", "暂无描述").
  - Modals & dialogs: Create/edit project dialog, delete confirmation dialog (`ElMessageBox`), import error/success toasts (`ElMessage`).
  - Public library dialogs (Character, Scene, Prop libraries).
- [ ] Localize `MediaLibrary.vue` and `FreeCreate.vue`.
- [ ] Run build test to verify compilation.

### Task 4: Localize FilmCreate, Composables & Asset Management

**Files:**
- Modify: `frontweb/src/views/FilmCreate.vue`
- Modify: `frontweb/src/composables/filmCreate/useCharacters.js`
- Modify: `frontweb/src/composables/filmCreate/useScenes.js`
- Modify: `frontweb/src/composables/filmCreate/useProps.js`
- Modify: `frontweb/src/composables/filmCreate/useNavigation.js`
- Modify: `frontweb/src/composables/useStoryGeneration.js`
- Modify: `frontweb/src/components/Sd2AssetManagement.vue`
- Modify: `frontweb/src/components/SceneModelMap.vue`
- Modify: `frontweb/src/components/EpisodeBatchImportDialog.vue`
- Modify: `frontweb/src/components/UniversalSegmentOmniAtEditor.vue`

**Steps:**
- [ ] Localize `FilmCreate.vue`:
  - Step navigation: Story outline, Characters, Scenes, Props, Storyboard breakdown, Video generation.
  - Tab panels and toolbar buttons: "提取角色", "批量生成", "添加角色", "保存", "刷新", etc.
  - Story generation settings: Episode count, style selection, premise textarea, generate button, progress indicators.
  - Character, scene, prop detail forms and image generation controls.
- [ ] Localize messages and dialogs in `useCharacters.js`, `useScenes.js`, `useProps.js`, and `useStoryGeneration.js`.
- [ ] Localize helper components: `Sd2AssetManagement.vue`, `SceneModelMap.vue`, `EpisodeBatchImportDialog.vue`, `UniversalSegmentOmniAtEditor.vue`.
- [ ] Run build test to verify compilation.

### Task 5: Localize DramaCanvas & Custom Flow Nodes

**Files:**
- Modify: `frontweb/src/views/DramaCanvas.vue`
- Modify: `frontweb/src/components/dramaCanvas/CanvasEpisodeNode.vue`
- Modify: `frontweb/src/components/dramaCanvas/CanvasAssetNode.vue`
- Modify: `frontweb/src/components/dramaCanvas/CanvasScriptNode.vue`
- Modify: `frontweb/src/components/dramaCanvas/CanvasStoryboardNode.vue`
- Modify: `frontweb/src/components/dramaCanvas/CanvasMediaNode.vue`
- Modify: `frontweb/src/components/dramaCanvas/CanvasAddButtonNode.vue`
- Modify: `frontweb/src/components/dramaCanvas/CanvasContextMenu.vue`
- Modify: `frontweb/src/components/dramaCanvas/CanvasFloatingToolbar.vue`
- Modify: `frontweb/src/components/dramaCanvas/CanvasFlowAligner.vue`
- Modify: `frontweb/src/components/dramaCanvas/CanvasAssetPanel.vue`
- Modify: `frontweb/src/components/dramaCanvas/CanvasScriptPanel.vue`
- Modify: `frontweb/src/components/dramaCanvas/CanvasStoryboardPanel.vue`
- Modify: `frontweb/src/components/dramaCanvas/CanvasMediaPanel.vue`
- Modify: `frontweb/src/components/dramaCanvas/CanvasCreateDialog.vue`
- Modify: `frontweb/src/components/dramaCanvas/CanvasNodeStatusOverlay.vue`

**Steps:**
- [ ] Localize `DramaCanvas.vue` top toolbar, zoom controls, workflow runner, export actions.
- [ ] Localize all canvas nodes (Episode, Asset, Script, Storyboard, Media, AddButton, StatusOverlay).
- [ ] Localize side panels (AssetPanel, ScriptPanel, StoryboardPanel, MediaPanel, CreateDialog).
- [ ] Localize canvas context menu and alignment tools.
- [ ] Run build test to verify compilation.

### Task 6: Localize DramaDetail, AI Config & Agent Assistant

**Files:**
- Modify: `frontweb/src/views/DramaDetail.vue`
- Modify: `frontweb/src/views/AiConfig.vue`
- Modify: `frontweb/src/components/AIConfigContent.vue`
- Modify: `frontweb/src/components/PromptEditor.vue`
- Modify: `frontweb/src/components/AgentDrawer.vue`
- Modify: `frontweb/src/constants/styleOptions.js`
- Modify: `frontweb/src/components/StylePickerButton.vue`

**Steps:**
- [ ] Localize `DramaDetail.vue`: Episode cards, video merge status, tail-link operations, video player preview, export.
- [ ] Localize `AiConfig.vue` & `AIConfigContent.vue`: Model selector, API key input, base URL, test connection, prompt template overrides.
- [ ] Localize `PromptEditor.vue`: Default prompts, system prompt overrides, reset buttons.
- [ ] Localize `AgentDrawer.vue`: Assistant dialogue headers, suggested commands, thinking state, error banners.
- [ ] Localize `styleOptions.js` and `StylePickerButton.vue`: Add English labels for style categories and presets; render according to active locale.
- [ ] Run build test to verify compilation.

### Task 7: Comprehensive Verification & Anti-Leak Audit

**Files:**
- Create: `frontweb/test/anti-leak.test.js`
- Run: `cd frontweb && npm run build`
- Run: `cd frontweb && node --test test/*.test.js`

**Steps:**
- [ ] Write `frontweb/test/anti-leak.test.js`:
  - Automated check scanning `locales/zh.js` and `locales/en.js` to assert 100% key parity (zero missing keys in EN, zero extra untranslated keys).
  - Assert that all values in `locales/en.js` do NOT contain Chinese characters (`/[\u4e00-\u9fa5]/`), ensuring no Chinese leaked into the English dictionary.
  - Assert that all values in `locales/zh.js` contain proper Chinese descriptions.
- [ ] Run `node --test test/*.test.js` in `frontweb`.
- [ ] Run `npm run build` in `frontweb` to confirm production bundle builds without errors.
- [ ] Verify backend `/api/v1/settings/language` endpoint responds correctly for both `zh` and `en`.
