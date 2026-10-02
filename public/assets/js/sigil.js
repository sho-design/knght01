/* KNGHT: forge your sigil. A black and white crest drawn from a name, a category and a virtue. Nothing leaves the browser. */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const form = $('[data-sigil-form]');
  const stage = $('[data-sigil-stage]');
  if (!form || !stage) return;

  /* Charges on a 24 grid, drawn as line art */
  const CHARGE = {
    clinic: '<path d="M12 2v20"/><path d="M12 5c-3.2 0-3.2 3 0 3s3.2 3 0 3-3.2 3 0 3 3.2 3 0 3"/><path d="M10.6 2.6h2.8"/>',
    medspa: '<path d="M12 3c3 4.5 6 8 6 11.5a6 6 0 0 1-12 0C6 11 9 7.5 12 3z"/><path d="M9.4 14.6A2.6 2.6 0 0 0 12 17.2"/>',
    law: '<path d="M12 3v18M7.5 21h9M4 6.5h16"/><path d="M6.5 6.5L3.5 13h6zM17.5 6.5l-3 6.5h6z"/><path d="M3.5 13a3 2 0 0 0 6 0M14.5 13a3 2 0 0 0 6 0"/>',
    spirits: '<path d="M7.2 3h9.6c1.6 3 1.6 15 0 18H7.2C5.6 18 5.6 6 7.2 3z"/><path d="M6.1 8h11.8M6.1 16h11.8M12 3v18"/>',
    dental: '<path d="M7.2 3.6C4.6 3.6 3.6 5.8 4.1 8.6c.4 2.2 1.4 3.6 1.8 6 .5 3 .9 5.9 2.4 5.9s1.6-3.2 2.2-5.3c.4-1.3.9-1.7 1.5-1.7s1.1.4 1.5 1.7c.6 2.1.7 5.3 2.2 5.3s1.9-2.9 2.4-5.9c.4-2.4 1.4-3.8 1.8-6 .5-2.8-.5-5-3.1-5-2 0-2.9 1.2-4.8 1.2S9.2 3.6 7.2 3.6z"/>',
    food: '<path d="M12 22V5"/><path d="M12 6c-2-1-3-3-2-4 2 0 3 2 2 4zM12 6c2-1 3-3 2-4-2 0-3 2-2 4zM12 11c-2.5-.5-4-2.5-3.5-4 2 0 3.5 2 3.5 4zM12 11c2.5-.5 4-2.5 3.5-4-2 0-3.5 2-3.5 4zM12 16c-2.5-.5-4-2.5-3.5-4 2 0 3.5 2 3.5 4zM12 16c2.5-.5 4-2.5 3.5-4-2 0-3.5 2-3.5 4z"/>',
    other: '<path d="M7 19.4Q5.6 18.9 4.9 17.4Q5.8 17.5 6.4 16.8Q5 16 4.7 14.2Q5.6 14.5 6.3 13.9Q5 12.8 5 10.9Q5.9 11.4 6.6 11Q5.8 9.6 6.1 7.9Q6.9 8.6 7.6 8.4Q7.3 6.8 8.1 5.4Q8.6 6.2 9.5 6.2L10.8 2.4L12.3 4.6C15 5.1 17.5 7.4 18.6 10.6C19 11.8 18.6 13.2 17.3 13.2L15.6 12.7C14.6 12.4 13.8 12.9 13.8 13.9C14 15.9 16 17.4 16.9 19.4ZM5.6 19.4H18.2M4.6 21.5H19.2"/><circle cx="14.6" cy="8.4" r=".6"/>'
  };
  const VIRTUE = {
    trust: { motto: 'FIDES', word: 'Trust', d: '<circle cx="7" cy="12" r="4.2"/><circle cx="7" cy="12" r="1.4"/><path d="M11.2 12H21M17.5 12v3.2M20.5 12v2.4"/>' },
    craft: { motto: 'ARS ET LABOR', word: 'Craft', d: '<path d="M4.5 20.5l9.5-9.5"/><path d="M11 6l4-4 6.5 6.5-4 4z"/><path d="M13 8l3 3"/>' },
    care: { motto: 'CURA', word: 'Care', d: '<path d="M9 4h6M10.5 4V2.5h3V4"/><path d="M7.5 7h9v11h-9z"/><path d="M7.5 7l1.5-3h6l1.5 3M12 10v5M6 21h12"/>' },
    heritage: { motto: 'MEMORIA', word: 'Heritage', d: '<path d="M4.5 21V9.5h2.5V6.5h2.5v3h1.5v-3h2v3h1.5v-3h2.5v3h2.5V21z"/><path d="M10 21v-4.5a2 2 0 0 1 4 0V21"/>' }
  };
  const SHIELD = 'M70 70H330V230C330 330 268 388 200 424C132 388 70 330 70 230Z';
  const DIVISIONS = [
    { n: 'Plain', d: '' },
    { n: 'Per pale', d: 'M200 0H400V560H200Z' },
    { n: 'Per fess', d: 'M0 230H400V560H0Z' },
    { n: 'Per bend', d: 'M0 70L400 470V560H0Z' },
    { n: 'Chevron', d: 'M40 340L200 190L360 340V384L200 234L40 384Z' },
    { n: 'Quartered', d: 'M200 0H400V230H200ZM0 230H200V560H0Z' }
  ];
  const hash = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const esc = (t) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const draw = () => {
    const name = (form.name.value || '').trim().slice(0, 40);
    const cat = form.cat.value || 'other';
    const virtue = VIRTUE[form.virtue.value] || VIRTUE.trust;
    const h = hash(name.toLowerCase() + '|' + cat);
    const div = DIVISIONS[h % DIVISIONS.length];
    const initial = (name.match(/[A-Za-z0-9]/) || ['K'])[0].toUpperCase();
    const label = (name || 'Your business').toUpperCase();
    const fs = label.length > 22 ? 15 : label.length > 14 ? 18 : 21;
    const fit = label.length > 12 ? ' textLength="250" lengthAdjust="spacingAndGlyphs"' : '';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 560" role="img" aria-label="Sigil for ${esc(name || 'your business')}">
  <defs>
    <pattern id="sg-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V7" stroke="#fff" stroke-width="1.1" opacity=".55"/></pattern>
    <clipPath id="sg-clip"><path d="${SHIELD}"/></clipPath>
  </defs>
  <rect width="400" height="560" fill="#000"/>
  <g fill="none" stroke="#fff" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="200" cy="36" r="22" stroke-width="1.4"/>
    <text x="200" y="45" text-anchor="middle" fill="#fff" stroke="none" font-family="Cormorant Garamond, Georgia, serif" font-size="26" font-style="italic">${esc(initial)}</text>
    <path d="M178 36H96M222 36H304" stroke-width="1" opacity=".6"/>
    ${div.d ? `<path d="${div.d}" fill="url(#sg-hatch)" stroke="none" clip-path="url(#sg-clip)"/>` : ''}
    <path d="${SHIELD}" stroke-width="2.2"/>
    <path d="M82 82H318V230C318 322 262 376 200 410C138 376 82 322 82 230Z" stroke-width=".9" opacity=".7"/>
    <g transform="translate(128 150) scale(6)" stroke-width=".42">${CHARGE[cat] || CHARGE.other}</g>
    <g transform="translate(96 96) scale(1.6)" stroke-width=".9">${virtue.d}</g>
    <g transform="translate(266 96) scale(1.6)" stroke-width=".9">${virtue.d}</g>
    <path d="M40 456C80 446 120 470 200 470S320 446 360 456L346 476L360 496C320 486 280 506 200 506S80 486 40 496L54 476Z" fill="#000" stroke-width="1.6"/>
    <text x="200" y="${494 - (21 - fs) / 2}" text-anchor="middle" fill="#fff" stroke="none" font-family="Cormorant Garamond, Georgia, serif" font-size="${fs}" letter-spacing="2"${fit}>${esc(label)}</text>
    <text x="200" y="536" text-anchor="middle" fill="#fff" stroke="none" opacity=".7" font-family="Cormorant Garamond, Georgia, serif" font-size="15" font-style="italic" letter-spacing="2">${virtue.motto}</text>
  </g>
</svg>`;
    stage.innerHTML = svg;
    const blazon = $('[data-sigil-blazon]');
    if (blazon) blazon.textContent = `${div.n}, with the ${form.cat.selectedOptions[0].textContent.toLowerCase()} charge and two marks of ${virtue.word.toLowerCase()}. Motto: ${virtue.motto}.`;
    return svg;
  };

  form.addEventListener('input', draw);
  form.addEventListener('submit', (e) => e.preventDefault());
  draw();

  const slug = () => ((form.name.value || 'sigil').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'sigil');
  const toPng = () => new Promise((resolve, reject) => {
    const svg = draw();
    const img = new Image();
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = 1080; c.height = 1350;
      const x = c.getContext('2d');
      x.fillStyle = '#000'; x.fillRect(0, 0, c.width, c.height);
      x.drawImage(img, 154, 70, 772, 1081);
      x.fillStyle = 'rgba(255,255,255,.55)';
      x.font = '28px Georgia, serif';
      x.textAlign = 'center';
      x.fillText('Forged at knght.com/sigil', 540, 1290);
      URL.revokeObjectURL(url);
      c.toBlob((b) => (b ? resolve(b) : reject(new Error('png'))), 'image/png');
    };
    img.onerror = reject;
    img.src = url;
  });
  const save = (blob, name) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  const track = (event, extra) => { if (window.KNGHT_TRACK) window.KNGHT_TRACK(event, extra); };

  const pngBtn = $('[data-sigil-png]'), svgBtn = $('[data-sigil-svg]'), shareBtn = $('[data-sigil-share]');
  if (pngBtn) pngBtn.addEventListener('click', async () => { save(await toPng(), `${slug()}-sigil.png`); track('sigil_download', { format: 'png', category: form.cat.value }); });
  if (svgBtn) svgBtn.addEventListener('click', () => { save(new Blob([draw()], { type: 'image/svg+xml' }), `${slug()}-sigil.svg`); track('sigil_download', { format: 'svg', category: form.cat.value }); });
  if (shareBtn) {
    shareBtn.hidden = !navigator.share;
    shareBtn.addEventListener('click', async () => {
      try {
        const file = new File([await toPng()], `${slug()}-sigil.png`, { type: 'image/png' });
        const data = { title: 'My sigil', text: 'Forged at knght.com/sigil', url: 'https://knght.com/sigil/' };
        await navigator.share(navigator.canShare && navigator.canShare({ files: [file] }) ? { ...data, files: [file] } : data);
        track('sigil_share', { category: form.cat.value });
      } catch (err) { /* cancelled */ }
    });
  }

  /* Optional: send the sigil by email when a form endpoint is set */
  const lead = $('[data-sigil-lead]');
  const endpoint = lead && lead.dataset.endpoint;
  if (lead) {
    lead.hidden = !endpoint;
    lead.addEventListener('submit', async (e) => {
      e.preventDefault();
      const status = $('[data-sigil-status]', lead);
      const email = lead.email.value.trim();
      if (!lead.consent.checked || !/^\S+@\S+\.\S+$/.test(email)) { status.textContent = 'Add your email and tick the box.'; return; }
      status.textContent = 'Sending…';
      try {
        const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ _subject: `Sigil request: ${form.name.value || 'unnamed'}`, email, consent: true, source: 'sigil', name: form.name.value, category: form.cat.value, virtue: form.virtue.value }) });
        if (!res.ok) throw new Error(res.status);
        status.textContent = 'Sent. We will email your sigil within one business day.';
        track('sigil_lead', { category: form.cat.value });
      } catch (err) { status.textContent = 'That did not go through. Email sho@knght.com and we will send it.'; }
    });
  }
})();
