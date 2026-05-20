#!/usr/bin/env python3
"""
Generate the Biz-Salama Seller Pitch Deck as a PDF.

PDF is the dominant format for WhatsApp sharing in Tanzania, so we render
directly via ReportLab (no libreoffice dependency). Slide content and visual
hierarchy mirror /app/backend/scripts/generate_seller_pitch.py (the .pptx
version) so both files tell the same story.

Output: /app/biz_salama_seller_pitch_sw.pdf
Serve:  GET /api/docs/seller-pitch.pdf (registered in server.py)
Regen:  make pitch-deck-pdf
"""
from pathlib import Path
from reportlab.lib.colors import HexColor, Color
from reportlab.lib.units import inch
from reportlab.lib.pagesizes import landscape
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT

# Brand palette (matches the .pptx and Tailwind config)
GOLD       = HexColor("#F59E0B")
GOLD_LIGHT = HexColor("#FBBF24")
INK_900    = HexColor("#0F172A")
INK_800    = HexColor("#1E293B")
INK_700    = HexColor("#334155")
INK_400    = HexColor("#94A3B8")
INK_300    = HexColor("#CBD5E1")
EMERALD    = HexColor("#10B981")
EMERALD_LT = HexColor("#34D399")
ROSE       = HexColor("#F43F5E")
WHITE      = HexColor("#FFFFFF")

# 10in × 7.5in landscape (same as .pptx) → 720×540 pt
PAGE_W, PAGE_H = 720, 540
PAGESIZE = (PAGE_W, PAGE_H)
TOTAL_SLIDES = 11

OUT_PATH = Path("/app/biz_salama_seller_pitch_sw.pdf")


def _register_fonts():
    """
    Use DejaVuSans if available so we can render Kiswahili glyphs and emoji
    fallbacks correctly. Falls back to Helvetica silently if the font isn't on
    disk (PDF will still be valid; some emoji will render as boxes).
    """
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ]
    if all(Path(p).exists() for p in candidates):
        pdfmetrics.registerFont(TTFont("Body", candidates[0]))
        pdfmetrics.registerFont(TTFont("Body-Bold", candidates[1]))
        return "Body", "Body-Bold"
    return "Helvetica", "Helvetica-Bold"


FONT, FONT_B = _register_fonts()


# ─── Helpers ───────────────────────────────────────────────────────────────

def rect(c, x, y, w, h, color: Color, *, radius=0, stroke=None):
    """Filled (optionally rounded, optionally stroked) rectangle.
    PDF coordinates are bottom-up — callers pass top-left x/y in our slide
    coordinate system; this helper translates."""
    pdf_y = PAGE_H - y - h
    c.saveState()
    c.setFillColor(color)
    if stroke:
        c.setStrokeColor(stroke)
        c.setLineWidth(0.5)
        op = "fill_stroke"
    else:
        op = "fill"
    if radius:
        c.roundRect(x, pdf_y, w, h, radius, stroke=bool(stroke), fill=1)
    else:
        c.rect(x, pdf_y, w, h, stroke=bool(stroke), fill=1)
    _ = op  # quiet linter (saved for future use)
    c.restoreState()


def circle(c, cx, cy, r, color: Color):
    pdf_y = PAGE_H - cy
    c.saveState()
    c.setFillColor(color)
    c.circle(cx, pdf_y, r, stroke=0, fill=1)
    c.restoreState()


def _style(*, size, color, bold=False, italic=False, align=TA_LEFT, leading=None):
    return ParagraphStyle(
        "x",
        fontName=FONT_B if bold else FONT,
        fontSize=size,
        textColor=color,
        leading=leading or size * 1.25,
        alignment=align,
    )


def text(
    c, x, y, w, h, body, *,
    size=12, color=WHITE, bold=False, italic=False, align=TA_LEFT, anchor="top",
):
    """Render a paragraph in a box. Anchor: 'top' (default), 'middle', or 'bottom'.
    Paragraph wraps within `w` and is positioned within `(x, y, w, h)`."""
    style = _style(size=size, color=color, bold=bold, italic=italic, align=align)
    # ReportLab paragraphs render bottom-up. Use frame technique: compute the
    # paragraph's wrapped height, then draw at the right Y.
    p = Paragraph(body.replace("\n", "<br/>"), style)
    _, ph = p.wrap(w, h)
    if anchor == "middle":
        offset = (h - ph) / 2
    elif anchor == "bottom":
        offset = h - ph
    else:
        offset = 0
    pdf_y_top = PAGE_H - y - offset - ph
    p.drawOn(c, x, pdf_y_top)


