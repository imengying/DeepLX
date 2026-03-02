import type { RuntimeMessage } from "@/shared/messages"
import type { ExtensionSettings } from "@/shared/settings"
import { browser, defineContentScript } from "#imports"
import { MESSAGE_TYPE } from "@/shared/messages"
import { DEFAULT_SETTINGS } from "@/shared/settings"

const STYLE_ID = "deeplx-runtime-style"
const BUTTON_ID = "deeplx-selection-button"
const PANEL_ID = "deeplx-selection-panel"
const TOAST_ID = "deeplx-toast"
const TRANSLATED_FLAG = "deeplxTranslated"
const MAX_PAGE_BLOCKS = 120

let selectedText = ""
let pageTranslating = false

async function getSettings(): Promise<ExtensionSettings> {
  const settings = await browser.runtime.sendMessage({ type: MESSAGE_TYPE.GET_SETTINGS }) as ExtensionSettings
  return settings ?? DEFAULT_SETTINGS
}

async function translateText(text: string, sourceLang?: string, targetLang?: string): Promise<string> {
  return await browser.runtime.sendMessage({
    type: MESSAGE_TYPE.TRANSLATE_TEXT,
    payload: {
      text,
      sourceLang,
      targetLang,
    },
  }) as string
}

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) {
    return
  }

  const style = document.createElement("style")
  style.id = STYLE_ID
  style.textContent = `
    #${BUTTON_ID} {
      position: fixed;
      z-index: 2147483647;
      display: none;
      border: 1px solid #d1d5db;
      border-radius: 9999px;
      background: #111827;
      color: #ffffff;
      font-size: 12px;
      line-height: 1;
      padding: 8px 10px;
      cursor: pointer;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    }

    #${PANEL_ID} {
      position: fixed;
      z-index: 2147483647;
      display: none;
      width: min(460px, calc(100vw - 24px));
      max-height: 50vh;
      overflow: auto;
      border: 1px solid #d1d5db;
      border-radius: 10px;
      background: #ffffff;
      box-shadow: 0 18px 40px rgba(0, 0, 0, 0.22);
      padding: 12px;
      color: #111827;
      font-size: 14px;
      line-height: 1.5;
    }

    #${PANEL_ID} .deeplx-panel-original {
      color: #4b5563;
      margin-bottom: 8px;
      white-space: pre-wrap;
    }

    #${PANEL_ID} .deeplx-panel-translation {
      color: #0f172a;
      text-decoration: underline;
      text-decoration-color: #64d6df;
      text-decoration-thickness: 2px;
      text-underline-offset: 4px;
      white-space: pre-wrap;
    }

    #${TOAST_ID} {
      position: fixed;
      right: 14px;
      bottom: 14px;
      z-index: 2147483647;
      background: rgba(17, 24, 39, 0.9);
      color: #fff;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 12px;
      display: none;
    }

    .deeplx-page-translation {
      margin-top: 6px;
      color: #0f172a;
      text-decoration: underline;
      text-decoration-color: #64d6df;
      text-decoration-thickness: 2px;
      text-underline-offset: 4px;
      white-space: pre-wrap;
      word-break: break-word;
    }
  `

  document.documentElement.appendChild(style)
}

function ensureSelectionButton(): HTMLButtonElement {
  let button = document.getElementById(BUTTON_ID) as HTMLButtonElement | null
  if (button) {
    return button
  }

  button = document.createElement("button")
  button.id = BUTTON_ID
  button.type = "button"
  button.textContent = "翻译"
  button.addEventListener("click", () => {
    void translateCurrentSelection()
  })
  document.body.appendChild(button)
  return button
}

function ensurePanel(): HTMLDivElement {
  let panel = document.getElementById(PANEL_ID) as HTMLDivElement | null
  if (panel) {
    return panel
  }

  panel = document.createElement("div")
  panel.id = PANEL_ID
  document.body.appendChild(panel)
  return panel
}

function ensureToast(): HTMLDivElement {
  let toast = document.getElementById(TOAST_ID) as HTMLDivElement | null
  if (toast) {
    return toast
  }

  toast = document.createElement("div")
  toast.id = TOAST_ID
  document.body.appendChild(toast)
  return toast
}

function showToast(message: string, ms = 2400) {
  const toast = ensureToast()
  toast.textContent = message
  toast.style.display = "block"
  window.setTimeout(() => {
    toast.style.display = "none"
  }, ms)
}

function hideSelectionUI() {
  const button = ensureSelectionButton()
  const panel = ensurePanel()
  button.style.display = "none"
  panel.style.display = "none"
}

