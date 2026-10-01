#!/usr/bin/env python3
"""Builds the layer pages, the process page and the Rules journal, and refreshes
the generated parts of index.html (layer filter, card meters, objects and spaces
walls, layer links).

Run after build-worlds.py:  python3 scripts/build-layers.py
Facts come from LAYER_EXAMPLES, WORK and WORK_TAGS in build-worlds.py.
"""
import html
import importlib.util
import json
import os
import re

from PIL import Image  # pip install pillow

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_spec = importlib.util.spec_from_file_location("bw", os.path.join(ROOT, "scripts", "build-worlds.py"))
bw = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(bw)
e = html.escape
WORLD = {w["slug"]: w for w in bw.WORLDS}

# ---------------------------------------------------------------------------
LAYER_INFO = {
    "Lore": {
        "question": "Who are you, who are you for, and who are you against?",
        "what": "The brief, the position and the name. The story every other layer reads from, written down so nobody has to guess.",
        "wrong": "Every later decision gets argued from scratch, and the brand drifts toward whoever touched it last.",
        "make": ["The brief", "A positioning line and a we-are-not line", "Name and naming checks", "The origin story", "The codex: the rules every other layer follows"],
        "check": ["Trademark and social handle availability", "Promises in the story that the business can actually keep", "The words your regulator will later hold you to"],
        "reads": None, "feeds": "Every layer",
    },
    "Law": {
        "question": "What are you allowed to say, charge and promise?",
        "what": "Offers, prices and claims checked against your regulator before anyone writes a headline.",
        "wrong": "One ad, label or offer draws a complaint, a platform takedown or a letter from your regulator, and the launch stops.",
        "make": ["A regulator map for your category", "A claims review: what you can say, and how to say it", "Offer and pricing structure", "Disclaimers and consent language"],
        "check": [],
        "reads": "Lore", "feeds": "Language, Map and Artifacts",
    },
    "Language": {
        "question": "Do you sound like one brand everywhere, and does it pass review?",
        "what": "Voice, hooks, content and ads. Written to stop the scroll and still pass platform and regulator review.",
        "wrong": "Posts sound like five different people, ads get rejected, and nothing gets repeated by customers.",
        "make": ["A voice guide with words you own and words you never use", "Hooks and content series", "Ad copy and scripts", "Captions, emails and campaign lines"],
        "check": ["Meta, Google and TikTok ad policies for your category", "Your regulator's rules on claims, testimonials and before-and-after content", "Canada's anti-spam law (CASL) for every email and text"],
        "reads": "Lore and Law", "feeds": "Map",
    },
    "Map": {
        "question": "Can people find you, and can they get in?",
        "what": "Website, search, AI visibility and the front door: where people find your world and how they enter it.",
        "wrong": "Search, maps and AI assistants send people to a competitor, or the site looks right and never books.",
        "make": ["The website", "Search and AI-assistant visibility", "Google Business Profile", "Booking, checkout and ordering entry points"],
        "check": ["Accessibility under Ontario's AODA and WCAG 2.2 AA", "Privacy under PIPEDA, and PHIPA wherever health information is involved", "Consent records under CASL"],
        "reads": "Language", "feeds": "Machinery",
    },
    "Ground": {
        "question": "Does the place feel like the brand?",
        "what": "The physical space: arrival, flow, walls, signage and the screens in the room.",
        "wrong": "The ad promises one world and the front door shows another.",
        "make": ["Arrival and flow", "Signage and wayfinding", "Walls and murals", "Screens and displays"],
        "check": ["Accessibility in the built environment", "Local sign bylaws", "Category rules on what can be shown in the room, such as price displays and age-restricted products"],
        "reads": "Lore", "feeds": "Artifacts",
    },
    "Artifacts": {
        "question": "Is everything a customer holds on brand and compliant?",
        "what": "Print, labels, packaging, menus and forms. Everything a customer can pick up.",
        "wrong": "A label gets rejected, a menu contradicts the website, and every reprint costs money.",
        "make": ["Labels and packaging", "Menus and price lists", "Forms and consent documents", "Print, merchandise and displays"],
        "check": ["CFIA labelling, including allergen declarations", "Bilingual requirements wherever they apply", "LCBO and retailer specifications"],
        "reads": "Lore and Law", "feeds": "Ground",
    },
    "Machinery": {
        "question": "Does it run without you chasing it?",
        "what": "Intake, booking, ordering, follow-up and reporting. The systems that keep the world running without you.",
        "wrong": "Leads wait, no-shows repeat, and the owner is the system.",
        "make": ["Intake and booking", "Reminders and follow-up", "Ordering and fulfilment", "Reporting you can read in a minute"],
        "check": ["Consent records under CASL", "Privacy under PIPEDA or PHIPA", "Who on your team can see what"],
        "reads": "Map", "feeds": "Lore, through what the numbers say",
    },
}
QUIZ = {  # the self-check question for each layer (same wording as the home page)
    "Lore": "Can everyone on your team say who you serve, and who you stand against, in one sentence?",
    "Law": "Has every claim on your site, ads and packaging been checked against your regulator's rules?",
    "Language": "Does your content sound like one brand, and does it pass platform review?",
    "Map": "When someone asks Google or an AI assistant for what you do nearby, do you come up?",
    "Ground": "Does your space, or the place you are sold, look and feel like your site and your ads?",
    "Artifacts": "Are your labels, forms, menus and packaging on brand and compliant?",
    "Machinery": "Do intake, booking, follow-up and reporting run without you chasing them?",
}
NAMES = [n for n, _ in bw.LAYERS]


