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
    heritage: { motto: 'MEMORIA', word: 'Heritage', d: '<path d="M4.5 21V9.5h2.5V6.5h2.5v3h1.5v-3h2v3h1.5v-3h2.5v3h2.5V21z"/><path d="M10 21v-4.5a2 2 0 0 1 4 0V21"/>' },
    discretion: { motto: 'SUB ROSA', word: 'Discretion', d: '<circle cx="12" cy="12" r="2.4"/><path d="M12 4.6c2.7 0 4.2 2.2 3.4 4.5M19.2 9.8c.8 2.6-.6 4.8-3 5.1M16.5 18.3c-2.2 1.5-4.7 1.1-5.8-.9M7.5 18.3c-2.2-1.6-2.7-4.1-1-5.8M4.8 9.8C4 7.2 5.6 5 8 5.1"/>' },
    precision: { motto: 'CERTA MANU', word: 'Precision', d: '<circle cx="12" cy="5.6" r="1.7"/><path d="M12 2.5v1.4M11 7.2L6 21M13 7.2L18 21M8.3 15h7.4"/>' },
    hospitality: { motto: 'SALVE', word: 'Hospitality', d: '<path d="M7 3h10c0 5.2-2.2 8.2-5 8.2S7 8.2 7 3z"/><path d="M12 11.2V18M8 21h8M10 18h4M7.4 6.6h9.2"/>' },
    renewal: { motto: 'RENASCOR', word: 'Renewal', d: '<path d="M3 17h18M6.2 17a5.8 5.8 0 0 1 11.6 0M3 21h18"/><path d="M12 4v3.2M5.4 7.4l2.2 2.2M18.6 7.4l-2.2 2.2M2.5 12.8h2.8M18.7 12.8h2.8"/>' },
  };
  /* The shield is built from both choices: what you guard sets the chief (the top edge),
     the category sets the base. Eight chiefs by seven bases: 56 shields, so two businesses
     that guard different things never share an outline. */
  const CHIEF = {
    trust: { n: 'a straight chief', d: 'M70 70H330' },
    craft: { n: 'a dished chief', d: 'M70 62Q200 96 330 62' },
    care: { n: 'an arched chief', d: 'M70 84Q200 46 330 84' },
    heritage: { n: 'a peaked chief', d: 'M70 76L112 76L122 66L200 54L278 66L288 76L330 76' },
    discretion: { n: 'an engrailed chief', d: 'M70 66 Q102.5 86 135 66 Q167.5 86 200 66 Q232.5 86 265 66 Q297.5 86 330 66' },
    precision: { n: 'an indented chief', d: 'M70 74 L91.7 62 L113.3 74 L135.0 62 L156.7 74 L178.3 62 L200.0 74 L221.7 62 L243.3 74 L265.0 62 L286.7 74 L308.3 62 L330.0 74' },
    hospitality: { n: 'an embattled chief', d: 'M70 76 H83 V62 H109 V76 H135 V62 H161 V76 H187 V62 H213 V76 H239 V62 H265 V76 H291 V62 H317 V76 H330' },
    renewal: { n: 'a wavy chief', d: 'M70 70 Q86.25 60 102.5 70 T135 70 T167.5 70 T200 70 T232.5 70 T265 70 T297.5 70 T330 70' },
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
  let linked = null; // marks carried in by a forge link
  const earned = () => { if (linked) return linked; try { const v = JSON.parse(localStorage.getItem('knght-verdict') || 'null'); return v && Array.isArray(v.layers) && v.layers.length === 7 ? v : null; } catch (e) { return null; } };
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
    const b = Math.round(fs * .34); // drop the baseline so the letters sit centred on the ribbon's middle curve
    const fit = label.length > 12 ? ' textLength="250" lengthAdjust="spacingAndGlyphs"' : '';
    const v = earned();
    const url = site();
    const H = url ? 664 : 560;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 ${H}" role="img" aria-label="Sigil for ${esc(name || 'your business')}">
  <defs>
    ${pattern('sg-f', field === 'argent' ? 'or' : field)}${pattern('sg-d', div.d ? second : 'or')}
    <clipPath id="sg-clip"><path d="${SHIELD}"/></clipPath>
  </defs>
  <rect data-l="bg" width="400" height="${H}" fill="#000"/>
  <g fill="none" stroke="#fff" stroke-linecap="round" stroke-linejoin="round">
    <g data-l="top"><circle cx="200" cy="36" r="22" stroke-width="1.4"/>
    <text x="200" y="45" text-anchor="middle" fill="#fff" stroke="none" font-family="Cormorant Garamond, Georgia, serif" font-size="26" font-style="italic">${esc(initial)}</text>
    <path d="M178 36H96M222 36H304" stroke-width="1" opacity=".6"/></g>
    <g data-l="field">${field !== 'argent' ? `<path d="${SHIELD}" fill="url(#sg-f)" stroke="none"/>` : ''}
    ${div.d ? `<path d="${div.d}" fill="#000" stroke="none" clip-path="url(#sg-clip)"/><path d="${div.d}" fill="url(#sg-d)" stroke="none" clip-path="url(#sg-clip)"/>` : ''}</g>
    <g data-l="frame"><path d="${SHIELD}" stroke-width="2.2"/>
    <path d="${inset(SHIELD, .91)}" stroke-width="1" opacity=".7"/></g>
    <g data-l="cipher">${cipher(name, inset(SHIELD, .955))}</g>
    <g data-l="charge" transform="translate(128 150) scale(6)"><g stroke="#000" stroke-width="1.9">${CHARGE[cat] || CHARGE.other}</g><g stroke-width=".42">${CHARGE[cat] || CHARGE.other}</g></g>
    <g data-l="virtue"><g transform="translate(96 96) scale(1.6)"><g stroke="#000" stroke-width="3.4">${virtue.d}</g><g stroke-width=".9">${virtue.d}</g></g>
    <g transform="translate(266 96) scale(1.6)"><g stroke="#000" stroke-width="3.4">${virtue.d}</g><g stroke-width=".9">${virtue.d}</g></g></g>
    <g data-l="marks">${marks(v)}</g>
    <g data-l="ribbon"><path d="M40 456C80 446 120 470 200 470S320 446 360 456L346 476L360 496C320 486 280 506 200 506S80 486 40 496L54 476Z" fill="#000" stroke-width="1.6"/>
    <path id="sg-band" d="M40 ${476 + b} C80 ${466 + b} 120 ${488 + b} 200 ${488 + b} S320 ${466 + b} 360 ${476 + b}" stroke="none"/>
    <text fill="#fff" stroke="none" font-family="Cormorant Garamond, Georgia, serif" font-size="${fs}" letter-spacing="2"><textPath href="#sg-band" startOffset="50%" text-anchor="middle"${fit}>${esc(label)}</textPath></text></g>
    <g data-l="motto"><text x="200" y="536" text-anchor="middle" fill="#fff" stroke="none" opacity=".7" font-family="Cormorant Garamond, Georgia, serif" font-size="15" font-style="italic" letter-spacing="2">${virtue.motto}</text></g>
    <g data-l="plate">${qrPlate(url)}</g>
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

  /* The forge link. Heraldry's blazon is a crest written as words, so any herald can redraw it. Ours is written into the link
     after the #, so the link re-forges the same sigil on any device. The part after # never reaches a server. */
  const ORDER = ['Lore', 'Law', 'Language', 'Map', 'Ground', 'Artifacts', 'Machinery'];
  const params = () => {
    const p = new URLSearchParams();
    p.set('n', form.name.value.trim()); p.set('c', form.cat.value); p.set('v', form.virtue.value || 'trust');
    const w = site(); if (w) p.set('w', w.replace(/^https:\/\//, ''));
    const v = earned();
    if (v) p.set('m', ORDER.map((n) => { const l = v.layers.find((x) => String(x.name).toLowerCase() === n.toLowerCase()); return l ? (l.score >= 10 ? 2 : l.score >= 5 ? 1 : 0) : 0; }).join(''));
    return p;
  };
  const forgeLink = () => `${location.origin}/sigil/#${params().toString()}`;
  // Crockford's alphabet: no I, L, O or U, so the number reads back without mix-ups.
  const sigilNo = () => { let h = hash(params().toString()), n = ''; for (let i = 0; i < 7; i++) { n += '0123456789ABCDEFGHJKMNPQRSTVWXYZ'[h & 31]; h >>>= 5; } return `${n.slice(0, 4)}-${n.slice(4)}`; };
  (() => {
    const h = new URLSearchParams(location.hash.slice(1));
    if (!h.has('n')) return;
    form.name.value = (h.get('n') || '').slice(0, 40);
    const c = h.get('c'); if (c && [...form.cat.options].some((o) => o.value === c)) form.cat.value = c;
    const vr = [...form.querySelectorAll('input[name="virtue"]')].find((r) => r.value === h.get('v')); if (vr) vr.checked = true;
    if (form.site) form.site.value = (h.get('w') || '').slice(0, 80);
    const m = h.get('m') || '';
    if (/^[012]{7}$/.test(m)) { const layers = ORDER.map((name, i) => ({ name, score: +m[i] * 5 })); linked = { total: layers.reduce((a, l) => a + l.score, 0), layers }; }
    if (window.KNGHT_TRACK) window.KNGHT_TRACK('sigil_link_open', { category: form.cat.value });
  })();
  // Editing a linked sigil makes it yours: the marks fall back to your own score.
  form.addEventListener('input', () => { linked = null; }, true);
  const noEl = $('[data-sigil-no]');
  const showNo = () => { if (noEl) noEl.textContent = sigilNo(); };
  form.addEventListener('input', showNo); form.addEventListener('change', showNo);
  draw(); showNo();

  const slug = () => ((form.name.value || 'sigil').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'sigil');
  const LAYERS = ['top', 'field', 'frame', 'cipher', 'charge', 'virtue', 'marks', 'ribbon', 'motto', 'plate'];
  const loadImg = (svg) => new Promise((resolve, reject) => {
    const img = new Image(), u = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    img.onload = () => { URL.revokeObjectURL(u); resolve(img); };
    img.onerror = reject; img.src = u;
  });
  // The sigil with only some of its parts, as SVG text.
  const only = (svg, keep) => {
    const d = new DOMParser().parseFromString(svg, 'image/svg+xml');
    d.querySelectorAll('[data-l]').forEach((el) => { if (!keep.includes(el.getAttribute('data-l'))) el.remove(); });
    return new XMLSerializer().serializeToString(d);
  };
  // One transparent image per part of the crest, plus the whole crest.
  const layerImages = async (svg) => {
    const out = {};
    await Promise.all(LAYERS.concat('all').map(async (l) => { out[l] = await loadImg(only(svg, l === 'all' ? LAYERS : [l])); }));
    return out;
  };
  // Two Instagram sizes: feed 4:5 (1080x1350) and Story 9:16 (1080x1920). The crest scales to fit, plate or not.
  const SIZES = {
    feed: { h: 1350, top: 60, bottom: 1220, maxW: 780, note: 1300 },
    story: { h: 1920, top: 220, bottom: 1610, maxW: 1060, note: 1700 }, // clear of the Story header and reply bar
  };
  const toPng = (size = 'feed') => new Promise((resolve, reject) => {
    const S = SIZES[size] || SIZES.feed;
    const svg = draw();
    const img = new Image();
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    img.onload = () => {
      const c = document.createElement('canvas');
      const vbH = +(svg.match(/viewBox="0 0 400 (\d+)"/) || [0, 560])[1];
      c.width = 1080; c.height = S.h;
      const x = c.getContext('2d');
      x.fillStyle = '#000'; x.fillRect(0, 0, c.width, c.height);
      const room = S.bottom - S.top;
      const dw = Math.min(S.maxW, room * 400 / vbH), dh = dw * vbH / 400;
      x.drawImage(img, (1080 - dw) / 2, S.top + (room - dh) / 2, dw, dh);
      x.fillStyle = 'rgba(255,255,255,.55)';
      x.font = '28px Georgia, serif';
      x.textAlign = 'center';
      x.fillText('Forged at knght.com/sigil', 540, S.note);
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

  const storyBtn = $('[data-sigil-story]');
  if (storyBtn) storyBtn.addEventListener('click', async () => { save(await toPng('story'), `${slug()}-sigil-story.png`); track('sigil_download', { format: 'story', category: form.cat.value }); });
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

  /* The forging, as a 9:16 video. Each part of the crest is drawn onto a canvas in turn and the browser's own recorder saves it. Nothing is uploaded. */
  const vidBtn = $('[data-sigil-video]'), vidStatus = $('[data-sigil-vstatus]');
  // H.264 first: it's what Instagram, TikTok and every phone expect.
  const VTYPES = ['video/mp4;codecs=avc1.640028', 'video/mp4;codecs=avc1.4d0028', 'video/mp4;codecs=avc1.42E028', 'video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
  const canCodec = typeof window.VideoEncoder === 'function' && typeof window.VideoFrame === 'function';
  const canStream = !!(window.MediaRecorder && HTMLCanvasElement.prototype.captureStream && VTYPES.some((t) => MediaRecorder.isTypeSupported(t)));
  const canRecord = canCodec || canStream;
  if (vidBtn && canRecord) {
    vidBtn.hidden = false;
    const clamp = (v) => Math.max(0, Math.min(1, v));
    const ease = (v) => 1 - Math.pow(1 - clamp(v), 3);
    const span = (t, a, b) => ease((t - a) / (b - a));
    const T = 7.5;

    const prepare = async () => {
      const svg = draw();
      const vbH = +(svg.match(/viewBox="0 0 400 (\d+)"/) || [0, 560])[1];
      const L = await layerImages(svg);
      const c = document.createElement('canvas'); c.width = 1080; c.height = 1920;
      const x = c.getContext('2d');
      const S = SIZES.story, room = S.bottom - S.top;
      const dw = Math.min(S.maxW, room * 400 / vbH), k = dw / 400, dh = dw * vbH / 400;
      const ox = (1080 - dw) / 2, oy = S.top + (room - dh) / 2;
      const P = (sx, sy) => [ox + sx * k, oy + sy * k];
      const shieldPath = new Path2D((svg.match(/<g data-l="frame"><path d="([^"]+)"/) || [0, 'M0 0'])[1]);
      const [cx, cy] = P(200, 214);
      const foil = document.createElement('canvas'); foil.width = 1080; foil.height = 1920;
      const f = foil.getContext('2d');

      const layer = (img, alpha, dy = 0, scale = 1, about = [cx, cy]) => {
        if (alpha <= 0) return;
        x.save(); x.globalAlpha = alpha;
        x.translate(about[0], about[1] + dy * k); x.scale(scale, scale); x.translate(-about[0], -about[1]);
        x.drawImage(img, ox, oy, dw, dh); x.restore();
      };
      // A clock-hand sweep from the top of the shield: the border and the cipher are traced on.
      const sweep = (img, p) => {
        if (p <= 0) return;
        if (p >= 1) return layer(img, 1);
        x.save(); x.beginPath(); x.moveTo(cx, cy);
        x.arc(cx, cy, 2000, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2); x.closePath(); x.clip();
        layer(img, 1); x.restore();
        const a = -Math.PI / 2 + p * Math.PI * 2; // the spark at the tip of the hand
        const g = x.createLinearGradient(cx, cy, cx + Math.cos(a) * 700, cy + Math.sin(a) * 700);
        g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,.35)');
        x.save(); x.translate(ox, oy); x.scale(k, k); x.clip(shieldPath); x.setTransform(1, 0, 0, 1, 0, 0); // the hand stays inside the shield
        x.strokeStyle = g; x.lineWidth = 2; x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(a) * 700, cy + Math.sin(a) * 700); x.stroke(); x.restore();
      };
      const frame = (t) => {
        x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
        x.fillStyle = '#000'; x.fillRect(0, 0, 1080, 1920);
        layer(L.top, span(t, .1, .9), 12 * (1 - span(t, .1, .9)));
        // the field fills from the top down
        const fp = span(t, 1.1, 2.3);
        if (fp > 0) { x.save(); x.beginPath(); x.rect(0, 0, 1080, oy + dh * .9 * fp); x.clip(); layer(L.field, fp); x.restore(); }
        sweep(L.frame, span(t, .3, 1.9));
        sweep(L.cipher, span(t, 1.7, 2.9));
        // the charge strikes
        const cp = span(t, 2.7, 3.2);
        layer(L.charge, cp, 0, 1.35 - .35 * cp, P(200, 222));
        const flash = t > 2.9 ? Math.max(0, 1 - (t - 2.9) / .6) * (t < 3.0 ? (t - 2.9) / .1 : 1) : 0;
        if (flash > 0) {
          const [hx, hy] = P(200, 222), g = x.createRadialGradient(hx, hy, 0, hx, hy, 420);
          g.addColorStop(0, `rgba(255,255,255,${.55 * flash})`); g.addColorStop(1, 'rgba(255,255,255,0)');
          x.fillStyle = g; x.fillRect(0, 0, 1080, 1920);
        }
        layer(L.virtue, span(t, 3.1, 3.6));
        layer(L.marks, span(t, 3.3, 3.8));
        const rp = span(t, 3.5, 4.3);
        layer(L.ribbon, rp, 26 * (1 - rp));
        layer(L.motto, span(t, 4.0, 4.6));
        layer(L.plate, span(t, 4.3, 4.9));
        // a band of light passes over the finished crest
        const fl = (t - 4.8) / 1.3;
        if (fl > 0 && fl < 1) {
          f.globalCompositeOperation = 'source-over'; f.clearRect(0, 0, 1080, 1920);
          f.drawImage(L.all, ox, oy, dw, dh);
          f.globalCompositeOperation = 'source-in';
          const bx = -600 + fl * 2300, g = f.createLinearGradient(bx, 0, bx + 520, 520);
          g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.5, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
          f.fillStyle = g; f.fillRect(0, 0, 1080, 1920);
          x.save(); x.globalCompositeOperation = 'lighter'; x.globalAlpha = .9; x.drawImage(foil, 0, 0); x.restore();
        }
        const ep = span(t, 6.0, 6.7);
        if (ep > 0) {
          x.save(); x.globalAlpha = ep; x.fillStyle = 'rgba(255,255,255,.6)';
          x.font = '30px Georgia, serif'; x.textAlign = 'center';
          x.fillText('Forged at knght.com/sigil', 540, S.note + 14 * (1 - ep)); x.restore();
        }
      };

      return { c, frame };
    };
    const status = (txt) => { if (vidStatus) vidStatus.textContent = txt; };

    // Exact path: every frame is drawn at its own moment and encoded as H.264, so nothing drops, even on a slow phone.
    const CODECS = [['avc1.640028', 'avc'], ['avc1.4d0028', 'avc'], ['avc1.42E028', 'avc'], ['vp09.00.40.08', 'vp9']]; // VP9 only where H.264 is missing
    let muxerReady = null;
    const loadMuxer = () => muxerReady || (muxerReady = new Promise((resolve, reject) => {
      if (window.Mp4Muxer) return resolve();
      const sc = document.createElement('script');
      sc.src = '/assets/js/vendor/mp4-muxer-5.2.2.js'; sc.onload = resolve; sc.onerror = () => { muxerReady = null; reject(new Error('muxer')); };
      document.head.appendChild(sc);
    }));
    const viaCodec = async ({ c, frame }) => {
      let cfg = null, kind = 'avc';
      for (const [codec, k] of CODECS) {
        const want = { codec, width: 1080, height: 1920, bitrate: 8000000, framerate: 30 };
        if (k === 'avc') want.avc = { format: 'avc' };
        try { if ((await VideoEncoder.isConfigSupported(want)).supported) { cfg = want; kind = k; break; } } catch (err) {}
      }
      if (!cfg) return null;
      await loadMuxer();
      const muxer = new Mp4Muxer.Muxer({ target: new Mp4Muxer.ArrayBufferTarget(), video: { codec: kind, width: 1080, height: 1920 }, fastStart: 'in-memory' });
      let failed = null;
      const enc = new VideoEncoder({ output: (chunk, meta) => muxer.addVideoChunk(chunk, meta), error: (e) => { failed = e; } });
      enc.configure(cfg);
      const N = Math.round(T * 30), us = 1e6 / 30;
      for (let i = 0; i < N && !failed; i++) {
        frame(i / 30);
        const vf = new VideoFrame(c, { timestamp: Math.round(i * us), duration: Math.round(us) });
        enc.encode(vf, { keyFrame: i % 60 === 0 }); vf.close();
        if (i % 6 === 0) status(`Forging your video. ${Math.round(i / N * 100)}%`);
        while (enc.encodeQueueSize > 6 && !failed) await new Promise((r) => setTimeout(r, 4));
      }
      await enc.flush(); enc.close();
      if (failed) throw failed;
      muxer.finalize();
      return new File([muxer.target.buffer], `${slug()}-sigil.mp4`, { type: 'video/mp4' });
    };

    // Fallback: play it in real time and let the browser's recorder capture the canvas.
    const viaStream = async ({ c, frame }) => {
      frame(0);
      const type = VTYPES.find((t) => MediaRecorder.isTypeSupported(t));
      const stream = c.captureStream(30);
      const rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 10000000 });
      const chunks = [];
      rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
      const done = new Promise((resolve) => { rec.onstop = resolve; });
      rec.start(250);
      const t0 = performance.now();
      await new Promise((resolve) => {
        const tick = () => {
          const t = (performance.now() - t0) / 1000;
          frame(Math.min(t, T));
          status(`Forging your video. ${Math.max(0, Math.ceil(T - t))}s. Keep this tab open.`);
          if (t < T + .15) requestAnimationFrame(tick); else resolve();
        };
        requestAnimationFrame(tick);
      });
      rec.stop(); await done;
      stream.getTracks().forEach((tr) => tr.stop());
      const ext = /mp4/.test(type) ? 'mp4' : 'webm';
      return new File(chunks, `${slug()}-sigil.${ext}`, { type: type.split(';')[0] });
    };

    const record = async () => {
      status('Forging your video.');
      const scene = await prepare();
      if (canCodec) { try { const f = await viaCodec(scene); if (f) return f; } catch (err) { /* fall through to the recorder */ } }
      if (!canStream) throw new Error('no recorder');
      return viaStream(scene);
    };

    let made = null, busy = false;
    const touch = matchMedia('(pointer: coarse)').matches;
    const deliver = async () => {
      if (touch && navigator.canShare && navigator.canShare({ files: [made] })) {
        try { await navigator.share({ files: [made] }); return; } catch (err) { if (err && err.name === 'AbortError') return; }
      }
      save(made, made.name);
    };
    const reset = () => { if (busy) return; made = null; vidBtn.textContent = 'Make a video'; if (vidStatus) vidStatus.textContent = ''; };
    form.addEventListener('input', reset); form.addEventListener('change', reset);
    vidBtn.addEventListener('click', async () => {
      if (busy) return;
      if (made) { deliver(); return; }
      busy = true; vidBtn.disabled = true;
      try {
        made = await record();
        track('sigil_download', { format: 'video', category: form.cat.value });
        vidBtn.textContent = 'Save video';
        if (vidStatus) vidStatus.textContent = `Ready. A 9:16 ${made.name.endsWith('mp4') ? 'MP4' : 'WebM'} for Stories and Reels.`;
        if (!touch) save(made, made.name);
      } catch (err) {
        made = null;
        if (vidStatus) vidStatus.textContent = 'This browser could not record the video. Try the Story image instead.';
      }
      busy = false; vidBtn.disabled = false;
    });
  }

  /* Livery: the house colours carried onto everything else. One zip with the sigil cut for each place a business shows itself. */
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = (u8) => { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  // A stored (uncompressed) zip. The PNGs are compressed already, so nothing is lost.
  const zip = async (files) => {
    const enc = new TextEncoder(), parts = [], central = [];
    const d = new Date(), time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    let offset = 0;
    for (const f of files) {
      const data = new Uint8Array(await f.blob.arrayBuffer()), name = enc.encode(f.name), crc = crc32(data);
      const h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(10, time, true); h.setUint16(12, date, true);
      h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, name.length, true);
      parts.push(h, name, data);
      const c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(12, time, true); c.setUint16(14, date, true);
      c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, name.length, true); c.setUint32(42, offset, true);
      central.push(c, name);
      offset += 30 + name.length + data.length;
    }
    const size = central.reduce((a, p) => a + p.byteLength, 0), e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, size, true); e.setUint32(16, offset, true);
    return new Blob([...parts, ...central, e], { type: 'application/zip' });
  };
  const BOX = { x: 64, y: 42, w: 272, h: 388 }; // the bounds every one of the 28 shields fits inside, in sigil units
  const SERIF = '"Cormorant Garamond", Georgia, serif';
  const paint = (w, h, fn) => new Promise((resolve, reject) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d'); x.fillStyle = '#000'; x.fillRect(0, 0, w, h); fn(x);
    c.toBlob((b) => (b ? resolve(b) : reject(new Error('png'))), 'image/png');
  });
  const fitShield = (x, img, vbH, bx, by, bw, bh) => {
    const k = Math.min(bw / BOX.w, bh / BOX.h);
    x.drawImage(img, bx + (bw - BOX.w * k) / 2 - BOX.x * k, by + (bh - BOX.h * k) / 2 - BOX.y * k, 400 * k, vbH * k);
  };
  const fitText = (x, text, font, size, max) => { let s = size; do { x.font = font.replace('{s}', s); s -= 2; } while (x.measureText(text).width > max && s > 18); };
  const livery = async () => {
    const svg = draw();
    const vbH = +(svg.match(/viewBox="0 0 400 (\d+)"/) || [0, 560])[1];
    const shield = await loadImg(only(svg, ['field', 'frame', 'cipher', 'charge', 'virtue', 'marks']));
    // The icon has to read at 32 pixels: no hatching, and every line three times heavier.
    const icon = await loadImg(only(svg, ['frame', 'charge']).replace(/stroke-width="([\d.]+)"/g, (m, w) => `stroke-width="${(+w * 3).toFixed(2)}"`));
    try { await document.fonts.load(`500 40px ${SERIF}`); await document.fonts.load(`italic 400 40px ${SERIF}`); } catch (err) {}
    const name = (form.name.value.trim() || 'Your business').toUpperCase();
    const motto = (VIRTUE[form.virtue.value] || VIRTUE.trust).motto;
    const url = site().replace(/^https:\/\//, '');
    const s = slug(), files = [];
    files.push({ name: `${s}-profile.png`, blob: await paint(1080, 1080, (x) => fitShield(x, shield, vbH, 240, 220, 600, 640)) });
    files.push({ name: `${s}-icon.png`, blob: await paint(512, 512, (x) => fitShield(x, icon, vbH, 96, 64, 320, 384)) });
    files.push({ name: `${s}-banner-linkedin.png`, blob: await paint(1584, 396, (x) => {
      fitShield(x, shield, vbH, 1290, 40, 240, 316);
      x.fillStyle = '#fff'; x.textAlign = 'right'; if ('letterSpacing' in x) x.letterSpacing = '6px';
      fitText(x, name, `500 {s}px ${SERIF}`, 66, 660); x.fillText(name, 1230, 205);
      x.fillStyle = 'rgba(255,255,255,.6)'; x.font = `italic 400 30px ${SERIF}`; x.fillText(motto, 1230, 255);
      x.fillStyle = 'rgba(255,255,255,.35)'; x.fillRect(1230 - 120, 150, 120, 1);
    }) });
    files.push({ name: `${s}-email-signature.png`, blob: await paint(1200, 300, (x) => {
      fitShield(x, shield, vbH, 40, 30, 170, 240);
      x.fillStyle = '#fff'; x.textAlign = 'left'; if ('letterSpacing' in x) x.letterSpacing = '4px';
      fitText(x, name, `500 {s}px ${SERIF}`, 54, 880); x.fillText(name, 250, 132);
      x.fillStyle = 'rgba(255,255,255,.6)'; x.font = `italic 400 30px ${SERIF}`; x.fillText(motto, 250, 182);
      if (url) { x.fillStyle = 'rgba(255,255,255,.45)'; if ('letterSpacing' in x) x.letterSpacing = '1px'; x.font = '26px Georgia, serif'; x.fillText(url, 250, 236); }
    }) });
    files.push({ name: `${s}-feed.png`, blob: await toPng('feed') });
    files.push({ name: `${s}-story.png`, blob: await toPng('story') });
    files.push({ name: `${s}-sigil.svg`, blob: new Blob([draw()], { type: 'image/svg+xml' }) });
    const readme = [
      `The livery of ${form.name.value.trim() || 'your business'}. Forged at knght.com/sigil`,
      `Sigil No. ${sigilNo()}`,
      '',
      ...[
        ['profile.png', 'Profile picture. Square, and safe for round crops.'],
        ['icon.png', 'App icon or favicon, 512 by 512.'],
        ['banner-linkedin.png', 'LinkedIn header, 1584 by 396.'],
        ['email-signature.png', 'Email signature. Set it at 600 by 150.'],
        ['feed.png', 'Instagram feed post, 4:5.'],
        ['story.png', 'Instagram Story, 9:16.'],
        ['sigil.svg', 'The master. Scales to any size, for print and signage.'],
      ].map(([f, what]) => `${`${s}-${f}`.padEnd(s.length + 24)}${what}`),
      '',
      'Re-forge this exact sigil on any device:',
      forgeLink(),
      '',
    ].join('\r\n');
    files.push({ name: 'README.txt', blob: new Blob([readme], { type: 'text/plain' }) });
    return zip(files);
  };
  const liveryBtn = $('[data-sigil-livery]');
  if (liveryBtn) liveryBtn.addEventListener('click', async () => {
    if (liveryBtn.disabled) return;
    liveryBtn.disabled = true;
    try { save(await livery(), `${slug()}-livery.zip`); track('sigil_download', { format: 'livery', category: form.cat.value }); } catch (err) {}
    liveryBtn.disabled = false;
  });

  const copyBtn = $('[data-sigil-copy]');
  if (copyBtn) copyBtn.addEventListener('click', async () => {
    const url = forgeLink(), was = copyBtn.textContent;
    track('sigil_link_copy', { category: form.cat.value });
    try {
      if (matchMedia('(pointer: coarse)').matches && navigator.share) { await navigator.share({ title: `Sigil No. ${sigilNo()}`, url }); return; }
      await navigator.clipboard.writeText(url);
      copyBtn.textContent = 'Link copied'; setTimeout(() => { copyBtn.textContent = was; }, 2200);
    } catch (err) { if (!err || err.name !== 'AbortError') window.prompt('Copy your forge link', url); }
  });

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
