/* The claim checker: paste a line of marketing, pick a category, and see the words a regulator or a
   platform is most likely to question. It runs in the browser. Nothing is sent unless the visitor asks
   for the report. It is a first read, not legal advice: a flag means look again, not that it is illegal. */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const form = $('[data-check]');
  if (!form) return;
  const text = $('#check-text', form), out = $('[data-check-out]'), list = $('[data-check-list]'), mark = $('[data-check-marked]'), sum = $('[data-check-sum]');
  const catBtns = [...form.querySelectorAll('[data-check-cat]')];
  const track = (e, p) => { if (window.KNGHT_TRACK) window.KNGHT_TRACK(e, p); };
  const R = (p) => '/rules/' + p + '/';

  // Each rule: the categories it applies to, the pattern, what to look at, where the rule comes from, and a safer way to say it.
  const ALL = ['clinic', 'dental', 'medspa', 'law', 'spirits', 'food', 'other'];
  const HEALTH = ['clinic', 'dental', 'medspa'];
  const RULES = [
    { cats: ALL, re: /\bguarantee(d|s)?\b|\b100\s?%\s+(results?|satisfaction|effective|safe)/gi,
      t: 'A guarantee', why: 'A promised result has to be provable for every customer. Health colleges do not allow guaranteed outcomes at all.', src: 'Competition Act; CPSO, RCDSO and CNO advertising rules', fix: 'Say what you do, and that results vary.' },
    { cats: ALL, re: /(?<!\w)(best|#\s?1|number one|no\.\s?1|top[- ]rated|leading|unbeatable|world[- ]class)\b/gi,
      t: 'A superlative', why: 'Best, number one and leading are comparisons you would have to prove. Health and legal regulators restrict claims of superiority.', src: 'Competition Act; college and Law Society marketing rules', fix: 'Replace it with a specific, checkable fact.' },
    { cats: ALL, re: /\b(eco[- ]friendly|environmentally friendly|green|sustainable|carbon[- ]neutral|net[- ]zero|planet[- ]friendly)\b/gi,
      t: 'An environmental claim', why: 'Since 2024 the Competition Act expects environmental claims to be backed by adequate and proper testing or substantiation.', src: 'Competition Act (2024 amendments)', fix: 'Name the specific thing you did, such as the material or the percentage.' },
    { cats: ALL, re: /\b(starting at|starts at|from)\s*\$\s?\d+|\$\s?\d+\s*\+\s*(fees|tax)/gi,
      t: 'A from-price', why: 'Advertising a price that leaves out fees the buyer must pay is drip pricing.', src: 'Competition Act, drip pricing', fix: 'Show the full price including any fee that cannot be avoided.' },
    { cats: ALL, re: /\b(today only|this week only|this weekend only|last chance|ends tonight|only \d+ (spots|left)|hurry|act now)\b/gi,
      t: 'Urgency', why: 'Fine when it is true. A deadline or limit that keeps resetting can be misleading.', src: 'Competition Act', fix: 'Keep it only if the date or number is real.' },
    // Health
    { cats: HEALTH, re: /\b(painless|pain[- ]free|no pain|won'?t hurt|doesn'?t hurt)\b/gi,
      t: 'A promise of no pain', why: 'Comfort varies by person, and an outcome cannot be promised.', src: 'CPSO, RCDSO and CNO advertising rules', fix: 'Describe what you do for comfort, such as numbing or a gentle technique.' },
    { cats: HEALTH.concat('food'), re: /\b(cures?|cured|heals?|healed|reverses?|eliminates?|permanent(ly)?|detox(es|ify)?)\b/gi,
      t: 'A cure or permanent result', why: 'Treatment and health claims have to be supported and cannot promise a cure. For food, disease and detox claims are tightly limited.', src: 'Health Canada; college advertising rules; Food and Drugs Act', fix: 'Say what the service or product is, not what it will cure.' },
    { cats: HEALTH, re: /\b(risk[- ]free|no side effects|no downtime|completely safe|100% safe|totally safe)\b/gi,
      t: 'A safety absolute', why: 'Every treatment has some risk. Absolute safety claims leave out information a patient needs.', src: 'CPSO, CNO and Health Canada', fix: 'Say that a clinician will explain the risks at the consult.' },
    { cats: HEALTH, re: /\b(testimonials?|patients? (say|love)|our patients rave|five[- ]star reviews?|before (and|&) after)\b/gi,
      t: 'Testimonials or before-and-afters', why: 'Health colleges restrict testimonials, and before-and-after images need consent and must not mislead.', src: 'CPSO, RCDSO and CNO advertising rules', fix: 'Check your own college’s rule before you use either.' },
    { cats: HEALTH, re: /\b(\d+\s?%\s?off|discount(ed)?|half price|bogo|buy one get one|promo(tion)?s?)\b/gi,
      t: 'A discount or inducement', why: 'Some colleges limit discounts, time-limited offers and inducements for health services.', src: 'College advertising and professional misconduct rules', fix: 'Check your college before running a price promotion.' },
    { cats: ['medspa', 'clinic'], re: /\b(botox|dysport|xeomin|daxxify|ozempic|wegovy|mounjaro|zepbound|semaglutide|tirzepatide)\b/gi,
      t: 'A prescription drug by name', why: 'To the public, a prescription drug ad is limited to its name, price and quantity. Claims about what it does fall outside that.', src: 'Food and Drug Regulations, C.01.044', fix: 'Name, price and quantity only. Talk about the consult instead.', more: R('medspa-prescription-drug-ads') },
    { cats: ['clinic', 'dental', 'medspa', 'law'], re: /\b(specialists?|speciali[sz](e|es|ing|ed) in|experts?)\b/gi,
      t: 'Specialist or expert', why: 'Specialist is a protected title for dentists, doctors and lawyers. Only those certified may use it.', src: 'RCDSO, CPSO and Law Society of Ontario rules', fix: 'Say "focused on" or "our practice includes" unless you hold the certification.', more: R('lawyers-and-the-word-specialist') },
    // Law
    { cats: ['law'], re: /\b(we (always )?win|winning record|never lose|\d+\s?%\s?(success|win) rate|maximum compensation)\b/gi,
      t: 'A promise of results', why: 'Past results do not predict a client’s outcome, and marketing must not create unjustified expectations.', src: 'Law Society of Ontario, Rules of Professional Conduct 4.2', fix: 'Describe the kinds of matters you handle instead.' },
    { cats: ['law'], re: /\b(no win,? no fee|no fee unless)\b/gi,
      t: 'Contingency terms', why: 'Allowed, but the terms have to be clear, including what the client still pays.', src: 'Law Society of Ontario; Solicitors Act', fix: 'Add what is and is not included, such as disbursements.' },
    // Spirits
    { cats: ['spirits'], re: /\b(strongest|extra strong|high[- ]proof|more alcohol|\d{2,3}\s?proof|gets? you (drunk|buzzed)|wasted|hammered)\b/gi,
      t: 'Strength as a selling point', why: 'Alcohol ads may not present strength or intoxication as a reason to buy.', src: 'AGCO advertising standards; CRTC alcohol code', fix: 'State the ABV plainly on the label and lead with taste or craft.', more: R('alcohol-ads-strength-and-success') },
    { cats: ['spirits'], re: /\b(success(ful)?|confidence|confident|irresistible|sexy|seduc\w*|life of the party|win (her|him)|get the girl|get lucky)\b/gi,
      t: 'Social or personal success', why: 'Alcohol ads may not suggest that drinking brings social, sexual or business success.', src: 'AGCO advertising standards; CRTC alcohol code', fix: 'Talk about the drink, the place or the occasion, not what it does for the drinker.', more: R('alcohol-ads-strength-and-success') },
    { cats: ['spirits'], re: /\b(students?|teens?|kids|back to school|spring break|frosh)\b/gi,
      t: 'An appeal to young people', why: 'Alcohol ads may not appeal to people under the legal drinking age.', src: 'AGCO advertising standards', fix: 'Remove it.' },
    { cats: ['spirits'], re: /\b(healthy|good for you|relax(es|ing)?|stress relief|helps you sleep|calming)\b/gi,
      t: 'A health or mood benefit', why: 'Alcohol ads may not claim health, therapeutic or calming benefits.', src: 'AGCO advertising standards; CRTC alcohol code', fix: 'Remove it.' },
    { cats: ['spirits'], re: /\b(drive|driving|road trip|behind the wheel|on the job)\b/gi,
      t: 'Alcohol near driving or work', why: 'Ads may not link drinking to driving or activities that need care and skill.', src: 'AGCO advertising standards; CRTC alcohol code', fix: 'Move it away from any vehicle or task.' },
    // Food
    { cats: ['food'], re: /\b(low[- ]fat|fat[- ]free|sugar[- ]free|no sugar added|low[- ]sodium|high (in )?protein|source of fibre|light|lite|zero calories?)\b/gi,
      t: 'A nutrient content claim', why: 'Terms like low fat, sugar free and source of fibre have set criteria and wording.', src: 'CFIA and the Food and Drug Regulations', fix: 'Check the product meets the criteria before using the term.' },
    { cats: ['food'], re: /\b(boosts? (your )?immun\w*|superfood|fat[- ]burning|burns fat|anti[- ]inflammatory|prevents?|lowers? (your )?cholesterol)\b/gi,
      t: 'A health claim', why: 'Function and disease risk claims for food are limited to approved wording.', src: 'Health Canada; Food and Drug Regulations', fix: 'Describe taste, ingredients and origin instead.' },
    { cats: ['food'], re: /\b(natural|all[- ]natural|organic|local|locally sourced|product of canada|made in canada|handmade|homemade)\b/gi,
      t: 'An origin or method claim', why: 'Natural, organic, local and made in Canada each have CFIA guidance. Organic needs certification.', src: 'CFIA labelling guidance; Canada Organic Regime', fix: 'Check the definition, or be specific: "beans roasted in Toronto".' },
  ];

  let cat = '';
  const setCat = (c) => { cat = c; catBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.checkCat === c))); };
  catBtns.forEach((b) => b.addEventListener('click', () => { setCat(cat === b.dataset.checkCat ? '' : b.dataset.checkCat); if (out && !out.hidden) run(); }));
  try { const saved = localStorage.getItem('knght-cat'); if (saved) setCat(saved === 'coffee' ? 'food' : saved); } catch (e) {}

  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const run = () => {
    const v = text.value.trim();
    if (!v) { text.focus(); return; }
    const c = cat || 'other';
    const hits = [];
    RULES.forEach((r, ri) => {
      if (!r.cats.includes(c) && !(c === 'other' && r.cats === ALL)) return;
      r.re.lastIndex = 0;
      let m;
      while ((m = r.re.exec(v))) { hits.push({ s: m.index, e: m.index + m[0].length, w: m[0], r, ri }); if (!m[0].length) r.re.lastIndex++; }
    });
    hits.sort((a, b) => a.s - b.s || b.e - a.e);
    const kept = []; let end = -1;
    hits.forEach((h) => { if (h.s >= end) { kept.push(h); end = h.e; } });
    // The text, with each flagged phrase struck and numbered
    let html = '', at = 0;
    kept.forEach((h, k) => { html += esc(v.slice(at, h.s)) + `<mark class="ck__hit"><s>${esc(h.w)}</s><sup>${k + 1}</sup></mark>`; at = h.e; });
    mark.innerHTML = html + esc(v.slice(at));
    list.innerHTML = kept.map((h, k) => `<li class="ck__item"><span class="ck__n">${k + 1}</span><div><p class="ck__t"><b>${esc(h.w)}</b> · ${h.r.t}</p><p>${h.r.why}</p><p class="ck__fix"><span>Try:</span> ${h.r.fix}</p><p class="ck__src">${h.r.src}${h.r.more ? ` · <a class="link" href="${h.r.more}">Read the rule</a>` : ''}</p></div></li>`).join('');
    sum.textContent = kept.length
      ? `${kept.length} ${kept.length === 1 ? 'phrase' : 'phrases'} to look at again${cat ? '' : '. Pick your category for the rules that apply to you'}.`
      : `Nothing flagged${cat ? '' : ' by the general rules. Pick your category for a closer read'}. That is a good start, not a clearance.`;
    out.hidden = false;
    out.classList.toggle('is-clean', !kept.length);
    track('claim_check', { category: c, flags: kept.length });
    out.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  };
  form.addEventListener('submit', (e) => { e.preventDefault(); run(); });

  const EX = {
    medspa: 'Painless Botox by our expert injectors. Guaranteed results with no downtime. 20% off this week only!',
    clinic: 'Toronto’s best physio clinic. Our specialists cure back pain permanently. Patients say we’re #1.',
    dental: 'Pain-free dentistry from the leading cosmetic dental specialist. Before and after photos inside.',
    law: 'Ontario’s top-rated injury lawyers. We always win. No win, no fee. Specialists in car accidents.',
    spirits: 'The strongest rum in Ontario. Confidence in every bottle. Perfect for spring break.',
    food: 'All-natural superfood bowls that boost immunity. Sugar-free, locally sourced and eco-friendly.',
    other: 'The best service in the city, guaranteed. Starting at $99. Hurry, ends tonight.',
  };
  const exBtn = $('[data-check-example]');
  if (exBtn) exBtn.addEventListener('click', () => { text.value = EX[cat || 'other']; run(); });

  // The full report, by email
  const lead = $('[data-check-lead]');
  if (lead) lead.addEventListener('submit', async (e) => {
    e.preventDefault();
    const st = $('[data-check-status]', lead), email = $('#ck-email', lead), consent = $('#ck-consent', lead);
    if (!email.checkValidity() || !consent.checked) { st.textContent = 'Add your email and tick the box.'; return; }
    st.textContent = 'Sending…';
    try {
      const res = await fetch(lead.dataset.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ _subject: `Claim check: ${cat || 'other'}`, email: email.value, consent: true, category: cat || 'other', text: text.value.slice(0, 2000) }) });
      if (!res.ok) throw new Error(res.status);
      st.textContent = 'Sent. Sergio will read it and reply within one business day.';
      track('generate_lead', { lead_source: 'claim_check', category: cat || 'other' });
      lead.reset();
    } catch (err) { st.textContent = 'That did not go through. Email sho@knght.com instead.'; }
  });
})();
