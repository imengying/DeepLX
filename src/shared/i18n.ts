export type AppLocale = "zh-CN" | "en"

const MESSAGES = {
  "zh-CN": {
    "language.autoDetect": "自动检测",
    "popup.readSettingsFailed": "读取设置失败",
    "popup.chooseTargetLanguage": "请选择目标语言",
    "popup.sendingTask": "正在发送翻译任务...",
    "popup.noCurrentTab": "未找到当前标签页",
    "popup.translationStarted": "已开始网页翻译",
    "popup.sendTaskFailed": "翻译任务发送失败",
    "popup.originalRestored": "已恢复原文",
    "popup.restoreFailed": "恢复原文失败",
    "popup.sourceLanguage": "源语言",
    "popup.targetLanguage": "目标语言",
    "popup.processing": "处理中...",
    "popup.translateCurrentPage": "翻译当前网页",
    "popup.showOriginalTitle": "显示原文",
    "popup.restoreOriginalAria": "恢复网页原文",
    "popup.settings": "设置",
    "popup.star": "⭐ 来个 Star",
    "options.documentTitle": "DeepLX 设置",
    "options.pageTitle": "DeepLX 设置",
    "options.description": "配置自建接口地址和 token。",
    "options.loading": "加载中...",
    "options.defaultEngine": "默认翻译引擎",
    "options.engineGoogle": "Google Translate（默认）",
    "options.engineDeepLX": "DeepLX（自定义接口）",
    "options.tokenOptional": "DeepLX Token（可选）",
    "options.tokenPlaceholder": "如服务端需要 token，请填写",
    "options.showKey": "显示密钥",
    "options.hideKey": "隐藏密钥",
    "options.apiBaseUrl": "DeepLX 接口地址",
    "options.apiExample": "示例：https://api.deeplx.org（若带 token，最终请求会是 /token/translate）",
    "options.defaultSourceLanguage": "默认源语言",
    "options.defaultTargetLanguage": "默认目标语言",
    "options.save": "保存设置",
    "options.saving": "保存中...",
    "options.test": "测试连接",
    "options.testing": "测试中...",
    "options.saved": "已保存",
    "options.saveFailed": "保存失败",
    "options.connectionFailed": "连接失败",
    "options.connectionEmpty": "❌ 返回结果为空",
    "options.connectionSuccess": "✅ 连接成功！\"{source}\" → \"{result}\"",
    "content.noNeedTranslation": "该文本无需翻译",
    "content.selectionTranslateFailed": "划词翻译失败",
    "content.pageTranslating": "正在翻译网页，请稍候",
    "content.pageStart": "开始翻译网页...",
    "content.pageFailed": "翻译失败",
    "content.pageNoContent": "未找到可翻译内容或翻译失败",
    "content.pageDone": "网页翻译完成，共 {count} 段",
    "content.noRestorable": "没有可恢复的内容",
    "content.restored": "已恢复原文（{count} 段）",
    "content.selectionButtonTitle": "翻译选中文本",
    "api.timeout": "翻译请求超时（{seconds}秒），请检查网络或稍后重试",
    "api.googleRequestFailed": "Google Translate 请求失败: {status} {statusText}{detail}",
    "api.googleInvalidFormat": "Google Translate 返回格式异常",
    "api.googleEmpty": "Google Translate 返回为空",
    "api.deepLXRequestFailed": "DeepLX 请求失败: {status} {statusText}{detail}",
    "api.deepLXInvalidFormat": "DeepLX 返回格式异常",
    "settings.apiKeyPlaceholderError": "当前 baseURL 使用了 {{apiKey}} 占位符，请先填写 API Key",
  },
  en: {
    "language.autoDetect": "Auto Detect",
    "popup.readSettingsFailed": "Failed to load settings",
    "popup.chooseTargetLanguage": "Please select a target language",
    "popup.sendingTask": "Sending translation task...",
    "popup.noCurrentTab": "No active tab found",
    "popup.translationStarted": "Page translation started",
    "popup.sendTaskFailed": "Failed to send translation task",
    "popup.originalRestored": "Original text restored",
    "popup.restoreFailed": "Failed to restore original text",
    "popup.sourceLanguage": "Source",
    "popup.targetLanguage": "Target",
    "popup.processing": "Processing...",
    "popup.translateCurrentPage": "Translate Current Page",
    "popup.showOriginalTitle": "Show original",
    "popup.restoreOriginalAria": "Restore original page text",
    "popup.settings": "Settings",
    "popup.star": "⭐ Star on GitHub",
    "options.documentTitle": "DeepLX Settings",
    "options.pageTitle": "DeepLX Settings",
    "options.description": "Configure your DeepLX endpoint and token.",
    "options.loading": "Loading...",
    "options.defaultEngine": "Default Translation Engine",
    "options.engineGoogle": "Google Translate (Default)",
    "options.engineDeepLX": "DeepLX (Custom Endpoint)",
    "options.tokenOptional": "DeepLX Token (Optional)",
    "options.tokenPlaceholder": "Fill in if your server requires a token",
    "options.showKey": "Show key",
    "options.hideKey": "Hide key",
    "options.apiBaseUrl": "DeepLX Endpoint",
    "options.apiExample": "Example: https://api.deeplx.org (if token is set, final URL is /token/translate)",
    "options.defaultSourceLanguage": "Default Source Language",
    "options.defaultTargetLanguage": "Default Target Language",
    "options.save": "Save Settings",
    "options.saving": "Saving...",
    "options.test": "Test Connection",
    "options.testing": "Testing...",
    "options.saved": "Saved",
    "options.saveFailed": "Failed to save settings",
    "options.connectionFailed": "Connection failed",
    "options.connectionEmpty": "❌ Empty translation result",
    "options.connectionSuccess": "✅ Connected! \"{source}\" -> \"{result}\"",
    "content.noNeedTranslation": "No translation needed for this text",
    "content.selectionTranslateFailed": "Selection translation failed",
    "content.pageTranslating": "Page translation is in progress, please wait",
    "content.pageStart": "Starting page translation...",
    "content.pageFailed": "Translation failed",
    "content.pageNoContent": "No translatable content found or translation failed",
    "content.pageDone": "Page translation complete, {count} blocks",
    "content.noRestorable": "Nothing to restore",
    "content.restored": "Original text restored ({count} blocks)",
    "content.selectionButtonTitle": "Translate selected text",
    "api.timeout": "Translation request timed out ({seconds}s). Please check your network and retry.",
    "api.googleRequestFailed": "Google Translate request failed: {status} {statusText}{detail}",
    "api.googleInvalidFormat": "Unexpected Google Translate response format",
    "api.googleEmpty": "Google Translate returned empty text",
    "api.deepLXRequestFailed": "DeepLX request failed: {status} {statusText}{detail}",
    "api.deepLXInvalidFormat": "Unexpected DeepLX response format",
    "settings.apiKeyPlaceholderError": "Current base URL uses {{apiKey}} placeholder. Please fill in API Key first.",
  },
} as const

