<template>
  <!-- 顶部 -->
  <header class="header">
    <div class="header-inner">
      <button type="button" class="logo" @click="goList">
        <span class="logo-main">{{ $t('header.appTitle') }}</span>
        <span class="logo-sub">{{ $t('header.appSubtitle') }}</span>
      </button>
      <span class="breadcrumb-sep">›</span>
      <span class="page-title">{{ dramaId ? (dramaTitle || $t('common.project')) : $t('filmCreate.newStoryTitle') }}</span>
      <el-select
        v-if="dramaId"
        :model-value="selectedEpisodeId"
        class="header-episode-select"
        :placeholder="$t('filmCreate.selectEpisode')"
        clearable
        size="small"
        @update:model-value="$emit('update:selectedEpisodeId', $event)"
        @change="$emit('episodeSelect', $event)"
      >
        <el-option
          v-for="ep in (episodes || [])"
          :key="ep.id"
          :label="ep.title || $t('filmCreate.episodeNum', { num: ep.episode_number || 0 })"
          :value="ep.id"
        />
      </el-select>
      <el-button v-if="dramaId" class="btn-back-drama" @click="router.push('/drama/' + dramaId)">
        <el-icon><ArrowLeft /></el-icon>
        {{ $t('filmCreate.backToEpisodes') }}
      </el-button>
      <el-button v-if="dramaId" type="primary" plain class="btn-canvas-mode" @click="goCanvasMode">
        <el-icon><Grid /></el-icon>
        {{ $t('filmCreate.canvasMode') }}
      </el-button>
      <div class="header-actions">
        <LanguageToggle />
        <el-button class="btn-theme" :title="isDark ? $t('header.switchToLight') : $t('header.switchToDark')" @click="toggleTheme">
          <el-icon><Sunny v-if="isDark" /><Moon v-else /></el-icon>
          {{ isDark ? $t('header.lightMode') : $t('header.darkMode') }}
        </el-button>
        <el-button class="btn-ai-config" @click="$emit('openAiConfig')">
          <el-icon><Setting /></el-icon>
          {{ $t('header.aiConfig') }}
        </el-button>
      </div>
    </div>
  </header>

  <!-- 左侧固定侧边栏 -->
  <nav class="quick-nav" :class="{ collapsed: navCollapsed }" :aria-label="$t('filmCreate.quickNav')">
    <div class="nav-sidebar-header">
      <span v-if="!navCollapsed" class="nav-sidebar-title">{{ $t('filmCreate.quickNav') }}</span>
      <button
        type="button"
        class="nav-toggle"
        :title="navCollapsed ? $t('filmCreate.expandNav') : $t('filmCreate.collapseNav')"
        :aria-label="navCollapsed ? $t('filmCreate.expandNav') : $t('filmCreate.collapseNav')"
        @click="$emit('toggleNav')"
      >
        <el-icon><Expand v-if="navCollapsed" /><Fold v-else /></el-icon>
      </button>
    </div>

    <!-- 步骤列表 -->
    <div class="nav-steps">
      <button
        type="button"
        v-for="(step, idx) in navSteps"
        :key="step.key"
        class="nav-step"
        :class="['status-' + step.status, { 'is-active': step.anchor === activeStepAnchor }]"
        :aria-label="step.label"
        @click="$emit('scrollToAnchor', step.anchor)"
      >
        <!-- 左侧连接线 -->
        <div class="step-connector-wrap">
          <div v-if="idx > 0" class="step-line step-line-top" :class="{ filled: navSteps[idx - 1].status === 'done' }" />
          <div
            class="step-dot"
            :class="['dot-' + step.status]"
          >
            <el-icon v-if="step.status === 'done'" class="dot-icon"><Check /></el-icon>
            <el-icon v-else-if="step.status === 'generating'" class="dot-icon spin"><Loading /></el-icon>
            <span v-else class="dot-num">{{ idx + 1 }}</span>
          </div>
          <div v-if="idx < navSteps.length - 1" class="step-line step-line-bottom" :class="{ filled: step.status === 'done' }" />
        </div>

        <!-- 右侧文字 + 状态徽章 -->
        <div class="step-body">
          <span class="step-label">{{ step.label }}</span>
          <span v-if="step.count > 0 && step.status !== 'done'" class="step-count">{{ step.count }}</span>
          <span v-if="step.status === 'partial'" class="step-badge partial-badge" :title="$t('filmCreate.partialDone')">
            <el-icon><WarningFilled /></el-icon>
          </span>
          <span v-else-if="step.status === 'generating'" class="step-badge gen-badge" :title="$t('common.generating')">
            <el-icon class="spin"><Loading /></el-icon>
          </span>
        </div>
      </button>
    </div>

    <!-- 分镜子列表 -->
    <div v-if="!navCollapsed && storyboards.length > 0" class="nav-group">
      <button
        type="button"
        class="nav-sub-toggle"
        :aria-expanded="storyboardMenuExpanded"
        @click="$emit('update:storyboardMenuExpanded', !storyboardMenuExpanded)"
      >
        <el-icon><Minus v-if="storyboardMenuExpanded" /><Plus v-else /></el-icon>
        <span>{{ $t('filmCreate.storyboardList') }}</span>
      </button>
      <div v-show="storyboardMenuExpanded" class="nav-sub-list">
        <template v-for="(sb, i) in storyboards" :key="sb.id">
          <!-- 段落标题行 -->
          <div
            v-if="sb.segment_title && (i === 0 || sb.segment_index !== storyboards[i - 1].segment_index)"
            class="nav-segment-label"
          >
            <span class="nav-segment-dot" />
            {{ sb.segment_title }}
          </div>
          <button
            type="button"
            class="nav-sub-item"
            :title="sb.title || $t('filmCreate.shotIndex', { num: i + 1 })"
            :aria-label="$t('filmCreate.shotIndex', { num: i + 1 }) + ': ' + (sb.title || $t('filmCreate.shot'))"
            @click="$emit('scrollToAnchor', 'sb-' + sb.id)"
          >
            {{ i + 1 }}. {{ sb.title || $t('filmCreate.shot') }}
          </button>
        </template>
      </div>
    </div>

    <!-- 当前任务面板 -->
    <div v-if="allActiveTaskItems.length > 0" class="atp-panel">
      <!-- 折叠态：只显示旋转点和数量 -->
      <div v-if="navCollapsed" class="atp-collapsed-badge" :title="allActiveTaskLabels.join('\n')">
        <span class="atp-spin-dot" />
        <span class="atp-collapsed-count">{{ allActiveTaskItems.length }}</span>
      </div>
      <!-- 展开态：标题 + 任务列表 -->
      <template v-else>
        <div class="atp-header">
          <span class="atp-spin-dot" />
          <span class="atp-title">{{ $t('filmCreate.inProgress') }}</span>
          <span class="atp-count-badge">{{ allActiveTaskItems.length }}</span>
        </div>
        <div class="atp-list">
          <div
            v-for="item in allActiveTaskItems.slice(0, 8)"
            :key="item.id"
            class="atp-item"
          >
            <span class="atp-item-dot" />
            <el-tooltip :content="item.label" placement="right" :show-after="300" :enterable="false">
              <span class="atp-item-label">{{ item.label }}</span>
            </el-tooltip>
            <button
              type="button"
              class="atp-item-close"
              :title="$t('filmCreate.cancelTask')"
              :aria-label="$t('filmCreate.cancelTask')"
              @click.stop="$emit('cancelActiveTask', item)"
            >
              <el-icon :size="12"><Close /></el-icon>
            </button>
          </div>
          <el-tooltip
            v-if="allActiveTaskItems.length > 8"
            :content="allActiveTaskItems.slice(8).map((t) => t.label).join('\n')"
            placement="right"
            :show-after="200"
          >
            <div class="atp-more">
              {{ $t('filmCreate.remainingTasks', { count: allActiveTaskItems.length - 8 }) }}
            </div>
          </el-tooltip>
        </div>
      </template>
    </div>
  </nav>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useTheme } from '@/composables/useTheme'
