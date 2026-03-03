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

  const showOriginal = async () => {
    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true })
      if (!tab?.id) {
        setStatus("未找到当前标签页")
        return
      }

      await browser.tabs.sendMessage(tab.id, {
        type: MESSAGE_TYPE.SHOW_ORIGINAL,
      })

      setStatus("已恢复原文")
    }
    catch (error) {
      const message = error instanceof Error ? error.message : "恢复原文失败"
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
        </div>

        <div className="action-row">
          <button
            type="button"
            className="translate-btn"
            onClick={() => { void translateCurrentPage() }}
            disabled={busy}
          >
            {busy ? "处理中..." : "翻译当前网页"}
          </button>
          <button
            type="button"
            className="original-btn"
            onClick={() => { void showOriginal() }}
            title="显示原文"
            aria-label="恢复网页原文"
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
            设置
          </button>
          <a
            className="star-btn"
            href="https://github.com/imengying/DeepLX"
            target="_blank"
            rel="noopener noreferrer"
          >
            ⭐ 来个 Star
          </a>
        </div>
      </footer>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById("root")!).render(<App />)
