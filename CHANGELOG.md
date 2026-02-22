# Changelog

All notable changes to this project will be documented in this file.

## [0.8.0] - 2026-02-22

### Added
- **Unified HTML Dashboard** — `gitfamiliar --html` now generates a single-page dashboard with 4 tabs:
  - **Scoring** — Binary/Authorship/Weighted sub-tabs with real-time weight sliders
  - **Coverage** — Team bus factor treemap with risk sidebar
  - **Multi-User** — Contributor comparison treemap with user dropdown
  - **Hotspots** — Scatter plot of high-risk files with sidebar
- Tab descriptions explaining each view and scoring mode
- CLI version now reads from package.json dynamically
- Tests for `parseOptions` and `file-tree` utilities (64 total tests)

### Changed
- `--html` alone opens unified dashboard; `--html --hotspot` etc. still open individual reports
- Removed unused `scopeFactor` function from math utilities

### Fixed
- Version mismatch between CLI output and package.json

## [0.7.0]

### Added
- Hotspot analysis HTML visualization (scatter plot)
- Multi-user HTML comparison view
- Team coverage HTML treemap

## [0.6.0]

### Removed
- GitHub integration features (review-based scoring, PR analysis)

## [0.5.0]

### Added
- GitHub authentication support for private repositories

## [0.4.0]

### Fixed
- GitHub login flow improvements

## [0.3.0]

### Added
- GitHub integration for review-based scoring

## [0.2.0]

### Added
- Multi-user comparison (`--user`, `--team`)
- Team coverage map (`--team-coverage`) with bus factor analysis
- Hotspot analysis (`--hotspot`) with risk classification
- CI integration

## [0.1.0]

### Added
- Initial release
- Binary, Authorship, and Weighted scoring modes
- Expiration policies (time, change, combined)
- File filtering with `.gitfamiliarignore`
- Interactive HTML treemap visualization
- Programmatic API
