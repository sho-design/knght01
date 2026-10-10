# KNGHT Order

KNGHT's own serif. Cormorant Garamond, with three changes that make it KNGHT's:

1. **Engraved capitals.** Every capital has one hairline cut down the middle of its thick strokes, the way capitals are cut into stone or engraved on a banknote. Thin strokes stay whole, so the line shows at headline sizes and disappears in small text.
2. **The KNGHT glyphs.** The chess set, the seven layers, the nine worlds, the categories, the three ways in, the free tools and the brand marks are letters in the font, each in a hairline and a filled version. They sit on the baseline and take the text colour.
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

Type the name between colons, such as `:knight:`, and it turns into the glyph. Or use the character itself. Browsers turn these shortcuts off on letter-spaced text, so use the character there.

| Type | Character | Glyph |
|---|---|---|
| `:king:` `:queen:` `:rook:` `:bishop:` `:knight:` `:pawn:` | U+265A to U+265F | Filled chess pieces |
| `:king-line:` … `:pawn-line:` | U+2654 to U+2659 | Hairline chess pieces |
| `:lore:` `:law:` `:language:` `:map:` `:ground:` `:artifacts:` `:machinery:` | U+E001 to U+E007 | The seven layers, in order |
| `:restoration:` `:blacklotus:` `:castleblack:` `:lisadang:` `:lorelyns:` `:rumraiders:` `:torontobeauty:` `:wellfit:` `:artcolouring:` | U+E011 to U+E019 | The nine worlds |
| `:sword:` `:seal:` `:shield:` `:crown:` `:crystal:` `:dial:` `:divider:` | U+E021 to U+E027 | Brand marks |
| `:helm:` `:swords:` `:banner:` `:key:` `:scroll:` `:laurel:` `:gavel:` | U+E028 to U+E02E | Arms |
| `:stone:` `:runering:` `:tower:` `:airship:` `:torch:` | U+E02F to U+E033 | The hero film: the sword in the stone, the rune ring (its runes spell KNGHT), the towers, the airships, the Verdict torch |
| `:candle:` `:sunrise:` `:moon:` `:spyglass:` | U+E034 to U+E037 | The footer scenes: Candle, Sunrise, Dusk and The lookout |
| `:clinics:` `:dental:` `:medspas:` `:law-firms:` `:spirits:` `:food-and-drink:` `:fitness:` `:creative:` | U+E041 to U+E048 | The categories: stethoscope, tooth, dropper, courthouse, rocks glass, bowl, dumbbell, pencil |
| `:the-verdict:` `:the-build:` `:the-keep:` | U+E049 to U+E04B | The three ways in: a rosette, the castle (also `:castle:`), a lantern |
| `:proposal:` | U+E04C | A scroll, tied and sealed |
| `:line:` `:check:` `:reply:` `:plain:` `:cartographer:` `:herald:` `:waymarks:` `:sigil:` `:leak:` `:keep:` | U+E051 to U+E05A | The Armoury tools, in the order the page lists them |

The Armoury tools share their drawings with other marks: Check is the lens, Reply the letter, Cartographer the compass, Herald the horn, Waymarks the signpost, Sigil the anvil, Leak the drop and Keep the hourglass. Both names type the same glyph.

**Filled versions.** Every mark from the layers on has a solid version 0x100 above it (U+E101 for the Lore layer), typed with `-fill`, such as `:seal-fill:`. Turning on `ss02` (named "Filled marks") swaps every mark in the text at once. Closed shapes fill, and the lines inside them are cut out. Marks drawn only in lines (language, the dial, the divider, Lisa Dang, the crossed swords, the signpost, the sunrise and the hourglass) look the same in both.

The chess pieces come from `src/assets/knght-chess.svg` and the layer and world sigils from `src/lib/sigils.ts`. The build reads both files, so a change to the artwork reaches the font on the next build. Every other mark is drawn in `build.py` on the same 24-unit grid and line weight. To add one, add a line to the right group and rebuild. The build stops if two marks share a typed name.

## Files

```
fonts/*.ttf          full character set, for Figma, Canva, Illustrator and print
fonts/*.latin.woff2  for the web: Latin, Latin-1, the chess set and every KNGHT glyph
sources/             Cormorant Garamond, the four weights it is built from, and its licence
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
