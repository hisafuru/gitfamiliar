/** CSS styles for the unified HTML dashboard */
export function getUnifiedStyles(): string {
  return `
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
  }`;
}
