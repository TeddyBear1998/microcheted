/* Microcheted — crochet chart designer. Plain JS, no build step. */
(() => {
  'use strict';

  const S = window.MICRO_SYMBOLS;
  const YARN = window.MICRO_PREVIEW;
  const t = window.I18N.t;
  const CELL = 40;            // world units per cell
  const INNER = 40;           // radius of the empty center in round charts
  const STORE_KEY = 'microcheted.autosave.v1';
  const TAU = Math.PI * 2;
  const PALETTE = ['#1f2937', '#78716c', '#b91c1c', '#ea580c', '#d97706', '#ca8a04', '#65a30d', '#15803d',
                   '#0d9488', '#0e7490', '#1d4ed8', '#4338ca', '#7e22ce', '#be185d', '#db2777', '#a16207'];

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const mod = (a, n) => ((a % n) + n) % n;

  const canvas = $('#chart');
  const ctx = canvas.getContext('2d');

  // ---------------------------------------------------------------- document
  function newDoc(o = {}) {
    return Object.assign({
      app: 'Microcheted', version: 1, name: t('doc.untitled'), mode: 'rect', craft: 'crochet', knitRound: false, gauge: null,
      cols: 30, rows: 20, rings: 8, start: 6, inc: 6, counts: null, center: 'ring',
      cells: {}, image: null,
      progress: { row: 1, done: [] },   // row counter and checked-off rows/rounds (0-based), kept outside undo history
      settings: { bg: '#ffffff', grid: '#d6d3d1', showGrid: true, numbers: true, terms: window.I18N.lang === 'lv' ? 'lv' : 'us', exportLegend: true },
    }, o);
  }

  function normalizeDoc(raw) {
    if (!raw || typeof raw !== 'object' || typeof raw.cells !== 'object') throw Object.assign(new Error(t('err.notDesign')), { known: true });
    const d = newDoc();
    d.name = String(raw.name || d.name).slice(0, 120);
    d.mode = raw.mode === 'round' ? 'round' : 'rect';
    d.craft = raw.craft === 'knit' && d.mode === 'rect' ? 'knit' : 'crochet';
    d.knitRound = d.craft === 'knit' && !!raw.knitRound;
    const int = (v, lo, hi, def) => (Number.isFinite(+v) ? clamp(Math.round(+v), lo, hi) : def);
    if (raw.gauge && +raw.gauge.sts > 0 && +raw.gauge.rows > 0) d.gauge = { sts: int(raw.gauge.sts, 1, 200, 20), rows: int(raw.gauge.rows, 1, 200, 20) };
    d.cols = int(raw.cols, 1, 400, 30); d.rows = int(raw.rows, 1, 400, 20);
    d.rings = int(raw.rings, 1, 80, 8); d.start = int(raw.start, 1, 200, 6); d.inc = int(raw.inc, 0, 200, 6);
    d.counts = Array.isArray(raw.counts) ? raw.counts.map((n) => int(n, 1, 999, 6)).slice(0, 80) : null;
    d.center = ['ring', 'chain', 'none'].includes(raw.center) ? raw.center : 'ring';
    Object.assign(d.settings, raw.settings || {});
    if (!['us', 'uk', 'lv'].includes(d.settings.terms)) d.settings.terms = 'us';
    for (const [k, v] of Object.entries(raw.cells)) {
      if (!/^\d+,\d+$/.test(k) || !Array.isArray(v) || !S.byId[v[0]]) continue;
      d.cells[k] = [v[0], /^#[0-9a-f]{6}$/i.test(v[1]) ? v[1] : '#1f2937', +v[2] || 0, v[3] === 'blo' || v[3] === 'flo' ? v[3] : ''];
    }
    if (raw.progress && typeof raw.progress === 'object') {
      d.progress.row = int(raw.progress.row, 1, 9999, 1);
      if (Array.isArray(raw.progress.done)) d.progress.done = [...new Set(raw.progress.done.filter((n) => Number.isInteger(n) && n >= 0 && n < 400))].sort((x, y) => x - y);
    }
    if (raw.image && typeof raw.image.src === 'string' && raw.image.src.startsWith('data:image/')) {
      d.image = Object.assign({ visible: true, opacity: 0.5, scale: 1, dx: 0, dy: 0 }, raw.image);
    }
    return d;
  }

  function loadAutosave() {
    try { const t = localStorage.getItem(STORE_KEY); return t ? normalizeDoc(JSON.parse(t)) : null; } catch { return null; }
  }

  let doc;

  const st = {
    tool: 'brush', sym: 'dc', color: '#1f2937', rot: 0, mod: '',
    sel: null, clip: null, pasting: false, hover: null, space: false, pickReplace: false, preview: false,
  };
  const view = { s: 1, x: 0, y: 0, auto: true }; // auto: keep fitting on resize until the user moves the view
  const hist = { undo: [], redo: [] };
  let pending = null;

  // ---------------------------------------------------------------- geometry
  const key = (a, b) => `${a},${b}`;
  // Row charts can use the real stitch shape: a cell is as tall as gauge stitches / rows (knitting is ~5:7).
  const rowH = () => (doc.mode === 'rect' && doc.gauge ? CELL * clamp(doc.gauge.sts / doc.gauge.rows, 0.35, 3) : CELL);
  const spanOf = (v) => (v && S.byId[v[0]].span) || 1;
  const MAX_SPAN = 6;
  // the anchor key of a multi-cell stitch (cable) that covers cell k from the left, if any
  function coverOf(k) {
    if (doc.mode !== 'rect') return null;
    const [a, b] = unkey(k);
    for (let i = 1; i < MAX_SPAN && a - i >= 0; i++) {
      const kk = key(a - i, b);
      if (doc.cells[kk] && spanOf(doc.cells[kk]) > i) return kk;
    }
    return null;
  }
  const unkey = (k) => { const i = k.indexOf(','); return [+k.slice(0, i), +k.slice(i + 1)]; };

  function ringN(k) {
    const c = doc.counts && doc.counts[k];
    return Math.max(1, c || Math.round(doc.start + doc.inc * k));
  }
  function inBounds(a, b) {
    return doc.mode === 'rect' ? a >= 0 && b >= 0 && a < doc.cols && b < doc.rows
                               : a >= 0 && a < doc.rings && b >= 0 && b < ringN(a);
  }
  function chartBounds() {
    if (doc.mode === 'rect') return { x: 0, y: 0, w: doc.cols * CELL, h: doc.rows * rowH() };
    const R = INNER + doc.rings * CELL;
    return { x: -R, y: -R, w: 2 * R, h: 2 * R };
  }
  function paddedBounds() {
    const B = chartBounds(), p = doc.settings.numbers ? CELL : CELL / 3;
    return { x: B.x - p, y: B.y - p, w: B.w + 2 * p, h: B.h + 2 * p };
  }

  // rect: a = column from left, b = row from bottom (row 1 = b 0)
  // round: a = round index from center, b = stitch index counterclockwise from the top seam
  function cellAt(wx, wy) {
    if (doc.mode === 'rect') {
      const a = Math.floor(wx / CELL), b = doc.rows - 1 - Math.floor(wy / rowH());
      return inBounds(a, b) ? { a, b } : null;
    }
    const d = Math.hypot(wx, wy);
    if (d < INNER) return null;
    const a = Math.floor((d - INNER) / CELL);
    if (a >= doc.rings) return null;
    const N = ringN(a), t = mod(-Math.PI / 2 - Math.atan2(wy, wx), TAU);
    return { a, b: Math.min(N - 1, Math.floor((t / TAU) * N)) };
  }
  function cellGeom(a, b) {
    if (doc.mode === 'rect') { const h = rowH(); return { cx: a * CELL + CELL / 2, cy: (doc.rows - 1 - b) * h + h / 2, size: Math.min(CELL, h), w: CELL, h, rot: 0 }; }
    const N = ringN(a), th = -Math.PI / 2 - ((b + 0.5) * TAU) / N, r = INNER + (a + 0.5) * CELL, w = (TAU * r) / N;
    return { cx: r * Math.cos(th), cy: r * Math.sin(th), size: Math.min(CELL, w), w, h: CELL, rot: th + Math.PI / 2 };
  }
  function traceCell(c, a, b) {
    if (doc.mode === 'rect') { const g = cellGeom(a, b); c.rect(g.cx - CELL / 2, g.cy - g.h / 2, CELL, g.h); return; }
    const N = ringN(a), r0 = INNER + a * CELL, r1 = r0 + CELL;
    const t0 = -Math.PI / 2 - (b * TAU) / N, t1 = t0 - TAU / N;
    c.moveTo(r0 * Math.cos(t0), r0 * Math.sin(t0));
    c.arc(0, 0, r0, t0, t1, true);
    c.arc(0, 0, r1, t1, t0, false);
    c.closePath();
  }

  // ---------------------------------------------------------------- history
  const sameVal = (x, y) => (x && y ? x.join('|') === y.join('|') : x === y);
  function begin() { pending = new Map(); }
  // Writing into any cell of a cable replaces the whole cable; a new cable clears the cells it covers.
  function setCell(k, v) {
    const n = spanOf(v);
    if (n > 1) {
      const [a, b] = unkey(k);
      if (doc.mode !== 'rect' || a + n > doc.cols) return;
      for (let i = 1; i < n; i++) rawSet(key(a + i, b), null);
    }
    const c = coverOf(k);
    if (c) rawSet(c, null);
    rawSet(k, v);
  }
  function rawSet(k, v) {
    const prev = doc.cells[k] || null;
    if (sameVal(prev, v)) return;
    if (!pending.has(k)) pending.set(k, prev);
    if (v) doc.cells[k] = v; else delete doc.cells[k];
  }
  function commit() {
    if (!pending) return;
    const ch = [];
    for (const [k, before] of pending) {
      const after = doc.cells[k] || null;
      if (!sameVal(before, after)) ch.push([k, before, after]);
    }
    pending = null;
    if (!ch.length) return;
    pushHist({ cells: ch });
    changed();
  }
  function pushHist(e) { hist.undo.push(e); if (hist.undo.length > 300) hist.undo.shift(); hist.redo = []; updateUndoButtons(); }
  const snapshot = () => JSON.stringify(Object.assign({}, doc, { image: null, progress: null }));
  function docChange(fn) {
    const before = snapshot();
    fn();
    const after = snapshot();
    if (before !== after) pushHist({ doc: [before, after] });
    syncUI(); changed();
  }
  function applyEntry(e, dir) {
    if (e.cells) {
      for (const [k, b, a] of e.cells) { const v = dir < 0 ? b : a; if (v) doc.cells[k] = v; else delete doc.cells[k]; }
    } else {
      const img = doc.image, prog = doc.progress;
      doc = JSON.parse(dir < 0 ? e.doc[0] : e.doc[1]);
      doc.image = img; doc.progress = prog;
      syncUI();
    }
    changed();
  }
  function undo() { const e = hist.undo.pop(); if (!e) return; applyEntry(e, -1); hist.redo.push(e); updateUndoButtons(); }
  function redo() { const e = hist.redo.pop(); if (!e) return; applyEntry(e, 1); hist.undo.push(e); updateUndoButtons(); }
  function resetHistory() { hist.undo = []; hist.redo = []; updateUndoButtons(); }
  function updateUndoButtons() {
    $('[data-act=undo]').disabled = !hist.undo.length;
    $('[data-act=redo]').disabled = !hist.redo.length;
  }

  let saveTimer = 0, sideTimer = 0, warnedQuota = false;
  function changed() {
    redraw();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(autosave, 500);
    clearTimeout(sideTimer);
    sideTimer = setTimeout(() => { renderLegend(); if ($('#writtenBox').open) renderWritten(); }, 120);
  }
  function autosave() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(doc)); }
    catch {
      try { localStorage.setItem(STORE_KEY, JSON.stringify(Object.assign({}, doc, { image: null }))); } catch { /* storage unavailable */ }
      if (!warnedQuota) { warnedQuota = true; toast(t('toast.quota')); }
    }
  }

  // ---------------------------------------------------------------- rendering backends
  const pathCache = new Map();
  const p2d = (d) => { let p = pathCache.get(d); if (!p) { p = new Path2D(d); pathCache.set(d, p); } return p; };
  const SYM_PAD = 0.86;

  function canvasBackend(c, lineScale) {
    return {
      fillRect(x, y, w, h, fill) { c.fillStyle = fill; c.fillRect(x, y, w, h); },
      disc(cx, cy, r, fill) { c.fillStyle = fill; c.beginPath(); c.arc(cx, cy, r, 0, TAU); c.fill(); },
      lines(segs, stroke, px) {
        if (!segs.length) return;
        c.strokeStyle = stroke; c.lineWidth = px / lineScale; c.lineCap = 'butt'; c.beginPath();
        for (const s of segs) { c.moveTo(s[0], s[1]); c.lineTo(s[2], s[3]); }
        c.stroke();
      },
      circles(list, stroke, px) {
        c.strokeStyle = stroke; c.lineWidth = px / lineScale; c.beginPath();
        for (const [cx, cy, r] of list) { c.moveTo(cx + r, cy); c.arc(cx, cy, r, 0, TAU); }
        c.stroke();
      },
      text(s, x, y, size, color, align = 'center', weight = 400) {
        c.fillStyle = color; c.font = `${weight} ${size}px system-ui, -apple-system, "Segoe UI", sans-serif`;
        c.textAlign = align; c.textBaseline = 'middle'; c.fillText(s, x, y);
      },
      pill(x, y, w, h, fill) {
        c.fillStyle = fill; c.beginPath();
        if (c.roundRect) c.roundRect(x, y, w, h, h / 2); else c.rect(x, y, w, h);
        c.fill();
      },
      image(img, x, y, w, h, opacity) { c.globalAlpha = opacity; c.drawImage(img, x, y, w, h); c.globalAlpha = 1; },
      // stretch widens multi-cell symbols (cables) so they reach across their cells
      symbol(sym, color, cx, cy, size, rot, m, stretch = 1) {
        const k = (size * SYM_PAD) / 100;
        c.save();
        c.translate(cx, cy); if (rot) c.rotate(rot); c.scale(k * stretch, k); c.translate(-50 * sym.span, -50);
        c.strokeStyle = color; c.fillStyle = color; c.lineCap = 'round'; c.lineJoin = 'round';
        c.lineWidth = Math.max(5.5, 1 / (lineScale * k));
        if (m && S.MODIFIERS[m]) {
          c.stroke(p2d(S.MODIFIERS[m].d));
          c.translate(50, 38); c.scale(0.8, 0.8); c.translate(-50, -38);
        }
        for (const p of sym.parts) {
          if (p.fill) { c.globalAlpha = p.alpha || 1; c.fill(p2d(p.d)); c.globalAlpha = 1; } else c.stroke(p2d(p.d));
        }
        c.restore();
      },
      // yarn preview: w is the cell's width along the row/round, h its height
      yarn(id, color, cx, cy, w, h, rot, m) {
        const T = c.getTransform(), k = Math.hypot(T.a, T.b), f = 1 + 2 * YARN.PAD, fw = S.byId[id].span + 2 * YARN.PAD;
        const img = YARN.sprite(id, color, m, Math.max(w, h) * k * f);
        if (!img) return;
        c.save();
        c.translate(cx, cy); if (rot) c.rotate(rot);
        c.drawImage(img, (-w * fw) / 2, (-h * f) / 2, w * fw, h * f);
        c.restore();
      },
      push(dx, dy) { c.save(); c.translate(dx, dy); },
      pop() { c.restore(); },
    };
  }

  function svgBackend() {
    const out = [];
    const n = (v) => Math.round(v * 100) / 100;
    const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
    return {
      out,
      fillRect(x, y, w, h, fill) { out.push(`<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" fill="${fill}"/>`); },
      disc(cx, cy, r, fill) { out.push(`<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" fill="${fill}"/>`); },
      lines(segs, stroke, px) {
        if (!segs.length) return;
        out.push(`<path d="${segs.map((s) => `M${n(s[0])} ${n(s[1])}L${n(s[2])} ${n(s[3])}`).join('')}" stroke="${stroke}" stroke-width="${px}" fill="none"/>`);
      },
      circles(list, stroke, px) {
        for (const [cx, cy, r] of list) out.push(`<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" stroke="${stroke}" stroke-width="${px}" fill="none"/>`);
      },
      text(s, x, y, size, color, align = 'center', weight = 400) {
        const anchor = align === 'left' ? 'start' : align === 'right' ? 'end' : 'middle';
        out.push(`<text x="${n(x)}" y="${n(y)}" font-size="${n(size)}" font-weight="${weight}" fill="${color}" text-anchor="${anchor}" dominant-baseline="central" font-family="system-ui, -apple-system, Segoe UI, sans-serif">${esc(s)}</text>`);
      },
      pill(x, y, w, h, fill) { out.push(`<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="${n(h / 2)}" fill="${fill}"/>`); },
      image() { /* reference images are never exported */ },
      yarn() { /* the yarn preview is raster only */ },
      symbol(sym, color, cx, cy, size, rot, m, stretch = 1) {
        if (!sym.parts.length) return;
        const k = (size * SYM_PAD) / 100;
        let inner = '';
        if (m && S.MODIFIERS[m]) {
          inner += `<path d="${S.MODIFIERS[m].d}" fill="none" stroke="${color}" stroke-width="5.5" stroke-linecap="round"/>`;
          inner += `<g transform="translate(50 38) scale(0.8) translate(-50 -38)">${S.svgInner(sym, color, 5.5)}</g>`;
        } else inner = S.svgInner(sym, color, 5.5);
        out.push(`<g transform="translate(${n(cx)} ${n(cy)}) rotate(${n((rot * 180) / Math.PI)}) scale(${n(k * stretch * 1000) / 1000} ${n(k * 1000) / 1000}) translate(${-50 * sym.span} -50)">${inner}</g>`);
      },
      push(dx, dy) { out.push(`<g transform="translate(${n(dx)} ${n(dy)})">`); },
      pop() { out.push('</g>'); },
    };
  }

  // ---------------------------------------------------------------- chart drawing (shared by screen + export)
  const imgCache = { src: null, el: null };
  function refImage() {
    if (!doc.image) return null;
    if (imgCache.src !== doc.image.src) {
      imgCache.src = doc.image.src; imgCache.el = new Image();
      imgCache.el.onload = () => redraw();
      imgCache.el.src = doc.image.src;
    }
    return imgCache.el.complete && imgCache.el.naturalWidth ? imgCache.el : null;
  }
  function imageRect() {
    const im = refImage(); if (!im) return null;
    const B = chartBounds(), I = doc.image;
    const fit = Math.min(B.w / im.naturalWidth, B.h / im.naturalHeight);
    const w = im.naturalWidth * fit * I.scale, h = im.naturalHeight * fit * I.scale;
    const cx = B.x + B.w / 2 + I.dx * B.w, cy = B.y + B.h / 2 + I.dy * B.h;
    return { im, x: cx - w / 2, y: cy - h / 2, w, h };
  }

  // dark or light ink, whichever reads better on a filled knitting square
  function inkOn(hex) {
    const n = parseInt(hex.slice(1), 16), l = 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
    return l > 150 ? '#1f2937' : '#ffffff';
  }
  function drawStitch(be, v, g, yarn) {
    const sym = S.byId[v[0]], rot = g.rot + (v[2] * Math.PI) / 180;
    const cx = g.cx + ((sym.span - 1) * g.w) / 2;   // multi-cell stitches are anchored at their left cell
    if (yarn) be.yarn(v[0], v[1], cx, g.cy, g.w, g.h, rot, v[3]);
    else be.symbol(sym, doc.craft === 'knit' ? inkOn(v[1]) : v[1], cx, g.cy, g.size, rot, v[3], sym.span > 1 ? g.w / g.size : 1);
  }

  function drawChart(be, o) {
    const s = doc.settings, vr = o.vr, zoom = o.zoom, yarn = !!o.preview;
    const numColor = '#8a7f76';
    if (doc.mode === 'rect') {
      be.fillRect(0, 0, doc.cols * CELL, doc.rows * rowH(), s.bg);
    } else {
      be.disc(0, 0, INNER + doc.rings * CELL, s.bg);
    }
    if (!o.exporting && doc.image && doc.image.visible) {
      const r = imageRect(); if (r) be.image(r.im, r.x, r.y, r.w, r.h, doc.image.opacity);
    }

    if (doc.mode === 'rect') {
      const RH = rowH();
      const c0 = clamp(Math.floor(vr.x0 / CELL), 0, doc.cols), c1 = clamp(Math.ceil(vr.x1 / CELL), 0, doc.cols);
      const y0 = clamp(Math.floor(vr.y0 / RH), 0, doc.rows), y1 = clamp(Math.ceil(vr.y1 / RH), 0, doc.rows);
      const W = doc.cols * CELL, H = doc.rows * RH;
      // knitting charts show yarn color as the square's fill (colorwork), symbols on top
      if (doc.craft === 'knit' && !yarn) {
        for (const k in doc.cells) {
          const [a, b] = unkey(k), v = doc.cells[k];
          if (!inBounds(a, b) || v[1].toLowerCase() === s.bg.toLowerCase()) continue;
          const y = doc.rows - 1 - b, n = Math.min(spanOf(v), doc.cols - a);
          if (a + n < c0 || a > c1 || y + 1 < y0 || y > y1) continue;
          be.fillRect(a * CELL, y * RH, n * CELL, RH, v[1]);
        }
      }
      if (s.showGrid && !yarn) {
        const thin = [], thick = [];
        const fine = CELL * zoom >= 5;
        for (let c = c0; c <= c1; c++) {
          const ten = (doc.cols - c) % 10 === 0;
          if (ten || fine) (ten ? thick : thin).push([c * CELL, y0 * RH, c * CELL, y1 * RH]);
        }
        for (let y = y0; y <= y1; y++) {
          const ten = (doc.rows - y) % 10 === 0;
          if (ten || fine) (ten ? thick : thin).push([c0 * CELL, y * RH, c1 * CELL, y * RH]);
        }
        be.lines(thin, s.grid, 1);
        be.lines(thick, shade(s.grid, -0.18), 1.6);
      }
      if (!yarn) be.lines([[0, 0, W, 0], [W, 0, W, H], [W, H, 0, H], [0, H, 0, 0]], shade(s.grid, -0.3), 1.8);
    } else {
      const R = INNER + doc.rings * CELL;
      if (s.showGrid && !yarn) {
        const circ = [];
        for (let k = 0; k <= doc.rings; k++) circ.push([0, 0, INNER + k * CELL]);
        be.circles(circ, s.grid, 1);
        const radial = [];
        for (let k = 0; k < doc.rings; k++) {
          const N = ringN(k), r0 = INNER + k * CELL, r1 = r0 + CELL;
          if ((TAU * r0 / N) * zoom < 3) continue;
          for (let j = 1; j < N; j++) {
            const t = -Math.PI / 2 - (j * TAU) / N, cs = Math.cos(t), sn = Math.sin(t);
            radial.push([r0 * cs, r0 * sn, r1 * cs, r1 * sn]);
          }
        }
        be.lines(radial, s.grid, 1);
      }
      if (!yarn) {
        be.lines([[0, -INNER, 0, -R]], '#c2410c', 1.6); // start seam
        be.circles([[0, 0, R]], shade(s.grid, -0.3), 1.8);
      }
      if (doc.center === 'ring' && yarn) be.yarn('ring', '#a8a29e', 0, 0, INNER * 1.3, INNER * 1.3, 0, '');
      else if (doc.center === 'ring') be.symbol(S.byId.ring, '#8a7f76', 0, 0, INNER * 1.55, 0, '');
      else if (doc.center === 'chain') {
        const n = Math.max(4, Math.min(12, ringN(0))), cr = INNER * 0.55;
        for (let i = 0; i < n; i++) {
          const t = (i * TAU) / n;
          const x = cr * Math.cos(t), y = cr * Math.sin(t), len = (TAU * cr) / n * 1.15;
          if (yarn) be.yarn('ch', '#a8a29e', x, y, len, len * 0.7, t + Math.PI / 2, '');
          else be.symbol(S.byId.ch, '#8a7f76', x, y, len, t + Math.PI / 2, '');
        }
      }
    }

    // stitches; in the yarn preview each row/round is drawn over the one below it
    const m = CELL * 1.5, todo = [];
    for (const k in doc.cells) {
      const [a, b] = unkey(k);
      if (!inBounds(a, b)) continue;
      const g = cellGeom(a, b);
      if (g.cx < vr.x0 - m || g.cx > vr.x1 + m || g.cy < vr.y0 - m || g.cy > vr.y1 + m) continue;
      todo.push([doc.mode === 'rect' ? b : a, doc.cells[k], g]);
    }
    if (yarn) todo.sort((x, y) => x[0] - y[0]);
    for (const [, v, g] of todo) drawStitch(be, v, g, yarn);

    // numbering
    if (s.numbers && !yarn) {
      const fs = CELL * 0.4;
      if (doc.mode === 'rect') {
        for (let b = 0; b < doc.rows; b++) {
          const y = (doc.rows - 1 - b + 0.5) * rowH(), n = b + 1;
          if (n % 2 || doc.knitRound) be.text(String(n), doc.cols * CELL + CELL * 0.5, y, fs, numColor, 'center');
          else be.text(String(n), -CELL * 0.5, y, fs, numColor, 'center');
        }
        for (let a = 0; a < doc.cols; a++) {
          const n = doc.cols - a;
          if (n === 1 || n % 5 === 0) be.text(String(n), a * CELL + CELL / 2, doc.rows * rowH() + CELL * 0.5, fs * 0.85, numColor, 'center');
        }
      } else {
        for (let k = 0; k < doc.rings; k++) {
          const r = INNER + (k + 0.5) * CELL, label = String(k + 1), w = fs * (0.55 * label.length + 0.7);
          be.pill(-w / 2, -r - fs * 0.6, w, fs * 1.2, s.bg);
          be.text(label, 0, -r, fs * 0.85, '#c2410c', 'center', 600);
        }
      }
    }
  }

  function shade(hex, amt) {
    if (!/^#[0-9a-f]{6}$/i.test(hex)) return hex;
    const n = parseInt(hex.slice(1), 16);
    let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    const t = amt < 0 ? 0 : 255, p = Math.abs(amt);
    r = Math.round((t - r) * p + r); g = Math.round((t - g) * p + g); b = Math.round((t - b) * p + b);
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  }

  // ---------------------------------------------------------------- screen render
  let frame = 0;
  function redraw() { if (!frame) frame = requestAnimationFrame(render); }
  function render() {
    frame = 0;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr * view.s, 0, 0, dpr * view.s, dpr * view.x, dpr * view.y);
    const vr = { x0: -view.x / view.s, y0: -view.y / view.s, x1: (w - view.x) / view.s, y1: (h - view.y) / view.s };
    drawChart(canvasBackend(ctx, view.s), { vr, zoom: view.s, preview: st.preview });
    drawOverlays();
  }

  // one row (rect) or round as a closed path
  function traceLine(c, n) {
    if (doc.mode === 'rect') { const h = rowH(); c.rect(0, (doc.rows - 1 - n) * h, doc.cols * CELL, h); return; }
    const r0 = INNER + n * CELL;
    c.arc(0, 0, r0 + CELL, 0, TAU); c.moveTo(r0, 0); c.arc(0, 0, r0, 0, TAU, true);
  }
  const lineCount = () => (doc.mode === 'rect' ? doc.rows : doc.rings);
  function drawProgress() {
    const lw = 1 / view.s, P = doc.progress;
    // checked rows: washed out and struck through, but the stitches stay readable
    for (const n of P.done) {
      if (n >= lineCount()) continue;
      ctx.beginPath(); traceLine(ctx, n);
      ctx.globalAlpha = 0.55; ctx.fillStyle = doc.settings.bg; ctx.fill('evenodd'); ctx.globalAlpha = 1;
      ctx.beginPath();
      if (doc.mode === 'rect') { const y = (doc.rows - 1 - n + 0.5) * rowH(); ctx.moveTo(-CELL * 0.2, y); ctx.lineTo(doc.cols * CELL + CELL * 0.2, y); }
      else ctx.arc(0, 0, INNER + (n + 0.5) * CELL, 0, TAU);
      ctx.strokeStyle = 'rgba(21,128,61,.85)'; ctx.lineWidth = Math.max(2.5 * lw, CELL * 0.07); ctx.stroke();
    }
    // the row the counter is on
    const cur = P.row - 1;
    if (cur < lineCount()) {
      ctx.beginPath(); traceLine(ctx, cur);
      ctx.strokeStyle = '#1d4ed8'; ctx.lineWidth = 2.5 * lw; ctx.stroke();
    }
  }

  function drawOverlays() {
    const lw = 1 / view.s;
    drawProgress();
    // selection
    if (st.sel) {
      const r = selWorldRect();
      ctx.fillStyle = 'rgba(194,65,12,.08)'; ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.setLineDash([6 * lw, 4 * lw]); ctx.strokeStyle = '#c2410c'; ctx.lineWidth = 1.6 * lw;
      ctx.strokeRect(r.x, r.y, r.w, r.h); ctx.setLineDash([]);
    }
    // paste preview
    if (st.pasting && st.clip && st.hover) {
      const be = canvasBackend(ctx, view.s);
      ctx.globalAlpha = 0.55;
      for (const [da, db, v] of st.clip.cells) {
        const a = st.hover.a + da, b = st.hover.b + db;
        const t = wrapCell(a, b); if (!t) continue;
        drawStitch(be, v, cellGeom(t.a, t.b), st.preview);
      }
      ctx.globalAlpha = 1;
      const tl = wrapCell(st.hover.a, st.hover.b);
      if (tl && doc.mode === 'rect') {
        const g = cellGeom(st.hover.a, st.hover.b);
        ctx.strokeStyle = '#c2410c'; ctx.lineWidth = 1.5 * lw; ctx.setLineDash([4 * lw, 3 * lw]);
        ctx.strokeRect(g.cx - CELL / 2, g.cy - g.h / 2 - (st.clip.h - 1) * g.h, st.clip.w * CELL, st.clip.h * g.h);
        ctx.setLineDash([]);
      }
    }
    // hover cell
    if (st.hover && !gesture?.type?.startsWith('pinch')) {
      ctx.beginPath(); traceCell(ctx, st.hover.a, st.hover.b);
      ctx.fillStyle = 'rgba(194,65,12,.10)'; ctx.fill();
      ctx.strokeStyle = 'rgba(194,65,12,.85)'; ctx.lineWidth = 1.5 * lw; ctx.stroke();
      if (st.tool === 'brush' && !st.pasting && !doc.cells[key(st.hover.a, st.hover.b)]) {
        ctx.globalAlpha = st.preview ? 0.6 : 0.35;
        drawStitch(canvasBackend(ctx, view.s), curVal(), cellGeom(st.hover.a, st.hover.b), st.preview);
        ctx.globalAlpha = 1;
      }
    }
    // zoom box
    if (gesture && gesture.type === 'zoombox') {
      const dpr = window.devicePixelRatio || 1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const x = Math.min(gesture.sx, gesture.ex), y = Math.min(gesture.sy, gesture.ey);
      ctx.fillStyle = 'rgba(29,78,216,.08)'; ctx.fillRect(x, y, Math.abs(gesture.ex - gesture.sx), Math.abs(gesture.ey - gesture.sy));
      ctx.strokeStyle = '#1d4ed8'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]);
      ctx.strokeRect(x, y, Math.abs(gesture.ex - gesture.sx), Math.abs(gesture.ey - gesture.sy)); ctx.setLineDash([]);
    }
  }

  // ---------------------------------------------------------------- view / zoom
  const MIN_Z = 0.04, MAX_Z = 14;
  function zoomAt(sx, sy, factor) {
    const ns = clamp(view.s * factor, MIN_Z, MAX_Z);
    const wx = (sx - view.x) / view.s, wy = (sy - view.y) / view.s;
    view.s = ns; view.x = sx - wx * ns; view.y = sy - wy * ns;
    afterView();
  }
  function zoomToRect(x, y, w, h, pad = 28) {
    const cw = canvas.clientWidth, ch = canvas.clientHeight;
    view.s = clamp(Math.min((cw - 2 * pad) / Math.max(w, 1), (ch - 2 * pad) / Math.max(h, 1)), MIN_Z, MAX_Z);
    view.x = cw / 2 - (x + w / 2) * view.s; view.y = ch / 2 - (y + h / 2) * view.s;
    afterView();
  }
  function fit() { const B = paddedBounds(); zoomToRect(B.x, B.y, B.w, B.h); view.auto = true; }
  function afterView() {
    view.auto = false; $('#zoomLabel').textContent = Math.round(view.s * 100) + '%'; redraw(); }
  const toWorld = (sx, sy) => ({ x: (sx - view.x) / view.s, y: (sy - view.y) / view.s });

  // ---------------------------------------------------------------- editing helpers
  const curVal = () => [st.sym, st.color, st.rot, st.mod];

  function wrapCell(a, b) {
    if (doc.mode === 'rect') return inBounds(a, b) ? { a, b } : null;
    if (a < 0 || a >= doc.rings) return null;
    return { a, b: mod(b, ringN(a)) };
  }

  function paintCell(c, erase) {
    if (!c) return;
    const k = key(c.a, c.b);
    setCell(k, erase ? null : curVal());
  }
  function paintLine(p0, p1, erase) {
    const d = Math.hypot(p1.x - p0.x, p1.y - p0.y), steps = Math.max(1, Math.ceil(d / (CELL * 0.25)));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      paintCell(cellAt(p0.x + (p1.x - p0.x) * t, p0.y + (p1.y - p0.y) * t), erase);
    }
  }

  function floodFill(c) {
    if (S.byId[st.sym].span > 1) { toast(t('toast.noFillSpan')); return; }
    const startK = key(c.a, c.b), target = doc.cells[startK] || null, repl = curVal();
    if (sameVal(target, repl)) return;
    const seen = new Set([startK]), queue = [[c.a, c.b]];
    begin();
    while (queue.length && seen.size < 200000) {
      const [a, b] = queue.pop();
      setCell(key(a, b), repl);
      const nb = doc.mode === 'rect'
        ? [[a + 1, b], [a - 1, b], [a, b + 1], [a, b - 1]]
        : [[a, mod(b + 1, ringN(a))], [a, mod(b - 1, ringN(a))]];
      for (const [x, y] of nb) {
        const k = key(x, y);
        if (seen.has(k) || !inBounds(x, y) || !sameVal(doc.cells[k] || null, target)) continue;
        seen.add(k); queue.push([x, y]);
      }
    }
    commit();
  }

  function pick(c) {
    const v = c && (doc.cells[key(c.a, c.b)] || doc.cells[coverOf(key(c.a, c.b))]);
    if (!v) { toast(t('toast.emptyCell')); return; }
    if (st.pickReplace) {
      st.pickReplace = false; hideHint();
      replaceColor(v[1], st.color);
      return;
    }
    st.sym = v[0]; st.color = v[1]; st.rot = v[2]; st.mod = v[3];
    setTool('brush'); syncStyleUI();
  }

  function replaceColor(from, to) {
    if (from.toLowerCase() === to.toLowerCase()) { toast(t('toast.sameColor')); return; }
    begin();
    for (const k in doc.cells) { const v = doc.cells[k]; if (v[1].toLowerCase() === from.toLowerCase()) setCell(k, [v[0], to, v[2], v[3]]); }
    const n = pending.size; commit();
    toast(t('toast.recolored', { n }));
  }

  // selection (rect mode)
  function normSel(s) { return { a0: Math.min(s.a0, s.a1), a1: Math.max(s.a0, s.a1), b0: Math.min(s.b0, s.b1), b1: Math.max(s.b0, s.b1) }; }
  function selWorldRect() {
    const s = normSel(st.sel);
    const RH = rowH();
    return { x: s.a0 * CELL, y: (doc.rows - 1 - s.b1) * RH, w: (s.a1 - s.a0 + 1) * CELL, h: (s.b1 - s.b0 + 1) * RH };
  }
  function selCells(fn) {
    const s = normSel(st.sel);
    for (let b = s.b0; b <= s.b1; b++) for (let a = s.a0; a <= s.a1; a++) fn(a, b, s);
  }
  function setSelection(sel) {
    st.sel = sel;
    $('#selActions').hidden = !sel && !st.clip;
    redraw();
  }
  function copySel() {
    if (!st.sel) return false;
    const cells = [];
    selCells((a, b, s) => { const v = doc.cells[key(a, b)]; if (v) cells.push([a - s.a0, b - s.b0, v.slice()]); });
    const s = normSel(st.sel);
    st.clip = { w: s.a1 - s.a0 + 1, h: s.b1 - s.b0 + 1, cells };
    toast(t('toast.copied', { n: cells.length }));
    return true;
  }
  function deleteSel() { if (!st.sel) return; begin(); selCells((a, b) => setCell(key(a, b), null)); commit(); }
  function flipSel(horizontal) {
    if (!st.sel) return;
    const snap = [];
    selCells((a, b) => { const v = doc.cells[key(a, b)]; if (v) snap.push([a, b, v]); });
    begin();
    selCells((a, b) => setCell(key(a, b), null));
    for (const [a, b, v] of snap) {
      const s = normSel(st.sel), sym = S.byId[v[0]];
      // a cable's anchor is its left cell, so after a mirror it starts where its right end was
      const na = horizontal ? s.a1 - (a - s.a0) - (sym.span - 1) : a, nb = horizontal ? b : s.b1 - (b - s.b0);
      const id = horizontal && sym.mirror ? sym.mirror : v[0];
      const rot = sym.mirror ? v[2] : horizontal ? mod(360 - v[2], 360) : mod(180 - v[2], 360);
      setCell(key(na, nb), [id, v[1], rot, v[3]]);
    }
    commit();
  }
  function recolorSel() {
    if (!st.sel) return;
    begin(); selCells((a, b) => { const v = doc.cells[key(a, b)]; if (v) setCell(key(a, b), [v[0], st.color, v[2], v[3]]); }); commit();
  }
  function startPaste() {
    if (!st.clip || !st.clip.cells.length) { toast(t('toast.copyFirst')); return; }
    st.pasting = true;
    showHint(t('hint.paste'));
    redraw();
  }
  function doPaste(c) {
    begin();
    for (const [da, db, v] of st.clip.cells) { const t = wrapCell(c.a + da, c.b + db); if (t) setCell(key(t.a, t.b), v.slice()); }
    commit();
  }
  function stopPaste() { st.pasting = false; hideHint(); redraw(); }

  // ---------------------------------------------------------------- progress: row counter & checked rows
  // the row (rect) or round under a world point; anywhere along the row counts, including its number
  function lineAt(w) {
    if (doc.mode === 'rect') {
      const b = doc.rows - 1 - Math.floor(w.y / rowH());
      return b >= 0 && b < doc.rows && w.x >= -CELL && w.x < (doc.cols + 1) * CELL ? b : null;
    }
    const c = cellAt(w.x, w.y);
    return c ? c.a : null;
  }
  function setDone(n, on) {
    const d = doc.progress.done, has = d.includes(n);
    if (on === has) return;
    doc.progress.done = on ? [...d, n].sort((x, y) => x - y) : d.filter((x) => x !== n);
    progressChanged();
  }
  function stepRow(d) {
    doc.progress.row = clamp(doc.progress.row + d, 1, 9999);
    progressChanged();
  }
  function resetProgress() {
    if (!confirm(t('confirm.resetProgress'))) return;
    doc.progress = { row: 1, done: [] };
    progressChanged();
  }
  function progressChanged() { syncProgressUI(); redraw(); clearTimeout(saveTimer); saveTimer = setTimeout(autosave, 500); }
  function syncProgressUI() {
    $('#counterLabel').textContent = t(doc.mode === 'round' || doc.knitRound ? 'progress.round' : 'progress.row');
    $('#counterVal').textContent = doc.progress.row;
    $('[data-act=rowDec]').disabled = doc.progress.row <= 1;
  }

  // ---------------------------------------------------------------- pointer input
  const pointers = new Map();
  let gesture = null;

  function localPos(e) { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }

  canvas.addEventListener('pointerdown', (e) => {
    canvas.focus({ preventScroll: true });
    canvas.setPointerCapture(e.pointerId);
    const p = localPos(e);
    pointers.set(e.pointerId, p);

    if (pointers.size === 2) {
      if (gesture && gesture.type === 'draw') commit();
      const [p1, p2] = [...pointers.values()];
      gesture = { type: 'pinch', d0: Math.hypot(p1.x - p2.x, p1.y - p2.y) || 1, m0: { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }, v0: { ...view } };
      return;
    }
    if (pointers.size > 2) return;

    const tool = e.button === 1 || e.button === 2 || st.space ? 'pan' : st.tool;
    const w = toWorld(p.x, p.y), c = cellAt(w.x, w.y);

    if (st.pasting && tool !== 'pan') { st.hover = hoverFor(w, c); if (st.hover) doPaste(st.hover); return; }
    if (st.pickReplace && tool !== 'pan') { pick(c); return; }

    switch (tool) {
      case 'pan': gesture = { type: 'pan', sx: p.x, sy: p.y, vx: view.x, vy: view.y }; canvas.style.cursor = 'grabbing'; break;
      case 'brush': case 'eraser':
        begin(); gesture = { type: 'draw', last: w, erase: tool === 'eraser' }; paintCell(c, tool === 'eraser'); redraw(); break;
      case 'fill': if (c) floodFill(c); break;
      case 'picker': pick(c); break;
      case 'select': {
        if (doc.mode !== 'rect') { toast(t('toast.selectRows')); break; }
        const a = clamp(Math.floor(w.x / CELL), 0, doc.cols - 1), b = clamp(doc.rows - 1 - Math.floor(w.y / rowH()), 0, doc.rows - 1);
        gesture = { type: 'select' }; setSelection({ a0: a, b0: b, a1: a, b1: b }); break;
      }
      case 'zoom': gesture = { type: 'zoombox', sx: p.x, sy: p.y, ex: p.x, ey: p.y, out: e.shiftKey || e.altKey }; break;
      case 'check': {
        // dragging applies the first row's new state to every row passed over
        const n = lineAt(w); if (n == null) break;
        gesture = { type: 'check', on: !doc.progress.done.includes(n) }; setDone(n, gesture.on); break;
      }
    }
  });

  canvas.addEventListener('pointermove', (e) => {
    const p = localPos(e);
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, p);
    const w = toWorld(p.x, p.y);

    if (gesture && gesture.type === 'pinch' && pointers.size >= 2) {
      const [p1, p2] = [...pointers.values()];
      const d = Math.hypot(p1.x - p2.x, p1.y - p2.y), m = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      const g = gesture, ns = clamp(g.v0.s * (d / g.d0), MIN_Z, MAX_Z);
      const wx = (g.m0.x - g.v0.x) / g.v0.s, wy = (g.m0.y - g.v0.y) / g.v0.s;
      view.s = ns; view.x = m.x - wx * ns; view.y = m.y - wy * ns;
      afterView(); return;
    }

    const c = cellAt(w.x, w.y), hv = hoverFor(w, c);
    if (!sameHover(hv, st.hover)) { st.hover = hv; updateStatus(); redraw(); }

    if (!gesture) return;
    switch (gesture.type) {
      case 'pan': view.x = gesture.vx + p.x - gesture.sx; view.y = gesture.vy + p.y - gesture.sy; view.auto = false; redraw(); break;
      case 'draw': paintLine(gesture.last, w, gesture.erase); gesture.last = w; redraw(); break;
      case 'select': {
        const a = clamp(Math.floor(w.x / CELL), 0, doc.cols - 1), b = clamp(doc.rows - 1 - Math.floor(w.y / rowH()), 0, doc.rows - 1);
        st.sel.a1 = a; st.sel.b1 = b; redraw(); break;
      }
      case 'zoombox': gesture.ex = p.x; gesture.ey = p.y; redraw(); break;
      case 'check': { const n = lineAt(w); if (n != null) setDone(n, gesture.on); break; }
    }
  });

  function endPointer(e) {
    pointers.delete(e.pointerId);
    if (!gesture) return;
    const g = gesture;
    if (g.type === 'pinch') { if (pointers.size < 2) gesture = null; return; }
    gesture = null;
    if (g.type === 'draw') commit();
    if (g.type === 'pan') applyCursor();
    if (g.type === 'zoombox') {
      const dx = Math.abs(g.ex - g.sx), dy = Math.abs(g.ey - g.sy);
      if (dx < 8 && dy < 8) zoomAt(g.sx, g.sy, g.out ? 0.5 : 2);
      else {
        const a = toWorld(Math.min(g.sx, g.ex), Math.min(g.sy, g.ey)), b = toWorld(Math.max(g.sx, g.ex), Math.max(g.sy, g.ey));
        zoomToRect(a.x, a.y, b.x - a.x, b.y - a.y, 8);
      }
    }
    redraw();
  }
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);
  canvas.addEventListener('pointerleave', () => { if (!gesture) { st.hover = null; updateStatus(); redraw(); } });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const p = localPos(e);
    if (e.shiftKey && !e.ctrlKey) { view.x -= e.deltaY || e.deltaX; view.auto = false; redraw(); return; }
    const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    zoomAt(p.x, p.y, Math.exp(-dy * (e.ctrlKey ? 0.01 : 0.0018)));
  }, { passive: false });

  // while pasting on a row chart the anchor may sit outside the grid so a motif can overhang the edge
  const hoverFor = (w, c) => (st.pasting && doc.mode === 'rect'
    ? { a: Math.floor(w.x / CELL), b: doc.rows - 1 - Math.floor(w.y / rowH()) } : c);
  const sameHover = (x, y) => (x && y ? x.a === y.a && x.b === y.b : x === y);

  // ---------------------------------------------------------------- keyboard
  const TOOL_KEYS = { b: 'brush', e: 'eraser', f: 'fill', i: 'picker', s: 'select', z: 'zoom', h: 'pan', c: 'check' };
  window.addEventListener('keydown', (e) => {
    const t = e.target;
    if (t.closest && t.closest('input, textarea, select, dialog')) return;
    const k = e.key.toLowerCase(), mod_ = e.ctrlKey || e.metaKey;
    if (mod_) {
      if (k === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      else if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); redo(); }
      else if (k === 's') { e.preventDefault(); saveFile(); }
      else if (k === 'o') { e.preventDefault(); $('#fileOpen').click(); }
      else if (k === 'c') { if (copySel()) e.preventDefault(); }
      else if (k === 'x') { if (copySel()) { deleteSel(); e.preventDefault(); } }
      else if (k === 'v') { e.preventDefault(); startPaste(); }
      else if (k === 'a' && doc.mode === 'rect') { e.preventDefault(); setTool('select'); setSelection({ a0: 0, b0: 0, a1: doc.cols - 1, b1: doc.rows - 1 }); }
      return;
    }
    if (e.key === ' ') { if (!st.space) { st.space = true; applyCursor(); } e.preventDefault(); return; }
    if (e.key === 'Escape') { if (st.pasting) stopPaste(); else if (st.pickReplace) { st.pickReplace = false; hideHint(); } else setSelection(null); return; }
    if (e.key === 'Delete' || e.key === 'Backspace') { deleteSel(); e.preventDefault(); return; }
    if (TOOL_KEYS[k]) { setTool(TOOL_KEYS[k]); return; }
    if (k === 'r') { rotate(e.shiftKey ? -45 : 45); return; }
    if (k === '0') { fit(); return; }
    if (k === 'p') { togglePreview(); return; }
    if (k === 'n') { stepRow(e.shiftKey ? -1 : 1); return; }
    if (k === '+' || k === '=') { zoomAt(canvas.clientWidth / 2, canvas.clientHeight / 2, 1.25); return; }
    if (k === '-' || k === '_') { zoomAt(canvas.clientWidth / 2, canvas.clientHeight / 2, 0.8); return; }
  });
  window.addEventListener('keyup', (e) => { if (e.key === ' ') { st.space = false; applyCursor(); } });
  window.addEventListener('blur', () => { st.space = false; });

  // ---------------------------------------------------------------- UI: tools, style, library
  function setTool(t) {
    st.tool = t;
    $$('#tools button').forEach((b) => b.classList.toggle('active', b.dataset.tool === t));
    $('#toolHint').textContent = window.I18N.t('hint.' + t);
    applyCursor();
    redraw();
  }
  function applyCursor() { canvas.style.cursor = st.space ? 'grab' : { pan: 'grab', zoom: 'zoom-in', picker: 'copy', check: 'pointer' }[st.tool] || 'crosshair'; }
  function togglePreview() {
    st.preview = !st.preview;
    $('#btnPreview').setAttribute('aria-pressed', String(st.preview));
    redraw();
  }
  function rotate(d) { st.rot = mod(st.rot + d, 360); syncStyleUI(); redraw(); }

  function symSvg(sym, color = 'currentColor') { return `<svg viewBox="${S.viewBox(sym)}" aria-hidden="true">${S.svgInner(sym, color, 6)}</svg>`; }
  const forCraft = (s) => s.craft === 'any' || s.craft === doc.craft;

  function buildLibrary() {
    const q = $('#symSearch').value.trim().toLowerCase(), terms = doc.settings.terms;
    let html = '';
    for (const cat of [...S.cats.filter((c) => c !== 'mark'), 'mark']) {   // markers last, after the stitches
      const catName = t('cat.' + cat);
      const items = S.list.filter((s) => s.cat === cat && forCraft(s) && (!q || [...s.us, ...s.uk, ...s.lv, catName].join(' ').toLowerCase().includes(q)));
      if (!items.length) continue;
      html += `<h3>${catName}</h3><div class="sym-grid">` + items.map((s) =>
        `<button class="sym${s.id === st.sym ? ' active' : ''}" data-sym="${s.id}" title="${S.abbr(s, terms)} · ${S.name(s, terms)}">${symSvg(s)}<small>${S.abbr(s, terms)}</small></button>`).join('') + '</div>';
    }
    $('#library').innerHTML = html || `<p class="muted small">${t('lib.none')}</p>`;
  }
  $('#library').addEventListener('click', (e) => {
    const b = e.target.closest('[data-sym]'); if (!b) return;
    st.sym = b.dataset.sym;
    if (st.tool !== 'brush' && st.tool !== 'fill') setTool('brush');
    syncStyleUI(); closeDrawers();
  });
  $('#symSearch').addEventListener('input', buildLibrary);

  function syncStyleUI() {
    const s = S.byId[st.sym], terms = doc.settings.terms;
    $('#curSym').innerHTML = S.svgInner(s, st.color, 6);
    $('#curSym').setAttribute('viewBox', S.viewBox(s));
    $('#curSym').style.transform = `rotate(${st.rot}deg)`;
    $('#curAbbr').textContent = S.abbr(s, terms) + (st.mod ? ' ' + S.modAbbr(st.mod, terms) : '');
    $('#curName').textContent = S.name(s, terms);
    $('#color').value = st.color;
    $('#rotLabel').textContent = st.rot + '°';
    $$('#modSeg button').forEach((b) => b.classList.toggle('active', b.dataset.mod === st.mod));
    $$('.sym').forEach((b) => b.classList.toggle('active', b.dataset.sym === st.sym));
    $$('.swatch').forEach((b) => b.classList.toggle('active', b.dataset.color.toLowerCase() === st.color.toLowerCase()));
  }
  $('#modSeg').addEventListener('click', (e) => { const b = e.target.closest('[data-mod]'); if (b) { st.mod = b.dataset.mod; syncStyleUI(); } });
  $('#tools').addEventListener('click', (e) => { const b = e.target.closest('[data-tool]'); if (b) setTool(b.dataset.tool); });
  $('#color').addEventListener('input', (e) => { st.color = e.target.value; syncStyleUI(); redraw(); });

  function buildSwatches() {
    const used = [...new Set(Object.values(doc.cells).map((v) => v[1].toLowerCase()))];
    const all = [...new Set([...PALETTE, ...used])].slice(0, 32);
    $('#swatches').innerHTML = all.map((c) => `<button class="swatch" data-color="${c}" style="background:${c}" title="${c}"></button>`).join('');
    syncStyleUI();
  }
  $('#swatches').addEventListener('click', (e) => { const b = e.target.closest('[data-color]'); if (b) { st.color = b.dataset.color; syncStyleUI(); redraw(); } });

  // ---------------------------------------------------------------- UI: chart settings
  function syncUI() {
    const s = doc.settings;
    $('#docName').value = doc.name;
    $('#repeatBox').hidden = doc.mode !== 'round';
    $('#rectSettings').style.display = doc.mode === 'rect' ? '' : 'none';
    $('#roundSettings').style.display = doc.mode === 'round' ? '' : 'none';
    $('#modeInfo').textContent = t(doc.craft === 'knit' ? (doc.knitRound ? 'mode.knitRound' : 'mode.knit') : doc.mode === 'rect' ? 'mode.rect' : 'mode.round');
    $('#knitOpts').hidden = doc.craft !== 'knit';
    $('#knitRound').checked = doc.knitRound;
    $('#gaugeSts').value = doc.gauge ? doc.gauge.sts : ''; $('#gaugeRows').value = doc.gauge ? doc.gauge.rows : '';
    if (!forCraft(S.byId[st.sym])) { st.sym = doc.craft === 'knit' ? 'k' : 'dc'; st.mod = ''; }
    $('#cols').value = doc.cols; $('#rows').value = doc.rows;
    $('#rings').value = doc.rings; $('#start').value = doc.start; $('#inc').value = doc.inc;
    $('#counts').value = doc.counts ? doc.counts.join(', ') : '';
    $('#center').value = doc.center;
    $('#bgColor').value = s.bg; $('#gridColor').value = s.grid;
    $('#showGrid').checked = s.showGrid; $('#showNumbers').checked = s.numbers;
    $('#exportLegend').checked = s.exportLegend; $('#terms').value = s.terms;
    $('#imgControls').hidden = !doc.image;
    if (doc.image) {
      $('#imgShow').checked = doc.image.visible; $('#imgOpacity').value = doc.image.opacity;
      $('#imgScale').value = doc.image.scale; $('#imgX').value = doc.image.dx; $('#imgY').value = doc.image.dy;
    }
    if (doc.mode !== 'rect') setSelection(null);
    buildLibrary(); buildSwatches(); renderLegend(); updateStatus(); syncProgressUI();
    if ($('#writtenBox').open) renderWritten();
  }

  $('#docName').addEventListener('change', (e) => { const v = e.target.value.trim() || t('doc.untitled'); docChange(() => { doc.name = v; }); });

  $('#knitRound').addEventListener('change', (e) => docChange(() => { doc.knitRound = e.target.checked; }));
  function applyGauge() {
    const sts = Math.round(+$('#gaugeSts').value), rows = Math.round(+$('#gaugeRows').value);
    docChange(() => { doc.gauge = sts > 0 && rows > 0 ? { sts: clamp(sts, 1, 200), rows: clamp(rows, 1, 200) } : null; });
    fit();
  }
  $('#gaugeSts').addEventListener('change', applyGauge);
  $('#gaugeRows').addEventListener('change', applyGauge);

  function pruneCells() { for (const k in doc.cells) { const [a, b] = unkey(k); if (!inBounds(a, b)) delete doc.cells[k]; } }

  function applySize() {
    const n = (id, lo, hi) => clamp(Math.round(+$(id).value || lo), lo, hi);
    const next = doc.mode === 'rect'
      ? { cols: n('#cols', 1, 400), rows: n('#rows', 1, 400) }
      : { rings: n('#rings', 1, 80), start: n('#start', 1, 200), inc: clamp(Math.round(+$('#inc').value || 0), 0, 200), center: $('#center').value,
          counts: (() => { const arr = $('#counts').value.split(/[\s,;]+/).filter(Boolean).map((x) => clamp(Math.round(+x) || 1, 1, 999)); return arr.length ? arr : null; })() };
    const trial = Object.assign({}, doc, next);
    const lost = Object.keys(doc.cells).filter((k) => {
      const [a, b] = unkey(k);
      if (trial.mode === 'rect') return a >= trial.cols || b >= trial.rows;
      const N = Math.max(1, (trial.counts && trial.counts[a]) || Math.round(trial.start + trial.inc * a));
      return a >= trial.rings || b >= N;
    }).length;
    if (lost && !confirm(t('confirm.lost', { n: lost }))) return;
    docChange(() => { Object.assign(doc, next); pruneCells(); });
    fit();
  }

  function repeatRound() {
    const R = clamp(Math.round(+$('#repRound').value || 1), 1, doc.rings) - 1;
    const L = Math.max(1, Math.round(+$('#repLen').value || 1)), N = ringN(R);
    if (L >= N) { toast(t('toast.motifTooLong', { r: R + 1, n: N })); return; }
    begin();
    for (let i = L; i < N; i++) { const v = doc.cells[key(R, i % L)]; setCell(key(R, i), v ? v.slice() : null); }
    commit();
    toast(t('toast.repeated', { len: L, r: R + 1, partial: N % L ? t('toast.partial') : '' }));
  }

  const settingInputs = {
    '#bgColor': (v) => { doc.settings.bg = v; }, '#gridColor': (v) => { doc.settings.grid = v; },
    '#showGrid': (v, el) => { doc.settings.showGrid = el.checked; }, '#showNumbers': (v, el) => { doc.settings.numbers = el.checked; },
    '#exportLegend': (v, el) => { doc.settings.exportLegend = el.checked; },
    '#terms': (v) => { doc.settings.terms = v; },
  };
  for (const [sel, fn] of Object.entries(settingInputs)) {
    $(sel).addEventListener('change', (e) => docChange(() => fn(e.target.value, e.target)));
  }
  $('#bgColor').addEventListener('input', (e) => { doc.settings.bg = e.target.value; redraw(); });
  $('#gridColor').addEventListener('input', (e) => { doc.settings.grid = e.target.value; redraw(); });

  // reference image
  function loadImageFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    const fr = new FileReader();
    fr.onload = () => {
      // Downscale big photos so designs stay a reasonable size.
      const im = new Image();
      im.onload = () => {
        const max = 1600, k = Math.min(1, max / Math.max(im.width, im.height));
        const c = document.createElement('canvas');
        c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
        c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
        doc.image = { src: c.toDataURL('image/jpeg', 0.85), visible: true, opacity: 0.45, scale: 1, dx: 0, dy: 0 };
        syncUI(); changed();
        $('#imgControls').closest('details').open = true;
        toast(t('toast.imageAdded'));
      };
      im.src = fr.result;
    };
    fr.readAsDataURL(file);
  }
  const imgSet = (prop, isCheck) => (e) => { if (!doc.image) return; doc.image[prop] = isCheck ? e.target.checked : +e.target.value; changed(); };
  $('#imgShow').addEventListener('change', imgSet('visible', true));
  $('#imgOpacity').addEventListener('input', imgSet('opacity'));
  $('#imgScale').addEventListener('input', imgSet('scale'));
  $('#imgX').addEventListener('input', imgSet('dx'));
  $('#imgY').addEventListener('input', imgSet('dy'));
  $('#fileImage').addEventListener('change', (e) => { loadImageFile(e.target.files[0]); e.target.value = ''; });

  // ---------------------------------------------------------------- legend & written instructions
  function usedSymbols() {
    const ids = new Set(), mods = new Set(), colors = [];
    for (const v of Object.values(doc.cells)) {
      ids.add(v[0]); if (v[3]) mods.add(v[3]);
      const c = v[1].toLowerCase(); if (!colors.includes(c)) colors.push(c);
    }
    return { syms: S.list.filter((s) => ids.has(s.id)), mods: [...mods], colors };
  }
  function renderLegend() {
    const { syms, mods } = usedSymbols(), terms = doc.settings.terms;
    if (!syms.length) { $('#legend').innerHTML = `<div class="empty">${t('legend.empty')}</div>`; return; }
    $('#legend').innerHTML = syms.map((s) => `<div class="item">${symSvg(s)}<div><b>${S.abbr(s, terms)}</b> <span>${S.name(s, terms)}</span></div></div>`).join('') +
      mods.map((m) => `<div class="item"><svg viewBox="-6 -6 112 112"><path d="${S.MODIFIERS[m].d}" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round"/></svg><div><b>${S.modAbbr(m, terms)}</b> <span>${S.modName(m, terms)}</span></div></div>`).join('');
  }

  function stitchToken(v, colorLetters, multiColor) {
    const s = S.byId[v[0]]; if (!s || s.marker) return null;
    let a = S.abbr(s, doc.settings.terms); if (v[3]) a += ' ' + S.modAbbr(v[3], doc.settings.terms);
    return { a, c: multiColor ? colorLetters[v[1].toLowerCase()] : '' };
  }
  function describe(tokens) {
    // collapse a whole-line repeat like *sc, 2 sc in same st* × 6
    const n = tokens.length, eq = (x, y) => x.a === y.a && x.c === y.c;
    if (tokens.every((x) => eq(x, tokens[0]))) return runs(tokens);
    for (let p = 2; p <= n / 2; p++) {
      if (n % p) continue;
      let ok = true; for (let i = p; i < n && ok; i++) ok = eq(tokens[i], tokens[i - p]);
      if (ok) return t('written.repeat', { motif: runs(tokens.slice(0, p)), n: n / p });
    }
    return runs(tokens);
  }
  function runs(tokens) {
    const out = []; let cur = null, cnt = 0, lastColor = null;
    const flush = () => {
      if (!cur) return;
      const pre = cur.c && cur.c !== lastColor ? `[${cur.c}] ` : '';
      if (cur.c) lastColor = cur.c;
      // knitting: "k4", "[k2tog] 3 times"; crochet chains are written "ch 3", other stitches "3 dc"
      if (cur.knit) out.push(pre + (cur.count ? t('knit.count', { a: cur.a, n: cnt }) : cnt > 1 ? t('knit.times', { a: cur.a, n: cnt }) : cur.a));
      else out.push(pre + (cur.a === 'ch' || cur.a.startsWith('ch ') ? `ch ${cnt}${cur.a.slice(2)}` : cnt > 1 ? `${cnt} ${cur.a}` : cur.a));
    };
    for (const tok of tokens) {
      if (cur && cur.a === tok.a && cur.c === tok.c) cnt++;
      else { flush(); cur = tok; cnt = 1; }
    }
    flush();
    return out.join(', ');
  }
  function renderWritten() {
    const { colors } = usedSymbols(), multi = colors.length > 1;
    const letters = {}; colors.forEach((c, i) => { letters[c] = String.fromCharCode(65 + (i % 26)); });
    const terms = doc.settings.terms, knit = doc.craft === 'knit';
    const lines = [`${doc.name}`, t(knit ? 'written.kterms' : 'written.terms', { terms: t('written.termsName')[terms] })];
    if (multi) lines.push(t('written.colors') + colors.map((c) => `${letters[c]} = ${c}`).join(', '));
    lines.push('');
    if (knit) {
      // RS rows read right to left; flat WS rows read left to right and are written as worked from the WS
      lines.push(t(doc.knitRound ? 'written.kRoundIntro' : 'written.kFlatIntro'), '');
      for (let b = 0; b < doc.rows; b++) {
        const rs = doc.knitRound || b % 2 === 0, tokens = [];
        let count = 0;
        for (let i = 0; i < doc.cols; i++) {
          const v = doc.cells[key(rs ? doc.cols - 1 - i : i, b)], s = v && S.byId[v[0]];
          if (!s || s.marker || !s.knit) continue;
          count += s.knit.make;
          tokens.push({ a: rs ? S.abbr(s, terms) : S.wsAbbr(s, terms), c: multi ? letters[v[1].toLowerCase()] : '', knit: true, count: s.knit.count });
        }
        if (tokens.length) lines.push(t(doc.knitRound ? 'written.rnd' : 'written.row', { n: b + 1, side: t(rs ? 'written.rs' : 'written.ws'), text: describe(tokens).replace(/\.$/, ''), count }));
      }
    } else if (doc.mode === 'rect') {
      lines.push(t('written.rowIntro'), '');
      for (let b = 0; b < doc.rows; b++) {
        const tokens = [], rtl = b % 2 === 0;
        for (let i = 0; i < doc.cols; i++) {
          const a = rtl ? doc.cols - 1 - i : i, v = doc.cells[key(a, b)];
          const tk = v && stitchToken(v, letters, multi); if (tk) tokens.push(tk);
        }
        if (tokens.length) lines.push(t('written.row', { n: b + 1, side: t(rtl ? 'written.rs' : 'written.ws'), text: describe(tokens).replace(/\.$/, ''), count: tokens.length }));
      }
    } else {
      const c = doc.center === 'ring' ? t('written.ring')
        : doc.center === 'chain' ? t('written.chainRing', { n: Math.max(4, Math.min(12, ringN(0))), slst: S.abbr(S.byId.slst, terms) }) : '';
      lines.push(`${c} ${t('written.roundsIntro')}`.trim(), '');
      for (let a = 0; a < doc.rings; a++) {
        const tokens = [];
        for (let b = 0; b < ringN(a); b++) { const v = doc.cells[key(a, b)]; const tk = v && stitchToken(v, letters, multi); if (tk) tokens.push(tk); }
        if (tokens.length) lines.push(t('written.rnd', { n: a + 1, text: describe(tokens).replace(/\.$/, ''), count: tokens.length }));
      }
    }
    if (lines.length <= 5) lines.push(t('written.empty'));
    $('#written').textContent = lines.join('\n');
  }
  $('#writtenBox').addEventListener('toggle', () => { if ($('#writtenBox').open) renderWritten(); });

  // ---------------------------------------------------------------- export
  function exportLayout(preview) {
    const B = paddedBounds(), M = 24, titleH = 46;
    const { syms, mods } = usedSymbols();
    const entries = doc.settings.exportLegend && !preview ? [...syms.map((s) => ({ s })), ...mods.map((m) => ({ m }))] : [];
    const W = Math.max(B.w + 2 * M, 520);
    const colW = 250, cols = Math.max(1, Math.floor((W - 2 * M) / colW)), rowH = 34;
    const legendH = entries.length ? 34 + Math.ceil(entries.length / cols) * rowH + 10 : 0;
    const H = titleH + B.h + legendH + 2 * M;
    return { B, M, titleH, W, H, entries, cols, colW, rowH, chartX: (W - B.w) / 2 - B.x, chartY: M + titleH - B.y };
  }
  function drawExport(be, preview) {
    const L = exportLayout(preview), terms = doc.settings.terms, ink = '#2b2420', muted = '#7b6f66';
    be.fillRect(0, 0, L.W, L.H, '#ffffff');
    be.text(doc.name, L.M, L.M + 16, 22, ink, 'left', 700);
    be.text(t('export.madeWith'), L.W - L.M, L.M + 16, 11, muted, 'right');
    be.push(L.chartX, L.chartY);
    const B = paddedBounds();
    drawChart(be, { vr: { x0: B.x, y0: B.y, x1: B.x + B.w, y1: B.y + B.h }, zoom: 1, exporting: true, preview });
    be.pop();
    if (L.entries.length) {
      const y0 = L.M + L.titleH + L.B.h + 16;
      be.text(t('export.key'), L.M, y0 + 8, 15, ink, 'left', 700);
      L.entries.forEach((e, i) => {
        const x = L.M + (i % L.cols) * L.colW, y = y0 + 34 + Math.floor(i / L.cols) * L.rowH;
        if (e.s) {
          const sz = e.s.span > 1 ? 52 / (e.s.span * SYM_PAD) : 30, wide = e.s.span > 1 ? 26 : 0;
          be.symbol(e.s, ink, x + 14 + wide / 2, y, sz, 0, '');
          be.text(`${S.abbr(e.s, terms)}: ${S.name(e.s, terms)}`, x + 36 + wide, y, 12.5, ink, 'left');
        } else {
          be.symbol({ parts: [{ d: S.MODIFIERS[e.m].d }] }, ink, x + 14, y - 10, 30, 0, '');
          be.text(`${S.modAbbr(e.m, terms)}: ${S.modName(e.m, terms)}`, x + 36, y, 12.5, ink, 'left');
        }
      });
    }
    return L;
  }
  function buildSvg() {
    const be = svgBackend(); const L = drawExport(be);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.ceil(L.W)}" height="${Math.ceil(L.H)}" viewBox="0 0 ${Math.ceil(L.W)} ${Math.ceil(L.H)}">${be.out.join('')}</svg>`;
  }
  const fileBase = () => (doc.name || 'chart').replace(/[^\p{L}\p{N}_\- ]+/gu, '').trim().replace(/\s+/g, '-').toLowerCase() || 'chart';
  function download(blob, name) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  function exportPng(preview) {
    const L = exportLayout(preview);
    const scale = clamp(Math.min(3, 12000 / L.W, 12000 / L.H), 0.5, 3);
    const c = document.createElement('canvas'); c.width = Math.ceil(L.W * scale); c.height = Math.ceil(L.H * scale);
    const cx = c.getContext('2d'); cx.scale(scale, scale);
    drawExport(canvasBackend(cx, 1), preview);
    c.toBlob((b) => { if (b) download(b, fileBase() + (preview ? '-yarn' : '') + '.png'); else toast(t('toast.pngTooBig')); }, 'image/png');
  }
  function exportSvg() { download(new Blob([buildSvg()], { type: 'image/svg+xml' }), fileBase() + '.svg'); }
  function printChart() {
    const w = window.open('', '_blank');
    if (!w) { toast(t('toast.popups')); return; }
    w.document.write(`<!doctype html><title>${doc.name.replace(/</g, '&lt;')}</title><style>@page{margin:12mm}body{margin:0}svg{width:100%;height:auto}</style>${buildSvg()}`);
    w.document.close(); w.focus(); setTimeout(() => w.print(), 300);
  }

  // ---------------------------------------------------------------- save / open
  function saveFile() {
    download(new Blob([JSON.stringify(doc)], { type: 'application/json' }), fileBase() + '.microcheted.json');
    toast(t('toast.saved'));
  }
  function openDoc(d, msg) {
    doc = d; resetHistory(); setSelection(null); stopPaste(); syncUI(); fit(); changed();
    if (msg) toast(msg);
  }
  function openFile(file) {
    if (!file) return;
    if (file.type.startsWith('image/')) { loadImageFile(file); return; }
    const fr = new FileReader();
    fr.onload = () => {
      try { openDoc(normalizeDoc(JSON.parse(fr.result)), t('toast.opened', { name: file.name })); }
      catch (err) { toast(err.known ? err.message : t('err.read')); }
    };
    fr.readAsText(file);
  }
  $('#fileOpen').addEventListener('change', (e) => { openFile(e.target.files[0]); e.target.value = ''; });
  const stage = $('#stage');
  stage.addEventListener('dragover', (e) => { e.preventDefault(); });
  stage.addEventListener('drop', (e) => { e.preventDefault(); openFile(e.dataTransfer.files[0]); });

  // new chart dialog
  const dlgNew = $('#dlgNew');
  dlgNew.addEventListener('change', (e) => {
    if (e.target.name !== 'mode') return;
    const round = e.target.value === 'round';
    dlgNew.querySelector('[data-for=rect]').hidden = round;
    dlgNew.querySelector('[data-for=round]').hidden = !round;
    dlgNew.querySelector('[data-for=knit]').hidden = e.target.value !== 'knit';
  });
  dlgNew.addEventListener('close', () => {
    if (dlgNew.returnValue !== 'ok') return;
    const f = new FormData(dlgNew.querySelector('form'));
    const mode = f.get('mode'), int = (n, lo, hi) => clamp(Math.round(+f.get(n) || lo), lo, hi);
    const d = newDoc({ name: String(f.get('name') || '').trim() || t('doc.untitled') });
    if (mode === 'round') Object.assign(d, { mode: 'round', rings: int('rings', 1, 80), start: int('start', 1, 200), inc: clamp(Math.round(+f.get('inc') || 0), 0, 200) });
    else Object.assign(d, { cols: int('cols', 1, 400), rows: int('rows', 1, 400) });
    if (mode === 'knit') {
      // knitting charts start as plain stockinette in the background color; gauge 20 × 28 gives knit-shaped cells
      Object.assign(d, { craft: 'knit', knitRound: f.get('knitRound') === 'on', gauge: { sts: 20, rows: 28 } });
      for (let b = 0; b < d.rows; b++) for (let a = 0; a < d.cols; a++) d.cells[key(a, b)] = ['k', d.settings.bg, 0, ''];
      st.sym = 'p'; st.color = d.settings.bg;
    } else if (mode === 'filet') { d.settings.numbers = true; st.sym = 'filetblock'; }
    else if (mode === 'round') st.sym = 'sc';
    st.rot = 0; st.mod = '';
    openDoc(d);
    syncStyleUI();
  });

  // ---------------------------------------------------------------- samples
  function sampleRows() {
    const d = newDoc({ name: t('sample.rows'), cols: 24, rows: 12 });
    const set = (a, b, s, c = '#1f2937', r = 0, m = '') => { d.cells[key(a, b)] = [s, c, r, m]; };
    const row = (b, fn) => { for (let a = 0; a < d.cols; a++) { const v = fn(a); if (v) set(a, b, ...v); } };
    const A = '#1f2937', B = '#c2410c', C = '#0e7490', D = '#a16207';
    row(0, () => ['ch', A]);
    row(1, () => ['sc', A]);
    row(2, () => ['dc', B]);
    row(3, (a) => ['dc', B, 0, 'blo']);
    row(4, (a) => (a % 4 === 1 ? ['shell', C] : a % 4 === 3 ? ['sc', C] : ['ch', C]));
    row(5, (a) => [a % 2 ? 'bpdc' : 'fpdc', A]);
    row(6, (a) => [a % 2 ? 'bpdc' : 'fpdc', A]);
    row(7, (a) => (a % 3 === 1 ? ['popcorn', D] : ['ch', D]));
    row(8, () => ['hdc', B]);
    row(9, (a) => (a % 2 ? ['ch', C] : ['dc2tog', C]));
    row(10, () => ['sc', A, 0, 'flo']);
    row(11, (a) => (a % 3 === 1 ? ['picot', B] : ['sc', B]));
    return d;
  }
  function sampleRounds() {
    const d = newDoc({ name: t('sample.rounds'), mode: 'round', rings: 6, start: 6, inc: 6, counts: [6, 12, 18, 24, 24, 12] });
    const fill = (a, fn) => { for (let b = 0; b < (d.counts[a]); b++) { const v = fn(b); if (v) d.cells[key(a, b)] = v; } };
    fill(0, () => ['sc', '#1f2937', 0, '']);
    fill(1, (b) => [b % 2 ? 'sc' : 'dc', '#c2410c', 0, '']);
    fill(2, (b) => [b % 3 === 2 ? 'ch' : 'dc', '#0e7490', 0, '']);
    fill(3, (b) => [b % 2 ? 'ch' : 'tr', '#a16207', 0, '']);
    fill(4, (b) => [b % 2 ? 'dc' : 'fpdc', '#1f2937', 0, '']);
    fill(5, () => ['shell', '#be185d', 0, '']);
    return d;
  }
  function sampleFilet() {
    const d = newDoc({ name: t('sample.filet'), cols: 15, rows: 13 });
    const art = [
      '...............',
      '...............',
      '...XXX...XXX...',
      '..XXXXX.XXXXX..',
      '.XXXXXXXXXXXXX.',
      '.XXXXXXXXXXXXX.',
      '.XXXXXXXXXXXXX.',
      '..XXXXXXXXXXX..',
      '...XXXXXXXXX...',
      '....XXXXXXX....',
      '.....XXXXX.....',
      '......XXX......',
      '.......X.......',
    ];
    art.forEach((line, i) => {
      const b = d.rows - 1 - i;
      [...line].forEach((ch, a) => { d.cells[key(a, b)] = [ch === 'X' ? 'filetblock' : 'filetopen', ch === 'X' ? '#be185d' : '#78716c', 0, '']; });
    });
    return d;
  }

  // ---------------------------------------------------------------- actions & misc UI
  const actions = {
    new: () => { dlgNew.querySelector('[name=name]').value = t('doc.untitled'); dlgNew.showModal(); }, open: () => $('#fileOpen').click(), save: saveFile,
    png: () => exportPng(false), pngYarn: () => exportPng(true), svg: exportSvg, print: printChart, preview: togglePreview,
    'sample-rows': () => openDoc(sampleRows(), t('toast.sampleLoaded')),
    'sample-rounds': () => { openDoc(sampleRounds(), t('toast.sampleLoaded')); },
    'sample-filet': () => { openDoc(sampleFilet(), t('toast.sampleLoaded')); st.sym = 'filetblock'; syncStyleUI(); },
    undo, redo, fit,
    zoomin: () => zoomAt(canvas.clientWidth / 2, canvas.clientHeight / 2, 1.25),
    zoomout: () => zoomAt(canvas.clientWidth / 2, canvas.clientHeight / 2, 0.8),
    help: () => $('#dlgHelp').showModal(),
    rotl: () => rotate(-45), rotr: () => rotate(45),
    copy: copySel, cut: () => { if (copySel()) deleteSel(); }, paste: startPaste, del: deleteSel,
    fliph: () => flipSel(true), flipv: () => flipSel(false), recolor: recolorSel,
    zoomsel: () => { if (st.sel) { const r = selWorldRect(); zoomToRect(r.x, r.y, r.w, r.h); } },
    recolorType: () => {
      begin(); for (const k in doc.cells) { const v = doc.cells[k]; if (v[0] === st.sym) setCell(k, [v[0], st.color, v[2], v[3]]); }
      const n = pending.size; commit(); toast(t('toast.recolored', { n }));
    },
    recolorFrom: () => { st.pickReplace = true; showHint(t('hint.replaceColor')); closeDrawers(); },
    applySize, repeatRound,
    rowInc: () => stepRow(1), rowDec: () => stepRow(-1), rowReset: resetProgress,
    loadImage: () => $('#fileImage').click(),
    removeImage: () => { doc.image = null; syncUI(); changed(); },
    zoomImage: () => { const r = imageRect(); if (r) zoomToRect(r.x, r.y, r.w, r.h); },
    copyWritten: () => { navigator.clipboard?.writeText($('#written').textContent).then(() => toast(t('toast.textCopied')), () => toast(t('toast.copyFailed'))); },
  };
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    const dd = e.target.closest('.dropdown');
    $$('.dropdown.open').forEach((d) => { if (d !== dd) d.classList.remove('open'); });
    if (dd && e.target.closest('.dropdown > .btn')) { dd.classList.toggle('open'); return; }
    if (!b) return;
    if (dd) dd.classList.remove('open');
    const fn = actions[b.dataset.act]; if (fn) fn();
  });

  // drawers (mobile)
  function closeDrawers() { $$('.panel.open').forEach((p) => p.classList.remove('open')); $('#backdrop').classList.remove('show'); }
  function toggleDrawer(id) { const p = $(id), open = !p.classList.contains('open'); closeDrawers(); if (open) { p.classList.add('open'); $('#backdrop').classList.add('show'); } }
  $('#btnLeft').addEventListener('click', () => toggleDrawer('#leftPanel'));
  $('#btnRight').addEventListener('click', () => toggleDrawer('#rightPanel'));
  $('#backdrop').addEventListener('click', closeDrawers);

  function updateStatus() {
    const h = st.hover;
    let txt = doc.mode === 'rect' ? t('status.size', { cols: doc.cols, rows: doc.rows }) : t('status.rounds', { n: doc.rings });
    if (h && inBounds(h.a, h.b)) {
      const v = doc.cells[key(h.a, h.b)], s = v && S.byId[v[0]];
      const what = s ? ` · ${S.abbr(s, doc.settings.terms)}${v[3] ? ' ' + S.modAbbr(v[3], doc.settings.terms) : ''}` : '';
      txt = (doc.mode === 'rect'
        ? t('status.rowCell', { row: h.b + 1, st: h.b % 2 === 0 || doc.knitRound ? doc.cols - h.a : h.a + 1 })
        : t('status.roundCell', { r: h.a + 1, st: h.b + 1, n: ringN(h.a) })) + what;
    }
    $('#status').textContent = txt;
  }

  let toastTimer = 0;
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
  }
  function showHint(msg) { const h = $('#hint'); h.textContent = msg; h.hidden = false; }
  function hideHint() { $('#hint').hidden = true; }

  new ResizeObserver(() => { if (view.auto) fit(); else redraw(); }).observe(canvas);

  // language
  const langSel = $('#lang');
  langSel.innerHTML = window.I18N.langs.map(([v, label]) => `<option value="${v}">${label}</option>`).join('');
  langSel.value = window.I18N.lang;
  langSel.addEventListener('change', () => window.I18N.setLang(langSel.value));
  window.addEventListener('microcheted:lang', () => { syncUI(); syncStyleUI(); setTool(st.tool); });

  // ---------------------------------------------------------------- init
  window.I18N.apply();
  doc = loadAutosave() || sampleRows();
  setTool('brush');
  syncUI();
  syncStyleUI();
  updateUndoButtons();
  requestAnimationFrame(() => { fit(); });
})();
