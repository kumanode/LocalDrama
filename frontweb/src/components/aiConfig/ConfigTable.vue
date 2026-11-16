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
    <el-table-column prop="is_default" :label="$t('aiConfig.isDefault')" width="60">
      <template #default="{ row }">
        <el-tag v-if="row.is_default" type="success" size="small">✓</el-tag>
        <span v-else class="no-default">—</span>
      </template>
    </el-table-column>
    <el-table-column :label="$t('aiConfig.actions')" width="180" fixed="right">
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
.type-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  border: 1px solid transparent;
}
.type-icon { font-size: 13px; flex-shrink: 0; }
.type-text { background: rgba(59, 130, 246, .12); color: #3b82f6; border-color: rgba(59, 130, 246, .25); }
.type-image { background: rgba(16, 185, 129, .12); color: #10b981; border-color: rgba(16, 185, 129, .25); }
.type-storyboard_image { background: rgba(139, 92, 246, .12); color: #8b5cf6; border-color: rgba(139, 92, 246, .25); }
.type-video { background: rgba(249, 115, 22, .12); color: #f97316; border-color: rgba(249, 115, 22, .25); }
.type-tts { background: rgba(236, 72, 153, .12); color: #db2777; border-color: rgba(236, 72, 153, .25); }
.type-jimeng2_character_auth { background: rgba(20, 184, 166, .14); color: #0d9488; border-color: rgba(20, 184, 166, .28); }
.type-model_ark_asset { background: rgba(99, 102, 241, .12); color: #6366f1; border-color: rgba(99, 102, 241, .25); }
.no-default { color: #9ca3af; font-size: 13px; }
</style>
