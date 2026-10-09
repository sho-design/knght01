/* The reply scribe: drafts a public reply to a review that thanks, takes it offline and gives nothing away.
   Templates and rules only, no AI. It runs in the browser, and what you type stays there.
   For clinics and law firms the draft never confirms the reviewer was a patient or a client. */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const form = $('[data-reply]');
  if (!form) return;
  const out = $('[data-reply-out]'), ink = $('[data-reply-ink]'), edit = $('#reply-edit'), marked = $('[data-reply-marked]'), flagsEl = $('[data-reply-flags]'), whyEl = $('[data-reply-why]');
  const review = $('#reply-review', form);
  const catBtns = [...form.querySelectorAll('[data-reply-cat]')], starBtns = [...form.querySelectorAll('[data-reply-star]')];
  const track = (e, p) => { if (window.KNGHT_TRACK) window.KNGHT_TRACK(e, p); };
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const HEALTH = ['clinic', 'dental', 'medspa'];
  let cat = '', stars = 0, version = 0;
  const setCat = (c) => { cat = c; catBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.replyCat === c))); };
  const setStars = (n) => { stars = n; starBtns.forEach((b) => { const k = +b.dataset.replyStar; b.setAttribute('aria-pressed', String(k === n)); b.classList.toggle('is-lit', k <= n); }); };
  catBtns.forEach((b) => b.addEventListener('click', () => setCat(b.dataset.replyCat)));
  starBtns.forEach((b) => b.addEventListener('click', () => setStars(+b.dataset.replyStar)));
  try { const saved = localStorage.getItem('knght-cat'); if (saved) setCat(saved === 'coffee' ? 'food' : saved); } catch (e) {}

  // What the review talks about, so the draft can answer it without repeating it.
  const THEMES = {
    wait: /\b(wait(ed|ing)?|late|delay(ed)?|hours?|forever|on time|behind schedule)\b/i,
    price: /\b(price[sd]?|pricing|cost(ly|s)?|expensive|overcharg\w*|bill(ed|ing)?|fees?|charg(e|ed|es)|invoice|money|rip[- ]?off)\b|\$/i,
    staff: /\b(rude|unprofessional|attitude|dismissive|ignored|condescending|staff|reception(ist)?|front desk|friendly|kind|lovely|helpful|caring|nice)\b/i,
    pain: /\b(pain(ful)?|hurt|sore|bruis\w*|swelling|didn'?t work|botched|worse|side effects?)\b/i,
    booking: /\b(call(ed|s|back)?|phone|voicemail|book(ing|ed)?|reschedul\w*|cancel\w*|no answer|email(ed)?|message[sd]?)\b/i,
    clean: /\b(dirty|unclean|clean(liness)?|hygien\w*|smell\w*|gross)\b/i,
    food: /\b(cold|taste[sd]?|bland|food|meal|dish|coffee|order|served|undercooked|stale)\b/i,
  };
  const pick = (arr, slot) => arr[(version + slot) % arr.length];

  const draft = () => {
    const conf = HEALTH.includes(cat) || cat === 'law';
    const health = HEALTH.includes(cat), law = cat === 'law';
    const text = review.value || '';
    const has = (k) => THEMES[k].test(text);
    const reach = (form.reach.value || '').trim();
    const sign = (form.sign.value || '').trim() || 'The team';
    const contact = reach ? (/@|\d|\.[a-z]{2,}/i.test(reach) ? `Please contact us at ${reach}` : `Please reach us through ${reach}`) : 'Please get in touch with us directly';
    const lines = [];

    if (stars >= 4) {
      lines.push(pick(['Thank you for taking the time to write this.', 'Thank you for the kind words.', 'This made our day. Thank you for writing it.'], 0));
      lines.push(conf
        ? pick(['We work hard to make everyone who comes to us feel looked after, and it means a lot to see that noticed.', 'Our team takes real care with everyone who walks through the door, and they’ll be glad to hear this.'], 1)
        : pick(['We’re so glad you enjoyed your visit.', 'It’s great to hear you had a good time with us.'], 1));
      if (!conf && has('staff')) lines.push('We’ll make sure the team sees this.');
      lines.push(conf ? 'We’re grateful you shared it.' : pick(['We hope to see you again soon.', 'See you next time.'], 2));
    } else {
      lines.push(stars === 3
        ? pick(['Thank you for the honest feedback.', 'Thank you for taking the time to write this.'], 0)
        : pick(['We’re sorry to read this.', 'Thank you for telling us, and we’re sorry to read this.'], 0));
      lines.push(stars === 3
        ? 'We read every review, and this one is going to the team.'
        : pick(['That isn’t the experience we want anyone to have.', 'It isn’t what we want for anyone who comes to us.'], 1));
      // Answer at most the two things they raised first, so the reply stays short.
      const said = [];
      if (has('wait')) said.push(pick(['Waiting is frustrating, and keeping to time is something we keep working on.', 'Nobody likes to wait, and we’re looking at how we keep the day on time.'], 2));
      if (has('staff')) said.push('Everyone who contacts us should be treated with care and respect, and we take this seriously.');
      if (has('price')) said.push(conf ? `We want fees to be clear before ${law ? 'any work' : 'anything'} begins, and we’re always glad to go through them.` : 'We want our prices to be clear up front.');
      if (health && has('pain')) said.push('Everyone’s experience is different, and concerns like this are best talked through directly.');
      if (has('booking')) said.push('Getting through to us should be easy, and we’re looking at how we handle calls and messages.');
      if (has('clean')) said.push('Cleanliness matters to us, and we’re looking into this right away.');
      if (cat === 'food' && has('food')) said.push('We’ll share this with the kitchen.');
      lines.push(...said.slice(0, 2));
      if (conf && stars <= 2) lines.push(`We can’t discuss anyone’s ${law ? 'matter' : 'care'} in a public forum, to protect everyone’s privacy. We’d still like to hear more.`);
      lines.push(stars === 3
        ? `If you’re open to it, we’d like to hear more. ${contact}.`
        : conf ? `${contact}, and we’ll take it from there.` : `We’d like to make this right. ${contact}, and we’ll take it from there.`);
    }
    return lines.join(' ') + '\n\n' + sign;
  };

  // Why the draft is shaped the way it is.
  const why = () => {
    const health = HEALTH.includes(cat), law = cat === 'law', items = [];
    if (health) items.push(['No sign they’re a patient', 'Under Ontario’s health privacy law (PHIPA), confirming that someone is a patient can itself disclose personal health information, even when they posted first. Colleges expect the same care in public replies.']);
    if (law) items.push(['No sign they’re a client', 'A lawyer’s duty of confidentiality covers the fact that someone consulted or retained you, not only what was said.']);
    items.push(health || law
      ? ['No details from the review', `No ${law ? 'matter' : 'treatment'}, date or fee goes back into public, even if the reviewer mentioned it.`]
      : ['No details about their order or bill', 'Keep the specifics for the private conversation. The public reply is for the next customer reading it.']);
    if (stars <= 3) {
      items.push(['No argument', 'It acknowledges, says what you’re doing about it and moves the conversation somewhere private.']);
      items.push(['No offer for a better review', 'Nothing is traded for changing or removing a review. Google’s review policies don’t allow incentives.']);
    } else items.push(['No sales pitch', 'A thank-you that turns into an ad reads like one. Short is better.']);
    whyEl.innerHTML = items.map(([b, s]) => `<li><b>${b}</b><span>${s}</span></li>`).join('');
  };

  // Live read of the edited reply: anything risky is struck through, with the reason.
  const CONF_RULES = [
    { re: /\b(your|the|his|her|their) (treatments?|procedures?|appointments?|sessions?|injections?|fillings?|crowns?|cleanings?|extractions?|surgery|chart|file|records?|diagnosis|prescriptions?|medications?|results?|consultations?|assessments?|botox|fillers?|case|matter|retainer|claim|settlement|hearing)\b/gi,
      t: 'Confirms the relationship', why: (law) => law ? 'Naming their case or matter confirms they were a client.' : 'Naming their treatment, appointment or chart confirms they were a patient.' },
    { re: /\bas (your|their) (doctor|dentist|nurse|physician|provider|practitioner|hygienist|injector|surgeon|lawyer|counsel|paralegal)\b/gi,
      t: 'Confirms the relationship', why: (law) => law ? 'This says you acted for them.' : 'This says you treated them.' },
    { re: /\b(we|i) (have )?(reviewed|checked|looked at|looked into|pulled|went through) (your|the|their) (chart|file|records?|notes|history)\b/gi,
      t: 'Reveals a record', why: () => 'Saying you checked their records confirms there are records to check.' },
    { re: /\b(when|after|during) (you|your) (came in|visited|were here|were seen|visit|appointment)\b|\byou (came in|visited us|were seen|were here)\b/gi,
      t: 'Confirms a visit', why: () => 'This places them with you. Speak to everyone, not to them.' },
    { re: /\b(on|last) (monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b|\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sept?|oct|nov|dec)\.? \d{1,2}\b/gi,
      t: 'A date', why: () => 'A date ties the reply to a specific visit.' },
    { re: /\b(ohip|insurance|insurer|benefits|invoice|balance|billing|bill)\b/gi,
      t: 'Billing details', why: () => 'Money and insurance details belong to their file. Keep them out of public.' },
  ];
  const ALL_RULES = [
    { re: /\b(actually|in fact|untrue|false|lying|liar|never happened)\b|\bthat'?s not true\b|\byou were (rude|late|aggressive|abusive)\b|\byou (failed|refused|didn'?t)\b/gi,
      t: 'Arguing', why: () => 'Even when you’re right, arguing in public reads badly to the next person. Take it offline.' },
    { re: /\b(remove|delete|take down|change|update|edit|revise)\b[^.!?]{0,40}\breview\b/gi,
      t: 'Asking them to change the review', why: () => 'Asking for a review to come down, especially with an offer attached, can break Google’s review policies. Fix the problem and let them decide.' },
    { re: /\b(discount|gift card|coupon|voucher|store credit|free (visit|session|treatment|meal|drink|coffee|consult(ation)?))\b|\d+\s?% off\b/gi,
      t: 'An incentive', why: () => 'An offer in a public reply can look like paying for a better review, which Google’s policies don’t allow.' },
  ];
  const read = () => {
    const v = edit.value, conf = HEALTH.includes(cat) || cat === 'law', law = cat === 'law';
    const rules = (conf ? CONF_RULES : []).concat(ALL_RULES);
    const hits = [];
    rules.forEach((r) => { r.re.lastIndex = 0; let m; while ((m = r.re.exec(v))) hits.push({ s: m.index, e: m.index + m[0].length, w: m[0], r }); });
    hits.sort((a, b) => a.s - b.s);
    const kept = []; hits.forEach((h) => { if (!kept.length || h.s >= kept[kept.length - 1].e) kept.push(h); });
    marked.hidden = !kept.length;
    if (!kept.length) { flagsEl.innerHTML = ''; return; }
    let html = '', at = 0;
    kept.forEach((h, k) => { html += esc(v.slice(at, h.s)) + `<mark class="ck__hit"><s>${esc(h.w)}</s><sup>${k + 1}</sup></mark>`; at = h.e; });
    marked.innerHTML = html + esc(v.slice(at));
    flagsEl.innerHTML = kept.map((h, k) => `<li class="ck__item"><span class="ck__n">${k + 1}</span><div><p class="ck__t"><b>${esc(h.w)}</b> · ${h.r.t}</p><p>${h.r.why(law)}</p></div></li>`).join('');
  };
  edit.addEventListener('input', read);

  // The draft is inked onto the page a word at a time.
  const inkIn = (txt) => {
    let i = 0;
    ink.innerHTML = txt.split('\n\n').map((para) => `<p>${para.split(/(\s+)/).map((w) => (/\s/.test(w) ? w : `<span style="--i:${i++}">${esc(w)}</span>`)).join('')}</p>`).join('');
    ink.classList.remove('is-inking'); void ink.offsetWidth;
    if (!reduce) ink.classList.add('is-inking');
  };

  const status = (() => { const p = document.createElement('p'); p.className = 'rp__status'; p.setAttribute('aria-live', 'polite'); $('.ck__actions', form).after(p); return p; })();
  const run = () => {
    if (!stars) { status.textContent = 'Pick their star rating first.'; starBtns[0].focus(); return; }
    if (!cat) setCat('other');
    status.textContent = '';
    const txt = draft();
    out.hidden = false;
    inkIn(txt);
    edit.value = txt; read(); why();
    out.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    track('reply_draft', { category: cat, stars });
  };
  form.addEventListener('submit', (e) => { e.preventDefault(); version = 0; run(); });
  $('[data-reply-again]').addEventListener('click', () => { version++; run(); });
  $('[data-reply-example]', form).addEventListener('click', () => {
    setCat('clinic'); setStars(2);
    review.value = 'Waited 45 minutes past my appointment time and the receptionist was dismissive when I asked why. The Botox results were fine but I won’t be back.';
    form.sign.value = 'The team at the clinic'; form.reach.value = 'hello@yourclinic.ca';
    version = 0; run();
  });
  const copyBtn = $('[data-reply-copy]');
  copyBtn.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(edit.value); copyBtn.textContent = 'Copied'; setTimeout(() => { copyBtn.textContent = 'Copy the reply'; }, 2000); track('reply_copy', { category: cat, stars }); }
    catch (e) { edit.focus(); edit.select(); }
  });
})();
