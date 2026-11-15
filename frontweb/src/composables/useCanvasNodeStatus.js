import { reactive } from 'vue'
import { t } from '../i18n/index.js'

/** 画布节点操作状态（生图/生视频/生成参考图等） */
export function createCanvasNodeStatusStore() {
  const map = reactive({})

  function set(nodeId, payload) {
    if (!nodeId) return
    if (!payload) {
      delete map[nodeId]
      return
    }
    const defaultMsg = t('dramaCanvas.processing2')
    map[nodeId] = {
      step: payload.step || 'busy',
      message: payload.message || defaultMsg,
      at: Date.now(),
    }
  }

  function clear(nodeId) {
    if (nodeId) delete map[nodeId]
  }

  function get(nodeId) {
    return nodeId ? map[nodeId] || null : null
  }

  function isBusy(nodeId) {
    return !!get(nodeId)
  }

  return { map, set, clear, get, isBusy }
}

// Label keys only: translating at module scope would freeze the labels in the
// language that happened to be active when this module was first imported.
const STATUS_LABEL_KEYS = {
  image: 'dramaCanvas.generatingImage2',
  video: 'dramaCanvas.generatingVideo2',
  audio: 'dramaCanvas.dubbing2',
  polish: 'dramaCanvas.polishing',
  save: 'dramaCanvas.saving2',
  ref_image: 'dramaCanvas.generateReferenceImage',
  generate_sb: 'dramaCanvas.aiStoryboard',
  save_script: 'dramaCanvas.saveScript',
  extract_chars: 'dramaCanvas.extractChars',
  extract_scenes: 'dramaCanvas.extractScenes',
  extract_props: 'dramaCanvas.extractProps',
  extract_all: 'dramaCanvas.extractAll',
}

export const CANVAS_NODE_STATUS_LABELS = new Proxy({}, {
  get(_, prop) {
    if (typeof prop !== 'string') return undefined
    const key = STATUS_LABEL_KEYS[prop]
    return key ? t(key) : prop
  },
})