def work_images(layer=None):
    """(slug, src, alt, w, h, layer) for every tagged gallery image."""
    out = []
    for slug, tags in bw.WORK_TAGS.items():
        entries = bw.WORK.get(slug, [])
        for n, (entry, tag) in enumerate(zip(entries, tags), 1):
            if tag is None or (layer and tag != layer):
                continue
            if isinstance(entry, tuple):
                alt, name, iw, ih = entry
                src = f"{bw.CDN}/{name}"
            else:
                alt, src = entry, f"assets/work/{slug}/{n}.webp"
                iw, ih = Image.open(os.path.join(ROOT, src)).size
            out.append((slug, src, alt, iw, ih, tag))
    return out


def rows(imgs, prefix, target=3.2, captions=True):
    """Justified rows of images (same layout as the world-page galleries)."""
    sizes = bw.justify([w / h for _, _, _, w, h, _ in imgs], target)
    out, k = [], 0
    for size in sizes:
        figs = []
        for slug, src, alt, iw, ih, _ in imgs[k:k + size]:
            s = src if src.startswith("http") else prefix + src
            cap = f'<figcaption>{e(WORLD[slug]["name"])} {e(WORLD[slug]["em"])}</figcaption>' if captions else ""
            figs.append(f'<figure class="wwork__item" style="flex:{iw / ih:.3f} 1 0;aspect-ratio:{iw}/{ih}"><img src="{s}" alt="{e(alt)}" width="{iw}" height="{ih}" loading="lazy" decoding="async">{cap}</figure>')
        out.append('<div class="wwork__row" data-reveal>' + "".join(figs) + "</div>")
        k += size
    return '<div class="wwork__grid">' + "\n".join(out) + "</div>"


