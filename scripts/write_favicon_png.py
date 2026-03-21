#!/usr/bin/env python3
"""Write 120x120 RGBA PNG (Overprint cyan circle) without Pillow."""
import struct
import zlib
from pathlib import Path

W = H = 120
CX = CY = 60
R = 56
CYAN = (0, 180, 216, 255)


def pixel(x, y):
    dx, dy = x - CX, y - CY
    if dx * dx + dy * dy <= R * R:
        return CYAN
    return (0, 0, 0, 0)


def png_bytes():
    raw = bytearray()
    for y in range(H):
        raw.append(0)  # filter: None
        for x in range(W):
            r, g, b, a = pixel(x, y)
            raw.extend((r, g, b, a))
    compressed = zlib.compress(bytes(raw), 9)

    def chunk(tag, data):
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    ihdr = struct.pack(">IIBBBBB", W, H, 8, 6, 0, 0, 0)
    out = bytearray(b"\x89PNG\r\n\x1a\n")
    out.extend(chunk(b"IHDR", ihdr))
    out.extend(chunk(b"IDAT", compressed))
    out.extend(chunk(b"IEND", b""))
    return bytes(out)


def ico_with_png(png: bytes) -> bytes:
    """Single 120×120 icon entry embedding PNG (Vista+)."""
    w, h = W, H
    entry = struct.pack(
        "<BBBBHHII",
        w if w < 256 else 0,
        h if h < 256 else 0,
        0,
        0,
        1,
        32,
        len(png),
        22,
    )
    header = struct.pack("<HHH", 0, 1, 1)
    return header + entry + png


def main():
    root = Path(__file__).resolve().parents[1]
    pub = root / "public"
    png = png_bytes()
    ico = ico_with_png(png)
    (pub / "favicon.png").write_bytes(png)
    (pub / "favicon.ico").write_bytes(ico)
    print("wrote", pub / "favicon.png", len(png), "bytes")
    print("wrote", pub / "favicon.ico", len(ico), "bytes")


if __name__ == "__main__":
    main()
