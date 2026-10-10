"""Build KNGHT Order: Cormorant Garamond with engraved capitals and the KNGHT glyphs.

Styles     Regular and Italic (from Cormorant 400) carry the engraved capitals by default; ss01 swaps in the plain ones.
           Medium and Medium Italic (from Cormorant 500) are for text under about 28px. They keep the plain
           capitals; ss01 swaps in the engraved ones.
Engraving  one hairline cut down the middle of every stroke thicker than STEM. Thin strokes stay whole,
           so the line shows on stems and bowls and disappears at small sizes.
Glyphs     the chess set (U+2654 to U+265F) from src/assets/knght-chess.svg, the seven layers and nine worlds
           from src/lib/sigils.ts, and the brand marks, categories, tiers and Armoury tools drawn below, in the
           Private Use Area from U+E001. Each one can also be typed as a ligature, such as :lore: or :knight:.
           Every mark has a filled version 0x100 above it, typed as :lore-fill:; ss02 swaps them all.

Run from the repo root: python3 type/knght-order/build.py   (pip install fonttools brotli skia-pathops)"""
import os, re, copy, math, unicodedata
import xml.etree.ElementTree as ET
from fontTools.ttLib import TTFont, newTable
from fontTools.ttLib.tables import ttProgram, otTables as ot
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.cu2quPen import Cu2QuPen
from fontTools.pens.recordingPen import DecomposingRecordingPen
from fontTools.pens.transformPen import TransformPen
from fontTools.svgLib.path import SVGPath
from fontTools.otlLib import builder as otl
from fontTools import subset
import pathops

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.join(HERE, "..", "..")
SRC, OUT = os.path.join(HERE, "sources"), os.path.join(HERE, "fonts")

# ---------------------------------------------------------------- paths

def to_path(draw):
    p = pathops.Path(); draw(p.getPen()); return p

def clean(p):
    p.convertConicsToQuads(); p.simplify(); return p

def stroke(p, w, cap=pathops.LineCap.ROUND_CAP):
    q = pathops.Path(); p.draw(q.getPen())
    q.stroke(w, cap, pathops.LineJoin.ROUND_JOIN, 4)
    return clean(q)

def union(*ps):
    out = ps[0]
    for p in ps[1:]: out = pathops.op(out, p, pathops.PathOp.UNION)
    return out

def minus(a, b): return pathops.op(a, b, pathops.PathOp.DIFFERENCE)

def engrave(p, stem, t):
    """Cut a hairline of width t down the middle of every stroke at least `stem` thick."""
    core = minus(p, stroke(p, stem - t, pathops.LineCap.BUTT_CAP))
    return minus(p, core)

def glyph_path(font, name):
    gs = font.getGlyphSet(); rec = DecomposingRecordingPen(gs); gs[name].draw(rec)
    return clean(to_path(rec.replay))

def to_glyph(p):
    pen = TTGlyphPen(None); p.draw(Cu2QuPen(pen, 1.0, reverse_direction=True)); return pen.glyph()

# ---------------------------------------------------------------- font plumbing

def dehint(f):
    for t in ("fpgm", "prep", "cvt ", "hdmx", "LTSH", "VDMX", "DSIG"):
        if t in f: del f[t]
    for g in f["glyf"].glyphs.values():
        g.expand(f["glyf"])
        if hasattr(g, "program"): g.program = ttProgram.Program(); g.program.fromBytecode(b"")
    gasp = newTable("gasp"); gasp.version = 1; gasp.gaspRange = {0xFFFF: 0x000F}; f["gasp"] = gasp
    m = f["maxp"]
    for a in ("maxTwilightPoints", "maxStorage", "maxFunctionDefs", "maxInstructionDefs", "maxStackElements", "maxSizeOfInstructions"):
        setattr(m, a, 0)
    m.maxZones = 1

def decompose_all(f):
    gs = f.getGlyphSet()
    for g in f.getGlyphOrder():
        if f["glyf"][g].isComposite():
            rec = DecomposingRecordingPen(gs); gs[g].draw(rec); pen = TTGlyphPen(None); rec.replay(pen)
            f["glyf"][g] = pen.glyph(); f["glyf"][g].recalcBounds(f["glyf"])

def set_glyph(f, name, glyph, adv=None, gdef_class=None):
    glyf = f["glyf"]
    if name not in glyf.glyphs:
        order = f.getGlyphOrder() + [name]; f.setGlyphOrder(order); glyf.glyphOrder = order
    glyf[name] = glyph; glyph.recalcBounds(glyf)
    if adv is None: adv = f["hmtx"][name][0]
    f["hmtx"][name] = (adv, glyph.xMin if glyph.numberOfContours else 0)
    if gdef_class and "GDEF" in f and f["GDEF"].table.GlyphClassDef:
        f["GDEF"].table.GlyphClassDef.classDefs[name] = gdef_class

def lookups_of(table, tags):
    return {i for fr in table.FeatureList.FeatureRecord if fr.FeatureTag in tags for i in fr.Feature.LookupListIndex}

def subtables(lk, ext):
    for st in lk.SubTable:
        yield st.ExtSubTable if lk.LookupType == ext else st

def add_lookup(table, lk):
    table.LookupList.Lookup.append(lk); table.LookupList.LookupCount = len(table.LookupList.Lookup)
    return table.LookupList.LookupCount - 1

