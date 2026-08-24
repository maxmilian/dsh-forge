export const LOCALES = ['en', 'zh-TW', 'zh-CN', 'ja'] as const

/** Locale supported by dsh-forge tool metadata. */
export type Locale = (typeof LOCALES)[number]

/** Localized model-facing descriptions and pending-call titles. */
export interface ForgeMessages {
  readonly instanceDescription: string
  readonly instanceTitle: string
  readonly repositoriesDescription: string
  readonly repositoriesTitle: string
  readonly searchDescription: string
  readonly searchTitle: string
  readonly issueDescription: string
  readonly pullRequestsDescription: string
  readonly pullRequestsTitle: string
  readonly pullRequestDescription: string
  readonly diffDescription: string
  readonly filesDescription: string
  readonly filesTitle: string
  readonly runsDescription: string
  readonly runsTitle: string
  readonly jobsDescription: string
  readonly jobsTitle: string
  readonly logsDescription: string
  readonly logsTitle: string
  readonly query: string
  readonly ownerFilter: string
  readonly issueState: string
  readonly resultKind: string
  readonly pullRequestState: string
  readonly runStatus: string
  readonly runId: string
  readonly jobId: string
  readonly page: string
  readonly limit: string
  readonly owner: string
  readonly repo: string
  readonly issueIndex: string
  readonly pullRequestIndex: string
  readIssue(owner: string, repo: string, index: number): string
  readPullRequest(owner: string, repo: string, index: number): string
  readDiff(owner: string, repo: string, index: number): string
}

const ENGLISH: ForgeMessages = {
  instanceDescription: 'Get version information from the configured Gitea or Forgejo instance.',
  instanceTitle: 'Inspect Forge instance',
  repositoriesDescription: 'List repositories owned by the authenticated Gitea or Forgejo user.',
  repositoriesTitle: 'List Forge repositories',
  searchDescription: 'Search issues or pull requests across visible Gitea or Forgejo repositories.',
  searchTitle: 'Search Forge issues',
  issueDescription: 'Get one Gitea or Forgejo issue by repository and issue index.',
  pullRequestsDescription: 'List pull requests for a Gitea or Forgejo repository.',
  pullRequestsTitle: 'List Forge pull requests',
  pullRequestDescription: 'Get one Gitea or Forgejo pull request by repository and index.',
  diffDescription: 'Get the unified diff for one Gitea or Forgejo pull request.',
  filesDescription: 'List files changed by one Gitea or Forgejo pull request.',
  filesTitle: 'List changed pull request files',
  runsDescription: 'List recent Actions workflow runs for a Gitea or Forgejo repository.',
  runsTitle: 'List Forge Actions runs',
  jobsDescription: 'List jobs belonging to one Gitea or Forgejo Actions workflow run.',
  jobsTitle: 'List Forge Actions jobs',
  logsDescription: 'Get the plaintext log for one Gitea or Forgejo Actions job.',
  logsTitle: 'Read Forge Actions job logs',
  query: 'Free-text search query',
  ownerFilter: 'Optional repository owner filter',
  issueState: 'Issue state; defaults to open',
  resultKind: 'Result kind; defaults to issues',
  pullRequestState: 'Pull request state; defaults to open',
  runStatus: 'Optional run status filter',
  runId: 'Workflow run ID',
  jobId: 'Actions job ID',
  page: 'Page number; defaults to 1',
  limit: 'Results per page; clamped to 1-50',
  owner: 'Repository owner',
  repo: 'Repository name',
  issueIndex: 'Issue index',
  pullRequestIndex: 'Pull request index',
  readIssue: (owner, repo, index) => `Read ${owner}/${repo}#${index}`,
  readPullRequest: (owner, repo, index) => `Read ${owner}/${repo}!${index}`,
  readDiff: (owner, repo, index) => `Read diff for ${owner}/${repo}!${index}`,
}

