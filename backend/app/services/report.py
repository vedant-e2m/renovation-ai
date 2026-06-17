import io
from datetime import date
from typing import Any, Dict

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

# ── Brand palette ────────────────────────────────────────────────────────────
PRIMARY       = colors.HexColor("#1E5F5F")   # deep teal
PRIMARY_LIGHT = colors.HexColor("#2D8080")   # medium teal
ACCENT        = colors.HexColor("#E8F4F4")   # very light teal (row stripe)
ACCENT_MID    = colors.HexColor("#C2DCDC")   # light teal (dividers)
DARK          = colors.HexColor("#1C2B2B")   # near-black for text
MUTED         = colors.HexColor("#5E7878")   # secondary text
WHITE         = colors.white
GOLD          = colors.HexColor("#C8962A")   # highlight / grand total

PAGE_W, PAGE_H = A4
MARGIN = 20 * mm

# ── Page callbacks (header / footer) ─────────────────────────────────────────

def _draw_page(canvas, doc):
    canvas.saveState()

    # ── Top banner ──
    banner_h = 22 * mm
    canvas.setFillColor(PRIMARY)
    canvas.rect(0, PAGE_H - banner_h, PAGE_W, banner_h, fill=1, stroke=0)

    canvas.setFillColor(WHITE)
    canvas.setFont("Helvetica-Bold", 15)
    canvas.drawString(MARGIN, PAGE_H - 14 * mm, "House Renovation Report")

    canvas.setFont("Helvetica", 9)
    canvas.setFillColor(colors.HexColor("#A8CCCC"))
    canvas.drawRightString(PAGE_W - MARGIN, PAGE_H - 14 * mm,
                           f"Generated: {date.today().strftime('%d %b %Y')}")

    # ── Thin accent rule under banner ──
    canvas.setStrokeColor(PRIMARY_LIGHT)
    canvas.setLineWidth(1.5)
    canvas.line(0, PAGE_H - banner_h - 0.5, PAGE_W, PAGE_H - banner_h - 0.5)

    # ── Footer ──
    footer_y = 10 * mm
    canvas.setStrokeColor(ACCENT_MID)
    canvas.setLineWidth(0.5)
    canvas.line(MARGIN, footer_y + 5 * mm, PAGE_W - MARGIN, footer_y + 5 * mm)

    canvas.setFillColor(MUTED)
    canvas.setFont("Helvetica", 8)
    canvas.drawString(MARGIN, footer_y + 1.5 * mm, "Confidential — for client use only")
    canvas.drawRightString(PAGE_W - MARGIN, footer_y + 1.5 * mm,
                           f"Page {doc.page}")

    canvas.restoreState()


# ── Style helpers ─────────────────────────────────────────────────────────────

def _styles():
    base = getSampleStyleSheet()
    return {
        "section": ParagraphStyle(
            "section",
            fontName="Helvetica-Bold",
            fontSize=10,
            textColor=PRIMARY,
            spaceAfter=4,
        ),
        "label": ParagraphStyle(
            "label",
            fontName="Helvetica",
            fontSize=8,
            textColor=MUTED,
        ),
        "value": ParagraphStyle(
            "value",
            fontName="Helvetica-Bold",
            fontSize=9,
            textColor=DARK,
        ),
        "cell": ParagraphStyle(
            "cell",
            fontName="Helvetica",
            fontSize=8,
            textColor=DARK,
            leading=11,
        ),
        "cell_bold": ParagraphStyle(
            "cell_bold",
            fontName="Helvetica-Bold",
            fontSize=8,
            textColor=DARK,
        ),
        "cell_muted": ParagraphStyle(
            "cell_muted",
            fontName="Helvetica",
            fontSize=8,
            textColor=MUTED,
        ),
        "cell_right": ParagraphStyle(
            "cell_right",
            fontName="Helvetica-Bold",
            fontSize=8,
            textColor=DARK,
            alignment=TA_RIGHT,
        ),
        "total_label": ParagraphStyle(
            "total_label",
            fontName="Helvetica-Bold",
            fontSize=9,
            textColor=WHITE,
        ),
        "total_value": ParagraphStyle(
            "total_value",
            fontName="Helvetica-Bold",
            fontSize=9,
            textColor=WHITE,
            alignment=TA_RIGHT,
        ),
        "grand_value": ParagraphStyle(
            "grand_value",
            fontName="Helvetica-Bold",
            fontSize=13,
            textColor=GOLD,
            alignment=TA_RIGHT,
        ),
    }


# ── Summary card table ────────────────────────────────────────────────────────