def add_lookup_first(table, lk):
    """Insert a lookup at the front of the list, so it runs before Cormorant's own ligatures and alternates,
    and renumber every reference to the lookups that moved."""
    table.LookupList.Lookup.insert(0, lk); table.LookupList.LookupCount = len(table.LookupList.Lookup)
    for fr in table.FeatureList.FeatureRecord:
        fr.Feature.LookupListIndex = [i + 1 for i in fr.Feature.LookupListIndex]
    for lk2 in table.LookupList.Lookup[1:]:
        for st in subtables(lk2, 7):
            for attr in ("SubstLookupRecord", "LookAheadSubstLookupRecord"):
                for rec in getattr(st, attr, None) or []: rec.LookupListIndex += 1
            for sets in ("SubRuleSet", "SubClassSet", "ChainSubRuleSet", "ChainSubClassSet"):
                for rs in getattr(st, sets, None) or []:
                    if rs is None: continue
                    for rule in (getattr(rs, "SubRule", None) or getattr(rs, "SubClassRule", None)
                                 or getattr(rs, "ChainSubRule", None) or getattr(rs, "ChainSubClassRule", None) or []):
                        for rec in rule.SubstLookupRecord: rec.LookupListIndex += 1
    return 0

def add_feature(font, tag, lookup_index, ui_name=None):
    """Add a feature to every script and language, keeping the feature list sorted by tag."""
    table = font["GSUB"].table
    feat = ot.Feature(); feat.LookupListIndex = [lookup_index]; feat.LookupCount = 1; feat.FeatureParams = None
    if ui_name:
        params = ot.FeatureParamsStylisticSet(); params.Version = 0; params.UINameID = font["name"].addName(ui_name)
        feat.FeatureParams = params
    rec = ot.FeatureRecord(); rec.FeatureTag = tag; rec.Feature = feat
    recs = table.FeatureList.FeatureRecord
    old = list(range(len(recs))); recs.append(rec)
    order = sorted(range(len(recs)), key=lambda i: (recs[i].FeatureTag, i))
    remap = {o: n for n, o in enumerate(order)}
    table.FeatureList.FeatureRecord = [recs[i] for i in order]; table.FeatureList.FeatureCount = len(recs)
    for sr in table.ScriptList.ScriptRecord:
        for ls in [sr.Script.DefaultLangSys] + [r.LangSys for r in sr.Script.LangSysRecord]:
            if ls is None: continue
            ls.FeatureIndex = sorted([remap[i] for i in ls.FeatureIndex] + [remap[len(old)]]); ls.FeatureCount = len(ls.FeatureIndex)
            if ls.ReqFeatureIndex != 0xFFFF: ls.ReqFeatureIndex = remap[ls.ReqFeatureIndex]

def append_to_feature(font, tag, lookup_index):
    for fr in font["GSUB"].table.FeatureList.FeatureRecord:
        if fr.FeatureTag == tag: fr.Feature.LookupListIndex.append(lookup_index); fr.Feature.LookupCount += 1

def clone_kerning(font, alts):
    """Give each alternate the same kerning as the glyph it stands in for. Alternates sit at the end of
    the glyph order, so appending keeps every coverage and pair list sorted by glyph ID."""
    gpos = font["GPOS"].table
    order = sorted(alts.items(), key=lambda kv: font.getGlyphID(kv[1]))
    for li in lookups_of(gpos, {"kern"}):
        for st in subtables(gpos.LookupList.Lookup[li], 9):
            if getattr(st, "LookupType", 2) != 2: continue
            if st.Format == 1:
                first = dict(zip(st.Coverage.glyphs, st.PairSet))
                for ps in st.PairSet:
                    byg = {r.SecondGlyph: r for r in ps.PairValueRecord}
                    for o, a in order:
                        if o in byg:
                            r = copy.deepcopy(byg[o]); r.SecondGlyph = a; ps.PairValueRecord.append(r)
                    ps.PairValueCount = len(ps.PairValueRecord)
                for o, a in order:
                    if o in first:
                        st.Coverage.glyphs.append(a); st.PairSet.append(copy.deepcopy(first[o]))
                st.PairSetCount = len(st.PairSet)
            else:
                for o, a in order:
                    if o in st.Coverage.glyphs: st.Coverage.glyphs.append(a)
                    if o in st.ClassDef1.classDefs: st.ClassDef1.classDefs[a] = st.ClassDef1.classDefs[o]
                    if o in st.ClassDef2.classDefs: st.ClassDef2.classDefs[a] = st.ClassDef2.classDefs[o]

def cap_family(font, caps):
    """The capitals, plus every glyph GSUB can turn one into (contextual and local forms, ligatures that start with one)."""
    gsub = font["GSUB"].table; out = set(caps); grew = True
    while grew:
        grew = False
        for lk in gsub.LookupList.Lookup:
            for st in subtables(lk, 7):
                t = getattr(st, "LookupType", lk.LookupType)
                pairs = []
                if t == 1: pairs = st.mapping.items()
                elif t == 3: pairs = [(k, v) for k, vs in st.alternates.items() for v in vs]
                elif t == 4: pairs = [(k, l.LigGlyph) for k, ls in st.ligatures.items() for l in ls]
                for k, v in pairs:
                    if k in out and v not in out: out.add(v); grew = True
    return out

# ---------------------------------------------------------------- the KNGHT glyphs

GRID = 36                     # font units per unit of the 24-unit SVG grid
BASE_Y = 21.5                 # grid y that sits on the baseline (the bottom plinth line)
SIDE = 60                     # sidebearing on each side of a mark

