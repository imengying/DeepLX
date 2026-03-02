import type { ExtensionSettings } from "./settings"

export const MESSAGE_TYPE = {
  GET_SETTINGS: "DEEPLX_GET_SETTINGS",
  UPDATE_SETTINGS: "DEEPLX_UPDATE_SETTINGS",
  TRANSLATE_TEXT: "DEEPLX_TRANSLATE_TEXT",
  TRANSLATE_PAGE: "DEEPLX_TRANSLATE_PAGE",
} as const

export interface TranslateTextPayload {
  text: string
  sourceLang?: string
  targetLang?: string
}

export interface RuntimeMessageMap {
  DEEPLX_GET_SETTINGS: {
    type: typeof MESSAGE_TYPE.GET_SETTINGS
  }
  DEEPLX_UPDATE_SETTINGS: {
    type: typeof MESSAGE_TYPE.UPDATE_SETTINGS
    payload: Partial<ExtensionSettings>
  }
  DEEPLX_TRANSLATE_TEXT: {
    type: typeof MESSAGE_TYPE.TRANSLATE_TEXT
    payload: TranslateTextPayload
  }
  DEEPLX_TRANSLATE_PAGE: {
    type: typeof MESSAGE_TYPE.TRANSLATE_PAGE
    payload?: {
      sourceLang?: string
      targetLang?: string
    }
  }
}

export type RuntimeMessage = RuntimeMessageMap[keyof RuntimeMessageMap]
