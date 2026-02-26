/**
 * Shared CSS and JS snippets for standalone HTML report generators.
 * These are embedded inline in generated HTML files.
 */

/** Base CSS styles shared across all standalone HTML reports */
export function getBaseStyles(): string {
  return `
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
  }`;
}

/** Breadcrumb CSS (used by treemap reports, not hotspot) */
export function getBreadcrumbStyles(): string {
  return `
  #breadcrumb {
    padding: 8px 24px;
    background: #16213e;
    font-size: 13px;
    border-bottom: 1px solid #0f3460;
  }
  #breadcrumb span { cursor: pointer; color: #5eadf7; }
  #breadcrumb span:hover { text-decoration: underline; }
  #breadcrumb .sep { color: #666; margin: 0 4px; }`;
}

/** Legend CSS with gradient bar (scoring, multi-user) */
export function getGradientLegendStyles(): string {
  return `
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
  #legend .labels { display: flex; justify-content: space-between; font-size: 10px; color: #888; }`;
}

/** Sidebar CSS (coverage, hotspot) */
export function getSidebarStyles(): string {
  return `
  #main { display: flex; height: calc(100vh - 90px); }
  #sidebar {
    width: 300px;
    background: #16213e;
    border-left: 1px solid #0f3460;
    overflow-y: auto;
    padding: 16px;
  }
  #sidebar h3 { font-size: 14px; margin-bottom: 12px; color: #e94560; }`;
}

/**
 * Shared JS functions for treemap-based reports: findNode, buildHierarchy,
 * truncateLabel, zoomTo, updateBreadcrumb.
 */
export function getTreemapUtilsScript(): string {
  return `
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

function truncateLabel(name, w, h) {
  if (w < 36 || h < 18) return '';
  const maxChars = Math.floor((w - 8) / 6.5);
  if (name.length > maxChars) return name.slice(0, maxChars - 1) + '\\u2026';
  return name;
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
}`;
}

/** scoreColor JS function (red-orange-green gradient via d3) */
export function getScoreColorScript(): string {
  return `
function scoreColor(score) {
  if (score <= 0) return '#e94560';
  if (score >= 1) return '#27ae60';
  if (score < 0.5) {
    const t = score / 0.5;
    return d3.interpolateRgb('#e94560', '#f5a623')(t);
  }
  const t = (score - 0.5) / 0.5;
  return d3.interpolateRgb('#f5a623', '#27ae60')(t);
}`;
}
