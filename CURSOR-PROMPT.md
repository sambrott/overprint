# CURSOR PROMPT — Overprint: Design Tool Suite

## What This Project Is
Overprint is a free, browser-based design tool suite. It is a single website that hosts 16 individual tools for graphic designers and content creators. Every tool runs 100% client-side — no server uploads, no accounts, no backend. Files never leave the user's device.

The homepage (`public/index.html`) is the working prototype of the tool dashboard. Your job is to build this into a fully functional site with all 16 tools working.

---

## Tech Stack
- **NO frameworks.** Vanilla HTML, CSS, and JavaScript only. No React, no Vue, no build tools, no bundlers.
- **CSS:** Use CSS custom properties (variables) defined in the prototype. All styles follow the existing design system.
- **JS:** Vanilla ES6+. Use Canvas API for image processing, Web Audio API for the beat maker. Use Web Workers for heavy processing to keep UI responsive.
- **Fonts:** Google Fonts — Syne (display/headings) and IBM Plex Mono (body/UI).
- **No dependencies** unless absolutely necessary. If you must use a library, prefer a single-file CDN include (e.g., JSZip for ZIP export).

---

## Design System — DO NOT DEVIATE

### Colors (CMYK-based)
```
--bg: #08080c          (page background)
--s1: #0e0e13          (card/surface background)
--s2: #131318          (raised surface)
--border: #1e1e26      (default borders)
--border-hi: #2e2e38   (hover/active borders)
--text: #b8b8c4        (body text)
--text-hi: #e4e4ea     (headings, bright text)
--text-lo: #7e7e8e     (secondary text)
--text-faint: #50505c  (labels, muted)
--C: #00b4d8           (Cyan — Image tools)
--M: #e040a0           (Magenta — Create tools)
--Y: #f0d020           (Yellow — Color tools)
--K: #b8b8c4           (Key — Type tools + neutral accent)
```

### Category → Color Mapping (dashboard filters = CMYK + All)
| Category | CMYK | Tools |
|----------|------|-------|
| Image | **C** Cyan | Grid Crop, Social Sizer, Image Toolbox, Image Optimizer, Favicon Forge, Aspect Ratio Calculator |
| Create | **M** Magenta | Carousel Maker, CSS Generator, Beat Maker, Noise & Texture, Placeholder Hub, Screenshot Beautifier, QR Code Generator |
| Color | **Y** Yellow | Color Lab, Contrast Checker |
| Type | **K** Key | Font Pair |

### Typography
- **Display/Headings:** Syne, weight 700-800, uppercase, tight letter-spacing (-1px to -2px), line-height 0.88-1.0
- **Body/Content:** IBM Plex Mono, weight 400, 13-14px, line-height 1.6-1.9
- **Labels/Tags:** IBM Plex Mono, weight 600-700, 8-10px, uppercase, letter-spacing 2-3px
- **UI Elements:** IBM Plex Mono, weight 500, 10-11px

### Component Patterns
- **Cards:** Background `--s1`, border `--border`, 1px. On hover: border goes to `--border-hi`, 3px top stripe wipes in with category color, background tints with category color at 6% opacity.
- **Buttons:** Syne 700, uppercase, letter-spacing 3px, padding 14px 28px. Primary uses category color as background. Ghost uses transparent with `--border` border.
- **Filter Chips:** IBM Plex Mono 500, 10px, uppercase, border `--border-hi`. Active state uses category color for text and border.
- **Inputs:** Background `--bg`, border `--border`, IBM Plex Mono 400, 13px. Focus state: border goes to category color.

### Layout
- **Max width:** 1200px, centered
- **Page padding:** 28px (14px on mobile)
- **Grid gap:** 3px
- **Tool grid:** Exactly 4 columns on desktop, 2 on tablet (<900px), 1 on phone (<480px)

---

## Navigation & Routing

### Structure
The site is a single-page app with hash-based routing:
- `#/` or `#/tools` — Tool dashboard (the homepage grid)
- `#/tools/grid-crop` — Individual tool page
- `#/tools/carousel-maker` — Individual tool page
- `#/about` — About page
- etc.

