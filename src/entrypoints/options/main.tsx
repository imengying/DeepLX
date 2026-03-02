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
      const data = await browser.runtime.sendMessage({ type: MESSAGE_TYPE.GET_SETTINGS }) as ExtensionSettings
      if (data) {
        setSettings(data)
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
        <p className="desc">服务商仅保留 DeepL。配置后即可用于网页翻译与划词翻译。</p>

        {loading
          ? (
              <p className="status">加载中...</p>
            )
          : (
              <>
                <label className="field">
                  <span>DeepL API Key</span>
                  <input
                    type="password"
                    value={settings.apiKey}
                    onChange={event => setSettings(prev => ({ ...prev, apiKey: event.target.value }))}
                    placeholder="例如：xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx:fx"
                  />
                </label>

                <label className="field">
                  <span>DeepL 接口地址</span>
                  <input
                    type="text"
                    value={settings.apiBaseUrl}
                    onChange={event => setSettings(prev => ({ ...prev, apiBaseUrl: event.target.value }))}
                    placeholder="https://api-free.deepl.com"
                  />
                  <small>默认使用 free 接口；如你是 Pro 可改为 https://api.deepl.com</small>
                </label>

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