function updateSelectionButton() {
  const selection = window.getSelection()
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
    hideSelectionUI()
    selectedText = ""
    return
  }

  const text = selection.toString().trim()
  if (!text) {
    hideSelectionUI()
    selectedText = ""
    return
  }

  const range = selection.getRangeAt(0)
  const rect = range.getBoundingClientRect()
  if (rect.width === 0 && rect.height === 0) {
    hideSelectionUI()
    selectedText = ""
    return
  }

  selectedText = text
  const button = ensureSelectionButton()
  const x = Math.min(window.innerWidth - 56, rect.right + 8)
  const y = Math.min(window.innerHeight - 40, rect.bottom + 8)

  button.style.left = `${Math.max(8, x)}px`
  button.style.top = `${Math.max(8, y)}px`
  button.style.display = "block"
}

async function translateCurrentSelection() {
  if (!selectedText) {
    return
  }

  const button = ensureSelectionButton()
  const panel = ensurePanel()
  button.disabled = true
  button.textContent = "翻译中..."

  try {
    const settings = await getSettings()
    const translated = await translateText(selectedText, settings.sourceLang, settings.targetLang)

    panel.innerHTML = ""

    const originalDiv = document.createElement("div")
    originalDiv.className = "deeplx-panel-original"
    originalDiv.textContent = selectedText

    const translationDiv = document.createElement("div")
    translationDiv.className = "deeplx-panel-translation"
    translationDiv.textContent = translated

    panel.appendChild(originalDiv)
    panel.appendChild(translationDiv)

    const buttonRect = button.getBoundingClientRect()
    panel.style.display = "block"
    panel.style.visibility = "hidden"
    const panelWidth = panel.offsetWidth
    panel.style.left = `${Math.max(8, Math.min(buttonRect.left, window.innerWidth - panelWidth - 8))}px`
    panel.style.top = `${Math.min(window.innerHeight - 8, buttonRect.bottom + 8)}px`
    panel.style.visibility = "visible"
    panel.style.display = "block"
  }
  catch (error) {
    const message = error instanceof Error ? error.message : "划词翻译失败"
    showToast(message, 3000)
  }
  finally {
    button.disabled = false
    button.textContent = "翻译"
  }
}

function collectPageBlocks(): HTMLElement[] {
  const selector = "p, li, blockquote, h1, h2, h3, h4, h5, h6, figcaption, td, th"
  const elements = Array.from(document.querySelectorAll<HTMLElement>(selector))

  return elements.filter((el) => {
    if (el.dataset[TRANSLATED_FLAG] === "1") {
      return false
    }

    const text = el.innerText?.trim()
    if (!text || text.length < 12 || text.length > 1400) {
      return false
    }

    if (!el.offsetParent) {
      return false
    }

    if (el.closest(`#${PANEL_ID}`)) {
      return false
    }

    return true
  }).slice(0, MAX_PAGE_BLOCKS)
}

async function translatePage(overrides?: { sourceLang?: string, targetLang?: string }) {
  if (pageTranslating) {
    showToast("正在翻译网页，请稍候")
    return
  }

  pageTranslating = true
  showToast("开始翻译网页...")

  try {
    const settings = await getSettings()
    const sourceLang = overrides?.sourceLang ?? settings.sourceLang
    const targetLang = overrides?.targetLang ?? settings.targetLang

    const blocks = collectPageBlocks()
    let count = 0

    for (const block of blocks) {
      const original = block.innerText?.trim()
      if (!original) {
        continue
      }

      try {
        const translated = await translateText(original, sourceLang, targetLang)

        const translatedEl = document.createElement("div")
        translatedEl.className = "deeplx-page-translation"
        translatedEl.textContent = translated

        block.appendChild(translatedEl)
        block.dataset[TRANSLATED_FLAG] = "1"
        count += 1
      }
      catch {
        // Continue with next paragraph to avoid full-stop on single failure.
      }
    }

    if (count === 0) {
      showToast("未找到可翻译内容或翻译失败", 3000)
    }
    else {
      showToast(`网页翻译完成，共 ${count} 段`, 3000)
    }
  }
  finally {
    pageTranslating = false
  }
}

function initSelectionTranslator() {
  ensureStyle()
  ensureSelectionButton()
  ensurePanel()
  ensureToast()

  document.addEventListener("mouseup", () => {
    window.setTimeout(updateSelectionButton, 0)
  })

  document.addEventListener("keyup", () => {
    window.setTimeout(updateSelectionButton, 0)
  })

  document.addEventListener("mousedown", (event) => {
    const target = event.target as Node | null
    const button = ensureSelectionButton()
    const panel = ensurePanel()

    if (target && (button.contains(target) || panel.contains(target))) {
      return
    }

    hideSelectionUI()
  })
}

export default defineContentScript({
  matches: ["<all_urls>"],
  main: () => {
    initSelectionTranslator()

    browser.runtime.onMessage.addListener((message: RuntimeMessage) => {
      if (!message || typeof message !== "object" || !("type" in message)) {
        return undefined
      }

      if (message.type === MESSAGE_TYPE.TRANSLATE_PAGE) {
        void translatePage(message.payload)
      }

      return undefined
    })
  },
})
