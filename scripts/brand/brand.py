"""Texponex identity generator — the single source of truth for the logo.

Everything is built from the brand font and the geometry rules below, so every
file (website, print, social) carries exactly the same logo.

Website:
    src/partials/logo.html            inline primary logo (currentColor + ember)
    src/public/favicon.svg            symbol, adapts to light/dark browser tabs
    src/public/brand/*.svg            primary logo (light/dark) and symbol
Brand kit (brand/):
    logo/svg/*.svg                    primary logo + symbol, four colorways
    logo/pdf/*.pdf                    the same as CMYK vector PDFs (print)
    print/texponex-business-card.pdf  print-ready card, 3.5 × 2 in + 3 mm bleed,
                                      all text outlined; text from brand/business-card.json
    print/private/…                   your personal card, from brand/business-card.local.json
                                      (git-ignored, so personal details stay out of the repository)
PNG exports are rendered afterwards by scripts/brand/render-images.mjs.

Requires: pip install fonttools brotli uharfbuzz segno      Run: npm run brand
"""

import io
import json
import math
import shutil
import subprocess
import zlib
from functools import lru_cache
from pathlib import Path

import segno
import uharfbuzz as hb
from fontTools.pens.basePen import BasePen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

ROOT = Path(__file__).resolve().parents[2]
ARCHIVO = ROOT / "src/assets/fonts/archivo-var.woff2"
KIT = ROOT / "brand"

NAME = "Texponex"

# Colors: screen (sRGB) and print (CMYK, 0–1). The CMYK values for ember are a
# calculated starting point: always approve a printed proof (see brand/README.md).
INK, BONE, EMBER, WHITE = "#0E0F0D", "#F3F1EC", "#F0532D", "#FFFFFF"
CMYK_BLACK = (0, 0, 0, 1)            # K100: logo and text on light paper
CMYK_RICH_BLACK = (0.6, 0.4, 0.4, 1)  # large dark areas (card background)
CMYK_EMBER = (0, 0.65, 0.81, 0)       # no black: K muddies a vivid orange on press
CMYK_PAPER = (0, 0, 0, 0)            # knockout: unprinted paper shows through
CMYK_GREY = (0, 0, 0, 0.7)           # secondary text on light paper

# ---------------------------------------------------------------------------
# Geometry rules (logo units; y grows downward)
#
# Wordmark: Archivo, width 112 %, weight 640, tracking −0.012 em, real kerning.
# The exponent — the ember square — is the brand device:
#   side   = 0.46 × cap height
#   center = on the cap line (it straddles it, like a mathematical exponent)
#   gap    = 0.125 × cap height from the last letter's ink
# Symbol: a T with the same exponent, on a grid of t = 3 units:
#   bar 9t × 3t, stem 3t × 6t, exponent 4t straddling the T's top edge, gap 1t.
# ---------------------------------------------------------------------------
CAP = 20.0
WDTH, WGHT, TRACKING = 112, 640, -0.012
EXP_SIDE = 0.46 * CAP
EXP_GAP = 0.125 * CAP

T = 3
SYMBOL_W, SYMBOL_H = 14 * T, 11 * T
SYMBOL_INK = [("M", 0, 2 * T), ("L", 9 * T, 2 * T), ("L", 9 * T, 5 * T), ("L", 6 * T, 5 * T),
              ("L", 6 * T, 11 * T), ("L", 3 * T, 11 * T), ("L", 3 * T, 5 * T), ("L", 0, 5 * T), ("Z",)]
SYMBOL_EXP = [("M", 10 * T, 0), ("L", 14 * T, 0), ("L", 14 * T, 4 * T), ("L", 10 * T, 4 * T), ("Z",)]


def rect(x, y, w, h):
    return [("M", x, y), ("L", x + w, y), ("L", x + w, y + h), ("L", x, y + h), ("Z",)]


