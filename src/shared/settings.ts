export interface LanguageOption {
  code: string
  label: string
}

export interface ExtensionSettings {
  deepLApiKey: string
  deepLApiBaseUrl: string
  deepLXToken: string
  deepLXBaseUrl: string
  sourceLang: string
  targetLang: string
}

export const SETTINGS_STORAGE_KEY = "deeplx.settings"

export const DEFAULT_SETTINGS: ExtensionSettings = {
  deepLApiKey: "",
  deepLApiBaseUrl: "https://api-free.deepl.com",
  deepLXToken: "",
  deepLXBaseUrl: "https://api.deeplx.org",
  sourceLang: "AUTO",
  targetLang: "ZH",
}

export const SOURCE_LANG_OPTIONS: LanguageOption[] = [
  { code: "AUTO", label: "自动检测" },
  { code: "EN", label: "English" },
  { code: "ZH", label: "中文" },
  { code: "JA", label: "日本語" },
  { code: "KO", label: "한국어" },
  { code: "FR", label: "Français" },
  { code: "DE", label: "Deutsch" },
  { code: "ES", label: "Español" },
  { code: "RU", label: "Русский" },
]

export const TARGET_LANG_OPTIONS: LanguageOption[] = [
  { code: "ZH", label: "中文" },
  { code: "EN", label: "English" },
  { code: "JA", label: "日本語" },
  { code: "KO", label: "한국어" },
  { code: "FR", label: "Français" },
  { code: "DE", label: "Deutsch" },
  { code: "ES", label: "Español" },
  { code: "RU", label: "Русский" },
  { code: "PT", label: "Português" },
  { code: "IT", label: "Italiano" },
  { code: "NL", label: "Nederlands" },
  { code: "PL", label: "Polski" },
  { code: "TR", label: "Türkçe" },
  { code: "UK", label: "Українська" },
]

export function mergeSettings(patch: Partial<ExtensionSettings>, base: ExtensionSettings): ExtensionSettings {
  return {
    ...base,
    ...patch,
  }
}

export function normalizeStoredSettings(raw: unknown): ExtensionSettings {
  const value = raw && typeof raw === "object" ? raw as Record<string, unknown> : {}

  const deepLApiKey = typeof value.deepLApiKey === "string" ? value.deepLApiKey : ""
  const deepLApiBaseUrl = typeof value.deepLApiBaseUrl === "string" ? value.deepLApiBaseUrl : ""
  const deepLXToken = typeof value.deepLXToken === "string" ? value.deepLXToken : ""
  const deepLXBaseUrl = typeof value.deepLXBaseUrl === "string" ? value.deepLXBaseUrl : ""
  const sourceLang = typeof value.sourceLang === "string" ? value.sourceLang : DEFAULT_SETTINGS.sourceLang
  const targetLang = typeof value.targetLang === "string" ? value.targetLang : DEFAULT_SETTINGS.targetLang

  // Backward compatibility with previous shape in this new project:
  // { apiKey, apiBaseUrl } where apiKey was used as DeepLX token.
  const legacyApiKey = typeof value.apiKey === "string" ? value.apiKey : ""
  const legacyApiBaseUrl = typeof value.apiBaseUrl === "string" ? value.apiBaseUrl : ""

  return {
    deepLApiKey,
    deepLApiBaseUrl: normalizeApiBaseUrl(deepLApiBaseUrl || DEFAULT_SETTINGS.deepLApiBaseUrl),
    deepLXToken: deepLXToken || legacyApiKey,
    deepLXBaseUrl: normalizeApiBaseUrl(deepLXBaseUrl || legacyApiBaseUrl || DEFAULT_SETTINGS.deepLXBaseUrl),
    sourceLang,
    targetLang,
  }
}

export function normalizeApiBaseUrl(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, "")
  if (!trimmed) {
    return ""
  }
  return trimmed
}

export function toDeepLOfficialEndpoint(apiBaseUrl: string): string {
  const normalized = normalizeApiBaseUrl(apiBaseUrl) || DEFAULT_SETTINGS.deepLApiBaseUrl
  if (normalized.endsWith("/v2/translate")) {
    return normalized
  }
  return `${normalized}/v2/translate`
}

export function toDeepLXEndpoint(apiBaseUrl: string, apiKey?: string): string {
  const base = normalizeApiBaseUrl(apiBaseUrl) || DEFAULT_SETTINGS.deepLXBaseUrl

  if (base.includes("{{apiKey}}")) {
    if (!apiKey?.trim()) {
      throw new Error("当前 baseURL 使用了 {{apiKey}} 占位符，请先填写 API Key")
    }
    return base.replace(/\{\{apiKey\}\}/g, apiKey.trim())
  }

  if (base === "https://api.deeplx.org") {
    if (apiKey?.trim()) {
      return `${base}/${apiKey.trim()}/translate`
    }
    return `${base}/translate`
  }

  if (base.endsWith("/translate")) {
    return base
  }

  if (apiKey?.trim()) {
    return `${base}/${apiKey.trim()}/translate`
  }

  return `${base}/translate`
}
