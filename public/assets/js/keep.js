/* The licence keep: renewal dates become seals on a wall, and one calendar file reminds you 90, 30 and 7 days ahead.
   It runs in the browser. The list is saved only in this browser (localStorage) so it is there next time. */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const form = $('[data-keep]');
  if (!form) return;
  const rowsEl = $('[data-keep-rows]'), out = $('[data-keep-out]'), wall = $('[data-keep-wall]'), sum = $('[data-keep-sum]'), yearly = $('[data-keep-yearly]');
  const track = (e, p) => { if (window.KNGHT_TRACK) window.KNGHT_TRACK(e, p); };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const KEY = 'knght-keep';

  // Starter names only. The visitor sets every date from their own notices.
  const LISTS = {
    clinic: ['College registration', 'Professional liability insurance', 'Business insurance', 'Municipal business licence', 'Domain name'],
    dental: ['College registration', 'Professional liability insurance', 'X-ray equipment registration', 'Business insurance', 'Domain name'],
    medspa: ['College registration (each practitioner)', 'Professional liability insurance', 'Municipal business licence', 'Business insurance', 'Domain name'],
    law: ['Law Society annual fee', 'Lawyer annual report', 'LawPRO insurance', 'Business insurance', 'Domain name'],
    spirits: ['AGCO licence', 'CRA excise licence', 'Business insurance', 'Trademark renewal', 'Domain name'],
    food: ['Municipal business licence', 'Food handler certificates', 'Business insurance', 'Lease renewal', 'Domain name'],
    other: ['Business licence', 'Business insurance', 'Trademark renewal', 'Lease renewal', 'Domain name'],
  };

  const today = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); };
  const parse = (v) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
  const daysTo = (d) => Math.round((d - today()) / 864e5);

  // Rows
  const row = (name = '', date = '') => {
    const li = document.createElement('li');
    li.className = 'kp__row';
    li.innerHTML = `<label class="rp__field kp__name"><span>What renews</span><input type="text" maxlength="60" placeholder="College registration" value="${esc(name)}"></label>`
      + `<label class="rp__field kp__date"><span>Renews on</span><input type="date" value="${esc(date)}"></label>`
      + '<button type="button" class="kp__x" aria-label="Remove">×</button>';
    $('.kp__x', li).addEventListener('click', () => { li.remove(); if (!rowsEl.children.length) row(); update(); });
    rowsEl.appendChild(li);
    return li;
  };
  const items = () => [...rowsEl.children].map((li) => ({ name: $('.kp__name input', li).value.trim(), date: $('.kp__date input', li).value }))
    .filter((it) => it.name && parse(it.date));
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ rows: [...rowsEl.children].map((li) => [$('.kp__name input', li).value, $('.kp__date input', li).value]), yearly: yearly.checked })); } catch (e) {} };

  // The wall
  const abbr = (n) => { const w = n.replace(/\(.*?\)/g, '').split(/[\s-]+/).filter((x) => /^[A-Za-z0-9]/.test(x)); const caps = w.filter((x) => /^[A-Z]{2,}$/.test(x)); return (caps[0] || w.slice(0, 2).map((x) => x[0]).join('')).slice(0, 4).toUpperCase(); };
  const state = (d) => (d < 0 ? 'broken' : d <= 30 ? 'crack' : d <= 90 ? 'watch' : 'sound');
  const LABEL = { broken: 'Past due', crack: 'Under 30 days', watch: 'Under 90 days', sound: 'Sound' };
  const seen = new Set(); // seals already on the wall don't drop in again while you type
  const draw = (list) => {
    const n = list.length, narrow = (wall.clientWidth || innerWidth) < 600, per = narrow ? Math.min(3, n) : Math.min(6, Math.max(3, n)), rows = Math.ceil(n / per);
    const W = 1000, top = 70, gap = narrow ? 290 : 150, H = top + 60 + rows * gap + (narrow ? 120 : 30);
    let merlons = `M20 ${top + 40}`;
    for (let x = 20; x < W - 20; x += 80) merlons += `V${top}H${x + 44}V${top + 40}H${Math.min(x + 80, W - 20)}`;
    merlons += `V${H - 10}H20Z`;
    const bricks = [];
    for (let y = top + 70; y < H - 10; y += 34) { const off = ((y - top) / 34) % 2 ? 0 : 50; for (let x = 20 + off; x < W - 20; x += 100) bricks.push(`M${x} ${y}h60`); }
    const seals = list.map((it, i) => {
      const r = Math.floor(i / per), c = i % per, inRow = Math.min(per, n - r * per);
      const cx = W / 2 + (c - (inRow - 1) / 2) * (narrow ? 300 : 156), cy = top + (narrow ? 190 : 120) + r * gap;
      const d = daysTo(it.next), st = state(d), key = `${it.name}|${it.date}|${st}`, fresh = !seen.has(key); seen.add(key);
      const days = d < 0 ? `${-d} day${d === -1 ? '' : 's'} late` : d === 0 ? 'Today' : `${d} day${d === 1 ? '' : 's'}`;
      const crack = `M${cx + 22} ${cy - 38}l-6 14l9 10l-7 12l8 10l-4 14`;
      const ring = st === 'broken'
        ? `<g class="kp__half" style="--dx:-7px;--rot:-6deg"><path d="M${cx - 2} ${cy - 44}A44 44 0 0 0 ${cx - 2} ${cy + 44}" class="kp__ring"/><path d="M${cx - 2} ${cy - 34}A34 34 0 0 0 ${cx - 2} ${cy + 34}" class="kp__ring kp__ring--in"/></g><g class="kp__half" style="--dx:7px;--rot:6deg"><path d="M${cx + 2} ${cy - 44}A44 44 0 0 1 ${cx + 2} ${cy + 44}" class="kp__ring"/><path d="M${cx + 2} ${cy - 34}A34 34 0 0 1 ${cx + 2} ${cy + 34}" class="kp__ring kp__ring--in"/></g>`
        : `<circle cx="${cx}" cy="${cy}" r="44" class="kp__ring${st === 'watch' ? ' kp__ring--dash' : ''}"/><circle cx="${cx}" cy="${cy}" r="34" class="kp__ring kp__ring--in"/>`;
      return `<g transform="${narrow ? `translate(${cx} ${cy}) scale(1.9) translate(${-cx} ${-cy})` : ''}"><g class="kp__seal is-${st}${fresh ? ' is-in' : ''}" style="--i:${i}" tabindex="0" role="img" aria-label="${esc(it.name)}: ${esc(days)}, ${LABEL[st]}">`
        + `<title>${esc(it.name)}: ${esc(days)}</title>`
        + `<circle cx="${cx}" cy="${cy}" r="46" class="kp__wax"/>${ring}`
        + (st === 'crack' ? `<path d="${crack}" pathLength="1" class="kp__crack"/>` : '')
        + `<text x="${cx}" y="${cy + 7}" class="kp__abbr">${esc(abbr(it.name))}</text>`
        + `<text x="${cx}" y="${cy + 70}" class="kp__days">${esc(days)}</text>`
        + `<text x="${cx}" y="${cy + 88}" class="kp__nm">${esc(it.name.length > 22 ? it.name.slice(0, 21) + '…' : it.name)}</text></g></g>`;
    }).join('');
    wall.innerHTML = `<svg viewBox="0 0 ${W} ${H}" class="kp__svg" role="group" aria-label="Your renewals as seals on a wall"><path d="${merlons}" class="kp__stone"/><path d="${bricks.join('')}" class="kp__brick"/>${seals}</svg>`;
  };

  // Next renewal for each item: the date given, rolled forward a year at a time if it repeats and has passed.
  const withNext = (list) => list.map((it) => {
    let d = parse(it.date);
    if (yearly.checked) while (daysTo(d) < 0) d = new Date(d.getFullYear() + 1, d.getMonth(), d.getDate());
    return { ...it, next: d };
  }).sort((a, b) => a.next - b.next);

  const update = () => {
    save();
    const list = withNext(items());
    out.hidden = !list.length;
    if (!list.length) return;
    const first = list[0], d = daysTo(first.next);
    const late = list.filter((x) => daysTo(x.next) < 0).length;
    sum.textContent = late ? `${late} past due. Start with ${first.name}.`
      : d === 0 ? `${first.name} renews today.`
      : `Next up: ${first.name}, in ${d} day${d === 1 ? '' : 's'}.`;
    draw(list);
  };

  // The calendar file
  const ymd = (d) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const icsText = (s) => String(s).replace(/\\/g, '\\\\').replace(/[,;]/g, (c) => '\\' + c).replace(/\n/g, '\\n');
  const fold = (line) => { const out = []; let rest = line; while (rest.length > 74) { out.push(rest.slice(0, 74)); rest = ' ' + rest.slice(74); } out.push(rest); return out.join('\r\n'); };
  const ics = (list) => {
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//KNGHT//Licence keep//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:Renewals'];
    const rr = yearly.checked ? ['RRULE:FREQ=YEARLY'] : [];
    list.forEach((it, i) => {
      const due = parse(it.date);
      // Already late and not repeating: one reminder today, so it is on the calendar at all.
      if (!yearly.checked && daysTo(due) < 0) L.push('BEGIN:VEVENT', `UID:keep-${i}-late-${ymd(due)}@knght.com`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${ymd(today())}`, `DTEND;VALUE=DATE:${ymd(addDays(today(), 1))}`, `SUMMARY:${icsText(`${it.name}: past due`)}`, 'TRANSP:TRANSPARENT', 'END:VEVENT');
      [[90, `Renew ${it.name}: 90 days left`], [30, `Renew ${it.name}: 30 days left`], [7, `Renew ${it.name}: 7 days left`], [0, `${it.name} renews today`]].forEach(([n, title]) => {
        const on = addDays(due, -n);
        if (!yearly.checked && daysTo(on) < 0) return;
        L.push('BEGIN:VEVENT', `UID:keep-${i}-${n}-${ymd(due)}-${Math.random().toString(36).slice(2, 8)}@knght.com`, `DTSTAMP:${stamp}`,
          `DTSTART;VALUE=DATE:${ymd(on)}`, `DTEND;VALUE=DATE:${ymd(addDays(on, 1))}`, ...rr,
          `SUMMARY:${icsText(title)}`, `DESCRIPTION:${icsText(`${it.name} renews on ${due.toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })}.\nMade with the licence keep at knght.com/keep`)}`,
          'TRANSP:TRANSPARENT', 'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsText(title)}`, 'TRIGGER:PT9H', 'END:VALARM', 'END:VEVENT');
      });
    });
    L.push('END:VCALENDAR');
    return L.map(fold).join('\r\n') + '\r\n';
  };
  $('[data-keep-ics]').addEventListener('click', () => {
    const list = items(); if (!list.length) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([ics(list)], { type: 'text/calendar;charset=utf-8' }));
    a.download = 'renewals.ics'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    track('keep_download', { count: list.length, yearly: yearly.checked });
  });

  // Starter lists add names that aren't already there, into empty rows first.
  form.querySelectorAll('[data-keep-cat]').forEach((b) => b.addEventListener('click', () => {
    const have = new Set([...rowsEl.children].map((li) => $('.kp__name input', li).value.trim().toLowerCase()));
    LISTS[b.dataset.keepCat].forEach((name) => {
      if (have.has(name.toLowerCase())) return;
      const empty = [...rowsEl.children].find((li) => !$('.kp__name input', li).value.trim());
      if (empty) $('.kp__name input', empty).value = name; else row(name);
    });
    const firstEmpty = [...rowsEl.children].find((li) => !$('.kp__date input', li).value);
    if (firstEmpty) $('.kp__date input', firstEmpty).focus();
    save();
    track('keep_list', { category: b.dataset.keepCat });
  }));
  $('[data-keep-add]').addEventListener('click', () => { $('.kp__name input', row()).focus(); });
  $('[data-keep-forget]').addEventListener('click', () => { try { localStorage.removeItem(KEY); } catch (e) {} rowsEl.innerHTML = ''; row(); update(); });
  form.addEventListener('input', update); form.addEventListener('change', update);
  form.addEventListener('submit', (e) => e.preventDefault());

  let saved = null; try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
  if (saved && Array.isArray(saved.rows) && saved.rows.length) { yearly.checked = saved.yearly !== false; saved.rows.forEach(([n, d]) => row(n, d)); } else row();
  update();
})();
