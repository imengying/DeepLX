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
          deepLApiKey: settings.deepLApiKey.trim(),
          deepLApiBaseUrl: settings.deepLApiBaseUrl.trim(),
          deepLXToken: settings.deepLXToken.trim(),
          deepLXBaseUrl: settings.deepLXBaseUrl.trim(),
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
          不填 DeepLX Token 时使用 DeepL 官方接口；填了 DeepLX Token 后自动切换到 DeepLX 接口。
        </p>

        {loading
          ? (
              <p className="status">加载中...</p>
            )
          : (
              <>
                <label className="field">
                  <span>DeepL API Key（官方）</span>
                  <input
                    type="password"
                    value={settings.deepLApiKey}
                    onChange={event => setSettings(prev => ({ ...prev, deepLApiKey: event.target.value }))}
                    placeholder="例如：xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx:fx"
                  />
                </label>

                <label className="field">
                  <span>DeepL 接口地址（官方）</span>
                  <input
                    type="text"
                    value={settings.deepLApiBaseUrl}
                    onChange={event => setSettings(prev => ({ ...prev, deepLApiBaseUrl: event.target.value }))}
                    placeholder="https://api-free.deepl.com"
                  />
                  <small>默认会自动拼成 /v2/translate。Pro 可改为 https://api.deepl.com</small>
                </label>

                <label className="field">
                  <span>DeepLX Token（可选）</span>
                  <input
                    type="password"
                    value={settings.deepLXToken}
                    onChange={event => setSettings(prev => ({ ...prev, deepLXToken: event.target.value }))}
                    placeholder="填写后使用 DeepLX 接口"
                  />
                </label>

                <label className="field">
                  <span>DeepLX 接口地址</span>
                  <input
                    type="text"
                    value={settings.deepLXBaseUrl}
                    onChange={event => setSettings(prev => ({ ...prev, deepLXBaseUrl: event.target.value }))}
                    placeholder="https://api.deeplx.org"
                  />
                  <small>默认会拼成 /translate；api.deeplx.org 会拼成 /{token}/translate</small>
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
