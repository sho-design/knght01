/* The cartographer: a guided Google Business Profile check. Each tick lights a road on the map;
   the score is weighted by what matters most; the fixes come out in order. Kept in this browser only. */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const form = $('[data-carto]');
  if (!form) return;
  const map = $('[data-carto-map]'), scoreEl = $('[data-carto-score]'), sumEl = $('[data-carto-sum]'), fixesEl = $('[data-carto-fixes]');
  const track = (e, p) => { if (window.KNGHT_TRACK) window.KNGHT_TRACK(e, p); };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const KEY = 'knght-carto';

  const GROUPS = [
    ['The basics', [
      ['verified', 10, 'Your profile is verified', 'Verify your profile. Until then, much of it can’t show.'],
      ['cat', 10, 'Your primary category is the most specific one that fits', 'Pick the most specific primary category for what you mainly do, such as “Cosmetic dentist” rather than “Dentist”.'],
      ['cat2', 5, 'You’ve added the other categories that apply', 'Add secondary categories for the other things you really do, and no more.'],
      ['name', 6, 'Your name matches your sign, with no extra keywords', 'Use your real name only. Keywords stuffed into the name break Google’s rules and can get a profile suspended.'],
      ['hours', 8, 'Your regular hours are right', 'Fix your hours. Wrong hours send people to a locked door, and they remember.'],
      ['holiday', 4, 'You set special hours for holidays', 'Set holiday hours ahead of each holiday.'],
      ['site', 6, 'Your website is linked', 'Link your website, to the page that fits best.'],
      ['book', 5, 'Your booking link is added', 'Add your booking link so people can book straight from the profile.'],
    ]],
    ['The words', [
      ['desc', 5, 'Your description says who you help and how, in plain words', 'Rewrite the description: who you help, what you do, where. Plain words, no links.'],
      ['services', 7, 'Your services are listed, each with a short description', 'List your services, each with a line on what it is.'],
      ['attrs', 3, 'Attributes are set, including accessibility', 'Set your attributes, especially accessibility. People look for them.'],
    ]],
    ['The pictures', [
      ['logo', 4, 'Your logo and cover photo are set', 'Add your logo and a cover photo.'],
      ['photos', 7, 'You have real photos of the outside, the inside and the team', 'Add real photos: the entrance so people can find you, the inside, the team. Skip stock photos.'],
      ['fresh', 3, 'You added a photo in the last month', 'Add a new photo each month.'],
    ]],
    ['The reviews', [
      ['ask', 8, 'You ask every happy client for a review', 'Ask every happy client. A sign at the desk makes it easy.', '/herald/', 'Make a review sign'],
      ['reply', 8, 'You reply to every review, good and bad', 'Reply to every review, without giving anything private away.', '/reply/', 'Draft a reply'],
      ['recent', 5, 'You got a review in the last month', 'Aim for a steady trickle of new reviews, not a burst once a year.'],
    ]],
    ['The news', [
      ['post', 3, 'You posted an update in the last month', 'Post an update each month: a new service, an offer, a change of hours.'],
    ]],
  ];
  const ITEMS = GROUPS.flatMap(([, it]) => it);
  const TOTAL = ITEMS.reduce((a, it) => a + it[1], 0);

  let saved = {}; try { saved = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) {}
  form.innerHTML = GROUPS.map(([g, items]) => `<fieldset class="ct__group"><legend>${g}</legend>${items.map(([id, w, label]) => `<label class="ct__item"><input type="checkbox" name="${id}"${saved[id] ? ' checked' : ''}><span class="ct__box" aria-hidden="true"></span><span class="ct__lab">${label}</span></label>`).join('')}</fieldset>`).join('');

  // The map: a pin in a town of streets. Each item owns one road, which lights when it's ticked.
  const ROADS = [
    'M20 150H380', 'M200 20V280', 'M40 60L360 250', 'M60 260L340 40', 'M20 95H180', 'M220 205H380', 'M110 20V140', 'M290 160V280',
    'M20 225Q120 200 175 250', 'M225 50Q280 100 380 75', 'M140 280Q160 210 120 160', 'M260 20Q240 90 280 140', 'M330 120H380V200',
    'M20 120H80V30', 'M60 180L130 280', 'M300 20L360 110', 'M150 40Q200 70 250 40', 'M150 260Q200 230 250 260', 'M40 30H90',
  ];
  map.innerHTML = `<svg viewBox="0 0 400 300" class="ct__svg"><rect x="1" y="1" width="398" height="298" rx="8" class="ct__frame"/>
    <g class="ct__streets">${ROADS.map((d) => `<path d="${d}"/>`).join('')}</g>
    <g class="ct__lit">${ROADS.map((d, i) => `<path d="${d}" pathLength="1" data-road="${i}"/>`).join('')}</g>
    <g class="ct__pin" data-pin><circle cx="200" cy="150" r="30" class="ct__halo"/><path d="M200 168C188 152 184 144 184 136a16 16 0 0 1 32 0c0 8-4 16-16 32z" class="ct__drop"/><circle cx="200" cy="136" r="5.5" class="ct__dot"/></g>
    <circle cx="200" cy="150" r="40" class="ct__ring" data-ring/></svg>`;
  const roads = [...map.querySelectorAll('[data-road]')], pin = $('[data-pin]', map), ring = $('[data-ring]', map);

  let shown = 0, raf = 0, logged = -1;
  const update = (first) => {
    const checks = Object.fromEntries(ITEMS.map(([id]) => [id, form[id].checked]));
    try { localStorage.setItem(KEY, JSON.stringify(checks)); } catch (e) {}
    const got = ITEMS.reduce((a, [id, w]) => a + (checks[id] ? w : 0), 0), score = Math.round(got / TOTAL * 100);
    ITEMS.forEach(([id], i) => roads[i % roads.length].classList.toggle('is-on', checks[id]));
    pin.style.setProperty('--s', (0.75 + score / 400).toFixed(3));
    map.classList.toggle('is-strong', score >= 80);
    sumEl.textContent = score >= 90 ? 'A full map. Keep it fresh each month.' : score >= 70 ? 'Strong. A few gaps left to close.' : score >= 40 ? 'Half drawn. The fixes below matter most.' : 'Mostly blank. Start with the first fix.';
    const missing = ITEMS.filter(([id]) => !checks[id]).sort((a, b) => b[1] - a[1]).slice(0, 5);
    fixesEl.innerHTML = missing.length ? missing.map(([, , , fix, href, cta]) => `<li>${fix}${href ? ` <a class="link" href="${href}">${cta}</a>` : ''}</li>`).join('') : '<li>Nothing left on the list. Check it again next month.</li>';
    cancelAnimationFrame(raf);
    if (reduce || first) { shown = score; scoreEl.textContent = score; }
    else { const from = shown, t0 = performance.now(); const step = (now) => { const p = Math.min(1, (now - t0) / 600); shown = Math.round(from + (score - from) * p); scoreEl.textContent = shown; if (p < 1) raf = requestAnimationFrame(step); }; raf = requestAnimationFrame(step); }
    const band = Math.floor(score / 20) * 20;
    if (!first && band !== logged) { logged = band; track('carto_check', { band }); }
  };
  form.addEventListener('change', () => update(false));
  form.addEventListener('submit', (e) => e.preventDefault());
  update(true);
})();
