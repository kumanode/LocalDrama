<template>
  <div class="vendor-lock-bar">
    <el-alert type="info" :closable="false" class="vendor-lock-tip">
      <template #title>
        <span v-html="$t('aiConfig.vendorLockTip')"></span>
      </template>
    </el-alert>
    <el-button type="primary" size="small" class="vendor-bulk-key-btn" @click="$emit('bulk-key')">
      <el-icon><Key /></el-icon>
      {{ $t('aiConfig.bulkKeyBtn') }}
    </el-button>
  </div>
</template>

<script setup>
import { Key } from '@element-plus/icons-vue'

defineEmits(['bulk-key'])
</script>

<style scoped>
.vendor-lock-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}
.vendor-lock-tip { flex: 1; min-width: 0; }
.vendor-bulk-key-btn { flex-shrink: 0; }
@media (max-width: 640px) {
  .vendor-lock-bar { align-items: stretch; flex-direction: column; }
  .vendor-bulk-key-btn { align-self: flex-start; }
}
</style>
