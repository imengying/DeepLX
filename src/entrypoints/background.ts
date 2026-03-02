import type { RuntimeMessage } from "@/shared/messages"
import type { ExtensionSettings } from "@/shared/settings"
import { browser, defineBackground, storage } from "#imports"
import { MESSAGE_TYPE } from "@/shared/messages"
import { DEFAULT_SETTINGS, mergeSettings, normalizeStoredSettings, SETTINGS_STORAGE_KEY, toDeepLOfficialEndpoint, toDeepLXEndpoint } from "@/shared/settings"

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

function formatLang(value: string, mode: "deepl" | "deeplx"): string {
  if (!value) {
    return "AUTO"
  }
  const normalized = value.toUpperCase()
  if (mode === "deeplx" && normalized === "ZH-TW") {
    return "ZH-HANT"
  }
  return normalized
}

async function translateWithDeepLX(text: string, sourceLang: string | undefined, targetLang: string | undefined) {
  const settings = await getSettings()
  const deeplxToken = settings.deepLXToken.trim()

  if (deeplxToken) {
    const endpoint = toDeepLXEndpoint(settings.deepLXBaseUrl, deeplxToken)
    const resolvedTargetLang = formatLang(targetLang ?? settings.targetLang, "deeplx")
    const resolvedSourceLang = formatLang(sourceLang ?? settings.sourceLang, "deeplx")

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

  const deepLApiKey = settings.deepLApiKey.trim()
  if (!deepLApiKey) {
    throw new Error("未填写 DeepL API Key（官方模式），也未填写 DeepLX Token")
  }

  const endpoint = toDeepLOfficialEndpoint(settings.deepLApiBaseUrl)
  const resolvedTargetLang = formatLang(targetLang ?? settings.targetLang, "deepl")
  const resolvedSourceLang = formatLang(sourceLang ?? settings.sourceLang, "deepl")

  const body = new URLSearchParams()
  body.append("auth_key", deepLApiKey)
  body.append("text", text)
  body.append("target_lang", resolvedTargetLang)
  if (resolvedSourceLang !== "AUTO") {
    body.append("source_lang", resolvedSourceLang)
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => "")
    throw new Error(`DeepL 请求失败: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ""}`)
  }

  const data = await response.json() as {
    translations?: Array<{ text?: string }>
  }

  const translated = data.translations?.[0]?.text
  if (!translated) {
    throw new Error("DeepL 返回格式异常")
  }
  return translated
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
          return translateWithDeepLX(
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
