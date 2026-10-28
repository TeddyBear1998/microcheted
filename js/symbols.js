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

  // A knitting cable over front + back stitches, drawn across (front + back) cells.
  // Right cross: the front stitches travel from lower left to upper right; the back
  // stitches pass behind them (broken lines), or are shown as dots when purled.
  function cable(front, back, right, purl = false) {
    const X = (i) => 50 + 100 * i, at = (bx, tx, t) => [f(bx + (tx - bx) * t), f(80 - 60 * t)];
    const route = (bx, tx) => `M${bx},96L${bx},80L${tx},20L${tx},4`;
    let fr = '', bk = '', dots = '';
    for (let i = 0; i < back; i++) {
      const bx = right ? X(front + i) : X(i), tx = right ? X(i) : X(front + i);
      if (purl) {
        for (const [x, y] of [[bx, 92], at(bx, tx, 0.12), at(bx, tx, 0.88), [tx, 8]]) dots += oval(x, y, 6, 6);
      } else {
        const [x1, y1] = at(bx, tx, 0.3), [x2, y2] = at(bx, tx, 0.7);
        bk += `M${bx},96L${bx},80L${x1},${y1}M${x2},${y2}L${tx},20L${tx},4`;
      }
    }
    for (let i = 0; i < front; i++) fr += right ? route(X(i), X(back + i)) : route(X(back + i), X(i));
    return dots ? [fr + bk, { d: dots, fill: true }] : [fr + bk];
  }
  const knot = 'M40,86L56,42C64,18 36,18 44,42L60,86';   // twisted (through back loop) stitch

  const hookFront = 'M50,80C50,93 33,94 33,82';
  const hookBack = 'M50,80C50,93 67,94 67,82';

  // ---- symbol table --------------------------------------------------------
  // [id, category, US abbr, US name, parts, extra]
  // parts: path string, or {d, fill:true, alpha}
  // category ids; display names come from I18N ('cat.<id>')
  const C = {
    basic: 'basic', post: 'post', inc: 'inc', dec: 'dec', tex: 'tex', chain: 'chain', filet: 'filet', mark: 'mark',
    kbasic: 'kbasic', kinc: 'kinc', kdec: 'kdec', ktex: 'ktex', kcable: 'kcable',
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

    // ---- knitting (chart shows the right side; `ws` is how the square is worked on a wrong-side row)
    ['k', C.kbasic, 'k', 'knit (blank square)', [], { knit: { ws: ['p', 'kr.'], count: true }, lv: ['lab.', 'labiskais valdziņš (tukša rūtiņa)'] }],
    ['p', C.kbasic, 'p', 'purl', [{ d: oval(50, 50, 10, 10), fill: true }], { knit: { ws: ['k', 'lab.'], count: true }, lv: ['kr.', 'kreiliskais valdziņš'] }],
    ['ktbl', C.kbasic, 'k tbl', 'knit through back loop (twisted)', [knot], { knit: { ws: ['p tbl', 'kr. sakr.'] }, lv: ['lab. sakr.', 'sakrustots labiskais (aiz aizmugurējās sienas)'] }],
    ['ptbl', C.kbasic, 'p tbl', 'purl through back loop (twisted)', [knot, { d: oval(76, 70, 6, 6), fill: true }], { knit: { ws: ['k tbl', 'lab. sakr.'] }, lv: ['kr. sakr.', 'sakrustots kreiliskais (aiz aizmugurējās sienas)'] }],
    ['sl', C.kbasic, 'sl 1', 'slip 1 purlwise, yarn in back', ['M30,20L50,80L70,20'], { knit: { ws: ['sl 1 wyif', 'noņ. 1 (dz. priekšā)'] }, lv: ['noņ. 1', 'noņemt 1 valdziņu nenoadot (dzija aiz darba)'] }],
    ['slwyif', C.kbasic, 'sl 1 wyif', 'slip 1 purlwise, yarn in front', ['M30,16L50,70L70,16' + seg(28, 86, 72, 86)], { knit: { ws: ['sl 1 wyib', 'noņ. 1 (dz. aizm.)'] }, lv: ['noņ. 1 (dz. pr.)', 'noņemt 1 valdziņu nenoadot (dzija darba priekšā)'] }],

    ['yo', C.kinc, 'yo', 'yarn over', [oval(50, 50, 22, 22)], { knit: { ws: ['yo', 'ap.'], use: 0 }, uk: ['yfwd', 'yarn forward (yarn over)'], lv: ['ap.', 'apmetiens'] }],
    ['m1l', C.kinc, 'M1L', 'make 1 left (leans left)', ['M62,84L62,34Q62,14 42,18L28,24'], { knit: { ws: ['M1LP', 'piel. 1 kr.'], make: 1, use: 0 }, mirror: 'm1r', lv: ['piel. 1 k.', 'pielikt 1 valdziņu (sliecas pa kreisi)'] }],
    ['m1r', C.kinc, 'M1R', 'make 1 right (leans right)', ['M38,84L38,34Q38,14 58,18L72,24'], { knit: { ws: ['M1RP', 'piel. 1 kr.'], make: 1, use: 0 }, mirror: 'm1l', lv: ['piel. 1 l.', 'pielikt 1 valdziņu (sliecas pa labi)'] }],
    ['kfb', C.kinc, 'kfb', 'knit front and back (1 st becomes 2)', [seg(50, 86, 50, 50) + seg(50, 50, 26, 16) + seg(50, 50, 74, 16)], { knit: { ws: ['pfb', '2 kr. no 1'], make: 2 }, lv: ['2 lab. no 1', 'noadīt 2 labiskos no viena valdziņa'] }],

    ['k2tog', C.kdec, 'k2tog', 'knit 2 together (leans right)', [seg(26, 82, 74, 18)], { knit: { ws: ['p2tog', '2 kop. kr.'], use: 2 }, mirror: 'ssk', lv: ['2 kop. lab.', '2 valdziņus kopā labiski (sliecas pa labi)'] }],
    ['ssk', C.kdec, 'ssk', 'slip, slip, knit 2 together (leans left)', [seg(74, 82, 26, 18)], { knit: { ws: ['ssp', '2 kop. kr. sakr.'], use: 2 }, mirror: 'k2tog', lv: ['2 kop. lab. sakr.', '2 valdziņus kopā labiski aiz aizmugurējām sienām (sliecas pa kreisi)'] }],
    ['p2tog', C.kdec, 'p2tog', 'purl 2 together', [seg(26, 82, 74, 18), { d: oval(70, 68, 6, 6), fill: true }], { knit: { ws: ['k2tog', '2 kop. lab.'], use: 2 }, mirror: 'ssp', lv: ['2 kop. kr.', '2 valdziņus kopā kreiliski'] }],
    ['ssp', C.kdec, 'ssp', 'slip, slip, purl 2 together', [seg(74, 82, 26, 18), { d: oval(30, 68, 6, 6), fill: true }], { knit: { ws: ['ssk', '2 kop. lab. sakr.'], use: 2 }, mirror: 'p2tog', lv: ['2 kop. kr. sakr.', '2 valdziņus kopā kreiliski aiz aizmugurējām sienām'] }],
    ['k3tog', C.kdec, 'k3tog', 'knit 3 together (leans right)', [seg(26, 82, 74, 18) + seg(50, 82, 74, 18)], { knit: { ws: ['p3tog', '3 kop. kr.'], use: 3 }, mirror: 'sssk', lv: ['3 kop. lab.', '3 valdziņus kopā labiski (sliecas pa labi)'] }],
    ['sssk', C.kdec, 'sssk', 'slip, slip, slip, knit 3 together (leans left)', [seg(74, 82, 26, 18) + seg(50, 82, 26, 18)], { knit: { ws: ['sssp', '3 kop. kr. sakr.'], use: 3 }, mirror: 'k3tog', lv: ['3 kop. lab. sakr.', '3 valdziņus kopā labiski aiz aizmugurējām sienām (sliecas pa kreisi)'] }],
    ['cdd', C.kdec, 's2kp', 'centered double decrease (sl 2 together, k1, pass slipped sts over)', [seg(26, 82, 50, 18) + seg(74, 82, 50, 18) + seg(50, 82, 50, 18)], { knit: { ws: ['s2pp', '3 kop. kr. (centrā)'], use: 3 }, uk: ['s2kpo', 'centred double decrease (sl 2 together, k1, pass slipped sts over)'], lv: ['3 kop. centrā', 'centrēts sarukums (2 noņem kopā, 1 lab., pārvelk pāri)'] }],

    ['kbobble', C.ktex, 'MB', 'make bobble', ['M50,16L80,33L80,67L50,84L20,67L20,33Z' + seg(50, 36, 50, 64)], { knit: { ws: ['MB', 'bumb.'] }, lv: ['bumb.', 'bumbulis'] }],
    ['bo', C.ktex, 'BO', 'bind off', [{ d: oval(50, 50, 28, 13), fill: true }], { knit: { ws: ['BO', 'nol.'], make: 0 }, uk: ['cast off', 'cast off'], lv: ['nol.', 'nolaist (noadīt) valdziņu'] }],

    ['c11r', C.kcable, '1/1 RC', '1/1 right cross (2 sts)', cable(1, 1, true), { span: 2, mirror: 'c11l', knit: {}, uk: ['C2B', 'cable 2 back (1/1 right cross)'], lv: ['1/1 b. l.', 'bize 1/1 pa labi (1 vald. aiz darba)'] }],
    ['c11l', C.kcable, '1/1 LC', '1/1 left cross (2 sts)', cable(1, 1, false), { span: 2, mirror: 'c11r', knit: {}, uk: ['C2F', 'cable 2 front (1/1 left cross)'], lv: ['1/1 b. k.', 'bize 1/1 pa kreisi (1 vald. darba priekšā)'] }],
    ['c21rp', C.kcable, '2/1 RPC', '2/1 right purl cross (3 sts)', cable(2, 1, true, true), { span: 3, mirror: 'c21lp', knit: {}, uk: ['T3B', 'twist 3 back (2/1 right purl cross)'], lv: ['2/1 b. l. kr.', 'bize 2/1 pa labi uz kreiliskā fona'] }],
    ['c21lp', C.kcable, '2/1 LPC', '2/1 left purl cross (3 sts)', cable(2, 1, false, true), { span: 3, mirror: 'c21rp', knit: {}, uk: ['T3F', 'twist 3 front (2/1 left purl cross)'], lv: ['2/1 b. k. kr.', 'bize 2/1 pa kreisi uz kreiliskā fona'] }],
    ['c22r', C.kcable, '2/2 RC', '2/2 right cross (4 sts)', cable(2, 2, true), { span: 4, mirror: 'c22l', knit: {}, uk: ['C4B', 'cable 4 back (2/2 right cross)'], lv: ['2/2 b. l.', 'bize 2/2 pa labi (2 vald. aiz darba)'] }],
    ['c22l', C.kcable, '2/2 LC', '2/2 left cross (4 sts)', cable(2, 2, false), { span: 4, mirror: 'c22r', knit: {}, uk: ['C4F', 'cable 4 front (2/2 left cross)'], lv: ['2/2 b. k.', 'bize 2/2 pa kreisi (2 vald. darba priekšā)'] }],
    ['c33r', C.kcable, '3/3 RC', '3/3 right cross (6 sts)', cable(3, 3, true), { span: 6, mirror: 'c33l', knit: {}, uk: ['C6B', 'cable 6 back (3/3 right cross)'], lv: ['3/3 b. l.', 'bize 3/3 pa labi (3 vald. aiz darba)'] }],
    ['c33l', C.kcable, '3/3 LC', '3/3 left cross (6 sts)', cable(3, 3, false), { span: 6, mirror: 'c33r', knit: {}, uk: ['C6F', 'cable 6 front (3/3 left cross)'], lv: ['3/3 b. k.', 'bize 3/3 pa kreisi (3 vald. darba priekšā)'] }],
  ];

  const MODIFIERS = {
    blo: { abbr: 'BLO', name: 'worked in back loop only', lv: ['aizm.c.', 'tamborē tikai aizmugurējā cilpā'], d: 'M30,98Q50,78 70,98' },
    flo: { abbr: 'FLO', name: 'worked in front loop only', lv: ['pr.c.', 'tamborē tikai priekšējā cilpā'], d: 'M30,84Q50,104 70,84' },
  };

  // Latvian terminology: st.1a. = stabiņš ar 1 apmetienu (US dc), st.2a. = ar 2 apmetieniem (US tr) …
  const LV = {
    ch: ['g.c.', 'gaisa cilpa'],
    slst: ['sav.c.', 'savienojošā cilpa'],
    sc: ['ī.st.', 'īsais stabiņš'],
    scp: ['ī.st.', 'īsais stabiņš (+ zīme)'],
    hdc: ['pst.', 'pusstabiņš ar apmetienu'],
    dc: ['st.1a.', 'stabiņš ar 1 apmetienu'],
    tr: ['st.2a.', 'stabiņš ar 2 apmetieniem'],
    dtr: ['st.3a.', 'stabiņš ar 3 apmetieniem'],
    trtr: ['st.4a.', 'stabiņš ar 4 apmetieniem'],
    esc: ['pag.ī.st.', 'pagarināts īsais stabiņš'],

    fphdc: ['pr.pst.', 'reljefais pusstabiņš no priekšpuses'],
    bphdc: ['aizm.pst.', 'reljefais pusstabiņš no aizmugures'],
    fpdc: ['pr.st.1a.', 'reljefais stabiņš ar 1 apmetienu no priekšpuses'],
    bpdc: ['aizm.st.1a.', 'reljefais stabiņš ar 1 apmetienu no aizmugures'],
    fptr: ['pr.st.2a.', 'reljefais stabiņš ar 2 apmetieniem no priekšpuses'],
    bptr: ['aizm.st.2a.', 'reljefais stabiņš ar 2 apmetieniem no aizmugures'],

    sc2inc: ['2 ī.st. vienā cilpā', 'palielinājums ar 2 īsajiem stabiņiem'],
    sc3inc: ['3 ī.st. vienā cilpā', 'palielinājums ar 3 īsajiem stabiņiem'],
    hdc2inc: ['2 pst. vienā cilpā', 'palielinājums ar 2 pusstabiņiem'],
    dc2inc: ['2 st.1a. vienā cilpā', 'palielinājums ar 2 stabiņiem ar 1 apmetienu'],
    dc3inc: ['3 st.1a. vienā cilpā', 'palielinājums ar 3 stabiņiem ar 1 apmetienu'],
    vst: ['V-st.', 'V stabiņš (st.1a., 1 g.c., st.1a. vienā cilpā)'],
    shell: ['vēdeklis', 'vēdeklis no 5 st.1a. (vienā cilpā)'],

    sc2tog: ['2 ī.st. kopā', '2 īsie stabiņi kopā (samazinājums)'],
    sc3tog: ['3 ī.st. kopā', '3 īsie stabiņi kopā (samazinājums)'],
    hdc2tog: ['2 pst. kopā', '2 pusstabiņi kopā (samazinājums)'],
    dc2tog: ['2 st.1a. kopā', '2 stabiņi ar 1 apmetienu kopā'],
    dc3tog: ['3 st.1a. kopā', '3 stabiņi ar 1 apmetienu kopā / 3 stabiņu kopa'],
    tr2tog: ['2 st.2a. kopā', '2 stabiņi ar 2 apmetieniem kopā'],

    bobble: ['bumbulis', 'bumbulis no 5 st.1a.'],
    puff: ['kuplais st.', 'kuplais stabiņš (pusstabiņu kopa)'],
    popcorn: ['popkorns', 'popkorns no 5 st.1a.'],
    cluster3: ['3 st.1a. kopa', '3 stabiņu ar 1 apmetienu kopa vienā cilpā'],
    xdc: ['krustoti st.1a.', 'krustoti stabiņi ar 1 apmetienu'],
    spike: ['iedurtais ī.st.', 'iedurtais (garais) īsais stabiņš'],
    revsc: ['vēža solis', 'vēža solis (īsie stabiņi pretējā virzienā)'],
    bullion: ['rullītis', 'rullīša stabiņš'],
    solomon: ['Zālamana mezgls', 'Zālamana mezgls (gara cilpa)'],
    loopst: ['cilpu st.', 'cilpu stabiņš'],

    ring: ['burvju gredzens', 'burvju (regulējamais) gredzens'],
    picot: ['3 g.c. pikots', 'pikots no 3 gaisa cilpām'],
    ch3sp: ['3 g.c. arka', 'arka / atstarpe no 3 gaisa cilpām'],
    ch5sp: ['5 g.c. arka', 'arka no 5 gaisa cilpām'],
    tch: ['pacelšanas g.c.', 'pacelšanas gaisa cilpas'],

    filetopen: ['tukša rūt.', 'tukša filejas rūtiņa (st.1a., 2 g.c.)'],
    filetblock: ['pilna rūt.', 'pilna filejas rūtiņa'],
    lacet: ['lacete', 'filejas lacete (3 g.c., ī.st., 3 g.c.)'],
    filetbar: ['stienītis', 'filejas stienītis (5 g.c.)'],

    nost: ['—', 'nav stabiņa (iekrāsots laukums)'],
    arrow: ['→', 'darba virziens'],
    start: ['▶', 'sāc šeit'],
    fasten: ['nostiprināt', 'nostiprināt un nogriezt dziju'],
    smark: ['marķ.', 'ielikt marķieri'],
    ccmark: ['KM', 'krāsas maiņa'],
    repeat: ['*', 'atkārtojuma zīme'],
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
    const span = extra.span || 1, knit = extra.knit;
    return {
      id, cat, parts: p, marker: !!extra.marker, span, mirror: extra.mirror || null,
      craft: extra.marker ? 'any' : knit ? 'knit' : 'crochet',
      // knitting: stitches used / made, whether runs are written "k4", and the wrong-side reading
      knit: knit && { use: knit.use ?? span, make: knit.make ?? span, count: !!knit.count, ws: knit.ws || null },
      us: [abbr, name],
      uk: extra.uk || (knit ? [abbr, name] : [toUkAbbr(abbr), toUkName(name)]),
      lv: extra.lv || LV[id] || [abbr, name],
    };
  });
  const byId = Object.fromEntries(list.map((s) => [s.id, s]));
  const cats = [...new Set(list.map((s) => s.cat))];

  // viewBox for a symbol thumbnail; cables are several cells wide
  const viewBox = (sym) => `-6 -6 ${100 * (sym.span || 1) + 12} 112`;

  function svgInner(sym, color = 'currentColor', sw = 6) {
    if (!sym.parts.length) return `<rect x="8" y="8" width="84" height="84" rx="6" fill="none" stroke="${color}" stroke-opacity=".35" stroke-width="${sw * 0.6}"/>`;
    return sym.parts.map((p) => p.fill
      ? `<path d="${p.d}" fill="${color}"${p.alpha ? ` fill-opacity="${p.alpha}"` : ''}/>`
      : `<path d="${p.d}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`).join('');
  }

  window.MICRO_SYMBOLS = {
    list, byId, cats, MODIFIERS, svgInner, viewBox,
    // wrong-side reading of a knitting symbol in the given terms
    wsAbbr: (s, terms) => (s.knit && s.knit.ws ? s.knit.ws[terms === 'lv' ? 1 : 0] : (s[terms] || s.us)[0]),
    abbr: (s, terms) => (s[terms] || s.us)[0],
    name: (s, terms) => (s[terms] || s.us)[1],
    modAbbr: (m, terms) => (terms === 'lv' ? MODIFIERS[m].lv[0] : MODIFIERS[m].abbr),
    modName: (m, terms) => (terms === 'lv' ? MODIFIERS[m].lv[1] : MODIFIERS[m].name),
  };
})();