### Navigation Behavior
- Clicking a tool card navigates to that tool's page
- The nav bar persists across all pages
- The logo (4 skewed CMYK parallelograms) is always visible. On desktop, hovering reveals "OVERPRINT" text sliding in from the left. On mobile (<640px), the wordmark is hidden entirely — just show the logo.
- "About" button sits in the nav on the right side next to "v1.0"
- When on a tool page, show a back arrow/button to return to the dashboard

### Tool Card Preview Behavior
- Each tool card on the dashboard has a preview area at the top (130px tall)
- The preview contains an animation representing what the tool does
- **DEFAULT STATE:** Preview is greyscale, dimmed (brightness 0.4), and animations are paused
- **HOVER STATE:** Preview transitions to full color, full brightness, and animations play
- This is achieved with CSS `filter: grayscale(1) brightness(0.4)` and `animation-play-state: paused` on the `.tc-anim` container, toggled on hover
- On mobile, previews should show in color by default (no hover state available)

---

## The 16 Tools — Specifications

### 01. Grid Crop (Image / Cyan)
**Purpose:** Batch auto-crop multiple images to a uniform aspect ratio with smart focal-point detection. Preview as an Instagram grid.
**How it works:**
1. User drops in 1-20 images (drag & drop or file picker)
2. Selects target aspect ratio: 4:5 (Instagram portrait), 1:1 (square), 16:9 (landscape), 9:16 (story), or custom
3. Each image is analyzed for focal point (use center-of-contrast algorithm or simple face detection heuristic)
4. Images are cropped to the target ratio, centered on the focal point
5. User can click any image to manually adjust the crop center
6. Grid preview shows how images will look tiled (3-column Instagram grid layout)
7. Export all as ZIP (individually named) or download individually
**Tech:** Canvas API for image processing, JSZip for ZIP export

### 02. Carousel Maker (Create / Magenta)
**Purpose:** Create seamless, continuous carousel graphics for Instagram.
**How it works:**
1. Two modes:
   - **Slice mode:** Upload one wide image → tool slices it into N equal panels (user picks 2-10)
   - **Build mode:** Create slides individually with text/shapes, with alignment guides that span across panels
2. Canvas shows all panels side by side with visible panel boundaries
3. Edge-bleed preview shows how adjacent panels connect
4. Swipe simulation preview (animated, mimics Instagram swipe)
5. Export as individual numbered images or ZIP
**Tech:** Canvas API, drag interactions

### 03. Color Lab (Color / Yellow)
**Purpose:** All-in-one color tool.
**Features:**
- **Palette Generator:** Random (spacebar to regenerate), from image (upload → extract dominant colors), from hex (enter one color → generate harmonious palette via color theory rules: complementary, analogous, triadic, split-complementary)
- **Contrast Checker:** Input foreground + background → show WCAG AA/AAA pass/fail with ratio
- **Color Blindness Simulator:** Show how a color pair looks under protanopia, deuteranopia, tritanopia
- **Format Converter:** Input any format (HEX, RGB, HSL, CMYK) → show all other formats. Live updating.
- **Gradient Builder:** Pick 2-4 colors, angle, type (linear/radial/conic) → preview + copy CSS
**Tech:** Color math in pure JS, Canvas for image color extraction

### 04. Social Sizer (Image / Cyan)
**Purpose:** Resize one image for every major social media platform at once.
**How it works:**
1. Upload one image
2. See live previews of how it looks cropped to each platform's dimensions:
   - Instagram Feed (1080×1350), Story (1080×1920), Square (1080×1080)
   - Facebook Post (1200×630), Cover (820×312)
   - X/Twitter Post (1200×675), Header (1500×500)
   - LinkedIn Post (1200×627), Banner (1584×396)
   - YouTube Thumbnail (1280×720)
   - Pinterest Pin (1000×1500)
3. Each preview shows safe-zone guides (where text/faces should be)
4. User can adjust crop position per platform
5. Export all as ZIP or select specific platforms
**Tech:** Canvas API, JSZip

