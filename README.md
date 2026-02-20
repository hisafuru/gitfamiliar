<p align="center">
  <h1 align="center">GitFamiliar</h1>
  <p align="center">
    <strong>Visualize your code familiarity from Git history.</strong>
  </p>
  <p align="center">
    <a href="https://www.npmjs.com/package/gitfamiliar"><img src="https://img.shields.io/npm/v/gitfamiliar.svg" alt="npm version"></a>
    <a href="https://www.npmjs.com/package/gitfamiliar"><img src="https://img.shields.io/npm/dm/gitfamiliar.svg" alt="npm downloads"></a>
    <a href="https://github.com/kuze/gitfamiliar/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/gitfamiliar.svg" alt="license"></a>
    <a href="https://github.com/kuze/gitfamiliar/actions"><img src="https://github.com/kuze/gitfamiliar/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  </p>
</p>

---

Existing tools like git-fame and GitHub Contributors measure _how much_ you've written.
GitFamiliar measures something different: **how well you understand the codebase.**

Built for engineers joining a new project, it gives you and your team an objective way to track onboarding progress.

## Demo

```
$ npx gitfamiliar

GitFamiliar — my-project (Binary mode)

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

Use `--html` to generate an interactive treemap in the browser:

```
$ npx gitfamiliar --html
```

> Area = lines of code, Color = familiarity (red -> green).
> Click folders to drill down. Toggle between All / Written / Reviewed views.

## Quick Start

No install needed. Run inside any Git repository:

```bash
npx gitfamiliar
```

Or install globally:

```bash
npm install -g gitfamiliar
```

## Why GitFamiliar?

|  | git-fame / GitHub | GitFamiliar |
|---|---|---|
| What it measures | How much you **wrote** | How well you **understand** |
| Metric | Lines / commits (cumulative) | Familiarity score (multi-signal) |
| Use case | Contribution stats | Onboarding progress |
| Review awareness | No | Yes (PR reviews count) |
| Time decay | No | Yes (knowledge fades) |

## Scoring Modes

GitFamiliar provides 4 modes so you can choose the right lens for your situation.

### Binary (default)

Files are "read" or "unread". A file counts as read if you committed to it or approved a PR containing it.

```
familiarity = read_files / total_files
```

| View | Shows |
|---|---|
| All (default) | Written + Reviewed files |
| Written only | Only files you committed to |
| Reviewed only | Only files you reviewed via PR |

```bash
gitfamiliar                    # All
gitfamiliar --filter written   # Written only
gitfamiliar --filter reviewed  # Reviewed only
```

> Best for: **New team members** tracking onboarding progress.
> Scores only go up (by default), giving a sense of achievement.

### Authorship

Your share of the current codebase, based on `git blame -w`.

```
score(file)    = your_blame_lines / total_lines
score(project) = sum(your_lines) / sum(all_lines)
```

```bash
gitfamiliar --mode authorship
```

> Best for: **Tech leads** assessing bus factor and code ownership.
> A file where one person owns 95% of the lines is a risk signal.

### Review Coverage

Files you reviewed through PR approvals or comments, excluding your own commits.

```
score = reviewed_files / total_files
```

```bash
gitfamiliar --mode review-coverage
```

> Best for: **Senior engineers** tracking how broadly they review.
> Requires a GitHub token (see [GitHub Integration](#github-integration)).

### Weighted

The most nuanced mode. Combines three signals with configurable weights and time decay:

```
familiarity = w1 x blame_score + w2 x commit_score + w3 x review_score
```

Default weights: `blame=0.5, commit=0.35, review=0.15`

Key features:
- **Sigmoid normalization** prevents a single large commit from dominating
- **Recency decay** (half-life: 180 days) models knowledge fading over time
- **Scope factor** discounts reviews on huge PRs (attention dilution)

```bash
gitfamiliar --mode weighted
gitfamiliar --mode weighted --weights "0.6,0.3,0.1"   # custom weights
```

<details>
<summary><b>Numerical example</b></summary>

File: `src/auth/login.ts` (200 lines)

```
blame_score  = 30 lines / 200 lines = 0.15

