import { writeFileSync } from "node:fs";
import { join } from "node:path";
import type { FamiliarityResult } from "../../core/familiarity.js";
import { openBrowser } from "../../utils/open-browser.js";
import {
  getBaseStyles,
  getBreadcrumbStyles,
  getGradientLegendStyles,
  getTreemapUtilsScript,
  getScoreColorScript,
} from "./html-shared.js";

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
  ${getBaseStyles()}
  ${getBreadcrumbStyles()}
  #treemap { width: 100%; }
  ${getGradientLegendStyles()}
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

${getScoreColorScript()}
${getTreemapUtilsScript()}

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

  groups.append('rect')
    .attr('width', d => Math.max(0, d.x1 - d.x0))
    .attr('height', d => Math.max(0, d.y1 - d.y0))
    .attr('fill', d => {
      if (!d.data.data) return '#333';
      return scoreColor(d.data.data.score);
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
  const name = data.path || '';
  const score = data.score;
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
