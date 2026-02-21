import { writeFileSync } from "node:fs";
import { join } from "node:path";
import type { TeamCoverageResult } from "../../core/types.js";
import { openBrowser } from "../../utils/open-browser.js";

function generateCoverageHTML(result: TeamCoverageResult): string {
  const dataJson = JSON.stringify(result.tree);
  const riskFilesJson = JSON.stringify(result.riskFiles);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>GitFamiliar \u2014 Team Coverage \u2014 ${result.repoName}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #1a1a2e;
    color: #e0e0e0;
    overflow: hidden;
  }
  #header {
    padding: 16px 24px;
    background: #16213e;
    border-bottom: 1px solid #0f3460;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  #header h1 { font-size: 18px; color: #e94560; }
  #header .info { font-size: 14px; color: #a0a0a0; }
  #breadcrumb {
    padding: 8px 24px;
    background: #16213e;
    font-size: 13px;
    border-bottom: 1px solid #0f3460;
  }
  #breadcrumb span { cursor: pointer; color: #5eadf7; }
  #breadcrumb span:hover { text-decoration: underline; }
  #breadcrumb .sep { color: #666; margin: 0 4px; }
  #main { display: flex; height: calc(100vh - 90px); }
  #treemap { flex: 1; }
  #sidebar {
    width: 300px;
    background: #16213e;
    border-left: 1px solid #0f3460;
    overflow-y: auto;
    padding: 16px;
  }
  #sidebar h3 { font-size: 14px; margin-bottom: 12px; color: #e94560; }
  #sidebar .risk-file {
    padding: 6px 0;
    border-bottom: 1px solid #0f3460;
    font-size: 12px;
  }
  #sidebar .risk-file .path { color: #e0e0e0; word-break: break-all; }
  #sidebar .risk-file .meta { color: #888; margin-top: 2px; }
  #tooltip {
    position: absolute;
    pointer-events: none;
    background: rgba(22, 33, 62, 0.95);
    border: 1px solid #0f3460;
    border-radius: 6px;
    padding: 10px 14px;
    font-size: 13px;
    line-height: 1.6;
    display: none;
    z-index: 100;
    max-width: 320px;
  }
  #legend {
    position: absolute;
    bottom: 16px;
    left: 16px;
    background: rgba(22, 33, 62, 0.9);
    border: 1px solid #0f3460;
    border-radius: 6px;
    padding: 10px;
    font-size: 12px;
  }
  #legend .row { display: flex; align-items: center; gap: 6px; margin: 3px 0; }
  #legend .swatch { width: 14px; height: 14px; border-radius: 3px; }
</style>
</head>
<body>
<div id="header">
  <h1>GitFamiliar \u2014 Team Coverage \u2014 ${result.repoName}</h1>
  <div class="info">${result.totalFiles} files | ${result.totalContributors} contributors | Bus Factor: ${result.overallBusFactor}</div>
</div>
<div id="breadcrumb"><span onclick="zoomTo('')">root</span></div>
<div id="main">
  <div id="treemap"></div>
  <div id="sidebar">
    <h3>Risk Files (0-1 contributors)</h3>
    <div id="risk-list"></div>
  </div>
</div>
<div id="tooltip"></div>
<div id="legend">
  <div>Contributors</div>
  <div class="row"><div class="swatch" style="background:#e94560"></div> 0\u20131 (Risk)</div>
  <div class="row"><div class="swatch" style="background:#f5a623"></div> 2\u20133 (Moderate)</div>
  <div class="row"><div class="swatch" style="background:#27ae60"></div> 4+ (Safe)</div>
</div>

<script src="https://d3js.org/d3.v7.min.js"></script>
<script>
const rawData = ${dataJson};
const riskFiles = ${riskFilesJson};
let currentPath = '';

function coverageColor(count) {
  if (count <= 0) return '#e94560';
  if (count === 1) return '#d63c57';
  if (count <= 3) return '#f5a623';
  return '#27ae60';
}

