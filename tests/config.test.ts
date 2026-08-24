import type { Context } from '@deepseek-ai/cordis'
import { describe, expect, it, vi } from 'vitest'

import { ForgeConfigError } from '../src/errors.js'
import { apply, type Config, createClient } from '../src/index.js'

const BASE_CONFIG: Config = {
  baseUrl: '',
  token: '',
  locale: 'en',
  requestTimeoutMs: 1_000,
  maxResponseBytes: 10_000,
}

describe('createClient', () => {
  it('falls back to environment variables', () => {
    const client = createClient(BASE_CONFIG, {
      DSH_FORGE_URL: 'https://forge.example.test',
      DSH_FORGE_TOKEN: 'secret',
    })
    expect(client).toBeDefined()
  })

  it('prefers explicit configuration', () => {
    const client = createClient(
      { ...BASE_CONFIG, baseUrl: 'https://configured.example.test', token: 'configured' },
      { DSH_FORGE_URL: 'not a URL', DSH_FORGE_TOKEN: 'environment' },
    )
    expect(client).toBeDefined()
  })

  it('reports missing connection configuration', () => {
    expect(() => createClient(BASE_CONFIG, {})).toThrow(ForgeConfigError)
  })

  it('registers every tool on apply', () => {
    const register = vi.fn()
    const context = { tools: { register } } as unknown as Context
    apply(context, BASE_CONFIG)
    expect(register).toHaveBeenCalledTimes(11)
  })

  it('registers tools in the configured locale', () => {
    const register = vi.fn()
    const context = { tools: { register } } as unknown as Context
    apply(context, { ...BASE_CONFIG, locale: 'ja' })
    expect(register.mock.calls[0]?.[0].description).toContain('設定済み')
  })
})
