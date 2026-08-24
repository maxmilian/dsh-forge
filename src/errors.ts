/** Safe HTTP error returned by a Gitea or Forgejo API request. */
export class ForgeApiError extends Error {
  readonly status: number

  /**
   * Create an API error without retaining request headers or credentials.
   *
   * @param operation - Human-readable API operation.
   * @param status - HTTP response status.
   * @param detail - Sanitized response detail.
   */
  constructor(operation: string, status: number, detail: string) {
    super(`Forge API ${operation} failed with HTTP ${status}: ${detail}`)
    this.name = 'ForgeApiError'
    this.status = status
  }
}

/** Error raised when plugin connection settings are incomplete or invalid. */
export class ForgeConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ForgeConfigError'
  }
}
