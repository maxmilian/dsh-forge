import { defineTool } from '@deepseek-ai/dsh-tools'

import { type ForgeClient, normalizePagination } from './client.js'
import type { JsonValue } from './types.js'

type ForgeClientProvider = () => ForgeClient

const JSON_OUTPUT = {
  schema: { type: 'json' as const },
  render: (_args: unknown, value: JsonValue) => [
    { type: 'text' as const, text: JSON.stringify(value, null, 2) },
  ],
} as const

/** Build every read-only tool exposed by dsh-forge. */
export function createForgeTools(client: ForgeClientProvider) {
  return [
    instanceInfoTool(client),
    listRepositoriesTool(client),
    searchIssuesTool(client),
    getIssueTool(client),
    listPullRequestsTool(client),
    getPullRequestTool(client),
    listActionRunsTool(client),
  ]
}

function instanceInfoTool(client: ForgeClientProvider) {
  return defineTool({
    name: 'forge_instance_info',
    description: 'Get version information from the configured Gitea or Forgejo instance.',
    parameters: {},
    output: JSON_OUTPUT,
    execute: (_args, exec) => client().getVersion(exec.signal),
    isConcurrencySafe: () => true,
    presentCall: () => ({ card: 'generic', title: 'Inspect Forge instance', kind: 'read' }),
  })
}

function listRepositoriesTool(client: ForgeClientProvider) {
  return defineTool({
    name: 'forge_list_repositories',
    description: 'List repositories owned by the authenticated Gitea or Forgejo user.',
    parameters: paginationParameters(),
    output: JSON_OUTPUT,
    execute(args, exec) {
      const { page, limit } = normalizePagination(args.page, args.limit)
      return client().listRepositories(page, limit, exec.signal)
    },
    isConcurrencySafe: () => true,
    presentCall: () => ({ card: 'generic', title: 'List Forge repositories', kind: 'search' }),
  })
}

function searchIssuesTool(client: ForgeClientProvider) {
  return defineTool({
    name: 'forge_search_issues',
    description: 'Search issues or pull requests across visible Gitea or Forgejo repositories.',
    parameters: {
      query: { type: 'string', description: 'Free-text search query' },
      owner: { type: 'string', description: 'Optional repository owner filter' },
      state: {
        type: 'string',
        enum: ['open', 'closed', 'all'],
        description: 'Issue state; defaults to open',
      },
      type: {
        type: 'string',
        enum: ['issues', 'pulls'],
        description: 'Result kind; defaults to issues',
      },
      ...paginationParameters(),
    },
    output: JSON_OUTPUT,
    execute(args, exec) {
      const pagination = normalizePagination(args.page, args.limit)
      return client().searchIssues(
        {
          ...(args.query === undefined ? {} : { q: args.query }),
          ...(args.owner === undefined ? {} : { owner: args.owner }),
          state: args.state ?? 'open',
          type: args.type ?? 'issues',
          ...pagination,
        },
        exec.signal,
      )
    },
    isConcurrencySafe: () => true,
    presentCall: () => ({ card: 'generic', title: 'Search Forge issues', kind: 'search' }),
  })
}

function getIssueTool(client: ForgeClientProvider) {
  return defineTool({
    name: 'forge_get_issue',
    description: 'Get one Gitea or Forgejo issue by repository and issue index.',
    parameters: repositoryItemParameters('Issue index'),
    output: JSON_OUTPUT,
    execute: (args, exec) => client().getIssue(args.owner, args.repo, args.index, exec.signal),
    isConcurrencySafe: () => true,
    presentCall: (args) => ({
      card: 'generic',
      title: `Read ${args.owner}/${args.repo}#${args.index}`,
      kind: 'read',
      rawInput: args,
    }),
  })
}

function listPullRequestsTool(client: ForgeClientProvider) {
  return defineTool({
    name: 'forge_list_pull_requests',
    description: 'List pull requests for a Gitea or Forgejo repository.',
    parameters: {
      ...repositoryParameters(),
      state: {
        type: 'string',
        enum: ['open', 'closed', 'all'],
        description: 'Pull request state; defaults to open',
      },
      ...paginationParameters(),
    },
    output: JSON_OUTPUT,
    execute(args, exec) {
      const pagination = normalizePagination(args.page, args.limit)
      return client().listPullRequests(
        { owner: args.owner, repo: args.repo, state: args.state ?? 'open', ...pagination },
        exec.signal,
      )
    },
    isConcurrencySafe: () => true,
    presentCall: () => ({ card: 'generic', title: 'List Forge pull requests', kind: 'search' }),
  })
}

function getPullRequestTool(client: ForgeClientProvider) {
  return defineTool({
    name: 'forge_get_pull_request',
    description: 'Get one Gitea or Forgejo pull request by repository and index.',
    parameters: repositoryItemParameters('Pull request index'),
    output: JSON_OUTPUT,
    execute: (args, exec) =>
      client().getPullRequest(args.owner, args.repo, args.index, exec.signal),
    isConcurrencySafe: () => true,
    presentCall: (args) => ({
      card: 'generic',
      title: `Read ${args.owner}/${args.repo}!${args.index}`,
      kind: 'read',
      rawInput: args,
    }),
  })
}

function listActionRunsTool(client: ForgeClientProvider) {
  return defineTool({
    name: 'forge_list_action_runs',
    description: 'List recent Actions workflow runs for a Gitea or Forgejo repository.',
    parameters: {
      ...repositoryParameters(),
      status: { type: 'string', description: 'Optional run status filter' },
      ...paginationParameters(),
    },
    output: JSON_OUTPUT,
    execute(args, exec) {
      const pagination = normalizePagination(args.page, args.limit)
      return client().listActionRuns(
        {
          owner: args.owner,
          repo: args.repo,
          ...(args.status === undefined ? {} : { status: args.status }),
          ...pagination,
        },
        exec.signal,
      )
    },
    isConcurrencySafe: () => true,
    presentCall: () => ({ card: 'generic', title: 'List Forge Actions runs', kind: 'search' }),
  })
}

function paginationParameters() {
  return {
    page: { type: 'integer' as const, description: 'Page number; defaults to 1' },
    limit: { type: 'integer' as const, description: 'Results per page; clamped to 1-50' },
  } as const
}

function repositoryParameters() {
  return {
    owner: { type: 'string' as const, required: true, description: 'Repository owner' },
    repo: { type: 'string' as const, required: true, description: 'Repository name' },
  } as const
}

function repositoryItemParameters(description: string) {
  return {
    ...repositoryParameters(),
    index: { type: 'integer' as const, required: true as const, description },
  } as const
}
