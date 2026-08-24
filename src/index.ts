import type { Context } from '@deepseek-ai/cordis'
import Schema from '@deepseek-ai/schemastery'

import { ForgeClient } from './client.js'
import { ForgeConfigError } from './errors.js'
import { createForgeTools } from './tools.js'

export const name = 'dsh-forge'
export const inject = ['tools']

/** Plugin configuration supplied by the DSH profile bundle. */
export interface Config {
  readonly baseUrl: string
  readonly token: string
  readonly requestTimeoutMs: number
  readonly maxResponseBytes: number
}

export const Config: Schema<Config> = Schema.object({
  baseUrl: Schema.string()
    .description('Gitea or Forgejo base URL; falls back to DSH_FORGE_URL')
    .default(''),
  token: Schema.string()
    .role('secret')
    .description('Access token; falls back to DSH_FORGE_TOKEN')
    .default(''),
  requestTimeoutMs: Schema.number().min(1).step(1).default(30_000),
  maxResponseBytes: Schema.number().min(1).step(1).default(1_000_000),
})

/** Register all read-only Forge tools in the Harness tool registry. */
export function apply(ctx: Context, config: Config): void {
  const client = () => createClient(config, process.env)
  for (const tool of createForgeTools(client)) ctx.tools.register(tool)
}

/** Resolve explicit plugin configuration before environment variables. */
export function createClient(
  config: Config,
  environment: Readonly<Record<string, string | undefined>>,
): ForgeClient {
  const baseUrl = config.baseUrl.trim() || environment.DSH_FORGE_URL?.trim() || ''
  const token = config.token.trim() || environment.DSH_FORGE_TOKEN?.trim()
  if (baseUrl === '') {
    throw new ForgeConfigError('Set dsh-forge baseUrl or the DSH_FORGE_URL environment variable')
  }
  return new ForgeClient({
    baseUrl,
    ...(token === undefined ? {} : { token }),
    requestTimeoutMs: config.requestTimeoutMs,
    maxResponseBytes: config.maxResponseBytes,
  })
}

export { ForgeClient } from './client.js'
export { ForgeApiError, ForgeConfigError } from './errors.js'
