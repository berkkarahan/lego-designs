"""Render an editable LEGO guide source into a PDF and matching SVG diagrams."""
from __future__ import annotations
import argparse
from collections import Counter
from html import escape
import json
import math
from pathlib import Path
import re
import uuid

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, LongTable, TableStyle, Flowable

WIDTH, HEIGHT = 480, 280
ACCENT = "#167c80"
INK = "#183447"
MUTED = "#647580"


def load(file):
    return json.loads(Path(file).read_text(encoding="utf-8"))


def text(value, label):
    if not isinstance(value, str) or not value.strip():
        raise ValueError(label + " must be nonempty text")
    return value


def count(value):
    if type(value) is not int or value <= 0:
        raise ValueError("Part quantities must be positive integers")
    return value


def number(value):
    if type(value) not in (int, float) or not math.isfinite(value):
        raise ValueError("Diagram coordinates must be finite numbers")
    return value


def color(value):
    if not isinstance(value, str) or not re.fullmatch(r"#[0-9a-fA-F]{6}", value):
        raise ValueError("Diagram colors must be #RRGGBB")
    return value


def within(x, y, w, h, width, height):
    if min(x, y, w, h) < 0 or x + w > width or y + h > height:
        raise ValueError("Diagram primitive extends outside its canvas")


def validate_diagram(diagram, font="Helvetica"):
    width, height = number(diagram["width"]), number(diagram["height"])
    if not 0 < width <= WIDTH or not 0 < height <= HEIGHT:
        raise ValueError("Diagram must fit within 480 x 280 points")
    if not isinstance(diagram.get("primitives"), list) or not diagram["primitives"]:
        raise ValueError("Diagram needs primitives")
    for p in diagram["primitives"]:
        kind = p["type"]
        for key in ("fill", "stroke"):
            if key in p:
                color(p[key])
        if kind == "rect":
            within(*[number(p[k]) for k in ("x", "y", "width", "height")], width, height)
        elif kind == "circle":
            cx, cy, r = [number(p[k]) for k in ("cx", "cy", "r")]
            within(cx-r, cy-r, 2*r, 2*r, width, height)
        elif kind == "line":
            x1, y1, x2, y2 = [number(p[k]) for k in ("x1", "y1", "x2", "y2")]
            within(min(x1, x2), min(y1, y2), abs(x2-x1), abs(y2-y1), width, height)
            if not 0 < number(p.get("width", 1)) <= 12:
                raise ValueError("Invalid line width")
            if p.get("arrow"):
                if (x1, y1) == (x2, y2):
                    raise ValueError("Arrow cannot have zero length")
                for x, y in arrow_points(p):
                    within(x, y, 0, 0, width, height)
        elif kind == "text":
            label = text(p["text"], "Diagram label")
            x, y, size = number(p["x"]), number(p["y"]), number(p.get("size", 10))
            if not 5 <= size <= 24:
                raise ValueError("Diagram label size must be 5..24")
            within(x, y-size, pdfmetrics.stringWidth(label, font, size), size*1.3, width, height)
        else:
            raise ValueError("Unsupported diagram primitive: " + str(kind))
    return diagram


def arrow_points(p):
    x1, y1, x2, y2 = [p[k] for k in ("x1", "y1", "x2", "y2")]
    angle = math.atan2(y2-y1, x2-x1)
    return [(x2, y2),
            (x2-7*math.cos(angle)+3*math.sin(angle), y2-7*math.sin(angle)-3*math.cos(angle)),
            (x2-7*math.cos(angle)-3*math.sin(angle), y2-7*math.sin(angle)+3*math.cos(angle))]


def diagram_svg(diagram):
    width, height = diagram["width"], diagram["height"]
    lines = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">']
    for p in diagram["primitives"]:
        kind = p["type"]
        fill, stroke = p.get("fill", "#ffffff"), p.get("stroke", INK)
        if kind == "rect":
            lines.append(f'<rect x="{p["x"]}" y="{p["y"]}" width="{p["width"]}" height="{p["height"]}" fill="{fill}" stroke="{stroke}"/>')
        elif kind == "circle":
            lines.append(f'<circle cx="{p["cx"]}" cy="{p["cy"]}" r="{p["r"]}" fill="{fill}" stroke="{stroke}"/>')
        elif kind == "line":
            lines.append(f'<line x1="{p["x1"]}" y1="{p["y1"]}" x2="{p["x2"]}" y2="{p["y2"]}" stroke="{stroke}" stroke-width="{p.get("width", 1)}"/>')
            if p.get("arrow"):
                points = " ".join(f"{x},{y}" for x, y in arrow_points(p))
                lines.append(f'<polygon points="{points}" fill="{stroke}"/>')
        else:
            lines.append(f'<text x="{p["x"]}" y="{p["y"]}" font-family="sans-serif" font-size="{p.get("size", 10)}" fill="{p.get("fill", INK)}">{escape(p["text"])}</text>')
    return "\n".join(lines + ["</svg>", ""])


