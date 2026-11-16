import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { t } from '@/i18n'
import { uploadAPI } from '@/api/upload'
import { characterAPI } from '@/api/characters'
import { propAPI } from '@/api/props'
import { sceneAPI } from '@/api/scenes'

export function useAssetMedia({ store, dramaId, loadDrama }) {
  const baseUrl = ref('')
  const previewImageUrl = ref(null)
  const dragOverResourceKey = ref(null)
  const uploadingResourceId = ref(null)
  const resourceUploadType = ref(null)
  const resourceUploadId = ref(null)
  const resourceImageFileInput = ref(null)

  function getFirstImageFile(dataTransfer) {
    if (!dataTransfer?.files?.length) return null
    const file = dataTransfer.files[0]
    return file.type.startsWith('image/') ? file : null
  }

  function readFileAsRefImage(file) {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (ev) => resolve({ dataUrl: ev.target.result, filename: file.name })
      reader.readAsDataURL(file)
    })
  }

  function imageUrl(url) {
    if (!url) return ''
    if (url.startsWith('http')) return url
    const base = (baseUrl.value || '').replace(/\/$/, '')
    return base ? base + '/' + url.replace(/^\//, '') : url
  }

  function assetImageUrl(item) {
    if (!item) return ''
    if (typeof item === 'string') return imageUrl(item)
    const localPath = item.local_path && String(item.local_path).trim()
    if (localPath) {
      const p = localPath.replace(/^\//, '')
      return '/static/' + p
    }
    if (item.image_url) return imageUrl(item.image_url)
    return ''
  }

  function hasAssetImage(item) {
    if (!item) return false
    return !!(item.image_url || item.local_path)
  }

  function openImagePreview(url) {
    previewImageUrl.value = url
  }

  function closeImagePreview() {
    previewImageUrl.value = null
  }

  function parseExtraImages(item) {
    if (!item?.extra_images) return []
    try {
      const arr = typeof item.extra_images === 'string' ? JSON.parse(item.extra_images) : item.extra_images
      return Array.isArray(arr) ? arr.filter(Boolean) : []
    } catch { return [] }
  }

  function localPathToUrl(p) {
    if (!p) return ''
    if (p.startsWith('http')) return p
    return '/static/' + p.replace(/^\//, '')
  }

  function findResource(type, id) {
    const list = type === 'character' ? (store.characters ?? [])
      : type === 'prop' ? (store.props ?? [])
      : (store.scenes ?? [])
    return list.find((x) => Number(x.id) === Number(id)) || null
  }

  async function doUploadResourceImage(type, id, file) {
    if (!file || !type || id == null) return
    const key = type === 'character' ? 'char-' : type === 'prop' ? 'prop-' : 'scene-'
    uploadingResourceId.value = key + id
    try {
      const res = await uploadAPI.uploadImage(file, { dramaId: dramaId.value })
      const data = res?.data ?? res
      const uploadedLocalPath = data?.local_path || data?.path || null
      const url = data?.url || uploadedLocalPath
      if (!url) { ElMessage.error(t('filmCreate.uploadNoUrlReturned')); return }

      const current = findResource(type, id)
      const hasPrimary = !!(current?.local_path || current?.image_url)

      if (hasPrimary) {
        const extras = parseExtraImages(current)
        const newPath = uploadedLocalPath || url
        if (!extras.includes(newPath)) extras.push(newPath)
        const extraJson = JSON.stringify(extras)
        if (type === 'character') {
          await characterAPI.putImage(id, { extra_images: extraJson })
        } else if (type === 'prop') {
          await propAPI.update(id, { extra_images: extraJson })
        } else if (type === 'scene') {
          await sceneAPI.update(id, { extra_images: extraJson })
        }
      } else {
        if (type === 'character') {
          await characterAPI.putImage(id, { image_url: url, local_path: uploadedLocalPath ?? null })
        } else if (type === 'prop') {
          await propAPI.update(id, { image_url: url, local_path: uploadedLocalPath ?? null })
        } else if (type === 'scene') {
          await sceneAPI.update(id, { image_url: url, local_path: uploadedLocalPath ?? null })
        }
      }
      await loadDrama()
      ElMessage.success(t('filmCreate.uploadSuccess'))
    } catch (e) {
      ElMessage.error(e.message || t('filmCreate.uploadFailed'))
    } finally {
      uploadingResourceId.value = null
    }
  }

  async function onSetPrimaryImage(type, item, extraPath) {
    const extras = parseExtraImages(item)
    const oldPrimary = item.local_path || ''
    const newExtras = extras.filter((p) => p !== extraPath)
    if (oldPrimary) newExtras.unshift(oldPrimary)
    const extraJson = JSON.stringify(newExtras)
    try {
      if (type === 'character') {
        await characterAPI.putImage(item.id, { local_path: extraPath, image_url: '', extra_images: extraJson })
      } else if (type === 'prop') {
        await propAPI.update(item.id, { local_path: extraPath, image_url: '', extra_images: extraJson })
      } else if (type === 'scene') {
        await sceneAPI.update(item.id, { local_path: extraPath, image_url: '', extra_images: extraJson })
      }
      await loadDrama()
    } catch (e) {
      ElMessage.error(e.message || t('filmCreate.operationFailed'))
    }
  }

  async function onRemoveExtraImage(type, item, extraPath) {
    const extras = parseExtraImages(item).filter((p) => p !== extraPath)
    const extraJson = extras.length ? JSON.stringify(extras) : null
    try {
      if (type === 'character') {
        await characterAPI.putImage(item.id, { extra_images: extraJson })
      } else if (type === 'prop') {
        await propAPI.update(item.id, { extra_images: extraJson })
      } else if (type === 'scene') {
        await sceneAPI.update(item.id, { extra_images: extraJson })
      }
      await loadDrama()
    } catch (e) {
      ElMessage.error(e.message || t('filmCreate.deleteFailed'))
    }
  }

  function onResourceDragOver(e, type, id) {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
    const key = type === 'character' ? 'char-' : type === 'prop' ? 'prop-' : 'scene-'
    dragOverResourceKey.value = key + id
  }

  function onResourceDragLeave(e, key) {
    e.preventDefault()
    if (e.relatedTarget && e.currentTarget.contains(e.relatedTarget)) return
    if (key && dragOverResourceKey.value !== key) return
    dragOverResourceKey.value = null
  }

  function onResourceDrop(e, type, id) {
    e.preventDefault()
    e.stopPropagation()
    dragOverResourceKey.value = null
    const file = getFirstImageFile(e.dataTransfer)
    if (file) doUploadResourceImage(type, id, file)
  }

  function onUploadResourceClick(type, id) {
    resourceUploadType.value = type
    resourceUploadId.value = id
    if (resourceImageFileInput.value) {
      resourceImageFileInput.value.value = ''
      resourceImageFileInput.value.click()
    }
  }

  function onResourceImageFileChange(ev) {
    const file = ev.target?.files?.[0]
    const type = resourceUploadType.value
    const id = resourceUploadId.value
    if (!file || !type || id == null) {
      ev.target.value = ''
      return
    }
    doUploadResourceImage(type, id, file).finally(() => {
      resourceUploadType.value = null
      resourceUploadId.value = null
      ev.target.value = ''
    })
  }

  return {
    baseUrl,
    previewImageUrl,
    dragOverResourceKey,
    uploadingResourceId,
    resourceUploadType,
    resourceUploadId,
    resourceImageFileInput,
    getFirstImageFile,
    readFileAsRefImage,
    imageUrl,
    assetImageUrl,
    hasAssetImage,
    openImagePreview,
    closeImagePreview,
    parseExtraImages,
    localPathToUrl,
    findResource,
    doUploadResourceImage,
    onSetPrimaryImage,
    onRemoveExtraImage,
    onResourceDragOver,
    onResourceDragLeave,
    onResourceDrop,
    onUploadResourceClick,
    onResourceImageFileChange,
  }
}
