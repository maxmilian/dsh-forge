# dsh-forge

[English](../README.md) | [繁體中文](README.zh-TW.md) | [简体中文](README.zh-CN.md) | 日本語

セルフホストした [Gitea](https://about.gitea.com/) と [Forgejo](https://forgejo.org/) を
DSH から直接参照できる、読み取り専用の
[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) プラグインです。両方の
プラットフォームが共通で提供する REST API を使用し、リポジトリ、Issue、Pull Request、
Actions の情報を提供します。

> DeepSeek Harness は developer preview です。このプラグインは
> `@deepseek-ai/dsh-tools ^0.1.0-rc.6` を対象としているため、Harness API の変更に合わせて
> 更新が必要になる場合があります。

## 機能

- インスタンスのバージョンと認証ユーザーが所有するリポジトリを確認。
- 表示可能なリポジトリから Issue と Pull Request を検索。
- Issue、Pull Request、unified diff、変更ファイルを取得。
- Actions workflow の実行、ジョブ、プレーンテキストログを一覧・取得。
- リクエストのキャンセル、タイムアウト、レスポンスサイズ上限に対応。
- すべての tools は読み取り専用で、安全に並列実行可能。
- Runtime tool metadata は英語、繁体字中国語、簡体字中国語、日本語に対応。

## インストール

コンパイル済みの release tarball を推奨します。

```bash
dsh plugin --profile web add https://github.com/maxmilian/dsh-forge/releases/download/v0.3.0/dsh-forge-0.3.0.tgz
```

GitHub repository を直接追跡する場合：

```bash
dsh plugin --profile web add github:maxmilian/dsh-forge
```

ローカル checkout からインストールする場合：

```bash
dsh plugin --profile web add .
dsh --profile web --dump-config
dsh --profile web
```

Git からのインストールでは `prepare` script が実行されます。pnpm 10 にインストール時の
build を許可する前に、ソースを確認して commit を固定してください。ビルド済み tarball
ではインストール時の build 権限は不要です。

## 設定

認証情報を `cordis.patch.yml` に保存しないよう、URL と token には環境変数を推奨します。

```bash
export DSH_FORGE_URL='https://code.example.com'
export DSH_FORGE_TOKEN='replace-with-a-read-only-token'
dsh --profile web
```

profile patch でも設定できます。

```yaml
- id: forge-tools
  name: dsh-forge
  config:
    baseUrl: 'https://code.example.com'
    token: ''
    locale: ja
    requestTimeoutMs: 30000
    maxResponseBytes: 1000000
```

`locale` には `en`、`zh-TW`、`zh-CN`、`ja` を指定でき、tool の説明、パラメーターの
ヘルプ、実行中のタイトルを切り替えます。既定値は英語です。翻訳はプラグインに同梱され、
外部翻訳サービスには接続しません。

インスタンスで利用できる最小権限の token を使用してください。このプラグインはリモート
リソースの作成、更新、マージ、再実行、削除を行いません。

## Tools

| Tool | 用途 |
| --- | --- |
| `forge_instance_info` | インスタンスのバージョン情報を取得 |
| `forge_list_repositories` | 認証ユーザーが所有するリポジトリを一覧表示 |
| `forge_search_issues` | Issue または Pull Request を検索 |
| `forge_get_issue` | 1 件の Issue を取得 |
| `forge_list_pull_requests` | Pull Request を一覧表示 |
| `forge_get_pull_request` | 1 件の Pull Request を取得 |
| `forge_get_pull_request_diff` | Pull Request の unified diff を取得 |
| `forge_list_pull_request_files` | Pull Request の変更ファイルを一覧表示 |
| `forge_list_action_runs` | Actions の実行を一覧表示 |
| `forge_list_action_jobs` | workflow 実行内のジョブを一覧表示 |
| `forge_get_action_job_logs` | Actions ジョブログを取得 |

## 開発と互換性

開発には Node.js 22 以降と [Bun](https://bun.sh/) が必要です。

```bash
bun install
bun run lint
bun run typecheck
bun run test:coverage
bun run build
bun pm pack --dry-run
```

CI は公式 Gitea 1.27、Forgejo 16 とそれぞれの Actions runner を起動し、実際の
リポジトリ、Issue、ブランチ、Pull Request、workflow、job log を作成して統合テストを
行います。API の JSON は各プラットフォームの形式を維持し、diff と log はプレーンテキストで
返します。

## ライセンス

[MIT](../LICENSE)
