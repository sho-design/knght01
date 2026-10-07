/* Shared by the armoury tools: the KNGHT shield (what you guard sets the chief, the category the base),
   and a minimal PDF writer that puts one image per page at real size. */
(() => {
  const CHIEF = {
    trust: 'M70 70H330', craft: 'M70 62Q200 96 330 62', care: 'M70 84Q200 46 330 84', heritage: 'M70 76L112 76L122 66L200 54L278 66L288 76L330 76',
    discretion: 'M70 66 Q102.5 86 135 66 Q167.5 86 200 66 Q232.5 86 265 66 Q297.5 86 330 66',
    precision: 'M70 74 L91.7 62 L113.3 74 L135.0 62 L156.7 74 L178.3 62 L200.0 74 L221.7 62 L243.3 74 L265.0 62 L286.7 74 L308.3 62 L330.0 74',
    hospitality: 'M70 76 H83 V62 H109 V76 H135 V62 H161 V76 H187 V62 H213 V76 H239 V62 H265 V76 H291 V62 H317 V76 H330',
    renewal: 'M70 70 Q86.25 60 102.5 70 T135 70 T167.5 70 T200 70 T232.5 70 T265 70 T297.5 70 T330 70',
  };
  const BASE = {
    clinic: 'V230C330 330 268 388 200 424C132 388 70 330 70 230Z', dental: 'V300A130 124 0 0 1 70 300Z', medspa: 'V232C330 352 236 366 200 424C164 366 70 352 70 232Z',
    law: 'V364Q330 392 302 392H230Q208 392 200 420Q192 392 170 392H98Q70 392 70 364Z', spirits: 'V410L200 374L70 410Z',
    food: 'V330Q330 398 266 398Q206 398 200 424Q194 398 134 398Q70 398 70 330Z', other: 'V200L200 424L70 200Z',
  };
  const shield = (cat, guard) => (CHIEF[guard] || CHIEF.trust) + (BASE[cat] || BASE.other);
  // Map a shield path (drawn in a 400 box) into place: scale about (200, 214) by s, then by k, then move by (ox, oy).
  const xf = (d, k, ox, oy, s = 1) => {
    const tokens = d.match(/[A-Za-z]|-?\d*\.?\d+/g); let out = '', cmd = '', idx = 0;
    const X = (v) => (ox + (200 + (v - 200) * s) * k).toFixed(1), Y = (v) => (oy + (214 + (v - 214) * s) * k).toFixed(1);
    tokens.forEach((t) => {
      if (/[A-Za-z]/.test(t)) { cmd = t; idx = 0; out += t; return; }
      const v = parseFloat(t);
      if (cmd === 'H') out += X(v) + ' '; else if (cmd === 'V') out += Y(v) + ' ';
      else if (cmd === 'A') { const n = idx % 7; out += (n < 2 ? (v * s * k).toFixed(1) : n < 5 ? t : n === 5 ? X(v) : Y(v)) + ' '; }
      else out += (idx % 2 === 0 ? X(v) : Y(v)) + ' ';
      idx++;
    });
    return out.trim();
  };
  // SVG text to a canvas at a given resolution (svg units are hundredths of an inch).
  const raster = (svg, W, H, dpi) => new Promise((resolve, reject) => {
    const img = new Image(), u = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    img.onload = () => { const c = document.createElement('canvas'); c.width = Math.round(W / 100 * dpi); c.height = Math.round(H / 100 * dpi); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(u); resolve(c); };
    img.onerror = reject; img.src = u;
  });
  // pages: [{ canvas, wIn, hIn }] → a PDF Blob, one JPEG per page.
  const pdf = async (pages) => {
    const enc = new TextEncoder(), parts = [], offs = []; let len = 0;
    const push = (b) => { parts.push(b); len += b.length; };
    const obj = (n, body) => { offs[n] = len; push(enc.encode(`${n} 0 obj\n${body}\nendobj\n`)); };
    push(enc.encode('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'));
    const n = pages.length, kids = pages.map((_, i) => `${3 + i * 3} 0 R`).join(' ');
    obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
    obj(2, `<< /Type /Pages /Kids [${kids}] /Count ${n} >>`);
    for (let i = 0; i < n; i++) {
      const { canvas, wIn, hIn } = pages[i], W = (wIn * 72).toFixed(2), H = (hIn * 72).toFixed(2), p = 3 + i * 3;
      const jpg = new Uint8Array(await (await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.95))).arrayBuffer());
      obj(p, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /XObject << /Im0 ${p + 1} 0 R >> >> /Contents ${p + 2} 0 R >>`);
      offs[p + 1] = len;
      push(enc.encode(`${p + 1} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>\nstream\n`));
      push(jpg); push(enc.encode('\nendstream\nendobj\n'));
      const content = `q ${W} 0 0 ${H} 0 0 cm /Im0 Do Q`;
      obj(p + 2, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
    }
    const total = 3 + n * 3;
    let xref = `xref\n0 ${total}\n0000000000 65535 f \n`;
    for (let i = 1; i < total; i++) xref += String(offs[i]).padStart(10, '0') + ' 00000 n \n';
    push(enc.encode(`${xref}trailer\n<< /Size ${total} /Root 1 0 R >>\nstartxref\n${len}\n%%EOF\n`));
    return new Blob(parts, { type: 'application/pdf' });
  };
  const save = (blob, name) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 3000); };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  window.KNGHT_ARMS = { CHIEF, BASE, shield, xf, raster, pdf, save, esc };
})();
