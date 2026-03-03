import type { ExtensionSettings, LanguageOption } from "@/shared/settings"
import { browser } from "#imports"
import { MESSAGE_TYPE } from "@/shared/messages"
import { resolveRawUiLanguage, setDocumentLanguage, t } from "@/shared/i18n"
import { TARGET_LANG_OPTIONS, createDefaultSettings, getSourceLanguageOptions } from "@/shared/settings"
import "./style.css"

const SVG_NS = "http://www.w3.org/2000/svg"

function createSvgIcon(pathData: string[]): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, "svg")
  svg.setAttribute("xmlns", SVG_NS)
  svg.setAttribute("width", "16")
  svg.setAttribute("height", "16")
  svg.setAttribute("viewBox", "0 0 24 24")
  svg.setAttribute("fill", "none")
  svg.setAttribute("stroke", "currentColor")
  svg.setAttribute("stroke-width", "2")
  svg.setAttribute("stroke-linecap", "round")
  svg.setAttribute("stroke-linejoin", "round")

  for (const d of pathData) {
    const path = document.createElementNS(SVG_NS, "path")
    path.setAttribute("d", d)
    svg.appendChild(path)
  }

  return svg
}

function setSelectOptions(select: HTMLSelectElement, options: LanguageOption[]) {
  select.replaceChildren(...options.map((item) => {
    const option = document.createElement("option")
    option.value = item.code
    option.textContent = item.label
    return option
  }))
}

const uiLanguage = resolveRawUiLanguage()
const tr = (key: Parameters<typeof t>[0], params?: Record<string, string | number>) => t(key, params, uiLanguage)

let settings: ExtensionSettings = createDefaultSettings(uiLanguage)
let busy = false
let status = ""

setDocumentLanguage(uiLanguage)

const root = document.getElementById("root")
if (!root) {
  throw new Error("Popup root not found")
}

const sourceLangOptions = getSourceLanguageOptions(uiLanguage)

const container = document.createElement("div")
container.className = "popup"

const header = document.createElement("header")
header.className = "popup-header"
const logo = document.createElement("div")
logo.className = "logo"
logo.textContent = "DeepLX"
header.appendChild(logo)

const panel = document.createElement("div")
panel.className = "panel"

const grid = document.createElement("div")
grid.className = "grid2"

const sourceField = document.createElement("label")
sourceField.className = "field"
const sourceTitle = document.createElement("span")
const sourceSelect = document.createElement("select")
sourceField.append(sourceTitle, sourceSelect)

const targetField = document.createElement("label")
targetField.className = "field"
const targetTitle = document.createElement("span")
const targetSelect = document.createElement("select")
targetField.append(targetTitle, targetSelect)

grid.append(sourceField, targetField)

const actionRow = document.createElement("div")
actionRow.className = "action-row"

const translateButton = document.createElement("button")
translateButton.type = "button"
translateButton.className = "translate-btn"

const originalButton = document.createElement("button")
originalButton.type = "button"
originalButton.className = "original-btn"
originalButton.appendChild(createSvgIcon([
  "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8",
  "M3 3v5h5",
]))

actionRow.append(translateButton, originalButton)

const statusText = document.createElement("p")
statusText.className = "status"
statusText.setAttribute("role", "status")
statusText.setAttribute("aria-live", "polite")

panel.append(grid, actionRow, statusText)

const footer = document.createElement("footer")
footer.className = "popup-footer"
const footerRow = document.createElement("div")
footerRow.className = "footer-row"

const settingsButton = document.createElement("button")
settingsButton.type = "button"
settingsButton.className = "settings-btn"

const starLink = document.createElement("a")
starLink.className = "star-btn"
starLink.href = "https://github.com/imengying/DeepLX"
starLink.target = "_blank"
starLink.rel = "noopener noreferrer"

footerRow.append(settingsButton, starLink)
footer.appendChild(footerRow)

container.append(header, panel, footer)
root.replaceChildren(container)

setSelectOptions(sourceSelect, sourceLangOptions)
setSelectOptions(targetSelect, TARGET_LANG_OPTIONS)

function render() {
  sourceTitle.textContent = tr("popup.sourceLanguage")
  targetTitle.textContent = tr("popup.targetLanguage")

  sourceSelect.value = settings.sourceLang
  targetSelect.value = settings.targetLang

  translateButton.textContent = busy ? tr("popup.processing") : tr("popup.translateCurrentPage")
  translateButton.disabled = busy

  originalButton.title = tr("popup.showOriginalTitle")
  originalButton.setAttribute("aria-label", tr("popup.restoreOriginalAria"))

  settingsButton.textContent = tr("popup.settings")
  starLink.textContent = tr("popup.star")

  statusText.textContent = status
}

async function saveLanguageConfig() {
  await browser.runtime.sendMessage({
    type: MESSAGE_TYPE.UPDATE_SETTINGS,
    payload: {
      sourceLang: settings.sourceLang,
      targetLang: settings.targetLang,
    },
  })
}

async function translateCurrentPage() {
  if (!settings.targetLang.trim()) {
    status = tr("popup.chooseTargetLanguage")
    render()
    return
  }

  busy = true
  status = tr("popup.sendingTask")
  render()

  try {
    await saveLanguageConfig()

    const [tab] = await browser.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id) {
      status = tr("popup.noCurrentTab")
      return
    }

    await browser.tabs.sendMessage(tab.id, {
      type: MESSAGE_TYPE.TRANSLATE_PAGE,
      payload: {
        sourceLang: settings.sourceLang,
        targetLang: settings.targetLang,
      },
    })

    status = tr("popup.translationStarted")
  }
  catch (error) {
    status = error instanceof Error ? error.message : tr("popup.sendTaskFailed")
  }
  finally {
    busy = false
    render()
  }
}

async function showOriginal() {
  try {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id) {
      status = tr("popup.noCurrentTab")
      render()
      return
    }

    await browser.tabs.sendMessage(tab.id, {
      type: MESSAGE_TYPE.SHOW_ORIGINAL,
    })

    status = tr("popup.originalRestored")
  }
  catch (error) {
    status = error instanceof Error ? error.message : tr("popup.restoreFailed")
  }

  render()
}

sourceSelect.addEventListener("change", () => {
  settings = {
    ...settings,
    sourceLang: sourceSelect.value,
  }
})

targetSelect.addEventListener("change", () => {
  settings = {
    ...settings,
    targetLang: targetSelect.value,
  }
})

translateButton.addEventListener("click", () => {
  void translateCurrentPage()
})

originalButton.addEventListener("click", () => {
  void showOriginal()
})

settingsButton.addEventListener("click", () => {
  void browser.runtime.openOptionsPage()
})

async function init() {
  render()

  try {
    const data = await browser.runtime.sendMessage({ type: MESSAGE_TYPE.GET_SETTINGS }) as ExtensionSettings
    if (data) {
      settings = data
    }
  }
  catch (error) {
    status = error instanceof Error ? error.message : t("popup.readSettingsFailed", undefined, uiLanguage)
  }

  render()
}

void init()
