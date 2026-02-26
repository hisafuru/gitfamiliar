import { writeFileSync } from "node:fs";
import { join } from "node:path";
import type { UnifiedData } from "../../core/types.js";
import { openBrowser } from "../../utils/open-browser.js";

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
<style>
  :root {
    --bg-base: #1a1a2e;
    --bg-panel: #16213e;
    --accent: #e94560;
    --accent-hover: #ff5577;
    --border: #0f3460;
    --text-primary: #e0e0e0;
    --text-secondary: #a0a0a0;
    --text-dim: #888;
    --link: #5eadf7;
    --color-critical: #e94560;
    --color-high: #f07040;
    --color-medium: #f5a623;
    --color-safe: #27ae60;
    --shadow-sm: 0 2px 4px rgba(0,0,0,0.3);
    --shadow-md: 0 4px 12px rgba(0,0,0,0.4);
    --shadow-lg: 0 8px 24px rgba(0,0,0,0.5);
    --shadow-glow-accent: 0 0 20px rgba(233,69,96,0.3);
    --glass-bg: rgba(22,33,62,0.85);
    --glass-border: rgba(94,173,247,0.15);
    --transition-fast: 0.15s ease;
    --transition-smooth: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: var(--bg-base);
    color: var(--text-primary);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    height: 100vh;
  }
  #header {
    padding: 12px 24px;
    background: linear-gradient(135deg, var(--bg-panel) 0%, #1a2844 100%);
    border-bottom: 1px solid var(--border);
    box-shadow: var(--shadow-md);
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: relative;
    z-index: 10;
  }
  #header h1 { font-size: 18px; color: var(--accent); text-shadow: 0 0 20px rgba(233,69,96,0.4); }
  #header .info { font-size: 13px; color: var(--text-secondary); }

  /* Tabs */
  #tabs {
    display: flex;
    background: var(--bg-panel);
    border-bottom: 1px solid var(--border);
    padding: 0 24px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    position: relative;
    z-index: 9;
  }
  #tabs .tab {
    padding: 10px 20px;
    cursor: pointer;
    color: var(--text-dim);
    border-bottom: 2px solid transparent;
    font-size: 14px;
    transition: all var(--transition-smooth);
    position: relative;
  }
  #tabs .tab:hover { color: var(--text-primary); transform: translateY(-1px); }
  #tabs .tab.active {
    color: var(--accent);
    border-bottom-color: var(--accent);
    text-shadow: 0 0 10px rgba(233,69,96,0.5);
    background: linear-gradient(to bottom, transparent, rgba(233,69,96,0.05));
  }

  /* Sub-tabs (scoring modes) */
  #scoring-controls {
    display: none;
    padding: 8px 24px;
    background: var(--bg-panel);
    border-bottom: 1px solid var(--border);
    align-items: center;
    gap: 16px;
  }
  #scoring-controls.visible { display: flex; }
  .subtab {
    padding: 5px 14px;
    cursor: pointer;
    color: var(--text-dim);
    border: 1px solid var(--border);
    border-radius: 4px;
    font-size: 12px;
    background: transparent;
    transition: all var(--transition-smooth);
    box-shadow: var(--shadow-sm);
  }
  .subtab:hover { color: var(--text-primary); border-color: #555; transform: translateY(-1px); box-shadow: 0 4px 8px rgba(0,0,0,0.3); }
  .subtab.active { color: var(--accent); border-color: var(--accent); background: rgba(233,69,96,0.1); box-shadow: 0 0 12px rgba(233,69,96,0.3); }
  #weight-controls {
    display: none;
    align-items: center;
    gap: 8px;
    margin-left: 24px;
    font-size: 12px;
    color: var(--text-secondary);
  }
  #weight-controls.visible { display: flex; }
  #weight-controls input[type="range"] {
    width: 120px;
    -webkit-appearance: none;
    appearance: none;
    background: transparent;
    cursor: pointer;
  }
  #weight-controls input[type="range"]::-webkit-slider-runnable-track {
    height: 6px;
    background: linear-gradient(to right, var(--accent), var(--link));
    border-radius: 3px;
    box-shadow: inset 0 1px 3px rgba(0,0,0,0.3);
  }
  #weight-controls input[type="range"]::-moz-range-track {
    height: 6px;
    background: linear-gradient(to right, var(--accent), var(--link));
    border-radius: 3px;
    box-shadow: inset 0 1px 3px rgba(0,0,0,0.3);
  }
  #weight-controls input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 16px;
    height: 16px;
    background: var(--accent);
    border-radius: 50%;
    cursor: pointer;
    margin-top: -5px;
    box-shadow: 0 2px 6px rgba(0,0,0,0.4), 0 0 8px rgba(233,69,96,0.4);
    transition: all var(--transition-fast);
  }
  #weight-controls input[type="range"]::-moz-range-thumb {
    width: 16px;
    height: 16px;
    background: var(--accent);
    border: none;
    border-radius: 50%;
    cursor: pointer;
    box-shadow: 0 2px 6px rgba(0,0,0,0.4), 0 0 8px rgba(233,69,96,0.4);
    transition: all var(--transition-fast);
  }
  #weight-controls input[type="range"]::-webkit-slider-thumb:hover {
    transform: scale(1.2);
    box-shadow: 0 4px 10px rgba(0,0,0,0.5), 0 0 16px rgba(233,69,96,0.6);
  }
  #weight-controls input[type="range"]::-moz-range-thumb:hover {
    transform: scale(1.2);
    box-shadow: 0 4px 10px rgba(0,0,0,0.5), 0 0 16px rgba(233,69,96,0.6);
  }
  #weight-controls .weight-label { min-width: 36px; text-align: right; color: var(--text-primary); }

  /* Breadcrumb */
  #breadcrumb {
    padding: 8px 24px;
    background: var(--bg-panel);
    font-size: 13px;
    border-bottom: 1px solid var(--border);
    display: none;
  }
  #breadcrumb.visible { display: block; }
  #breadcrumb span {
    cursor: pointer;
    color: var(--link);
    padding: 3px 10px;
    border-radius: 12px;
    transition: all var(--transition-fast);
    display: inline-block;
  }
  #breadcrumb span:hover { background: rgba(94,173,247,0.12); text-shadow: 0 0 8px rgba(94,173,247,0.4); }
  #breadcrumb .sep { color: var(--text-dim); margin: 0 2px; padding: 0; }
  #breadcrumb .sep:hover { background: transparent; text-shadow: none; }

  /* Tab descriptions */
  .tab-desc {
    padding: 8px 24px;
    background: var(--bg-panel);
    border-bottom: 1px solid var(--border);
    font-size: 12px;
    color: var(--text-dim);
    display: none;
  }
  .tab-desc.visible { display: block; }

  /* Tab content */
  #content-area { flex: 1; position: relative; overflow: hidden; }
  .tab-content { display: none; position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
  .tab-content.active { display: block; }
  .tab-content.with-sidebar.active { display: flex; }
  .tab-content svg { animation: fadeInScale 0.4s ease-out; }
  @keyframes fadeInScale {
    from { opacity: 0; transform: scale(0.98); }
    to { opacity: 1; transform: scale(1); }
  }

  /* Layout with sidebar */
  .with-sidebar .viz-area { flex: 1; position: relative; height: 100%; }
  .with-sidebar .sidebar {
    width: 300px;
    height: 100%;
    background: rgba(22,33,62,0.95);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border-left: 1px solid var(--border);
    box-shadow: -4px 0 16px rgba(0,0,0,0.3);
    overflow-y: auto;
    padding: 16px;
  }
  .sidebar h3 { font-size: 14px; margin-bottom: 12px; color: var(--accent); text-shadow: 0 0 10px rgba(233,69,96,0.3); }
  .sidebar .risk-file, .sidebar .hotspot-item {
    padding: 8px 10px;
    border-bottom: 1px solid var(--border);
    font-size: 12px;
    border-radius: 4px;
    margin-bottom: 2px;
    transition: all var(--transition-fast);
  }
  .sidebar .risk-file:hover, .sidebar .hotspot-item:hover {
    background: rgba(94,173,247,0.06);
    border-left: 3px solid var(--accent);
    padding-left: 13px;
    transform: translateX(2px);
  }
  .sidebar .path { color: var(--text-primary); word-break: break-all; }
  .sidebar .meta { color: var(--text-dim); margin-top: 2px; }
  .risk-badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 10px;
    font-weight: bold;
    margin-left: 4px;
    box-shadow: var(--shadow-sm);
  }
  .risk-critical { background: var(--color-critical); color: white; box-shadow: 0 0 8px rgba(233,69,96,0.4); }
  .risk-high { background: var(--color-high); color: white; box-shadow: 0 0 6px rgba(240,112,64,0.4); }
  .risk-medium { background: var(--color-medium); color: black; }
  .risk-low { background: var(--color-safe); color: white; }

  /* Multi-user controls */
  #multiuser-controls {
    display: none;
    padding: 8px 24px;
    background: var(--bg-panel);
    border-bottom: 1px solid var(--border);
    align-items: center;
    gap: 12px;
  }
  #multiuser-controls.visible { display: flex; }
  #multiuser-controls select {
    padding: 6px 14px;
    border: 1px solid var(--border);
    background: var(--bg-base);
    color: var(--text-primary);
    border-radius: 6px;
    font-size: 13px;
    box-shadow: var(--shadow-sm);
    transition: all var(--transition-fast);
    cursor: pointer;
  }
  #multiuser-controls select:hover { border-color: var(--link); box-shadow: 0 0 8px rgba(94,173,247,0.2); }
  #multiuser-controls select:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 12px rgba(233,69,96,0.3); }
  #multiuser-controls label { font-size: 13px; color: var(--text-dim); }

  /* Hotspot controls */
  #hotspot-controls {
    display: none;
    padding: 8px 24px;
    background: var(--bg-panel);
    border-bottom: 1px solid var(--border);
    align-items: center;
    gap: 12px;
  }
  #hotspot-controls.visible { display: flex; }
  #hotspot-controls label { font-size: 13px; color: var(--text-dim); }
  #hotspot-controls .sep-v {
    width: 1px;
    height: 20px;
    background: var(--border);
    margin: 0 8px;
  }
  .subtab.disabled {
    opacity: 0.35;
    pointer-events: none;
    cursor: default;
  }

  /* Tooltip */
  #tooltip {
    position: absolute;
    pointer-events: none;
    background: var(--glass-bg);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid var(--glass-border);
    border-radius: 8px;
    padding: 12px 16px;
    font-size: 13px;
    line-height: 1.6;
    display: none;
    z-index: 100;
    max-width: 350px;
    box-shadow: var(--shadow-lg);
  }

  /* Legends */
  .legend {
    position: absolute;
    bottom: 16px;
    right: 16px;
    background: var(--glass-bg);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid var(--glass-border);
    border-radius: 10px;
    padding: 12px 14px;
    font-size: 12px;
    display: none;
    z-index: 50;
    box-shadow: var(--shadow-md);
  }
  .legend.active { display: block; }
  .legend .gradient-bar {
    width: 120px;
    height: 12px;
    background: linear-gradient(to right, var(--color-critical), var(--color-medium), var(--color-safe));
    border-radius: 6px;
    margin: 4px 0;
    box-shadow: inset 0 1px 2px rgba(0,0,0,0.2);
  }
  .legend .labels { display: flex; justify-content: space-between; font-size: 10px; color: var(--text-dim); }
  .legend .row { display: flex; align-items: center; gap: 6px; margin: 3px 0; }
  .legend .swatch { width: 14px; height: 14px; border-radius: 4px; box-shadow: var(--shadow-sm); }

  /* Zone labels for hotspot */
  #zone-labels { position: absolute; pointer-events: none; }
  .zone-label {
    position: absolute;
    font-size: 16px;
    font-weight: bold;
  }
