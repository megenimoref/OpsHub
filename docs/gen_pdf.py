#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Generate multi-district CRM plan PDF in Hebrew (RTL) using fpdf2."""

from fpdf import FPDF
from bidi.algorithm import get_display
import os

FONT_PATH = "/Library/Fonts/Arial Unicode.ttf"
OUTPUT = "/Users/sh.azulay/crm/OpsHub/docs/multi_district_plan.pdf"

# Colors
DARK_BLUE = (30, 58, 95)
MID_BLUE = (41, 98, 162)
LIGHT_BLUE = (210, 230, 250)
GOLD = (198, 160, 60)
WHITE = (255, 255, 255)
LIGHT_GRAY = (245, 247, 250)
DARK_GRAY = (60, 60, 60)
GREEN = (34, 139, 34)
ORANGE = (200, 100, 20)


def h(text):
    """Apply bidi algorithm to render Hebrew text correctly (RTL)."""
    return get_display(text)


def rtl(text):
    """Legacy alias — kept for compatibility."""
    return h(text)


class CRMPlan(FPDF):
    def __init__(self):
        super().__init__(orientation="P", unit="mm", format="A4")
        self.set_auto_page_break(auto=True, margin=20)
        self.add_font("Hebrew", "", FONT_PATH)
        self.add_font("Hebrew", "B", FONT_PATH)
        self.RTL = True

    # ------------------------------------------------------------------ helpers
    def set_hebrew(self, size=11, bold=False):
        style = "B" if bold else ""
        self.set_font("Hebrew", style, size)

    def section_header(self, title, page_width=None):
        pw = page_width or self.w - 2 * self.l_margin
        self.set_fill_color(*DARK_BLUE)
        self.set_text_color(*WHITE)
        self.set_hebrew(14, bold=True)
        self.cell(pw, 10, h(title), border=0, ln=1, align="R", fill=True)
        self.ln(3)
        self.set_text_color(*DARK_GRAY)

    def divider(self):
        self.set_draw_color(*MID_BLUE)
        self.set_line_width(0.4)
        self.line(self.l_margin, self.get_y(), self.w - self.r_margin, self.get_y())
        self.ln(4)

    def body_text(self, text, size=11):
        self.set_hebrew(size)
        self.set_text_color(*DARK_GRAY)
        self.multi_cell(0, 7, h(text), align="R")
        self.ln(2)

    def bullet(self, text, size=10):
        self.set_hebrew(size)
        self.set_text_color(*DARK_GRAY)
        x = self.get_x()
        y = self.get_y()
        # Bullet circle on right
        self.set_fill_color(*MID_BLUE)
        self.ellipse(self.w - self.r_margin - 3, y + 2, 2, 2, style="F")
        self.set_xy(x, y)
        self.cell(self.w - self.l_margin - self.r_margin - 7, 7, h(text), align="R")
        self.ln(0)

    def colored_box(self, x, y, w, bh, text, fill_color, text_color=WHITE, font_size=10, bold=True):
        self.set_fill_color(*fill_color)
        self.set_draw_color(*DARK_BLUE)
        self.set_line_width(0.5)
        self.rect(x, y, w, bh, style="FD")
        self.set_text_color(*text_color)
        self.set_hebrew(font_size, bold=bold)
        self.set_xy(x, y + (bh - font_size * 0.35) / 2)
        self.cell(w, font_size * 0.35 + 2, h(text), align="C")

    def arrow_down(self, x, y, length=10):
        self.set_draw_color(*MID_BLUE)
        self.set_line_width(0.8)
        self.line(x, y, x, y + length)
        # arrowhead
        self.line(x, y + length, x - 2, y + length - 3)
        self.line(x, y + length, x + 2, y + length - 3)

    def arrow_right(self, x, y, length=10):
        self.set_draw_color(*MID_BLUE)
        self.set_line_width(0.8)
        self.line(x, y, x + length, y)
        self.line(x + length, y, x + length - 3, y - 2)
        self.line(x + length, y, x + length - 3, y + 2)

    # ================================================================== pages
    def cover_page(self):
        self.add_page()
        pw = self.w
        ph = self.h

        # Background gradient simulation – dark blue top band
        self.set_fill_color(*DARK_BLUE)
        self.rect(0, 0, pw, ph * 0.55, style="F")

        # Gold accent stripe
        self.set_fill_color(*GOLD)
        self.rect(0, ph * 0.55, pw, 3, style="F")

        # Light bottom
        self.set_fill_color(*LIGHT_GRAY)
        self.rect(0, ph * 0.55 + 3, pw, ph * 0.45, style="F")

        # Shield / logo placeholder
        self.set_fill_color(*MID_BLUE)
        self.set_draw_color(*GOLD)
        self.set_line_width(1.5)
        cx, cy, r = pw / 2, 45, 22
        self.ellipse(cx - r, cy - r, r * 2, r * 2, style="FD")
        self.set_text_color(*WHITE)
        self.set_hebrew(22, bold=True)
        self.set_xy(cx - r, cy - 7)
        self.cell(r * 2, 14, "CRM", align="C")

        # Main title
        self.set_text_color(*WHITE)
        self.set_hebrew(20, bold=True)
        self.set_xy(10, 85)
        self.cell(pw - 20, 14, h("תכנית עסקית וטכנולוגית"), align="C")
        self.set_xy(10, 100)
        self.set_hebrew(16)
        self.cell(pw - 20, 12, h("מערכת CRM רב-מחוזית"), align="C")

        # Subtitle
        self.set_xy(10, 120)
        self.set_hebrew(26, bold=True)
        self.set_text_color(*GOLD)
        self.cell(pw - 20, 18, h("מגינים על העורף"), align="C")

        # Meta info box
        self.set_fill_color(*WHITE)
        self.set_draw_color(*MID_BLUE)
        self.set_line_width(0.5)
        self.rect(pw / 2 - 50, ph * 0.65, 100, 40, style="FD")
        self.set_text_color(*DARK_BLUE)
        self.set_hebrew(10, bold=True)
        self.set_xy(pw / 2 - 50, ph * 0.65 + 5)
        self.cell(100, 8, h("מסמך אסטרטגי — סודי"), align="C")
        self.set_hebrew(10)
        self.set_xy(pw / 2 - 50, ph * 0.65 + 14)
        self.cell(100, 8, h("גרסה 1.0  |  מאי 2026"), align="C")
        self.set_xy(pw / 2 - 50, ph * 0.65 + 23)
        self.cell(100, 8, h("צוות פיתוח CRM — מפקדת ה-HAGA"), align="C")

        # Footer
        self.set_text_color(*DARK_GRAY)
        self.set_hebrew(8)
        self.set_xy(10, ph - 20)
        self.cell(pw - 20, 8, h("סודי — לשימוש פנימי בלבד"), align="C")

    def exec_summary(self):
        self.add_page()
        self.section_header("סיכום מנהלים")
        self.body_text(
            "מסמך זה מציג את התכנית המלאה לפריסה של מערכת CRM רב-מחוזית עבור ארגון ה-HAGA. "
            "המערכת הקיימת משרתת מחוז בודד. הרחבתה לפעילות רב-מחוזית מאפשרת ניהול מרכזי, "
            "בידוד נתונים בין מחוזות, וגמישות תפעולית מלאה."
        )
        self.divider()

        self.section_header("הצורך העסקי")
        items = [
            "ניהול אחיד של כלל הלוחמים בחזית העורף — פריסה גאוגרפית רחבה",
            "בידוד מלא בין מחוזות: כל מחוז רואה אך ורק את הנתונים שלו",
            "ממשק על-מחוזי לדרג הפיקוד — מבט כולל ללא חדירה לנתוני מחוז",
            "שדות מותאמים אישית לכל מחוז — גמישות ללא פיתוח נוסף",
            "שדרוג עצמאי לכל מחוז ללא השפעה על מחוזות אחרים",
            "עלות תפעול נמוכה — Docker Compose לכל מחוז, ללא תשתית ענן יקרה",
        ]
        for item in items:
            self.bullet(item)
        self.ln(4)

        self.divider()
        self.section_header("יתרונות מרכזיים")
        self.body_text(
            "• בידוד נתונים מלא — אפס דליפת מידע בין מחוזות.\n"
            "• הרשאות מדורגות — SUPER_ADMIN, DISTRICT_ADMIN, DISTRICT_USER.\n"
            "• פריסה מהירה — מחוז חדש פועל תוך שעות.\n"
            "• סטטיסטיקות מותאמות — כל מחוז בונה דוחות לפי שדות ייחודיים.\n"
            "• גיבוי ושחזור עצמאיים — כל מחוז מנהל את ה-DB שלו."
        )

    def current_vs_future(self):
        self.add_page()
        self.section_header("מצב קיים לעומת מצב עתידי")

        pw = self.w - self.l_margin - self.r_margin
        col = pw / 2 - 3

        # Headers
        y0 = self.get_y()
        self.set_fill_color(*DARK_BLUE)
        self.set_text_color(*WHITE)
        self.set_hebrew(12, bold=True)
        self.set_xy(self.l_margin, y0)
        self.cell(col, 10, h("מצב עתידי"), align="C", fill=True)
        self.cell(6, 10, "", fill=False)
        self.cell(col, 10, h("מצב קיים"), align="C", fill=True)
        self.ln(10)

        rows = [
            ("רב-מחוזי — אינסוף מחוזות", "מחוז אחד בלבד"),
            ("כל מחוז — Docker stack עצמאי", "שרת מונוליתי אחד"),
            ("DB מבודד לכל מחוז", "מסד נתונים משותף"),
            ("ממשק Super Admin גלובלי", "אדמין אחד ללא הפרדה"),
            ("שדות מותאמים אישית per מחוז", "שדות אחידים לכולם"),
            ("שדרוג Blue/Green עצמאי", "Downtime בכל שדרוג"),
            ("JWT עם district_id claim", "אין הפרדת הרשאות מחוז"),
            ("Gateway מרכזי לניתוב", "אין ניתוב מרכזי"),
        ]

        fill = False
        for future, current in rows:
            bg = LIGHT_BLUE if fill else WHITE
            self.set_fill_color(*bg)
            self.set_text_color(*DARK_GRAY)
            self.set_hebrew(10)
            y = self.get_y()
            self.set_xy(self.l_margin, y)
            self.cell(col, 8, h(future), align="R", fill=True, border=1)
            self.set_fill_color(*LIGHT_GRAY if fill else (238, 238, 238))
            self.cell(6, 8, "", border=1, fill=True)
            self.set_fill_color(*bg)
            self.cell(col, 8, h(current), align="R", fill=True, border=1)
            self.ln(8)
            fill = not fill

        self.ln(5)
        self.divider()
        self.section_header("פערים עיקריים לסגירה")
        gaps = [
            "הוספת שכבת ה-Gateway לניתוב בין מחוזות לפי subdomain/path",
            "הטמעת שירות Auth מרכזי עם תמיכה ב-role חדש: SUPER_ADMIN",
            "שינוי מבנה ה-JWT להכלת district_id",
            "מיגרציה של מסד הנתונים הנוכחי לתבנית מחוז מבודד",
            "פיתוח ממשק ניהול שדות דינמיים לאדמין המחוז",
            "בניית מנוע סטטיסטיקות גמיש per מחוז",
        ]
        for g in gaps:
            self.bullet(g)

    def architecture_diagram(self):
        self.add_page()
        self.section_header("דיאגרמת ארכיטקטורה — מבט גבוה")

        start_y = self.get_y() + 5
        pw = self.w - self.l_margin - self.r_margin
        lm = self.l_margin

        # ---- Super Admin box (top)
        sa_w, sa_h = 80, 18
        sa_x = lm + pw / 2 - sa_w / 2
        sa_y = start_y
        self.colored_box(sa_x, sa_y, sa_w, sa_h,
                         "פורטל עליון — Super Admin", DARK_BLUE, WHITE, 10, bold=True)

        # Sub label
        self.set_text_color(*MID_BLUE)
        self.set_hebrew(8)
        self.set_xy(sa_x, sa_y + sa_h + 1)
        self.cell(sa_w, 5, h("רואה את כל המחוזות"), align="C")

        # Arrow from SA down
        arrow_y_start = sa_y + sa_h + 6
        # Three arrows to three districts
        dist_centers = [lm + 25, lm + pw / 2, lm + pw - 25]

        for cx in dist_centers:
            # Draw angled line from SA center to district
            sa_cx = sa_x + sa_w / 2
            self.set_draw_color(*GOLD)
            self.set_line_width(0.8)
            self.line(sa_cx, arrow_y_start, cx, arrow_y_start + 18)
            # arrowhead
            self.line(cx, arrow_y_start + 18, cx - 2, arrow_y_start + 13)
            self.line(cx, arrow_y_start + 18, cx + 2, arrow_y_start + 13)

        # ---- Gateway bar
        gw_y = arrow_y_start + 6
        self.set_fill_color(*(90, 130, 180))
        self.set_draw_color(*DARK_BLUE)
        self.rect(lm, gw_y, pw, 8, style="FD")
        self.set_text_color(*WHITE)
        self.set_hebrew(9, bold=True)
        self.set_xy(lm, gw_y + 1)
        self.cell(pw, 6, h("Gateway Service  |  ניתוב לפי subdomain / path"), align="C")

        # ---- District boxes (middle layer)
        dist_y = gw_y + 14
        dist_w = 50
        dist_h = 20
        labels = [h("מחוז C"), h("מחוז B"), h("מחוז A")]
        dist_colors = [(41, 98, 162), (60, 120, 50), (140, 60, 20)]
        dist_xs = [lm + 5, lm + pw / 2 - dist_w / 2, lm + pw - dist_w - 5]

        for i, (dx, label, color) in enumerate(zip(dist_xs, labels, dist_colors)):
            # Arrow from gateway to district
            self.set_draw_color(*MID_BLUE)
            self.set_line_width(0.6)
            gw_cx = dist_centers[i]
            self.line(gw_cx, gw_y + 8, gw_cx, dist_y)
            self.line(gw_cx, dist_y, gw_cx - 2, dist_y - 3)
            self.line(gw_cx, dist_y, gw_cx + 2, dist_y - 3)

            self.colored_box(dx, dist_y, dist_w, dist_h, label, color, WHITE, 11, bold=True)
            # Admin label
            self.set_text_color(*(80, 80, 80))
            self.set_hebrew(8)
            self.set_xy(dx, dist_y + dist_h + 1)
            self.cell(dist_w, 4, "District Admin", align="C")

        # ---- No cross-district arrows note
        x_y = dist_y + dist_h / 2
        self.set_draw_color(*(200, 50, 50))
        self.set_line_width(0.5)
        # Crossed line between district B and C
        self.line(dist_xs[0] + dist_w, x_y, dist_xs[1], x_y)
        self.set_text_color(*(200, 50, 50))
        self.set_hebrew(8)
        mid_x = (dist_xs[0] + dist_w + dist_xs[1]) / 2
        self.set_xy(mid_x - 10, x_y - 4)
        self.cell(20, 4, h("✗ אין גישה"), align="C")

        self.line(dist_xs[1] + dist_w, x_y, dist_xs[2], x_y)
        mid_x2 = (dist_xs[1] + dist_w + dist_xs[2]) / 2
        self.set_xy(mid_x2 - 10, x_y - 4)
        self.cell(20, 4, h("✗ אין גישה"), align="C")

        # ---- Docker stacks (bottom layer)
        docker_y = dist_y + dist_h + 12
        self.set_draw_color(*DARK_BLUE)
        self.set_line_width(0.3)

        for i, dx in enumerate(dist_xs):
            # Docker container outline
            self.set_fill_color(*LIGHT_GRAY)
            self.rect(dx - 2, docker_y, dist_w + 4, 42, style="FD")
            # Docker label
            self.set_fill_color(*(0, 120, 212))
            self.rect(dx - 2, docker_y, dist_w + 4, 7, style="F")
            self.set_text_color(*WHITE)
            self.set_hebrew(8, bold=True)
            self.set_xy(dx - 2, docker_y + 1)
            self.cell(dist_w + 4, 5, "Docker Stack", align="C")

            # Inner containers
            sub_labels = ["nginx", "API / Node", "MariaDB"]
            sub_colors = [(200, 220, 200), (200, 210, 230), (230, 210, 195)]
            for j, (sl, sc) in enumerate(zip(sub_labels, sub_colors)):
                sy = docker_y + 9 + j * 10
                self.set_fill_color(*sc)
                self.set_draw_color(*(150, 150, 150))
                self.rect(dx + 2, sy, dist_w - 4, 8, style="FD")
                self.set_text_color(*DARK_GRAY)
                self.set_hebrew(8)
                self.set_xy(dx + 2, sy + 1)
                self.cell(dist_w - 4, 6, sl, align="C")

            # Arrow from district box to docker stack
            dcx = dx + dist_w / 2
            self.set_draw_color(*MID_BLUE)
            self.set_line_width(0.5)
            self.line(dcx, dist_y + dist_h + 7, dcx, docker_y)
            self.line(dcx, docker_y, dcx - 2, docker_y - 3)
            self.line(dcx, docker_y, dcx + 2, docker_y - 3)

        # Legend
        legend_y = docker_y + 46
        self.set_text_color(*DARK_GRAY)
        self.set_hebrew(8)
        self.set_xy(lm, legend_y)
        self.cell(pw, 5, h("→ חצים בצהוב: Super Admin לכל המחוזות   |   ✗ אדום: אין גישה בין מחוזות   |   חצים כחולים: Gateway → מחוז"), align="C")

    def technical_architecture(self):
        self.add_page()
        self.section_header("ארכיטקטורה טכנית מפורטת")

        self.body_text(
            "כל מחוז הוא Docker Compose stack עצמאי הכולל שלושה שירותים: "
            "nginx (Reverse Proxy), שירות ה-API (Node.js / Express), ומסד הנתונים (MariaDB). "
            "שרת Gateway מרכזי מנתב בקשות לפי Subdomain או Path."
        )
        self.divider()

        self.section_header("רכיבי המערכת")

        components = [
            ("Gateway Service", "Nginx / Traefik מרכזי. מנתב district-a.crm.il → stack של מחוז א. "
             "מזהה subdomain/path ומגדיר X-District-ID header."),
            ("Auth Service", "שירות JWT מרכזי. מנפיק טוקן עם שדות: user_id, role, district_id. "
             "SUPER_ADMIN מקבל district_id=* לגישה לכל המחוזות."),
            ("District API", "Express.js עם Middleware שמוודא district_id מה-JWT מול ה-URL. "
             "כל endpoint מוגן ומחזיר 403 לגישה בין-מחוזית."),
            ("District DB", "MariaDB עצמאי לכל מחוז. Schema זהה אך בסיס נתונים נפרד לחלוטין. "
             "גיבוי, שחזור ו-migration עצמאיים."),
            ("Super Admin Portal", "React SPA עם אגרגציה של נתוני כל המחוזות. "
             "קריאות ל-API עם טוקן SUPER_ADMIN בלבד."),
            ("Custom Fields Engine", "טבלת district_custom_fields. Admin מחוז מגדיר שדות דינמיים. "
             "ה-API מחזיר schema דינמי ל-Frontend."),
        ]

        for name, desc in components:
            self.set_fill_color(*LIGHT_BLUE)
            self.set_draw_color(*MID_BLUE)
            self.set_text_color(*DARK_BLUE)
            self.set_hebrew(11, bold=True)
            y = self.get_y()
            self.rect(self.l_margin, y, self.w - self.l_margin - self.r_margin, 7, style="FD")
            self.set_xy(self.l_margin, y + 0.5)
            self.cell(self.w - self.l_margin - self.r_margin, 6, h(name), align="R")
            self.ln(8)
            self.set_text_color(*DARK_GRAY)
            self.set_hebrew(10)
            self.multi_cell(0, 6, h(desc), align="R")
            self.ln(2)

        self.divider()
        self.section_header("מבנה JWT Token")
        self.set_fill_color(*(30, 30, 30))
        self.set_text_color(*WHITE)
        y = self.get_y()
        pw = self.w - self.l_margin - self.r_margin
        self.rect(self.l_margin, y, pw, 30, style="F")
        self.set_hebrew(9)
        self.set_xy(self.l_margin + 3, y + 3)
        lines = [
            '{ "user_id": 42,',
            '  "role": "DISTRICT_ADMIN",',
            '  "district_id": "district-b",',
            '  "exp": 1748000000 }',
        ]
        for line in lines:
            self.set_xy(self.l_margin + 3, self.get_y())
            self.cell(pw - 6, 6, line)
            self.ln(6)

    def permissions_table(self):
        self.add_page()
        self.section_header("טבלת הרשאות")

        pw = self.w - self.l_margin - self.r_margin

        headers = [h("תיאור פעולות מורשות"), h("גישה גאוגרפית"), h("רמת הרשאה")]
        col_w = [pw * 0.55, pw * 0.25, pw * 0.20]

        # Header row
        self.set_fill_color(*DARK_BLUE)
        self.set_text_color(*WHITE)
        self.set_hebrew(10, bold=True)
        x = self.l_margin
        for i, (hdr, w) in enumerate(zip(headers, col_w)):
            self.set_xy(x, self.get_y())
            self.cell(w, 10, hdr, border=1, align="C", fill=True)
            x += w
        self.ln(10)

        rows = [
            ("SUPER_ADMIN",
             "כל המחוזות",
             "צפייה וייצוא נתוני כל מחוז, סטטיסטיקות גלובליות, ניהול אדמינים"),
            ("DISTRICT_ADMIN",
             "מחוז אחד בלבד",
             "עריכת שדות מותאמים, ניהול משתמשי מחוז, סטטיסטיקות מחוז, עריכת חיילים"),
            ("DISTRICT_USER",
             "מחוז אחד בלבד",
             "קריאה וכתיבה של נתוני חיילים לפי הגדרת האדמין, ללא גישה לניהול"),
        ]

        fill = False
        role_colors = [DARK_BLUE, (60, 120, 50), (140, 60, 20)]
        for i, (role, geo, actions) in enumerate(rows):
            bg = LIGHT_BLUE if fill else WHITE
            y = self.get_y()
            # Role cell (colored)
            self.set_fill_color(*role_colors[i])
            self.set_text_color(*WHITE)
            self.set_hebrew(9, bold=True)
            self.set_xy(self.l_margin, y)
            self.cell(col_w[2], 14, role, border=1, align="C", fill=True)

            # Geo cell
            self.set_fill_color(*bg)
            self.set_text_color(*DARK_GRAY)
            self.set_hebrew(9)
            self.cell(col_w[1], 14, h(geo), border=1, align="C", fill=True)

            # Actions cell
            self.set_fill_color(*bg)
            x_before = self.get_x()
            y_before = self.get_y()
            self.multi_cell(col_w[0], 7, h(actions), border=1, align="R", fill=True)
            # Ensure we're past the row height
            if self.get_y() < y_before + 14:
                self.set_y(y_before + 14)
            fill = not fill

        self.ln(8)
        self.divider()
        self.section_header("תרשים הרשאות")
        self.body_text(
            "SUPER_ADMIN\n"
            "    ↓ (גישה מלאה לכל המחוזות)\n"
            "DISTRICT_ADMIN [מחוז X]\n"
            "    ↓ (גישה למחוז X בלבד)\n"
            "DISTRICT_USER [מחוז X]\n"
            "    ↓ (קריאה/כתיבה לפי הגדרה)\n"
            "נתוני החיילים של מחוז X"
        )

    def custom_fields_page(self):
        self.add_page()
        self.section_header("שדות מותאמים אישית ומנוע סטטיסטיקות")

        self.body_text(
            "כל אדמין מחוז יכול להגדיר שדות ייחודיים לכרטיס החייל של המחוז שלו. "
            "השדות מאוחסנים בטבלת district_custom_fields ומרונדרים דינמית ב-Frontend."
        )

        self.divider()
        self.section_header("מבנה טבלת district_custom_fields")

        # DB schema mock
        pw = self.w - self.l_margin - self.r_margin
        schema_lines = [
            "CREATE TABLE district_custom_fields (",
            "  id          INT AUTO_INCREMENT PRIMARY KEY,",
            "  district_id VARCHAR(50) NOT NULL,",
            "  field_key   VARCHAR(100) NOT NULL,",
            "  field_label VARCHAR(200) NOT NULL,  -- Hebrew label",
            "  field_type  ENUM('text','dropdown','checkbox','number','date'),",
            "  options     JSON,                   -- for dropdown values",
            "  is_required BOOLEAN DEFAULT FALSE,",
            "  sort_order  INT DEFAULT 0,",
            "  created_at  TIMESTAMP DEFAULT NOW()",
            ");",
        ]
        self.set_fill_color(*(25, 25, 35))
        self.rect(self.l_margin, self.get_y(), pw, len(schema_lines) * 6 + 6, style="F")
        self.set_hebrew(8)
        self.set_text_color(*(120, 220, 120))
        for line in schema_lines:
            self.set_xy(self.l_margin + 3, self.get_y())
            self.cell(pw - 6, 6, line)
            self.ln(6)

        self.ln(4)
        self.set_text_color(*DARK_GRAY)
        self.set_hebrew(10)

        self.divider()
        self.section_header("זרימת עבודה — הגדרת שדה חדש")

        steps = [
            ("1", "Admin מחוז נכנס לממשק ניהול שדות", DARK_BLUE),
            ("2", "בוחר: שם שדה, תווית עברית, סוג (טקסט/רשימה/בוחן)", MID_BLUE),
            ("3", "לחיצת שמירה — API מכניס רשומה ל-district_custom_fields", (60, 120, 50)),
            ("4", "Frontend מושך schema בעת פתיחת כרטיס חייל", (140, 80, 20)),
            ("5", "כרטיס החייל מרנדר שדות דינמיים לפי ה-schema", (100, 40, 100)),
            ("6", "ערכי השדות נשמרים ב-soldier_custom_values", DARK_BLUE),
        ]

        for num, desc, color in steps:
            y = self.get_y()
            self.set_fill_color(*color)
            self.set_text_color(*WHITE)
            self.set_hebrew(12, bold=True)
            self.ellipse(self.w - self.r_margin - 8, y + 1, 7, 7, style="F")
            self.set_xy(self.w - self.r_margin - 8, y + 1)
            self.cell(7, 7, num, align="C")
            self.set_text_color(*DARK_GRAY)
            self.set_hebrew(10)
            self.set_xy(self.l_margin, y)
            self.cell(self.w - self.l_margin - self.r_margin - 12, 9, h(desc), align="R")
            self.ln(10)

        self.divider()
        self.section_header("מנוע סטטיסטיקות מותאם")
        self.body_text(
            "Admin מחוז בונה דוחות ב-Drag & Drop:\n"
            "• בחירת שדות לציר X וציר Y\n"
            "• בחירת סוג גרף: עמודות, עוגה, קו\n"
            "• פילטרים: טווח תאריכים, יחידה, סטטוס\n"
            "• שמירת תצורת דוח לשימוש חוזר\n"
            "• ייצוא ל-Excel / PDF בלחיצה אחת"
        )

    def migration_plan(self):
        self.add_page()
        self.section_header("תכנית מיגרציה — ארבעה שלבים")

        phases = [
            {
                "num": "שלב 1",
                "title": "המערכת הקיימת הופכת ל-מחוז 1",
                "duration": "1-2 שבועות",
                "color": DARK_BLUE,
                "tasks": [
                    "הוספת עמודת district_id לטבלאות הקיימות",
                    "עדכון ה-JWT להכלת district_id",
                    "הכנת Docker Compose ייעודי למחוז 1",
                    "בדיקות רגרסיה מלאות על המחוז הקיים",
                    "גיבוי מלא לפני המיגרציה",
                ],
            },
            {
                "num": "שלב 2",
                "title": "פריסת Gateway + Auth Service",
                "duration": "2-3 שבועות",
                "color": (60, 120, 50),
                "tasks": [
                    "הקמת Nginx Gateway מרכזי",
                    "פיתוח Auth Service עם תמיכה ב-SUPER_ADMIN",
                    "הגדרת DNS: *.crm.haga.il → Gateway",
                    "ממשק ניהול ל-SUPER_ADMIN",
                    "בדיקות בידוד בין מחוזות",
                ],
            },
            {
                "num": "שלב 3",
                "title": "Onboarding מחוזות נוספים",
                "duration": "1 שבוע לכל מחוז",
                "color": (140, 80, 20),
                "tasks": [
                    "סקריפט יצירת מחוז חדש (< 10 דקות)",
                    "Onboarding מחוז 2 ומחוז 3",
                    "הדרכת אדמין מחוז",
                    "ניטור ואיסוף Feedback",
                    "תיעוד Runbook לפריסת מחוז",
                ],
            },
            {
                "num": "שלב 4",
                "title": "שדות מותאמים + מנוע סטטיסטיקות",
                "duration": "3-4 שבועות",
                "color": (100, 40, 120),
                "tasks": [
                    "פיתוח ממשק Custom Fields לאדמין",
                    "מנוע Drag & Drop לבניית דוחות",
                    "ייצוא Excel/PDF",
                    "Blue/Green deployment לכל מחוז",
                    "השקה מלאה לכלל המחוזות",
                ],
            },
        ]

        for phase in phases:
            y = self.get_y()
            pw = self.w - self.l_margin - self.r_margin

            # Phase header
            self.set_fill_color(*phase["color"])
            self.set_text_color(*WHITE)
            self.set_hebrew(12, bold=True)
            self.rect(self.l_margin, y, pw, 10, style="F")
            self.set_xy(self.l_margin, y + 1)
            self.cell(pw * 0.25, 8, h(phase["duration"]), align="C")
            self.cell(pw * 0.75, 8, h(f"{phase['num']} — {phase['title']}"), align="R")
            self.ln(11)

            # Tasks
            self.set_fill_color(*LIGHT_GRAY)
            task_start_y = self.get_y()
            for task in phase["tasks"]:
                self.set_text_color(*DARK_GRAY)
                self.set_hebrew(10)
                self.set_x(self.l_margin + 5)
                self.cell(pw - 5, 7, h(f"✓  {task}"), align="R")
                self.ln(7)

            task_end_y = self.get_y()
            self.rect(self.l_margin, task_start_y, pw, task_end_y - task_start_y, style="D")
            self.ln(4)

    def infrastructure_diagram(self):
        self.add_page()
        self.section_header("דיאגרמת תשתית — Docker Compose per District")

        lm = self.l_margin
        pw = self.w - lm - self.r_margin
        y0 = self.get_y() + 5

        # Draw one representative Docker Compose stack in detail
        stack_x = lm + pw / 2 - 60
        stack_w = 120
        stack_y = y0

        # Outer container
        self.set_fill_color(*LIGHT_GRAY)
        self.set_draw_color(*DARK_BLUE)
        self.set_line_width(1)
        self.rect(stack_x, stack_y, stack_w, 90, style="FD")

        # Header
        self.set_fill_color(*DARK_BLUE)
        self.rect(stack_x, stack_y, stack_w, 10, style="F")
        self.set_text_color(*WHITE)
        self.set_hebrew(9, bold=True)
        self.set_xy(stack_x, stack_y + 1.5)
        self.cell(stack_w, 7, h("docker-compose.yml — מחוז א"), align="C")

        # Services inside
        services = [
            ("nginx:alpine", "Port 80/443  |  SSL Termination", (200, 230, 200)),
            ("api:latest", "Port 3000  |  Node.js Express", (200, 215, 235)),
            ("mariadb:10.11", "Port 3306  |  Persistent Volume", (235, 215, 200)),
        ]

        svc_y = stack_y + 13
        for svc_name, svc_desc, svc_color in services:
            self.set_fill_color(*svc_color)
            self.set_draw_color(*(150, 150, 150))
            self.set_line_width(0.4)
            self.rect(stack_x + 5, svc_y, stack_w - 10, 20, style="FD")
            self.set_text_color(*DARK_BLUE)
            self.set_hebrew(10, bold=True)
            self.set_xy(stack_x + 5, svc_y + 2)
            self.cell(stack_w - 10, 7, svc_name, align="C")
            self.set_text_color(*DARK_GRAY)
            self.set_hebrew(8)
            self.set_xy(stack_x + 5, svc_y + 10)
            self.cell(stack_w - 10, 7, svc_desc, align="C")
            svc_y += 24

        # Volumes annotation
        self.set_text_color(*DARK_GRAY)
        self.set_hebrew(8)
        self.set_xy(stack_x, stack_y + 91)
        self.cell(stack_w, 5, "volumes: db_data_district_a:/var/lib/mysql", align="C")

        # Side annotations
        annotations = [
            (stack_x - 65, stack_y + 18, "SSL / TLS\nTermination"),
            (stack_x - 65, stack_y + 42, "Business Logic\n+ REST API"),
            (stack_x - 65, stack_y + 66, "Isolated DB\n+ Backups"),
        ]

        for ax, ay, atext in annotations:
            self.set_fill_color(*LIGHT_BLUE)
            self.set_draw_color(*MID_BLUE)
            self.rect(ax, ay, 58, 14, style="FD")
            self.set_text_color(*DARK_BLUE)
            self.set_hebrew(8)
            self.set_xy(ax, ay + 2)
            for line in atext.split("\n"):
                self.set_xy(ax, self.get_y())
                self.cell(58, 5, line, align="C")
                self.ln(5)
            # Arrow to service
            self.set_draw_color(*MID_BLUE)
            self.set_line_width(0.5)
            self.line(ax + 58, ay + 7, stack_x, ay + 7)
            self.line(stack_x, ay + 7, stack_x + 3, ay + 4)
            self.line(stack_x, ay + 7, stack_x + 3, ay + 10)

        # Below — environment variables example
        env_y = stack_y + 100
        self.set_y(env_y)
        self.divider()
        self.section_header("משתני סביבה — .env.district-a")
        pw = self.w - lm - self.r_margin
        env_lines = [
            "DISTRICT_ID=district-a",
            "DISTRICT_NAME=mahoz-alef",
            "DB_HOST=db_district_a",
            "DB_NAME=crm_district_a",
            "JWT_SECRET=<per-district-secret>",
            "AUTH_SERVICE_URL=http://auth-service:4000",
            "GATEWAY_URL=https://district-a.crm.haga.il",
        ]
        self.set_fill_color(*(25, 25, 35))
        self.rect(lm, self.get_y(), pw, len(env_lines) * 6 + 6, style="F")
        self.set_hebrew(9)
        self.set_text_color(*(180, 220, 255))
        for line in env_lines:
            self.set_xy(lm + 4, self.get_y())
            self.cell(pw - 8, 6, line)
            self.ln(6)

    def conclusion_page(self):
        self.add_page()
        self.section_header("סיכום והמלצות")

        self.body_text(
            "מערכת ה-CRM הרב-מחוזית מהווה קפיצת מדרגה בניהול הלוחמים בחזית העורף. "
            "הארכיטקטורה המוצעת מבטיחה בידוד מלא של נתונים, גמישות תפעולית, "
            "ועלות פיתוח ותחזוקה נמוכה."
        )
        self.divider()

        # Summary metrics table
        self.section_header("אבני דרך ומדדי הצלחה")
        pw = self.w - self.l_margin - self.r_margin
        metrics = [
            ("זמן פריסת מחוז חדש", "< 10 דקות עם סקריפט"),
            ("בידוד נתונים", "100% — אפס cross-district queries"),
            ("Uptime לכל מחוז", "99.9% — עצמאי מלא"),
            ("זמן שדרוג מחוז", "< 5 דקות Blue/Green deployment"),
            ("שדות מותאמים", "ללא מגבלה — per district"),
            ("מספר מחוזות מקסימלי", "בלתי מוגבל — horizontal scaling"),
        ]

        fill = False
        for metric, value in metrics:
            bg = LIGHT_BLUE if fill else WHITE
            self.set_fill_color(*bg)
            self.set_text_color(*DARK_GRAY)
            y = self.get_y()
            self.set_xy(self.l_margin, y)
            self.set_hebrew(10)
            self.cell(pw * 0.5, 9, h(value), border=1, align="C", fill=True)
            self.set_hebrew(10, bold=True)
            self.cell(pw * 0.5, 9, h(metric), border=1, align="R", fill=True)
            self.ln(9)
            fill = not fill

        self.ln(8)
        self.divider()
        self.section_header("הצעדים הבאים המיידיים")
        next_steps = [
            "קבלת אישור ניהולי לתכנית",
            "הקצאת משאבי צוות: 2 מפתחים Backend, 1 Frontend, 1 DevOps",
            "הכנת סביבת Staging לשלב 1",
            "קביעת kick-off עם מפקדי המחוזות הנוספים",
            "הגדרת SLA ו-Runbook לתפעול",
        ]
        for step in next_steps:
            self.bullet(step)

        self.ln(10)
        # Closing box
        pw = self.w - self.l_margin - self.r_margin
        self.set_fill_color(*DARK_BLUE)
        self.set_draw_color(*GOLD)
        self.set_line_width(1)
        self.rect(self.l_margin, self.get_y(), pw, 25, style="FD")
        self.set_text_color(*GOLD)
        self.set_hebrew(14, bold=True)
        self.set_xy(self.l_margin, self.get_y() + 4)
        self.cell(pw, 8, h("מגינים על העורף — יחד ננצח"), align="C")
        self.set_text_color(*WHITE)
        self.set_hebrew(9)
        self.set_xy(self.l_margin, self.get_y() + 8)
        self.cell(pw, 7, h("מסמך זה הוכן על ידי צוות פיתוח CRM | סודי — לשימוש פנימי בלבד"), align="C")

    def header(self):
        if self.page_no() == 1:
            return
        self.set_fill_color(*DARK_BLUE)
        self.rect(0, 0, self.w, 10, style="F")
        self.set_text_color(*WHITE)
        self.set_hebrew(8)
        self.set_xy(10, 1)
        self.cell(self.w - 20, 8, h("תכנית עסקית וטכנולוגית — מערכת CRM רב-מחוזית  |  מגינים על העורף"), align="C")
        self.ln(5)

    def footer(self):
        if self.page_no() == 1:
            return
        self.set_y(-15)
        self.set_draw_color(*MID_BLUE)
        self.set_line_width(0.3)
        self.line(self.l_margin, self.get_y(), self.w - self.r_margin, self.get_y())
        self.set_text_color(*(120, 120, 120))
        self.set_hebrew(8)
        self.cell(0, 8, h(f"עמוד {self.page_no()}"), align="C")


def main():
    pdf = CRMPlan()
    pdf.cover_page()
    pdf.exec_summary()
    pdf.current_vs_future()
    pdf.architecture_diagram()
    pdf.technical_architecture()
    pdf.permissions_table()
    pdf.custom_fields_page()
    pdf.migration_plan()
    pdf.infrastructure_diagram()
    pdf.conclusion_page()

    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
    pdf.output(OUTPUT)
    size = os.path.getsize(OUTPUT)
    print(f"Saved to: {OUTPUT}")
    print(f"File size: {size:,} bytes ({size/1024:.1f} KB)")
    print(f"Pages: {pdf.page}")


if __name__ == "__main__":
    main()
