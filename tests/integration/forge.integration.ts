import { describe, expect, it } from 'vitest'

import { ForgeClient } from '../../src/client.js'

const baseUrl = requiredEnvironment('FORGE_INTEGRATION_URL').replace(/\/+$/, '')
const username = 'dsh-integration'
const password = 'Dsh-integration-2026!'
const repository = 'fixture'
const basicAuthorization = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`

describe('live Forge integration', () => {
  it('reads repositories, issues, pull request diffs/files, and Actions logs', async () => {
    const tokenResponse = await api('/api/v1/users/dsh-integration/tokens', {
      method: 'POST',
      headers: { Authorization: basicAuthorization },
      body: { name: `dsh-forge-${Date.now()}`, scopes: ['all'] },
    })
    const token = stringProperty(tokenResponse, 'sha1')
    const authorization = `token ${token}`

    await api('/api/v1/user/repos', {
      method: 'POST',
      headers: { Authorization: authorization },
      body: { name: repository, auto_init: true, readme: 'Default' },
    })
    const issue = await api(`/api/v1/repos/${username}/${repository}/issues`, {
      method: 'POST',
      headers: { Authorization: authorization },
      body: { title: 'Integration issue' },
    })
    const workflow = Buffer.from(
      `name: Integration\non: [push]\njobs:\n  logs:\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo dsh-forge-action-log-marker\n`,
    ).toString('base64')
    await api(`/api/v1/repos/${username}/${repository}/contents/.gitea/workflows/integration.yml`, {
      method: 'POST',
      headers: { Authorization: authorization },
      body: { message: 'Add integration workflow', content: workflow, branch: 'main' },
    })
    await api(`/api/v1/repos/${username}/${repository}/branches`, {
      method: 'POST',
      headers: { Authorization: authorization },
      body: { new_branch_name: 'feature', old_branch_name: 'main' },
    })
    await api(`/api/v1/repos/${username}/${repository}/contents/change.txt`, {
      method: 'POST',
      headers: { Authorization: authorization },
      body: {
        message: 'Add integration marker',
        content: Buffer.from('pull request marker\n').toString('base64'),
        branch: 'feature',
      },
    })
    const pull = await api(`/api/v1/repos/${username}/${repository}/pulls`, {
      method: 'POST',
      headers: { Authorization: authorization },
      body: { title: 'Integration pull request', head: 'feature', base: 'main' },
    })

    const client = new ForgeClient({
      baseUrl,
      token,
      requestTimeoutMs: 30_000,
      maxResponseBytes: 2_000_000,
    })
    await expect(client.getVersion()).resolves.toMatchObject({ version: expect.any(String) })
    await expect(client.listRepositories(1, 20)).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ name: repository })]),
    )
    await expect(
      client.getIssue(username, repository, numberProperty(issue, 'number')),
    ).resolves.toMatchObject({ title: 'Integration issue' })

    const pullIndex = numberProperty(pull, 'number')
    await expect(client.getPullRequestDiff(username, repository, pullIndex)).resolves.toContain(
      'pull request marker',
    )
    await expect(
      client.listPullRequestFiles(username, repository, pullIndex, 1, 20),
    ).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ filename: 'change.txt' })]),
    )

    const jobId = await waitForSuccessfulJob(client)
    await expect(client.getActionJobLogs(username, repository, jobId)).resolves.toContain(
      'dsh-forge-action-log-marker',
    )
  }, 120_000)
})

function usernameAndRepository() {
  return { owner: username, repo: repository, page: 1, limit: 20 }
}

async function waitForSuccessfulJob(client: ForgeClient): Promise<number> {
  let lastRuns: unknown
  let lastJobs: unknown
  for (let attempt = 0; attempt < 90; attempt += 1) {
    lastRuns = await client.listActionRuns(usernameAndRepository())
    const runs = collectionItems(lastRuns, 'workflow_runs')
    for (const run of runs.slice(0, 5)) {
      if (!isRecord(run) || typeof run.id !== 'number') continue
      lastJobs = await client.listActionJobs(username, repository, run.id)
      const job = collectionItems(lastJobs, 'jobs').find(
        (item): item is Record<string, unknown> => isRecord(item) && actionJobSucceeded(item),
      )
      if (job !== undefined) return numberProperty(job, 'id')
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000))
  }
  throw new Error(
    `Timed out waiting for a successful Actions job. Last runs: ${diagnostic(lastRuns)}; last jobs: ${diagnostic(lastJobs)}`,
  )
}

function actionJobSucceeded(job: Record<string, unknown>): boolean {
  return job.status === 'success' || job.conclusion === 'success'
}

async function api(
  path: string,
  options: { method: string; headers: Record<string, string>; body: unknown },
): Promise<unknown> {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method,
    headers: { 'Content-Type': 'application/json', ...options.headers },
    body: JSON.stringify(options.body),
  })
  const text = await response.text()
  if (!response.ok)
    throw new Error(`${options.method} ${path} returned ${response.status}: ${text}`)
  return text === '' ? null : (JSON.parse(text) as unknown)
}

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim()
  if (value === undefined || value === '') throw new Error(`Set ${name} to run integration tests`)
  return value
}

function stringProperty(value: unknown, key: string): string {
  if (!isRecord(value) || typeof value[key] !== 'string') throw new Error(`Missing string ${key}`)
  return value[key]
}

function numberProperty(value: unknown, key: string): number {
  if (!isRecord(value) || typeof value[key] !== 'number') throw new Error(`Missing number ${key}`)
  return value[key]
}

function arrayProperty(value: unknown, key: string): unknown[] {
  if (!isRecord(value) || !Array.isArray(value[key])) return []
  return value[key]
}

function collectionItems(value: unknown, key: string): unknown[] {
  return Array.isArray(value) ? value : arrayProperty(value, key)
}

function diagnostic(value: unknown): string {
  if (value === undefined) return 'not available'
  return JSON.stringify(value).slice(0, 2_000)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