def shell(depth, title, desc, path, body, body_class="worldpage", ld=None):
    up = "../" * depth
    ld_tags = "".join(f'\n<script type="application/ld+json">{json.dumps(x)}</script>' for x in (ld or []))
    return f'''<!doctype html>
<html lang="en-CA" class="no-js">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{e(title)}</title>
<meta name="description" content="{e(desc)}">
<meta name="theme-color" content="#000000">
<link rel="canonical" href="https://knght.com/{path}">
<link rel="icon" href="{up}favicon.svg" type="image/svg+xml">
<link rel="icon" href="{up}favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="{up}apple-touch-icon.png">
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(desc)}">
<meta property="og:url" content="https://knght.com/{path}">
<meta property="og:type" content="article">
<meta property="og:image" content="https://knght.com/og.jpg">
<meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,500&family=Hanken+Grotesk:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="{up}assets/css/site.css">
<script>document.documentElement.classList.replace('no-js','js')</script>{ld_tags}
</head>
<body class="{body_class}">
<a class="skip" href="#main">Skip to content</a>
<div class="grain" aria-hidden="true"></div>
<div class="cursor" aria-hidden="true"><span></span></div>

<header class="nav is-solid">
  <div class="wrap">
    <a class="mark" href="{up}" aria-label="KNGHT home">
      <svg viewBox="0 27 600 66" aria-hidden="true"><circle cx="30" cy="60" r="16"/><path d="M46 60 H120 M120 30 V90 M136 51 L530 51 L594 60 L530 69 L136 69 Z"/></svg>
      KNGHT
    </a>
    <nav aria-label="Primary">
      <ul>
        <li><a href="{up}#worlds">Worlds</a></li>
        <li><a href="{up}#layers">The layers</a></li>
        <li><a href="{up}process/">How it works</a></li>
        <li><a href="{up}rules/">Rules</a></li>
      </ul>
    </nav>
    <div class="nav__end">
      <a class="btn btn--sm" href="{up}book/" data-magnetic>Book a Verdict</a>
    </div>
  </div>
</header>

<main id="main">
{body}
</main>

<footer class="footer">
  <div class="wrap">
    <div class="footer__base"><span>&copy; <span data-year>2026</span> KNGHT, Toronto.</span><span><a href="mailto:sho@knght.com">sho@knght.com</a> · <a href="{up}privacy/">Privacy</a> · <a href="{up}accessibility/">Accessibility</a></span></div>
  </div>
</footer>

<script src="{up}assets/js/vendor/lenis.min.js" defer></script>
<script src="{up}assets/js/site.js" defer></script>
</body>
</html>
'''


def cta(up, line="Fixed fee from $3,500 CAD. Scored report in 5 business days. Fee credited to your Build within 60 days."):
    return f'''  <section class="wcta">
    <div class="wrap">
      <h2 class="display" data-split>Every world starts <br>with a <em class="sheen">Verdict.</em></h2>
      <p>{e(line)}</p>
      <div class="actions">
        <a class="btn" href="{up}book/" data-magnetic>Book a Verdict
          <svg class="arrow" viewBox="0 0 18 10" aria-hidden="true"><path d="M0 5h16M12 1l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>
        </a>
        <a class="link" href="{up}#score">Score your world first</a>
      </div>
    </div>
  </section>'''


def sec(eyebrow, inner, aside=None):
    head = f'<div class="wsec__aside"><p class="eyebrow">{eyebrow}</p>{aside or ""}</div>' if aside else f'<p class="eyebrow">{eyebrow}</p>'
    return f'''  <section class="wsec">
    <div class="wrap wsec__grid">
      {head}
      {inner}
    </div>
  </section>'''


def li_rules(pairs):
    return '<ul class="wrules" data-reveal>' + "".join(f"<li><b>{e(a)}</b><span>{e(b)}</span></li>" for a, b in pairs) + "</ul>"