def pill(c, x, y, w, h, label, *, fill=GOLD, fg=INK_900, size=8):
    rect(c, x, y, w, h, fill, radius=h / 2)
    text(c, x, y, w, h, label, size=size, color=fg, bold=True, align=TA_CENTER, anchor="middle")


def footer(c, idx):
    text(c, (0.5 * inch), (7.0 * inch), (6 * inch), (0.3 * inch),
         "Biz-Salama  ·  biz-salama.co.tz  ·  Uza salama. Lipwa salama.",
         size=7, color=INK_400)
    text(c, (9.0 * inch), (7.0 * inch), (0.7 * inch), (0.3 * inch),
         f"{idx}/{TOTAL_SLIDES}", size=7, color=INK_400, align=TA_RIGHT)


def bg(c, color=INK_900):
    rect(c, 0, 0, PAGE_W, PAGE_H, color)


# ─── Build PDF ─────────────────────────────────────────────────────────────

c = canvas.Canvas(str(OUT_PATH), pagesize=PAGESIZE)
c.setTitle("Biz-Salama — Mwongozo wa Muuzaji")
c.setAuthor("Biz-Salama")
c.setSubject("Seller Pitch Deck (Kiswahili)")


# Slide 1 — Cover
bg(c, INK_900)
# Soft gold blob (transparent fill via low-opacity layer)
c.saveState()
c.setFillColorRGB(0.96, 0.62, 0.04, alpha=0.15)
c.circle(0, PAGE_H, (2.5 * inch), stroke=0, fill=1)
c.restoreState()

pill(c, (0.6 * inch), (0.6 * inch), (2.4 * inch), (0.4 * inch),
     "🛡  BIZ-SALAMA", fill=GOLD, fg=INK_900, size=10)
text(c, (0.6 * inch), (1.6 * inch), (9 * inch), (1.5 * inch),
     "Karibu Biz-Salama", size=48, bold=True, color=WHITE)
text(c, (0.6 * inch), (2.9 * inch), (9 * inch), (0.7 * inch),
     "Soko salama la Tanzania — uza, lipwa, kua.",
     size=20, color=GOLD_LIGHT)
text(c, (0.6 * inch), (3.6 * inch), (9 * inch), (0.5 * inch),
     "Tanzania's trusted escrow marketplace — sell, get paid, grow.",
     size=12, color=INK_300, italic=True)

pill(c, (0.6 * inch), (4.8 * inch), (2.5 * inch), (0.6 * inch),
     "✅  Malipo Yamelindwa / Escrow Protected", fill=EMERALD, fg=WHITE, size=9)
pill(c, (3.3 * inch), (4.8 * inch), (2.5 * inch), (0.6 * inch),
     "📱  M-Pesa · Tigo · Airtel", fill=INK_700, fg=WHITE, size=9)
pill(c, (6.0 * inch), (4.8 * inch), (2.5 * inch), (0.6 * inch),
     "🎙  Orodhesha kwa Sauti", fill=INK_700, fg=WHITE, size=9)

text(c, (0.6 * inch), (6.8 * inch), (9 * inch), (0.4 * inch),
     "Mwongozo wa Mfanyabiashara  ·  Seller Onboarding Pitch Deck",
     size=10, color=INK_400)
c.showPage()


# Slide 2 — Tatizo / Problem
bg(c)
pill(c, (0.6 * inch), (0.5 * inch), (1.4 * inch), (0.35 * inch),
     "TATIZO / THE PROBLEM", fill=ROSE, fg=WHITE, size=8)
text(c, (0.6 * inch), (1.0 * inch), (9 * inch), (0.9 * inch),
     "Kuuza mtandaoni TZ ni hatari", size=32, bold=True, color=WHITE)
text(c, (0.6 * inch), (1.9 * inch), (9 * inch), (0.4 * inch),
     "Selling online in Tanzania is risky — here's why:",
     size=11, color=INK_400)

