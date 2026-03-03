import { ExtensionSettings, toDeepLXEndpoint, formatDeepLXLang, toGoogleLang } from "./settings"
import { t } from "./i18n"

let activeControllers: Record<string, AbortController> = {}
const REQUEST_TIMEOUT_MS = 12000
const REQUEST_TIMEOUT_REASON = "DEEPLX_REQUEST_TIMEOUT"
export const TRANSLATION_ABORT_REASON = "New request started"

function formatErrorDetail(detail: string): string {
    return detail ? ` - ${detail}` : ""
}

function createRequestSignal(parentController?: AbortController) {
    const requestController = new AbortController()
    const timeoutId = setTimeout(() => {
        requestController.abort(REQUEST_TIMEOUT_REASON)
    }, REQUEST_TIMEOUT_MS)

    let cleanupParent: (() => void) | undefined
    if (parentController) {
        const relayAbort = () => {
            requestController.abort(parentController.signal.reason ?? TRANSLATION_ABORT_REASON)
        }

        if (parentController.signal.aborted) {
            relayAbort()
        } else {
            parentController.signal.addEventListener("abort", relayAbort, { once: true })
            cleanupParent = () => parentController.signal.removeEventListener("abort", relayAbort)
        }
    }

    return {
        signal: requestController.signal,
        didTimeout: () => requestController.signal.aborted && requestController.signal.reason === REQUEST_TIMEOUT_REASON,
        cleanup: () => {
            clearTimeout(timeoutId)
            cleanupParent?.()
        },
    }
}

async function fetchWithTimeout(
    input: RequestInfo | URL,
    init: RequestInit,
    controller?: AbortController
): Promise<Response> {
    const requestSignal = createRequestSignal(controller)
    try {
        return await fetch(input, { ...init, signal: requestSignal.signal })
    } catch (error) {
        if (requestSignal.didTimeout()) {
            throw new Error(t("api.timeout", { seconds: REQUEST_TIMEOUT_MS / 1000 }))
        }
        throw error
    } finally {
        requestSignal.cleanup()
    }
}

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
    const response = await fetchWithTimeout(endpoint, {}, controller)

    if (!response.ok) {
        const errorText = await response.text().catch(() => "")
        throw new Error(t("api.googleRequestFailed", {
            status: response.status,
            statusText: response.statusText,
            detail: formatErrorDetail(errorText),
        }))
    }

    const data = await response.json() as unknown
    if (!Array.isArray(data) || !Array.isArray(data[0])) {
        throw new Error(t("api.googleInvalidFormat"))
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
        throw new Error(t("api.googleEmpty"))
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

    const response = await fetchWithTimeout(endpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            text,
            source_lang: resolvedSourceLang === "AUTO" ? "auto" : resolvedSourceLang,
            target_lang: resolvedTargetLang,
        }),
    }, controller)

    if (!response.ok) {
        const errorText = await response.text().catch(() => "")
        throw new Error(t("api.deepLXRequestFailed", {
            status: response.status,
            statusText: response.statusText,
            detail: formatErrorDetail(errorText),
        }))
    }

    const data = await response.json() as {
        data?: string
        translations?: Array<{ text?: string }>
    }

    const translated = data.data ?? data.translations?.[0]?.text
    if (!translated) {
        throw new Error(t("api.deepLXInvalidFormat"))
    }
    return translated
}

export async function translateTextWithAbort(
    text: string,
    sourceLang: string | undefined,
    targetLang: string | undefined,
    settings: ExtensionSettings,
    id?: string
) {
    const scopeId = id?.trim()
    if (!scopeId) {
        if (settings.engine === "google") {
            return await translateWithGoogle(text, sourceLang, targetLang, settings)
        }
        return await translateWithDeepLX(text, sourceLang, targetLang, settings)
    }

    if (activeControllers[scopeId]) {
        activeControllers[scopeId].abort(TRANSLATION_ABORT_REASON)
    }

    const controller = new AbortController()
    activeControllers[scopeId] = controller

    try {
        let result: string
        if (settings.engine === "google") {
            result = await translateWithGoogle(text, sourceLang, targetLang, settings, controller)
        } else {
            result = await translateWithDeepLX(text, sourceLang, targetLang, settings, controller)
        }
        return result
    } finally {
        if (activeControllers[scopeId] === controller) {
            delete activeControllers[scopeId]
        }
    }
}
