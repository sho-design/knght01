/* KNGHT interactive layer: category reading, scorecard, seal, intake,
   world films and the scroll-driven hero. Plain JS. */
(() => {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
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
    'wellfit-social-club': 'https://d2ol7oe51mr4n9.cloudfront.net/user_2vgr4LDcTnBdquYG4fMZ396AWcW/ca2b8fca-641f-4227-a88b-a10c499ed6ce.mp4',
    'art-colouring': 'https://d2ol7oe51mr4n9.cloudfront.net/user_2vgr4LDcTnBdquYG4fMZ396AWcW/7b34d099-139f-435c-852a-70ac56491274.mp4',
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
    if (persist) store.set('knght-cat', c);
  };
  catBtns.forEach((b) => b.addEventListener('click', () => {
    setCategory(root.dataset.cat === b.dataset.cat ? null : b.dataset.cat);
    if (window.KNGHT) window.KNGHT.Sound.tick();
  }));

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
      status.textContent = 'That did not go through. Download the scorecard instead, or email sho@knght.com.';
    }
  });

  /* ---------- World films: each plate plays its film while it is in view ---------- */
  if (!reduce) {
    $$('.world__ink').forEach((el) => {
      const video = $('video', el);
      const src = FILMS[el.closest('.world').dataset.slug];
      if (!video || !ready(src)) return;
      new IntersectionObserver(([e]) => {
        if (e.intersectionRatio > 0.55) {
          if (!video.src) { video.src = src; video.addEventListener('playing', () => video.classList.add('is-playing'), { once: true }); }
          video.play().catch(() => {});
        } else video.pause();
      }, { threshold: [0, 0.6] }).observe(el);
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

})();
