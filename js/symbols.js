/*
 * Microcheted — crochet stitch symbol library.
 *
 * Every symbol is drawn in a 100 × 100 box (y grows downward) as SVG path data.
 * The base of a stitch sits near the bottom (y≈90) and its top near y≈12, so a
 * symbol "stands" on the row/round below it, as in standard crochet diagrams
 * (Craft Yarn Council chart symbols + common filet & marker conventions).
 */
(function () {
  'use strict';

  const f = (n) => Math.round(n * 10) / 10;
  const seg = (x1, y1, x2, y2) => `M${f(x1)},${f(y1)}L${f(x2)},${f(y2)}`;
  const rad = (d) => (d * Math.PI) / 180;

  function oval(cx, cy, rx, ry, deg = 0) {
    const a = rad(deg), dx = Math.cos(a) * rx, dy = Math.sin(a) * rx;
    return `M${f(cx - dx)},${f(cy - dy)}A${rx},${ry} ${deg} 1 0 ${f(cx + dx)},${f(cy + dy)}` +
           `A${rx},${ry} ${deg} 1 0 ${f(cx - dx)},${f(cy - dy)}Z`;
  }

  // A stitch "post" from base (bx,by) to top (tx,ty), with optional top bar and
  // yarn-over slashes (dc = 1 slash, tr = 2, dtr = 3 …).
  function stem(bx, by, tx, ty, o = {}) {
    const { slashes = 0, bar = true, barLen = 34, slashLen = 22 } = o;
    const dx = tx - bx, dy = ty - by, len = Math.hypot(dx, dy);
    const ux = dx / len, uy = dy / len, nx = -uy, ny = ux;
    let d = seg(bx, by, tx, ty);
    if (bar) d += seg(tx - nx * barLen / 2, ty - ny * barLen / 2, tx + nx * barLen / 2, ty + ny * barLen / 2);
    const sx = nx * 0.82 + ux * 0.57, sy = ny * 0.82 + uy * 0.57, h = slashLen / 2;
    for (let i = 0; i < slashes; i++) {
      const t = 0.52 + (i - (slashes - 1) / 2) * 0.15;
      const cx = bx + dx * t, cy = by + dy * t;
      d += seg(cx - sx * h, cy - sy * h, cx + sx * h, cy + sy * h);
    }
    return d;
  }

  // Single-crochet style leg: a line with a perpendicular cross bar (looks like a tilted "+").
  function scLeg(bx, by, tx, ty, t = 0.6, len = 24) {
    const dx = tx - bx, dy = ty - by, l = Math.hypot(dx, dy);
    const nx = -dy / l, ny = dx / l, cx = bx + dx * t, cy = by + dy * t;
    return seg(bx, by, tx, ty) + seg(cx - nx * len / 2, cy - ny * len / 2, cx + nx * len / 2, cy + ny * len / 2);
  }

  // Stitches fanning out of one base point (increases, shells).
  function fan(n, spread, o = {}) {
    const { len = 76, slashes = 1, bar = true, barLen = 22, by = 90, sc = false } = o;
    let d = '';
    for (let i = 0; i < n; i++) {
      const a = n === 1 ? 0 : -spread / 2 + (spread * i) / (n - 1);
      const tx = 50 + len * Math.sin(rad(a)), ty = by - len * Math.cos(rad(a));
      d += sc ? scLeg(50, by, tx, ty) : stem(50, by, tx, ty, { slashes, bar, barLen });
    }
    return d;
  }

  // Stitches converging into one top point (decreases).
  function tog(bases, o = {}) {
    const { slashes = 1, top = 14, bar = true, sc = false } = o;
    let d = '';
    for (const bx of bases) d += sc ? scLeg(bx, 88, 50, top, 0.45) : stem(bx, 88, 50, top, { slashes, bar: false });
    if (bar) d += seg(32, top, 68, top);
    return d;
  }

  const hookFront = 'M50,80C50,93 33,94 33,82';
  const hookBack = 'M50,80C50,93 67,94 67,82';

  // ---- symbol table --------------------------------------------------------
  // [id, category, US abbr, US name, parts, extra]
  // parts: path string, or {d, fill:true, alpha}
  const C = {
    basic: 'Basic stitches', post: 'Post stitches', inc: 'Increases', dec: 'Decreases',
    tex: 'Clusters & texture', chain: 'Chains, rings & loops', filet: 'Filet crochet', mark: 'Markers',
  };

  const defs = [
    ['ch', C.basic, 'ch', 'chain', [oval(50, 50, 24, 13)]],
    ['slst', C.basic, 'sl st', 'slip stitch', [{ d: oval(50, 50, 13, 9), fill: true }], { uk: ['ss', 'slip stitch'] }],
    ['sc', C.basic, 'sc', 'single crochet', [seg(30, 30, 70, 70) + seg(70, 30, 30, 70)]],
    ['scp', C.basic, 'sc', 'single crochet (+ style)', [seg(50, 24, 50, 76) + seg(24, 50, 76, 50)]],
    ['hdc', C.basic, 'hdc', 'half double crochet', [stem(50, 88, 50, 14)]],
    ['dc', C.basic, 'dc', 'double crochet', [stem(50, 88, 50, 12, { slashes: 1 })]],
    ['tr', C.basic, 'tr', 'treble crochet', [stem(50, 90, 50, 10, { slashes: 2 })]],
    ['dtr', C.basic, 'dtr', 'double treble crochet', [stem(50, 92, 50, 8, { slashes: 3 })]],
    ['trtr', C.basic, 'trtr', 'triple treble crochet', [stem(50, 94, 50, 6, { slashes: 4 })]],
    ['esc', C.basic, 'esc', 'extended single crochet', [seg(50, 14, 50, 88) + seg(36, 24, 64, 24) + seg(32, 66, 68, 66)]],

    ['fphdc', C.post, 'FPhdc', 'front post half double crochet', [stem(50, 80, 50, 14) + hookFront]],
    ['bphdc', C.post, 'BPhdc', 'back post half double crochet', [stem(50, 80, 50, 14) + hookBack]],
    ['fpdc', C.post, 'FPdc', 'front post double crochet', [stem(50, 80, 50, 10, { slashes: 1 }) + hookFront]],
    ['bpdc', C.post, 'BPdc', 'back post double crochet', [stem(50, 80, 50, 10, { slashes: 1 }) + hookBack]],
    ['fptr', C.post, 'FPtr', 'front post treble crochet', [stem(50, 80, 50, 8, { slashes: 2 }) + hookFront]],
    ['bptr', C.post, 'BPtr', 'back post treble crochet', [stem(50, 80, 50, 8, { slashes: 2 }) + hookBack]],

    ['sc2inc', C.inc, '2 sc in same st', 'single crochet increase', [fan(2, 40, { sc: true, len: 70 })]],
    ['sc3inc', C.inc, '3 sc in same st', 'single crochet 3-st increase', [fan(3, 64, { sc: true, len: 70 })]],
    ['hdc2inc', C.inc, '2 hdc in same st', 'half double crochet increase', [fan(2, 40, { slashes: 0 })]],
    ['dc2inc', C.inc, '2 dc in same st', 'double crochet increase', [fan(2, 40)]],
    ['dc3inc', C.inc, '3 dc in same st', 'double crochet 3-st increase', [fan(3, 64)]],
    ['vst', C.inc, 'V-st', 'V-stitch (dc, ch 1, dc in same st)', [fan(2, 50) + oval(50, 22, 9, 5)]],
    ['shell', C.inc, 'shell', '5-dc shell (5 dc in same st)', [fan(5, 110, { len: 72, barLen: 14 })]],

    ['sc2tog', C.dec, 'sc2tog', 'single crochet 2 together', [tog([30, 70], { sc: true, top: 24, bar: false })]],
    ['sc3tog', C.dec, 'sc3tog', 'single crochet 3 together', [tog([22, 50, 78], { sc: true, top: 24, bar: false })]],
    ['hdc2tog', C.dec, 'hdc2tog', 'half double crochet 2 together', [tog([30, 70], { slashes: 0 })]],
    ['dc2tog', C.dec, 'dc2tog', 'double crochet 2 together', [tog([30, 70])]],
    ['dc3tog', C.dec, 'dc3tog', 'double crochet 3 together / 3-dc cluster', [tog([22, 50, 78])]],
    ['tr2tog', C.dec, 'tr2tog', 'treble crochet 2 together', [tog([30, 70], { slashes: 2, top: 10 })]],

    ['bobble', C.tex, 'bobble', '5-dc bobble', [
      'M50,90Q16,53 50,16M50,90Q33,53 50,16M50,90L50,16M50,90Q67,53 50,16M50,90Q84,53 50,16' + seg(36, 16, 64, 16) +
      seg(27, 58, 39, 48) + seg(61, 58, 73, 48)]],
    ['puff', C.tex, 'puff', 'puff stitch (hdc cluster)', [
      'M50,90Q20,52 50,18Q80,52 50,90M50,90Q36,52 50,18Q64,52 50,90' + seg(34, 16, 66, 16)]],
    ['popcorn', C.tex, 'pc', '5-dc popcorn', [fan(5, 90, { len: 58, bar: false, slashes: 0 }) + oval(50, 34, 38, 12)]],
    ['cluster3', C.tex, '3-dc cl', '3-dc cluster in same st', [
      'M50,90Q24,53 50,16M50,90L50,16M50,90Q76,53 50,16' + seg(36, 16, 64, 16) + seg(30, 58, 42, 48) + seg(58, 58, 70, 48)]],
    ['xdc', C.tex, 'crossed dc', 'crossed double crochet', [stem(26, 88, 74, 14, { slashes: 1, barLen: 24 }) + stem(74, 88, 26, 14, { slashes: 1, barLen: 24 })]],
    ['spike', C.tex, 'spike sc', 'spike (long) single crochet', [seg(50, 8, 50, 96) + seg(30, 26, 70, 26)]],
    ['revsc', C.tex, 'rev sc', 'reverse single crochet (crab stitch)', [seg(32, 40, 68, 76) + seg(68, 40, 32, 76) + 'M26,20Q38,8 50,20T74,20']],
    ['bullion', C.tex, 'bullion', 'bullion stitch', [seg(50, 10, 50, 90) + 'M38,22Q62,28 38,34M38,38Q62,44 38,50M38,54Q62,60 38,66M38,70Q62,76 38,82']],
    ['solomon', C.tex, 'Solomon\'s knot', 'Solomon\'s knot (long loop)', [oval(50, 54, 36, 11, 90), { d: oval(50, 14, 6, 5), fill: true }]],
    ['loopst', C.tex, 'loop st', 'loop stitch', [seg(30, 34, 70, 74) + seg(70, 34, 30, 74) + 'M50,54C26,102 74,102 50,54']],

    ['ring', C.chain, 'magic ring', 'magic (adjustable) ring', ['M78,50A28,28 0 1 0 22,50A28,28 0 1 0 78,50C88,70 74,86 62,92']],
    ['picot', C.chain, 'ch-3 picot', 'ch-3 picot', [
      oval(28, 56, 12, 7, 70) + oval(50, 24, 12, 7, 0) + oval(72, 56, 12, 7, 110), { d: oval(50, 84, 8, 6), fill: true }]],
    ['ch3sp', C.chain, 'ch-3 sp', 'ch-3 space / loop', [oval(18, 52, 13, 7, -40) + oval(50, 40, 13, 7) + oval(82, 52, 13, 7, 40)]],
    ['ch5sp', C.chain, 'ch-5 sp', 'ch-5 space / arch', [
      oval(10.2, 69, 10, 6, -60) + oval(27, 51.8, 10, 6, -30) + oval(50, 46, 10, 6) + oval(73, 51.8, 10, 6, 30) + oval(89.8, 69, 10, 6, 60)]],
    ['tch', C.chain, 'turning ch', 'turning chain', [oval(50, 76, 18, 9, 90) + oval(50, 44, 18, 9, 90) + oval(50, 12, 18, 9, 90)]],

    ['filetopen', C.filet, 'sp', 'filet open mesh (dc, ch 2)', ['M14,14H86V86H14Z']],
    ['filetblock', C.filet, 'blk', 'filet block (filled)', [{ d: 'M8,8H92V92H8Z', fill: true }]],
    ['lacet', C.filet, 'lacet', 'filet lacet (ch 3, sc, ch 3)', ['M10,12Q40,70 50,88Q60,70 90,12']],
    ['filetbar', C.filet, 'bar', 'filet bar (ch 5)', [seg(6, 22, 94, 22) + seg(6, 92, 6, 22) + seg(94, 92, 94, 22)]],

    ['nost', C.mark, '—', 'no stitch (shaded area)', [{ d: 'M0,0H100V100H0Z', fill: true, alpha: 0.22 }], { marker: true }],
    ['arrow', C.mark, '→', 'direction of work', [seg(14, 50, 86, 50) + 'M66,32L86,50L66,68'], { marker: true }],
    ['start', C.mark, '▶', 'start here', [{ d: 'M30,22L78,50L30,78Z', fill: true }], { marker: true }],
    ['fasten', C.mark, 'fasten off', 'fasten off', [seg(50, 88, 50, 18) + 'M34,36L50,18L66,36' + seg(36, 88, 64, 88)], { marker: true }],
    ['smark', C.mark, 'pm', 'place stitch marker', ['M50,88C18,56 28,16 50,16C72,16 82,56 50,88Z' + oval(50, 42, 9, 9)], { marker: true }],
    ['ccmark', C.mark, 'CC', 'color change', [{ d: 'M50,16L84,50L50,84L16,50Z', fill: true }], { marker: true }],
    ['repeat', C.mark, '*', 'repeat marker', [seg(50, 18, 50, 82) + seg(22, 34, 78, 66) + seg(78, 34, 22, 66)], { marker: true }],
  ];

  const MODIFIERS = {
    blo: { abbr: 'BLO', name: 'worked in back loop only', d: 'M30,98Q50,78 70,98' },
    flo: { abbr: 'FLO', name: 'worked in front loop only', d: 'M30,84Q50,104 70,84' },
  };

  // US → UK terminology
  const ukAbbr = { trtr: 'qtr', dtr: 'trtr', hdc: 'htr', sc: 'dc', dc: 'tr', tr: 'dtr' };
  const ukName = {
    'half double crochet': 'half treble crochet', 'single crochet': 'double crochet',
    'double crochet': 'treble crochet', 'triple treble': 'quadruple treble',
    'double treble': 'triple treble', 'treble': 'double treble',
  };
  const toUkAbbr = (s) => s.replace(/(trtr|dtr|hdc|sc|dc|tr)(?![a-z])/g, (m) => ukAbbr[m]);
  const toUkName = (s) => s.replace(/half double crochet|single crochet|double crochet|triple treble|double treble|treble/g, (m) => ukName[m]);

  const list = defs.map(([id, cat, abbr, name, parts, extra = {}]) => {
    const p = parts.map((x) => (typeof x === 'string' ? { d: x } : x));
    return {
      id, cat, parts: p, marker: !!extra.marker,
      us: [abbr, name],
      uk: extra.uk || [toUkAbbr(abbr), toUkName(name)],
    };
  });
  const byId = Object.fromEntries(list.map((s) => [s.id, s]));
  const cats = [...new Set(list.map((s) => s.cat))];

  function svgInner(sym, color = 'currentColor', sw = 6) {
    return sym.parts.map((p) => p.fill
      ? `<path d="${p.d}" fill="${color}"${p.alpha ? ` fill-opacity="${p.alpha}"` : ''}/>`
      : `<path d="${p.d}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`).join('');
  }

  window.MICRO_SYMBOLS = {
    list, byId, cats, MODIFIERS, svgInner,
    abbr: (s, terms) => (terms === 'uk' ? s.uk[0] : s.us[0]),
    name: (s, terms) => (terms === 'uk' ? s.uk[1] : s.us[1]),
  };
})();
