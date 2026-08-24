# dsh-forge

[English](../README.md) | [繁體中文](README.zh-TW.md) | 简体中文 | [日本語](README.ja.md)

一个只读的 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 插件，让 DSH
可以直接查询自托管的 [Gitea](https://about.gitea.com/) 与
[Forgejo](https://forgejo.org/) 站点。插件使用两个平台共同支持的 REST API，提供仓库、
议题、拉取请求与 Actions 信息。

> DeepSeek Harness 目前仍是 developer preview。本插件面向
> `@deepseek-ai/dsh-tools ^0.1.0-rc.6`；Harness API 变更时可能需要同步更新。

## 功能

- 查看站点版本与认证用户拥有的仓库。
- 跨可见仓库搜索议题与拉取请求。
- 读取单条议题、拉取请求、unified diff 与变更文件。
- 列出 Actions workflow 运行记录、作业与纯文本日志。
- 支持取消请求、超时与响应大小限制。
- 所有 tools 均为只读，可安全并行执行。
- Runtime tool metadata 支持英文、繁体中文、简体中文与日文。

## 安装

推荐使用包含编译结果的 release tarball：

```bash
dsh plugin --profile web add https://github.com/maxmilian/dsh-forge/releases/download/v0.3.0/dsh-forge-0.3.0.tgz
```

或直接跟踪 GitHub repository：

```bash
dsh plugin --profile web add github:maxmilian/dsh-forge
```

从本地 checkout 安装：

```bash
dsh plugin --profile web add .
dsh --profile web --dump-config
dsh --profile web
```

Git 安装会执行软件包的 `prepare` script。请先检查并固定来源 commit，再允许 pnpm 10
执行安装期 build。预建 tarball 不需要安装期 build 权限。

## 配置

建议用环境变量提供 URL 与 token，避免将凭据写入 `cordis.patch.yml`：

```bash
export DSH_FORGE_URL='https://code.example.com'
export DSH_FORGE_TOKEN='replace-with-a-read-only-token'
dsh --profile web
```

也可以在 profile patch 中配置：

```yaml
- id: forge-tools
  name: dsh-forge
  config:
    baseUrl: 'https://code.example.com'
    token: ''
    locale: zh-CN
    requestTimeoutMs: 30000
    maxResponseBytes: 1000000
```

`locale` 可使用 `en`、`zh-TW`、`zh-CN` 或 `ja`，控制 tool 描述、参数说明与运行中的
标题；默认为英文。翻译随插件提供，不会调用外部翻译服务。

请使用站点可提供的最小 token 权限。本插件不会创建、修改、合并、重新运行或删除远程资源。

## Tools

| Tool | 用途 |
| --- | --- |
| `forge_instance_info` | 读取站点版本信息 |
| `forge_list_repositories` | 列出认证用户拥有的仓库 |
| `forge_search_issues` | 搜索议题或拉取请求 |
| `forge_get_issue` | 读取单条议题 |
| `forge_list_pull_requests` | 列出拉取请求 |
| `forge_get_pull_request` | 读取单条拉取请求 |
| `forge_get_pull_request_diff` | 读取拉取请求的 unified diff |
| `forge_list_pull_request_files` | 列出拉取请求变更文件 |
| `forge_list_action_runs` | 列出 Actions 运行记录 |
| `forge_list_action_jobs` | 列出 workflow 运行中的作业 |
| `forge_get_action_job_logs` | 读取 Actions 作业日志 |

## 开发与兼容性

开发需要 Node.js 22 或更高版本以及 [Bun](https://bun.sh/)：

```bash
bun install
bun run lint
bun run typecheck
bun run test:coverage
bun run build
bun pm pack --dry-run
```

CI 使用官方 Gitea 1.27、Forgejo 16 与各自的 Actions runner 执行真实集成测试，创建真正的
仓库、议题、分支、拉取请求、workflow 与 job log。API JSON 会以平台原始格式返回；diff
与 log 保持纯文本。

## 许可证

[MIT](../LICENSE)