# ---------------------------------------------------------------------------
def layer_page(i, name):
    info, up = LAYER_INFO[name], "../../"
    slug = name.lower()
    prev_n, next_n = NAMES[i - 1] if i else None, NAMES[i + 1] if i + 1 < len(NAMES) else None
    parts = [f'''  <section class="whero">
    <div class="wrap">
      <p class="eyebrow">Layer {i + 1} of 7</p>
      <h1 class="display book__title" style="margin-top:24px">{name}<span class="sr-only">: {e(info["question"])}</span></h1>
      <p class="layer__q">{e(info["question"])}</p>
      <p class="for__answer">{e(info["what"])}</p>
      <div class="layerbar" aria-label="The seven layers">{"".join(f'<a href="../{n.lower()}/" class="{"is-on" if n == name else ""}"{" aria-current=page" if n == name else ""}><b>{k + 1}</b>{n}</a>' for k, n in enumerate(NAMES))}</div>
    </div>
  </section>''']
    parts.append(sec("Without it", f'<div class="wsec__text" data-reveal><p>{e(info["wrong"])}</p></div>'))
    parts.append(sec("What we make", li_rules([(m, "") for m in info["make"]]).replace("<span></span>", "")))
    if name == "Law":
        pairs = [(bw.CATEGORY[c]["short"].capitalize(), bw.CATEGORY[c]["Law"]) for c in ["clinic", "medspa", "law", "spirits", "coffee", "food", "fitness", "creative"]]
        parts.append(sec("What we check it against", li_rules(pairs)))
    else:
        parts.append(sec("What we check it against", li_rules([(c, "") for c in info["check"]]).replace("<span></span>", "")))
    ex = bw.LAYER_EXAMPLES[name]
    if ex:
        items = "".join(f'<li><b><a class="link" href="{up}worlds/{s}/">{e(WORLD[s]["name"])} {e(WORLD[s]["em"])}</a></b><span>{e(t)}</span></li>' for s, t in ex)
        parts.append(sec("From the worlds", f'<ul class="wrules" data-reveal>{items}</ul>'))
    imgs = work_images(name)
    if imgs:
        parts.append(f'''  <section class="wsec wwork">
    <div class="wrap">
      <p class="eyebrow">{name}, in the work</p>
      {rows(imgs, up)}
    </div>
  </section>''')
    flow = [("Reads from", info["reads"] or "Nothing. Lore comes first."), ("Feeds", info["feeds"])]
    parts.append(sec("How it connects", li_rules(flow)))
    parts.append(f'''  <section class="wsec">
    <div class="wrap wsec__grid">
      <p class="eyebrow">Ask yourself</p>
      <div class="wsec__text" data-reveal><p>{e(QUIZ[name])}</p><p><a class="link" href="{up}#score">Score all seven layers in two minutes</a></p></div>
    </div>
  </section>''')
    nav = []
    if prev_n:
        nav.append(f'<a class="link" href="../{prev_n.lower()}/">Previous: {prev_n}</a>')
    if next_n:
        nav.append(f'<a class="link" href="../{next_n.lower()}/">Next: {next_n}</a>')
    parts.append(f'  <nav class="wrap layer__pager" aria-label="More layers">{"".join(nav)}</nav>')
    parts.append(cta(up))
    desc = f'{name}, layer {i + 1} of KNGHT\'s seven: {info["what"]}'
    if len(desc) > 158:
        desc = desc[:155].rsplit(" ", 1)[0] + "."
    ld = [{"@context": "https://schema.org", "@type": "Service", "name": f"{name}: brand layer {i + 1} of 7",
           "description": info["what"], "provider": {"@type": "ProfessionalService", "name": "KNGHT", "url": "https://knght.com/"}, "areaServed": "Ontario, Canada"}]
    return shell(2, f"{name}: layer {i + 1} of 7 | KNGHT", desc, f"layers/{slug}/", "\n\n".join(parts), "worldpage layerpage", ld)


# ---------------------------------------------------------------------------
STAGES = [
    ("The call", "Free · 30 minutes", "We look at your site and your category together and name your three biggest risks. You leave with one fix for this week and a straight answer on whether a Verdict is worth it."),
    ("The Verdict", "From $3,500 · 5 business days", "A scored audit of the world you already have, all seven layers judged against your buyer and your regulator. You get a ranked fix list, the order to do it in, and a readout call to walk through it."),
    ("The Build", "Scoped by layer", "We build the layers you are missing, Lore first, because every other layer reads from it. Each layer is signed off before the next one depends on it, and you have the dates before we start. The Verdict fee is credited to a Build that starts within 60 days."),
    ("Launch", "Ready, not revised", "The world goes live as one piece: the site, the space, the print and the systems, already checked against your rules."),
    ("The Keep", "Monthly", "We run the world after launch: content, signage, campaigns, new locations and new products. It grows without losing its rules."),
]


