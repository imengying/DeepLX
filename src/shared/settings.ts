export interface LanguageOption {
  code: string
  label: string
}

export interface ExtensionSettings {
  engine: TranslationEngine
  apiKey: string
  apiBaseUrl: string
  sourceLang: string
  targetLang: string
}

export type TranslationEngine = "google" | "deeplx"

export const SETTINGS_STORAGE_KEY = "deeplx.settings"

export const DEFAULT_SETTINGS: ExtensionSettings = {
  engine: "google",
  apiKey: "",
  apiBaseUrl: "https://api.deeplx.org",
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

export function normalizeApiBaseUrl(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, "")
  return trimmed
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function isTranslationEngine(value: unknown): value is TranslationEngine {
  return value === "google" || value === "deeplx"
}

/**
 * Backward-compat migration from previous schemas:
 * 1) { apiKey, apiBaseUrl }
 * 2) { deepLApiKey, deepLApiBaseUrl, deepLXToken, deepLXBaseUrl }
 */
export function normalizeStoredSettings(raw: unknown): ExtensionSettings {
  const value = raw && typeof raw === "object" ? raw as Record<string, unknown> : {}
  const storedEngine = isTranslationEngine(value.engine) ? value.engine : undefined

  const legacyApiKey = isNonEmptyString(value.apiKey) ? value.apiKey.trim() : ""
  const legacyApiBaseUrl = isNonEmptyString(value.apiBaseUrl) ? value.apiBaseUrl : ""

  const deepLApiKey = isNonEmptyString(value.deepLApiKey) ? value.deepLApiKey.trim() : ""
  const deepLApiBaseUrl = isNonEmptyString(value.deepLApiBaseUrl) ? value.deepLApiBaseUrl : ""
  const deepLXToken = isNonEmptyString(value.deepLXToken) ? value.deepLXToken.trim() : ""
  const deepLXBaseUrl = isNonEmptyString(value.deepLXBaseUrl) ? value.deepLXBaseUrl : ""

  const apiKey = legacyApiKey || deepLXToken || deepLApiKey || ""

  const engine = storedEngine ?? DEFAULT_SETTINGS.engine

  let apiBaseUrl = legacyApiBaseUrl
  if (!apiBaseUrl) {
    apiBaseUrl = deepLXToken ? deepLXBaseUrl : deepLApiBaseUrl
  }
  if (!apiBaseUrl || engine === "google") {
    apiBaseUrl = DEFAULT_SETTINGS.apiBaseUrl
  }

  const sourceLang = isNonEmptyString(value.sourceLang) ? value.sourceLang.toUpperCase() : DEFAULT_SETTINGS.sourceLang
  const targetLang = isNonEmptyString(value.targetLang) ? value.targetLang.toUpperCase() : DEFAULT_SETTINGS.targetLang

  return {
    engine,
    apiKey,
    apiBaseUrl: normalizeApiBaseUrl(apiBaseUrl) || DEFAULT_SETTINGS.apiBaseUrl,
    sourceLang,
    targetLang,
  }
}

export function toDeepLXEndpoint(apiBaseUrl: string, apiKey?: string): string {
  const normalized = normalizeApiBaseUrl(apiBaseUrl)
  const base = normalized || "https://api.deeplx.org"

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
