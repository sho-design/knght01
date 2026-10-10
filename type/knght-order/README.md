# KNGHT Order

KNGHT's own serif. Cormorant Garamond, with three changes that make it KNGHT's:

1. **Engraved capitals.** Every capital has one hairline cut down the middle of its thick strokes, the way capitals are cut into stone or engraved on a banknote. Thin strokes stay whole, so the line shows at headline sizes and disappears in small text.
2. **The KNGHT glyphs.** The chess set, the chapters and menu, the seven layers, the categories, the ways in, the free tools, the nine worlds and the brand marks are letters in the font, each in a hairline and a filled version, one icon per thing. They sit on the baseline and take the text colour.
3. **One weight up for small text.** A Medium cut for anything under about 28px, where Cormorant's hairlines thin out on phones.

## Styles

| File | From | Capitals |
|---|---|---|
| KNGHTOrder-Regular | Cormorant Garamond 400 | Engraved. `ss01` gives the plain ones |
| KNGHTOrder-Italic | Cormorant Garamond 400 Italic | Engraved. `ss01` gives the plain ones |
| KNGHTOrder-Medium | Cormorant Garamond 500 | Plain. `ss01` gives the engraved ones |
| KNGHTOrder-MediumItalic | Cormorant Garamond 500 Italic | Plain. `ss01` gives the engraved ones |

Use Regular and Italic for headlines and anything 28px and up. Use Medium below that.

## The KNGHT glyphs

**One icon per thing, everywhere.** KNGHT's icons are one vocabulary. Every icon means one thing, and every thing has one icon, on the site, on the signs the free tools print, and in this font. The list lives in `src/lib/marks.json`: each mark's id, what it means, its drawing, its code point and its typed names. The site's pages read it, this font is built from it, and `npm run marks` (which also runs before every build) fails if any icon on the site is not on the list, or if a drawing, name or code point repeats. To add a mark, add it to `marks.json`, then rebuild the font.

Type a mark's name between colons, such as `:knight:`, and it turns into the glyph, or use the character itself. Browsers turn these shortcuts off on letter-spaced text, so use the character there. Where a mark has more than one name, the names mean the same thing (`:score:` and `:self-check:`); `marks.json` lists them all.

| Group | Type | Characters |
|---|---|---|
| **Chess** | `:king:` `:queen:` `:rook:` `:bishop:` `:knight:` `:pawn:`, and `:king-line:` … `:pawn-line:` | U+265A to U+265F, U+2654 to U+2659 |
| **The five chapters** | `:worlds:` `:work-with-us:` `:the-layers:` `:self-check:` `:verdict:` | U+E061 to U+E065 |
| **The rest of the menu** | `:who-its-for:` `:how-it-works:` `:rules-journal:` `:free-tools:` | U+E066 to U+E069 |
| **The seven layers** | `:lore:` `:law:` `:language:` `:map:` `:ground:` `:artifacts:` `:machinery:` | U+E001 to U+E007 |
| **The categories** | `:clinics:` `:dental:` `:medspas:` `:law-firms:` `:spirits:` `:food-and-drink:` `:fitness:` `:creative:` `:other:` | U+E041 to U+E049 |
| **The ways in** | `:the-build:` `:the-keep:` `:proposal:` | U+E04A to U+E04C |
| **The free tools (the Armoury)** | `:line:` `:check:` `:reply:` `:plain:` `:cartographer:` `:herald:` `:waymarks:` `:sigil:` `:leak:` `:keep:` | U+E051 to U+E05A |
| **Sign pictograms (Herald and Waymarks)** | `:review:` `:book:` `:wifi:` `:contact:` `:link:` `:wait:` `:reception:` `:washroom:` `:room:` `:this-way:` `:staff-only:` `:way-out:` `:quiet:` `:thanks:` | U+E071 to U+E07E |
| **The nine worlds** | `:restoration:` `:blacklotus:` `:castleblack:` `:lisadang:` `:lorelyns:` `:rumraiders:` `:torontobeauty:` `:wellfit:` `:artcolouring:` | U+E011 to U+E019 |
| **Brand marks** | `:seal:` `:crown:` `:crystal:` `:divider:` | U+E022 to U+E027 |
| **Arms** | `:helm:` `:swords:` `:laurel:` `:gavel:` | U+E028 to U+E02B |
| **From the hero film** | `:stone:` `:runering:` `:tower:` `:airship:` `:torch:` | U+E02C to U+E030 |
| **From the footer scenes** | `:candle:` `:sunrise:` `:spyglass:` | U+E031 to U+E034 |

The chess pieces come from `src/assets/knght-chess.svg`; the chess knight is KNGHT's own mark.

**Filled versions.** Every mark from U+E001 on has a solid version 0x100 above it (U+E101 for Lore), typed with `-fill`, such as `:seal-fill:`. Turning on `ss02` ("Filled marks") swaps every mark at once. Closed shapes fill and the lines inside them are cut out. Marks drawn only in lines look the same in both.

## Files

```
fonts/*.ttf          full character set, for Figma, Canva, Illustrator and print
fonts/*.latin.woff2  for the web: Latin, Latin-1, the chess set and every KNGHT glyph
sources/             Cormorant Garamond, the four weights it is built from, and its licence
../../src/lib/marks.json   every KNGHT mark (the icon vocabulary the site uses too)
build.py             rebuilds fonts/ from sources/
OFL.txt              the licence for KNGHT Order
```

## Rebuild

```
pip install fonttools brotli skia-pathops
python3 type/knght-order/build.py
```

The engraving depth, hairline weight and glyph list are at the bottom and top of `build.py`.

## Use on the web

```css
@font-face{font-family:"KNGHT Order";src:url(/assets/fonts/KNGHTOrder-Regular.latin.woff2) format("woff2");font-weight:400;font-style:normal;font-display:swap}
@font-face{font-family:"KNGHT Order";src:url(/assets/fonts/KNGHTOrder-Italic.latin.woff2) format("woff2");font-weight:400;font-style:italic;font-display:swap}
@font-face{font-family:"KNGHT Order";src:url(/assets/fonts/KNGHTOrder-Medium.latin.woff2) format("woff2");font-weight:500;font-style:normal;font-display:swap}
@font-face{font-family:"KNGHT Order";src:url(/assets/fonts/KNGHTOrder-MediumItalic.latin.woff2) format("woff2");font-weight:500;font-style:italic;font-display:swap}
```

The site does not use the font yet. Putting it live means copying the woff2 files to `public/assets/fonts/`, adding the rules above to `site.css`, putting `"KNGHT Order"` at the front of `--serif`, setting serif text under 28px to `font-weight:500`, and dropping Cormorant from the Google Fonts link. The site's security policy already allows fonts from its own domain.

## Licence

KNGHT Order is a modified version of Cormorant Garamond, which is under the SIL Open Font License 1.1, so KNGHT Order is under the same licence (see `OFL.txt`). KNGHT can use it anywhere, including client work, print and logos. If KNGHT gives the font files to anyone, the licence goes with them, and the font cannot be sold on its own. Cormorant has no Reserved Font Name, so the name KNGHT Order is free to use.
