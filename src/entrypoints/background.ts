import type { RuntimeMessage } from "@/shared/messages"
import type { ExtensionSettings } from "@/shared/settings"
import { browser, defineBackground, storage } from "#imports"
import { MESSAGE_TYPE } from "@/shared/messages"
import { DEFAULT_SETTINGS, mergeSettings, normalizeStoredSettings, SETTINGS_STORAGE_KEY } from "@/shared/settings"
import { TRANSLATION_ABORT_REASON, translateTextWithAbort } from "@/shared/api"

interface MessageSenderLike {
  tab?: {
    id?: number
  }
  frameId?: number
}

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

function buildAbortScope(message: RuntimeMessage, sender: MessageSenderLike): string | undefined {
  if (message.type !== MESSAGE_TYPE.TRANSLATE_TEXT) {
    return undefined
  }

  const abortKey = message.payload.abortKey?.trim()
  if (!abortKey) {
    return undefined
  }

  const tabId = sender.tab?.id ?? "extension"
  const frameId = sender.frameId ?? 0
  return `${tabId}:${frameId}:${abortKey}`
}

async function translateTextBySettings(
  text: string,
  sourceLang: string | undefined,
  targetLang: string | undefined,
  abortScope?: string
) {
  const settings = await getSettings()
  try {
    return await translateTextWithAbort(text, sourceLang, targetLang, settings, abortScope)
  } catch (error: any) {
    if (error.name === "AbortError" || error.message === TRANSLATION_ABORT_REASON) {
      console.log("Translation request aborted.")
      return "" // Return empty if aborted
    }
    throw error
  }
}

export default defineBackground({
  type: "module",
  main: () => {
    browser.runtime.onMessage.addListener((message: RuntimeMessage, sender) => {
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
            buildAbortScope(message, sender ?? {}),
          )

        default:
          return undefined
      }
    })
  },
})