const TRADITIONAL_CHINESE: ForgeMessages = {
  ...ENGLISH,
  instanceDescription: '取得已設定 Gitea 或 Forgejo 站台的版本資訊。',
  instanceTitle: '檢視 Forge 站台',
  repositoriesDescription: '列出已驗證 Gitea 或 Forgejo 使用者擁有的儲存庫。',
  repositoriesTitle: '列出 Forge 儲存庫',
  searchDescription: '搜尋可見 Gitea 或 Forgejo 儲存庫中的議題或合併請求。',
  searchTitle: '搜尋 Forge 議題',
  issueDescription: '依儲存庫與議題編號取得一筆 Gitea 或 Forgejo 議題。',
  pullRequestsDescription: '列出 Gitea 或 Forgejo 儲存庫的合併請求。',
  pullRequestsTitle: '列出 Forge 合併請求',
  pullRequestDescription: '依儲存庫與編號取得一筆 Gitea 或 Forgejo 合併請求。',
  diffDescription: '取得一筆 Gitea 或 Forgejo 合併請求的 unified diff。',
  filesDescription: '列出一筆 Gitea 或 Forgejo 合併請求變更的檔案。',
  filesTitle: '列出合併請求變更檔案',
  runsDescription: '列出 Gitea 或 Forgejo 儲存庫最近的 Actions workflow 執行記錄。',
  runsTitle: '列出 Forge Actions 執行記錄',
  jobsDescription: '列出一筆 Gitea 或 Forgejo Actions workflow 執行記錄中的工作。',
  jobsTitle: '列出 Forge Actions 工作',
  logsDescription: '取得一筆 Gitea 或 Forgejo Actions 工作的純文字日誌。',
  logsTitle: '讀取 Forge Actions 工作日誌',
  query: '全文搜尋關鍵字',
  ownerFilter: '選填的儲存庫擁有者篩選條件',
  issueState: '議題狀態，預設為 open',
  resultKind: '結果類型，預設為 issues',
  pullRequestState: '合併請求狀態，預設為 open',
  runStatus: '選填的執行狀態篩選條件',
  runId: 'Workflow 執行 ID',
  jobId: 'Actions 工作 ID',
  page: '頁碼，預設為 1',
  limit: '每頁筆數，限制於 1 至 50',
  owner: '儲存庫擁有者',
  repo: '儲存庫名稱',
  issueIndex: '議題編號',
  pullRequestIndex: '合併請求編號',
  readIssue: (owner, repo, index) => `讀取 ${owner}/${repo}#${index}`,
  readPullRequest: (owner, repo, index) => `讀取 ${owner}/${repo}!${index}`,
  readDiff: (owner, repo, index) => `讀取 ${owner}/${repo}!${index} 的 diff`,
}

const SIMPLIFIED_CHINESE: ForgeMessages = {
  ...TRADITIONAL_CHINESE,
  instanceDescription: '获取已配置 Gitea 或 Forgejo 站点的版本信息。',
  instanceTitle: '查看 Forge 站点',
  repositoriesDescription: '列出已认证 Gitea 或 Forgejo 用户拥有的仓库。',
  repositoriesTitle: '列出 Forge 仓库',
  searchDescription: '搜索可见 Gitea 或 Forgejo 仓库中的议题或拉取请求。',
  searchTitle: '搜索 Forge 议题',
  issueDescription: '按仓库与议题编号获取一条 Gitea 或 Forgejo 议题。',
  pullRequestsDescription: '列出 Gitea 或 Forgejo 仓库的拉取请求。',
  pullRequestsTitle: '列出 Forge 拉取请求',
  pullRequestDescription: '按仓库与编号获取一条 Gitea 或 Forgejo 拉取请求。',
  diffDescription: '获取一条 Gitea 或 Forgejo 拉取请求的 unified diff。',
  filesDescription: '列出一条 Gitea 或 Forgejo 拉取请求变更的文件。',
  filesTitle: '列出拉取请求变更文件',
  runsDescription: '列出 Gitea 或 Forgejo 仓库最近的 Actions workflow 运行记录。',
  runsTitle: '列出 Forge Actions 运行记录',
  jobsDescription: '列出一条 Gitea 或 Forgejo Actions workflow 运行记录中的作业。',
  jobsTitle: '列出 Forge Actions 作业',
  logsDescription: '获取一条 Gitea 或 Forgejo Actions 作业的纯文本日志。',
  logsTitle: '读取 Forge Actions 作业日志',
  query: '全文搜索关键词',
  ownerFilter: '可选的仓库所有者筛选条件',
  issueState: '议题状态，默认为 open',
  resultKind: '结果类型，默认为 issues',
  pullRequestState: '拉取请求状态，默认为 open',
  runStatus: '可选的运行状态筛选条件',
  runId: 'Workflow 运行 ID',
  jobId: 'Actions 作业 ID',
  page: '页码，默认为 1',
  limit: '每页数量，限制为 1 至 50',
  owner: '仓库所有者',
  repo: '仓库名称',
  issueIndex: '议题编号',
  pullRequestIndex: '拉取请求编号',
  readIssue: (owner, repo, index) => `读取 ${owner}/${repo}#${index}`,
  readPullRequest: (owner, repo, index) => `读取 ${owner}/${repo}!${index}`,
  readDiff: (owner, repo, index) => `读取 ${owner}/${repo}!${index} 的 diff`,
}

