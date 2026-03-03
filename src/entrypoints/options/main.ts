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

const eyeOpenIconPaths = [
  "M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0",
  "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6",
]
const eyeClosedIconPaths = [
  "M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49",
  "M14.084 14.158a3 3 0 0 1-4.242-4.242",
  "M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143",
  "m2 2 20 20",
]

const uiLanguage = resolveRawUiLanguage()
const tr = (key: Parameters<typeof t>[0], params?: Record<string, string | number>) => t(key, params, uiLanguage)
const sourceLangOptions = getSourceLanguageOptions(uiLanguage)

let settings: ExtensionSettings = createDefaultSettings(uiLanguage)
let loading = true
let saving = false
let status = ""
let showKey = false
let testing = false
let testResult: { ok: boolean, message: string } | null = null

setDocumentLanguage(uiLanguage)
document.title = t("options.documentTitle", undefined, uiLanguage)

const root = document.getElementById("root")
if (!root) {
  throw new Error("Options root not found")
}

const page = document.createElement("main")
page.className = "options-page"

const card = document.createElement("section")
card.className = "card"

const title = document.createElement("h1")
const description = document.createElement("p")
description.className = "desc"

const loadingStatus = document.createElement("p")
loadingStatus.className = "status"

const engineField = document.createElement("label")
engineField.className = "field"
const engineTitle = document.createElement("span")
const engineSelect = document.createElement("select")
const engineGoogleOption = document.createElement("option")
engineGoogleOption.value = "google"
const engineDeepLXOption = document.createElement("option")
engineDeepLXOption.value = "deeplx"
engineSelect.append(engineGoogleOption, engineDeepLXOption)
engineField.append(engineTitle, engineSelect)

const tokenField = document.createElement("label")
tokenField.className = "field"
const tokenTitle = document.createElement("span")
const tokenInputWrap = document.createElement("div")
tokenInputWrap.className = "input-with-icon"
const tokenInput = document.createElement("input")
tokenInput.type = "password"
const eyeButton = document.createElement("button")
eyeButton.type = "button"
eyeButton.className = "eye-btn"
tokenInputWrap.append(tokenInput, eyeButton)
tokenField.append(tokenTitle, tokenInputWrap)

const apiField = document.createElement("label")
apiField.className = "field"
const apiTitle = document.createElement("span")
const apiInput = document.createElement("input")
apiInput.type = "text"
const apiHint = document.createElement("small")
apiField.append(apiTitle, apiInput, apiHint)

const langGrid = document.createElement("div")
langGrid.className = "grid2"

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

langGrid.append(sourceField, targetField)

const actionRow = document.createElement("div")
actionRow.className = "action-row"
const saveButton = document.createElement("button")
saveButton.type = "button"
saveButton.className = "save-btn"
const testButton = document.createElement("button")
testButton.type = "button"
testButton.className = "test-btn"
actionRow.append(saveButton, testButton)

const testResultText = document.createElement("p")
testResultText.setAttribute("role", "status")
testResultText.setAttribute("aria-live", "polite")

const statusText = document.createElement("p")
statusText.className = "status"
statusText.setAttribute("role", "status")
statusText.setAttribute("aria-live", "polite")

card.append(
  title,
  description,
  loadingStatus,
  engineField,
  tokenField,
  apiField,
  langGrid,
  actionRow,
  testResultText,
  statusText,
)
page.appendChild(card)
root.replaceChildren(page)

setSelectOptions(sourceSelect, sourceLangOptions)
setSelectOptions(targetSelect, TARGET_LANG_OPTIONS)

function renderEyeIcon() {
  eyeButton.replaceChildren(createSvgIcon(showKey ? eyeOpenIconPaths : eyeClosedIconPaths))
}

