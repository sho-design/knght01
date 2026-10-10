"""Build KNGHT Order: a hybrid serif from three OFL fonts.
Roman  = Cormorant Garamond 500 (base) + Ibarra Real Nova 400 capitals, scaled to Cormorant's cap height.
Italic = Cormorant Garamond Italic 500 (base) + Instrument Serif Italic lowercase, scaled to the roman x-height.
Both get the KNGHT knight at U+265E, drawn from src/assets/knght-chess.svg.
Run from the repo root: python3 type/knght-order/build.py  (needs: pip install fonttools brotli skia-pathops)"""
import sys, os, re, unicodedata
from fontTools.ttLib import TTFont, newTable
from fontTools.ttLib.tables import ttProgram, otTables as ot
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.recordingPen import DecomposingRecordingPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.cu2quPen import Cu2QuPen
from fontTools.otlLib import builder as otl
from fontTools.svgLib.path import parse_path
import pathops

HERE = os.path.dirname(os.path.abspath(__file__))
SRC, OUT = os.path.join(HERE, "sources"), os.path.join(HERE, "fonts")
_svg = open(os.path.join(HERE, "..", "..", "src", "assets", "knght-chess.svg")).read()
KNIGHT_D = re.search(r'<symbol id="knght-knight".*?class="knght-outline"[^>]*? d="([^"]+)"', _svg, re.S).group(1)
os.makedirs(OUT, exist_ok=True)

def dehint(f):
    for t in ("fpgm", "prep", "cvt ", "hdmx", "LTSH", "VDMX", "DSIG"):
        if t in f: del f[t]
    glyf = f["glyf"]
    for g in glyf.glyphs.values():
        g.expand(glyf)
        if hasattr(g, "program"):
            g.program = ttProgram.Program(); g.program.fromBytecode(b"")
    gasp = newTable("gasp"); gasp.version = 1; gasp.gaspRange = {0xFFFF: 0x000F}; f["gasp"] = gasp
    m = f["maxp"]
    for a in ("maxZones","maxTwilightPoints","maxStorage","maxFunctionDefs","maxInstructionDefs","maxStackElements","maxSizeOfInstructions"):
        setattr(m, a, 0 if a != "maxZones" else 1)

def outline(font, gname, scale):
    gs = font.getGlyphSet(); rec = DecomposingRecordingPen(gs); gs[gname].draw(rec)
    pen = TTGlyphPen(None); rec.replay(TransformPen(pen, (scale, 0, 0, scale, 0, 0)))
    return pen.glyph(), round(font["hmtx"][gname][0] * scale)

def put(base, gname, glyph, adv):
    glyf = base["glyf"]; glyf[gname] = glyph
    glyph.recalcBounds(glyf)
    base["hmtx"][gname] = (adv, getattr(glyph, "xMin", 0) if glyph.numberOfContours else 0)

def flat_kerning(font):
    """Every horizontal pair adjustment in the font's kern feature, as {(left, right): value}."""
    out = {}
    gpos = font["GPOS"].table
    idx = {i for fr in gpos.FeatureList.FeatureRecord if fr.FeatureTag == "kern" for i in fr.Feature.LookupListIndex}
    for li in sorted(idx):
        lk = gpos.LookupList.Lookup[li]
        for st in lk.SubTable:
            if lk.LookupType == 9: st = st.ExtSubTable
            if st.LookupType != 2: continue
            cov = st.Coverage.glyphs
            if st.Format == 1:
                for g, ps in zip(cov, st.PairSet):
                    for r in ps.PairValueRecord:
                        v = getattr(r.Value1, "XAdvance", 0) if r.Value1 else 0
                        if v: out.setdefault((g, r.SecondGlyph), v)
            else:
                c1 = st.ClassDef1.classDefs; c2 = st.ClassDef2.classDefs
                by2 = {}
                for g, c in c2.items(): by2.setdefault(c, []).append(g)
                for g in cov:
                    row = st.Class1Record[c1.get(g, 0)]
                    for c, rec in enumerate(row.Class2Record):
                        v = getattr(rec.Value1, "XAdvance", 0) if rec.Value1 else 0
                        if v and c in by2:
                            for g2 in by2[c]: out.setdefault((g, g2), v)
    return out