pains = [
    ("💸", "Mteja anataka uone kwanza", "Buyer wants you to ship before paying",
     "Wewe unalipa usafirishaji, halafu mteja anatoweka."),
    ("🎭", "Watu wa uongo (scammers)", "Fake buyers / fake sellers",
     "Mtu anajifanya mteja, halafu anaiba bidhaa au pesa."),
    ("⏳", "Hakuna ulinzi wa malipo", "No payment protection",
     "Hakuna anayeshikilia pesa salama kati ya nyote wawili."),
    ("⚖️", "Hakuna njia ya kutatua mgogoro", "No dispute resolution",
     "Kama mambo yanakwenda mrama, hakuna mahali pa kupiga simu."),
]
for i, (emoji, sw, en, body) in enumerate(pains):
    col, row = i % 2, i // 2
    x = ((0.6 + col * 4.6) * inch)
    y = ((2.5 + row * 1.95) * inch)
    rect(c, x, y, (4.3 * inch), (1.75 * inch), INK_800, radius=10)
    text(c, x + (0.25 * inch), y + (0.15 * inch), (0.5 * inch), (0.5 * inch), emoji, size=20)
    text(c, x + (0.9 * inch), y + (0.2 * inch), (3.2 * inch), (0.4 * inch),
         sw, size=12, bold=True, color=WHITE)
    text(c, x + (0.9 * inch), y + (0.6 * inch), (3.2 * inch), (0.3 * inch),
         en, size=9, color=GOLD_LIGHT)
    text(c, x + (0.25 * inch), y + (1.0 * inch), (3.85 * inch), (0.7 * inch),
         body, size=9, color=INK_300)
footer(c, 2)
c.showPage()


# Slide 3 — Suluhisho / Solution
bg(c)
pill(c, (0.6 * inch), (0.5 * inch), (1.5 * inch), (0.35 * inch),
     "SULUHISHO / THE SOLUTION", fill=EMERALD, fg=WHITE, size=8)
text(c, (0.6 * inch), (1.0 * inch), (9 * inch), (0.9 * inch),
     "Biz-Salama = Escrow + Soko", size=32, bold=True, color=WHITE)
text(c, (0.6 * inch), (1.9 * inch), (9 * inch), (0.4 * inch),
     "Escrow + Marketplace, built for Tanzanian commerce",
     size=11, color=INK_400)

benefits = [
    ("🔒", "Pesa zinashikiliwa salama", "Funds held in escrow",
     "Mteja anaweka pesa Biz-Salama. Hatupeleki kwako mpaka mteja athibitishe bidhaa imefika salama."),
    ("📲", "Lipwa kwa M-Pesa moja kwa moja", "Direct M-Pesa payout",
     "Tunatuma kwa M-Pesa, Tigo Pesa au Airtel Money mara tu mteja anapokubali."),
    ("🛡", "Ulinzi wa pande zote mbili", "Both sides protected",
     "Wewe huitaji kufuatilia mteja. Mteja huitaji kukutuhumu. Sote tunashinda."),
]
for i, (emoji, sw, en, body) in enumerate(benefits):
    y = ((2.6 + i * 1.4) * inch)
    rect(c, (0.6 * inch), y, (8.8 * inch), (1.25 * inch), INK_800, radius=10)
    circle(c, (1.15 * inch), y + (0.62 * inch), (0.35 * inch), GOLD)
    text(c, (0.75 * inch), y + (0.32 * inch), (0.8 * inch), (0.6 * inch),
         emoji, size=20, align=TA_CENTER)
    text(c, (1.85 * inch), y + (0.2 * inch), (7.0 * inch), (0.4 * inch),
         sw, size=15, bold=True, color=WHITE)
    text(c, (1.85 * inch), y + (0.6 * inch), (7.0 * inch), (0.3 * inch),
         en, size=10, color=GOLD_LIGHT)
    text(c, (1.85 * inch), y + (0.9 * inch), (7.3 * inch), (0.4 * inch),
         body, size=9, color=INK_300)
footer(c, 3)
c.showPage()


# Slide 4 — Jinsi inavyofanya kazi / How it works
bg(c)
pill(c, (0.6 * inch), (0.5 * inch), (1.5 * inch), (0.35 * inch),
     "JINSI INAVYOFANYA / HOW IT WORKS", fill=GOLD, fg=INK_900, size=8)
text(c, (0.6 * inch), (1.0 * inch), (9 * inch), (0.9 * inch),
     "Hatua 5 tu  /  Just 5 steps", size=30, bold=True, color=WHITE)

