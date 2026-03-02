import type { RuntimeMessage } from "@/shared/messages"
import type { ExtensionSettings } from "@/shared/settings"
import { browser, defineBackground, storage } from "#imports"
import { MESSAGE_TYPE } from "@/shared/messages"
import { DEFAULT_SETTINGS, mergeSettings, SETTINGS_STORAGE_KEY, toDeepLEndpoint } from "@/shared/settings"

async function getSettings(): Promise<ExtensionSettings> {
  const value = await storage.getItem<ExtensionSettings>(`local:${SETTINGS_STORAGE_KEY}`)
  return value ? mergeSettings(value, DEFAULT_SETTINGS) : DEFAULT_SETTINGS
}

async function updateSettings(patch: Partial<ExtensionSettings>): Promise<ExtensionSettings> {
  const current = await getSettings()
  const next = mergeSettings(patch, current)
  await storage.setItem(`local:${SETTINGS_STORAGE_KEY}`, next)
  return next
}

async function translateWithDeepL(text: string, sourceLang: string | undefined, targetLang: string | undefined) {
  const settings = await getSettings()
  const apiKey = settings.apiKey.trim()

  if (!apiKey) {
    throw new Error("请先在设置里填写 DeepL API Key")
  }

  const endpoint = toDeepLEndpoint(settings.apiBaseUrl)
  const resolvedTargetLang = (targetLang ?? settings.targetLang).toUpperCase()
  const resolvedSourceLang = (sourceLang ?? settings.sourceLang).toUpperCase()

  const body = new URLSearchParams()
  body.append("auth_key", apiKey)
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
          return translateWithDeepL(
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
