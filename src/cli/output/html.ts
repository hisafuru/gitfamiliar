import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { FamiliarityResult } from '../../core/familiarity.js';
import { openBrowser } from '../../utils/open-browser.js';

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
  #controls {
    padding: 8px 24px;
    background: #16213e;
    border-bottom: 1px solid #0f3460;
    display: flex;
    gap: 12px;
    align-items: center;
  }
  #controls button {
    padding: 4px 12px;
    border: 1px solid #0f3460;
    background: #1a1a2e;
    color: #e0e0e0;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
  }
  #controls button.active {
    background: #e94560;
    border-color: #e94560;
    color: white;
  }
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
${mode === 'binary' ? `
<div id="controls">
  <span style="font-size:12px;color:#888;">Filter:</span>
  <button class="active" onclick="setFilter('all')">All</button>
  <button onclick="setFilter('written')">Written only</button>
  <button onclick="setFilter('reviewed')">Reviewed only</button>
</div>` : ''}
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
let currentFilter = 'all';
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

function getFileScore(file) {
  if (mode !== 'binary') return file.score;
  if (currentFilter === 'written') return file.isWritten ? 1 : 0;
  if (currentFilter === 'reviewed') return file.isReviewed ? 1 : 0;
  return file.score;
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

function flattenFiles(node) {
  const files = [];
  function walk(n) {
    if (n.type === 'file') {
      files.push(n);
    } else if (n.children) {
      n.children.forEach(walk);
    }
  }
  walk(node);
  return files;
}

function render() {
  const container = document.getElementById('treemap');
  container.innerHTML = '';

  const headerH = document.getElementById('header').offsetHeight;
  const breadcrumbH = document.getElementById('breadcrumb').offsetHeight;
  const controlsEl = document.getElementById('controls');
  const controlsH = controlsEl ? controlsEl.offsetHeight : 0;
  const width = window.innerWidth;
  const height = window.innerHeight - headerH - breadcrumbH - controlsH;

  const targetNode = currentPath ? findNode(rawData, currentPath) : rawData;
  if (!targetNode) return;

  const hierarchyData = {
    name: targetNode.path || 'root',
    children: (targetNode.children || []).map(function buildChild(c) {
      if (c.type === 'file') {
        return { name: c.path.split('/').pop(), data: c, value: Math.max(1, c.lines) };
      }
      return {
        name: c.path.split('/').pop(),
        data: c,
        children: (c.children || []).map(buildChild),
      };
    }),
  };

  const root = d3.hierarchy(hierarchyData)
    .sum(d => d.value || 0)
    .sort((a, b) => (b.value || 0) - (a.value || 0));

  d3.treemap()
    .size([width, height])
    .padding(2)
    .paddingTop(18)
    .round(true)(root);

  const svg = d3.select('#treemap')
    .append('svg')
    .attr('width', width)
    .attr('height', height);

  const tooltip = document.getElementById('tooltip');

  // Draw groups (folders)
  const groups = svg.selectAll('g')
    .data(root.descendants().filter(d => d.depth > 0))
    .join('g')
    .attr('transform', d => \`translate(\${d.x0},\${d.y0})\`);

  groups.append('rect')
    .attr('width', d => Math.max(0, d.x1 - d.x0))
    .attr('height', d => Math.max(0, d.y1 - d.y0))
    .attr('fill', d => {
      if (d.data.data) {
        const score = d.children ? d.data.data.score : getFileScore(d.data.data);
        return scoreColor(score);
      }
      return '#333';
    })
    .attr('opacity', d => d.children ? 0.3 : 0.85)
    .attr('stroke', '#1a1a2e')
    .attr('stroke-width', 1)
    .attr('rx', 2)
    .style('cursor', d => d.children ? 'pointer' : 'default')
    .on('click', (event, d) => {
      if (d.children && d.data.data && d.data.data.type === 'folder') {
        zoomTo(d.data.data.path);
      }
    })
    .on('mouseover', (event, d) => {
      if (!d.data.data) return;
      const data = d.data.data;
      const name = data.path || d.data.name;
      const score = d.children ? data.score : getFileScore(data);
      let html = \`<strong>\${name}</strong><br>Score: \${Math.round(score * 100)}%<br>Lines: \${data.lines}\`;
      if (data.type === 'folder') {
        html += \`<br>Files: \${data.fileCount}\`;
      }
      if (data.blameScore !== undefined) {
        html += \`<br>Blame: \${Math.round(data.blameScore * 100)}%\`;
      }
      if (data.commitScore !== undefined) {
        html += \`<br>Commit: \${Math.round(data.commitScore * 100)}%\`;
      }
      if (data.reviewScore !== undefined) {
        html += \`<br>Review: \${Math.round(data.reviewScore * 100)}%\`;
      }
      tooltip.innerHTML = html;
      tooltip.style.display = 'block';
    })
    .on('mousemove', (event) => {
      tooltip.style.left = (event.pageX + 12) + 'px';
      tooltip.style.top = (event.pageY - 12) + 'px';
    })
    .on('mouseout', () => {
      tooltip.style.display = 'none';
    });

  // Labels
  groups.append('text')
    .attr('x', 4)
    .attr('y', 13)
    .attr('fill', '#fff')
    .attr('font-size', '11px')
    .attr('font-weight', d => d.children ? 'bold' : 'normal')
    .text(d => {
      const w = (d.x1 - d.x0);
      const name = d.data.name || '';
      if (w < 40) return '';
      if (w < name.length * 7) return name.slice(0, Math.floor(w / 7)) + '..';
      return name;
    });
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

function setFilter(f) {
  currentFilter = f;
  document.querySelectorAll('#controls button').forEach(btn => {
    btn.classList.toggle('active', btn.textContent.toLowerCase().includes(f));
  });
  render();
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
  const outputPath = join(repoPath, 'gitfamiliar-report.html');

  writeFileSync(outputPath, html, 'utf-8');
  console.log(`Report generated: ${outputPath}`);

  await openBrowser(outputPath);
}
