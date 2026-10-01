#!/usr/bin/env python3
"""Builds the codex page for each world into worlds/<slug>/index.html.

Edit WORLDS (facts about each business) or CATEGORY (what each layer means in a
category), then run:  python3 scripts/build-worlds.py
Only put verified facts in WORLDS. The page says what the world is and which
rules govern it; it does not claim specific deliverables unless you add them.
"""
import html
import os

from PIL import Image  # pip install pillow; reads portfolio image sizes

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CDN = "https://d2ol7oe51mr4n9.cloudfront.net/user_2vgr4LDcTnBdquYG4fMZ396AWcW"

CATEGORY = {
    "clinic": {
        "short": "clinics",
        "label": "Healthcare",
        "rules": [
            ("CPSO", "Advertising by physicians must be factual and verifiable, with no testimonials."),
            ("Health Canada", "Limits on advertising prescription drugs and medical devices to the public."),
            ("PHIPA", "Ontario's rules for every piece of patient information the world touches."),
            ("Competition Act", "No false or misleading claims, and pricing that shows the full cost."),
        ],
        "Law": "CPSO advertising rules, Health Canada drug and device advertising, and PHIPA for every patient record the site touches.",
        "Language": "No testimonials, no promised outcomes, and a voice patients trust before they book.",
        "Map": "Service pages patients and AI assistants can answer from, and a Google Business Profile for each location.",
        "Artifacts": "Intake and consent forms, aftercare sheets and signage, each checked before print.",
    },
    "medspa": {
        "short": "medspas",
        "label": "Aesthetics",
        "rules": [
            ("CPSO and CNO", "Rules for the physicians and nurses who prescribe and deliver treatments."),
            ("Health Canada", "Prescription drugs cannot be promoted to the public by brand name."),
            ("Competition Act", "No false or misleading claims, and pricing that shows the full cost."),
        ],
        "Law": "CPSO and CNO rules, and Health Canada limits on naming prescription drugs to the public.",
        "Language": "Treatment language that sells the result without naming the drug or promising the outcome.",
        "Map": "Treatment pages that rank, and booking that starts from search or social.",
        "Artifacts": "Consent forms, price menus and aftercare cards that match the room and the rules.",
    },
    "law": {
        "short": "law firms",
        "label": "Legal services",
        "rules": [
            ("Law Society of Ontario", "Marketing must not be false or misleading. Only Certified Specialists may use the title."),
            ("Contingency fee rules", "Any advertised contingency arrangement must be explained in full."),
            ("Competition Act", "No false or misleading claims about services or outcomes."),
        ],
        "Law": "The Law Society of Ontario's rules on marketing, specialist titles and contingency fees.",
        "Language": "Plain, careful language that earns trust without promising outcomes.",
        "Map": "Practice-area pages that answer the questions clients ask search engines and AI assistants.",
        "Artifacts": "Retainer packages, intake forms and letterhead that look as careful as the work.",
    },
    "spirits": {
        "short": "spirits",
        "label": "Beverage alcohol",
        "rules": [
            ("AGCO", "Ontario's liquor advertising standards: no appeal to minors and no promotion of excess."),
            ("CRTC alcohol code", "No emphasis on strength, and no link to social, sexual or business success."),
            ("CFIA", "Labelling rules for every can, bottle and case."),
            ("LCBO", "Listing, packaging and promotional requirements for the provincial channel."),
        ],
        "Law": "AGCO advertising standards, the CRTC alcohol code, CFIA labelling and LCBO listing requirements.",
        "Language": "Lore and flavour, never strength, excess or social success.",
        "Map": "A where-to-buy map, an age-gated site and a page for every product.",
        "Artifacts": "Labels, cases, shelf talkers and sell sheets ready for buyers and inspectors.",
    },
    "coffee": {
        "short": "coffee",
        "label": "Food and beverage",
        "rules": [
            ("CFIA", "Food labelling for everything sold to take home."),
            ("Competition Act", "Sourcing and environmental claims now need proof."),
            ("Public health", "Food premises rules for the room itself."),
        ],
        "Law": "CFIA labelling, the Competition Act and its rules on sourcing and green claims.",
        "Language": "A voice regulars repeat, and sourcing claims you can prove.",
        "Map": "A Google Business Profile that wins the map pack, and a site that sells between visits.",
        "Artifacts": "Menus, bags, cups and boards that hold one standard.",
    },
    "food": {
        "short": "food",
        "label": "Allergen-friendly food",
        "rules": [
            ("CFIA", "Allergen labelling and free-from claims that must hold for every batch."),
            ("Health Canada", "Defined rules for nutrition and health claims."),
            ("Competition Act", "No false or misleading claims, including on price."),
        ],
        "Law": "CFIA allergen labelling and free-from claims, and Health Canada nutrition and health claims.",
        "Language": "Indulgent copy that never overstates a health or allergen claim.",
        "Map": "Product pages, a retailer locator and a shop built for search and AI answers.",
        "Artifacts": "Labels, ingredient panels and retail packaging checked line by line.",
    },
    "fitness": {
        "short": "fitness",
        "label": "Fitness and wellness",
        "rules": [
            ("Consumer Protection Act", "Ontario's rules for gym memberships, including a cooling-off period and limits on contract length."),
            ("Competition Act", "No false or misleading claims about results, and pricing that shows the full cost."),
            ("CASL", "Consent before every commercial email and text."),
        ],
        "Law": "Ontario's Consumer Protection Act for memberships, the Competition Act for claims and pricing, and CASL for every message.",
        "Language": "Energy that sells the class without promising the body.",
        "Map": "A Google Business Profile and local search that fill the floor, and booking that starts from social.",
        "Artifacts": "Walls, cards, gift cards and merch that carry one mark.",
    },
    "creative": {
        "short": "creative products",
        "label": "Creative products",
        "rules": [
            ("Competition Act", "No false or misleading claims, including what a product does for wellbeing."),
            ("Copyright Act", "Clear rights to every illustration and line of text, including AI-assisted art."),
            ("Marketplace policies", "Amazon and Shopify rules for listings, content and claims."),
            ("CASL", "Consent before every commercial email."),
        ],
        "Law": "The Competition Act on claims, the Copyright Act on every illustration, and the marketplace rules each title is sold under.",
        "Language": "Listings, ad copy and search terms that sell the feeling without overstating it.",
        "Map": "Listings and a store that rank on Amazon, Shopify and search.",
        "Artifacts": "Covers, interiors and series templates that hold one standard across every title.",
    },
}

