/*
 * Microcheted — interface translations.
 *
 * Static markup is translated through attributes:
 *   data-i18n="key"                 → textContent
 *   data-i18n-html="key"            → innerHTML (our own trusted strings only)
 *   data-i18n-attr="title:key,..."  → attributes
 * Scripts call I18N.t(key, vars). A value may be a plural object
 * ({ zero, one, other }) chosen by vars.n with Intl.PluralRules.
 */
(function () {
  'use strict';

  const LANG_KEY = 'microcheted.lang';

  const en = {
    'meta.title': 'Microcheted — crochet chart designer',
    'meta.desc': 'Free online crochet chart designer: draw stitch diagrams with standard crochet symbols in rows, rounds or filet grids. Save, import, recolor, zoom and export.',
    'lang.label': 'Language',

    'top.library': 'Stitch library',
    'top.settings': 'Settings',
    'top.docName': 'Chart name',
    'menu.file': 'File ▾',
    'menu.new': 'New chart…',
    'menu.open': 'Open design…',
    'menu.save': 'Save design',
    'menu.png': 'Export PNG image',
    'menu.pngYarn': 'Export yarn preview (PNG)',
    'preview.label': 'Yarn preview',
    'preview.tip': 'Show roughly how the stitches look in yarn (P). You can keep drawing while it is on.',
    'help.k.preview': '<kbd>P</kbd> Yarn preview on / off',
    'menu.svg': 'Export SVG (vector)',
    'menu.print': 'Print…',
    'menu.sampleRows': 'Example: rows',
    'menu.sampleRounds': 'Example: rounds',
    'menu.sampleFilet': 'Example: filet',
    'top.undo': 'Undo', 'top.undoTip': 'Undo (Ctrl Z)',
    'top.redo': 'Redo', 'top.redoTip': 'Redo (Ctrl Y)',
    'top.zoomOut': 'Zoom out', 'top.zoomOutTip': 'Zoom out (−)',
    'top.zoomIn': 'Zoom in', 'top.zoomInTip': 'Zoom in (+)',
    'top.fitTip': 'Fit chart (0)',
    'top.help': 'Help', 'top.helpTip': 'Help & shortcuts',
    'top.donate': 'Donate', 'top.donateAria': 'Donate on Ko-fi', 'top.donateTip': 'Microcheted is free. Support it on Ko-fi',

    'toolbar.label': 'Tools',
    'tool.brush': 'Draw', 'tool.brushTip': 'Draw stitch (B)',
    'tool.eraser': 'Erase', 'tool.eraserTip': 'Erase (E)',
    'tool.fill': 'Fill', 'tool.fillTip': 'Fill area / round (F)',
    'tool.picker': 'Pick', 'tool.pickerTip': 'Pick stitch from chart (I)',
    'tool.select': 'Select', 'tool.selectTip': 'Select, copy & paste (S)',
    'tool.zoom': 'Zoom', 'tool.zoomTip': 'Zoom to region – drag a box (Z)',
    'tool.pan': 'Pan', 'tool.panTip': 'Pan (H, or hold Space / middle mouse)',
    'tool.check': 'Check', 'tool.checkTip': 'Check off finished rows (C)',
    'progress.tip': 'Row counter: where you are in your work',
    'progress.row': 'Row', 'progress.round': 'Round',
    'progress.inc': 'Next row', 'progress.incTip': 'Next row (N)',
    'progress.dec': 'Previous row', 'progress.decTip': 'Previous row (Shift N)',
    'progress.reset': 'Start over', 'progress.resetTip': 'Reset the counter and un-check all rows',
    'confirm.resetProgress': 'Start over? The row counter goes back to 1 and all checked rows are cleared.',
    'hint.check': 'Click a row to cross it out as done, click again to undo. Drag over several rows',
    'help.k.check': '<kbd>C</kbd> Check off finished rows',
    'help.k.counter': '<kbd>N</kbd> / <kbd>Shift N</kbd> Row counter +1 / −1',
    'tool.current': 'Current stitch',
    'tool.color': 'Stitch color',
    'tool.rotl': 'Rotate left', 'tool.rotlTip': 'Rotate stitch left (Shift R)',
    'tool.rotr': 'Rotate right', 'tool.rotrTip': 'Rotate stitch right (R)',
    'tool.loop': 'Loop to work into',
    'mod.both': 'Both', 'mod.blo': 'BLO', 'mod.flo': 'FLO',
    'sel.copy': 'Copy', 'sel.cut': 'Cut', 'sel.paste': 'Paste', 'sel.del': 'Delete',
    'sel.fliph': 'Flip ↔', 'sel.flipv': 'Flip ↕', 'sel.recolor': 'Recolor', 'sel.zoom': 'Zoom to',

    'lib.search': 'Search stitches… (dc, shell, popcorn)',
    'lib.searchAria': 'Search stitches',
    'lib.none': 'No stitches match.',
    'canvas.label': 'Crochet chart canvas',

    'cat.basic': 'Basic stitches', 'cat.post': 'Post stitches', 'cat.inc': 'Increases', 'cat.dec': 'Decreases',
    'cat.tex': 'Clusters & texture', 'cat.chain': 'Chains, rings & loops', 'cat.filet': 'Filet crochet', 'cat.mark': 'Markers',

    'panel.colors': 'Colors',
    'panel.recolorType': 'Recolor all of this stitch',
    'panel.recolorFrom': 'Replace a color…',
    'panel.recolorFromTip': 'Pick a color on the chart, then every stitch in that color changes to the current color',
    'panel.chart': 'Chart',
    'panel.cols': 'Stitches (columns)',
    'panel.rows': 'Rows',
    'panel.rings': 'Rounds',
    'panel.start': 'Stitches in round 1',
    'panel.inc': 'Added per round',
    'panel.counts': 'Custom counts per round',
    'panel.countsPh': 'e.g. 6, 12, 18, 18, 24',
    'panel.center': 'Center',
    'center.ring': 'Magic ring', 'center.chain': 'Chain ring', 'center.none': 'None',
    'panel.applySize': 'Apply size',
    'panel.repeatInfo': 'Repeat the first stitches of a round all the way around it.',
    'panel.repRound': 'Round',
    'panel.repLen': 'Motif length',
    'panel.repeat': 'Repeat around',
    'panel.display': 'Display',
    'panel.bg': 'Background',
    'panel.grid': 'Grid lines',
    'panel.showGrid': 'Show grid',
    'panel.numbers': 'Row / round numbers',
    'panel.exportLegend': 'Stitch key in exports',
    'panel.terms': 'Terminology',
    'terms.us': 'US (sc, dc…)', 'terms.uk': 'UK (dc, tr…)', 'terms.lv': 'Latvian (ī.st., st.1a.…)',
    'panel.image': 'Reference image',
    'panel.imageInfo': 'Put a photo or scanned chart under the grid and trace it. It is saved in the design file but left out of exports.',
    'panel.chooseImage': 'Choose image…',
    'panel.imgShow': 'Show',
    'panel.imgOpacity': 'Opacity',
    'panel.imgScale': 'Size',
    'panel.imgX': 'Move ↔',
    'panel.imgY': 'Move ↕',
    'panel.zoomImage': 'Zoom to image',
    'panel.removeImage': 'Remove',
    'panel.key': 'Stitch key',
    'panel.written': 'Written instructions (draft)',
    'panel.copyText': 'Copy text',

    'new.title': 'New chart',
    'new.name': 'Name',
    'new.rows': 'Rows', 'new.rowsDesc': 'Flat pieces worked back and forth: blankets, scarves, stitch patterns.',
    'new.rounds': 'Rounds', 'new.roundsDesc': 'Worked from the center out: doilies, hats, amigurumi, coasters.',
    'new.filet': 'Filet grid', 'new.filetDesc': 'Rows of filled blocks and open mesh.',
    'new.stitches': 'Stitches',
    'new.warn': 'This replaces the chart on screen. Save it first if you want to keep it.',
    'new.cancel': 'Cancel', 'new.create': 'Create',

    'help.title': 'How to use Microcheted',
    'help.intro': 'Pick a stitch symbol on the left, then click or drag on the grid to place it. Every cell holds one stitch. Rows read from the bottom up: row 1 runs right to left, row 2 left to right, and so on. Rounds start at the center and run counterclockwise from the marked seam.',
    'help.k.draw': '<kbd>B</kbd> Draw', 'help.k.erase': '<kbd>E</kbd> Erase', 'help.k.fill': '<kbd>F</kbd> Fill',
    'help.k.pick': '<kbd>I</kbd> Pick a stitch from the chart', 'help.k.select': '<kbd>S</kbd> Select', 'help.k.zoom': '<kbd>Z</kbd> Zoom box',
    'help.k.pan': '<kbd>H</kbd> / hold <kbd>Space</kbd> Pan', 'help.k.rotate': '<kbd>R</kbd> / <kbd>Shift R</kbd> Rotate stitch',
    'help.k.undo': '<kbd>Ctrl Z</kbd> / <kbd>Ctrl Y</kbd> Undo / redo',
    'help.k.clip': '<kbd>Ctrl C</kbd> <kbd>Ctrl X</kbd> <kbd>Ctrl V</kbd> Copy, cut, paste',
    'help.k.del': '<kbd>Del</kbd> Delete selection', 'help.k.esc': '<kbd>Esc</kbd> Stop pasting / clear selection',
    'help.k.wheel': '<kbd>Wheel</kbd> / pinch Zoom', 'help.k.fit': '<kbd>0</kbd> Fit chart',
    'help.k.file': '<kbd>Ctrl S</kbd> / <kbd>Ctrl O</kbd> Save / open',
    'help.save': 'Paste keeps going until you press <kbd>Esc</kbd>, so you can stamp a repeat many times. Your work is autosaved in this browser. Use <b>File → Save design</b> to keep a <code>.json</code> file that you can open again or share.',
    'help.donate': 'Microcheted is free for everyone. If it helps you, you can <a href="https://ko-fi.com/teddybear1998" target="_blank" rel="noopener">buy me a coffee on Ko-fi ♥</a>.',
    'help.ok': 'Got it',

    'cat.kbasic': 'Knit & purl', 'cat.kinc': 'Increases', 'cat.kdec': 'Decreases', 'cat.ktex': 'Bobbles & bind-off', 'cat.kcable': 'Cables',
    'new.knit': 'Knitting', 'new.knitDesc': 'Knitting chart: knit, purl, lace, cables and colorwork.',
    'new.knitRound': 'Worked in the round (every row is read right to left)',
    'panel.knitRound': 'Worked in the round',
    'panel.gaugeSts': 'Gauge: stitches / 10 cm', 'panel.gaugeRows': 'Gauge: rows / 10 cm', 'panel.gaugePh': 'square cells',
    'mode.knit': 'Knitting chart, shown from the right side. Read from the bottom up: RS rows right to left, WS rows left to right. Square color is yarn color.',
    'mode.knitRound': 'Knitting chart worked in the round. Read every round from right to left, bottom to top. Square color is yarn color.',
    'toast.noFillSpan': 'Cables cannot be used with Fill. Place them one at a time.',
    'written.kterms': '{terms} knitting terms. This is a draft. Check it against your chart.',
    'written.kFlatIntro': 'Row 1 is a right-side (RS) row. WS rows are written as you work them, so a knit square becomes a purl.',
    'written.kRoundIntro': 'Worked in the round. Every round is read from right to left.',
    'knit.count': '{a}{n}',
    'knit.times': '[{a}] {n} times',
    'help.knit': '<b>Knitting:</b> choose <b>File → New chart → Knitting</b>. A blank square is a knit stitch and its fill is the yarn color, so you can paint colorwork with the Draw and Fill tools. Cables cover several squares: click the leftmost square of the cable. Set the gauge under <b>Chart</b> to see the real stitch shape.',
    'doc.untitled': 'Untitled chart',
    'hint.brush': 'Click or drag to place stitches',
    'hint.eraser': 'Click or drag to erase',
    'hint.fill': 'Fill a connected area (rows) or a run of stitches around a round',
    'hint.picker': 'Click a stitch to copy its symbol, color and rotation',
    'hint.select': 'Drag to select. Then copy, cut, flip or recolor',
    'hint.zoom': 'Drag a box to zoom into it. Click to zoom in, Shift-click to zoom out',
    'hint.pan': 'Drag to move the view',
    'hint.paste': 'Click to stamp the copied stitches · Esc to stop',
    'hint.replaceColor': 'Click a stitch. Every stitch in its color changes to the current color · Esc to cancel',
    'mode.rect': 'Row chart. Read from the bottom up. Odd rows run right to left, even rows left to right.',
    'mode.round': 'Round chart. Starts at the center and runs counterclockwise from the orange seam.',
    'status.size': '{cols} × {rows} stitches',
    'status.rounds': { one: '{n} round', other: '{n} rounds' },
    'status.rowCell': 'Row {row}, stitch {st}',
    'status.roundCell': 'Round {r}, stitch {st} of {n}',
    'legend.empty': 'Stitches you place will be listed here.',

    'toast.quota': 'Browser storage is full. The reference image is not autosaved, so use File → Save to keep it.',
    'toast.emptyCell': 'That cell is empty.',
    'toast.sameColor': 'Choose a different current color first.',
    'toast.recolored': { one: 'Recolored {n} stitch.', other: 'Recolored {n} stitches.' },
    'toast.copied': { one: 'Copied {n} stitch.', other: 'Copied {n} stitches.' },
    'toast.copyFirst': 'Copy something first: select an area and press Ctrl C.',
    'toast.selectRows': 'Select & copy works on row charts. In rounds, use Fill or "Repeat around".',
    'confirm.lost': {
      one: '{n} stitch falls outside the new size and will be removed. Continue? (You can undo this.)',
      other: '{n} stitches fall outside the new size and will be removed. Continue? (You can undo this.)',
    },
    'toast.motifTooLong': { one: 'Round {r} has {n} stitch. Use a shorter motif.', other: 'Round {r} has {n} stitches. Use a shorter motif.' },
    'toast.repeated': 'Repeated a {len}-stitch motif around round {r}{partial}.',
    'toast.partial': ' (the last repeat is partial)',
    'toast.imageAdded': 'Reference image added. Change its opacity, size and position under "Reference image".',
    'toast.pngTooBig': 'This chart is too big to export as PNG. Try SVG.',
    'toast.popups': 'Allow pop-ups for this site to print.',
    'toast.saved': 'Design saved. Open the .json file later with File → Open.',
    'toast.opened': 'Opened "{name}".',
    'toast.sampleLoaded': 'Example loaded. Your previous chart was replaced.',
    'toast.textCopied': 'Instructions copied.',
    'toast.copyFailed': 'Copy failed. Select the text and copy it yourself.',
    'err.notDesign': 'This file is not a Microcheted design.',
    'err.read': 'Could not read that file. Is it a Microcheted .json design?',

    'export.madeWith': 'Made with Microcheted',
    'export.key': 'Stitch key',

    'sample.rows': 'Sample: textured stripes',
    'sample.rounds': 'Sample: round coaster',
    'sample.filet': 'Sample: filet heart',

    'written.termsName': { us: 'US', uk: 'UK', lv: 'Latvian' },
    'written.terms': '{terms} crochet terms. This is a draft. Check it against your chart.',
    'written.colors': 'Colors: ',
    'written.rowIntro': 'Row 1 is a right-side row worked right to left. Turn at the end of every row.',
    'written.row': 'Row {n} ({side}): {text}. ({count} sts)',
    'written.rs': 'RS', 'written.ws': 'WS',
    'written.ring': 'Make a magic ring.',
    'written.chainRing': 'Ch {n}, join with {slst} to form a ring.',
    'written.roundsIntro': 'Work in rounds counterclockwise with the right side facing.',
    'written.rnd': 'Rnd {n}: {text}. ({count} sts)',
    'written.repeat': '*{motif}*, repeat {n} times',
    'written.empty': '(Place some stitches on the chart to build instructions.)',
  };

  const lv = {
    'meta.title': 'Microcheted — tamborēšanas shēmu veidotājs',
    'meta.desc': 'Bezmaksas tamborēšanas shēmu veidotājs tiešsaistē: zīmē shēmas ar standarta tamborēšanas simboliem rindās, apļos vai filejas režģī. Saglabā, importē, pārkrāso, tuvini un eksportē.',
    'lang.label': 'Valoda',

    'top.library': 'Stabiņu bibliotēka',
    'top.settings': 'Iestatījumi',
    'top.docName': 'Shēmas nosaukums',
    'menu.file': 'Fails ▾',
    'menu.new': 'Jauna shēma…',
    'menu.open': 'Atvērt dizainu…',
    'menu.save': 'Saglabāt dizainu',
    'menu.png': 'Eksportēt PNG attēlu',
    'menu.pngYarn': 'Eksportēt dzijas skatu (PNG)',
    'preview.label': 'Dzijas skats',
    'preview.tip': 'Parāda, kā stabiņi aptuveni izskatās no dzijas (P). Arī šajā skatā var turpināt zīmēt.',
    'help.k.preview': '<kbd>P</kbd> Dzijas skats ieslēgts / izslēgts',
    'menu.svg': 'Eksportēt SVG (vektoru)',
    'menu.print': 'Drukāt…',
    'menu.sampleRows': 'Piemērs: rindas',
    'menu.sampleRounds': 'Piemērs: apļi',
    'menu.sampleFilet': 'Piemērs: fileja',
    'top.undo': 'Atsaukt', 'top.undoTip': 'Atsaukt (Ctrl Z)',
    'top.redo': 'Atkārtot', 'top.redoTip': 'Atkārtot (Ctrl Y)',
    'top.zoomOut': 'Tālināt', 'top.zoomOutTip': 'Tālināt (−)',
    'top.zoomIn': 'Tuvināt', 'top.zoomInTip': 'Tuvināt (+)',
    'top.fitTip': 'Ietilpināt shēmu (0)',
    'top.help': 'Palīdzība', 'top.helpTip': 'Palīdzība un īsinājumtaustiņi',
    'top.donate': 'Ziedot', 'top.donateAria': 'Ziedot Ko-fi', 'top.donateTip': 'Microcheted ir bezmaksas. Atbalsti to Ko-fi',

    'toolbar.label': 'Rīki',
    'tool.brush': 'Zīmēt', 'tool.brushTip': 'Zīmēt stabiņu (B)',
    'tool.eraser': 'Dzēst', 'tool.eraserTip': 'Dzēst (E)',
    'tool.fill': 'Pildīt', 'tool.fillTip': 'Aizpildīt laukumu / apli (F)',
    'tool.picker': 'Paņemt', 'tool.pickerTip': 'Paņemt stabiņu no shēmas (I)',
    'tool.select': 'Atlasīt', 'tool.selectTip': 'Atlasīt, kopēt un ielīmēt (S)',
    'tool.zoom': 'Tuvināt', 'tool.zoomTip': 'Tuvināt apgabalu – velc rāmi (Z)',
    'tool.pan': 'Bīdīt', 'tool.panTip': 'Bīdīt skatu (H vai turi atstarpi / peles vidējo pogu)',
    'tool.check': 'Atzīmēt', 'tool.checkTip': 'Atzīmēt pabeigtās rindas (C)',
    'progress.tip': 'Rindu skaitītājs: kur tu esi darbā',
    'progress.row': 'Rinda', 'progress.round': 'Aplis',
    'progress.inc': 'Nākamā rinda', 'progress.incTip': 'Nākamā rinda (N)',
    'progress.dec': 'Iepriekšējā rinda', 'progress.decTip': 'Iepriekšējā rinda (Shift N)',
    'progress.reset': 'Sākt no jauna', 'progress.resetTip': 'Atiestatīt skaitītāju un noņemt visas atzīmes',
    'confirm.resetProgress': 'Sākt no jauna? Rindu skaitītājs atgriezīsies uz 1, un visas atzīmētās rindas tiks notīrītas.',
    'hint.check': 'Klikšķini uz rindas, lai to izsvītrotu kā pabeigtu, vēlreiz – lai atceltu. Var vilkt pār vairākām rindām',
    'help.k.check': '<kbd>C</kbd> Atzīmēt pabeigtās rindas',
    'help.k.counter': '<kbd>N</kbd> / <kbd>Shift N</kbd> Rindu skaitītājs +1 / −1',
    'tool.current': 'Pašreizējais stabiņš',
    'tool.color': 'Stabiņa krāsa',
    'tool.rotl': 'Pagriezt pa kreisi', 'tool.rotlTip': 'Pagriezt stabiņu pa kreisi (Shift R)',
    'tool.rotr': 'Pagriezt pa labi', 'tool.rotrTip': 'Pagriezt stabiņu pa labi (R)',
    'tool.loop': 'Cilpa, kurā tamborēt',
    'mod.both': 'Abās', 'mod.blo': 'Aizm.', 'mod.flo': 'Priekš.',
    'sel.copy': 'Kopēt', 'sel.cut': 'Izgriezt', 'sel.paste': 'Ielīmēt', 'sel.del': 'Dzēst',
    'sel.fliph': 'Apgriezt ↔', 'sel.flipv': 'Apgriezt ↕', 'sel.recolor': 'Pārkrāsot', 'sel.zoom': 'Tuvināt',

    'lib.search': 'Meklēt stabiņus… (st.1a., vēdeklis, popkorns)',
    'lib.searchAria': 'Meklēt stabiņus',
    'lib.none': 'Neviens stabiņš neatbilst.',
    'canvas.label': 'Tamborēšanas shēmas audekls',

    'cat.basic': 'Pamatstabiņi', 'cat.post': 'Reljefie stabiņi', 'cat.inc': 'Palielinājumi', 'cat.dec': 'Samazinājumi',
    'cat.tex': 'Kopas un faktūra', 'cat.chain': 'Gaisa cilpas, gredzeni un arkas', 'cat.filet': 'Filejas tamborējums', 'cat.mark': 'Marķieri',

    'panel.colors': 'Krāsas',
    'panel.recolorType': 'Pārkrāsot visus šos stabiņus',
    'panel.recolorFrom': 'Aizstāt krāsu…',
    'panel.recolorFromTip': 'Izvēlies krāsu shēmā, un visi šīs krāsas stabiņi iegūs pašreizējo krāsu',
    'panel.chart': 'Shēma',
    'panel.cols': 'Stabiņi (kolonnas)',
    'panel.rows': 'Rindas',
    'panel.rings': 'Apļi',
    'panel.start': 'Stabiņi 1. aplī',
    'panel.inc': 'Pieliek katrā aplī',
    'panel.counts': 'Savs stabiņu skaits katrā aplī',
    'panel.countsPh': 'piem., 6, 12, 18, 18, 24',
    'panel.center': 'Centrs',
    'center.ring': 'Burvju gredzens', 'center.chain': 'Gaisa cilpu gredzens', 'center.none': 'Nav',
    'panel.applySize': 'Lietot izmēru',
    'panel.repeatInfo': 'Atkārto apļa pirmos stabiņus visapkārt aplim.',
    'panel.repRound': 'Aplis',
    'panel.repLen': 'Motīva garums',
    'panel.repeat': 'Atkārtot visapkārt',
    'panel.display': 'Attēlojums',
    'panel.bg': 'Fons',
    'panel.grid': 'Režģa līnijas',
    'panel.showGrid': 'Rādīt režģi',
    'panel.numbers': 'Rindu / apļu numuri',
    'panel.exportLegend': 'Apzīmējumi eksportā',
    'panel.terms': 'Terminoloģija',
    'terms.us': 'ASV (sc, dc…)', 'terms.uk': 'Lielbritānijas (dc, tr…)', 'terms.lv': 'Latviešu (ī.st., st.1a.…)',
    'panel.image': 'Atsauces attēls',
    'panel.imageInfo': 'Novieto zem režģa fotoattēlu vai ieskenētu shēmu un pārzīmē to. Attēls tiek saglabāts dizaina failā, bet netiek iekļauts eksportā.',
    'panel.chooseImage': 'Izvēlēties attēlu…',
    'panel.imgShow': 'Rādīt',
    'panel.imgOpacity': 'Necaurredzamība',
    'panel.imgScale': 'Izmērs',
    'panel.imgX': 'Pārvietot ↔',
    'panel.imgY': 'Pārvietot ↕',
    'panel.zoomImage': 'Tuvināt attēlam',
    'panel.removeImage': 'Noņemt',
    'panel.key': 'Apzīmējumi',
    'panel.written': 'Rakstiskās instrukcijas (melnraksts)',
    'panel.copyText': 'Kopēt tekstu',

    'new.title': 'Jauna shēma',
    'new.name': 'Nosaukums',
    'new.rows': 'Rindas', 'new.rowsDesc': 'Plakani darbi, ko tamborē turp un atpakaļ: segas, šalles, rakstu paraugi.',
    'new.rounds': 'Apļi', 'new.roundsDesc': 'Tamborē no centra uz āru: salvetes, cepures, amigurumi, paliktņi.',
    'new.filet': 'Filejas režģis', 'new.filetDesc': 'Rindas ar pilnām un tukšām rūtiņām.',
    'new.stitches': 'Stabiņi',
    'new.warn': 'Šī darbība aizstās ekrānā redzamo shēmu. Ja vēlies to paturēt, vispirms saglabā.',
    'new.cancel': 'Atcelt', 'new.create': 'Izveidot',

    'help.title': 'Kā lietot Microcheted',
    'help.intro': 'Kreisajā pusē izvēlies stabiņa simbolu, tad klikšķini vai velc pa režģi, lai to novietotu. Katrā šūnā ir viens stabiņš. Rindas lasa no apakšas uz augšu: 1. rinda iet no labās uz kreiso, 2. rinda no kreisās uz labo utt. Apļi sākas centrā un iet pretēji pulksteņrādītāja virzienam no atzīmētās šuves.',
    'help.k.draw': '<kbd>B</kbd> Zīmēt', 'help.k.erase': '<kbd>E</kbd> Dzēst', 'help.k.fill': '<kbd>F</kbd> Pildīt',
    'help.k.pick': '<kbd>I</kbd> Paņemt stabiņu no shēmas', 'help.k.select': '<kbd>S</kbd> Atlasīt', 'help.k.zoom': '<kbd>Z</kbd> Tuvināšanas rāmis',
    'help.k.pan': '<kbd>H</kbd> / turi <kbd>Atstarpi</kbd> Bīdīt skatu', 'help.k.rotate': '<kbd>R</kbd> / <kbd>Shift R</kbd> Pagriezt stabiņu',
    'help.k.undo': '<kbd>Ctrl Z</kbd> / <kbd>Ctrl Y</kbd> Atsaukt / atkārtot',
    'help.k.clip': '<kbd>Ctrl C</kbd> <kbd>Ctrl X</kbd> <kbd>Ctrl V</kbd> Kopēt, izgriezt, ielīmēt',
    'help.k.del': '<kbd>Del</kbd> Dzēst atlasīto', 'help.k.esc': '<kbd>Esc</kbd> Beigt ielīmēšanu / noņemt atlasi',
    'help.k.wheel': '<kbd>Ritenītis</kbd> / savilkšana Tuvināt', 'help.k.fit': '<kbd>0</kbd> Ietilpināt shēmu',
    'help.k.file': '<kbd>Ctrl S</kbd> / <kbd>Ctrl O</kbd> Saglabāt / atvērt',
    'help.save': 'Ielīmēšana turpinās, līdz nospied <kbd>Esc</kbd>, tāpēc vienu rakstu vari iespiest daudzas reizes. Tavs darbs tiek automātiski saglabāts šajā pārlūkā. Izmanto <b>Fails → Saglabāt dizainu</b>, lai iegūtu <code>.json</code> failu, ko var atkal atvērt vai nosūtīt citiem.',
    'help.donate': 'Microcheted ir bezmaksas visiem. Ja tas tev noder, vari <a href="https://ko-fi.com/teddybear1998" target="_blank" rel="noopener">uzsaukt man kafiju Ko-fi ♥</a>.',
    'help.ok': 'Skaidrs',

    'cat.kbasic': 'Labiskie un kreiliskie', 'cat.kinc': 'Pielikšana', 'cat.kdec': 'Sarukumi', 'cat.ktex': 'Bumbuļi un nolaišana', 'cat.kcable': 'Bizes',
    'new.knit': 'Adīšana', 'new.knitDesc': 'Adīšanas shēma: labiskie, kreiliskie, mežģīnes, bizes un krāsu raksti.',
    'new.knitRound': 'Ada riņķī (katru rindu lasa no labās uz kreiso)',
    'panel.knitRound': 'Ada riņķī',
    'panel.gaugeSts': 'Blīvums: valdziņi / 10 cm', 'panel.gaugeRows': 'Blīvums: rindas / 10 cm', 'panel.gaugePh': 'kvadrātiskas rūtiņas',
    'mode.knit': 'Adīšanas shēma no labās puses. Lasa no apakšas uz augšu: LP rindas no labās uz kreiso, KP rindas no kreisās uz labo. Rūtiņas krāsa ir dzijas krāsa.',
    'mode.knitRound': 'Riņķī adīta shēma. Katru rindu lasa no labās uz kreiso, no apakšas uz augšu. Rūtiņas krāsa ir dzijas krāsa.',
    'toast.noFillSpan': 'Bizes nevar likt ar Pildīt. Novieto tās pa vienai.',
    'written.kterms': 'Adīšanas terminoloģija: {terms}. Šis ir melnraksts — pārbaudi to pret shēmu.',
    'written.kFlatIntro': '1. rinda ir labās puses (LP) rinda. KP rindas ir aprakstītas tā, kā tās ada, tāpēc labiskā rūtiņa tajās ir kreiliskais valdziņš.',
    'written.kRoundIntro': 'Ada riņķī. Katru rindu lasa no labās uz kreiso.',
    'knit.count': '{n} {a}',
    'knit.times': { zero: '[{a}] {n} reižu', one: '{a}', other: '[{a}] {n} reizes' },
    'help.knit': '<b>Adīšana:</b> izvēlies <b>Fails → Jauna shēma → Adīšana</b>. Tukša rūtiņa ir labiskais valdziņš, un tās krāsa ir dzijas krāsa, tāpēc krāsu rakstus vari zīmēt ar Zīmēt un Pildīt. Bizes aizņem vairākas rūtiņas: klikšķini uz bizes kreisās malas rūtiņas. Sadaļā <b>Shēma</b> iestati blīvumu, lai redzētu īsto valdziņa formu.',
    'doc.untitled': 'Shēma bez nosaukuma',
    'hint.brush': 'Klikšķini vai velc, lai novietotu stabiņus',
    'hint.eraser': 'Klikšķini vai velc, lai dzēstu',
    'hint.fill': 'Aizpilda saistītu laukumu (rindās) vai stabiņu virkni aplī',
    'hint.picker': 'Klikšķini uz stabiņa, lai paņemtu tā simbolu, krāsu un pagriezienu',
    'hint.select': 'Velc, lai atlasītu. Tad kopē, izgriez, apgriez vai pārkrāso',
    'hint.zoom': 'Velc rāmi, lai to tuvinātu. Klikšķis tuvina, Shift + klikšķis tālina',
    'hint.pan': 'Velc, lai pārvietotu skatu',
    'hint.paste': 'Klikšķini, lai iespiestu nokopētos stabiņus · Esc, lai beigtu',
    'hint.replaceColor': 'Klikšķini uz stabiņa. Visi tā krāsas stabiņi iegūs pašreizējo krāsu · Esc, lai atceltu',
    'mode.rect': 'Rindu shēma. Lasa no apakšas uz augšu. Nepāra rindas iet no labās uz kreiso, pāra rindas no kreisās uz labo.',
    'mode.round': 'Apļu shēma. Sākas centrā un iet pretēji pulksteņrādītāja virzienam no oranžās šuves.',
    'status.size': '{cols} × {rows} stabiņi',
    'status.rounds': { zero: '{n} apļu', one: '{n} aplis', other: '{n} apļi' },
    'status.rowCell': '{row}. rinda, {st}. stabiņš',
    'status.roundCell': '{r}. aplis, {st}. stabiņš no {n}',
    'legend.empty': 'Šeit būs redzami shēmā izmantotie stabiņi.',

    'toast.quota': 'Pārlūka krātuve ir pilna. Atsauces attēls netiek saglabāts automātiski, tāpēc izmanto Fails → Saglabāt.',
    'toast.emptyCell': 'Šī šūna ir tukša.',
    'toast.sameColor': 'Vispirms izvēlies citu pašreizējo krāsu.',
    'toast.recolored': 'Pārkrāsoti stabiņi: {n}.',
    'toast.copied': 'Nokopēti stabiņi: {n}.',
    'toast.copyFirst': 'Vispirms kaut ko nokopē: atlasi laukumu un nospied Ctrl C.',
    'toast.selectRows': 'Atlasīšana un kopēšana darbojas rindu shēmās. Apļos izmanto Pildīt vai “Atkārtot visapkārt”.',
    'confirm.lost': 'Stabiņi ārpus jaunā izmēra: {n}. Tie tiks noņemti. Turpināt? (To var atsaukt.)',
    'toast.motifTooLong': '{r}. aplī ir {n} st. Izmanto īsāku motīvu.',
    'toast.repeated': '{len} stabiņu motīvs atkārtots visapkārt {r}. aplim{partial}.',
    'toast.partial': ' (pēdējais atkārtojums ir nepilns)',
    'toast.imageAdded': 'Atsauces attēls pievienots. Tā necaurredzamību, izmēru un novietojumu maini sadaļā “Atsauces attēls”.',
    'toast.pngTooBig': 'Šī shēma ir par lielu PNG eksportam. Mēģini SVG.',
    'toast.popups': 'Lai drukātu, atļauj šai vietnei uznirstošos logus.',
    'toast.saved': 'Dizains saglabāts. Vēlāk atver .json failu ar Fails → Atvērt.',
    'toast.opened': 'Atvērts “{name}”.',
    'toast.sampleLoaded': 'Piemērs ielādēts. Iepriekšējā shēma tika aizstāta.',
    'toast.textCopied': 'Instrukcijas nokopētas.',
    'toast.copyFailed': 'Neizdevās nokopēt. Atlasi tekstu un nokopē to pats.',
    'err.notDesign': 'Šis fails nav Microcheted dizains.',
    'err.read': 'Neizdevās nolasīt failu. Vai tas ir Microcheted .json dizains?',

    'export.madeWith': 'Izveidots ar Microcheted',
    'export.key': 'Apzīmējumi',

    'sample.rows': 'Piemērs: faktūras svītras',
    'sample.rounds': 'Piemērs: apaļš paliktnis',
    'sample.filet': 'Piemērs: filejas sirds',

    'written.termsName': { us: 'ASV', uk: 'Lielbritānijas', lv: 'latviešu' },
    'written.terms': 'Terminoloģija: {terms}. Šis ir melnraksts — pārbaudi to pret shēmu.',
    'written.colors': 'Krāsas: ',
    'written.rowIntro': '1. rinda ir labās puses rinda, ko tamborē no labās uz kreiso. Katras rindas beigās apgriez darbu.',
    'written.row': '{n}. rinda ({side}): {text}. ({count} st.)',
    'written.rs': 'LP', 'written.ws': 'KP',
    'written.ring': 'Izveido burvju gredzenu.',
    'written.chainRing': 'Uzmet {n} g.c. un savieno gredzenā ar savienojošo cilpu.',
    'written.roundsIntro': 'Tamborē apļos pretēji pulksteņrādītāja virzienam, ar labo pusi pret sevi.',
    'written.rnd': '{n}. aplis: {text}. ({count} st.)',
    'written.repeat': { zero: '*{motif}*, atkārto {n} reižu', one: '*{motif}*, atkārto {n} reizi', other: '*{motif}*, atkārto {n} reizes' },
    'written.empty': '(Novieto shēmā stabiņus, lai izveidotu instrukcijas.)',
  };

  const dicts = { en, lv };
  const langs = [['en', 'EN'], ['lv', 'LV']];

  function detect() {
    try { const l = localStorage.getItem(LANG_KEY); if (dicts[l]) return l; } catch { /* storage unavailable */ }
    const nav = navigator.languages || [navigator.language || ''];
    return nav.some((l) => /^lv\b/i.test(l)) ? 'lv' : 'en';
  }

  let lang = detect();
  const plurals = {};

  function raw(k) { return k in dicts[lang] ? dicts[lang][k] : k in en ? en[k] : k; }

  function t(k, vars) {
    let s = raw(k);
    if (s && typeof s === 'object') {
      const n = vars && vars.n;
      if (typeof n !== 'number') return s;   // a lookup table, not plural forms
      plurals[lang] = plurals[lang] || new Intl.PluralRules(lang);
      s = s[plurals[lang].select(n)] ?? s.other;
    }
    return vars ? String(s).replace(/\{(\w+)\}/g, (m, v) => (v in vars ? vars[v] : m)) : s;
  }

  function apply(root = document) {
    for (const el of root.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
    for (const el of root.querySelectorAll('[data-i18n-html]')) el.innerHTML = t(el.dataset.i18nHtml);
    for (const el of root.querySelectorAll('[data-i18n-attr]')) {
      for (const pair of el.dataset.i18nAttr.split(',')) {
        const [attr, k] = pair.split(':').map((x) => x.trim());
        el.setAttribute(attr, t(k));
      }
    }
    document.documentElement.lang = lang;
    document.title = t('meta.title');
    document.querySelector('meta[name=description]')?.setAttribute('content', t('meta.desc'));
  }

  function setLang(l) {
    if (!dicts[l] || l === lang) return;
    lang = l;
    try { localStorage.setItem(LANG_KEY, l); } catch { /* storage unavailable */ }
    apply();
    window.dispatchEvent(new Event('microcheted:lang'));
  }

  window.I18N = { t, apply, setLang, langs, get lang() { return lang; } };
})();
