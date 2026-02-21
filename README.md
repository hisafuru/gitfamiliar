<p align="center">
  <h1 align="center">GitFamiliar</h1>
  <p align="center">
    <strong>Visualize your code familiarity from Git history.</strong>
  </p>
  <p align="center">
    <a href="https://www.npmjs.com/package/gitfamiliar"><img src="https://img.shields.io/npm/v/gitfamiliar.svg" alt="npm version"></a>
    <a href="https://www.npmjs.com/package/gitfamiliar"><img src="https://img.shields.io/npm/dm/gitfamiliar.svg" alt="npm downloads"></a>
    <a href="https://github.com/kuze/gitfamiliar/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/gitfamiliar.svg" alt="license"></a>
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

Written: 42 files
```

Use `--html` to generate an interactive treemap in the browser:

```
$ npx gitfamiliar --html
```

> Area = lines of code, Color = familiarity (red -> green).
> Click folders to drill down.

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
| Time decay | No | Yes (knowledge fades) |
| Team analysis | No | Yes (bus factor, multi-user comparison) |

## Scoring Modes

### Binary (default)

Files are "written" or "not written". A file counts as written if you have at least one commit touching it.

```
familiarity = written_files / total_files
```

```bash
gitfamiliar                    # default
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

### Weighted

Combines two signals with configurable weights and time decay:

```
familiarity = w1 x blame_score + w2 x commit_score
```

Default weights: `blame=0.5, commit=0.5`

Key features:
- **Sigmoid normalization** prevents a single large commit from dominating
- **Recency decay** (half-life: 180 days) models knowledge fading over time

```bash
gitfamiliar --mode weighted
gitfamiliar --mode weighted --weights "0.6,0.4"   # custom weights
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

familiarity  = 0.5 x 0.15 + 0.5 x 0.39
             = 0.075 + 0.195
             = 0.27 -> 27%
```

</details>

> Best for: **Power users** who want the most accurate picture.

## Team Features

### Multi-User Comparison

Compare familiarity across multiple team members:

```bash
gitfamiliar --user "Alice" --user "Bob"   # specific users
gitfamiliar --team                         # all contributors
```

### Team Coverage Map

Visualize bus factor — how many people know each part of the codebase:

```bash
gitfamiliar --team-coverage
gitfamiliar --team-coverage --html
```

Shows risk levels per folder:
- **RISK** (0-1 contributors) — single point of failure
- **MODERATE** (2-3 contributors) — some coverage
- **SAFE** (4+ contributors) — well-distributed knowledge

### Hotspot Analysis

Find files that are frequently changed but poorly understood:

```bash
gitfamiliar --hotspot                      # personal hotspots
gitfamiliar --hotspot team                 # team hotspots
gitfamiliar --hotspot --window 30          # last 30 days only
gitfamiliar --hotspot --html               # scatter plot visualization
```

Risk = high change frequency x low familiarity.

## Expiration Policies

By default, "written" status never expires. But real knowledge fades. Configure expiration to keep scores honest:

| Policy | Flag | What happens |
|---|---|---|
| Never | `--expiration never` | Once written, always counted (default) |
| Time-based | `--expiration time:180d` | Expires 180 days after your last touch |
| Change-based | `--expiration change:50%` | Expires if 50%+ of the file changed since you last touched it |
| Combined | `--expiration combined:365d:50%` | Expires if **either** condition is met |

The change-based policy is the smartest: it detects when the code you wrote has been substantially rewritten, meaning your understanding is likely outdated.

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

## CLI Reference

```
Usage: gitfamiliar [options]

Options:
  -m, --mode <mode>          Scoring mode (default: "binary")
                             Choices: binary, authorship, weighted
  -u, --user <user>          Git user name or email (repeatable for comparison)
                             Default: git config user.name
  -e, --expiration <policy>  Expiration policy (default: "never")
                             Examples: time:180d, change:50%, combined:365d:50%
      --html                 Generate interactive HTML treemap report
  -w, --weights <weights>    Weights for weighted mode: blame,commit
                             Example: "0.6,0.4" (must sum to 1.0)
      --team                 Compare all contributors
      --team-coverage         Show team coverage map (bus factor analysis)
      --hotspot [mode]       Hotspot analysis: personal (default) or team
      --window <days>        Time window for hotspot analysis (default: 90)
  -V, --version              Output version number
  -h, --help                 Display help
```

## Programmatic API

GitFamiliar can also be used as a library:

```typescript
import { computeFamiliarity } from 'gitfamiliar';

const result = await computeFamiliarity({
  mode: 'binary',
  expiration: { policy: 'never' },
  weights: { blame: 0.5, commit: 0.5 },
  html: false,
  repoPath: '/path/to/repo',
});

console.log(`Score: ${Math.round(result.tree.score * 100)}%`);
```

## Requirements

- **Node.js** >= 18
- **Git** (available in PATH)

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
- [ ] **VS Code Extension** - See familiarity scores inline in the editor
- [ ] **README Badge** - Codecov-style badge for your project README

## License

[MIT](LICENSE)
