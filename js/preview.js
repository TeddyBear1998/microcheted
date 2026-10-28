/*
 * Microcheted — yarn preview.
 *
 * Draws each stitch the way it roughly looks in yarn instead of as a chart
 * symbol. Stitches are drawn in the same 100 × 100 box as the symbols (base at
 * the bottom, top at the top) and cached as small sprites per stitch, color,
 * loop modifier and pixel size, so the chart can redraw at full speed.
 * Strands use a dark outline, the yarn color, a dashed ply twist and a soft
 * highlight from the top left. This is an illustration, not a simulation:
 * every stitch fills its own cell.
 */
(function () {
  'use strict';

  const TAU = Math.PI * 2, rad = (d) => (d * Math.PI) / 180;
  const W = 20;          // yarn thickness in a 100-unit cell
  const PAD = 0.15;      // sprites cover [-15, 115] so stitches can overlap their neighbours
  const BUCKETS = [16, 24, 32, 48, 64, 96, 128, 192, 256, 384];
  let K = 1;             // device pixels per local unit of the sprite being drawn

  // mix a #rrggbb color toward black (amt < 0) or white (amt > 0); returns #rrggbb
  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16), t = amt < 0 ? 0 : 255, p = Math.abs(amt);
    const ch = (v) => Math.round((t - v) * p + v);
    return '#' + ((1 << 24) | (ch(n >> 16) << 16) | (ch((n >> 8) & 255) << 8) | ch(n & 255)).toString(16).slice(1);
  }
  function rgba(hex, amt, a) {
    const n = parseInt(shade(hex, amt).slice(1), 16);
    return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
  }

  // ---- paths
  function line(x1, y1, x2, y2) { const p = new Path2D(); p.moveTo(x1, y1); p.lineTo(x2, y2); return p; }
  function curve(x1, y1, cx, cy, x2, y2) { const p = new Path2D(); p.moveTo(x1, y1); p.quadraticCurveTo(cx, cy, x2, y2); return p; }
  function oval(cx, cy, rx, ry, rot = 0) { const p = new Path2D(); p.ellipse(cx, cy, rx, ry, rot, 0, TAU); return p; }

  // ---- yarn primitives
  function strand(c, path, col, w = W) {
    c.save();
    c.lineCap = 'round'; c.lineJoin = 'round';
    c.shadowColor = 'rgba(0,0,0,.28)'; c.shadowBlur = 2.5 * K; c.shadowOffsetY = 1.2 * K;
    c.strokeStyle = shade(col, -0.45); c.lineWidth = w; c.stroke(path);
    c.shadowColor = 'transparent';
    c.strokeStyle = col; c.lineWidth = w * 0.7; c.stroke(path);
    c.lineCap = 'butt'; c.setLineDash([w * 0.28, w * 0.5]);
    c.strokeStyle = shade(col, -0.2); c.lineWidth = w * 0.55; c.stroke(path);
    c.setLineDash([]); c.lineCap = 'round';
    c.translate(-w * 0.1, -w * 0.12);
    c.strokeStyle = rgba(col, 0.55, 0.6); c.lineWidth = w * 0.2; c.stroke(path);
    c.restore();
  }

  // a puffy, shaded mass of yarn (bobbles, popcorns, knots)
  function blob(c, col, cx, cy, rx, ry) {
    const g = c.createRadialGradient(cx - rx * 0.3, cy - ry * 0.35, 1, cx, cy, Math.max(rx, ry));
    g.addColorStop(0, shade(col, 0.35)); g.addColorStop(0.6, col); g.addColorStop(1, shade(col, -0.4));
    c.save();
    c.shadowColor = 'rgba(0,0,0,.3)'; c.shadowBlur = 3 * K; c.shadowOffsetY = 1.5 * K;
    c.fillStyle = g; c.beginPath(); c.ellipse(cx, cy, rx, ry, 0, 0, TAU); c.fill();
    c.restore();
  }

  // the two top loops of a stitch seen from the front: a horizontal braid that meets its neighbours
  const braid = (c, col, y, x0 = 0, x1 = 100, w = W * 0.9) => strand(c, oval((x0 + x1) / 2, y + 2, (x1 - x0) / 2 - 2, 12), col, w);
  // one chain link
  const link = (c, col, cx, cy, len, deg = 0) => strand(c, oval(cx, cy, len / 2, len * 0.28, rad(deg)), col, W * 0.8);

  // a stitch post from base to top: two twisted strands with `wraps` yarn-overs wound across
  function post(c, col, bx, by, tx, ty, wraps = 0, w = W) {
    const dx = tx - bx, dy = ty - by, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
    const o = w * 0.45, mx = (bx + tx) / 2, my = (by + ty) / 2;
    strand(c, curve(bx - nx * o, by - ny * o, mx + nx * o, my + ny * o, tx - nx * o, ty - ny * o), col, w * 0.85);
    strand(c, curve(bx + nx * o, by + ny * o, mx - nx * o, my - ny * o, tx + nx * o, ty + ny * o), col, w * 0.85);
    for (let i = 0; i < wraps; i++) {
      const t = 0.3 + ((i + 0.5) * 0.45) / wraps, px = bx + dx * t, py = by + dy * t, a = w * 1.1, b = 5;
      strand(c, line(px - nx * a - ux * b, py - ny * a - uy * b, px + nx * a + ux * b, py + ny * a + uy * b), col, w * 0.8);
    }
  }

  // a single crochet: the "V" seen on the front of sc fabric
  function vee(c, col, by = 92, ty = 32, half = 26) {
    strand(c, curve(50, by, 50 - half * 0.4, (by + ty) / 2, 50 - half, ty), col);
    strand(c, curve(50, by, 50 + half * 0.4, (by + ty) / 2, 50 + half, ty), col);
  }

  // several stitches worked into one base (increases, shells)
  function fan(c, col, n, spread, o = {}) {
    const { len = 74, wraps = 1, w = W * 0.85 } = o;
    for (let i = 0; i < n; i++) {
      const a = n === 1 ? 0 : -spread / 2 + (spread * i) / (n - 1);
      const tx = 50 + len * Math.sin(rad(a)), ty = 94 - len * Math.cos(rad(a));
      post(c, col, 50, 94, tx, ty, wraps, w);
      strand(c, oval(tx, ty, Math.min(16, 70 / n), 6, rad(a)), col, w * 0.9);
    }
  }

  // several stitches joined at the top (decreases)
  function tog(c, col, bases, wraps) {
    for (const bx of bases) post(c, col, bx, 96, 50, 24, wraps, W * 0.8);
    braid(c, col, 18, 24, 76);
  }

  function cluster(c, col, n, rx, ry, cy, puffy) {
    if (puffy) blob(c, col, 50, cy, rx, ry);
    for (let i = 0; i < n; i++) {
      const dx = n === 1 ? 0 : -rx + (2 * rx * i) / (n - 1);
      strand(c, curve(50, 94, 50 + dx * 1.15, cy, 50, 16), col, W * 0.7);
    }
    braid(c, col, 14, 28, 72);
  }

  function chainAlong(c, col, pts, len) { for (const [x, y, deg] of pts) link(c, col, x, y, len, deg); }

  const post1 = (wraps) => (c, col) => { post(c, col, 50, 98, 50, 26, wraps); braid(c, col, 18); };
  const fp = (wraps) => (c, col) => { post(c, col, 50, 100, 50, 26, wraps, W * 1.15); braid(c, col, 18); };
  const bp = (wraps) => (c, col) => {
    post(c, shade(col, -0.25), 50, 100, 50, 26, wraps, W * 0.8);
    strand(c, line(4, 82, 96, 82), col, W * 0.9);
    braid(c, col, 18);
  };

  // ---- stitch drawings (ids match symbols.js; markers are not drawn)
  const DRAW = {
    ch: (c, col) => link(c, col, 50, 54, 92),
    slst: (c, col) => braid(c, col, 62, 6, 94, W * 0.75),
    sc: (c, col) => { vee(c, col); braid(c, col, 22); },
    scp: (c, col) => { vee(c, col); braid(c, col, 22); },
    hdc: (c, col) => { post(c, col, 50, 96, 50, 30); strand(c, curve(28, 40, 50, 46, 72, 40), col); braid(c, col, 20); },
    dc: post1(1), tr: post1(2), dtr: post1(3), trtr: post1(4),
    esc: (c, col) => { vee(c, col, 94, 30); strand(c, line(32, 64, 68, 64), col, W * 0.8); braid(c, col, 20); },

    fphdc: fp(0), bphdc: bp(0), fpdc: fp(1), bpdc: bp(1), fptr: fp(2), bptr: bp(2),

    sc2inc: (c, col) => fan(c, col, 2, 44, { len: 66, wraps: 0 }),
    sc3inc: (c, col) => fan(c, col, 3, 70, { len: 66, wraps: 0 }),
    hdc2inc: (c, col) => fan(c, col, 2, 44, { wraps: 0 }),
    dc2inc: (c, col) => fan(c, col, 2, 44),
    dc3inc: (c, col) => fan(c, col, 3, 70),
    vst: (c, col) => { fan(c, col, 2, 54); link(c, col, 50, 24, 26); },
    shell: (c, col) => fan(c, col, 5, 116, { len: 78, w: W * 0.72 }),

    sc2tog: (c, col) => tog(c, col, [26, 74], 0),
    sc3tog: (c, col) => tog(c, col, [18, 50, 82], 0),
    hdc2tog: (c, col) => tog(c, col, [26, 74], 0),
    dc2tog: (c, col) => tog(c, col, [26, 74], 1),
    dc3tog: (c, col) => tog(c, col, [18, 50, 82], 1),
    tr2tog: (c, col) => tog(c, col, [26, 74], 2),

    bobble: (c, col) => cluster(c, col, 5, 32, 34, 54, true),
    puff: (c, col) => cluster(c, col, 4, 24, 36, 54, true),
    popcorn: (c, col) => { blob(c, col, 50, 48, 38, 36); strand(c, oval(50, 26, 26, 8), col, W * 0.8); post(c, col, 50, 100, 50, 82, 0, W * 0.8); },
    cluster3: (c, col) => cluster(c, col, 3, 26, 0, 54, false),
    xdc: (c, col) => { post(c, col, 22, 98, 78, 26, 1, W * 0.85); post(c, col, 78, 98, 22, 26, 1, W * 0.85); braid(c, col, 18); },
    spike: (c, col) => { post(c, col, 50, 114, 50, 40, 0, W * 0.8); vee(c, col, 70, 30, 22); braid(c, col, 22); },
    revsc: (c, col) => { for (const x of [-8, 26, 60]) strand(c, curve(x, 78, x + 26, 62, x + 40, 30), col, W * 1.05); },
    bullion: (c, col) => { post(c, col, 50, 96, 50, 22); for (let y = 32; y <= 86; y += 10.5) strand(c, oval(50, y, 20, 6, -0.2), col, W * 0.75); },
    solomon: (c, col) => { strand(c, oval(50, 58, 14, 38), col, W * 0.7); blob(c, col, 50, 16, 9, 8); },
    loopst: (c, col) => { strand(c, new Path2D('M50,66C20,124 80,124 50,66'), col, W * 0.85); vee(c, col); braid(c, col, 22); },

    ring: (c, col) => { strand(c, oval(50, 50, 32, 32), col); strand(c, oval(50, 50, 25, 25), col, W * 0.8); strand(c, curve(76, 70, 84, 90, 66, 98), col, W * 0.8); },
    picot: (c, col) => { vee(c, col, 98, 74, 16); chainAlong(c, col, [[30, 52, 70], [50, 26, 0], [70, 52, 110]], 30); },
    ch3sp: (c, col) => chainAlong(c, col, [[16, 54, -40], [50, 40, 0], [84, 54, 40]], 36),
    ch5sp: (c, col) => chainAlong(c, col, [[10, 70, -60], [27, 52, -30], [50, 46, 0], [73, 52, 30], [90, 70, 60]], 26),
    tch: (c, col) => chainAlong(c, col, [[50, 80, 90], [50, 48, 90], [50, 16, 90]], 36),

    filetopen: (c, col) => { post(c, col, 12, 100, 12, 14, 1); chainAlong(c, col, [[37, 12, 0], [87, 12, 0]], 48); },
    filetblock: (c, col) => { for (const x of [14, 46, 78]) post(c, col, x, 100, x, 16, 1, W * 0.9); braid(c, col, 10); },
    lacet: (c, col) => { chainAlong(c, col, [[18, 26, 62], [30, 52, 62], [42, 76, 62], [58, 76, -62], [70, 52, -62], [82, 26, -62]], 30); blob(c, col, 50, 90, 9, 7); },
    filetbar: (c, col) => { post(c, col, 12, 100, 12, 20, 1); chainAlong(c, col, [[30, 14, 0], [62, 14, 0], [94, 14, 0]], 34); },

    // knitting: a knit stitch is a V of two legs, a purl a horizontal bump
    k: (c, col) => knitV(c, col),
    p: (c, col) => strand(c, oval(50, 52, 50, 20), col, W * 1.1),
  };
  function knitV(c, col) {
    strand(c, curve(4, -4, 22, 64, 50, 100), col, W * 1.25);
    strand(c, curve(96, -4, 78, 64, 50, 100), col, W * 1.25);
  }
  // other knitting stitches: a faint knit V underneath, then the chart symbol traced in yarn
  function knitSymbol(sym) {
    return (c, col) => {
      if (sym.span === 1 && !/^(yo|bo|kbobble)$/.test(sym.id)) { c.globalAlpha = 0.35; knitV(c, col); c.globalAlpha = 1; }
      for (const p of sym.parts) {
        const path = new Path2D(p.d);
        if (p.fill) { c.fillStyle = col; c.fill(path); strand(c, path, col, W * 0.35); } else strand(c, path, col, W * 0.85);
      }
    };
  }

  const MODS = {
    blo: { after: (c, col) => strand(c, line(0, 100, 100, 100), col, W * 0.85) },   // unworked front loop shows as a ridge
    flo: { before: (c, col) => strand(c, line(0, 98, 100, 98), shade(col, -0.3), W * 0.7) },  // back loop left behind
  };

  // ---- sprite cache
  const cache = new Map();
  function sprite(id, color, mod, px) {
    const sym = window.MICRO_SYMBOLS.byId[id];
    const draw = DRAW[id] || (sym && sym.craft === 'knit' ? knitSymbol(sym) : null), span = sym ? sym.span : 1;
    if (!draw || !/^#[0-9a-f]{6}$/i.test(color)) return null;
    const S = BUCKETS.find((b) => b >= px) || BUCKETS[BUCKETS.length - 1];
    const k = `${id}|${color}|${mod || ''}|${S}`;
    let cv = cache.get(k);
    if (cv) return cv;
    if (cache.size > 600) cache.clear();
    cv = document.createElement('canvas');
    K = S / (100 * (1 + 2 * PAD));
    cv.height = S; cv.width = Math.ceil(K * 100 * (span + 2 * PAD));   // cables are several cells wide
    const c = cv.getContext('2d');
    c.scale(K, K); c.translate(100 * PAD, 100 * PAD);
    const m = MODS[mod];
    if (m && m.before) m.before(c, color);
    draw(c, color);
    if (m && m.after) m.after(c, color);
    cache.set(k, cv);
    return cv;
  }

  window.MICRO_PREVIEW = { sprite, PAD, has: (id) => !!DRAW[id] || window.MICRO_SYMBOLS.byId[id]?.craft === 'knit' };
})();