class Diagram(Flowable):
    def __init__(self, diagram, font):
        super().__init__()
        self.diagram, self.font = diagram, font
        self.width, self.height = diagram["width"], diagram["height"]

    def draw(self):
        c = self.canv
        h = self.height
        for p in self.diagram["primitives"]:
            c.setStrokeColor(colors.HexColor(p.get("stroke", INK)))
            c.setFillColor(colors.HexColor(p.get("fill", "#ffffff")))
            c.setLineWidth(p.get("width", 1) if p["type"] == "line" else 1)
            kind = p["type"]
            if kind == "rect":
                c.rect(p["x"], h-p["y"]-p["height"], p["width"], p["height"], fill=1)
            elif kind == "circle":
                c.circle(p["cx"], h-p["cy"], p["r"], fill=1)
            elif kind == "line":
                c.line(p["x1"], h-p["y1"], p["x2"], h-p["y2"])
                if p.get("arrow"):
                    pts = arrow_points(p)
                    shape = c.beginPath()
                    shape.moveTo(pts[0][0], h-pts[0][1])
                    for x, y in pts[1:]:
                        shape.lineTo(x, h-y)
                    shape.close()
                    c.setFillColor(colors.HexColor(p.get("stroke", INK)))
                    c.drawPath(shape, fill=1, stroke=0)
            else:
                c.setFont(self.font, p.get("size", 10))
                c.setFillColor(colors.HexColor(p.get("fill", INK)))
                c.drawString(p["x"], h-p["y"], p["text"])


def fonts(regular=None, bold=None):
    if bool(regular) != bool(bold):
        raise ValueError("Supply both --font and --bold-font")
    if regular:
        pdfmetrics.registerFont(TTFont("Guide", str(regular)))
        pdfmetrics.registerFont(TTFont("Guide-Bold", str(bold)))
        pdfmetrics.registerFontFamily("Guide", normal="Guide", bold="Guide-Bold",
                                      italic="Guide", boldItalic="Guide-Bold")
        return "Guide", "Guide-Bold"
    return "Helvetica", "Helvetica-Bold"


def validate_text_coverage(values, font):
    font_obj = pdfmetrics.getFont(font)
    for value in values:
        for ch in value:
            if ch in "\n\r\t":
                continue
            if font.startswith("Helvetica"):
                if ord(ch) > 127:
                    raise ValueError("Non-ASCII text requires --font and --bold-font covering all characters")
            elif ord(ch) not in font_obj.face.charToGlyph:
                raise ValueError("Font does not cover character " + repr(ch))


def prepare(folder, font):
    folder = Path(folder).resolve()
    guide, parts = load(folder / "guide.json"), load(folder / "parts.json")
    if parts.get("schema_version") != 1 or not parts.get("requirements"):
        raise ValueError("parts.json requires schema_version 1 and requirements")
    required, labels = Counter(), {}
    for row in parts["requirements"]:
        code = text(row["code"], "Part code")
        if code in labels:
            raise ValueError("Duplicate part code: " + code)
        labels[code] = text(row["description"], "Part description")
        required[code] = count(row["quantity"])
    for key in ("title", "status", "introduction"):
        text(guide.get(key), key)
    if not isinstance(guide.get("verification_notes"), list) or not guide["verification_notes"]:
        raise ValueError("guide.json needs verification_notes")
    for note in guide["verification_notes"]:
        text(note, "Verification note")
    if not isinstance(guide.get("steps"), list) or not guide["steps"]:
        raise ValueError("guide.json needs assembly steps")
    added, diagrams, all_text = Counter(), {}, list(labels.values())
    all_text += [guide["title"], guide.get("subtitle", ""), guide["status"], guide["introduction"]]
    all_text += guide["verification_notes"] + list(labels)
    for step in guide["steps"]:
        for key in ("title", "instruction", "check"):
            all_text.append(text(step.get(key), "Step " + key))
        if not isinstance(step.get("parts"), list):
            raise ValueError("Step needs parts array (empty for adjustment-only steps)")
        for row in step["parts"]:
            if row["code"] not in required:
                raise ValueError("Unknown step part code: " + row["code"])
            added[row["code"]] += count(row["quantity"])
        relative = Path(text(step.get("diagram"), "Step diagram"))
        target = (folder / relative).resolve()
        if relative.is_absolute() or not target.is_relative_to(folder) or target.suffix != ".json":
            raise ValueError("Step diagrams must be JSON files inside the design folder")
        diagram = validate_diagram(load(target), font)
        diagrams[relative.as_posix()] = diagram
        all_text += [p["text"] for p in diagram["primitives"] if p["type"] == "text"]
    if added != required:
        raise ValueError("Assembly additions must exactly match required parts: " +
                         json.dumps({"required": dict(required), "added": dict(added)}))
    validate_text_coverage(all_text, font)
    return guide, parts, diagrams


