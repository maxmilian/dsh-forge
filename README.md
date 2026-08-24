# dsh-forge

[![CI](https://github.com/maxmilian/dsh-forge/actions/workflows/ci.yml/badge.svg)](https://github.com/maxmilian/dsh-forge/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Read-only [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) tools for
self-hosted [Gitea](https://about.gitea.com/) and [Forgejo](https://forgejo.org/) instances.
The plugin uses the REST API shared by both projects and adds repository, issue, pull request,
and Actions context directly to DSH.

> DeepSeek Harness is in developer preview. This plugin currently targets
> `@deepseek-ai/dsh-tools ^0.1.0-rc.6` and may need updates when Harness APIs change.

## Features

- Inspect the configured instance version.
- List repositories owned by the authenticated user.
- Search issues and pull requests across visible repositories.
- Read an issue or pull request by repository and index.
- List repository pull requests and Actions runs.
- Forward cancellation and enforce request time and response-size limits.
- Keep every v0.1 tool read-only and safe for parallel execution.

## Install

From a local checkout:

```bash
dsh plugin --profile web add .
dsh --profile web --dump-config
dsh --profile web
```

From GitHub after the repository is published:

```bash
dsh plugin --profile web add github:maxmilian/dsh-forge
```

Git installations run the package `prepare` script. pnpm 10 may ask you to allow that build in the
profile's `pnpm-workspace.yaml`; review and pin the source commit before allowing install-time code.
A published npm package or prebuilt tarball does not need that build permission.

## Configure

Environment variables are preferred so the access token does not live in `cordis.patch.yml`:

```bash
export DSH_FORGE_URL='https://code.example.com'
export DSH_FORGE_TOKEN='replace-with-a-read-only-token'
dsh --profile web
```

`DSH_FORGE_URL` may include a subpath, such as `https://example.com/git`. The client preserves that
path when appending `/api/v1`. Public endpoints work without a token, but repository tools normally
need one.

The plugin can load before these variables are set. If a Forge tool is called without a configured
URL, it returns an actionable configuration error instead of preventing the DSH profile from booting.

The profile patch can override runtime limits or provide credentials directly:

```yaml
- id: forge-tools
  name: dsh-forge
  config:
    baseUrl: 'https://code.example.com'
    token: '' # Prefer DSH_FORGE_TOKEN. This field is marked secret in the config schema.
    requestTimeoutMs: 30000
    maxResponseBytes: 1000000
```

Use the narrowest token scopes your instance supports. Version 0.1 never creates, updates, merges,
reruns, or deletes remote resources.

## Tools

| Tool | Purpose |
| --- | --- |
| `forge_instance_info` | Read instance version information |
| `forge_list_repositories` | List repositories owned by the authenticated user |
| `forge_search_issues` | Search issues or pull requests across repositories |
| `forge_get_issue` | Read one issue |
| `forge_list_pull_requests` | List repository pull requests |
| `forge_get_pull_request` | Read one pull request |
| `forge_list_action_runs` | List repository Actions runs |

List endpoints clamp `limit` to 50 to keep model context bounded. API errors include the operation
and HTTP status but never retain request headers or credentials.

## Development

Node.js 22 or newer and [Bun](https://bun.sh/) are required for development:

```bash
bun install
bun run lint
bun run typecheck
bun run test:coverage
bun run build
bun pm pack --dry-run
```

Tests mock `fetch`; they do not require a live Gitea or Forgejo instance.

## Compatibility verification

| Target | Verification |
| --- | --- |
| DeepSeek Harness | Local bundle install, composed-config dump, and boot smoke test |
| Gitea | Shared endpoints checked against the current official OpenAPI schema |
| Forgejo | Shared endpoints checked against the Forgejo 16 OpenAPI schema served by Codeberg |

Authenticated live-instance tests are not automated yet. API payloads are returned as canonical JSON
so fields added by either project remain available without requiring a plugin release.

## Current scope

The plugin deliberately uses the common REST endpoints instead of instance-specific extensions.
Actions availability depends on the server version and whether Actions is enabled. A future release
can add approval-gated writes, pull-request diffs, reviews, job logs, and webhook-driven workflows.

## License

[MIT](LICENSE)
