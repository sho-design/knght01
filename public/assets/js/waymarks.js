/* Waymarks: a matching set of printable signs in the business's own arms. Each sign is drawn as SVG,
   rasterised at print resolution and gathered into one PDF, a page per sign. What you type stays in the browser. */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const form = $('[data-waymarks]');
  const A = window.KNGHT_ARMS;
  if (!form || !A) return;
  const grid = $('[data-wm-grid]'), picksEl = $('[data-wm-picks]'), countEl = $('[data-wm-count]');
  const track = (e, p) => { if (window.KNGHT_TRACK) window.KNGHT_TRACK(e, p); };
  const SERIF = 'Cormorant Garamond, Georgia, serif', SANS = 'Helvetica Neue, Arial, sans-serif';
  const ICON = {
    chair: '<path d="M7 3v9h10V3M6 12h12v3H6zM7 15v6M17 15v6"/>',
    bell: '<path d="M5 17h14M6 17a6 6 0 0 1 12 0M12 9V7M10 7h4M3 20h18"/>',
    person: '<circle cx="12" cy="4.5" r="2"/><path d="M8 9h8l-1 6h-2v6h-2v-6H9z"/>',
    door: '<path d="M6 21V3h12v18M3 21h18M14 12h1"/>',
    lock: '<path d="M7.6 10.6V7.6a4.4 4.4 0 0 1 8.8 0v3M5.4 10.6h13.2v10.4H5.4z"/><circle cx="12" cy="14.6" r="1.3"/><path d="M12 15.9v2.4"/>',
    out: '<path d="M5 21V3h9v4M5 21h9v-4M10 12h11M18 9l3 3-3 3"/>',
    moon: '<path d="M16 3a9 9 0 1 0 5 13A7.5 7.5 0 0 1 16 3z"/>',
    bow: '<path d="M12 11.2C9.2 7 4.8 6.8 4.8 9.6s4.4 3.4 7.2 1.6zM12 11.2c2.8-4.2 7.2-4.4 7.2-1.6s-4.4 3.4-7.2 1.6z"/><circle cx="12" cy="11.2" r="1.2"/><path d="M11.2 12.3 8.4 19.6M12.8 12.3l2.8 7.3"/>',
    arrow: '<path d="M4 12h15M14 7l5 5-5 5"/>',
  };
  const SIGNS = [
    { id: 'wait', label: 'Please wait here', sub: 'We’ll come to you', icon: 'chair', on: true },
    { id: 'reception', label: 'Reception', sub: 'Please check in', icon: 'bell', on: true },
    { id: 'washroom', label: 'Washroom', sub: '', icon: 'person', on: true },
    { id: 'rooms', label: 'Room', sub: '', icon: 'door', on: true, rooms: true },
    { id: 'right', label: 'This way', sub: '', icon: 'arrow', on: true, arrow: 'right' },
    { id: 'left', label: 'This way', sub: '', icon: 'arrow', on: false, arrow: 'left' },
    { id: 'staff', label: 'Staff only', sub: 'Thank you', icon: 'lock', on: false },
    { id: 'wayout', label: 'Way out', sub: 'Thank you for visiting', icon: 'out', on: false },
    { id: 'quiet', label: 'Quiet, please', sub: 'Appointments in progress', icon: 'moon', on: false },
    { id: 'thanks', label: 'Thank you', sub: 'See you next time', icon: 'bow', on: false },
  ];
  const st = { size: 'plate', paper: 'black', on: Object.fromEntries(SIGNS.map((s) => [s.id, s.on])) };
  try { const s = JSON.parse(localStorage.getItem('knght-waymarks') || 'null'); if (s) { Object.assign(st, s); if (s.name) form.name.value = s.name; if (s.cat) form.cat.value = s.cat; if (s.guard) form.guard.value = s.guard; if (s.rooms != null) form.rooms.value = s.rooms; } } catch (e) {}
  try { const c = localStorage.getItem('knght-cat'); if (c && !st.cat) form.cat.value = c === 'coffee' ? 'food' : c; } catch (e) {}
  const save = () => { try { localStorage.setItem('knght-waymarks', JSON.stringify({ size: st.size, paper: st.paper, on: st.on, name: form.name.value, cat: form.cat.value, guard: form.guard.value, rooms: form.rooms.value })); } catch (e) {} };

  picksEl.innerHTML = SIGNS.map((s) => `<button type="button" class="cat" data-wm-pick="${s.id}" aria-pressed="${!!st.on[s.id]}">${s.arrow === 'left' ? '← ' : ''}${s.rooms ? 'Room numbers' : s.label}${s.arrow === 'right' ? ' →' : ''}</button>`).join('');

  // The list of pages: rooms expand to Room 1, Room 2…
  const pages = () => SIGNS.filter((s) => st.on[s.id]).flatMap((s) => s.rooms ? Array.from({ length: Math.max(0, Math.min(20, +form.rooms.value || 0)) }, (_, i) => ({ ...s, label: `Room ${i + 1}` })) : [s]);

  const icon = (name, x, y, size, ink, sw = 1.3) => `<g transform="translate(${x} ${y}) scale(${size / 24})" fill="none" stroke="${ink}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${ICON[name]}</g>`;
  const draw = (s) => {
    const wall = st.size === 'wall', W = wall ? 1100 : 800, H = wall ? 850 : 300;
    const dark = st.paper === 'black', bg = dark ? '#000' : '#fff', ink = dark ? '#fff' : '#000';
    const name = (form.name.value || '').trim().toUpperCase(), sh = A.shield(form.cat.value, form.guard.value);
    // Arrows point right; a left arrow is the same one mirrored about its own centre.
    const arrow = (cx) => `<g transform="${s.arrow === 'left' ? `translate(${cx} 0) scale(-1 1) translate(${-cx} 0)` : ''}">`;
    let body = `<rect width="${W}" height="${H}" fill="${bg}"/><rect x="14" y="14" width="${W - 28}" height="${H - 28}" fill="none" stroke="${ink}" stroke-width="2"/><rect x="24" y="24" width="${W - 48}" height="${H - 48}" fill="none" stroke="${ink}" stroke-width=".8" opacity=".5"/>`;
    if (!wall) {
      // Door plate: the shield with its mark on the left, the words on the right.
      const k = 0.52, ox = 60 - 70 * k, oy = H / 2 - 240 * k;
      body += `<path d="${A.xf(sh, k, ox, oy)}" fill="none" stroke="${ink}" stroke-width="2.2" stroke-linejoin="round"/><path d="${A.xf(sh, k, ox, oy, 0.88)}" fill="none" stroke="${ink}" stroke-width=".8" opacity=".55" stroke-linejoin="round"/>`;
      if (!s.arrow) body += icon(s.icon, ox + 200 * k - 26, oy + 214 * k - 30, 52, ink, 1.4);
      else body += icon('arrow', ox + 200 * k - 20, oy + 214 * k - 24, 40, ink, 1.4);
      const tx = 250;
      body += `<text x="${tx}" y="${s.sub ? 150 : 172}" fill="${ink}" font-family="${SERIF}" font-size="${s.label.length > 14 ? 54 : 66}">${A.esc(s.label)}</text>`;
      if (s.sub) body += `<text x="${tx + 2}" y="198" fill="${ink}" opacity=".7" font-family="${SANS}" font-size="19" letter-spacing="3.5">${A.esc(s.sub.toUpperCase())}</text>`;
      if (s.arrow) body += `${arrow(W - 140)}${icon('arrow', W - 210, H / 2 - 70, 140, ink, 1.2)}</g>`;
      if (name) body += `<text x="${W - 44}" y="${H - 40}" text-anchor="end" fill="${ink}" opacity=".55" font-family="${SERIF}" font-size="15" letter-spacing="3">${A.esc(name)}</text>`;
    } else {
      // Wall sign: the shield above, the words below, a big arrow when it points somewhere.
      const k = 0.78, ox = W / 2 - 200 * k, oy = 70 - 46 * k;
      body += `<path d="${A.xf(sh, k, ox, oy)}" fill="none" stroke="${ink}" stroke-width="2.6" stroke-linejoin="round"/><path d="${A.xf(sh, k, ox, oy, 0.88)}" fill="none" stroke="${ink}" stroke-width="1" opacity=".55" stroke-linejoin="round"/>`;
      body += icon(s.arrow ? 'arrow' : s.icon, W / 2 - 48, oy + 214 * k - 56, 96, ink, 1.3);
      const ly = s.arrow ? 520 : 560;
      body += `<text x="${W / 2}" y="${ly}" text-anchor="middle" fill="${ink}" font-family="${SERIF}" font-size="${s.label.length > 14 ? 92 : 112}">${A.esc(s.label)}</text>`;
      if (s.sub) body += `<text x="${W / 2}" y="${ly + 66}" text-anchor="middle" fill="${ink}" opacity=".7" font-family="${SANS}" font-size="28" letter-spacing="6">${A.esc(s.sub.toUpperCase())}</text>`;
      if (s.arrow) body += `${arrow(W / 2)}${icon('arrow', W / 2 - 160, 540, 320, ink, .9)}</g>`;
      if (name) body += `<text x="${W / 2}" y="${H - 52}" text-anchor="middle" fill="${ink}" opacity=".55" font-family="${SERIF}" font-size="22" letter-spacing="5">${A.esc(name)}</text>`;
    }
    return { svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${A.esc(`${s.label}${s.sub ? '. ' + s.sub : ''}`)}">${body}</svg>`, W, H };
  };

  const render = () => {
    save();
    const list = pages();
    countEl.textContent = list.length ? `${list.length} sign${list.length === 1 ? '' : 's'}, one per page` : 'Pick at least one sign';
    grid.className = `wm__grid is-${st.size}`;
    grid.innerHTML = list.map((s, i) => `<figure class="wm__card" style="--i:${i}">${draw(s).svg}</figure>`).join('');
  };
  const press = (attr, val) => form.querySelectorAll(`[${attr}]`).forEach((b) => b.setAttribute('aria-pressed', String(b.getAttribute(attr) === val)));
  picksEl.addEventListener('click', (e) => { const b = e.target.closest('[data-wm-pick]'); if (!b) return; st.on[b.dataset.wmPick] = !st.on[b.dataset.wmPick]; b.setAttribute('aria-pressed', String(st.on[b.dataset.wmPick])); render(); });
  form.querySelectorAll('[data-wm-size]').forEach((b) => b.addEventListener('click', () => { st.size = b.dataset.wmSize; press('data-wm-size', st.size); render(); }));
  form.querySelectorAll('[data-wm-paper]').forEach((b) => b.addEventListener('click', () => { st.paper = b.dataset.wmPaper; press('data-wm-paper', st.paper); render(); }));
  let t = 0; form.addEventListener('input', () => { clearTimeout(t); t = setTimeout(render, 200); }); form.addEventListener('change', render);
  form.addEventListener('submit', (e) => e.preventDefault());
  $('[data-wm-pdf]').addEventListener('click', async (e) => {
    const list = pages(); if (!list.length) return;
    const btn = e.currentTarget, was = btn.textContent; btn.disabled = true; btn.textContent = 'Forging the set…';
    try {
      const out = [];
      for (const s of list) { const d = draw(s); out.push({ canvas: await A.raster(d.svg, d.W, d.H, 200), wIn: d.W / 100, hIn: d.H / 100 }); }
      const slug = ((form.name.value || 'waymarks').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'waymarks');
      A.save(await A.pdf(out), `${slug}-waymarks-${st.size}.pdf`);
      track('waymarks_download', { size: st.size, count: list.length });
    } finally { btn.disabled = false; btn.textContent = was; }
  });
  press('data-wm-size', st.size); press('data-wm-paper', st.paper);
  render();
})();
