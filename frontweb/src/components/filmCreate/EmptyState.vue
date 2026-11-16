<template>
  <div class="film-empty-state">
    <el-icon class="film-empty-state__icon" aria-hidden="true"><component :is="icon" /></el-icon>
    <p class="film-empty-state__description">{{ description }}</p>
    <el-button v-if="actionLabel" type="primary" size="small" @click="$emit('action')">
      {{ actionLabel }}
    </el-button>
  </div>
</template>

<script setup>
import { Document } from '@element-plus/icons-vue'

defineProps({
  description: { type: String, required: true },
  actionLabel: { type: String, default: '' },
  icon: { type: Object, default: () => Document },
})

defineEmits(['action'])
</script>

<style scoped>
.film-empty-state {
  display: grid;
  justify-items: center;
  gap: var(--space-2);
  padding: var(--space-5);
  color: var(--text-muted);
  text-align: center;
}
.film-empty-state__icon { font-size: 24px; color: var(--text-subtle); }
.film-empty-state__description { margin: 0; font-size: var(--font-sm); }
</style>
