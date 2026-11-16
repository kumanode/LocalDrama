<template>
  <!-- 顶部 -->
  <header class="header">
    <div class="header-inner">
      <h1 class="logo" @click="goList">
        <span class="logo-main">{{ $t('header.appTitle') }}</span>
        <span class="logo-sub">{{ $t('header.appSubtitle') }}</span>
      </h1>
      <span class="breadcrumb-sep">›</span>
      <span class="page-title">{{ dramaId ? (dramaTitle || $t('common.project')) : $t('filmCreate.newStoryTitle') }}</span>
      <el-select
        v-if="dramaId"
        :model-value="selectedEpisodeId"
        class="header-episode-select"
        :placeholder="$t('filmCreate.selectEpisode')"
        clearable
        size="small"
        style="width: 130px"
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
      <div class="nav-toggle" :title="navCollapsed ? $t('filmCreate.expandNav') : $t('filmCreate.collapseNav')" @click="$emit('toggleNav')">
        <el-icon><Expand v-if="navCollapsed" /><Fold v-else /></el-icon>
      </div>
    </div>

    <!-- 步骤列表 -->
    <div class="nav-steps">
      <div
        v-for="(step, idx) in navSteps"
        :key="step.key"
        class="nav-step"
        :class="['status-' + step.status]"
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
      </div>
    </div>

    <!-- 分镜子列表 -->
    <div v-if="!navCollapsed && storyboards.length > 0" class="nav-group">
      <div class="nav-sub-toggle" @click="$emit('update:storyboardMenuExpanded', !storyboardMenuExpanded)">
        <el-icon><Minus v-if="storyboardMenuExpanded" /><Plus v-else /></el-icon>
        <span>{{ $t('filmCreate.storyboardList') }}</span>
      </div>
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
          <div
            class="nav-sub-item"
            :title="sb.title || $t('filmCreate.shotIndex', { num: i + 1 })"
            @click="$emit('scrollToAnchor', 'sb-' + sb.id)"
          >
            {{ i + 1 }}. {{ sb.title || $t('filmCreate.shot') }}
          </div>
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
  background: rgba(20, 21, 28, 0.78);
  backdrop-filter: blur(20px) saturate(1.2);
  -webkit-backdrop-filter: blur(20px) saturate(1.2);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  padding: 10px 28px;
  position: sticky;
  top: 0;
  z-index: 200;
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.15), 0 4px 20px rgba(0, 0, 0, 0.2);
  margin-left: 180px;
  transition: margin-left 0.25s cubic-bezier(.4,0,.2,1);
}
:global(.sidebar-collapsed) .header {
  margin-left: 48px;
}
:global(html.light) .header {
  background: rgba(255, 255, 255, 0.82) !important;
  border-bottom-color: rgba(139, 92, 246, 0.1) !important;
  box-shadow: 0 1px 0 rgba(139,92,246,0.06), 0 4px 20px rgba(139, 92, 246, 0.05) !important;
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
}
.logo:hover { filter: drop-shadow(0 0 10px rgba(139, 92, 246, 0.5)); }
.logo-main {
  font-size: 1.05rem;
  font-weight: 700;
  background: linear-gradient(135deg, #d0d5e8 0%, #a8b0cc 50%, #8890b0 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -0.01em;
  filter: drop-shadow(0 0 8px rgba(160, 170, 200, 0.15));
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
  background: linear-gradient(135deg, #6d28d9, #4f46e5);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
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
  background: rgba(99, 102, 241, 0.04);
  border-color: rgba(99, 102, 241, 0.1);
}
.header-episode-select {
  flex-shrink: 0;
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
  --el-button-bg-color: rgba(99, 102, 241, 0.04);
  --el-button-border-color: rgba(99, 102, 241, 0.12);
  --el-button-text-color: #6b7280;
  --el-button-hover-bg-color: rgba(99, 102, 241, 0.08);
  --el-button-hover-border-color: rgba(99, 102, 241, 0.3);
  --el-button-hover-text-color: #4f46e5;
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
  background: linear-gradient(180deg, #131318 0%, #111116 50%, #0f0f14 100%);
  border-right: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow: 1px 0 0 rgba(255,255,255,0.02), 4px 0 24px rgba(0, 0, 0, 0.4);
  width: 180px;
  overflow-y: auto;
  overflow-x: hidden;
  transition: width 0.25s cubic-bezier(.4,0,.2,1), padding 0.25s cubic-bezier(.4,0,.2,1);
}
:global(html.light) .quick-nav {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 247, 255, 0.99) 100%);
  border-right-color: rgba(139, 92, 246, 0.1);
  box-shadow: 1px 0 0 rgba(139,92,246,0.06), 4px 0 20px rgba(139, 92, 246, 0.04);
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
  color: #a78bfa;
  letter-spacing: 0.03em;
  flex: 1;
}
.atp-count-badge {
  font-size: 0.68rem;
  background: rgba(139, 92, 246, 0.25);
  color: #c4b5fd;
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
  background: #a78bfa;
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
  background: #7c3aed;
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
  color: #a78bfa;
  font-weight: 700;
  line-height: 1;
}
:global(html.light) .atp-title { color: #7c3aed; }
:global(html.light) .atp-count-badge { background: rgba(139,92,246,0.12); color: #7c3aed; }
:global(html.light) .atp-spin-dot { background: #7c3aed; }
:global(html.light) .atp-item-dot { background: #8b5cf6; }
:global(html.light) .atp-item-label { color: #374151; }
:global(html.light) .atp-item:hover { background: rgba(0,0,0,0.04); }
:global(html.light) .atp-item-close { color: #9ca3af; }
:global(html.light) .atp-item-close:hover { background: rgba(239,68,68,0.1); color: #dc2626; }
:global(html.light) .atp-panel { border-top-color: rgba(139,92,246,0.15); }
.nav-sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 10px 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  margin-bottom: 8px;
  flex-shrink: 0;
}
:global(html.light) .nav-sidebar-header { border-bottom-color: rgba(139, 92, 246, 0.12); }
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
:global(html.light) .nav-sidebar-title { color: #7c3aed; }
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
}
.nav-step:hover { background: rgba(255,255,255,0.04); }
:global(html.light) .nav-step:hover { background: rgba(99,102,241,0.05); }

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
  background: rgba(139, 92, 246, 0.15);
  border-color: rgba(139, 92, 246, 0.5);
  color: #a78bfa;
  box-shadow: 0 0 8px rgba(139, 92, 246, 0.2);
}
.dot-done {
  background: rgba(34, 197, 94, 0.12);
  border-color: rgba(34, 197, 94, 0.5);
  color: #22c55e;
  box-shadow: 0 0 6px rgba(34, 197, 94, 0.15);
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
.status-generating .step-label { color: #c4b5fd; }
:global(html.light) .status-generating .step-label { color: #7c3aed; }
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
.gen-badge { color: #a78bfa; }

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
:global(html.light) .nav-sub-list { background: rgba(99,102,241,0.03); }
.nav-sub-item {
  padding: 4px 10px 4px 26px;
  font-size: 11.5px;
  color: #52525b;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 0.15s, background 0.15s;
  border-radius: 4px;
  margin: 0 4px;
}
:global(html.light) .nav-sub-item { color: #9ca3af; }
.nav-sub-item:hover { color: #d4d4d8; background: rgba(255,255,255,0.04); }
:global(html.light) .nav-sub-item:hover { color: #1e1b4b; background: rgba(99,102,241,0.06); }
.nav-segment-label {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px 3px 12px;
  font-size: 11px;
  font-weight: 600;
  color: #a78bfa;
  letter-spacing: 0.02em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
:global(html.light) .nav-segment-label { color: #7c3aed; }
.nav-segment-dot {
  display: inline-block;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #a78bfa;
  flex-shrink: 0;
}
:global(html.light) .nav-segment-dot { background: #7c3aed; }
</style>