# ---------------------------------------------------------------------------
# Font outlines
# ---------------------------------------------------------------------------
class OpsPen(BasePen):
    """Collects outlines as absolute M/L/C/Z ops in y-down space."""

    def __init__(self, glyph_set, scale, dx, baseline):
        super().__init__(glyph_set)
        self.ops, self.s, self.dx, self.base = [], scale, dx, baseline

    def _p(self, pt):
        return (self.dx + pt[0] * self.s, self.base - pt[1] * self.s)

    def _moveTo(self, pt):
        self.ops.append(("M", *self._p(pt)))

    def _lineTo(self, pt):
        self.ops.append(("L", *self._p(pt)))

    def _curveToOne(self, p1, p2, p3):
        self.ops.append(("C", *self._p(p1), *self._p(p2), *self._p(p3)))

    def _closePath(self):
        self.ops.append(("Z",))

    _endPath = _closePath


@lru_cache(maxsize=None)
def font_instance(wght, wdth):
    font = instantiateVariableFont(TTFont(ARCHIVO), {"wght": wght, "wdth": wdth})
    font.flavor = None
    data = io.BytesIO()
    font.save(data)
    return font, data.getvalue()


def shape(text, *, size, wght, wdth, tracking=0.0, x=0.0, baseline=0.0, by_cap=False):
    """Outlines `text` with HarfBuzz kerning. `size` is the em size, or the cap
    height when by_cap is true. Returns (ops, advance_width, ink_right, descent)."""
    font, data = font_instance(wght, wdth)
    glyph_set, order = font.getGlyphSet(), font.getGlyphOrder()
    upm = font["head"].unitsPerEm
    scale = size / (font["OS/2"].sCapHeight if by_cap else upm)

    hb_font = hb.Font(hb.Face(data))
    buf = hb.Buffer()
    buf.add_str(text)
    buf.guess_segment_properties()
    hb.shape(hb_font, buf, {"kern": True, "liga": False})

    ops, pen_x, ink_right, lowest = [], x, x, 0
    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
        name = order[info.codepoint]
        pen = OpsPen(glyph_set, scale, pen_x + pos.x_offset * scale, baseline)
        glyph_set[name].draw(pen)
        ops += pen.ops
        bounds = BoundsPen(glyph_set)
        glyph_set[name].draw(bounds)
        if bounds.bounds:
            ink_right = pen_x + bounds.bounds[2] * scale
            lowest = min(lowest, bounds.bounds[1])
        pen_x += (pos.x_advance + tracking * upm) * scale
    return ops, pen_x - x - tracking * upm * scale, ink_right, -lowest * scale


# ---------------------------------------------------------------------------
# Logo construction
# ---------------------------------------------------------------------------
def primary_logo():
    """Wordmark + exponent. Returns dict(width, height, ink=ops, accent=ops, cap_top, baseline)."""
    cap_top = EXP_SIDE / 2  # the exponent's top edge sits at y = 0
    baseline = cap_top + CAP
    ops, _, ink_right, descent = shape(NAME, size=CAP, wght=WGHT, wdth=WDTH, tracking=TRACKING,
                                       baseline=baseline, by_cap=True)
    exp_x = ink_right + EXP_GAP
    return {
        "width": round(exp_x + EXP_SIDE, 2),
        "height": round(baseline + math.ceil(descent * 10) / 10, 2),
        "ink": ops,
        "accent": rect(exp_x, 0, EXP_SIDE, EXP_SIDE),
        "baseline": baseline,
    }


def symbol():
    return {"width": SYMBOL_W, "height": SYMBOL_H, "ink": SYMBOL_INK, "accent": SYMBOL_EXP}


# ---------------------------------------------------------------------------
# Output: SVG
# ---------------------------------------------------------------------------
def num(v):
    return f"{v:.2f}".rstrip("0").rstrip(".")


def svg_d(ops):
    out = []
    for op in ops:
        out.append(op[0] + " ".join(num(v) for v in op[1:]))
    return "".join(out)


def svg_file(logo, ink, accent, title=True, margin=0):
    w, h = logo["width"] + 2 * margin, logo["height"] + 2 * margin
    head = f"<title>{NAME}</title>" if title else ""
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{num(-margin)} {num(-margin)} {num(w)} {num(h)}" '
        f'width="{num(w)}" height="{num(h)}" role="img" aria-label="{NAME}">{head}'
        f'<path fill="{ink}" d="{svg_d(logo["ink"])}"/><path fill="{accent}" d="{svg_d(logo["accent"])}"/></svg>\n'
    )


