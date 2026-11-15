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
        <el-form-item :label="t('dramaCanvas.storyboardTitleField')">
          <el-input v-model="form.title" :placeholder="t('dramaCanvas.autoNamedIfBlank')" />
        </el-form-item>
        <el-form-item :label="t('dramaCanvas.descOptional')">
          <el-input v-model="form.description" type="textarea" :rows="2" :placeholder="t('dramaCanvas.briefDesc')" />
        </el-form-item>
      </template>

      <template v-else-if="type === 'episode'">
        <el-form-item :label="t('dramaCanvas.episodeTitle')">
          <el-input v-model="form.title" :placeholder="t('dramaCanvas.autoNamedIfBlank')" />
        </el-form-item>
      </template>

      <template v-else-if="type === 'character'">
        <el-form-item :label="t('dramaCanvas.characterName')" required>
          <el-input v-model="form.name" :placeholder="t('common.requiredField')" />
        </el-form-item>
        <el-form-item :label="t('dramaCanvas.roleType')">
          <el-select v-model="form.role" :placeholder="t('library.optional')" clearable style="width: 100%">
            <el-option :label="$t('filmCreate.roleMain')" value="main" />
            <el-option :label="$t('filmCreate.roleSupporting')" value="supporting" />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('dramaCanvas.appearance')">
          <el-input v-model="form.appearance" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item :label="t('dramaCanvas.bio')">
          <el-input v-model="form.description" type="textarea" :rows="2" />
        </el-form-item>
      </template>

      <template v-else-if="type === 'scene'">
        <el-form-item :label="t('dramaCanvas.sceneLocation')" required>
          <el-input v-model="form.location" :placeholder="t('dramaCanvas.locationPlaceholderExample')" />
        </el-form-item>
        <el-form-item :label="t('dramaCanvas.timeLighting')">
          <el-input v-model="form.time" :placeholder="t('dramaCanvas.timePlaceholderExample')" />
        </el-form-item>
        <el-form-item :label="t('dramaCanvas.sceneDescPlaceholder')">
          <el-input v-model="form.prompt" type="textarea" :rows="3" />
        </el-form-item>
      </template>

      <template v-else-if="type === 'prop'">
        <el-form-item :label="t('filmCreate.propName')" required>
          <el-input v-model="form.name" :placeholder="t('common.requiredField')" />
        </el-form-item>
        <el-form-item :label="t('common.description')">
          <el-input v-model="form.description" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item :label="t('freeCreate.promptLabel')">
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
  const map = {
    storyboard: t('dramaCanvas.newShot'),
    episode: t('dramaCanvas.newEpisode'),
    character: t('dramaCanvas.newCharacter'),
    scene: t('dramaCanvas.newScene'),
    prop: t('dramaCanvas.newProp'),
  }
  return map[props.type] || t('common.create')
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
      ElMessage.warning(t('dramaCanvas.enterName'))
      return false
    }
  }
  if (props.type === 'scene' && !form.location.trim()) {
    ElMessage.warning(t('dramaCanvas.enterSceneLocation'))
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
