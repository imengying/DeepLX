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

  return (
    <main className="options-page">
      <section className="card">
        <h1>DeepLX 设置</h1>
        <p className="desc">
          默认使用 Google Translate（免配置）；切换到 DeepLX 后可配置自建接口地址和 token。
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
                          <input
                            type="password"
                            value={settings.apiKey}
                            onChange={event => setSettings(prev => ({ ...prev, apiKey: event.target.value }))}
                            placeholder="如服务端需要 token，请填写"
                          />
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
                  : (
                      <p className="desc">Google 模式无需填写接口和 key。</p>
                    )}

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

                <button type="button" className="save-btn" onClick={() => { void save() }} disabled={saving}>
                  {saving ? "保存中..." : "保存设置"}
                </button>

                {status && <p className="status">{status}</p>}
              </>
            )}
      </section>
    </main>
  )
}

ReactDOM.createRoot(document.getElementById("root")!).render(<App />)
