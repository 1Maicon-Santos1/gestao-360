// ─── WhatsApp Service — uazapiGO V2 ──────────────────────────────────
//
// Provider: uazapiGO / uazapiGO V2 (uazapi.com)
//
// API contract — uazapiGO V2 documented format:
//   Method  : POST
//   Endpoint: {base_url}/send/text
//   Auth    : header  token: {instance_token}
//   Body (individual) : { "number": "<phone>", "text": "<message>" }
//   Body (group)      : { "number": "<groupid@g.us>", "isGroup": true, "text": "<message>" }
//
// Field names: "number" (not "phone"), "text" (not "message").
// "isGroup": true is required for @g.us JIDs — without it the server
// attempts a group-member lookup that fails with 500.
//
// The instance token goes in the "token" header — never in the URL path.
// The admin token is only needed for administrative operations (not sends).
//
// ─────────────────────────────────────────────────────────────────────

export const WPP_STORAGE_KEY = 'fh_wpp_settings'
export const WPP_LOGS_KEY    = 'fh_wpp_logs'

// ─── Config ───────────────────────────────────────────────────────────

export interface WppConfig {
  /** Display name of the provider (e.g., "uazapiGO V2") */
  provider_name: string
  /** Base URL of the uazapiGO server — NO token in path, e.g. https://ipazua.uazapi.com */
  api_base_url: string
  /** Instance token — goes in "token" header for every send request */
  instance_token: string
  /** Admin token — only used for administrative API calls */
  admin_token: string
  /** WhatsApp group JID, format: 120363xxxx@g.us */
  group_jid: string
  /** Human-readable group name (display only) */
  group_name: string
  /** Name of the PJ account for summaries (matches account name in Contas) */
  pj_account_name: string
}

// ─── Validation ───────────────────────────────────────────────────────

export interface ConfigValidation {
  valid: boolean
  errors: string[]
  warnings: string[]
  /** Normalised server URL (no trailing slash, no token in path) */
  baseUrl: string
  /** Exact endpoint that will be called */
  sendEndpoint: string
  /** HTTP method */
  method: 'POST'
  /** Header names that will be sent (values masked) */
  headers: string[]
}

export function validateConfig(config: WppConfig | null): ConfigValidation {
  const errors: string[] = []
  const warnings: string[] = []

  if (!config) {
    return { valid: false, errors: ['Configuração não encontrada.'], warnings: [], baseUrl: '', sendEndpoint: '', method: 'POST', headers: [] }
  }

  const rawUrl = (config.api_base_url || '').trim()
  const baseUrl = rawUrl.replace(/\/+$/, '') // remove trailing slashes

  // Detect common mistake: token embedded in URL path
  if (/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(baseUrl)) {
    errors.push(
      'A URL da API contém um UUID (token) no path. A URL deve ser apenas o servidor, ex: https://ipazua.uazapi.com'
    )
  }

  if (!baseUrl) errors.push('URL da API não preenchida.')
  else if (!/^https?:\/\//i.test(baseUrl)) errors.push('URL da API inválida — deve começar com https://')

  const instanceToken = (config.instance_token || '').trim()
  if (!instanceToken) errors.push('Token da instância não preenchido.')

  const groupJid = (config.group_jid || '').trim()
  if (!groupJid) errors.push('JID do grupo não preenchido.')
  else if (!groupJid.endsWith('@g.us') && !groupJid.endsWith('@s.whatsapp.net')) {
    warnings.push('JID do grupo deve terminar com @g.us para grupos.')
  }

  const sendEndpoint = baseUrl ? `${baseUrl}/send/text` : ''
  const headers = instanceToken ? ['Content-Type', 'token'] : ['Content-Type']

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    baseUrl,
    sendEndpoint,
    method: 'POST',
    headers,
  }
}

export function isConfigured(config: WppConfig | null): boolean {
  return validateConfig(config).valid
}

// ─── Storage ──────────────────────────────────────────────────────────