</style>
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

// ── State ──
let activeTab = 'scoring';
let scoringMode = 'committed';
let blameWeight = 0.5;
let scoringPath = '';
let coveragePath = '';
let multiuserPath = '';
let currentUser = 0;
let hotspotMode = 'personal';
let hotspotScoring = 'committed';
const rendered = { scoring: false, coverage: false, hotspots: false, multiuser: false };

// ── Hotspot recalculation utilities ──
function extractFlatScores(node) {
  const map = {};
  function walk(n) {
    if (n.type === 'file') { map[n.path] = n.score; }
    else if (n.children) { n.children.forEach(walk); }
  }
  walk(node);
  return map;
}

const personalScores = {
  committed: extractFlatScores(scoringData.committed),
  'code-coverage': extractFlatScores(scoringData['code-coverage']),
  weighted: extractFlatScores(scoringData.weighted),
};

function recalculateHotspotData() {
  const famScores = hotspotMode === 'personal'
    ? personalScores[hotspotScoring]
    : hotspotTeamFamiliarity;
  const maxFreq = d3.max(hotspotData, d => d.changeFrequency) || 1;
  return hotspotData.map(d => {
    const familiarity = famScores[d.path] || 0;
    const normalizedFreq = d.changeFrequency / maxFreq;
    const risk = normalizedFreq * (1 - familiarity);
    return { ...d, familiarity, risk,
      riskLevel: risk >= 0.6 ? 'critical' : risk >= 0.4 ? 'high' : risk >= 0.2 ? 'medium' : 'low',
    };
  }).sort((a, b) => b.risk - a.risk);
}