steps = [
    ("1", "📝", "Orodhesha bidhaa", "List your product",
     "Andika au sema kwa sauti (Kiswahili / English)."),
    ("2", "💰", "Mteja analipa", "Buyer pays escrow",
     "M-Pesa / Tigo / Airtel — pesa zinashikiliwa Biz-Salama."),
    ("3", "📦", "Tuma bidhaa", "You ship the item",
     "Tunakuarifu pesa imeshikiliwa — pakizia na peleka."),
    ("4", "✅", "Mteja anathibitisha", "Buyer confirms",
     "Anaweka 'Nimepokea'. Tunapata uthibitisho."),
    ("5", "🏦", "Lipwa moja kwa moja", "Get paid instantly",
     "Pesa zinaingia M-Pesa yako (98% ya bei yako)."),
]
for i, (n, emoji, sw, en, desc) in enumerate(steps):
    x = ((0.45 + i * 1.85) * inch)
    y = (2.4 * inch)
    rect(c, x, y, (1.7 * inch), (3.5 * inch), INK_800, radius=10)
    circle(c, x + (0.85 * inch), y, (0.22 * inch), GOLD)
    text(c, x + (0.55 * inch), y - (0.12 * inch), (0.6 * inch), (0.4 * inch),
         n, size=14, bold=True, color=INK_900, align=TA_CENTER)
    text(c, x, y + (0.45 * inch), (1.7 * inch), (0.6 * inch),
         emoji, size=24, align=TA_CENTER)
    text(c, x + (0.1 * inch), y + (1.35 * inch), (1.5 * inch), (0.5 * inch),
         sw, size=10, bold=True, color=WHITE, align=TA_CENTER)
    text(c, x + (0.1 * inch), y + (1.75 * inch), (1.5 * inch), (0.3 * inch),
         en, size=7, color=GOLD_LIGHT, align=TA_CENTER)
    text(c, x + (0.15 * inch), y + (2.15 * inch), (1.4 * inch), (1.3 * inch),
         desc, size=7, color=INK_300, align=TA_CENTER)

rect(c, (0.6 * inch), (6.1 * inch), (8.8 * inch), (0.7 * inch), INK_800, radius=15)
text(c, (0.8 * inch), (6.1 * inch), (8.4 * inch), (0.7 * inch),
     "💡 Wakati wote, mteja anaona unalindwa, na wewe unaona umelindwa.  "
     "At every step, both sides see protection.",
     size=10, color=GOLD_LIGHT, align=TA_CENTER, anchor="middle")
footer(c, 4)
c.showPage()


# Slide 5 — Faida zako / Your benefits
bg(c)
pill(c, (0.6 * inch), (0.5 * inch), (1.4 * inch), (0.35 * inch),
     "FAIDA ZAKO / YOUR BENEFITS", fill=EMERALD, fg=WHITE, size=8)
text(c, (0.6 * inch), (1.0 * inch), (9 * inch), (0.9 * inch),
     "Kwa nini Biz-Salama?", size=32, bold=True, color=WHITE)
text(c, (0.6 * inch), (1.9 * inch), (9 * inch), (0.4 * inch),
     "Six concrete reasons to start selling on Biz-Salama today",
     size=11, color=INK_400)

items = [
    ("🛡", "Hakuna chargebacks",     "No chargebacks",      "Mteja anapomaliza, pesa ni zako milele."),
    ("📲", "Malipo ya mara moja",   "Instant M-Pesa",      "Hakuna kungoja siku 3-5 za benki."),
    ("🎙", "Orodhesha kwa sauti",   "Voice listing",       "Sema bidhaa yako — tutaitafsiri na kuipublish."),
    ("👩🏾", "Wanunuzi wanaojulikana", "Verified buyers",   "Tunathibitisha namba ya simu ya kila mnunuzi."),
    ("⚖️", "Tukio la mgogoro?",     "Dispute resolution",  "Tunakaa katikati — uamuzi wa haki kwa pande zote."),
    ("🌍", "Toka Dar mpaka Mwanza", "Reach all of TZ",     "Tanzania nzima inakuona — siyo mtaa wako tu."),
]
for i, (emoji, sw, en, body) in enumerate(items):
    col, row = i % 3, i // 3
    x = ((0.6 + col * 3.0) * inch)
    y = ((2.6 + row * 1.95) * inch)
    rect(c, x, y, (2.85 * inch), (1.75 * inch), INK_800, radius=10)
    text(c, x + (0.2 * inch), y + (0.15 * inch), (0.6 * inch), (0.5 * inch),
         emoji, size=18)
    text(c, x + (0.85 * inch), y + (0.15 * inch), (1.9 * inch), (0.5 * inch),
         sw, size=11, bold=True, color=WHITE)
    text(c, x + (0.85 * inch), y + (0.55 * inch), (1.9 * inch), (0.3 * inch),
         en, size=8, color=GOLD_LIGHT)
    text(c, x + (0.2 * inch), y + (0.95 * inch), (2.5 * inch), (0.75 * inch),
         body, size=8, color=INK_300)
