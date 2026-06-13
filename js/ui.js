/* =====================================================================
 * ui.js — builds and updates the heads-up display: status bar, tool
 * palette, time controls, overlay switcher, data graphs, model controls,
 * tile inspector and event log. Designed for large touch targets.
 * ===================================================================== */
(function (global) {
  'use strict';
  const GAIA = global.GAIA || (global.GAIA = {});
  const { TIMESCALES, SPEEDS, OVERLAYS, BIOME, LIFE_BY_ID, TECH } = GAIA;
  const U = GAIA.util;

  const $ = sel => document.querySelector(sel);
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };

  class UI {
    constructor(game, renderer) {
      this.game = game; this.r = renderer;
      this.currentTool = GAIA.tools.toolById('examine');
      this.buildToolbar();
      this.buildTimeBar();
      this.buildOverlayBar();
      this.buildModels();
      this.bindButtons();
      this.toastTimer = null;
      game.onLog = (m) => this.pushLog(m);
    }

    // ---- TOOL PALETTE ------------------------------------------------
    buildToolbar() {
      const host = $('#toolbar');
      host.innerHTML = '';
      const cats = [
        ['view', 'Inspect'], ['geo', 'Geosphere'], ['atmo', 'Atmosphere'],
        ['bio', 'Biosphere'], ['sealife', 'Sea Life'], ['landlife', 'Land Life'],
        ['civ', 'Civilization']
      ];
      const tools = GAIA.tools.allTools();
      this.toolButtons = {};
      for (const [cat, label] of cats) {
        const group = el('div', 'tool-group');
        group.appendChild(el('div', 'tool-label', label));
        const row = el('div', 'tool-row');
        tools.filter(t => t.cat === cat).forEach(t => {
          const b = el('button', 'tool-btn');
          b.innerHTML = `<span class="ic">${t.icon}</span>`;
          if (t.color) b.querySelector('.ic').style.color = t.color;
          b.title = `${t.name} — ${t.hint}` + (t.cost ? ` (${t.cost}Ω)` : '');
          b.setAttribute('aria-label', t.name);
          if (t.cost) b.appendChild(el('span', 'cost', t.cost >= 1000 ? (t.cost/1000)+'k' : t.cost));
          b.appendChild(el('span', 'tname', t.name));
          b.onclick = () => this.selectTool(t.id);
          this.toolButtons[t.id] = b;
          row.appendChild(b);
        });
        group.appendChild(row);
        host.appendChild(group);
      }
      this.selectTool('examine');
    }

    selectTool(id) {
      this.currentTool = GAIA.tools.toolById(id);
      for (const k in this.toolButtons) this.toolButtons[k].classList.toggle('active', k === id);
      $('#tool-readout').textContent = this.currentTool ? this.currentTool.hint : '';
    }

    // ---- TIME CONTROLS ----------------------------------------------
    buildTimeBar() {
      const sc = $('#scale-buttons'); sc.innerHTML = '';
      TIMESCALES.forEach((t, i) => {
        const b = el('button', 'scale-btn', t.name);
        b.title = t.desc;
        b.onclick = () => { this.game.setScale(i); this.refreshTime(); };
        sc.appendChild(b);
      });
      const sp = $('#speed-buttons'); sp.innerHTML = '';
      SPEEDS.forEach((s, i) => {
        const b = el('button', 'speed-btn', s.name);
        b.onclick = () => { this.game.setSpeed(i); this.refreshTime(); };
        sp.appendChild(b);
      });
      this.refreshTime();
    }
    refreshTime() {
      const sc = $('#scale-buttons').children, sp = $('#speed-buttons').children;
      for (let i = 0; i < sc.length; i++) sc[i].classList.toggle('active', i === this.game.scaleIdx);
      for (let i = 0; i < sp.length; i++) sp[i].classList.toggle('active', i === this.game.speedIdx);
    }

    // ---- OVERLAY SWITCHER -------------------------------------------
    buildOverlayBar() {
      const host = $('#overlay-buttons'); host.innerHTML = '';
      OVERLAYS.forEach(o => {
        const b = el('button', 'ov-btn', o.name);
        b.onclick = () => { this.r.overlay = o.id; this.refreshOverlay(); };
        host.appendChild(b);
      });
      this.refreshOverlay();
    }
    refreshOverlay() {
      const host = $('#overlay-buttons').children;
      OVERLAYS.forEach((o, i) => host[i].classList.toggle('active', o.id === this.r.overlay));
    }

    // ---- MODEL CONTROL PANEL ----------------------------------------
    buildModels() {
      const host = $('#models-body'); host.innerHTML = '';
      const g = this.game;
      const slider = (label, min, max, step, get, set, fmt) => {
        const wrap = el('div', 'slider-row');
        wrap.appendChild(el('label', null, label));
        const inp = document.createElement('input');
        inp.type = 'range'; inp.min = min; inp.max = max; inp.step = step; inp.value = get();
        const val = el('span', 'sval', fmt(get()));
        inp.oninput = () => { set(parseFloat(inp.value)); val.textContent = fmt(parseFloat(inp.value)); };
        wrap.appendChild(inp); wrap.appendChild(val);
        host.appendChild(wrap);
      };
      slider('Solar Output', 0.4, 2.0, 0.01, () => g.atmo.solar, v => g.atmo.solar = v, v => v.toFixed(2) + '×');
      slider('Continental Drift', 0, 3, 0.1, () => g.rates.drift, v => g.rates.drift = v, v => v.toFixed(1) + '×');
      slider('Evolution Rate', 0, 3, 0.1, () => g.rates.evo, v => g.rates.evo = v, v => v.toFixed(1) + '×');
      slider('Tech Advance', 0, 3, 0.1, () => g.rates.tech, v => g.rates.tech = v, v => v.toFixed(1) + '×');

      // model enable toggles
      const tog = el('div', 'toggle-row');
      [['geo','Geosphere'],['atmo','Atmosphere'],['bio','Biosphere'],['civ','Civilization']].forEach(([k,lab]) => {
        const b = el('button', 'mini-toggle ' + (g.modelEnable[k] ? 'on' : ''), lab);
        b.onclick = () => { g.modelEnable[k] = !g.modelEnable[k]; b.classList.toggle('on', g.modelEnable[k]); };
        tog.appendChild(b);
      });
      host.appendChild(el('div', 'panel-sub', 'Active models'));
      host.appendChild(tog);
    }

    // ---- STATUS BAR (per frame) -------------------------------------
    updateStatus() {
      const g = this.game, a = g.atmo, b = g.bio, c = g.civ;
      $('#st-year').textContent = fmtYear(g.year);
      $('#st-scale').textContent = g.scale.name;
      $('#st-temp').textContent = a.globalTemp.toFixed(1) + '°C';
      $('#st-co2').textContent = a.co2 < 10000 ? a.co2.toFixed(0) + ' ppm' : (a.co2/1000).toFixed(1) + 'k ppm';
      $('#st-o2').textContent = a.o2.toFixed(1) + '% O₂';
      $('#st-bio').textContent = b.totalBiomass.toFixed(0);
      $('#st-life').textContent = b.diversity + ' classes';
      $('#st-cities').textContent = c.cityCount + (c.maxTech >= 0 ? ' · ' + TECH[c.maxTech].name : '');
      $('#st-energy').textContent = Math.floor(g.energy).toLocaleString() + ' Ω';
      // health tint
      const t = a.globalTemp;
      const healthy = t > 0 && t < 35 && a.o2 > 5;
      $('#st-temp').style.color = (t < -5 || t > 45) ? '#ff7a6b' : (healthy ? '#9fe6b0' : '#ffd54a');
    }

    // ---- DATA GRAPHS -------------------------------------------------
    drawGraphs() {
      const cv = $('#graph-canvas'); if (!cv) return;
      const panel = $('#graphs'); if (panel.classList.contains('hidden')) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = cv.getBoundingClientRect();
      if (cv.width !== r.width * dpr) { cv.width = r.width * dpr; cv.height = r.height * dpr; }
      const g = cv.getContext('2d'); g.setTransform(dpr,0,0,dpr,0,0);
      const W = r.width, H = r.height;
      g.clearRect(0,0,W,H); g.fillStyle = '#0c1622'; g.fillRect(0,0,W,H);
      const hist = this.game.history; if (hist.length < 2) return;
      const series = [
        { key: 'temp', col: '#ff7a6b', lo: -30, hi: 60, label: 'Temp' },
        { key: 'co2',  col: '#c98b3b', lo: 0, hi: 2000, label: 'CO₂', log: true },
        { key: 'o2',   col: '#56b0e6', lo: 0, hi: 40, label: 'O₂' },
        { key: 'biomass', col: '#5ad07a', lo: 0, hi: Math.max(50, Math.max(...hist.map(h=>h.biomass))), label: 'Biomass' },
        { key: 'cities', col: '#c04ae0', lo: 0, hi: Math.max(10, Math.max(...hist.map(h=>h.cities))), label: 'Cities' }
      ];
      g.font = '10px system-ui'; g.textBaseline = 'top';
      series.forEach((s, si) => {
        g.strokeStyle = s.col; g.lineWidth = 1.5; g.beginPath();
        hist.forEach((h, i) => {
          let v = h[s.key];
          let n = s.log ? Math.log10(Math.max(1, v)) / Math.log10(Math.max(10, s.hi)) : (v - s.lo) / (s.hi - s.lo);
          n = U.clamp(n, 0, 1);
          const x = (i / (hist.length - 1)) * W;
          const y = H - n * (H - 4) - 2;
          i ? g.lineTo(x, y) : g.moveTo(x, y);
        });
        g.stroke();
        g.fillStyle = s.col; g.fillText(s.label, 6 + si * 56, 4);
      });
    }

    // ---- INSPECTOR ---------------------------------------------------
    showInspector(x, y) {
      const c = this.game.world.get(x, y); if (!c) return;
      const w = this.game.world;
      const p = $('#inspector'); p.classList.remove('hidden');
      const land = w.isLand(c);
      let html = `<div class="insp-title">Tile ${x},${y}</div>`;
      html += row('Surface', land ? BIOME[c.biome].name : (c.alt > -0.25 ? 'Shallows' : 'Ocean'));
      html += row('Altitude', (c.alt * 5000 | 0) + ' m');
      html += row('Temperature', c.temp.toFixed(1) + ' °C');
      html += row('Rainfall', c.rain.toFixed(0));
      html += row('Cloud', (c.cloud * 100 | 0) + '%');
      if (land) html += row('Biomass', (c.biomass * 100 | 0) + '%');
      if (c.life) {
        const d = LIFE_BY_ID[c.life];
        html += row('Life', d.name + (c.sentient ? ' (Sentient!)' : ''));
        html += row('Population', (c.lifePop * 100 | 0) + '%');
        html += row('Evolution', (c.lifeLevel * 100 | 0) + '%');
      }
      if (c.city) html += row('City', TECH[c.city.tech].name + ' — pop ' + (c.city.pop * 100 | 0) + '%');
      $('#inspector-body').innerHTML = html;
      function row(k, v) { return `<div class="insp-row"><span>${k}</span><b>${v}</b></div>`; }
    }

    // ---- EVENT LOG ---------------------------------------------------
    pushLog(msg) {
      const host = $('#log-body'); if (!host) return;
      const line = el('div', 'log-line');
      line.innerHTML = `<span class="log-yr">${fmtYear(this.game.year)}</span> ${msg}`;
      host.appendChild(line);
      while (host.children.length > 60) host.removeChild(host.firstChild);
      host.scrollTop = host.scrollHeight;
      this.toast(msg);
    }
    toast(msg) {
      const t = $('#toast'); t.textContent = msg; t.classList.add('show');
      clearTimeout(this.toastTimer);
      this.toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
    }

    // ---- BUTTON WIRING ----------------------------------------------
    bindButtons() {
      const toggle = (btnSel, panelSel) => {
        $(btnSel).onclick = () => $(panelSel).classList.toggle('hidden');
      };
      toggle('#btn-graphs', '#graphs');
      toggle('#btn-models', '#models');
      toggle('#btn-log', '#log');
      toggle('#btn-menu', '#menu');
      document.querySelectorAll('.panel-close').forEach(b => {
        b.onclick = () => b.closest('.panel').classList.add('hidden');
      });
      $('#btn-clouds').onclick = (e) => { this.r.showClouds = !this.r.showClouds; e.currentTarget.classList.toggle('active', this.r.showClouds); };
      $('#btn-grid').onclick = (e) => { this.r.showGrid = !this.r.showGrid; e.currentTarget.classList.toggle('active', this.r.showGrid); };
      $('#btn-clouds').classList.add('active');
      $('#btn-toolbar').onclick = () => $('#leftbar').classList.toggle('collapsed');

      // scenario menu
      const list = $('#scenario-list'); list.innerHTML = '';
      GAIA.SCENARIOS.forEach(sc => {
        const b = el('button', 'scenario-btn');
        b.innerHTML = `<b>${sc.name}</b><span>${sc.blurb}</span>`;
        b.onclick = () => { this.game.loadScenario(sc); this.afterLoad(); $('#menu').classList.add('hidden'); };
        list.appendChild(b);
      });
      $('#btn-save').onclick = () => { try { localStorage.setItem('gaia.save', this.game.serialize()); this.toast('Planet saved.'); } catch(e){ this.toast('Save failed.'); } };
      $('#btn-load').onclick = () => { const s = localStorage.getItem('gaia.save'); if (s) { this.game.deserialize(s); this.afterLoad(); $('#menu').classList.add('hidden'); this.toast('Planet loaded.'); } else this.toast('No saved planet.'); };
    }

    afterLoad() {
      this.r._inited = false; this.r.resize();
      this.buildModels(); this.refreshTime(); this.refreshOverlay();
      $('#log-body').innerHTML = '';
    }
  }

  function fmtYear(y) {
    if (y < 0) {
      const a = -y;
      if (a >= 1e9) return (a/1e9).toFixed(2) + ' billion BCE';
      if (a >= 1e6) return (a/1e6).toFixed(1) + ' million BCE';
      if (a >= 1e3) return (a/1e3).toFixed(1) + 'k BCE';
      return Math.round(a) + ' BCE';
    }
    if (y >= 1e6) return (y/1e6).toFixed(1) + 'M CE';
    if (y >= 1e4) return (y/1e3).toFixed(1) + 'k CE';
    return 'CE ' + Math.round(y);
  }

  GAIA.UI = UI;
  GAIA.fmtYear = fmtYear;

})(typeof window !== 'undefined' ? window : globalThis);
