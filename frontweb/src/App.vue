<template>
  <div class="app">
    <router-view />
    <button v-if="dramaId" class="assistant-launcher" type="button" @click="open = true">{{ $t('agent.title') }}</button>
    <AgentDrawer v-if="dramaId" v-model:open="open" :drama-id="dramaId" />
    <button class="task-center-launcher" type="button" :aria-label="$t('taskCenter.title')" @click="taskCenterOpen = true">
      <el-icon><List /></el-icon><span>{{ $t('taskCenter.title') }}</span>
    </button>
    <TaskCenter v-model:open="taskCenterOpen" />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import AgentDrawer from '@/components/AgentDrawer.vue'
import TaskCenter from '@/components/TaskCenter.vue'
import { List } from '@element-plus/icons-vue'

const route = useRoute()
const open = ref(false)
const taskCenterOpen = ref(false)
const assistantRoutes = new Set(['drama-detail', 'film', 'film-canvas'])
const dramaId = computed(() => {
  if (!assistantRoutes.has(route.name)) return 0
  const id = Number(route.params.id)
  return Number.isInteger(id) && id > 0 ? id : 0
})
</script>

<style>
* {
  box-sizing: border-box;
}
html, body, #app, .app {
  margin: 0;
  padding: 0;
  min-height: 100vh;
  background: var(--bg-page);
  color: var(--text-primary);
  transition: background 0.25s, color 0.25s;
}
.assistant-launcher {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 20;
  border: 1px solid var(--border-muted);
  border-radius: var(--radius-pill);
  padding: 10px 16px;
  background: var(--text-bright);
  color: var(--bg-page);
  font-family: var(--font-sans);
  font-weight: 600;
  cursor: pointer;
}
.task-center-launcher {
  position: fixed; right: 24px; bottom: 78px; z-index: 20;
  display: inline-flex; align-items: center; gap: var(--space-2);
  border: 1px solid var(--border-color); border-radius: var(--radius-pill); padding: 9px 14px;
  background: var(--bg-card); color: var(--text-primary); box-shadow: none; cursor: pointer;
  font-family: var(--font-mono); font-size: var(--font-xs);
}
@media (max-width: 600px) {
  .task-center-launcher { right: 12px; bottom: 72px; padding: 10px; }
  .task-center-launcher span { display: none; }
}
</style>
