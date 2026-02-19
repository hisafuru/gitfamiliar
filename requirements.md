# GitFamiliar — プロダクトアイデアまとめ

## コンセプト

**Git の履歴からコードベースへの「理解度（Familiarity）」を可視化するツール。**

既存のツール（git-fame, GitHub Contributors等）が「どれだけ書いたか」を測るのに対し、GitFamiliar は「どれだけそのコードを理解しているか」を推定する。主なターゲットは**プロジェクトに新しく参画したエンジニア**で、オンボーディングの進捗を自分自身やチームが客観的に把握できるようにする。

---

## スコアリング設計

### 算出モード

4つのモードを提供し、ユーザーが目的に応じて切り替えられる。

---

#### Mode 1: Binary（デフォルト）— 「カバレッジ」

ファイルを「読んだ / 読んでない」のバイナリで判定し、読んだファイルの割合をスコアとする。

```
familiarity(user, project) = |read_files(user)| / |all_files|

is_read(user, file) =
    has_committed(user, file)      // 1行でも変更した
  OR has_approved_pr(user, file)   // そのファイルを含むPRをApproveした
```

**内部的に保持するデータ:**

read_files は以下の2つのサブセットに分解して個別に保持する。

- **written_files**: 自分が1行でもcommitしたファイルの集合
- **reviewed_files**: 自分がPR Approveで触れたファイルの集合（自分のcommitは含まない）

```
read_files = written_files ∪ reviewed_files
```

これにより、ユーザーはUIで3つの表示を切り替えられる。

| 表示モード | 対象 | ユースケース |
|---|---|---|
| All（デフォルト） | written ∪ reviewed | 全体のカバレッジを把握 |
| Written only | written_files のみ | 自分が実際にコードを書いた範囲 |
| Reviewed only | reviewed_files のみ | レビューで読んだだけの範囲 |

**主な利用者:** 新規参画メンバー
**良い点:** 直感的、スコアが下がらない（デフォルト設定時）、達成感がある
**限界:** 1行のtypo修正と大規模リファクタが同じ扱い

**UIの見せ方:**

ツリーマップ（面積=コード量、色=理解度）で表示する。

- **面積** = ファイル/フォルダの行数（プロジェクト内のボリューム）
- **色** = 理解度のグラデーション（赤: 未読 → 緑: 読んだ）
- Binary モードの場合、色は実質2色（未読/読了）だが、フォルダレベルでは配下ファイルの読了率に応じたグラデーションになる
- フォルダをクリックするとドリルダウン
- 表示モード（All / Written only / Reviewed only）を切り替えると、色がリアルタイムに変わる

**フォルダ単位のスコア:**

```
familiarity(user, folder) = |read_files(user) ∩ files_in(folder)| / |files_in(folder)|
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

**UIの見せ方:** 個人スコアとしてよりも、ファイルごとの「Author分布」を円グラフで見せる方が適切。特定の個人が突出しているファイルに⚠️マーク（Bus Factor警告）。

---

#### Mode 3: Review Coverage — 「レビュー網羅率」

PRレビュー（Approve/コメント）で触れたファイルの割合。自分のcommitは含まない。

```
score = |reviewed_files| / |all_files|
```

**主な利用者:** シニアエンジニア、レビュアー
**何がわかるか:** 自分では書いていないが、レビューを通じて目を通した範囲。
**良い点:** 「書く」と「読む」を分離できる。シニアメンバーがレビューで広範囲をカバーしているケースを可視化。
**限界:** GitHub API への依存。PRなしで直接mainにpushするワークフローでは機能しない。

---

#### Mode 4: Weighted（上級者向け）— 「総合スコア」

複数のシグナルを重み付きで合算した総合スコア。

```
familiarity(user, file) =
    w1 × blame_score(user, file)
  + w2 × commit_score(user, file)
  + w3 × review_score(user, file)
```

各項は0〜1に正規化し、w1 + w2 + w3 = 1 とする。デフォルト: w1=0.5, w2=0.35, w3=0.15（設定で変更可能）。

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

##### review_score

```
review_score(user, file) = min(1, Σ review_weight(r) × recency(r))
                           for each PR review r by user touching file

review_weight(r) = base_weight × scope_factor(r)

base_weight:
  Approved:           0.30
  Commented:          0.15
  Requested changes:  0.35

scope_factor(r) = min(1, attention_threshold / files_in_pr)
                  // attention_threshold=20 推奨
                  // PRが大きいほど1ファイルあたりの注意が薄まる
```

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
  commit 1 (10日前, +30行/-0行): sigmoid(30/200) × e^(-0.00385×10)  = 0.43 × 0.96 = 0.41
  commit 2 (45日前, +5行/-2行):  sigmoid(6/200)  × e^(-0.00385×45) = 0.09 × 0.84 = 0.08
  合計: min(1, 0.49) = 0.49

review_score:
  PR review (20日前, approved, 4ファイルのPR): 0.3 × 1.0 × 0.93 = 0.28
  合計: min(1, 0.28) = 0.28

familiarity = 0.5 × 0.15 + 0.35 × 0.49 + 0.15 × 0.28
            = 0.075 + 0.172 + 0.042
            = 0.289 → 29%
```

---

### モード一覧

| モード | デフォルト | 主な利用者 | 計算コスト | GitHub API必要 |
|---|---|---|---|---|
| Binary | ✅ | 新規メンバー | 低 | オプション |
| Authorship | | テックリード | 中（blame計算） | 不要 |
| Review Coverage | | シニアエンジニア | 低 | 必須 |
| Weighted | | パワーユーザー | 中 | オプション |

---

### 賞味期限ポリシー

「読んだ」判定の有効期限を設定ファイルで切り替え可能にする。

#### Policy A: Never Expire（デフォルト）