def grid_pen(pen):
    return TransformPen(pen, (GRID, 0, 0, -GRID, 0, BASE_Y * GRID))

def svg_path(markup, rotate=None):
    """A pathops Path from SVG elements written on the 24 grid, optionally rotated (degrees, cx, cy) on that grid."""
    doc = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">' + markup + "</svg>"
    def draw(pen):
        pen = grid_pen(pen)
        if rotate:
            deg, cx, cy = rotate; c, s = math.cos(math.radians(deg)), math.sin(math.radians(deg))
            pen = TransformPen(pen, (c, s, -s, c, cx - cx * c + cy * s, cy - cx * s - cy * c))
        SVGPath.fromstring(doc.encode()).draw(pen)
    return to_path(draw)

def hairline(spec, w):
    """Stroke a mark: SVG markup, or a list of markup and turned() parts."""
    parts = spec if isinstance(spec, list) else [spec]
    paths = [stroke(svg_path(p[3], p[:3]) if isinstance(p, tuple) else svg_path(p), w * GRID) for p in parts]
    return union(*paths)

def place(p):
    """Centre a mark between equal sidebearings and return (glyph, advance)."""
    x0, y0, x1, y1 = p.bounds
    p = to_path(lambda pen: p.draw(TransformPen(pen, (1, 0, 0, 1, SIDE - x0, 0))))
    return to_glyph(p), round(x1 - x0 + 2 * SIDE)

def chess_pieces(w):
    """{name: (filled, outline)} for each piece in the KNGHT chess sprite."""
    svg = open(os.path.join(REPO, "src", "assets", "knght-chess.svg")).read()
    svg = re.sub(r"<!--.*?-->", "", svg, flags=re.S)
    root = ET.fromstring(svg); ns = "{http://www.w3.org/2000/svg}"
    out = {}
    for sym in root.iter(ns + "symbol"):
        name = sym.get("id").replace("knght-", "")
        parts = {"outline": [], "details": [], "plinth": [], "eye": []}
        for el in sym:
            cls = (el.get("class") or "").replace("knght-", "")
            if cls in parts:
                attrs = " ".join(f'{k}="{v}"' for k, v in el.attrib.items() if k in ("d", "cx", "cy", "r"))
                parts[cls].append(f"<{el.tag.replace(ns, '')} {attrs}/>")
        body_path = svg_path("".join(parts["outline"])); body_path.fillType = pathops.FillType.EVEN_ODD
        body_line = stroke(body_path, w * GRID)
        details = hairline("".join(parts["details"]), w) if parts["details"] else None
        plinth = hairline("".join(parts["plinth"]), w)
        eye = svg_path("".join(parts["eye"]).replace('r=".6"', 'r=".72"')) if parts["eye"] else None
        filled = union(clean(body_path), body_line, plinth)
        if details: filled = minus(filled, details)
        if eye: filled = minus(filled, eye)
        line = union(body_line, plinth, *( [details] if details else [] ), *( [eye] if eye else [] ))
        out[name] = (filled, line)
    return out

def sigils():
    ts = open(os.path.join(REPO, "src", "lib", "sigils.ts")).read()
    return dict(re.findall(r"""['"]?([a-z-]+)['"]?:\s*'(<[^']+)'""", ts))

def dial_markup():
    """The seven-layer dial: seven arcs with a gap between each."""
    r, gap, out = 8.5, 9, []
    for i in range(7):
        a0 = math.radians(-90 + i * 360 / 7 + gap / 2); a1 = math.radians(-90 + (i + 1) * 360 / 7 - gap / 2)
        x0, y0 = 12 + r * math.cos(a0), 12 + r * math.sin(a0); x1, y1 = 12 + r * math.cos(a1), 12 + r * math.sin(a1)
        out.append(f'<path d="M{x0:.3f} {y0:.3f}A{r} {r} 0 0 1 {x1:.3f} {y1:.3f}"/>')
    return "".join(out) + '<circle cx="12" cy="12" r="1.1"/>'

def seal_markup():
    """A wax seal: a scalloped rim, an inner ring and a K."""
    n, r0, r1, d = 14, 8.4, 9.6, []
    for i in range(n + 1):
        a = math.radians(i * 360 / n - 90); am = math.radians((i - .5) * 360 / n - 90)
        x, y = 12 + r0 * math.cos(a), 12 + r0 * math.sin(a)
        if i == 0: d.append(f"M{x:.3f} {y:.3f}")
        else: d.append(f"Q{12 + r1 * math.cos(am):.3f} {12 + r1 * math.sin(am):.3f} {x:.3f} {y:.3f}")
    return (f'<path d="{"".join(d)}Z"/><circle cx="12" cy="12" r="5.6"/>'
            '<path d="M10.3 9.3v5.4M10.3 12.4l3.6-3.1M11.5 11.3l2.6 3.4"/>')

