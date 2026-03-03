import type { ExtensionSettings } from "@/shared/settings"
import { browser } from "#imports"
import { useEffect, useMemo, useState } from "react"
import ReactDOM from "react-dom/client"
import { MESSAGE_TYPE } from "@/shared/messages"
import { resolveRawUiLanguage, setDocumentLanguage, t } from "@/shared/i18n"
import { TARGET_LANG_OPTIONS, createDefaultSettings, getSourceLanguageOptions } from "@/shared/settings"
import "./style.css"

function App() {
  const [uiLanguage] = useState(() => resolveRawUiLanguage((browser as any).i18n?.getUILanguage?.()))
  const [settings, setSettings] = useState<ExtensionSettings>(() => createDefaultSettings(uiLanguage))
  const [status, setStatus] = useState("")
  const [busy, setBusy] = useState(false)
  const tr = (key: Parameters<typeof t>[0], params?: Record<string, string | number>) => t(key, params, uiLanguage)

  useEffect(() => {
    setDocumentLanguage(uiLanguage)

    void (async () => {
      try {
        const data = await browser.runtime.sendMessage({ type: MESSAGE_TYPE.GET_SETTINGS }) as ExtensionSettings
        if (data) {
          setSettings(data)
        }
      }
      catch (error) {
        const message = error instanceof Error ? error.message : t("popup.readSettingsFailed", undefined, uiLanguage)
        setStatus(message)
      }
    })()
  }, [uiLanguage])

  const canTranslate = useMemo(() => settings.targetLang.trim().length > 0, [settings.targetLang])
  const sourceLangOptions = useMemo(() => getSourceLanguageOptions(uiLanguage), [uiLanguage])

  const saveLanguageConfig = async () => {
    await browser.runtime.sendMessage({
      type: MESSAGE_TYPE.UPDATE_SETTINGS,
      payload: {
        sourceLang: settings.sourceLang,
        targetLang: settings.targetLang,
      },
    })
  }

  const translateCurrentPage = async () => {
    if (!canTranslate) {
      setStatus(tr("popup.chooseTargetLanguage"))
      return
    }

    setBusy(true)
    setStatus(tr("popup.sendingTask"))

    try {
      await saveLanguageConfig()

      const [tab] = await browser.tabs.query({ active: true, currentWindow: true })
      if (!tab?.id) {
        setStatus(tr("popup.noCurrentTab"))
        return
      }

      await browser.tabs.sendMessage(tab.id, {
        type: MESSAGE_TYPE.TRANSLATE_PAGE,
        payload: {
          sourceLang: settings.sourceLang,
          targetLang: settings.targetLang,
        },
      })

      setStatus(tr("popup.translationStarted"))
    }
    catch (error) {
      const message = error instanceof Error ? error.message : tr("popup.sendTaskFailed")
      setStatus(message)
    }
    finally {
      setBusy(false)
    }
  }

  const showOriginal = async () => {
    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true })
      if (!tab?.id) {
        setStatus(tr("popup.noCurrentTab"))
        return
      }

      await browser.tabs.sendMessage(tab.id, {
        type: MESSAGE_TYPE.SHOW_ORIGINAL,
      })

      setStatus(tr("popup.originalRestored"))
    }
    catch (error) {
      const message = error instanceof Error ? error.message : tr("popup.restoreFailed")
      setStatus(message)
    }
  }

  return (
    <div className="popup">
      <header className="popup-header">
        <div className="logo">DeepLX</div>
      </header>

      <div className="panel">
        <div className="grid2">
          <label className="field">
            <span>{tr("popup.sourceLanguage")}</span>
            <select
              value={settings.sourceLang}
              onChange={event => setSettings(prev => ({ ...prev, sourceLang: event.target.value }))}
            >
              {sourceLangOptions.map(item => (
                <option key={item.code} value={item.code}>{item.label}</option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>{tr("popup.targetLanguage")}</span>
            <select
              value={settings.targetLang}
              onChange={event => setSettings(prev => ({ ...prev, targetLang: event.target.value }))}
            >
              {TARGET_LANG_OPTIONS.map(item => (
                <option key={item.code} value={item.code}>{item.label}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="action-row">
          <button
            type="button"
            className="translate-btn"
            onClick={() => { void translateCurrentPage() }}
            disabled={busy}
          >
            {busy ? tr("popup.processing") : tr("popup.translateCurrentPage")}
          </button>
          <button
            type="button"
            className="original-btn"
            onClick={() => { void showOriginal() }}
            title={tr("popup.showOriginalTitle")}
            aria-label={tr("popup.restoreOriginalAria")}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
          </button>
        </div>

        {status && <p className="status" role="status" aria-live="polite">{status}</p>}
      </div>

      <footer className="popup-footer">
        <div className="footer-row">
          <button
            type="button"
            className="settings-btn"
            onClick={() => {
              void browser.runtime.openOptionsPage()
            }}
          >
            {tr("popup.settings")}
          </button>
          <a
            className="star-btn"
            href="https://github.com/imengying/DeepLX"
            target="_blank"
            rel="noopener noreferrer"
          >
            {tr("popup.star")}
          </a>
        </div>
      </footer>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById("root")!).render(<App />)
