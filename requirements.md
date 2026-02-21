# GitFamiliar — プロダクトアイデアまとめ

## コンセプト

**Git の履歴からコードベースへの「理解度（Familiarity）」を可視化するツール。**

既存のツール（git-fame, GitHub Contributors等）が「どれだけ書いたか」を測るのに対し、GitFamiliar は「どれだけそのコードを理解しているか」を推定する。主なターゲットは**プロジェクトに新しく参画したエンジニア**で、オンボーディングの進捗を自分自身やチームが客観的に把握できるようにする。

---

## スコアリング設計

### 算出モード

3つのモードを提供し、ユーザーが目的に応じて切り替えられる。

---

#### Mode 1: Binary（デフォルト）— 「カバレッジ」

ファイルを「書いた / 書いてない」のバイナリで判定し、書いたファイルの割合をスコアとする。

```
familiarity(user, project) = |written_files(user)| / |all_files|

is_written(user, file) = has_committed(user, file)  // 1行でも変更した
```

**主な利用者:** 新規参画メンバー
**良い点:** 直感的、スコアが下がらない（デフォルト設定時）、達成感がある
**限界:** 1行のtypo修正と大規模リファクタが同じ扱い

**UIの見せ方:**

ツリーマップ（面積=コード量、色=理解度）で表示する。

- **面積** = ファイル/フォルダの行数（プロジェクト内のボリューム）
- **色** = 理解度のグラデーション（赤: 未読 → 緑: 読んだ）
- Binary モードの場合、色は実質2色（未読/読了）だが、フォルダレベルでは配下ファイルの読了率に応じたグラデーションになる
- フォルダをクリックするとドリルダウン

**フォルダ単位のスコア:**

```
familiarity(user, folder) = |written_files(user) ∩ files_in(folder)| / |files_in(folder)|
```

---

#### Mode 2: Authorship — 「所有率」

現存コードのうち、自分が書いた行の割合。git blame ベース。

```
score(file) = blame_lines(user, file) / total_lines(file)
score(project) = Σ blame_lines(user, f) / Σ total_lines(f)  for all files f
```

**主な利用者:** テックリード、マネージャー
**何がわかるか:** 現存コードの著者分布。Bus Factor の把握（「このファイルを書いた人が退職したらどうなるか」）。
**良い点:** git blame だけで算出でき、客観的
**限界:** チーム開発では100%にならないし、なるべきでもない。行数が多い＝優秀でもない。フォーマッタ適用で数値が歪む（`git blame -w` で緩和可能）。個人の能力評価には不適切で、あくまでチームのリスク管理指標。

---

#### Mode 3: Weighted（上級者向け）— 「総合スコア」

2つのシグナルを重み付きで合算した総合スコア。

```
familiarity(user, file) =
    w1 × blame_score(user, file)
  + w2 × commit_score(user, file)
```

各項は0〜1に正規化し、w1 + w2 = 1 とする。デフォルト: w1=0.5, w2=0.5（設定で変更可能）。

##### blame_score

```
blame_score(user, file) = blame_lines(user, file) / total_lines(file)
```

`git blame -w`（空白変更を無視）で算出。

##### commit_score

```
commit_score(user, file) = min(1, Σ contribution(c) × recency(c))
                           for each commit c by user touching file

contribution(c) = sigmoid(normalized_diff(c))
normalized_diff(c) = (added + 0.5 × deleted) / file_size_at_commit
sigmoid(x) = x / (x + k)    // k=0.3 推奨

recency(c) = e^(-λ × t)
λ = ln(2) / half_life        // half_life=180日 推奨
t = 現在日時 - commit日時（日数）
```

- added/deleted をファイルサイズで正規化することで、大きなファイルへの小さな変更と小さなファイルへの大きな変更を適切に区別
- deleted は added の0.5倍の重み（削除だけでは理解の証拠として弱い）
- sigmoid で1回のcommitの寄与を0〜1に収める
- recency decay で時間経過による記憶の減衰を表現

| 経過日数 | recency (half_life=180) |
|---|---|
| 0日（今日） | 1.00 |
| 30日（1ヶ月前） | 0.89 |
| 90日（3ヶ月前） | 0.71 |
| 180日（半年前） | 0.50 |
| 365日（1年前） | 0.25 |

##### フォルダレベルの集約

```
familiarity(user, folder) = Σ familiarity(user, f) × lines(f) / Σ lines(f)
                            for each file f in folder (recursive)
```

**主な利用者:** パワーユーザー、メトリクスにこだわるチーム
**良い点:** 最も精度が高い
**限界:** ブラックボックス感がある → 対策としてスコアの内訳を常に表示する

##### 数値例

ファイル `src/auth/login.ts`（200行）に対する新メンバーAさんのスコア:

```
blame_score = 30行 / 200行 = 0.15

commit_score:
  commit 1 (10日前, +30行/-0行): sigmoid(30/200) × e^(-0.00385×10)  = 0.33 × 0.96 = 0.32
  commit 2 (45日前, +5行/-2行):  sigmoid(6/200)  × e^(-0.00385×45) = 0.09 × 0.84 = 0.08
  合計: min(1, 0.40) = 0.40

familiarity = 0.5 × 0.15 + 0.5 × 0.40
            = 0.075 + 0.200
            = 0.275 → 28%
```

---

### モード一覧

| モード | デフォルト | 主な利用者 | 計算コスト |
|---|---|---|---|
| Binary | ✅ | 新規メンバー | 低 |
| Authorship | | テックリード | 中（blame計算） |
| Weighted | | パワーユーザー | 中 |

---

### チーム機能

#### マルチユーザー比較

```bash
gitfamiliar --user "Alice" --user "Bob"   # 指定ユーザー比較
gitfamiliar --team                         # 全コントリビューター比較
```