BRAND = {
    # The sword from the hero film, point down, striking into the stone.
    "sword": '<path d="M12 21.4l-1.25-1.9V8.6h2.5v10.9z"/><path d="M7.2 8.6h9.6M12 8.6V4.7M12 10.4v7.4"/><circle cx="12" cy="3.6" r="1.05"/>',
    "seal": seal_markup(),
    "shield": '<path d="M12 2.8 19 5.4v6.1c0 4.6-3 7.9-7 9.7-4-1.8-7-5.1-7-9.7V5.4z"/><path d="M8.2 13.2 12 9.8l3.8 3.4"/>',
    "crown": '<path d="M4.6 18.6h14.8M5.6 18.6 4.2 8.2l4.5 4.1L12 5.2l3.3 7.1 4.5-4.1-1.4 10.4z"/><path d="M5.2 21h13.6"/>',
    "crystal": '<path d="M8 4h8l4 5-8 12L4 9z"/><path d="M4 9h16M10 9l2 12 2-12M8 4l2 5 2-5 2 5 2-5"/>',
    "dial": dial_markup(),
    "divider": '<path d="M-6 12h14.6M15.4 12H30"/><path d="M12 9.6 14.4 12 12 14.4 9.6 12z"/>',
}

def turned(deg, cx, cy, markup):
    """A part of a mark rotated about (cx, cy) on the grid. fontTools ignores rotate() inside the SVG, so it is done here."""
    return (deg, cx, cy, markup)

def laurel_markup():
    """Two laurel branches meeting at the foot: an outline leaf at each of four nodes, and one at each tip."""
    def leaf(x, y, deg, L=3.8, w=1.45):
        a = math.radians(deg); tx, ty = x + L * math.sin(a), y - L * math.cos(a)
        nx, ny = math.cos(a) * w, math.sin(a) * w; mx, my = (x + tx) / 2, (y + ty) / 2
        return f'<path d="M{x:.2f} {y:.2f}Q{mx + nx:.2f} {my + ny:.2f} {tx:.2f} {ty:.2f}Q{mx - nx:.2f} {my - ny:.2f} {x:.2f} {y:.2f}z"/>'
    out = ['<path d="M11.2 20.8C7.2 19 5.2 15.2 5.4 10.2M12.8 20.8c4-1.8 6-5.6 5.8-10.6"/>']
    for side in (-1, 1):
        for t in (0.3, 0.56, 0.82):
            y = 20.6 - 10.4 * t; x = 12 + side * (1.0 + 5.4 * math.sin(t * 1.5))
            out.append(leaf(x, y, side * -50))
        out.append(leaf(12 + side * 6.6, 10.2, side * -8))
    return "".join(out)

RUNES = {  # Elder Futhark, drawn around the origin, 3.2 tall, "up" points out of the ring
    "K": "M.8 -1.6l-1.6 1.6 1.6 1.6",                       # kaunan
    "N": "M0 -1.6v3.2M-.8 -.5l1.6 1",                       # naudiz
    "G": "M-1 -1.6l2 3.2M1 -1.6l-2 3.2",                    # gebo
    "H": "M-.9 -1.6v3.2M.9 -1.6v3.2M-.9 -.6l1.8 1.2",       # hagalaz
    "T": "M0 -1.6v3.2M-1 -.6l1 -1 1 1",                     # tiwaz
}

def runering_markup():
    """The rune ring from the hero film. Read clockwise from the top, its runes spell KNGHT."""
    out = ['<circle cx="12" cy="12" r="10.2"/><circle cx="12" cy="12" r="3.3"/>']
    for i, letter in enumerate("KNGHT"):
        out.append(turned(i * 72, 12, 12, f'<path d="{_offset(RUNES[letter], 12, 5.25)}"/>'))
    return out

def _offset(d, x, y):
    """Move a path written around the origin (absolute M, relative everything else) to (x, y)."""
    return re.sub(r"M(-?[\d.]+) (-?[\d.]+)", lambda m: f"M{float(m.group(1)) + x:.3f} {float(m.group(2)) + y:.3f}", d)

def sword_upright(x=12, top=1.6, hilt=15.4):
    """A sword point up, for crossing: a one-line blade, guard, grip and pommel."""
    return f'<path d="M{x} {top}V{hilt}M{x - 2.6} {hilt}h5.2M{x} {hilt}v3"/><circle cx="{x}" cy="{hilt + 3.9}" r=".9"/>'

