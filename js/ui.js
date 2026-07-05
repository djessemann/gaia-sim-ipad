// UI controller: builds the tool palette, view tabs, stats strip, speed
// controls, and scenario menu, then keeps the readouts in sync each frame.

import { TOOLS } from './tools.js';
import { SCENARIOS } from './scenarios.js';
import { SPEEDS, TIMESCALES, TECH_AGES, LIFE_NAMES } from './config.js';
import { iconSVG } from './icons.js';

const VIEWS = [
  { id: 'terrain', name: 'Terrain' },
  { id: 'temp',    name: 'Climate' },
  { id: 'rain',    name: 'Rainfall' },
  { id: 'biome',   name: 'Biomes' },
  { id: 'civ',     name: 'Civ' },
];

export class UI {
  constructor(sim, renderer, handlers) {
    this.sim = sim;
    this.renderer = renderer;
    this.h = handlers; // { onScenario, onReseed, onSpeed, onTimescale }
    this.tool = 'examine';
    this.speed = 1;
    this.selectedScenario = SCENARIOS[0];
    this._build();
  }

  _build() {
    this._buildViewTabs();
    this._buildStats();
    this._buildPalette();
    this._buildSpeed();
    this._buildMenu();
    this._wireBars();
  }

  _buildViewTabs() {
    const row = document.getElementById('viewTabs');
    row.innerHTML = '';
    for (const v of VIEWS) {
      const b = el('button', 'tab' + (v.id === this.renderer.view ? ' active' : ''), v.name);
      b.onclick = () => {
        this.renderer.setView(v.id);
        [...row.children].forEach(c => c.classList.remove('active'));
        b.classList.add('active');
      };
      row.appendChild(b);
    }
  }

  _buildStats() {
    const s = document.getElementById('stats');
    s.innerHTML = '';
    this.statEls = {};
    const defs = [
      ['temp', 'Temp'], ['co2', 'CO₂'], ['o2', 'O₂'], ['sea', 'Ocean'],
      ['ice', 'Ice'], ['bio', 'Biomass'], ['life', 'Dominant'], ['tech', 'Era'],
    ];
    for (const [key, label] of defs) {
      const row = el('div', 'stat');
      row.appendChild(el('span', 'lbl', label));
      const v = el('span', 'val', '—');
      row.appendChild(v);
      this.statEls[key] = v;
      s.appendChild(row);
    }
  }

  _buildPalette() {
    const p = document.getElementById('palette');
    p.innerHTML = '';
    for (const t of TOOLS) {
      const b = el('div', 'tool' + (t.id === this.tool ? ' active' : ''));
      const ico = el('div', 'ico'); ico.innerHTML = iconSVG(t.icon, 22);
      b.appendChild(ico);
      b.appendChild(el('div', 'nm', t.name));
      const cost = el('div', 'cost');
      cost.innerHTML = t.cost ? iconSVG('bolt', 9) + t.cost : '&mdash;';
      b.appendChild(cost);
      b.title = t.desc;
      b.onclick = () => {
        this.tool = t.id;
        [...p.children].forEach(c => c.classList.remove('active'));
        b.classList.add('active');
      };
      p.appendChild(b);
    }
  }

  _buildSpeed() {
    const g = document.getElementById('speedGroup');
    g.innerHTML = '';
    const icons = ['pause', 'play', 'fast', 'turbo'];
    SPEEDS.forEach((sp, i) => {
      const b = el('button', 'btn icon-btn' + (i === this.speed ? ' active' : ''));
      b.innerHTML = iconSVG(icons[i], 18);
      b.title = sp.name;
      b.onclick = () => {
        this.speed = i;
        [...g.children].forEach(c => c.classList.remove('active'));
        b.classList.add('active');
        this.h.onSpeed(i);
      };
      g.appendChild(b);
    });

    const ts = document.getElementById('timescaleBtn');
    ts.querySelector('.btn-ic').innerHTML = iconSVG('clock', 16);
    ts.onclick = () => {
      this.sim.timescale = (this.sim.timescale + 1) % TIMESCALES.length;
      document.getElementById('tsLabel').textContent = TIMESCALES[this.sim.timescale].name;
    };
    const menuBtn = document.getElementById('menuBtn');
    menuBtn.querySelector('.btn-ic').innerHTML = iconSVG('menu', 16);
    menuBtn.onclick = () => this.openMenu();
  }