### 05. Image Toolbox (Image / Cyan)
**Purpose:** Compress, resize, and convert images.
**Features:**
- **Compress:** Quality slider (1-100), live file size preview, before/after comparison
- **Resize:** By pixels, percentage, or preset dimensions. Lock aspect ratio toggle.
- **Convert:** PNG ↔ JPG ↔ WebP ↔ AVIF. Batch support (drop multiple files).
- **Crop:** Freeform or preset aspect ratios
- **Flip/Rotate:** 90° increments, horizontal/vertical flip
**Tech:** Canvas API, `canvas.toBlob()` with quality parameter

### 06. CSS Generator (Create / Magenta)
**Purpose:** Visual generators for common CSS properties.
**Sub-tools (tabbed interface):**
- **Gradient:** Linear, radial, conic. Color stops, angle control. Live preview + copy CSS.
- **Shadow:** Box-shadow and text-shadow. Multiple layers. Visual controls for offset, blur, spread, color.
- **Border Radius:** Visual corner control, per-corner values. Copy CSS.
- **Glassmorphism:** Background blur, transparency, border. Live preview on sample card.
- **Noise Texture:** SVG-based noise generator. Control density, opacity. Copy as CSS background or download SVG.
**Tech:** Pure CSS/JS, SVG for noise

### 07. Font Pair (Type / Key)
**Purpose:** Browse Google Fonts with smart pairing suggestions.
**How it works:**
1. Browse/search Google Fonts (load via Google Fonts API)
2. Select a heading font → get suggested body font pairings
3. Preview with customizable sample text (user can type their own)
4. Adjustable type scale (select ratio: Minor Third 1.2, Major Third 1.25, Perfect Fourth 1.333, etc.)
5. Shows full hierarchy: H1-H6 + body + small
6. Export as CSS (font imports + size scale as custom properties)
**Tech:** Google Fonts API, dynamic font loading

### 08. Beat Maker (Create / Magenta)
**Purpose:** Simple loop-based music creation for video background tracks.
**How it works:**
1. Grid interface: rows = instruments (kick, snare, hi-hat, clap, bass, synth), columns = 16 beats
2. Click cells to toggle on/off
3. Tempo control (BPM slider)
4. Volume per instrument
5. Play/pause/stop controls
6. Pattern presets (basic rock, trap, lo-fi, etc.)
7. Export as WAV or MP3
**Tech:** Web Audio API, AudioContext, oscillators + sample playback

### 09. Contrast Checker (Color / Yellow)
**Purpose:** WCAG accessibility contrast testing.
**How it works:**
1. Two color pickers (foreground + background) — support hex input, RGB sliders, or eyedropper
2. Live preview showing sample text at multiple sizes on the chosen background
3. Show contrast ratio (e.g., 4.5:1)
4. Pass/fail badges for: WCAG AA normal text, AA large text, AAA normal text, AAA large text
5. "Suggest closest passing color" button — auto-adjusts the foreground to the nearest color that passes
6. Color blindness simulation of the pair
**Tech:** WCAG contrast ratio formula in pure JS

### 10. Favicon Forge (Image / Cyan)
**Purpose:** Create favicons quickly.
**How it works:**
1. Three creation modes:
   - **Text:** Enter 1-2 characters, pick font + colors + background
   - **Emoji:** Pick any emoji, renders at high res
   - **Upload:** Upload an image, crop to square
2. Preview at all standard sizes: 16×16, 32×32, 48×48, 180×180 (apple-touch)
3. Export as ICO file (multi-size) + individual PNGs + `<link>` tag HTML snippet
**Tech:** Canvas API for rendering, ICO encoding

### 11. Noise & Texture (Create / Magenta)
**Purpose:** Generate noise, grain, and organic textures.
**Controls:**
- Type: Film grain, perlin noise, paper texture, halftone dots
- Density/scale slider
- Opacity slider
- Color (monochrome or tinted)
- Blend mode preview (overlay, multiply, soft light)
- Output: SVG (for CSS background-image), PNG, or CSS code snippet
**Tech:** SVG filters (`feTurbulence`, `feColorMatrix`), Canvas for PNG export

