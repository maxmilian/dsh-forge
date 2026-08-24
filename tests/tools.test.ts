import { describe, expect, it, vi } from 'vitest'

import { ForgeClient } from '../src/client.js'
import { createForgeTools } from '../src/tools.js'
import type { FetchLike } from '../src/types.js'

const EXECUTION = {
  signal: new AbortController().signal,
  toolCallId: 'test-call',
} as const

function setup() {
  const fetchMock = vi.fn<FetchLike>().mockResolvedValue(
    new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    }),
  )
  const client = new ForgeClient({
    baseUrl: 'https://forge.example.test',
    requestTimeoutMs: 1_000,
    maxResponseBytes: 10_000,
    fetch: fetchMock,
  })
  return { tools: createForgeTools(() => client), fetchMock }
}

function toolNamed(tools: ReturnType<typeof createForgeTools>, name: string) {
  const tool = tools.find((candidate) => candidate.name === name)
  if (tool === undefined) throw new Error(`Missing test tool ${name}`)
  return tool
}

describe('createForgeTools', () => {
  it('registers the complete read-only tool set', () => {
    const names = setup().tools.map((tool) => tool.name)
    expect(names).toEqual([
      'forge_instance_info',
      'forge_list_repositories',
      'forge_search_issues',
      'forge_get_issue',
      'forge_list_pull_requests',
      'forge_get_pull_request',
      'forge_get_pull_request_diff',
      'forge_list_pull_request_files',
      'forge_list_action_runs',
      'forge_list_action_jobs',
      'forge_get_action_job_logs',
    ])
  })

  it('normalizes pagination before listing pull requests', async () => {
    const { tools, fetchMock } = setup()
    const tool = toolNamed(tools, 'forge_list_pull_requests')
    await tool.execute(
      { owner: 'ankey', repo: 'demo', state: 'all', page: -1, limit: 1000 },
      EXECUTION,
    )
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain(
      '/repos/ankey/demo/pulls?state=all&page=1&limit=50',
    )
  })

  it('renders canonical API output as readable JSON', async () => {
    const { tools } = setup()
    const tool = toolNamed(tools, 'forge_instance_info')
    const value = await tool.execute({}, EXECUTION)
    expect(tool.output.render({}, value)).toEqual([{ type: 'text', text: '{\n  "ok": true\n}' }])
  })

  it.each([
    {
      name: 'forge_list_repositories',
      args: { page: 2, limit: 10 },
      expected: '/user/repos?page=2&limit=10',
    },
    {
      name: 'forge_search_issues',
      args: { query: 'bug fix', owner: 'ankey', state: 'closed', type: 'issues' },
      expected:
        '/repos/issues/search?q=bug+fix&owner=ankey&state=closed&type=issues&page=1&limit=20',
    },
    {
      name: 'forge_get_issue',
      args: { owner: 'ankey', repo: 'demo', index: 42 },
      expected: '/repos/ankey/demo/issues/42',
    },
    {
      name: 'forge_get_pull_request',
      args: { owner: 'ankey', repo: 'demo', index: 9 },
      expected: '/repos/ankey/demo/pulls/9',
    },
    {
      name: 'forge_get_pull_request_diff',
      args: { owner: 'ankey', repo: 'demo', index: 9 },
      expected: '/repos/ankey/demo/pulls/9.diff',
    },
    {
      name: 'forge_list_pull_request_files',
      args: { owner: 'ankey', repo: 'demo', index: 9, page: 2, limit: 5 },
      expected: '/repos/ankey/demo/pulls/9/files?page=2&limit=5',
    },
    {
      name: 'forge_list_action_runs',
      args: { owner: 'ankey', repo: 'demo', status: 'failure', page: 3, limit: 5 },
      expected: '/repos/ankey/demo/actions/runs?status=failure&page=3&limit=5',
    },
    {
      name: 'forge_list_action_jobs',
      args: { owner: 'ankey', repo: 'demo', run_id: 41 },
      expected: '/repos/ankey/demo/actions/runs/41/jobs',
    },
    {
      name: 'forge_get_action_job_logs',
      args: { owner: 'ankey', repo: 'demo', job_id: 52 },
      expected: '/repos/ankey/demo/actions/jobs/52/logs',
    },
  ])('dispatches $name to the expected shared API endpoint', async ({ name, args, expected }) => {
    const { tools, fetchMock } = setup()
    await toolNamed(tools, name).execute(args, EXECUTION)
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain(expected)
  })

  it('uses issue search defaults and omits absent optional filters', async () => {
    const { tools, fetchMock } = setup()
    await toolNamed(tools, 'forge_search_issues').execute({}, EXECUTION)
    const url = String(fetchMock.mock.calls[0]?.[0])
    expect(url).toContain('state=open&type=issues&page=1&limit=20')
    expect(url).not.toContain('q=')
    expect(url).not.toContain('owner=')
  })

  it('omits an absent Actions status filter', async () => {
    const { tools, fetchMock } = setup()
    await toolNamed(tools, 'forge_list_action_runs').execute(
      { owner: 'ankey', repo: 'demo' },
      EXECUTION,
    )
    expect(String(fetchMock.mock.calls[0]?.[0])).not.toContain('status=')
  })

  it('renders plaintext tool output without JSON quoting', async () => {
    const fetchMock = vi.fn<FetchLike>().mockResolvedValue(new Response('line one\nline two'))
    const client = new ForgeClient({
      baseUrl: 'https://forge.example.test',
      requestTimeoutMs: 1_000,
      maxResponseBytes: 10_000,
      fetch: fetchMock,
    })
    const tool = toolNamed(
      createForgeTools(() => client),
      'forge_get_pull_request_diff',
    )
    const args = { owner: 'ankey', repo: 'demo', index: 1 }
    const value = await tool.execute(args, EXECUTION)
    expect(tool.output.render(args, value)).toEqual([{ type: 'text', text: 'line one\nline two' }])
  })

  it('provides concurrency and pending-call presentation metadata', () => {
    const { tools } = setup()
    const args = {
      owner: 'ankey',
      repo: 'demo',
      index: 1,
      page: 1,
      limit: 20,
      state: 'open',
      type: 'issues',
      query: 'bug',
      status: 'failure',
      run_id: 1,
      job_id: 1,
    }
    for (const tool of tools) {
      expect(tool.isConcurrencySafe?.(args)).toBe(true)
      expect(tool.presentCall?.(args)).toMatchObject({ card: 'generic' })
    }
  })
})
