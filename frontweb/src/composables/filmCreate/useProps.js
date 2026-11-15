import { ref, reactive, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { t, currentLocale } from '@/i18n'
import { propAPI } from '@/api/props'
import { propLibraryAPI } from '@/api/propLibrary'
import { uploadAPI } from '@/api/upload'
import { useGenerationTaskStore, GEN_RESOURCE } from '@/stores/generationTaskStore'
import { buildExtractTaskMeta, isEpisodeExtractRunning } from '@/composables/useGenerationTaskSync'

/**
 * 道具管理 Composable
 * @param {object} deps - 共享依赖
 * @param {object} deps.store - Pinia store
 * @param {import('vue').ComputedRef} deps.dramaId
 * @param {import('vue').ComputedRef} deps.currentEpisodeId
 * @param {Function} deps.getSelectedStyle
 * @param {Function} deps.loadDrama
 * @param {Function} deps.pollTask
 * @param {Function} deps.pollUntilResourceHasImage
 * @param {Function} deps.hasAssetImage
 */
export function useProps(deps) {
  const { store, dramaId, currentEpisodeId, getSelectedStyle, loadDrama, pollTask, pollUntilResourceHasImage, hasAssetImage } = deps
  const genStore = useGenerationTaskStore()

  function buildPropImageMeta(prop) {
    const dramaTitle = store.drama?.title || ''
    const epNum = store.currentEpisode?.episode_number
    const episodeLabel = t('filmCreate.episodeNumber', { num: epNum ?? '' })
    const epLabel = dramaTitle ? `${dramaTitle} · ${episodeLabel}` : episodeLabel
    return {
      dramaId: dramaId.value,
      episodeId: currentEpisodeId.value,
      dramaTitle,
      episodeNumber: epNum,
      resourceType: GEN_RESOURCE.PROP_IMAGE,
      resourceId: prop.id,
      label: t('filmCreate.propImageTaskLabel', { episode: epLabel, name: prop.name || prop.id }),
    }
  }

  function dataUrlToFile(dataUrl, filename) {
    const arr = dataUrl.split(',')
    const mime = (arr[0].match(/:(.*?);/) || [])[1] || 'image/png'
    const bstr = atob(arr[1])
    let n = bstr.length
    const u8arr = new Uint8Array(n)
    while (n--) u8arr[n] = bstr.charCodeAt(n)
    return new File([u8arr], filename || 'reference.png', { type: mime })
  }

  // ── 道具弹窗状态 ──────────────────────────────────────
  const showAddProp = ref(false)
  const addPropSaving = ref(false)
  const addPropForm = ref({ name: '', type: '', description: '', prompt: '' })

  const showEditProp = ref(false)
  const editPropForm = ref(null)
  const editPropSaving = ref(false)
  const editPropPromptGenerating = ref(false)
  const extractingPropDesc = ref(false)
  const addPropRefImage = ref(null)   // { dataUrl, filename }
  const addPropRefFileInput = ref(null)
  let editPropPollTimer = null

  // 「添加道具」简单弹窗的独立参考图状态
  const addPropAddRefImage = ref(null)
  const addPropAddRefFileInput = ref(null)
  const extractingPropAddDesc = ref(false)

  // ── 道具生成状态 ──────────────────────────────────────
  const propsExtracting = computed(() =>
    isEpisodeExtractRunning(genStore, dramaId.value, currentEpisodeId.value, GEN_RESOURCE.EXTRACT_PROPS)
  )
  const generatingPropIds = reactive(new Set())

  // ── 道具库状态 ────────────────────────────────────────
  const showPropLibrary = ref(false)
  const propLibraryList = ref([])
  const propLibraryLoading = ref(false)
  const propLibraryPage = ref(1)
  const propLibraryPageSize = ref(20)
  const propLibraryTotal = ref(0)
  const propLibraryKeyword = ref('')
  const showEditPropLibrary = ref(false)
  const editPropLibraryForm = ref(null)
  const editPropLibrarySaving = ref(false)
  const addingPropToLibraryId = ref(null)
  const addingPropToMaterialId = ref(null)
  const addingPropFromLibraryId = ref(null)
  let propLibraryKeywordTimer = null

  const propLibraryTab = ref('library')
  const dramaAllPropList = ref([])
  const dramaAllPropLoading = ref(false)
  const dramaAllPropPage = ref(1)
  const dramaAllPropPageSize = ref(20)
  const dramaAllPropTotal = ref(0)
  const dramaAllPropKeyword = ref('')
  let dramaAllPropKeywordTimer = null


  // ── 函数 ──────────────────────────────────────────────
  async function onExtractProps() {
    if (!currentEpisodeId.value) {
      ElMessage.warning(t('filmCreate.msgScriptSaveFirst'))
      return
    }
    const epId = currentEpisodeId.value
    const meta = buildExtractTaskMeta(store, dramaId.value, epId, GEN_RESOURCE.EXTRACT_PROPS, t('dramaCanvas.extractProps'))
    genStore.markRunning(meta)
    try {
      const res = await propAPI.extractFromScript(epId)
      const taskId = res?.task_id
      if (taskId) {
        const pollRes = await pollTask(taskId, () => loadDrama(), meta)
        if (pollRes?.status !== 'failed') {
          ElMessage.success(t('filmCreate.msgPropsExtracted'))
        }
      } else {
        await loadDrama()
        ElMessage.success(t('filmCreate.msgPropExtractSubmitted'))
      }
    } catch (e) {
      ElMessage.error(e.message || t('filmCreate.msgGenFailed'))
    } finally {
      genStore.markDone(meta)
    }
  }

  function stopPropPromptPoll() {
    if (editPropPollTimer) { clearInterval(editPropPollTimer); editPropPollTimer = null }
  }

  function editProp(prop) {
    stopPropPromptPoll()
    editPropForm.value = {
      id: prop.id,
      name: prop.name || '',
      type: prop.type || '',
      description: prop.description || '',
      prompt: prop.prompt || '',
      image_url: prop.image_url || '',
      local_path: prop.local_path || '',
      ref_image: prop.ref_image || '',
    }
    showEditProp.value = true
    if (!prop.prompt && prop.id && prop.description) {
      editPropPromptGenerating.value = true
      let elapsed = 0
      editPropPollTimer = setInterval(async () => {
        elapsed += 3
        try {
          const res = await propAPI.get(prop.id)
          const p = res?.prop?.prompt
          if (p) {
            if (editPropForm.value?.id === prop.id) editPropForm.value.prompt = p
            stopPropPromptPoll()
            editPropPromptGenerating.value = false
          } else if (elapsed >= 60) {
            stopPropPromptPoll()
            editPropPromptGenerating.value = false
          }
        } catch (_) {
          stopPropPromptPoll()
          editPropPromptGenerating.value = false
        }
      }, 3000)
    }
  }

  async function doGeneratePropPrompt() {
    const form = editPropForm.value
    if (!form?.id) return
    editPropPromptGenerating.value = true
    try {
      const res = await propAPI.generatePrompt(form.id)
      if (res?.prompt) {
        form.prompt = res.prompt
        ElMessage.success(t('filmCreate.msgPromptGenerated'))
        await loadDrama()
      }
    } catch (e) {
      ElMessage.error(e.message || t('filmCreate.msgPromptGenFailed'))
    } finally {
      editPropPromptGenerating.value = false
    }
  }

  async function savePropRefImageIfAny(propId) {
    const refImg = addPropRefImage.value
    if (!refImg || !propId) return
    try {
      const file = dataUrlToFile(refImg.dataUrl, refImg.filename || 'reference.png')
      const uploadRes = await uploadAPI.uploadImage(file, { dramaId: dramaId.value })
      const refPath = uploadRes.local_path || uploadRes.url || ''
      await propAPI.putRefImage(propId, refPath)
    } catch (e) {
      console.warn('[savePropRefImage] failed to save reference image:', e.message)
    }
  }

  async function clearPropRefImage() {
    const form = editPropForm.value
    if (!form?.id) return
    try {
      await propAPI.putRefImage(form.id, null)
      form.ref_image = ''
      ElMessage.success(t('filmCreate.msgRefImageRemoved'))
    } catch (e) {
      ElMessage.error(t('filmCreate.msgRemoveFailed'))
    }
  }

  async function doExtractPropFromImage() {
    const form = editPropForm.value
    if (!form?.id) return
    extractingPropDesc.value = true
    try {
      const res = await propAPI.extractFromImage(form.id)
      if (res?.description) {
        form.description = res.description
        ElMessage.success(t('filmCreate.msgPropDescExtracted'))
      }
    } catch (e) {
      ElMessage.error(e.message || t('filmCreate.msgExtractFailedCheckImage'))
    } finally {
      extractingPropDesc.value = false
    }
  }

  async function submitEditProp() {
    if (!editPropForm.value?.id) return
    editPropSaving.value = true
    try {
      await propAPI.update(editPropForm.value.id, {
        name: editPropForm.value.name?.trim(),
        type: editPropForm.value.type || undefined,
        description: editPropForm.value.description || undefined,
        prompt: editPropForm.value.prompt || undefined
      })
      await savePropRefImageIfAny(editPropForm.value.id)
      await loadDrama()
      showEditProp.value = false
      ElMessage.success(t('filmCreate.msgPropSaved'))
    } catch (e) {
      ElMessage.error(e.message || t('filmCreate.msgSaveFailed'))
    } finally {
      editPropSaving.value = false
    }
  }

  async function submitAddProp() {
    const name = (addPropForm.value.name || '').trim()
    if (!name || !store.dramaId) return
    addPropSaving.value = true
    try {
      await propAPI.create({
        drama_id: store.dramaId,
        episode_id: currentEpisodeId.value ?? undefined,
        name,
        type: addPropForm.value.type?.trim() || undefined,
        description: addPropForm.value.description?.trim() || undefined,
        prompt: addPropForm.value.prompt?.trim() || undefined
      })
      showAddProp.value = false
      await loadDrama()
      ElMessage.success(t('filmCreate.msgPropAdded'))
    } catch (e) {
      ElMessage.error(e.message || t('filmCreate.msgAddFailed'))
    } finally {
      addPropSaving.value = false
    }
  }

  function onClosePropDialog() {
    showEditProp.value = false
    stopPropPromptPoll()
    editPropPromptGenerating.value = false
    addPropRefImage.value = null
  }

  async function onDeleteProp(prop) {
    try {
      await ElMessageBox.confirm(
        t('filmCreate.deletePropPrompt', { name: (prop.name || t('common.unnamed')).slice(0, 20) }),
        t('filmCreate.confirmDeletionTitle'),
        { type: 'warning', confirmButtonText: t('common.delete'), cancelButtonText: t('common.cancel') }
      )
      await propAPI.delete(prop.id)
      await loadDrama()
      ElMessage.success(t('filmCreate.msgPropDeleted'))
    } catch (e) {
      if (e === 'cancel') return
      ElMessage.error(e.message || t('filmCreate.msgDeleteFailed'))
    }
  }

  async function onGeneratePropImage(prop, useQuadGrid = false) {
    prop.errorMsg = ''
    prop.error_msg = ''
    const meta = buildPropImageMeta(prop)
    generatingPropIds.add(prop.id)
    genStore.markRunning(meta)
    try {
      const res = await propAPI.generateImage(prop.id, undefined, getSelectedStyle(), !!useQuadGrid)
      const taskId = res?.task_id
      if (taskId) {
        const pollRes = await pollTask(taskId, () => loadDrama(), meta)
        if (pollRes?.status === 'failed') {
          prop.errorMsg = pollRes.error || t('filmCreate.msgGenFailed')
        } else {
          ElMessage.success(t('filmCreate.msgPropImageGenerated'))
        }
      } else {
        await loadDrama()
        await pollUntilResourceHasImage(() => {
          const list = store.drama?.props ?? store.currentEpisode?.props ?? []
          const p = list.find((x) => Number(x.id) === Number(prop.id))
          return !!(p && (p.image_url || p.local_path))
        })
        ElMessage.success(t('filmCreate.msgPropImageGenerated'))
      }
    } catch (e) {
      console.error(e)
      prop.errorMsg = e.message || t('filmCreate.msgGenFailed')
      ElMessage.error(e.message || t('filmCreate.msgSubmitFailed'))
    } finally {
      generatingPropIds.delete(prop.id)
      genStore.markDone(meta)
    }
  }

  // ── 道具库函数 ────────────────────────────────────────
  async function loadPropLibraryList() {
    propLibraryLoading.value = true
    try {
      const res = await propLibraryAPI.list({
        drama_id: dramaId.value,
        page: propLibraryPage.value,
        page_size: propLibraryPageSize.value,
        keyword: propLibraryKeyword.value || undefined
      })
      propLibraryList.value = res?.items ?? []
      const pagination = res?.pagination ?? {}
      propLibraryTotal.value = pagination.total ?? 0
      if (pagination.page != null) propLibraryPage.value = pagination.page
      if (pagination.page_size != null) propLibraryPageSize.value = pagination.page_size
    } catch (e) {
      propLibraryList.value = []
    } finally {
      propLibraryLoading.value = false
    }
  }

  function debouncedLoadPropLibrary() {
    if (propLibraryKeywordTimer) clearTimeout(propLibraryKeywordTimer)
    propLibraryKeywordTimer = setTimeout(() => {
      propLibraryPage.value = 1
      loadPropLibraryList()
    }, 300)
  }

  async function loadDramaAllPropList() {
    if (!dramaId.value) {
      dramaAllPropList.value = []
      dramaAllPropTotal.value = 0
      return
    }
    dramaAllPropLoading.value = true
    try {
      const res = await propAPI.list(dramaId.value)
      let list = Array.isArray(res) ? res : (res?.items ?? res?.props ?? [])
      const kw = (dramaAllPropKeyword.value || '').trim().toLowerCase()
      if (kw) {
        list = list.filter((p) => {
          const name = (p.name || '').toLowerCase()
          const desc = (p.description || '').toLowerCase()
          const prompt = (p.prompt || '').toLowerCase()
          return name.includes(kw) || desc.includes(kw) || prompt.includes(kw)
        })
      }
      dramaAllPropTotal.value = list.length
      const start = (dramaAllPropPage.value - 1) * dramaAllPropPageSize.value
      dramaAllPropList.value = list.slice(start, start + dramaAllPropPageSize.value)
    } catch {
      dramaAllPropList.value = []
      dramaAllPropTotal.value = 0
    } finally {
      dramaAllPropLoading.value = false
    }
  }

  function debouncedLoadDramaAllPropList() {
    if (dramaAllPropKeywordTimer) clearTimeout(dramaAllPropKeywordTimer)
    dramaAllPropKeywordTimer = setTimeout(() => {
      dramaAllPropPage.value = 1
      loadDramaAllPropList()
    }, 300)
  }

  function onPropLibraryDialogOpen() {
    if (propLibraryTab.value === 'library') loadPropLibraryList()
    else if (propLibraryTab.value === 'drama') loadDramaAllPropList()
    
  }

  function onPropLibraryTabChange() {
    if (propLibraryTab.value === 'library') {
      propLibraryPage.value = 1
      loadPropLibraryList()
    } else if (propLibraryTab.value === 'drama') {
      dramaAllPropPage.value = 1
      loadDramaAllPropList()
    } 
  }

  function propAddToEpisodeLoadingKey(scope, id) {
    return `${scope}-${id}`
  }

  function isPropAddToEpisodeLoading(scope, id) {
    return addingPropFromLibraryId.value === propAddToEpisodeLoadingKey(scope, id)
  }

  function openEditPropLibrary(item) {
    editPropLibraryForm.value = {
      id: item.id,
      name: item.name ?? '',
      category: item.category ?? '',
      description: item.description ?? '',
      tags: item.tags ?? ''
    }
    showEditPropLibrary.value = true
  }

  async function submitEditPropLibrary() {
    if (!editPropLibraryForm.value?.id) return
    editPropLibrarySaving.value = true
    try {
      await propLibraryAPI.update(editPropLibraryForm.value.id, {
        name: editPropLibraryForm.value.name,
        category: editPropLibraryForm.value.category || null,
        description: editPropLibraryForm.value.description || null,
        tags: editPropLibraryForm.value.tags || null
      })
      ElMessage.success(t('filmCreate.msgSaved'))
      showEditPropLibrary.value = false
      loadPropLibraryList()
    } catch (e) {
      ElMessage.error(e.message || t('filmCreate.msgSaveFailed'))
    } finally {
      editPropLibrarySaving.value = false
    }
  }

  async function onDeletePropLibrary(item) {
    try {
      await ElMessageBox.confirm(
        t('filmCreate.deletePublicPropPrompt', { name: (item.name || t('common.unnamed')).slice(0, 20) }),
        t('filmCreate.confirmDeletionTitle'),
        { type: 'warning', confirmButtonText: t('common.delete'), cancelButtonText: t('common.cancel') }
      )
      await propLibraryAPI.delete(item.id)
      ElMessage.success(t('filmCreate.msgDeleted'))
      loadPropLibraryList()
    } catch (e) {
      if (e === 'cancel') return
      ElMessage.error(e.message || t('filmCreate.msgDeleteFailed'))
    }
  }

  async function onAddPropToLibrary(prop) {
    if (!hasAssetImage(prop)) { ElMessage.warning(t('filmCreate.msgUploadOrGenImageFirst')); return }
    addingPropToLibraryId.value = prop.id
    try {
      await propAPI.addToLibrary(prop.id, {})
      ElMessage.success(t('filmCreate.msgAddedToDramaLib'))
      if (showPropLibrary.value) loadPropLibraryList()
    } catch (e) {
      ElMessage.error(e.message || t('filmCreate.msgJoinFailed'))
    } finally {
      addingPropToLibraryId.value = null
    }
  }

  async function onAddPropToMaterialLibrary(prop) {
    if (!hasAssetImage(prop)) { ElMessage.warning(t('filmCreate.msgUploadOrGenImageFirst')); return }
    addingPropToMaterialId.value = prop.id
    try {
      await propAPI.addToMaterialLibrary(prop.id)
      ElMessage.success(t('filmCreate.msgAddedToGlobalLib'))
    } catch (e) {
      ElMessage.error(e.message || t('filmCreate.msgJoinFailed'))
    } finally {
      addingPropToMaterialId.value = null
    }
  }

  async function addPropToEpisode(item, scope) {
    if (!store.dramaId || !currentEpisodeId.value) {
      ElMessage.warning(t('filmCreate.msgSelectEpisodeFirst'))
      return
    }
    const loadingKey = propAddToEpisodeLoadingKey(scope, item.id)
    addingPropFromLibraryId.value = loadingKey
    try {
      const existingProp = (store.props || []).find((p) => p.name === item.name)
      if (existingProp) {
        await propAPI.update(existingProp.id, {
          name: item.name || existingProp.name,
          type: item.type || existingProp.type || undefined,
          description: item.description || existingProp.description || undefined,
          prompt: item.prompt || existingProp.prompt || undefined,
          image_url: item.image_url || existingProp.image_url || undefined,
          local_path: item.local_path || existingProp.local_path || undefined,
        })
        ElMessage.success(t('filmCreate.msgPropUpdatedToEpisode', { name: item.name || t('filmCreate.entityProp') }))
      } else {
        await propAPI.create({
          drama_id: store.dramaId,
          episode_id: currentEpisodeId.value,
          name: item.name || '',
          type: item.type || undefined,
          description: item.description || undefined,
          prompt: item.prompt || undefined,
          image_url: item.image_url || undefined,
          local_path: item.local_path || undefined,
        })
        ElMessage.success(t('filmCreate.msgAddedToEpisode', { name: item.name || t('filmCreate.entityProp') }))
      }
      await loadDrama()
    } catch (e) {
      ElMessage.error(e.message || t('filmCreate.msgJoinFailed'))
    } finally {
      addingPropFromLibraryId.value = null
    }
  }

  function onAddPropFromLibrary(item) {
    return addPropToEpisode(item, 'library')
  }

  function onAddDramaPropToEpisode(item) {
    return addPropToEpisode(item, 'drama')
  }

  function onAddTeamPropToEpisode(item) {
    return addPropToEpisode(item, 'team')
  }

  // ── 添加道具简单弹窗的参考图 extract ─────────────────
  async function doExtractFromRef2(type) {
    if (type !== 'addProp') return
    const refImage = addPropAddRefImage.value
    if (!refImage) return
    extractingPropAddDesc.value = true
    try {
      const entityName = addPropForm.value?.name || ''
      const res = await uploadAPI.extractDescriptionFromImage('prop', refImage.dataUrl, entityName)
      if (res?.description) {
        addPropForm.value.description = res.description
        ElMessage.success(t('filmCreate.msgFeatureDescExtracted'))
      }
    } catch (e) {
      ElMessage.error(e.message || t('filmCreate.msgVisionModelMissing'))
    } finally {
      extractingPropAddDesc.value = false
    }
  }

  return {
    // 弹窗状态
    showAddProp,
    addPropSaving,
    addPropForm,
    showEditProp,
    editPropForm,
    editPropSaving,
    editPropPromptGenerating,
    extractingPropDesc,
    addPropRefImage,
    addPropRefFileInput,
    addPropAddRefImage,
    addPropAddRefFileInput,
    extractingPropAddDesc,
    // 生成状态
    propsExtracting,
    generatingPropIds,
    // 库状态
    showPropLibrary,
    propLibraryList,
    propLibraryLoading,
    propLibraryPage,
    propLibraryPageSize,
    propLibraryTotal,
    propLibraryKeyword,
    propLibraryTab,
    dramaAllPropList,
    dramaAllPropLoading,
    dramaAllPropPage,
    dramaAllPropPageSize,
    dramaAllPropTotal,
    dramaAllPropKeyword,






    showEditPropLibrary,
    editPropLibraryForm,
    editPropLibrarySaving,
    addingPropToLibraryId,
    addingPropToMaterialId,

    addingPropFromLibraryId,
    // 函数
    onExtractProps,
    stopPropPromptPoll,
    editProp,
    doGeneratePropPrompt,
    savePropRefImageIfAny,
    clearPropRefImage,
    doExtractPropFromImage,
    submitEditProp,
    submitAddProp,
    onClosePropDialog,
    onDeleteProp,
    onGeneratePropImage,
    loadPropLibraryList,
    debouncedLoadPropLibrary,
    loadDramaAllPropList,
    debouncedLoadDramaAllPropList,


    onPropLibraryDialogOpen,
    onPropLibraryTabChange,
    isPropAddToEpisodeLoading,
    openEditPropLibrary,
    submitEditPropLibrary,
    onDeletePropLibrary,
    onAddPropToLibrary,
    onAddPropToMaterialLibrary,



    onAddPropFromLibrary,
    onAddDramaPropToEpisode,

    doExtractFromRef2,
  }
}
