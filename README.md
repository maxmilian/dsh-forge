# dsh-forge

English | [繁體中文](docs/README.zh-TW.md) | [简体中文](docs/README.zh-CN.md) | [日本語](docs/README.ja.md)

[![CI](https://github.com/maxmilian/dsh-forge/actions/workflows/ci.yml/badge.svg)](https://github.com/maxmilian/dsh-forge/actions/workflows/ci.yml)
[![Integration](https://github.com/maxmilian/dsh-forge/actions/workflows/integration.yml/badge.svg)](https://github.com/maxmilian/dsh-forge/actions/workflows/integration.yml)
[![Release](https://img.shields.io/github/v/release/maxmilian/dsh-forge)](https://github.com/maxmilian/dsh-forge/releases/latest)
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
- Read pull request diffs and changed-file metadata.
- List repository Actions runs and jobs, then read plaintext job logs.
- Localize runtime tool metadata in English, Traditional Chinese, Simplified Chinese, or Japanese.
- Forward cancellation and enforce request time and response-size limits.
- Keep every v0.3 tool read-only and safe for parallel execution.

## Install

From a local checkout:

```bash
dsh plugin --profile web add .
dsh --profile web --dump-config
dsh --profile web
```

From the prebuilt release tarball (recommended):

```bash
dsh plugin --profile web add https://github.com/maxmilian/dsh-forge/releases/download/v0.3.0/dsh-forge-0.3.0.tgz
```

The tarball includes compiled JavaScript and declarations, so installation does not run a local
TypeScript build. To track the repository instead:

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
    locale: en # en, zh-TW, zh-CN, or ja
    requestTimeoutMs: 30000
    maxResponseBytes: 1000000
```

Use the narrowest token scopes your instance supports. Version 0.3 never creates, updates, merges,
reruns, or deletes remote resources.

`locale` controls model-facing tool descriptions, parameter help, and pending-call titles. English
is the default; Traditional Chinese, Simplified Chinese, and Japanese are included without external
translation services.

## Tools

| Tool | Purpose |
| --- | --- |
| `forge_instance_info` | Read instance version information |
| `forge_list_repositories` | List repositories owned by the authenticated user |
| `forge_search_issues` | Search issues or pull requests across repositories |
| `forge_get_issue` | Read one issue |
| `forge_list_pull_requests` | List repository pull requests |
| `forge_get_pull_request` | Read one pull request |
| `forge_get_pull_request_diff` | Read one pull request as a unified diff |
| `forge_list_pull_request_files` | List files changed by one pull request |
| `forge_list_action_runs` | List repository Actions runs |
| `forge_list_action_jobs` | List jobs belonging to one Actions run |
| `forge_get_action_job_logs` | Read the plaintext log for one Actions job |

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

Unit tests mock `fetch`. The `Integration` GitHub Actions workflow additionally starts disposable,
official Gitea and Forgejo containers and their Actions runners. It creates real repositories,
issues, branches, pull requests, workflow runs, and job logs before exercising the plugin client.

## Compatibility verification

| Target | Verification |
| --- | --- |
| DeepSeek Harness | Local bundle install, composed-config dump, and boot smoke test |
| Gitea | Live CI against the official Gitea 1.27 container and Gitea Runner 3.1.0 |
| Forgejo | Live CI against the official Forgejo 16 container and Forgejo Runner 13.0.0 |

API payloads are returned as canonical JSON so fields added by either project remain available
without requiring a plugin release. Diff and log responses remain plaintext to avoid JSON escaping.

## Current scope

The plugin deliberately uses the common REST endpoints instead of instance-specific extensions.
Actions availability depends on the server version and whether Actions is enabled. A future release
can add approval-gated writes, pull-request reviews, artifacts, and webhook-driven workflows.

## License

[MIT](LICENSE)
