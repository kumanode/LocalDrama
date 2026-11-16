/**
 * flow2api 兼容层：把 LocalDrama 的画幅 / 时长参数收敛到 flow2api 支持的枚举。
 *
 * flow2api 只模拟 Gemini 的图片（generateContent）与视频（predictLongRunning）接口，
 * 且支持的取值比 Google 官方窄：
 *   图片画幅：16:9 / 9:16 / 1:1 / 4:3 / 3:4（Imagen 4 仅 16:9 / 9:16）
 *   视频画幅：16:9 / 9:16
 *   视频时长：Veo 忽略；Omni 1.1 ≥ 4/6/8/10；Omni 1.2 ≥ 3–15
 *
 * 该模块保持纯函数，便于单元测试。
 */

/** 是否为 flow2api 配置（provider 显式标记；也兼容本地地址 + Gemini 协议的配置） */
function isFlow2ApiConfig(config) {
  const provider = String(config?.provider || '').trim().toLowerCase();
  if (provider === 'flow2api') return true;
  // 兜底：用户把 provider 留成 gemini / google，或显式填了 gemini 协议，且 base_url 指向本地 flow2api 代理
  const proto = String(config?.api_protocol || '').trim().toLowerCase();
  const base = String(config?.base_url || '').trim().toLowerCase().replace(/\/+$/, '');
  const isGeminiProto = proto === 'gemini' || (!proto && (provider === 'gemini' || provider === 'google'));
  if (!isGeminiProto) return false;
  return /^(https?:\/\/)?(127\.0\.0\.1|localhost)(:\d+)?$/.test(base);
}

/** flow2api 支持的图片画幅 */
const FLOW2API_IMAGE_ASPECT_RATIOS = ['16:9', '9:16', '1:1', '4:3', '3:4'];
/** Imagen 4 只支持横屏 / 竖屏 */
const FLOW2API_IMAGEN_ASPECT_RATIOS = ['16:9', '9:16'];

/** "16:9" → 1.777… ；非法返回 null */
function ratioValue(ratio) {
  const m = String(ratio || '').trim().match(/^(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)$/);
  if (!m || Number(m[2]) === 0) return null;
  return Number(m[1]) / Number(m[2]);
}

/** 在候选集中挑最接近目标宽高比的一项（按对数距离，避免极端比例偏差） */
function pickClosestRatio(ratio, candidates) {
  const target = ratioValue(ratio);
  if (target == null) return candidates[0];
  let best = candidates[0];
  let bestScore = Infinity;
  for (const candidate of candidates) {
    const v = ratioValue(candidate);
    if (v == null) continue;
    const score = Math.abs(Math.log(target / v));
    if (score < bestScore) {
      bestScore = score;
      best = candidate;
    }
  }
  return best;
}

function isImagenModel(modelName) {
  return /imagen/i.test(String(modelName || ''));
}

/**
 * 图片画幅归一化：映射到 flow2api 支持的最接近比例。
 * @param {string} ratio 例如 "21:9" / "2:3" / "1280x720"
 * @param {string} [modelName] 用于判断 Imagen 4 的受限集合
 */
function normalizeFlow2ApiImageAspectRatio(ratio, modelName) {
  const candidates = isImagenModel(modelName)
    ? FLOW2API_IMAGEN_ASPECT_RATIOS
    : FLOW2API_IMAGE_ASPECT_RATIOS;
  const raw = String(ratio || '').trim();
  if (candidates.includes(raw)) return raw;
  // 兼容 "1280x720" 像素写法
  const px = raw.toLowerCase().replace(/\s/g, '').match(/^(\d+)[x*](\d+)$/);
  const target = px ? `${px[1]}:${px[2]}` : raw;
  return pickClosestRatio(target, candidates);
}

/**
 * 视频画幅归一化：flow2api 仅接受 16:9 / 9:16。
 * 竖屏比例（高 > 宽）→ 9:16，其余 → 16:9。
 */
function normalizeFlow2ApiVideoAspectRatio(ratio) {
  const raw = String(ratio || '').trim();
  if (raw === '16:9' || raw === '9:16') return raw;
  const px = raw.toLowerCase().replace(/\s/g, '').match(/^(\d+)[x*](\d+)$/);
  const value = px ? Number(px[1]) / Number(px[2]) : ratioValue(raw);
  if (value == null) return '16:9';
  return value < 1 ? '9:16' : '16:9';
}

function isVeoModel(modelName) {
  return /veo/i.test(String(modelName || ''));
}

function isOmni11(modelName) {
  return /omni[\s\-_]*1[._]1|omni[\s\-_]*flash|^omni$/i.test(String(modelName || ''));
}