function folderColor(riskLevel) {
  switch (riskLevel) {
    case 'risk': return '#e94560';
    case 'moderate': return '#f5a623';
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

function render() {
  const container = document.getElementById('treemap');
  container.innerHTML = '';

  const headerH = document.getElementById('header').offsetHeight;
  const breadcrumbH = document.getElementById('breadcrumb').offsetHeight;
  const width = container.offsetWidth;
  const height = window.innerHeight - headerH - breadcrumbH;

  const targetNode = currentPath ? findNode(rawData, currentPath) : rawData;
  if (!targetNode || !targetNode.children || targetNode.children.length === 0) return;

  const hierarchyData = {
    name: targetNode.path || 'root',
    children: targetNode.children.map(c => buildHierarchy(c)),
  };

  const root = d3.hierarchy(hierarchyData)
    .sum(d => d.value || 0)
    .sort((a, b) => (b.value || 0) - (a.value || 0));

  d3.treemap()
    .size([width, height])
    .padding(2)
    .paddingTop(20)
    .round(true)(root);

  const svg = d3.select('#treemap')
    .append('svg')
    .attr('width', width)
    .attr('height', height);

  const tooltip = document.getElementById('tooltip');
  const nodes = root.descendants().filter(d => d.depth > 0);

  const groups = svg.selectAll('g')
    .data(nodes)
    .join('g')
    .attr('transform', d => \`translate(\${d.x0},\${d.y0})\`);

  groups.append('rect')
    .attr('width', d => Math.max(0, d.x1 - d.x0))
    .attr('height', d => Math.max(0, d.y1 - d.y0))
    .attr('fill', d => {
      if (!d.data.data) return '#333';
      if (d.data.data.type === 'file') return coverageColor(d.data.data.contributorCount);
      return folderColor(d.data.data.riskLevel);
    })
    .attr('opacity', d => d.children ? 0.35 : 0.88)
    .attr('stroke', '#1a1a2e')
    .attr('stroke-width', d => d.children ? 1 : 0.5)
    .attr('rx', 2)
    .style('cursor', d => (d.data.data && d.data.data.type === 'folder') ? 'pointer' : 'default')
    .on('click', (event, d) => {
      if (d.data.data && d.data.data.type === 'folder') {
        event.stopPropagation();
        zoomTo(d.data.data.path);
      }
    })
    .on('mouseover', function(event, d) {
      if (!d.data.data) return;
      d3.select(this).attr('opacity', d.children ? 0.5 : 1).attr('stroke', '#fff');
      showTooltip(d.data.data, event);
    })
    .on('mousemove', (event) => {
      tooltip.style.left = (event.pageX + 14) + 'px';
      tooltip.style.top = (event.pageY - 14) + 'px';
    })
    .on('mouseout', function(event, d) {
      d3.select(this).attr('opacity', d.children ? 0.35 : 0.88).attr('stroke', '#1a1a2e');
      tooltip.style.display = 'none';
    });

  groups.append('text')
    .attr('x', 4)
    .attr('y', 14)
    .attr('fill', '#fff')
    .attr('font-size', d => d.children ? '11px' : '10px')
    .attr('font-weight', d => d.children ? 'bold' : 'normal')
    .style('pointer-events', 'none')
    .text(d => {
      const w = d.x1 - d.x0;
      const h = d.y1 - d.y0;
      const name = d.data.name || '';
      if (w < 36 || h < 18) return '';
      const maxChars = Math.floor((w - 8) / 6.5);
      if (name.length > maxChars) return name.slice(0, maxChars - 1) + '\\u2026';
      return name;
    });
}

function showTooltip(data, event) {
  const tooltip = document.getElementById('tooltip');
  let html = '<strong>' + data.path + '</strong>';
  if (data.type === 'file') {
    html += '<br>Contributors: ' + data.contributorCount;
    if (data.contributors.length > 0) {
      html += '<br>' + data.contributors.slice(0, 8).join(', ');
      if (data.contributors.length > 8) html += ', ...';
    }
    html += '<br>Lines: ' + data.lines.toLocaleString();
  } else {
    html += '<br>Files: ' + data.fileCount;
    html += '<br>Avg Contributors: ' + data.avgContributors;
    html += '<br>Bus Factor: ' + data.busFactor;
    html += '<br><em style="color:#5eadf7">Click to drill down \\u25B6</em>';
  }
  tooltip.innerHTML = html;
  tooltip.style.display = 'block';
  tooltip.style.left = (event.pageX + 14) + 'px';
  tooltip.style.top = (event.pageY - 14) + 'px';
}

function zoomTo(path) {
  currentPath = path;
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
  render();
}

// Render risk sidebar
function renderRiskSidebar() {
  const container = document.getElementById('risk-list');
  if (riskFiles.length === 0) {
    container.innerHTML = '<div style="color:#888">No high-risk files found.</div>';
    return;
  }
  let html = '';
  for (const f of riskFiles.slice(0, 50)) {
    const countLabel = f.contributorCount === 0 ? '0 people' : '1 person (' + f.contributors[0] + ')';
    html += '<div class="risk-file"><div class="path">' + f.path + '</div><div class="meta">' + countLabel + '</div></div>';
  }
  if (riskFiles.length > 50) {
    html += '<div style="color:#888;padding:8px 0">... and ' + (riskFiles.length - 50) + ' more</div>';
  }
  container.innerHTML = html;
}

window.addEventListener('resize', render);
renderRiskSidebar();
render();
</script>
</body>
</html>`;
}

export async function generateAndOpenCoverageHTML(
  result: TeamCoverageResult,
  repoPath: string,
): Promise<void> {
  const html = generateCoverageHTML(result);
  const outputPath = join(repoPath, "gitfamiliar-coverage.html");
  writeFileSync(outputPath, html, "utf-8");
  console.log(`Coverage report generated: ${outputPath}`);
  await openBrowser(outputPath);
}