import LanguageToggle from '@/components/LanguageToggle.vue'
import {
  ArrowLeft,
  Grid,
  Sunny,
  Moon,
  Setting,
  Expand,
  Fold,
  Check,
  Loading,
  WarningFilled,
  Minus,
  Plus,
  Close,
} from '@element-plus/icons-vue'

const props = defineProps({
  dramaId: { type: [Number, String], default: null },
  dramaTitle: { type: String, default: '' },
  episodes: { type: Array, default: () => [] },
  selectedEpisodeId: { type: [Number, String], default: null },
  navCollapsed: { type: Boolean, default: false },
  navSteps: { type: Array, default: () => [] },
  activeStepAnchor: { type: String, default: '' },
  storyboards: { type: Array, default: () => [] },
  storyboardMenuExpanded: { type: Boolean, default: false },
  allActiveTaskItems: { type: Array, default: () => [] },
  allActiveTaskLabels: { type: Array, default: () => [] },
})

defineEmits([
  'update:selectedEpisodeId',
  'update:storyboardMenuExpanded',
  'toggleNav',
  'episodeSelect',
  'scrollToAnchor',
  'cancelActiveTask',
  'openAiConfig',
])

const router = useRouter()
const { isDark, toggle: toggleTheme } = useTheme()

function goList() {
  router.push('/')
}

