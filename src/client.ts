import { ForgeApiError, ForgeConfigError } from './errors.js'
import type { FetchLike, ForgeClientOptions, JsonValue, QueryValue } from './types.js'

const API_PREFIX = 'api/v1/'

/** Minimal REST client for the API surface shared by Gitea and Forgejo. */
export class ForgeClient {
  readonly #baseUrl: URL
  readonly #token: string | undefined
  readonly #requestTimeoutMs: number
  readonly #maxResponseBytes: number
  readonly #fetch: FetchLike

  constructor(options: ForgeClientOptions) {
    this.#baseUrl = normalizeBaseUrl(options.baseUrl)
    this.#token = normalizeToken(options.token)
    this.#requestTimeoutMs = positiveInteger(options.requestTimeoutMs, 'requestTimeoutMs')
    this.#maxResponseBytes = positiveInteger(options.maxResponseBytes, 'maxResponseBytes')
    this.#fetch = options.fetch ?? fetch
  }

  /** Fetch instance version information. */
  getVersion(signal?: AbortSignal): Promise<JsonValue> {
    return this.#get('version', {}, signal)
  }

  /** List repositories owned by the authenticated user. */
  listRepositories(page: number, limit: number, signal?: AbortSignal): Promise<JsonValue> {
    return this.#get('user/repos', { page, limit }, signal)
  }

  /** Search issues across repositories visible to the caller. */
  searchIssues(query: IssueSearchQuery, signal?: AbortSignal): Promise<JsonValue> {
    return this.#get('repos/issues/search', query, signal)
  }

  /** Fetch one issue by repository owner, name, and numeric index. */
  getIssue(owner: string, repo: string, index: number, signal?: AbortSignal): Promise<JsonValue> {
    return this.#get(`repos/${segment(owner)}/${segment(repo)}/issues/${index}`, {}, signal)
  }

  /** List pull requests for a repository. */
  listPullRequests(query: PullListQuery, signal?: AbortSignal): Promise<JsonValue> {
    const path = `repos/${segment(query.owner)}/${segment(query.repo)}/pulls`
    return this.#get(path, omit(query, ['owner', 'repo']), signal)
  }

  /** Fetch one pull request by repository owner, name, and numeric index. */
  getPullRequest(
    owner: string,
    repo: string,
    index: number,
    signal?: AbortSignal,
  ): Promise<JsonValue> {
    return this.#get(`repos/${segment(owner)}/${segment(repo)}/pulls/${index}`, {}, signal)
  }

  /** List Actions runs for a repository. */
  listActionRuns(query: ActionRunsQuery, signal?: AbortSignal): Promise<JsonValue> {
    const path = `repos/${segment(query.owner)}/${segment(query.repo)}/actions/runs`
    return this.#get(path, omit(query, ['owner', 'repo']), signal)
  }

  async #get(
    path: string,
    query: Readonly<Record<string, QueryValue>>,
    signal?: AbortSignal,
  ): Promise<JsonValue> {
    const url = buildUrl(this.#baseUrl, path, query)
    const response = await this.#fetch(url, {
      headers: requestHeaders(this.#token),
      signal: requestSignal(signal, this.#requestTimeoutMs),
    })
    return parseResponse(response, `GET ${path}`, this.#maxResponseBytes, this.#token)
  }
}

/** Filters accepted by the shared issue-search endpoint. */
export interface IssueSearchQuery extends Readonly<Record<string, QueryValue>> {
  readonly q?: string
  readonly owner?: string
  readonly state?: 'all' | 'closed' | 'open'
  readonly type?: 'issues' | 'pulls'
  readonly page: number
  readonly limit: number
}

/** Filters accepted when listing repository pull requests. */
export interface PullListQuery extends Readonly<Record<string, QueryValue>> {
  readonly owner: string
  readonly repo: string
  readonly state: 'all' | 'closed' | 'open'
  readonly page: number
  readonly limit: number
}

/** Filters accepted when listing repository Actions runs. */
export interface ActionRunsQuery extends Readonly<Record<string, QueryValue>> {
  readonly owner: string
  readonly repo: string
  readonly page: number
  readonly limit: number
  readonly status?: string
}

/** Build a URL while preserving an instance installed below a path prefix. */
export function buildUrl(
  baseUrl: URL,
  path: string,
  query: Readonly<Record<string, QueryValue>>,
): URL {
  const url = new URL(`${API_PREFIX}${path.replace(/^\/+/, '')}`, baseUrl)
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') url.searchParams.set(key, String(value))
  }
  return url
}

