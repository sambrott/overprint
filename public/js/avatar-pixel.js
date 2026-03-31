/* Shared pixel avatar drawing (dashboard card preview + Avatar Generator tool). */
(function (global) {
  var GRID = 16;
  var CANVAS = 320;

  function P(ctx, cell, c, r, color) {
    ctx.fillStyle = color;
    ctx.fillRect(c * cell, r * cell, cell, cell);
  }

  function mirror(ctx, cell, c, r, color) {
    P(ctx, cell, c, r, color);
    P(ctx, cell, GRID - 1 - c, r, color);
  }

  function drawIdenticon(ctx, cell, rnd) {
    var hue = Math.floor(rnd() * 360);
    var j;
    var i;
    for (j = 0; j < GRID; j++) {
      for (i = 0; i < GRID / 2; i++) {
        if (rnd() > 0.5) {
          mirror(
            ctx,
            cell,
            i,
            j,
            'hsl(' + hue + ',' + (38 + rnd() * 45) + '%,' + (32 + rnd() * 38) + '%)'
          );
        }
      }
    }
  }

  /** 8×8 macro blocks (chunky symmetric noise). */
  function drawIdenticonMacro(ctx, cell, rnd) {
    var big = CANVAS / 8;
    var hue = Math.floor(rnd() * 360);
    var j;
    var i;
    for (j = 0; j < 8; j++) {
      for (i = 0; i < 4; i++) {
        if (rnd() > 0.42) {
          var c =
            'hsl(' +
            hue +
            ',' +
            (38 + rnd() * 45) +
            '%,' +
            (28 + rnd() * 42) +
            '%)';
          ctx.fillStyle = c;
          ctx.fillRect(i * big, j * big, big, big);
          ctx.fillRect(CANVAS - (i + 1) * big, j * big, big, big);
        }
        hue = (hue + rnd() * 14) % 360;
      }
    }
  }

  /** Horizontal bands with per-cell sparkle (mirrored). */
  function drawIdenticonBands(ctx, cell, rnd) {
    var hue = Math.floor(rnd() * 360);
    var j;
    var i;
    for (j = 0; j < GRID; j++) {
      var rowHue = (hue + j * (8 + rnd() * 18)) % 360;
      for (i = 0; i < GRID / 2; i++) {
        if (rnd() > 0.38) {
          mirror(
            ctx,
            cell,
            i,
            j,
            'hsl(' +
              rowHue +
              ',' +
              (42 + rnd() * 40) +
              '%,' +
              (26 + rnd() * 44) +
              '%)'
          );
        }
      }
    }
  }

  /** Sparse high-contrast bits (retro “LED” look). */
  function drawIdenticonSpark(ctx, cell, rnd) {
    var hue = Math.floor(rnd() * 360);
    var j;
    var i;
    for (j = 0; j < GRID; j++) {
      for (i = 0; i < GRID / 2; i++) {
        if (rnd() > 0.72) {
          mirror(
            ctx,
            cell,
            i,
            j,
            'hsl(' + hue + ',' + (55 + rnd() * 40) + '%,' + (40 + rnd() * 35) + '%)'
          );
        }
      }
      if (j % 3 === 0) hue = (hue + 47 + rnd() * 60) % 360;
    }
  }

  /** Limited palette mosaic (3 hues, symmetric). */
  function drawIdenticonMosaic(ctx, cell, rnd) {
    var base = Math.floor(rnd() * 360);
    var h2 = (base + 72 + rnd() * 40) % 360;
    var h3 = (base + 200 + rnd() * 50) % 360;
    var pal = [
      'hsl(' + base + ',' + (50 + rnd() * 35) + '%,' + (35 + rnd() * 30) + '%)',
      'hsl(' + h2 + ',' + (45 + rnd() * 40) + '%,' + (38 + rnd() * 28) + '%)',
      'hsl(' + h3 + ',' + (42 + rnd() * 38) + '%,' + (28 + rnd() * 35) + '%)',
    ];
    var j;
    var i;
    for (j = 0; j < GRID; j++) {
      for (i = 0; i < GRID / 2; i++) {
        if (rnd() > 0.48) {
          mirror(ctx, cell, i, j, pal[Math.floor(rnd() * 3)]);
        }
      }
    }
  }

  /** Soft radial bias: more likely to fill near vertical center (mirrored). */
  function drawIdenticonCore(ctx, cell, rnd) {
    var hue = Math.floor(rnd() * 360);
    var mid = (GRID - 1) / 2;
    var j;
    var i;
    for (j = 0; j < GRID; j++) {
      var dj = 1 - Math.abs(j - mid) / mid;
      for (i = 0; i < GRID / 2; i++) {
        var di = 1 - i / (GRID / 2);
        var p = 0.28 + 0.55 * dj * di;
        if (rnd() < p) {
          mirror(
            ctx,
            cell,
            i,
            j,
            'hsl(' +
              hue +
              ',' +
              (32 + rnd() * 38) +
              '%,' +
              (38 + rnd() * 32) +
              '%)'
          );
        }
      }
      hue = (hue + rnd() * 6) % 360;
    }
  }

  var DRAWERS = {
    identicon: drawIdenticon,
    identicon_macro: drawIdenticonMacro,
    identicon_bands: drawIdenticonBands,
    identicon_spark: drawIdenticonSpark,
    identicon_mosaic: drawIdenticonMosaic,
    identicon_core: drawIdenticonCore,
  };

  /** All styles (dropdown order). */
  var STYLES = [
    'identicon',
    'identicon_macro',
    'identicon_bands',
    'identicon_spark',
    'identicon_mosaic',
    'identicon_core',
  ];

  /**
   * Home card hover: cycle distinct looks (style + seed in app.js).
   * Six algorithms, then four more with repeats so each frame differs via seed.
   */
  var CARD_PREVIEW_STYLES = [
    'identicon',
    'identicon_macro',
    'identicon_bands',
    'identicon_spark',
    'identicon_mosaic',
    'identicon_core',
    'identicon',
    'identicon_macro',
    'identicon_bands',
    'identicon_spark',
  ];

  function draw(ctx, style, rnd) {
    var cell = CANVAS / GRID;
    ctx.clearRect(0, 0, CANVAS, CANVAS);
    var fn = DRAWERS[style] || drawIdenticon;
    fn(ctx, cell, rnd);
  }

  global.OVAvatarPixel = {
    GRID: GRID,
    CANVAS: CANVAS,
    STYLES: STYLES,
    CARD_PREVIEW_STYLES: CARD_PREVIEW_STYLES,
    draw: draw,
  };
})(typeof window !== 'undefined' ? window : this);
