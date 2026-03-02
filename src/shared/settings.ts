export interface LanguageOption {
  code: string
  label: string
}

export interface ExtensionSettings {
  apiKey: string
  apiBaseUrl: string
  sourceLang: string
  targetLang: string
}

export const SETTINGS_STORAGE_KEY = "deeplx.settings"

export const DEFAULT_SETTINGS: ExtensionSettings = {
  apiKey: "",
  apiBaseUrl: "https://api-free.deepl.com",
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
  if (!trimmed) {
    return DEFAULT_SETTINGS.apiBaseUrl
  }
  return trimmed
}

export function toDeepLEndpoint(apiBaseUrl: string): string {
  const base = normalizeApiBaseUrl(apiBaseUrl)
  if (base.endsWith("/v2/translate")) {
    return base
  }
  return `${base}/v2/translate`
}
