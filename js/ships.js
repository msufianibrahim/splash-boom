'use strict';
// Cartoon ship art. Top-down ships are drawn bow-right in a (len*100 x 100) box,
// then rotated for vertical placement.

const INK = '#1f2b3a';

function hullPath(W, inset = 0) {
  const i = inset;
  return `M${10 + i},${24 + i} L${W - 75},${18 + i} Q${W - 12 - i},${32 + i * .5} ${W - 6 - i},50 ` +
         `Q${W - 12 - i},${68 - i * .5} ${W - 75},${82 - i} L${10 + i},${76 - i} Q${3 + i},50 ${10 + i},${24 + i} Z`;
}

function turret(x, y, dir = 1, color = '#6b7889') {
  return `<rect x="${dir > 0 ? x : x - 38}" y="${y - 9}" width="38" height="6" rx="3" fill="#3b4655"/>
    <rect x="${dir > 0 ? x : x - 38}" y="${y + 3}" width="38" height="6" rx="3" fill="#3b4655"/>
    <circle cx="${x}" cy="${y}" r="16" fill="${color}" stroke="${INK}" stroke-width="4"/>
    <circle cx="${x - 4}" cy="${y - 4}" r="5" fill="#fff" opacity=".35"/>`;
}

const SHIP_ART = {
  carrier(W) {
    let planes = '';
    [[95, 38], [175, 62], [255, 38]].forEach(([x, y]) => {
      planes += `<g transform="translate(${x},${y})">
        <path d="M-14,0 L14,0" stroke="#eef3f8" stroke-width="6" stroke-linecap="round"/>
        <path d="M2,-14 L8,0 L2,14 Z" fill="#eef3f8"/>
        <path d="M-12,-6 L-8,0 L-12,6 Z" fill="#eef3f8"/>
      </g>`;
    });
    return `
      <path d="${hullPath(W)}" fill="#8d9db0" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
      <rect x="18" y="22" width="${W - 95}" height="56" rx="10" fill="#566476" stroke="${INK}" stroke-width="4"/>
      <line x1="34" y1="50" x2="${W - 90}" y2="50" stroke="#fff" stroke-width="4" stroke-dasharray="16 12"/>
      <line x1="30" y1="30" x2="${W - 100}" y2="30" stroke="#ffd34d" stroke-width="2.5"/>
      <line x1="30" y1="70" x2="${W - 100}" y2="70" stroke="#ffd34d" stroke-width="2.5"/>
      ${planes}
      <rect x="${W - 150}" y="6" width="54" height="22" rx="6" fill="#cfd9e4" stroke="${INK}" stroke-width="4"/>
      <rect x="${W - 140}" y="12" width="10" height="8" rx="2" fill="#7fd3ff"/>
      <rect x="${W - 124}" y="12" width="10" height="8" rx="2" fill="#7fd3ff"/>
      <rect x="${W - 108}" y="12" width="6" height="8" rx="2" fill="#7fd3ff"/>`;
  },
  battleship(W) {
    return `
      <path d="${hullPath(W)}" fill="#9aa7b6" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
      <path d="${hullPath(W, 9)}" fill="#d9a865"/>
      <path d="M30,40 H${W - 80} M30,60 H${W - 80}" stroke="#b9874a" stroke-width="2"/>
      ${turret(58, 50, -1)}
      <rect x="94" y="28" width="62" height="44" rx="10" fill="#e8eef4" stroke="${INK}" stroke-width="4"/>
      <rect x="104" y="36" width="12" height="10" rx="2" fill="#7fd3ff"/>
      <rect x="124" y="36" width="12" height="10" rx="2" fill="#7fd3ff"/>
      <circle cx="178" cy="50" r="13" fill="#ff5a4e" stroke="${INK}" stroke-width="4"/>
      <circle cx="178" cy="50" r="6" fill="#222"/>
      ${turret(212, 50, 1)}
      ${turret(254, 50, 1)}`;
  },
  destroyer(W) {
    return `
      <path d="${hullPath(W)}" fill="#7c8da6" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
      <path d="${hullPath(W, 9)}" fill="#4f6f96"/>
      <circle cx="52" cy="50" r="22" fill="#3d5a7e" stroke="#ffd34d" stroke-width="3"/>
      <text x="52" y="59" text-anchor="middle" font-size="26" font-weight="900" fill="#ffd34d" font-family="Arial">H</text>
      <rect x="92" y="30" width="70" height="40" rx="10" fill="#e8eef4" stroke="${INK}" stroke-width="4"/>
      <rect x="102" y="38" width="10" height="9" rx="2" fill="#7fd3ff"/>
      <rect x="118" y="38" width="10" height="9" rx="2" fill="#7fd3ff"/>
      <rect x="134" y="38" width="10" height="9" rx="2" fill="#7fd3ff"/>
      <rect x="172" y="34" width="34" height="32" rx="4" fill="#5d6f86" stroke="${INK}" stroke-width="3"/>
      <circle cx="181" cy="43" r="4" fill="#ff7b5c"/><circle cx="197" cy="43" r="4" fill="#ff7b5c"/>
      <circle cx="181" cy="57" r="4" fill="#ff7b5c"/><circle cx="197" cy="57" r="4" fill="#ff7b5c"/>
      ${turret(240, 50, 1, '#8696ad')}`;
  },
  submarine(W) {
    return `
      <path d="M14,50 L2,34 L2,66 Z" fill="#e0a51c" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
      <rect x="10" y="26" width="${W - 18}" height="48" rx="24" fill="#ffc93c" stroke="${INK}" stroke-width="5"/>
      <rect x="22" y="32" width="${W - 50}" height="10" rx="5" fill="#fff" opacity=".35"/>
      <rect x="78" y="34" width="46" height="32" rx="14" fill="#ffdb70" stroke="${INK}" stroke-width="4"/>
      <circle cx="101" cy="50" r="6" fill="${INK}"/>
      <circle cx="46" cy="50" r="7" fill="#6cc8ff" stroke="${INK}" stroke-width="3"/>
      <circle cx="152" cy="50" r="7" fill="#6cc8ff" stroke="${INK}" stroke-width="3"/>`;
  },
  speedboat(W) {
    return `
      <path d="M8,30 Q2,50 8,70" stroke="#fff" stroke-width="4" fill="none" opacity=".8"/>
      <path d="M18,24 L${W - 70},22 Q${W - 12},40 ${W - 6},50 Q${W - 12},60 ${W - 70},78 L18,76 Q12,50 18,24 Z" fill="#ffffff" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
      <path d="M${W - 70},22 Q${W - 12},40 ${W - 6},50 Q${W - 12},60 ${W - 70},78 Z" fill="#ff4d6d"/>
      <path d="M18,24 L${W - 70},22 Q${W - 12},40 ${W - 6},50 Q${W - 12},60 ${W - 70},78 L18,76 Q12,50 18,24 Z" fill="none" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
      <rect x="34" y="34" width="56" height="32" rx="8" fill="#2fb0ff" stroke="${INK}" stroke-width="4"/>
      <path d="M92,30 Q110,50 92,70" stroke="${INK}" stroke-width="6" fill="none" stroke-linecap="round"/>
      <path d="M95,32 Q111,50 95,68" stroke="#bfeaff" stroke-width="3" fill="none"/>`;
  },
};