function switchHotspotMode(mode) {
  hotspotMode = mode;
  document.querySelectorAll('#hotspot-controls .subtab:not(.hs-scoring)').forEach(el => {
    el.classList.toggle('active', el.dataset.mode === mode);
  });
  // Disable scoring buttons in team mode
  const isTeam = mode === 'team';
  document.querySelectorAll('#hotspot-controls .hs-scoring').forEach(el => {
    el.classList.toggle('disabled', isTeam);
  });
  renderHotspot();
  renderHotspotSidebar();
}

function switchHotspotScoring(mode) {
  if (hotspotMode === 'team') return;
  hotspotScoring = mode;
  document.querySelectorAll('#hotspot-controls .hs-scoring').forEach(el => {
    el.classList.toggle('active', el.dataset.mode === mode);
  });
  renderHotspot();
  renderHotspotSidebar();
}

// ── Common utilities ──
function scoreColor(score) {
  if (score <= 0) return '#e94560';
  if (score >= 1) return '#27ae60';
  if (score < 0.5) return d3.interpolateRgb('#e94560', '#f5a623')(score / 0.5);
  return d3.interpolateRgb('#f5a623', '#27ae60')((score - 0.5) / 0.5);
}

function coverageColor(count) {
  if (count <= 0) return '#e94560';
  if (count === 1) return '#d63c57';
  if (count <= 3) return '#f5a623';
  return '#27ae60';
}

function folderRiskColor(riskLevel) {
  switch (riskLevel) {
    case 'risk': return '#e94560';
    case 'moderate': return '#f5a623';
    default: return '#27ae60';
  }
}

