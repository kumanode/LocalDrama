<template>
  <!-- 顶部 -->
  <header class="header">
    <div class="header-inner">
      <button type="button" class="logo" @click="goList">
        <img class="logo-mark" src="/logo/logo-64.png" alt="" width="28" height="28" draggable="false" />
        <span class="logo-text">
          <span class="logo-main">{{ $t('header.appTitle') }}</span>
          <span class="logo-sub">{{ $t('header.appSubtitle') }}</span>
        </span>
      </button>
      <span class="breadcrumb-sep">›</span>
      <span class="page-title">{{ dramaId ? (dramaTitle || $t('common.project')) : $t('filmCreate.newStoryTitle') }}</span>
      <el-select
        v-if="dramaId"
        :model-value="selectedEpisodeId"
        class="header-episode-select"
        :placeholder="$t('filmCreate.selectEpisode')"
        clearable
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
        <div
          class="step-dot"
          :class="['dot-' + step.status]"
        >
          <el-icon v-if="step.status === 'done'" class="dot-icon"><Check /></el-icon>
          <el-icon v-else-if="step.status === 'generating'" class="dot-icon spin"><Loading /></el-icon>
          <span v-else class="dot-num">{{ idx + 1 }}</span>
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
import {
  ArrowLeft,
  Grid,
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
  padding: 10px 24px;
  position: sticky;
  top: 0;
  z-index: 200;
  box-shadow: none;
  margin-left: 200px;
  transition: margin-left 0.25s cubic-bezier(.4,0,.2,1);
}
:global(.sidebar-collapsed) .header {
  margin-left: 52px;
}
:global(html.light) .header {
  background: var(--bg-card) !important;
  border-bottom-color: var(--border-color) !important;
  box-shadow: none !important;
}
.header-inner {
  display: flex;
  align-items: center;
  gap: 14px;
}
.logo {
  margin: 0;
  cursor: pointer;
  display: flex;
  line-height: 1;
  transition: opacity 0.2s;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.logo-text {
  display: flex;
  white-space: nowrap;
  flex-direction: column;
  gap: 2px;
  line-height: 1;
  text-align: left;
}
.logo-mark {
  width: 28px;
  height: 28px;
  flex: none;
  border-radius: var(--radius-sm);
  display: block;
}
.logo:hover { opacity: 0.85; }
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
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-bright);
  letter-spacing: -0.01em;
}
.logo-sub {
  font-size: 0.62rem;
  font-weight: 500;
  letter-spacing: 0.04em;
  color: var(--text-subtle);
  text-transform: uppercase;
}
:global(html.light) .logo-main {
  color: var(--text-bright);
}
:global(html.light) .logo-sub {
  color: var(--text-muted);
}
.breadcrumb-sep {
  color: var(--text-subtle);
  font-size: 0.9rem;
  font-weight: 400;
  flex-shrink: 0;
  user-select: none;
}
:global(html.light) .breadcrumb-sep { color: var(--text-muted); }
.page-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-bright);
  background: transparent;
  border: none;
  padding: 0;
  max-width: 260px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
:global(html.light) .page-title {
  color: var(--text-bright);
  background: transparent;
  border: none;
}
.header-episode-select {
  flex-shrink: 0;
  min-width: 150px;
  width: auto;
  max-width: 200px;
  height: 32px;
}
.btn-back-drama,
.btn-canvas-mode {
  flex-shrink: 0;
  height: 32px;
}
.header-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.header-actions .el-button {
  height: 32px;
}
.btn-theme {
  --el-button-bg-color: var(--bg-inner);
  --el-button-border-color: var(--border-color);
  --el-button-text-color: var(--text-subtle);
  --el-button-hover-bg-color: var(--bg-hover);
  --el-button-hover-border-color: var(--border-muted);
  --el-button-hover-text-color: var(--text-muted);
  transition: all 0.2s ease;
}
:global(html.light) .btn-theme {
  --el-button-bg-color: var(--bg-inner);
  --el-button-border-color: var(--border-muted);
  --el-button-text-color: var(--text-subtle);
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
  width: 200px;
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
.quick-nav::-webkit-scrollbar-thumb { background: var(--bg-hover); border-radius: 4px; }
.quick-nav::-webkit-scrollbar-track { background: transparent; }
.quick-nav.collapsed {
  width: 52px;
  padding: 12px 0;
}
.quick-nav.collapsed .nav-steps,
.quick-nav.collapsed .nav-group {
  display: none;
}
@media (max-width: 768px) {
  .quick-nav { width: 52px; padding: 12px 0; }
  .quick-nav .nav-steps, .quick-nav .nav-group { display: none; }
  .quick-nav .nav-sidebar-title { display: none; }
  .quick-nav .nav-sidebar-header { justify-content: center; padding: 0 4px 8px; }
}

/* 当前任务面板 */
.atp-panel {
  margin-top: 6px;
  border-top: 1px solid var(--border-color);
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
.atp-item:hover { background: var(--bg-inner); }
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
  color: var(--text-muted);
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
  color: var(--text-subtle);
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
  background: var(--danger-soft);
  color: var(--danger-text);
}
.atp-more {
  font-size: 0.68rem;
  color: var(--text-subtle);
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
:global(html.light) .atp-item-label { color: var(--text-primary); }
:global(html.light) .atp-item:hover { background: rgba(0,0,0,0.04); }
:global(html.light) .atp-item-close { color: var(--text-muted); }
:global(html.light) .atp-item-close:hover { background: var(--danger-soft); color: var(--danger-text); }
:global(html.light) .atp-panel { border-top-color: var(--border-muted); }
.nav-sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px 10px 14px;
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 10px;
  flex-shrink: 0;
}
:global(html.light) .nav-sidebar-header { border-bottom-color: var(--border-muted); }
.quick-nav.collapsed .nav-sidebar-header {
  justify-content: center;
  padding: 0 4px 8px;
}
.nav-sidebar-title {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-subtle);
  letter-spacing: 0.08em;
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
  color: var(--text-subtle);
  transition: color 0.15s, background 0.15s;
  border-radius: 6px;
  flex-shrink: 0;
  font-size: 16px;
  border: 0;
  padding: 0;
  background: transparent;
}
.nav-toggle:hover { color: var(--text-muted); background: var(--bg-hover); }
:global(html.light) .nav-toggle { color: var(--text-muted); }
:global(html.light) .nav-toggle:hover { color: var(--text-primary); background: rgba(0,0,0,0.05); }