### 12. Placeholder Hub (Create / Magenta)
**Purpose:** All placeholder content from one interface.
**Sub-tools (tabbed):**
- **Text:** Lorem ipsum (classic), Hipster Ipsum, custom word count, paragraphs/sentences/words toggle
- **Images:** Generate placeholder images with custom dimensions, background color, text overlay (like placeholder.com but local)
- **Avatars:** Random avatar generator (geometric/abstract style, not photos)
- **Data:** Fake names, emails, phone numbers, addresses. Configurable count. Copy as JSON or CSV.
**Tech:** Pure JS generation, Canvas for images/avatars

### 13. Screenshot Beautifier (Create / Magenta)
**Purpose:** Make screenshots look polished for portfolios and social media.
**How it works:**
1. Upload a screenshot
2. Add background: solid color, gradient, mesh gradient, or image
3. Padding control (around the screenshot)
4. Corner radius on the screenshot
5. Shadow (adjustable blur, spread, color, offset)
6. Optional device frame (MacBook, iPhone, browser window chrome)
7. Optional title bar (fake browser bar with dots)
8. Export as PNG at 1x or 2x resolution
**Tech:** Canvas API for compositing

### 14. Image Optimizer (Image / Cyan)
**Purpose:** Compress and optimize raster images (PNG, JPEG, WebP) plus SVG in one place.
**How it works:**
1. Upload or drop files (PNG, JPG, WebP, SVG)
2. Show original file size per asset
3. Raster: quality / resize / strip metadata / re-encode; SVG: remove metadata, strip comments, clean IDs, simplify paths, minify
4. Toggle optimizations per format
5. Side-by-side or list preview (before/after)
6. Show optimized size + percentage saved
7. Download individually or as ZIP; SVG copy code
**Tech:** Canvas API + `createImageBitmap` for rasters; custom SVG cleanup (simplified SVGO-style logic)

### 15. QR Code Generator (Create / Magenta)
**Purpose:** Generate customizable QR codes.
**How it works:**
1. Input: URL, plain text, WiFi credentials, vCard
2. Customize: foreground color, background color, corner style (square/rounded/dots), embedded logo (upload)
3. Size control
4. Live preview
5. Export as SVG or PNG
**Tech:** QR code generation algorithm in JS (or lightweight library like `qrcode-generator`)

### 16. Aspect Ratio Calculator (Image / Cyan)
**Purpose:** Calculate and convert aspect ratios.
**How it works:**
1. Input width × height (in px, in, cm, or mm)
2. Shows: simplified ratio (e.g., 16:9), decimal ratio, all common matching ratios
3. "Scale to" — enter one dimension and it calculates the other maintaining ratio
4. DPI converter — show physical print size at different DPIs (72, 150, 300)
5. Preset buttons for common sizes (A4, Letter, Instagram, HD, 4K, etc.)
6. Visual preview rectangle that updates live
**Tech:** Pure math in JS

---

## Individual Tool Page Layout

Each tool page should follow this structure:
```
[Nav bar — same as dashboard]
[Tool header: number + category tag + tool name + back button]
[Tool interface — full width of the content area]
[Footer — same as dashboard]
```

### Tool Header Pattern
```html
<div class="tool-header">
  <button class="back-btn">← Back</button>
  <div class="tool-header-info">
    <span class="tool-header-num">01</span>
    <span class="tool-header-tag" style="background: var(--C)">Image</span>
    <h1 class="tool-header-name">Grid Crop</h1>
  </div>
</div>
```

### Tool Interface Pattern
- Full width within the max-width container
- Dark background matching `--bg` or `--s1`
- Use `--border` for internal divisions
- All interactive controls (sliders, buttons, pickers) should follow the design system
- Drag & drop zones: dashed border with `--border`, message "Drop files here or click to browse"
- Processing indicators: use CMYK colors for progress bars/spinners

---

## About Page

The About page should contain:
1. "OVERPRINT" heading with the CMYK dot accent
2. What it is — one paragraph explaining the tool suite
3. How it works — one paragraph about client-side processing and privacy
4. Stats: 100% client-side, 0 server uploads, 16 tools, FREE
5. Full tool list with names and one-line descriptions
6. Built with: Vanilla HTML/CSS/JS, Canvas API, Web Audio API
7. Footer

Style it clean and minimal — same dark theme, same typography, no marketing fluff.

---

