/* KNGHT interactive layer: category reading, red pen, scorecard, seal, intake,
   ink reveals, world films, scroll-driven hero and the 3D knight. Plain JS. */
(() => {
  const SCRIPT_SRC = (document.currentScript && document.currentScript.src) || location.href;
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} },
  };
  const meta = (name) => { const m = document.querySelector(`meta[name="${name}"]`); return m ? m.content.trim() : ''; };
  const ready = (v) => v && !v.includes('%%');
  const esc = (t) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---------- Hosted media (Higgsfield CDN; scripts/localize-assets.sh swaps these for local copies) ---------- */
  const FILMS = {
    'restoration-medical': 'https://d2ol7oe51mr4n9.cloudfront.net/user_2vgr4LDcTnBdquYG4fMZ396AWcW/850eb902-d4a5-424e-a6cc-84a3ba62df2b.mp4',
    'black-lotus-coffee': 'https://d2ol7oe51mr4n9.cloudfront.net/user_2vgr4LDcTnBdquYG4fMZ396AWcW/9bc2161b-3fbe-4d64-9aa9-a550d24089dd.mp4',
    'castleblack-spirits': 'https://d2ol7oe51mr4n9.cloudfront.net/user_2vgr4LDcTnBdquYG4fMZ396AWcW/855d452e-bd6f-46b8-9a09-a593c1dd1f1a.mp4',
    'toronto-beauty': 'https://d2ol7oe51mr4n9.cloudfront.net/user_2vgr4LDcTnBdquYG4fMZ396AWcW/9b9465fa-41d8-471f-a259-18a3fc986ee6.mp4',
    'lorelyns': 'https://d2ol7oe51mr4n9.cloudfront.net/user_2vgr4LDcTnBdquYG4fMZ396AWcW/bbc35de0-9c24-4720-b5e1-b2a367da6c03.mp4',
    'rum-raiders-ring': 'https://d2ol7oe51mr4n9.cloudfront.net/user_2vgr4LDcTnBdquYG4fMZ396AWcW/7e9912bd-d83f-470c-9145-8b3ebac372e0.mp4',
    'lisa-dang-immigration-law': 'https://d2ol7oe51mr4n9.cloudfront.net/user_2vgr4LDcTnBdquYG4fMZ396AWcW/eb0e5300-7279-422e-a9a3-9f34c33f7b67.mp4',
  };

  /* ---------- Categories: the page reads itself against your rules ---------- */
  const CATS = {
    clinic: {
      reg: 'CPSO and Health Canada',
      rules: 'Read against CPSO advertising rules, Health Canada and PHIPA.',
      law: 'For clinics: CPSO advertising rules, Health Canada drug and device advertising, PHIPA and the Competition Act.',
    },
    medspa: {
      reg: 'CPSO, CNO and Health Canada',
      rules: 'Read against CPSO and CNO rules, Health Canada drug advertising and the Competition Act.',
      law: 'For medspas: CPSO and CNO rules, Health Canada limits on prescription drug advertising, and the Competition Act.',
    },
    law: {
      reg: 'Law Society of Ontario',
      rules: "Read against the Law Society of Ontario's marketing rules and the Competition Act.",
      law: "For law firms: the Law Society of Ontario's Rules of Professional Conduct on marketing, and the Competition Act.",
    },
    spirits: {
      reg: 'AGCO, CRTC and CFIA',
      rules: 'Read against AGCO advertising standards, the CRTC alcohol code and CFIA labelling.',
      law: 'For spirits: AGCO liquor advertising standards, the CRTC Code for Broadcast Advertising of Alcoholic Beverages, CFIA labelling and LCBO listing rules.',
    },
    coffee: {
      reg: 'CFIA and Competition Act',
      rules: 'Read against CFIA labelling and the Competition Act, including its rules on green claims.',
      law: 'For coffee: CFIA food labelling, the Competition Act, and its rules on environmental and sourcing claims.',
    },
    food: {
      reg: 'CFIA and Health Canada',
      rules: 'Read against CFIA allergen and claim rules, Health Canada and the Competition Act.',
      law: 'For food: CFIA allergen labelling and free-from claims, Health Canada nutrition and health claims, and the Competition Act.',
    },
  };
  const catBtns = $$('.cats [data-cat]');
  const rulesEl = $('[data-cat-rules]');
  const lawEl = $('[data-cat-law]');
  const regEl = $('[data-cat-reg]');
  const track = $('.worlds__track');
  const cards = track ? $$('.world', track) : [];
  const originalOrder = cards.slice();
  const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
  let rpTouched = false;

  const setCategory = (cat, { persist = true } = {}) => {
    const c = CATS[cat] ? cat : null;
    root.dataset.cat = c || '';
    catBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.cat === c)));
    if (rulesEl) rulesEl.textContent = c ? CATS[c].rules : 'Pick your category. The page reads itself against your rules.';
    if (lawEl) { lawEl.hidden = !c; lawEl.textContent = c ? CATS[c].law : ''; }
    if (regEl) regEl.textContent = c ? CATS[c].reg : "your regulator's";
    if (track && cards.length) {
      const match = (el) => c && el.dataset.cats.split(' ').includes(c);
      const order = c ? [...originalOrder.filter(match), ...originalOrder.filter((e) => !match(e))] : originalOrder;
      order.forEach((el, i) => {
        track.appendChild(el);
        el.classList.toggle('is-match', !!match(el));
        const n = $('.world__n', el); if (n) n.textContent = roman[i];
      });
      if (window.KNGHT) window.KNGHT.resize();
    }
    if (!rpTouched && rpText) {
      const wasSample = Object.values(SAMPLES).includes(rpText.value);
      setRpCat(c || 'all', false);
      if (wasSample) { rpText.value = SAMPLES[rpCat]; runRedPen(); }
    }
    if (persist) store.set('knght-cat', c);
  };
  catBtns.forEach((b) => b.addEventListener('click', () => {
    setCategory(root.dataset.cat === b.dataset.cat ? null : b.dataset.cat);
    if (window.KNGHT) window.KNGHT.Sound.tick();
  }));

  /* ---------- Red pen ---------- */
  const R = (re, cats, title, note) => ({ re, cats, title, note });
  const ALL = ['all', 'clinic', 'medspa', 'law', 'spirits', 'coffee', 'food'];
  const HEALTH = ['clinic', 'medspa'];
  const FOODISH = ['coffee', 'food'];
  const RULES = [
    R(/(?:#\s?1\b|\b(?:best|number one|no\.\s?1|leading|top[- ]rated|cheapest|lowest prices?)\b)/gi, ALL, 'Unproven superlative', 'Superlatives need proof you can show. Under the Competition Act, a claim you cannot back up can be misleading.'),
    R(/\bguarantee[ds]?\b/gi, ALL, 'Guarantee', 'Guaranteed outcomes are hard to stand behind. Regulators and platforms treat them as misleading unless the terms are clear.'),
    R(/(\b100\s?%|\b(?:completely|totally)\b)/gi, ALL, 'Absolute claim', 'Absolutes invite scrutiny. Say what is true and what you can measure.'),
    R(/\b(free)\b(?![- ](?:from|of)\b)/gi, ALL, 'Free', 'If conditions apply, they must be clear and close to the claim. Hidden conditions can count as drip pricing.'),
    R(/\b(risk[- ]free|no risk)\b/gi, ALL, 'Risk-free', 'Nothing is free of risk for everyone. Say what the visitor can actually count on.'),
    R(/\b((?:clinically|scientifically)?\s?proven)\b/gi, ALL, 'Proof claim', 'Performance claims need adequate and proper testing under the Competition Act. Keep the evidence on file.'),
    R(/\b(instant(?:ly)?|overnight)\b/gi, ALL, 'Speed claim', 'Speed promises are read literally. If results vary, say so.'),
    R(/\b(limited time|act now|today only|this week only|hurry)\b/gi, ALL, 'Urgency', 'Fine when it is true. A deadline that keeps renewing is a misleading claim.'),

    R(/\b(pain[- ]?free|painless)\b/gi, HEALTH, 'Outcome promise', 'Experiences vary from patient to patient. Promising no pain is not factual and verifiable, which CPSO expects of physician advertising.'),
    R(/\b(cures?|heals?)\b/gi, HEALTH, 'Cure claim', 'Claims to cure or treat a condition need evidence, and can fall under Health Canada advertising rules.'),
    R(/\b(botox|dysport|xeomin|ozempic|wegovy|mounjaro)\b/gi, HEALTH, 'Prescription drug name', 'Health Canada limits public advertising of prescription drugs to name, price and quantity. Brand names in promotions are a common breach.'),
    R(/\b(before[- ]and[- ]after|before\s?&\s?after)\b/gi, HEALTH, 'Before and after', 'Before-and-after images must be real, unaltered and typical. Regulators review them closely.'),
    R(/\b(testimonials?|reviews?|5[- ]star|five[- ]star)\b/gi, HEALTH, 'Testimonials', 'CPSO advertising rules do not allow testimonials in physician advertising.'),
    R(/\b(specialists?|experts?|speciali[sz](?:e|es|ing|ed))\b/gi, HEALTH, 'Specialist', '"Specialist" is reserved for physicians certified in that specialty. "Expert" needs the same care.'),
    R(/\b(safe|no side effects|no downtime)\b/gi, HEALTH, 'Safety claim', 'No treatment is without risk for everyone. Absolute safety claims can mislead.'),

    R(/\b(specialists?|speciali[sz](?:e|es|ing|ed))\b/gi, ['law'], 'Specialist', 'Only lawyers certified by the Law Society as Certified Specialists may call themselves specialists.'),
    R(/\b(win|wins|winning|never lose|success rate|approval guaranteed)\b/gi, ['law'], 'Outcome claim', 'Law Society marketing rules bar false or misleading advertising. Past results do not promise a client\'s outcome.'),
    R(/\b(no win,? no fee)\b/gi, ['law'], 'Contingency fee', 'Contingency arrangements must be explained, including what the client may still pay.'),

    R(/\b(party|get (?:drunk|wasted|lit)|chug|shots?|bottoms up)\b/gi, ['spirits'], 'Excess', 'AGCO standards bar advertising that promotes excessive or immoderate drinking.'),
    R(/\b(strongest|extra strong|high proof|strong)\b/gi, ['spirits'], 'Strength', 'Advertising may not promote alcohol strength as a selling point.'),
    R(/\b(kids?|teens?|students?|school|youth)\b/gi, ['spirits'], 'Minors', 'Nothing in alcohol advertising may appeal to or depict people under the legal drinking age.'),
    R(/\b(drive|driving|road trip|boating)\b/gi, ['spirits'], 'Care and skill', 'No link between drinking and driving, boating or any activity that needs care and skill.'),
    R(/\b(healthy|health|energy|energi[sz]ing|boosts?)\b/gi, ['spirits'], 'Health claim', 'Alcohol cannot carry health, energy or therapeutic claims.'),
    R(/\b(zero sugar|sugar[- ]free|low[- ]cal(?:orie)?s?)\b/gi, ['spirits'], 'Nutrient claim', 'Nutrient content claims on alcoholic drinks are tightly restricted. Check the exact wording against the Food and Drug Regulations.'),
    R(/\b(sexy|seduc\w*|success(?:ful)?|popular)\b/gi, ['spirits'], 'Social success', 'Ads may not imply that drinking brings social, sexual or business success.'),

    R(/\b((?:all[- ])?natural)\b/gi, FOODISH, 'Natural', 'CFIA sets strict criteria for "natural". Processed ingredients usually do not qualify.'),
    R(/\b(organic)\b/gi, FOODISH, 'Organic', '"Organic" needs certification under the Canada Organic Regime.'),
    R(/\b((?:nut|peanut|gluten|allergen|dairy)[- ]free)\b/gi, FOODISH, 'Free-from', 'Free-from claims must hold for every batch, cross-contact included. CFIA treats a wrong allergen claim as a safety issue.'),
    R(/\b(healthy|superfood|detox|immunity|boosts? (?:your )?immun\w*)\b/gi, FOODISH, 'Health claim', 'Health claims on food are regulated. Words like "healthy" or "boosts immunity" can trigger Health Canada rules.'),
    R(/\b(sugar[- ]free|zero sugar|low[- ]fat|low[- ]calorie|high[- ]protein|keto)\b/gi, FOODISH, 'Nutrient claim', 'Nutrient content claims have set definitions and labelling rules.'),
    R(/\b(fair[- ]trade|ethically sourced|sustainabl[ey]|eco[- ]friendly|carbon[- ]neutral)\b/gi, FOODISH, 'Green claim', 'Environmental and sourcing claims now need proof under the Competition Act. Keep certifications and supplier records ready.'),
  ];
  const SAMPLES = {
    all: 'The best results in Ontario, guaranteed. Free for a limited time and 100% risk-free.',
    clinic: "Toronto's best family clinic. Painless treatments, guaranteed results and 5-star reviews from our patients.",
    medspa: 'Botox at 20% off, this week only. Painless, safe and no downtime from our leading injection experts.',
    law: "Toronto's #1 immigration specialist. We win the cases others can't. Free consultation, approval guaranteed.",
    spirits: 'The strongest rum in Ontario. Grab the crew, party all summer and enjoy a healthy, zero sugar kick.',
    coffee: 'The best coffee in the city. 100% organic, ethically sourced and all natural.',
    food: 'Healthy, 100% nut-free, allergen-free treats that boost your immunity. The best in Canada.',
  };
  const rpText = $('#redpen-text');
  const rpOut = $('[data-rp-out]');
  const rpNotes = $('[data-rp-notes]');
  const rpCount = $('[data-rp-count]');
  const rpBtns = $$('[data-rp-cat]');
  let rpCat = 'all';
  const runRedPen = () => {
    if (!rpText) return;
    const text = rpText.value;
    const hits = [];
    RULES.forEach((r) => {
      if (r.cats !== ALL && !r.cats.includes(rpCat)) return;
      r.re.lastIndex = 0;
      let m;
      while ((m = r.re.exec(text))) {
        const word = m[0].trim();
        if (!word) { r.re.lastIndex++; continue; }
        const start = m.index + m[0].indexOf(word);
        hits.push({ start, end: start + word.length, word, rule: r });
      }
    });
    hits.sort((a, b) => a.start - b.start || b.end - a.end);
    const kept = [];
    hits.forEach((h) => { if (!kept.length || h.start >= kept[kept.length - 1].end) kept.push(h); });
    let html = '', pos = 0;
    kept.forEach((h, i) => {
      html += esc(text.slice(pos, h.start)) + `<mark class="rp-mark">${esc(text.slice(h.start, h.end))}<sup>${i + 1}</sup></mark>`;
      pos = h.end;
    });
    html += esc(text.slice(pos));
    rpOut.innerHTML = text.trim() ? html : '<span class="rp-empty">Your line appears here, marked up.</span>';
    rpNotes.innerHTML = kept.map((h) => `<li><span class="rp-word">${esc(h.word)}</span><span class="rp-note"><b>${esc(h.rule.title)}.</b> ${esc(h.rule.note)}</span></li>`).join('');
    if (!kept.length && text.trim()) rpNotes.innerHTML = '<li class="rp-clean"><span class="rp-word">No marks</span><span class="rp-note"><b>Clean on the words we check.</b> The full Verdict checks the claims behind them.</span></li>';
    rpCount.textContent = text.trim() ? `${kept.length} ${kept.length === 1 ? 'mark' : 'marks'}` : '';
  };
  function setRpCat(cat, fromUser) {
    rpCat = cat;
    rpBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.rpCat === cat)));
    if (fromUser) rpTouched = true;
    runRedPen();
  }
  if (rpText) {
    let t; rpText.addEventListener('input', () => { clearTimeout(t); t = setTimeout(runRedPen, 120); });
    rpBtns.forEach((b) => b.addEventListener('click', () => {
      const wasSample = Object.values(SAMPLES).includes(rpText.value);
      setRpCat(b.dataset.rpCat, true);
      if (wasSample) { rpText.value = SAMPLES[rpCat]; runRedPen(); }
    }));
    $('[data-rp-sample]').addEventListener('click', () => { rpText.value = SAMPLES[rpCat] || SAMPLES.all; runRedPen(); });
    runRedPen();
  }

  // Category from ?for= or a previous visit
  const fromUrl = new URLSearchParams(location.search).get('for');
  setCategory(fromUrl || store.get('knght-cat'), { persist: !!fromUrl });

  /* ---------- Intake line ---------- */
  const intake = parseInt(meta('knght:intake'), 10);
  if (intake > 0) {
    const words = ['', 'One', 'Two', 'Three', 'Four', 'Five'];
    const d = new Date();
    const q = `Q${Math.floor(d.getMonth() / 3) + 1} ${d.getFullYear()}`;
    const n = words[intake] || String(intake);
    const noun = intake === 1 ? 'world opens' : 'worlds open';
    $$('[data-intake]').forEach((el) => {
      el.textContent = el.classList.contains('hero__intake') ? `${q} · ${n} new ${noun}` : ` ${n} new ${noun} in ${q}.`;
      el.hidden = false;
    });
  }

  /* ---------- Scorecard, seal and lead capture ---------- */
  let lastVerdict = null;
  const seal = $('.seal video');
  const cardBtn = $('[data-r-card]');
  const lead = $('[data-lead]');
  const endpoint = meta('knght:form-endpoint');
  document.addEventListener('knght:verdict', (e) => {
    lastVerdict = e.detail;
    if (lead) lead.hidden = !endpoint;
    if (seal && ready(seal.dataset.src) && !reduce) {
      if (!seal.src) seal.src = seal.dataset.src;
      seal.currentTime = 0;
      seal.play().catch(() => {});
    }
  });

  const drawScorecard = async (v) => {
    const W = 1080, H = 1350;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d');
    const serif = '"Cormorant Garamond", Georgia, serif', sans = '"Hanken Grotesk", Helvetica, Arial, sans-serif';
    try { await Promise.all([document.fonts.load(`300 200px ${serif}`), document.fonts.load(`italic 400 90px ${serif}`), document.fonts.load(`500 24px ${sans}`)]); } catch (e) {}
    x.fillStyle = '#000'; x.fillRect(0, 0, W, H);
    // guilloche ring framing the score
    const RX = W / 2, RY = 455;
    x.strokeStyle = 'rgba(255,255,255,.16)'; x.lineWidth = 0.7;
    for (let k = 0; k < 26; k++) {
      const ph = (k / 26) * Math.PI * 2; x.beginPath();
      for (let t = 0; t <= Math.PI * 2 + 0.004; t += 0.004) {
        const r = 205 + 9 * Math.sin(48 * t + ph) + 4 * Math.sin(12 * t - ph);
        const px = RX + r * Math.cos(t), py = RY + r * Math.sin(t);
        t ? x.lineTo(px, py) : x.moveTo(px, py);
      }
      x.stroke();
    }
    // sword mark
    x.strokeStyle = '#fff'; x.lineWidth = 3; x.lineCap = 'round'; x.lineJoin = 'round';
    x.beginPath(); x.arc(W / 2, 72, 9, 0, Math.PI * 2); x.stroke();
    x.beginPath(); x.moveTo(W / 2, 81); x.lineTo(W / 2, 94); x.moveTo(W / 2 - 30, 96); x.lineTo(W / 2 + 30, 96);
    x.moveTo(W / 2 - 7, 102); x.lineTo(W / 2 - 7, 156); x.lineTo(W / 2, 172); x.lineTo(W / 2 + 7, 156); x.lineTo(W / 2 + 7, 102); x.closePath(); x.stroke();
    x.textAlign = 'center'; x.fillStyle = '#a6a6a6';
    x.font = `500 22px ${sans}`; x.letterSpacing = '6px';
    x.fillText('THE VERDICT · SELF-CHECK', W / 2, 218);
    x.fillStyle = '#fff'; x.letterSpacing = '0px';
    x.font = `300 200px ${serif}`; x.fillText(String(v.total), W / 2, 485);
    x.fillStyle = '#a6a6a6'; x.font = `500 20px ${sans}`; x.letterSpacing = '6px'; x.fillText('OUT OF 70', W / 2, 585);
    x.fillStyle = '#fff'; x.letterSpacing = '0px'; x.font = `italic 400 92px ${serif}`; x.fillText(v.band, W / 2, 770);
    // layer bars
    const top = 850, left = 150, barW = 560;
    v.layers.forEach((l, i) => {
      const y = top + i * 46;
      x.textAlign = 'left'; x.fillStyle = l.name === v.weak ? '#fff' : '#a6a6a6';
      x.font = `500 20px ${sans}`; x.letterSpacing = '3px'; x.fillText(l.name.toUpperCase(), left, y + 7);
      x.letterSpacing = '0px';
      x.fillStyle = 'rgba(255,255,255,.18)'; x.fillRect(left + 220, y, barW, 5);
      x.fillStyle = '#fff'; x.fillRect(left + 220, y, barW * (l.score / 10), 5);
      x.textAlign = 'right'; x.font = `500 20px ${sans}`; x.fillText(`${l.score}`, W - 100, y + 8);
    });
    // weakest
    x.textAlign = 'center'; x.fillStyle = '#fff'; x.font = `400 40px ${serif}`;
    x.fillText(`Weakest layer: ${v.weak}`, W / 2, 1215);
    x.fillStyle = '#a6a6a6'; x.font = `500 19px ${sans}`; x.letterSpacing = '6px';
    x.fillText(`KNGHT.COM · BOOK THE FULL VERDICT · ${new Date().toLocaleDateString('en-CA')}`, W / 2, 1295);
    return c;
  };
  if (cardBtn) cardBtn.addEventListener('click', async () => {
    if (!lastVerdict) return;
    const c = await drawScorecard(lastVerdict);
    c.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `knght-verdict-${lastVerdict.total}-of-70.png`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    }, 'image/png');
  });
  if (lead) lead.addEventListener('submit', async (e) => {
    e.preventDefault();
    const status = $('[data-lead-status]', lead);
    const email = $('#lead-email', lead), consent = $('#lead-consent', lead);
    if (!email.checkValidity()) { status.textContent = 'Enter an email address we can reach.'; email.focus(); return; }
    if (!consent.checked) { status.textContent = 'Tick the box so we are allowed to email you.'; consent.focus(); return; }
    status.textContent = 'Sending…';
    try {
      const res = await fetch(endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email: email.value, consent: true, category: root.dataset.cat || null, ...lastVerdict }),
      });
      if (!res.ok) throw new Error(res.status);
      status.textContent = 'Sent. Check your inbox.';
      lead.reset();
    } catch (err) {
      status.textContent = 'That did not go through. Download the scorecard instead, or email hello@sergioho.com.';
    }
  });

  /* ---------- Ink reveals and world films ---------- */
  const inks = $$('.world__ink');
  if (inks.length) {
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('width', '0'); svg.setAttribute('height', '0'); svg.setAttribute('aria-hidden', 'true');
    svg.style.position = 'absolute';
    const maps = inks.map((el, i) => {
      const f = document.createElementNS(NS, 'filter');
      f.id = `ink-${i}`; f.setAttribute('x', '-10%'); f.setAttribute('y', '-10%'); f.setAttribute('width', '120%'); f.setAttribute('height', '120%');
      f.innerHTML = `<feTurbulence type="fractalNoise" baseFrequency="0.011 0.019" numOctaves="2" seed="${i + 3}" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="0" xChannelSelector="R" yChannelSelector="G"/>`;
      svg.appendChild(f);
      return f.querySelector('feDisplacementMap');
    });
    document.body.appendChild(svg);
    const ink = (i, from, to, dur) => {
      const el = inks[i], d = maps[i], t0 = performance.now();
      el.style.filter = `url(#ink-${i})`;
      const step = (t) => {
        const p = clamp((t - t0) / dur, 0, 1), e = 1 - Math.pow(1 - p, 3);
        d.setAttribute('scale', (from + (to - from) * e).toFixed(1));
        if (p < 1) requestAnimationFrame(step); else if (to === 0) el.style.filter = '';
      };
      requestAnimationFrame(step);
    };
    const swell = (i) => {
      const el = inks[i], d = maps[i], t0 = performance.now();
      el.style.filter = `url(#ink-${i})`;
      const step = (t) => {
        const p = clamp((t - t0) / 900, 0, 1);
        d.setAttribute('scale', (Math.sin(p * Math.PI) * 34).toFixed(1));
        if (p < 1) requestAnimationFrame(step); else el.style.filter = '';
      };
      requestAnimationFrame(step);
    };

    inks.forEach((el, i) => {
      const card = el.closest('.world');
      const video = $('video', el);
      const src = FILMS[card.dataset.slug];
      if (reduce) { el.classList.add('is-inked'); return; }
      let seen = false;
      new IntersectionObserver(([e]) => {
        if (e.isIntersecting && !seen) { seen = true; el.classList.add('is-inked'); ink(i, 140, 0, 1600); }
        if (video && ready(src)) {
          if (e.intersectionRatio > 0.55) {
            if (!video.src) { video.src = src; video.addEventListener('playing', () => video.classList.add('is-playing'), { once: true }); }
            video.play().catch(() => {});
          } else video.pause();
        }
      }, { threshold: [0, 0.6] }).observe(el);
      if (finePointer) card.addEventListener('mouseenter', () => swell(i));
    });
  }

  /* ---------- Scroll-driven hero (desktop) ---------- */
  const hero = $('.hero');
  const heroVideo = $('.hero video');
  const scrubSrc = heroVideo && heroVideo.dataset.scrubSrc;
  if (hero && heroVideo && ready(scrubSrc) && !reduce && matchMedia('(min-width: 901px) and (hover: hover)').matches) {
    const pin = document.createElement('div');
    pin.className = 'hero-pin';
    hero.parentNode.insertBefore(pin, hero); pin.appendChild(hero);
    root.classList.add('hero-scrub');
    const loopSrc = heroVideo.currentSrc || $('source', heroVideo).src;
    heroVideo.removeAttribute('loop'); heroVideo.removeAttribute('autoplay');
    heroVideo.pause();
    heroVideo.src = scrubSrc; heroVideo.preload = 'auto'; heroVideo.load();
    heroVideo.addEventListener('error', () => {
      root.classList.remove('hero-scrub');
      heroVideo.src = loopSrc; heroVideo.loop = true; heroVideo.play().catch(() => {});
    }, { once: true });
    const inner = $('.hero__inner', hero), metaEl = $('.hero__meta', hero);
    let cur = 0, dur = 0;
    heroVideo.addEventListener('loadedmetadata', () => { dur = heroVideo.duration || 0; });
    const loop = () => {
      const travel = pin.offsetHeight - innerHeight;
      const p = travel > 0 ? clamp(-pin.getBoundingClientRect().top / travel, 0, 1) : 0;
      if (dur) {
        cur += (p * (dur - 0.05) - cur) * 0.14;
        if (!heroVideo.seeking && Math.abs(heroVideo.currentTime - cur) > 0.016) heroVideo.currentTime = cur;
      }
      const fade = clamp((p - 0.06) / 0.3, 0, 1);
      if (inner) { inner.style.opacity = String(1 - fade); inner.style.transform = `translate3d(0, ${-fade * 10}vh, 0)`; }
      if (metaEl) metaEl.style.opacity = String(1 - fade);
      hero.style.setProperty('--hp', p.toFixed(3));
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    if (window.KNGHT) window.KNGHT.resize();
  }

  /* ---------- 3D knight you can turn ---------- */
  const k3 = $('[data-knight3d]');
  const verdict = $('.verdict');
  if (k3 && verdict && ready(k3.dataset.src)) {
    let loaded = null, revealed = false;
    const load = () => loaded || (loaded = import(new URL('vendor/model-viewer.min.js', SCRIPT_SRC).href).then(() => {
      const mv = document.createElement('model-viewer');
      mv.setAttribute('src', k3.dataset.src);
      mv.setAttribute('alt', 'An obsidian chess knight you can turn');
      mv.setAttribute('camera-controls', '');
      mv.setAttribute('disable-zoom', '');
      mv.setAttribute('disable-pan', '');
      mv.setAttribute('touch-action', 'pan-y');
      mv.setAttribute('interaction-prompt', 'none');
      mv.setAttribute('shadow-intensity', '0');
      mv.setAttribute('exposure', '1.1');
      mv.setAttribute('environment-image', 'neutral');
      mv.setAttribute('tone-mapping', 'commerce');
      if (!reduce) { mv.setAttribute('auto-rotate', ''); mv.setAttribute('auto-rotate-delay', '0'); mv.setAttribute('rotation-per-second', '14deg'); }
      mv.addEventListener('load', () => {
        (mv.model ? mv.model.materials : []).forEach((m) => {
          m.pbrMetallicRoughness.setBaseColorFactor([0.03, 0.03, 0.035, 1]);
          m.pbrMetallicRoughness.setMetallicFactor(0.35);
          m.pbrMetallicRoughness.setRoughnessFactor(0.12);
        });
        k3.classList.add('is-ready');
      });
      k3.prepend(mv);
    }).catch(() => {}));
    new IntersectionObserver(([e]) => { if (e.isIntersecting) load(); }, { rootMargin: '100% 0px' }).observe(verdict);
    const reveal = () => { if (revealed) return; revealed = true; load(); verdict.classList.add('is-3d'); };
    document.addEventListener('knght:knight', reveal);
    if (reduce) reveal();
  }
})();