/* ─── Steps ─── */
.nav-steps {
  display: flex;
  flex-direction: column;
  padding: 0 8px;
  gap: 3px;
}
.nav-step {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  border-radius: var(--radius-sm);
  padding: 7px 10px;
  transition: background 0.15s ease, color 0.15s ease;
  user-select: none;
  width: 100%;
  border: 0;
  color: var(--text-secondary);
  font: inherit;
  text-align: left;
  background: transparent;
}
.nav-step:hover { background: var(--bg-hover); color: var(--text-primary); }
:global(html.light) .nav-step:hover { background: var(--bg-hover); }
.nav-step.is-active { background: var(--bg-hover); color: var(--text-bright); }
:global(html.light) .nav-step.is-active { background: var(--bg-hover); }
.nav-step.is-active .step-label { color: var(--text-bright) !important; font-weight: 600; }
:global(html.light) .nav-step.is-active .step-label { color: var(--text-bright) !important; font-weight: 700; }

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
  transition: all 0.2s;
  border: 1px solid var(--border-color);
  background: var(--bg-inner);
  color: var(--text-subtle);
}
.nav-step.is-active .step-dot {
  border-color: var(--text-bright);
  color: var(--text-bright);
  background: var(--bg-page);
}
.dot-pending {
  background: var(--bg-inner);
  border-color: var(--border-muted);
  color: var(--text-subtle);
}
:global(html.light) .dot-pending {
  background: var(--bg-hover);
  border-color: var(--border-muted);
  color: var(--text-muted);
}
.dot-partial {
  background: var(--bg-inner);
  border-color: var(--el-color-warning);
  color: var(--el-color-warning);
}
.dot-generating {
  background: var(--bg-inner);
  border-color: var(--border-muted);
  color: var(--text-bright);
  box-shadow: none;
}
.dot-done {
  background: var(--text-bright);
  border-color: var(--text-bright);
  color: var(--bg-page);
  box-shadow: none;
}
.dot-icon { font-size: 12px; }
.dot-num { font-size: 11px; line-height: 1; font-family: var(--font-mono); }

/* step body */
.step-body {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
}
.step-label {
  flex: 1;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-subtle);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 0.2s ease;
}
:global(html.light) .step-label { color: var(--text-subtle); }
.nav-step:hover .step-label { color: var(--text-primary); }
:global(html.light) .nav-step:hover .step-label { color: var(--text-primary); }
.status-done .step-label { color: var(--text-primary); }
:global(html.light) .status-done .step-label { color: var(--text-primary); }
.status-generating .step-label { color: var(--text-bright); }
:global(html.light) .status-generating .step-label { color: var(--text-bright); }
.status-partial .step-label { color: var(--el-color-warning); }
:global(html.light) .status-partial .step-label { color: var(--el-color-warning); }

.step-count {
  font-size: 10px;
  color: var(--text-subtle);
  background: var(--bg-inner);
  border-radius: 10px;
  padding: 1px 5px;
  flex-shrink: 0;
  font-weight: 500;
}
:global(html.light) .step-count { background: rgba(0,0,0,0.04); color: var(--text-muted); }

.step-badge {
  display: flex;
  align-items: center;
  font-size: 11px;
  flex-shrink: 0;
}
.partial-badge { color: var(--el-color-warning); }
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
  color: var(--text-subtle);
  cursor: pointer;
  width: 100%;
  border: 0;
  background: transparent;
  text-align: left;
  font: inherit;
  transition: color 0.15s;
  border-top: 1px solid var(--border-color);
}
:global(html.light) .nav-sub-toggle { border-top-color: var(--border-color); color: var(--text-muted); }
.nav-sub-toggle:hover { color: var(--text-primary); }
:global(html.light) .nav-sub-toggle:hover { color: var(--text-primary); }
.nav-sub-list {
  background: rgba(0,0,0,0.15);
  padding: 4px 0;
  border-radius: 0 0 6px 6px;
}
:global(html.light) .nav-sub-list { background: var(--bg-inner); }
.nav-sub-item {
  padding: 4px 10px 4px 26px;
  font-size: 11.5px;
  color: var(--text-subtle);
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
:global(html.light) .nav-sub-item { color: var(--text-muted); }
.nav-sub-item:hover { color: var(--text-primary); background: var(--bg-inner); }
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
