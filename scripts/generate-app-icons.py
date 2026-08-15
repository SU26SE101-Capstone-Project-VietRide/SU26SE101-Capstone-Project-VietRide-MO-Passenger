"""Generate launcher, adaptive, and notification icons from the chat FAB logo."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "src" / "assets" / "images" / "app_logo_placeholder.png"
IMAGES = ROOT / "src" / "assets" / "images"
ANDROID_RES = ROOT / "android" / "app" / "src" / "main" / "res"
BG = (239, 247, 248, 255)

DENSITIES = {
    "mdpi": 1,
    "hdpi": 1.5,
    "xhdpi": 2,
    "xxhdpi": 3,
    "xxxhdpi": 4,
}


def crop_opaque(image: Image.Image, alpha_threshold: int = 8) -> Image.Image:
    alpha = image.getchannel("A")
    bbox = alpha.point(lambda value: 255 if value > alpha_threshold else 0).getbbox()
    return image.crop(bbox) if bbox else image


def contain(image: Image.Image, size: int) -> Image.Image:
    fitted = image.copy()
    fitted.thumbnail((size, size), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.paste(fitted, ((size - fitted.width) // 2, (size - fitted.height) // 2), fitted)
    return canvas


def cover_on_background(image: Image.Image, size: int, background: tuple[int, int, int, int]) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), background)
    scaled = contain(image, size)
    canvas.alpha_composite(scaled)
    return canvas


def circular_mask(size: int) -> Image.Image:
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, size - 1, size - 1), fill=255)
    return mask


def make_round(image: Image.Image) -> Image.Image:
    rounded = image.copy()
    rounded.putalpha(circular_mask(image.width))
    return rounded


def make_silhouette(image: Image.Image, size: int) -> Image.Image:
    """White glyph from the mascot, suitable for Android status-bar small icons."""
    source = contain(crop_opaque(image), size)
    pixels = source.load()
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    dest = out.load()
    for y in range(size):
        for x in range(size):
            red, green, blue, alpha = pixels[x, y]
            if alpha < 40:
                continue
            # Keep the warmer mascot / helmet / wheel, drop the teal cabin wash.
            is_teal_wash = green > red + 18 and green > blue - 8 and red < 170
            if is_teal_wash:
                continue
            dest[x, y] = (255, 255, 255, alpha)

    # Close small holes so the 24dp glyph stays readable.
    alpha = out.getchannel("A").filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.MinFilter(3))
    white = Image.new("RGBA", (size, size), (255, 255, 255, 255))
    return Image.composite(white, Image.new("RGBA", (size, size), (0, 0, 0, 0)), alpha)


def save_png(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, "PNG", optimize=True)


def save_webp(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, "WEBP", quality=95, method=6)


def main() -> None:
    logo = crop_opaque(Image.open(SOURCE).convert("RGBA"))

    app_icon = cover_on_background(logo, 1024, BG)
    save_png(app_icon, IMAGES / "app_icon.png")

    # Adaptive foreground: mascot occupies the 66% safe zone.
    foreground = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    mascot = contain(logo, 720)
    foreground.alpha_composite(mascot, ((1024 - 720) // 2, (1024 - 720) // 2))
    save_png(foreground, IMAGES / "app_icon_adaptive_foreground.png")

    notification_preview = cover_on_background(logo, 256, BG)
    save_png(make_round(notification_preview), IMAGES / "notification_large_icon.png")

    silhouette_master = make_silhouette(logo, 192)
    save_png(silhouette_master, IMAGES / "notification_icon.png")

    for name, scale in DENSITIES.items():
        launcher = cover_on_background(logo, int(48 * scale), BG)
        save_webp(launcher, ANDROID_RES / f"mipmap-{name}" / "ic_launcher.webp")
        save_webp(make_round(launcher), ANDROID_RES / f"mipmap-{name}" / "ic_launcher_round.webp")

        adaptive = Image.new("RGBA", (int(108 * scale), int(108 * scale)), (0, 0, 0, 0))
        glyph = contain(logo, int(72 * scale))
        offset = (adaptive.width - glyph.width) // 2
        adaptive.alpha_composite(glyph, (offset, offset))
        save_webp(adaptive, ANDROID_RES / f"mipmap-{name}" / "ic_launcher_foreground.webp")

        small = contain(silhouette_master, int(24 * scale))
        save_png(small, ANDROID_RES / f"drawable-{name}" / "ic_stat_notification.png")

        splash = contain(logo, int(160 * scale))
        save_png(splash, ANDROID_RES / f"drawable-{name}" / "splashscreen_logo.png")

    # mdpi fallback name without density qualifier, used by some OEM lookups.
    save_png(contain(silhouette_master, 24), ANDROID_RES / "drawable" / "ic_stat_notification.png")
    save_png(make_round(cover_on_background(logo, 192, BG)), ANDROID_RES / "drawable" / "notification_large_icon.png")

    print("generated launcher, splash, and notification icons from app_logo_placeholder.png")


if __name__ == "__main__":
    main()
