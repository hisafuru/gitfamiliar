import { writeFileSync } from "node:fs";
import { join } from "node:path";
import type { MultiUserResult } from "../../core/types.js";
import { openBrowser } from "../../utils/open-browser.js";
import {
  getBaseStyles,
  getBreadcrumbStyles,
  getGradientLegendStyles,
  getTreemapUtilsScript,
  getScoreColorScript,
} from "./html-shared.js";

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
  ${getBaseStyles()}
  ${getBreadcrumbStyles()}
  #header .controls { display: flex; align-items: center; gap: 12px; }
  #header select {
    padding: 4px 12px;
    border: 1px solid #0f3460;
    background: #1a1a2e;
    color: #e0e0e0;
    border-radius: 4px;
    font-size: 13px;
  }
  #treemap { width: 100%; }
  ${getGradientLegendStyles()}
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

${getScoreColorScript()}

function getUserScore(node) {
  if (!node.userScores || node.userScores.length === 0) return node.score;
  const s = node.userScores[currentUser];
  return s ? s.score : 0;
}

${getTreemapUtilsScript()}

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
    .text(d => truncateLabel(d.data.name || '', d.x1 - d.x0, d.y1 - d.y0));
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