def strip_kerning(font, gone):
    """Remove pairs that touch replaced glyphs, so their old spacing cannot apply."""
    gpos = font["GPOS"].table
    for lk in gpos.LookupList.Lookup:
        for st in lk.SubTable:
            if lk.LookupType == 9: st = st.ExtSubTable
            if getattr(st, "LookupType", None) != 2: continue
            cov = st.Coverage.glyphs
            if st.Format == 1:
                keep = [(g, ps) for g, ps in zip(cov, st.PairSet) if g not in gone]
                for _, ps in keep:
                    ps.PairValueRecord = [r for r in ps.PairValueRecord if r.SecondGlyph not in gone]
                    ps.PairValueCount = len(ps.PairValueRecord)
                st.Coverage.glyphs = [g for g, _ in keep]; st.PairSet = [ps for _, ps in keep]; st.PairSetCount = len(keep)
            else:
                st.Coverage.glyphs = [g for g in cov if g not in gone]
                for g in list(st.ClassDef2.classDefs):
                    if g in gone: del st.ClassDef2.classDefs[g]
                for g in list(st.ClassDef1.classDefs):
                    if g in gone: del st.ClassDef1.classDefs[g]

def add_kerning(font, pairs):
    gpos = font["GPOS"].table
    by_left = {}
    for (l, r), v in pairs.items(): by_left.setdefault(l, {})[r] = v
    recs = {}
    for l, rs in by_left.items():
        for r, v in rs.items():
            vr = ot.ValueRecord(); vr.XAdvance = v
            recs[(l, r)] = (vr, None)
    st = otl.buildPairPosGlyphsSubtable(recs, font.getReverseGlyphMap())
    lk = otl.buildLookup([st]); gpos.LookupList.Lookup.append(lk)
    gpos.LookupList.LookupCount = len(gpos.LookupList.Lookup)
    new = len(gpos.LookupList.Lookup) - 1
    for fr in gpos.FeatureList.FeatureRecord:
        if fr.FeatureTag == "kern":
            fr.Feature.LookupListIndex.append(new); fr.Feature.LookupCount += 1

ALT_TAGS = {"salt","calt","swsh","case","cswh","titl","hist"} | {f"ss{i:02d}" for i in range(1,21)} | {f"cv{i:02d}" for i in range(1,100)}

def strip_substitutions(font, gone):
    """Ligatures that contain a replaced glyph, and stylistic alternates of one, would bring the old design back."""
    gsub = font["GSUB"].table
    alt_lookups = {i for fr in gsub.FeatureList.FeatureRecord if fr.FeatureTag in ALT_TAGS for i in fr.Feature.LookupListIndex}
    removed = 0
    for li, lk in enumerate(gsub.LookupList.Lookup):
        for st in lk.SubTable:
            if lk.LookupType == 7: st = st.ExtSubTable
            t = getattr(st, "LookupType", lk.LookupType)
            if t == 4:
                for first in list(st.ligatures):
                    keep = [l for l in st.ligatures[first] if first not in gone and not any(c in gone for c in l.Component)]
                    removed += len(st.ligatures[first]) - len(keep)
                    if keep: st.ligatures[first] = keep
                    else: del st.ligatures[first]
            elif t in (1, 3) and li in alt_lookups:
                m = st.mapping if t == 1 else st.alternates
                for g in [g for g in m if g in gone]: del m[g]; removed += 1
    return removed

