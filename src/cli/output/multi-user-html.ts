import { writeFileSync } from "node:fs";
import { join } from "node:path";
import type { MultiUserResult } from "../../core/types.js";
import { openBrowser } from "../../utils/open-browser.js";

function generateMultiUserHTML(result: MultiUserResult): string {
  const dataJson = JSON.stringify(result.tree);
  const summariesJson = JSON.stringify(result.userSummaries);
  const usersJson = JSON.stringify(result.users.map((u) => u.name));

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>GitFamiliar \u2014 ${result.repoName} \u2014 Multi-User</title>
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
  #header .controls { display: flex; align-items: center; gap: 12px; }
  #header select {
    padding: 4px 12px;
    border: 1px solid #0f3460;
    background: #1a1a2e;
    color: #e0e0e0;
    border-radius: 4px;
    font-size: 13px;
  }
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
    max-width: 350px;
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
    width: 120px; height: 12px;
    background: linear-gradient(to right, #e94560, #f5a623, #27ae60);
    border-radius: 3px; margin: 4px 0;
  }
  #legend .labels { display: flex; justify-content: space-between; font-size: 10px; color: #888; }
</style>
</head>
<body>
<div id="header">
  <h1>GitFamiliar \u2014 ${result.repoName}</h1>
  <div class="controls">
    <span style="color:#888;font-size:13px;">View as:</span>
    <select id="userSelect" onchange="changeUser()"></select>
    <div class="info">${result.mode} mode | ${result.totalFiles} files</div>
  </div>
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
const userNames = ${usersJson};
const summaries = ${summariesJson};
let currentUser = 0;
let currentPath = '';

// Populate user selector
const select = document.getElementById('userSelect');
userNames.forEach((name, i) => {
  const opt = document.createElement('option');
  opt.value = i;
  const summary = summaries[i];
  opt.textContent = name + ' (' + Math.round(summary.overallScore * 100) + '%)';
  select.appendChild(opt);
});

function changeUser() {
  currentUser = parseInt(select.value);
  render();
}

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

function getUserScore(node) {
  if (!node.userScores || node.userScores.length === 0) return node.score;
  const s = node.userScores[currentUser];
  return s ? s.score : 0;
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
  const width = window.innerWidth;
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
      return scoreColor(getUserScore(d.data.data));
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
  let html = '<strong>' + (data.path || 'root') + '</strong>';

  if (data.userScores && data.userScores.length > 0) {
    html += '<table style="margin-top:6px;width:100%">';
    data.userScores.forEach((s, i) => {
      const isCurrent = (i === currentUser);
      const style = isCurrent ? 'font-weight:bold;color:#5eadf7' : '';
      html += '<tr style="' + style + '"><td>' + userNames[i] + '</td><td style="text-align:right">' + Math.round(s.score * 100) + '%</td></tr>';
    });
    html += '</table>';
  }

  if (data.type === 'folder') {
    html += '<br>Files: ' + data.fileCount;
    html += '<br><em style="color:#5eadf7">Click to drill down \\u25B6</em>';
  } else {
    html += '<br>Lines: ' + data.lines.toLocaleString();
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

window.addEventListener('resize', render);
render();
</script>
</body>
</html>`;
}

export async function generateAndOpenMultiUserHTML(
  result: MultiUserResult,
  repoPath: string,
): Promise<void> {
  const html = generateMultiUserHTML(result);
  const outputPath = join(repoPath, "gitfamiliar-multiuser.html");
  writeFileSync(outputPath, html, "utf-8");
  console.log(`Multi-user report generated: ${outputPath}`);
  await openBrowser(outputPath);
}
