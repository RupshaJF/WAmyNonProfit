/* ==========================================================================
   রূপসা জনকল্যাণ ফাউন্ডেশন — পিওর জাভাস্ক্রিপ্ট QR কোড জেনারেটর
   - কোনো বাইরের লাইব্রেরি/CDN নেই → অফলাইনেও কাজ করে
   - Byte mode, ECC লেভেল M, ভার্সন ১–১০ (সর্বোচ্চ ২১৩ বাইট) — ভেরিফাই লিংকের জন্য যথেষ্ট
   - আউটপুট: SVG (স্কেল করলেও ধারালো) ও PNG
   ========================================================================== */
(function (global) {
  'use strict';

  const RJF = (global.RJF = global.RJF || {});
  const lp = (RJF.lp = RJF.lp || {});

  /* ─── GF(256) গাণিতিক, primitive polynomial 0x11D ─── */
  const EXP = new Uint8Array(512);
  const LOG = new Uint8Array(256);
  (function initTables() {
    let x = 1;
    for (let i = 0; i < 255; i++) {
      EXP[i] = x;
      LOG[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11d;
    }
    for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
  })();
  const gfMul = (a, b) => (a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]]);

  /* Reed–Solomon generator polynomial (সর্বোচ্চ ঘাত আগে, leading 1 সহ) */
  function rsGenerator(degree) {
    let poly = [1];
    for (let i = 0; i < degree; i++) {
      const next = new Array(poly.length + 1).fill(0);
      for (let j = 0; j < poly.length; j++) {
        next[j] ^= poly[j];
        next[j + 1] ^= gfMul(poly[j], EXP[i]);
      }
      poly = next;
    }
    return poly;
  }

  function rsEncode(data, ecLen) {
    const gen = rsGenerator(ecLen);
    const rem = new Array(ecLen).fill(0);
    for (let k = 0; k < data.length; k++) {
      const factor = data[k] ^ rem.shift();
      rem.push(0);
      for (let i = 0; i < ecLen; i++) rem[i] ^= gfMul(gen[i + 1], factor);
    }
    return rem;
  }

  /* ─── ECC লেভেল M-এর টেবিল: প্রতি ব্লকে EC কোডওয়ার্ড, ও [ব্লক সংখ্যা, ডেটা কোডওয়ার্ড/ব্লক] গ্রুপ ─── */
  const EC_M = [
    null,
    { ec: 10, groups: [[1, 16]] },
    { ec: 16, groups: [[1, 28]] },
    { ec: 26, groups: [[1, 44]] },
    { ec: 18, groups: [[2, 32]] },
    { ec: 24, groups: [[2, 43]] },
    { ec: 16, groups: [[4, 27]] },
    { ec: 18, groups: [[4, 31]] },
    { ec: 22, groups: [[2, 38], [2, 39]] },
    { ec: 22, groups: [[3, 36], [2, 37]] },
    { ec: 26, groups: [[4, 43], [1, 44]] }
  ];
  const ALIGN = [null, [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]];
  const MAX_VERSION = 10;

  const totalData = (v) => EC_M[v].groups.reduce((sum, g) => sum + g[0] * g[1], 0);
  const byteCapacity = (v) => Math.floor((totalData(v) * 8 - 4 - (v < 10 ? 8 : 16)) / 8);

  const getBit = (x, i) => ((x >>> i) & 1) !== 0;

  function utf8Bytes(text) {
    if (typeof TextEncoder !== 'undefined') return Array.from(new TextEncoder().encode(text));
    const s = unescape(encodeURIComponent(text));
    const out = [];
    for (let i = 0; i < s.length; i++) out.push(s.charCodeAt(i));
    return out;
  }

  /* ডেটা → ইন্টারলিভড কোডওয়ার্ড (ডেটা + EC) */
  function buildCodewords(bytes, version) {
    const bits = [];
    const put = (val, len) => { for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); };

    put(0x4, 4); /* byte mode */
    put(bytes.length, version < 10 ? 8 : 16);
    bytes.forEach((b) => put(b, 8));

    const capBits = totalData(version) * 8;
    put(0, Math.min(4, capBits - bits.length));
    while (bits.length % 8) bits.push(0);
    for (let pad = 0xec; bits.length < capBits; pad ^= 0xec ^ 0x11) put(pad, 8);

    const data = [];
    for (let i = 0; i < bits.length; i += 8) {
      let b = 0;
      for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j];
      data.push(b);
    }

    const info = EC_M[version];
    const blocks = [];
    let off = 0;
    info.groups.forEach((g) => {
      for (let i = 0; i < g[0]; i++) {
        const d = data.slice(off, off + g[1]);
        off += g[1];
        blocks.push({ data: d, ec: rsEncode(d, info.ec) });
      }
    });

    const out = [];
    const maxData = Math.max.apply(null, blocks.map((b) => b.data.length));
    for (let i = 0; i < maxData; i++) blocks.forEach((b) => { if (i < b.data.length) out.push(b.data[i]); });
    for (let i = 0; i < info.ec; i++) blocks.forEach((b) => out.push(b.ec[i]));
    return out;
  }

  /* ─── ম্যাট্রিক্স তৈরি ─── */
  function makeMatrix(version, codewords) {
    const size = 17 + 4 * version;
    const modules = Array.from({ length: size }, () => new Array(size).fill(false));
    const isFn = Array.from({ length: size }, () => new Array(size).fill(false));

    const setFn = (x, y, dark) => {
      if (x < 0 || y < 0 || x >= size || y >= size) return;
      modules[y][x] = dark;
      isFn[y][x] = true;
    };

    function drawFinder(cx, cy) {
      for (let dy = -4; dy <= 4; dy++) {
        for (let dx = -4; dx <= 4; dx++) {
          const dist = Math.max(Math.abs(dx), Math.abs(dy));
          setFn(cx + dx, cy + dy, dist !== 2 && dist !== 4);
        }
      }
    }

    function drawAlign(cx, cy) {
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) setFn(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }
    }

    function drawFormat(mask) {
      const data = (0 << 3) | mask; /* ECC লেভেল M = 00 */
      let rem = data;
      for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
      const bits = ((data << 10) | rem) ^ 0x5412;

      for (let i = 0; i <= 5; i++) setFn(8, i, getBit(bits, i));
      setFn(8, 7, getBit(bits, 6));
      setFn(8, 8, getBit(bits, 7));
      setFn(7, 8, getBit(bits, 8));
      for (let i = 9; i < 15; i++) setFn(14 - i, 8, getBit(bits, i));

      for (let i = 0; i < 8; i++) setFn(size - 1 - i, 8, getBit(bits, i));
      for (let i = 8; i < 15; i++) setFn(8, size - 15 + i, getBit(bits, i));
      setFn(8, size - 8, true); /* সবসময় dark module */
    }

    function drawVersion() {
      if (version < 7) return;
      let rem = version;
      for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
      const bits = (version << 12) | rem;
      for (let i = 0; i < 18; i++) {
        const color = getBit(bits, i);
        const a = size - 11 + (i % 3);
        const b = Math.floor(i / 3);
        setFn(a, b, color);
        setFn(b, a, color);
      }
    }

    /* টাইমিং প্যাটার্ন, ফাইন্ডার, অ্যালাইনমেন্ট */
    for (let i = 0; i < size; i++) {
      setFn(6, i, i % 2 === 0);
      setFn(i, 6, i % 2 === 0);
    }
    drawFinder(3, 3);
    drawFinder(size - 4, 3);
    drawFinder(3, size - 4);
    const pos = ALIGN[version];
    for (let i = 0; i < pos.length; i++) {
      for (let j = 0; j < pos.length; j++) {
        const onFinder = (i === 0 && j === 0) || (i === 0 && j === pos.length - 1) || (i === pos.length - 1 && j === 0);
        if (!onFinder) drawAlign(pos[i], pos[j]);
      }
    }
    drawFormat(0);
    drawVersion();

    /* ডেটা বসানো — ডানদিক থেকে জিগজ্যাগ */
    let bitIdx = 0;
    for (let right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let vert = 0; vert < size; vert++) {
        for (let j = 0; j < 2; j++) {
          const x = right - j;
          const upward = ((right + 1) & 2) === 0;
          const y = upward ? size - 1 - vert : vert;
          if (!isFn[y][x] && bitIdx < codewords.length * 8) {
            modules[y][x] = getBit(codewords[bitIdx >>> 3], 7 - (bitIdx & 7));
            bitIdx++;
          }
        }
      }
    }

    function applyMask(mask) {
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          let invert;
          switch (mask) {
            case 0: invert = (x + y) % 2 === 0; break;
            case 1: invert = y % 2 === 0; break;
            case 2: invert = x % 3 === 0; break;
            case 3: invert = (x + y) % 3 === 0; break;
            case 4: invert = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break;
            case 5: invert = ((x * y) % 2) + ((x * y) % 3) === 0; break;
            case 6: invert = (((x * y) % 2) + ((x * y) % 3)) % 2 === 0; break;
            default: invert = (((x + y) % 2) + ((x * y) % 3)) % 2 === 0; break;
          }
          if (!isFn[y][x] && invert) modules[y][x] = !modules[y][x];
        }
      }
    }

    function penalty() {
      let score = 0;
      const line = (get) => {
        let run = 0;
        let prev = null;
        let str = '';
        for (let i = 0; i < size; i++) {
          const c = get(i);
          str += c ? '1' : '0';
          if (c === prev) {
            run++;
            if (run === 5) score += 3;
            else if (run > 5) score += 1;
          } else {
            prev = c;
            run = 1;
          }
        }
        [/(?=10111010000)/g, /(?=00001011101)/g].forEach((re) => {
          const m = str.match(re);
          if (m) score += m.length * 40;
        });
      };
      for (let y = 0; y < size; y++) line((i) => modules[y][i]);
      for (let x = 0; x < size; x++) line((i) => modules[i][x]);

      for (let y = 0; y < size - 1; y++) {
        for (let x = 0; x < size - 1; x++) {
          const c = modules[y][x];
          if (c === modules[y][x + 1] && c === modules[y + 1][x] && c === modules[y + 1][x + 1]) score += 3;
        }
      }

      let dark = 0;
      modules.forEach((row) => row.forEach((c) => { if (c) dark++; }));
      const total = size * size;
      score += (Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1) * 10;
      return score;
    }

    /* সবচেয়ে কম পেনাল্টির মাস্ক বাছাই */
    let bestMask = 0;
    let bestScore = Infinity;
    for (let m = 0; m < 8; m++) {
      applyMask(m);
      drawFormat(m);
      const s = penalty();
      if (s < bestScore) { bestScore = s; bestMask = m; }
      applyMask(m); /* undo */
    }
    applyMask(bestMask);
    drawFormat(bestMask);

    return { size, modules, mask: bestMask };
  }

  /* ────────────────────────────────────────────────
     পাবলিক API
     ────────────────────────────────────────────── */
  function encode(text) {
    const bytes = utf8Bytes(String(text));
    let version = 0;
    for (let v = 1; v <= MAX_VERSION; v++) {
      if (bytes.length <= byteCapacity(v)) { version = v; break; }
    }
    if (!version) throw new Error('qr-too-long');
    const m = makeMatrix(version, buildCodewords(bytes, version));
    return { version, size: m.size, modules: m.modules, mask: m.mask };
  }

  function toSvg(text, opts) {
    const o = opts || {};
    const margin = o.margin == null ? 3 : o.margin;
    const dark = o.dark || '#0E3B36';
    const light = o.light || '#FFFFFF';
    const qr = encode(text);
    const n = qr.size + margin * 2;
    const parts = [];
    for (let y = 0; y < qr.size; y++) {
      let x = 0;
      while (x < qr.size) {
        if (qr.modules[y][x]) {
          const start = x;
          while (x < qr.size && qr.modules[y][x]) x++;
          parts.push('M' + (start + margin) + ' ' + (y + margin) + 'h' + (x - start) + 'v1h-' + (x - start) + 'z');
        } else {
          x++;
        }
      }
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + n + ' ' + n + '" shape-rendering="crispEdges" ' +
      'role="img" aria-label="' + lp.esc(o.label || 'QR কোড') + '">' +
      '<rect width="' + n + '" height="' + n + '" fill="' + light + '"/>' +
      '<path fill="' + dark + '" d="' + parts.join('') + '"/></svg>';
  }

  /* ক্যানভাসে সরাসরি আঁকা (কার্ড PNG-তে বসানোর জন্য) */
  function drawTo(ctx, text, x, y, px, opts) {
    const o = opts || {};
    const margin = o.margin == null ? 0 : o.margin;
    const qr = encode(text);
    const cell = px / (qr.size + margin * 2);
    if (o.light) { ctx.fillStyle = o.light; ctx.fillRect(x, y, px, px); }
    ctx.fillStyle = o.dark || '#0E3B36';
    for (let r = 0; r < qr.size; r++) {
      for (let c = 0; c < qr.size; c++) {
        if (qr.modules[r][c]) {
          ctx.fillRect(
            Math.round(x + (c + margin) * cell),
            Math.round(y + (r + margin) * cell),
            Math.ceil(cell),
            Math.ceil(cell)
          );
        }
      }
    }
  }

  function toPngBlob(text, opts) {
    const o = opts || {};
    const px = o.size || 512;
    return new Promise((resolve, reject) => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = px;
        canvas.height = px;
        const ctx = canvas.getContext('2d');
        drawTo(ctx, text, 0, 0, px, { margin: o.margin == null ? 3 : o.margin, dark: o.dark, light: o.light || '#FFFFFF' });
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('png-failed'))), 'image/png');
      } catch (e) {
        reject(e);
      }
    });
  }

  lp.qr = { encode, toSvg, drawTo, toPngBlob, byteCapacity, MAX_VERSION };
})(window);