一度「読んだ」ファイルは永久に読んだ扱い。スコアは単調増加。

```yaml
expiration:
  policy: never
```

#### Policy B: Time-based Expiry

自分がそのファイルに最後に触れてから一定期間経過で失効。

```yaml
expiration:
  policy: time
  duration: 180d  # 180日で失効
```

注: 「180日前のcommitを無視する」ではなく、「最後にそのファイルに触れてから180日経ったら失効」。1年前に触ったファイルでも、3ヶ月前に再度レビューしていればそこから180日間有効。

#### Policy C: Change-based Expiry

自分が最後に触れた以降にファイルが大幅に変更された場合、失効。

```yaml
expiration:
  policy: change
  threshold: 50%  # ファイルの50%以上が書き換わったら失効
```

```
last_touch = 自分がそのファイルに最後にcommit/reviewした時点
changed_since = (last_touch以降に変更された行数) / (現在のファイル総行数)
is_expired = changed_since > threshold
```

3つの中で最も意味的に正確（「自分が読んだ時点のコードと今のコードがほぼ別物」を検出）。ただし計算コストはやや高い。

#### ポリシーの組み合わせ

B と C は併用可能。どちらかの条件を満たしたら失効。

```yaml
expiration:
  policy: combined
  time: 365d
  change: 50%
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

### 発展的な指標（v2以降）

- **Dependency Awareness**: そのファイルが import している他ファイルの理解度も加味する。`auth.ts` を理解していても、依存先の `session.ts` を知らないなら本当の理解とは言えない。
- **Churn Risk Alert**: 変更頻度が高い × 理解度が低いファイルを「要注意」として強調表示する。

---

## プロダクト形態

### npm CLI ツール（ホスティング不要）

npm に公開するだけで配布完了。サーバー不要、インフラコストゼロ。ユーザーはローカルの git リポジトリ上で見たいときに実行する。

```bash
npx gitfamiliar              # ターミナルにサマリー表示
npx gitfamiliar --html       # ツリーマップ付きHTMLを生成してブラウザで開く
npx gitfamiliar --user kota  # 特定ユーザーのスコア
npx gitfamiliar --mode weighted          # モード切り替え
npx gitfamiliar --filter written         # Written only 表示
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

Written: 42 files | Reviewed: 23 files | Both: 7 files
```

#### HTML 出力（--html）

ローカルに HTML ファイルを生成してブラウザで自動オープン。React/d3.js でツリーマップを描画。ホスティング不要（ローカルファイルをブラウザで開くだけ）。

- ツリーマップ（面積=コード量、色=理解度）
- All / Written only / Reviewed only の表示切り替え
- フォルダのドリルダウン
- ファイルをクリックすると詳細（最終タッチ日、commit回数等）

### ライセンス・公開方針

MIT License の OSS として公開する。DevTools の世界ではコードが読める安心感がユーザー獲得の武器になる。

Dependabot の事例が示す通り、OSS であっても買収の妨げにはならない。買い手が欲しいのはコードの独占権ではなく、ユーザーベース・ブランド認知・チーム（ドメイン知識）である。

---

## 成長戦略

### Phase 1: CLI ツールの公開と口コミでの普及

DevTools の CLI は広告なしで口コミで広まる実績がある（jq, fzf, tldr, gh 等）。GitFamiliar も「自分の理解度34%だった」のようなスクリーンショットが SNS で自然にシェアされるポテンシャルがある。

初期の施策:
- npm に公開
- GitHub リポジトリの README を丁寧に作る（GIF デモ必須）
- Hacker News / Reddit / X で初回ポスト
- 日本語圏: Zenn / はてブ で紹介記事

### Phase 2: GitHub Action / PRコメント対応

ユーザーが増えた段階で、CI 統合を追加。PR へのコメント投稿でバイラル性を確保する。

```yaml
- uses: your-username/gitfamiliar-action@v1
```

### Phase 3: エコシステム拡大

- README バッジ（Codecov スタイル）
- プロフィールカード（github-readme-stats スタイル）
- VS Code 拡張

### 買収戦略（Dependabot モデル）

Dependabot は個人開発から $14k MRR まで成長し、2019年に GitHub に買収された。コアロジックは OSS だったが、買収の決め手はコードの独占性ではなく「ユーザーベース」「チーム」「戦略的フィット」だった。創業者は「GitHub の kill zone にいることを自覚し、2年間かけて関係構築に努めた」と語っている。

GitFamiliar が同じ道を目指す場合の条件:
- npm ダウンロード数 / GitHub Stars で十分な認知を獲得していること
- 「Developer Experience」「Engineering Intelligence」領域のホットさを活かせること
- エンタープライズ（新規エンジニアの立ち上がり 3〜6ヶ月の短縮）に刺さる実績があること

---

## 競合・類似ツール

| ツール | 何を測るか | GitFamiliar との違い |
|---|---|---|
| git-fame | author 別の lines / commits / files 統計 | 累積貢献量であり「理解度」ではない |
| git-of-theseus | コードの時系列生存率 | 誰のコードが残っているか。個人の理解度は測らない |
| GitHub CODEOWNERS | ファイルのオーナー定義 | 手動定義。自動計算ではない |
| Pluralsight Flow / LinearB | エンジニアリングメトリクス SaaS | 生産性指標寄り。「理解度」の概念がない |
| Jellyfish / Swarmia | 同上 | 同上 |

**GitFamiliar の差別化ポイント**: 「書いた量」ではなく「理解している度合い」を推定する唯一のツール。オンボーディング進捗の可視化という明確なユースケースを持つ。

---

## 命名

**GitFamiliar**

- `git` コマンドの命名慣習に沿っている
- 「familiar = よく知っている」がコンセプトをそのまま表現
- 覚えやすく、検索しやすい
