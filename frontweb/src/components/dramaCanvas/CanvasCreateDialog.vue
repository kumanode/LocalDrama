<template>
  <el-dialog
    v-model="visible"
    :title="dialogTitle"
    width="420px"
    destroy-on-close
    @closed="resetForm"
  >
    <el-form label-position="top" size="default" @submit.prevent="onSubmit">
      <template v-if="type === 'storyboard'">
        <el-form-item :label="locale === 'en' ? 'Shot Title' : '分镜标题'">
          <el-input v-model="form.title" :placeholder="locale === 'en' ? 'Auto-named if blank' : '留空则自动命名'" />
        </el-form-item>
        <el-form-item :label="locale === 'en' ? 'Description (optional)' : '描述（可选）'">
          <el-input v-model="form.description" type="textarea" :rows="2" :placeholder="locale === 'en' ? 'Brief description' : '简要描述'" />
        </el-form-item>
      </template>

      <template v-else-if="type === 'episode'">
        <el-form-item :label="locale === 'en' ? 'Episode Title' : '集标题'">
          <el-input v-model="form.title" :placeholder="locale === 'en' ? 'Auto-named if blank' : '留空则自动命名'" />
        </el-form-item>
      </template>

      <template v-else-if="type === 'character'">
        <el-form-item :label="locale === 'en' ? 'Character Name' : '角色名称'" required>
          <el-input v-model="form.name" :placeholder="locale === 'en' ? 'Required' : '必填'" />
        </el-form-item>
        <el-form-item :label="locale === 'en' ? 'Role Type' : '角色类型'">
          <el-select v-model="form.role" :placeholder="locale === 'en' ? 'Optional' : '可选'" clearable style="width: 100%">
            <el-option :label="$t('filmCreate.roleMain')" value="main" />
            <el-option :label="$t('filmCreate.roleSupporting')" value="supporting" />
          </el-select>
        </el-form-item>
        <el-form-item :label="locale === 'en' ? 'Appearance' : '外貌描述'">
          <el-input v-model="form.appearance" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item :label="locale === 'en' ? 'Bio / Description' : '简介'">
          <el-input v-model="form.description" type="textarea" :rows="2" />
        </el-form-item>
      </template>

      <template v-else-if="type === 'scene'">
        <el-form-item :label="locale === 'en' ? 'Scene Location' : '场景地点'" required>
          <el-input v-model="form.location" :placeholder="locale === 'en' ? 'Required, e.g. Living room' : '必填，如：客厅'" />
        </el-form-item>
        <el-form-item :label="locale === 'en' ? 'Time / Lighting' : '时间'">
          <el-input v-model="form.time" :placeholder="locale === 'en' ? 'e.g. Day, Night' : '如：白天、夜晚'" />
        </el-form-item>
        <el-form-item :label="locale === 'en' ? 'Scene Description' : '场景描述'">
          <el-input v-model="form.prompt" type="textarea" :rows="3" />
        </el-form-item>
      </template>

      <template v-else-if="type === 'prop'">
        <el-form-item :label="locale === 'en' ? 'Prop Name' : '道具名称'" required>
          <el-input v-model="form.name" :placeholder="locale === 'en' ? 'Required' : '必填'" />
        </el-form-item>
        <el-form-item :label="locale === 'en' ? 'Description' : '描述'">
          <el-input v-model="form.description" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item :label="locale === 'en' ? 'Prompt' : '提示词'">
          <el-input v-model="form.prompt" type="textarea" :rows="2" />
        </el-form-item>
      </template>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">{{ $t('common.cancel') }}</el-button>
      <el-button type="primary" :loading="submitting" @click="onSubmit">{{ $t('common.create') }}</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useI18n } from '@/i18n'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  type: { type: String, default: 'storyboard' },
  onSubmit: { type: Function, default: null },
})

const emit = defineEmits(['update:modelValue', 'submit'])
const { t, locale } = useI18n()

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const submitting = ref(false)
const form = reactive({
  title: '',
  description: '',
  name: '',
  role: '',
  appearance: '',
  location: '',
  time: '',
  prompt: '',
})

const dialogTitle = computed(() => {
  const isEn = locale.value === 'en'
  const map = {
    storyboard: isEn ? 'New Shot' : '新建分镜',
    episode: isEn ? 'New Episode' : '新建集',
    character: isEn ? 'New Character' : '新建角色',
    scene: isEn ? 'New Scene' : '新建场景',
    prop: isEn ? 'New Prop' : '新建道具',
  }
  return map[props.type] || (isEn ? 'Create' : '新建')
})

function resetForm() {
  form.title = ''
  form.description = ''
  form.name = ''
  form.role = ''
  form.appearance = ''
  form.location = ''
  form.time = ''
  form.prompt = ''
  submitting.value = false
}

watch(() => props.type, () => resetForm())

function validate() {
  if (props.type === 'character' || props.type === 'prop') {
    if (!form.name.trim()) {
      ElMessage.warning(locale.value === 'en' ? 'Please enter a name' : '请填写名称')
      return false
    }
  }
  if (props.type === 'scene' && !form.location.trim()) {
    ElMessage.warning(locale.value === 'en' ? 'Please enter scene location' : '请填写场景地点')
    return false
  }
  return true
}

async function onSubmit() {
  if (!validate()) return
  submitting.value = true
  try {
    const handler = props.onSubmit || ((form) => emit('submit', form))
    await handler({ ...form })
  } finally {
    submitting.value = false
  }
}
</script>
