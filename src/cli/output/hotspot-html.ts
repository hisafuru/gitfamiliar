import { writeFileSync } from "node:fs";
import { join } from "node:path";
import type { HotspotResult } from "../../core/types.js";
import { openBrowser } from "../../utils/open-browser.js";

function generateHotspotHTML(result: HotspotResult): string {
  // Only include files with activity for the scatter plot
  const activeFiles = result.files.filter((f) => f.changeFrequency > 0);
  const dataJson = JSON.stringify(
    activeFiles.map((f) => ({
      path: f.path,
      lines: f.lines,
      familiarity: f.familiarity,
      changeFrequency: f.changeFrequency,
      risk: f.risk,
      riskLevel: f.riskLevel,
    })),
  );

  const modeLabel =
    result.hotspotMode === "team" ? "Team Hotspots" : "Personal Hotspots";
  const userLabel = result.userName ? ` (${result.userName})` : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>GitFamiliar \u2014 ${modeLabel} \u2014 ${result.repoName}</title>
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
  #main { display: flex; height: calc(100vh - 60px); }
  #chart { flex: 1; position: relative; }
  #sidebar {
    width: 320px;
    background: #16213e;
    border-left: 1px solid #0f3460;
    overflow-y: auto;
    padding: 16px;
  }
  #sidebar h3 { font-size: 14px; margin-bottom: 12px; color: #e94560; }
  .hotspot-item {
    padding: 8px 0;
    border-bottom: 1px solid #0f3460;
    font-size: 12px;
  }
  .hotspot-item .path { color: #e0e0e0; word-break: break-all; }
  .hotspot-item .meta { color: #888; margin-top: 2px; }
  .hotspot-item .risk-badge {
    display: inline-block;
    padding: 1px 6px;
    border-radius: 3px;
    font-size: 10px;
    font-weight: bold;
    margin-left: 4px;
  }
  .risk-critical { background: #e94560; color: white; }
  .risk-high { background: #f07040; color: white; }
  .risk-medium { background: #f5a623; color: black; }
  .risk-low { background: #27ae60; color: white; }
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
  #zone-labels { position: absolute; pointer-events: none; }
  .zone-label {
    position: absolute;
    font-size: 12px;
    color: rgba(255,255,255,0.15);
    font-weight: bold;
  }
</style>
</head>
<body>
<div id="header">
  <h1>GitFamiliar \u2014 ${modeLabel}${userLabel} \u2014 ${result.repoName}</h1>
  <div class="info">${result.timeWindow}-day window | ${activeFiles.length} active files | Summary: ${result.summary.critical} critical, ${result.summary.high} high</div>
</div>
<div id="main">
  <div id="chart">
    <div id="zone-labels"></div>
  </div>
  <div id="sidebar">
    <h3>Top Hotspots</h3>
    <div id="hotspot-list"></div>
  </div>
</div>
<div id="tooltip"></div>

<script src="https://d3js.org/d3.v7.min.js"></script>
<script>
const data = ${dataJson};
const margin = { top: 30, right: 30, bottom: 60, left: 70 };

function riskColor(level) {
  switch(level) {
    case 'critical': return '#e94560';
    case 'high': return '#f07040';
    case 'medium': return '#f5a623';
    default: return '#27ae60';
  }
}

function render() {
  const container = document.getElementById('chart');
  const svg = container.querySelector('svg');
  if (svg) svg.remove();

  const width = container.offsetWidth;
  const height = container.offsetHeight;
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const maxFreq = d3.max(data, d => d.changeFrequency) || 1;

  const x = d3.scaleLinear().domain([0, 1]).range([0, innerW]);
  const y = d3.scaleLinear().domain([0, maxFreq * 1.1]).range([innerH, 0]);
  const r = d3.scaleSqrt()
    .domain([0, d3.max(data, d => d.lines) || 1])
    .range([3, 20]);

  const svgEl = d3.select('#chart')
    .append('svg')
    .attr('width', width)
    .attr('height', height);

  const g = svgEl.append('g')
    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

  // Danger zone background (top-left quadrant)
  g.append('rect')
    .attr('x', 0)
    .attr('y', 0)
    .attr('width', x(0.3))
    .attr('height', y(maxFreq * 0.3))
    .attr('fill', 'rgba(233, 69, 96, 0.06)');

  // X axis
  g.append('g')
    .attr('transform', 'translate(0,' + innerH + ')')
    .call(d3.axisBottom(x).ticks(5).tickFormat(d => Math.round(d * 100) + '%'))
    .selectAll('text,line,path').attr('stroke', '#555').attr('fill', '#888');

  svgEl.append('text')
    .attr('x', margin.left + innerW / 2)
    .attr('y', height - 10)
    .attr('text-anchor', 'middle')
    .attr('fill', '#888')
    .attr('font-size', '13px')
    .text('Familiarity \\u2192');

  // Y axis
  g.append('g')
    .call(d3.axisLeft(y).ticks(6))
    .selectAll('text,line,path').attr('stroke', '#555').attr('fill', '#888');

  svgEl.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -(margin.top + innerH / 2))
    .attr('y', 16)
    .attr('text-anchor', 'middle')
    .attr('fill', '#888')
    .attr('font-size', '13px')
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
  dangerLabel.style.fontSize = '16px';
  labels.appendChild(dangerLabel);

  const safeLabel = document.createElement('div');
  safeLabel.className = 'zone-label';
  safeLabel.style.right = (320 + 40) + 'px';
  safeLabel.style.bottom = (margin.bottom + 16) + 'px';
  safeLabel.textContent = 'SAFE ZONE';
  safeLabel.style.color = 'rgba(39,174,96,0.2)';
  safeLabel.style.fontSize = '16px';
  labels.appendChild(safeLabel);

  const tooltip = document.getElementById('tooltip');

  // Data points
  g.selectAll('circle')
    .data(data)
    .join('circle')
    .attr('cx', d => x(d.familiarity))
    .attr('cy', d => y(d.changeFrequency))
    .attr('r', d => r(d.lines))
    .attr('fill', d => riskColor(d.riskLevel))
    .attr('opacity', 0.7)
    .attr('stroke', 'none')
    .style('cursor', 'pointer')
    .on('mouseover', function(event, d) {
      d3.select(this).attr('opacity', 1).attr('stroke', '#fff').attr('stroke-width', 2);
      tooltip.innerHTML =
        '<strong>' + d.path + '</strong>' +
        '<br>Familiarity: ' + Math.round(d.familiarity * 100) + '%' +
        '<br>Changes: ' + d.changeFrequency + ' commits' +
        '<br>Risk: ' + d.risk.toFixed(2) + ' (' + d.riskLevel + ')' +
        '<br>Lines: ' + d.lines.toLocaleString();
      tooltip.style.display = 'block';
      tooltip.style.left = (event.pageX + 14) + 'px';
      tooltip.style.top = (event.pageY - 14) + 'px';
    })
    .on('mousemove', (event) => {
      tooltip.style.left = (event.pageX + 14) + 'px';
      tooltip.style.top = (event.pageY - 14) + 'px';
    })
    .on('mouseout', function() {
      d3.select(this).attr('opacity', 0.7).attr('stroke', 'none');
      tooltip.style.display = 'none';
    });
}

// Sidebar
function renderSidebar() {
  const container = document.getElementById('hotspot-list');
  const top = data.slice(0, 30);
  if (top.length === 0) {
    container.innerHTML = '<div style="color:#888">No active files in time window.</div>';
    return;
  }
  let html = '';
  for (let i = 0; i < top.length; i++) {
    const f = top[i];
    const badgeClass = 'risk-' + f.riskLevel;
    html += '<div class="hotspot-item">' +
      '<div class="path">' + (i + 1) + '. ' + f.path +
      ' <span class="risk-badge ' + badgeClass + '">' + f.riskLevel.toUpperCase() + '</span></div>' +
      '<div class="meta">Fam: ' + Math.round(f.familiarity * 100) + '% | Changes: ' + f.changeFrequency + ' | Risk: ' + f.risk.toFixed(2) + '</div>' +
      '</div>';
  }
  container.innerHTML = html;
}

window.addEventListener('resize', render);
renderSidebar();
render();
</script>
</body>
</html>`;
}

export async function generateAndOpenHotspotHTML(
  result: HotspotResult,
  repoPath: string,
): Promise<void> {
  const html = generateHotspotHTML(result);
  const outputPath = join(repoPath, "gitfamiliar-hotspot.html");
  writeFileSync(outputPath, html, "utf-8");
  console.log(`Hotspot report generated: ${outputPath}`);
  await openBrowser(outputPath);
}