export type MessageKey = keyof typeof MESSAGES["zh-CN"]

function normalizeLocaleTag(raw: string): string {
  return raw.trim().replace(/_/g, "-").toLowerCase()
}

export function resolveRawUiLanguage(input?: string): string {
  if (input && input.trim()) {
    return normalizeLocaleTag(input)
  }

  const runtimeBrowser = (globalThis as { browser?: { i18n?: { getUILanguage?: () => string } } }).browser
  const fromI18n = runtimeBrowser?.i18n?.getUILanguage?.()
  if (fromI18n && fromI18n.trim()) {
    return normalizeLocaleTag(fromI18n)
  }

  if (typeof navigator !== "undefined") {
    if (navigator.language && navigator.language.trim()) {
      return normalizeLocaleTag(navigator.language)
    }

    if (Array.isArray(navigator.languages) && navigator.languages.length > 0 && navigator.languages[0].trim()) {
      return normalizeLocaleTag(navigator.languages[0])
    }
  }

  return "en"
}

export function resolveLocale(rawUiLanguage?: string): AppLocale {
  const normalized = resolveRawUiLanguage(rawUiLanguage)
  if (normalized.startsWith("zh")) {
    return "zh-CN"
  }
  return "en"
}

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) {
    return template
  }

  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    if (key in params) {
      return String(params[key])
    }
    return `{${key}}`
  })
}

export function t(
  key: MessageKey,
  params?: Record<string, string | number>,
  rawUiLanguage?: string
): string {
  const locale = resolveLocale(rawUiLanguage)
  const template = MESSAGES[locale][key] ?? MESSAGES.en[key]
  return interpolate(template, params)
}

export function setDocumentLanguage(rawUiLanguage?: string) {
  if (typeof document === "undefined") {
    return
  }

  const locale = resolveLocale(rawUiLanguage)
  document.documentElement.lang = locale === "zh-CN" ? "zh-CN" : "en"
}
