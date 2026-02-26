/** Client-side JavaScript for the unified HTML dashboard */
export function getUnifiedScripts(): string {
  return `
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
});`;
}
