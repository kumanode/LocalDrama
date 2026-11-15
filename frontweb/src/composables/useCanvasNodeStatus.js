import { reactive } from 'vue'
import { currentLocale } from '../i18n/index.js'

/** 画布节点操作状态（生图/生视频/生成参考图等） */
export function createCanvasNodeStatusStore() {
  const map = reactive({})

  function set(nodeId, payload) {
    if (!nodeId) return
    if (!payload) {
      delete map[nodeId]
      return
    }
    const defaultMsg = currentLocale.value === 'en' ? 'Processing…' : '处理中…'
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

const STATUS_DICT = {
  zh: {
    image: '生图中',
    video: '生视频中',
    audio: '配音中',
    polish: '润色中',
    save: '保存中',
    ref_image: '生成参考图',
    generate_sb: 'AI 生成分镜',
    save_script: '保存剧本',
    extract_chars: '提取角色',
    extract_scenes: '提取场景',
    extract_props: '提取道具',
    extract_all: '一键提取',
  },
  en: {
    image: 'Generating image',
    video: 'Generating video',
    audio: 'Generating voice',
    polish: 'Polishing prompt',
    save: 'Saving',
    ref_image: 'Generating ref image',
    generate_sb: 'Generating shots',
    save_script: 'Saving script',
    extract_chars: 'Extracting characters',
    extract_scenes: 'Extracting scenes',
    extract_props: 'Extracting props',
    extract_all: 'Extracting all assets',
  },
}

export const CANVAS_NODE_STATUS_LABELS = new Proxy({}, {
  get(_, prop) {
    const lang = currentLocale.value === 'en' ? 'en' : 'zh'
    return STATUS_DICT[lang]?.[prop] || STATUS_DICT.zh[prop] || prop
  },
})
