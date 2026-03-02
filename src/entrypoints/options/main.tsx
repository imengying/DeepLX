import type { ExtensionSettings } from "@/shared/settings"
import { browser } from "#imports"
import { useEffect, useState } from "react"
import ReactDOM from "react-dom/client"
import { MESSAGE_TYPE } from "@/shared/messages"
import { DEFAULT_SETTINGS, SOURCE_LANG_OPTIONS, TARGET_LANG_OPTIONS } from "@/shared/settings"
import "./style.css"

function App() {
  const [settings, setSettings] = useState<ExtensionSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState("")
  const [showKey, setShowKey] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean, message: string } | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const data = await browser.runtime.sendMessage({ type: MESSAGE_TYPE.GET_SETTINGS }) as ExtensionSettings
        if (data) {
          setSettings(data)
        }
      }
      catch (error) {
        const message = error instanceof Error ? error.message : "读取设置失败"
        setStatus(message)
      }
      setLoading(false)
    })()
  }, [])

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

      setStatus("已保存")
    }
    catch (error) {
      const message = error instanceof Error ? error.message : "保存失败"
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
        },
      }) as string

      if (result && result.trim().length > 0) {
        setTestResult({ ok: true, message: `✅ 连接成功！"hello" → "${result}"` })
      }
      else {
        setTestResult({ ok: false, message: "❌ 返回结果为空" })
      }
    }
    catch (error) {
      const message = error instanceof Error ? error.message : "连接失败"
      setTestResult({ ok: false, message: `❌ ${message}` })
    }
    finally {
      setTesting(false)
    }
  }

  return (
    <main className="options-page">
      <section className="card">
        <h1>DeepLX 设置</h1>
        <p className="desc">
          配置自建接口地址和 token。
        </p>

        {loading
          ? (
            <p className="status">加载中...</p>
          )
          : (
            <>
              <label className="field">
                <span>默认翻译引擎</span>
                <select
                  value={settings.engine}
                  onChange={event => setSettings(prev => ({ ...prev, engine: event.target.value as ExtensionSettings["engine"] }))}
                >
                  <option value="google">Google Translate（默认）</option>
                  <option value="deeplx">DeepLX（自定义接口）</option>
                </select>
              </label>

              {settings.engine === "deeplx"
                ? (
                  <>
                    <label className="field">
                      <span>DeepLX Token（可选）</span>
                      <div className="input-with-icon">
                        <input
                          type={showKey ? "text" : "password"}
                          value={settings.apiKey}
                          onChange={event => setSettings(prev => ({ ...prev, apiKey: event.target.value }))}
                          placeholder="如服务端需要 token，请填写"
                        />
                        <button
                          type="button"
                          className="eye-btn"
                          onClick={() => setShowKey(prev => !prev)}
                          title={showKey ? "隐藏密钥" : "显示密钥"}
                        >
                          {showKey
                            ? <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" /><circle cx="12" cy="12" r="3" /></svg>
                            : <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" /><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" /><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" /><path d="m2 2 20 20" /></svg>}
                        </button>
                      </div>
                    </label>

                    <label className="field">
                      <span>DeepLX 接口地址</span>
                      <input
                        type="text"
                        value={settings.apiBaseUrl}
                        onChange={event => setSettings(prev => ({ ...prev, apiBaseUrl: event.target.value }))}
                        placeholder="https://api.deeplx.org"
                      />
                      <small>
                        示例：https://api.deeplx.org（若带 token，最终请求会是 /token/translate）
                      </small>
                    </label>
                  </>
                )
                : null}

              <div className="grid2">
                <label className="field">
                  <span>默认源语言</span>
                  <select
                    value={settings.sourceLang}
                    onChange={event => setSettings(prev => ({ ...prev, sourceLang: event.target.value }))}
                  >
                    {SOURCE_LANG_OPTIONS.map(item => (
                      <option key={item.code} value={item.code}>{item.label}</option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>默认目标语言</span>
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
                  {saving ? "保存中..." : "保存设置"}
                </button>
                <button
                  type="button"
                  className="test-btn"
                  onClick={() => { void testConnection() }}
                  disabled={testing}
                >
                  {testing ? "测试中..." : "测试连接"}
                </button>
              </div>

              {testResult && (
                <p className={testResult.ok ? "test-success" : "test-fail"}>
                  {testResult.message}
                </p>
              )}

              {status && <p className="status">{status}</p>}
            </>
          )}
      </section>
    </main>
  )
}

ReactDOM.createRoot(document.getElementById("root")!).render(<App />)
