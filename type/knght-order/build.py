"""Build KNGHT Order: Cormorant Garamond with engraved capitals and the KNGHT glyphs.

Styles     Regular and Italic (from Cormorant 400) carry the engraved capitals by default; ss01 swaps in the plain ones.
           Medium and Medium Italic (from Cormorant 500) are for text under about 28px. They keep the plain
           capitals; ss01 swaps in the engraved ones.
Engraving  one hairline cut down the middle of every stroke thicker than STEM. Thin strokes stay whole,
           so the line shows on stems and bowls and disappears at small sizes.
Glyphs     the chess set (U+2654 to U+265F) from src/assets/knght-chess.svg, and every KNGHT mark from
           src/lib/marks.json (the one icon list the site uses too), in the Private Use Area from U+E001.
           Each one can also be typed as a ligature, such as :lore: or :knight:.
           Every mark has a filled version 0x100 above it, typed as :lore-fill:; ss02 swaps them all.

Run from the repo root: python3 type/knght-order/build.py   (pip install fonttools brotli skia-pathops)"""
import os, re, copy, json, math, unicodedata
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

ROTATE = re.compile(r'<g transform="rotate\(([-\d.]+) ([-\d.]+) ([-\d.]+)\)">(.*?)</g>', re.S)

def parts(svg):
    """Split a mark's SVG into plain markup and rotated groups, since fontTools ignores rotate()."""
    out, last = [], 0
    for m in ROTATE.finditer(svg):
        if svg[last:m.start()].strip(): out.append((0, 12, 12, svg[last:m.start()]))
        out.append((float(m.group(1)), float(m.group(2)), float(m.group(3)), m.group(4)))
        last = m.end()
    if svg[last:].strip(): out.append((0, 12, 12, svg[last:]))
    return [svg_path(m, (d, cx, cy) if d else None) for d, cx, cy, m in out]

def hairline(svg, w):
    """Stroke a mark's SVG at hairline weight w (in grid units)."""
    return union(*[stroke(p, w * GRID) for p in parts(svg)])

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

CHESS = ["king", "queen", "rook", "bishop", "knight", "pawn"]

def registry():
    """The KNGHT marks, from src/lib/marks.json: the one list the site and this font both draw from."""
    return json.load(open(os.path.join(REPO, "src", "lib", "marks.json")))["marks"]

FILL = 0x100   # a mark's filled version sits this far above it

def filled(spec, w):
    """The solid version of a hairline mark: closed shapes filled, outer lines kept,
    and every line that falls inside a filled shape cut out as a thinner gap."""
    closed, every = pathops.Path(), []
    for path in parts(spec):
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
    """[(glyph name, codepoints, typed names, path)] for every KNGHT glyph, at hairline weight w.
    The chess set comes from the sprite; every other mark from the registry, with a filled version FILL above it."""
    out = []
    pieces = chess_pieces(w)
    for i, n in enumerate(CHESS):
        solid, line = pieces[n]
        out.append((f"chess.{n}", [0x265A + i], [n], solid))
        out.append((f"chess.{n}.line", [0x2654 + i], [n + "-line"], line))
    for m in registry():
        if not m["codepoint"]: continue          # the KNGHT knight is the chess knight above
        cp, name = int(m["codepoint"], 16), f'{m["group"]}.{m["id"]}'
        out.append((name, [cp], m["names"], hairline(m["svg"], w)))
        out.append((name + ".fill", [cp + FILL], [n + "-fill" for n in m["names"]], filled(m["svg"], w)))
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
               + list(range(0x2654, 0x2660)) + list(range(0xE001, 0xE080)) + list(range(0xE101, 0xE180)))
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
