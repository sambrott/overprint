# Overprint — Free Design Tool Suite

A free, browser-based suite of 16 design tools. Everything runs client-side — no uploads, no servers, no accounts.

## Quick Start
Serve the `public/` folder with any static server (hash routes and tool/about pages use `fetch`, which does not work from `file://`):

```bash
cd public && python3 -m http.server 8080
# open http://localhost:8080/#/
```

For **GitHub Pages** (branch builds), GitHub only serves from the repo **root** or **`/docs`**. Options: copy or symlink `public/*` into `docs/`, make `public/` your root via a small deploy Action, or host `public/` on Netlify/Vercel/Cloudflare Pages with that folder as the publish directory.

Open `public/index.html` only works for a quick static peek; use a server for routing (`#/about`, `#/tools/...`).

## GitHub — new repository
This folder is not initialized from Cursor’s environment. To create a **new** remote repo and push from your Mac, follow **`PUSH-NEW-REPO.md`** (or use `gh repo create` after `gh auth login`).

## Building
Read `CURSOR-PROMPT.md` for full build instructions, tool specs, and design system documentation.

## Tools
1. Grid Crop — Batch auto-crop with focal-point detection
2. Carousel Maker — Seamless multi-panel carousels
3. Color Lab — Palette generation, contrast, conversion
4. Social Sizer — Resize for every platform in one click
5. Image Toolbox — Compress, resize, convert formats
6. CSS Generator — Gradients, shadows, noise, glassmorphism
7. Font Pair — Google Fonts browser with smart pairing
8. Beat Maker — Simple loop-based music for video
9. Contrast Checker — WCAG AA/AAA accessibility testing
10. Favicon Forge — Create favicons, export as ICO + PNG
11. Noise & Texture — SVG/PNG grain and texture generator
12. Placeholder Hub — Lorem ipsum, dummy images, fake data
13. Screenshot Beautifier — Backgrounds, frames, shadows
14. Image Optimizer — Compress and optimize PNG, JPG, WebP, and SVG
15. QR Code Generator — Custom colors, embedded logo
16. Aspect Ratio Calculator — Ratios, scaling, DPI conversion

## Tech
- Vanilla HTML, CSS, JavaScript
- No frameworks, no build tools, no dependencies
- Canvas API for image processing
- Web Audio API for beat maker
- Google Fonts API for font pair tool

## License
TBD