MORE = {
    # Arms
    "helm": '<path d="M6.6 21V11.2C6.6 6.6 9 3.6 12 3.6s5.4 3 5.4 7.6V21M5 21h14M8.4 10.8h7.2M12 10.8v6.4"/><path d="M12 3.6c.3-1.5 1.8-2.4 4-2.2-.9.5-1.4 1.2-1.5 2"/>',
    "swords": [turned(-40, 12, 11.6, sword_upright()), turned(40, 12, 11.6, sword_upright())],
    "banner": '<path d="M6 21.5V3.6"/><circle cx="6" cy="2.7" r=".9"/><path d="M6 4.4h12.5l-3.4 3.4 3.4 3.4H6"/><path d="M3.8 21.5h4.4"/>',
    "key": '<circle cx="12" cy="6.2" r="3.4"/><circle cx="12" cy="6.2" r="1.1"/><path d="M12 9.6v11.6M12 16.4h3.2M12 19.2h2.4"/>',
    "scroll": '<path d="M4.5 3.5h15a1.5 1.5 0 0 1 0 3h-15a1.5 1.5 0 0 1 0-3zM4.5 17.5h15a1.5 1.5 0 0 1 0 3h-15a1.5 1.5 0 0 1 0-3z"/><path d="M6 6.5v11M18 6.5v11M8.6 10h6.8M8.6 13h6.8"/>',
    "laurel": laurel_markup(),
    "gavel": [turned(-40, 10, 10, '<rect x="4.6" y="4.6" width="9" height="4.4" rx=".6"/><path d="M6.4 4.6v4.4M11.8 4.6v4.4M9.1 9v10.4"/>'),
              '<path d="M12.6 21.2h8.6"/><rect x="13.8" y="18.2" width="6.2" height="3" rx=".4"/>'],
    # The film
    "stone": '<path d="M3.2 21.2h17.6l-1.8-4.4-2.8-1.6-1.4-2.6H9.2l-1.6 2.6-2.8 1.8z"/><path d="M11 12.6V6.4h2v6.2M8.4 6.4h7.2M12 6.4V3.5"/><circle cx="12" cy="2.6" r=".85"/>',
    "runering": runering_markup(),
    "tower": '<path d="M9 21.5V9.4L12 2.6l3 6.8v12.1M4.5 21.5h15M6.6 21.5v-6.2L9 13.2M17.4 21.5v-6.2L15 13.2M12 11.6v3.2M10.6 21.5v-2.6a1.4 1.4 0 0 1 2.8 0v2.6"/>',
    "airship": '<ellipse cx="12.6" cy="8.4" rx="7.6" ry="3.6"/><path d="M5 8.4h15.2M5.2 8.4 2.6 5.8M5.2 8.4l-2.6 2.6M9.6 11.6l.8 3.6M15.6 11.6l-.8 3.6M9.8 15.2h5.6l-.8 2.2h-4z"/>',
    "torch": '<path d="M10.6 21.2 9.7 11.4h4.6l-.9 9.8z"/><path d="M8.4 8.8h7.2l-.8 2.6H9.2z"/><path d="M12 8.6c-2.2-1-2.8-3-1.2-5.4.3 1.4 1 2 1.7 1.6.2-1.2.9-2 2.1-2.4-.4 1.4.6 2.6.2 4-.3 1.2-1.2 1.9-2.8 2.2z"/>',
    # Footer scenes
    "candle": '<path d="M9.4 21V10.6h5.2V21M6.4 21.2h11.2M12 10.6V9.2M14.6 12.4c-.7.5-.7 1.6 0 2.2"/><path d="M12 9c-1.5-.7-2-2.3-.9-4 .4-.6.7-1.3.9-2.4.5 1.2 1.7 2.3 1.7 3.9 0 1.3-.6 2.1-1.7 2.5z"/>',
    "sunrise": '<path d="M2.4 18h19.2M6.6 18a5.4 5.4 0 0 1 10.8 0M12 7v2.6M5.4 10.4l1.8 1.8M18.6 10.4l-1.8 1.8M2.6 14.8h2.6M18.8 14.8h2.6M7.4 21h9.2"/>',
    "moon": '<path d="M14.6 3.4a8.8 8.8 0 1 0 6.2 13.2A7.2 7.2 0 0 1 14.6 3.4z"/><path d="M18.6 4.6v2.6M17.3 5.9h2.6"/>',
    "spyglass": [turned(-32, 12, 12, '<rect x="2.6" y="10.7" width="5" height="2.6" rx=".3"/><rect x="7.6" y="10.1" width="5.6" height="3.8" rx=".3"/><rect x="13.2" y="9.2" width="7.6" height="5.6" rx=".4"/><path d="M1.4 11.4v1.2"/>')],
    # The Armoury's free tools
    "horn": '<path d="M2.4 10.4v3.2M3.4 11.2h9.2c2.3 0 4.3-1.5 5.6-4.2h1.4v10h-1.4c-1.3-2.7-3.3-4.2-5.6-4.2H3.4z"/><path d="M7.2 12.8v5.8l2.2-1.4 2.2 1.4v-5.8"/>',
    "hourglass": '<path d="M6.4 3h11.2M6.4 21h11.2M8 3c0 4.6 3.6 6.2 3.6 9S8 16.4 8 21M16 3c0 4.6-3.6 6.2-3.6 9s3.6 4.4 3.6 9M9.4 7.2h5.2M12 12.6v3.4M9.6 20.4c.6-1.6 1.5-2.4 2.4-2.4s1.8.8 2.4 2.4"/>',
    "compass": '<circle cx="12" cy="12" r="9"/><path d="M12 4.4l1.6 6 6 1.6-6 1.6-1.6 6-1.6-6-6-1.6 6-1.6z"/><path d="M12 2.4v1.2"/>',
    "signpost": '<path d="M12 2.8v18.6M8.4 21.4h7.2M12 4.8h7.4l2 2-2 2H12M12 10.6H4.6l-2 2 2 2H12"/>',
    "drop": '<path d="M12 3c3 4.2 6.2 7.6 6.2 11.4a6.2 6.2 0 0 1-12.4 0C5.8 10.6 9 7.2 12 3z"/><path d="M9.2 14.8a2.9 2.9 0 0 0 2.4 2.8"/>',
    "lens": '<circle cx="10" cy="10" r="6.4"/><path d="M14.7 14.7l6.2 6.2M7.2 10.2l2 2 3.6-3.8"/>',
    "letter": '<path d="M3 6.4h18v12.4H3z"/><path d="M3 6.4l7.8 6.1M21 6.4l-7.8 6.1"/><circle cx="12" cy="13.4" r="1.6"/>',
    "anvil": '<path d="M2.2 8H19v2.4c-1.7.3-2.7 1.5-2.7 3.1V15h2.2v3.2h-13V15h2.2v-1.5C7.7 11.9 6.6 10.7 5 10.4 3.7 10.2 2.8 9.4 2.2 8z"/><path d="M4 21.2h16M14.4 4.6l1.6-1.6M17.2 5.6l2-.8M11.6 4.2 11 2.6"/>',
}

