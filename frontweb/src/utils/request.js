import axios from 'axios'
import { ElMessage } from 'element-plus'
import { t, te, currentLocale } from '../i18n/index.js'

const request = axios.create({
  baseURL: '/api/v1',
  timeout: 600000,
  headers: { 'Content-Type': 'application/json' }
})

request.interceptors.request.use((config) => {
  const lang = currentLocale?.value === 'en' ? 'en' : 'zh'
  config.headers = config.headers || {}
  config.headers['Accept-Language'] = lang
  return config
})

request.interceptors.response.use(
  (response) => {
    // blob 类型直接返回原始数据，不做 JSON 解包
    if (response.config?.responseType === 'blob') {
      return response.data
    }
    const res = response.data
    if (res.success !== false) {
      return res.data !== undefined ? res.data : res
    }
    const code = res.error?.code
    const msg = (code && te('errors.' + code)) ? t('errors.' + code) : (res.error?.message || t('messages.requestFailed'))
    return Promise.reject(new Error(msg))
  },
  (error) => {
    // 提取后端实际错误信息（优先 API 返回的 message，而非 axios 通用 "status code 500"）
    const backendCode = error.response?.data?.error?.code
    const backendMsg = error.response?.data?.error?.message
    let msg = backendMsg
    if (backendCode && te('errors.' + backendCode)) {
      msg = t('errors.' + backendCode)
    } else if (!msg) {
      msg = error.message || t('messages.networkError')
    }
    ElMessage.error(msg)
    // 将真实错误信息写回 message，使组件 catch 块可直接用 e.message 获取可读内容
    if (msg) error.message = msg
    return Promise.reject(error)
  }
)

export default request
