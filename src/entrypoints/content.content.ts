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
const TRANSLATION_BLOCK_CLASS = "deeplx-page-translation"
const IGNORE_TAGS = new Set([
  "CODE", "PRE", "SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "INPUT",
  "TITLE", "HEAD", "META", "LINK", "SVG", "CANVAS", "VIDEO", "AUDIO", "TIME"
])

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
      all: initial;
      position: fixed;
      z-index: 2147483647;
      display: none;
      align-items: center;
      justify-content: center;
      background: #ffffff;
      color: #374151;
      padding: 6px;
      border-radius: 8px;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05);
      transition: all 0.2s ease;
      box-sizing: border-box;
    }

    #${BUTTON_ID}:hover {
      background: #1f2937;
      transform: scale(1.05);
    }

    #${BUTTON_ID} svg {
      width: 18px;
      height: 18px;
    }

    #${PANEL_ID} {
      all: initial;
      position: fixed;
      z-index: 2147483647;
      display: none;
      min-width: 96px;
      width: fit-content;
      max-width: min(720px, calc(100vw - 24px));
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
      word-break: break-word;
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

    .${TRANSLATION_BLOCK_CLASS} {
      display: block !important;
      clear: both !important;
      width: 100% !important;
      margin: 6px 0 !important;
      color: #6b7280 !important;
      border-left: 3px solid #64d6df !important;
      padding-left: 10px !important;
      white-space: pre-wrap !important;
      word-break: break-word !important;
      font-size: 0.95em !important;
      line-height: 1.5 !important;
      background: unset !important;
      box-sizing: border-box !important;
    }

  `

  document.documentElement.appendChild(style)
}

const translateIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/></svg>`

function ensureSelectionButton(): HTMLButtonElement {
  let button = document.getElementById(BUTTON_ID) as HTMLButtonElement | null
  if (button) {
    return button
  }

  button = document.createElement("button")
  button.id = BUTTON_ID
  button.type = "button"
  // Use innerHTML to set the SVG instead of text
  button.innerHTML = translateIconSvg
  // Clean up styles since we now use an SVG
  button.style.display = "flex"
  button.style.alignItems = "center"
  button.style.justifyContent = "center"
  button.style.padding = "6px"
  button.style.borderRadius = "8px"

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

function normalizeForCompare(input: string): string {
  return input
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[.,/#!$%^&*;:{}=\-_`~()'"?！，。、“”‘’：；（）【】《》]/g, "")
}

function shouldRenderTranslation(original: string, translated: string): boolean {
  const source = original.trim()
  const target = translated.trim()
  if (!source || !target) {
    return false
  }

  // Same text means no useful translation output.
  if (normalizeForCompare(source) === normalizeForCompare(target)) {
    return false
  }

  return true
}

function positionPanelNearButton(panel: HTMLDivElement, buttonRect: DOMRect) {
  panel.style.display = "block"
  panel.style.visibility = "hidden"

  const panelWidth = panel.offsetWidth
  const panelHeight = panel.offsetHeight

  const left = Math.max(8, Math.min(buttonRect.left, window.innerWidth - panelWidth - 8))
  const preferredTop = buttonRect.bottom + 8
  const top = preferredTop + panelHeight > window.innerHeight - 8
    ? Math.max(8, buttonRect.top - panelHeight - 8)
    : preferredTop

  panel.style.left = `${left}px`
  panel.style.top = `${top}px`
  panel.style.visibility = "visible"
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
  button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2v20"/><path d="M2 12h20"/></svg>`

  try {
    const settings = await getSettings()
    const translated = await translateText(selectedText, settings.sourceLang, settings.targetLang)
    if (!shouldRenderTranslation(selectedText, translated)) {
      showToast("该文本无需翻译", 1500)
      return
    }

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
    positionPanelNearButton(panel, buttonRect)
  }
  catch (error) {
    const message = error instanceof Error ? error.message : "划词翻译失败"
    showToast(message, 3000)
  }
  finally {
    button.disabled = false
    button.innerHTML = translateIconSvg
  }
}

function collectPageBlocks(): HTMLElement[] {
  const selector = "p, li, blockquote, h1, h2, h3, h4, h5, h6, figcaption, td, th"
  const elements = Array.from(document.querySelectorAll<HTMLElement>(selector))

  return elements.filter((el) => {
    if (el.dataset[TRANSLATED_FLAG] === "1") {
      return false
    }

    if (IGNORE_TAGS.has(el.tagName)) {
      return false
    }

    // Check ancestors to ensure we don't translate text inside <pre> or <code>
    let current: HTMLElement | null = el.parentElement
    while (current) {
      if (IGNORE_TAGS.has(current.tagName)) {
        return false
      }
      current = current.parentElement
    }

    const text = el.innerText?.trim()
    if (!text || text.length < 4 || text.length > 1400) {
      return false
    }

    if (!el.offsetParent) {
      return false
    }

    if (el.closest(`#${PANEL_ID}`)) {
      return false
    }

    if (el.querySelector(`.${TRANSLATION_BLOCK_CLASS}`)) {
      return false
    }

    return true
  }).slice(0, MAX_PAGE_BLOCKS)
}

function insertTranslationUnderBlock(block: HTMLElement, translatedText: string) {
  const translatedEl = document.createElement("span")
  translatedEl.className = TRANSLATION_BLOCK_CLASS
  translatedEl.textContent = translatedText
  block.appendChild(translatedEl)
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
        if (!shouldRenderTranslation(original, translated)) {
          block.dataset[TRANSLATED_FLAG] = "1"
          continue
        }

        insertTranslationUnderBlock(block, translated)
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

  window.addEventListener("scroll", () => {
    const panel = ensurePanel()
    if (panel.style.display === "block") {
      panel.style.display = "none"
    }
  }, { passive: true })
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