LAYERS = ["lore", "law", "language", "map", "ground", "artifacts", "machinery"]
WORLDS = {"restoration-medical": "restoration", "black-lotus-coffee": "blacklotus", "castleblack-spirits": "castleblack",
          "lisa-dang-immigration-law": "lisadang", "lorelyns": "lorelyns", "rum-raiders-ring": "rumraiders",
          "toronto-beauty": "torontobeauty", "wellfit-social-club": "wellfit", "art-colouring": "artcolouring"}
CHESS = ["king", "queen", "rook", "bishop", "knight", "pawn"]

CATEGORIES = {
    # One mark for each category KNGHT serves, in the order of src/data/categories.json.
    # Clinics get a stethoscope, not a cross: the red cross emblem is protected in Canada.
    "clinic": '<path d="M7 3.2v5.2a5 5 0 0 0 10 0V3.2M5.8 3.2h2.4M15.8 3.2h2.4M12 13.4v2.8a3.9 3.9 0 0 0 7.8 0v-1.8"/><circle cx="19.8" cy="12.8" r="1.7"/>',
    "dental": '<path d="M8.2 3.8C5.6 3.8 4.3 6 4.7 8.7c.4 2.6 1.7 4 2.1 6.6.4 2.7.8 5.6 2.2 5.6 1.6 0 1.4-4.7 3-4.7s1.4 4.7 3 4.7c1.4 0 1.8-2.9 2.2-5.6.4-2.6 1.7-4 2.1-6.6.4-2.7-.9-4.9-3.5-4.9-1.6 0-2.4 1-3.8 1s-2.2-1-3.8-1z"/>',
    "medspa": '<path d="M9.4 21.2h5.2a1.4 1.4 0 0 0 1.4-1.4v-8.6H8v8.6a1.4 1.4 0 0 0 1.4 1.4zM9.6 11.2V9h4.8v2.2M10.6 9V5.2a1.4 1.4 0 0 1 2.8 0V9M8 15.4h8M19 2.6v3.6M17.2 4.4h3.6"/>',
    "law": '<path d="M12 2.8 3.6 7.6h16.8zM5 9.4h14M4.2 18.6h15.6M3 21.2h18M6.6 9.4v9.2M10.2 9.4v9.2M13.8 9.4v9.2M17.4 9.4v9.2"/>',
    "spirits": '<path d="M5.4 7.6h13.2l-1.4 12.6a1 1 0 0 1-1 .9H7.8a1 1 0 0 1-1-.9z"/><path d="M6.2 13.2h11.6"/><rect x="9.2" y="14.6" width="3.4" height="3.4" rx=".4"/>',
    "food": '<path d="M3.4 11.4h17.2c0 4.8-3.8 8.6-8.6 8.6s-8.6-3.8-8.6-8.6zM8.8 21.2h6.4M8.6 8.6c-.9-1.1.9-2.1 0-3.4M12 8.6c-.9-1.1.9-2.1 0-3.4M15.4 8.6c-.9-1.1.9-2.1 0-3.4"/>',
    "fitness": '<path d="M2.4 12h1.8M19.8 12h1.8M8.4 12h7.2"/><rect x="4.2" y="8.6" width="2.1" height="6.8" rx=".5"/><rect x="6.3" y="7" width="2.1" height="10" rx=".5"/><rect x="17.7" y="8.6" width="2.1" height="6.8" rx=".5"/><rect x="15.6" y="7" width="2.1" height="10" rx=".5"/>',
    "creative": [turned(42, 12, 12, '<path d="M10.4 2.6h3.2v14.2L12 20.4l-1.6-3.6z"/><path d="M10.4 16.8h3.2M10.4 5.4h3.2"/>')],
}

# Typed names follow the site's /for/ pages, so :law: stays the Law layer and :law-firms: is the category.
CATEGORY_NAMES = {"clinic": "clinics", "dental": "dental", "medspa": "medspas", "law": "law-firms", "spirits": "spirits",
                  "food": "food-and-drink", "fitness": "fitness", "creative": "creative"}

TIERS = {
    # The three ways in, from the home page.
    "the-verdict": '<circle cx="12" cy="8.6" r="5.6"/><path d="M9.4 13.6 7.8 20.8l2.4-1.4 1.6 1.9.4-6.1M14.6 13.6l1.6 7.2-2.4-1.4-1.6 1.9M9.8 7l2.2 3.8L14.2 7"/>',
    "the-build": '<path d="M2.8 21.2h18.4M4.6 21.2V10.4h3.4v10.8M16 21.2V10.4h3.4v10.8M8 21.2v-9h8v9M10.1 12.2V7.4L12 3l1.9 4.4v4.8M10.7 21.2v-2.9a1.3 1.3 0 0 1 2.6 0v2.9M4.6 10.4V8.8h1.1v1.6M6.9 10.4V8.8H8v1.6M16 10.4V8.8h1.1v1.6M18.3 10.4V8.8h1.1v1.6M12 8.4v1.6"/>',
    "the-keep": '<path d="M9 6.2h6l1.2 2.2v9.4L15 20H9l-1.2-2.2V8.4zM10.6 6.2V4.8a1.4 1.4 0 0 1 2.8 0v1.4M7.8 9.2h8.4M7.8 17h8.4"/><path d="M12 15.6c-1.3-.6-1.5-1.9-.6-3.2.3.7.8 1 1.2.8.5.8.5 1.7-.6 2.4z"/>',
}

