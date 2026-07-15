"""Dark fantasy dungeon tileset generator (RPG Maker style, 32x32)."""
import random
from PIL import Image, ImageDraw

TILE = 32
rng = random.Random(42)  # deterministic

# ---- Dark fantasy palette (dungeon logbook tone) ----
P = {
    "void":      (10, 9, 14),
    "floor_d":   (44, 41, 52),
    "floor_m":   (56, 52, 66),
    "floor_l":   (70, 65, 82),
    "crack":     (30, 28, 38),
    "wall_d":    (28, 26, 36),
    "wall_m":    (58, 54, 70),
    "wall_l":    (84, 78, 98),
    "mortar":    (20, 18, 26),
    "walltop_m": (38, 35, 48),
    "walltop_l": (52, 48, 62),
    "wood_d":    (52, 34, 24),
    "wood_m":    (76, 50, 34),
    "wood_l":    (100, 68, 44),
    "iron":      (110, 108, 120),
    "iron_d":    (70, 68, 80),
    "water_d":   (16, 26, 44),
    "water_m":   (24, 40, 66),
    "water_l":   (44, 68, 100),
    "flame_o":   (232, 120, 32),
    "flame_y":   (250, 200, 80),
    "flame_r":   (180, 60, 20),
    "moss":      (46, 66, 42),
    "moss_l":    (62, 88, 54),
    "gold":      (196, 156, 60),
    "gold_l":    (232, 200, 110),
    "bone":      (190, 182, 160),
    "bone_d":    (140, 132, 112),
}

def new_tile(color):
    return Image.new("RGBA", (TILE, TILE), color + (255,))

def px(d, x, y, c):
    d.point((x, y), fill=c + (255,))

# ---------- 1. Stone floor ----------
def tile_floor(seed=0):
    r = random.Random(1000 + seed)
    img = new_tile(P["floor_m"])
    d = ImageDraw.Draw(img)
    # 16x16 flagstones with mortar lines
    for gy in range(2):
        for gx in range(2):
            ox, oy = gx * 16, gy * 16
            base = P["floor_m"] if r.random() < 0.6 else P["floor_d"]
            d.rectangle([ox, oy, ox + 15, oy + 15], fill=base + (255,))
            # highlight top-left edge
            d.line([ox, oy, ox + 15, oy], fill=P["floor_l"] + (255,))
            d.line([ox, oy, ox, oy + 15], fill=P["floor_l"] + (255,))
            # shadow bottom-right
            d.line([ox, oy + 15, ox + 15, oy + 15], fill=P["crack"] + (255,))
            d.line([ox + 15, oy, ox + 15, oy + 15], fill=P["crack"] + (255,))
            # noise speckles
            for _ in range(6):
                x, y = ox + r.randint(2, 13), oy + r.randint(2, 13)
                px(d, x, y, P["floor_l"] if r.random() < 0.5 else P["floor_d"])
    return img

# ---------- 2. Cracked floor ----------
def tile_floor_cracked():
    img = tile_floor(seed=7)
    d = ImageDraw.Draw(img)
    r = random.Random(77)
    x, y = 6, 8
    pts = [(x, y)]
    for _ in range(10):
        x += r.choice([1, 2]); y += r.choice([-1, 0, 1, 2])
        x, y = min(x, 30), max(2, min(y, 29))
        pts.append((x, y))
    d.line(pts, fill=P["crack"] + (255,), width=1)
    # branch
    bx, by = pts[4]
    d.line([bx, by, bx + 3, by + 5, bx + 4, by + 9], fill=P["crack"] + (255,))
    return img

# ---------- 3. Brick wall (front face) ----------
def tile_wall():
    img = new_tile(P["mortar"])
    d = ImageDraw.Draw(img)
    r = random.Random(3)
    bh = 8
    for row in range(4):
        offset = 0 if row % 2 == 0 else 8
        y0 = row * bh
        x = -offset
        while x < TILE:
            w = 16
            x0 = max(x, 0); x1 = min(x + w - 1, TILE - 1)
            if x1 > x0:
                shade = P["wall_m"] if r.random() < 0.7 else P["wall_d"]
                d.rectangle([x0, y0 + 1, x1 - 1, y0 + bh - 1], fill=shade + (255,))
                d.line([x0, y0 + 1, x1 - 1, y0 + 1], fill=P["wall_l"] + (255,))
                for _ in range(3):
                    sx, sy = r.randint(x0 + 1, max(x0 + 1, x1 - 2)), y0 + r.randint(2, bh - 2)
                    px(d, sx, sy, P["wall_d"])
            x += w
    return img

