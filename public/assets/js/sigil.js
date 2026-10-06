/* KNGHT: forge your sigil. A black and white crest drawn from a name, a category and a virtue. Nothing leaves the browser. */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const form = $('[data-sigil-form]');
  const stage = $('[data-sigil-stage]');
  if (!form || !stage) return;

  /* Charges on a 24 grid, drawn as line art */
  const CHARGE = {
    clinic: '<path d="M12 2v20"/><path d="M12 5c-3.2 0-3.2 3 0 3s3.2 3 0 3-3.2 3 0 3 3.2 3 0 3"/><path d="M10.6 2.6h2.8"/>',
    medspa: '<path d="M12 3c3 4.5 6 8 6 11.5a6 6 0 0 1-12 0C6 11 9 7.5 12 3z"/><path d="M9.4 14.6A2.6 2.6 0 0 0 12 17.2"/>',
    law: '<path d="M12 3v18M7.5 21h9M4 6.5h16"/><path d="M6.5 6.5L3.5 13h6zM17.5 6.5l-3 6.5h6z"/><path d="M3.5 13a3 2 0 0 0 6 0M14.5 13a3 2 0 0 0 6 0"/>',
    spirits: '<path d="M7.2 3h9.6c1.6 3 1.6 15 0 18H7.2C5.6 18 5.6 6 7.2 3z"/><path d="M6.1 8h11.8M6.1 16h11.8M12 3v18"/>',
    dental: '<path d="M7.2 3.6C4.6 3.6 3.6 5.8 4.1 8.6c.4 2.2 1.4 3.6 1.8 6 .5 3 .9 5.9 2.4 5.9s1.6-3.2 2.2-5.3c.4-1.3.9-1.7 1.5-1.7s1.1.4 1.5 1.7c.6 2.1.7 5.3 2.2 5.3s1.9-2.9 2.4-5.9c.4-2.4 1.4-3.8 1.8-6 .5-2.8-.5-5-3.1-5-2 0-2.9 1.2-4.8 1.2S9.2 3.6 7.2 3.6z"/>',
    food: '<path d="M12 22V5"/><path d="M12 6c-2-1-3-3-2-4 2 0 3 2 2 4zM12 6c2-1 3-3 2-4-2 0-3 2-2 4zM12 11c-2.5-.5-4-2.5-3.5-4 2 0 3.5 2 3.5 4zM12 11c2.5-.5 4-2.5 3.5-4-2 0-3.5 2-3.5 4zM12 16c-2.5-.5-4-2.5-3.5-4 2 0 3.5 2 3.5 4zM12 16c2.5-.5 4-2.5 3.5-4-2 0-3.5 2-3.5 4z"/>',
    other: '<path d="M7 19.4Q5.6 18.9 4.9 17.4Q5.8 17.5 6.4 16.8Q5 16 4.7 14.2Q5.6 14.5 6.3 13.9Q5 12.8 5 10.9Q5.9 11.4 6.6 11Q5.8 9.6 6.1 7.9Q6.9 8.6 7.6 8.4Q7.3 6.8 8.1 5.4Q8.6 6.2 9.5 6.2L10.8 2.4L12.3 4.6C15 5.1 17.5 7.4 18.6 10.6C19 11.8 18.6 13.2 17.3 13.2L15.6 12.7C14.6 12.4 13.8 12.9 13.8 13.9C14 15.9 16 17.4 16.9 19.4ZM5.6 19.4H18.2M4.6 21.5H19.2"/><circle cx="14.6" cy="8.4" r=".6"/>'
  };
  const VIRTUE = {
    trust: { motto: 'FIDES', word: 'Trust', d: '<circle cx="7" cy="12" r="4.2"/><circle cx="7" cy="12" r="1.4"/><path d="M11.2 12H21M17.5 12v3.2M20.5 12v2.4"/>' },
    craft: { motto: 'ARS ET LABOR', word: 'Craft', d: '<path d="M4.5 20.5l9.5-9.5"/><path d="M11 6l4-4 6.5 6.5-4 4z"/><path d="M13 8l3 3"/>' },
    care: { motto: 'CURA', word: 'Care', d: '<path d="M9 4h6M10.5 4V2.5h3V4"/><path d="M7.5 7h9v11h-9z"/><path d="M7.5 7l1.5-3h6l1.5 3M12 10v5M6 21h12"/>' },
    heritage: { motto: 'MEMORIA', word: 'Heritage', d: '<path d="M4.5 21V9.5h2.5V6.5h2.5v3h1.5v-3h2v3h1.5v-3h2.5v3h2.5V21z"/><path d="M10 21v-4.5a2 2 0 0 1 4 0V21"/>' }
  };
  /* The shield is built from both choices: what you guard sets the chief (the top edge),
     the category sets the base. Four chiefs by seven bases: 28 shields, so two businesses
     that guard different things never share an outline. */
  const CHIEF = {
    trust: { n: 'a straight chief', d: 'M70 70H330' },
    craft: { n: 'a dished chief', d: 'M70 62Q200 96 330 62' },
    care: { n: 'an arched chief', d: 'M70 84Q200 46 330 84' },
    heritage: { n: 'a peaked chief', d: 'M70 76L112 76L122 66L200 54L278 66L288 76L330 76' },
  };
  const BASE = {
    clinic: { n: 'Heater', d: 'V230C330 330 268 388 200 424C132 388 70 330 70 230Z' },
    dental: { n: 'Spanish', d: 'V300A130 124 0 0 1 70 300Z' },
    medspa: { n: 'Accolade', d: 'V232C330 352 236 366 200 424C164 366 70 352 70 232Z' },
    law: { n: 'French', d: 'V364Q330 392 302 392H230Q208 392 200 420Q192 392 170 392H98Q70 392 70 364Z' },
    spirits: { n: 'Swallowtail', d: 'V410L200 374L70 410Z' },
    food: { n: 'Iberian', d: 'V330Q330 398 266 398Q206 398 200 424Q194 398 134 398Q70 398 70 330Z' },
    other: { n: 'Kite', d: 'V200L200 424L70 200Z' },
  };
  const shieldFor = (cat, virtue) => {
    const c = CHIEF[virtue] || CHIEF.trust, b = BASE[cat] || BASE.other;
    return { d: c.d + b.d, n: `${b.n} shield with ${c.n}` };
  };
  const DIVISIONS = [
    { n: 'Plain', d: '' },
    { n: 'Per pale', d: 'M200 0H400V560H200Z' },
    { n: 'Per fess', d: 'M0 230H400V560H0Z' },
    { n: 'Per bend', d: 'M0 70L400 470V560H0Z' },
    { n: 'Chevron', d: 'M40 340L200 190L360 340V384L200 234L40 384Z' },
    { n: 'Quartered', d: 'M200 0H400V230H200ZM0 230H200V560H0Z' }
  ];
  const hash = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const esc = (t) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* Tinctures in black and white: heraldry's own hatching code (Petra Sancta).
     Dots are gold, vertical lines red, horizontal blue, bend lines green, sinister lines purple, crosshatch black. */
  const TINCT = {
    argent: { n: 'argent', p: '' },
    or: { n: 'or', p: '<circle cx="3" cy="3" r=".85" fill="#fff"/>' },
    gules: { n: 'gules', p: '<path d="M3 0V6"/>' },
    azure: { n: 'azure', p: '<path d="M0 3H6"/>' },
    vert: { n: 'vert', p: '<path d="M0 6L6 0M-1.5 1.5L1.5-1.5M4.5 7.5L7.5 4.5"/>' },
    purpure: { n: 'purpure', p: '<path d="M0 0L6 6M4.5-1.5L7.5 1.5M-1.5 4.5L1.5 7.5"/>' },
    sable: { n: 'sable', p: '<path d="M3 0V6M0 3H6"/>' },
  };
  const FIELDS = ['argent', 'argent', 'or', 'azure', 'gules', 'vert', 'purpure', 'sable'];
  const pattern = (id, t) => `<pattern id="${id}" width="6" height="6" patternUnits="userSpaceOnUse"><g stroke="#fff" stroke-width=".8" opacity=".42">${TINCT[t].p}</g></pattern>`;

  /* The name cipher: every letter of the name becomes five marks, a dot for 0 and a dash for 1, set around the inner border. */
  const SVGNS = 'http://www.w3.org/2000/svg';
  const ruler = document.createElementNS(SVGNS, 'svg');
  ruler.setAttribute('width', '0'); ruler.setAttribute('height', '0'); ruler.style.position = 'absolute'; ruler.setAttribute('aria-hidden', 'true');
  const rulerPath = document.createElementNS(SVGNS, 'path');
  ruler.appendChild(rulerPath); document.body.appendChild(ruler);
  const cipher = (name, d) => {
    const letters = (name.toUpperCase().match(/[A-Z0-9]/g) || []).slice(0, 28);
    if (!letters.length) return '';
    rulerPath.setAttribute('d', d);
    rulerPath.setAttribute('transform', '');
    const L = rulerPath.getTotalLength();
    const units = letters.length * 7;
    const step = L / units;
    let out = '';
    letters.forEach((ch, k) => {
      const v = /[0-9]/.test(ch) ? 27 + (+ch % 5) : ch.charCodeAt(0) - 64;
      for (let b = 0; b < 5; b++) {
        const bit = (v >> (4 - b)) & 1;
        const at = (k * 7 + b + 1) * step;
        const p = rulerPath.getPointAtLength(at), q = rulerPath.getPointAtLength(Math.min(L, at + 0.5));
        const a = Math.atan2(q.y - p.y, q.x - p.x);
        if (bit) {
          const dx = Math.cos(a) * 2.6, dy = Math.sin(a) * 2.6;
          out += `M${(p.x - dx).toFixed(1)} ${(p.y - dy).toFixed(1)}L${(p.x + dx).toFixed(1)} ${(p.y + dy).toFixed(1)}`;
        } else {
          out += `M${p.x.toFixed(1)} ${p.y.toFixed(1)}h.01`;
        }
      }
    });
    return `<path d="${out}" stroke-width="1.5" stroke-linecap="round"/>`;
  };
  // The inner border, as real coordinates (a scaled copy of the shield), so the cipher can walk it.
    const inset = (d, k) => {
    // Scale every coordinate pair about (200, 214). Arc radii scale too; flags stay.
    const tokens = d.match(/[A-Za-z]|-?\d*\.?\d+/g);
    let out = '', cmd = '', idx = 0, axis = 0;
    const sx = (v) => (200 + (v - 200) * k).toFixed(1), sy = (v) => (214 + (v - 214) * k).toFixed(1);
    tokens.forEach((t) => {
      if (/[A-Za-z]/.test(t)) { cmd = t; idx = 0; out += t; return; }
      const v = parseFloat(t);
      if (cmd === 'H') out += sx(v) + ' ';
      else if (cmd === 'V') out += sy(v) + ' ';
      else if (cmd === 'A') { const n = idx % 7; out += (n < 2 ? (v * k).toFixed(1) : n < 5 ? t : n === 5 ? sx(v) : sy(v)) + ' '; }
      else { out += (idx % 2 === 0 ? sx(v) : sy(v)) + ' '; }
      idx++;
    });
    return out.trim();
  };

  /* Earned heraldry: the seven marks come from the visitor's score on the self-check. */
  const earned = () => { try { const v = JSON.parse(localStorage.getItem('knght-verdict') || 'null'); return v && Array.isArray(v.layers) && v.layers.length === 7 ? v : null; } catch (e) { return null; } };
  const marks = (v) => {
    if (!v) return '';
    const w = 15, x0 = 200 - w * 3;
    return v.layers.map((l, k) => {
      const x = x0 + k * w, y = 330;
      const lz = `M${x} ${y - 5}L${x + 5} ${y}L${x} ${y + 5}L${x - 5} ${y}Z`;
      return l.score >= 10 ? `<path d="${lz}" fill="#fff" stroke-width="1"><title>${esc(l.name)}: held</title></path>`
        : l.score >= 5 ? `<path d="${lz}" fill="#000" stroke-width="1"><title>${esc(l.name)}: partly held</title></path><circle cx="${x}" cy="${y}" r="1.3" fill="#fff" stroke="none"/>`
        : `<path d="${lz}" fill="#000" stroke-width="1" opacity=".55"><title>${esc(l.name)}: not yet held</title></path>`;
    }).join('');
  };

  /* The scannable crest: a seal plate under the motto that any phone camera reads. */
  const site = () => {
    const raw = (form.site && form.site.value || '').trim();
    if (!raw) return '';
    const u = raw.replace(/^https?:\/\//i, '').replace(/\s+/g, '');
    return /^[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?$/i.test(u) ? 'https://' + u : '';
  };
  const qrPlate = (url) => {
    if (!url || typeof window.qrcode !== 'function') return '';
    const q = window.qrcode(0, 'M'); q.addData(url); q.make();
    const n = q.getModuleCount(), size = 96, pad = 4, m = (size - pad * 2) / n, x0 = 152, y0 = 556;
    let d = '';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${(x0 + pad + c * m).toFixed(2)} ${(y0 + pad + r * m).toFixed(2)}h${m.toFixed(2)}v${m.toFixed(2)}h-${m.toFixed(2)}z`;
    return `<rect x="${x0}" y="${y0}" width="${size}" height="${size}" rx="3" fill="#fff" stroke="none"/><path d="${d}" fill="#000" stroke="none"/>`;
  };

  const draw = () => {
    const name = (form.name.value || '').trim().slice(0, 40);
    const cat = form.cat.value || 'other';
    const virtue = VIRTUE[form.virtue.value] || VIRTUE.trust;
    const shield = shieldFor(cat, form.virtue.value);
    const SHIELD = shield.d;
    const h = hash(name.toLowerCase() + '|' + cat);
    const div = DIVISIONS[h % DIVISIONS.length];
    const field = FIELDS[(h >>> 4) % FIELDS.length];
    const pool = Object.keys(TINCT).filter((t) => t !== field && t !== 'argent');
    const second = pool[(h >>> 9) % pool.length];
    const initial = (name.match(/[A-Za-z0-9]/) || ['K'])[0].toUpperCase();
    const label = (name || 'Your business').toUpperCase();
    const fs = label.length > 22 ? 15 : label.length > 14 ? 18 : 21;
    const fit = label.length > 12 ? ' textLength="250" lengthAdjust="spacingAndGlyphs"' : '';
    const v = earned();
    const url = site();
    const H = url ? 664 : 560;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 ${H}" role="img" aria-label="Sigil for ${esc(name || 'your business')}">
  <defs>
    ${pattern('sg-f', field === 'argent' ? 'or' : field)}${pattern('sg-d', div.d ? second : 'or')}
    <clipPath id="sg-clip"><path d="${SHIELD}"/></clipPath>
  </defs>
  <rect width="400" height="${H}" fill="#000"/>
  <g fill="none" stroke="#fff" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="200" cy="36" r="22" stroke-width="1.4"/>
    <text x="200" y="45" text-anchor="middle" fill="#fff" stroke="none" font-family="Cormorant Garamond, Georgia, serif" font-size="26" font-style="italic">${esc(initial)}</text>
    <path d="M178 36H96M222 36H304" stroke-width="1" opacity=".6"/>
    ${field !== 'argent' ? `<path d="${SHIELD}" fill="url(#sg-f)" stroke="none"/>` : ''}
    ${div.d ? `<path d="${div.d}" fill="#000" stroke="none" clip-path="url(#sg-clip)"/><path d="${div.d}" fill="url(#sg-d)" stroke="none" clip-path="url(#sg-clip)"/>` : ''}
    <path d="${SHIELD}" stroke-width="2.2"/>
    <path d="${inset(SHIELD, .91)}" stroke-width="1" opacity=".7"/>
    ${cipher(name, inset(SHIELD, .955))}
    <g transform="translate(128 150) scale(6)"><g stroke="#000" stroke-width="1.9">${CHARGE[cat] || CHARGE.other}</g><g stroke-width=".42">${CHARGE[cat] || CHARGE.other}</g></g>
    <g transform="translate(96 96) scale(1.6)"><g stroke="#000" stroke-width="3.4">${virtue.d}</g><g stroke-width=".9">${virtue.d}</g></g>
    <g transform="translate(266 96) scale(1.6)"><g stroke="#000" stroke-width="3.4">${virtue.d}</g><g stroke-width=".9">${virtue.d}</g></g>
    ${marks(v)}
    <path d="M40 456C80 446 120 470 200 470S320 446 360 456L346 476L360 496C320 486 280 506 200 506S80 486 40 496L54 476Z" fill="#000" stroke-width="1.6"/>
    <text x="200" y="${494 - (21 - fs) / 2}" text-anchor="middle" fill="#fff" stroke="none" font-family="Cormorant Garamond, Georgia, serif" font-size="${fs}" letter-spacing="2"${fit}>${esc(label)}</text>
    <text x="200" y="536" text-anchor="middle" fill="#fff" stroke="none" opacity=".7" font-family="Cormorant Garamond, Georgia, serif" font-size="15" font-style="italic" letter-spacing="2">${virtue.motto}</text>
    ${qrPlate(url)}
  </g>
</svg>`;
    stage.innerHTML = svg;
    const blazon = $('[data-sigil-blazon]');
    if (blazon) {
      const tinct = div.d ? `${TINCT[field].n} and ${TINCT[second].n}, ${div.n.toLowerCase()}` : TINCT[field].n;
      const held = v ? v.layers.filter((l) => l.score >= 10).length : 0;
      blazon.textContent = `${/^[AEIOU]/.test(shield.n) ? 'An' : 'A'} ${shield.n}, ${tinct}, with the ${form.cat.selectedOptions[0].textContent.toLowerCase()} charge and two marks of ${virtue.word.toLowerCase()}. ${name ? 'The border spells your name in the KNGHT cipher. ' : ''}${v ? `Seven marks from your score of ${v.total}/70: ${held} held. ` : ''}${url ? 'The seal plate opens your website. ' : ''}Motto: ${virtue.motto}.`;
    }
    const earn = $('[data-sigil-earn]');
    if (earn) earn.hidden = !!v;
    return svg;
  };

  form.addEventListener('input', draw);

  /* Foil: the crest catches the light like a stamped card, following the cursor, or the phone's tilt. */
  const foil = $('[data-sigil-foil]');
  if (foil && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const set = (fx, fy) => {
      foil.style.setProperty('--fx', (fx * 100).toFixed(1) + '%');
      foil.style.setProperty('--fy', (fy * 100).toFixed(1) + '%');
      foil.style.setProperty('--rx', ((0.5 - fy) * 10).toFixed(2) + 'deg');
      foil.style.setProperty('--ry', ((fx - 0.5) * 12).toFixed(2) + 'deg');
    };
    foil.addEventListener('pointermove', (e) => { const r = foil.getBoundingClientRect(); foil.classList.add('is-lit'); set((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height); });
    foil.addEventListener('pointerleave', () => { foil.classList.remove('is-lit'); set(0.5, 0.5); });
    const tilt = (e) => { if (e.gamma == null) return; foil.classList.add('is-lit'); set(Math.max(0, Math.min(1, 0.5 + e.gamma / 50)), Math.max(0, Math.min(1, 0.5 + (e.beta - 40) / 50))); };
    const tiltBtn = $('[data-sigil-tilt]');
    if ('DeviceOrientationEvent' in window && matchMedia('(pointer: coarse)').matches) {
      if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        if (tiltBtn) { tiltBtn.hidden = false; tiltBtn.addEventListener('click', async () => { try { if (await DeviceOrientationEvent.requestPermission() === 'granted') { addEventListener('deviceorientation', tilt); tiltBtn.hidden = true; } } catch (err) {} }); }
      } else addEventListener('deviceorientation', tilt);
    }
  }
  form.addEventListener('submit', (e) => e.preventDefault());
  draw();

  const slug = () => ((form.name.value || 'sigil').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'sigil');
  const toPng = () => new Promise((resolve, reject) => {
    const svg = draw();
    const img = new Image();
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    img.onload = () => {
      const c = document.createElement('canvas');
      const vbH = +(svg.match(/viewBox="0 0 400 (\d+)"/) || [0, 560])[1];
      c.width = 1080; c.height = vbH > 560 ? 1560 : 1350;
      const x = c.getContext('2d');
      x.fillStyle = '#000'; x.fillRect(0, 0, c.width, c.height);
      const dw = vbH > 560 ? 788 : 772, dh = dw * vbH / 400;
      x.drawImage(img, (1080 - dw) / 2, 60, dw, dh);
      x.fillStyle = 'rgba(255,255,255,.55)';
      x.font = '28px Georgia, serif';
      x.textAlign = 'center';
      x.fillText('Forged at knght.com/sigil', 540, c.height - 50);
      URL.revokeObjectURL(url);
      c.toBlob((b) => (b ? resolve(b) : reject(new Error('png'))), 'image/png');
    };
    img.onerror = reject;
    img.src = url;
  });
  const save = (blob, name) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  const track = (event, extra) => { if (window.KNGHT_TRACK) window.KNGHT_TRACK(event, extra); };

  const pngBtn = $('[data-sigil-png]'), svgBtn = $('[data-sigil-svg]'), shareBtn = $('[data-sigil-share]');
  if (pngBtn) pngBtn.addEventListener('click', async () => { save(await toPng(), `${slug()}-sigil.png`); track('sigil_download', { format: 'png', category: form.cat.value }); });
  if (svgBtn) svgBtn.addEventListener('click', () => { save(new Blob([draw()], { type: 'image/svg+xml' }), `${slug()}-sigil.svg`); track('sigil_download', { format: 'svg', category: form.cat.value }); });
  if (shareBtn) {
    shareBtn.hidden = !navigator.share;
    shareBtn.addEventListener('click', async () => {
      try {
        const file = new File([await toPng()], `${slug()}-sigil.png`, { type: 'image/png' });
        const data = { title: 'My sigil', text: 'Forged at knght.com/sigil', url: 'https://knght.com/sigil/' };
        await navigator.share(navigator.canShare && navigator.canShare({ files: [file] }) ? { ...data, files: [file] } : data);
        track('sigil_share', { category: form.cat.value });
      } catch (err) { /* cancelled */ }
    });
  }

  /* Optional: send the sigil by email when a form endpoint is set */
  const lead = $('[data-sigil-lead]');
  const endpoint = lead && lead.dataset.endpoint;
  if (lead) {
    lead.hidden = !endpoint;
    lead.addEventListener('submit', async (e) => {
      e.preventDefault();
      const status = $('[data-sigil-status]', lead);
      const email = lead.email.value.trim();
      if (!lead.consent.checked || !/^\S+@\S+\.\S+$/.test(email)) { status.textContent = 'Add your email and tick the box.'; return; }
      status.textContent = 'Sending…';
      try {
        const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ _subject: `Sigil request: ${form.name.value || 'unnamed'}`, email, consent: true, source: 'sigil', name: form.name.value, category: form.cat.value, virtue: form.virtue.value }) });
        if (!res.ok) throw new Error(res.status);
        status.textContent = 'Sent. We will email your sigil within one business day.';
        track('sigil_lead', { category: form.cat.value });
      } catch (err) { status.textContent = 'That did not go through. Email sho@knght.com and we will send it.'; }
    });
  }
})();