EXTRA = {
    # A proposal: a rolled scroll tied with a ribbon and sealed.
    "proposal": '<path d="M5.4 7.6h13.6a2.6 2.6 0 0 1 0 5.2H5.4a2.6 2.6 0 0 1 0-5.2z"/><circle cx="5.4" cy="10.2" r="1"/><path d="M12 12.8v1.4M11 18.2l-.9 3M13 18.2l.9 3"/><circle cx="12" cy="16.2" r="2.1"/>',
    # The free tools without a mark of their own yet.
    "line": '<path d="M12 2.8 16.4 9.4 12 16.6 7.6 9.4z"/><path d="M12 16.6v-5.2M3 20.6h18"/><circle cx="12" cy="9.8" r=".2"/>',
    "plain": '<path d="M4 4.6h16v10.6h-9.4L6.4 19.4v-4.2H4z"/><path d="M7.4 8.6h9.2M7.4 11.6h5.8"/>',
}

# The Armoury, in the order the page lists the tools. Each tool name types its mark.
TOOLS = {"line": "line", "check": "lens", "reply": "letter", "plain": "plain", "cartographer": "compass",
         "herald": "horn", "waymarks": "signpost", "sigil": "anvil", "leak": "drop", "keep": "hourglass"}

FILL = 0x100   # a mark's filled version sits this far above it

def filled(spec, w):
    """The solid version of a hairline mark: closed shapes filled, outer lines kept,
    and every line that falls inside a filled shape cut out as a thinner gap."""
    parts = spec if isinstance(spec, list) else [spec]
    closed, every = pathops.Path(), []
    for p in parts:
        path = svg_path(p[3], p[:3]) if isinstance(p, tuple) else svg_path(p)
        every.append(path)
        for c in path.contours:
            pts = list(c.points)
            ends_at_start = len(pts) > 2 and math.dist(pts[0], pts[-1]) < 1
            if (c.verbs and c.verbs[-1] == pathops.PathVerb.CLOSE) or ends_at_start: c.draw(closed.getPen())
    lines = union(*[stroke(p, w * GRID) for p in every])
    body = union(clean(closed), lines) if list(closed.contours) else lines
    inner = minus(body, stroke(body, 1.9 * w * GRID, pathops.LineCap.BUTT_CAP))
    cuts = pathops.op(union(*[stroke(p, .72 * w * GRID) for p in every]), inner, pathops.PathOp.INTERSECTION)
    return minus(body, cuts)

def marks(w):
    """[(glyph name, codepoints, ligature names, path)] for every KNGHT glyph, at hairline weight w.
    Every hairline mark also gets a filled version, FILL code points up, named with -fill."""
    out = []
    pieces = chess_pieces(w)
    for i, n in enumerate(CHESS):
        solid, line = pieces[n]
        out.append((f"chess.{n}", [0x265A + i], [n], solid))
        out.append((f"chess.{n}.line", [0x2654 + i], [n + "-line"], line))
    sg = sigils()
    hair = []   # (glyph name, codepoint, ligature names, spec)
    hair += [(f"layer.{n}", 0xE001 + i, [n], sg[n]) for i, n in enumerate(LAYERS)]
    hair += [(f"world.{short}", 0xE011 + i, [short], sg[slug]) for i, (slug, short) in enumerate(WORLDS.items())]
    hair += [(f"mark.{n}", 0xE021 + i, [n], m) for i, (n, m) in enumerate(BRAND.items())]
    hair += [(f"mark.{n}", 0xE028 + i, [n], m) for i, (n, m) in enumerate(MORE.items())]
    hair += [(f"category.{n}", 0xE041 + i, [CATEGORY_NAMES[n]], m) for i, (n, m) in enumerate(CATEGORIES.items())]
    hair += [(f"tier.{n[4:]}", 0xE049 + i, [n] + (["castle"] if n == "the-build" else []), m) for i, (n, m) in enumerate(TIERS.items())]
    hair += [(f"mark.{n}", 0xE04C + i, [] if n in TOOLS else [n], m) for i, (n, m) in enumerate(EXTRA.items())]
    cps = {name: [cp] for name, cp, _, _ in hair}; names = {name: list(l) for name, _, l, _ in hair}
    for i, (tool, mark) in enumerate(TOOLS.items()):   # the tools share their marks' outlines
        cps[f"mark.{mark}"].append(0xE051 + i); names[f"mark.{mark}"].append(tool)
    for name, _, _, spec in hair:
        out.append((name, cps[name], names[name], hairline(spec, w)))
        out.append((name + ".fill", [c + FILL for c in cps[name]], [n + "-fill" for n in names[name]], filled(spec, w)))
    return out

# ---------------------------------------------------------------- build

