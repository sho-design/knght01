# KNGHT.com

The marketing site for KNGHT, a brand worldbuilding studio for regulated businesses in Ontario.

It is a static site with no build step. Open `index.html` or serve the folder from any static host (Vercel, Netlify, GitHub Pages, Cloudflare Pages).

```
index.html            page, copy, structured data
assets/js/vendor/     lenis.min.js (smooth scroll, MIT)
assets/css/site.css   design tokens and all styles
assets/js/site.js     intro, scroll choreography, cursor (no dependencies)
favicon.svg           sword mark (plus favicon-32.png, apple-touch-icon.png, icon-192/512.png)
og.jpg                1200x630 share image for links
404.html              not-found page (served automatically by Vercel, Netlify, GitHub Pages)
robots.txt            open to search engines and AI crawlers, points to the sitemap
sitemap.xml           pages for search engines
llms.txt              plain-language summary of KNGHT for AI assistants
site.webmanifest      name, colours and icons for home-screen installs
scripts/localize-assets.sh   copies hosted media into assets/media/
```

## Sections

1. **Hero**: a looping Seedance 2.5 film. A blade of light travels down a sword, and the headline is revealed line by line after a short intro.
2. **Categories marquee**: clinics, medspas, law, spirits, coffee, food.
3. **Thesis**: the stakes paragraph. Its words light up as you scroll.
4. **Worlds**: a pinned horizontal gallery of the seven worlds. It becomes a vertical stack on phones.
5. **Seven layers**: a sticky dial with a numeral that rolls from 1 to 7, plus a blade line that fills as you read.
6. **Score your world**: a seven-question self-check, one question per layer. A segmented dial fills with each answer and the page returns a score out of 70, a verdict band and the weakest layer. "Book the full Verdict" opens an email with the answers filled in. Nothing is stored or sent unless the visitor sends that email.
7. **Three ways in**: the one white page in the site. It opens edge to edge as it scrolls in.
8. **Verdict**: a Seedance 2.5 film in which a spotlight snaps on over an obsidian knight. It plays once when it comes into view. The cursor works as a torch that reveals a guilloche engraving. On touch screens the light drifts by itself.
9. **Footer**: a full-width wordmark that rises letter by letter and catches a foil glint.

Across the page:

- **Smooth scroll**: inertial scrolling from Lenis 1.3.26 (MIT, hosted in `assets/js/vendor/`). It is off for reduced motion.
- **Sound**: off by default. The nav toggle starts a low ambient tone, plus a blade ring at the intro and at the knight reveal. It is synthesised with Web Audio, so there are no audio files.
- **Foil sheen**: a slow silver glint on "get it wrong.", "Verdict." and the footer wordmark.

Motion respects `prefers-reduced-motion`: the intro, the films and the scroll effects are switched off and still frames are shown instead.

## Media

All imagery and film was generated with Higgsfield: GPT Image 2.5 for the stills and Seedance 2.5 for the two films. Everything was then graded to black and white and compressed. The full set of media weighs about 2.4 MB.

| Asset | Size |
| --- | --- |
| Hero film, 1920x1080, 8 s loop | 0.97 MB |
| Verdict film, 1920x1080, 6 s | 0.75 MB |
| Seven world plates, 1200x1500 WebP | 48 to 156 KB each |

The media is currently served from Higgsfield's CDN. To self-host it, run `scripts/localize-assets.sh` once and commit `assets/media/`.

## Search and AI visibility

- Title, description, canonical URL, Open Graph and Twitter tags, with `og.jpg` as the share image.
- `ProfessionalService` structured data with the logo, image, contact details, founder and the three offers.
- `robots.txt` explicitly allows AI crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended and others).
- `llms.txt` describes the studio, the seven layers, the offers and every world, linking out where the world has a site.
- After launch, submit `https://knght.com/sitemap.xml` in Google Search Console and Bing Webmaster Tools.
- Update `lastmod` in `sitemap.xml`, and the worlds list in `llms.txt`, whenever a world is added.

## Before launch

- Booking runs through `mailto:hello@sergioho.com`. Swap in a booking link (Cal.com, Calendly, Jane) when one exists.
- To capture quiz results as leads, post the answers to a form service (Formspree, Basin, a CRM webhook) in `finish()` in `site.js`.
- Add analytics and consent mode if needed (see the growth-forge tracking plan).
- Replace the world plates with real photography from each world as it becomes available.
