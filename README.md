# KNGHT.com

The marketing site for KNGHT, a brand worldbuilding studio for regulated businesses in Ontario.

It is built with [Astro](https://astro.build) and deployed on Vercel. Pages are static HTML; Astro builds them from content files, so there is no server to run.

```
npm install        once
npm run dev        local preview at http://localhost:4321
npm run build      builds the site into dist/ (Vercel runs this on every push)
```

```
src/content/worlds/<slug>.json   one file per world: facts, what KNGHT built on each layer, portfolio images
src/content/layers/<slug>.json   one file per layer: the question, what we make, what we check, home-page tags
src/content/for/<slug>.json      one file per category landing page
src/content/rules/<slug>.md      one Markdown file per Rules article (frontmatter: title, dek, sources, layer, for)
src/content.config.ts            the schema each content file must match (the build fails on a typo)
src/data/categories.json         what each layer means in each category, and the rules that govern it
src/data/stages.json             the five steps on the How it works page
src/pages/                       the page templates: index, worlds/[slug], for/[slug], layers/[slug], rules/, process, sigil, book, privacy, accessibility, 404
src/layouts/Base.astro           the shared head, nav and footer for inner pages
src/components/                  Meter (seven-layer meter), WorkGrid (justified image rows), Cta (closing call to action)
public/assets/css/site.css       design tokens and all styles
public/assets/js/                site.js, features.js, chapters.js, magic.js, sigil.js and vendor/lenis.min.js
public/                          favicons, og.jpg, robots.txt, llms.txt, site.webmanifest
src/lib/settings.ts              site settings: the form endpoint and the new-worlds line
src/pages/sitemap.xml.ts         the sitemap, built from the pages and content files
integrations/csp.mjs             Content Security Policy added to every page at build time (headers are in vercel.json)
src/scripts/motion.js            GSAP scroll animations (the page scripts fall back without it)
```

**Add a world:** copy a file in `src/content/worlds/`, change the facts, list only verified work under `built`, and add its images (with the layer each one shows) under `work`. The home page, its layer filter, the layer pages and the category pages pick it up on the next build.

**Add a Rules article:** add a Markdown file to `src/content/rules/` with the same frontmatter as the others.

## Sections

The home page:

1. **Hero**: on desktop, scrolling plays a Seedance 2.5 film: the sword draws itself out of the stone, spins end over end and strikes down into a crystal core, then the camera sweeps back through a turning rune ring to reveal a floating world of castles, techno-gothic towers and airships. Phones and reduced-motion visitors get the original loop. A **category picker** (Clinics, Medspas, Law firms, Spirits, Coffee, Food) makes the page read itself against that category's regulators. It reorders the worlds, rewrites the Law layer and the quiz wording, and is remembered on the next visit. Link to a category with `?for=spirits`.
2. **Categories marquee**: clinics, medspas, law, spirits, coffee, food.
3. **Thesis**: the stakes paragraph. Its words light up as you scroll.
4. **Worlds**: a pinned horizontal gallery of the nine worlds. It becomes a vertical stack on phones. Each plate plays its own short film while it is in view. Each card opens that world's page, and the image carries across the page change.
5. **Seven layers**: a sticky dial with a numeral that rolls from 1 to 7, plus a blade line that fills as you read.
6. **Score your world**: a seven-question self-check, one question per layer. A segmented dial fills with each answer and the page returns a score out of 70, a verdict band and the weakest layer. "Book the full Verdict" opens an email with the answers filled in. A wax seal is pressed when the result appears. "Download your scorecard" saves a 1080x1350 image of the result. Set `formEndpoint` in `src/lib/settings.ts`, or `PUBLIC_FORM_ENDPOINT` in Vercel's environment variables, to a form service (Formspree, Basin or a CRM webhook) to show an email field with a consent box. Until then nothing is stored or sent.
7. **Three ways in**: the one white page in the site. It opens edge to edge as it scrolls in.
8. **Verdict**: a Seedance 2.5 film in which a spotlight snaps on over an obsidian knight. It plays once when it comes into view. The cursor works as a torch that reveals a guilloche engraving. On touch screens the light drifts by itself.
9. **Footer**: a full-width wordmark that rises letter by letter and catches a foil glint.

Across the page:

- **Intake line**: "Q4 2026 · Two new worlds open" in the hero and above the offers. Change or clear `knght:intake` in the page head.

- **Smooth scroll**: inertial scrolling from Lenis 1.3.26 (MIT, hosted in `assets/js/vendor/`). It is off for reduced motion.
- **Sound**: off by default. The nav toggle starts a low ambient tone, plus a blade ring at the intro and at the knight reveal. It is synthesised with Web Audio, so there are no audio files.
- **Foil sheen**: a slow silver glint on "get it wrong.", "Verdict." and the footer wordmark.

Motion respects `prefers-reduced-motion`: the intro, the films and the scroll effects are switched off and still frames are shown instead.

## World pages

`worlds/<slug>/index.html` holds each world's film, the sector, the rules that govern it, and the seven layers read for its category, with links to the previous and next worlds. Edit the world's file in `src/content/worlds/` and the category in `src/data/categories.json`. Only add verified facts. The pages describe each world and its rules. "What we built" comes from the world's `built` entries (one line per layer, linked to the layer page); an optional `impact` entry adds "What changed". Its `work` images become a "From the work" gallery, laid out in full-width rows at build time. The page ends with a large "Next world" band.

## Category, booking and policy pages

- `for/<category>/` (clinics, medspas, law-firms, spirits, coffee, food): search landing pages built from `src/content/for/`. Each opens with a direct answer, then the rules, the seven layers for that category and its worlds.
- `book/`: the Verdict Call page with the Calendly embed and a FAQ (with FAQPage structured data).
- `privacy/` and `accessibility/`: plain-language policy pages, linked from every footer.

## Layers, process and rules

- `layers/<layer>/` for all seven layers: the question, what goes wrong without it, what we make, what we check it against, examples from the worlds and tagged gallery images.
- `process/` (how a world gets built) and `rules/` with short articles on specific rules.
- On the home page, the world cards, the layer filter, the seven-layer meters, the Artifacts and Ground drawers and the layer links are all built from the content files.

Only verified work goes in a world's `built` and `work` entries; a world with no entries shows no meter and is skipped on layer pages.

## Measurement

`assets/js/site.js` pushes events to `window.dataLayer`: `cta_click` (every link to the booking page, with label and section), `quiz_complete`, `scorecard_download`, `book_page_view`, `booking_slot_picked` and `calendly_booked` (from Calendly's own messages). Google Tag Manager loads only when `GTM_ID` near the top of the measurement block is set to your container ID. Mark `calendly_booked` as the conversion in GA4. When analytics goes live, add it to the "Who else sees it" list on the privacy page.

## Media

All imagery and film was generated with Higgsfield: GPT Image 2.5 for the stills and Seedance 2.5 for the films. Everything was then graded to black and white and compressed. A first visit on desktop loads about 4 MB of media. The rest loads as visitors reach it.

| Asset | Size |
| --- | --- |
| Hero film, 1920x1080, 8 s loop | 0.97 MB |
| Verdict film, 1920x1080, 6 s | 0.75 MB |
| Nine world plates, 1200x1500 WebP | 48 to 156 KB each |
| Scroll hero film, 1600x900, 8 s, keyframe every 3 frames | 3.6 MB (desktop only) |
| Nine world films, 600x800 loops | 100 to 440 KB each, loaded when in view |
| Wax seal film and poster | 95 KB and 48 KB |

The media is currently served from Higgsfield's CDN. To self-host it, run `scripts/localize-assets.sh` once and commit `assets/media/`.

## Search and AI visibility

- Title, description, canonical URL, Open Graph and Twitter tags, with `og.jpg` as the share image.
- `ProfessionalService` structured data with the logo, image, contact details, founder and the three offers.
- `robots.txt` explicitly allows AI crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended and others).
- `llms.txt` describes the studio, the seven layers, the offers and every world, linking out where the world has a site.
- After launch, submit `https://knght.com/sitemap.xml` in Google Search Console and Bing Webmaster Tools.
- The sitemap updates itself when a world, layer, category page or article is added. Update the worlds list in `llms.txt` by hand.

## Before launch

- Booking runs through `book/`, which embeds Calendly (`calendly.com/sho-knght/30min`). Contact email is sho@knght.com. No phone number is published.
- To capture quiz results as leads, post the answers to a form service (Formspree, Basin, a CRM webhook) in `finish()` in `site.js`.
- Add analytics and consent mode if needed (see the growth-forge tracking plan).
- Replace the world plates with real photography from each world as it becomes available.
