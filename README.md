# KNGHT.com

The marketing site for KNGHT, a brand worldbuilding studio for regulated businesses in Ontario.

It is a static site with no build step. Open `index.html` or serve the folder from any static host (Vercel, Netlify, GitHub Pages, Cloudflare Pages).

```
index.html            page, copy, structured data
assets/css/site.css   design tokens and all styles
assets/js/site.js     intro, scroll choreography, cursor (no dependencies)
favicon.svg           sword mark
scripts/localize-assets.sh   copies hosted media into assets/media/
```

## Sections

1. **Hero**: a looping Seedance 2.5 film. A blade of light travels down a sword, and the headline is revealed line by line after a short intro.
2. **Categories marquee**: clinics, medspas, spirits, coffee.
3. **Thesis**: the stakes paragraph. Its words light up as you scroll.
4. **Worlds**: a pinned horizontal gallery of the five worlds. It becomes a vertical stack on phones.
5. **Seven layers**: a sticky dial with a numeral that rolls from 1 to 7, plus a blade line that fills as you read.
6. **Three ways in**: the Verdict, the Build and the Keep.
7. **Verdict**: a Seedance 2.5 film in which a spotlight snaps on over an obsidian knight. It plays once when it comes into view.
8. **Footer**: a full-width wordmark that rises letter by letter.

Motion respects `prefers-reduced-motion`: the intro, the films and the scroll effects are switched off and still frames are shown instead.

## Media

All imagery and film was generated with Higgsfield: GPT Image 2.5 for the stills and Seedance 2.5 for the two films. Everything was then graded to black and white and compressed. The full set of media weighs about 2.2 MB.

| Asset | Size |
| --- | --- |
| Hero film, 1920x1080, 8 s loop | 0.97 MB |
| Verdict film, 1920x1080, 6 s | 0.75 MB |
| Five world plates, 1200x1500 WebP | 48 to 121 KB each |

The media is currently served from Higgsfield's CDN. To self-host it, run `scripts/localize-assets.sh` once and commit `assets/media/`.

## Before launch

- Booking runs through `mailto:hello@sergioho.com`. Swap in a booking link (Cal.com, Calendly, Jane) when one exists.
- Add analytics and consent mode if needed (see the growth-forge tracking plan).
- Replace the world plates with real photography from each world as it becomes available.
