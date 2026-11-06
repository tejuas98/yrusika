import os, math
from PIL import Image, ImageDraw, ImageFont, ImageFilter

WIDTH, HEIGHT = 1920, 1080
FPS = 30
TOTAL_FRAMES = 600 # 20 seconds

WORK_DIR = "/Users/toru/Projects/yrusika/brag-output/work"
FRAMES_DIR = os.path.join(WORK_DIR, "frames")
os.makedirs(FRAMES_DIR, exist_ok=True)

ASSETS_DIR = "/Users/toru/Projects/yrusika/assets"
mascot_src = Image.open(os.path.join(ASSETS_DIR, "mascot-clean.png")).convert("RGBA")
slide_src = Image.open(os.path.join(ASSETS_DIR, "slide-exact.png")).convert("RGBA")

# Fonts
font_title = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 68)
font_h2 = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 44)
font_h3 = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 32)
font_body = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 26)
font_small = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 20)
font_badge = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 20)
font_mono = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 22)

# Colors
BG_DARK = (14, 14, 18)
BG_CARD = (20, 20, 26)
BG_DOCK = (16, 16, 22)
BORDER_COLOR = (42, 42, 54)
ACCENT_BLUE = (37, 99, 235)
ACCENT_CYAN = (56, 189, 248)
TEXT_WHITE = (244, 244, 245)
TEXT_MUTED = (156, 163, 175)
GREEN_DOT = (16, 185, 129)

def ease_out_cubic(x):
    return 1 - math.pow(1 - x, 3)

def ease_in_out(x):
    return 0.5 * (1 - math.cos(math.pi * x))

def draw_pill(draw, box, fill=None, outline=None, width=1):
    draw.rounded_rectangle(box, radius=box[3]-box[1], fill=fill, outline=outline, width=width)

