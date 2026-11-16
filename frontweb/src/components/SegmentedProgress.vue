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