#### チームカバレッジマップ（バス係数分析）

```bash
gitfamiliar --team-coverage
gitfamiliar --team-coverage --html
```

ファイルごとの「詳しい人の数」を可視化。リスクレベル:
- **RISK** (0-1人) — 単一障害点
- **MODERATE** (2-3人) — ある程度カバー
- **SAFE** (4人以上) — 知識が分散

#### ホットスポット分析

```bash
gitfamiliar --hotspot                      # 個人のホットスポット
gitfamiliar --hotspot team                 # チームのホットスポット
gitfamiliar --hotspot --window 30          # 直近30日
gitfamiliar --hotspot --html               # 散布図で可視化
```

リスク = 変更頻度の高さ × 理解度の低さ

---

### 賞味期限ポリシー

「書いた」判定の有効期限を設定で切り替え可能。

#### Policy A: Never Expire（デフォルト）

一度「書いた」ファイルは永久に書いた扱い。スコアは単調増加。

```
--expiration never
```

#### Policy B: Time-based Expiry

自分がそのファイルに最後に触れてから一定期間経過で失効。

```
--expiration time:180d
```

#### Policy C: Change-based Expiry

自分が最後に触れた以降にファイルが大幅に変更された場合、失効。

```
--expiration change:50%
```

```
last_touch = 自分がそのファイルに最後にcommitした時点
changed_since = (last_touch以降に変更された行数) / (現在のファイル総行数)
is_expired = changed_since > threshold
```

3つの中で最も意味的に正確（「自分が書いた時点のコードと今のコードがほぼ別物」を検出）。

#### ポリシーの組み合わせ

B と C は併用可能。どちらかの条件を満たしたら失効。

```
--expiration combined:365d:50%
```

---

### 対象ファイルの定義

```
対象ファイル = git 管理下のファイル
             - .gitignore で除外されたファイル（自動適用）
             - .gitfamiliarignore で除外されたファイル（ユーザー定義）
```

`.gitfamiliarignore` のデフォルトテンプレート:

```gitignore
# Lock files
package-lock.json
yarn.lock
pnpm-lock.yaml
Gemfile.lock
poetry.lock
Cargo.lock
composer.lock

# Auto-generated
*.generated.*
*.min.js
*.min.css
*.map

# Build outputs (git管理されている場合)
dist/
build/
.next/

# Config that rarely needs understanding
.eslintrc*
.prettierrc*
tsconfig.json
```

初回インストール時に自動生成。ゼロコンフィグでも動くが、カスタマイズ可能。

---

## プロダクト形態

### npm CLI ツール（ホスティング不要）

npm に公開するだけで配布完了。サーバー不要、インフラコストゼロ。ユーザーはローカルの git リポジトリ上で見たいときに実行する。

```bash
npx gitfamiliar              # ターミナルにサマリー表示
npx gitfamiliar --html       # ツリーマップ付きHTMLを生成してブラウザで開く
npx gitfamiliar --user kota  # 特定ユーザーのスコア
npx gitfamiliar --mode weighted          # モード切り替え
npx gitfamiliar --expiration time:180d   # 賞味期限ポリシー指定
```

#### ターミナル出力（デフォルト）

```
GitFamiliar — your-project (Binary mode)

Overall: 58/172 files (34%)

  src/
    auth/       ████████░░  80% (4/5 files)
    api/        ███░░░░░░░  30% (6/20 files)
    components/ █░░░░░░░░░  12% (3/25 files)
    utils/      ██████████ 100% (8/8 files)
  tests/        ░░░░░░░░░░   0% (0/14 files)
  config/       ██████░░░░  60% (3/5 files)

Written: 42 files
```

#### HTML 出力（--html）

ローカルに HTML ファイルを生成してブラウザで自動オープン。d3.js でツリーマップを描画。ホスティング不要（ローカルファイルをブラウザで開くだけ）。

- ツリーマップ（面積=コード量、色=理解度）
- フォルダのドリルダウン
- ファイルをクリックすると詳細（最終タッチ日、commit回数等）

### ライセンス・公開方針

MIT License の OSS として公開する。

---

## 成長戦略

### Phase 1: CLI ツールの公開と口コミでの普及

DevTools の CLI は広告なしで口コミで広まる実績がある（jq, fzf, tldr, gh 等）。GitFamiliar も「自分の理解度34%だった」のようなスクリーンショットが SNS で自然にシェアされるポテンシャルがある。

初期の施策:
- npm に公開
- GitHub リポジトリの README を丁寧に作る（GIF デモ必須）
- Hacker News / Reddit / X で初回ポスト
- 日本語圏: Zenn / はてブ で紹介記事

### Phase 2: エコシステム拡大

- README バッジ（Codecov スタイル）
- プロフィールカード（github-readme-stats スタイル）
- VS Code 拡張

---

## 競合・類似ツール

| ツール | 何を測るか | GitFamiliar との違い |
|---|---|---|
| git-fame | author 別の lines / commits / files 統計 | 累積貢献量であり「理解度」ではない |
| git-of-theseus | コードの時系列生存率 | 誰のコードが残っているか。個人の理解度は測らない |
| GitHub CODEOWNERS | ファイルのオーナー定義 | 手動定義。自動計算ではない |
| Pluralsight Flow / LinearB | エンジニアリングメトリクス SaaS | 生産性指標寄り。「理解度」の概念がない |

**GitFamiliar の差別化ポイント**: 「書いた量」ではなく「理解している度合い」を推定する唯一のツール。オンボーディング進捗の可視化という明確なユースケースを持つ。

---

## 命名

**GitFamiliar**

- `git` コマンドの命名慣習に沿っている
- 「familiar = よく知っている」がコンセプトをそのまま表現
- 覚えやすく、検索しやすい