for f in range(TOTAL_FRAMES):
    sec = f / FPS
    im = Image.new("RGB", (WIDTH, HEIGHT), BG_DARK)
    draw = ImageDraw.Draw(im)

    # Global ambient gradient glow at top-center
    glow_radius = 400
    for r in range(glow_radius, 0, -40):
        alpha = int(12 * (1 - r / glow_radius))
        draw.ellipse([WIDTH//2 - r, -100 - r//2, WIDTH//2 + r, -100 + r], fill=(20, 35, 75))

    # ==========================================
    # SCENE 1: THE HOOK (0.0s - 3.2s | Frames 0-95)
    # ==========================================
    if f < 96:
        p = min(1.0, f / 30.0) # entrance progress
        fade = 1.0 if f < 80 else max(0.0, (95 - f) / 15.0)

        # Top Category Pill
        pill_y = int(340 - (1 - ease_out_cubic(p)) * 40)
        pill_box = [WIDTH//2 - 220, pill_y, WIDTH//2 + 220, pill_y + 36]
        draw.rounded_rectangle(pill_box, radius=18, fill=(24, 32, 50), outline=ACCENT_BLUE, width=1)
        draw.text((WIDTH//2 - 185, pill_y + 7), "OPEN-SOURCE CHROME EXTENSION", fill=ACCENT_CYAN, font=font_badge)

        # Main Headline Line 1
        t1_y = pill_y + 60
        draw.text((WIDTH//2 - 470, t1_y), "STOP PAUSING LECTURES", fill=TEXT_WHITE, font=font_title)

        # Main Headline Line 2
        p2 = min(1.0, max(0.0, (f - 12) / 25.0))
        t2_y = t1_y + 85
        t2_alpha = int(255 * ease_out_cubic(p2))
        draw.text((WIDTH//2 - 450, t2_y), "TO COPY CODE & SLIDES.", fill=ACCENT_CYAN, font=font_title)

        # Subtitle
        p3 = min(1.0, max(0.0, (f - 25) / 25.0))
        t3_y = t2_y + 95
        draw.text((WIDTH//2 - 340, t3_y), "Turn any YouTube or Coursera video into clean Obsidian notes.", fill=TEXT_MUTED, font=font_h3)

        # Three benefit tags
        if f > 40:
            p4 = min(1.0, (f - 40) / 20.0)
            tag_y = t3_y + 80
            tags = ["✓ 1-Click Keyframe Capture", "✓ Local Markdown Sync", "✓ Zero Subscriptions"]
            total_w = 900
            start_x = WIDTH//2 - total_w//2
            for i, tag in enumerate(tags):
                tx = start_x + i * 310
                draw.rounded_rectangle([tx, tag_y, tx + 280, tag_y + 44], radius=10, fill=(22, 22, 30), outline=(50, 50, 65), width=1)
                draw.text((tx + 20, tag_y + 10), tag, fill=TEXT_WHITE, font=font_body)

    # ===================================================
    # SCENE 2: NATIVE FOCUS DOCK (3.2s - 7.5s | Frames 96-225)
    # ===================================================
    elif f < 226:
        sc_f = f - 96
        # Top Header Banner
        banner_p = min(1.0, sc_f / 20.0)
        draw.text((WIDTH//2 - 380, 40), "NATIVE IN-PAGE FOCUS WORKSTATION", fill=ACCENT_CYAN, font=font_h2)
        draw.text((WIDTH//2 - 300, 95), "Docks directly alongside YouTube, Coursera, Udemy & any web video", fill=TEXT_MUTED, font=font_body)

        # Realistic Browser Window
        win_w, win_h = 1600, 840
        win_x = (WIDTH - win_w) // 2
        win_y = 160

        # Window Frame & Header
        draw.rounded_rectangle([win_x, win_y, win_x + win_w, win_y + win_h], radius=14, fill=(18, 18, 24), outline=BORDER_COLOR, width=2)
        # Browser Address Bar
        draw.rounded_rectangle([win_x, win_y, win_x + win_w, win_y + 48], radius=14, fill=(24, 24, 32))
        draw.ellipse([win_x + 18, win_y + 18, win_x + 30, win_y + 30], fill=(239, 68, 68)) # red
        draw.ellipse([win_x + 38, win_y + 18, win_x + 50, win_y + 30], fill=(245, 158, 11)) # yellow
        draw.ellipse([win_x + 58, win_y + 18, win_x + 70, win_y + 30], fill=(34, 197, 94)) # green

        # URL Bar
        draw.rounded_rectangle([win_x + 120, win_y + 10, win_x + 750, win_y + 38], radius=6, fill=(14, 14, 18), outline=(40, 40, 52), width=1)
        draw.text((win_x + 135, win_y + 14), "🔒 youtube.com/watch?v=tgGNwG_UxFo", fill=TEXT_MUTED, font=font_small)

        # Video Section (Left 62%)
        vid_w = 980
        vid_h = win_h - 48
        vid_x = win_x
        vid_y = win_y + 48
        draw.rectangle([vid_x, vid_y, vid_x + vid_w, vid_y + vid_h], fill=(0, 0, 0))

        # Lecture Video Mockup
        # Top Floating Toolbar
        draw.rounded_rectangle([vid_x + 20, vid_y + 20, vid_x + 100, vid_y + 54], radius=6, fill=(14, 14, 18), outline=(40, 40, 50))
        draw.text((vid_x + 32, vid_y + 26), "✕  👁", fill=TEXT_WHITE, font=font_small)
        draw.rounded_rectangle([vid_x + 110, vid_y + 20, vid_x + 380, vid_y + 54], radius=6, fill=(14, 14, 18), outline=(40, 40, 50))
        draw.text((vid_x + 125, vid_y + 26), "🐢   ⚡   ⏪   ⏯   ⏩   🔇   🔊", fill=TEXT_WHITE, font=font_small)

        # Video Content Representation (Dark terminal / slides)
        draw.text((vid_x + 60, vid_y + 180), "What are we doing?", fill=(255, 140, 140), font=font_h2)
        draw.text((vid_x + 60, vid_y + 250), "Who is this for?", fill=(140, 200, 255), font=font_h3)
        draw.text((vid_x + 500, vid_y + 250), "Prerequisites", fill=(140, 255, 180), font=font_h3)
        draw.text((vid_x + 60, vid_y + 340), "How to follow & code along", fill=(255, 220, 140), font=font_h3)

        # Video Bottom Bar
        draw.rectangle([vid_x, vid_y + vid_h - 40, vid_x + vid_w, vid_y + vid_h], fill=(10, 10, 14))
        draw.text((vid_x + 20, vid_y + vid_h - 28), "14m today · 1 day this week", fill=TEXT_MUTED, font=font_small)

        # Right Dock (Yrusika Workstation - slides in!)
        dock_w = win_w - vid_w
        dock_full_x = vid_x + vid_w
        slide_p = min(1.0, sc_f / 25.0)
        dock_x = int(win_x + win_w - dock_w * ease_out_cubic(slide_p))

        draw.rectangle([dock_x, vid_y, dock_x + dock_w, vid_y + vid_h], fill=BG_DOCK, outline=BORDER_COLOR, width=1)
        # Dock Header
        draw.text((dock_x + 25, vid_y + 20), "‹  Yrusika  ›", fill=TEXT_WHITE, font=font_h3)
        draw.text((dock_x + dock_w - 70, vid_y + 22), "☾   ✕", fill=TEXT_MUTED, font=font_body)

        # Exit Video Mode Button
        draw.rounded_rectangle([dock_x + 20, vid_y + 70, dock_x + dock_w - 20, vid_y + 115], radius=8, fill=(24, 24, 32), outline=BORDER_COLOR, width=1)
        draw.text((dock_x + dock_w//2 - 70, vid_y + 82), "⛶  Exit Video Mode", fill=TEXT_WHITE, font=font_body)

        # Vault Row
        draw.ellipse([dock_x + 25, vid_y + 140, dock_x + 35, vid_y + 150], fill=GREEN_DOT)
        draw.text((dock_x + 42, vid_y + 134), "Vault: notes 📁", fill=TEXT_WHITE, font=font_body)
        draw.text((dock_x + dock_w - 180, vid_y + 134), "🌐  📄  🗐  🕒  ↗  ⚙", fill=TEXT_MUTED, font=font_small)

        # Slide Card
        card_y = vid_y + 180
        thumb = slide_src.resize((dock_w - 70, int((dock_w - 70) * (slide_src.height / slide_src.width))))
        im.paste(thumb, (dock_x + 20, card_y))

        # Timestamp & Notes
        note_y = card_y + thumb.height + 15
        draw.text((dock_x + 20, note_y), "▶ 00:01:58", fill=ACCENT_CYAN, font=font_h3)
        draw.text((dock_x + 20, note_y + 45), "• A resource used to guide the learning process", fill=TEXT_WHITE, font=font_body)
        draw.text((dock_x + 20, note_y + 80), "• Features interactive playground to run code", fill=TEXT_WHITE, font=font_body)

        # Bottom Mascot Button
        m_size = 46
        m_thumb = mascot_src.resize((m_size, m_size))
        im.paste(m_thumb, (dock_x + dock_w - 65, vid_y + vid_h - 65), m_thumb)

    # ==============================================================
    # SCENE 3: ONE-CLICK SLIDE & KEYFRAME CAPTURE (7.5s - 12.0s | Frames 226-360)
    # ==============================================================
    elif f < 361:
        sc_f = f - 226
        draw.text((WIDTH//2 - 340, 40), "ONE-CLICK HIGH-RES FRAME CAPTURE", fill=ACCENT_CYAN, font=font_h2)
        draw.text((WIDTH//2 - 280, 95), "Grabs exact slides & code snippets with clickable timestamps", fill=TEXT_MUTED, font=font_body)

        # Large Centered Dock Focus Card
        dw, dh = 1100, 820
        dx = (WIDTH - dw) // 2
        dy = 160
        draw.rounded_rectangle([dx, dy, dx + dw, dy + dh], radius=14, fill=BG_DOCK, outline=BORDER_COLOR, width=2)

        # Header
        draw.text((dx + 30, dy + 25), "‹  Yrusika Note Workstation  ›", fill=TEXT_WHITE, font=font_h2)
        draw.ellipse([dx + dw - 240, dy + 35, dx + dw - 226, dy + 49], fill=GREEN_DOT)
        draw.text((dx + dw - 215, dy + 30), "Vault: notes 📁", fill=TEXT_WHITE, font=font_body)

        # Large High-Res Captured Slide Card
        slide_w = 780
        slide_h = int(slide_w * (slide_src.height / slide_src.width))
        slide_x = dx + 40
        slide_y = dy + 90

        # Animate Slide Card Entrance (Click happens at sc_f=20)
        if sc_f >= 20:
            card_p = min(1.0, max(0.01, (sc_f - 20) / 15.0))
            cur_sw = max(10, int(slide_w * ease_out_cubic(card_p)))
            cur_sh = max(10, int(slide_h * ease_out_cubic(card_p)))
            card_img = slide_src.resize((cur_sw, cur_sh))
            im.paste(card_img, (slide_x, slide_y))
            draw.rectangle([slide_x, slide_y, slide_x + cur_sw, slide_y + cur_sh], outline=ACCENT_BLUE, width=2)

            # Tooltip on hover
            if sc_f > 40:
                tip_box = [slide_x + 10, slide_y - 34, slide_x + 230, slide_y - 6]
                draw.rounded_rectangle(tip_box, radius=4, fill=(10, 10, 14), outline=ACCENT_CYAN, width=1)
                draw.text((slide_x + 22, slide_y - 28), "Click to jump to 00:01:58", fill=TEXT_WHITE, font=font_small)

            # Timestamp Badge
            ny = slide_y + cur_sh + 20
            draw.text((slide_x, ny), "▶ 00:01:58", fill=ACCENT_CYAN, font=font_h2)

            # Bullet Points Typed
            text_p = min(1.0, max(0.0, (sc_f - 45) / 30.0))
            if text_p > 0:
                draw.text((slide_x, ny + 55), "• A resource used to guide the learning process", fill=TEXT_WHITE, font=font_h3)
            if text_p > 0.5:
                draw.text((slide_x, ny + 100), "• Features an interactive playground to run code in a sandbox", fill=TEXT_WHITE, font=font_h3)

        # Side Vertical Tab Pill
        tab_x = slide_x + slide_w + 15
        draw.rounded_rectangle([tab_x, slide_y, tab_x + 40, slide_y + 90], radius=8, fill=(24, 24, 32), outline=BORDER_COLOR, width=1)
        draw.text((tab_x + 12, slide_y + 15), "📄", fill=TEXT_WHITE, font=font_small)
        draw.text((tab_x + 12, slide_y + 55), "〰", fill=TEXT_MUTED, font=font_small)

        # Camera button highlight & simulated cursor
        cam_x = dx + 380
        cam_y = dy + dh - 70
        draw.rounded_rectangle([cam_x, cam_y, cam_x + 60, cam_y + 44], radius=8, fill=(35, 45, 70) if sc_f < 25 else (24, 24, 32), outline=ACCENT_BLUE if sc_f < 25 else BORDER_COLOR, width=2)
        draw.text((cam_x + 18, cam_y + 8), "📷", fill=TEXT_WHITE, font=font_body)

        # Camera Flash
        if 20 <= sc_f <= 26:
            flash_alpha = int(140 * (1.0 - (sc_f - 20) / 6.0))
            flash_overlay = Image.new("RGBA", (WIDTH, HEIGHT), (255, 255, 255, flash_alpha))
            im = Image.alpha_composite(im.convert("RGBA"), flash_overlay).convert("RGB")
            draw = ImageDraw.Draw(im)

        # Bottom Mascot
        m_size = 54
        m_thumb = mascot_src.resize((m_size, m_size))
        im.paste(m_thumb, (dx + dw - 80, dy + dh - 80), m_thumb)

    # ============================================================
    # SCENE 4: OBSIDIAN VAULT SYNC (12.0s - 16.0s | Frames 361-480)
    # ============================================================
    elif f < 481:
        sc_f = f - 361
        draw.text((WIDTH//2 - 380, 40), "DIRECT LOCAL OBSIDIAN VAULT STREAMING", fill=ACCENT_CYAN, font=font_h2)
        draw.text((WIDTH//2 - 280, 95), "No cloud lock-in. Real Markdown files saved directly on your disk.", fill=TEXT_MUTED, font=font_body)

        ow, oh = 1500, 780
        ox = (WIDTH - ow) // 2
        oy = 160
        draw.rounded_rectangle([ox, oy, ox + ow, oy + oh], radius=14, fill=(16, 16, 22), outline=BORDER_COLOR, width=2)

        # Left File Sidebar (Obsidian Vault View)
        side_w = 360
        draw.rectangle([ox, oy, ox + side_w, oy + oh], fill=(20, 20, 28))
        draw.text((ox + 25, oy + 25), "OBSIDIAN VAULT: /notes", fill=TEXT_MUTED, font=font_badge)

        files = [
            ("📁 lectures/", TEXT_MUTED),
            ("  📄 golang-basics.md", ACCENT_CYAN),
            ("  📄 system-architecture.md", TEXT_WHITE),
            ("  📄 rust-concurrency.md", TEXT_WHITE),
            ("📁 attachments/", TEXT_MUTED),
            ("  🖼️ slide_00-01-58.png", TEXT_MUTED),
            ("  🖼️ terminal_exec.png", TEXT_MUTED),
        ]
        fy = oy + 70
        for name, col in files:
            draw.text((ox + 25, fy), name, fill=col, font=font_body)
            fy += 36

        # Right Markdown Document Stream
        doc_x = ox + side_w + 40
        doc_y = oy + 35
        draw.text((doc_x, doc_y), "# Complete Go Basics Walkthrough", fill=TEXT_WHITE, font=font_h2)
        draw.text((doc_x, doc_y + 50), "tags: #yrusika #youtube #golang #programming", fill=ACCENT_BLUE, font=font_mono)

        # Embedded Image Representation
        sw_sm = 440
        sh_sm = int(sw_sm * (slide_src.height / slide_src.width))
        slide_sm = slide_src.resize((sw_sm, sh_sm))
        im.paste(slide_sm, (doc_x, doc_y + 90))

        doc_text_y = doc_y + 90 + sh_sm + 20
        draw.text((doc_x, doc_text_y), "### Keyframe Insights [00:01:58]", fill=ACCENT_CYAN, font=font_h3)
        draw.text((doc_x, doc_text_y + 40), "• A resource used to guide the learning process", fill=TEXT_WHITE, font=font_body)
        draw.text((doc_x, doc_text_y + 75), "• Features an interactive playground to run code in sandbox", fill=TEXT_WHITE, font=font_body)

        # 3 Big Value Badges on Right
        badge_x = ox + ow - 420
        b_p1 = min(1.0, max(0.0, (sc_f - 10) / 15.0))
        b_p2 = min(1.0, max(0.0, (sc_f - 25) / 15.0))
        b_p3 = min(1.0, max(0.0, (sc_f - 40) / 15.0))

        if b_p1 > 0:
            by1 = oy + 120
            draw.rounded_rectangle([badge_x, by1, badge_x + 380, by1 + 60], radius=10, fill=(24, 32, 50), outline=ACCENT_BLUE, width=1)
            draw.text((badge_x + 20, by1 + 18), "✓ 100% Local File System Sync", fill=TEXT_WHITE, font=font_body)

        if b_p2 > 0:
            by2 = oy + 200
            draw.rounded_rectangle([badge_x, by2, badge_x + 380, by2 + 60], radius=10, fill=(24, 32, 50), outline=ACCENT_CYAN, width=1)
            draw.text((badge_x + 20, by2 + 18), "✓ Zero Telemetry & Tracking", fill=TEXT_WHITE, font=font_body)

        if b_p3 > 0:
            by3 = oy + 280
            draw.rounded_rectangle([badge_x, by3, badge_x + 380, by3 + 60], radius=10, fill=(24, 32, 50), outline=GREEN_DOT, width=1)
            draw.text((badge_x + 20, by3 + 18), "✓ Free Gemini 2.5 & Offline Ollama", fill=TEXT_WHITE, font=font_body)

        # Bottom Strike-Through Banner
        draw.rounded_rectangle([doc_x, doc_y + 580, doc_x + 600, doc_y + 640], radius=10, fill=(28, 20, 24), outline=(239, 68, 68), width=1)
        draw.text((doc_x + 30, doc_y + 600), "NO 20-MINUTE LIMITS · NO $15/MO SUBSCRIPTION", fill=(248, 113, 113), font=font_h3)

    # ========================================================
    # SCENE 5: OUTRO & CALL TO ACTION (16.0s - 20.0s | Frames 481-600)
    # ========================================================
    else:
        sc_f = f - 481
        p = min(1.0, sc_f / 25.0)

        # Radiant Glowing Aura for Mascot
        cx, cy = WIDTH // 2, 330
        aura_r = int(140 * ease_out_cubic(p))
        draw.ellipse([cx - aura_r, cy - aura_r, cx + aura_r, cy + aura_r], fill=(30, 60, 140))

        # Big Mascot
        m_big = 160
        m_img = mascot_src.resize((m_big, m_big))
        im.paste(m_img, (cx - m_big//2, cy - m_big//2), m_img)

        # Brand Title
        ty = cy + 120
        draw.text((WIDTH//2 - 170, ty), "Yrusika", fill=TEXT_WHITE, font=font_title)

        # Tagline
        draw.text((WIDTH//2 - 390, ty + 85), "The Open-Source AI Video Note Taker for Chrome", fill=ACCENT_CYAN, font=font_h2)

        # License Pill
        draw.rounded_rectangle([WIDTH//2 - 180, ty + 155, WIDTH//2 + 180, ty + 195], radius=20, fill=(20, 28, 45), outline=ACCENT_BLUE, width=1)
        draw.text((WIDTH//2 - 145, ty + 165), "MIT LICENSE · 100% FREE FOREVER", fill=TEXT_WHITE, font=font_badge)

        # Big CTA Button
        cta_y = ty + 230
        draw.rounded_rectangle([WIDTH//2 - 260, cta_y, WIDTH//2 + 260, cta_y + 64], radius=14, fill=ACCENT_BLUE)
        draw.text((WIDTH//2 - 200, cta_y + 16), "Load Unpacked & Start Studying", fill=TEXT_WHITE, font=font_h3)

        # GitHub URL
        draw.text((WIDTH//2 - 180, cta_y + 90), "github.com/tejuas98/yrusika", fill=TEXT_MUTED, font=font_body)

        # Fade out on final 15 frames
        if f >= 585:
            fade_p = (f - 585) / 15.0
            black = Image.new("RGB", (WIDTH, HEIGHT), (0, 0, 0))
            im = Image.blend(im, black, fade_p)

    # Save frame
    frame_path = os.path.join(FRAMES_DIR, f"frame_{f:04d}.png")
    im.save(frame_path)

    if f % 60 == 0:
        print(f"Rendered {f}/{TOTAL_FRAMES} frames ({f/TOTAL_FRAMES*100:.1f}%)")

print("Finished rendering all 600 frames!")
