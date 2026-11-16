<template>
  <el-drawer v-model="open" class="task-center-drawer" :title="$t('taskCenter.title')" size="min(520px, 96vw)" @open="refresh">
    <div class="task-center-toolbar">
      <el-radio-group v-model="filter" size="small" :aria-label="$t('taskCenter.title')">
        <el-radio-button value="all">{{ $t('taskCenter.all') }}</el-radio-button>
        <el-radio-button value="active">{{ $t('taskCenter.active') }}</el-radio-button>
        <el-radio-button value="failed">{{ $t('taskCenter.failed') }}</el-radio-button>
        <el-radio-button value="completed">{{ $t('taskCenter.completed') }}</el-radio-button>
      </el-radio-group>
      <div class="task-center-actions">
        <el-select
          v-model="selectedProject"
          size="small"
          clearable
          :placeholder="$t('taskCenter.project')"
          class="task-center-project-select"
        >
          <el-option value="" :label="$t('taskCenter.allProjects')" />
          <el-option
            v-for="p in projects"
            :key="p.id"
            :value="String(p.id)"
            :label="p.title || p.name || `${$t('taskCenter.project')} #${p.id}`"
          />
        </el-select>
        <el-button circle text :title="$t('taskCenter.refresh')" :aria-label="$t('taskCenter.refresh')" @click="refresh">
          <el-icon><Refresh /></el-icon>
        </el-button>
      </div>
    </div>
    <div v-loading="loading" class="task-center-list">
      <el-empty v-if="!loading && filteredTasks.length === 0" :description="$t('taskCenter.empty')" />
      <article v-for="task in filteredTasks" :key="task.id" class="task-center-item">
        <div class="task-center-heading">
          <span class="task-center-type">{{ task.type || 'Task' }}</span>
          <el-tag size="small" :type="statusType(task.status)">{{ $t(statusLabel(task.status)) }}</el-tag>
        </div>
        <div class="task-center-message">{{ task.message || task.error || task.resource_id || task.id }}</div>
        <SegmentedProgress v-if="isActive(task.status)" :value="Number(task.progress) || 0" :status="task.status === 'failed' ? 'exception' : 'normal'" :segments="10" />
        <details v-if="task.error" class="task-center-error">
          <summary>{{ $t('taskCenter.error') }}</summary>
          <pre>{{ task.error }}</pre>
        </details>
        <div class="task-center-footer">
          <time>{{ formatTime(task.created_at) }}</time>
          <div class="task-item-actions">
            <el-button v-if="canRetry(task)" link type="primary" size="small" @click="retry(task)">{{ $t('taskCenter.retry') }}</el-button>
            <el-button v-if="isActive(task.status)" link type="danger" size="small" @click="cancel(task)">{{ $t('taskCenter.cancel') }}</el-button>
          </div>
        </div>
      </article>
    </div>
  </el-drawer>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import SegmentedProgress from './SegmentedProgress.vue'
import { taskAPI } from '@/api/task'
import { dramaAPI } from '@/api/drama'
import { t } from '@/i18n'

const open = defineModel('open', { type: Boolean, default: false })
const filter = ref('all')
const selectedProject = ref('')
const projects = ref([])
const tasks = ref([])
const loading = ref(false)
let timer
const activeStatuses = new Set(['pending', 'processing', 'running'])
const isActive = (status) => activeStatuses.has(status)
const filteredTasks = computed(() => tasks.value.filter((task) => {
  if (filter.value === 'active' && !isActive(task.status)) return false
  if (filter.value === 'failed' && task.status !== 'failed') return false
  if (filter.value === 'completed' && task.status !== 'completed') return false
  if (selectedProject.value && String(task.drama_id ?? '') !== String(selectedProject.value)) return false
  return true
}))

function statusLabel(status) {
  const key = status === 'failed' ? 'failedStatus' : status === 'completed' ? 'completedStatus' : status
  return ['pending', 'processing', 'running', 'failedStatus', 'completedStatus'].includes(key)
    ? `taskCenter.${key}` : 'taskCenter.cancelled'
}
// Only video polling can be resumed server-side; other task types are redone from the page that started them.
function canRetry(task) {
  return task.status === 'failed' && task.type === 'video_generation'
}
function statusType(status) {
  if (status === 'failed') return 'danger'
  if (status === 'completed') return 'success'
  return 'warning'
}
function formatTime(value) {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString()
}
async function loadProjects() {
  try {
    const res = await dramaAPI.list()
    projects.value = Array.isArray(res) ? res : res?.items || []
  } catch (_) {}
}
async function refresh() {
  loading.value = true
  try {
    tasks.value = (await taskAPI.listRecent()) || []
  } catch (error) {
    ElMessage.error(error?.message || t('messages.requestFailed'))
  } finally {
    loading.value = false
  }
}
async function cancel(task) {
  try {
    await taskAPI.cancel(task.id)
    await refresh()
  } catch (error) { ElMessage.error(error?.message || t('messages.requestFailed')) }
}
async function retry(task) {
  try {
    await taskAPI.retry(task.id)
    ElMessage.success(t('taskCenter.retryStarted'))
    await refresh()
  } catch (error) {
    ElMessage.error(error?.message || t('messages.requestFailed'))
  }
}
watch(open, (visible) => {
  clearInterval(timer)
  if (visible) {
    loadProjects()
    refresh()
    timer = setInterval(refresh, 5000)
  }
})
onBeforeUnmount(() => clearInterval(timer))
</script>

<style scoped>
.task-center-toolbar { display:flex; align-items:center; justify-content:space-between; gap:var(--space-2); margin-bottom:var(--space-4); }
.task-center-actions { display:inline-flex; align-items:center; gap:var(--space-2); }
.task-center-project-select { width:130px; }
.task-center-list { display:grid; gap:var(--space-3); min-height:120px; }
.task-center-item { padding:var(--space-3); border:1px solid var(--border-color); border-radius:var(--radius-md); background:var(--bg-card); }
.task-center-heading,.task-center-footer { display:flex; align-items:center; justify-content:space-between; gap:var(--space-2); }
.task-item-actions { display:inline-flex; align-items:center; gap:var(--space-2); }
.task-center-type { font-weight:600; overflow-wrap:anywhere; }
.task-center-message { margin:var(--space-2) 0; color:var(--text-secondary); overflow-wrap:anywhere; }
.task-center-footer time { color:var(--text-muted); font-size:var(--font-xs); }
.task-center-error { margin-top:var(--space-2); color:var(--el-color-danger); }
.task-center-error pre { white-space:pre-wrap; overflow-wrap:anywhere; font:inherit; }
</style>

<style>
/* The drawer teleports to <body>, so it needs global rules to follow the app theme. */
.task-center-drawer {
  --el-drawer-bg-color: var(--bg-card);
  color: var(--text-primary);
}
.task-center-drawer .el-drawer__title { color: var(--text-bright, var(--text-primary)); }
</style>
