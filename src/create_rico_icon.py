from pathlib import Path
import sys
from PIL import Image, ImageDraw

size = 512
scale = size / 64
image = Image.new("RGBA", (size, size))
draw = ImageDraw.Draw(image)
draw.rounded_rectangle((0, 0, size - 1, size - 1), radius=17 * scale, fill="#ffad79")

def contour(start, segments):
    points = [start]
    for segment in segments:
        if len(segment) == 2:
            points.append(segment)
            continue
        x0, y0 = points[-1]
        x1, y1, x2, y2, x3, y3 = segment
        for index in range(1, 25):
            t = index / 24
            s = 1 - t
            points.append((
                s**3*x0 + 3*s*s*t*x1 + 3*s*t*t*x2 + t**3*x3,
                s**3*y0 + 3*s*s*t*y1 + 3*s*t*t*y2 + t**3*y3,
            ))
    return [(x * scale, y * scale) for x, y in points]

# Vector contours from assets/rico.svg.
draw.polygon(contour((17, 15), [
    (33, 15), (42, 15, 47, 20, 47, 27), (47, 32, 44, 36, 40, 38),
    (49, 49), (38, 49), (27, 36), (27, 49), (17, 49),
]), fill="#191731")
draw.polygon(contour((27, 23), [
    (27, 31), (32, 31), (35, 31, 37, 30, 37, 27),
    (37, 24, 35, 23, 32, 23),
]), fill="#ffad79")
draw.ellipse(tuple(value * scale for value in (45, 13, 51, 19)), fill="#191731")

root = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("outputs/Rico Browser")
icon = root / "assets/rico.ico"
image.save(icon, sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
from shutil import copyfile
window_icon = root / "browser/browser/chrome/icons/default/main-window.ico"
window_icon.parent.mkdir(parents=True, exist_ok=True)
copyfile(icon, window_icon)