# ---------------------------------------------------------------------------
# Output: PDF (vector, CMYK) — a minimal, standards-compliant writer
# ---------------------------------------------------------------------------
def pdf_path(ops, scale=1.0, dx=0.0, dy=0.0):
    p = lambda v: f"{v:.3f}".rstrip("0").rstrip(".")
    out = []
    for op in ops:
        if op[0] == "Z":
            out.append("h")
            continue
        coords = [(op[i] * scale + dx, op[i + 1] * scale + dy) for i in range(1, len(op), 2)]
        flat = " ".join(f"{p(x)} {p(y)}" for x, y in coords)
        out.append(f"{flat} {'m' if op[0] == 'M' else 'l' if op[0] == 'L' else 'c'}")
    return "\n".join(out)


def pdf_fill(ops, cmyk, **transform):
    c, m, y, k = cmyk
    return f"{c:g} {m:g} {y:g} {k:g} k\n{pdf_path(ops, **transform)}\nf\n"


def write_pdf(path, pages, title):
    """pages: list of dicts with 'size' (w, h) in pt, 'content' (str, y-down
    coordinates) and optional 'trim' (x0, y0, x1, y1) in y-down coordinates."""
    objects = []

    def add(body):
        objects.append(body)
        return len(objects)

    catalog = add(None)
    pages_obj = add(None)
    kids = []
    for page in pages:
        w, h = page["size"]
        # Flip to y-down so all geometry can use the same coordinates as SVG.
        stream = zlib.compress(f"1 0 0 -1 0 {h:g} cm\n{page['content']}".encode())
        content = add(b"<< /Length %d /Filter /FlateDecode >>\nstream\n" % len(stream) + stream + b"\nendstream")
        boxes = f"/MediaBox [0 0 {w:g} {h:g}]"
        if page.get("trim"):
            x0, y0, x1, y1 = page["trim"]
            boxes += f" /TrimBox [{x0:g} {h - y1:g} {x1:g} {h - y0:g}] /BleedBox [0 0 {w:g} {h:g}]"
        kids.append(add(f"<< /Type /Page /Parent {pages_obj} 0 R {boxes} /Resources << >> /Contents {content} 0 R >>".encode()))
    objects[catalog - 1] = f"<< /Type /Catalog /Pages {pages_obj} 0 R >>".encode()
    objects[pages_obj - 1] = f"<< /Type /Pages /Kids [{' '.join(f'{k} 0 R' for k in kids)}] /Count {len(kids)} >>".encode()
    info = add(f"<< /Title ({title}) /Author ({NAME}) /Producer (scripts/brand/brand.py) >>".encode())

    out = io.BytesIO()
    out.write(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    offsets = []
    for index, body in enumerate(objects, start=1):
        offsets.append(out.tell())
        out.write(f"{index} 0 obj\n".encode() + body + b"\nendobj\n")
    xref = out.tell()
    out.write(f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n".encode())
    for offset in offsets:
        out.write(f"{offset:010d} 00000 n \n".encode())
    out.write(f"trailer\n<< /Size {len(objects) + 1} /Root {catalog} 0 R /Info {info} 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode())
    path.write_bytes(out.getvalue())


MM = 72 / 25.4


def logo_pdf(path, logo, ink_cmyk, accent_cmyk, width_mm, title):
    """Logo at `width_mm` wide with clear space (one exponent side) around it."""
    scale = width_mm * MM / logo["width"]
    margin = (EXP_SIDE if logo["width"] > SYMBOL_W else 4 * T) * scale
    w, h = logo["width"] * scale + 2 * margin, logo["height"] * scale + 2 * margin
    content = pdf_fill(logo["ink"], ink_cmyk, scale=scale, dx=margin, dy=margin)
    content += pdf_fill(logo["accent"], accent_cmyk, scale=scale, dx=margin, dy=margin)
    write_pdf(path, [{"size": (w, h), "content": content}], title)


# ---------------------------------------------------------------------------
# Business card (3.5 × 2 in, 3 mm bleed, all text outlined)
# ---------------------------------------------------------------------------
CARD_W, CARD_H, BLEED, SAFE = 252.0, 144.0, 3 * MM, 5 * MM


def business_card(path, details, logo, mark):
    W, H = CARD_W + 2 * BLEED, CARD_H + 2 * BLEED
    trim = (BLEED, BLEED, BLEED + CARD_W, BLEED + CARD_H)
    left, top = BLEED + SAFE + 2 * MM, BLEED + SAFE + 2 * MM
    right, bottom = BLEED + CARD_W - SAFE - 2 * MM, BLEED + CARD_H - SAFE - 2 * MM

    # Front: rich black, primary logo knocked out, optically centered.
    front = pdf_fill(rect(0, 0, W, H), CMYK_RICH_BLACK)
    scale = 46 * MM / logo["width"]
    lx = (W - logo["width"] * scale) / 2
    ly = (H - logo["height"] * scale) / 2 - 1.5 * MM
    front += pdf_fill(logo["ink"], CMYK_PAPER, scale=scale, dx=lx, dy=ly)
    front += pdf_fill(logo["accent"], CMYK_EMBER, scale=scale, dx=lx, dy=ly)

    # Back: paper, details set in Archivo, symbol top-right.
    back = ""
    name_ops, *_ = shape(details["name"], size=10.5, wght=620, wdth=104, x=left, baseline=top + 7.5)
    back += pdf_fill(name_ops, CMYK_BLACK)
    title_ops, *_ = shape(details["title"], size=7.5, wght=420, wdth=100, x=left, baseline=top + 18)
    back += pdf_fill(title_ops, CMYK_GREY)

    lines = [details.get("phone", ""), details["email"], details["website"]]
    lines = [line for line in lines if line]
    for index, line in enumerate(reversed(lines)):
        ops, *_ = shape(line, size=7.5, wght=480, wdth=100, x=left, baseline=bottom - index * 11)
        back += pdf_fill(ops, CMYK_BLACK)

    # QR code to the website, bottom-right, sitting on the last text baseline.
    # K100 only for a crisp single-plate print; the 4-module quiet zone falls
    # inside the card's blank margin.
    if details.get("qr"):
        size = QR_SIZE_MM * MM
        back += pdf_fill(qr_ops(details["qr"], size), CMYK_BLACK, dx=right - size, dy=bottom - size)

    m_scale = 9 * MM / mark["width"]
    mx = right - mark["width"] * m_scale
    back += pdf_fill(mark["ink"], CMYK_BLACK, scale=m_scale, dx=mx, dy=top - 1)
    back += pdf_fill(mark["accent"], CMYK_EMBER, scale=m_scale, dx=mx, dy=top - 1)

    write_pdf(path, [
        {"size": (W, H), "content": front, "trim": trim},
        {"size": (W, H), "content": back, "trim": trim},
    ], f"{NAME} business card")


QR_SIZE_MM = 14  # symbol only; plus a 4-module quiet zone of blank paper


def qr_ops(data, size):
    """QR code as vector paths (one rectangle per horizontal run of dark modules),
    `size` wide without the quiet zone. Error correction M survives small marks."""
    matrix = [list(row) for row in segno.make(data, error="m", micro=False, boost_error=False).matrix]
    module = size / len(matrix)
    ops = []
    for y, row in enumerate(matrix):
        x = 0
        while x < len(row):
            if row[x]:
                start = x
                while x < len(row) and row[x]:
                    x += 1
                # Rows overlap by a hair so no white line can appear between them.
                ops += rect(start * module, y * module, (x - start) * module, module + 0.02)
            else:
                x += 1
    return ops


def main():
    logo, mark = primary_logo(), symbol()

    # Website ---------------------------------------------------------------
    brand = ROOT / "src/public/brand"
    brand.mkdir(parents=True, exist_ok=True)
    for stale in brand.glob("*.svg"):
        stale.unlink()
    (brand / "texponex-logo.svg").write_text(svg_file(logo, INK, EMBER))
    (brand / "texponex-logo-light.svg").write_text(svg_file(logo, BONE, EMBER))
    (brand / "texponex-mark.svg").write_text(svg_file(mark, INK, EMBER))
    (ROOT / "src/public/favicon.svg").write_text(
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="-1 {-(SYMBOL_W - SYMBOL_H) / 2 - 1:g} {SYMBOL_W + 2} {SYMBOL_W + 2}">'
        f"<style>.i{{fill:{INK}}}@media (prefers-color-scheme:dark){{.i{{fill:{BONE}}}}}</style>"
        f'<path class="i" d="{svg_d(mark["ink"])}"/><path fill="{EMBER}" d="{svg_d(mark["accent"])}"/></svg>\n'
    )
    (ROOT / "src/partials/logo.html").write_text(
        "<!-- Generated by scripts/brand/brand.py — do not edit by hand. -->\n"
        f'<svg class="logo" viewBox="0 0 {num(logo["width"])} {num(logo["height"])}" width="{num(logo["width"])}" '
        f'height="{num(logo["height"])}" aria-hidden="true" focusable="false">'
        f'<path fill="currentColor" d="{svg_d(logo["ink"])}"/><path class="logo__next" d="{svg_d(logo["accent"])}"/></svg>\n'
    )

    # Brand kit -------------------------------------------------------------
    svg_dir, pdf_dir, print_dir = KIT / "logo/svg", KIT / "logo/pdf", KIT / "print"
    for directory in (svg_dir, pdf_dir, print_dir):
        directory.mkdir(parents=True, exist_ok=True)
    colorways = {
        # name: (screen ink, screen accent, print ink, print accent)
        "color": (INK, EMBER, CMYK_BLACK, CMYK_EMBER),
        "reversed": (BONE, EMBER, CMYK_PAPER, CMYK_EMBER),
        "black": (INK, INK, CMYK_BLACK, CMYK_BLACK),
        "white": (WHITE, WHITE, CMYK_PAPER, CMYK_PAPER),
    }
    for kind, art, width_mm in (("logo", logo, 100), ("symbol", mark, 40)):
        clear = EXP_SIDE if kind == "logo" else 4 * T
        for name, (ink, accent, ink_cmyk, accent_cmyk) in colorways.items():
            stem = f"texponex-{kind}-{name}"
            (svg_dir / f"{stem}.svg").write_text(svg_file(art, ink, accent, margin=clear))
            logo_pdf(pdf_dir / f"{stem}-cmyk.pdf", art, ink_cmyk, accent_cmyk, width_mm, f"{NAME} {kind} ({name}, CMYK)")

    # Business cards: the committed card uses the public details in
    # business-card.json; personal details go in business-card.local.json,
    # which git ignores, and produce a card in print/private/.
    details_file = KIT / "business-card.json"
    if not details_file.exists():
        details_file.write_text(json.dumps({
            "name": "Your Name",
            "title": "Your Title",
            "phone": "",
            "email": "hello@texponex.com",
            "website": "www.texponex.com",
            "qr": "https://www.texponex.com",
        }, indent=2) + "\n")
    cards = [(json.loads(details_file.read_text()), print_dir)]
    local_file = KIT / "business-card.local.json"
    if local_file.exists():
        private = print_dir / "private"
        private.mkdir(exist_ok=True)
        cards.append(({**cards[0][0], **json.loads(local_file.read_text())}, private))

    for details, directory in cards:
        card = directory / "texponex-business-card.pdf"
        business_card(card, details, logo, mark)
        if shutil.which("pdftoppm"):  # previews (poppler)
            for page, side in ((1, "front"), (2, "back")):
                stem = directory / f"texponex-business-card-{side}-preview"
                subprocess.run(["pdftoppm", "-png", "-r", "300", "-f", str(page), "-l", str(page), "-singlefile",
                                str(card), str(stem)], check=True)
        print(f"Business card written: {card.relative_to(ROOT)}")

    print(f"Primary logo {logo['width']} × {logo['height']} units; symbol {SYMBOL_W} × {SYMBOL_H}.")
    print("Website assets and brand kit written (brand/). Next: node scripts/brand/render-images.mjs")


if __name__ == "__main__":
    main()