def process_page():
    up = "../"
    steps = "".join(f'<li class="chapter" data-reveal><span class="chapter__n">{k}</span><h3>{e(t)}</h3><p class="process__terms">{e(terms)}</p><p>{e(d)}</p></li>' for k, (t, terms, d) in enumerate(STAGES, 1))
    body = f'''  <section class="whero">
    <div class="wrap">
      <p class="eyebrow">How it works</p>
      <h1 class="display book__title" style="margin-top:24px">How a world <br>gets <em>built.</em></h1>
      <p class="for__answer">Every world goes through the same five steps. You always know what happens next, what it costs and when it lands.</p>
    </div>
  </section>

  <section class="wsec">
    <div class="wrap wsec__grid">
      <div class="wsec__aside"><p class="eyebrow">The path</p><h2 class="display wsec__h" data-split>Five steps, <br><em>in order</em></h2></div>
      <ol class="chapters">{steps}</ol>
    </div>
  </section>

{sec("Built in this order", li_rules([(f"{k}. {n}", LAYER_INFO[n]["question"]) for k, n in enumerate(NAMES, 1)]))}

{cta(up)}'''
    ld = [{"@context": "https://schema.org", "@type": "HowTo", "name": "How a KNGHT brand world gets built",
           "step": [{"@type": "HowToStep", "position": k, "name": t, "text": d} for k, (t, _, d) in enumerate(STAGES, 1)]}]
    return shell(1, "How a world gets built | KNGHT", "The five steps from a free call to a running brand world: the call, the Verdict, the Build, launch and the Keep.", "process/", body, "worldpage", ld)


# ---------------------------------------------------------------------------
RULES = [
    {
        "slug": "medspa-prescription-drug-ads",
        "title": "What a medspa can say about Botox in an ad",
        "cat": "Medspas · Health Canada",
        "dek": "Prescription drugs can be named and priced to the public. Almost nothing else.",
        "body": [
            "Botox is a brand of botulinum toxin, and in Canada it is a prescription drug. That puts it under the Food and Drug Regulations, which limit what anyone can say about a prescription drug to the general public.",
            "Under section C.01.044, advertising a prescription drug to the public is limited to its brand name, its proper or common name, its price and its quantity. That is the whole list. Claims about what the drug does, how long it lasts or what it will do for your face fall outside it.",
            "So a price menu that reads like a menu is the safe ground. A post that names the drug and promises softer lines is not. The same goes for fillers and other prescription injectables.",
            "The platforms add their own layer. Meta and Google both restrict prescription drug ads, so a post can be lawful and still be rejected. And the clinicians who prescribe and inject are bound by their own colleges, the CPSO and the CNO.",
            "What works instead: sell the consultation, the clinician and the standard of care. Talk about the visit, the assessment and who does the work. Keep the drug name to the price list.",
        ],
        "sources": [("Food and Drug Regulations, C.R.C., c. 870 (section C.01.044)", "https://laws-lois.justice.gc.ca/eng/regulations/C.R.C.,_c._870/"),
                    ("Health Canada: advertising of health products", "https://www.canada.ca/en/health-canada/services/drugs-health-products/regulatory-requirements-advertising.html")],
        "layer": "Law", "for": "medspas",
    },
    {
        "slug": "alcohol-ads-strength-and-success",
        "title": "Selling spirits without selling the buzz",
        "cat": "Spirits · CRTC and AGCO",
        "dek": "Flavour, place and story are open. Strength, excess and success are not.",
        "body": [
            "Alcohol advertising in Canada runs on two sets of rules that point the same way. The CRTC's Code for Broadcast Advertising of Alcoholic Beverages governs broadcast ads, and Ontario's AGCO applies its own advertising standards to liquor advertising in the province.",
            "Both draw the same lines. Ads must not appeal to people under the legal drinking age. They must not suggest that drinking brings social, sexual or business success. And they must not sell a brand on how strong it is.",
            "That rules out a lot of what spirits marketing reaches for by habit: the party that only starts when the bottle opens, the confident hero with a glass in hand, the proof printed large as a reason to buy.",
            "What stays open is wide: where the rum comes from, what it tastes like, how it is made, what to mix it with and the story behind the name. Heritage and flavour sell, and they sell inside the rules.",
            "Labels are a separate layer again, with CFIA labelling rules and LCBO listing requirements. Check the label as carefully as the ad.",
        ],
        "sources": [("CRTC: Code for Broadcast Advertising of Alcoholic Beverages", "https://crtc.gc.ca/eng/television/publicit/codesalco.htm"),
                    ("AGCO: liquor advertising", "https://www.agco.ca/")],
        "layer": "Law", "for": "spirits",
    },
    {
        "slug": "lawyers-and-the-word-specialist",
        "title": "Why most lawyers cannot call themselves specialists",
        "cat": "Law firms · Law Society of Ontario",
        "dek": "In Ontario, specialist is a title you earn, not a word you choose.",
        "body": [
            "The Law Society of Ontario runs a Certified Specialist program. Lawyers who meet its standards in a field of law can use the title. Everyone else cannot advertise themselves as a specialist, however much of their practice sits in that field.",
            "The Rules of Professional Conduct also require that a lawyer's marketing be accurate and not misleading. Words that imply a credential you do not hold, or an outcome you cannot promise, sit on the wrong side of that line.",
            "There is plenty of honest ground. A practice can say what it does and does not take on, how long the lawyer has practised in an area, and who handles the file. Lisa Dang Immigration Law, for example, says the lawyer handles every file herself, from consultation to submission.",
            "Precise, plain language does more for trust than a borrowed title. Clients choosing a lawyer are reading for care.",
        ],
        "sources": [("Law Society of Ontario: Rules of Professional Conduct", "https://lso.ca/about-lso/legislation-rules/rules-of-professional-conduct"),
                    ("Law Society of Ontario: Certified Specialist program", "https://lso.ca/lawyers/enhance-your-practice/certified-specialist-program")],
        "layer": "Law", "for": "law-firms",
    },
]


