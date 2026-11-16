<template>
  <div class="ai-config">
    <header class="header">
      <div class="header-inner">
        <h1 class="logo" @click="goList">
          <span class="logo-main">{{ $t('header.appTitle') }}</span>
          <span class="logo-sub">{{ $t('header.appSubtitle') }}</span>
        </h1>
        <span class="page-title">{{ $t('aiConfig.title') }}</span>
        <div style="margin-left: auto; display: flex; align-items: center; gap: 8px;">
          <LanguageToggle />
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
import LanguageToggle from '@/components/LanguageToggle.vue'

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
  align-items: baseline;
  gap: 8px;
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
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.1);
  color: #ccc;
}
html.light .btn-back {
  background: rgba(0, 0, 0, 0.04);
  border-color: rgba(0, 0, 0, 0.1);
  color: #555;
}
.main {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;
}
</style>
