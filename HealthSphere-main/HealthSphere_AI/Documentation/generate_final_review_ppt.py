"""HealthSphere AI — Final Review deck.
Run:  python generate_final_review_ppt.py
Out:  HealthSphere_Final_Review_Presentation.pptx
"""
import os
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE


def create_deck():
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)

    C_BG = RGBColor(248, 250, 252)
    C_NAVY = RGBColor(15, 23, 42)
    C_DARK = RGBColor(30, 41, 59)
    C_BLUE = RGBColor(14, 116, 144)
    C_ACCENT = RGBColor(2, 132, 199)
    C_GREEN = RGBColor(16, 185, 129)
    C_AMBER = RGBColor(245, 158, 11)
    C_WHITE = RGBColor(255, 255, 255)
    C_CARD = RGBColor(255, 255, 255)
    C_BORDER = RGBColor(226, 232, 240)
    C_MUTED = RGBColor(100, 116, 139)
    C_LIGHT = RGBColor(240, 249, 255)

    blank = prs.slide_layouts[6]

    def header(slide, title, kicker="HEALTHSPHERE AI — FINAL REVIEW"):
        box = slide.shapes.add_textbox(Inches(0.8), Inches(0.4), Inches(11.7), Inches(1.1))
        tf = box.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.text = kicker
        p.font.size = Pt(10)
        p.font.bold = True
        p.font.color.rgb = C_ACCENT
        p.space_after = Pt(4)
        p2 = tf.add_paragraph()
        p2.text = title
        p2.font.size = Pt(22)
        p2.font.bold = True
        p2.font.color.rgb = C_NAVY
        line = slide.shapes.add_shape(
            MSO_SHAPE.RECTANGLE, Inches(0.8), Inches(1.5), Inches(11.7), Inches(0.02))
        line.fill.solid()
        line.fill.fore_color.rgb = C_BORDER
        line.line.fill.background()

    def card(slide, left, top, w, h, bg=C_CARD, border=C_BORDER):
        c = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, w, h)
        c.fill.solid()
        c.fill.fore_color.rgb = bg
        c.line.color.rgb = border
        c.line.width = Pt(1.2)
        return c

    def textbox(slide, left, top, w, h):
        tb = slide.shapes.add_textbox(left, top, w, h)
        tf = tb.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
        return tf

    def bullet(tf, text, size=13, bold=False, color=C_DARK, space=6, level=0, first=False):
        p = tf.paragraphs[0] if first else tf.add_paragraph()
        p.text = text
        p.font.size = Pt(size)
        p.font.bold = bold
        p.font.color.rgb = color
        p.space_after = Pt(space)
        p.level = level
        return p

    # ============ SLIDE 1 — TITLE ============
    s = prs.slides.add_slide(blank)
    bg = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(13.333), Inches(7.5))
    bg.fill.solid()
    bg.fill.fore_color.rgb = C_NAVY
    bg.line.fill.background()

    tf = textbox(s, Inches(1.2), Inches(1.7), Inches(11.0), Inches(4.2))
    p = tf.paragraphs[0]
    p.text = "FINAL PROJECT REVIEW"
    p.font.size = Pt(13)
    p.font.bold = True
    p.font.color.rgb = C_ACCENT
    p.space_after = Pt(14)

    p = tf.add_paragraph()
    p.text = "HealthSphere AI"
    p.font.size = Pt(46)
    p.font.bold = True
    p.font.color.rgb = C_WHITE
    p.space_after = Pt(6)

    p = tf.add_paragraph()
    p.text = "A family health record that actually makes sense of your data"
    p.font.size = Pt(18)
    p.font.color.rgb = RGBColor(148, 163, 184)
    p.space_after = Pt(22)

    p = tf.add_paragraph()
    p.text = "Built by: [Your Name]     ·     [College / Institute Name]"
    p.font.size = Pt(14)
    p.font.bold = True
    p.font.color.rgb = C_WHITE
    p.space_after = Pt(4)
    p = tf.add_paragraph()
    p.text = "Guide review · November 2026"
    p.font.size = Pt(12)
    p.font.color.rgb = RGBColor(148, 163, 184)

    # ============ SLIDE 2 — WHERE I STARTED ============
    s = prs.slides.add_slide(blank)
    header(s, "Where I started")
    tf = textbox(s, Inches(0.8), Inches(1.8), Inches(7.4), Inches(5.2))
    bullet(tf, "Honestly, this began from a very personal problem.", 15, True, C_NAVY, 10, first=True)
    bullet(tf, "My family's reports were scattered — WhatsApp photos of lab reports, "
               "some papers at home, no one remembering when dad's last HbA1c was done.", 13, space=8)
    bullet(tf, "The PRD (CareGraph AI) gave me the scope, but the real question I "
               "kept coming back to was simpler:", 13, space=8)
    bullet(tf, "\u201cIf I upload two years of my family's reports, can the system "
               "tell me something genuinely useful \u2014 and show me exactly why?\u201d", 13.5, True, C_BLUE, 10)
    bullet(tf, "That 'show me exactly why' part shaped every decision in this project.", 13, space=8)
    bullet(tf, "What I set out to build:", 14, True, C_NAVY, 6)
    bullet(tf, "One place for reports, measurements and family history \u2014 that reads "
               "them, finds trends, and explains its reasoning in plain English.", 13, space=6)

    c = card(s, Inches(8.6), Inches(1.9), Inches(3.9), Inches(4.6), C_LIGHT, C_ACCENT)
    tf = textbox(s, Inches(8.9), Inches(2.15), Inches(3.3), Inches(4.1))
    bullet(tf, "SCOPE I COMMITTED TO", 11, True, C_ACCENT, 10, first=True)
    bullet(tf, "\u2705  Upload & parse lab reports", 12.5, space=7)
    bullet(tf, "\u2705  Track metrics over time", 12.5, space=7)
    bullet(tf, "\u2705  Family health history tree", 12.5, space=7)
    bullet(tf, "\u2705  Explainable risk signals", 12.5, space=7)
    bullet(tf, "\u2705  Screening & specialist hints", 12.5, space=7)
    bullet(tf, "\u26a0\ufe0f  Never a diagnosis \u2014 by design", 12.5, True, C_AMBER, 7)

    # ============ SLIDE 3 — WHAT WORKS TODAY ============
    s = prs.slides.add_slide(blank)
    header(s, "What actually works today (live, not slides)")
    items = [
        ("Dashboard", "One screen: active signals, trends, next steps \u2014 all generated from my rules engine, not hard-coded."),
        ("Reports", "Upload PDF \u2192 parse \u2192 extract ~25 lab values \u2192 explain each one in plain English \u2192 feed trends automatically."),
        ("Family tree", "Interactive SVG tree. Recently rebuilt it: click any person \u2192 view record \u2192 edit it \u2192 add relatives from that node."),
        ("Insights", "Risk signals with a 'Why am I seeing this?' factor list, screening checklist, specialist suggestions \u2014 all discussed, never prescribed."),
        ("Lifestyle", "BMR/TDEE targets, activity plans, meal grids filtered by allergies."),
        ("Extras", "Timeline, reminders, nearby hospitals (live OpenStreetMap), emergency mode, admin panel, Research Hub."),
    ]
    x, y = Inches(0.8), Inches(1.8)
    for i, (t, d) in enumerate(items):
        col = i % 2
        row = i // 2
        left = Inches(0.8) + col * Inches(6.1)
        top = Inches(1.8) + row * Inches(1.75)
        card(s, left, top, Inches(5.8), Inches(1.55))
        tf = textbox(s, left + Inches(0.25), top + Inches(0.18), Inches(5.3), Inches(1.2))
        bullet(tf, t, 14, True, C_ACCENT, 5, first=True)
        bullet(tf, d, 11.5, color=C_DARK, space=0)

    # ============ SLIDE 4 — HOW IT WORKS ============
    s = prs.slides.add_slide(blank)
    header(s, "How a request flows through my system")
    tf = textbox(s, Inches(0.8), Inches(1.8), Inches(11.7), Inches(1.0))
    bullet(tf, "I kept the architecture simple enough that I can explain every line of it:",
           14, True, C_NAVY, 4, first=True)

    steps = [
        ("Browser", "Vanilla JS SPA\nhash router\nno build step"),
        ("nginx", "static files\ngzip + caching\n/api proxy"),
        ("Node server", "security headers\npayload limits\nregex router"),
        ("4 Models", "extraction \u2192 trends\n\u2192 rules \u2192 lifestyle"),
        ("Safety layer", "strip diagnosis\nwords, attach\ndisclaimers"),
        ("PostgreSQL", "10 tables\n+ JSON fallback\nfor dev/tests"),
    ]
    for i, (t, d) in enumerate(steps):
        left = Inches(0.7) + i * Inches(2.05)
        c = card(s, left, Inches(3.0), Inches(1.85), Inches(1.9),
                 C_LIGHT if i % 2 == 0 else C_CARD)
        tf = textbox(s, left + Inches(0.15), Inches(3.2), Inches(1.55), Inches(1.6))
        bullet(tf, t, 13, True, C_ACCENT, 6, first=True)
        bullet(tf, d, 10.5, color=C_DARK, space=0)
        if i < len(steps) - 1:
            arr = s.shapes.add_shape(
                MSO_SHAPE.RIGHT_ARROW, left + Inches(1.88), Inches(3.75),
                Inches(0.16), Inches(0.35))
            arr.fill.solid()
            arr.fill.fore_color.rgb = C_ACCENT
            arr.line.fill.background()

    tf = textbox(s, Inches(0.8), Inches(5.4), Inches(11.7), Inches(1.6))
    bullet(tf, "Every response passes through the safety layer before the user ever sees it \u2014 "
               "signals with no explainable factors are dropped, and words like "
               "'diagnosis', 'prescribe', 'cure' are stripped out.", 13, space=8, first=True)
    bullet(tf, "Only two npm packages in the backend (pg + tesseract.js). Node's built-in "
               "http, zlib (for PDF parsing) and crypto (for hashing) cover everything else.",
          13, color=C_MUTED)

    # ============ SLIDE 5 — FOUR MODELS ============
    s = prs.slides.add_slide(blank)
    header(s, "The four models I built")
    models = [
        ("1. Document Intelligence", "extraction.js + pdftext.js",
         "\u2022 Custom PDF text miner \u2014 walks stream objects, inflates with Node zlib (no pdf library)\n"
         "\u2022 ~25 analytes: aliases, sex-specific bands, unit harmonization\n"
         "\u2022 Photos: OCR runs in the browser first; a local server-side Tesseract fallback kicks in if that fails \u2014 no third-party OCR service either way\n"
         "\u2022 Prompt-injection guard: instruction lines inside reports are dropped"),
        ("2. Trend Engine", "trends.js",
         "\u2022 Least-squares regression per metric \u2192 increasing / stable / decreasing\n"
         "\u2022 Per-metric significance thresholds (HbA1c 0.1%/yr, BP 3 mmHg/yr \u2026)\n"
         "\u2022 Z-score anomaly on latest reading, \u226515% sudden-change flag\n"
         "\u2022 Stale-data detection (180+ days with no reading)"),
        ("3. Risk Rules + Safety", "rules.js + recommend.js",
         "\u2022 8 domains: metabolic, cardio, thyroid, kidney, nutrition, liver, sleep, data gaps\n"
         "\u2022 Combines labs + trends + family history + age/BMI/lifestyle\n"
         "\u2022 Every signal carries its factor list \u2014 that IS the product\n"
         "\u2022 Specialist hints framed as '(discussion)', never a referral"),
        ("4. Lifestyle Engine", "lifestyle.js",
         "\u2022 Mifflin-St Jeor BMR \u2192 TDEE \u2192 goal-adjusted calories\n"
         "\u2022 4-week progressive activity plan\n"
         "\u2022 Meal grids filtered by recorded allergies\n"
         "\u2022 Hydration targets from body weight"),
    ]
    for i, (t, f, d) in enumerate(models):
        col, row = i % 2, i // 2
        left = Inches(0.8) + col * Inches(6.1)
        top = Inches(1.8) + row * Inches(2.6)
        card(s, left, top, Inches(5.8), Inches(2.4))
        tf = textbox(s, left + Inches(0.25), top + Inches(0.18), Inches(5.3), Inches(2.05))
        bullet(tf, t, 14, True, C_ACCENT, 2, first=True)
        bullet(tf, f, 10.5, color=C_MUTED, space=6)
        bullet(tf, d, 11.5, color=C_DARK, space=0)

    # ============ SLIDE 6 — WHY NO LLM ============
    s = prs.slides.add_slide(blank)
    header(s, "The decision I'm most sure about: no LLM in the clinical path")
    tf = textbox(s, Inches(0.8), Inches(1.85), Inches(7.3), Inches(5.0))
    bullet(tf, "I'll be honest \u2014 using an LLM would have been easier to demo.", 15, True, C_NAVY, 10, first=True)
    bullet(tf, "But three things stopped me:", 13, space=8)
    bullet(tf, "1.  It can invent a number. For health values, 'probably right' isn't right.", 13, space=7)
    bullet(tf, "2.  I can't explain it. My PRD demands 'why am I seeing this?' \u2014 "
               "a regression slope I can show; a token prediction I can't.", 13, space=7)
    bullet(tf, "3.  Family health data shouldn't leave the device to answer a question "
               "my own rules can answer.", 13, space=12)
    bullet(tf, "So instead of a black box, I built a glass box:", 14, True, C_BLUE, 8)
    bullet(tf, "Deterministic extraction \u2192 statistical trends \u2192 evidence-informed rules "
               "\u2192 safety layer \u2192 plain-English explanation.", 13.5, True, C_DARK, 8)
    bullet(tf, "Where I do use ML: an offline pipeline (ml/) is written to fine-tune an embedding "
               "model for retrieving relevant research articles \u2014 ranking only, never deciding "
               "values. Training itself hasn't run yet: the model is access-gated.",
          12.5, color=C_MUTED)

    c = card(s, Inches(8.5), Inches(2.0), Inches(4.0), Inches(4.4), C_LIGHT, C_ACCENT)
    tf = textbox(s, Inches(8.8), Inches(2.25), Inches(3.4), Inches(3.9))
    bullet(tf, "SAFETY LAYER IN ACTION", 11, True, C_ACCENT, 10, first=True)
    bullet(tf, "Banned words:", 12, True, C_NAVY, 4)
    bullet(tf, "diagnosis · prescribe\ndosage · cure \u2192 'assess'", 11.5, color=C_DARK, space=8)
    bullet(tf, "No factors \u2192 no signal", 12, True, C_NAVY, 4)
    bullet(tf, "(unexplainable signals\nare deleted, not shown)", 11.5, color=C_DARK, space=8)
    bullet(tf, "Attention-level signals", 12, True, C_NAVY, 4)
    bullet(tf, "get an automatic\n'seek professional\nevaluation' suffix", 11.5, color=C_DARK)

    # ============ SLIDE 7 — FAMILY TREE FEATURE ============
    s = prs.slides.add_slide(blank)
    header(s, "Recent work: making the family tree actually interactive")
    tf = textbox(s, Inches(0.8), Inches(1.8), Inches(7.3), Inches(5.0))
    bullet(tf, "Before: the tree was a picture. You could look at it, that's it.", 14, True, C_NAVY, 10, first=True)
    bullet(tf, "What I changed (this week):", 14, True, C_ACCENT, 8)
    bullet(tf, "\u2022  Every node is now clickable and keyboard-accessible "
               "(Tab + Enter works \u2014 I didn't want to break accessibility for this)", 13, space=7)
    bullet(tf, "\u2022  Click a person \u2192 modal with their full record: conditions with "
               "diagnosis ages, genetic conditions, notes", 13, space=7)
    bullet(tf, "\u2022  \u2018Edit record\u2019 \u2192 pre-filled form \u2192 PUT /api/family/:id "
               "\u2192 tree re-renders, guidance re-analyzes", 13, space=7)
    bullet(tf, "\u2022  \u2018Add relative\u2019 \u2014 suggestions are contextual: click a parent "
               "\u2192 it offers grandparent / sibling; click yourself \u2192 parent / child / sibling", 13, space=7)
    bullet(tf, "\u2022  The old \u00d7 delete still works, but I made sure clicking it doesn't "
               "accidentally open the modal (event propagation)", 13, space=8)
    bullet(tf, "The layout itself I kept \u2014 4 generations positioned by hand-coded "
               "gen rules with cubic-bezier curves for edges. SVG so it stays crisp on phones.",
          12.5, color=C_MUTED)

    c = card(s, Inches(8.5), Inches(2.0), Inches(4.0), Inches(4.3), C_LIGHT, C_GREEN)
    tf = textbox(s, Inches(8.8), Inches(2.25), Inches(3.4), Inches(3.8))
    bullet(tf, "API SURFACE (already there)", 11, True, C_GREEN, 10, first=True)
    bullet(tf, "GET   /api/family", 11.5, True, C_NAVY, 5)
    bullet(tf, "POST  /api/family", 11.5, True, C_NAVY, 5)
    bullet(tf, "PUT   /api/family/:id", 11.5, True, C_NAVY, 5)
    bullet(tf, "DELETE /api/family/:id", 11.5, True, C_NAVY, 10)
    bullet(tf, "The backend already supported edit \u2014 the gap was purely in the UI. "
               "Good API design made this a frontend-only change.", 11.5, color=C_DARK)

    # ============ SLIDE 8 — TECH STACK ============
    s = prs.slides.add_slide(blank)
    header(s, "Tech stack \u2014 and why I said no to the obvious choices")
    rows = [
        ("Node.js, vanilla", "Backend logic", "Built-in zlib for PDFs, crypto for hashing \u2014 zero deps, no supply-chain risk", "Express \u2014 a dependency for what http already does"),
        ("PostgreSQL", "Primary database", "ACID for medical records, joins, JSONB, real backups", "MongoDB \u2014 no relational integrity; SQLite \u2014 single-writer"),
        ("Vanilla JS SPA", "Frontend (16 views)", "No build step, ~35KB core, edits are instant", "React \u2014 toolchain + bundle bloat for a CRUD app"),
        ("Custom PDF miner", "Report parsing", "100 lines on Node zlib \u2014 I know exactly how it works", "pdf.js \u2014 5MB dep for one job"),
        ("Tesseract.js", "OCR for photos", "Browser-first recognition; local server fallback \u2014 no cloud OCR provider ever sees the image", "Cloud OCR \u2014 paid + health data egress"),
        ("nginx + Docker", "Deployment", "Edge caching + API proxy, one-command stack", "Serving static from Node \u2014 blocks the event loop"),
    ]
    # table header
    y0 = Inches(1.75)
    # manual columns
    col_x = [Inches(0.8), Inches(3.1), Inches(5.0), Inches(9.6)]
    col_w = [Inches(2.2), Inches(1.8), Inches(4.5), Inches(3.0)]
    headers = ["Choice", "Role", "Why I picked it", "Why not the obvious one"]
    for i, h in enumerate(headers):
        tf = textbox(s, col_x[i], y0, col_w[i], Inches(0.3))
        bullet(tf, h.upper(), 10.5, True, C_ACCENT, 0, first=True)
    y = Inches(2.15)
    for r in rows:
        line = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), y, Inches(11.7), Inches(0.015))
        line.fill.solid()
        line.fill.fore_color.rgb = C_BORDER
        line.line.fill.background()
        for i, cell in enumerate(r):
            tf = textbox(s, col_x[i], y + Inches(0.08), col_w[i], Inches(0.75))
            bullet(tf, cell, 11 if i else 11.5, i == 0,
                   C_NAVY if i == 0 else (C_DARK if i < 3 else C_MUTED), 0, first=True)
        y += Inches(0.82)

    # ============ SLIDE 9 — DATA LAYER ============
    s = prs.slides.add_slide(blank)
    header(s, "Data layer: I didn't just pick a database, I planned the exit")
    tf = textbox(s, Inches(0.8), Inches(1.85), Inches(7.3), Inches(5.0))
    bullet(tf, "Started as a JSON file store \u2014 great for building, terrible for production.",
           14, True, C_NAVY, 10, first=True)
    bullet(tf, "So db.js now works in two modes:", 13.5, True, C_ACCENT, 8)
    bullet(tf, "\u2022  If DATABASE_URL / SUPABASE_DB_URL is set \u2192 PostgreSQL "
               "(10 tables + JSONB collections, indexed queries, same camelCase API)", 13, space=7)
    bullet(tf, "\u2022  If not \u2192 JSON fallback, so the demo and the test suite "
               "never break when there's no DB around", 13, space=10)
    bullet(tf, "The migration script (scripts/migrate-to-postgres.mjs) moves existing "
               "JSON data into relational tables \u2014 and my CI actually runs it against "
               "a real Postgres container before tests, so schema bugs get caught before merge.",
          13, space=10)
    bullet(tf, "I'll say this plainly: production launch still needs this verified on the "
               "live hosted database. That's item one on my remaining work list.",
          12.5, True, C_AMBER)

    c = card(s, Inches(8.5), Inches(2.0), Inches(4.0), Inches(4.2), C_LIGHT, C_ACCENT)
    tf = textbox(s, Inches(8.8), Inches(2.25), Inches(3.4), Inches(3.7))
    bullet(tf, "TABLES COVER (schema.sql)", 11, True, C_ACCENT, 10, first=True)
    bullet(tf, "users · sessions\nuser_collections:\n profiles · families\n reports · metrics\n"
               "logs · reminders\n settings · sos · audit\ndoctor_accounts\nstores · consult_*\nfeedback",
          11.5, color=C_DARK, space=8)
    bullet(tf, "Primary keys only \u2014 the app\ncurrently loads rows into\nmemory rather than\nquerying per-request.",
          11.5, color=C_MUTED)

    # ============ SLIDE 10 — TESTING ============
    s = prs.slides.add_slide(blank)
    header(s, "Testing \u2014 11 suites, and what each one protects")
    tests = [
        ("extraction", "lab values parsed correctly from report text"),
        ("lft-layout", "photographed/table reports: aliases, units, ranges, confidence"),
        ("trends", "increasing / stable / jump / stale / empty-series all detected"),
        ("rules", "signals fire correctly AND the safety layer blocks diagnosis language"),
        ("storage", "local + Supabase + Cloudinary branches (mocked)"),
        ("research \u00d75", "schema states, dedup, offline summarizer, connectors, API gating"),
        ("html-inline-scripts", "inline boot script parses \u2014 guards APP_VERSION + error overlay"),
    ]
    for i, (t, d) in enumerate(tests):
        col, row = i % 2, i // 2
        left = Inches(0.8) + col * Inches(6.1)
        top = Inches(1.72) + row * Inches(1.02)
        card(s, left, top, Inches(5.8), Inches(0.92))
        tf = textbox(s, left + Inches(0.25), top + Inches(0.12), Inches(5.3), Inches(0.72))
        bullet(tf, "\u2705  " + t, 13, True, C_GREEN, 3, first=True)
        bullet(tf, d, 11.5, color=C_DARK, space=0)
    tf = textbox(s, Inches(0.8), Inches(5.85), Inches(11.7), Inches(1.3))
    bullet(tf, "npm test  \u2192  all 11 green (ran today, before this presentation)",
           14, True, C_NAVY, 8, first=True)
    bullet(tf, "Also set up: k6 load test (target 100 users, p95 < 500ms) and a GitHub "
               "Actions pipeline that lints, tests against a real Postgres container, "
               "then runs the migration.", 13, color=C_DARK)

    # ============ SLIDE 11 — SECURITY ============
    s = prs.slides.add_slide(blank)
    header(s, "Security work (health data deserves it)")
    left_items = [
        "scrypt password hashing (Node crypto, random salt per user)",
        "Random 32-byte session tokens, HttpOnly cookies, 7-day expiry",
        "Rate limiting on auth, upload and feedback endpoints",
        "CSP + nosniff + X-Frame-Options DENY + Referrer-Policy on every response",
        "Payload size caps (25MB API, 30MB nginx) and path-traversal guard on static files",
    ]
    right_items = [
        "Prompt-injection guard inside uploaded reports",
        "Consent toggles for location, contacts, sharing",
        "Full audit log of user actions",
        "JSON export + immediate account deletion (user owns their data)",
        "Admin panel deny-by-default (ADMIN_EMAILS allow-list)",
    ]
    card(s, Inches(0.8), Inches(1.85), Inches(5.8), Inches(4.4))
    tf = textbox(s, Inches(1.1), Inches(2.1), Inches(5.2), Inches(3.9))
    bullet(tf, "AUTH & TRANSPORT", 11.5, True, C_ACCENT, 10, first=True)
    for it in left_items:
        bullet(tf, "\u2022  " + it, 12.5, space=9)
    card(s, Inches(6.9), Inches(1.85), Inches(5.6), Inches(4.4))
    tf = textbox(s, Inches(7.2), Inches(2.1), Inches(5.0), Inches(3.9))
    bullet(tf, "DATA & PRIVACY", 11.5, True, C_ACCENT, 10, first=True)
    for it in right_items:
        bullet(tf, "\u2022  " + it, 12.5, space=9)
    tf = textbox(s, Inches(0.8), Inches(6.45), Inches(11.7), Inches(0.7))
    bullet(tf, "Not done yet, and I won't pretend otherwise: MFA, CSRF tokens and "
               "password-reset emails. All three are in the production plan with dates.",
          12.5, True, C_AMBER, 0, first=True)

    # ============ SLIDE 12 — CHALLENGES ============
    s = prs.slides.add_slide(blank)
    header(s, "Things that actually went wrong (and how I fixed them)")
    challenges = [
        ("PDF parsing broke on real reports",
         "Lab PDFs use FlateDecode streams my first naive parser ignored. I walked the raw "
         "stream objects myself and inflate with zlib.inflateSync, falling back to inflateRawSync. "
         "Now it handles the digital reports I tested without a single dependency."),
        ("Same value, four date formats",
         "Reports arrived as 2026-08-20, 20/08/2026, 20 Aug 2026, Aug 20 2026 \u2014 and one format "
         "was ambiguous (is 03/04 March or April?). I parse dd/mm first (common lab format) and "
         "swap only when the month field is invalid."),
        ("The family tree looked wrong with 3 siblings",
         "My original layout overlapped nodes. I switched to generation-based layering with "
         "side-fanned siblings around the center 'You' node, plus jitter so twins don't collide."),
        ("Tests needed a database they didn't have",
         "CI runs against a real Postgres container now \u2014 but locally, tests must run with "
         "nothing. That's why db.js has the JSON fallback: same API, both modes, tests never skipped."),
        ("Port 3000 was always busy during dev",
         "server.js now retries port+1 up to 10 times. Small thing, but it saved me "
         "from killing my own server every second day."),
    ]
    y = Inches(1.75)
    for t, d in challenges:
        tf = textbox(s, Inches(0.8), y, Inches(11.7), Inches(1.0))
        bullet(tf, "\u26a0  " + t, 13, True, C_NAVY, 3, first=True)
        bullet(tf, d, 11.5, color=C_DARK, space=0)
        y += Inches(1.02)

    # ============ SLIDE 13 — WHAT'S LEFT ============
    s = prs.slides.add_slide(blank)
    header(s, "What's done, what's left \u2014 an honest list")
    card(s, Inches(0.8), Inches(1.85), Inches(5.8), Inches(4.9), RGBColor(240, 253, 244), C_GREEN)
    tf = textbox(s, Inches(1.1), Inches(2.1), Inches(5.2), Inches(4.4))
    bullet(tf, "DONE & VERIFIED", 12, True, C_GREEN, 10, first=True)
    for it in ["4 intelligence models + safety layer",
               "11/11 test suites passing",
               "Interactive family tree (click / edit / add)",
               "Postgres layer + migration script",
               "Research Hub with 4 official sources (RAG prototype not yet wired to API)",
               "Docker compose stack (nginx + node)",
               "CI pipeline: syntax check \u2192 test on real PG \u2192 migrate",
               "k6 load-test script written",
               "Security headers, rate limits, audit log"]:
        bullet(tf, "\u2713  " + it, 12.5, space=7)
    card(s, Inches(6.9), Inches(1.85), Inches(5.6), Inches(4.9), RGBColor(255, 251, 235), C_AMBER)
    tf = textbox(s, Inches(7.2), Inches(2.1), Inches(5.0), Inches(4.4))
    bullet(tf, "REMAINING (my next sprint)", 12, True, C_AMBER, 10, first=True)
    for it in ["Verify migration on live hosted DB",
               "MFA (TOTP) + password reset emails",
               "CSRF tokens on mutating routes",
               "Structured logs + Sentry + uptime alerts",
               "Run k6 load test, fix what it finds",
               "Privacy policy / terms pages",
               "Accessibility pass (axe-core)",
               "Production deploy + 48h monitoring",
               "FHIR export (post-launch)"]:
        bullet(tf, "\u25a1  " + it, 12.5, space=7)
    tf = textbox(s, Inches(0.8), Inches(6.9), Inches(11.7), Inches(0.5))
    bullet(tf, "Full plan with day-by-day breakdown is in PRODUCTION_PLAN.md \u2014 61 tracked tasks.",
           12, color=C_MUTED, space=0, first=True)

    # ============ SLIDE 14 — LEARNINGS ============
    s = prs.slides.add_slide(blank)
    header(s, "What I took away from building this")
    tf = textbox(s, Inches(0.8), Inches(1.9), Inches(11.7), Inches(5.0))
    bullet(tf, "1.  Explainability is a feature, not a constraint.", 16, True, C_NAVY, 6, first=True)
    bullet(tf, "Every time I was tempted to shortcut the 'why', the product got worse. "
               "The factor lists are what make the signals trustworthy.", 13, space=14)
    bullet(tf, "2.  Choosing what NOT to use is half the architecture.", 16, True, C_NAVY, 6)
    bullet(tf, "No framework, no LLM, no cloud OCR in the request path \u2014 each 'no' "
               "removed a class of failure I'd otherwise have to debug.", 13, space=14)
    bullet(tf, "3.  Tests earn their keep the day they stop a bug.", 16, True, C_NAVY, 6)
    bullet(tf, "The rules test literally checks that diagnosis language can't reach a user. "
               "That's the kind of bug you don't want to find in production.", 13, space=14)
    bullet(tf, "4.  Demo data tells the story \u2014 my seeded HbA1c 5.4 \u2192 5.7 \u2192 6.0 "
               "is the thread that ties every feature together.", 16, True, C_NAVY, 6)
    bullet(tf, "It's how I show the trend engine, the risk signal and the screening "
               "checklist reacting to the same underlying truth.", 13)

    # ============ SLIDE 15 — CLOSING ============
    s = prs.slides.add_slide(blank)
    bg = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(13.333), Inches(7.5))
    bg.fill.solid()
    bg.fill.fore_color.rgb = C_NAVY
    bg.line.fill.background()
    tf = textbox(s, Inches(1.2), Inches(2.2), Inches(11.0), Inches(3.5))
    p = tf.paragraphs[0]
    p.text = "Thank you"
    p.font.size = Pt(40)
    p.font.bold = True
    p.font.color.rgb = C_WHITE
    p.space_after = Pt(14)
    p = tf.add_paragraph()
    p.text = ("Happy to walk through any part of the code \u2014 the trend engine, "
              "the safety layer, the family tree, or the database migration.")
    p.font.size = Pt(16)
    p.font.color.rgb = RGBColor(148, 163, 184)
    p.space_after = Pt(20)
    p = tf.add_paragraph()
    p.text = "Questions?"
    p.font.size = Pt(22)
    p.font.bold = True
    p.font.color.rgb = C_ACCENT

    out = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                       "HealthSphere_Final_Review_Presentation.pptx")
    prs.save(out)
    print(f"Saved: {out}  ({len(prs.slides)} slides)")


if __name__ == "__main__":
    create_deck()
