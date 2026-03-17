#!/usr/bin/env python3
from pathlib import Path
from PIL import Image, ImageOps, ImageEnhance

ROOT = Path('/home/compuricky/projects/diego-rush-web')
SRC = Path('/home/compuricky/.openclaw/media/inbound/file_54---3d361e40-08fd-43b6-858a-a40453407620.jpg')
img = Image.open(SRC).convert('RGBA')


def cut(box):
    return img.crop(box).convert('RGBA')


def remove_black(im: Image.Image, threshold=32):
    px = im.load()
    w, h = im.size
    out = Image.new('RGBA', (w, h))
    op = out.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            m = max(r, g, b)
            if m < threshold:
                op[x, y] = (0, 0, 0, 0)
            else:
                op[x, y] = (r, g, b, 255)
    return out


def tighten(im: Image.Image):
    bbox = im.getbbox()
    if not bbox:
        return im
    return im.crop(bbox)


def fit_canvas(im: Image.Image, w: int, h: int, scale=1.0, y_offset=0):
    im = tighten(remove_black(im))
    tw, th = im.size
    ratio = min((w * scale) / max(tw, 1), (h * scale) / max(th, 1))
    nw, nh = max(1, int(tw * ratio)), max(1, int(th * ratio))
    im = im.resize((nw, nh), Image.Resampling.NEAREST)
    canvas = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    x = (w - nw) // 2
    y = h - nh + y_offset
    canvas.alpha_composite(im, (x, y))
    return canvas


def save(path: Path, im: Image.Image):
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path)
    print(path)


# --- Diego animation frames from middle character row ---
run_boxes = [
    (434, 164, 535, 308),
    (538, 164, 636, 308),
    (640, 164, 742, 308),
]
idle_box = (434, 164, 535, 308)
jump_box = (970, 160, 1082, 325)
fall_box = (1060, 160, 1210, 325)

run_frames = [fit_canvas(cut(b), 96, 128, scale=0.95, y_offset=-2) for b in run_boxes]
idle_frame = fit_canvas(cut(idle_box), 96, 128, scale=0.95, y_offset=-2)
jump_frame = fit_canvas(cut(jump_box), 96, 128, scale=0.9, y_offset=-2)
fall_frame = fit_canvas(cut(fall_box), 96, 128, scale=0.9, y_offset=-2)

run_sheet = Image.new('RGBA', (96 * 6, 128))
for i in range(6):
    run_sheet.alpha_composite(run_frames[i % len(run_frames)], (i * 96, 0))

idle_sheet = Image.new('RGBA', (96 * 4, 128))
for i in range(4):
    shift = -1 if i % 2 else 0
    fr = Image.new('RGBA', (96, 128), (0, 0, 0, 0))
    fr.alpha_composite(idle_frame, (0, shift))
    idle_sheet.alpha_composite(fr, (i * 96, 0))

jump_sheet = Image.new('RGBA', (96 * 2, 128))
jump_sheet.alpha_composite(jump_frame, (0, 0))
jump_sheet.alpha_composite(fall_frame, (96, 0))

save(ROOT / 'src/assets/sprites/diego/diego_run_sheet.png', run_sheet)
save(ROOT / 'src/assets/sprites/diego/diego_idle_sheet.png', idle_sheet)
save(ROOT / 'src/assets/sprites/diego/diego_jump_sheet.png', jump_sheet)

# --- obstacles/platform ruins ---
obs_a = fit_canvas(cut((712, 610, 790, 792)), 72, 220, scale=1.0, y_offset=-6)
obs_b = fit_canvas(cut((790, 615, 880, 804)), 72, 220, scale=1.0, y_offset=-6)
save(ROOT / 'src/assets/sprites/obstacles/obstacle_pillar_a.png', obs_a)
save(ROOT / 'src/assets/sprites/obstacles/obstacle_pillar_b.png', obs_b)

# pickup orb and ui accents
orb = fit_canvas(cut((486, 424, 566, 500)), 56, 56, scale=0.95)
save(ROOT / 'src/assets/sprites/pickups/pickup_orb.png', orb)

