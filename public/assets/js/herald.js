/* The herald: print-ready QR signs that never expire. The link goes straight into the code (no redirect),
   the code stays plain black on white so every phone reads it, and everything around it is the business's own:
   its shield, its name in the KNGHT cipher, and a seal for what the sign is for. It runs in the browser. */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const form = $('[data-herald]');
  if (!form || typeof window.qrcode !== 'function') return;
  const stage = $('[data-hb-stage]'), fieldsEl = $('[data-hb-fields]'), verdict = $('[data-hb-verdict]'), rangeEl = $('[data-hb-range]'), payloadEl = $('[data-hb-payload]');
  const tagRow = $('[data-hb-tagrow]'), tagBox = $('[data-hb-tag]');
  const track = (e, p) => { if (window.KNGHT_TRACK) window.KNGHT_TRACK(e, p); };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.qrcode.stringToBytes = window.qrcode.stringToBytesFuncs['UTF-8'];
  const SERIF = 'Cormorant Garamond, Georgia, serif', SANS = 'Helvetica Neue, Arial, sans-serif';

  /* What the sign is for */
  const ICON = {
    review: '<path d="M12 2.8l2.8 5.8 6.4.9-4.6 4.5 1.1 6.3L12 17.3l-5.7 3 1.1-6.3-4.6-4.5 6.4-.9z"/>',
    book: '<path d="M4 5.6h16v15H4zM4 9.8h16M8 3.2v4.4M16 3.2v4.4M8.6 15l2.2 2.2 4.6-4.6"/>',
    wifi: '<path d="M3 9.4a12.8 12.8 0 0 1 18 0M5.9 12.4a8.6 8.6 0 0 1 12.2 0M8.8 15.4a4.4 4.4 0 0 1 6.4 0"/><circle cx="12" cy="18.6" r="1.3"/>',
    contact: '<path d="M2.8 5h18.4v14H2.8z"/><circle cx="8.4" cy="10.2" r="2.2"/><path d="M5.2 16.2c.6-1.9 1.8-2.8 3.2-2.8s2.6.9 3.2 2.8M14 9.4h4.4M14 12.4h4.4M14 15.4h3"/>',
    link: '<g transform="rotate(-45 12 12)"><rect x="2.4" y="9.2" width="10.6" height="5.6" rx="2.8"/><rect x="11" y="9.2" width="10.6" height="5.6" rx="2.8"/></g>',
  };
  const PURPOSE = {
    review: { icon: 'review', line: 'Tell us how we did.', fields: [['url', 'Your Google review link', 'https://g.page/r/…/review', 'In your Google Business Profile, tap “Ask for reviews” and copy the link.']] },
    book: { icon: 'book', line: 'Book your next visit.', tag: 'booking', fields: [['url', 'Your booking page', 'https://yourbusiness.com/book']] },
    wifi: { icon: 'wifi', line: 'Scan to join our Wi-Fi.', fields: [['ssid', 'Network name', 'Guest'], ['pass', 'Password', ''], ['sec', 'Security', 'WPA']] },
    contact: { icon: 'contact', line: 'Save our details.', fields: [['cname', 'Name on the card', 'Your business'], ['phone', 'Phone (optional)', ''], ['email', 'Email (optional)', ''], ['web', 'Website (optional)', '']] },
    link: { icon: 'link', line: 'See the menu.', tag: 'menu', fields: [['url', 'The link', 'https://yourbusiness.com/menu']] },
  };
  const SIZE = { sign: { w: 850, h: 1100, place: 'front-desk' }, card: { w: 400, h: 600, place: 'table' }, sticker: { w: 300, h: 300, place: 'sticker' } };

  /* The shield, from the sigil: what you guard sets the chief, the category sets the base. */
  const CHIEF = { trust: 'M70 70H330', craft: 'M70 62Q200 96 330 62', care: 'M70 84Q200 46 330 84', heritage: 'M70 76L112 76L122 66L200 54L278 66L288 76L330 76',
    discretion: 'M70 66 Q102.5 86 135 66 Q167.5 86 200 66 Q232.5 86 265 66 Q297.5 86 330 66', precision: 'M70 74 L91.7 62 L113.3 74 L135.0 62 L156.7 74 L178.3 62 L200.0 74 L221.7 62 L243.3 74 L265.0 62 L286.7 74 L308.3 62 L330.0 74', hospitality: 'M70 76 H83 V62 H109 V76 H135 V62 H161 V76 H187 V62 H213 V76 H239 V62 H265 V76 H291 V62 H317 V76 H330', renewal: 'M70 70 Q86.25 60 102.5 70 T135 70 T167.5 70 T200 70 T232.5 70 T265 70 T297.5 70 T330 70' };
  const BASE = {
    clinic: 'V230C330 330 268 388 200 424C132 388 70 330 70 230Z', dental: 'V300A130 124 0 0 1 70 300Z', medspa: 'V232C330 352 236 366 200 424C164 366 70 352 70 232Z',
    law: 'V364Q330 392 302 392H230Q208 392 200 420Q192 392 170 392H98Q70 392 70 364Z', spirits: 'V410L200 374L70 410Z',
    food: 'V330Q330 398 266 398Q206 398 200 424Q194 398 134 398Q70 398 70 330Z', other: 'V200L200 424L70 200Z',
  };
  // Map a shield path into sign space: scale about (cx, cy) by s, then scale by k and move by (ox, oy).
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

  /* The KNGHT cipher: five marks per letter, a dot for 0 and a dash for 1, walked along a path. */
  const NS = 'http://www.w3.org/2000/svg';
  const ruler = document.createElementNS(NS, 'svg'); ruler.setAttribute('width', '0'); ruler.setAttribute('height', '0'); ruler.style.position = 'absolute'; ruler.setAttribute('aria-hidden', 'true');
  const rp = document.createElementNS(NS, 'path'); ruler.appendChild(rp); document.body.appendChild(ruler);
  const cipher = (name, d, dash, sw) => {
    const letters = (name.toUpperCase().match(/[A-Z0-9]/g) || []).slice(0, 28);
    if (!letters.length) return '';
    rp.setAttribute('d', d);
    const L = rp.getTotalLength(), step = L / (letters.length * 7);
    let out = '';
    letters.forEach((ch, k) => {
      const v = /[0-9]/.test(ch) ? 27 + (+ch % 5) : ch.charCodeAt(0) - 64;
      for (let b = 0; b < 5; b++) {
        const at = (k * 7 + b + 1) * step, p = rp.getPointAtLength(at), q = rp.getPointAtLength(Math.min(L, at + 0.5));
        if ((v >> (4 - b)) & 1) { const a = Math.atan2(q.y - p.y, q.x - p.x), dx = Math.cos(a) * dash, dy = Math.sin(a) * dash; out += `M${(p.x - dx).toFixed(1)} ${(p.y - dy).toFixed(1)}L${(p.x + dx).toFixed(1)} ${(p.y + dy).toFixed(1)}`; }
        else out += `M${p.x.toFixed(1)} ${p.y.toFixed(1)}h.01`;
      }
    });
    return `<path class="hb-c" d="${out}" stroke-width="${sw}" stroke-linecap="round" fill="none"/>`;
  };

  /* The code: plain, black on white, with its quiet zone, one row per path so it can be stamped in row by row. */
  const qrSvg = (data, x, y, size) => {
    let q = window.qrcode(0, 'Q'); q.addData(data); q.make();
    if (q.getModuleCount() > 57) { q = window.qrcode(0, 'M'); q.addData(data); q.make(); }
    const n = q.getModuleCount(), quiet = 4, m = size / (n + quiet * 2);
    let rows = '';
    for (let r = 0; r < n; r++) {
      let d = '';
      for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${(x + (c + quiet) * m).toFixed(2)} ${(y + (r + quiet) * m).toFixed(2)}h${m.toFixed(2)}v${m.toFixed(2)}h-${m.toFixed(2)}z`;
      if (d) rows += `<path class="hb-r" style="--r:${r}" d="${d}"/>`;
    }
    return `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${(m * 1.5).toFixed(1)}" fill="#fff"/><g fill="#000" shape-rendering="crispEdges">${rows}</g>`;
  };

  /* State */
  const st = { purpose: 'review', size: 'sign', paper: 'black', lineEdited: false, vals: {} };
  try { const s = JSON.parse(localStorage.getItem('knght-herald') || 'null'); if (s) Object.assign(st, s, { vals: Object.assign({}, s.vals, { pass: '' }) }); } catch (e) {}
  try { const c = localStorage.getItem('knght-cat'); if (c && !st.cat) form.cat.value = c === 'coffee' ? 'food' : c; } catch (e) {}
  if (st.cat) form.cat.value = st.cat; if (st.guard) form.guard.value = st.guard; if (st.name) form.name.value = st.name;
  const save = () => { try { localStorage.setItem('knght-herald', JSON.stringify({ purpose: st.purpose, size: st.size, paper: st.paper, lineEdited: st.lineEdited, line: form.line.value, name: form.name.value, cat: form.cat.value, guard: form.guard.value, vals: Object.assign({}, st.vals, { pass: '' }) })); } catch (e) {} };

  const renderFields = () => {
    const P = PURPOSE[st.purpose];
    fieldsEl.innerHTML = P.fields.map(([k, label, ph, hint]) => k === 'sec'
      ? `<label class="rp__field"><span>${label}</span><select class="hb__select" data-k="sec"><option value="WPA">WPA or WPA2 (most networks)</option><option value="WEP">WEP</option><option value="nopass">No password</option></select></label>`
      : `<label class="rp__field"><span>${label}</span><input type="${k === 'email' ? 'email' : k === 'url' || k === 'web' ? 'url' : 'text'}" data-k="${k}" placeholder="${esc(ph)}" value="${esc(st.vals[k] || '')}" autocomplete="off" spellcheck="false">${hint ? `<em class="hb__hint">${hint}</em>` : ''}</label>`).join('');
    const sec = $('[data-k="sec"]', fieldsEl); if (sec) sec.value = st.vals.sec || 'WPA';
    tagRow.hidden = !P.tag;
    if (!st.lineEdited) form.line.value = P.line;
  };

  /* What goes in the code */
  const url = (v) => { v = (v || '').trim(); if (!v) return ''; if (!/^https?:\/\//i.test(v)) v = 'https://' + v; try { return new URL(v).href; } catch (e) { return ''; } };
  const wifiEsc = (s) => s.replace(/([\\;,:"])/g, '\\$1');
  const payload = () => {
    const v = st.vals;
    if (st.purpose === 'wifi') { if (!v.ssid) return ''; const sec = v.sec || 'WPA'; return `WIFI:T:${sec};S:${wifiEsc(v.ssid)};${sec === 'nopass' ? '' : `P:${wifiEsc(v.pass || '')};`};`; }
    if (st.purpose === 'contact') {
      const name = (v.cname || form.name.value || '').trim(); if (!name) return '';
      return ['BEGIN:VCARD', 'VERSION:3.0', `FN:${name}`, `ORG:${(form.name.value || name).trim()}`, v.phone && `TEL;TYPE=WORK:${v.phone.trim()}`, v.email && `EMAIL:${v.email.trim()}`, v.web && `URL:${url(v.web)}`, 'END:VCARD'].filter(Boolean).join('\n');
    }
    let u = url(v.url); if (!u) return '';
    if (PURPOSE[st.purpose].tag && tagBox.checked) { const x = new URL(u); x.searchParams.set('utm_source', 'qr'); x.searchParams.set('utm_medium', 'print'); x.searchParams.set('utm_campaign', `${PURPOSE[st.purpose].tag}-${SIZE[st.size].place}`); u = x.href; }
    return u;
  };
  // The words under the code, for anyone who can't scan.
  const fallback = () => {
    const v = st.vals;
    if (st.purpose === 'wifi') return v.ssid ? `Network: ${v.ssid}${(v.sec || 'WPA') !== 'nopass' && v.pass ? `  ·  Password: ${v.pass}` : ''}` : '';
    if (st.purpose === 'contact') return 'Or ask us at the desk.';
    const u = url(v.url); if (!u) return '';
    const x = new URL(u); let s = x.hostname.replace(/^www\./, '') + (x.pathname !== '/' ? x.pathname.replace(/\/$/, '') : '');
    return s.length > 38 ? 'Or ask us at the desk.' : s;
  };

  /* The sign */
  const build = (data) => {
    const S = SIZE[st.size], W = S.w, H = S.h, dark = st.paper === 'black';
    const bg = dark ? '#000' : '#fff', ink = dark ? '#fff' : '#000';
    const name = (form.name.value || '').trim(), line = (form.line.value || '').trim(), fb = fallback();
    const icon = ICON[PURPOSE[st.purpose].icon];
    const oath = 'DIRECT LINK · NO REDIRECT · NEVER EXPIRES';
    let body = '', qrIn = 0;
    if (st.size === 'sticker') {
      // A wax seal: the name around the top, the cipher around the rim, the code in the middle.
      const cx = 150, cy = 150, r = 140, side = 132; qrIn = side / 100;
      const ring = (rr) => `M${cx - rr} ${cy}A${rr} ${rr} 0 1 1 ${cx + rr} ${cy}A${rr} ${rr} 0 1 1 ${cx - rr} ${cy}`;
      body += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${bg}" stroke="${ink}" stroke-width="2.4" class="hb-d" pathLength="1"/>`
        + `<circle cx="${cx}" cy="${cy}" r="${r - 18}" fill="none" stroke="${ink}" stroke-width=".8" opacity=".6" class="hb-d" pathLength="1"/>`
        + `<g stroke="${ink}">${cipher(name || 'KNGHT', ring(r - 9), 2.2, 1.4)}</g>`
        + `<path id="hb-arc" d="M${cx - 106} ${cy}A106 106 0 0 1 ${cx + 106} ${cy}" fill="none"/>`
        + (name ? `<text fill="${ink}" font-family="${SERIF}" font-size="15" letter-spacing="2.6"><textPath href="#hb-arc" startOffset="50%" text-anchor="middle">${esc(name.toUpperCase())}</textPath></text>` : '')
        + qrSvg(data, cx - side / 2, cy - side / 2 + 4, side)
        + `<path id="hb-arc2" d="M${cx - 114} ${cy}A114 114 0 0 0 ${cx + 114} ${cy}" fill="none"/>`
        + `<text fill="${ink}" font-family="${SANS}" font-size="8.5" letter-spacing="1.6" opacity=".75"><textPath href="#hb-arc2" startOffset="50%" text-anchor="middle">${esc((line || '').toUpperCase())}</textPath></text>`;
    } else {
      // A sign: the name, the shield with the code on its plate, the seal of its purpose, the line, the words, the oath.
      const pad = W * 0.06, nameY = pad + W * 0.04, top = nameY + W * 0.035, foot = W * (st.size === 'sign' ? 0.24 : 0.28);
      const sw = Math.min(W * 0.7, (H - top - foot) * 260 / 380), k = sw / 260, ox = W / 2 - 200 * k, oy = top - 46 * k;
      const shield = CHIEF[form.guard.value] + BASE[form.cat.value];
      const qx = ox + 115 * k, qy = oy + 92 * k, qs = 170 * k; qrIn = qs / 100;
      const ic = 44 * k, icY = oy + 276 * k;
      const by = oy + 432 * k;
      body += `<rect x="${pad / 2}" y="${pad / 2}" width="${W - pad}" height="${H - pad}" fill="none" stroke="${ink}" stroke-width="${W * 0.002}" opacity=".5" class="hb-d" pathLength="1"/>`
        + (name ? `<text x="${W / 2}" y="${nameY}" text-anchor="middle" fill="${ink}" font-family="${SERIF}" font-size="${W * 0.03}" letter-spacing="${W * 0.008}">${esc(name.toUpperCase())}</text>` : '')
        + `<path d="${xf(shield, k, ox, oy)}" fill="none" stroke="${ink}" stroke-width="${2.2 * k}" stroke-linejoin="round" class="hb-d" pathLength="1"/>`
        + `<path d="${xf(shield, k, ox, oy, 0.91)}" fill="none" stroke="${ink}" stroke-width="${0.9 * k}" opacity=".6" stroke-linejoin="round" class="hb-d" pathLength="1"/>`
        + `<g stroke="${ink}">${cipher(name || 'KNGHT', xf(shield, k, ox, oy, 0.955), 2.6 * k, 1.5 * k)}</g>`
        + qrSvg(data, qx, qy, qs)
        + `<g transform="translate(${W / 2 - ic / 2} ${icY}) scale(${ic / 24})" fill="none" stroke="${ink}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="hb-i">${icon}</g>`
        + `<text x="${W / 2}" y="${by + W * 0.045}" text-anchor="middle" fill="${ink}" font-family="${SERIF}" font-style="italic" font-size="${W * 0.058}">${esc(line)}</text>`
        + (fb ? `<text x="${W / 2}" y="${by + W * 0.1}" text-anchor="middle" fill="${ink}" font-family="${SANS}" font-size="${W * 0.024}" letter-spacing="${W * 0.001}">${esc(fb)}</text>` : '')
        + `<text x="${W / 2}" y="${H - pad / 2 - W * 0.022}" text-anchor="middle" fill="${ink}" opacity=".6" font-family="${SANS}" font-size="${W * 0.014}" letter-spacing="${W * 0.003}">${oath}</text>`;
    }
    return { svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(`${line} ${fb}`)}"><rect width="${W}" height="${H}" fill="${st.size === 'sticker' ? 'none' : bg}"/>${body}</svg>`, W, H, qrIn };
  };

  /* Raster, PDF */
  const toCanvas = (svg, W, H, dpi) => new Promise((resolve, reject) => {
    const img = new Image(), u = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    img.onload = () => { const c = document.createElement('canvas'); c.width = Math.round(W / 100 * dpi); c.height = Math.round(H / 100 * dpi); const x = c.getContext('2d'); if (st.size === 'sticker') { x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); } x.drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(u); resolve(c); };
    img.onerror = reject; img.src = u;
  });
  // One page, one image: a minimal PDF at the sign's real size.
  const pdf = async (canvas, wIn, hIn) => {
    const jpg = new Uint8Array(await (await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.95))).arrayBuffer());
    const enc = new TextEncoder(), W = (wIn * 72).toFixed(2), H = (hIn * 72).toFixed(2);
    const content = `q ${W} 0 0 ${H} 0 0 cm /Im0 Do Q`;
    const objs = [
      '<< /Type /Catalog /Pages 2 0 R >>',
      '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`,
      null,
      `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    ];
    const parts = [enc.encode('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n')]; const offs = []; let len = parts[0].length;
    objs.forEach((o, i) => {
      offs.push(len);
      if (o === null) {
        const head = enc.encode(`${i + 1} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>\nstream\n`);
        const tail = enc.encode('\nendstream\nendobj\n'); parts.push(head, jpg, tail); len += head.length + jpg.length + tail.length;
      } else { const b = enc.encode(`${i + 1} 0 obj\n${o}\nendobj\n`); parts.push(b); len += b.length; }
    });
    const xref = `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offs.map((o) => String(o).padStart(10, '0') + ' 00000 n \n').join('')}trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${len}\n%%EOF\n`;
    parts.push(enc.encode(xref));
    return new Blob(parts, { type: 'application/pdf' });
  };
  const saveFile = (blob, name) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 3000); };
  const slug = () => ((form.name.value || 'sign').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'sign') + '-' + st.purpose;

  /* Reading codes back: the browser's own reader where there is one, jsQR everywhere else. */
  let jsqr = null;
  const loadJsQR = () => jsqr || (jsqr = new Promise((resolve, reject) => { if (window.jsQR) return resolve(window.jsQR); const s = document.createElement('script'); s.src = '/assets/js/vendor/jsqr-1.4.0.js'; s.onload = () => resolve(window.jsQR); s.onerror = () => { jsqr = null; reject(new Error('jsqr')); }; document.head.appendChild(s); }));
  const readCanvas = async (c) => {
    if ('BarcodeDetector' in window) { try { const r = await new window.BarcodeDetector({ formats: ['qr_code'] }).detect(c); if (r[0]) return { text: r[0].rawValue, corners: r[0].cornerPoints }; } catch (e) {} }
    const J = await loadJsQR(); const x = c.getContext('2d', { willReadFrequently: true }); const im = x.getImageData(0, 0, c.width, c.height);
    const r = J(im.data, c.width, c.height, { inversionAttempts: 'dontInvert' });
    return r ? { text: r.data, corners: [r.location.topLeftCorner, r.location.topRightCorner, r.location.bottomRightCorner, r.location.bottomLeftCorner] } : null;
  };

  /* Draw, verify, measure */
  let current = null, verifyT = 0;
  const show = (k) => { if (!k) return ''; const short = k.replace(/^https?:\/\/(www\.)?/, ''); return short.length > 60 ? short.slice(0, 58) + '…' : short; };
  const update = (animate) => {
    save();
    const data = payload();
    const P = PURPOSE[st.purpose];
    if (!data) {
      stage.innerHTML = `<p class="hb__empty">${st.purpose === 'wifi' ? 'Add your network name.' : st.purpose === 'contact' ? 'Add the name for the card.' : 'Add your link and the sign appears here.'}</p>`;
      verdict.textContent = ''; rangeEl.innerHTML = ''; payloadEl.textContent = ''; current = null; return;
    }
    const b = build(data); current = { ...b, data };
    stage.className = `hb__stage is-${st.size}${animate && !reduce ? ' is-forging' : ''}`;
    stage.innerHTML = b.svg;
    // How far away it reads: about ten times the code's width.
    const cm = b.qrIn * 2.54, reach = cm * 10, rTxt = reach >= 100 ? `${(reach / 100).toFixed(1)} m` : `${Math.round(reach)} cm`;
    rangeEl.innerHTML = `<svg viewBox="0 0 320 70" class="hb__beam" aria-hidden="true"><rect x="4" y="22" width="16" height="28" rx="3" class="hb__ph"/><path d="M22 36L290 14V58Z" class="hb__cone"/><path d="M22 36H290" class="hb__axis"/><rect x="292" y="18" width="22" height="36" class="hb__sg"/></svg><p><b>Reads from about ${rTxt} away.</b> The code prints ${cm.toFixed(1)} cm wide${st.size === 'sticker' ? ', right for a counter or a door' : st.size === 'card' ? ', right for a table' : ', right for a desk or a wall'}.</p>`;
    payloadEl.innerHTML = `<span>In the code</span>${esc(show(st.purpose === 'contact' ? `Contact card: ${(st.vals.cname || form.name.value).trim()}` : st.purpose === 'wifi' ? `Wi-Fi: ${st.vals.ssid}` : data))}`;
    verdict.className = 'hb__verdict'; verdict.textContent = 'Testing the seal…';
    clearTimeout(verifyT);
    verifyT = setTimeout(async () => {
      try {
        const c = await toCanvas(b.svg, b.W, b.H, 150);
        const r = await readCanvas(c);
        const ok = r && r.text === data;
        verdict.className = 'hb__verdict ' + (ok ? 'is-ok' : 'is-bad');
        verdict.textContent = ok ? 'Seal holds. It reads back exactly.' : 'This one did not read back. Try a shorter link.';
      } catch (e) { verdict.className = 'hb__verdict'; verdict.textContent = ''; }
    }, animate ? 900 : 350);
  };

  /* Wiring */
  const press = (attr, val) => form.querySelectorAll(`[${attr}]`).forEach((b) => b.setAttribute('aria-pressed', String(b.getAttribute(attr) === val)));
  form.querySelectorAll('[data-hb-purpose]').forEach((b) => b.addEventListener('click', () => { st.purpose = b.dataset.hbPurpose; st.lineEdited = false; press('data-hb-purpose', st.purpose); renderFields(); update(true); }));
  form.querySelectorAll('[data-hb-size]').forEach((b) => b.addEventListener('click', () => { st.size = b.dataset.hbSize; press('data-hb-size', st.size); update(true); }));
  form.querySelectorAll('[data-hb-paper]').forEach((b) => b.addEventListener('click', () => { st.paper = b.dataset.hbPaper; press('data-hb-paper', st.paper); update(false); }));
  form.line.addEventListener('input', () => { st.lineEdited = true; });
  let typeT = 0;
  form.addEventListener('input', (e) => { if (e.target.dataset.k) st.vals[e.target.dataset.k] = e.target.value; clearTimeout(typeT); typeT = setTimeout(() => update(false), 250); });
  form.addEventListener('change', (e) => { if (e.target.dataset.k) st.vals[e.target.dataset.k] = e.target.value; if (e.target.tagName === 'SELECT' && !e.target.dataset.k) update(true); else update(false); });
  form.addEventListener('submit', (e) => e.preventDefault());

  $('[data-hb-pdf]').addEventListener('click', async () => {
    if (!current) return;
    const S = SIZE[st.size], c = await toCanvas(current.svg, current.W, current.H, 300);
    saveFile(await pdf(c, S.w / 100, S.h / 100), `${slug()}-${st.size}.pdf`);
    track('herald_download', { purpose: st.purpose, size: st.size, format: 'pdf' });
  });
  $('[data-hb-png]').addEventListener('click', async () => {
    if (!current) return;
    const c = await toCanvas(current.svg, current.W, current.H, 300);
    c.toBlob((b) => saveFile(b, `${slug()}-${st.size}.png`), 'image/png');
    track('herald_download', { purpose: st.purpose, size: st.size, format: 'png' });
  });

  /* Test the seal: the camera finds the printed code and locks on to it. */
  const cam = document.body.appendChild($('[data-hb-cam]')), // at the top level, so no transformed parent can trap it
    _c = 0, view = $('[data-hb-cam-view]'), camStatus = $('[data-hb-cam-status]');
  let stream = null, raf = 0, lock = null, busy = false, lastRead = 0;
  const stopCam = () => { cancelAnimationFrame(raf); if (stream) stream.getTracks().forEach((t) => t.stop()); stream = null; cam.hidden = true; document.documentElement.style.overflow = ''; };
  $('[data-hb-cam-close]').addEventListener('click', stopCam);
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !cam.hidden) stopCam(); });
  $('[data-hb-test]').addEventListener('click', async () => {
    if (!current) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { verdict.textContent = 'This browser cannot use the camera. The seal was already tested on screen.'; return; }
    try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false }); }
    catch (e) { verdict.textContent = 'The camera was not allowed. The seal was already tested on screen.'; return; }
    loadJsQR().catch(() => {});
    cam.hidden = false; document.documentElement.style.overflow = 'hidden'; lock = null;
    camStatus.textContent = 'Point your camera at the printed sign.';
    const video = document.createElement('video'); video.muted = true; video.playsInline = true; video.srcObject = stream; await video.play();
    const x = view.getContext('2d', { willReadFrequently: true });
    const probe = document.createElement('canvas');
    const want = current.data;
    track('herald_test', { purpose: st.purpose });
    const loop = async (t) => {
      raf = requestAnimationFrame(loop);
      if (!video.videoWidth) return;
      if (view.width !== video.videoWidth) { view.width = video.videoWidth; view.height = video.videoHeight; }
      x.drawImage(video, 0, 0);
      // The lock: brackets glide onto the code's corners.
      if (lock) {
        lock.cur = lock.cur ? lock.cur.map((p, i) => ({ x: p.x + (lock.to[i].x - p.x) * 0.3, y: p.y + (lock.to[i].y - p.y) * 0.3 })) : lock.to.map((p) => ({ x: view.width / 2 + (p.x - view.width / 2) * 1.6, y: view.height / 2 + (p.y - view.height / 2) * 1.6 }));
        const fresh = t - lock.at < 700;
        x.save(); const lw = Math.max(3, view.width / 200); x.lineCap = 'square';
        const c = lock.cur, L = Math.hypot(c[1].x - c[0].x, c[1].y - c[0].y) * 0.22;
        c.forEach((p, i) => { const a = c[(i + 1) % 4], b2 = c[(i + 3) % 4]; const u = (q) => { const d = Math.hypot(q.x - p.x, q.y - p.y) || 1; return { x: p.x + (q.x - p.x) / d * L, y: p.y + (q.y - p.y) / d * L }; }; const A = u(a), B = u(b2); x.beginPath(); x.moveTo(A.x, A.y); x.lineTo(p.x, p.y); x.lineTo(B.x, B.y); x.shadowBlur = 0; x.strokeStyle = 'rgba(0,0,0,.7)'; x.lineWidth = lw * 2.4; x.stroke(); x.strokeStyle = fresh ? '#fff' : 'rgba(255,255,255,.5)'; x.shadowColor = '#fff'; x.shadowBlur = fresh ? 16 : 0; x.lineWidth = lw; x.stroke(); });
        x.restore();
      }
      if (busy || t - lastRead < 120) return;
      busy = true; lastRead = t;
      try {
        const scale = Math.min(1, 640 / video.videoWidth); probe.width = Math.round(video.videoWidth * scale); probe.height = Math.round(video.videoHeight * scale);
        probe.getContext('2d', { willReadFrequently: true }).drawImage(video, 0, 0, probe.width, probe.height);
        const r = await readCanvas(probe);
        if (r) {
          // Frame the code from just outside its corners, so the brackets sit on the sign, not on the code.
          const pts = r.corners.map((p) => ({ x: p.x / scale, y: p.y / scale })), mx = pts.reduce((a, p) => a + p.x, 0) / 4, my = pts.reduce((a, p) => a + p.y, 0) / 4;
          lock = Object.assign(lock || {}, { to: pts.map((p) => ({ x: mx + (p.x - mx) * 1.22, y: my + (p.y - my) * 1.22 })), at: t });
          const ok = r.text === want;
          camStatus.innerHTML = ok ? `<b>Seal holds.</b> Leads to ${esc(show(st.purpose === 'wifi' ? `Wi-Fi: ${st.vals.ssid}` : st.purpose === 'contact' ? 'your contact card' : want))}` : `<b>A different code.</b> It reads ${esc(show(r.text))}`;
        }
      } catch (e) {}
      busy = false;
    };
    raf = requestAnimationFrame(loop);
  });

  // Start
  press('data-hb-purpose', st.purpose); press('data-hb-size', st.size); press('data-hb-paper', st.paper);
  renderFields(); if (st.lineEdited && st.line) form.line.value = st.line;
  update(false);
})();
