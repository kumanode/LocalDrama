<template>
  <el-button
    class="btn-lang"
    :title="t('common.switchLanguage')"
    @click="toggleLanguage"
  >
    <span class="lang-icon">🌐</span>
    <span class="lang-text">{{ locale === 'en' ? 'EN' : '中文' }}</span> <!-- i18n-scan-ignore: language switcher autonym -->
  </el-button>
</template>

<script setup>
import { useI18n } from '../i18n'

const { locale, setLocale, t } = useI18n()

function toggleLanguage() {
  const next = locale.value === 'en' ? 'zh' : 'en'
  setLocale(next)
}
</script>

<style scoped>
.btn-lang {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}
.lang-icon {
  font-size: 14px;
  line-height: 1;
}
.lang-text {
  font-size: 13px;
  line-height: 1;
}
</style>