footer(c, 5)
c.showPage()


# Slide 6 — Ada / Fees
bg(c)
pill(c, (0.6 * inch), (0.5 * inch), (0.9 * inch), (0.35 * inch),
     "ADA / FEES", fill=GOLD, fg=INK_900, size=8)
text(c, (0.6 * inch), (1.0 * inch), (9 * inch), (0.9 * inch),
     "Ada wazi — hakuna siri", size=32, bold=True, color=WHITE)
text(c, (0.6 * inch), (1.9 * inch), (9 * inch), (0.4 * inch),
     "Transparent fees — what you see is what you pay.",
     size=11, color=INK_400)
text(c, (0.6 * inch), (2.5 * inch), (9 * inch), (0.4 * inch),
     "Mfano / Example: bidhaa yako ya TZS 100,000",
     size=14, bold=True, color=GOLD_LIGHT)

bars = [
    ("Bei yako (asking price)", "Your price",      "TZS 100,000", 1.0,  WHITE),
    ("− Ada ya supply 2%",      "− 2% supply fee", "− TZS 2,000",  0.02, INK_400),
    ("= Unachopata",            "= You receive",   "TZS 98,000 (98%)", 0.98, EMERALD_LT),
]
y = (3.3 * inch)
for sw, en, amt, frac, col in bars:
    text(c, (0.6 * inch), y, (4.0 * inch), (0.4 * inch),
         sw, size=12, bold=True, color=col)
    text(c, (0.6 * inch), y + (0.3 * inch), (4.0 * inch), (0.3 * inch),
         en, size=9, color=INK_400)
    rect(c, (4.7 * inch), y + (0.1 * inch), (4.0 * inch), (0.4 * inch), INK_800, radius=8)
    if frac > 0:
        rect(c, (4.7 * inch), y + (0.1 * inch), ((4.0 * frac) * inch), (0.4 * inch), col, radius=8)
    text(c, (6.5 * inch), y + (0.1 * inch), (2.2 * inch), (0.4 * inch),
         amt, size=11, bold=True, color=WHITE, align=TA_RIGHT, anchor="middle")
    y += (0.75 * inch)

rect(c, (0.6 * inch), (6.1 * inch), (8.8 * inch), (0.7 * inch), EMERALD, radius=14)
text(c, (0.8 * inch), (6.1 * inch), (8.4 * inch), (0.7 * inch),
     "✅  Mteja anaongeza 3% juu ya bei yako kama ada ya escrow. Wewe haupotezi kitu nyongeza.  "
     "Buyer pays extra 3% — never deducted from your price.",
     size=10, color=WHITE, align=TA_CENTER, anchor="middle")
footer(c, 6)
c.showPage()


# Slide 7 — 3-Party Escrow
bg(c)
pill(c, (0.6 * inch), (0.5 * inch), (1.4 * inch), (0.35 * inch),
     "3-PARTY ESCROW / HAWKER MODE", fill=GOLD, fg=INK_900, size=8)
text(c, (0.6 * inch), (1.0 * inch), (9 * inch), (0.9 * inch),
     "Mchuuzi? Tunakulinda mara mbili.",
     size=28, bold=True, color=WHITE)
text(c, (0.6 * inch), (1.9 * inch), (9 * inch), (0.4 * inch),
     "Hawker? Protected on BOTH sides — supplier AND buyer.",
     size=11, color=INK_400)