/** Clamp model-provided pagination to safe API bounds. */
export function normalizePagination(
  page?: number,
  limit?: number,
): { page: number; limit: number } {
  return {
    page: clampInteger(page ?? 1, 1, Number.MAX_SAFE_INTEGER),
    limit: clampInteger(limit ?? 20, 1, 50),
  }
}

function normalizeBaseUrl(value: string): URL {
  if (value.trim() === '') {
    throw new ForgeConfigError('Set dsh-forge baseUrl or the DSH_FORGE_URL environment variable')
  }
  const url = new URL(value)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new ForgeConfigError('dsh-forge baseUrl must use http or https')
  }
  if (url.username !== '' || url.password !== '') {
    throw new ForgeConfigError('dsh-forge baseUrl must not contain credentials')
  }
  url.pathname = `${url.pathname.replace(/\/+$/, '')}/`
  url.search = ''
  url.hash = ''
  return url
}

function normalizeToken(token: string | undefined): string | undefined {
  const normalized = token?.trim()
  return normalized === '' ? undefined : normalized
}

function positiveInteger(value: number, name: string): number {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new ForgeConfigError(`${name} must be a positive integer`)
  }
  return value
}

function clampInteger(value: number, minimum: number, maximum: number): number {
  if (!Number.isFinite(value)) return minimum
  return Math.min(maximum, Math.max(minimum, Math.trunc(value)))
}

function segment(value: string): string {
  const normalized = value.trim()
  if (normalized === '') throw new ForgeConfigError('Repository owner and name must not be empty')
  return encodeURIComponent(normalized)
}

function requestHeaders(token: string | undefined): Headers {
  const headers = new Headers({ Accept: 'application/json', 'User-Agent': 'dsh-forge/0.1.0' })
  if (token !== undefined) headers.set('Authorization', `token ${token}`)
  return headers
}

function requestSignal(signal: AbortSignal | undefined, timeoutMs: number): AbortSignal {
  const timeout = AbortSignal.timeout(timeoutMs)
  return signal === undefined ? timeout : AbortSignal.any([signal, timeout])
}

async function parseResponse(
  response: Response,
  operation: string,
  maxResponseBytes: number,
  token: string | undefined,
): Promise<JsonValue> {
  const text = await readBoundedBody(response, maxResponseBytes)
  if (!response.ok) throw new ForgeApiError(operation, response.status, errorDetail(text, token))
  if (text === '') return null
  return parseJson(text, operation)
}

async function readBoundedBody(response: Response, maximum: number): Promise<string> {
  const declared = Number(response.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > maximum) {
    throw new ForgeApiError('response', response.status, `body exceeds ${maximum} bytes`)
  }
  if (response.body === null) return ''
  return new TextDecoder().decode(await readBoundedStream(response.body, maximum, response.status))
}

async function readBoundedStream(
  stream: ReadableStream<Uint8Array>,
  maximum: number,
  status: number,
): Promise<Uint8Array> {
  const reader = stream.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) return joinChunks(chunks, total)
      total += value.byteLength
      if (total > maximum) {
        await reader.cancel()
        throw new ForgeApiError('response', status, `body exceeds ${maximum} bytes`)
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }
}

function joinChunks(chunks: readonly Uint8Array[], total: number): Uint8Array {
  const result = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.byteLength
  }
  return result
}

function parseJson(text: string, operation: string): JsonValue {
  try {
    const value: unknown = JSON.parse(text)
    if (!isJsonValue(value)) throw new Error('non-JSON value')
    return value
  } catch {
    throw new ForgeApiError(operation, 502, 'instance returned invalid JSON')
  }
}

function errorDetail(text: string, token: string | undefined): string {
  if (text === '') return 'empty response'
  try {
    const value: unknown = JSON.parse(text)
    if (isRecord(value) && typeof value.message === 'string') {
      return sanitizeDetail(value.message, token)
    }
  } catch {
    return sanitizeDetail(text, token)
  }
  return 'request rejected'
}

function sanitizeDetail(value: string, token: string | undefined): string {
  const redacted = token === undefined ? value : value.split(token).join('[REDACTED]')
  return redacted.replace(/\s+/g, ' ').trim().slice(0, 500)
}

function isJsonValue(value: unknown): value is JsonValue {
  if (value === null || ['boolean', 'number', 'string'].includes(typeof value)) return true
  if (Array.isArray(value)) return value.every(isJsonValue)
  if (!isRecord(value)) return false
  return Object.values(value).every(isJsonValue)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function omit<T extends Readonly<Record<string, QueryValue>>>(
  value: T,
  keys: readonly string[],
): Record<string, QueryValue> {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)))
}
