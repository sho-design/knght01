/* The leak: what missed calls and unanswered messages cost in a year, from the visitor's own numbers.
   A year runs through the hourglass while the count climbs. The inputs are kept in this browser; analytics gets only the category and a result band. */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const form = $('[data-leak]');
  if (!form) return;
  const glass = $('[data-leak-glass]'), yearEl = $('[data-leak-year]'), saveEl = $('[data-leak-save]'), subEl = $('[data-leak-sub]'), catchOut = $('[data-leak-catch]');
  const track = (e, p) => { if (window.KNGHT_TRACK) window.KNGHT_TRACK(e, p); };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const money = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 });
  const KEY = 'knght-leak';

  // Examples only, to start from. The visitor's own numbers replace them.
  const EX = {
    clinic: { missed: 8, rate: 40, value: 500 }, dental: { missed: 10, rate: 40, value: 900 }, medspa: { missed: 8, rate: 35, value: 1200 },
    law: { missed: 6, rate: 25, value: 3500 }, spirits: { missed: 5, rate: 30, value: 150 }, food: { missed: 12, rate: 30, value: 120 }, other: { missed: 8, rate: 30, value: 400 },
  };
  let cat = 'other';
  const set = (v) => { Object.entries(v).forEach(([k, x]) => { if (form[k]) form[k].value = x; }); };
  const press = () => form.querySelectorAll('[data-leak-cat]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.leakCat === cat)));

  // The glass
  const TOP = 'M44 24C44 104 104 142 104 170H116C116 142 176 104 176 24Z';
  const BOT = 'M104 170C104 198 44 236 44 316H176C176 236 116 198 116 170Z';
  glass.innerHTML = `<svg viewBox="0 0 220 340" class="lk__svg">
    <defs><clipPath id="lkTop"><path d="${TOP}"/></clipPath><clipPath id="lkBot"><path d="${BOT}"/></clipPath></defs>
    <rect class="lk__sand" data-lk-top x="40" y="24" width="140" height="146" clip-path="url(#lkTop)"/>
    <path class="lk__sand" data-lk-pile d="" clip-path="url(#lkBot)"/>
    <path class="lk__stream" data-lk-stream d="M110 168V316"/>
    <path class="lk__frame" d="M40 20C40 104 104 142 104 170C104 198 40 236 40 320M180 20C180 104 116 142 116 170C116 198 180 236 180 320"/>
    <path class="lk__frame lk__bar" d="M24 12H196V22H24ZM24 318H196V328H24Z"/>
    <path class="lk__frame lk__post" d="M30 22V318M190 22V318"/>
  </svg>`;
  const topEl = $('[data-lk-top]', glass), pileEl = $('[data-lk-pile]', glass), streamEl = $('[data-lk-stream]', glass);
  // p runs 0 to 1 through the year: the top empties, the pile grows.
  const pour = (p) => {
    const y = 24 + 146 * Math.min(1, p);
    topEl.setAttribute('y', y.toFixed(1)); topEl.setAttribute('height', Math.max(0, 170 - y).toFixed(1));
    const h = 4 + 118 * Math.min(1, p), top = 316 - h;
    pileEl.setAttribute('d', `M30 316L30 ${316 - h * 0.25}Q110 ${top - h * 0.35} 190 ${316 - h * 0.25}L190 316Z`);
    streamEl.style.opacity = p > 0 && p < 1 ? '1' : '0';
    streamEl.setAttribute('d', `M110 168V${(top + 6).toFixed(1)}`);
  };

  let raf = 0, shown = 0, logged = '';
  const num = (n, d) => { const v = parseFloat(form[n].value); return Number.isFinite(v) ? v : d; };
  const calc = () => {
    const missed = Math.max(0, num('missed', 0)), rate = Math.min(100, Math.max(0, num('rate', 0))) / 100, value = Math.max(0, num('value', 0)), weeks = Math.min(52, Math.max(1, num('weeks', 50))), caught = num('catch', 50) / 100;
    const clients = missed * rate * weeks, year = clients * value;
    return { year, week: year / weeks, month: year / 12, clients, save: year * caught, caught };
  };
  const run = () => {
    const r = calc();
    catchOut.textContent = `${Math.round(r.caught * 100)}%`;
    saveEl.textContent = money.format(r.save);
    subEl.textContent = r.year > 0 ? `${money.format(r.week)} a week. ${money.format(r.month)} a month. About ${Math.round(r.clients)} new clients a year who booked somewhere else.` : 'Add your numbers to see the year run.';
    try { localStorage.setItem(KEY, JSON.stringify({ cat, missed: form.missed.value, rate: form.rate.value, value: form.value.value, weeks: form.weeks.value, catch: form.catch.value })); } catch (e) {}
    cancelAnimationFrame(raf);
    const from = shown, to = r.year;
    if (reduce || !to) { shown = to; yearEl.textContent = money.format(to); pour(to ? 1 : 0); return; }
    const t0 = performance.now(), dur = 4200;
    const step = (now) => {
      const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 2);
      shown = from + (to - from) * e;
      yearEl.textContent = money.format(shown);
      pour(p);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    pour(0); shown = 0; raf = requestAnimationFrame(step);
    // One event per distinct result, in bands, so no exact figures leave the page.
    const band = to < 10000 ? 'under-10k' : to < 50000 ? '10k-50k' : to < 150000 ? '50k-150k' : '150k-plus';
    if (band + cat !== logged) { logged = band + cat; track('leak_calc', { category: cat, band }); }
  };

  let t = 0;
  form.addEventListener('input', (e) => { if (e.target.name === 'catch') { const r = calc(); catchOut.textContent = `${Math.round(r.caught * 100)}%`; saveEl.textContent = money.format(r.save); return; } clearTimeout(t); t = setTimeout(run, 450); });
  form.addEventListener('change', (e) => { if (e.target.name === 'catch') run(); });
  form.addEventListener('submit', (e) => e.preventDefault());
  form.querySelectorAll('[data-leak-cat]').forEach((b) => b.addEventListener('click', () => { cat = b.dataset.leakCat; press(); set(EX[cat]); run(); }));

  let saved = null; try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
  if (saved) { cat = saved.cat || 'other'; set(saved); }
  else { try { const c = localStorage.getItem('knght-cat'); if (c && EX[c === 'coffee' ? 'food' : c]) cat = c === 'coffee' ? 'food' : c; } catch (e) {} set(EX[cat]); form.weeks.value = 50; form.catch.value = 50; }
  press();
  // Start the year when the glass comes into view.
  if ('IntersectionObserver' in window && !reduce) {
    pour(0);
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); run(); } }, { threshold: 0.4 });
    io.observe(glass);
  } else run();
})();