actors = [
    ("👜", "MCHUUZI",          "HAWKER (you)",
     "Unaunganisha mteja na duka. Unapata commission ya 8–15%."),
    ("🏪", "MMILIKI WA DUKA",  "SUPPLIER",
     "Anauza bidhaa yake. Anapata bei kamili (−2%)."),
    ("🛍", "MNUNUZI",          "BUYER",
     "Analipa Biz-Salama. Anaona Letter of Comfort iliyosainiwa."),
]
for i, (emoji, sw, en, body) in enumerate(actors):
    x = ((0.6 + i * 3.0) * inch)
    y = (2.5 * inch)
    rect(c, x, y, (2.85 * inch), (2.7 * inch), INK_800, radius=10)
    text(c, x, y + (0.3 * inch), (2.85 * inch), (0.7 * inch),
         emoji, size=36, align=TA_CENTER)
    text(c, x, y + (1.2 * inch), (2.85 * inch), (0.4 * inch),
         sw, size=12, bold=True, color=GOLD_LIGHT, align=TA_CENTER)
    text(c, x, y + (1.55 * inch), (2.85 * inch), (0.3 * inch),
         en, size=9, color=INK_400, align=TA_CENTER)
    text(c, x + (0.2 * inch), y + (1.95 * inch), (2.45 * inch), (0.75 * inch),
         body, size=8, color=INK_300, align=TA_CENTER)

rect(c, (0.6 * inch), (5.5 * inch), (8.8 * inch), (1.2 * inch), GOLD, radius=14)
text(c, (0.8 * inch), (5.6 * inch), (8.4 * inch), (0.5 * inch),
     "🔐  Letter of Comfort iliyosainiwa kidijiti",
     size=12, bold=True, color=INK_900, align=TA_CENTER)
text(c, (0.8 * inch), (6.0 * inch), (8.4 * inch), (0.5 * inch),
     "Kila upande anaona maelezo yake tu — mmiliki haoni bei mteja anayolipa. "
     "Mteja anaona pesa zimeshikiliwa salama.",
     size=9, color=INK_900, align=TA_CENTER)
footer(c, 7)
c.showPage()


# Slide 8 — Voice Listing
bg(c)
pill(c, (0.6 * inch), (0.5 * inch), (1.4 * inch), (0.35 * inch),
     "VOICE LISTING / ORODHESHA KWA SAUTI", fill=EMERALD, fg=WHITE, size=8)
text(c, (0.6 * inch), (1.0 * inch), (9 * inch), (0.9 * inch),
     "Sekunde 20 — bidhaa iko hewani",
     size=30, bold=True, color=WHITE)
text(c, (0.6 * inch), (1.9 * inch), (9 * inch), (0.4 * inch),
     "20 seconds from idea to live listing — speak Swahili or English.",
     size=11, color=INK_400)

circle(c, (8.4 * inch), (3.6 * inch), (0.85 * inch), GOLD)
text(c, (7.55 * inch), (3.05 * inch), (1.7 * inch), (1.0 * inch),
     "🎙", size=64, align=TA_CENTER)

examples = [
    "🗣  'Kitenge cha bei rahisi, mita 5, Kariakoo, TSh 12,000.'",
    "✅  Kitenge fabric (5m), Kariakoo, TZS 12,000  (auto-categorised)",
    "",
    "🗣  'Samsung A54 mpya, warranty mwaka mzima, TSh 850,000.'",
    "✅  Samsung Galaxy A54, electronics, TZS 850,000  (price + category)",
]
y = (2.7 * inch)
for line in examples:
    if not line:
        y += (0.25 * inch)
        continue
    is_result = line.startswith("✅")
    text(c, (0.6 * inch), y, (6.5 * inch), (0.4 * inch),
         line, size=11, bold=is_result,
         color=EMERALD_LT if is_result else WHITE)
    y += (0.4 * inch)

rect(c, (0.6 * inch), (6.0 * inch), (8.8 * inch), (0.7 * inch), INK_800, radius=14)
text(c, (0.8 * inch), (6.0 * inch), (8.4 * inch), (0.7 * inch),
     "💡  Powered by OpenAI Whisper — inaelewa Kiswahili sanifu, "
     "lugha za mitaani, na lafudhi za Kanda.",
     size=10, color=GOLD_LIGHT, align=TA_CENTER, anchor="middle")
footer(c, 8)
c.showPage()


# Slide 9 — Usalama / Trust
bg(c)
pill(c, (0.6 * inch), (0.5 * inch), (1.4 * inch), (0.35 * inch),
     "USALAMA / TRUST & SAFETY", fill=GOLD, fg=INK_900, size=8)