function topShip(type, len, dir) {
  const W = len * 100;
  const art = SHIP_ART[type](W);
  if (dir === 'v') {
    return `<svg viewBox="0 0 100 ${W}" xmlns="http://www.w3.org/2000/svg"><g transform="translate(100,0) rotate(90)">${art}</g></svg>`;
  }
  return `<svg viewBox="0 0 ${W} 100" xmlns="http://www.w3.org/2000/svg">${art}</svg>`;
}

// Big side-view battleship for the title and win screens.
function heroShip() {
  return `<svg viewBox="0 0 420 220" xmlns="http://www.w3.org/2000/svg">
    <g class="smoke">
      <circle cx="270" cy="40" r="14"/><circle cx="282" cy="26" r="11"/><circle cx="292" cy="12" r="8"/>
    </g>
    <path d="M200,12 L50,112 M200,12 L372,108" stroke="#2c3846" stroke-width="2"/>
    ${[0.18, 0.34, 0.5, 0.66, 0.82].map((t, i) => {
      const x = 200 - 150 * t, y = 12 + 100 * t;
      return `<path d="M${x},${y} l-7,12 l12,-3 z" fill="${['#ff4d4d', '#ffd23f', '#3bceac', '#4d9bff', '#ff8c42'][i]}"/>`;
    }).join('')}
    ${[0.18, 0.34, 0.5, 0.66, 0.82].map((t, i) => {
      const x = 200 + 172 * t, y = 12 + 96 * t;
      return `<path d="M${x},${y} l-5,13 l12,-5 z" fill="${['#4d9bff', '#ff8c42', '#ff4d4d', '#ffd23f', '#3bceac'][i]}"/>`;
    }).join('')}
    <line x1="200" y1="8" x2="200" y2="40" stroke="#2c3846" stroke-width="6" stroke-linecap="round"/>
    <path class="flag" d="M200,8 L238,16 L200,26 Z" fill="#ff4d4d" stroke="#2c3846" stroke-width="3" stroke-linejoin="round"/>
    <rect x="166" y="34" width="66" height="34" rx="8" fill="#d3dde8" stroke="#2c3846" stroke-width="5"/>
    <rect x="176" y="43" width="12" height="11" rx="3" fill="#7fd3ff"/>
    <rect x="193" y="43" width="12" height="11" rx="3" fill="#7fd3ff"/>
    <rect x="210" y="43" width="12" height="11" rx="3" fill="#7fd3ff"/>
    <rect x="142" y="64" width="112" height="58" rx="9" fill="#a9b7c7" stroke="#2c3846" stroke-width="5"/>
    <rect x="156" y="76" width="84" height="10" rx="5" fill="#fff" opacity=".35"/>
    <path d="M258,46 L292,46 L286,122 L262,122 Z" fill="#ff5a4e" stroke="#2c3846" stroke-width="5" stroke-linejoin="round"/>
    <rect x="256" y="44" width="38" height="12" rx="3" fill="#2c3846"/>
    <rect x="262" y="72" width="26" height="8" fill="#fff" opacity=".8"/>
    <rect x="330" y="92" width="62" height="8" rx="4" fill="#3b4655"/>
    <rect x="330" y="104" width="58" height="8" rx="4" fill="#3b4655"/>
    <rect x="296" y="88" width="50" height="30" rx="12" fill="#8796a8" stroke="#2c3846" stroke-width="5"/>
    <rect x="30" y="92" width="60" height="8" rx="4" fill="#3b4655"/>
    <rect x="34" y="104" width="56" height="8" rx="4" fill="#3b4655"/>
    <rect x="76" y="88" width="50" height="30" rx="12" fill="#8796a8" stroke="#2c3846" stroke-width="5"/>
    <path d="M10,116 L410,110 Q398,152 362,190 L66,190 Q32,160 10,116 Z" fill="#5d6f84"/>
    <path d="M38,160 L386,156 Q376,174 362,190 L66,190 Q50,176 38,160 Z" fill="#e8483f"/>
    <path d="M14,124 L404,118" stroke="#fff" stroke-width="5" opacity=".7"/>
    <path d="M10,116 L410,110 Q398,152 362,190 L66,190 Q32,160 10,116 Z" fill="none" stroke="#2c3846" stroke-width="6" stroke-linejoin="round"/>
    ${[90, 140, 190, 240, 290, 340].map(x => `<circle cx="${x}" cy="140" r="8" fill="#ffe680" stroke="#2c3846" stroke-width="4"/>`).join('')}
  </svg>`;
}