export function getWppConfig(): WppConfig | null {
  try {
    const raw = localStorage.getItem(WPP_STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveWppConfig(config: Partial<WppConfig>): void {
  const current = getWppConfig() ?? {}
  localStorage.setItem(WPP_STORAGE_KEY, JSON.stringify({ ...current, ...config }))
}

// ─── Logs ─────────────────────────────────────────────────────────────

export type SendStatus = 'success' | 'error'

export interface SendLog {
  id: string
  /** Short label shown in UI, e.g. "✅ Teste" */
  label: string
  /** Internal type key, e.g. "test", "balance" */
  type: string
  /** The message text that was sent */
  message: string
  /** Provider used */
  provider: string
  /** Full endpoint URL that was called */
  endpoint: string
  /** HTTP method used */
  method: string
  /** HTTP status received (0 if network error) */
  http_status: number
  group_jid: string
  group_name: string
  status: SendStatus
  /** Human-readable error description, if status === 'error' */
  error?: string
  sent_at: string
}

export function getWppLogs(): SendLog[] {
  try {
    const raw = localStorage.getItem(WPP_LOGS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function clearWppLogs(): void {
  localStorage.removeItem(WPP_LOGS_KEY)
}

function appendLog(log: Omit<SendLog, 'id' | 'sent_at'>): void {
  const logs = getWppLogs()
  const entry: SendLog = { ...log, id: crypto.randomUUID(), sent_at: new Date().toISOString() }
  localStorage.setItem(WPP_LOGS_KEY, JSON.stringify([entry, ...logs].slice(0, 100)))
}

// ─── Send ─────────────────────────────────────────────────────────────

/**
 * Sends a text message to the configured WhatsApp group using uazapiGO V2.
 *
 * Endpoint : POST {api_base_url}/send/text
 * Auth     : header  token: {instance_token}
 * Body     : { "number": "<group_jid>", "text": "<message>" }
 *
 * Throws with a human-readable message on any error.
 */
export async function sendWhatsAppText(
  type: string,
  label: string,
  message: string,
): Promise<void> {
  const config = getWppConfig()
  const validation = validateConfig(config)

  if (!validation.valid) {
    throw new Error(`Configuração inválida:\n• ${validation.errors.join('\n• ')}`)
  }

  const { baseUrl, sendEndpoint } = validation
  const instanceToken = config!.instance_token.trim()
  const groupJid      = config!.group_jid.trim()
  const groupName     = config!.group_name || groupJid
  const provider      = config!.provider_name || 'uazapiGO V2'

  // uazapiGO V2 field names: "number" (not "phone") and "text" (not "message").
  // The original 500 "group members" error confirmed the server recognized these
  // field names (it attempted 2 sends). The 500 was caused by missing isGroup: true,
  // which made the server try an internal group-member lookup that failed.
  // Fix: keep original field names + add isGroup: true for @g.us JIDs.
  const isGroup = groupJid.endsWith('@g.us')
  const payload = isGroup
    ? { number: groupJid, isGroup: true, text: message }
    : { number: groupJid, text: message }

  const logBase = { label, type, message, provider, endpoint: sendEndpoint, method: 'POST', group_jid: groupJid, group_name: groupName }

  let response: Response
  try {
    response = await fetch(sendEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': instanceToken,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    })
  } catch (err: any) {
    const errMsg = err?.name === 'TimeoutError'
      ? 'Timeout: o servidor demorou mais de 15 s para responder.'
      : `Falha de rede: ${err?.message ?? 'erro desconhecido'}. Verifique a URL e desative ad-blockers para localhost.`
    appendLog({ ...logBase, http_status: 0, status: 'error', error: errMsg })
    throw new Error(errMsg)
  }

  if (!response.ok) {
    let body = ''
    try { body = await response.text() } catch {}

    let errMsg: string
    if (response.status === 401) {
      errMsg = `Autenticação falhou (401): token da instância inválido ou expirado. Resposta: ${body}`
    } else if (response.status === 403) {
      errMsg = `Sem permissão (403): o token não tem acesso a esta operação. Resposta: ${body}`
    } else if (response.status === 404) {
      errMsg = `Endpoint não encontrado (404): verifique a URL da API. Testado: ${sendEndpoint}`
    } else if (response.status === 405) {
      errMsg = `Método não permitido (405): o servidor rejeitou POST para ${sendEndpoint}. Verifique a URL da API — ela não deve conter o token no path.`
    } else if (response.status >= 500) {
      const isGroupMemberErr = body.includes('group members') || body.includes('info query')
      errMsg = isGroupMemberErr
        ? `HTTP ${response.status}: O servidor não conseguiu resolver o grupo. Verifique se o JID "${groupJid}" está correto e se a instância WhatsApp está conectada a esse grupo. Detalhe: ${body}`
        : `HTTP ${response.status}: ${body || response.statusText}`
    } else {
      errMsg = `HTTP ${response.status}: ${body || response.statusText}`
    }

    appendLog({ ...logBase, http_status: response.status, status: 'error', error: errMsg })
    throw new Error(errMsg)
  }

  appendLog({ ...logBase, http_status: response.status, status: 'success' })
}