function riskLevelColor(level) {
  switch(level) {
    case 'critical': return '#e94560';
    case 'high': return '#f07040';
    case 'medium': return '#f5a623';
    default: return '#27ae60';
  }
}

function findNode(node, path) {
  if (node.path === path) return node;
  if (node.children) {
    for (const child of node.children) {
      const found = findNode(child, path);
      if (found) return found;
    }
  }
  return null;
}

function buildHierarchy(node) {
  if (node.type === 'file') {
    return { name: node.path.split('/').pop(), data: node, value: Math.max(1, node.lines) };
  }
  return {
    name: node.path.split('/').pop() || node.path,
    data: node,
    children: (node.children || []).map(c => buildHierarchy(c)),
  };
}

function updateBreadcrumb(path) {
  const el = document.getElementById('breadcrumb');
  const parts = path ? path.split('/') : [];
  let html = '<span onclick="zoomTo(\\'\\')">root</span>';
  let accumulated = '';
  for (const part of parts) {
    accumulated = accumulated ? accumulated + '/' + part : part;
    const p = accumulated;
    html += '<span class="sep">/</span><span onclick="zoomTo(\\'' + p + '\\')">' + part + '</span>';
  }
  el.innerHTML = html;
}

function showTooltipAt(html, event) {
  const tooltip = document.getElementById('tooltip');
  tooltip.innerHTML = html;
  tooltip.style.display = 'block';
  tooltip.style.left = (event.pageX + 14) + 'px';
  tooltip.style.top = (event.pageY - 14) + 'px';
}

function moveTooltip(event) {
  const tooltip = document.getElementById('tooltip');
  tooltip.style.left = (event.pageX + 14) + 'px';
  tooltip.style.top = (event.pageY - 14) + 'px';
}

function hideTooltip() {
  document.getElementById('tooltip').style.display = 'none';
}

function truncateLabel(name, w, h) {
  if (w < 36 || h < 18) return '';
  const maxChars = Math.floor((w - 8) / 6.5);
  if (name.length > maxChars) return name.slice(0, maxChars - 1) + '\\u2026';
  return name;
}

// ── Tab switching ──
const modeDescriptions = {
  committed: 'Committed: Have you ever committed to this file? Yes (green) or No (red).',
  'code-coverage': 'Code Coverage: How much of the current code did you write? Based on git blame line ownership.',
  weighted: 'Weighted: Combines blame ownership and commit history with adjustable weights. Use the sliders to tune.',
};

function switchTab(tab) {
  activeTab = tab;
  document.querySelectorAll('#tabs .tab').forEach((el, i) => {
    const tabs = ['scoring', 'coverage', 'multiuser', 'hotspots'];
    el.classList.toggle('active', tabs[i] === tab);
  });
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');

  // Show/hide tab descriptions
  ['scoring', 'coverage', 'multiuser', 'hotspots'].forEach(t => {
    document.getElementById('tab-desc-' + t).classList.toggle('visible', t === tab);
  });

  // Show/hide controls
  document.getElementById('scoring-controls').classList.toggle('visible', tab === 'scoring');
  document.getElementById('scoring-mode-desc').classList.toggle('visible', tab === 'scoring');
  document.getElementById('multiuser-controls').classList.toggle('visible', tab === 'multiuser');
  document.getElementById('hotspot-controls').classList.toggle('visible', tab === 'hotspots');

  // Show/hide breadcrumb
  const showBreadcrumb = tab === 'scoring' || tab === 'coverage' || tab === 'multiuser';
  document.getElementById('breadcrumb').classList.toggle('visible', showBreadcrumb);

  // Show/hide legends
  document.getElementById('legend-scoring').classList.toggle('active', tab === 'scoring');
  document.getElementById('legend-coverage').classList.toggle('active', tab === 'coverage');
  document.getElementById('legend-multiuser').classList.toggle('active', tab === 'multiuser');

  // Update breadcrumb for current tab
  if (tab === 'scoring') updateBreadcrumb(scoringPath);
  else if (tab === 'coverage') updateBreadcrumb(coveragePath);
  else if (tab === 'multiuser') updateBreadcrumb(multiuserPath);

  // Render after a short delay so layout is computed after display change
  setTimeout(() => {
    if (!rendered[tab]) {
      rendered[tab] = true;
      if (tab === 'coverage') { renderCoverageSidebar(); renderCoverage(); }
      else if (tab === 'hotspots') { renderHotspotSidebar(); renderHotspot(); }
      else if (tab === 'multiuser') { initMultiUserSelect(); renderMultiUser(); }
    } else {
      if (tab === 'scoring') renderScoring();
      else if (tab === 'coverage') renderCoverage();
      else if (tab === 'hotspots') renderHotspot();
      else if (tab === 'multiuser') renderMultiUser();
    }
  }, 0);
}

// ── Zoom (shared across treemap tabs) ──
function zoomTo(path) {
  if (activeTab === 'scoring') { scoringPath = path; renderScoring(); }
  else if (activeTab === 'coverage') { coveragePath = path; renderCoverage(); }
  else if (activeTab === 'multiuser') { multiuserPath = path; renderMultiUser(); }
  updateBreadcrumb(path);
}