const JAPANESE: ForgeMessages = {
  ...ENGLISH,
  instanceDescription: '設定済みの Gitea または Forgejo インスタンスのバージョン情報を取得します。',
  instanceTitle: 'Forge インスタンスを確認',
  repositoriesDescription:
    '認証済み Gitea または Forgejo ユーザーが所有するリポジトリを一覧表示します。',
  repositoriesTitle: 'Forge リポジトリを一覧表示',
  searchDescription:
    '表示可能な Gitea または Forgejo リポジトリの Issue や Pull Request を検索します。',
  searchTitle: 'Forge Issue を検索',
  issueDescription:
    'リポジトリと Issue 番号を指定して Gitea または Forgejo の Issue を取得します。',
  pullRequestsDescription: 'Gitea または Forgejo リポジトリの Pull Request を一覧表示します。',
  pullRequestsTitle: 'Forge Pull Request を一覧表示',
  pullRequestDescription:
    'リポジトリと番号を指定して Gitea または Forgejo の Pull Request を取得します。',
  diffDescription: 'Gitea または Forgejo の Pull Request の unified diff を取得します。',
  filesDescription: 'Gitea または Forgejo の Pull Request で変更されたファイルを一覧表示します。',
  filesTitle: 'Pull Request の変更ファイルを一覧表示',
  runsDescription:
    'Gitea または Forgejo リポジトリの最近の Actions workflow 実行を一覧表示します。',
  runsTitle: 'Forge Actions の実行を一覧表示',
  jobsDescription: 'Gitea または Forgejo Actions workflow 実行に含まれるジョブを一覧表示します。',
  jobsTitle: 'Forge Actions ジョブを一覧表示',
  logsDescription: 'Gitea または Forgejo Actions ジョブのプレーンテキストログを取得します。',
  logsTitle: 'Forge Actions ジョブログを表示',
  query: '全文検索クエリ',
  ownerFilter: '任意のリポジトリ所有者フィルター',
  issueState: 'Issue の状態。既定値は open',
  resultKind: '結果の種類。既定値は issues',
  pullRequestState: 'Pull Request の状態。既定値は open',
  runStatus: '任意の実行状態フィルター',
  runId: 'Workflow 実行 ID',
  jobId: 'Actions ジョブ ID',
  page: 'ページ番号。既定値は 1',
  limit: '1 ページの件数。1〜50 に制限',
  owner: 'リポジトリ所有者',
  repo: 'リポジトリ名',
  issueIndex: 'Issue 番号',
  pullRequestIndex: 'Pull Request 番号',
  readIssue: (owner, repo, index) => `${owner}/${repo}#${index} を表示`,
  readPullRequest: (owner, repo, index) => `${owner}/${repo}!${index} を表示`,
  readDiff: (owner, repo, index) => `${owner}/${repo}!${index} の diff を表示`,
}

const MESSAGES: Readonly<Record<Locale, ForgeMessages>> = {
  en: ENGLISH,
  'zh-TW': TRADITIONAL_CHINESE,
  'zh-CN': SIMPLIFIED_CHINESE,
  ja: JAPANESE,
}

/** Return the immutable message catalog for a supported locale. */
export function forgeMessages(locale: Locale): ForgeMessages {
  return MESSAGES[locale]
}
