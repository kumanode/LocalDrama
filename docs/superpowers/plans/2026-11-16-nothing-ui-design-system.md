# LocalMiniDrama Nothing UI Design System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform LocalMiniDrama's frontend visual design into the Nothing UI industrial design system (mechanical honesty, monochrome canvas, 3-layer Swiss typography hierarchy, zero soft gradients/shadows/shimmers) as specified in `docs/design.md`.

**Architecture:** Centralized CSS token architecture in `frontweb/src/styles/theme.css` with dark/light mode token parity and complete Element Plus variable overrides, local font bundling (`@fontsource/space-grotesk` & `@fontsource/space-mono`) with CJK fallback, bespoke brutalist UI primitives (`SegmentedProgress.vue`, bracketed status tags, inline feedback indicators), and systematic purging of soft aesthetic chrome (gradients, glassmorphism, drop-shadows, hover lifts) across all Vue views and components.

**Tech Stack:** Vue 3, Pinia, Element Plus, CSS Custom Properties (Variables), @fontsource, Vite, Node.js built-in test runner (`node:test`).

**Spec:** `docs/design.md`

## Global Constraints

- Fonte token source: `frontweb/src/styles/theme.css` is the single source of truth for color, radius, and font variables.
- Component library: Element Plus. Styles are altered strictly via `--el-*` CSS variables and targeted class overrides, never by replacing Element Plus components.
- Theme switching: `html.dark` and `html.light`, controlled by `frontweb/src/composables/useTheme.js` (persisted in `localStorage` key `lmd-theme`).
- Language support: Both Chinese (`zh`) and English (`en`) (`frontweb/src/i18n/`). All typography must be safe for CJK text; tracking is disabled for `zh` (`html:lang(zh)`).
- No inline/hardcoded hex or rgba values in new `.vue` code: all styling must consume `var(--token)`.
- Forbidden chrome patterns:
  - ❌ No color gradients on chrome (including logo gradients, header gradients, and button gradients).
  - ❌ No drop-shadows on cards or headers; no hover hover lift / float (`transform: translateY(...)`).
  - ❌ No `backdrop-filter` or glassmorphism.
  - ❌ No bounce or spring animations.
  - ❌ No shimmer or `el-skeleton`.
- Urgent interrupt color (`#D71921`) is reserved exclusively for: destructive actions, task/generation failure (`[ERR]`, `[FAILED]`), running indicator dot (`●`), and form validation error messages.
- Container radius constraint: maximum radius for containers/cards/dialogs is `12px` (`--radius-lg`). Primary buttons use `--radius-pill` (`9999px`).
- WCAG AA contrast standard: text contrast on surfaces must meet or exceed 4.5:1.

## Review Focus

1. **CJK Letter-Spacing & Uppercase Distortion**: Space Grotesk tracking (`+0.05em`) or `text-transform: uppercase` applied to Chinese characters causes visual glyph distortion. Verify `html:lang(zh) .meta-label, html:lang(zh) .el-button { letter-spacing: 0; text-transform: none; }` and verify `setLocale()` updates `document.documentElement.lang`.
2. **Primary Button Contrast Inversion in Dark Mode**: Dark mode primary color is `#FFFFFF`. Verify `.el-button--primary` forces `--el-button-text-color: var(--bg-page)` (black) for both default and hover states so text never renders white-on-white.
3. **Dark Mode Error Text Contrast**: Using `#D71921` as text on dark surfaces (`#0D0D0D`) yields 3.8:1 (fails WCAG AA 4.5:1). Dark mode error text must use `--danger-text: #FF4D4F` (6.0:1) while dots, borders, and fills retain `#D71921`.
4. **Element Plus Dark Variable Parity**: Without explicit `html.dark` override variables (`--el-bg-color`, `--el-text-color-*`, `--el-border-color*`, `--el-fill-color*`), Element Plus components bleed default white/light backgrounds in dark mode. Verify complete `html.dark` override mapping in `theme.css`.
5. **SegmentedProgress Edge Cases & Segment Clamping**: Verify `SegmentedProgress.vue` safely clamps progress when `value` is negative, NaN, 0, or exceeds 100%, without exceeding configured segment slots (10 or 20) or breaking flex layout.

---

## Tasks

### Task 1: Typography Foundation — Local Fonts Bundling & i18n Root Sync

**Files:**
- Modify: `frontweb/package.json`
- Modify: `frontweb/src/main.js`
- Modify: `frontweb/src/i18n/index.js:118-130`
- Create: `frontweb/test/design-system-foundation.test.js`

**Interfaces:**
- Consumes: `@fontsource/space-grotesk`, `@fontsource/space-mono`
- Produces: `document.documentElement.lang` synced with active locale (`zh-CN` or `en`), local font CSS imports in `main.js`.

- [ ] **Step 1: Write the failing test for foundation fonts and i18n language attribute sync**

Create `frontweb/test/design-system-foundation.test.js`:
```javascript
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const testDir = path.dirname(fileURLToPath(import.meta.url))
const frontwebDir = path.resolve(testDir, '..')

test('foundation: package.json includes @fontsource packages', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(frontwebDir, 'package.json'), 'utf8'))
  assert.ok(pkg.dependencies['@fontsource/space-grotesk'], 'missing @fontsource/space-grotesk')
  assert.ok(pkg.dependencies['@fontsource/space-mono'], 'missing @fontsource/space-mono')
})

test('foundation: main.js imports local space-grotesk and space-mono fonts', () => {
  const mainContent = fs.readFileSync(path.join(frontwebDir, 'src/main.js'), 'utf8')
  assert.match(mainContent, /@fontsource\/space-grotesk/, 'main.js must import space-grotesk')
  assert.match(mainContent, /@fontsource\/space-mono/, 'main.js must import space-mono')
})

test('foundation: i18n setLocale updates document.documentElement.lang', async () => {
  const i18nContent = fs.readFileSync(path.join(frontwebDir, 'src/i18n/index.js'), 'utf8')
  assert.match(i18nContent, /document\.documentElement\.lang\s*=/, 'setLocale must set document.documentElement.lang')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test frontweb/test/design-system-foundation.test.js`