// ── Layout dimensions ──
function getContentHeight() {
  return document.getElementById('content-area').offsetHeight;
}

// ══════════════════════════════════════
// ── SCORING TAB ──
// ══════════════════════════════════════

function switchScoringMode(mode) {
  scoringMode = mode;
  scoringPath = '';
  updateBreadcrumb('');
  document.querySelectorAll('#scoring-controls .subtab').forEach(el => {
    el.classList.toggle('active', el.dataset.mode === mode);
  });
  document.getElementById('weight-controls').classList.toggle('visible', mode === 'weighted');
  document.getElementById('mode-desc-text').textContent = modeDescriptions[mode];
  renderScoring();
}

function onWeightChange() {
  const slider = document.getElementById('blame-slider');
  const bv = parseInt(slider.value);
  blameWeight = bv / 100;
  document.getElementById('blame-label').textContent = bv + '%';
  document.getElementById('commit-label').textContent = (100 - bv) + '%';
  recalcWeightedScores(scoringData.weighted, blameWeight, 1 - blameWeight);
  renderScoring();
}

function recalcWeightedScores(node, bw, cw) {
  if (node.type === 'file') {
    const bs = node.blameScore || 0;
    const cs = node.commitScore || 0;
    node.score = bw * bs + cw * cs;
  } else if (node.children) {
    let totalLines = 0;
    let weightedSum = 0;
    for (const child of node.children) {
      recalcWeightedScores(child, bw, cw);
      const lines = child.lines || 1;
      totalLines += lines;
      weightedSum += child.score * lines;
    }
    node.score = totalLines > 0 ? weightedSum / totalLines : 0;
  }
}

function renderScoring() {
  const container = document.getElementById('tab-scoring');
  container.innerHTML = '';
  const height = getContentHeight();
  const width = window.innerWidth;

  const treeData = scoringData[scoringMode];
  const targetNode = scoringPath ? findNode(treeData, scoringPath) : treeData;
  if (!targetNode || !targetNode.children || targetNode.children.length === 0) return;

  const hierarchyData = {
    name: targetNode.path || 'root',
    children: targetNode.children.map(c => buildHierarchy(c)),
  };

  const root = d3.hierarchy(hierarchyData)
    .sum(d => d.value || 0)
    .sort((a, b) => (b.value || 0) - (a.value || 0));

  d3.treemap().size([width, height]).padding(2).paddingTop(20).round(true)(root);

  const svg = d3.select('#tab-scoring').append('svg').attr('width', width).attr('height', height);
  const nodes = root.descendants().filter(d => d.depth > 0);

  const groups = svg.selectAll('g').data(nodes).join('g')
    .attr('transform', d => 'translate(' + d.x0 + ',' + d.y0 + ')');

  groups.append('rect')
    .attr('width', d => Math.max(0, d.x1 - d.x0))
    .attr('height', d => Math.max(0, d.y1 - d.y0))
    .attr('fill', d => d.data.data ? scoreColor(d.data.data.score) : '#333')
    .attr('opacity', d => d.children ? 0.35 : 0.88)
    .attr('stroke', '#1a1a2e').attr('stroke-width', d => d.children ? 1 : 0.5).attr('rx', 2)
    .style('cursor', d => (d.data.data && d.data.data.type === 'folder') ? 'pointer' : 'default')
    .on('click', (event, d) => {
      if (d.data.data && d.data.data.type === 'folder') { event.stopPropagation(); zoomTo(d.data.data.path); }
    })
    .on('mouseover', function(event, d) {
      if (!d.data.data) return;
      d3.select(this).attr('opacity', d.children ? 0.5 : 1).attr('stroke', '#fff');
      let html = '<strong>' + d.data.data.path + '</strong>';
      html += '<br>Score: ' + Math.round(d.data.data.score * 100) + '%';
      html += '<br>Lines: ' + d.data.data.lines.toLocaleString();
      if (d.data.data.type === 'folder') {
        html += '<br>Files: ' + d.data.data.fileCount;
        html += '<br><em style="color:#5eadf7">Click to drill down \\u25B6</em>';
      }
      if (d.data.data.blameScore !== undefined) html += '<br>Blame: ' + Math.round(d.data.data.blameScore * 100) + '%';
      if (d.data.data.commitScore !== undefined) html += '<br>Commit: ' + Math.round(d.data.data.commitScore * 100) + '%';
      if (d.data.data.isExpired) html += '<br><span style="color:#e94560">Expired</span>';
      showTooltipAt(html, event);
    })
    .on('mousemove', moveTooltip)
    .on('mouseout', function(event, d) {
      d3.select(this).attr('opacity', d.children ? 0.35 : 0.88).attr('stroke', '#1a1a2e');
      hideTooltip();
    });

  groups.append('text')
    .attr('x', 4).attr('y', 14).attr('fill', '#fff')
    .attr('font-size', d => d.children ? '11px' : '10px')
    .attr('font-weight', d => d.children ? 'bold' : 'normal')
    .style('pointer-events', 'none')
    .text(d => truncateLabel(d.data.name || '', d.x1 - d.x0, d.y1 - d.y0));
}