function isOmni12(modelName) {
  return /omni[\s\-_]*1[._]2/i.test(String(modelName || ''));
}

function isVeo31Lite(modelName) {
  return /veo.*3[._]1.*lite/i.test(String(modelName || ''));
}

function isVeo31Fast(modelName) {
  return /veo.*3[._]1.*fast/i.test(String(modelName || ''));
}

function isVeo31Quality(modelName) {
  const m = String(modelName || '');
  return /veo.*3[._]1.*(quality|standard)/i.test(m) || 
         (/veo.*3[._]1/i.test(m) && !/lite|fast/i.test(m));
}

/**
 * 计划 flow2api 视频输入图片（首帧、尾帧、参考图）。
 *
 * flow2api 把首帧 + 尾帧 + 参考图合并成一个图片列表，再按张数选模型，并检查该模型的 max_images：
 *   - Veo Lite：I2V 只收 1 张；
 *   - Veo Fast：有参考图 → R2V（总数 ≤ 3），否则 I2V 首尾帧（≤ 2）；
 *   - Veo Quality：只有 I2V（≤ 2），没有参考图模式，多出来的图会被当成尾帧；
 *   - Omni：1 张首帧、2 张首尾帧、3 张才是参考图模式，总数 ≤ 3。
 * 所以 Omni 有首帧时参考图必须凑满 2 张（总数 3）才是参考图；只有 1 张会被误当成尾帧。
 *
 * @param {string} modelName
 * @param {{ hasFirst: boolean, hasLast: boolean, refCount: number }} input
 * @returns {{ useLastFrame: boolean, refLimit: number, refMin: number }}
 *   refLimit：最多发送的参考图数；refMin：少于该张数时不要发送参考图（避免被误判成尾帧）
 */
function planFlow2ApiVideoImages(modelName, input) {
  const { hasFirst, hasLast } = input;

  // Veo 3.1 - Lite: 不支持尾帧和参考图
  if (isVeo31Lite(modelName)) {
    return { useLastFrame: false, refLimit: 0, refMin: 0 };
  }

  // Veo 3.1 - Fast：尾帧优先；否则参考图（有首帧最多 2 张，总数 ≤ 3）
  if (isVeo31Fast(modelName)) {
    if (hasLast) return { useLastFrame: true, refLimit: 0, refMin: 0 };
    return { useLastFrame: false, refLimit: hasFirst ? 2 : 3, refMin: 0 };
  }

  // Veo 3.1 - Quality：没有参考图模式，只允许首帧 + 尾帧
  if (isVeo31Quality(modelName)) {
    return { useLastFrame: !!hasLast, refLimit: 0, refMin: 0 };
  }

  // Omni 及其他：尾帧优先；否则参考图总数 ≤ 3，且有首帧时至少 2 张才会走参考图模式
  if (hasLast) return { useLastFrame: true, refLimit: 0, refMin: 0 };
  return hasFirst
    ? { useLastFrame: false, refLimit: 2, refMin: 2 }
    : { useLastFrame: false, refLimit: 3, refMin: 0 };
}

/**
 * 视频时长归一化。
 * @returns {number|null} null 表示不应发送 durationSeconds
 */
function normalizeFlow2ApiVideoDuration(duration, modelName) {
  const model = String(modelName || '');
  // Veo 3.1 系列忽略时长参数，上游固定 8 秒；不要发送，避免拼出不存在的时间档
  if (isVeoModel(model)) return null;

  const raw = Number(duration);
  const base = Number.isFinite(raw) && raw > 0 ? raw : 8;

  if (isOmni12(model)) {
    return Math.min(15, Math.max(3, Math.round(base)));
  }
  if (isOmni11(model)) {
    const allowed = [4, 6, 8, 10];
    const median = 7;
    return allowed.reduce((best, v) => {
      const distBest = Math.abs(best - base);
      const distV = Math.abs(v - base);
      if (distV < distBest) return v;
      if (distV === distBest) return base < median ? Math.min(best, v) : Math.max(best, v);
      return best;
    }, allowed[0]);
  }
  // 未知模型：按 Omni 1.2 的宽区间处理，尽量避免 400
  return Math.min(15, Math.max(3, Math.round(base)));
}

module.exports = {
  FLOW2API_IMAGE_ASPECT_RATIOS,
  FLOW2API_IMAGEN_ASPECT_RATIOS,
  isFlow2ApiConfig,
  normalizeFlow2ApiImageAspectRatio,
  normalizeFlow2ApiVideoAspectRatio,
  normalizeFlow2ApiVideoDuration,
  planFlow2ApiVideoImages,
};
