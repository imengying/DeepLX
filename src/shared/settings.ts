import { t } from "./i18n"

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
  { code: "AUTO", label: "Auto Detect" },
  { code: "EN", label: "English" },
  { code: "ZH", label: "中文" },
  { code: "ZH-TW", label: "繁體中文" },
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
  { code: "BG", label: "Български" },
  { code: "CS", label: "Čeština" },
  { code: "DA", label: "Dansk" },
  { code: "EL", label: "Ελληνικά" },
  { code: "ET", label: "Eesti" },
  { code: "FI", label: "Suomi" },
  { code: "HU", label: "Magyar" },
  { code: "LT", label: "Lietuvių" },
  { code: "LV", label: "Latviešu" },
  { code: "NB", label: "Norsk Bokmål" },
  { code: "RO", label: "Română" },
  { code: "SK", label: "Slovenčina" },
  { code: "SL", label: "Slovenščina" },
  { code: "SV", label: "Svenska" },
  { code: "AR", label: "العربية" },
  { code: "HI", label: "हिन्दी" },
  { code: "ID", label: "Bahasa Indonesia" },
  { code: "TH", label: "ไทย" },
  { code: "VI", label: "Tiếng Việt" },
]

export const TARGET_LANG_OPTIONS: LanguageOption[] = [
  { code: "ZH", label: "中文" },
  { code: "ZH-TW", label: "繁體中文" },
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
  { code: "BG", label: "Български" },
  { code: "CS", label: "Čeština" },
  { code: "DA", label: "Dansk" },
  { code: "EL", label: "Ελληνικά" },
  { code: "ET", label: "Eesti" },
  { code: "FI", label: "Suomi" },
  { code: "HU", label: "Magyar" },
  { code: "LT", label: "Lietuvių" },
  { code: "LV", label: "Latviešu" },
  { code: "NB", label: "Norsk Bokmål" },
  { code: "RO", label: "Română" },
  { code: "SK", label: "Slovenčina" },
  { code: "SL", label: "Slovenščina" },
  { code: "SV", label: "Svenska" },
  { code: "AR", label: "العربية" },
  { code: "HI", label: "हिन्दी" },
  { code: "ID", label: "Bahasa Indonesia" },
  { code: "TH", label: "ไทย" },
  { code: "VI", label: "Tiếng Việt" },
]

const TARGET_LANG_CODE_SET = new Set(TARGET_LANG_OPTIONS.map(item => item.code))
const TARGET_LANG_EXACT_MAP: Record<string, string> = {
  "zh-tw": "ZH-TW",
  "zh-hk": "ZH-TW",
  "zh-mo": "ZH-TW",
  "zh-hant": "ZH-TW",
}

const TARGET_LANG_BASE_MAP: Record<string, string> = {
  zh: "ZH",
  en: "EN",
  ja: "JA",
  ko: "KO",
  fr: "FR",
  de: "DE",
  es: "ES",
  ru: "RU",
  pt: "PT",
  it: "IT",
  nl: "NL",
  pl: "PL",
  tr: "TR",
  uk: "UK",
  bg: "BG",
  cs: "CS",
  da: "DA",
  el: "EL",
  et: "ET",
  fi: "FI",
  hu: "HU",
  lt: "LT",
  lv: "LV",
  nb: "NB",
  no: "NB",
  nn: "NB",
  ro: "RO",
  sk: "SK",
  sl: "SL",
  sv: "SV",
  ar: "AR",
  hi: "HI",
  id: "ID",
  th: "TH",
  vi: "VI",
}

function normalizeLocaleTag(value: string): string {
  return value.trim().replace(/_/g, "-").toLowerCase()
}

