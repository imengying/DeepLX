import { ExtensionSettings, toDeepLXEndpoint, formatDeepLXLang, toGoogleLang } from "./settings"

let activeControllers: Record<string, AbortController> = {}

export async function translateWithGoogle(
    text: string,
    sourceLang: string | undefined,
    targetLang: string | undefined,
    settings: ExtensionSettings,
    controller?: AbortController
) {
    const source = toGoogleLang(sourceLang ?? settings.sourceLang, true)
    const target = toGoogleLang(targetLang ?? settings.targetLang)

    const params = new URLSearchParams({
        client: "gtx",
        dt: "t",
        sl: source,
        tl: target,
        q: text,
    })

    const endpoint = `https://translate.googleapis.com/translate_a/single?${params.toString()}`
    const response = await fetch(endpoint, { signal: controller?.signal })

    if (!response.ok) {
        const errorText = await response.text().catch(() => "")
        throw new Error(`Google Translate 请求失败: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ""}`)
    }

    const data = await response.json() as unknown
    if (!Array.isArray(data) || !Array.isArray(data[0])) {
        throw new Error("Google Translate 返回格式异常")
    }

    const translated = (data[0] as unknown[])
        .map((chunk) => {
            if (!Array.isArray(chunk)) {
                return ""
            }
            const piece = chunk[0]
            return typeof piece === "string" ? piece : ""
        })
        .join("")
        .trim()

    if (!translated) {
        throw new Error("Google Translate 返回为空")
    }

    return translated
}

export async function translateWithDeepLX(
    text: string,
    sourceLang: string | undefined,
    targetLang: string | undefined,
    settings: ExtensionSettings,
    controller?: AbortController
) {
    const apiKey = settings.apiKey.trim()
    const endpoint = toDeepLXEndpoint(settings.apiBaseUrl, apiKey)
    const resolvedTargetLang = formatDeepLXLang(targetLang ?? settings.targetLang)
    const resolvedSourceLang = formatDeepLXLang(sourceLang ?? settings.sourceLang)

    const response = await fetch(endpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            text,
            source_lang: resolvedSourceLang === "AUTO" ? "auto" : resolvedSourceLang,
            target_lang: resolvedTargetLang,
        }),
        signal: controller?.signal,
    })

    if (!response.ok) {
        const errorText = await response.text().catch(() => "")
        throw new Error(`DeepLX 请求失败: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ""}`)
    }

    const data = await response.json() as {
        data?: string
        translations?: Array<{ text?: string }>
    }

    const translated = data.data ?? data.translations?.[0]?.text
    if (!translated) {
        throw new Error("DeepLX 返回格式异常")
    }
    return translated
}

export async function translateTextWithAbort(
    text: string,
    sourceLang: string | undefined,
    targetLang: string | undefined,
    settings: ExtensionSettings,
    id: string = "default"
) {
    if (activeControllers[id]) {
        activeControllers[id].abort("New request started")
    }

    const controller = new AbortController()
    activeControllers[id] = controller

    try {
        let result: string
        if (settings.engine === "google") {
            result = await translateWithGoogle(text, sourceLang, targetLang, settings, controller)
        } else {
            result = await translateWithDeepLX(text, sourceLang, targetLang, settings, controller)
        }
        return result
    } finally {
        if (activeControllers[id] === controller) {
            delete activeControllers[id]
        }
    }
}