# ---------- 4. Wall top ----------
def tile_wall_top():
    img = new_tile(P["walltop_m"])
    d = ImageDraw.Draw(img)
    r = random.Random(4)
    for _ in range(40):
        px(d, r.randint(0, 31), r.randint(0, 31),
           P["walltop_l"] if r.random() < 0.5 else P["wall_d"])
    d.rectangle([0, 0, 31, 31], outline=P["wall_d"] + (255,))
    d.line([1, 1, 30, 1], fill=P["walltop_l"] + (255,))
    return img

# ---------- 5. Mossy wall ----------
def tile_wall_mossy():
    img = tile_wall()
    d = ImageDraw.Draw(img)
    r = random.Random(5)
    for _ in range(26):
        x, y = r.randint(0, 31), r.randint(0, 31)
        if r.random() < 0.65:
            c = P["moss"] if r.random() < 0.6 else P["moss_l"]
            px(d, x, y, c)
            if r.random() < 0.5:
                px(d, x + 1, y, c)
            if r.random() < 0.3:
                px(d, x, y + 1, P["moss"])
    return img

# ---------- 6. Wooden door ----------
def tile_door():
    img = tile_wall()
    d = ImageDraw.Draw(img)
    # arch opening
    d.rectangle([5, 6, 26, 31], fill=P["void"] + (255,))
    d.rectangle([6, 8, 25, 31], fill=P["wood_m"] + (255,))
    # planks
    for x in range(6, 26, 4):
        d.line([x, 8, x, 31], fill=P["wood_d"] + (255,))
    # plank highlights
    for x in range(7, 26, 4):
        d.line([x, 9, x, 30], fill=P["wood_l"] + (255,))
    # iron bands
    for y in (12, 24):
        d.line([6, y, 25, y], fill=P["iron_d"] + (255,))
        d.line([6, y - 1, 25, y - 1], fill=P["iron"] + (255,))
    # handle
    d.rectangle([21, 17, 23, 19], fill=P["iron"] + (255,))
    px(d, 22, 18, P["iron_d"])
    # arch top shading
    d.line([6, 8, 25, 8], fill=P["wood_d"] + (255,))
    d.line([5, 6, 26, 6], fill=P["wall_d"] + (255,))
    return img

# ---------- 7. Stairs down ----------
def tile_stairs():
    img = new_tile(P["void"])
    d = ImageDraw.Draw(img)
    steps = 5
    for i in range(steps):
        y0 = i * 6
        shade = max(0.35, 1.0 - i * 0.17)
        base = tuple(int(c * shade) for c in P["floor_l"])
        d.rectangle([2 + i, y0 + 2, 29 - i, y0 + 7], fill=base + (255,))
        d.line([2 + i, y0 + 2, 29 - i, y0 + 2],
               fill=tuple(min(255, int(c * shade * 1.4)) for c in P["floor_l"]) + (255,))
    d.rectangle([0, 0, 31, 31], outline=P["crack"] + (255,))
    return img

# ---------- 8. Water/abyss ----------
def tile_water():
    img = new_tile(P["water_d"])
    d = ImageDraw.Draw(img)
    r = random.Random(8)
    for band_y in (6, 14, 22, 28):
        x = r.randint(0, 8)
        while x < TILE:
            ln = r.randint(3, 7)
            c = P["water_l"] if r.random() < 0.35 else P["water_m"]
            d.line([x, band_y, min(x + ln, 31), band_y], fill=c + (255,))
            x += ln + r.randint(4, 9)
    return img

# ---------- 9. Torch wall ----------
def tile_torch():
    img = tile_wall()
    d = ImageDraw.Draw(img)
    # sconce
    d.rectangle([14, 18, 17, 21], fill=P["iron_d"] + (255,))
    d.line([15, 14, 15, 18], fill=P["wood_d"] + (255,))
    d.line([16, 14, 16, 18], fill=P["wood_m"] + (255,))
    # flame
    flame = [(15, 8), (16, 8), (14, 9), (17, 9), (14, 10), (17, 10),
             (14, 11), (17, 11), (15, 12), (16, 12), (15, 13), (16, 13)]
    for (x, y) in flame:
        px(d, x, y, P["flame_o"])
    for (x, y) in [(15, 10), (16, 10), (15, 11), (16, 11), (15, 12), (16, 12)]:
        px(d, x, y, P["flame_y"])
    for (x, y) in [(14, 8), (17, 8), (13, 10), (18, 10)]:
        px(d, x, y, P["flame_r"])
    # glow on bricks
    glow = (96, 74, 60)
    for (x, y) in [(12, 12), (19, 12), (11, 16), (20, 16), (13, 20), (18, 20)]:
        px(d, x, y, glow)
    return img