function render() {
  title.textContent = tr("options.pageTitle")
  description.textContent = tr("options.description")

  engineTitle.textContent = tr("options.defaultEngine")
  engineGoogleOption.textContent = tr("options.engineGoogle")
  engineDeepLXOption.textContent = tr("options.engineDeepLX")

  tokenTitle.textContent = tr("options.tokenOptional")
  tokenInput.placeholder = tr("options.tokenPlaceholder")
  eyeButton.title = showKey ? tr("options.hideKey") : tr("options.showKey")
  eyeButton.setAttribute("aria-label", showKey ? tr("options.hideKey") : tr("options.showKey"))
  eyeButton.setAttribute("aria-pressed", showKey ? "true" : "false")

  apiTitle.textContent = tr("options.apiBaseUrl")
  apiHint.textContent = tr("options.apiExample")

  sourceTitle.textContent = tr("options.defaultSourceLanguage")
  targetTitle.textContent = tr("options.defaultTargetLanguage")

  saveButton.textContent = saving ? tr("options.saving") : tr("options.save")
  testButton.textContent = testing ? tr("options.testing") : tr("options.test")

  engineSelect.value = settings.engine
  tokenInput.type = showKey ? "text" : "password"
  tokenInput.value = settings.apiKey
  apiInput.value = settings.apiBaseUrl
  sourceSelect.value = settings.sourceLang
  targetSelect.value = settings.targetLang

  const formDisabled = loading || saving || testing
  engineSelect.disabled = formDisabled
  tokenInput.disabled = formDisabled
  apiInput.disabled = formDisabled
  sourceSelect.disabled = formDisabled
  targetSelect.disabled = formDisabled
  eyeButton.disabled = formDisabled
  saveButton.disabled = formDisabled
  testButton.disabled = formDisabled

  loadingStatus.textContent = loading ? tr("options.loading") : ""
  loadingStatus.style.display = loading ? "block" : "none"

  const showDeepLX = !loading && settings.engine === "deeplx"
  tokenField.style.display = showDeepLX ? "grid" : "none"
  apiField.style.display = showDeepLX ? "grid" : "none"

  if (testResult) {
    testResultText.className = testResult.ok ? "test-success" : "test-fail"
    testResultText.textContent = testResult.message
    testResultText.style.display = "block"
  }
  else {
    testResultText.className = ""
    testResultText.textContent = ""
    testResultText.style.display = "none"
  }

  statusText.textContent = status

  renderEyeIcon()
}

async function save() {
  saving = true
  status = ""
  render()

  try {
    await browser.runtime.sendMessage({
      type: MESSAGE_TYPE.UPDATE_SETTINGS,
      payload: {
        engine: settings.engine,
        apiKey: settings.apiKey.trim(),
        apiBaseUrl: settings.apiBaseUrl.trim(),
        sourceLang: settings.sourceLang,
        targetLang: settings.targetLang,
      },
    })

    status = tr("options.saved")
  }
  catch (error) {
    status = error instanceof Error ? error.message : tr("options.saveFailed")
  }
  finally {
    saving = false
    render()
  }
}

async function testConnection() {
  testing = true
  testResult = null
  render()

  try {
    await browser.runtime.sendMessage({
      type: MESSAGE_TYPE.UPDATE_SETTINGS,
      payload: {
        engine: settings.engine,
        apiKey: settings.apiKey.trim(),
        apiBaseUrl: settings.apiBaseUrl.trim(),
      },
    })

    const result = await browser.runtime.sendMessage({
      type: MESSAGE_TYPE.TRANSLATE_TEXT,
      payload: {
        text: "hello",
        sourceLang: "EN",
        targetLang: "ZH",
        abortKey: "options-test",
      },
    }) as string

    if (result && result.trim().length > 0) {
      testResult = {
        ok: true,
        message: tr("options.connectionSuccess", { source: "hello", result }),
      }
    }
    else {
      testResult = { ok: false, message: tr("options.connectionEmpty") }
    }
  }
  catch (error) {
    const message = error instanceof Error ? error.message : tr("options.connectionFailed")
    testResult = { ok: false, message: `❌ ${message}` }
  }
  finally {
    testing = false
    render()
  }
}

engineSelect.addEventListener("change", () => {
  settings = {
    ...settings,
    engine: engineSelect.value as ExtensionSettings["engine"],
  }
  render()
})

tokenInput.addEventListener("input", () => {
  settings = {
    ...settings,
    apiKey: tokenInput.value,
  }
})

apiInput.addEventListener("input", () => {
  settings = {
    ...settings,
    apiBaseUrl: apiInput.value,
  }
})

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

eyeButton.addEventListener("click", () => {
  showKey = !showKey
  render()
})

saveButton.addEventListener("click", () => {
  void save()
})

testButton.addEventListener("click", () => {
  void testConnection()
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
  finally {
    loading = false
    render()
  }
}

void init()
