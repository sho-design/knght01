# KNGHT Order

KNGHT's own serif. It is built from three open fonts, so the letters are familiar, but no other font has this combination.

| Style | Built from |
|---|---|
| Regular | Cormorant Garamond Medium for the lowercase, figures and punctuation. Ibarra Real Nova capitals, scaled to Cormorant's cap height, with Ibarra's own kerning. |
| Italic | Cormorant Garamond Medium Italic for the capitals, figures and punctuation. Instrument Serif Italic lowercase, scaled up to sit with the roman, with its own kerning. |

Both styles carry the KNGHT knight from `src/assets/knght-chess.svg` at U+265E. Type `♞` or `&#9822;` to set it.

Old ligatures and stylistic alternates that would bring back a replaced letter (Cormorant's Th, for example) are removed. The hinting is removed too. Modern browsers render unhinted fonts smoothly.

```
fonts/KNGHTOrder-Regular.ttf          full character set, for design apps
fonts/KNGHTOrder-Italic.ttf
fonts/KNGHTOrder-Regular.latin.woff2  for the web: Latin, Latin-1 and the knight, about 27 KB each
fonts/KNGHTOrder-Italic.latin.woff2
sources/                              the four source files and their licences
build.py                              rebuilds fonts/ from sources/
OFL.txt                               the licence for KNGHT Order
```

## Rebuild

```
pip install fonttools brotli skia-pathops
python3 type/knght-order/build.py
```

The scale factors, which glyphs come from which font and the knight's size are all near the bottom of `build.py`.

## Use on the web

```css
@font-face{font-family:"KNGHT Order";src:url(/assets/fonts/KNGHTOrder-Regular.latin.woff2) format("woff2");font-weight:400;font-style:normal;font-display:swap}
@font-face{font-family:"KNGHT Order";src:url(/assets/fonts/KNGHTOrder-Italic.latin.woff2) format("woff2");font-weight:400;font-style:italic;font-display:swap}
```

The site does not use the font yet. Putting it live means copying the two woff2 files to `public/assets/fonts/`, adding the rules above to `site.css`, putting `"KNGHT Order"` at the front of `--serif`, and dropping Cormorant from the Google Fonts link. Vercel serves the files from the site's own domain, so the CSP needs no change.

## Licence

KNGHT Order is a modified version of fonts under the SIL Open Font License 1.1, so it is under the same licence (see `OFL.txt`). KNGHT can use it anywhere, including in client work, print and logos. If KNGHT gives the font files to anyone, they go with the licence, and the font cannot be sold on its own. None of the source fonts has a Reserved Font Name, so the name KNGHT Order is free to use.
