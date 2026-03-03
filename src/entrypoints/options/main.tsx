import type { ExtensionSettings } from "@/shared/settings"
import { browser } from "#imports"
import { useEffect, useMemo, useState } from "react"
import ReactDOM from "react-dom/client"
import { MESSAGE_TYPE } from "@/shared/messages"
import { resolveRawUiLanguage, setDocumentLanguage, t } from "@/shared/i18n"
import { TARGET_LANG_OPTIONS, createDefaultSettings, getSourceLanguageOptions } from "@/shared/settings"
import "./style.css"

function App() {
  const [uiLanguage] = useState(() => resolveRawUiLanguage())
  const [settings, setSettings] = useState<ExtensionSettings>(() => createDefaultSettings(uiLanguage))
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState("")
  const [showKey, setShowKey] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean, message: string } | null>(null)
  const tr = (key: Parameters<typeof t>[0], params?: Record<string, string | number>) => t(key, params, uiLanguage)
  const sourceLangOptions = useMemo(() => getSourceLanguageOptions(uiLanguage), [uiLanguage])

  useEffect(() => {
    setDocumentLanguage(uiLanguage)
    document.title = t("options.documentTitle", undefined, uiLanguage)

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
      setLoading(false)
    })()
  }, [uiLanguage])

  const save = async () => {
    setSaving(true)
    setStatus("")

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

      setStatus(tr("options.saved"))
    }
    catch (error) {
      const message = error instanceof Error ? error.message : tr("options.saveFailed")
      setStatus(message)
    }
    finally {
      setSaving(false)
    }
  }

  const testConnection = async () => {
    setTesting(true)
    setTestResult(null)

    try {
      // First save current settings
      await browser.runtime.sendMessage({
        type: MESSAGE_TYPE.UPDATE_SETTINGS,
        payload: {
          engine: settings.engine,
          apiKey: settings.apiKey.trim(),
          apiBaseUrl: settings.apiBaseUrl.trim(),
        },
      })

      // Then try a test translation
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
        setTestResult({
          ok: true,
          message: tr("options.connectionSuccess", { source: "hello", result }),
        })
      }
      else {
        setTestResult({ ok: false, message: tr("options.connectionEmpty") })
      }
    }
    catch (error) {
      const message = error instanceof Error ? error.message : tr("options.connectionFailed")
      setTestResult({ ok: false, message: `❌ ${message}` })
    }
    finally {
      setTesting(false)
    }
  }

  return (
    <main className="options-page">
      <section className="card">
        <h1>{tr("options.pageTitle")}</h1>
        <p className="desc">
          {tr("options.description")}
        </p>

        {loading
          ? (
            <p className="status">{tr("options.loading")}</p>
          )
          : (
            <>
              <label className="field">
                <span>{tr("options.defaultEngine")}</span>
                <select
                  value={settings.engine}
                  onChange={event => setSettings(prev => ({ ...prev, engine: event.target.value as ExtensionSettings["engine"] }))}
                >
                  <option value="google">{tr("options.engineGoogle")}</option>
                  <option value="deeplx">{tr("options.engineDeepLX")}</option>
                </select>
              </label>

              {settings.engine === "deeplx"
                ? (
                  <>
                    <label className="field">
                      <span>{tr("options.tokenOptional")}</span>
                      <div className="input-with-icon">
                        <input
                          type={showKey ? "text" : "password"}
                          value={settings.apiKey}
                          onChange={event => setSettings(prev => ({ ...prev, apiKey: event.target.value }))}
                          placeholder={tr("options.tokenPlaceholder")}
                        />
                        <button
                          type="button"
                          className="eye-btn"
                          onClick={() => setShowKey(prev => !prev)}
                          title={showKey ? tr("options.hideKey") : tr("options.showKey")}
                          aria-label={showKey ? tr("options.hideKey") : tr("options.showKey")}
                          aria-pressed={showKey}
                        >
                          {showKey
                            ? <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" /><circle cx="12" cy="12" r="3" /></svg>
                            : <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" /><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" /><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" /><path d="m2 2 20 20" /></svg>}
                        </button>
                      </div>
                    </label>

                    <label className="field">
                      <span>{tr("options.apiBaseUrl")}</span>
                      <input
                        type="text"
                        value={settings.apiBaseUrl}
                        onChange={event => setSettings(prev => ({ ...prev, apiBaseUrl: event.target.value }))}
                        placeholder="https://api.deeplx.org"
                      />
                      <small>
                        {tr("options.apiExample")}
                      </small>
                    </label>
                  </>
                )
                : null}

              <div className="grid2">
                <label className="field">
                  <span>{tr("options.defaultSourceLanguage")}</span>
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
                  <span>{tr("options.defaultTargetLanguage")}</span>
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
                <button type="button" className="save-btn" onClick={() => { void save() }} disabled={saving}>
                  {saving ? tr("options.saving") : tr("options.save")}
                </button>
                <button
                  type="button"
                  className="test-btn"
                  onClick={() => { void testConnection() }}
                  disabled={testing}
                >
                  {testing ? tr("options.testing") : tr("options.test")}
                </button>
              </div>

              {testResult && (
                <p className={testResult.ok ? "test-success" : "test-fail"} role="status" aria-live="polite">
                  {testResult.message}
                </p>
              )}

              {status && <p className="status" role="status" aria-live="polite">{status}</p>}
            </>
          )}
      </section>
    </main>
  )
}

ReactDOM.createRoot(document.getElementById("root")!).render(<App />)