def rule_page(r):
    up = "../../"
    paras = "\n".join(f"        <p>{e(p)}</p>" for p in r["body"])
    srcs = "".join(f'<li><a class="link" href="{u}" rel="noopener">{e(t)}</a></li>' for t, u in r["sources"])
    body = f'''  <article>
  <section class="whero">
    <div class="wrap">
      <p class="eyebrow">Rules · {e(r["cat"])}</p>
      <h1 class="display book__title" style="margin-top:24px">{e(r["title"])}</h1>
      <p class="for__answer">{e(r["dek"])}</p>
    </div>
  </section>
  <section class="wsec">
    <div class="wrap wsec__grid">
      <p class="eyebrow">The rule</p>
      <div class="article">
{paras}
        <p class="article__note">A plain-language read, not legal advice. Rules change, so check the source or ask us before you publish.</p>
        <h2 class="article__h">Sources</h2>
        <ul class="article__sources">{srcs}</ul>
        <p><a class="link" href="{up}for/{r["for"]}/">Brand worlds for {r["for"].replace("-", " ")}</a> · <a class="link" href="{up}layers/law/">The Law layer</a> · <a class="link" href="../">All rules</a></p>
      </div>
    </div>
  </section>
  </article>

{cta(up)}'''
    ld = [{"@context": "https://schema.org", "@type": "Article", "headline": r["title"], "description": r["dek"],
           "author": {"@type": "Person", "name": "Sergio Ho"}, "publisher": {"@type": "Organization", "name": "KNGHT", "url": "https://knght.com/"},
           "datePublished": "2026-10-01", "mainEntityOfPage": f'https://knght.com/rules/{r["slug"]}/'}]
    return shell(2, f'{r["title"]} | KNGHT Rules', r["dek"], f'rules/{r["slug"]}/', body, "worldpage legalpage rulepage", ld)


def rules_index():
    items = "".join(f'<li><b><a class="link" href="{r["slug"]}/">{e(r["title"])}</a></b><span>{e(r["cat"])}. {e(r["dek"])}</span></li>' for r in RULES)
    body = f'''  <section class="whero">
    <div class="wrap">
      <p class="eyebrow">Rules</p>
      <h1 class="display book__title" style="margin-top:24px">One rule at a time, <br>and how to work <em>inside it.</em></h1>
      <p class="for__answer">Short reads on the rules that shape marketing in regulated categories. What the rule says, where people trip, and what you can say instead.</p>
    </div>
  </section>

{sec("Latest", f'<ul class="wrules" data-reveal>{items}</ul>')}

{cta("../")}'''
    return shell(1, "Rules: marketing inside the rules | KNGHT", "Short reads on the rules that shape marketing for clinics, medspas, law firms, spirits, coffee and food, and how to work inside them.", "rules/", body)


