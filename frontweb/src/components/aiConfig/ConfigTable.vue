<template>
  <el-table
    v-loading="loading"
    :data="rows"
    stripe
    class="config-table"
    @selection-change="$emit('selection-change', $event)"
  >
    <el-table-column v-if="!vendorLocked" type="selection" width="46" />
    <el-table-column prop="name" :label="$t('common.name')" min-width="130" />
    <el-table-column prop="provider" :label="$t('aiConfig.provider')" width="96" />
    <el-table-column prop="base_url" label="Base URL" min-width="170" show-overflow-tooltip />
    <el-table-column prop="default_model" :label="$t('aiConfig.defaultModel')" min-width="130" show-overflow-tooltip>
      <template #default="{ row }">
        {{ row.default_model || (Array.isArray(row.model) && row.model[0]) || '—' }}
      </template>
    </el-table-column>
    <el-table-column prop="service_type" :label="$t('aiConfig.serviceType')" width="148">
      <template #default="{ row }">
        <span :class="['type-badge', 'type-' + row.service_type]">
          <el-icon class="type-icon">
            <ChatDotRound v-if="row.service_type === 'text'" />
            <Picture v-else-if="row.service_type === 'image'" />
            <Film v-else-if="row.service_type === 'storyboard_image'" />
            <VideoCamera v-else-if="row.service_type === 'video'" />
            <Microphone v-else-if="row.service_type === 'tts'" />
            <Key v-else-if="row.service_type === 'jimeng2_character_auth'" />
            <Folder v-else-if="row.service_type === 'model_ark_asset'" />
          </el-icon>
          {{ serviceTypeLabel(row.service_type) }}
        </span>
      </template>
    </el-table-column>
    <el-table-column prop="is_default" :label="$t('aiConfig.isDefault')" width="80">
      <template #default="{ row }">
        <el-tag v-if="row.is_default" type="success" size="small">✓</el-tag>
        <span v-else class="no-default">—</span>
      </template>
    </el-table-column>
    <el-table-column :label="$t('aiConfig.actions')" min-width="240" fixed="right">
      <template #default="{ row }">
        <el-button link type="primary" size="small" @click="$emit('test', row)">{{ $t('aiConfig.testConnection') }}</el-button>
        <el-button link type="primary" size="small" @click="$emit('edit', row)">{{ vendorLocked ? $t('aiConfig.modifyKey') : $t('common.edit') }}</el-button>
        <el-button v-if="!vendorLocked" link type="danger" size="small" @click="$emit('delete', row)">{{ $t('common.delete') }}</el-button>
      </template>
    </el-table-column>
  </el-table>
</template>

<script setup>
import { ChatDotRound, Picture, Film, VideoCamera, Key, Microphone, Folder } from '@element-plus/icons-vue'

defineProps({
  loading: { type: Boolean, default: false },
  rows: { type: Array, default: () => [] },
  vendorLocked: { type: Boolean, default: false },
  serviceTypeLabel: { type: Function, required: true },
})
defineEmits(['selection-change', 'test', 'edit', 'delete'])
</script>

<style scoped>
:deep(.el-table) { width: 100%; }
:deep(.el-table td.el-table__cell) {
  padding: 12px 0;
}
:deep(.el-table th.el-table__cell) {
  padding: 12px 0;
}
:deep(.el-table .cell) {
  padding-left: var(--space-4);
  padding-right: var(--space-4);
}
:deep(.el-table .el-button + .el-button) {
  margin-left: var(--space-3);
}
.type-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 2px var(--space-2);
  border-radius: var(--radius-sm);
  font-size: var(--font-xs);
  font-weight: 600;
  white-space: nowrap;
  border: 1px solid transparent;
}
.type-icon { font-size: var(--font-sm); flex-shrink: 0; }
.type-text { background: var(--bg-hover); color: var(--text-primary); border-color: var(--border-muted); }
.type-image { background: var(--bg-hover); color: var(--text-primary); border-color: var(--border-muted); }
.type-storyboard_image { background: var(--bg-inner); color: var(--text-primary); border-color: var(--border-muted); }
.type-video { background: var(--bg-hover); color: var(--el-color-warning); border-color: var(--el-color-warning); }
.type-tts { background: var(--bg-hover); color: var(--text-primary); border-color: var(--border-muted); }
.type-jimeng2_character_auth { background: var(--bg-hover); color: var(--text-primary); border-color: var(--border-muted); }
.type-model_ark_asset { background: var(--bg-inner); color: var(--text-primary); border-color: var(--border-muted); }
.no-default { color: var(--text-muted); font-size: var(--font-sm); }
</style>