def subset_latin(src, dst):
    from fontTools import subset
    opts = subset.Options(); opts.flavor = "woff2"; opts.layout_features = ["*"]; opts.name_IDs = ["*"]; opts.notdef_outline = True
    f = TTFont(src); sub = subset.Subsetter(opts)
    sub.populate(unicodes=list(range(0x20, 0x7F)) + list(range(0xA0, 0x180)) + [0x131, 0x152, 0x153, 0x2BB, 0x2BC, 0x2C6, 0x2DA, 0x2DC]
                 + list(range(0x2000, 0x2070)) + [0x2074, 0x20AC, 0x2116, 0x2122, 0x2190, 0x2191, 0x2192, 0x2193, 0x2212, 0x2215, 0x265E, 0xFEFF, 0xFFFD])
    sub.subset(f); f.flavor = "woff2"; f.save(dst)

def drop_features(font, tags):
    for t in ("GSUB",):
        tb = font[t].table
        for fr in tb.FeatureList.FeatureRecord:
            if fr.FeatureTag in tags: fr.Feature.LookupListIndex = []; fr.Feature.LookupCount = 0

def knight(font, top, stroke):
    """The KNGHT knight from src/assets/knght-chess.svg: filled silhouette, two plinth bars, the eye cut out."""
    s = top / 19.9                                   # svg y 1.6 .. 21.5 -> 0 .. top
    T = (s, 0, 0, -s, -3.9 * s + 40, 21.5 * s + stroke / 2)
    def P(): return pathops.Path()
    body = P(); parse_path(KNIGHT_D, TransformPen(body.getPen(), T))
    shapes = [body]
    for y, x0, x1 in ((19.4, 5.6, 18.2), (21.5, 4.6, 19.2)):
        r = P(); pen = TransformPen(r.getPen(), T); h = stroke / s / 2
        pen.moveTo((x0, y - h)); pen.lineTo((x1, y - h)); pen.lineTo((x1, y + h)); pen.lineTo((x0, y + h)); pen.closePath()
        shapes.append(r)
    eye = P(); pen = TransformPen(eye.getPen(), T)
    cx, cy, rr = 14.6, 8.4, 0.62
    k = 0.5523 * rr
    pen.moveTo((cx + rr, cy)); pen.curveTo((cx + rr, cy + k), (cx + k, cy + rr), (cx, cy + rr))
    pen.curveTo((cx - k, cy + rr), (cx - rr, cy + k), (cx - rr, cy)); pen.curveTo((cx - rr, cy - k), (cx - k, cy - rr), (cx, cy - rr))
    pen.curveTo((cx + k, cy - rr), (cx + rr, cy - k), (cx + rr, cy)); pen.closePath()
    u = pathops.op(shapes[0], shapes[1], pathops.PathOp.UNION)
    u = pathops.op(u, shapes[2], pathops.PathOp.UNION)
    u = pathops.op(u, eye, pathops.PathOp.DIFFERENCE)
    pen = TTGlyphPen(None); u.draw(Cu2QuPen(pen, 1.0, reverse_direction=True))
    g = pen.glyph(); adv = round(15.4 * s + 80)
    return g, adv

def add_glyph(font, name, uni, glyph, adv):
    order = font.getGlyphOrder() + [name]
    font.setGlyphOrder(order); font["glyf"].glyphOrder = order
    put(font, name, glyph, adv)
    for t in font["cmap"].tables:
        if t.isUnicode(): t.cmap[uni] = name
    font["maxp"].numGlyphs = len(order)
    if "post" in font and font["post"].formatType == 2: font["post"].extraNames = getattr(font["post"], "extraNames", [])

