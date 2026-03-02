import type { RuntimeMessage } from "@/shared/messages"
import type { ExtensionSettings } from "@/shared/settings"
import { browser, defineBackground, storage } from "#imports"
import { MESSAGE_TYPE } from "@/shared/messages"
import { DEFAULT_SETTINGS, mergeSettings, normalizeStoredSettings, SETTINGS_STORAGE_KEY, toDeepLXEndpoint } from "@/shared/settings"

async function getSettings(): Promise<ExtensionSettings> {
  const value = await storage.getItem<unknown>(`local:${SETTINGS_STORAGE_KEY}`)
  if (!value) {
    return DEFAULT_SETTINGS
  }
  return mergeSettings(normalizeStoredSettings(value), DEFAULT_SETTINGS)
}

async function updateSettings(patch: Partial<ExtensionSettings>): Promise<ExtensionSettings> {
  const current = await getSettings()
  const next = mergeSettings(patch, current)
  await storage.setItem(`local:${SETTINGS_STORAGE_KEY}`, next)
  return next
}

function formatDeepLXLang(value: string): string {
  if (!value) {
    return "AUTO"
  }
  const normalized = value.toUpperCase()
  if (normalized === "ZH-TW") {
    return "ZH-HANT"
  }
  return normalized
}

function toGoogleLang(value: string, isSource = false): string {
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
    default:
      return normalized.toLowerCase()
  }
}

async function translateWithGoogle(text: string, sourceLang: string | undefined, targetLang: string | undefined, settings: ExtensionSettings) {
  const source = toGoogleLang(sourceLang ?? settings.sourceLang, true)
  const target = toGoogleLang(targetLang ?? settings.targetLang)

  const params = new URLSearchParams({
    client: "gtx",
    dt: "t",
    sl: source,
    tl: target,
    q: text,
  })

  const endpoint = `https://translate.googleapis.com/translate_a/single?${params.toString()}`
  const response = await fetch(endpoint)
  if (!response.ok) {
    const errorText = await response.text().catch(() => "")
    throw new Error(`Google Translate 请求失败: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ""}`)
  }

  const data = await response.json() as unknown
  if (!Array.isArray(data) || !Array.isArray(data[0])) {
    throw new Error("Google Translate 返回格式异常")
  }

  const translated = (data[0] as unknown[])
    .map((chunk) => {
      if (!Array.isArray(chunk)) {
        return ""
      }
      const piece = chunk[0]
      return typeof piece === "string" ? piece : ""
    })
    .join("")
    .trim()

  if (!translated) {
    throw new Error("Google Translate 返回为空")
  }

  return translated
}

async function translateWithDeepLX(text: string, sourceLang: string | undefined, targetLang: string | undefined, settings: ExtensionSettings) {
  const apiKey = settings.apiKey.trim()
  const endpoint = toDeepLXEndpoint(settings.apiBaseUrl, apiKey)
  const resolvedTargetLang = formatDeepLXLang(targetLang ?? settings.targetLang)
  const resolvedSourceLang = formatDeepLXLang(sourceLang ?? settings.sourceLang)

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      source_lang: resolvedSourceLang === "AUTO" ? "auto" : resolvedSourceLang,
      target_lang: resolvedTargetLang,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => "")
    throw new Error(`DeepLX 请求失败: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ""}`)
  }

  const data = await response.json() as {
    data?: string
    translations?: Array<{ text?: string }>
  }

  const translated = data.data ?? data.translations?.[0]?.text
  if (!translated) {
    throw new Error("DeepLX 返回格式异常")
  }
  return translated
}

async function translateTextBySettings(text: string, sourceLang: string | undefined, targetLang: string | undefined) {
  const settings = await getSettings()
  if (settings.engine === "google") {
    return translateWithGoogle(text, sourceLang, targetLang, settings)
  }
  return translateWithDeepLX(text, sourceLang, targetLang, settings)
}

export default defineBackground({
  type: "module",
  main: () => {
    browser.runtime.onMessage.addListener((message: RuntimeMessage) => {
      if (!message || typeof message !== "object" || !("type" in message)) {
        return undefined
      }

      switch (message.type) {
        case MESSAGE_TYPE.GET_SETTINGS:
          return getSettings()

        case MESSAGE_TYPE.UPDATE_SETTINGS:
          return updateSettings(message.payload ?? {})

        case MESSAGE_TYPE.TRANSLATE_TEXT:
          return translateTextBySettings(
            message.payload.text,
            message.payload.sourceLang,
            message.payload.targetLang,
          )

        default:
          return undefined
      }
    })
  },
})