def render(folder, regular=None, bold=None):
    folder = Path(folder).resolve()
    normal, heavy = fonts(regular, bold)
    guide, parts, diagrams = prepare(folder, normal)
    validate_text_coverage([guide["title"]] + [s["title"] for s in guide["steps"]], heavy)
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle("GuideBody", fontName=normal, fontSize=10, leading=15, textColor=colors.HexColor(INK), spaceAfter=8))
    styles.add(ParagraphStyle("GuideTitle", fontName=heavy, fontSize=25, leading=31, textColor=colors.HexColor(INK), spaceAfter=16))
    styles.add(ParagraphStyle("GuideHeading", fontName=heavy, fontSize=16, leading=22, textColor=colors.HexColor(ACCENT), spaceAfter=12))
    styles.add(ParagraphStyle("GuideSmall", fontName=normal, fontSize=8, leading=12, textColor=colors.HexColor(MUTED), spaceAfter=6))
    body, small = styles["GuideBody"], styles["GuideSmall"]
    def p(value, style=body):
        return Paragraph(escape(str(value)).replace("\n", "<br/>"), style)
    story = [p(guide["title"], styles["GuideTitle"])]
    if guide.get("subtitle"):
        story.append(p(guide["subtitle"]))
    story += [p("Status: " + guide["status"], styles["GuideHeading"]), p(guide["introduction"]),
              Spacer(1, 10), p("Before building", styles["GuideHeading"])]
    story += [p(note) for note in guide["verification_notes"]]
    story += [Spacer(1, 12), p("Parts to prepare", styles["GuideHeading"])]
    rows = [[p("Code", small), p("Part", small), p("Count", small)]]
    for row in parts["requirements"]:
        rows.append([p(row["code"], small), p(row["description"], small), p(row["quantity"], small)])
    table = LongTable(rows, colWidths=[55, 370, 55], repeatRows=1, hAlign="LEFT")
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e4f1f2")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f4f7f9")]),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(table)
    for index, step in enumerate(guide["steps"], 1):
        addition = ", ".join(row["code"] + " x" + str(row["quantity"]) for row in step["parts"]) or "No new parts"
        story += [PageBreak(), p(f'{index:02d}  {step["title"]}', styles["GuideHeading"]),
                  p("Add: " + addition, small), Spacer(1, 8),
                  Diagram(diagrams[Path(step["diagram"]).as_posix()], normal), Spacer(1, 14),
                  p(step["instruction"]), Spacer(1, 8),
                  p("Check", styles["GuideHeading"]), p(step["check"])]
    def footer(canvas, doc):
        canvas.saveState()
        canvas.setStrokeColor(colors.HexColor("#cdd9df"))
        canvas.line(42, 37, A4[0]-42, 37)
        canvas.setFont(normal, 8)
        canvas.setFillColor(colors.HexColor(MUTED))
        canvas.drawString(42, 24, "Assembly guide - see verification notes")
        canvas.drawRightString(A4[0]-42, 24, str(doc.page))
        canvas.restoreState()
    output = folder / "build-guide.pdf"
    temp_pdf = folder / (".guide-" + uuid.uuid4().hex + ".tmp.pdf")
    try:
        doc = SimpleDocTemplate(str(temp_pdf), pagesize=A4, rightMargin=54, leftMargin=54,
                                topMargin=42, bottomMargin=52, title=guide["title"], author="LEGO Designs")
        doc.build(story, onFirstPage=footer, onLaterPages=footer)
        for relative, diagram in diagrams.items():
            (folder / relative).with_suffix(".svg").write_text(diagram_svg(diagram), encoding="utf-8")
        temp_pdf.replace(output)
    finally:
        temp_pdf.unlink(missing_ok=True)
    return output


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("design_folder", type=Path)
    parser.add_argument("--font", type=Path)
    parser.add_argument("--bold-font", type=Path)
    parser.add_argument("--validate-only", action="store_true")
    args = parser.parse_args()
    try:
        if args.validate_only:
            normal, _ = fonts(args.font, args.bold_font)
            prepare(args.design_folder, normal)
            print("Guide source valid")
        else:
            print(render(args.design_folder, args.font, args.bold_font))
    except (ValueError, KeyError, TypeError, OSError) as exc:
        parser.exit(2, "Guide error: " + str(exc) + "\n")


if __name__ == "__main__":
    main()
