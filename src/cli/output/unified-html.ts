import { writeFileSync } from "node:fs";
import { join } from "node:path";
import type { UnifiedData } from "../../core/types.js";
import { openBrowser } from "../../utils/open-browser.js";
import { getUnifiedStyles } from "./unified-html-styles.js";
import { getUnifiedScripts } from "./unified-html-scripts.js";

function generateUnifiedHTML(data: UnifiedData): string {
  const scoringCommittedJson = JSON.stringify(data.scoring.committed.tree);
  const scoringCodeCoverageJson = JSON.stringify(
    data.scoring.codeCoverage.tree,
  );
  const scoringWeightedJson = JSON.stringify(data.scoring.weighted.tree);
  const coverageTreeJson = JSON.stringify(data.coverage.tree);
  const coverageRiskJson = JSON.stringify(data.coverage.riskFiles);
  const hotspotJson = JSON.stringify(
    data.hotspot.files
      .filter((f) => f.changeFrequency > 0)
      .map((f) => ({
        path: f.path,
        lines: f.lines,
        familiarity: f.familiarity,
        changeFrequency: f.changeFrequency,
        risk: f.risk,
        riskLevel: f.riskLevel,
      })),
  );
  const hotspotTeamFamJson = JSON.stringify(data.hotspotTeamFamiliarity);
  const multiUserTreeJson = JSON.stringify(data.multiUser.tree);
  const multiUserSummariesJson = JSON.stringify(data.multiUser.userSummaries);
  const multiUserNamesJson = JSON.stringify(
    data.multiUser.users.map((u) => u.name),
  );

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>GitFamiliar \u2014 ${data.repoName}</title>
<style>${getUnifiedStyles()}</style>
</head>
<body>
<div id="header">
  <h1>GitFamiliar \u2014 ${data.repoName}</h1>
  <div class="info">${data.userName} | ${data.scoring.committed.totalFiles} files</div>
</div>

<div id="tabs">
  <div class="tab active" onclick="switchTab('scoring')">Scoring</div>
  <div class="tab" onclick="switchTab('coverage')">Contributors</div>
  <div class="tab" onclick="switchTab('multiuser')">Team</div>
  <div class="tab" onclick="switchTab('hotspots')">Hotspots</div>
</div>

<div id="tab-desc-scoring" class="tab-desc visible">
  Your personal familiarity with each file, based on Git history. Larger blocks = more lines of code. Color shows how well you know each file.
</div>
<div id="tab-desc-coverage" class="tab-desc">
  Contributors per file: how many people have committed to each file. Low contributor count = high bus factor risk.
</div>
<div id="tab-desc-multiuser" class="tab-desc">
  Compare familiarity scores across the team. Select a user to see the codebase colored by their knowledge.
</div>
<div id="tab-desc-hotspots" class="tab-desc">
  Files that change frequently but are poorly understood. Top-left = danger zone (high change, low familiarity).
</div>

<div id="scoring-controls" class="visible">
  <button class="subtab active" data-mode="committed" onclick="switchScoringMode('committed')">Committed</button>
  <button class="subtab" data-mode="code-coverage" onclick="switchScoringMode('code-coverage')">Code Coverage</button>
  <button class="subtab" data-mode="weighted" onclick="switchScoringMode('weighted')">Weighted</button>
  <div id="weight-controls">
    <span>Blame:</span>
    <span class="weight-label" id="blame-label">50%</span>
    <input type="range" id="blame-slider" min="0" max="100" value="50" oninput="onWeightChange()">
    <span>Commit:</span>
    <span class="weight-label" id="commit-label">50%</span>
  </div>
</div>
<div id="scoring-mode-desc" class="tab-desc visible" style="padding-top:0">
  <span id="mode-desc-text">Binary: Have you ever committed to this file? Yes (green) or No (red).</span>
</div>

<div id="multiuser-controls">
  <label>View as:</label>
  <select id="userSelect" onchange="onUserChange()"></select>
</div>

<div id="hotspot-controls">
  <label>Mode:</label>
  <button class="subtab active" data-mode="personal" onclick="switchHotspotMode('personal')">Personal</button>
  <button class="subtab" data-mode="team" onclick="switchHotspotMode('team')">Team</button>
  <span class="sep-v"></span>
  <label>Scoring:</label>
  <button class="subtab hs-scoring active" data-mode="committed" onclick="switchHotspotScoring('committed')">Committed</button>
  <button class="subtab hs-scoring" data-mode="code-coverage" onclick="switchHotspotScoring('code-coverage')">Code Coverage</button>
  <button class="subtab hs-scoring" data-mode="weighted" onclick="switchHotspotScoring('weighted')">Weighted</button>
</div>

<div id="breadcrumb"><span onclick="zoomTo('')">root</span></div>

<div id="content-area">
  <div id="tab-scoring" class="tab-content active"></div>
  <div id="tab-coverage" class="tab-content with-sidebar">
    <div class="viz-area" id="coverage-viz"></div>
    <div class="sidebar" id="coverage-sidebar">
      <h3>Risk Files (0-1 contributors)</h3>
      <div id="risk-list"></div>
    </div>
  </div>
  <div id="tab-multiuser" class="tab-content"></div>
  <div id="tab-hotspots" class="tab-content with-sidebar">
    <div class="viz-area" id="hotspot-viz">
      <div id="zone-labels"></div>
    </div>
    <div class="sidebar" id="hotspot-sidebar">
      <h3>Top Hotspots</h3>
      <div id="hotspot-list"></div>
    </div>
  </div>
</div>

<div id="tooltip"></div>

<!-- Legends -->
<div class="legend active" id="legend-scoring">
  <div>Familiarity</div>
  <div class="gradient-bar"></div>
  <div class="labels"><span>0%</span><span>50%</span><span>100%</span></div>
</div>
<div class="legend" id="legend-coverage">
  <div>Contributors</div>
  <div class="row"><div class="swatch" style="background:var(--color-critical)"></div> 0\u20131 (Risk)</div>
  <div class="row"><div class="swatch" style="background:var(--color-medium)"></div> 2\u20133 (Moderate)</div>
  <div class="row"><div class="swatch" style="background:var(--color-safe)"></div> 4+ (Safe)</div>
</div>
<div class="legend" id="legend-multiuser">
  <div>Familiarity</div>
  <div class="gradient-bar"></div>
  <div class="labels"><span>0%</span><span>50%</span><span>100%</span></div>
</div>

<script src="https://d3js.org/d3.v7.min.js"></script>
<script>
// ── Data ──
const scoringData = {
  committed: ${scoringCommittedJson},
  'code-coverage': ${scoringCodeCoverageJson},
  weighted: ${scoringWeightedJson},
};
const coverageData = ${coverageTreeJson};
const coverageRiskFiles = ${coverageRiskJson};
const hotspotData = ${hotspotJson};
const hotspotTeamFamiliarity = ${hotspotTeamFamJson};
const multiUserData = ${multiUserTreeJson};
const multiUserNames = ${multiUserNamesJson};
const multiUserSummaries = ${multiUserSummariesJson};
${getUnifiedScripts()}
</script>
</body>
</html>`;
}

export async function generateAndOpenUnifiedHTML(
  data: UnifiedData,
  repoPath: string,
): Promise<void> {
  const html = generateUnifiedHTML(data);
  const outputPath = join(repoPath, "gitfamiliar-dashboard.html");
  writeFileSync(outputPath, html, "utf-8");
  console.log(`Dashboard generated: ${outputPath}`);
  await openBrowser(outputPath);
}
