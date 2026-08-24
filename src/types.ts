/** JSON value accepted by the DeepSeek Harness tool output contract. */
export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { readonly [key: string]: JsonValue }

/** Query scalar supported by the Forge REST client. */
export type QueryValue = boolean | number | string | undefined

/** Injectable fetch signature used by the HTTP client and unit tests. */
export type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>

/** Runtime connection settings for a Gitea or Forgejo instance. */
export interface ForgeClientOptions {
  readonly baseUrl: string
  readonly token?: string
  readonly requestTimeoutMs: number
  readonly maxResponseBytes: number
  readonly fetch?: FetchLike
}