text(c, (0.6 * inch), (1.0 * inch), (9 * inch), (0.9 * inch),
     "Sababu watu wanakuamini", size=32, bold=True, color=WHITE)
text(c, (0.6 * inch), (1.9 * inch), (9 * inch), (0.4 * inch),
     "Why buyers trust sellers on Biz-Salama — you get a verified badge.",
     size=11, color=INK_400)

trust = [
    ("🆔", "KYC iliyokamilika", "Verified KYC",
     "NIDA + TIN + Leseni ya biashara. Unapata 'Verified Seller' badge."),
    ("📜", "Cheti cha Escrow", "Escrow license",
     "Tunafanya kazi chini ya sheria za Tanzania (TRA + BoT compliant)."),
    ("🔍", "Ufuatiliaji wa udanganyifu", "Auto fraud detection",
     "Sheria 5 zinazochunguza kila order: velocity, self-deal, watchlist, refund-rate, new-account."),
    ("⚖️", "Mgogoro? Uamuzi wa siku 7", "7-day dispute auto-resolve",
     "Kama hakuna anayejibu, mfumo unatoa uamuzi wa haki — siyo lazima ujue mawakili."),
]
for i, (emoji, sw, en, body) in enumerate(trust):
    col, row = i % 2, i // 2
    x = ((0.6 + col * 4.6) * inch)
    y = ((2.5 + row * 1.95) * inch)
    rect(c, x, y, (4.3 * inch), (1.75 * inch), INK_800, radius=10)
    text(c, x + (0.25 * inch), y + (0.2 * inch), (0.6 * inch), (0.5 * inch),
         emoji, size=20)
    text(c, x + (0.95 * inch), y + (0.2 * inch), (3.1 * inch), (0.4 * inch),
         sw, size=12, bold=True, color=WHITE)
    text(c, x + (0.95 * inch), y + (0.6 * inch), (3.1 * inch), (0.3 * inch),
         en, size=9, color=GOLD_LIGHT)
    text(c, x + (0.25 * inch), y + (1.0 * inch), (3.85 * inch), (0.7 * inch),
         body, size=8, color=INK_300)
footer(c, 9)
c.showPage()


# Slide 10 — Mafanikio / Success story
bg(c)
pill(c, (0.6 * inch), (0.5 * inch), (1.4 * inch), (0.35 * inch),
     "MAFANIKIO / SUCCESS STORY", fill=EMERALD, fg=WHITE, size=8)
text(c, (0.6 * inch), (1.0 * inch), (9 * inch), (0.9 * inch),
     "Mama Asha — Kitenge Kariakoo", size=28, bold=True, color=WHITE)
text(c, (0.6 * inch), (1.9 * inch), (9 * inch), (0.4 * inch),
     "From 3 buyers/month to 40+ — how Biz-Salama changed her business.",
     size=11, color=INK_400)

# Quote card
rect(c, (0.6 * inch), (2.5 * inch), (5.2 * inch), (3.5 * inch), INK_800, radius=10)
text(c, (0.85 * inch), (2.6 * inch), (0.6 * inch), (0.6 * inch),
     "&#8220;", size=40, color=GOLD)
text(c, (1.4 * inch), (2.75 * inch), (4.2 * inch), (2.7 * inch),
     "Hapo awali, wateja walikuwa wananiomba kuwatumia bidhaa kabla ya kulipa. "
     "Mara nyingi nilipotea pesa.<br/><br/>"
     "Tangu nilipoanza Biz-Salama, mteja analipa kwanza — pesa zinashikiliwa, "
     "nikituma na kuthibitishwa, nalipwa kwa M-Pesa mara moja. "
     "Sasa nauza Kanda za Pwani, Arusha, mpaka Mbeya.",
     size=10, color=INK_300, italic=True)
text(c, (1.4 * inch), (5.5 * inch), (4.2 * inch), (0.4 * inch),
     "— Asha M.,  Kariakoo, Dar es Salaam",
     size=9, bold=True, color=GOLD_LIGHT)