LAYERS = [
    ("Lore", "Who you are, who you stand against, and what you are called. The brief and the codex every other layer reads from."),
    ("Law", "What you can say, what you can charge, and how it is packaged. Offers and claims checked against your regulator."),
    ("Language", "Voice, hooks, content and ads. Written to stop the scroll and pass review."),
    ("Map", "Site, search and AI visibility. Where people find your world and how they enter it."),
    ("Ground", "The physical space. Arrival, flow, signage and the screens on your walls."),
    ("Artifacts", "Print, labels, packaging and forms. Everything a customer holds."),
    ("Machinery", "Intake, booking, follow-up and reporting. The systems that keep the world running without you."),
]

WORLDS = [
    {
        "slug": "restoration-medical", "name": "Restoration", "em": "Medical", "cat": "clinic",
        "line": "Physician-led clinics in Thornhill and Woodbridge, built across five service lines.",
        "about": ["Restoration Medical is a physician-led clinic group in Thornhill and Woodbridge, Ontario.",
                  "Its world holds five service lines under one name: family medicine, a pain centre, medical aesthetics, infusion therapy, and rehab and recovery."],
        "where": "Thornhill and Woodbridge, Ontario", "url": None,
        "plate": "83599bbc-73e5-49fc-9d23-e2025bdcb852.webp", "film": "https://d2ol7oe51mr4n9.cloudfront.net/user_2vgr4LDcTnBdquYG4fMZ396AWcW/850eb902-d4a5-424e-a6cc-84a3ba62df2b.mp4",
        "alt": "Folded white linen and a surgical steel instrument on black marble",
    },
    {
        "slug": "black-lotus-coffee", "name": "Black Lotus", "em": "Coffee", "cat": "coffee",
        "line": "A conscious coffee brand rooted in Vietnamese tradition and modern wellness.",
        "about": ["Black Lotus Coffee House is a coffee brand rooted in Vietnamese tradition and wellness, built for high performers and conscious drinkers.",
                  "KNGHT's founder was on the founding team. The world honours its origin story and still holds its own in a crowded global market of wellness coffee."],
        "where": "Da Nang, Vietnam", "url": None,
        "built": [
            ("Lore", "A brand that bridges Vietnamese culture and wellness performance."),
            ("Artifacts", "Labels, packaging and mockups for direct-to-consumer and retail."),
            ("Map", "A Shopify store built for bundles and subscriptions."),
            ("Ground", "The launch strategy for a physical retail space in Da Nang."),
        ],
        "impact": "The brand grew from online sales into local retail and is now exploring export. It is known for holding cultural roots and modern wellness in one mark.",
        "plate": "3d266ebf-aafe-43c9-a611-071e4fa225d5.webp", "film": "https://d2ol7oe51mr4n9.cloudfront.net/user_2vgr4LDcTnBdquYG4fMZ396AWcW/9bc2161b-3fbe-4d64-9aa9-a550d24089dd.mp4",
        "alt": "A black espresso cup with rising steam beside a black lotus flower",
    },
    {
        "slug": "castleblack-spirits", "name": "Castleblack", "em": "Spirits", "cat": "spirits",
        "line": "Premium Jamaican rum from St. Mary, carried by a story of heritage.",
        "about": ["Castleblack Spirits is a premium rum distilled in St. Mary, Jamaica.",
                  "Its first brand leaned on pirate lore that did not land at home. The world was rebuilt around Jamaican heritage and flavour, with the same depth of story and none of the baggage."],
        "where": "St. Mary, Jamaica", "url": None,
        "built": [
            ("Lore", "A new flavour-led brand narrative, rooted in Jamaican pride."),
            ("Artifacts", "A label system, with bottles and packaging sourced worldwide, plus barcodes, point-of-sale and digital collateral."),
            ("Map", "A landing page and sales presentation tools."),
            ("Language", "A marketing strategy and social ad campaigns."),
        ],
        "impact": "Better reception, stronger sales and no local pushback. Castleblack now pours in bars, restaurants and hotels, and distributors have carried it to more than five countries.",
        "plate": "f9f4237f-3a1c-4d7b-970d-325e798efbcc.webp", "film": "https://d2ol7oe51mr4n9.cloudfront.net/user_2vgr4LDcTnBdquYG4fMZ396AWcW/855d452e-bd6f-46b8-9a09-a593c1dd1f1a.mp4",
        "alt": "A dark bottle and a glass of rum on castle stone, lit by a candle",
    },
    {
        "slug": "toronto-beauty", "name": "Toronto", "em": "Beauty", "cat": "medspa",
        "line": "A growing network of aesthetic nurses across the GTA, under one mark.",
        "about": ["Toronto Beauty is a growing network of aesthetic nurses offering cosmetic treatments across the Greater Toronto Area.",
                  "Its world holds medical trust and luxury beauty in one mark, and gives every nurse in the network a presence of their own."],
        "where": "Greater Toronto Area", "url": None,
        "built": [
            ("Lore", "Real and AI-generated nurse portraits, held to one look."),
            ("Language", "Educational content, AI-generated podcasts, and targeted Google, Instagram and Facebook campaigns."),
            ("Map", "A WordPress site with a profile for every nurse and a map search."),
        ],
        "impact": "Reels passed 100K views in aggregate. Leads rose across paid and organic. The site now recruits practitioners as well as clients.",
        "plate": "2c1fbed2-57af-403d-aba0-96e21e6f1312.webp", "film": "https://d2ol7oe51mr4n9.cloudfront.net/user_2vgr4LDcTnBdquYG4fMZ396AWcW/9b9465fa-41d8-471f-a259-18a3fc986ee6.mp4",
        "alt": "A marble face in profile with a single drop of serum falling from a pipette",
    },
    {
        "slug": "lorelyns", "name": "Lorelyns", "em": "Gourmet Desserts", "cat": "food",
        "line": "Nut free, gluten free, plant-based desserts, so no one sits out the celebration.",
        "about": ["Lorelyns Gourmet Desserts makes allergen-friendly desserts that are peanut and nut free, gluten free and plant based, from recipes developed since 2006.",
                  "The range runs from chocolate truffle bars to brownies, cookies and cakes, sold online, through retailers and in food service. Founded by Lorelyn Martin."],
        "where": "Greater Toronto Area", "url": "https://lorelyns.com/",
        "built": [
            ("Map", "A Shopify store, shot from existing and new product imagery."),
            ("Machinery", "Retail and wholesale ordering, with training so orders and updates run in house."),
            ("Artifacts", "Cards, tent displays and trade banners."),
        ],
        "impact": "A wider customer base, wholesale clients, and a sharper presence at events and on retail shelves. The structure to take on new commercial accounts.",
        "plate": "d7cffe34-9afd-4d03-baed-1ff5c1e4e99c.webp", "film": "https://d2ol7oe51mr4n9.cloudfront.net/user_2vgr4LDcTnBdquYG4fMZ396AWcW/bbc35de0-9c24-4720-b5e1-b2a367da6c03.mp4",
        "alt": "A broken dark chocolate truffle bar and a fudge brownie with flakes of sea salt on slate",
    },
    {
        "slug": "rum-raiders-ring", "name": "Rum\u00a0Raiders", "em": "Ring", "cat": "spirits",
        "line": "Premium rum RTDs and spirits, poured in a growing network of Ontario bars and stores.",
        "about": ["Rum Raiders Ring makes premium rum RTDs and spirits under the line “The Ring Is Calling.”",
                  "The RTDs are Gilded Pearl, Twisted Jewel, Spicy Siren and Pirate’s Kiss, alongside spiced, white, elderflower and coconut rums, poured in bars, restaurants and stores across Ontario."],
        "where": "Ontario", "url": "https://rumraider.com/",
        "plate": "eb66760c-d16c-43f8-976d-74c89aec4849.webp", "film": "https://d2ol7oe51mr4n9.cloudfront.net/user_2vgr4LDcTnBdquYG4fMZ396AWcW/7e9912bd-d83f-470c-9145-8b3ebac372e0.mp4",
        "alt": "A gold signet ring on wet sea rock beside a glass of rum on ice",
    },
    {
        "slug": "lisa-dang-immigration-law", "name": "Lisa Dang", "em": "Immigration Law", "cat": "law",
        "line": "A boutique immigration practice where every file is handled by the lawyer, start to finish.",
        "about": ["Lisa Dang Immigration Law is a boutique Canadian immigration practice.",
                  "Lisa Dang is licensed by the Law Society of Ontario, has practised immigration law exclusively since 2009, and handles every file herself, from the first consultation to submission."],
        "where": None, "url": "https://lisadanglaw.com/",
        "plate": "51ffa9fe-d28d-4fa4-bb61-b1540ff3786f.webp", "film": "https://d2ol7oe51mr4n9.cloudfront.net/user_2vgr4LDcTnBdquYG4fMZ396AWcW/eb0e5300-7279-422e-a9a3-9f34c33f7b67.mp4",
        "alt": "A brass compass and a fountain pen on a folded document in striped window light",
    },
    {
        "slug": "wellfit-social-club", "name": "Wellfit", "em": "Social Club", "cat": "fitness",
        "line": "A boutique Toronto gym, built around a graffiti wall and a community that trains together.",
        "about": ["Wellfit Social Club is a boutique fitness club in Toronto, offering personalised training and holistic wellness.",
                  "Its world had to feel high energy and inclusive at once, local and authentic, and ready to expand by franchising."],
        "where": "Toronto, Ontario", "url": None,
        "plate": "56012ed1-e8d9-41cf-853e-77e2d0d5a243.webp", "film": "https://d2ol7oe51mr4n9.cloudfront.net/user_2vgr4LDcTnBdquYG4fMZ396AWcW/ca2b8fca-641f-4227-a88b-a10c499ed6ce.mp4",
        "alt": "A kettlebell and boxing gloves on a gym floor in front of a spray-painted wall",
        "built": [
            ("Lore", "A graffiti wall concept, turned into a custom brand system and logo."),
            ("Map", "A Shopify site with bookings and e-commerce, connected to Google Analytics, Business Profile and local search."),
            ("Language", "Google Ads for awareness and sign-ups."),
            ("Artifacts", "Printed collateral for the gym floor, marketing and events."),
        ],
        "impact": "Higher local visibility, more bookings, and one brand experience online and in the gym. A clear difference in a saturated market, bringing in new members and keeping them.",
    },
    {
        "slug": "art-colouring", "name": "Art", "em": "Colouring", "cat": "creative",
        "line": "Colouring as self-expression, story and soul care.",
        "about": ["Art Colouring reimagines the colouring book, blending mindful creativity with storytelling.",
                  "Its world had to hold visual sophistication and the simple pleasure of a mindfulness tool, and stay open to a wide audience."],
        "where": None, "url": None,
        "plate": "29af57a6-44b4-4eec-9e05-c384387b9add.webp", "film": "https://d2ol7oe51mr4n9.cloudfront.net/user_2vgr4LDcTnBdquYG4fMZ396AWcW/7b34d099-139f-435c-852a-70ac56491274.mp4",
        "alt": "An open colouring book with a half-shaded baby dragon beside coloured pencils",
        "built": [
            ("Lore", "Book templates and most of the titles across its themed series."),
            ("Artifacts", "A distinct illustration style for each series."),
            ("Language", "Branding, ad copy and SEO for Amazon and Shopify listings."),
            ("Machinery", "Google Ads and Analytics across every platform."),
        ],
        "impact": "A scalable content pipeline, sold across platforms to wellness-minded, creative buyers. A hybrid of creative product and mindfulness practice, built for long-term series growth.",
    },
]