function goCanvasMode() {
  if (!props.dramaId) return
  const query = props.selectedEpisodeId ? { episode: String(props.selectedEpisodeId) } : {}
  router.push({ path: `/film/${props.dramaId}/canvas`, query })
}
</script>

<style scoped>
.header {
  background: var(--bg-card);
  border-bottom: 1px solid var(--border-color);
  padding: 10px 28px;
  position: sticky;
  top: 0;
  z-index: 200;
  box-shadow: none;
  margin-left: 180px;
  transition: margin-left 0.25s cubic-bezier(.4,0,.2,1);
}
:global(.sidebar-collapsed) .header {
  margin-left: 48px;
}
:global(html.light) .header {
  background: var(--bg-card) !important;
  border-bottom-color: var(--border-color) !important;
  box-shadow: none !important;
}
.header-inner {
  display: flex;
  align-items: center;
  gap: 16px;
}
.logo {
  margin: 0;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 1px;
  line-height: 1;
  transition: filter 0.3s;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
}
.logo:hover { filter: none; }
.logo:focus-visible,
.nav-toggle:focus-visible,
.nav-step:focus-visible,
.nav-sub-toggle:focus-visible,
.nav-sub-item:focus-visible,
.atp-item-close:focus-visible {
  outline: 2px solid var(--el-color-primary);
  outline-offset: 2px;
}
.logo-main {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text-bright);
  letter-spacing: -0.01em;
}
.logo-sub {
  font-size: 0.65rem;
  font-weight: 400;
  letter-spacing: 0.04em;
  color: #52525e;
  -webkit-text-fill-color: #52525e;
  text-transform: uppercase;
}
:global(html.light) .logo-main {
  color: var(--text-bright);
}
:global(html.light) .logo-sub {
  color: #9ca3af;
  -webkit-text-fill-color: #9ca3af;
}
.breadcrumb-sep {
  color: #3a3a44;
  font-size: 0.9rem;
  font-weight: 300;
  flex-shrink: 0;
  user-select: none;
}
:global(html.light) .breadcrumb-sep { color: #d1d5db; }
.page-title {
  font-size: 0.82rem;
  font-weight: 500;
  color: #7a7a88;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  padding: 4px 12px;
  max-width: 220px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
:global(html.light) .page-title {
  color: #6b7280;
  background: var(--bg-inner);
  border-color: var(--border-muted);
}
.header-episode-select {
  flex-shrink: 0;
  min-width: 130px;
  width: auto;
  max-width: 200px;
}
.btn-back-drama {
  flex-shrink: 0;
}
.header-actions {
  margin-left: auto;
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}
.btn-theme {
  --el-button-bg-color: rgba(255, 255, 255, 0.04);
  --el-button-border-color: rgba(255, 255, 255, 0.08);
  --el-button-text-color: #8b8b96;
  --el-button-hover-bg-color: rgba(255, 255, 255, 0.08);
  --el-button-hover-border-color: rgba(255, 255, 255, 0.18);
  --el-button-hover-text-color: #c8c8d0;
  transition: all 0.2s ease;
}
:global(html.light) .btn-theme {
  --el-button-bg-color: var(--bg-inner);
  --el-button-border-color: var(--border-muted);
  --el-button-text-color: #6b7280;
  --el-button-hover-bg-color: var(--bg-hover);
  --el-button-hover-border-color: var(--border-muted);
  --el-button-hover-text-color: var(--text-bright);
}

/* ===== 左侧固定侧边栏 ===== */
.quick-nav {
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  z-index: 210;
  display: flex;
  flex-direction: column;
  padding: 14px 0 10px;
  background: var(--bg-card);
  border-right: 1px solid var(--border-color);
  box-shadow: none;
  width: 180px;
  overflow-y: auto;
  overflow-x: hidden;
  transition: width 0.25s cubic-bezier(.4,0,.2,1), padding 0.25s cubic-bezier(.4,0,.2,1);
}
:global(html.light) .quick-nav {
  background: var(--bg-card) !important;
  border-right-color: var(--border-color) !important;
  box-shadow: none !important;
}
.quick-nav::-webkit-scrollbar { width: 4px; }
.quick-nav::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
.quick-nav::-webkit-scrollbar-track { background: transparent; }
.quick-nav.collapsed {
  width: 48px;
  padding: 12px 0;
}
.quick-nav.collapsed .nav-steps,
.quick-nav.collapsed .nav-group {
  display: none;
}
@media (max-width: 768px) {
  .quick-nav { width: 48px; padding: 12px 0; }
  .quick-nav .nav-steps, .quick-nav .nav-group { display: none; }
  .quick-nav .nav-sidebar-title { display: none; }
  .quick-nav .nav-sidebar-header { justify-content: center; padding: 0 4px 8px; }
}

/* 当前任务面板 */
.atp-panel {
  margin-top: 6px;
  border-top: 1px solid rgba(255, 255, 255, 0.04);
  padding: 6px 0 4px;
}
.atp-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 10px 4px;
}
.atp-title {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-bright);
  letter-spacing: 0.03em;
  flex: 1;
}
.atp-count-badge {
  font-size: 0.68rem;
  background: var(--bg-inner); border: 1px solid var(--border-muted);
  color: var(--text-bright);
  border-radius: 8px;
  padding: 1px 5px;
  min-width: 16px;
  text-align: center;
}
.atp-spin-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--el-color-danger);
  flex-shrink: 0;
  animation: atp-pulse 1.2s ease-in-out infinite;
}
@keyframes atp-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.75); }
}
.atp-list {
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.atp-list :deep(.el-tooltip__trigger) {
  display: block;
  width: 100%;
  min-width: 0;
}
.atp-item {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border-radius: 6px;
  transition: background 0.15s;
  min-width: 0;
  cursor: default;
}
.atp-item:hover { background: rgba(255,255,255,0.05); }
.atp-item-dot {
  display: inline-block;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--el-color-danger);
  flex-shrink: 0;
  animation: atp-pulse 1.6s ease-in-out infinite;
}
.atp-item-label {
  font-size: 0.72rem;
  color: #a1a1aa;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
}
.atp-item-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #71717a;
  cursor: pointer;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.15s, background 0.15s, color 0.15s;
}
.atp-item:hover .atp-item-close,
.atp-item-close:focus-visible {
  opacity: 1;
}
.atp-item-close:hover {
  background: rgba(239, 68, 68, 0.15);
  color: #f87171;
}
.atp-more {
  font-size: 0.68rem;
  color: #71717a;
  padding: 2px 10px 2px 19px;
}
/* 折叠态任务徽章 */
.atp-collapsed-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 4px 0;
  cursor: default;
}
.atp-collapsed-count {
  font-size: 0.65rem;
  color: var(--text-bright);
  font-weight: 700;
  line-height: 1;
}
:global(html.light) .atp-title { color: var(--text-bright); }
:global(html.light) .atp-count-badge { background: var(--bg-inner); color: var(--text-primary); }
:global(html.light) .atp-spin-dot { background: var(--el-color-danger); }
:global(html.light) .atp-item-dot { background: var(--text-bright); }
:global(html.light) .atp-item-label { color: #374151; }
:global(html.light) .atp-item:hover { background: rgba(0,0,0,0.04); }
:global(html.light) .atp-item-close { color: #9ca3af; }
:global(html.light) .atp-item-close:hover { background: rgba(239,68,68,0.1); color: #dc2626; }
:global(html.light) .atp-panel { border-top-color: var(--border-muted); }
.nav-sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 10px 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  margin-bottom: 8px;
  flex-shrink: 0;
}
:global(html.light) .nav-sidebar-header { border-bottom-color: var(--border-muted); }
.quick-nav.collapsed .nav-sidebar-header {
  justify-content: center;
  padding: 0 4px 8px;
}
.nav-sidebar-title {
  font-size: 13px;
  font-weight: 600;
  color: #7a7a88;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
}
:global(html.light) .nav-sidebar-title { color: var(--text-bright); }
.nav-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  cursor: pointer;
  color: #5a5a66;
  transition: color 0.15s, background 0.15s;
  border-radius: 6px;
  flex-shrink: 0;
  font-size: 16px;
  border: 0;
  padding: 0;
  background: transparent;
}
.nav-toggle:hover { color: #c8c8d0; background: rgba(255,255,255,0.06); }
:global(html.light) .nav-toggle { color: #9ca3af; }
:global(html.light) .nav-toggle:hover { color: #374151; background: rgba(0,0,0,0.05); }

/* ─── Steps ─── */
.nav-steps {
  display: flex;
  flex-direction: column;
  padding: 0 10px 0 10px;
}
.nav-step {
  display: flex;
  align-items: stretch;
  gap: 8px;
  cursor: pointer;
  border-radius: 6px;
  padding: 3px 6px 3px 0;
  transition: background 0.2s ease;
  user-select: none;
  width: 100%;
  border: 0;
  color: inherit;
  font: inherit;
  text-align: left;
  background: transparent;
}
.nav-step:hover { background: rgba(255,255,255,0.04); }
:global(html.light) .nav-step:hover { background: var(--bg-hover); }
.nav-step.is-active { background: var(--bg-hover); }
:global(html.light) .nav-step.is-active { background: var(--bg-hover); }
.nav-step.is-active .step-label { color: var(--text-bright) !important; }
:global(html.light) .nav-step.is-active .step-label { color: var(--text-bright) !important; font-weight: 700; }

/* connector column */
.step-connector-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 20px;
  flex-shrink: 0;
}
.step-line {
  width: 2px;
  flex: 1;
  min-height: 6px;
  background: rgba(255,255,255,0.1);
  border-radius: 1px;
  transition: background 0.3s;
}
:global(html.light) .step-line { background: rgba(0,0,0,0.1); }
.step-line.filled { background: rgba(34, 197, 94, 0.5); }

/* dot */
.step-dot {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 700;
  transition: all 0.25s;
  border: 2px solid transparent;
}
.dot-pending {
  background: rgba(39,39,42,0.6);
  border-color: rgba(63,63,70,0.4);
  color: #52525b;
}
:global(html.light) .dot-pending {
  background: rgba(229,231,235,0.6);
  border-color: rgba(156,163,175,0.3);
  color: #9ca3af;
}
.dot-partial {
  background: rgba(245, 158, 11, 0.12);
  border-color: rgba(245, 158, 11, 0.45);
  color: #f59e0b;
}
.dot-generating {
  background: var(--bg-inner);
  border-color: var(--border-muted);
  color: var(--text-bright);
  box-shadow: none;
}
.dot-done {
  background: rgba(34, 197, 94, 0.12);
  border-color: rgba(34, 197, 94, 0.5);
  color: #22c55e;
  box-shadow: none;
}
.dot-icon { font-size: 13px; }
.dot-num { font-size: 11px; line-height: 1; }

/* step body */
.step-body {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
  padding: 3px 0;
  min-width: 0;
}
.step-label {
  flex: 1;
  font-size: 13px;
  font-weight: 500;
  color: #71717a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 0.2s ease;
}
:global(html.light) .step-label { color: #6b7280; }
.nav-step:hover .step-label { color: #d4d4d8; }
:global(html.light) .nav-step:hover .step-label { color: #1e1b4b; }
.status-done .step-label { color: #6ee7b7; }
:global(html.light) .status-done .step-label { color: #059669; }
.status-generating .step-label { color: var(--text-bright); }
:global(html.light) .status-generating .step-label { color: var(--text-bright); }
.status-partial .step-label { color: #fbbf24; }
:global(html.light) .status-partial .step-label { color: #d97706; }

.step-count {
  font-size: 10px;
  color: #52525b;
  background: rgba(255,255,255,0.04);
  border-radius: 10px;
  padding: 1px 5px;
  flex-shrink: 0;
  font-weight: 500;
}
:global(html.light) .step-count { background: rgba(0,0,0,0.04); color: #9ca3af; }

.step-badge {
  display: flex;
  align-items: center;
  font-size: 11px;
  flex-shrink: 0;
}
.partial-badge { color: #f59e0b; }
.gen-badge { color: var(--text-bright); }

/* spin animation */
@keyframes navSpin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.spin { animation: navSpin 1s linear infinite; display: inline-flex; }

/* sub-toggle & sub-list */
.nav-group { margin-top: 4px; }
.nav-sub-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  font-size: 12px;
  color: #5a5a66;
  cursor: pointer;
  width: 100%;
  border: 0;
  background: transparent;
  text-align: left;
  font: inherit;
  transition: color 0.15s;
  border-top: 1px solid rgba(255,255,255,0.04);
}
:global(html.light) .nav-sub-toggle { border-top-color: rgba(0,0,0,0.07); color: #9ca3af; }
.nav-sub-toggle:hover { color: #e4e4e7; }
:global(html.light) .nav-sub-toggle:hover { color: #374151; }
.nav-sub-list {
  background: rgba(0,0,0,0.15);
  padding: 4px 0;
  border-radius: 0 0 6px 6px;
}
:global(html.light) .nav-sub-list { background: var(--bg-inner); }
.nav-sub-item {
  padding: 4px 10px 4px 26px;
  font-size: 11.5px;
  color: #52525b;
  cursor: pointer;
  width: 100%;
  border: 0;
  background: transparent;
  font: inherit;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 0.15s, background 0.15s;
  border-radius: 4px;
  margin: 0 4px;
}
:global(html.light) .nav-sub-item { color: #9ca3af; }
.nav-sub-item:hover { color: #d4d4d8; background: rgba(255,255,255,0.04); }
:global(html.light) .nav-sub-item:hover { color: var(--text-bright); background: var(--bg-hover); }
.nav-segment-label {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px 3px 12px;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-bright);
  letter-spacing: 0.02em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
:global(html.light) .nav-segment-label { color: var(--text-bright); }
.nav-segment-dot {
  display: inline-block;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--el-color-danger);
  flex-shrink: 0;
}
:global(html.light) .nav-segment-dot { background: var(--el-color-danger); }
</style>