# Stats sidebar
stats = [
    ("3 → 40+",  "wateja kwa mwezi  /  buyers per month"),
    ("0%",       "chargebacks tangu kuanza  /  since joining"),
    ("< 24 hr",  "muda wa wastani wa malipo  /  avg payout time"),
    ("4.9 ★",    "rating ya wateja  /  buyer rating"),
]
y = (2.5 * inch)
for big, small in stats:
    rect(c, (6.0 * inch), y, (3.4 * inch), (0.8 * inch), INK_800, radius=12)
    text(c, (6.2 * inch), y, (1.5 * inch), (0.8 * inch),
         big, size=18, bold=True, color=GOLD_LIGHT, anchor="middle")
    text(c, (7.7 * inch), y, (1.7 * inch), (0.8 * inch),
         small, size=7, color=INK_300, anchor="middle")
    y += (0.9 * inch)
footer(c, 10)
c.showPage()


# Slide 11 — Anza sasa / CTA
bg(c)
c.saveState()
c.setFillColorRGB(0.96, 0.62, 0.04, alpha=0.15)
c.circle(PAGE_W, 0, (2.5 * inch), stroke=0, fill=1)
c.restoreState()

pill(c, (0.6 * inch), (0.5 * inch), (1.1 * inch), (0.35 * inch),
     "ANZA SASA / GET STARTED", fill=EMERALD, fg=WHITE, size=8)
text(c, (0.6 * inch), (1.0 * inch), (9 * inch), (1.2 * inch),
     "Anza biashara salama leo", size=44, bold=True, color=WHITE)
text(c, (0.6 * inch), (2.2 * inch), (9 * inch), (0.5 * inch),
     "Start selling safely today — onboarding takes ~10 minutes.",
     size=14, color=GOLD_LIGHT)

steps = [
    ("1", "Tembelea  /  Visit",            "biz-salama.co.tz/register"),
    ("2", "Sajili akaunti  /  Sign up",    "Namba ya simu + nenosiri (10 sec)"),
    ("3", "Pakizia hati  /  Upload docs",  "NIDA, TIN, leseni — picha 5 kwa simu"),
    ("4", "Anza kuuza  /  Start selling",  "Orodhesha bidhaa ya kwanza"),
]
y = (3.2 * inch)
for n, sw_en, body in steps:
    rect(c, (0.6 * inch), y, (6.5 * inch), (0.6 * inch), INK_800, radius=14)
    circle(c, (0.95 * inch), y + (0.3 * inch), (0.18 * inch), GOLD)
    text(c, (0.78 * inch), y + (0.13 * inch), (0.4 * inch), (0.4 * inch),
         n, size=12, bold=True, color=INK_900, align=TA_CENTER)
    text(c, (1.4 * inch), y, (2.4 * inch), (0.6 * inch),
         sw_en, size=11, bold=True, color=WHITE, anchor="middle")
    text(c, (3.85 * inch), y, (3.15 * inch), (0.6 * inch),
         body, size=9, color=GOLD_LIGHT, anchor="middle")
    y += (0.75 * inch)

# CTA card
rect(c, (7.4 * inch), (3.2 * inch), (2.0 * inch), (2.7 * inch), GOLD, radius=14)
text(c, (7.4 * inch), (3.4 * inch), (2.0 * inch), (0.5 * inch),
     "🚀", size=32, align=TA_CENTER)
text(c, (7.4 * inch), (4.0 * inch), (2.0 * inch), (0.5 * inch),
     "ANZA", size=18, bold=True, color=INK_900, align=TA_CENTER)
text(c, (7.4 * inch), (4.4 * inch), (2.0 * inch), (0.3 * inch),
     "START NOW", size=10, bold=True, color=INK_800, align=TA_CENTER)
text(c, (7.4 * inch), (4.9 * inch), (2.0 * inch), (0.6 * inch),
     "biz-salama.co.tz<br/>/onboard/seller",
     size=8, color=INK_900, align=TA_CENTER)

# Contact strip
rect(c, (0.6 * inch), (6.4 * inch), (8.8 * inch), (0.5 * inch), INK_800, radius=12)
text(c, (0.6 * inch), (6.4 * inch), (8.8 * inch), (0.5 * inch),
     "📞  +255 700 123 456    ·    ✉  support@biz-salama.co.tz    ·    🌐  biz-salama.co.tz",
     size=9, color=GOLD_LIGHT, align=TA_CENTER, anchor="middle")
footer(c, 11)
c.showPage()

c.save()

size_kb = OUT_PATH.stat().st_size // 1024
print(f"✅ Pitch deck PDF saved to {OUT_PATH}")
print(f"   Slides: {TOTAL_SLIDES}  ·  Size: {size_kb} KB  ·  Fonts: {FONT} / {FONT_B}")
