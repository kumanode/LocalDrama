<template>
  <div class="ai-config">
    <header class="header">
      <div class="header-inner">
        <h1 class="logo" @click="goList">
          <img class="logo-mark" src="/logo/logo-64.png" alt="" width="28" height="28" draggable="false" />
          <span class="logo-text">
            <span class="logo-main">{{ $t('header.appTitle') }}</span>
            <span class="logo-sub">{{ $t('header.appSubtitle') }}</span>
          </span>
        </h1>
        <span class="page-title">{{ $t('aiConfig.title') }}</span>
        <div style="margin-left: auto; display: flex; align-items: center; gap: 8px;">
          <el-button class="btn-back" @click="goList">
            <el-icon><ArrowLeft /></el-icon>
            {{ $t('common.back') }}
          </el-button>
        </div>
      </div>
    </header>

    <main class="main">
      <AIConfigContent />
    </main>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { ArrowLeft } from '@element-plus/icons-vue'
import AIConfigContent from '@/components/AIConfigContent.vue'

const router = useRouter()

function goList() {
  router.push({ name: 'list' })
}
</script>

<style scoped>
.ai-config {
  min-height: 100vh;
  background: var(--bg-page);
  color: var(--text-primary);
}
.header {
  background: var(--bg-card);
  border-bottom: 1px solid var(--border-color);
  position: sticky;
  top: 0;
  z-index: 50;
}
.header-inner {
  max-width: 1400px;
  margin: 0 auto;
  height: 60px;
  padding: 0 24px;
  display: flex;
  align-items: center;
  gap: 16px;
}
.logo {
  margin: 0;
  cursor: pointer;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: var(--space-2);
}
.logo-text {
  display: flex;
  white-space: nowrap;
  flex-direction: column;
  gap: 1px;
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
.logo-main {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-bright);
}
.logo-sub {
  font-size: 11px;
  color: var(--text-secondary);
}
.page-title {
  font-size: 14px;
  color: var(--text-secondary);
  padding-left: 12px;
  border-left: 1px solid var(--border-color);
}
.btn-back {
  background: var(--bg-hover);
  border-color: var(--border-color);
  color: var(--text-muted);
}
html.light .btn-back {
  background: rgba(0, 0, 0, 0.04);
  border-color: var(--border-color);
  color: var(--text-subtle);
}
.main {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;
}
</style>
