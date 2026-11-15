import zhBase from './locales/zh.js'
import enBase from './locales/en.js'
import zhUi from './locales/zh.ui.js'
import enUi from './locales/en.ui.js'

/**
 * Deep-merge translation fragments. The `*.ui.js` files hold strings that were
 * migrated out of components during the i18n cleanup; they are merged on top of
 * the base dictionaries so a namespace such as `filmCreate` keeps both its
 * original keys and the migrated ones.
 */
export function mergeMessages(base, extra) {
  if (!extra || typeof extra !== 'object') return base
  const result = { ...base }
  for (const [key, value] of Object.entries(extra)) {
    const current = result[key]
    if (value && typeof value === 'object' && !Array.isArray(value) && current && typeof current === 'object' && !Array.isArray(current)) {
      result[key] = mergeMessages(current, value)
    } else {
      result[key] = value
    }
  }
  return result
}

export const messages = {
  zh: mergeMessages(zhBase, zhUi),
  en: mergeMessages(enBase, enUi),
}

export default messages
