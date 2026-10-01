/* KNGHT site behaviour. Smooth scroll uses the vendored Lenis build when present; everything else is plain JS. */
(() => {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  let lenis = null;

  /* ---------- Sound: synthesised in the browser, off until the visitor asks ---------- */
  const Sound = (() => {
    let ctx = null, master = null, droneNodes = [], on = false;
    const noiseBuffer = (c, seconds) => {
      const b = c.createBuffer(1, c.sampleRate * seconds, c.sampleRate);
      const d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      return b;
    };
    const startDrone = () => {
      const t = ctx.currentTime;
      const bus = ctx.createGain(); bus.gain.value = 0;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420; lp.Q.value = 0.6;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.06;
      const lfoGain = ctx.createGain(); lfoGain.gain.value = 160;
      lfo.connect(lfoGain).connect(lp.frequency);
      [[55, 0], [82.41, 4], [110, -6]].forEach(([f, det], i) => {
        const o = ctx.createOscillator(); o.type = i === 2 ? 'triangle' : 'sine';
        o.frequency.value = f; o.detune.value = det;
        const g = ctx.createGain(); g.gain.value = i === 2 ? 0.18 : 0.5;
        o.connect(g).connect(lp); o.start(); droneNodes.push(o);
      });
      const air = ctx.createBufferSource(); air.buffer = noiseBuffer(ctx, 4); air.loop = true;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 0.5;
      const ag = ctx.createGain(); ag.gain.value = 0.05;
      air.connect(bp).connect(ag).connect(bus); air.start();
      lp.connect(bus); bus.connect(master); lfo.start();
      bus.gain.linearRampToValueAtTime(0.09, t + 3);
      droneNodes.push(air, lfo);
    };
    const shing = (level = 1) => {
      if (!on || !ctx) return;
      const t = ctx.currentTime + 0.02;
      const n = ctx.createBufferSource(); n.buffer = noiseBuffer(ctx, 0.6);
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.2;
      bp.frequency.setValueAtTime(2400, t); bp.frequency.exponentialRampToValueAtTime(9000, t + 0.38);
      const ng = ctx.createGain(); ng.gain.setValueAtTime(0, t);
      ng.gain.linearRampToValueAtTime(0.16 * level, t + 0.08); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      n.connect(bp).connect(ng).connect(master); n.start(t); n.stop(t + 0.6);
      [1870, 2960, 4410, 6230, 8150].forEach((f, i) => {
        const o = ctx.createOscillator(); o.type = 'sine';
        o.frequency.setValueAtTime(f, t + 0.12); o.frequency.linearRampToValueAtTime(f * 1.004, t + 2.4);
        const g = ctx.createGain(); const peak = [0.07, 0.05, 0.035, 0.022, 0.014][i] * level;
        const tail = 2.6 / (1 + i * 0.45);
        g.gain.setValueAtTime(0, t + 0.12); g.gain.linearRampToValueAtTime(peak, t + 0.14);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14 + tail);
        o.connect(g).connect(master); o.start(t + 0.12); o.stop(t + 0.2 + tail);
      });
    };
    const tick = () => {
      if (!on || !ctx) return;
      const t = ctx.currentTime;
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(1320, t);
      o.frequency.exponentialRampToValueAtTime(880, t + 0.08);
      const g = ctx.createGain(); g.gain.setValueAtTime(0.05, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      o.connect(g).connect(master); o.start(t); o.stop(t + 0.14);
    };
    const enable = async () => {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      if (!ctx) {
        ctx = new AC();
        master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
        startDrone();
      }
      try { await ctx.resume(); } catch (e) { return false; }
      on = true;
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
      master.gain.linearRampToValueAtTime(0.8, ctx.currentTime + 0.4);
      shing();
      return true;
    };
    const disable = () => {
      on = false;
      if (!ctx) return;
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
      master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
      setTimeout(() => { if (!on) ctx.suspend().catch(() => {}); }, 450);
    };
    document.addEventListener('visibilitychange', () => {
      if (!ctx) return;
      if (document.hidden) ctx.suspend().catch(() => {});
      else if (on) ctx.resume().catch(() => {});
    });
    return { enable, disable, shing, tick, get on() { return on; } };
  })();

  const soundBtn = $('[data-sound]');
  if (soundBtn) {
    soundBtn.addEventListener('click', async () => {
      const next = !Sound.on;
      const ok = next ? await Sound.enable() : (Sound.disable(), true);
      if (!ok) return;
      soundBtn.setAttribute('aria-pressed', String(next));
      soundBtn.setAttribute('aria-label', next ? 'Sound on. Turn sound off' : 'Sound off. Turn sound on');
    });
  }

  /* ---------- Loader ---------- */
  let seen = false;
  try { seen = sessionStorage.getItem('knght-intro') === '1'; } catch (e) {}
  const finishIntro = () => {
    root.classList.add('is-loaded');
    if (lenis) lenis.start();
    try { sessionStorage.setItem('knght-intro', '1'); } catch (e) {}
  };
  if (reduce || seen || !$('.loader')) {
    root.classList.add('no-loader');
    requestAnimationFrame(finishIntro);
  } else {
    const count = $('.loader__count');
    const start = performance.now();
    const dur = 1500;
    const tick = (t) => {
      const p = clamp((t - start) / dur, 0, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      if (count) count.textContent = String(Math.round(eased * 100)).padStart(3, '0');
      if (p < 1) requestAnimationFrame(tick);
      else setTimeout(finishIntro, 180);
    };
    requestAnimationFrame(tick);
  }

  /* ---------- Smooth scroll ---------- */
  if (!reduce && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.085, smoothWheel: true, anchors: true, autoRaf: true });
    if (!root.classList.contains('is-loaded') && !root.classList.contains('no-loader')) lenis.stop();
  }

  /* ---------- Split headings into masked lines ---------- */
  $$('[data-split]').forEach((el) => {
    const lines = el.innerHTML.split(/<br\s*\/?>/i);
    el.innerHTML = lines.map((l) => `<span class="line"><span>${l.trim()}</span></span>`).join('');
    el.classList.add('split');
  });

  /* ---------- Thesis: wrap words so they light up with scroll ---------- */
  const thesis = $('.thesis__text');
  let words = [];
  if (thesis) {
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) frag.appendChild(document.createTextNode(part));
            else { const s = document.createElement('span'); s.className = 'w'; s.textContent = part; frag.appendChild(s); }
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) walk(n);
      });
    };
    walk(thesis);
    words = $$('.w', thesis);
    if (reduce) words.forEach((w) => w.classList.add('lit'));
  }

  /* ---------- Reveal on view ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.01 });
  $$('[data-reveal], .split').forEach((el) => io.observe(el));

  /* ---------- Layers: active layer follows the reading line ---------- */
  const layers = $$('.layer');
  const bigNums = $$('.layers__big span');
  const nowName = $('.layers__now b');
  const nowWhat = $('.layers__now span');
  let activeLayer = -1;
  const setLayer = (i) => {
    if (i === activeLayer || i < 0) return;
    activeLayer = i;
    layers.forEach((l, k) => l.classList.toggle('on', k === i));
    bigNums.forEach((s, k) => {
      s.classList.toggle('on', k === i);
      s.classList.toggle('out', k < i);
    });
    if (nowName) nowName.textContent = layers[i].dataset.name;
    if (nowWhat) nowWhat.textContent = `Layer ${i + 1} of ${layers.length}`;
  };
  if (layers.length) {
    const lio = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) setLayer(layers.indexOf(e.target)); });
    }, { rootMargin: '-45% 0px -50% 0px' });
    layers.forEach((l) => lio.observe(l));
    setLayer(0);
  }

  /* ---------- Final video: play once, when it is seen ---------- */
  const verdictVideo = $('.verdict video');
  if (verdictVideo && !reduce) {
    const vio = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          verdictVideo.play().then(() => setTimeout(() => Sound.shing(0.8), 900)).catch(() => {});
          vio.disconnect();
        }
      });
    }, { threshold: 0.45 });
    vio.observe(verdictVideo);
  }
  const heroVideo = $('.hero video');
  if (heroVideo && reduce) { heroVideo.removeAttribute('autoplay'); heroVideo.pause(); }

  /* ---------- Horizontal worlds gallery ---------- */
  const worlds = $('.worlds');
  const track = $('.worlds__track');
  const bar = $('.worlds__bar i');
  const countNow = $('.worlds__count b');
  const worldCards = $$('.world', track || document);
  const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  // Totals follow the cards, so adding a world never leaves a stale count.
  $$('[data-world-total]').forEach((el) => { el.textContent = roman[worldCards.length - 1] || String(worldCards.length); });
  $$('[data-world-total-num]').forEach((el) => { el.textContent = String(worldCards.length); });
  const horizontal = () => matchMedia('(min-width: 901px)').matches;
  let travel = 0;
  const sizeWorlds = () => {
    if (!worlds || !track) return;
    if (!horizontal()) { worlds.style.height = ''; travel = 0; track.style.transform = ''; return; }
    const endPad = parseFloat(getComputedStyle(track).paddingLeft) || 0;
    travel = Math.max(0, track.scrollWidth - innerWidth + endPad);
    worlds.style.height = `${innerHeight + travel}px`;
  };

  /* ---------- Scroll-driven frame ---------- */
  const nav = $('.nav');
  const hero = $('.hero');
  const heroMedia = $('.hero__media');
  const heroInner = $('.hero__inner');
  const footWord = $('.footer__word');
  const footLetters = footWord ? $$('span', footWord) : [];
  const engage = $('.engage');
  let lastY = scrollY;
  let ticking = false;

  const frame = () => {
    ticking = false;
    const y = scrollY;
    const vh = innerHeight;

    // Nav: solid after the hero starts to go, hide when reading down, return on the way up
    if (nav) {
      nav.classList.toggle('is-solid', y > 40);
      const goingDown = y > lastY + 4;
      const goingUp = y < lastY - 4;
      if (goingDown && y > vh) nav.classList.add('is-hidden');
      else if (goingUp || y < vh) nav.classList.remove('is-hidden');
    }
    lastY = y;

    // Hero: the plate sinks and sharpens away as you leave
    if (hero && !reduce && !root.classList.contains('hero-scrub')) {
      const p = clamp(y / vh, 0, 1);
      root.classList.toggle('is-scrolling', y > 2);
      if (heroMedia && root.classList.contains('is-loaded')) {
        heroMedia.style.transform = `translate3d(0, ${p * 18}vh, 0) scale(${1 + p * 0.12})`;
        heroMedia.style.opacity = String(1 - p * 0.85);
      }
      if (heroInner) heroInner.style.transform = `translate3d(0, ${p * -8}vh, 0)`;
    }

    // Thesis words light up across the section
    if (words.length && !reduce) {
      const r = thesis.getBoundingClientRect();
      const p = clamp((vh * 0.8 - r.top) / (vh * 0.5), 0, 1);
      const lit = Math.round(p * words.length);
      words.forEach((w, i) => w.classList.toggle('lit', i < lit));
    }

    // Worlds: vertical scroll drives horizontal travel
    if (worlds && track && travel > 0) {
      const r = worlds.getBoundingClientRect();
      const p = clamp(-r.top / travel, 0, 1);
      track.style.transform = `translate3d(${-p * travel}px, 0, 0)`;
      if (bar) bar.style.transform = `scaleX(${p})`;
      if (countNow && worldCards.length) {
        const idx = clamp(Math.round(p * (worldCards.length - 1)), 0, worldCards.length - 1);
        countNow.textContent = roman[idx];
      }
    }

    // The vellum page opens edge to edge as it arrives
    if (engage && !reduce) {
      const r = engage.getBoundingClientRect();
      const p = clamp((vh - r.top) / (vh * 0.75), 0, 1);
      const e = 1 - Math.pow(1 - p, 2);
      engage.style.setProperty('--clip-x', `${((1 - e) * Math.min(innerWidth * 0.06, 90)).toFixed(1)}px`);
      engage.style.setProperty('--clip-r', `${((1 - e) * 36).toFixed(1)}px`);
    }

    // Blade fills down the layers list
    const blade = $('.blade i');
    const list = $('.layers ol');
    if (blade && list) {
      const r = list.getBoundingClientRect();
      const p = clamp((vh * 0.5 - r.top) / r.height, 0, 1);
      blade.style.transform = `scaleY(${p})`;
    }

    // Footer wordmark rises letter by letter
    if (footWord && !reduce) {
      const r = footWord.getBoundingClientRect();
      const p = clamp((vh - r.top) / (r.height + 80), 0, 1);
      footLetters.forEach((s, i) => {
        const local = clamp(p * 1.6 - i * 0.12, 0, 1);
        s.style.transform = `translateY(${(1 - local) * 18}%)`;
      });
    }
  };
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', () => { sizeWorlds(); onScroll(); });
  addEventListener('load', () => { sizeWorlds(); onScroll(); });
  sizeWorlds();
  frame();

  /* ---------- Cursor + magnetic buttons (fine pointers only) ---------- */
  if (finePointer && !reduce) {
    const cursor = $('.cursor');
    const label = cursor && $('span', cursor);
    let mx = innerWidth / 2, my = innerHeight / 2, cx = mx, cy = my;
    addEventListener('mousemove', (e) => {
      mx = e.clientX; my = e.clientY;
      root.classList.add('has-cursor');
    }, { passive: true });
    document.addEventListener('mouseleave', () => root.classList.remove('has-cursor'));
    const loop = () => {
      cx += (mx - cx) * 0.2; cy += (my - cy) * 0.2;
      if (cursor) cursor.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
      requestAnimationFrame(loop);
    };
    loop();
    document.addEventListener('mouseover', (e) => {
      if (!cursor) return;
      const t = e.target.closest('a, button, [data-cursor]');
      const text = t && t.dataset.cursor;
      cursor.classList.toggle('is-label', !!text);
      cursor.classList.toggle('is-link', !!t && !text);
      if (label) label.textContent = text || '';
    });

    $$('[data-magnetic]').forEach((el) => {
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * 0.25;
        const y = (e.clientY - r.top - r.height / 2) * 0.35;
        el.style.transform = `translate(${x}px, ${y}px)`;
      });
      el.addEventListener('mouseleave', () => { el.style.transform = ''; });
    });
  }

  /* ---------- Score your world ---------- */
  const quiz = $('#quiz');
  if (quiz) {
    const qs = $$('.q', quiz);
    const result = $('#result');
    const now = $('[data-q-now]', quiz);
    const back = $('[data-q-back]', quiz);
    const live = $('[data-live]');
    const dial = $('[data-dial]');
    const segsG = $('[data-dial-segs]');
    const scoreEl = $('[data-dial-score]');
    const answers = qs.map(() => null);
    let at = 0, shown = 0, busy = false;

    // Dial: seven arcs, one per layer, that fill with each answer
    const N = qs.length, R = 96, C = 2 * Math.PI * R, gapDeg = 5;
    const L = C / N - (gapDeg / 360) * C;
    const NS = 'http://www.w3.org/2000/svg';
    const tracks = [], fills = [], labels = [];
    segsG.closest('svg').setAttribute('viewBox', '-30 -30 300 300');
    qs.forEach((q, i) => {
      const rot = -90 + i * (360 / N) + gapDeg / 2;
      const mk = (cls) => {
        const c = document.createElementNS(NS, 'circle');
        c.setAttribute('cx', 120); c.setAttribute('cy', 120); c.setAttribute('r', R);
        c.setAttribute('class', cls);
        c.setAttribute('stroke-dasharray', `${L} ${C}`);
        c.setAttribute('transform', `rotate(${rot} 120 120)`);
        segsG.appendChild(c); return c;
      };
      tracks.push(mk('seg-track'));
      const f = mk('seg-fill'); f.style.strokeDashoffset = L; fills.push(f);
      const mid = (rot + (L / C) * 180) * Math.PI / 180;
      const tx = 120 + Math.cos(mid) * 122, ty = 120 + Math.sin(mid) * 122;
      const t = document.createElementNS(NS, 'text');
      t.setAttribute('x', tx.toFixed(1)); t.setAttribute('y', (ty + 2.5).toFixed(1));
      t.setAttribute('text-anchor', Math.abs(tx - 120) < 18 ? 'middle' : tx > 120 ? 'start' : 'end');
      t.setAttribute('class', 'seg-label'); t.textContent = q.dataset.layer;
      segsG.appendChild(t); labels.push(t);
    });

    const total = () => answers.reduce((a, v) => a + (v || 0), 0);
    const countTo = (to) => {
      const from = shown, t0 = performance.now(), d = reduce ? 0 : 900;
      const step = (t) => {
        const p = d ? clamp((t - t0) / d, 0, 1) : 1;
        shown = Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3)));
        scoreEl.textContent = shown;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    const paint = () => {
      answers.forEach((v, i) => { fills[i].style.strokeDashoffset = v == null ? L : L * (1 - v / 10); });
      const done = !result.hidden;
      tracks.forEach((t, i) => t.classList.toggle('is-now', !done && i === at));
      labels.forEach((t, i) => t.classList.toggle('is-now', !done && i === at));
      countTo(total());
      dial.setAttribute('aria-label', `Score ${total()} out of 70`);
    };
    const show = (i, focus) => {
      at = i;
      qs.forEach((q, k) => q.classList.toggle('is-on', k === i));
      now.textContent = i + 1;
      back.disabled = i === 0;
      paint();
      if (focus) { const b = $('.opt', qs[i]); if (b) b.focus({ preventScroll: true }); }
    };
    const bands = [
      [63, 'Fortified', 'Your world holds. The full Verdict finds the few cracks left and ranks them.'],
      [49, 'Holding', 'Strong in places, thin in others. One weak layer is carrying risk for all the rest.'],
      [28, 'Exposed', 'Several layers are missing or working against each other. Fix them in order, weakest first.'],
      [0, 'At risk', 'The world is not built yet. Start with Lore and build up from there.'],
    ];
    const finish = () => {
      const sum = total();
      const [, band, blurb] = bands.find(([min]) => sum >= min);
      let weak = 0;
      answers.forEach((v, i) => { if (v < answers[weak]) weak = i; });
      const wq = qs[weak];
      $('[data-r-band]').textContent = band;
      $('[data-r-blurb]').textContent = blurb;
      $('[data-r-weak]').textContent = wq.dataset.layer;
      $('[data-r-fix]').textContent = wq.dataset.fix;
      $('[data-r-cta]').href = `${$('[data-r-cta]').getAttribute('href').split('?')[0]}?score=${sum}&weak=${encodeURIComponent(wq.dataset.layer)}`;
      quiz.hidden = true;
      result.hidden = false;
      paint();
      live.textContent = `Your score is ${sum} out of 70. ${band}. Weakest layer: ${wq.dataset.layer}.`;
      Sound.shing(0.6);
      document.dispatchEvent(new CustomEvent('knght:verdict', { detail: { total: sum, band, weak: wq.dataset.layer, fix: wq.dataset.fix, layers: qs.map((q, i) => ({ name: q.dataset.layer, score: answers[i] })) } }));
      const h = $('[data-r-band]'); h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true });
    };
    quiz.addEventListener('click', (e) => {
      const opt = e.target.closest('.opt');
      if (!opt || busy) return;
      busy = true;
      const i = qs.indexOf(opt.closest('.q'));
      $$('.opt', qs[i]).forEach((o) => o.setAttribute('aria-pressed', String(o === opt)));
      answers[i] = Number(opt.dataset.v);
      Sound.tick();
      paint();
      setTimeout(() => { busy = false; i < qs.length - 1 ? show(i + 1, true) : finish(); }, reduce ? 0 : 420);
    });
    back.addEventListener('click', () => { if (at > 0) show(at - 1, true); });
    $('[data-r-reset]').addEventListener('click', () => {
      answers.fill(null);
      $$('.opt', quiz).forEach((o) => o.removeAttribute('aria-pressed'));
      result.hidden = true; quiz.hidden = false;
      document.dispatchEvent(new CustomEvent('knght:reset'));
      show(0, true);
    });
    $$('.opt', quiz).forEach((o) => o.setAttribute('aria-pressed', 'false'));
    show(0, false);
  }

  /* ---------- Torchlight: an engraved plate only the light reveals ---------- */
  const verdict = $('.verdict');
  const engrave = $('.verdict__engrave');
  if (verdict && engrave && engrave.getContext) {
    const draw = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      const w = verdict.clientWidth, h = verdict.clientHeight;
      engrave.width = w * dpr; engrave.height = h * dpr;
      const c = engrave.getContext('2d');
      c.scale(dpr, dpr);
      c.strokeStyle = 'rgba(255,255,255,.55)';
      c.lineWidth = 0.6;
      // banknote ground: fine waves
      c.globalAlpha = 0.35;
      for (let y = -20; y < h + 20; y += 9) {
        c.beginPath();
        for (let x = 0; x <= w; x += 6) {
          const yy = y + Math.sin(x / 38 + y / 57) * 5 + Math.sin(x / 13 + y / 21) * 1.2;
          x ? c.lineTo(x, yy) : c.moveTo(x, yy);
        }
        c.stroke();
      }
      // guilloche bands around the knight, like the border of a banknote
      c.globalAlpha = 0.75;
      c.lineWidth = 0.5;
      const cx = w / 2, cy = h * 0.4, base = Math.min(w, h);
      [[0.2, 36, 0.012, 22], [0.31, 48, 0.014, 26], [0.43, 60, 0.012, 30], [0.56, 72, 0.01, 30]].forEach(([rr, waves, amp, n]) => {
        for (let k = 0; k < n; k++) {
          const ph = (k / n) * Math.PI * 2;
          c.beginPath();
          for (let t = 0; t <= Math.PI * 2 + 0.004; t += 0.004) {
            const r = base * (rr + amp * Math.sin(waves * t + ph) + amp * 0.5 * Math.sin(waves / 4 * t - ph));
            const x = cx + r * Math.cos(t), y = cy + r * Math.sin(t);
            t ? c.lineTo(x, y) : c.moveTo(x, y);
          }
          c.stroke();
        }
      });
    };
    draw();
    let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(draw, 200); });

    let tx = 0.5, ty = 0.4, x = 0.5, y = 0.4, inside = false, visible = false, raf = 0;
    const t0 = performance.now();
    const loop = (t) => {
      if (!inside || !finePointer) {
        const s = (t - t0) / 1000;
        tx = 0.5 + Math.sin(s * 0.37) * 0.3; ty = 0.42 + Math.sin(s * 0.53) * 0.16;
      }
      x += (tx - x) * 0.08; y += (ty - y) * 0.08;
      verdict.style.setProperty('--mx', `${(x * 100).toFixed(2)}%`);
      verdict.style.setProperty('--my', `${(y * 100).toFixed(2)}%`);
      raf = visible ? requestAnimationFrame(loop) : 0;
    };
    if (!reduce) {
      new IntersectionObserver(([e]) => {
        visible = e.isIntersecting;
        if (visible && !raf) raf = requestAnimationFrame(loop);
      }).observe(verdict);
      verdict.addEventListener('pointermove', (e) => {
        const r = verdict.getBoundingClientRect();
        tx = (e.clientX - r.left) / r.width; ty = (e.clientY - r.top) / r.height; inside = true;
      });
      verdict.addEventListener('pointerleave', () => { inside = false; });
    }
  }

  /* ---------- Mobile menu (built from the page's own nav links) ---------- */
  const navBar = $('.nav');
  const navLinks = $$('.nav nav ul a');
  if (navBar && navLinks.length) {
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'nav__toggle';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-controls', 'mnav');
    toggle.setAttribute('aria-label', 'Open menu');
    toggle.innerHTML = '<span></span><span></span>';
    ($('.nav__end', navBar) || $('.wrap', navBar)).appendChild(toggle);

    const cta = $('.btn', navBar);
    const panel = document.createElement('div');
    panel.id = 'mnav';
    panel.className = 'mnav';
    panel.hidden = true;
    panel.innerHTML = `<nav aria-label="Menu"><ol class="mnav__list">${navLinks.map((a, i) => `<li style="--i:${i}"><a href="${a.getAttribute('href')}">${a.textContent.trim()}</a></li>`).join('')}</ol></nav>`
      + `<div class="mnav__foot">${cta ? `<a class="btn" href="${cta.getAttribute('href')}">${cta.textContent.trim()}</a>` : ''}<a class="link" href="mailto:sho@knght.com">sho@knght.com</a></div>`;
    document.body.appendChild(panel);

    let closeTimer = 0;
    const setMenu = (open) => {
      if (open === root.classList.contains('menu-open')) return;
      clearTimeout(closeTimer);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      if (open) {
        panel.hidden = false;
        requestAnimationFrame(() => root.classList.add('menu-open'));
        navBar.classList.remove('is-hidden');
        if (lenis) lenis.stop();
        document.body.style.overflow = 'hidden';
        setTimeout(() => { const first = $('a', panel); if (first) first.focus({ preventScroll: true }); }, 60);
      } else {
        root.classList.remove('menu-open');
        if (lenis) lenis.start();
        document.body.style.overflow = '';
        closeTimer = setTimeout(() => { panel.hidden = true; }, 450);
      }
    };
    toggle.addEventListener('click', () => setMenu(!root.classList.contains('menu-open')));
    panel.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && root.classList.contains('menu-open')) { setMenu(false); toggle.focus(); }
    });
    matchMedia('(min-width: 901px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });
  }

  /* ---------- Back to top (with a ring that fills as you read) ---------- */
  const topBtn = document.createElement('button');
  topBtn.type = 'button';
  topBtn.className = 'totop';
  topBtn.setAttribute('aria-label', 'Back to top');
  topBtn.innerHTML = '<svg viewBox="0 0 48 48" aria-hidden="true"><circle class="totop__track" cx="24" cy="24" r="22"/><circle class="totop__ring" cx="24" cy="24" r="22" pathLength="100"/><path d="M24 31V17M18 23l6-6 6 6" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>';
  document.body.appendChild(topBtn);
  const ring = $('.totop__ring', topBtn);
  let topTick = false;
  const paintTop = () => {
    topTick = false;
    const y = scrollY, max = document.documentElement.scrollHeight - innerHeight;
    topBtn.classList.toggle('is-on', y > innerHeight * 1.5 && !root.classList.contains('menu-open'));
    ring.style.strokeDashoffset = String(100 - (max > 0 ? clamp(y / max, 0, 1) * 100 : 0));
  };
  addEventListener('scroll', () => { if (!topTick) { topTick = true; requestAnimationFrame(paintTop); } }, { passive: true });
  addEventListener('resize', paintTop);
  paintTop();
  topBtn.addEventListener('click', () => {
    if (lenis && !reduce) lenis.scrollTo(0, { duration: 1.6 });
    else scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    const target = $('.skip') ? $('#main') : null;
    if (target) { target.setAttribute('tabindex', '-1'); setTimeout(() => target.focus({ preventScroll: true }), 50); }
  });

  window.KNGHT = { Sound, get lenis() { return lenis; }, resize: () => { sizeWorlds(); onScroll(); } };

  /* ---------- Toronto time in the hero ---------- */
  const clock = $('[data-clock]');
  if (clock) {
    const fmt = new Intl.DateTimeFormat('en-CA', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Toronto' });
    const set = () => { clock.textContent = `${fmt.format(new Date())} ET`; };
    set(); setInterval(set, 30000);
  }

  /* ---------- Year ---------- */
  $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
})();