// ══════════════════════════════════════
// ── COVERAGE TAB ──
// ══════════════════════════════════════

function renderCoverage() {
  const vizArea = document.getElementById('coverage-viz');
  vizArea.innerHTML = '';
  let height = vizArea.offsetHeight;
  let width = vizArea.offsetWidth;

  if (!width || !height) {
    const contentH = document.getElementById('content-area').offsetHeight;
    width = window.innerWidth - 300;
    height = contentH;
  }

  const targetNode = coveragePath ? findNode(coverageData, coveragePath) : coverageData;
  if (!targetNode || !targetNode.children || targetNode.children.length === 0) return;

  const hierarchyData = {
    name: targetNode.path || 'root',
    children: targetNode.children.map(c => buildHierarchy(c)),
  };

  const root = d3.hierarchy(hierarchyData)
    .sum(d => d.value || 0)
    .sort((a, b) => (b.value || 0) - (a.value || 0));

  d3.treemap().size([width, height]).padding(2).paddingTop(20).round(true)(root);

  const svg = d3.select('#coverage-viz').append('svg').attr('width', width).attr('height', height);
  const nodes = root.descendants().filter(d => d.depth > 0);

  const groups = svg.selectAll('g').data(nodes).join('g')
    .attr('transform', d => 'translate(' + d.x0 + ',' + d.y0 + ')');

  groups.append('rect')
    .attr('width', d => Math.max(0, d.x1 - d.x0))
    .attr('height', d => Math.max(0, d.y1 - d.y0))
    .attr('fill', d => {
      if (!d.data.data) return '#333';
      if (d.data.data.type === 'file') return coverageColor(d.data.data.contributorCount);
      return folderRiskColor(d.data.data.riskLevel);
    })
    .attr('opacity', d => d.children ? 0.35 : 0.88)
    .attr('stroke', '#1a1a2e').attr('stroke-width', d => d.children ? 1 : 0.5).attr('rx', 2)
    .style('cursor', d => (d.data.data && d.data.data.type === 'folder') ? 'pointer' : 'default')
    .on('click', (event, d) => {
      if (d.data.data && d.data.data.type === 'folder') { event.stopPropagation(); zoomTo(d.data.data.path); }
    })
    .on('mouseover', function(event, d) {
      if (!d.data.data) return;
      d3.select(this).attr('opacity', d.children ? 0.5 : 1).attr('stroke', '#fff');
      let html = '<strong>' + d.data.data.path + '</strong>';
      if (d.data.data.type === 'file') {
        html += '<br>Contributors: ' + d.data.data.contributorCount;
        if (d.data.data.contributors && d.data.data.contributors.length > 0) {
          html += '<br>' + d.data.data.contributors.slice(0, 8).join(', ');
          if (d.data.data.contributors.length > 8) html += ', ...';
        }
        html += '<br>Lines: ' + d.data.data.lines.toLocaleString();
      } else {
        html += '<br>Files: ' + d.data.data.fileCount;
        html += '<br>Avg Contributors: ' + d.data.data.avgContributors;
        html += '<br>Bus Factor: ' + d.data.data.busFactor;
        html += '<br><em style="color:#5eadf7">Click to drill down \\u25B6</em>';
      }
      showTooltipAt(html, event);
    })
    .on('mousemove', moveTooltip)
    .on('mouseout', function(event, d) {
      d3.select(this).attr('opacity', d.children ? 0.35 : 0.88).attr('stroke', '#1a1a2e');
      hideTooltip();
    });

  groups.append('text')
    .attr('x', 4).attr('y', 14).attr('fill', '#fff')
    .attr('font-size', d => d.children ? '11px' : '10px')
    .attr('font-weight', d => d.children ? 'bold' : 'normal')
    .style('pointer-events', 'none')
    .text(d => truncateLabel(d.data.name || '', d.x1 - d.x0, d.y1 - d.y0));
}

function renderCoverageSidebar() {
  const container = document.getElementById('risk-list');
  if (coverageRiskFiles.length === 0) {
    container.innerHTML = '<div style="color:#888">No high-risk files found.</div>';
    return;
  }
  let html = '';
  for (const f of coverageRiskFiles.slice(0, 50)) {
    const countLabel = f.contributorCount === 0 ? '0 people' : '1 person (' + f.contributors[0] + ')';
    html += '<div class="risk-file"><div class="path">' + f.path + '</div><div class="meta">' + countLabel + '</div></div>';
  }
  if (coverageRiskFiles.length > 50) {
    html += '<div style="color:#888;padding:8px 0">... and ' + (coverageRiskFiles.length - 50) + ' more</div>';
  }
  container.innerHTML = html;
}

// ══════════════════════════════════════
// ── HOTSPOT TAB ──
// ══════════════════════════════════════

