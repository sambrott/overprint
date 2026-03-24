# Overprint — Free Design Tool Suite

A free, browser-based suite of 16 design tools. Everything runs client-side — no uploads, no servers, no accounts.

## Quick Start
Serve the **`public/`** folder (required — `fetch` loads `about.html` and `tools/*.html`; **`file://` will not work**).

**Option A — from project root `overprint/` (recommended):**
```bash
npm start
# or: python3 -m http.server 8080 --bind 127.0.0.1 --directory public
# open http://127.0.0.1:8080/#/
```

**Option B — Python, `public` as cwd:**
```bash
cd public && python3 -m http.server 8080 --bind 127.0.0.1
# open http://127.0.0.1:8080/#/
```

**If you started the server from the repo root** (parent of `public/`), open **`http://localhost:PORT/`** — the root `index.html` redirects into `public/index.html#/`.

For **GitHub Pages** (branch builds), GitHub only serves from the repo **root** or **`/docs`**. Options: copy or symlink `public/*` into `docs/`, make `public/` your root via a small deploy Action, or host `public/` on Netlify/Vercel/Cloudflare Pages with that folder as the publish directory.

Open `public/index.html` only works for a quick static peek; use a server for routing (`#/about`, `#/tools/...`).

### Troubleshooting (“nothing works” / blank tools)
1. **Use the URL with a hash:** open **`http://localhost:PORT/#/`** (not only `/`).
2. **Document root must be `public/`** — if the server root is the repo folder, paths like `/about.html` will 404. Either `cd public` before starting the server, or set the host’s “publish directory” to `public`.
3. **Hard refresh** after code changes: `Cmd+Shift+R` (Mac) / `Ctrl+Shift+R` (Windows).
4. Open **DevTools → Console** and **Network**: look for red errors (failed `js/*.js` or `about.html` / `tools/*.html`).
5. A **red banner** under the nav means JS failed to boot — read the message and the console.

## GitHub — new repository
This folder is not initialized from Cursor’s environment. To create a **new** remote repo and push from your Mac, follow **`PUSH-NEW-REPO.md`** (or use `gh repo create` after `gh auth login`).

## Building
Read `CURSOR-PROMPT.md` for full build instructions, tool specs, and design system documentation.

External **reference implementations** (ideas only; Overprint stays dependency-free) are listed in **`REFERENCES.md`**.

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