# Portfolio images (assets/work/<slug>/<n>.webp), cropped from the Sergio Ho portfolio.
WORK = {
    "toronto-beauty": ["Toronto Beauty site pages with nurse profiles, a map search and treatment menus",
                       "The Toronto Beauty site on a laptop and phone",
                       "The Toronto Beauty services brochure",
                       "Toronto Beauty social posts"],
    "black-lotus-coffee": ["Black Lotus Coffee House bags",
                           "The team outside the Black Lotus storefront in Da Nang",
                           "The Black Lotus Shopify store on a laptop and phone",
                           "Black Lotus merchandise: shirts, apron, hoodie and bottles",
                           "Black Lotus bags on a retail shelf"],
    "castleblack-spirits": ["The Castleblack rum range in a presentation banner",
                            "The Castleblack coconut rum label sheet",
                            "The Castleblack site on a laptop and phone",
                            "A Cuba Libre recipe card for Castleblack",
                            "A bottle of Castleblack spiced rum"],
    "lorelyns": ["The Lorelyns Shopify store with the variety pack",
                 "Lorelyn Martin with her desserts in a grocery store",
                 "Lorelyns business cards",
                 "Lorelyns desserts in baskets beside a tent card",
                 "A Lorelyns cookie bag"],
    "wellfit-social-club": ["The Wellfit Social Club graffiti wall inside the gym",
                            "Wellfit business cards",
                            "The Wellfit site on a laptop and phone",
                            "A Wellfit poster on the gym wall",
                            "The Wellfit tiger t-shirt"],
    "art-colouring": ["Kawaii Saurs Volume 1: cover, back cover and pages",
                      "The Art Colouring store on a laptop and phone",
                      "Four Kawaii Saurs covers",
                      "Printed Art Colouring books"],
    # Captured from the live sites and hosted on the CDN: (alt, file, width, height).
    "rum-raiders-ring": [
        ("The rumraider.com homepage over its hero film", "d4e937c0-f30b-45bb-97dd-221d1e97c2b5.webp", 1600, 1000),
        ("The rumraider.com homepage on a phone", "0c64305d-1a91-46e5-80b1-5d1f9d70c81e.webp", 780, 1460),
        ("Gilded Pearl, Twisted Jewel, Spicy Siren and Pirate's Kiss cans", "437ca3cf-3ebd-44f8-a531-2a25704182bf.webp", 2400, 1100),
        ("The RTD range on rumraider.com", "f6781d26-d4a9-46cc-a870-db9899e39e35.webp", 1600, 886),
        ("Spiced, white, elderflower and coconut rums", "c6aa4783-3ed2-4978-a660-0c0610424a19.webp", 2400, 1100),
    ],
    "lisa-dang-immigration-law": [
        ("The lisadanglaw.com homepage", "8f2c274b-d49c-4390-8755-f11a0a74c0e8.webp", 1600, 1000),
        ("The lisadanglaw.com homepage on a phone", "decd1905-4609-4c73-bd31-5a5c817edb50.webp", 780, 1688),
    ],
}

ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"]
e = html.escape


