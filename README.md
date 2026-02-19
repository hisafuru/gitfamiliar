# GitFamiliar

**Visualize your code familiarity from Git history.**

Existing tools (git-fame, GitHub Contributors, etc.) measure _how much_ you've written. GitFamiliar estimates _how well_ you understand the codebase. Built for engineers joining a new project, it lets you and your team objectively track onboarding progress.

```
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

## Install

```bash
npx gitfamiliar
```

Or install globally:

```bash
npm install -g gitfamiliar
```

## Usage

Run inside any Git repository:

```bash
# Binary mode (default) — which files have you touched?
gitfamiliar

# Authorship mode — how much of the current code did you write? (git blame)
gitfamiliar --mode authorship

# Review Coverage — which files have you reviewed via PR?
gitfamiliar --mode review-coverage

# Weighted mode — combined score from blame, commits, and reviews
gitfamiliar --mode weighted

# HTML treemap report (opens in browser)
gitfamiliar --html

# Check a specific user
gitfamiliar --user kota

# Filter by how you touched the code
gitfamiliar --filter written    # only files you committed to
gitfamiliar --filter reviewed   # only files you reviewed

# Expiration policies
gitfamiliar --expiration time:180d        # expire after 180 days
gitfamiliar --expiration change:50%       # expire if 50%+ changed
gitfamiliar --expiration combined:365d:50%

# Custom weights for weighted mode
gitfamiliar --mode weighted --weights "0.5,0.35,0.15"
```

## Scoring Modes

### Binary (default)

Files are either "read" or "unread". A file counts as read if you've committed to it or approved a PR containing it.

```
score = read files / total files
```

Best for: **New team members** tracking onboarding progress.

### Authorship

Your share of the current codebase, based on `git blame`.

```
score = your blame lines / total lines
```

Best for: **Tech leads** assessing bus factor and code ownership distribution.

### Review Coverage

Files you've reviewed through PR approvals or comments (excluding your own commits).

```
score = reviewed files / total files
```

Best for: **Senior engineers** tracking review breadth. Requires a GitHub token.

### Weighted

Combines blame, commit frequency, and review signals with configurable weights and time decay.

```
score = 0.5 × blame_score + 0.35 × commit_score + 0.15 × review_score
```

Commit contributions use sigmoid normalization and exponential recency decay (half-life: 180 days). Review scores account for PR size (attention dilution).

Best for: **Power users** who want the most nuanced picture.

## HTML Report

Use `--html` to generate an interactive treemap visualization:

- **Area** = lines of code (file/folder volume)
- **Color** = familiarity score (red → yellow → green)
- Click folders to drill down
- Toggle between All / Written / Reviewed views
- Hover for detailed scores

## File Filtering

GitFamiliar ignores lock files, build outputs, and generated code by default. Customize by creating `.gitfamiliarignore` in your repo root (same syntax as `.gitignore`):

```gitignore
# Example: also ignore vendor code
vendor/
third_party/
```

Default exclusions: `package-lock.json`, `yarn.lock`, `*.min.js`, `*.map`, `dist/`, `build/`, etc.

## Expiration Policies

Control whether "read" status expires over time:

| Policy | Flag | Behavior |
|---|---|---|
| Never (default) | `--expiration never` | Once read, always read |
| Time-based | `--expiration time:180d` | Expires 180 days after last touch |
| Change-based | `--expiration change:50%` | Expires if 50%+ of the file changed since your last touch |
| Combined | `--expiration combined:365d:50%` | Expires if either condition is met |

## GitHub Integration

For review-related features (Review Coverage mode, reviewed files in Binary mode), set a GitHub token:

```bash
# Option 1: environment variable
export GITHUB_TOKEN=ghp_xxx

# Option 2: GitHub CLI (auto-detected)
gh auth login
```

## Requirements

- Node.js >= 18
- Git
- GitHub token (optional, for review features)

## License

MIT