# ---------------------------------------------------------------------------
def update_home():
    p = os.path.join(ROOT, "index.html")
    s = open(p, encoding="utf-8").read()

    # data-layers and a small meter on every world card
    def card(m):
        slug = m.group(1)
        built = " ".join(n.lower() for n in bw.world_layers(slug))
        return f'data-slug="{slug}" data-layers="{built}"'
    s = re.sub(r'data-slug="([^"]+)"(?: data-layers="[^"]*")?', card, s)
    s = re.sub(r'\n\s*<span class="world__meter">.*?<!--/meter-->', "", s, flags=re.S)

    def add_meter(m):
        block, slug = m.group(0), m.group(1)
        mt = bw.meter(slug, label=False)
        if not mt:
            return block
        return re.sub(r'(<span class="world__sector">[^<]*</span>)', r'\1\n            <span class="world__meter">' + mt.replace("\\", "\\\\") + '</span><!--/meter-->', block, count=1)
    s = re.sub(r'<article class="world"[^>]*data-slug="([^"]+)".*?</article>', add_meter, s, flags=re.S)

    # layer filter chips in the worlds intro
    chips = '<div class="wfilter" role="group" aria-label="Show worlds by layer"><button type="button" class="wfilter__chip" aria-pressed="true" data-layer="">All</button>' + "".join(
        f'<button type="button" class="wfilter__chip" aria-pressed="false" data-layer="{n.lower()}">{n}</button>' for n in NAMES if bw.LAYER_EXAMPLES[n]) + "</div>"
    s = re.sub(r'\s*<!--wfilter-->.*?<!--/wfilter-->', "", s, flags=re.S)
    a = "These are the first nine.</p>" if "These are the first nine.</p>" in s else "All were built inside the rules.</p>"
    s = s.replace(a, a + f"\n          <!--wfilter-->{chips}<!--/wfilter-->", 1)

    # strip the work drawers before relinking, so the layer regex sees a clean row
    s = re.sub(r'<!--lwork-->.*?<!--/lwork-->', "", s, flags=re.S)

    # links from the codex layer list to each layer page
    for n in NAMES:
        s = re.sub(rf'(<li class="layer" data-name="{n}">.*?</ul>)(?:<a class="link layer__more"[^>]*>[^<]*</a>)?(</li>)',
                   lambda m, n=n: m.group(1) + f'<a class="link layer__more" href="layers/{n.lower()}/">The {n} layer</a>' + m.group(2), s, count=1, flags=re.S)

    # objects and spaces: a drawer of real work inside the Artifacts and Ground rows
    for n, target, label in (("Artifacts", 2.8, "Things you can hold"), ("Ground", 2.6, "Rooms you can walk into")):
        drawer = (f'<!--lwork--><details class="layer__work"><summary><span>{label}</span><span class="layer__work-n">'
                  f'{len(work_images(n))} pieces</span></summary>{rows(work_images(n), "", target=target)}</details><!--/lwork-->')
        s = s.replace(f'The {n} layer</a></li>', f'The {n} layer</a>{drawer}</li>', 1)
    s = re.sub(r'\n*<!--beyond-->.*?<!--/beyond-->\n*', "\n\n", s, flags=re.S)
    open(p, "w", encoding="utf-8").write(s)


def write(rel, text):
    d = os.path.join(ROOT, rel)
    os.makedirs(d, exist_ok=True)
    open(os.path.join(d, "index.html"), "w", encoding="utf-8").write(text)
    print("wrote", rel + "index.html")


def main():
    for i, n in enumerate(NAMES):
        write(f"layers/{n.lower()}/", layer_page(i, n))
    write("process/", process_page())
    write("rules/", rules_index())
    for r in RULES:
        write(f'rules/{r["slug"]}/', rule_page(r))
    update_home()
    print("updated index.html")


if __name__ == "__main__":
    main()
