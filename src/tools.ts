import { defineTool } from '@deepseek-ai/dsh-tools'

import { type ForgeClient, normalizePagination } from './client.js'
import { type ForgeMessages, forgeMessages, type Locale } from './i18n.js'
import type { JsonValue } from './types.js'

type ForgeClientProvider = () => ForgeClient

const JSON_OUTPUT = {
  schema: { type: 'json' as const },
  render: (_args: unknown, value: JsonValue) => [
    { type: 'text' as const, text: JSON.stringify(value, null, 2) },
  ],
} as const

const TEXT_OUTPUT = {
  schema: { type: 'string' as const },
  render: (_args: unknown, value: string) => [{ type: 'text' as const, text: value }],
} as const

/** Build every read-only tool exposed by dsh-forge. */
export function createForgeTools(client: ForgeClientProvider, locale: Locale = 'en') {
  const messages = forgeMessages(locale)
  return [
    instanceInfoTool(client, messages),
    listRepositoriesTool(client, messages),
    searchIssuesTool(client, messages),
    getIssueTool(client, messages),
    listPullRequestsTool(client, messages),
    getPullRequestTool(client, messages),
    getPullRequestDiffTool(client, messages),
    listPullRequestFilesTool(client, messages),
    listActionRunsTool(client, messages),
    listActionJobsTool(client, messages),
    getActionJobLogsTool(client, messages),
  ]
}

function instanceInfoTool(client: ForgeClientProvider, messages: ForgeMessages) {
  return defineTool({
    name: 'forge_instance_info',
    description: messages.instanceDescription,
    parameters: {},
    output: JSON_OUTPUT,
    execute: (_args, exec) => client().getVersion(exec.signal),
    isConcurrencySafe: () => true,
    presentCall: () => ({ card: 'generic', title: messages.instanceTitle, kind: 'read' }),
  })
}

function listRepositoriesTool(client: ForgeClientProvider, messages: ForgeMessages) {
  return defineTool({
    name: 'forge_list_repositories',
    description: messages.repositoriesDescription,
    parameters: paginationParameters(messages),
    output: JSON_OUTPUT,
    execute(args, exec) {
      const { page, limit } = normalizePagination(args.page, args.limit)
      return client().listRepositories(page, limit, exec.signal)
    },
    isConcurrencySafe: () => true,
    presentCall: () => ({ card: 'generic', title: messages.repositoriesTitle, kind: 'search' }),
  })
}