Expected: FAIL with missing font packages or failed regex match.

- [ ] **Step 3: Implement dependencies, font imports, and i18n html lang sync**

1. Install font packages in `frontweb/`:
   `cd frontweb && npm install --save @fontsource/space-grotesk @fontsource/space-mono`
2. In `frontweb/src/main.js`, add imports at the top:
   ```javascript
   import '@fontsource/space-grotesk/400.css'
   import '@fontsource/space-grotesk/600.css'
   import '@fontsource/space-grotesk/700.css'
   import '@fontsource/space-mono/400.css'
   import '@fontsource/space-mono/700.css'
   ```
3. In `frontweb/src/i18n/index.js`, update `setLocale` to set `document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en'`, and synchronize upon initial evaluation if `typeof document !== 'undefined'`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test frontweb/test/design-system-foundation.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontweb/package.json frontweb/package-lock.json frontweb/src/main.js frontweb/src/i18n/index.js frontweb/test/design-system-foundation.test.js
git commit -m "feat(ui): add local Space Grotesk/Mono fonts and sync document lang attribute"
```

---

### Task 2: Core CSS Tokens & Typography Hierarchy in `theme.css`

**Files:**
- Modify: `frontweb/src/styles/theme.css:1-65`
- Create: `frontweb/test/design-system-tokens.test.js`

**Interfaces:**
- Consumes: Nothing UI specifications from `docs/design.md` §2, §3, §4, §7
- Produces: CSS variables for colors, typography scale, spacing (`--space-1` to `--space-8`), radii (`--radius-none` to `--radius-pill`), motion tokens (`--ease-mech`, `--dur-fast`, `--dur-base`), and CJK letter-spacing override.

- [ ] **Step 1: Write the failing test for Nothing UI token definitions**

Create `frontweb/test/design-system-tokens.test.js`:
```javascript
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const testDir = path.dirname(fileURLToPath(import.meta.url))
const themePath = path.resolve(testDir, '../src/styles/theme.css')

test('tokens: theme.css defines Nothing UI font stacks and scale', () => {
  const css = fs.readFileSync(themePath, 'utf8')
  assert.match(css, /--font-sans:\s*'Space Grotesk'/, 'must define --font-sans with Space Grotesk')
  assert.match(css, /--font-mono:\s*'Space Mono'/, 'must define --font-mono with Space Mono')
  assert.match(css, /--font-xs:\s*11px/, 'must define --font-xs as 11px')
  assert.match(css, /--font-sm:\s*13px/, 'must define --font-sm as 13px')
  assert.match(css, /--font-md:\s*14px/, 'must define --font-md as 14px')
  assert.match(css, /--font-lg:\s*16px/, 'must define --font-lg as 16px')
  assert.match(css, /--font-xl:\s*24px/, 'must define --font-xl as 24px')
  assert.match(css, /--font-display:\s*48px/, 'must define --font-display as 48px')
})

