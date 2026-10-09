/* The plain-speech test: strikes machine-sounding words, filler, long sentences and dashes, scores the copy,
   and offers a plainer version made by simple, predictable swaps. Rules only, no AI. What you type stays in the browser. */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const form = $('[data-plain]');
  if (!form) return;
  const text = $('#plain-text'), out = $('[data-plain-out]'), marked = $('[data-plain-marked]'), list = $('[data-plain-list]'), sum = $('[data-plain-sum]'), meta = $('[data-plain-meta]'), plainEl = $('[data-plain-plain]'), dial = $('[data-plain-dial]');
  const track = (e, p) => { if (window.KNGHT_TRACK) window.KNGHT_TRACK(e, p); };
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // [pattern, kind, the plainer word ('' cuts it, null leaves it for a person)]
  const SWAP = [
    ['elevate[sd]?|elevating', 'improve'], ['seamless(ly)?', 'smooth'], ['unlock(s|ed|ing)?', null], ['delv(e|es|ed|ing)( into)?', 'look at'],
    ['leverag(e|es|ed|ing)', 'use'], ['utili[sz](e|es|ed|ing)', 'use'], ['robust', 'strong'], ['cutting[- ]edge', 'new'], ['state[- ]of[- ]the[- ]art', 'modern'],
    ['world[- ]class', ''], ['best[- ]in[- ]class', ''], ['tailored', 'personal'], ['bespoke', 'made to order'], ['holistic', 'whole'], ['synerg(y|ies)', 'teamwork'],
    ['empower(s|ed|ing)?', 'help'], ['curated', 'chosen'], ['innovative', ''], ['transformative', ''], ['unparalleled', ''], ['next[- ]level', ''],
    ['comprehensive', 'full'], ['streamlin(e|es|ed|ing)', 'simplify'], ['optimi[sz](e|es|ed|ing)', 'improve'], ['facilitat(e|es|ed|ing)', 'help'],
    ['endeavou?r', 'try'], ['commenc(e|es|ed|ing)', 'start'], ['prior to', 'before'], ['in order to', 'to'], ['due to the fact that', 'because'],
    ['at this point in time', 'now'], ['a wide range of', 'many'], ['a variety of', 'many'], ['solutions', null], ['game[- ]changer', null],
    ['embark(s|ed|ing)? on', 'start'], ['foster(s|ed|ing)?', 'build'], ['boasts', 'has'], ['nestled', 'set'], ['navigat(e|es|ing) the', 'handle the'],
    ['(the )?(digital )?landscape', null], ['realm', null], ['tapestry', null], ['testament to', 'proof of'], ['journey', null],
    ['look no further', ''], ['(we(\'|’)re|we are) passionate about', 'we care about'], ['passionate about', 'care about'], ['it(\'|’)s (important|worth) (to note|noting) that', ''], ['in today(\'|’)s fast[- ]paced world,?', ''],
    ['take your [a-z]+ to the next level', null], ['dive (deep|deeper|into)', 'look at'], ['ever[- ]evolving', 'changing'], ['one[- ]stop[- ]shop', null],
  ];
  const FILL = ['very', 'really', 'just', 'actually', 'basically', 'truly', 'incredibly', 'extremely', 'absolutely', 'literally', 'simply', 'totally'];
  const RULES = [];
  SWAP.forEach(([p, to]) => RULES.push({ re: new RegExp(`\\b(${p})\\b`, 'gi'), kind: 'Machine word', why: to === null ? 'Says little. Name the actual thing.' : to ? `Try: ${to}.` : 'Cut it. The sentence stands without it.', to }));
  RULES.push({ re: new RegExp(`\\b(${FILL.join('|')})\\b ?`, 'gi'), kind: 'Filler', why: 'Cut it. Nothing is lost.', to: '' });
  RULES.push({ re: /\s?(—|–|--)\s?/g, kind: 'Dash', why: 'Use a full stop or a comma.', to: ', ' });
  RULES.push({ re: /!{2,}/g, kind: 'Shouting', why: 'One is plenty. None is calmer.', to: '.' });
  RULES.push({ re: /\b(not (just|only) [^,.;]{1,40}, but)\b/gi, kind: 'Formula', why: '“Not just X, but Y” is a tell. Say Y.', to: null });
  RULES.push({ re: /\b((is|are|was|were|be|been|being) (\w+ly )?\w+ed)\b(?! (to|that))/gi, kind: 'Passive', why: 'Say who does it.', to: null });

  const count = (t) => (t.match(/[A-Za-z0-9’']+/g) || []).length;
  const syl = (w) => { w = w.toLowerCase().replace(/[^a-z]/g, ''); if (w.length <= 3) return 1; w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, ''); const m = w.match(/[aeiouy]{1,2}/g); return m ? m.length : 1; };
  const read = (v) => {
    const hits = [];
    RULES.forEach((r) => { r.re.lastIndex = 0; let m; while ((m = r.re.exec(v))) { if (!m[0].trim()) continue; hits.push({ s: m.index, e: m.index + m[0].length, w: m[0], r }); } });
    // Long sentences, marked whole.
    const sentRe = /[^.!?\n]+[.!?]*/g; let sm; const sentences = [];
    while ((sm = sentRe.exec(v))) { const n = count(sm[0]); if (n) sentences.push(n); if (n > 25) hits.push({ s: sm.index + (sm[0].length - sm[0].trimStart().length), e: sm.index + sm[0].trimEnd().length, w: `${n} words`, r: { kind: 'Long sentence', why: 'Past 25 words people stop following. Split it in two.', to: null, long: true } }); }
    hits.sort((a, b) => a.s - b.s || (b.r.long ? 1 : -1));
    const kept = []; hits.forEach((h) => { if (h.r.long) { kept.push(h); return; } if (!kept.some((k) => !k.r.long && h.s < k.e && h.e > k.s)) kept.push(h); });
    return { kept, words: count(v), sentences };
  };
  // Keep the verb's ending when a word is swapped: leverages → uses, empowered → helped, fostering → building.
  const IRREG = { build: ['builds', 'built', 'building'], 'look at': ['looks at', 'looked at', 'looking at'] };
  const VERBS = ['improve', 'use', 'help', 'simplify', 'start', 'build', 'look at', 'try', 'handle the'];
  const conj = (m, to) => {
    const base = to.split(' ')[0], rest = to.slice(base.length), w = m.toLowerCase().split(/\s/)[0];
    if (!VERBS.some((v) => to.startsWith(v.split(' ')[0])) || /^(curated|tailored|nestled)$/.test(w)) return to;
    const form = /ing$/.test(w) ? 2 : /(ed|d)$/.test(w) && !/(eed)$/.test(w) ? 1 : /[^s]s$/.test(w) ? 0 : -1;
    if (form < 0) return to;
    const ir = IRREG[to] || IRREG[base]; if (ir) return IRREG[to] ? ir[form] : ir[form] + rest;
    const f = [base.replace(/y$/, 'ie') + 's', base.replace(/y$/, 'i').replace(/e$/, '') + 'ed', base.replace(/e$/, '') + 'ing'][form];
    return f + rest;
  };
  // The plainer version: apply the swaps and cuts, tidy the spaces and capitals.
  const plainer = (v) => {
    let o = v;
    RULES.forEach((r) => { if (r.to === null || r.to === undefined) return; o = o.replace(r.re, (m) => { if (!r.to) return ''; const t = conj(m, r.to); return /^[A-Z]/.test(m) ? t[0].toUpperCase() + t.slice(1) : t; }); });
    return o.replace(/([.!?])\s*[.!?]+/g, '$1').replace(/ {2,}/g, ' ').replace(/ ([,.;:!?])/g, '$1').replace(/,\s*,/g, ',').replace(/(^|[.!?]\s+)([a-z])/g, (m, a, b) => a + b.toUpperCase()).trim();
  };
  const run = () => {
    const v = text.value.trim();
    if (!v) return;
    const { kept, words, sentences } = read(v);
    const marks = kept.filter((h) => !h.r.long);
    // Score: start at 100, lose points per issue per hundred words, and for long average sentences.
    const per100 = (marks.length + kept.filter((h) => h.r.long).length * 2) / Math.max(1, words) * 100;
    const avg = sentences.length ? sentences.reduce((a, b) => a + b, 0) / sentences.length : 0;
    const score = Math.max(0, Math.min(100, Math.round(100 - per100 * 6 - Math.max(0, avg - 18) * 2)));
    const syls = (v.match(/[A-Za-z’']+/g) || []).reduce((a, w) => a + syl(w), 0);
    const grade = Math.max(1, Math.round(0.39 * (words / Math.max(1, sentences.length)) + 11.8 * (syls / Math.max(1, words)) - 15.59));
    sum.textContent = score >= 85 ? 'Plain and human. Ship it.' : score >= 65 ? 'Mostly plain. A few strikes and it’s there.' : score >= 40 ? 'It sounds more like a brochure than a person.' : 'This reads as if no one in particular wrote it.';
    meta.textContent = `${words} words · ${marks.length} strike${marks.length === 1 ? '' : 's'} · average sentence ${avg.toFixed(0)} words · reads at about grade ${grade}`;
    // Dial
    const C = 2 * Math.PI * 52;
    dial.innerHTML = `<svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="52" class="pl__track"/><circle cx="60" cy="60" r="52" class="pl__arc" style="stroke-dasharray:${C};stroke-dashoffset:${C};--to:${(C * (1 - score / 100)).toFixed(1)}"/></svg><span><b>${score}</b>plain</span>`;
    // Marked copy: strikes for words, a bracket for long sentences.
    let html = '', at = 0, n = 0;
    const longs = kept.filter((h) => h.r.long);
    marks.forEach((h) => { html += esc(v.slice(at, h.s)) + `<mark class="ck__hit"><s>${esc(h.w)}</s><sup>${++n}</sup></mark>`; at = h.e; });
    html += esc(v.slice(at));
    marked.innerHTML = html;
    const items = marks.map((h, k) => `<li class="ck__item"><span class="ck__n">${k + 1}</span><div><p class="ck__t"><b>${esc(h.w.trim())}</b> · ${h.r.kind}</p><p>${h.r.why}</p></div></li>`)
      .concat(longs.map((l) => `<li class="ck__item"><span class="ck__n">¶</span><div><p class="ck__t"><b>“${esc(v.slice(l.s, Math.min(l.e, l.s + 70)))}${l.e - l.s > 70 ? '…' : ''}”</b> · Long sentence, ${l.w}</p><p>${l.r.why}</p></div></li>`));
    list.innerHTML = items.join('');
    plainEl.textContent = plainer(v);
    out.hidden = false;
    out.classList.toggle('is-clean', !marks.length && !longs.length);
    requestAnimationFrame(() => { const arc = $('.pl__arc', dial); if (arc) arc.style.strokeDashoffset = arc.style.getPropertyValue('--to'); });
    out.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    track('plain_test', { band: score >= 85 ? 'plain' : score >= 65 ? 'close' : score >= 40 ? 'brochure' : 'machine' });
  };
  form.addEventListener('submit', (e) => { e.preventDefault(); run(); });
  $('[data-plain-example]').addEventListener('click', () => {
    text.value = 'Welcome to our clinic — where we elevate your wellness journey with a holistic, tailored approach! Our world-class team leverages cutting-edge technology in order to deliver seamless, comprehensive solutions that truly empower you to unlock your best self. Look no further!! We are passionate about providing an unparalleled experience that is designed to exceed your expectations at every step.';
    run();
  });
  $('[data-plain-copy]').addEventListener('click', async (e) => { try { await navigator.clipboard.writeText(plainEl.textContent); e.target.textContent = 'Copied'; setTimeout(() => { e.target.textContent = 'Copy the plainer version'; }, 2000); } catch (err) {} });
})();