def rename(font, family, style, weight):
    n = font["name"]; italic = "Italic" in style
    legacy_family = family if weight == 400 else f"{family} Medium"
    legacy_style = "Italic" if italic else "Regular"
    full = f"{family} {style}".replace(" Regular", "")
    ps = (family.replace(" ", "") + "-" + style.replace(" ", ""))
    n.names = [r for r in n.names if r.nameID not in (1, 2, 3, 4, 5, 6, 16, 17, 21, 22, 25)]
    vals = {1: legacy_family, 2: legacy_style, 3: f"2.000;KNGHT;{ps}", 4: full, 5: "Version 2.000", 6: ps}
    if weight != 400: vals.update({16: family, 17: style})
    for nid, val in vals.items():
        n.setName(val, nid, 3, 1, 0x409)
    n.names = [r for r in n.names if r.platformID == 3]
    n.setName("Copyright 2015 The Cormorant Project Authors (github.com/CatharsisFonts/Cormorant). Modifications copyright 2026 KNGHT.", 0, 3, 1, 0x409)
    n.setName("Cormorant Garamond with engraved capitals, the KNGHT chess set, the seven layers, the nine worlds and the KNGHT marks.", 10, 3, 1, 0x409)
    n.setName("This Font Software is licensed under the SIL Open Font License, Version 1.1. This license is available with a FAQ at: https://openfontlicense.org", 13, 3, 1, 0x409)
    n.setName("https://openfontlicense.org", 14, 3, 1, 0x409)
    os2 = font["OS/2"]; os2.achVendID = "KNGT"; os2.usWeightClass = weight
    os2.fsSelection = (os2.fsSelection & ~0x61) | (0x01 if italic else 0x40)
    font["head"].macStyle = 0x02 if italic else 0
    font["head"].fontRevision = 2.0
    if "STAT" in font: del font["STAT"]

def subset_web(src, dst):
    opts = subset.Options(); opts.flavor = "woff2"; opts.layout_features = ["*"]; opts.name_IDs = ["*"]; opts.notdef_outline = True
    f = TTFont(src); s = subset.Subsetter(opts)
    s.populate(unicodes=list(range(0x20, 0x7F)) + list(range(0xA0, 0x180)) + [0x131, 0x152, 0x153, 0x2BB, 0x2BC, 0x2C6, 0x2DA, 0x2DC]
               + list(range(0x2000, 0x2070)) + [0x2074, 0x20AC, 0x2116, 0x2122, 0x2190, 0x2191, 0x2192, 0x2193, 0x2212, 0x2215, 0xFEFF, 0xFFFD]
               + list(range(0x2654, 0x2660)) + list(range(0xE001, 0xE060)) + list(range(0xE101, 0xE160)))
    s.subset(f); f.flavor = "woff2"; f.save(dst)

def build(src, style, weight, engraved_default, stem, t, w):
    f = TTFont(os.path.join(SRC, src)); dehint(f); decompose_all(f)
    cm = f.getBestCmap()
    caps = {cm[u] for u in cm if unicodedata.category(chr(u)) == "Lu"}
    family_caps = sorted(cap_family(f, caps), key=f.getGlyphID)
    alt_suffix = ".plain" if engraved_default else ".engraved"
    alts = {}
    gdef = f["GDEF"].table.GlyphClassDef.classDefs if "GDEF" in f and f["GDEF"].table.GlyphClassDef else {}
    for g in family_caps:
        plain = glyph_path(f, g); cut = engrave(plain, stem, t); adv = f["hmtx"][g][0]
        set_glyph(f, g, to_glyph(cut if engraved_default else plain), adv)
        if g in caps:
            a = g + alt_suffix; alts[g] = a
            set_glyph(f, a, to_glyph(plain if engraved_default else cut), adv, gdef.get(g, 1))
    clone_kerning(f, alts)
    gsub = f["GSUB"].table
    ss = add_lookup(gsub, otl.buildLookup([otl.buildSingleSubstSubtable(alts)]))
    add_feature(f, "ss01", ss, "Plain capitals" if engraved_default else "Engraved capitals")
    ligs = {}
    colon = cm[ord(":")]
    solid = {}
    for name, unis, lignames, p in marks(w):
        g, adv = place(p); set_glyph(f, name, g, adv, 1)
        for tb in f["cmap"].tables:
            if tb.isUnicode():
                for uni in unis: tb.cmap[uni] = name
        for lig in lignames:
            seq = tuple([colon] + [cm[ord(c)] for c in lig] + [colon])
            if seq in ligs: raise SystemExit(f":{lig}: is used by both {ligs[seq]} and {name}")
            ligs[seq] = name
        if name.endswith(".fill"): solid[name[:-5]] = name
    ss2 = add_lookup(gsub, otl.buildLookup([otl.buildSingleSubstSubtable(solid)]))
    add_feature(f, "ss02", ss2, "Filled marks")
    lk = add_lookup_first(gsub, otl.buildLookup([otl.buildLigatureSubstSubtable(ligs)]))
    append_to_feature(f, "liga", lk)
    rename(f, "KNGHT Order", style, weight)
    ttf = os.path.join(OUT, f"KNGHTOrder-{style.replace(' ', '')}.ttf"); f.save(ttf)
    subset_web(ttf, ttf.replace(".ttf", ".latin.woff2"))
    print(f"{style}: {len(alts)} capitals engraved{' by default' if engraved_default else ' under ss01'}, {len(solid)} marks with filled versions, {len(ligs)} :name: shortcuts")

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    #     source file                         style            weight engraved  stem  cut  hairline
    build("CormorantGaramond-Regular.ttf",      "Regular",       400, True,     62,   7,   1.35)
    build("CormorantGaramond-Italic.ttf",       "Italic",        400, True,     55,   6.5, 1.35)
    build("CormorantGaramond-Medium.ttf",       "Medium",        500, False,    77,   8,   1.6)
    build("CormorantGaramond-MediumItalic.ttf", "Medium Italic", 500, False,    68,   7.5, 1.6)