def justify(ratios, target=3.2):
    """Split images (in order) into rows whose summed aspect ratios sit closest to target."""
    n = len(ratios)
    best = [(0.0, [])] + [(float("inf"), [])] * n
    for j in range(1, n + 1):
        for i in range(j):
            total = sum(ratios[i:j])
            cost = best[i][0] + (total - target) ** 2
            if cost < best[j][0]:
                best[j] = (cost, best[i][1] + [j - i])
    return best[n][1]


def page(i, w):
    c = CATEGORY[w["cat"]]
    prev_w, next_w = WORLDS[i - 1], WORLDS[(i + 1) % len(WORLDS)]
    full = f'{w["name"]} {w["em"]}'
    film = w["film"] if "%%" not in w["film"] else ""
    rules = "\n".join(f'          <li><b>{e(t)}</b><span>{e(d)}</span></li>' for t, d in c["rules"])
    chapters = []
    for n, (name, what) in enumerate(LAYERS, 1):
        extra = f'<p class="chapter__cat">{e(c[name])}</p>' if name in c else ""
        chapters.append(f'''          <li class="chapter" data-reveal><span class="chapter__n">{n}</span><h3>{name}</h3><p>{e(what)}</p>{extra}</li>''')
    meta = [("Sector", c["label"]), ("Rules", ", ".join(t for t, _ in c["rules"]))]
    if w["where"]:
        meta.append(("Where", w["where"]))
    meta_html = "\n".join(f'            <div><dt>{k}</dt><dd>{e(v)}</dd></div>' for k, v in meta)
    if w["url"]:
        host = w["url"].split("//")[1].strip("/")
        meta_html += f'\n            <div><dt>Online</dt><dd><a class="link" href="{w["url"]}" rel="noopener">{host}</a></dd></div>'
    about = "\n".join(f"        <p>{e(p)}</p>" for p in w["about"])
    built_html = ""
    if w.get("built"):
        items = "\n".join(f'          <li><b>{e(t)}</b><span>{e(d)}</span></li>' for t, d in w["built"])
        built_html = f'''  <section class="wsec">
    <div class="wrap wsec__grid">
      <p class="eyebrow">What we built</p>
      <ul class="wrules" data-reveal>
{items}
      </ul>
    </div>
  </section>

'''
    if w.get("impact"):
        built_html += f'''  <section class="wsec">
    <div class="wrap wsec__grid">
      <p class="eyebrow">What changed</p>
      <div class="wsec__text" data-reveal>
        <p>{e(w["impact"])}</p>
      </div>
    </div>
  </section>

'''
    if w["slug"] in WORK:
        items = []
        for n, entry in enumerate(WORK[w["slug"]], 1):
            if isinstance(entry, tuple):
                alt, name, iw, ih = entry
                src = f"{CDN}/{name}"
            else:
                alt, src = entry, f"../../assets/work/{w['slug']}/{n}.webp"
                iw, ih = Image.open(os.path.join(ROOT, "assets", "work", w["slug"], f"{n}.webp")).size
            items.append((src, alt, iw, ih, iw / ih))
        rows = justify([it[4] for it in items])
        out, k = [], 0
        for size in rows:
            figs = "".join(f'\n            <figure class="wwork__item" style="flex:{r:.3f} 1 0;aspect-ratio:{iw}/{ih}"><img src="{src}" alt="{e(alt)}" width="{iw}" height="{ih}" loading="lazy" decoding="async"></figure>' for src, alt, iw, ih, r in items[k:k + size])
            out.append(f'          <div class="wwork__row" data-reveal>{figs}\n          </div>')
            k += size
        figs = "\n".join(out)
        built_html += f'''  <section class="wsec wwork">
    <div class="wrap">
      <p class="eyebrow">From the work</p>
      <div class="wwork__grid">
{figs}
      </div>
    </div>
  </section>

'''
    film_tag = f'\n            <video muted playsinline loop autoplay preload="auto" poster="{CDN}/{w["plate"]}" src="{film}" aria-hidden="true"></video>' if film else ""

    return f'''<!doctype html>
<html lang="en-CA" class="no-js">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{e(full)}: a KNGHT world</title>
<meta name="description" content="{e(w["line"])} A brand world built by Sergio Ho, founder of KNGHT.">
<meta name="theme-color" content="#000000">
<link rel="canonical" href="https://knght.com/worlds/{w["slug"]}/">
<link rel="icon" href="../../favicon.svg" type="image/svg+xml">
<link rel="icon" href="../../favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="../../apple-touch-icon.png">
<meta property="og:title" content="{e(full)}: a KNGHT world">
<meta property="og:description" content="{e(w["line"])}">
<meta property="og:url" content="https://knght.com/worlds/{w["slug"]}/">
<meta property="og:type" content="article">
<meta property="og:image" content="{CDN}/{w["plate"]}">
<meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,500&family=Hanken+Grotesk:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../../assets/css/site.css">
<script>document.documentElement.classList.replace('no-js','js')</script>
<script type="application/ld+json">
{{"@context":"https://schema.org","@type":"CreativeWork","name":"{e(full)}","description":"{e(w["line"])}","creator":{{"@type":"Organization","name":"KNGHT","url":"https://knght.com/"}}{(',"about":{"@type":"Organization","name":"' + e(full) + '","url":"' + w["url"] + '"}') if w["url"] else ''}}}
</script>
</head>
<body class="worldpage">
<a class="skip" href="#main">Skip to content</a>
<div class="grain" aria-hidden="true"></div>
<div class="cursor" aria-hidden="true"><span></span></div>

<header class="nav is-solid">
  <div class="wrap">
    <a class="mark" href="../../" aria-label="KNGHT home">
      <svg viewBox="0 0 120 600" aria-hidden="true"><circle cx="60" cy="40" r="26"/><path d="M6 140 H114 M60 66 V140 M46 160 L46 520 L60 590 L74 520 L74 160 Z"/></svg>
      KNGHT
    </a>
    <nav aria-label="Primary">
      <ul>
        <li><a href="../../#worlds">All worlds</a></li>
        <li><a href="../../#layers">The layers</a></li>
        <li><a href="../../#score">Score your world</a></li>
      </ul>
    </nav>
    <div class="nav__end">
      <button type="button" class="sound" data-sound aria-pressed="false" aria-label="Sound off. Turn sound on"><span class="sound__bars" aria-hidden="true"><i></i><i></i><i></i><i></i></span><span class="sound__label">Sound</span></button>
      <a class="btn btn--sm" href="../../book/" data-magnetic>Book a Verdict</a>
    </div>
  </div>
</header>

<main id="main">
  <section class="whero">
    <div class="wrap whero__grid">
      <figure class="whero__plate" style="view-transition-name: plate-{w["slug"]}">
        <img src="{CDN}/{w["plate"]}" alt="{e(w["alt"])}" width="1200" height="1500">{film_tag}
      </figure>
      <div class="whero__body">
        <p class="eyebrow">World {ROMAN[i]} · {e(c["label"])}</p>
        <h1 class="display whero__title">{e(w["name"])} <em>{e(w["em"])}</em></h1>
        <p class="whero__line">{e(w["line"])}</p>
        <dl class="whero__meta">
{meta_html}
        </dl>
      </div>
    </div>
  </section>

  <section class="wsec">
    <div class="wrap wsec__grid">
      <p class="eyebrow">The world</p>
      <div class="wsec__text" data-reveal>
{about}
      </div>
    </div>
  </section>

{built_html}  <section class="wsec">
    <div class="wrap wsec__grid">
      <p class="eyebrow">The rules of this world</p>
      <ul class="wrules" data-reveal>
{rules}
      </ul>
    </div>
  </section>

  <section class="wsec">
    <div class="wrap wsec__grid">
      <div class="wsec__aside">
        <p class="eyebrow">The codex</p>
        <h2 class="display wsec__h" data-split>Seven layers,<br><em>read for {e(c["short"])}</em></h2>
      </div>
      <ol class="chapters">
{chr(10).join(chapters)}
      </ol>
    </div>
  </section>

  <nav class="wnext" aria-label="More worlds">
    <a class="wnext__link" href="../{next_w["slug"]}/" data-cursor="Enter">
      <span class="wrap wnext__inner">
        <span class="eyebrow">Next world · {ROMAN[(i + 1) % len(WORLDS)]}</span>
        <span class="wnext__name">{e(next_w["name"])} <em>{e(next_w["em"])}</em></span>
        <span class="wnext__line">{e(next_w["line"])}</span>
      </span>
      <img class="wnext__plate" src="{CDN}/{next_w["plate"]}" alt="" loading="lazy" width="1200" height="1500">
    </a>
    <div class="wrap wnext__foot">
      <a class="link" href="../{prev_w["slug"]}/">Previous: {e(prev_w["name"])} {e(prev_w["em"])}</a>
      <a class="link" href="../../#worlds">All worlds</a>
    </div>
  </nav>

  <section class="wcta">
    <div class="wrap">
      <h2 class="display" data-split>Every world starts<br>with a <em class="sheen">Verdict.</em></h2>
      <p>Tell us what you are building. We will tell you what is holding it up and what will bring it down.</p>
      <div class="actions">
        <a class="btn" href="../../book/" data-magnetic>Book a Verdict
          <svg class="arrow" viewBox="0 0 18 10" aria-hidden="true"><path d="M0 5h16M12 1l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>
        </a>
        <a class="link" href="../../#score">Score your world first</a>
      </div>
    </div>
  </section>
</main>

<footer class="footer">
  <div class="wrap">
    <div class="footer__base"><span>&copy; <span data-year>2026</span> KNGHT. A Sergio Ho studio, Toronto.</span><span><a href="../../">knght.com</a></span></div>
  </div>
</footer>

<script src="../../assets/js/vendor/lenis.min.js" defer></script>
<script src="../../assets/js/site.js" defer></script>
</body>
</html>
'''


def main():
    for i, w in enumerate(WORLDS):
        d = os.path.join(ROOT, "worlds", w["slug"])
        os.makedirs(d, exist_ok=True)
        with open(os.path.join(d, "index.html"), "w", encoding="utf-8") as f:
            f.write(page(i, w))
        print("wrote", os.path.relpath(os.path.join(d, "index.html"), ROOT))


if __name__ == "__main__":
    main()
