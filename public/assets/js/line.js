/* The one-line forge: three answers forged into one line, the words flying in to take their places,
   and a card in the business's own arms to keep at the desk. Nothing is sent anywhere. */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const form = $('[data-lineforge]');
  const A = window.KNGHT_ARMS;
  if (!form || !A) return;
  const stage = $('[data-line-stage]'), formsEl = $('[data-line-forms]'), testEl = $('[data-line-test]');
  const track = (e, p) => { if (window.KNGHT_TRACK) window.KNGHT_TRACK(e, p); };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SERIF = 'Cormorant Garamond, Georgia, serif', SANS = 'Helvetica Neue, Arial, sans-serif';
  const KEY = 'knght-line';

  const clean = (s) => (s || '').trim().replace(/\s+/g, ' ').replace(/[.!]+$/, '');
  const strip = (s, re) => s.replace(re, '').trim();
  const cap = (s) => s ? s[0].toUpperCase() + s.slice(1) : s;
  const parts = () => ({
    who: clean(form.who.value) || 'busy parents in Leslieville',
    change: strip(clean(form.change.value), /^(we )?help(s)? (them )?(to )?/i) || 'feel at ease at the dentist',
    how: strip(clean(form.how.value), /^by /i),
    refuse: strip(clean(form.refuse.value), /^(we )?never /i) || 'upsell',
  });
  const FORMS = [
    ['Promise', (p) => `We help ${p.who} ${p.change}${p.how ? ` by ${p.how}` : ''}. We never ${p.refuse}.`],
    ['Reason', (p) => `${cap(p.who)} come to us to ${p.change}${p.how ? `. We do it by ${p.how}` : ''}. We never ${p.refuse}.`],
    ['Oath', (p) => `Our word to ${p.who}: we help you ${p.change}, and we never ${p.refuse}.`],
  ];
  let formIx = 0, last = '';
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s) { ['who', 'change', 'how', 'refuse', 'name', 'cat', 'guard'].forEach((k) => { if (s[k]) form[k].value = s[k]; }); formIx = s.formIx || 0; } } catch (e) {}
  try { const c = localStorage.getItem('knght-cat'); if (c && !form.cat.dataset.set) form.cat.value = form.cat.value || (c === 'coffee' ? 'food' : c); } catch (e) {}
  formsEl.innerHTML = '<span class="ck__lbl">Form</span>' + FORMS.map(([n], i) => `<button type="button" class="cat" data-line-form="${i}" aria-pressed="${i === formIx}">${n}</button>`).join('');

  const line = () => FORMS[formIx][1](parts());
  // The words gather from wherever they were and settle into the line.
  const forge = (text, animate) => {
    const words = text.split(' ');
    stage.innerHTML = `<p class="ln__line${animate && !reduce ? ' is-forging' : ''}">${words.map((w, i) => {
      const a = (i * 137.5) * Math.PI / 180, r = 120 + (i % 3) * 60;
      return `<span style="--i:${i};--tx:${Math.round(Math.cos(a) * r)}px;--ty:${Math.round(Math.sin(a) * r * 0.6)}px">${A.esc(w)}</span>`;
    }).join(' ')}</p>`;
    const n = words.length;
    testEl.textContent = n <= 22 ? `${n} words. Short enough to say in one breath.` : `${n} words. Try to get it under 22 so it can be said in one breath.`;
  };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ who: form.who.value, change: form.change.value, how: form.how.value, refuse: form.refuse.value, name: form.name.value, cat: form.cat.value, guard: form.guard.value, formIx })); } catch (e) {} };
  const update = (animate) => { save(); const t = line(); if (t === last && !animate) return; last = t; forge(t, animate); };
  let typeT = 0, animT = 0;
  form.addEventListener('input', () => { clearTimeout(typeT); typeT = setTimeout(() => update(false), 150); clearTimeout(animT); animT = setTimeout(() => update(true), 1200); });
  form.addEventListener('change', () => update(true));
  form.addEventListener('submit', (e) => e.preventDefault());
  formsEl.addEventListener('click', (e) => { const b = e.target.closest('[data-line-form]'); if (!b) return; formIx = +b.dataset.lineForm; formsEl.querySelectorAll('[data-line-form]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); update(true); });

  // The card: 7 × 5 in, the shield above, the line in the middle, the name below.
  const wrap = (text, max) => { const out = []; let cur = ''; text.split(' ').forEach((w) => { if ((cur + ' ' + w).trim().length > max) { out.push(cur.trim()); cur = w; } else cur += ' ' + w; }); if (cur.trim()) out.push(cur.trim()); return out; };
  const card = () => {
    const W = 700, H = 500, text = line(), name = (form.name.value || '').trim().toUpperCase(), sh = A.shield(form.cat.value, form.guard.value);
    const lines = wrap(text, 38), fs = lines.length > 4 ? 30 : 36, lh = fs * 1.28, y0 = 280 - (lines.length - 1) * lh / 2;
    const k = 0.22, ox = W / 2 - 200 * k, oy = 52 - 46 * k;
    return { W, H, svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#000"/>
      <rect x="16" y="16" width="${W - 32}" height="${H - 32}" fill="none" stroke="#fff" stroke-width="1.6"/><rect x="26" y="26" width="${W - 52}" height="${H - 52}" fill="none" stroke="#fff" stroke-width=".6" opacity=".45"/>
      <path d="${A.xf(sh, k, ox, oy)}" fill="none" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/>
      ${lines.map((l, i) => `<text x="${W / 2}" y="${(y0 + i * lh).toFixed(1)}" text-anchor="middle" fill="#fff" font-family="${SERIF}" font-style="italic" font-size="${fs}">${A.esc(l)}</text>`).join('')}
      ${name ? `<text x="${W / 2}" y="${H - 58}" text-anchor="middle" fill="#fff" opacity=".6" font-family="${SERIF}" font-size="17" letter-spacing="4">${A.esc(name)}</text>` : ''}
      <text x="${W / 2}" y="${H - 38}" text-anchor="middle" fill="#fff" opacity=".35" font-family="${SANS}" font-size="9" letter-spacing="2">FORGED AT KNGHT.COM</text></svg>` };
  };
  const slug = () => ((form.name.value || 'our-line').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'our-line');
  $('[data-line-pdf]').addEventListener('click', async () => { const c = card(); A.save(await A.pdf([{ canvas: await A.raster(c.svg, c.W, c.H, 300), wIn: 7, hIn: 5 }]), `${slug()}-line.pdf`); track('line_download', { format: 'pdf', form: FORMS[formIx][0] }); });
  $('[data-line-png]').addEventListener('click', async () => { const c = card(); (await A.raster(c.svg, c.W, c.H, 300)).toBlob((b) => A.save(b, `${slug()}-line.png`), 'image/png'); track('line_download', { format: 'png', form: FORMS[formIx][0] }); });
  $('[data-line-copy]').addEventListener('click', async (e) => { try { await navigator.clipboard.writeText(line()); e.target.textContent = 'Copied'; setTimeout(() => { e.target.textContent = 'Copy the line'; }, 2000); } catch (err) {} });

  // Forge the first line when it comes into view.
  forge(line(), false);
  if ('IntersectionObserver' in window && !reduce) { const io = new IntersectionObserver(([en]) => { if (en.isIntersecting) { io.disconnect(); forge(line(), true); } }, { threshold: 0.5 }); io.observe(stage); }
})();
