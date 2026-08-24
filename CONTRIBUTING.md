# Contributing to dsh-forge

Thanks for helping improve dsh-forge. Bug reports, compatibility findings, documentation fixes, and focused pull requests are welcome.

## Before you start

- Search existing issues before opening a new one.
- For a behavior change or a large feature, open an issue first so the scope and Gitea/Forgejo compatibility can be agreed on.
- Report security vulnerabilities privately as described in [SECURITY.md](SECURITY.md).

## Development setup

Install Node.js 22 or newer and [Bun](https://bun.sh/), then run:

```bash
bun install --frozen-lockfile
bun run lint
bun run typecheck
bun run test:coverage
bun run build
bun pm pack --dry-run
```

Run `bun run smoke:dsh` when DSH CLI and pnpm are installed. It packages the plugin, installs it into an isolated temporary DSH profile, and verifies the composed configuration.

## Making changes

- Keep tools read-only unless an issue explicitly defines an approval model for writes.
- Prefer REST endpoints shared by Gitea and Forgejo.
- Add or update tests for behavior changes and bug fixes.
- Keep tool names, descriptions, and schemas aligned across the four locales in `src/locales.ts`.
- Use Conventional Commits, for example `fix(client): preserve instance path prefixes`.

The live `Integration` workflow runs against official Gitea and Forgejo containers and Actions runners. Pull requests must pass both matrix jobs in addition to the unit-test workflow.

## Pull requests

Keep each pull request focused. Explain the user-visible change, list how it was verified, and call out any behavior that differs between Gitea and Forgejo. Do not include access tokens, private instance URLs, or generated profile data.
