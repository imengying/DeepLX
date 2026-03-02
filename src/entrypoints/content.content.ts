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

let shadowRootInstance: ShadowRoot | null = null

function getShadowRoot(): ShadowRoot {
  if (shadowRootInstance) {
    return shadowRootInstance
  }
  const host = document.createElement("deeplx-root")
  // Use closed mode to prevent host page JS from observing/modifying our UI
  shadowRootInstance = host.attachShadow({ mode: "closed" })
  // Important: append to documentElement so it exists outside the regular body flow
  document.documentElement.appendChild(host)
  return shadowRootInstance
}

function ensureStyle() {
  const root = getShadowRoot()
  if (root.getElementById(STYLE_ID)) {
    return
  }

  const style = document.createElement("style")
  style.id = STYLE_ID
  style.textContent = `
    /* ─── Keyframes ─── */
    @keyframes deeplx-fade-in-scale {
      from { opacity: 0; transform: scale(0.85); }
      to   { opacity: 1; transform: scale(1); }
    }
    @keyframes deeplx-fade-in-up {
      from { opacity: 0; transform: translateY(6px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes deeplx-slide-in-right {
      from { opacity: 0; transform: translateX(20px); }
      to   { opacity: 1; transform: translateX(0); }
    }

    /* ─── Selection Button ─── */
    #${BUTTON_ID} {
      all: initial;
      position: fixed;
      z-index: 2147483647;
      display: none;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.88);
      backdrop-filter: blur(16px) saturate(180%);
      -webkit-backdrop-filter: blur(16px) saturate(180%);
      color: #374151;
      padding: 6px;
      border: none;
      border-radius: 10px;
      outline: none;
      appearance: none;
      -webkit-appearance: none;
      cursor: pointer;
      user-select: none;
      -webkit-user-select: none;
      box-shadow:
        0 4px 12px rgba(0, 0, 0, 0.08),
        0 0 0 1px rgba(0, 0, 0, 0.04),
        0 0 0 1px rgba(255, 255, 255, 0.3) inset;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      box-sizing: border-box;
      animation: deeplx-fade-in-scale 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    #${BUTTON_ID}:focus, #${BUTTON_ID}:focus-visible {
      outline: none;
    }

    #${BUTTON_ID}:hover {
      background: rgba(255, 255, 255, 0.95);
      transform: scale(1.08);
      box-shadow:
        0 6px 20px rgba(0, 0, 0, 0.1),
        0 0 0 1px rgba(0, 0, 0, 0.04),
        0 0 0 1px rgba(255, 255, 255, 0.4) inset;
    }

    /* Expand the clickable area by 12px so users don't easily miss the button */
    #${BUTTON_ID}::after {
      content: '';
      position: absolute;
      top: -12px;
      left: -12px;
      right: -12px;
      bottom: -12px;
      cursor: pointer;
    }

    #${BUTTON_ID} svg {
      width: 18px;
      height: 18px;
    }

    /* ─── Translation Panel ─── */
    #${PANEL_ID} {
      all: initial;
      position: fixed;
      z-index: 2147483647;
      display: none;
      min-width: 120px;
      width: fit-content;
      max-width: min(360px, calc(100vw - 32px));
      max-height: 45vh;
      overflow: auto;
      border: 1px solid rgba(229, 231, 235, 0.6);
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.88);
      backdrop-filter: blur(24px) saturate(180%);
      -webkit-backdrop-filter: blur(24px) saturate(180%);
      box-shadow:
        0 12px 32px -8px rgba(0, 0, 0, 0.1),
        0 4px 8px -2px rgba(0, 0, 0, 0.06),
        0 0 0 1px rgba(255, 255, 255, 0.5) inset;
      padding: 12px 16px;
      color: #111827;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 14px;
      line-height: 1.6;
      word-break: break-word;
      animation: deeplx-fade-in-up 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    #${PANEL_ID} .deeplx-panel-original {
      color: #6b7280;
      font-size: 12px;
      margin-bottom: 0;
      padding-bottom: 8px;
      border-bottom: 1px solid rgba(229, 231, 235, 0.5);
      white-space: pre-wrap;
      text-align: center;
    }

    #${PANEL_ID} .deeplx-panel-translation {
      color: #0f172a;
      font-size: 15px;
      font-weight: 500;
      margin-top: 8px;
      text-decoration: underline;
      text-decoration-color: oklch(76.5% 0.177 163.223);
      text-decoration-thickness: 2px;
      text-underline-offset: 4px;
      white-space: pre-wrap;
      text-align: center;
    }

    /* ─── Toast ─── */
    #${TOAST_ID} {
      position: fixed;
      right: 14px;
      bottom: 14px;
      z-index: 2147483647;
      background: rgba(17, 24, 39, 0.88);
      backdrop-filter: blur(12px) saturate(150%);
      -webkit-backdrop-filter: blur(12px) saturate(150%);
      color: #f9fafb;
      padding: 8px 14px;
      border-radius: 10px;
      font-size: 12px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
      display: none;
      animation: deeplx-slide-in-right 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }

    /* ─── Page Translation (replaced text styling) ─── */
    /* These live in Shadow DOM — unused in replacement mode but kept for reference */
  `

  root.appendChild(style)

  // Inject a separate style tag into the HOST document for page translation blocks,
  // because those nodes live in the host DOM, not the shadow DOM.
  const hostStyleId = "deeplx-host-style"
  if (!document.getElementById(hostStyleId)) {
    const hostStyle = document.createElement("style")
    hostStyle.id = hostStyleId
    hostStyle.textContent = `
      :root {
        --deeplx-primary: oklch(76.5% 0.177 163.223);
        --deeplx-muted-fg: oklch(0.556 0 0);
      }
      @media (prefers-color-scheme: dark) {
        :root {
          --deeplx-primary: oklch(59.6% 0.145 163.225);
          --deeplx-muted-fg: oklch(0.708 0 0);
        }
      }
    `
    document.head.appendChild(hostStyle)
  }
}

const translateIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events:none;"><path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/></svg>`

function ensureSelectionButton(): HTMLButtonElement {
  const root = getShadowRoot()
  let button = root.getElementById(BUTTON_ID) as HTMLButtonElement | null
  if (button) {
    return button
  }

  button = document.createElement("button")
  button.id = BUTTON_ID
  button.type = "button"
  // Use innerHTML to set the SVG instead of text
  button.innerHTML = translateIconSvg
  // NOTE: All visual styles are defined in the CSS block above.
  // Do NOT set inline position/display here, as they would override CSS `position: fixed`.

  button.addEventListener("click", () => {
    void translateCurrentSelection()
  })
  root.appendChild(button)
  return button
}

function ensurePanel(): HTMLDivElement {
  const root = getShadowRoot()
  let panel = root.getElementById(PANEL_ID) as HTMLDivElement | null
  if (panel) {
    return panel
  }

  panel = document.createElement("div")
  panel.id = PANEL_ID
  root.appendChild(panel)
  return panel
}

function ensureToast(): HTMLDivElement {
  const root = getShadowRoot()
  let toast = root.getElementById(TOAST_ID) as HTMLDivElement | null
  if (toast) {
    return toast
  }

  toast = document.createElement("div")
  toast.id = TOAST_ID
  root.appendChild(toast)
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

function debounce<T extends (...args: any[]) => void>(func: T, wait: number): T {
  let timeout: number | undefined
  return function (this: any, ...args: Parameters<T>) {
    window.clearTimeout(timeout)
    timeout = window.setTimeout(() => func.apply(this, args), wait)
  } as T
}

function positionPanelNearButton(panel: HTMLDivElement, buttonRect: DOMRect) {
  panel.style.display = "block"
  panel.style.visibility = "hidden"

  const panelWidth = panel.offsetWidth
  const panelHeight = panel.offsetHeight

  // Keep it within horizontal bounds
  let left = buttonRect.left
  if (left + panelWidth > window.innerWidth - 8) {
    left = window.innerWidth - panelWidth - 8
  }
  left = Math.max(8, left)

  // Determine vertical placement: prefer bottom, flip to top if space is tight
  const spaceBelow = window.innerHeight - buttonRect.bottom
  const spaceAbove = buttonRect.top
  let top: number

  if (spaceBelow >= panelHeight + 8 || spaceBelow > spaceAbove) {
    // Placment below
    top = Math.min(buttonRect.bottom + 8, window.innerHeight - panelHeight - 8)
  } else {
    // Placement above
    top = Math.max(8, buttonRect.top - panelHeight - 8)
  }

  panel.style.left = `${left}px`
  panel.style.top = `${top}px`
  panel.style.visibility = "visible"
}

const debouncedUpdateSelectionButton = debounce(() => {
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
  button.style.display = "flex"
}, 100)

async function translateCurrentSelection() {
  if (!selectedText) {
    return
  }

  const button = ensureSelectionButton()
  const panel = ensurePanel()
  button.disabled = true
  button.innerHTML = `
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events:none; animation: deeplx-spin 1s linear infinite;">
  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
</svg>
<style>@keyframes deeplx-spin { 100% { transform: rotate(360deg); } }</style>
`

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

function collectTextNodes(): Text[] {
  const textNodes: Text[] = []

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node: Node) {
      const textNode = node as Text
      const text = textNode.nodeValue?.trim()

      // Basic text length filter
      if (!text || text.length < 2 || text.length > 2000) {
        return NodeFilter.FILTER_SKIP
      }

      // Must contain at least one letter/character (ignore pure punctuation/number nodes)
      if (!/[a-zA-Z\u4e00-\u9fa5]/.test(text)) {
        return NodeFilter.FILTER_SKIP
      }

      let current: HTMLElement | null = textNode.parentElement

      // Reject if parent is already translated or is a translation block itself
      if (current?.dataset[TRANSLATED_FLAG] === "1" || current?.classList.contains(TRANSLATION_BLOCK_CLASS)) {
        return NodeFilter.FILTER_REJECT
      }

      while (current && current.tagName !== "BODY") {
        if (IGNORE_TAGS.has(current.tagName)) {
          return NodeFilter.FILTER_REJECT
        }

        // Skip invisible elements
        const style = window.getComputedStyle(current)
        if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") {
          return NodeFilter.FILTER_REJECT
        }

        current = current.parentElement
      }

      return NodeFilter.FILTER_ACCEPT
    }
  })

  let currentNode = walker.nextNode()
  while (currentNode && textNodes.length < MAX_PAGE_BLOCKS * 3) {
    textNodes.push(currentNode as Text)
    currentNode = walker.nextNode()
  }

  return textNodes
}

