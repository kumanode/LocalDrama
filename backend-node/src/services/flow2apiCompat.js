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
 * 根据模型限制返回是否使用尾帧以及参考图上限。
 * @param {string} modelName
 * @param {{ hasFirst: boolean, hasLast: boolean, refCount: number }} input
 * @returns {{ useLastFrame: boolean, refLimit: number }}
 */
function planFlow2ApiVideoImages(modelName, input) {
  const { hasFirst, hasLast, refCount } = input;
  
  // Veo 3.1 - Lite: 不支持尾帧和参考图
  if (isVeo31Lite(modelName)) {
    return { useLastFrame: false, refLimit: 0 };
  }
  
  // Veo 3.1 - Fast
  if (isVeo31Fast(modelName)) {
    // 优先级：尾帧 > 参考图
    if (hasLast) {
      return { useLastFrame: true, refLimit: 0 };
    }
    // 无尾帧时允许参考图
    const refLimit = hasFirst ? 2 : 3;
    return { useLastFrame: false, refLimit };
  }
  
  // Veo 3.1 - Quality
  if (isVeo31Quality(modelName)) {
    if (hasLast) {
      return { useLastFrame: true, refLimit: 0 };
    }
    const refLimit = hasFirst ? 1 : 0;
    return { useLastFrame: false, refLimit };
  }
  
  // Omni 及其他：默认行为（支持尾帧，最多 3 张参考图）
  if (hasLast) {
    return { useLastFrame: true, refLimit: 0 };
  }
  return { useLastFrame: false, refLimit: 3 };
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