def _summary_table(summary: dict, st: dict) -> Table:
    mat  = f"${summary.get('total_material_cost', 0):,.2f}"
    lab  = f"${summary.get('total_labor_cost', 0):,.2f}"
    gran = f"${summary.get('grand_total', 0):,.2f}"

    col_w = (PAGE_W - 2 * MARGIN) / 3

    data = [
        [
            Paragraph("MATERIAL COST",  st["label"]),
            Paragraph("LABOUR COST",    st["label"]),
            Paragraph("GRAND TOTAL",    st["label"]),
        ],
        [
            Paragraph(mat,  st["value"]),
            Paragraph(lab,  st["value"]),
            Paragraph(gran, st["grand_value"]),
        ],
    ]

    t = Table(data, colWidths=[col_w] * 3)
    t.setStyle(TableStyle([
        # outer card
        ("BOX",             (0, 0), (-1, -1), 1,   ACCENT_MID),
        ("INNERGRID",       (0, 0), (-1, -1), 0.5, ACCENT_MID),
        # backgrounds
        ("BACKGROUND",      (0, 0), (1, -1),  ACCENT),
        ("BACKGROUND",      (2, 0), (2, -1),  PRIMARY),   # grand total card
        # spacing
        ("TOPPADDING",      (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING",   (0, 0), (-1, -1), 10),
        ("LEFTPADDING",     (0, 0), (-1, -1), 12),
        ("RIGHTPADDING",    (0, 0), (-1, -1), 12),
        # override label color in grand-total column to white
        ("TEXTCOLOR",       (2, 0), (2, 0),   WHITE),
    ]))
    return t


# ── Itemised table ────────────────────────────────────────────────────────────

def _items_table(items: dict, st: dict) -> Table:
    usable_w = PAGE_W - 2 * MARGIN
    col_widths = [
        usable_w * 0.18,   # Component
        usable_w * 0.22,   # Material
        usable_w * 0.09,   # Qty
        usable_w * 0.08,   # Unit
        usable_w * 0.14,   # Mat cost
        usable_w * 0.14,   # Labor cost
        usable_w * 0.15,   # Total
    ]

    header = [
        Paragraph("COMPONENT",     st["cell_bold"]),
        Paragraph("MATERIAL",      st["cell_bold"]),
        Paragraph("QTY",           st["cell_bold"]),
        Paragraph("UNIT",          st["cell_bold"]),
        Paragraph("MAT. COST",     st["cell_bold"]),
        Paragraph("LABOUR COST",   st["cell_bold"]),
        Paragraph("TOTAL",         st["cell_bold"]),
    ]

    rows = [header]
    for idx, (_, item) in enumerate(items.items()):
        is_even = idx % 2 == 0
        rows.append([
            Paragraph(item.get("component_label", ""), st["cell_bold"]),
            Paragraph(item.get("material_name", ""),   st["cell_muted"]),
            Paragraph(f"{item.get('quantity', 0):.2f}", st["cell_muted"]),
            Paragraph(item.get("unit", ""),            st["cell_muted"]),
            Paragraph(f"${item.get('material_cost', 0):,.2f}", st["cell_muted"]),
            Paragraph(f"${item.get('labor_cost', 0):,.2f}",    st["cell_muted"]),
            Paragraph(f"${item.get('total_cost', 0):,.2f}",    st["cell_right"]),
        ])

    t = Table(rows, colWidths=col_widths, repeatRows=1)

    # Base style
    ts = [
        ("FONTNAME",      (0, 0), (-1, 0),  "Helvetica-Bold"),
        ("BACKGROUND",    (0, 0), (-1, 0),  PRIMARY),
        ("TEXTCOLOR",     (0, 0), (-1, 0),  WHITE),
        ("TOPPADDING",    (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ("LEFTPADDING",   (0, 0), (-1, -1), 8),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 8),
        ("LINEBELOW",     (0, 0), (-1, -1), 0.4, ACCENT_MID),
        ("BOX",           (0, 0), (-1, -1), 1,   ACCENT_MID),
        ("ALIGN",         (2, 0), (6, -1),  "RIGHT"),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
    ]

    # Alternating row shading
    for i in range(1, len(rows)):
        bg = ACCENT if i % 2 == 0 else WHITE
        ts.append(("BACKGROUND", (0, i), (-1, i), bg))

    t.setStyle(TableStyle(ts))
    return t


# ── Public entry point ────────────────────────────────────────────────────────

def generate_pdf_report(session_data: Dict[str, Any]) -> bytes:
    buffer = io.BytesIO()

    # Content frame sits below the 22 mm banner and above the 18 mm footer
    frame = Frame(
        MARGIN,
        18 * mm,
        PAGE_W - 2 * MARGIN,
        PAGE_H - 22 * mm - 18 * mm,
        id="main",
        leftPadding=0,
        rightPadding=0,
        topPadding=6 * mm,
        bottomPadding=0,
    )
    tmpl = PageTemplate(id="base", frames=[frame], onPage=_draw_page)
    doc  = BaseDocTemplate(
        buffer,
        pagesize=A4,
        pageTemplates=[tmpl],
        leftMargin=MARGIN,
        rightMargin=MARGIN,
        topMargin=22 * mm,
        bottomMargin=18 * mm,
    )

    st       = _styles()
    estimate = session_data.get("estimate", {})
    summary  = estimate.get("summary", {})
    items    = estimate.get("items", {})
    elements = []

    # ── Cost summary cards ──
    elements.append(Paragraph("Cost Summary", st["section"]))
    elements.append(Spacer(1, 3 * mm))
    elements.append(_summary_table(summary, st))
    elements.append(Spacer(1, 7 * mm))

    # ── Itemised breakdown ──
    elements.append(Paragraph("Itemised Breakdown", st["section"]))
    elements.append(Spacer(1, 3 * mm))
    if items:
        elements.append(_items_table(items, st))
    else:
        elements.append(Paragraph("No line items found.", st["cell"]))

    doc.build(elements)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
