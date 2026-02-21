import { writeFileSync } from "node:fs";
import { join } from "node:path";
import type { FamiliarityResult } from "../../core/familiarity.js";
import { openBrowser } from "../../utils/open-browser.js";

function generateTreemapHTML(result: FamiliarityResult): string {
  const dataJson = JSON.stringify(result.tree);
  const mode = result.mode;
  const repoName = result.repoName;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>GitFamiliar \u2014 ${repoName}</title>
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

  #treemap { width: 100%; }
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
    max-width: 300px;
  }
  #legend {
    position: absolute;
    bottom: 16px;
    right: 16px;
    background: rgba(22, 33, 62, 0.9);
    border: 1px solid #0f3460;
    border-radius: 6px;
    padding: 10px;
    font-size: 12px;
  }
  #legend .gradient-bar {
    width: 120px;
    height: 12px;
    background: linear-gradient(to right, #e94560, #f5a623, #27ae60);
    border-radius: 3px;
    margin: 4px 0;
  }
  #legend .labels { display: flex; justify-content: space-between; font-size: 10px; color: #888; }
</style>
</head>
<body>
<div id="header">
  <h1>GitFamiliar \u2014 ${repoName}</h1>
  <div class="info">${mode.charAt(0).toUpperCase() + mode.slice(1)} mode | ${result.totalFiles} files</div>
</div>
<div id="breadcrumb"><span onclick="zoomTo('')">root</span></div>

<div id="treemap"></div>
<div id="tooltip"></div>
<div id="legend">
  <div>Familiarity</div>
  <div class="gradient-bar"></div>
  <div class="labels"><span>0%</span><span>50%</span><span>100%</span></div>
</div>

<script src="https://d3js.org/d3.v7.min.js"></script>
<script>
const rawData = ${dataJson};
const mode = "${mode}";
let currentPath = '';

function scoreColor(score) {
  if (score <= 0) return '#e94560';
  if (score >= 1) return '#27ae60';
  if (score < 0.5) {
    const t = score / 0.5;
    return d3.interpolateRgb('#e94560', '#f5a623')(t);
  }
  const t = (score - 0.5) / 0.5;
  return d3.interpolateRgb('#f5a623', '#27ae60')(t);
}

function getNodeScore(node) {
  return node.score;
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

function totalLines(node) {
  if (node.type === 'file') return Math.max(1, node.lines);
  if (!node.children) return 1;
  let sum = 0;
  for (const c of node.children) sum += totalLines(c);
  return Math.max(1, sum);
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
  const width = window.innerWidth;
  const height = window.innerHeight - headerH - breadcrumbH;

  const targetNode = currentPath ? findNode(rawData, currentPath) : rawData;
  if (!targetNode) return;

  const children = targetNode.children || [];
  if (children.length === 0) return;

  // Build full nested hierarchy from the current target
  const hierarchyData = {
    name: targetNode.path || 'root',
    children: children.map(c => buildHierarchy(c)),
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

  // Rect
  groups.append('rect')
    .attr('width', d => Math.max(0, d.x1 - d.x0))
    .attr('height', d => Math.max(0, d.y1 - d.y0))
    .attr('fill', d => {
      if (!d.data.data) return '#333';
      return scoreColor(getNodeScore(d.data.data));
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

  // Labels
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
  const name = data.path || '';
  const score = getNodeScore(data);
  let html = '<strong>' + name + '</strong>';
  html += '<br>Score: ' + Math.round(score * 100) + '%';
  html += '<br>Lines: ' + data.lines.toLocaleString();
  if (data.type === 'folder') {
    html += '<br>Files: ' + data.fileCount;
    html += '<br><em style="color:#5eadf7">Click to drill down \\u25B6</em>';
  }
  if (data.blameScore !== undefined) {
    html += '<br>Blame: ' + Math.round(data.blameScore * 100) + '%';
  }
  if (data.commitScore !== undefined) {
    html += '<br>Commit: ' + Math.round(data.commitScore * 100) + '%';
  }

  if (data.isExpired) {
    html += '<br><span style="color:#e94560">Expired</span>';
  }
  tooltip.innerHTML = html;
  tooltip.style.display = 'block';
  tooltip.style.left = (event.pageX + 14) + 'px';
  tooltip.style.top = (event.pageY - 14) + 'px';
}

function zoomTo(path) {
  currentPath = path;
  updateBreadcrumb();
  render();
}

function updateBreadcrumb() {
  const el = document.getElementById('breadcrumb');
  const parts = currentPath ? currentPath.split('/') : [];
  let html = '<span onclick="zoomTo(\\'\\')">root</span>';
  let accumulated = '';
  for (const part of parts) {
    accumulated = accumulated ? accumulated + '/' + part : part;
    const p = accumulated;
    html += \`<span class="sep">/</span><span onclick="zoomTo('\${p}')">\${part}</span>\`;
  }
  el.innerHTML = html;
}

window.addEventListener('resize', render);
render();
</script>
</body>
</html>`;
}

export async function generateAndOpenHTML(
  result: FamiliarityResult,
  repoPath: string,
): Promise<void> {
  const html = generateTreemapHTML(result);
  const outputPath = join(repoPath, "gitfamiliar-report.html");

  writeFileSync(outputPath, html, "utf-8");
  console.log(`Report generated: ${outputPath}`);

  await openBrowser(outputPath);
}