export function resolveTargetLangFromLocale(rawLocale?: string): string {
  if (!rawLocale?.trim()) {
    return DEFAULT_SETTINGS.targetLang
  }

  const locale = normalizeLocaleTag(rawLocale)
  const exact = TARGET_LANG_EXACT_MAP[locale]
  if (exact && TARGET_LANG_CODE_SET.has(exact)) {
    return exact
  }

  const base = locale.split("-")[0]
  const mapped = TARGET_LANG_BASE_MAP[base]
  if (mapped && TARGET_LANG_CODE_SET.has(mapped)) {
    return mapped
  }

  return DEFAULT_SETTINGS.targetLang
}

export function createDefaultSettings(rawLocale?: string): ExtensionSettings {
  return {
    ...DEFAULT_SETTINGS,
    targetLang: resolveTargetLangFromLocale(rawLocale),
  }
}

export function getSourceLanguageOptions(rawUiLanguage?: string): LanguageOption[] {
  const autoDetectLabel = t("language.autoDetect", undefined, rawUiLanguage)
  return SOURCE_LANG_OPTIONS.map((item) => {
    if (item.code === "AUTO") {
      return {
        ...item,
        label: autoDetectLabel,
      }
    }

    return item
  })
}

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
export function normalizeStoredSettings(raw: unknown, fallback: ExtensionSettings = DEFAULT_SETTINGS): ExtensionSettings {
  const value = raw && typeof raw === "object" ? raw as Record<string, unknown> : {}
  const storedEngine = isTranslationEngine(value.engine) ? value.engine : undefined

  const legacyApiKey = isNonEmptyString(value.apiKey) ? value.apiKey.trim() : ""
  const legacyApiBaseUrl = isNonEmptyString(value.apiBaseUrl) ? value.apiBaseUrl : ""

  const deepLApiKey = isNonEmptyString(value.deepLApiKey) ? value.deepLApiKey.trim() : ""
  const deepLApiBaseUrl = isNonEmptyString(value.deepLApiBaseUrl) ? value.deepLApiBaseUrl : ""
  const deepLXToken = isNonEmptyString(value.deepLXToken) ? value.deepLXToken.trim() : ""
  const deepLXBaseUrl = isNonEmptyString(value.deepLXBaseUrl) ? value.deepLXBaseUrl : ""

  const apiKey = legacyApiKey || deepLXToken || deepLApiKey || ""

  const engine = storedEngine ?? fallback.engine

  let apiBaseUrl = legacyApiBaseUrl
  if (!apiBaseUrl) {
    apiBaseUrl = deepLXToken ? deepLXBaseUrl : deepLApiBaseUrl
  }
  if (!apiBaseUrl || engine === "google") {
    apiBaseUrl = fallback.apiBaseUrl
  }

  const sourceLang = isNonEmptyString(value.sourceLang) ? value.sourceLang.toUpperCase() : fallback.sourceLang
  const targetLang = isNonEmptyString(value.targetLang) ? value.targetLang.toUpperCase() : fallback.targetLang

  return {
    engine,
    apiKey,
    apiBaseUrl: normalizeApiBaseUrl(apiBaseUrl) || fallback.apiBaseUrl,
    sourceLang,
    targetLang,
  }
}

export function toDeepLXEndpoint(apiBaseUrl: string, apiKey?: string): string {
  const normalized = normalizeApiBaseUrl(apiBaseUrl)
  const base = normalized || "https://api.deeplx.org"

  if (base.includes("{{apiKey}}")) {
    if (!apiKey?.trim()) {
      throw new Error(t("settings.apiKeyPlaceholderError"))
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

export function formatDeepLXLang(value: string): string {
  if (!value) {
    return "AUTO"
  }
  const normalized = value.toUpperCase()
  if (normalized === "ZH-TW") {
    return "ZH-HANT"
  }
  return normalized
}

export function toGoogleLang(value: string, isSource = false): string {
  const normalized = value.toUpperCase()

  if (isSource && normalized === "AUTO") {
    return "auto"
  }

  switch (normalized) {
    case "ZH":
      return "zh-CN"
    case "ZH-TW":
    case "ZH-HANT":
      return "zh-TW"
    case "NB":
      return "no"
    default:
      return normalized.toLowerCase()
  }
}
