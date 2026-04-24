"""Generate Biz-Salama branded PWA icons (shield + gold accent on dark ink navy).
Replaces the default Create-React-App React atom PNGs.

Outputs:
- /app/frontend/public/favicon.ico  (multi-res: 16, 32, 48, 64)
- /app/frontend/public/logo192.png  (192x192)
- /app/frontend/public/logo512.png  (512x512)
- /app/frontend/public/apple-touch-icon.png (180x180, for iOS home-screen)
"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from pathlib import Path

PUBLIC = Path("/app/frontend/public")

# Brand colors
INK_900 = (15, 23, 42)         # dark navy background
GOLD_500 = (245, 158, 11)      # gold primary
GOLD_400 = (251, 191, 36)      # gold light
EMERALD = (16, 185, 129)       # emerald checkmark
WHITE = (255, 255, 255)


def draw_shield(size: int) -> Image.Image:
    """Draw a gold shield with a subtle checkmark on a dark navy rounded-square background."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Rounded-square background
    pad = int(size * 0.02)
    radius = int(size * 0.22)
    draw.rounded_rectangle(
        [pad, pad, size - pad, size - pad],
        radius=radius,
        fill=INK_900,
    )

    # Subtle gold gradient ring on the shield — approximate with a few radial layers
    cx, cy = size / 2, size / 2

    # Shield outline points (classic heater shield)
    w = size * 0.56
    h = size * 0.62
    left = cx - w / 2
    right = cx + w / 2
    top = cy - h / 2 + size * 0.02
    bottom = cy + h / 2

    # Shield path: rounded top, pointed bottom
    shield_outer = [
        (left, top + w * 0.08),
        (left, top + w * 0.3),
        (left, bottom - h * 0.15),
        (cx, bottom),
        (right, bottom - h * 0.15),
        (right, top + w * 0.3),
        (right, top + w * 0.08),
    ]
    # Use polygon with rounded corners via two-pass
    gold_layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    gld = ImageDraw.Draw(gold_layer)

    # Outer gold shield
    gld.polygon(shield_outer, fill=GOLD_500)
    # Rounded top arc
    gld.pieslice([left, top - size * 0.02, right, top + w * 0.45], 180, 360, fill=GOLD_500)

    # Inner darker gold gradient stripe
    inset = size * 0.06
    shield_inner = [
        (left + inset, top + w * 0.12),
        (left + inset, top + w * 0.3),
        (left + inset, bottom - h * 0.17 - inset / 2),
        (cx, bottom - inset * 1.4),
        (right - inset, bottom - h * 0.17 - inset / 2),
        (right - inset, top + w * 0.3),
        (right - inset, top + w * 0.12),
    ]
    gld.polygon(shield_inner, fill=GOLD_400)
    gld.pieslice(
        [left + inset, top + size * 0.02, right - inset, top + w * 0.42],
        180, 360, fill=GOLD_400,
    )

    # Emerald checkmark centered on shield
    check_w = size * 0.38
    check_h = size * 0.28
    ccx, ccy = cx, cy + size * 0.04
    thickness = max(int(size * 0.08), 4)
    # Two-segment check: short diagonal then long diagonal
    p1 = (ccx - check_w / 2, ccy)
    p2 = (ccx - check_w / 6, ccy + check_h / 2.5)
    p3 = (ccx + check_w / 2, ccy - check_h / 2)
    gld.line([p1, p2], fill=WHITE, width=thickness, joint="curve")
    gld.line([p2, p3], fill=WHITE, width=thickness, joint="curve")
    # Re-cap with round endpoints
    r = thickness // 2
    for pt in (p1, p2, p3):
        gld.ellipse([pt[0] - r, pt[1] - r, pt[0] + r, pt[1] + r], fill=WHITE)

    # Soft inner shadow on the shield for depth
    shadow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(shadow)
    sdraw.polygon(shield_outer, outline=(0, 0, 0, 80))
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=max(1, size // 180)))

    img = Image.alpha_composite(img, gold_layer)
    img = Image.alpha_composite(img, shadow)
    return img


def main():
    # 512
    big = draw_shield(512)
    big.save(PUBLIC / "logo512.png", optimize=True)

    # 192 (high-quality downscale from 512)
    big.resize((192, 192), Image.LANCZOS).save(PUBLIC / "logo192.png", optimize=True)

    # 180 apple-touch-icon (rounded corners are applied by iOS itself, but we keep square)
    big.resize((180, 180), Image.LANCZOS).save(PUBLIC / "apple-touch-icon.png", optimize=True)

    # Favicon.ico — multi-resolution
    ico_sizes = [(16, 16), (32, 32), (48, 48), (64, 64)]
    variants = [big.resize(s, Image.LANCZOS) for s in ico_sizes]
    variants[0].save(
        PUBLIC / "favicon.ico",
        format="ICO",
        sizes=ico_sizes,
        append_images=variants[1:],
    )

    print("✓ Generated Biz-Salama branded icons:")
    for p in ("logo512.png", "logo192.png", "apple-touch-icon.png", "favicon.ico"):
        fp = PUBLIC / p
        print(f"   {p} ({fp.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