test('tokens: theme.css defines dark and light monochrome palettes with AA contrast', () => {
  const css = fs.readFileSync(themePath, 'utf8')
  // Dark mode
  assert.match(css, /--bg-page:\s*#000000/, 'dark --bg-page must be #000000')
  assert.match(css, /--bg-card:\s*#0D0D0D/i, 'dark --bg-card must be #0D0D0D')
  assert.match(css, /--bg-inner:\s*#121212/, 'dark --bg-inner must be #121212')
  assert.match(css, /--border-color:\s*#262626/, 'dark --border-color must be #262626')
  assert.match(css, /--border-muted:\s*#3A3A3A/i, 'dark --border-muted must be #3A3A3A')
  assert.match(css, /--text-bright:\s*#FFFFFF/i, 'dark --text-bright must be #FFFFFF')
  assert.match(css, /--danger-text:\s*#FF4D4F/i, 'dark --danger-text must be #FF4D4F')

  // Light mode
  assert.match(css, /--bg-page:\s*#F4F4F2/i, 'light --bg-page must be #F4F4F2')
  assert.match(css, /--bg-card:\s*#FFFFFF/i, 'light --bg-card must be #FFFFFF')
  assert.match(css, /--bg-inner:\s*#FAFAF8/i, 'light --bg-inner must be #FAFAF8')
  assert.match(css, /--border-color:\s*#D8D7D3/i, 'light --border-color must be #D8D7D3')
  assert.match(css, /--border-muted:\s*#B5B4B0/i, 'light --border-muted must be #B5B4B0')
  assert.match(css, /--text-bright:\s*#000000/, 'light --text-bright must be #000000')
})

test('tokens: theme.css defines radius tokens including pill and none, and shadow: none', () => {
  const css = fs.readFileSync(themePath, 'utf8')
  assert.match(css, /--radius-none:\s*0/, 'must define --radius-none: 0')
  assert.match(css, /--radius-sm:\s*4px/, 'must define --radius-sm: 4px')
  assert.match(css, /--radius-md:\s*8px/, 'must define --radius-md: 8px')
  assert.match(css, /--radius-lg:\s*12px/, 'must define --radius-lg: 12px')
  assert.match(css, /--radius-pill:\s*9999px/, 'must define --radius-pill: 9999px')
  assert.match(css, /--shadow:\s*none/, 'must define --shadow: none')
})

test('tokens: theme.css disables tracking on Chinese text', () => {
  const css = fs.readFileSync(themePath, 'utf8')
  assert.match(css, /html:lang\(zh\)\s+\.meta-label[\s\S]*?letter-spacing:\s*0/, 'zh meta-label tracking must be 0')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test frontweb/test/design-system-tokens.test.js`
Expected: FAIL with unmatched tokens.

- [ ] **Step 3: Update tokens in `frontweb/src/styles/theme.css`**

Update `:root, html.dark` and `html.light` blocks in `frontweb/src/styles/theme.css`:
1. Dark mode tokens:
   - `--bg-page: #000000`
   - `--bg-card: #0D0D0D`
   - `--bg-inner: #121212`
   - `--surface-2: #121212`
   - `--bg-hover: #1A1A1A`
   - `--border-color: #262626`
   - `--border-muted: #3A3A3A`
   - `--text-bright: #FFFFFF`
   - `--text-primary: #E6E6E6`
   - `--text-muted: #A3A3A3`
   - `--text-secondary: #A3A3A3`
   - `--text-subtle: #808080`
   - `--text-faint: #808080`
   - `--danger-text: #FF4D4F`
   - `--danger-soft: rgba(215, 25, 33, 0.14)`
   - `--shadow: none`
2. Light mode tokens:
   - `--bg-page: #F4F4F2`
   - `--bg-card: #FFFFFF`
   - `--bg-inner: #FAFAF8`
   - `--surface-2: #FAFAF8`
   - `--bg-hover: #EDEDEA`
   - `--border-color: #D8D7D3`
   - `--border-muted: #B5B4B0`
   - `--text-bright: #000000`
   - `--text-primary: #111111`
   - `--text-muted: #4F4E4B`
   - `--text-secondary: #4F4E4B`
   - `--text-subtle: #6E6D69`
   - `--text-faint: #6E6D69`
   - `--danger-text: #D71921`
   - `--danger-soft: #fef2f2`
   - `--shadow: none`
3. Layout & Typography in `:root`:
   - `--font-sans: 'Space Grotesk', 'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', system-ui, sans-serif;`
   - `--font-mono: 'Space Mono', ui-monospace, 'Cascadia Mono', Consolas, 'PingFang SC', 'Microsoft YaHei', monospace;`
   - Scale: `--font-xs: 11px`, `--font-sm: 13px`, `--font-md: 14px`, `--font-lg: 16px`, `--font-xl: 24px`, `--font-display: 48px`
   - Spacing: `--space-1: 4px`, `--space-2: 8px`, `--space-3: 12px`, `--space-4: 16px`, `--space-5: 24px`, `--space-6: 32px`, `--space-7: 48px`, `--space-8: 64px`
   - Radius: `--radius-none: 0`, `--radius-sm: 4px`, `--radius-md: 8px`, `--radius-lg: 12px`, `--radius-pill: 9999px`
   - Motion: `--ease-mech: cubic-bezier(0, 0, 0.2, 1)`, `--dur-fast: 120ms`, `--dur-base: 180ms`
4. CJK letter-spacing rule:
   ```css
   html:lang(zh) .meta-label,
   html:lang(zh) .el-button {
     letter-spacing: 0 !important;
     text-transform: none !important;
   }
   ```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test frontweb/test/design-system-tokens.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontweb/src/styles/theme.css frontweb/test/design-system-tokens.test.js
git commit -m "feat(ui): update core Nothing UI tokens, typography scale, and CJK tracking rule"
```

---

### Task 3: Element Plus Mechanical Honesty Overrides & Legacy Purple Purge

**Files:**
- Modify: `frontweb/src/styles/theme.css`
- Create: `frontweb/test/design-system-element-plus.test.js`

**Interfaces:**
- Consumes: Semantic Element Plus specifications from `docs/design.md` §3.3, §5.B, §5.C, §5.D, §5.F
- Produces: Complete purge of `#7c3aed` and legacy enhancement block; dark & light Element Plus token bindings; brutalist styling for buttons, switch, tags, and message toasts.

- [ ] **Step 1: Write the failing test for Element Plus overrides and purple purge**

Create `frontweb/test/design-system-element-plus.test.js`:
```javascript
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const testDir = path.dirname(fileURLToPath(import.meta.url))
const themePath = path.resolve(testDir, '../src/styles/theme.css')

test('element-plus: legacy purple block #7c3aed is purged from theme.css', () => {
  const css = fs.readFileSync(themePath, 'utf8')
  assert.doesNotMatch(css, /#7c3aed/i, 'theme.css must not contain purple #7c3aed')
  assert.doesNotMatch(css, /亮色模式增强/, 'theme.css must not contain legacy enhancement block')
})

test('element-plus: html.dark defines complete Element Plus base variable overrides', () => {
  const css = fs.readFileSync(themePath, 'utf8')
  assert.match(css, /html\.dark\s*\{[\s\S]*?--el-bg-color:\s*var\(--bg-card\)/, 'html.dark must override --el-bg-color')
  assert.match(css, /html\.dark\s*\{[\s\S]*?--el-text-color-primary:\s*var\(--text-primary\)/, 'html.dark must override --el-text-color-primary')
  assert.match(css, /html\.dark\s*\{[\s\S]*?--el-border-color:\s*var\(--border-color\)/, 'html.dark must override --el-border-color')
})

test('element-plus: primary button has inverted text color and pill radius', () => {
  const css = fs.readFileSync(themePath, 'utf8')
  assert.match(css, /\.el-button--primary[\s\S]*?--el-button-text-color:\s*var\(--bg-page\)/, 'primary button text color must invert to --bg-page')
  assert.match(css, /\.el-button--primary[\s\S]*?border-radius:\s*var\(--radius-pill\)/, 'primary button must have radius-pill')
})

test('element-plus: el-switch has mechanical styling without knob shadow', () => {
  const css = fs.readFileSync(themePath, 'utf8')
  assert.match(css, /\.el-switch/, 'must contain custom el-switch styling')
})

test('element-plus: el-message has brutalist bracket prefix and flat styling', () => {
  const css = fs.readFileSync(themePath, 'utf8')
  assert.match(css, /\.el-message--error::before[\s\S]*?content:\s*'\\[ERR\\]'/, 'error message must have [ERR] prefix')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test frontweb/test/design-system-element-plus.test.js`
Expected: FAIL with purple `#7c3aed` found and missing dark overrides.

- [ ] **Step 3: Refactor Element Plus overrides in `theme.css`**

1. Delete lines 280-490 of `frontweb/src/styles/theme.css` (the entire "亮色模式增强" section containing `#7c3aed`, gradients, and hover lifts).
2. Configure semantic Element Plus primary scale for both dark and light modes:
   - `html.dark`: `--el-color-primary: #FFFFFF; --el-color-primary-light-3: #B3B3B3; --el-color-primary-light-5: #808080; --el-color-primary-light-7: #4D4D4D; --el-color-primary-light-8: #333333; --el-color-primary-light-9: #1A1A1A; --el-color-primary-dark-2: #CCCCCC;`
   - `html.light`: `--el-color-primary: #111111; --el-color-primary-light-3: #585858; --el-color-primary-light-5: #888888; --el-color-primary-light-7: #B8B8B8; --el-color-primary-light-8: #D0D0D0; --el-color-primary-light-9: #E8E8E8; --el-color-primary-dark-2: #000000;`
   - Danger: `--el-color-danger: #D71921`
   - Warning: dark `#E5A93C`, light `#8F6310`
   - Success: `var(--text-bright)`
   - Info: `var(--text-secondary)`
3. Add `html.dark` Element Plus base overrides:
   ```css
   html.dark {
     --el-bg-color: var(--bg-card);
     --el-bg-color-page: var(--bg-page);
     --el-bg-color-overlay: var(--bg-card);
     --el-text-color-primary: var(--text-primary);
     --el-text-color-regular: var(--text-primary);
     --el-text-color-secondary: var(--text-muted);
     --el-text-color-placeholder: var(--text-faint);
     --el-border-color: var(--border-color);
     --el-border-color-light: var(--border-muted);
     --el-border-color-lighter: var(--border-muted);
     --el-fill-color: var(--bg-inner);
     --el-fill-color-blank: var(--bg-card);
     --el-fill-color-light: var(--bg-hover);
     --el-fill-color-lighter: var(--bg-hover);
     --el-mask-color: rgba(0, 0, 0, 0.72);
   }
   ```
4. Style Buttons (§5.D):
   - Primary: pill radius (`var(--radius-pill)`), font-weight 600, inverted text (`--el-button-text-color: var(--bg-page); --el-button-hover-text-color: var(--bg-page);`).
   - Default (Technical): background transparent, border `1px solid var(--border-muted)`, radius `var(--radius-sm)`, text `var(--text-primary)`, hover border `var(--text-bright)`.
   - Danger: transparent bg, border `1px solid var(--el-color-danger)`, text `var(--el-color-danger)`.
   - Text/Link: no border, muted, hover text `var(--text-bright)` with underline.
5. Style Switches (§5.B):
   - Active: background `var(--text-bright)`, knob `var(--bg-page)`.
   - Inactive: background `var(--bg-inner)`, border `1px solid var(--border-muted)`, knob `var(--text-muted)`.
   - Radius `var(--radius-sm)`, zero box-shadow.
6. Style Tags (§5.C):
   - Font `var(--font-mono)`, `var(--font-xs)`, uppercase, bracket format `[IDLE]`, `[QUEUED]`, `[RUNNING ●]`, `[DONE]`.
   - Transparent background, border `1px solid var(--border-muted)`, radius `var(--radius-sm)`.
7. Style `ElMessage` (§5.F):
   - Background `var(--bg-card)`, border `1px solid var(--border-muted)` (red for error), radius `var(--radius-sm)`, zero shadow, mono font.
   - Pseudo-element `::before`: `[ERR] ` for error, `[WARN] ` for warning, `[OK] ` for success.
8. Style Dialog & Overlay (§4):
   - Mask: solid semi-transparent without blur (`rgba(0,0,0,0.72)` dark, `rgba(244,244,242,0.8)` light).
   - Dialog: border `1px solid var(--border-muted)`, radius `var(--radius-lg)`, zero shadow.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test frontweb/test/design-system-element-plus.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontweb/src/styles/theme.css frontweb/test/design-system-element-plus.test.js
git commit -m "feat(ui): implement Element Plus monochrome overrides and purge legacy purple styling"
```

---

### Task 4: Mechanical Specialty Component — `SegmentedProgress.vue`

**Files:**
- Create: `frontweb/src/components/SegmentedProgress.vue`
- Create: `frontweb/test/segmented-progress.test.js`

**Interfaces:**
- Props:
  - `value`: Number (0-100)
  - `max`: Number (default 100)
  - `segments`: Number (default 10, or 20 for wide layout)
  - `status`: String ('normal' | 'exception' | 'success')
  - `showLabel`: Boolean (default true)
- Produces: Brutalist segmented bar `[██████████░░░░░░░░░░] 50%`

- [ ] **Step 1: Write the failing test for SegmentedProgress calculation and rendering logic**

Create `frontweb/test/segmented-progress.test.js`:
```javascript
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const testDir = path.dirname(fileURLToPath(import.meta.url))
const compPath = path.resolve(testDir, '../src/components/SegmentedProgress.vue')

test('segmented-progress: component file exists and contains template & script', () => {
  assert.ok(fs.existsSync(compPath), 'SegmentedProgress.vue must exist')
  const content = fs.readFileSync(compPath, 'utf8')
  assert.match(content, /<template>/, 'must contain template')
  assert.match(content, /<script setup>/, 'must contain script setup')
})

test('segmented-progress: calculation logic correctly computes filled segments and percentage', () => {
  function computeSegments(value, max = 100, totalSegments = 10) {
    const clamped = Math.max(0, Math.min(max, Number(value) || 0))
    const ratio = max > 0 ? clamped / max : 0
    const filledCount = Math.round(ratio * totalSegments)
    const percentage = Math.round(ratio * 100)
    return { filledCount, percentage }
  }

  assert.deepEqual(computeSegments(50, 100, 10), { filledCount: 5, percentage: 50 })
  assert.deepEqual(computeSegments(0, 100, 10), { filledCount: 0, percentage: 0 })
  assert.deepEqual(computeSegments(100, 100, 10), { filledCount: 10, percentage: 100 })
  assert.deepEqual(computeSegments(-20, 100, 10), { filledCount: 0, percentage: 0 })
  assert.deepEqual(computeSegments(150, 100, 10), { filledCount: 10, percentage: 100 })
  assert.deepEqual(computeSegments(23, 100, 20), { filledCount: 5, percentage: 23 })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test frontweb/test/segmented-progress.test.js`
Expected: FAIL because `SegmentedProgress.vue` does not exist yet.

- [ ] **Step 3: Implement `SegmentedProgress.vue`**

Create `frontweb/src/components/SegmentedProgress.vue`:
```vue
<template>
  <div class="segmented-progress" :class="{ 'is-exception': status === 'exception' }">
    <div class="segmented-progress__track" :style="{ '--segment-count': totalSegments }">
      <div
        v-for="i in totalSegments"
        :key="i"
        class="segmented-progress__segment"
        :class="{ 'is-filled': i <= filledCount }"
      />
    </div>
    <span v-if="showLabel" class="segmented-progress__label">
      {{ percentage }}%
    </span>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  value: {
    type: Number,
    default: 0,
  },
  max: {
    type: Number,
    default: 100,
  },
  segments: {
    type: Number,
    default: 10,
  },
  status: {
    type: String,
    default: 'normal', // 'normal' | 'exception' | 'success'
  },
  showLabel: {
    type: Boolean,
    default: true,
  },
})

const totalSegments = computed(() => Math.max(1, props.segments || 10))

const clampedValue = computed(() => {
  const val = Number(props.value)
  if (isNaN(val)) return 0
  return Math.max(0, Math.min(props.max, val))
})

const percentage = computed(() => {
  if (props.max <= 0) return 0
  return Math.round((clampedValue.value / props.max) * 100)
})

const filledCount = computed(() => {
  if (props.max <= 0) return 0
  return Math.round((clampedValue.value / props.max) * totalSegments.value)
})
</script>

<style scoped>
.segmented-progress {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
}

.segmented-progress__track {
  display: grid;
  grid-template-columns: repeat(var(--segment-count), 1fr);
  gap: 2px;
  flex: 1;
  height: 6px;
}

.segmented-progress__segment {
  background: var(--border-color);
  border-radius: var(--radius-none);
  transition: background-color var(--dur-fast) var(--ease-mech);
}

.segmented-progress__segment.is-filled {
  background: var(--text-bright);
}

.segmented-progress.is-exception .segmented-progress__segment.is-filled {
  background: var(--el-color-danger);
}

.segmented-progress__label {
  font-family: var(--font-mono);
  font-size: var(--font-xs);
  color: var(--text-muted);
  min-width: 32px;
  text-align: right;
  line-height: 1;
}
</style>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test frontweb/test/segmented-progress.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontweb/src/components/SegmentedProgress.vue frontweb/test/segmented-progress.test.js
git commit -m "feat(ui): add brutalist SegmentedProgress component"
```

---

### Task 5: Integrate `SegmentedProgress` in TaskCenter and MergeExportSection

**Files:**
- Modify: `frontweb/src/components/TaskCenter.vue`
- Modify: `frontweb/src/components/filmCreate/MergeExportSection.vue`
- Create: `frontweb/test/segmented-progress-integration.test.js`

**Interfaces:**
- Consumes: `SegmentedProgress.vue`
- Produces: Brutalist progress bars in task center drawer and merge/export section without `el-progress`.

- [ ] **Step 1: Write the failing test for SegmentedProgress integration**

Create `frontweb/test/segmented-progress-integration.test.js`:
```javascript
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const testDir = path.dirname(fileURLToPath(import.meta.url))
const taskCenterPath = path.resolve(testDir, '../src/components/TaskCenter.vue')
const mergeExportPath = path.resolve(testDir, '../src/components/filmCreate/MergeExportSection.vue')

test('integration: TaskCenter imports and uses SegmentedProgress', () => {
  const content = fs.readFileSync(taskCenterPath, 'utf8')
  assert.match(content, /import SegmentedProgress from/, 'TaskCenter must import SegmentedProgress')
  assert.match(content, /<SegmentedProgress/, 'TaskCenter must render SegmentedProgress')
  assert.doesNotMatch(content, /<el-progress/, 'TaskCenter must not render el-progress')
})

test('integration: MergeExportSection imports and uses SegmentedProgress', () => {
  const content = fs.readFileSync(mergeExportPath, 'utf8')
  assert.match(content, /import SegmentedProgress from/, 'MergeExportSection must import SegmentedProgress')
  assert.match(content, /<SegmentedProgress/, 'MergeExportSection must render SegmentedProgress')
  assert.doesNotMatch(content, /<el-progress/, 'MergeExportSection must not render el-progress')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test frontweb/test/segmented-progress-integration.test.js`
Expected: FAIL because `el-progress` is still used in both components.

- [ ] **Step 3: Update `TaskCenter.vue` and `MergeExportSection.vue`**

1. In `frontweb/src/components/TaskCenter.vue`:
   - Import `SegmentedProgress from './SegmentedProgress.vue'`.
   - Replace `<el-progress ...>` with `<SegmentedProgress :value="task.progress || 0" :status="task.status === 'failed' ? 'exception' : 'normal'" :segments="10" />`.
   - Format status badges to bracket style: `[RUNNING ●]`, `[DONE]`, `[ERR]`.
2. In `frontweb/src/components/filmCreate/MergeExportSection.vue`:
   - Import `SegmentedProgress from '../SegmentedProgress.vue'`.
   - Replace `<el-progress ...>` with `<SegmentedProgress :value="exportProgress" :segments="20" />`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test frontweb/test/segmented-progress-integration.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontweb/src/components/TaskCenter.vue frontweb/src/components/filmCreate/MergeExportSection.vue frontweb/test/segmented-progress-integration.test.js
git commit -m "feat(ui): integrate SegmentedProgress into TaskCenter and MergeExportSection"
```

---

### Task 6: Clean Up Chrome & Views — Navigation, Header, and Project List (`App.vue`, `FilmHeader.vue`, `FilmList.vue`)

**Files:**
- Modify: `frontweb/src/App.vue`
- Modify: `frontweb/src/components/filmCreate/FilmHeader.vue`
- Modify: `frontweb/src/views/FilmList.vue`
- Create: `frontweb/test/design-system-chrome-audit.test.js`

**Interfaces:**
- Consumes: Theme tokens from `theme.css`
- Produces: Header and project cards compliant with Mechanical Honesty (no gradient logos, no `translateY` hover lifts, flat monochrome headers).

- [ ] **Step 1: Write the failing test for chrome gradient and hover lift audit**

Create `frontweb/test/design-system-chrome-audit.test.js`:
```javascript
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const testDir = path.dirname(fileURLToPath(import.meta.url))
const appVuePath = path.resolve(testDir, '../src/App.vue')
const filmListPath = path.resolve(testDir, '../src/views/FilmList.vue')
const filmHeaderPath = path.resolve(testDir, '../src/components/filmCreate/FilmHeader.vue')

test('chrome: App.vue logo and header use solid monochrome without gradients', () => {
  const content = fs.readFileSync(appVuePath, 'utf8')
  assert.doesNotMatch(content, /linear-gradient/, 'App.vue must not use linear-gradient')
  assert.doesNotMatch(content, /-webkit-background-clip:\s*text/, 'App.vue must not use gradient text clip')
})

test('chrome: FilmList.vue project-card and action-card do not use translateY or drop-shadows', () => {
  const content = fs.readFileSync(filmListPath, 'utf8')
  assert.doesNotMatch(content, /translateY/, 'FilmList.vue must not use translateY hover lift')
  assert.doesNotMatch(content, /box-shadow/, 'FilmList.vue must not use box-shadow on cards')
})

test('chrome: FilmHeader.vue does not use gradients or drop-shadows', () => {
  const content = fs.readFileSync(filmHeaderPath, 'utf8')
  assert.doesNotMatch(content, /linear-gradient/, 'FilmHeader.vue must not use linear-gradient')
  assert.doesNotMatch(content, /box-shadow/, 'FilmHeader.vue must not use box-shadow')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test frontweb/test/design-system-chrome-audit.test.js`
Expected: FAIL with forbidden styling patterns found.

- [ ] **Step 3: Refactor `App.vue`, `FilmHeader.vue`, and `FilmList.vue`**

1. In `frontweb/src/App.vue`:
   - Set `.logo` to solid `color: var(--text-bright)`, `font-family: var(--font-sans)`, `font-weight: 700`.
   - Remove `-webkit-background-clip: text` and gradient fills.
   - Header background `var(--bg-card)`, border-bottom `1px solid var(--border-color)`, zero shadow.
2. In `frontweb/src/components/filmCreate/FilmHeader.vue`:
   - Flatten header background to `var(--bg-card)` or `var(--bg-page)`, border-bottom `1px solid var(--border-color)`.
   - Remove all gradients and box-shadows.
3. In `frontweb/src/views/FilmList.vue`:
   - Remove `transform: translateY(-2px)` and box-shadow transitions from `.project-card` and `.action-card`.
   - Replace hover effect with `border-color: var(--text-muted)`.
   - Ensure action card has dashed border `1px dashed var(--border-muted)` with `var(--bg-inner)` background.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test frontweb/test/design-system-chrome-audit.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontweb/src/App.vue frontweb/src/components/filmCreate/FilmHeader.vue frontweb/src/views/FilmList.vue frontweb/test/design-system-chrome-audit.test.js
git commit -m "refactor(ui): purge gradients, shadows, and hover lifts from App, FilmHeader, and FilmList"
```

---

### Task 7: Core Workspace Overhaul — `FilmCreate.css` and `FilmCreate.vue`

**Files:**
- Modify: `frontweb/src/views/FilmCreate.css`
- Modify: `frontweb/src/views/FilmCreate.vue`
- Modify: `frontweb/test/design-system-chrome-audit.test.js`

**Interfaces:**
- Consumes: Nothing UI tokens (`--bg-page`, `--bg-card`, `--border-color`, `--radius-lg`)
- Produces: Brutalist styling for FilmCreate view, eliminating radial gradients, blur backdrops, and purple glows.

- [ ] **Step 1: Write the failing test for `FilmCreate.css` purity**

Append to `frontweb/test/design-system-chrome-audit.test.js`:
```javascript
test('chrome: FilmCreate.css contains no radial-gradient, backdrop-filter, or translateY', () => {
  const filmCreateCss = fs.readFileSync(path.resolve(testDir, '../src/views/FilmCreate.css'), 'utf8')
  assert.doesNotMatch(filmCreateCss, /radial-gradient/, 'FilmCreate.css must not use radial-gradient')
  assert.doesNotMatch(filmCreateCss, /backdrop-filter/, 'FilmCreate.css must not use backdrop-filter')
  assert.doesNotMatch(filmCreateCss, /translateY/, 'FilmCreate.css must not use translateY')
  assert.doesNotMatch(filmCreateCss, /box-shadow/, 'FilmCreate.css must not use box-shadow on cards')
  assert.match(filmCreateCss, /background:\s*var\(--bg-page\)/, 'FilmCreate.css must use var(--bg-page)')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test frontweb/test/design-system-chrome-audit.test.js`
Expected: FAIL because `FilmCreate.css` still contains multiple radial gradients and `backdrop-filter: blur(16px)`.

- [ ] **Step 3: Refactor `FilmCreate.css` and `FilmCreate.vue`**

1. Replace `.film-create` in `FilmCreate.css`:
   ```css
   .film-create {
     min-height: 100vh;
     background: var(--bg-page);
     color: var(--text-primary);
     font-family: var(--font-sans);
   }
   html.light .film-create {
     background: var(--bg-page);
     color: var(--text-primary);
   }
   ```
2. Replace `.card` in `FilmCreate.css`:
   ```css
   .card {
     background: var(--bg-card);
     border-radius: var(--radius-lg);
     padding: var(--space-5);
     border: 1px solid var(--border-color);
     box-shadow: none;
     transition: border-color var(--dur-fast) var(--ease-mech);
   }
   .card:hover {
     border-color: var(--border-muted);
     box-shadow: none;
   }
   html.light .card {
     background: var(--bg-card);
     border-color: var(--border-color);
     box-shadow: none;
     backdrop-filter: none;
     -webkit-backdrop-filter: none;
   }
   html.light .card:hover {
     border-color: var(--border-muted);
     box-shadow: none;
   }
   ```
3. Update `.image-preview-overlay` to solid semi-transparent mask without blur:
   ```css
   .image-preview-overlay {
     position: fixed;
     inset: 0;
     z-index: 9999;
     background: rgba(0, 0, 0, 0.85);
     display: flex;
     align-items: center;
     justify-content: center;
     cursor: pointer;
   }
   ```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test frontweb/test/design-system-chrome-audit.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontweb/src/views/FilmCreate.css frontweb/src/views/FilmCreate.vue frontweb/test/design-system-chrome-audit.test.js
git commit -m "refactor(ui): clean up FilmCreate workspace styles to follow Nothing UI"
```

---

### Task 8: FilmCreate Production Sections & Subcomponents Cleanup

**Files:**
- Modify: `frontweb/src/components/filmCreate/CharacterBlock.vue`
- Modify: `frontweb/src/components/filmCreate/SceneBlock.vue`
- Modify: `frontweb/src/components/filmCreate/PropBlock.vue`
- Modify: `frontweb/src/components/filmCreate/ResourceSection.vue`
- Modify: `frontweb/src/components/filmCreate/ScriptSection.vue`
- Modify: `frontweb/src/components/filmCreate/StoryboardCard.vue`
- Modify: `frontweb/src/components/filmCreate/StoryboardSection.vue`
- Modify: `frontweb/src/components/filmCreate/VideoConfigSection.vue`
- Modify: `frontweb/src/components/filmCreate/PipelinePanel.vue`
- Create: `frontweb/test/film-create-design-system.test.js`

**Interfaces:**
- Consumes: CSS variables (`--bg-inner`, `--border-color`, `--radius-sm`, `--font-mono`), bracket status notation.
- Produces: Storyboard cards, asset cards, and script sections free of hardcoded purple hexes, shadows, and shimmers.

- [ ] **Step 1: Write the failing test for FilmCreate subcomponents**

Create `frontweb/test/film-create-design-system.test.js`:
```javascript
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const testDir = path.dirname(fileURLToPath(import.meta.url))
const fcDir = path.resolve(testDir, '../src/components/filmCreate')

test('filmCreate: storyboard card does not contain translateY or box-shadow hover', () => {
  const sbCard = fs.readFileSync(path.join(fcDir, 'StoryboardCard.vue'), 'utf8')
  assert.doesNotMatch(sbCard, /translateY/, 'StoryboardCard must not use translateY')
  assert.doesNotMatch(sbCard, /box-shadow:\s*0\s+4px/, 'StoryboardCard must not use floating shadow')
})

test('filmCreate: pipeline panel uses mechanical tokens without hardcoded hex colors', () => {
  const pipeline = fs.readFileSync(path.join(fcDir, 'PipelinePanel.vue'), 'utf8')
  assert.doesNotMatch(pipeline, /#7c3aed/i, 'PipelinePanel must not use purple #7c3aed')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test frontweb/test/film-create-design-system.test.js`
Expected: FAIL if `StoryboardCard.vue` or `PipelinePanel.vue` contains purple hex or hover transforms.

- [ ] **Step 3: Update `components/filmCreate/` subcomponents**

1. In `StoryboardCard.vue` and `StoryboardSection.vue`:
   - Replace any hover `transform: translateY(...)` or `box-shadow` with `border-color: var(--text-muted)`.
   - Use `--radius-none` for grid storyboard thumbnails.
   - Standardize metadata badges to bracket notation: `[DONE]`, `[RUNNING ●]`, `[IDLE]`.
   - Maximum 1 primary pill button per card action bar; other controls use technical buttons.
2. In `ResourceSection.vue`, `CharacterBlock.vue`, `SceneBlock.vue`, `PropBlock.vue`:
   - Standardize asset cards to `background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-lg);`.
   - Remove any `el-skeleton` shimmer and replace with mono loading text `[LOADING...]` or segmented indicator.
3. In `ScriptSection.vue` and `PipelinePanel.vue`:
   - Ensure textarea uses `var(--bg-inner)` and `1px solid var(--border-color)`.
   - Ensure pipeline ready and cost indicators use mono numbers and `--font-mono`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test frontweb/test/film-create-design-system.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontweb/src/components/filmCreate/ frontweb/test/film-create-design-system.test.js
git commit -m "refactor(ui): update filmCreate components with brutalist card and badge styling"
```

---

### Task 9: Canvas, Drama Detail, and AI Config Views Overhaul

**Files:**
- Modify: `frontweb/src/views/DramaCanvas.vue`
- Modify: `frontweb/src/components/dramaCanvas/CanvasFloatingToolbar.vue`
- Modify: `frontweb/src/components/dramaCanvas/CanvasContextMenu.vue`
- Modify: `frontweb/src/views/DramaDetail.vue`
- Modify: `frontweb/src/views/AiConfig.vue`
- Modify: `frontweb/src/components/AIConfigContent.vue`
- Modify: `frontweb/src/views/MediaLibrary.vue`
- Modify: `frontweb/src/views/FreeCreate.vue`
- Create: `frontweb/test/design-system-views.test.js`

**Interfaces:**
- Consumes: CSS tokens for surfaces, borders, and buttons
- Produces: Consistent industrial design across secondary views (Canvas, Drama Detail, AI Config, Media Library).

- [ ] **Step 1: Write the failing test for view-level design system compliance**

Create `frontweb/test/design-system-views.test.js`:
```javascript
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const testDir = path.dirname(fileURLToPath(import.meta.url))
const viewsDir = path.resolve(testDir, '../src/views')

test('views: DramaDetail, AiConfig, and MediaLibrary are free of purple #7c3aed', () => {
  const views = ['DramaDetail.vue', 'AiConfig.vue', 'MediaLibrary.vue', 'FreeCreate.vue']
  for (const v of views) {
    const content = fs.readFileSync(path.join(viewsDir, v), 'utf8')
    assert.doesNotMatch(content, /#7c3aed/i, `${v} must not contain #7c3aed`)
  }
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test frontweb/test/design-system-views.test.js`
Expected: FAIL if any tested view contains purple `#7c3aed`.

- [ ] **Step 3: Update views and canvas components**

1. In `DramaCanvas.vue` and `CanvasFloatingToolbar.vue`:
   - Set floating toolbar background to `var(--bg-card)`, border `1px solid var(--border-muted)`, radius `var(--radius-md)`, zero shadow.
   - Canvas nodes use `var(--bg-card)` and `1px solid var(--border-color)`.
2. In `DramaDetail.vue`:
   - Episode cards use `var(--bg-inner)`, border `1px solid var(--border-color)`, hover border `var(--text-muted)` without `translateY`.
3. In `AiConfig.vue` and `AIConfigContent.vue`:
   - Format provider banners and setting groups with monochrome cards and technical buttons.
   - Replace purple accents with monochrome highlight or `--border-muted`.
4. In `MediaLibrary.vue` and `FreeCreate.vue`:
   - Format media grid items with `--radius-none` or `--radius-sm`, zero hover glow.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test frontweb/test/design-system-views.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontweb/src/views/DramaCanvas.vue frontweb/src/components/dramaCanvas/ frontweb/src/views/DramaDetail.vue frontweb/src/views/AiConfig.vue frontweb/src/components/AIConfigContent.vue frontweb/src/views/MediaLibrary.vue frontweb/src/views/FreeCreate.vue frontweb/test/design-system-views.test.js
git commit -m "refactor(ui): update Canvas, DramaDetail, AiConfig, and MediaLibrary to Nothing UI"
```

---

### Task 10: Feedback Notification Audit & Inline Status Transition (§5.F)

**Files:**
- Modify: `frontweb/src/composables/useEpisodeScript.js` (or script auto-save logic)
- Modify: `frontweb/src/views/FilmCreate.vue`
- Create: `frontweb/test/feedback-toast-audit.test.js`

**Interfaces:**
- Consumes: `.script-save-status` inline patterns (`[SAVED]`, `[SYNCED]`)
- Produces: Elimination of toast notification spam on local saves while retaining `ElMessage.error` for API errors.

- [ ] **Step 1: Write test to verify inline save status and restricted toast usage**

Create `frontweb/test/feedback-toast-audit.test.js`:
```javascript
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const testDir = path.dirname(fileURLToPath(import.meta.url))
const scriptSectionPath = path.resolve(testDir, '../src/components/filmCreate/ScriptSection.vue')

test('feedback: ScriptSection uses inline save status instead of toast on autosave', () => {
  const content = fs.readFileSync(scriptSectionPath, 'utf8')
  assert.match(content, /script-save-status/, 'ScriptSection must render inline save status')
})
```

- [ ] **Step 2: Run test to verify it passes or fails**

Run: `node --test frontweb/test/feedback-toast-audit.test.js`

- [ ] **Step 3: Audit and adjust toast calls**

1. Ensure local script autosaving and item position changes display inline indicators (`[SAVED]`, `[SYNCED]`) rather than calling `ElMessage.success`.
2. Ensure long-running actions (video merge, storyboard batch generation) report progress on their card and via `TaskCenter`.
3. Keep `ElMessage.error` intact for backend API failures with bracketed prefix styling.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test frontweb/test/feedback-toast-audit.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontweb/src/components/filmCreate/ScriptSection.vue frontweb/src/views/FilmCreate.vue frontweb/test/feedback-toast-audit.test.js
git commit -m "refactor(ui): replace local save toasts with inline bracket status indicators"
```

---

### Task 11: Comprehensive Design System Linter & Full Build Verification

**Files:**
- Create: `frontweb/test/design-system-linter.test.js`

**Interfaces:**
- Consumes: All `.vue` and `.css` files under `frontweb/src/`
- Produces: Automated regression gate ensuring zero purple `#7c3aed`, zero `backdrop-filter`, zero hover `translateY`, and zero compilation/build failures.

- [ ] **Step 1: Write the design system linter test**

Create `frontweb/test/design-system-linter.test.js`:
```javascript
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const testDir = path.dirname(fileURLToPath(import.meta.url))
const srcDir = path.resolve(testDir, '../src')

function getAllFiles(dir, exts = ['.vue', '.css']) {
  const files = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...getAllFiles(fullPath, exts))
    } else if (exts.some(ext => entry.name.endsWith(ext))) {
      files.push(fullPath)
    }
  }
  return files
}

test('linter: no purple #7c3aed in any frontend vue or css file', () => {
  const files = getAllFiles(srcDir)
  const violations = []
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8')
    if (/#7c3aed/i.test(content)) {
      violations.push(path.relative(srcDir, file))
    }
  }
  assert.deepEqual(violations, [], `Forbidden purple #7c3aed found in: ${violations.join(', ')}`)
})

test('linter: no hover translateY in any frontend vue or css file', () => {
  const files = getAllFiles(srcDir)
  const violations = []
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8')
    if (/:hover[\s\S]*?translateY\(/i.test(content)) {
      violations.push(path.relative(srcDir, file))
    }
  }
  assert.deepEqual(violations, [], `Forbidden hover translateY found in: ${violations.join(', ')}`)
})

test('linter: no backdrop-filter in chrome styles', () => {
  const files = getAllFiles(srcDir)
  const violations = []
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8')
    // backdrop-filter is strictly prohibited on chrome
    if (/backdrop-filter:\s*blur/i.test(content)) {
      violations.push(path.relative(srcDir, file))
    }
  }
  assert.deepEqual(violations, [], `Forbidden backdrop-filter found in: ${violations.join(', ')}`)
})
```

- [ ] **Step 2: Run linter and verify all existing tests pass**

Run: `cd frontweb && node --test test/*.test.js`
Expected: PASS (all 63+ tests pass including new design system tests).

- [ ] **Step 3: Run production frontend build**

Run: `cd frontweb && npm run build`
Expected: PASS with 0 build errors and dist output generated.

- [ ] **Step 4: Run backend tests for regression check**

Run: `cd backend-node && node --test test/*.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontweb/test/design-system-linter.test.js
git commit -m "test(ui): add automated design system linter and verify full build"
```