function renderHotspot() {
  const vizArea = document.getElementById('hotspot-viz');
  const existingSvg = vizArea.querySelector('svg');
  if (existingSvg) existingSvg.remove();

  let height = vizArea.offsetHeight;
  let width = vizArea.offsetWidth;

  // Fallback: if the element hasn't been laid out yet, calculate manually
  if (!width || !height) {
    const contentH = document.getElementById('content-area').offsetHeight;
    const totalW = window.innerWidth;
    width = totalW - 300; // subtract sidebar width
    height = contentH;
  }

  const currentData = recalculateHotspotData();

  const margin = { top: 30, right: 30, bottom: 60, left: 70 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const maxFreq = d3.max(currentData, d => d.changeFrequency) || 1;

  const x = d3.scaleLinear().domain([0, 1]).range([0, innerW]);
  const y = d3.scaleLinear().domain([0, maxFreq * 1.1]).range([innerH, 0]);
  const r = d3.scaleSqrt().domain([0, d3.max(currentData, d => d.lines) || 1]).range([3, 20]);

  const svg = d3.select('#hotspot-viz').append('svg').attr('width', width).attr('height', height);
  const g = svg.append('g').attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

  // Danger zone
  g.append('rect').attr('x', 0).attr('y', 0)
    .attr('width', x(0.3)).attr('height', y(maxFreq * 0.3))
    .attr('fill', 'rgba(233, 69, 96, 0.06)');

  // Axes
  g.append('g').attr('transform', 'translate(0,' + innerH + ')')
    .call(d3.axisBottom(x).ticks(5).tickFormat(d => Math.round(d * 100) + '%'))
    .selectAll('text,line,path').attr('stroke', '#555').attr('fill', '#888');

  svg.append('text').attr('x', margin.left + innerW / 2).attr('y', height - 10)
    .attr('text-anchor', 'middle').attr('fill', '#888').attr('font-size', '13px')
    .text('Familiarity \\u2192');

  g.append('g').call(d3.axisLeft(y).ticks(6))
    .selectAll('text,line,path').attr('stroke', '#555').attr('fill', '#888');

  svg.append('text').attr('transform', 'rotate(-90)')
    .attr('x', -(margin.top + innerH / 2)).attr('y', 16)
    .attr('text-anchor', 'middle').attr('fill', '#888').attr('font-size', '13px')
    .text('Change Frequency (commits) \\u2192');

  // Zone labels
  const labels = document.getElementById('zone-labels');
  labels.innerHTML = '';
  const dangerLabel = document.createElement('div');
  dangerLabel.className = 'zone-label';
  dangerLabel.style.left = (margin.left + 8) + 'px';
  dangerLabel.style.top = (margin.top + 8) + 'px';
  dangerLabel.textContent = 'DANGER ZONE';
  dangerLabel.style.color = 'rgba(233,69,96,0.25)';
  labels.appendChild(dangerLabel);

  const safeLabel = document.createElement('div');
  safeLabel.className = 'zone-label';
  safeLabel.style.right = (320 + 40) + 'px';
  safeLabel.style.bottom = (margin.bottom + 16) + 'px';
  safeLabel.textContent = 'SAFE ZONE';
  safeLabel.style.color = 'rgba(39,174,96,0.2)';
  labels.appendChild(safeLabel);

  // Data points
  g.selectAll('circle').data(currentData).join('circle')
    .attr('cx', d => x(d.familiarity))
    .attr('cy', d => y(d.changeFrequency))
    .attr('r', d => r(d.lines))
    .attr('fill', d => riskLevelColor(d.riskLevel))
    .attr('opacity', 0.7)
    .attr('stroke', 'none')
    .style('cursor', 'pointer')
    .style('filter', d => d.riskLevel === 'critical' ? 'drop-shadow(0 0 6px rgba(233,69,96,0.8))' : 'none')
    .style('transition', 'all 0.2s ease')
    .on('mouseover', function(event, d) {
      d3.select(this).attr('opacity', 1).attr('stroke', '#fff').attr('stroke-width', 2).style('filter', 'drop-shadow(0 0 12px rgba(255,255,255,0.5))');
      showTooltipAt(
        '<strong>' + d.path + '</strong>' +
        '<br>Familiarity: ' + Math.round(d.familiarity * 100) + '%' +
        '<br>Changes: ' + d.changeFrequency + ' commits' +
        '<br>Risk: ' + d.risk.toFixed(2) + ' (' + d.riskLevel + ')' +
        '<br>Lines: ' + d.lines.toLocaleString(),
        event
      );
    })
    .on('mousemove', moveTooltip)
    .on('mouseout', function(event, d) {
      const origFilter = d.riskLevel === 'critical' ? 'drop-shadow(0 0 6px rgba(233,69,96,0.8))' : 'none';
      d3.select(this).attr('opacity', 0.7).attr('stroke', 'none').style('filter', origFilter);
      hideTooltip();
    });
}

function renderHotspotSidebar() {
  const container = document.getElementById('hotspot-list');
  const currentData = recalculateHotspotData();
  const top = currentData.slice(0, 30);
  if (top.length === 0) {
    container.innerHTML = '<div style="color:#888">No active files in time window.</div>';
    return;
  }
  let html = '';
  for (let i = 0; i < top.length; i++) {
    const f = top[i];
    html += '<div class="hotspot-item"><div class="path">' + (i + 1) + '. ' + f.path +
      ' <span class="risk-badge risk-' + f.riskLevel + '">' + f.riskLevel.toUpperCase() + '</span></div>' +
      '<div class="meta">Fam: ' + Math.round(f.familiarity * 100) + '% | Changes: ' + f.changeFrequency + ' | Risk: ' + f.risk.toFixed(2) + '</div></div>';
  }
  container.innerHTML = html;
}

// ══════════════════════════════════════
// ── MULTI-USER TAB ──
// ══════════════════════════════════════

function initMultiUserSelect() {
  const select = document.getElementById('userSelect');
  select.innerHTML = '';
  multiUserNames.forEach((name, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    const summary = multiUserSummaries[i];
    opt.textContent = name + ' (' + Math.round(summary.overallScore * 100) + '%)';
    select.appendChild(opt);
  });
}

function onUserChange() {
  currentUser = parseInt(document.getElementById('userSelect').value);
  renderMultiUser();
}

function getUserScore(node) {
  if (!node.userScores || node.userScores.length === 0) return node.score;
  const s = node.userScores[currentUser];
  return s ? s.score : 0;
}

function renderMultiUser() {
  const container = document.getElementById('tab-multiuser');
  container.innerHTML = '';
  const height = getContentHeight();
  const width = window.innerWidth;

  const targetNode = multiuserPath ? findNode(multiUserData, multiuserPath) : multiUserData;
  if (!targetNode || !targetNode.children || targetNode.children.length === 0) return;

  const hierarchyData = {
    name: targetNode.path || 'root',
    children: targetNode.children.map(c => buildHierarchy(c)),
  };

  const root = d3.hierarchy(hierarchyData)
    .sum(d => d.value || 0)
    .sort((a, b) => (b.value || 0) - (a.value || 0));

  d3.treemap().size([width, height]).padding(2).paddingTop(20).round(true)(root);

  const svg = d3.select('#tab-multiuser').append('svg').attr('width', width).attr('height', height);
  const nodes = root.descendants().filter(d => d.depth > 0);

  const groups = svg.selectAll('g').data(nodes).join('g')
    .attr('transform', d => 'translate(' + d.x0 + ',' + d.y0 + ')');

  groups.append('rect')
    .attr('width', d => Math.max(0, d.x1 - d.x0))
    .attr('height', d => Math.max(0, d.y1 - d.y0))
    .attr('fill', d => d.data.data ? scoreColor(getUserScore(d.data.data)) : '#333')
    .attr('opacity', d => d.children ? 0.35 : 0.88)
    .attr('stroke', '#1a1a2e').attr('stroke-width', d => d.children ? 1 : 0.5).attr('rx', 2)
    .style('cursor', d => (d.data.data && d.data.data.type === 'folder') ? 'pointer' : 'default')
    .on('click', (event, d) => {
      if (d.data.data && d.data.data.type === 'folder') { event.stopPropagation(); zoomTo(d.data.data.path); }
    })
    .on('mouseover', function(event, d) {
      if (!d.data.data) return;
      d3.select(this).attr('opacity', d.children ? 0.5 : 1).attr('stroke', '#fff');
      let html = '<strong>' + (d.data.data.path || 'root') + '</strong>';
      if (d.data.data.userScores && d.data.data.userScores.length > 0) {
        html += '<table style="margin-top:6px;width:100%">';
        d.data.data.userScores.forEach((s, i) => {
          const isCurrent = (i === currentUser);
          const style = isCurrent ? 'font-weight:bold;color:#5eadf7' : '';
          html += '<tr style="' + style + '"><td>' + multiUserNames[i] + '</td><td style="text-align:right">' + Math.round(s.score * 100) + '%</td></tr>';
        });
        html += '</table>';
      }
      if (d.data.data.type === 'folder') {
        html += '<br>Files: ' + d.data.data.fileCount;
        html += '<br><em style="color:#5eadf7">Click to drill down \\u25B6</em>';
      } else {
        html += '<br>Lines: ' + d.data.data.lines.toLocaleString();
      }
      showTooltipAt(html, event);
    })
    .on('mousemove', moveTooltip)
    .on('mouseout', function(event, d) {
      d3.select(this).attr('opacity', d.children ? 0.35 : 0.88).attr('stroke', '#1a1a2e');
      hideTooltip();
    });

  groups.append('text')
    .attr('x', 4).attr('y', 14).attr('fill', '#fff')
    .attr('font-size', d => d.children ? '11px' : '10px')
    .attr('font-weight', d => d.children ? 'bold' : 'normal')
    .style('pointer-events', 'none')
    .text(d => truncateLabel(d.data.name || '', d.x1 - d.x0, d.y1 - d.y0));
}

// ── Init ──
rendered.scoring = true;
renderScoring();
window.addEventListener('resize', () => {
  if (activeTab === 'scoring') renderScoring();
  else if (activeTab === 'coverage') renderCoverage();
  else if (activeTab === 'hotspots') renderHotspot();
  else if (activeTab === 'multiuser') renderMultiUser();
});
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