def rename(font, style, sources):
    fam = "KNGHT Order"; ps = "KNGHTOrder-" + style
    n = font["name"]
    n.names = [r for r in n.names if r.nameID not in (1, 2, 3, 4, 5, 6, 16, 17, 21, 22, 25)]
    for nid, val in ((1, fam), (2, style), (3, f"1.000;KNGHT;{ps}"), (4, f"{fam} {style}" if style != "Regular" else fam),
                     (5, "Version 1.000"), (6, ps)):
        n.setName(val, nid, 3, 1, 0x409); n.setName(val, nid, 1, 0, 0)
    copy = "; ".join(sources) + ". Modifications copyright 2026 KNGHT."
    n.setName(copy, 0, 3, 1, 0x409); n.setName(copy, 0, 1, 0, 0)
    lic = "This Font Software is licensed under the SIL Open Font License, Version 1.1. This license is available with a FAQ at: https://openfontlicense.org"
    n.setName(lic, 13, 3, 1, 0x409); n.setName("https://openfontlicense.org", 14, 3, 1, 0x409)
    desc = "A hybrid serif built for KNGHT from Cormorant Garamond, Ibarra Real Nova and Instrument Serif."
    n.setName(desc, 10, 3, 1, 0x409)
    font["OS/2"].achVendID = "KNGT"
    font["head"].fontRevision = 1.0

def build(style, base_file, donor_file, pick, donor_scale, extra_kern_scale, drop):
    base = TTFont(os.path.join(SRC, base_file)); donor = TTFont(os.path.join(SRC, donor_file))
    for f in (base, donor): dehint(f)
    bcm, dcm = base.getBestCmap(), donor.getBestCmap()
    # decompose every base composite first, so nothing still points at an outline we replace
    gs = base.getGlyphSet()
    for g in base.getGlyphOrder():
        gl = base["glyf"][g]
        if gl.isComposite():
            rec = DecomposingRecordingPen(gs); gs[g].draw(rec); pen = TTGlyphPen(None); rec.replay(pen)
            ng = pen.glyph(); base["glyf"][g] = ng; ng.recalcBounds(base["glyf"])
    gone = {}
    for u, bname in bcm.items():
        if u in dcm and pick(u):
            glyph, adv = outline(donor, dcm[u], donor_scale)
            put(base, bname, glyph, adv); gone[bname] = dcm[u]
    # kerning: drop the base pairs for replaced glyphs, bring the donor's pairs for them
    strip_kerning(base, set(gone))
    d2b = {dcm[u]: bcm[u] for u in bcm if u in dcm}
    pairs = {}
    for (l, r), v in flat_kerning(donor).items():
        if l in d2b and r in d2b and (d2b[l] in gone or d2b[r] in gone):
            pairs[(d2b[l], d2b[r])] = round(v * extra_kern_scale)
    pairs = {k: v for k, v in pairs.items() if v}
    add_kerning(base, pairs)
    print(style, "substitutions removed:", strip_substitutions(base, set(gone)))
    drop_features(base, drop)
    kg, kadv = knight(base, 700, 46 if style == "Regular" else 42)
    add_glyph(base, "knght", 0x265E, kg, kadv)
    rename(base, style, [
        "Copyright 2015 The Cormorant Project Authors (github.com/CatharsisFonts/Cormorant)",
        "Copyright 2007 The Ibarra Real Nova Project Authors (github.com/googlefonts/ibarrareal)" if style == "Regular"
        else "Copyright 2022 The Instrument Serif Project Authors (github.com/Instrument/instrument-serif)"])
    if style == "Italic":
        base["OS/2"].fsSelection = (base["OS/2"].fsSelection & ~0x40) | 0x01; base["head"].macStyle = 0x02
    ttf = os.path.join(OUT, f"KNGHTOrder-{style}.ttf"); base.save(ttf)
    subset_latin(ttf, os.path.join(OUT, f"KNGHTOrder-{style}.latin.woff2"))
    print(style, "replaced", len(gone), "glyphs;", len(pairs), "kerning pairs carried over")

is_cap = lambda u: unicodedata.category(chr(u)) == "Lu"
is_lower = lambda u: unicodedata.category(chr(u)) == "Ll" and u not in (0xDF,)
build("Regular", "CormorantGaramond-Medium.ttf", "IbarraRealNova-Regular.ttf", is_cap, 625 / 673, 625 / 673, set())
build("Italic", "CormorantGaramond-MediumItalic.ttf", "InstrumentSerif-Italic.ttf", is_lower, 418 / 516, 418 / 516, set())