## File Structure
```
overprint-project/
├── public/
│   └── index.html          ← Dashboard (the prototype — START HERE)
├── src/
│   ├── css/
│   │   └── global.css      ← Extract shared styles from index.html
│   ├── js/
│   │   ├── router.js       ← Hash-based SPA router
│   │   ├── filters.js      ← Category filter logic
│   │   └── tools/
│   │       ├── grid-crop.js
│   │       ├── carousel-maker.js
│   │       ├── color-lab.js
│   │       ├── social-sizer.js
│   │       ├── image-toolbox.js
│   │       ├── css-generator.js
│   │       ├── font-pair.js
│   │       ├── beat-maker.js
│   │       ├── contrast-checker.js
│   │       ├── favicon-forge.js
│   │       ├── noise-texture.js
│   │       ├── placeholder-hub.js
│   │       ├── screenshot-beautifier.js
│   │       ├── image-optimizer.js
│   │       ├── qr-code-generator.js
│   │       └── aspect-ratio-calc.js
│   └── tools/
│       ├── grid-crop.html
│       ├── carousel-maker.html
│       ├── color-lab.html
│       ├── social-sizer.html
│       ├── image-toolbox.html
│       ├── css-generator.html
│       ├── font-pair.html
│       ├── beat-maker.html
│       ├── contrast-checker.html
│       ├── favicon-forge.html
│       ├── noise-texture.html
│       ├── placeholder-hub.html
│       ├── screenshot-beautifier.html
│       ├── image-optimizer.html
│       ├── qr-code-generator.html
│       └── aspect-ratio-calc.html
├── RESEARCH.md              ← Market research document
├── CURSOR-PROMPT.md         ← This file
└── README.md
```

---

## Build Order (Priority)
Build the tools in this order — the first 5 are the most impactful:
1. **Grid Crop** — the #1 personal pain point for the creator
2. **Carousel Maker** — the #2 personal pain point
3. **Color Lab** — most universally useful tool
4. **Image Toolbox** — daily driver for every designer
5. **Social Sizer** — high frequency use case
6. Contrast Checker
7. CSS Generator
8. Font Pair
9. Beat Maker
10. Favicon Forge
11. Image Optimizer
12. Screenshot Beautifier
13. Noise & Texture
14. Placeholder Hub
15. QR Code Generator
16. Aspect Ratio Calculator

---

## Key Behavioral Rules
1. **Everything is client-side.** Never upload files to any server. All processing happens in the browser using Canvas API, Web Audio API, etc.
2. **No accounts, no auth, no cookies** (beyond basic preferences like theme).
3. **Privacy first.** Files are processed in memory and discarded. Nothing persists unless the user explicitly exports.
4. **Fast.** Tools should feel instant. Use Web Workers for heavy image processing. Show progress indicators for batch operations.
5. **Mobile works.** Every tool must be usable on mobile. Touch targets minimum 44px. Drag & drop should have a tap-to-browse fallback.
6. **Consistent.** Every tool follows the same visual patterns — same header, same input styles, same button styles, same export flow. If you build a good pattern for tool #1, replicate it exactly for tools #2-16.

---

## Preview Animations (Dashboard Cards)
Each tool card on the dashboard has a greyed-out animated preview that colorizes on hover. The previews are already built in `public/index.html`. When building the actual tools, replace placeholder previews with real micro-representations of the tool's interface. In the final version, these should ideally be short looping videos or GIF-like recordings of the actual tool being used, but for now CSS animations are fine.

The grey-to-color effect is critical to the brand identity:
- Default: `filter: grayscale(1) brightness(0.4)`, `animation-play-state: paused`
- Hover: `filter: grayscale(0) brightness(1)`, `animation-play-state: running`
- On mobile: show in color by default (no hover)

---

## What NOT To Do
- Do not add a backend or database
- Do not use React, Vue, Svelte, or any framework
- Do not use Tailwind or any CSS framework
- Do not change the color system, fonts, or design tokens
- Do not add ads, analytics, or tracking
- Do not require user accounts or sign-in
- Do not upload user files to any external service
- Do not use AI APIs (no OpenAI, no Anthropic API) — keep costs at zero
- Do not deviate from the 4-column grid on the dashboard