function replaceTextWithTranslation(textNode: Text, translatedText: string) {
  const parent = textNode.parentElement
  if (!parent) return

  // Store original text in a data attribute for potential restoration
  if (!parent.dataset.deeplxOriginal) {
    parent.dataset.deeplxOriginal = textNode.nodeValue ?? ""
  }

  // Directly replace the text content
  textNode.nodeValue = translatedText

  // Mark parent so we don't translate it again
  parent.dataset[TRANSLATED_FLAG] = "1"
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

    const nodes = collectTextNodes()
    let count = 0

    for (const node of nodes) {
      const original = node.nodeValue?.trim()
      if (!original) {
        continue
      }

      try {
        const translated = await translateText(original, sourceLang, targetLang)
        if (!shouldRenderTranslation(original, translated)) {
          if (node.parentElement) {
            node.parentElement.dataset[TRANSLATED_FLAG] = "1"
          }
          continue
        }

        replaceTextWithTranslation(node, translated)
        count += 1
      }
      catch (err) {
        // Show first error as toast so users know what's wrong
        if (count === 0) {
          const msg = err instanceof Error ? err.message : "翻译失败"
          showToast(msg, 4000)
        }
        // Continue with next text node
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

  document.addEventListener("mouseup", debouncedUpdateSelectionButton)
  document.addEventListener("keyup", debouncedUpdateSelectionButton)

  document.addEventListener("mousedown", (event) => {
    // Check if the click originated from inside our shadow DOM
    const composedPath = event.composedPath() as Element[]
    if (composedPath.some(el => el.tagName === "DEEPLX-ROOT")) {
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

function showOriginal() {
  document.querySelectorAll("[data-deeplx-original]").forEach((el) => {
    const htmlEl = el as HTMLElement
    const original = htmlEl.dataset.deeplxOriginal
    if (original) {
      // Find the first text node and restore its content
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
      const textNode = walker.nextNode()
      if (textNode) {
        textNode.nodeValue = original
      }
      delete htmlEl.dataset.deeplxOriginal
      delete htmlEl.dataset[TRANSLATED_FLAG]
    }
  })
  showToast("已恢复原文", 2000)
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

      if (message.type === MESSAGE_TYPE.SHOW_ORIGINAL) {
        showOriginal()
      }

      return undefined
    })
  },
})
