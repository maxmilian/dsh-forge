import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'

import { buildUrl, ForgeClient, normalizePagination } from '../src/client.js'
import { ForgeApiError, ForgeConfigError } from '../src/errors.js'
import type { FetchLike } from '../src/types.js'

function jsonResponse(value: unknown, status = 200, headers?: HeadersInit): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  })
}

function clientWith(
  fetch: FetchLike,
  overrides: Partial<ConstructorParameters<typeof ForgeClient>[0]> = {},
) {
  return new ForgeClient({
    baseUrl: 'https://forge.example.test/git',
    token: 'top-secret',
    requestTimeoutMs: 1_000,
    maxResponseBytes: 10_000,
    fetch,
    ...overrides,
  })
}

describe('ForgeClient', () => {
  it('preserves a base path and encodes query parameters', () => {
    const url = buildUrl(new URL('https://forge.test/git/'), 'repos/issues/search', {
      q: 'bug & fix',
      page: 2,
      empty: undefined,
    })
    expect(url.toString()).toBe(
      'https://forge.test/git/api/v1/repos/issues/search?q=bug+%26+fix&page=2',
    )
  })

  it('authenticates and lists repositories', async () => {
    const fetchMock = vi.fn<FetchLike>().mockResolvedValue(jsonResponse([{ id: 1 }]))
    const result = await clientWith(fetchMock).listRepositories(1, 20)
    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toContain('/git/api/v1/user/repos?page=1&limit=20')
    expect(String(url)).not.toContain('sort=')
    expect(new Headers(init?.headers).get('Authorization')).toBe('token top-secret')
    expect(result).toEqual([{ id: 1 }])
  })

  it('normalizes pagination at every client list boundary', async () => {
    const fetchMock = vi.fn<FetchLike>().mockResolvedValue(jsonResponse([]))
    const client = clientWith(fetchMock)

    await client.listRepositories(-1, 1_000)
    await client.searchIssues({ page: -1, limit: 1_000 })
    await client.listPullRequests({
      owner: 'ankey',
      repo: 'demo',
      state: 'open',
      page: -1,
      limit: 1_000,
    })
    await client.listPullRequestFiles('ankey', 'demo', 1, -1, 1_000)
    await client.listActionRuns({ owner: 'ankey', repo: 'demo', page: -1, limit: 1_000 })

    for (const [url] of fetchMock.mock.calls) {
      expect(String(url)).toContain('page=1&limit=50')
    }
  })

  it('omits authorization when no token is configured', async () => {
    const fetchMock = vi.fn<FetchLike>().mockResolvedValue(jsonResponse({ version: '1.0.0' }))
    await clientWith(fetchMock, { token: undefined }).getVersion()
    const [, init] = fetchMock.mock.calls[0] ?? []
    expect(new Headers(init?.headers).has('Authorization')).toBe(false)
  })

  it('sends a user agent matching the package version', async () => {
    const fetchMock = vi.fn<FetchLike>().mockResolvedValue(jsonResponse({ version: '1.0.0' }))
    await clientWith(fetchMock).getVersion()
    const [, init] = fetchMock.mock.calls[0] ?? []
    const manifest = JSON.parse(
      readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
    ) as { version: string }
    expect(new Headers(init?.headers).get('User-Agent')).toBe(`dsh-forge/${manifest.version}`)
  })

  it('encodes owner and repository path segments', async () => {
    const fetchMock = vi.fn<FetchLike>().mockResolvedValue(jsonResponse({ index: 7 }))
    await clientWith(fetchMock).getIssue('my team', 'demo/repo', 7)
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/repos/my%20team/demo%2Frepo/issues/7')
  })

  it('fetches pull request diffs as bounded text', async () => {
    const fetchMock = vi.fn<FetchLike>().mockResolvedValue(new Response('diff --git a/a b/a'))
    await expect(clientWith(fetchMock).getPullRequestDiff('ankey', 'demo', 3)).resolves.toBe(
      'diff --git a/a b/a',
    )
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/repos/ankey/demo/pulls/3.diff')
  })

  it('lists pull request files and Actions jobs through shared endpoints', async () => {
    const fetchMock = vi.fn<FetchLike>().mockResolvedValue(jsonResponse({ ok: true }))
    const client = clientWith(fetchMock)
    await client.listPullRequestFiles('ankey', 'demo', 3, 2, 10)
    await client.listActionJobs('ankey', 'demo', 91)
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain(
      '/repos/ankey/demo/pulls/3/files?page=2&limit=10',
    )
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain('/repos/ankey/demo/actions/runs/91/jobs')
  })

  it('fetches Actions job logs as plaintext', async () => {
    const fetchMock = vi.fn<FetchLike>().mockResolvedValue(new Response('integration marker'))
    await expect(clientWith(fetchMock).getActionJobLogs('ankey', 'demo', 17)).resolves.toBe(
      'integration marker',
    )
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/actions/jobs/17/logs')
  })

  it('sanitizes errors returned by plaintext endpoints', async () => {
    const fetchMock = vi
      .fn<FetchLike>()
      .mockResolvedValue(new Response('token top-secret denied', { status: 403 }))
    const promise = clientWith(fetchMock).getActionJobLogs('ankey', 'demo', 17)
    await expect(promise).rejects.toThrow('token [REDACTED] denied')
    await expect(promise).rejects.not.toThrow('top-secret')
  })

  it('forwards the caller cancellation signal', async () => {
    const controller = new AbortController()
    const fetchMock = vi.fn<FetchLike>().mockImplementation((_input, init) => {
      expect(init?.signal).toBeInstanceOf(AbortSignal)
      controller.abort()
      return Promise.reject(init?.signal?.reason)
    })
    await expect(clientWith(fetchMock).getVersion(controller.signal)).rejects.toBeDefined()
  })

  it.each([401, 403, 404, 429, 500])('returns a safe HTTP error for %s', async (status) => {
    const fetchMock = vi
      .fn<FetchLike>()
      .mockResolvedValue(jsonResponse({ message: 'request rejected' }, status))
    const promise = clientWith(fetchMock).getVersion()
    await expect(promise).rejects.toMatchObject({ status })
    await expect(promise).rejects.not.toThrow('top-secret')
  })

  it('redacts a token reflected by an error response', async () => {
    const fetchMock = vi
      .fn<FetchLike>()
      .mockResolvedValue(jsonResponse({ message: 'rejected token top-secret' }, 401))
    const promise = clientWith(fetchMock).getVersion()
    await expect(promise).rejects.not.toThrow('top-secret')
    await expect(promise).rejects.toThrow('rejected token [REDACTED]')
  })

  it('bounds response bodies using content-length', async () => {
    const cancel = vi.fn()
    const body = new ReadableStream({ cancel })
    const response = new Response(body, { headers: { 'Content-Length': '999' } })
    const fetchMock = vi.fn<FetchLike>().mockResolvedValue(response)
    await expect(clientWith(fetchMock, { maxResponseBytes: 10 }).getVersion()).rejects.toThrow(
      'body exceeds 10 bytes',
    )
    expect(cancel).toHaveBeenCalledOnce()
  })

  it('bounds streamed response bodies without content-length', async () => {
    const fetchMock = vi.fn<FetchLike>().mockResolvedValue(new Response('01234567890'))
    await expect(clientWith(fetchMock, { maxResponseBytes: 10 }).getVersion()).rejects.toThrow(
      'body exceeds 10 bytes',
    )
  })

  it('handles empty and non-JSON error responses', async () => {
    const emptyFetch = vi.fn<FetchLike>().mockResolvedValue(new Response('', { status: 500 }))
    await expect(clientWith(emptyFetch).getVersion()).rejects.toThrow('empty response')

    const textFetch = vi
      .fn<FetchLike>()
      .mockResolvedValue(new Response('service\n unavailable', { status: 503 }))
    await expect(clientWith(textFetch).getVersion()).rejects.toThrow('service unavailable')
  })

  it('rejects invalid JSON from a successful instance response', async () => {
    const fetchMock = vi.fn<FetchLike>().mockResolvedValue(new Response('<html>', { status: 200 }))
    await expect(clientWith(fetchMock).getVersion()).rejects.toBeInstanceOf(ForgeApiError)
  })

  it('returns null for a successful response without a body', async () => {
    const fetchMock = vi.fn<FetchLike>().mockResolvedValue(new Response(null, { status: 204 }))
    await expect(clientWith(fetchMock).getVersion()).resolves.toBeNull()
  })

  it('rejects unsupported protocols and empty repository segments', async () => {
    expect(
      () =>
        new ForgeClient({
          baseUrl: 'file:///tmp/forge',
          requestTimeoutMs: 1,
          maxResponseBytes: 1,
        }),
    ).toThrow(ForgeConfigError)
    expect(
      () =>
        new ForgeClient({
          baseUrl: 'https://user:password@forge.example.test',
          requestTimeoutMs: 1,
          maxResponseBytes: 1,
        }),
    ).toThrow('baseUrl must not contain credentials')
    const fetchMock = vi.fn<FetchLike>().mockResolvedValue(jsonResponse({}))
    expect(() => clientWith(fetchMock).getIssue(' ', 'repo', 1)).toThrow(ForgeConfigError)
  })

  it('rejects invalid runtime limits', () => {
    expect(() => clientWith(vi.fn<FetchLike>(), { requestTimeoutMs: 0 })).toThrow(
      'requestTimeoutMs must be a positive integer',
    )
    expect(() => clientWith(vi.fn<FetchLike>(), { maxResponseBytes: Number.NaN })).toThrow(
      'maxResponseBytes must be a positive integer',
    )
  })

  it.each([
    ['issue index', (client: ForgeClient) => client.getIssue('ankey', 'demo', 0)],
    ['pull request index', (client: ForgeClient) => client.getPullRequest('ankey', 'demo', -1)],
    [
      'pull request index',
      (client: ForgeClient) => client.getPullRequestDiff('ankey', 'demo', 1.5),
    ],
    [
      'pull request index',
      (client: ForgeClient) => client.listPullRequestFiles('ankey', 'demo', Number.NaN, 1, 20),
    ],
    ['Actions run ID', (client: ForgeClient) => client.listActionJobs('ankey', 'demo', 0)],
    [
      'Actions job ID',
      (client: ForgeClient) => client.getActionJobLogs('ankey', 'demo', Number.POSITIVE_INFINITY),
    ],
  ])('rejects an invalid %s', (name, invoke) => {
    const fetchMock = vi.fn<FetchLike>().mockResolvedValue(jsonResponse({}))
    expect(() => invoke(clientWith(fetchMock))).toThrow(`${name} must be a positive integer`)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('normalizePagination', () => {
  it('uses defaults and clamps unsafe values', () => {
    expect(normalizePagination()).toEqual({ page: 1, limit: 20 })
    expect(normalizePagination(-2, 1_000)).toEqual({ page: 1, limit: 50 })
    expect(normalizePagination(2.8, 4.9)).toEqual({ page: 2, limit: 4 })
    expect(normalizePagination(Number.NaN, Number.POSITIVE_INFINITY)).toEqual({ page: 1, limit: 1 })
  })
})