# ---------- 10. Chest ----------
def tile_chest():
    img = tile_floor(seed=3)
    d = ImageDraw.Draw(img)
    # shadow
    d.rectangle([6, 24, 26, 26], fill=P["crack"] + (255,))
    # body
    d.rectangle([6, 14, 25, 24], fill=P["wood_m"] + (255,))
    d.rectangle([6, 10, 25, 14], fill=P["wood_l"] + (255,))  # lid
    d.line([6, 14, 25, 14], fill=P["wood_d"] + (255,))
    # planks
    for y in (17, 20, 23):
        d.line([7, y, 24, y], fill=P["wood_d"] + (255,))
    # iron corners
    for x0 in (6, 24):
        d.rectangle([x0, 10, x0 + 1, 24], fill=P["iron_d"] + (255,))
    # lock
    d.rectangle([14, 13, 17, 17], fill=P["gold"] + (255,))
    px(d, 15, 14, P["gold_l"]); px(d, 16, 14, P["gold_l"])
    px(d, 15, 16, P["wood_d"])
    return img

# ---------- 11. Bones (decor) ----------
def tile_bones():
    img = tile_floor(seed=11)
    d = ImageDraw.Draw(img)
    # skull
    d.rectangle([9, 12, 15, 17], fill=P["bone"] + (255,))
    d.rectangle([10, 18, 14, 19], fill=P["bone_d"] + (255,))
    px(d, 10, 14, P["void"]); px(d, 11, 14, P["void"])
    px(d, 13, 14, P["void"]); px(d, 14, 14, P["void"])
    px(d, 12, 16, P["bone_d"])
    # scattered bones
    d.line([19, 20, 24, 23], fill=P["bone"] + (255,), width=1)
    px(d, 18, 19, P["bone"]); px(d, 25, 24, P["bone"])
    d.line([20, 13, 24, 12], fill=P["bone_d"] + (255,))
    return img

# ---------- 12. Pillar ----------
def tile_pillar():
    img = tile_floor(seed=5)
    d = ImageDraw.Draw(img)
    # shadow
    d.ellipse([8, 26, 24, 30], fill=P["crack"] + (255,))
    # shaft
    d.rectangle([11, 6, 20, 27], fill=P["wall_m"] + (255,))
    d.line([11, 6, 11, 27], fill=P["wall_l"] + (255,))
    d.line([20, 6, 20, 27], fill=P["wall_d"] + (255,))
    d.line([12, 6, 12, 27], fill=P["wall_l"] + (255,))
    # capital & base
    d.rectangle([9, 3, 22, 6], fill=P["wall_l"] + (255,))
    d.rectangle([9, 26, 22, 28], fill=P["wall_m"] + (255,))
    d.line([9, 28, 22, 28], fill=P["wall_d"] + (255,))
    # cracks
    d.line([14, 10, 15, 14, 14, 18], fill=P["wall_d"] + (255,))
    return img

TILES = [
    ("floor",        tile_floor),
    ("floor_crack",  tile_floor_cracked),
    ("wall",         tile_wall),
    ("wall_top",     tile_wall_top),
    ("wall_moss",    tile_wall_mossy),
    ("door",         tile_door),
    ("stairs",       tile_stairs),
    ("water",        tile_water),
    ("torch",        tile_torch),
    ("chest",        tile_chest),
    ("bones",        tile_bones),
    ("pillar",       tile_pillar),
]

def main():
    cols, rows = 4, 3
    sheet = Image.new("RGBA", (cols * TILE, rows * TILE), (0, 0, 0, 0))
    for i, (name, fn) in enumerate(TILES):
        t = fn()
        sheet.paste(t, ((i % cols) * TILE, (i // cols) * TILE))
    sheet.save("/home/claude/dungeon_tileset_32.png")

    # 4x preview
    sheet.resize((sheet.width * 4, sheet.height * 4), Image.NEAREST) \
         .save("/home/claude/dungeon_tileset_preview_4x.png")

    # sample map render
    F, C, W, T, M, D, S, A, O, X, B, L = range(12)
    tiles_img = [fn() for _, fn in TILES]
    MAP = [
        [T, T, W, M, O, W, W, T, T, T],
        [T, W, W, W, D, W, M, W, W, T],
        [W, W, F, F, F, F, C, F, W, W],
        [W, F, F, L, F, F, F, F, F, W],
        [W, F, B, F, F, X, F, C, F, W],
        [W, F, F, F, A, A, F, F, S, W],
        [W, W, F, F, A, A, F, W, W, W],
        [T, W, W, F, F, F, W, W, T, T],
    ]
    mp = Image.new("RGBA", (len(MAP[0]) * TILE, len(MAP) * TILE))
    for y, row in enumerate(MAP):
        for x, t in enumerate(row):
            mp.paste(tiles_img[t], (x * TILE, y * TILE))
    mp.resize((mp.width * 3, mp.height * 3), Image.NEAREST) \
      .save("/home/claude/dungeon_map_sample_3x.png")
    print("done")

if __name__ == "__main__":
    main()