  _buildMenu() {
    const list = document.getElementById('scenarioList');
    list.innerHTML = '';
    for (const sc of SCENARIOS) {
      const b = el('button', 'scenario' + (sc === this.selectedScenario ? ' active' : ''));
      b.appendChild(el('div', 's-name', sc.name));
      b.appendChild(el('div', 's-desc', sc.desc));
      b.onclick = () => {
        this.selectedScenario = sc;
        [...list.children].forEach(c => c.classList.remove('active'));
        b.classList.add('active');
        this.h.onScenario(sc);
        this.closeMenu();
      };
      list.appendChild(b);
    }
    const reseed = document.getElementById('reseedBtn');
    reseed.innerHTML = iconSVG('dice', 16) + '<span>New Seed</span>';
    reseed.onclick = () => {
      this.h.onReseed(this.selectedScenario);
      this.closeMenu();
    };
    document.getElementById('closeMenuBtn').onclick = () => this.closeMenu();
  }

  _wireBars() {
    // nothing else; bars updated in update()
  }

  openMenu() { document.getElementById('menu').classList.remove('hidden'); }
  closeMenu() { document.getElementById('menu').classList.add('hidden'); }

  showExamine(info) {
    const box = document.getElementById('examine');
    if (!info || info.error) {
      if (info && info.error) this.flash(info.error);
      return;
    }
    box.classList.remove('hidden');
    const type = info.ocean ? (info.ice > 0.5 ? 'Sea Ice' : 'Ocean')
                            : (info.ice > 0.5 ? 'Glacier' : 'Land');
    box.innerHTML =
      `<div><b>${type}</b> <span class="k">lat ${info.lat}°</span></div>` +
      `<div><span class="k">Temp</span> <b>${info.temp.toFixed(1)}°C</b></div>` +
      `<div><span class="k">Rain</span> <b>${(info.rainfall * 100 | 0)}%</b></div>` +
      `<div><span class="k">Life</span> <b>${LIFE_NAMES[info.life]}</b></div>` +
      (info.biomass > 0 ? `<div><span class="k">Biomass</span> <b>${(info.biomass * 100 | 0)}%</b></div>` : '') +
      (info.city ? `<div><b>${iconSVG('city', 13)} Settlement</b></div>` : '') +
      (info.pollution > 0.05 ? `<div><span class="k">Pollution</span> <b>${(info.pollution * 100 | 0)}%</b></div>` : '');
    clearTimeout(this._exTimer);
    this._exTimer = setTimeout(() => box.classList.add('hidden'), 4000);
  }

  flash(msg) {
    const box = document.getElementById('examine');
    box.classList.remove('hidden');
    box.innerHTML = `<div><b>${msg}</b></div>`;
    clearTimeout(this._exTimer);
    this._exTimer = setTimeout(() => box.classList.add('hidden'), 1400);
  }

  update() {
    const sim = this.sim;
    // Meters
    document.getElementById('gaiaBar').style.width = clamp(sim.gaia, 0, 100) + '%';
    document.getElementById('energyBar').style.width = (sim.energy / 2000 * 100) + '%';
    // Clock
    document.getElementById('clock').textContent = formatYear(sim.year);
    document.getElementById('tsLabel').textContent = TIMESCALES[sim.timescale].name;

    const S = this.statEls;
    setStat(S.temp, sim.globalTemp.toFixed(1) + '°C', tempClass(sim.globalTemp));
    setStat(S.co2, Math.round(sim.co2) + '', sim.co2 > 1500 ? 'bad' : sim.co2 > 700 ? 'warn' : '');
    setStat(S.o2, sim.o2.toFixed(1) + '%', sim.o2 < 5 ? 'warn' : '');
    setStat(S.sea, Math.round(sim.oceanFraction * 100) + '%', '');
    setStat(S.ice, Math.round(sim.iceCover * 100) + '%', sim.iceCover > 0.6 ? 'bad' : '');
    setStat(S.bio, Math.round(sim.livingFraction * 100) + '%', '');
    setStat(S.life, LIFE_NAMES[sim.dominantLife], '');
    setStat(S.tech, sim.cities > 0 ? TECH_AGES[sim.techAge] : '—', '');
  }
}

// --- helpers ---
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}
function setStat(node, val, cls) {
  node.textContent = val;
  node.className = 'val' + (cls ? ' ' + cls : '');
}
function tempClass(t) {
  if (t > 40 || t < -10) return 'bad';
  if (t > 28 || t < 2) return 'warn';
  return '';
}
function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

function formatYear(y) {
  if (y >= 1e9) return (y / 1e9).toFixed(2) + ' BY';
  if (y >= 1e6) return (y / 1e6).toFixed(1) + ' MY';
  if (y >= 1e3) return (y / 1e3).toFixed(1) + ' KY';
  return Math.round(y) + ' YR';
}