# decorative props for ambient world dressing
prop_fire = fit_canvas(cut((95, 420, 200, 520)), 96, 96, scale=0.9)
prop_crate = fit_canvas(cut((204, 420, 325, 530)), 96, 96, scale=0.92)
prop_plant = fit_canvas(cut((1082, 416, 1274, 550)), 128, 96, scale=0.95)
prop_skull = fit_canvas(cut((587, 364, 684, 442)), 96, 96, scale=0.92)
prop_torch = fit_canvas(cut((866, 565, 945, 684)), 96, 96, scale=0.9)
save(ROOT / 'src/assets/sprites/props/prop_fire.png', prop_fire)
save(ROOT / 'src/assets/sprites/props/prop_crate.png', prop_crate)
save(ROOT / 'src/assets/sprites/props/prop_plant.png', prop_plant)
save(ROOT / 'src/assets/sprites/props/prop_skull.png', prop_skull)
save(ROOT / 'src/assets/sprites/props/prop_torch.png', prop_torch)

# UI pack replacements using sheet accents
portrait = fit_canvas(cut((420, 20, 545, 130)), 112, 112, scale=0.95, y_offset=-4)
save(ROOT / 'src/assets/ui/diego_portrait.png', portrait)

heart = fit_canvas(cut((588, 364, 684, 442)), 48, 48, scale=0.9)
energy = fit_canvas(cut((441, 423, 499, 504)), 48, 48, scale=0.9)
coin = fit_canvas(cut((486, 424, 566, 500)), 48, 48, scale=0.9)
save(ROOT / 'src/assets/ui/icon_heart.png', heart)
save(ROOT / 'src/assets/ui/icon_energy.png', energy)
save(ROOT / 'src/assets/ui/icon_coin.png', coin)

# panel and logo accents from ruins/torch row
panel = cut((706, 552, 1070, 812)).resize((500, 340), Image.Resampling.NEAREST)
panel = ImageEnhance.Color(panel).enhance(0.95)
panel = ImageEnhance.Contrast(panel).enhance(1.06)
save(ROOT / 'src/assets/ui/panel_frame.png', panel)

logo = cut((8, 8, 390, 144)).resize((700, 210), Image.Resampling.NEAREST)
logo = remove_black(logo, threshold=24)
save(ROOT / 'src/assets/ui/logo_diego_rush.png', logo)

# background layers derived from same sheet for cohesive style
far = cut((0, 650, 640, 853)).resize((1024, 720), Image.Resampling.BILINEAR)
far = ImageEnhance.Color(far).enhance(0.55)
far = ImageEnhance.Brightness(far).enhance(0.42)

mid = cut((300, 560, 980, 853)).resize((1024, 720), Image.Resampling.BILINEAR)
mid = ImageEnhance.Color(mid).enhance(0.88)
mid = ImageEnhance.Brightness(mid).enhance(0.65)

near = cut((600, 520, 1280, 853)).resize((1024, 720), Image.Resampling.BILINEAR)
near = ImageEnhance.Color(near).enhance(1.08)
near = ImageEnhance.Contrast(near).enhance(1.1)

stars = Image.new('RGBA', (1024, 720), (10, 8, 15, 255))
for x, y in [(70, 40), (200, 120), (380, 85), (540, 30), (700, 150), (880, 70), (940, 210), (120, 260), (350, 220), (590, 260), (790, 250), (980, 300)]:
    for dx in range(-1, 2):
        for dy in range(-1, 2):
            sx, sy = x + dx, y + dy
            if 0 <= sx < 1024 and 0 <= sy < 720:
                stars.putpixel((sx, sy), (255, 220, 140, 220 if dx == 0 and dy == 0 else 120))

save(ROOT / 'src/assets/backgrounds/bg_far.png', far)
save(ROOT / 'src/assets/backgrounds/bg_mid.png', mid)
save(ROOT / 'src/assets/backgrounds/bg_near.png', near)
save(ROOT / 'src/assets/backgrounds/bg_stars.png', stars)