commit_score:
  commit 1 (10 days ago, +30/-0): sigmoid(30/200) x decay(10d) = 0.33 x 0.96
  commit 2 (45 days ago,  +5/-2): sigmoid(6/200)  x decay(45d) = 0.09 x 0.84
  total: min(1, 0.39) = 0.39

review_score:
  PR approved (20 days ago, 4 files): 0.30 x 1.0 x decay(20d) = 0.28

familiarity  = 0.5 x 0.15 + 0.35 x 0.39 + 0.15 x 0.28
             = 0.075 + 0.137 + 0.042
             = 0.254 -> 25%
```

</details>

> Best for: **Power users** who want the most accurate picture.
> Score breakdowns are always visible so it never feels like a black box.

## Expiration Policies

By default, "read" status never expires. But real knowledge fades. Configure expiration to keep scores honest:

| Policy | Flag | What happens |
|---|---|---|
| Never | `--expiration never` | Once read, always read (default) |
| Time-based | `--expiration time:180d` | Expires 180 days after your last touch |
| Change-based | `--expiration change:50%` | Expires if 50%+ of the file changed since you last touched it |
| Combined | `--expiration combined:365d:50%` | Expires if **either** condition is met |

The change-based policy is the smartest: it detects when the code you read has been substantially rewritten, meaning your understanding is likely outdated.

## File Filtering

GitFamiliar automatically ignores noise. It only considers git-tracked files, minus:

- Lock files (`package-lock.json`, `yarn.lock`, etc.)
- Generated/minified files (`*.min.js`, `*.map`, `*.generated.*`)
- Build outputs (`dist/`, `build/`, `.next/`)
- Config files that rarely need understanding (`tsconfig.json`, `.eslintrc*`)

### Custom filtering

Create a `.gitfamiliarignore` in your repo root (same syntax as `.gitignore`):

```gitignore
# Also ignore vendor code
vendor/
third_party/

# Ignore migration files
**/migrations/
```

## GitHub Integration

For review-related features (Review Coverage mode, reviewed files in Binary mode), GitFamiliar needs a GitHub token:

```bash
# Option 1: environment variable
export GITHUB_TOKEN=ghp_xxxxxxxxxxxxx

# Option 2: GitHub CLI (auto-detected if installed)
gh auth login
```

Without a token, GitFamiliar works perfectly for all non-review features. Review features degrade gracefully with a helpful message.

## CLI Reference

```
Usage: gitfamiliar [options]

Options:
  -m, --mode <mode>          Scoring mode (default: "binary")
                             Choices: binary, authorship, review-coverage, weighted
  -u, --user <user>          Git user name or email (default: git config)
  -f, --filter <filter>      Display filter (default: "all")
                             Choices: all, written, reviewed
  -e, --expiration <policy>  Expiration policy (default: "never")
                             Examples: time:180d, change:50%, combined:365d:50%
      --html                 Generate interactive HTML treemap report
  -w, --weights <weights>    Weights for weighted mode: blame,commit,review
                             Example: "0.5,0.35,0.15" (must sum to 1.0)
  -V, --version              Output version number
  -h, --help                 Display help
```

## Programmatic API

GitFamiliar can also be used as a library:

```typescript
import { computeFamiliarity } from 'gitfamiliar';

const result = await computeFamiliarity({
  mode: 'binary',
  filter: 'all',
  expiration: { policy: 'never' },
  weights: { blame: 0.5, commit: 0.35, review: 0.15 },
  html: false,
  repoPath: '/path/to/repo',
});

console.log(`Score: ${Math.round(result.tree.score * 100)}%`);
```

## Requirements

- **Node.js** >= 18
- **Git** (available in PATH)
- **GitHub token** (optional, for review features)

## Contributing

Contributions are welcome! Please open an issue first to discuss what you'd like to change.

```bash
git clone https://github.com/kuze/gitfamiliar.git
cd gitfamiliar
npm install
npm run build
npm test
```

## Roadmap

- [ ] **Dependency Awareness** - Factor in understanding of imported files
- [ ] **Churn Risk Alert** - Highlight files with high change frequency + low familiarity
- [ ] **GitHub Action** - Post familiarity reports as PR comments
- [ ] **VS Code Extension** - See familiarity scores inline in the editor
- [ ] **README Badge** - Codecov-style badge for your project README

## License

[MIT](LICENSE)
