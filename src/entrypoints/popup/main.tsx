import type { ExtensionSettings } from "@/shared/settings"
import { browser } from "#imports"
import { useEffect, useMemo, useState } from "react"
import ReactDOM from "react-dom/client"
import { MESSAGE_TYPE } from "@/shared/messages"
import { DEFAULT_SETTINGS, SOURCE_LANG_OPTIONS, TARGET_LANG_OPTIONS } from "@/shared/settings"
import "./style.css"

function App() {
  const [settings, setSettings] = useState<ExtensionSettings>(DEFAULT_SETTINGS)
  const [status, setStatus] = useState("")
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void (async () => {
      const data = await browser.runtime.sendMessage({ type: MESSAGE_TYPE.GET_SETTINGS }) as ExtensionSettings
      if (data) {
        setSettings(data)
      }
    })()
  }, [])

  const canTranslate = useMemo(() => settings.targetLang.trim().length > 0, [settings.targetLang])

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
      setStatus("请选择目标语言")
      return
    }

    setBusy(true)
    setStatus("正在发送翻译任务...")

    try {
      await saveLanguageConfig()

      const [tab] = await browser.tabs.query({ active: true, currentWindow: true })
      if (!tab?.id) {
        setStatus("未找到当前标签页")
        return
      }

      await browser.tabs.sendMessage(tab.id, {
        type: MESSAGE_TYPE.TRANSLATE_PAGE,
        payload: {
          sourceLang: settings.sourceLang,
          targetLang: settings.targetLang,
        },
      })

      setStatus("已开始网页翻译")
    }
    catch (error) {
      const message = error instanceof Error ? error.message : "翻译任务发送失败"
      setStatus(message)
    }
    finally {
      setBusy(false)
    }
  }

  return (
    <div className="popup">
      <header className="popup-header">
        <div className="logo">DeepLX</div>
        <div className="subtitle">网页翻译 + 划词翻译</div>
      </header>

      <div className="panel">
        <label className="field">
          <span>源语言</span>
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
          <span>目标语言</span>
          <select
            value={settings.targetLang}
            onChange={event => setSettings(prev => ({ ...prev, targetLang: event.target.value }))}
          >
            {TARGET_LANG_OPTIONS.map(item => (
              <option key={item.code} value={item.code}>{item.label}</option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className="translate-btn"
          onClick={() => { void translateCurrentPage() }}
          disabled={busy}
        >
          {busy ? "处理中..." : "翻译当前网页"}
        </button>

        <p className="hint">划词翻译：在网页中选中文本后点击“翻译”按钮。</p>

        {status && <p className="status">{status}</p>}
      </div>

      <footer className="popup-footer">
        <button
          type="button"
          className="settings-btn"
          onClick={() => {
            void browser.runtime.openOptionsPage()
          }}
        >
          设置
        </button>
      </footer>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById("root")!).render(<App />)
