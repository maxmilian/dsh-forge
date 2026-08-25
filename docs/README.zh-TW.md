# dsh-forge

[English](../README.md) | 繁體中文 | [简体中文](README.zh-CN.md) | [日本語](README.ja.md)

一個唯讀的 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 插件，讓 DSH
可以直接查詢自行託管的 [Gitea](https://about.gitea.com/) 與
[Forgejo](https://forgejo.org/) 站台。插件使用兩個平台共同支援的 REST API，提供儲存庫、
議題、合併請求與 Actions 資訊。

> DeepSeek Harness 目前仍是 developer preview。本插件已使用
> `@deepseek-ai/dsh-tools 0.1.1-rc.2` 測試，並保留自 `rc.6` 起的 `0.1.0` 預發布版本相容性；
> Harness API 變更時可能需要同步更新。

## 功能

- 查看站台版本與登入使用者擁有的儲存庫。
- 跨可見儲存庫搜尋議題與合併請求。
- 讀取單一議題、合併請求、unified diff 與變更檔案。
- 列出 Actions workflow 執行記錄、工作與純文字日誌。
- 支援取消請求、逾時與回應大小上限。
- 所有 tools 均為唯讀，可安全平行執行。
- Runtime tool metadata 支援英文、繁體中文、簡體中文與日文。

## 安裝

建議從 npm 安裝：

```bash
dsh plugin --profile web add @maxhsu/dsh-forge
```

或使用含編譯結果的 release tarball：

```bash
dsh plugin --profile web add https://github.com/maxmilian/dsh-forge/releases/latest/download/dsh-forge.tgz
```

或直接追蹤 GitHub repository：

```bash
dsh plugin --profile web add github:maxmilian/dsh-forge
```

從本機 checkout 安裝：

```bash
dsh plugin --profile web add .
dsh --profile web --dump-config
dsh --profile web
```

Git 安裝會執行套件的 `prepare` script。請先檢查並固定來源 commit，再允許 pnpm 10
執行安裝期 build。預建 tarball 不需要安裝期 build 權限。

## 設定

建議用環境變數提供 URL 與 token，避免把憑證寫入 `cordis.patch.yml`：

```bash
export DSH_FORGE_URL='https://code.example.com'
export DSH_FORGE_TOKEN='replace-with-a-read-only-token'
dsh --profile web
```

也可以在 profile patch 中設定：

```yaml
- id: forge-tools
  name: dsh-forge
  config:
    baseUrl: 'https://code.example.com'
    token: ''
    locale: zh-TW
    requestTimeoutMs: 30000
    maxResponseBytes: 1000000
```

`locale` 可使用 `en`、`zh-TW`、`zh-CN` 或 `ja`，控制 tool 說明、參數說明與執行中的
標題；預設為英文。翻譯隨插件提供，不會呼叫外部翻譯服務。

請使用站台可提供的最小 token 權限。本插件不會建立、修改、合併、重新執行或刪除遠端資源。

## Tools

| Tool | 用途 |
| --- | --- |
| `forge_instance_info` | 讀取站台版本資訊 |
| `forge_list_repositories` | 列出登入使用者擁有的儲存庫 |
| `forge_search_issues` | 搜尋議題或合併請求 |
| `forge_get_issue` | 讀取單一議題 |
| `forge_list_pull_requests` | 列出合併請求 |
| `forge_get_pull_request` | 讀取單一合併請求 |
| `forge_get_pull_request_diff` | 讀取合併請求的 unified diff |
| `forge_list_pull_request_files` | 列出合併請求變更檔案 |
| `forge_list_action_runs` | 列出 Actions 執行記錄 |
| `forge_list_action_jobs` | 列出 workflow 執行中的工作 |
| `forge_get_action_job_logs` | 讀取 Actions 工作日誌 |

## 開發與相容性

開發需要 Node.js 22 以上版本與 [Bun](https://bun.sh/)：

```bash
bun install
bun run lint
bun run typecheck
bun run test:coverage
bun run build
bun pm pack --dry-run
```

CI 使用官方 Gitea 1.27、Forgejo 16 與各自的 Actions runner 執行真實整合測試，建立真正的
儲存庫、議題、分支、合併請求、workflow 與 job log。API JSON 會以平台原始格式回傳；diff
與 log 維持純文字。

## 授權

[MIT](../LICENSE)