function searchIssuesTool(client: ForgeClientProvider, messages: ForgeMessages) {
  return defineTool({
    name: 'forge_search_issues',
    description: messages.searchDescription,
    parameters: {
      query: { type: 'string', description: messages.query },
      owner: { type: 'string', description: messages.ownerFilter },
      state: {
        type: 'string',
        enum: ['open', 'closed', 'all'],
        description: messages.issueState,
      },
      type: {
        type: 'string',
        enum: ['issues', 'pulls'],
        description: messages.resultKind,
      },
      ...paginationParameters(messages),
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
    presentCall: () => ({ card: 'generic', title: messages.searchTitle, kind: 'search' }),
  })
}

function getIssueTool(client: ForgeClientProvider, messages: ForgeMessages) {
  return defineTool({
    name: 'forge_get_issue',
    description: messages.issueDescription,
    parameters: repositoryItemParameters(messages, messages.issueIndex),
    output: JSON_OUTPUT,
    execute: (args, exec) => client().getIssue(args.owner, args.repo, args.index, exec.signal),
    isConcurrencySafe: () => true,
    presentCall: (args) => ({
      card: 'generic',
      title: messages.readIssue(args.owner, args.repo, args.index),
      kind: 'read',
      rawInput: args,
    }),
  })
}

function listPullRequestsTool(client: ForgeClientProvider, messages: ForgeMessages) {
  return defineTool({
    name: 'forge_list_pull_requests',
    description: messages.pullRequestsDescription,
    parameters: {
      ...repositoryParameters(messages),
      state: {
        type: 'string',
        enum: ['open', 'closed', 'all'],
        description: messages.pullRequestState,
      },
      ...paginationParameters(messages),
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
    presentCall: () => ({ card: 'generic', title: messages.pullRequestsTitle, kind: 'search' }),
  })
}

function getPullRequestTool(client: ForgeClientProvider, messages: ForgeMessages) {
  return defineTool({
    name: 'forge_get_pull_request',
    description: messages.pullRequestDescription,
    parameters: repositoryItemParameters(messages, messages.pullRequestIndex),
    output: JSON_OUTPUT,
    execute: (args, exec) =>
      client().getPullRequest(args.owner, args.repo, args.index, exec.signal),
    isConcurrencySafe: () => true,
    presentCall: (args) => ({
      card: 'generic',
      title: messages.readPullRequest(args.owner, args.repo, args.index),
      kind: 'read',
      rawInput: args,
    }),
  })
}

function getPullRequestDiffTool(client: ForgeClientProvider, messages: ForgeMessages) {
  return defineTool({
    name: 'forge_get_pull_request_diff',
    description: messages.diffDescription,
    parameters: repositoryItemParameters(messages, messages.pullRequestIndex),
    output: TEXT_OUTPUT,
    execute: (args, exec) =>
      client().getPullRequestDiff(args.owner, args.repo, args.index, exec.signal),
    isConcurrencySafe: () => true,
    presentCall: (args) => ({
      card: 'generic',
      title: messages.readDiff(args.owner, args.repo, args.index),
      kind: 'read',
      rawInput: args,
    }),
  })
}

function listPullRequestFilesTool(client: ForgeClientProvider, messages: ForgeMessages) {
  return defineTool({
    name: 'forge_list_pull_request_files',
    description: messages.filesDescription,
    parameters: {
      ...repositoryItemParameters(messages, messages.pullRequestIndex),
      ...paginationParameters(messages),
    },
    output: JSON_OUTPUT,
    execute(args, exec) {
      const { page, limit } = normalizePagination(args.page, args.limit)
      return client().listPullRequestFiles(
        args.owner,
        args.repo,
        args.index,
        page,
        limit,
        exec.signal,
      )
    },
    isConcurrencySafe: () => true,
    presentCall: () => ({
      card: 'generic',
      title: messages.filesTitle,
      kind: 'read',
    }),
  })
}

function listActionRunsTool(client: ForgeClientProvider, messages: ForgeMessages) {
  return defineTool({
    name: 'forge_list_action_runs',
    description: messages.runsDescription,
    parameters: {
      ...repositoryParameters(messages),
      status: { type: 'string', description: messages.runStatus },
      ...paginationParameters(messages),
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
    presentCall: () => ({ card: 'generic', title: messages.runsTitle, kind: 'search' }),
  })
}

function listActionJobsTool(client: ForgeClientProvider, messages: ForgeMessages) {
  return defineTool({
    name: 'forge_list_action_jobs',
    description: messages.jobsDescription,
    parameters: {
      ...repositoryParameters(messages),
      run_id: { type: 'integer', required: true, description: messages.runId },
    },
    output: JSON_OUTPUT,
    execute: (args, exec) =>
      client().listActionJobs(args.owner, args.repo, args.run_id, exec.signal),
    isConcurrencySafe: () => true,
    presentCall: () => ({ card: 'generic', title: messages.jobsTitle, kind: 'read' }),
  })
}

function getActionJobLogsTool(client: ForgeClientProvider, messages: ForgeMessages) {
  return defineTool({
    name: 'forge_get_action_job_logs',
    description: messages.logsDescription,
    parameters: {
      ...repositoryParameters(messages),
      job_id: { type: 'integer', required: true, description: messages.jobId },
    },
    output: TEXT_OUTPUT,
    execute: (args, exec) =>
      client().getActionJobLogs(args.owner, args.repo, args.job_id, exec.signal),
    isConcurrencySafe: () => true,
    presentCall: () => ({ card: 'generic', title: messages.logsTitle, kind: 'read' }),
  })
}

function paginationParameters(messages: ForgeMessages) {
  return {
    page: { type: 'integer' as const, description: messages.page },
    limit: { type: 'integer' as const, description: messages.limit },
  } as const
}

function repositoryParameters(messages: ForgeMessages) {
  return {
    owner: { type: 'string' as const, required: true, description: messages.owner },
    repo: { type: 'string' as const, required: true, description: messages.repo },
  } as const
}

function repositoryItemParameters(messages: ForgeMessages, description: string) {
  return {
    ...repositoryParameters(messages),
    index: { type: 'integer' as const, required: true as const, description },
  } as const
}
