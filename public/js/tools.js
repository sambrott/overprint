/* Overprint: functional tool UIs (mounted into .tool-interface). Client-side only. */
(function () {
  var OV = window.OV || {};
  window.OV = OV;
  var cleanups = [];
  OV.addCleanup = function (fn) {
    cleanups.push(fn);
  };
  OV.unmountTool = function () {
    while (cleanups.length) {
      var f = cleanups.pop();
      try {
        f();
      } catch (e) {}
    }
  };
  OV.mountTool = function (slug, root) {
    OV.unmountTool();
    var iface = root && root.querySelector('.tool-interface');
    if (!iface || !slug) return;
    iface.innerHTML = '';
    var init = REGISTRY[slug];
    if (init) init(iface);
  };

  function el(html) {
    var d = document.createElement('div');
    d.innerHTML = html.trim();
    return d.firstElementChild;
  }

  /** Preview left, controls right (same chrome as QR / Favicon). */
  function toolShellSplit(previewHtml, toolbarHtml) {
    return (
      '<div class="tool-shell tool-shell--split">' +
      '<div class="tool-preview-pane" aria-label="Preview">' +
      previewHtml +
      '</div>' +
      '<aside class="tool-toolbar-pane" aria-label="Controls">' +
      toolbarHtml +
      '</aside>' +
      '</div>'
    );
  }

  /** Single full-width pane (no right toolbar). */
  function toolShellSingle(previewHtml) {
    return (
      '<div class="tool-shell tool-shell--single">' +
      '<div class="tool-preview-pane" aria-label="Preview">' +
      previewHtml +
      '</div>' +
      '</div>'
    );
  }

  /** Beat-maker style: range + `.tool-bpm-val`; optional `fmt(n)` for decimals / units. */
  function bindToolSliderValue(root, rangeSel, valSel, fmt) {
    var r = root.querySelector(rangeSel);
    var v = root.querySelector(valSel);
    if (!r || !v) return;
    function sync() {
      var n = +r.value;
      v.textContent = fmt ? fmt(n) : String(Math.round(n));
      r.setAttribute('aria-valuenow', String(n));
    }
    r.addEventListener('input', sync);
    sync();
  }

  function tabs(iface, names, renderers, options) {
    options = options || {};
    if (options.split) {
      iface.innerHTML = toolShellSplit(
        '<div class="tool-tab-previews"></div>',
        '<div class="tool-tab-toolbar-inner"></div>'
      );
      var prevRoot = iface.querySelector('.tool-tab-previews');
      var tbInner = iface.querySelector('.tool-tab-toolbar-inner');
      var nav = el('<div class="tool-tabs"></div>');
      var stack = el('<div class="tool-panel-stack"></div>');
      tbInner.appendChild(nav);
      tbInner.appendChild(stack);
      names.forEach(function (name, i) {
        var t = el('<button type="button" class="tool-tab">' + name + '</button>');
        if (i === 0) t.classList.add('is-active');
        nav.appendChild(t);
        var pPrev = el('<div class="tool-panel' + (i === 0 ? ' is-active' : '') + '"></div>');
        var pCtrl = el('<div class="tool-panel' + (i === 0 ? ' is-active' : '') + '"></div>');
        renderers[i](pPrev, pCtrl);
        prevRoot.appendChild(pPrev);
        stack.appendChild(pCtrl);
        t.addEventListener('click', function () {
          nav.querySelectorAll('.tool-tab').forEach(function (x) {
            x.classList.remove('is-active');
          });
          prevRoot.querySelectorAll('.tool-panel').forEach(function (x) {
            x.classList.remove('is-active');
          });
          stack.querySelectorAll('.tool-panel').forEach(function (x) {
            x.classList.remove('is-active');
          });
          t.classList.add('is-active');
          pPrev.classList.add('is-active');
          pCtrl.classList.add('is-active');
        });
      });
      return;
    }
    var wrap = el('<div class="tool-stack"></div>');
    var nav = el('<div class="tool-tabs"></div>');
    var panels = [];
    names.forEach(function (name, i) {
      var t = el('<button type="button" class="tool-tab">' + name + '</button>');
      if (i === 0) t.classList.add('is-active');
      nav.appendChild(t);
      var p = el('<div class="tool-panel' + (i === 0 ? ' is-active' : '') + '"></div>');
      renderers[i](p);
      panels.push(p);
      wrap.appendChild(p);
      t.addEventListener('click', function () {
        nav.querySelectorAll('.tool-tab').forEach(function (x) {
          x.classList.remove('is-active');
        });
        panels.forEach(function (x) {
          x.classList.remove('is-active');
        });
        t.classList.add('is-active');
        p.classList.add('is-active');
      });
    });
    wrap.insertBefore(nav, wrap.firstChild);
    iface.appendChild(wrap);
  }

  function copyRow(iface, label, getText) {
    var row = el(
      '<div class="tool-row"><button type="button" class="tool-btn tool-btn--c">' + label + '</button><span class="tool-copy-status" data-copy-status></span></div>'
    );
    row.querySelector('button').addEventListener('click', function () {
      OV.copyText(getText()).then(function () {
        var s = row.querySelector('[data-copy-status]');
        if (s) {
          s.textContent = 'Copied';
          setTimeout(function () {
            s.textContent = '';
          }, 2000);
        }
      });
    });
    iface.appendChild(row);
  }

  /* Contrast checker */
  function initContrastChecker(iface) {
    iface.innerHTML = toolShellSingle(
      '<div class="tool-stack cc-tool">' +
        '<div class="cc-swatch-row">' +
        '<div class="tool-field cc-swatch-col">' +
        '<span class="tool-label">Color 1</span>' +
        '<div class="cc-swatch-wrap">' +
        '<div class="cc-swatch" id="ov-fill1" style="background:#0b1117"></div>' +
        '<input type="color" class="cc-swatch-input" id="ov-fg" value="#0b1117" aria-label="Pick color 1">' +
        '</div></div>' +
        '<div class="tool-field cc-swatch-col">' +
        '<span class="tool-label">Color 2</span>' +
        '<div class="cc-swatch-wrap">' +
        '<div class="cc-swatch" id="ov-fill2" style="background:#acc8e5"></div>' +
        '<input type="color" class="cc-swatch-input" id="ov-bg" value="#acc8e5" aria-label="Pick color 2">' +
        '</div></div>' +
        '</div>' +
        '<div class="cc-hex-row">' +
        '<div class="cc-hex-field">' +
        '<input type="text" class="tool-input cc-hex-input" id="ov-fgx" value="#0b1117" autocomplete="off" spellcheck="false" placeholder="#000000" aria-label="Color 1 hex, paste or type">' +
        '</div>' +
        '<div class="cc-hex-field">' +
        '<input type="text" class="tool-input cc-hex-input" id="ov-bgx" value="#acc8e5" autocomplete="off" spellcheck="false" placeholder="#ffffff" aria-label="Color 2 hex, paste or type">' +
        '</div></div>' +
        '<div class="cc-score-block">' +
        '<div class="cc-score-label">Contrast quality</div>' +
        '<div class="cc-score-main" id="ov-cscore">0.0<span class="cc-score-denom"> / 10</span></div>' +
        '</div></div>'
    );

    var fg = iface.querySelector('#ov-fg');
    var bg = iface.querySelector('#ov-bg');
    var fgx = iface.querySelector('#ov-fgx');
    var bgx = iface.querySelector('#ov-bgx');
    var fill1 = iface.querySelector('#ov-fill1');
    var fill2 = iface.querySelector('#ov-fill2');
    var scoreEl = iface.querySelector('#ov-cscore');

    function rgbFromInputs() {
      var a = OV.parseHex(fgx.value) || OV.parseHex(fg.value);
      var b = OV.parseHex(bgx.value) || OV.parseHex(bg.value);
      if (!a) a = { r: 11, g: 17, b: 23 };
      if (!b) b = { r: 172, g: 200, b: 229 };
      return { fg: a, bg: b };
    }

    function syncHexFromColor1() {
      var p = OV.parseHex(fg.value);
      if (p) fgx.value = OV.rgbToHex(p.r, p.g, p.b);
    }

    function syncHexFromColor2() {
      var p = OV.parseHex(bg.value);
      if (p) bgx.value = OV.rgbToHex(p.r, p.g, p.b);
    }

    function syncColorFromHex1() {
      var p = OV.parseHex(fgx.value);
      if (p) fg.value = OV.rgbToHex(p.r, p.g, p.b);
    }

    function syncColorFromHex2() {
      var p = OV.parseHex(bgx.value);
      if (p) bg.value = OV.rgbToHex(p.r, p.g, p.b);
    }

    function paint() {
      var o = rgbFromInputs();
      var fh = OV.rgbToHex(o.fg.r, o.fg.g, o.fg.b);
      var bh = OV.rgbToHex(o.bg.r, o.bg.g, o.bg.b);
      fg.value = fh;
      bg.value = bh;
      fgx.value = fh;
      bgx.value = bh;
      fill1.style.background = fh;
      fill2.style.background = bh;
      var r = OV.contrastRatio(o.fg, o.bg);
      var q = OV.contrastQuality10(r);
      scoreEl.innerHTML =
        q.toFixed(1) + '<span class="cc-score-denom"> / 10</span>';
      scoreEl.classList.remove('cc-score-main--good', 'cc-score-main--mid', 'cc-score-main--bad');
      if (r >= 4.5) scoreEl.classList.add('cc-score-main--good');
      else if (r >= 3) scoreEl.classList.add('cc-score-main--mid');
      else scoreEl.classList.add('cc-score-main--bad');
    }

    ['input', 'change'].forEach(function (ev) {
      fg.addEventListener(ev, function () {
        syncHexFromColor1();
        paint();
      });
      bg.addEventListener(ev, function () {
        syncHexFromColor2();
        paint();
      });
    });
    fgx.addEventListener('input', function () {
      syncColorFromHex1();
      paint();
    });
    bgx.addEventListener('input', function () {
      syncColorFromHex2();
      paint();
    });
    paint();
  }

  /* Aspect ratio */
  function initAspectRatioCalc(iface) {
    iface.innerHTML =
      toolShellSplit(
        '<div class="tool-stack ar-tool-preview">' +
          '<div id="ov-rect-inner" class="ar-tool-preview-shape" style="background:var(--C);opacity:.6;border:1px solid var(--C)"></div>' +
          '</div>',
        '<div class="tool-stack ar-toolbox">' +
          '<div class="tool-row tool-row--top">' +
          '<span class="tool-label" style="width:100%">Presets</span></div>' +
          '<div class="tool-row ar-tool-presets" id="ov-presets"></div>' +
          '<div class="tool-row">' +
          '<div class="tool-field"><span class="tool-label">Width</span><input type="number" class="tool-input" id="ov-aw" value="1920" min="1"></div>' +
          '<div class="tool-field"><span class="tool-label">Height</span><input type="number" class="tool-input" id="ov-ah" value="1080" min="1"></div>' +
          '</div>' +
          '<p class="tool-out" id="ov-arout"></p>' +
          '<div class="tool-row">' +
          '<div class="tool-field"><span class="tool-label">Scale to W</span><input type="number" class="tool-input" id="ov-sw" placeholder="px"></div>' +
          '<div class="tool-field"><span class="tool-label">Scale to H</span><input type="number" class="tool-input" id="ov-sh" placeholder="px"></div>' +
          '</div>' +
          '<p class="tool-out" id="ov-scaleout"></p>' +
          '</div>'
      );

    var aw = iface.querySelector('#ov-aw');
    var ah = iface.querySelector('#ov-ah');
    var sw = iface.querySelector('#ov-sw');
    var sh = iface.querySelector('#ov-sh');
    var out = iface.querySelector('#ov-arout');
    var sout = iface.querySelector('#ov-scaleout');
    var inner = iface.querySelector('#ov-rect-inner');

    var presets = [
      ['16:9', 16, 9],
      ['4:3', 4, 3],
      ['1:1', 1, 1],
      ['9:16', 9, 16],
      ['4:5', 4, 5],
      ['21:9', 21, 9],
    ];
    var ph = iface.querySelector('#ov-presets');
    presets.forEach(function (p) {
      var b = el('<button type="button" class="tool-btn">' + p[0] + '</button>');
      b.addEventListener('click', function () {
        aw.value = p[1] * 100;
        ah.value = p[2] * 100;
        calc();
      });
      ph.appendChild(b);
    });

    function calc() {
      var w = +aw.value || 1;
      var h = +ah.value || 1;
      var s = OV.simplifyRatio(Math.round(w), Math.round(h));
      out.innerHTML =
        'Simplified ratio <strong>' +
        s.w +
        ':' +
        s.h +
        '</strong> · Decimal ' +
        (w / h).toFixed(4) +
        '<br>Print at 300 DPI: ' +
        ((w / 300).toFixed(2) + '×' + (h / 300).toFixed(2)) +
        ' in';

      var rw = sw.value ? +sw.value : 0;
      var rh = sh.value ? +sh.value : 0;
      if (rw > 0) {
        var nh = Math.round((h / w) * rw);
        sout.textContent = 'Matching height for width ' + rw + 'px → ' + nh + 'px';
      } else if (rh > 0) {
        var nw = Math.round((w / h) * rh);
        sout.textContent = 'Matching width for height ' + rh + 'px → ' + nw + 'px';
      } else sout.textContent = '';

      var previewMax = 450;
      var previewBase = 360;
      var ir = w / h;
      var bw, bh;
      if (ir > previewMax / previewBase) {
        bw = previewMax;
        bh = previewMax / ir;
      } else {
        bh = previewBase;
        bw = previewBase * ir;
      }
      inner.style.width = bw + 'px';
      inner.style.height = bh + 'px';
    }

    [aw, ah, sw, sh].forEach(function (x) {
      x.addEventListener('input', calc);
    });
    calc();
  }

  /* Avatar generator (pixel) */
  function initAvatarGenerator(iface) {
    iface.innerHTML =
      toolShellSplit(
        '<div class="av-avatar-wrap" id="ov-av-h"></div>',
        '<div class="tool-stack av-tool">' +
          '<div class="tool-row">' +
          '<div class="tool-field tool-field--grow">' +
          '<span class="tool-label">Avatar style</span>' +
          '<select class="tool-select" id="ov-av-type" aria-label="Avatar style">' +
          '<option value="identicon">Identicon: symmetric noise</option>' +
          '<option value="identicon_macro">Identicon: chunky blocks</option>' +
          '<option value="identicon_bands">Identicon: color bands</option>' +
          '<option value="identicon_spark">Identicon: sparse / LED</option>' +
          '<option value="identicon_mosaic">Identicon: 3-color mosaic</option>' +
          '<option value="identicon_core">Identicon: soft core</option>' +
          '</select></div></div>' +
          '<div class="tool-row av-tool-actions">' +
          '<button type="button" class="tool-btn tool-btn--m" id="ov-av-gen">New avatar</button>' +
          '<button type="button" class="tool-btn tool-btn--c" id="ov-av-dl">Download PNG</button></div>' +
          '</div>'
      );

    var holder = iface.querySelector('#ov-av-h');
    var sel = iface.querySelector('#ov-av-type');
    var canvas;

    function gen() {
      holder.innerHTML = '';
      canvas = document.createElement('canvas');
      canvas.width = OVAvatarPixel.CANVAS;
      canvas.height = OVAvatarPixel.CANVAS;
      canvas.className = 'av-canvas';
      var ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      OVAvatarPixel.draw(ctx, sel.value || 'identicon', Math.random);
      holder.appendChild(canvas);
    }

    gen();
    iface.querySelector('#ov-av-gen').addEventListener('click', gen);
    sel.addEventListener('change', gen);
    iface.querySelector('#ov-av-dl').addEventListener('click', function () {
      if (canvas) OV.downloadCanvas(canvas, 'avatar.png', 'image/png');
    });
  }

  /* CSS generator — tool library, then per-tool view */

  var LAVA_SLIDERS = [
    { key: 'morph', label: 'Morph (master surface)', min: 0, max: 1, step: 0.01 },
    { key: 'sizeScale', label: 'Size scale (0.6 = 40% smaller)', min: 0.35, max: 0.8, step: 0.01 },
    { key: 'merge', label: 'Merge / smooth-union', min: 0, max: 1, step: 0.01 },
    { key: 'edgeWave', label: 'Edge wave (rim undulation)', min: 0, max: 1, step: 0.01 },
    { key: 'axisPuff', label: 'Axis puff (lobe bulge)', min: 0, max: 1, step: 0.01 },
    { key: 'detail', label: 'Detail ripples', min: 0, max: 1, step: 0.01 },
    { key: 'whiteRim', label: 'White / ice band', min: 0.4, max: 1.5, step: 0.01 },
    { key: 'cpuMotion', label: 'CPU Liss wobble', min: 0, max: 1, step: 0.01 },
    { key: 'aaSoft', label: 'Edge anti-alias softness', min: 0, max: 1, step: 0.01 },
    { key: 'breathe', label: 'Expand / compress pulse', min: 0, max: 1, step: 0.01 }
  ];

  function cssVec3ToHex(v) {
    if (!v || v.length !== 3) return '#ffffff';
    return OV.rgbToHex(
      Math.round(v[0] * 255),
      Math.round(v[1] * 255),
      Math.round(v[2] * 255)
    );
  }
  function cssHexToVec3(hex) {
    var rgb = OV.parseHex(hex);
    if (!rgb) {
      return [1, 1, 1];
    }
    return [rgb.r / 255, rgb.g / 255, rgb.b / 255];
  }

  function getCssGenVisRoot(iface) {
    try {
      if (!iface || !iface.querySelector) return null;
      return iface.querySelector('.tool-grid--cssgen') || null;
    } catch (e) {
      return null;
    }
  }

  function buildLlmSliderPanelInstruction(sliderDefs, colorInstruction) {
    var lines = sliderDefs.map(function (s) {
      return s.key + ' — ' + s.label + ' (min ' + s.min + ', max ' + s.max + ', step ' + s.step + ')';
    });
    return (
      'After the shader runs, add a small control menu (e.g. a sidebar, toolbar strip, or collapsible panel) in their IDE: ' +
      'HTML <input type="range"> for each float below, with matching min, max, and step. ' +
      colorInstruction +
      'Each slider and color input should update the same parameter object passed to the host so the user can refine the look without editing JSON by hand.\n\n' +
      'Float parameters to mirror as range sliders:\n' +
      lines.join('\n')
    );
  }

  function buildLlmCopyPrompt(kind, p, sliderDefs) {
    var title =
      kind === 'liquid' ? 'Overprint — Liquid (OVLava) — copy prompt' : 'Overprint — Lava lamp — copy prompt';
    var arch;
    var colorInstr;
    if (kind === 'liquid') {
      arch =
        'You are helping reproduce the Overprint “Liquid” WebGL2 metaball background (public/js/lava-liquid.js, window.OVLava). ' +
        'The shader is a soft union of five moving metaballs; bodyTint and rimTint are vec3 linear RGB 0–1. ' +
        'Mount with OVLava.mount(canvas, function () { return p; }) where p has the same shape as OVLava.DEFAULT.';
      colorInstr = 'Include <input type="color"> for bodyTint and rimTint (map hex to vec3 0–1). ';
    } else {
      arch =
        'You are helping reproduce the Overprint “Lava lamp” full-frame stripe shader (public/js/lvol-banner-gl.js, window.OVLavaLamp or OVLvolBanner). ' +
        'It is WebGL1: a noise-warped multi-band field with u_cream, u_orange, u_blue (vec3) and floats u_freq through u_bor. ' +
        'There is no center box—only animated bands. Create with the host API’s create(host, { getParams: () => p }).';
      colorInstr = 'Include <input type="color"> for u_cream, u_orange, and u_blue (hex to vec3). ';
    }
    return (
      title +
      '\n\n' +
      arch +
      '\n\n' +
      buildLlmSliderPanelInstruction(sliderDefs, colorInstr) +
      '\n\n' +
      'Current parameters from the app (the user’s slider and color values—match these exactly, do not invent new numbers):\n' +
      JSON.stringify(p, null, 2)
    );
  }

  function getCssGenToolPageEl(iface) {
    return iface && iface.closest ? iface.closest('.tool-page') : null;
  }

  function clearCssGenHeaderBack(iface) {
    var page = getCssGenToolPageEl(iface);
    if (!page) return;
    var b = page.querySelector('.back-btn');
    if (b && b._ovCssGenBack) {
      b.removeEventListener('click', b._ovCssGenBack, true);
      b._ovCssGenBack = null;
    }
  }

  function attachCssGenHeaderBackToLibrary(iface, beforeLibrary) {
    clearCssGenHeaderBack(iface);
    var page = getCssGenToolPageEl(iface);
    if (!page) return;
    var b = page.querySelector('.back-btn');
    if (!b) return;
    b._ovCssGenBack = function (e) {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (typeof beforeLibrary === 'function') {
        beforeLibrary();
      }
      initCssGeneratorLibrary(iface);
    };
    b.addEventListener('click', b._ovCssGenBack, true);
  }

  var CSSGEN_IFACE_TX_MS = 220;

  function runCssgenIfaceTransition(iface, paint) {
    if (!iface || typeof paint !== 'function') {
      return;
    }
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      paint();
      return;
    }
    if (!iface.hasChildNodes()) {
      paint();
      return;
    }
    iface.classList.add('tool-interface--cssgen-tx', 'tool-interface--cssgen-tx--leave');
    setTimeout(function () {
      paint();
      iface.classList.remove('tool-interface--cssgen-tx--leave');
      iface.classList.add('tool-interface--cssgen-tx--enter');
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          iface.classList.remove('tool-interface--cssgen-tx--enter');
          setTimeout(function () {
            iface.classList.remove('tool-interface--cssgen-tx');
          }, CSSGEN_IFACE_TX_MS);
        });
      });
    }, CSSGEN_IFACE_TX_MS);
  }

  function detachCssLibListener(iface) {
    if (iface && iface._ovCssLibClick) {
      iface.removeEventListener('click', iface._ovCssLibClick);
      iface._ovCssLibClick = null;
    }
    if (iface && iface._ovCssLibKeydown) {
      iface.removeEventListener('keydown', iface._ovCssLibKeydown);
      iface._ovCssLibKeydown = null;
    }
  }

  function cleanupCssGenLibPreviews(iface) {
    var fns = iface._ovCssLibPreviewCleanups;
    if (fns && fns.length) {
      fns.forEach(function (fn) {
        try {
          fn();
        } catch (err) {}
      });
    }
    iface._ovCssLibPreviewCleanups = null;
  }

  function mountCssGenLibPreviews(iface) {
    cleanupCssGenLibPreviews(iface);
    var stops = [];
    var visRoot = getCssGenVisRoot(iface);
    var glThumb = {
      maxFps: 10,
      maxDpr: 1,
      qualityScale: 0.72,
      pauseWhenNotVisible: true,
      visibilityRoot: visRoot
    };
    var liqHost = iface.querySelector('[data-cmd="liquid"] .ov-lib-gl-host');
    if (liqHost && window.OVLava) {
      var c = document.createElement('canvas');
      c.setAttribute('aria-hidden', 'true');
      c.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';
      liqHost.style.cssText = 'position:relative;width:100%;height:100%;min-height:1px;';
      liqHost.appendChild(c);
      var lp = JSON.parse(JSON.stringify(OVLava.DEFAULT));
      try {
        var stopL = OVLava.mount(
          c,
          function () {
            return lp;
          },
          glThumb
        );
        stops.push(stopL);
      } catch (e1) {}
    }
    var lampHost = iface.querySelector('[data-cmd="lava-lamp"] .ov-lib-gl-host');
    var LampAPI = window.OVLavaLamp || window.OVLvolBanner;
    if (lampHost && LampAPI) {
      try {
        var lpLamp = LampAPI.cloneDefaults();
        var vr = LampAPI.create(lampHost, {
          getParams: function () {
            return lpLamp;
          },
          maxFps: 10,
          maxDpr: 1,
          pauseWhenNotVisible: true,
          visibilityRoot: visRoot
        });
        if (vr && vr.destroy) stops.push(vr.destroy);
      } catch (e2) {}
    }
    iface._ovCssLibPreviewCleanups = stops;
    OV.addCleanup(function () {
      cleanupCssGenLibPreviews(iface);
    });
  }

  var _ovCssgenDashStops = null;

  function unmountCssGenDashboardPreviews() {
    if (!_ovCssgenDashStops || !_ovCssgenDashStops.length) {
      _ovCssgenDashStops = null;
      return;
    }
    _ovCssgenDashStops.forEach(function (fn) {
      try {
        fn();
      } catch (e) {}
    });
    _ovCssgenDashStops = null;
  }

  function mountCssGenDashboardPreviews() {
    unmountCssGenDashboardPreviews();
    var dash = document.getElementById('dashboard');
    if (!dash) {
      return;
    }
    var card = dash.querySelector('[data-cssgen-card-preview]');
    if (!card) {
      return;
    }
    var liqHost = card.querySelector('[data-cssgen-gl="liquid"]');
    var stops = [];
    var toolCard = card.closest && card.closest('.tool-card');
    var glOpts = {
      maxFps: 10,
      maxDpr: 1,
      qualityScale: 0.72,
      pauseWhenNotVisible: true,
      visibilityRoot: null,
      hoverTarget: toolCard
    };
    if (liqHost && window.OVLava) {
      liqHost.innerHTML = '';
      var c = document.createElement('canvas');
      c.setAttribute('aria-hidden', 'true');
      c.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';
      liqHost.style.cssText = 'position:relative;width:100%;height:100%;min-height:1px;';
      liqHost.appendChild(c);
      var lp = JSON.parse(JSON.stringify(OVLava.DEFAULT));
      try {
        stops.push(OVLava.mount(c, function () { return lp; }, glOpts));
      } catch (e0) {}
    }
    _ovCssgenDashStops = stops;
  }

  OV.unmountCssGenDashboardPreviews = unmountCssGenDashboardPreviews;
  OV.mountCssGenDashboardPreviews = mountCssGenDashboardPreviews;

  /* Lava lamp (stripe swirl) — float uniforms; cream/orange/blue via color pickers */
  var LVOL_SLIDERS = [
    { key: 'u_freq', label: 'Stripe frequency', min: 0.2, max: 2.6, step: 0.01 },
    { key: 'u_warp', label: 'Noise warp', min: 0, max: 10, step: 0.05 },
    { key: 'u_scale', label: 'Noise scale', min: 0.5, max: 2.5, step: 0.01 },
    { key: 'u_cross', label: 'Diagonal mix', min: 0, max: 1, step: 0.01 },
    { key: 'u_angle', label: 'Swirl angle mix', min: 0, max: 2, step: 0.01 },
    { key: 'u_speed', label: 'Scroll speed', min: 0.02, max: 0.45, step: 0.005 },
    { key: 'u_wspeed', label: 'Noise drift', min: 0.02, max: 0.35, step: 0.005 },
    { key: 'u_cw', label: 'Cream band width', min: 0.02, max: 0.25, step: 0.005 },
    { key: 'u_ow', label: 'Orange band width', min: 0.05, max: 0.45, step: 0.005 },
    { key: 'u_bor', label: 'Blue/orange balance', min: 0.15, max: 0.65, step: 0.01 }
  ];

  function getCssGenLiquidPresets(OV) {
    return [
      {
        id: 'overprint',
        name: 'Overprint (CMY)',
        apply: function () {
          return JSON.parse(JSON.stringify(OV.DEFAULT));
        }
      },
      {
        id: 'magentaAmber',
        name: 'Magenta + amber',
        apply: function () {
          var p = JSON.parse(JSON.stringify(OV.DEFAULT));
          p.bodyTint = [224 / 255, 64 / 255, 160 / 255];
          p.rimTint = [0.95, 0.72, 0.18];
          p.whiteRim = 1.35;
          return p;
        }
      },
      {
        id: 'emeraldCyan',
        name: 'Emerald + cyan rim',
        apply: function () {
          var p = JSON.parse(JSON.stringify(OV.DEFAULT));
          p.bodyTint = [0.1, 0.45, 0.32];
          p.rimTint = [0, 180 / 255, 216 / 255];
          p.merge = 0.55;
          p.morph = 0.55;
          return p;
        }
      },
      {
        id: 'inkScreen',
        name: 'Ink (dark + screen)',
        apply: function () {
          var p = JSON.parse(JSON.stringify(OV.DEFAULT));
          p.bodyTint = [0.12, 0.12, 0.16];
          p.rimTint = [0.7, 0.75, 0.9];
          p.whiteRim = 1.2;
          p.morph = 0.42;
          return p;
        }
      }
    ];
  }

  function getCssGenLampPresets(Lamp) {
    return [
      {
        id: 'overprint',
        name: 'Overprint (CMY)',
        apply: function () {
          return Lamp.cloneDefaults();
        }
      },
      {
        id: 'ember',
        name: 'Ember (warm K)',
        apply: function () {
          var p = Lamp.cloneDefaults();
          p.u_cream = [0.96, 0.88, 0.72];
          p.u_orange = [0.85, 0.35, 0.2];
          p.u_blue = [0.1, 0.45, 0.7];
          return p;
        }
      },
      {
        id: 'pacific',
        name: 'Pacific (cool)',
        apply: function () {
          var p = Lamp.cloneDefaults();
          p.u_cream = [0.9, 0.93, 0.95];
          p.u_orange = [224 / 255, 64 / 255, 160 / 255];
          p.u_blue = [0.05, 0.6, 0.65];
          p.u_freq = 1.1;
          return p;
        }
      },
      {
        id: 'dynamo',
        name: 'Dynamo (fast motion)',
        apply: function () {
          var p = Lamp.cloneDefaults();
          p.u_speed = 0.28;
          p.u_wspeed = 0.22;
          p.u_warp = 6.2;
          return p;
        }
      }
    ];
  }

  function initCssGeneratorLiquidTool(iface) {
    if (!window.OVLava) {
      runCssgenIfaceTransition(iface, function () {
        cleanupCssGenLibPreviews(iface);
        detachCssLibListener(iface);
        iface.innerHTML = toolShellSingle(
          '<p class="tool-placeholder">Could not load the liquid engine. Add <code>lava-liquid.js</code> before <code>tools.js</code> in <code>index.html</code>.</p>'
        );
      });
      return;
    }
    var liqPresetDefs = getCssGenLiquidPresets(OVLava);
    var liqPresetOpts = liqPresetDefs
      .map(function (pr) {
        return '<option value="' + pr.id + '">' + pr.name + '</option>';
      })
      .join('');
    var params = JSON.parse(JSON.stringify(OVLava.DEFAULT));
    var slidesHtml = LAVA_SLIDERS.map(function (s) {
      var id = 'lava-ctrl-' + s.key;
      return (
        '<div class="tool-field tool-field--slider">' +
        '<span class="tool-label">' +
        s.label +
        '</span>' +
        '<div class="tool-bpm-slider-row">' +
        '<input type="range" class="tool-input tool-input--range tool-input--bpm" id="' +
        id +
        '" min="' +
        s.min +
        '" max="' +
        s.max +
        '" step="' +
        s.step +
        '" value="' +
        params[s.key] +
        '">' +
        '<span class="tool-bpm-val" id="' +
        id +
        '-v">0.00</span></div></div>'
      );
    }).join('');

    function applyLiquid() {
      cleanupCssGenLibPreviews(iface);
      detachCssLibListener(iface);
      iface.innerHTML = toolShellSplit(
      '<div class="ov-lava-wrap"><canvas id="ov-lava" class="ov-lava-canvas" width="4" height="4" aria-label="Liquid layer preview" role="img"></canvas></div>',
      '<div class="tool-stack tool-stack--lava-ctrl">' +
        '<div class="tool-field tool-field--grow tool-field--preset">' +
        '<label class="tool-label" for="lava-preset">Color & motion preset</label>' +
        '<select class="tool-input tool-select" id="lava-preset">' +
        liqPresetOpts +
        '</select></div>' +
        '<div class="tool-row" style="flex-wrap:wrap;gap:6px">' +
        '<button type="button" class="tool-btn tool-btn--c" id="lava-llm-copy">Copy prompt</button></div>' +
        '<div class="tool-row"><span class="tool-copy-status" data-lava-llm-st=""></span></div>' +
        '<div class="tool-row" style="flex-wrap:wrap;gap:6px">' +
        '<button type="button" class="tool-btn tool-btn--c" id="lava-copy">Copy params + embed</button>' +
        '<button type="button" class="tool-btn" id="lava-rst">Reset</button></div>' +
        '<div class="tool-row"><span class="tool-copy-status" data-lava-copy-status=""></span></div>' +
        '<div class="tool-row" style="flex-wrap:wrap;gap:8px;align-items:flex-end">' +
        '<div class="tool-field"><span class="tool-label">Liquid (body)</span><input type="color" class="tool-input" id="lava-c-body" value="' +
        cssVec3ToHex(params.bodyTint) +
        '"></div>' +
        '<div class="tool-field"><span class="tool-label">Rim / highlight</span><input type="color" class="tool-input" id="lava-c-rim" value="' +
        cssVec3ToHex(params.rimTint) +
        '"></div></div>' +
        slidesHtml +
        '</div>'
    );

    var canvas = iface.querySelector('#ov-lava');
    var tb = iface.querySelector('.tool-toolbar-pane');
    var statusEl = iface.querySelector('[data-lava-copy-status]');
    var unmountLava = null;

    LAVA_SLIDERS.forEach(function (s) {
      var sel = '#lava-ctrl-' + s.key;
      bindToolSliderValue(tb, sel, sel + '-v', function (n) {
        return n.toFixed(2);
      });
      tb.querySelector(sel).addEventListener('input', function () {
        params[s.key] = +tb.querySelector(sel).value;
      });
    });

    var cBody = tb.querySelector('#lava-c-body');
    var cRim = tb.querySelector('#lava-c-rim');
    function syncLiquidColorsFromInputs() {
      if (cBody) {
        params.bodyTint = cssHexToVec3(cBody.value);
      }
      if (cRim) {
        params.rimTint = cssHexToVec3(cRim.value);
      }
    }
    if (cBody) cBody.addEventListener('input', syncLiquidColorsFromInputs);
    if (cRim) cRim.addEventListener('input', syncLiquidColorsFromInputs);

    var selPres = tb.querySelector('#lava-preset');
    var llmSt = tb.querySelector('[data-lava-llm-st]');
    function flashLiquidLlm() {
      if (llmSt) {
        llmSt.textContent = 'Copied';
        setTimeout(function () {
          llmSt.textContent = '';
        }, 2000);
      }
    }
    function applyLiquidParamsFromObject(next) {
      params = next;
      LAVA_SLIDERS.forEach(function (s) {
        var r = tb.querySelector('#lava-ctrl-' + s.key);
        if (r) {
          r.value = String(params[s.key]);
          r.dispatchEvent(new Event('input', { bubbles: true }));
        }
      });
      if (cBody) cBody.value = cssVec3ToHex(params.bodyTint);
      if (cRim) cRim.value = cssVec3ToHex(params.rimTint);
    }
    if (selPres) {
      selPres.addEventListener('change', function () {
        var id = selPres.value;
        for (var i = 0; i < liqPresetDefs.length; i++) {
          if (liqPresetDefs[i].id === id) {
            applyLiquidParamsFromObject(liqPresetDefs[i].apply());
            return;
          }
        }
      });
    }
    var btnLlm = tb.querySelector('#lava-llm-copy');
    if (btnLlm) {
      btnLlm.addEventListener('click', function () {
        LAVA_SLIDERS.forEach(function (s) {
          var r = tb.querySelector('#lava-ctrl-' + s.key);
          if (r) params[s.key] = +r.value;
        });
        syncLiquidColorsFromInputs();
        OV.copyText(buildLlmCopyPrompt('liquid', params, LAVA_SLIDERS)).then(flashLiquidLlm);
      });
    }

    try {
      unmountLava = OVLava.mount(canvas, function () {
        return params;
      });
    } catch (err) {
      var werr = iface.querySelector('.ov-lava-wrap');
      if (werr) {
        werr.innerHTML =
          '<p class="tool-out" style="padding:20px">WebGL2 is not available in this browser.</p>';
      }
    }

    if (unmountLava) {
      OV.addCleanup(function () {
        if (unmountLava) {
          unmountLava();
          unmountLava = null;
        }
      });
    }

    attachCssGenHeaderBackToLibrary(iface, function () {
      if (unmountLava) {
        unmountLava();
        unmountLava = null;
      }
    });

    iface.querySelector('#lava-copy').addEventListener('click', function () {
      LAVA_SLIDERS.forEach(function (s) {
        var r = tb.querySelector('#lava-ctrl-' + s.key);
        if (r) params[s.key] = +r.value;
      });
      syncLiquidColorsFromInputs();
      OV.copyText(OVLava.buildCopyText(params)).then(function () {
        if (statusEl) {
          statusEl.textContent = 'Copied';
          setTimeout(function () {
            statusEl.textContent = '';
          }, 2000);
        }
      });
    });

    iface.querySelector('#lava-rst').addEventListener('click', function () {
      if (selPres) {
        selPres.value = 'overprint';
      }
      applyLiquidParamsFromObject(JSON.parse(JSON.stringify(OVLava.DEFAULT)));
    });
    }
    runCssgenIfaceTransition(iface, applyLiquid);
  }

  function buildLavaLampParamCopy(p) {
    return [
      '/* Lava lamp stripe shader (WebGL) — lvol-banner-gl.js in Overprint */',
      JSON.stringify(p, null, 2)
    ].join('\n\n');
  }

  function initCssGeneratorLavaLampTool(iface) {
    var LampAPI = window.OVLavaLamp || window.OVLvolBanner;
    if (!LampAPI) {
      runCssgenIfaceTransition(iface, function () {
        cleanupCssGenLibPreviews(iface);
        detachCssLibListener(iface);
        iface.innerHTML = toolShellSingle(
          '<p class="tool-placeholder">Could not load the lava lamp shader. Add <code>lvol-banner-gl.js</code> before <code>tools.js</code> in <code>index.html</code>.</p>'
        );
      });
      return;
    }
    var vparams = LampAPI.cloneDefaults();
    var lampPresetDefs = getCssGenLampPresets(LampAPI);
    var lampPresetOpts = lampPresetDefs
      .map(function (pr) {
        return '<option value="' + pr.id + '">' + pr.name + '</option>';
      })
      .join('');
    var colorRow =
      '<div class="tool-row" style="flex-wrap:wrap;gap:8px;align-items:flex-end">' +
      '<div class="tool-field"><span class="tool-label">Cream</span><input type="color" class="tool-input" id="ll-c-cream" value="' +
      cssVec3ToHex(vparams.u_cream) +
      '"></div>' +
      '<div class="tool-field"><span class="tool-label">Orange</span><input type="color" class="tool-input" id="ll-c-orange" value="' +
      cssVec3ToHex(vparams.u_orange) +
      '"></div>' +
      '<div class="tool-field"><span class="tool-label">Blue</span><input type="color" class="tool-input" id="ll-c-blue" value="' +
      cssVec3ToHex(vparams.u_blue) +
      '"></div></div>';
    var vslides = LVOL_SLIDERS.map(function (s) {
      var id = 'lvol-ctrl-' + s.key;
      return (
        '<div class="tool-field tool-field--slider">' +
        '<span class="tool-label">' +
        s.label +
        '</span>' +
        '<div class="tool-bpm-slider-row">' +
        '<input type="range" class="tool-input tool-input--range tool-input--bpm" id="' +
        id +
        '" min="' +
        s.min +
        '" max="' +
        s.max +
        '" step="' +
        s.step +
        '" value="' +
        vparams[s.key] +
        '">' +
        '<span class="tool-bpm-val" id="' +
        id +
        '-v">0</span></div></div>'
      );
    }).join('');

    function applyLamp() {
      cleanupCssGenLibPreviews(iface);
      detachCssLibListener(iface);
      iface.innerHTML = toolShellSplit(
      '<div class="ov-lvol-wrap"><div class="ov-lib-gl-host" id="ov-lamp-main" aria-label="Lava lamp stripe" role="img"></div></div>',
      '<div class="tool-stack tool-stack--lvol-ctrl">' +
        '<div class="tool-field tool-field--grow tool-field--preset">' +
        '<label class="tool-label" for="lvol-preset">Color & motion preset</label>' +
        '<select class="tool-input tool-select" id="lvol-preset">' +
        lampPresetOpts +
        '</select></div>' +
        '<div class="tool-row" style="flex-wrap:wrap;gap:6px">' +
        '<button type="button" class="tool-btn tool-btn--c" id="lvol-llm-copy">Copy prompt</button></div>' +
        '<div class="tool-row"><span class="tool-copy-status" data-lvol-llm-st=""></span></div>' +
        '<div class="tool-row" style="flex-wrap:wrap;gap:6px">' +
        '<button type="button" class="tool-btn tool-btn--c" id="lvol-copy">Copy params (JSON)</button>' +
        '<button type="button" class="tool-btn" id="lvol-rst">Reset</button></div>' +
        '<div class="tool-row"><span class="tool-copy-status" data-lvol-copy-status=""></span></div>' +
        colorRow +
        vslides +
        '<pre class="tool-pre-wrap" id="lvol-pre" style="max-height:140px;font-size:10px">…</pre></div>'
    );

    var vhost = iface.querySelector('#ov-lamp-main');
    var tbV = iface.querySelector('.tool-toolbar-pane');
    var stV = iface.querySelector('[data-lvol-copy-status]');
    var preV = iface.querySelector('#lvol-pre');
    var vdestroy = null;

    function updateLampPre() {
      if (preV) {
        preV.textContent = buildLavaLampParamCopy(vparams);
      }
    }
    var llCream = tbV.querySelector('#ll-c-cream');
    var llOrange = tbV.querySelector('#ll-c-orange');
    var llBlue = tbV.querySelector('#ll-c-blue');
    function syncLampColorsFromInputs() {
      if (llCream) vparams.u_cream = cssHexToVec3(llCream.value);
      if (llOrange) vparams.u_orange = cssHexToVec3(llOrange.value);
      if (llBlue) vparams.u_blue = cssHexToVec3(llBlue.value);
      updateLampPre();
    }
    if (llCream) llCream.addEventListener('input', syncLampColorsFromInputs);
    if (llOrange) llOrange.addEventListener('input', syncLampColorsFromInputs);
    if (llBlue) llBlue.addEventListener('input', syncLampColorsFromInputs);

    var selLamp = tbV.querySelector('#lvol-preset');
    var lvolLlmSt = tbV.querySelector('[data-lvol-llm-st]');
    function flashLampLlm() {
      if (lvolLlmSt) {
        lvolLlmSt.textContent = 'Copied';
        setTimeout(function () {
          lvolLlmSt.textContent = '';
        }, 2000);
      }
    }
    function applyLampParamsFromObject(next) {
      vparams = next;
      LVOL_SLIDERS.forEach(function (s) {
        var r = tbV.querySelector('#lvol-ctrl-' + s.key);
        if (r) {
          r.value = String(vparams[s.key]);
          r.dispatchEvent(new Event('input', { bubbles: true }));
        }
      });
      if (llCream) llCream.value = cssVec3ToHex(vparams.u_cream);
      if (llOrange) llOrange.value = cssVec3ToHex(vparams.u_orange);
      if (llBlue) llBlue.value = cssVec3ToHex(vparams.u_blue);
      updateLampPre();
    }
    if (selLamp) {
      selLamp.addEventListener('change', function () {
        var id = selLamp.value;
        for (var j = 0; j < lampPresetDefs.length; j++) {
          if (lampPresetDefs[j].id === id) {
            applyLampParamsFromObject(lampPresetDefs[j].apply());
            return;
          }
        }
      });
    }
    var btnLampLlm = tbV.querySelector('#lvol-llm-copy');
    if (btnLampLlm) {
      btnLampLlm.addEventListener('click', function () {
        LVOL_SLIDERS.forEach(function (s) {
          var r = tbV.querySelector('#lvol-ctrl-' + s.key);
          if (r) vparams[s.key] = +r.value;
        });
        syncLampColorsFromInputs();
        OV.copyText(buildLlmCopyPrompt('lamp', vparams, LVOL_SLIDERS)).then(flashLampLlm);
      });
    }

    LVOL_SLIDERS.forEach(function (s) {
      var sel = '#lvol-ctrl-' + s.key;
      bindToolSliderValue(tbV, sel, sel + '-v', function (n) {
        if (s.step >= 0.1) return n.toFixed(1);
        if (s.step >= 0.01) return n.toFixed(2);
        return n.toFixed(3);
      });
      tbV.querySelector(sel).addEventListener('input', function () {
        vparams[s.key] = +tbV.querySelector(sel).value;
        updateLampPre();
      });
    });

    updateLampPre();
    try {
      vdestroy = LampAPI.create(vhost, {
        getParams: function () {
          return vparams;
        }
      });
    } catch (vErr) {
      if (vhost) {
        vhost.textContent = 'WebGL not available';
      }
    }
    if (vdestroy && vdestroy.destroy) {
      OV.addCleanup(function () {
        if (vdestroy) {
          try {
            vdestroy.destroy();
          } catch (e) {}
          vdestroy = null;
        }
      });
    }

    attachCssGenHeaderBackToLibrary(iface, function () {
      if (vdestroy && vdestroy.destroy) {
        vdestroy.destroy();
        vdestroy = null;
      }
    });

    iface.querySelector('#lvol-copy').addEventListener('click', function () {
      LVOL_SLIDERS.forEach(function (s) {
        var r = tbV.querySelector('#lvol-ctrl-' + s.key);
        if (r) vparams[s.key] = +r.value;
      });
      syncLampColorsFromInputs();
      OV.copyText(buildLavaLampParamCopy(vparams)).then(function () {
        if (stV) {
          stV.textContent = 'Copied';
          setTimeout(function () {
            stV.textContent = '';
          }, 2000);
        }
      });
    });
    iface.querySelector('#lvol-rst').addEventListener('click', function () {
      if (selLamp) {
        selLamp.value = 'overprint';
      }
      applyLampParamsFromObject(LampAPI.cloneDefaults());
    });
    }
    runCssgenIfaceTransition(iface, applyLamp);
  }

  function initCssGeneratorLibrary(iface) {
    if (!iface._ovCssgenLibCleanup) {
      iface._ovCssgenLibCleanup = true;
      OV.addCleanup(function () {
        detachCssLibListener(iface);
      });
    }
    function applyLibrary() {
      clearCssGenHeaderBack(iface);
      cleanupCssGenLibPreviews(iface);
      detachCssLibListener(iface);
      iface.innerHTML =
        '<div class="tool-grid tool-grid--cssgen" role="list">' +
        '<div class="tool-card" data-cat="create" data-cmd="liquid" role="button" tabindex="0" aria-label="Liquid layer (WebGL)">' +
        '<div class="tc-preview"><div class="tc-anim"><div class="ov-lib-gl-host"></div></div></div>' +
        '<div class="tc-body">' +
        '<div class="tc-top"><div class="tc-num">1</div><div class="tc-tag">Create</div></div>' +
        '<div class="tc-name">Liquid</div>' +
        '<div class="tc-desc">Metaball layer, WebGL2. C/Y tints, sliders, copy.</div>' +
        '<div class="tc-arrow">→</div></div></div>' +
        '<div class="tool-card" data-cat="create" data-cmd="lava-lamp" role="button" tabindex="0" aria-label="Lava lamp stripe (WebGL)">' +
        '<div class="tc-preview"><div class="tc-anim"><div class="ov-lib-gl-host"></div></div></div>' +
        '<div class="tc-body">' +
        '<div class="tc-top"><div class="tc-num">2</div><div class="tc-tag">Create</div></div>' +
        '<div class="tc-name">Lava lamp</div>' +
        '<div class="tc-desc">Stripe swirls, WebGL1. Cyan, magenta, paper. Motion and JSON.</div>' +
        '<div class="tc-arrow">→</div></div></div>' +
        '</div>';

      mountCssGenLibPreviews(iface);

      function onCssLibClick(e) {
        var t = e.target;
        if (!t || !t.closest) return;
        var card = t.closest('[data-cmd]');
        if (!card) return;
        var cmd = card.getAttribute('data-cmd');
        if (cmd === 'liquid') initCssGeneratorLiquidTool(iface);
        if (cmd === 'lava-lamp') initCssGeneratorLavaLampTool(iface);
      }
      function onCssLibKey(e) {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        var t = e.target;
        if (!t || !t.closest) return;
        var card = t.closest('[data-cmd]');
        if (!card) return;
        e.preventDefault();
        var cmd = card.getAttribute('data-cmd');
        if (cmd === 'liquid') initCssGeneratorLiquidTool(iface);
        if (cmd === 'lava-lamp') initCssGeneratorLavaLampTool(iface);
      }
      iface._ovCssLibClick = onCssLibClick;
      iface._ovCssLibKeydown = onCssLibKey;
      iface.addEventListener('click', onCssLibClick);
      iface.addEventListener('keydown', onCssLibKey);
    }
    runCssgenIfaceTransition(iface, applyLibrary);
  }

  function initCssGenerator(iface) {
    initCssGeneratorLibrary(iface);
  }

  /* Color lab */
  function initColorLab(iface) {
    tabs(
      iface,
      ['Harmonies', 'Formats', 'Gradient'],
      [
        function (pPrev, pCtrl) {
          pPrev.innerHTML =
            '<div class="tool-row" id="chsw" style="gap:8px;margin-top:12px;flex-wrap:wrap"></div>' +
            '<p class="tool-out" id="chn"></p>';
          pCtrl.innerHTML =
            '<div class="tool-field"><span class="tool-label">Base hex</span><input type="text" class="tool-input" id="chx" value="#00b4d8"></div>';
          function paint() {
            var rgb = OV.parseHex(pCtrl.querySelector('#chx').value) || { r: 0, g: 180, b: 216 };
            var hsl = OV.rgbToHsl(rgb.r, rgb.g, rgb.b);
            var w = pPrev.querySelector('#chsw');
            w.innerHTML = '';
            var rules = [
              ['Base', rgb],
              ['Complement', OV.hslToRgb((hsl.h + 180) % 360, hsl.s, hsl.l)],
              ['Analogous +', OV.hslToRgb((hsl.h + 30) % 360, hsl.s, hsl.l)],
              ['Analogous −', OV.hslToRgb((hsl.h - 30 + 360) % 360, hsl.s, hsl.l)],
              ['Triad 1', OV.hslToRgb((hsl.h + 120) % 360, hsl.s, hsl.l)],
              ['Triad 2', OV.hslToRgb((hsl.h + 240) % 360, hsl.s, hsl.l)],
            ];
            rules.forEach(function (r) {
              var d = el('<div style="width:56px;height:56px;border:1px solid var(--border);border-radius:2px" title="' + r[0] + '"></div>');
              var hx = OV.rgbToHex(r[1].r, r[1].g, r[1].b);
              d.style.background = hx;
              w.appendChild(d);
            });
            pPrev.querySelector('#chn').textContent =
              'HSL ' + hsl.h.toFixed(0) + '°, ' + hsl.s.toFixed(0) + '%, ' + hsl.l.toFixed(0) + '%';
          }
          pCtrl.querySelector('#chx').addEventListener('input', paint);
          paint();
        },
        function (pPrev, pCtrl) {
          pPrev.innerHTML =
            '<div class="tool-out" style="margin:0;font-size:10px;color:var(--text-faint);letter-spacing:1px;text-transform:uppercase">Output</div>';
          pCtrl.innerHTML =
            '<div class="tool-field"><span class="tool-label">Hex</span><input type="text" class="tool-input" id="cfh" value="#f0d020"></div>' +
              '<pre class="tool-pre-wrap" id="cfo"></pre>';
          function u() {
            var rgb = OV.parseHex(pCtrl.querySelector('#cfh').value);
            if (!rgb) {
              pCtrl.querySelector('#cfo').textContent = 'Invalid hex';
              return;
            }
            var hsl = OV.rgbToHsl(rgb.r, rgb.g, rgb.b);
            pCtrl.querySelector('#cfo').textContent =
              'HEX ' +
              OV.rgbToHex(rgb.r, rgb.g, rgb.b) +
              '\nRGB ' +
              rgb.r +
              ', ' +
              rgb.g +
              ', ' +
              rgb.b +
              '\nHSL ' +
              hsl.h.toFixed(1) +
              ', ' +
              hsl.s.toFixed(1) +
              '%, ' +
              hsl.l.toFixed(1) +
              '%';
          }
          pCtrl.querySelector('#cfh').addEventListener('input', u);
          u();
          copyRow(pCtrl, 'Copy', function () {
            return pCtrl.querySelector('#cfo').textContent;
          });
        },
        function (pPrev, pCtrl) {
          pPrev.innerHTML =
            '<div id="cgp" style="height:72px;border:1px solid var(--border)"></div>';
          pCtrl.innerHTML =
              '<div class="tool-row">' +
              '<div class="tool-field"><span class="tool-label">A</span><input type="color" class="tool-input" id="cg1" value="#00b4d8"></div>' +
              '<div class="tool-field"><span class="tool-label">B</span><input type="color" class="tool-input" id="cg2" value="#f0d020"></div>' +
              '<div class="tool-field tool-field--slider">' +
              '<span class="tool-label">°</span>' +
              '<div class="tool-bpm-slider-row">' +
              '<input type="range" class="tool-input tool-input--range tool-input--bpm" id="cga" min="0" max="360" step="1" value="90" aria-valuenow="90">' +
              '<span class="tool-bpm-val" id="cga-val">90</span></div></div>' +
              '</div>' +
              '<pre class="tool-pre-wrap" id="cgo"></pre>';
          function u() {
            var a = pCtrl.querySelector('#cg1').value;
            var b = pCtrl.querySelector('#cg2').value;
            var ang = pCtrl.querySelector('#cga').value || 90;
            var css = 'linear-gradient(' + ang + 'deg,' + a + ',' + b + ')';
            pPrev.querySelector('#cgp').style.background = css;
            pCtrl.querySelector('#cgo').textContent = 'background: ' + css + ';';
          }
          pCtrl.querySelectorAll('#cg1,#cg2,#cga').forEach(function (x) {
            x.addEventListener('input', u);
          });
          bindToolSliderValue(pCtrl, '#cga', '#cga-val');
          u();
          copyRow(pCtrl, 'Copy CSS', function () {
            return pCtrl.querySelector('#cgo').textContent;
          });
        },
      ],
      { split: true }
    );
  }

  /* Noise texture */
  function initNoiseTexture(iface) {
    iface.innerHTML = toolShellSplit(
      '<div id="nv" style="width:100%;max-width:320px;min-height:200px;border:1px solid var(--border);background:var(--bg)"></div>',
      '<div class="tool-stack">' +
        '<div class="tool-row">' +
        '<div class="tool-field tool-field--slider">' +
        '<span class="tool-label">Frequency</span>' +
        '<div class="tool-bpm-slider-row">' +
        '<input type="range" class="tool-input tool-input--range tool-input--bpm" id="nf" min="0.2" max="2.5" step="0.05" value="0.65" aria-valuenow="0.65">' +
        '<span class="tool-bpm-val" id="nf-val">0.65</span></div></div>' +
        '<div class="tool-field tool-field--slider">' +
        '<span class="tool-label">Octaves</span>' +
        '<div class="tool-bpm-slider-row">' +
        '<input type="range" class="tool-input tool-input--range tool-input--bpm" id="no" min="1" max="6" step="1" value="4" aria-valuenow="4">' +
        '<span class="tool-bpm-val" id="no-val">4</span></div></div>' +
        '</div>' +
        '<div class="tool-row">' +
        '<button type="button" class="tool-btn tool-btn--c" id="nsv">Download SVG</button>' +
        '<button type="button" class="tool-btn tool-btn--m" id="npn">Download PNG</button></div>' +
        '</div>'
    );
    var tb = iface.querySelector('.tool-toolbar-pane');
    var v = iface.querySelector('#nv');
    function svgStr() {
      var f = tb.querySelector('#nf').value;
      var o = tb.querySelector('#no').value || 4;
      return (
        '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200">' +
        '<filter id="t"><feTurbulence type="fractalNoise" baseFrequency="' +
        f +
        '" numOctaves="' +
        o +
        '" stitchTiles="stitch"/></filter>' +
        '<rect width="100%" height="100%" filter="url(#t)" opacity="0.45"/></svg>'
      );
    }
    function render() {
      v.innerHTML = svgStr();
    }
    tb.querySelector('#nf').addEventListener('input', render);
    tb.querySelector('#no').addEventListener('input', render);
    bindToolSliderValue(tb, '#nf', '#nf-val', function (n) {
      return n.toFixed(2);
    });
    bindToolSliderValue(tb, '#no', '#no-val');
    tb.querySelector('#nsv').addEventListener('click', function () {
      var blob = new Blob([svgStr()], { type: 'image/svg+xml' });
      OV.downloadBlob(blob, 'texture.svg');
    });
    tb.querySelector('#npn').addEventListener('click', function () {
      var img = new Image();
      var u = URL.createObjectURL(new Blob([svgStr()], { type: 'image/svg+xml' }));
      img.onload = function () {
        var c = document.createElement('canvas');
        c.width = 640;
        c.height = 400;
        c.getContext('2d').drawImage(img, 0, 0, 640, 400);
        URL.revokeObjectURL(u);
        OV.downloadCanvas(c, 'texture.png', 'image/png');
      };
      img.src = u;
    });
    render();
  }

  /* QR */
  function initQrCodeGenerator(iface) {
    iface.innerHTML = toolShellSplit(
      '<div class="qr-preview-canvas"><canvas id="qrc" width="280" height="280" aria-label="QR code preview"></canvas></div>',
      '<div class="tool-stack">' +
      '<div class="tool-field tool-field--grow"><span class="tool-label">URL or text</span>' +
      '<input type="text" class="tool-input" id="qrt" value="" autocomplete="off" placeholder="https://example.com"></div>' +
      '<div class="tool-row qr-row-colors">' +
        '<div class="qr-colors-inputs">' +
        '<div class="tool-field"><span class="tool-label">FG</span><input type="color" class="tool-input" id="qrf" value="#08080c"></div>' +
        '<div class="tool-field"><span class="tool-label">BG</span><input type="color" class="tool-input" id="qrb" value="#ffffff"></div>' +
        '<div class="tool-field">' +
        '<span class="tool-label">Contrast</span>' +
        '<div class="qr-contrast-panel" id="qr-cc" role="status" aria-live="polite" title="Readability score from luminance contrast (0–10). Higher helps scanners read the code.">' +
        '<span class="qr-contrast-panel__num" id="qr-cc-n">-</span>' +
        '<span class="qr-contrast-panel__denom" aria-hidden="true">/10</span>' +
        '</div>' +
        '</div>' +
        '</div>' +
        '</div>' +
      '<div class="tool-field tool-field--slider">' +
      '<span class="tool-label">Size (px)</span>' +
      '<div class="tool-bpm-slider-row">' +
      '<input type="range" class="tool-input tool-input--range tool-input--bpm" id="qrs" min="64" max="800" step="1" value="200" aria-valuemin="64" aria-valuemax="800" aria-valuenow="200">' +
      '<span class="tool-bpm-val" id="qrs-val">200</span></div></div>' +
      '<div class="tool-row"><button type="button" class="tool-btn tool-btn--c" id="qrp">Download PNG</button></div>' +
      '</div>'
    );
    var canvas = iface.querySelector('#qrc');
    var QR = typeof QRCode !== 'undefined' ? QRCode : null;
    function qrSplitAuthorityAndRest(s) {
      var m = /^([^/?#]+)([/?#].*)?$/.exec(s);
      if (!m) return { authority: '', rest: '' };
      return { authority: m[1], rest: m[2] || '' };
    }
    function qrStripUserinfo(authority) {
      var at = authority.indexOf('@');
      if (at === -1) return authority;
      return authority.slice(at + 1);
    }
    function qrHostPort(authority) {
      authority = qrStripUserinfo(authority);
      if (authority[0] === '[') {
        var end = authority.indexOf(']');
        if (end > 0) {
          var rest = authority.slice(end + 1);
          if (rest[0] === ':') return { host: authority.slice(0, end + 1), port: rest };
          return { host: authority.slice(0, end + 1) };
        }
      }
      var c = authority.lastIndexOf(':');
      if (c > 0 && /^[0-9]+$/.test(authority.slice(c + 1))) {
        return { host: authority.slice(0, c), port: authority.slice(c) };
      }
      return { host: authority };
    }
    function qrLooksLikeIpv4(host) {
      if (!host || host.indexOf(':') >= 0) return false;
      var p = host.split('.');
      if (p.length !== 4) return false;
      var i;
      for (i = 0; i < 4; i++) {
        var n = parseInt(p[i], 10);
        if (!/^\d{1,3}$/.test(p[i]) || String(n) !== p[i] || n > 255) return false;
      }
      return true;
    }
    function qrDnsLabelOk(lab) {
      if (!lab || lab.length > 63) return false;
      if (lab.charAt(0) === '-' || lab.charAt(lab.length - 1) === '-') return false;
      if (/^xn--/i.test(lab)) return /^xn--[a-z0-9-]+$/i.test(lab);
      return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/i.test(lab);
    }
    function qrTldLooksValid(tld) {
      if (!tld || tld.length < 2 || tld.length > 63) return false;
      if (/^\d+$/.test(tld)) return false;
      if (!/[a-z]/i.test(tld)) return false;
      return qrDnsLabelOk(tld);
    }
    function qrIsLikelyUrlWithoutScheme(s) {
      if (/\s/.test(s)) return false;
      var ar = qrSplitAuthorityAndRest(s);
      var authority = ar.authority;
      if (!authority) return false;
      var hp = qrHostPort(authority);
      var host = hp.host;
      if (host.charAt(0) === '[') return true;
      if (qrLooksLikeIpv4(host)) return true;
      if (host.indexOf(':') >= 0 && host.indexOf('.') < 0) return true;
      if (/^localhost$/i.test(host)) return true;
      var labels = host.split('.');
      if (labels.length < 2) return false;
      var i;
      for (i = 0; i < labels.length; i++) {
        if (!qrDnsLabelOk(labels[i])) return false;
      }
      return qrTldLooksValid(labels[labels.length - 1]);
    }
    function normalizeQrContent(raw) {
      var s = String(raw || '').trim();
      if (!s) return ' ';
      if (/^[a-z][a-z0-9+.-]*:/i.test(s)) return s;
      if (/^\/\//.test(s)) return 'https:' + s;
      if (/^www\./i.test(s)) return 'https://' + s;
      if (qrIsLikelyUrlWithoutScheme(s)) return 'https://' + s;
      return s;
    }
    function qrOpts(dark, light, width) {
      return { width: width, margin: 2, color: { dark: dark, light: light } };
    }
    function syncQrContrast() {
      var nEl = iface.querySelector('#qr-cc-n');
      var panel = iface.querySelector('#qr-cc');
      if (!nEl || !panel) return;
      var fg = OV.parseHex(iface.querySelector('#qrf').value);
      var bg = OV.parseHex(iface.querySelector('#qrb').value);
      panel.classList.remove(
        'qr-contrast-panel--good',
        'qr-contrast-panel--mid',
        'qr-contrast-panel--bad',
        'qr-contrast-panel--empty'
      );
      if (!fg || !bg) {
        nEl.textContent = '-';
        panel.classList.add('qr-contrast-panel--empty');
        panel.setAttribute('aria-label', 'Contrast quality');
        return;
      }
      var ratio = OV.contrastRatio(fg, bg);
      var q = OV.contrastQuality10(ratio);
      nEl.textContent = q.toFixed(1);
      if (ratio >= 4.5) panel.classList.add('qr-contrast-panel--good');
      else if (ratio >= 3) panel.classList.add('qr-contrast-panel--mid');
      else panel.classList.add('qr-contrast-panel--bad');
      panel.setAttribute('aria-label', 'Contrast quality ' + q.toFixed(1) + ' out of 10');
    }
    function drawPreview() {
      if (!QR) {
        console.warn('QRCode library not loaded (expected js/vendor/qrcode.min.js)');
        return;
      }
      var raw = iface.querySelector('#qrt').value;
      var dark = iface.querySelector('#qrf').value;
      var light = iface.querySelector('#qrb').value;
      var exportSize = +iface.querySelector('#qrs').value || 200;
      var previewW = Math.min(Math.max(exportSize, 64), 280);
      if (!String(raw || '').trim()) {
        canvas.width = previewW;
        canvas.height = previewW;
        var ctx = canvas.getContext('2d');
        ctx.fillStyle = light;
        ctx.fillRect(0, 0, previewW, previewW);
        syncQrContrast();
        return;
      }
      var text = normalizeQrContent(raw);
      QR.toCanvas(canvas, text, qrOpts(dark, light, previewW), function (e) {
        if (e) console.warn(e);
      });
      syncQrContrast();
    }
    iface.querySelectorAll('#qrt,#qrf,#qrb,#qrs').forEach(function (x) {
      x.addEventListener('input', drawPreview);
      x.addEventListener('change', drawPreview);
    });
    bindToolSliderValue(iface, '#qrs', '#qrs-val');
    iface.querySelector('#qrt').addEventListener('blur', function () {
      var el = iface.querySelector('#qrt');
      var cur = el.value.trim();
      if (cur) {
        var norm = normalizeQrContent(cur);
        if (norm !== cur) el.value = norm;
      }
      drawPreview();
    });
    iface.querySelector('#qrp').addEventListener('click', function () {
      if (!QR) return;
      var raw = iface.querySelector('#qrt').value;
      if (!String(raw || '').trim()) return;
      var text = normalizeQrContent(raw);
      var dark = iface.querySelector('#qrf').value;
      var light = iface.querySelector('#qrb').value;
      var size = Math.min(800, Math.max(64, +iface.querySelector('#qrs').value || 200));
      var dl = document.createElement('canvas');
      QR.toCanvas(dl, text, qrOpts(dark, light, size), function (e) {
        if (e) {
          console.warn(e);
          return;
        }
        OV.downloadCanvas(dl, 'qrcode.png', 'image/png');
      });
    });
    drawPreview();
  }

  /* Image toolbox: convert / resize + batch optimize (tabs) */
  function initImageToolbox(iface) {
    var initialTab = 0;
    try {
      if (sessionStorage.getItem('overprint-image-toolbox-tab') === '1') {
        initialTab = 1;
        sessionStorage.removeItem('overprint-image-toolbox-tab');
      }
    } catch (e) {}

    function renderConvertTab(previewPane, ctrlPane) {
      var input = el('<input type="file" accept="image/*" style="display:none">');
      previewPane.innerHTML =
        '<div class="tool-stack tool-media-pane" style="width:100%;max-width:100%;align-items:center">' +
        '<div class="drop-zone" id="ov-it-zone" tabindex="0">Drop an image or click to browse</div>' +
        '<div id="ov-it-canvas-wrap" style="display:none;width:100%;margin-top:12px">' +
        '<canvas id="ov-itc" style="max-width:100%;border:1px solid var(--border)"></canvas>' +
        '</div></div>';
      ctrlPane.innerHTML =
        '<div class="tool-stack" id="ov-itp">' +
        '<div class="tool-row">' +
        '<div class="tool-field tool-field--slider">' +
        '<span class="tool-label">Quality</span>' +
        '<div class="tool-bpm-slider-row">' +
        '<input type="range" class="tool-input tool-input--range tool-input--bpm" id="ov-iq" min="0.5" max="1" step="0.05" value="0.92" aria-valuenow="0.92">' +
        '<span class="tool-bpm-val" id="ov-iq-val">92%</span></div></div>' +
        '<div class="tool-field tool-field--slider">' +
        '<span class="tool-label">Scale %</span>' +
        '<div class="tool-bpm-slider-row">' +
        '<input type="range" class="tool-input tool-input--range tool-input--bpm" id="ov-isc" min="5" max="200" step="1" value="100" aria-valuenow="100">' +
        '<span class="tool-bpm-val" id="ov-isc-val">100</span></div></div>' +
        '<div class="tool-field"><span class="tool-label">Format</span><select class="tool-select" id="ov-ifmt"><option value="image/png">PNG</option><option value="image/jpeg">JPEG</option><option value="image/webp">WebP</option></select></div>' +
        '</div>' +
        '<div class="tool-row">' +
        '<button type="button" class="tool-btn" id="ov-ir90">Rotate 90°</button>' +
        '<button type="button" class="tool-btn" id="ov-iflip">Flip H</button>' +
        '<button type="button" class="tool-btn tool-btn--c" id="ov-idl">Download</button></div>' +
        '</div>';
      iface.appendChild(input);
      var zone = previewPane.querySelector('#ov-it-zone');
      var canvasWrap = previewPane.querySelector('#ov-it-canvas-wrap');
      var panel = ctrlPane.querySelector('#ov-itp');
      bindToolSliderValue(panel, '#ov-iq', '#ov-iq-val', function (n) {
        return Math.round(n * 100) + '%';
      });
      bindToolSliderValue(panel, '#ov-isc', '#ov-isc-val');
      var img,
        c,
        ctx,
        rot = 0,
        flip = 1,
        lastImportedName = null;
      function applyCanvas() {
        if (!img) return;
        var sc = (+panel.querySelector('#ov-isc').value || 100) / 100;
        var w = Math.round(img.naturalWidth * sc);
        var h = Math.round(img.naturalHeight * sc);
        c.width = rot % 180 === 0 ? w : h;
        c.height = rot % 180 === 0 ? h : w;
        ctx.save();
        ctx.translate(c.width / 2, c.height / 2);
        ctx.rotate((rot * Math.PI) / 180);
        ctx.scale(flip, 1);
        ctx.drawImage(img, -w / 2, -h / 2, w, h);
        ctx.restore();
      }
      function load(f) {
        lastImportedName = f && f.name ? f.name : null;
        OV.loadImageFile(f).then(function (i) {
          img = i;
          rot = 0;
          flip = 1;
          c = previewPane.querySelector('#ov-itc');
          ctx = c.getContext('2d');
          canvasWrap.style.display = '';
          applyCanvas();
        });
      }
      OV.bindDropZone(zone, input, function (files) {
        if (files[0]) load(files[0]);
      });
      panel.querySelector('#ov-isc').addEventListener('input', applyCanvas);
      panel.querySelector('#ov-ir90').addEventListener('click', function () {
        rot = (rot + 90) % 360;
        applyCanvas();
      });
      panel.querySelector('#ov-iflip').addEventListener('click', function () {
        flip *= -1;
        applyCanvas();
      });
      panel.querySelector('#ov-idl').addEventListener('click', function () {
        var fmt = panel.querySelector('#ov-ifmt').value;
        var q = +panel.querySelector('#ov-iq').value || 0.92;
        var ext = fmt.indexOf('jpeg') > 0 ? 'jpg' : fmt.indexOf('webp') > 0 ? 'webp' : 'png';
        var stem = (lastImportedName || 'export').replace(/\.[^/.]+$/, '');
        OV.downloadCanvas(c, stem + '.' + ext, fmt, fmt.indexOf('png') >= 0 ? undefined : q);
      });
    }

    function renderBatchTab(previewPane, ctrlPane) {
      var input = el('<input type="file" accept="image/*" multiple style="display:none">');
      previewPane.innerHTML =
        '<div class="tool-stack tool-media-pane ov-iop-list-wrap" id="ov-iop-wrap" style="width:100%;min-height:0">' +
        '<div class="tool-stack" id="ov-iop"></div></div>';
      ctrlPane.innerHTML =
        '<div class="tool-stack">' +
        '<div class="drop-zone" id="ov-iop-zone">Drop images or click to batch optimize</div>' +
        '<p class="tool-out" style="margin-top:10px">Each row: preview, quality, format, export.</p></div>';
      iface.appendChild(input);
      var zone = ctrlPane.querySelector('#ov-iop-zone');
      var list = previewPane.querySelector('#ov-iop');
      function handle(files) {
        Array.prototype.forEach.call(files, function (file) {
          if (!file.type.match(/^image\//)) return;
          OV.loadImageFile(file).then(function (img) {
            var row = el('<div class="tool-row tool-row--top" style="border:1px solid var(--border);padding:12px;align-items:center"></div>');
            var prev = document.createElement('canvas');
            prev.width = 80;
            prev.height = 80;
            prev.style.border = '1px solid var(--border)';
            var cov = OV.canvasCover(img, 80, 80);
            prev.getContext('2d').drawImage(cov, 0, 0);
            row.appendChild(prev);
            var meta = el(
              '<div class="tool-field tool-field--grow"><span class="tool-label">' +
                file.name +
                '</span><span class="tool-meta-kb">' +
                (file.size / 1024).toFixed(1) +
                ' KB</span>' +
                '<div class="tool-row" style="margin-top:8px">' +
                '<div class="tool-field tool-field--slider" style="flex:1;min-width:140px">' +
                '<span class="tool-label">Quality</span>' +
                '<div class="tool-bpm-slider-row">' +
                '<input type="range" class="tool-input tool-input--range tool-input--bpm" min="0.5" max="1" step="0.05" value="0.85" data-q aria-valuenow="0.85">' +
                '<span class="tool-bpm-val" data-qv>85%</span></div></div>' +
                '<select class="tool-select" data-f><option value="image/jpeg">JPEG</option><option value="image/webp">WebP</option><option value="image/png">PNG</option></select>' +
                '<button type="button" class="tool-btn tool-btn--c" data-go>Export</button></div></div>'
            );
            row.appendChild(meta);
            bindToolSliderValue(meta, '[data-q]', '[data-qv]', function (n) {
              return Math.round(n * 100) + '%';
            });
            list.appendChild(row);
            var cFull = document.createElement('canvas');
            cFull.width = img.naturalWidth;
            cFull.height = img.naturalHeight;
            cFull.getContext('2d').drawImage(img, 0, 0);
            meta.querySelector('[data-go]').addEventListener('click', function () {
              var fmt = meta.querySelector('[data-f]').value;
              var q = +meta.querySelector('[data-q]').value;
              var ext = fmt.indexOf('jpeg') > 0 ? 'jpg' : fmt.indexOf('webp') > 0 ? 'webp' : 'png';
              OV.downloadCanvas(cFull, file.name.replace(/\.\w+$/, '') + '.' + ext, fmt, fmt.indexOf('png') >= 0 ? undefined : q);
            });
          });
        });
      }
      OV.bindDropZone(zone, input, handle);
    }

    tabs(iface, ['Convert & resize', 'Batch optimize'], [renderConvertTab, renderBatchTab], { split: true });
    var tb = iface.querySelectorAll('.tool-tabs .tool-tab');
    if (initialTab > 0 && tb[initialTab]) {
      tb[initialTab].click();
    }
  }

  /** Seek video for GIF frame capture; tolerates no-op seeks and waits for decode. */
  function seekVideoFrame(video, time) {
    return new Promise(function (resolve) {
      var dur = video.duration;
      if (!isFinite(dur) || dur <= 0) {
        resolve();
        return;
      }
      var t = Math.max(0, Math.min(time, dur - 1e-3));
      var finish = function () {
        requestAnimationFrame(function () {
          requestAnimationFrame(resolve);
        });
      };
      if (Math.abs(video.currentTime - t) < 0.0005) {
        finish();
        return;
      }
      var to = window.setTimeout(function () {
        video.removeEventListener('seeked', onSeeked);
        finish();
      }, 4000);
      function onSeeked() {
        window.clearTimeout(to);
        video.removeEventListener('seeked', onSeeked);
        finish();
      }
      video.addEventListener('seeked', onSeeked);
      try {
        video.currentTime = t;
      } catch (e) {
        window.clearTimeout(to);
        video.removeEventListener('seeked', onSeeked);
        finish();
      }
    });
  }

  /* Video → GIF (screen recordings: MP4, MOV) */
  function initVideoConverter(iface) {
    var VC_MAX_W = 8192;
    var input = el(
      '<input type="file" accept="video/mp4,video/quicktime,.mp4,.mov,.MOV" style="display:none">'
    );
    iface.innerHTML = toolShellSplit(
      '<div class="tool-stack tool-media-pane ov-vc-media">' +
        '<div class="drop-zone ov-vc-drop" id="ov-vc-zone" tabindex="0">Drop a screen recording (.mp4, .mov) or click to browse</div>' +
        '<div id="ov-vc-preview-wrap" class="ov-vc-preview-wrap" aria-hidden="true">' +
        '<video id="ov-vc-v" class="ov-vc-video" playsinline muted preload="metadata"></video></div>' +
        '<p class="tool-out ov-vc-status" id="ov-vc-status"></p></div>',
      '<div class="tool-stack" id="ov-vc-ctrl">' +
        '<div class="tool-row">' +
        '<div class="tool-field tool-field--slider">' +
        '<span class="tool-label">GIF frame rate</span>' +
        '<div class="tool-bpm-slider-row">' +
        '<input type="range" class="tool-input tool-input--range tool-input--bpm" id="ov-vc-fps" min="4" max="18" step="1" value="10" aria-valuenow="10">' +
        '<span class="tool-bpm-val" id="ov-vc-fps-val">10 fps</span></div></div>' +
        '<div class="tool-field tool-field--slider">' +
        '<span class="tool-label">Output width (px)</span>' +
        '<div class="tool-bpm-slider-row">' +
        '<input type="range" class="tool-input tool-input--range tool-input--bpm" id="ov-vc-mw" min="160" max="' +
        VC_MAX_W +
        '" step="1" value="1920" aria-valuenow="1920">' +
        '<span class="tool-bpm-val" id="ov-vc-mw-val">1920</span></div></div></div>' +
        '<p class="tool-out" id="ov-vc-out-lbl" style="margin:0"></p>' +
        '<div class="tool-row">' +
        '<div class="tool-field tool-field--slider">' +
        '<span class="tool-label">Max length (sec)</span>' +
        '<div class="tool-bpm-slider-row">' +
        '<input type="range" class="tool-input tool-input--range tool-input--bpm" id="ov-vc-maxsec" min="1" max="60" step="1" value="30" aria-valuenow="30">' +
        '<span class="tool-bpm-val" id="ov-vc-maxsec-val">30 s</span></div></div></div>' +
        '<div class="tool-row">' +
        '<button type="button" class="tool-btn" id="ov-vc-clear" hidden>Change video</button>' +
        '<button type="button" class="tool-btn tool-btn--c" id="ov-vc-go">Convert to GIF</button></div>' +
        '<p class="tool-out" style="margin-top:8px">Runs in your browser. Defaults match video resolution; lower width for smaller files. Very long clips: trim first.</p></div>'
    );
    iface.appendChild(input);
    var panel = iface.querySelector('#ov-vc-ctrl');
    bindToolSliderValue(panel, '#ov-vc-fps', '#ov-vc-fps-val', function (n) {
      return n + ' fps';
    });
    bindToolSliderValue(panel, '#ov-vc-mw', '#ov-vc-mw-val');
    bindToolSliderValue(panel, '#ov-vc-maxsec', '#ov-vc-maxsec-val', function (n) {
      return n + ' s';
    });
    var mediaRoot = iface.querySelector('.ov-vc-media');
    var zone = iface.querySelector('#ov-vc-zone');
    var wrap = iface.querySelector('#ov-vc-preview-wrap');
    var video = iface.querySelector('#ov-vc-v');
    var statusEl = iface.querySelector('#ov-vc-status');
    var outLbl = iface.querySelector('#ov-vc-out-lbl');
    var btn = iface.querySelector('#ov-vc-go');
    var clearBtn = iface.querySelector('#ov-vc-clear');
    var mwInput = panel.querySelector('#ov-vc-mw');
    var fileUrl = null;
    var currentFile = null;

    function isVideoFile(f) {
      if (!f) return false;
      if (f.type && /^video\//i.test(f.type)) return true;
      var n = String(f.name || '').toLowerCase();
      return /\.(mp4|m4v|mov|webm|mkv)$/i.test(n);
    }

    function setStatus(t) {
      if (statusEl) statusEl.textContent = t || '';
    }

    function updateOutLabel() {
      if (!outLbl || !mwInput) return;
      var vw = video.videoWidth;
      var vh = video.videoHeight;
      if (!vw || !vh) {
        outLbl.textContent = '';
        return;
      }
      var tw = +mwInput.value || vw;
      var scale = Math.min(1, tw / vw);
      var ow = Math.max(1, Math.round(vw * scale));
      var oh = Math.max(1, Math.round(vh * scale));
      var full = scale >= 0.9995 || tw >= vw;
      outLbl.textContent = 'GIF output: ' + ow + '×' + oh + (full ? ' (matches video)' : ' (scaled)');
    }

    function onVideoMetadata() {
      var w = video.videoWidth;
      var h = video.videoHeight;
      if (!w || !h) return;
      mwInput.min = '16';
      mwInput.max = String(VC_MAX_W);
      mwInput.value = String(Math.min(w, VC_MAX_W));
      mwInput.setAttribute('aria-valuenow', mwInput.value);
      var mv = panel.querySelector('#ov-vc-mw-val');
      if (mv) mv.textContent = mwInput.value;
      updateOutLabel();
    }

    mwInput.addEventListener('input', updateOutLabel);

    function clearVideo(skipStatusClear) {
      if (fileUrl) {
        try {
          URL.revokeObjectURL(fileUrl);
        } catch (e) {}
      }
      fileUrl = null;
      currentFile = null;
      video.removeAttribute('src');
      try {
        video.load();
      } catch (e) {}
      wrap.classList.remove('ov-vc-preview-wrap--visible');
      wrap.setAttribute('aria-hidden', 'true');
      if (mediaRoot) mediaRoot.classList.remove('ov-vc-media--has-file');
      if (clearBtn) {
        clearBtn.hidden = true;
        clearBtn.disabled = false;
      }
      if (!skipStatusClear) setStatus('');
      outLbl.textContent = '';
    }

    function loadFile(file) {
      if (!isVideoFile(file)) {
        setStatus('Use a video file (.mp4, .mov, etc.).');
        return;
      }
      if (fileUrl) {
        try {
          URL.revokeObjectURL(fileUrl);
        } catch (e) {}
      }
      currentFile = file;
      fileUrl = URL.createObjectURL(file);
      video.defaultMuted = true;
      video.muted = true;
      video.playsInline = true;
      video.preload = 'auto';
      video.src = fileUrl;
      if (mediaRoot) mediaRoot.classList.add('ov-vc-media--has-file');
      wrap.classList.add('ov-vc-preview-wrap--visible');
      wrap.setAttribute('aria-hidden', 'false');
      if (clearBtn) clearBtn.hidden = false;
      setStatus('Loading…');

      function onMeta() {
        onVideoMetadata();
        setStatus(file.name + ' — ready. Preview & convert below.');
      }

      function onErr() {
        clearVideo(true);
        setStatus('Could not decode this file. Try MP4 (H.264) or re-export from QuickTime.');
      }

      video.addEventListener('error', onErr, { once: true });
      if (video.readyState >= 1 && video.videoWidth > 0) {
        requestAnimationFrame(onMeta);
      } else {
        video.addEventListener('loadedmetadata', onMeta, { once: true });
      }
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        clearVideo();
      });
    }

    OV.bindDropZone(zone, input, function (files) {
      if (files[0]) loadFile(files[0]);
    });

    btn.addEventListener('click', function () {
      var G = typeof GIFenc !== 'undefined' ? GIFenc : window.GIFenc;
      if (!G || typeof G.GIFEncoder !== 'function') {
        alert('GIF encoder did not load. Refresh the page and try again.');
        return;
      }
      if (!currentFile || !video.src) {
        setStatus('Choose a video first.');
        return;
      }

      var fps = +panel.querySelector('#ov-vc-fps').value || 10;
      var maxW = +panel.querySelector('#ov-vc-mw').value || video.videoWidth || 1920;
      var maxSec = +panel.querySelector('#ov-vc-maxsec').value || 30;
      var delayMs = Math.max(20, Math.round(1000 / fps));

      btn.disabled = true;
      if (clearBtn) clearBtn.disabled = true;
      video.pause();

      function runEncode() {
        var dur = video.duration;
        if (!isFinite(dur) || dur <= 0) {
          setStatus('Could not read video duration.');
          btn.disabled = false;
          if (clearBtn) clearBtn.disabled = false;
          return;
        }
        var useDur = Math.min(dur, maxSec);
        var vw = video.videoWidth;
        var vh = video.videoHeight;
        if (!vw || !vh) {
          setStatus('Could not read video size. Wait for preview to load.');
          btn.disabled = false;
          if (clearBtn) clearBtn.disabled = false;
          return;
        }
        var scale = Math.min(1, maxW / vw);
        var cw = Math.max(1, Math.round(vw * scale));
        var ch = Math.max(1, Math.round(vh * scale));
        var nFrames = Math.min(360, Math.max(1, Math.ceil(useDur * fps)));
        var canvas = document.createElement('canvas');
        canvas.width = cw;
        canvas.height = ch;
        var ctx = canvas.getContext('2d');
        var gif = G.GIFEncoder();
        var quantize = G.quantize;
        var applyPalette = G.applyPalette;
        var fi = 0;

        function fail(msg) {
          setStatus(msg || 'GIF encoding failed.');
          btn.disabled = false;
          if (clearBtn) clearBtn.disabled = false;
        }

        function nextFrame() {
          if (fi >= nFrames) {
            try {
              gif.finish();
              var bytes = gif.bytes();
              var stem = (currentFile.name || 'recording').replace(/\.[^/.]+$/i, '');
              OV.downloadBlob(new Blob([bytes], { type: 'image/gif' }), stem + '.gif');
              setStatus('Done — ' + nFrames + ' frames at ' + cw + '×' + ch + '.');
            } catch (e) {
              console.error(e);
              fail('Could not finish GIF file.');
            }
            btn.disabled = false;
            if (clearBtn) clearBtn.disabled = false;
            return;
          }
          var t = Math.min((fi + 0.5) / fps, useDur - 1e-3);
          setStatus('Encoding frame ' + (fi + 1) + ' / ' + nFrames + '…');
          seekVideoFrame(video, t)
            .then(function () {
              try {
                ctx.drawImage(video, 0, 0, cw, ch);
                var imageData = ctx.getImageData(0, 0, cw, ch);
                var palette = quantize(imageData.data, 256);
                var index = applyPalette(imageData.data, palette);
                var opts = { palette: palette, delay: delayMs };
                if (fi === 0) opts.repeat = 0;
                gif.writeFrame(index, cw, ch, opts);
                fi++;
                window.setTimeout(nextFrame, 0);
              } catch (e) {
                console.error(e);
                fail('Frame ' + (fi + 1) + ' failed (memory or size). Try a lower output width.');
              }
            })
            .catch(function (e) {
              console.error(e);
              fail('Seek failed while building GIF.');
            });
        }
        nextFrame();
      }

      if (video.readyState >= 1 && video.videoWidth > 0) {
        runEncode();
      } else {
        setStatus('Waiting for video…');
        video.addEventListener(
          'loadedmetadata',
          function () {
            if (video.videoWidth > 0) runEncode();
            else {
              setStatus('Video has no frame size.');
              btn.disabled = false;
              if (clearBtn) clearBtn.disabled = false;
            }
          },
          { once: true }
        );
      }
    });

    OV.addCleanup(function () {
      if (fileUrl) {
        try {
          URL.revokeObjectURL(fileUrl);
        } catch (e) {}
      }
      fileUrl = null;
      currentFile = null;
    });
  }

  /* Social sizer */
  var SOCIAL = [
    { n: 'IG Portrait', w: 1080, h: 1350 },
    { n: 'IG Square', w: 1080, h: 1080 },
    { n: 'IG Story', w: 1080, h: 1920 },
    { n: 'FB Post', w: 1200, h: 630 },
    { n: 'X Post', w: 1200, h: 675 },
    { n: 'YT Thumb', w: 1280, h: 720 },
    { n: 'Pinterest', w: 1000, h: 1500 },
  ];

  function initSocialSizer(iface) {
    var input = el('<input type="file" accept="image/*" style="display:none">');
    iface.innerHTML = toolShellSplit(
      '<div class="tool-stack tool-media-pane" style="width:100%;min-height:0;align-items:stretch">' +
        '<div class="tool-grid-preview" id="ov-sg"></div></div>',
      '<div class="tool-stack">' +
        '<div class="drop-zone" id="ov-sz-zone">Drop one image</div>' +
        '<div class="tool-row"><button type="button" class="tool-btn tool-btn--c" id="ov-sz-all">Download all (ZIP)</button></div></div>'
    );
    iface.appendChild(input);
    var zone = iface.querySelector('#ov-sz-zone');
    var grid = iface.querySelector('#ov-sg');
    var source = null;
    var sourceFileName = null;
    function render() {
      if (!source) return;
      grid.innerHTML = '';
      SOCIAL.forEach(function (s) {
        var cell = el('<div class="tool-thumb"><canvas data-name="' + s.n + '"></canvas><div class="tool-label" style="position:absolute;bottom:2px;left:0;right:0;text-align:center;font-size:7px">' + s.n + '</div></div>');
        cell.style.position = 'relative';
        var cv = cell.querySelector('canvas');
        cv.width = s.w;
        cv.height = s.h;
        var x = cv.getContext('2d');
        var tmp = OV.canvasCover(source, s.w, s.h);
        x.drawImage(tmp, 0, 0);
        grid.appendChild(cell);
      });
    }
    OV.bindDropZone(zone, input, function (files) {
      if (!files[0]) return;
      sourceFileName = files[0].name || null;
      OV.loadImageFile(files[0]).then(function (img) {
        source = img;
        render();
      });
    });
    iface.querySelector('#ov-sz-all').addEventListener('click', function () {
      if (!source) return;
      OV.loadScriptOnce(OV.CDN_JSZIP, 'JSZip')
        .then(function () {
          var zip = new JSZip();
          var baseStem = (sourceFileName || 'export').replace(/\.[^/.]+$/, '');
          SOCIAL.forEach(function (s) {
            var c = document.createElement('canvas');
            c.width = s.w;
            c.height = s.h;
            c.getContext('2d').drawImage(OV.canvasCover(source, s.w, s.h), 0, 0);
            var name = baseStem + '_overprint_' + s.n.replace(/\s+/g, '-').toLowerCase() + '.png';
            var data = c.toDataURL('image/png').split(',')[1];
            zip.file(name, data, { base64: true });
          });
          return zip.generateAsync({ type: 'blob' });
        })
        .then(function (blob) {
          if (blob) {
            var zstem = (sourceFileName || 'export').replace(/\.[^/.]+$/, '');
            OV.downloadBlob(blob, zstem + '_social-sizes.zip');
          }
        })
        .catch(function () {
          window.alert('ZIP export needs a one-time load of JSZip from the network (cdn.jsdelivr.net).');
        });
    });
  }

  /* Grid crop */
  function initGridCrop(iface) {
    var input = el('<input type="file" accept="image/*" multiple style="display:none">');
    iface.innerHTML = toolShellSplit(
      '<div class="tool-stack tool-media-pane" style="width:100%;min-height:0;align-items:stretch">' +
        '<div class="tool-grid-preview" id="ov-gprev"></div></div>',
      '<div class="tool-stack">' +
        '<div class="drop-zone" id="ov-gz">Drop 1–20 images</div>' +
        '<div class="tool-row">' +
        '<div class="tool-field"><span class="tool-label">Aspect W:H</span><select class="tool-select" id="ov-gr">' +
        '<option value="4/5">4:5</option><option value="1/1">1:1</option><option value="16/9">16:9</option><option value="9/16">9:16</option></select></div>' +
        '<div class="tool-field tool-field--slider">' +
        '<span class="tool-label">Output max px</span>' +
        '<div class="tool-bpm-slider-row">' +
        '<input type="range" class="tool-input tool-input--range tool-input--bpm" id="ov-gm" min="200" max="4096" step="10" value="1080" aria-valuenow="1080">' +
        '<span class="tool-bpm-val" id="ov-gm-val">1080</span></div></div>' +
        '</div>' +
        '<div class="tool-row"><button type="button" class="tool-btn tool-btn--c" id="ov-gzip">ZIP all</button></div></div>'
    );
    iface.appendChild(input);
    bindToolSliderValue(iface, '#ov-gm', '#ov-gm-val');
    var files = [];
    function refreshGridPreview() {
      if (!files.length) return;
      var prev = iface.querySelector('#ov-gprev');
      prev.innerHTML = '';
      files.forEach(function (f, idx) {
        OV.loadImageFile(f).then(function (img) {
          var d = el('<div class="tool-thumb"></div>');
          var c = document.createElement('canvas');
          var r = iface.querySelector('#ov-gr').value.split('/');
          var rw = +r[0],
            rh = +r[1];
          var m = +iface.querySelector('#ov-gm').value || 1080;
          var ow, oh;
          if (rw >= rh) {
            ow = m;
            oh = Math.round((m * rh) / rw);
          } else {
            oh = m;
            ow = Math.round((m * rw) / rh);
          }
          var out = OV.cropToAspect(img, rw, rh, ow, oh);
          c.width = 120;
          c.height = 120;
          c.getContext('2d').drawImage(out, 0, 0, 120, 120);
          d.appendChild(c);
          d.dataset.index = idx;
          prev.appendChild(d);
        });
      });
    }
    OV.bindDropZone(iface.querySelector('#ov-gz'), input, function (fs) {
      files = fs.filter(function (f) {
        return f.type.match(/^image\//);
      }).slice(0, 20);
      refreshGridPreview();
    });
    iface.querySelector('#ov-gr').addEventListener('change', refreshGridPreview);
    iface.querySelector('#ov-gm').addEventListener('input', refreshGridPreview);
    function ratioWH() {
      var r = iface.querySelector('#ov-gr').value.split('/');
      return { rw: +r[0], rh: +r[1] };
    }
    iface.querySelector('#ov-gzip').addEventListener('click', function () {
      if (!files.length) return;
      OV.loadScriptOnce(OV.CDN_JSZIP, 'JSZip')
        .then(function () {
          var zip = new JSZip();
          var m = +iface.querySelector('#ov-gm').value || 1080;
          var rr = ratioWH();
          var done = 0;
          files.forEach(function (f, idx) {
            OV.loadImageFile(f).then(function (img) {
              var ow, oh;
              if (rr.rw >= rr.rh) {
                ow = m;
                oh = Math.round((m * rr.rh) / rr.rw);
              } else {
                oh = m;
                ow = Math.round((m * rr.rw) / rr.rh);
              }
              var out = OV.cropToAspect(img, rr.rw, rr.rh, ow, oh);
              var name = (f.name || 'image-' + idx).replace(/\.\w+$/, '') + '_overprint.png';
              var data = out.toDataURL('image/png').split(',')[1];
              zip.file(name, data, { base64: true });
              done++;
              if (done === files.length) {
                zip.generateAsync({ type: 'blob' }).then(function (blob) {
                  var zstem = (files[0].name || 'export').replace(/\.[^/.]+$/, '');
                  OV.downloadBlob(blob, zstem + '_grid-crop.zip');
                });
              }
            });
          });
        })
        .catch(function () {
          window.alert('ZIP export needs a one-time load of JSZip from the network (cdn.jsdelivr.net).');
        });
    });
  }

  /* Carousel maker */
  function initCarouselMaker(iface) {
    var input = el('<input type="file" accept="image/*" style="display:none">');
    iface.innerHTML = toolShellSplit(
      '<div class="tool-stack tool-media-pane" style="width:100%;min-height:0;align-items:stretch">' +
        '<div class="tool-grid-preview" id="ov-cprev"></div></div>',
      '<div class="tool-stack">' +
        '<div class="drop-zone" id="ov-cz">Drop one wide image</div>' +
        '<div class="tool-row">' +
        '<div class="tool-field tool-field--slider">' +
        '<span class="tool-label">Panels</span>' +
        '<div class="tool-bpm-slider-row">' +
        '<input type="range" class="tool-input tool-input--range tool-input--bpm" id="ov-cn" min="2" max="10" step="1" value="3" aria-valuenow="3">' +
        '<span class="tool-bpm-val" id="ov-cn-val">3</span></div></div>' +
        '<button type="button" class="tool-btn tool-btn--c" id="ov-cdl">Download ZIP</button></div></div>'
    );
    iface.appendChild(input);
    bindToolSliderValue(iface, '#ov-cn', '#ov-cn-val');
    var wrap = iface.querySelector('#ov-cprev');
    var srcImg = null;
    var carouselSourceName = null;
    OV.bindDropZone(iface.querySelector('#ov-cz'), input, function (fs) {
      if (!fs[0]) return;
      carouselSourceName = fs[0].name || null;
      OV.loadImageFile(fs[0]).then(function (img) {
        srcImg = img;
        slice();
      });
    });
    function slice() {
      if (!srcImg) return;
      var n = +iface.querySelector('#ov-cn').value || 3;
      wrap.innerHTML = '';
      var w = srcImg.naturalWidth;
      var h = srcImg.naturalHeight;
      var sliceW = w / n;
      for (var i = 0; i < n; i++) {
        var c = document.createElement('canvas');
        c.width = sliceW;
        c.height = h;
        c.getContext('2d').drawImage(srcImg, i * sliceW, 0, sliceW, h, 0, 0, sliceW, h);
        var thumb = document.createElement('canvas');
        thumb.width = 100;
        thumb.height = Math.round((100 * h) / sliceW);
        thumb.getContext('2d').drawImage(c, 0, 0, thumb.width, thumb.height);
        var cell = el('<div class="tool-thumb"></div>');
        cell.appendChild(thumb);
        wrap.appendChild(cell);
        c.dataset.panel = i;
      }
    }
    iface.querySelector('#ov-cn').addEventListener('input', slice);
    iface.querySelector('#ov-cdl').addEventListener('click', function () {
      if (!srcImg) return;
      OV.loadScriptOnce(OV.CDN_JSZIP, 'JSZip')
        .then(function () {
          var n = +iface.querySelector('#ov-cn').value || 3;
          var zip = new JSZip();
          var w = srcImg.naturalWidth;
          var h = srcImg.naturalHeight;
          var sliceW = w / n;
          var cstem = (carouselSourceName || 'export').replace(/\.[^/.]+$/, '');
          for (var i = 0; i < n; i++) {
            var c = document.createElement('canvas');
            c.width = sliceW;
            c.height = h;
            c.getContext('2d').drawImage(srcImg, i * sliceW, 0, sliceW, h, 0, 0, sliceW, h);
            zip.file(
              cstem + '_overprint_panel-' + (i + 1) + '.png',
              c.toDataURL('image/png').split(',')[1],
              { base64: true }
            );
          }
          return zip.generateAsync({ type: 'blob' });
        })
        .then(function (blob) {
          if (blob) {
            var zstem = (carouselSourceName || 'export').replace(/\.[^/.]+$/, '');
            OV.downloadBlob(blob, zstem + '_carousel.zip');
          }
        })
        .catch(function () {
          window.alert('ZIP export needs a one-time load of JSZip from the network (cdn.jsdelivr.net).');
        });
    });
  }

  /* Screenshot beautifier */
  function initScreenshotBeautifier(iface) {
    var input = el('<input type="file" accept="image/*" style="display:none">');
    iface.innerHTML = toolShellSplit(
      '<div class="tool-stack tool-media-pane ss-beaut-media" style="width:100%;min-height:0;align-items:stretch">' +
        '<div class="drop-zone" id="ov-ssz">Drop screenshot</div>' +
        '<div class="ss-beaut-preview-wrap" id="ov-spw" style="display:none" aria-hidden="true">' +
        '<canvas id="ov-spc" class="ss-beaut-canvas ss-beaut-canvas--view"></canvas></div>' +
        '<canvas id="ov-spex" class="ss-beaut-canvas ss-beaut-canvas--export" width="0" height="0" style="display:none" aria-hidden="true"></canvas></div>',
      '<div class="tool-stack ss-beaut-tool">' +
        '<details class="ss-beaut-section" open>' +
        '<summary class="ss-beaut-sum">' +
        '<span class="tool-disclosure-chev" aria-hidden="true"><svg viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg" focusable="false"><path d="M4.5 2.5L8.5 6 4.5 9.5"/></svg></span>' +
        '<span class="ss-beaut-sum-t">Presets</span>' +
        '</summary>' +
        '<div class="ss-beaut-body">' +
        '<div class="ss-beaut-ratio-row">' +
        '<button type="button" class="tool-btn tool-btn--preset" data-ss-ratio="16:9">16:9</button>' +
        '<button type="button" class="tool-btn tool-btn--preset" data-ss-ratio="4:3">4:3</button>' +
        '<button type="button" class="tool-btn tool-btn--preset" data-ss-ratio="1:1">1:1</button>' +
        '<button type="button" class="tool-btn tool-btn--preset" data-ss-ratio="9:16">9:16</button>' +
        '<button type="button" class="tool-btn tool-btn--preset" data-ss-ratio="4:5">4:5</button>' +
        '<button type="button" class="tool-btn tool-btn--preset" data-ss-ratio="21:9">21:9</button>' +
        '</div>' +
        '</div></details>' +
        '<details class="ss-beaut-section">' +
        '<summary class="ss-beaut-sum">' +
        '<span class="tool-disclosure-chev" aria-hidden="true"><svg viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg" focusable="false"><path d="M4.5 2.5L8.5 6 4.5 9.5"/></svg></span>' +
        '<span class="ss-beaut-sum-t">Dimensions</span>' +
        '</summary>' +
        '<div class="ss-beaut-body">' +
        '<div class="tool-row ss-beaut-dim-row">' +
        '<div class="tool-field">' +
        '<span class="tool-label">Units</span>' +
        '<select class="tool-select" id="ov-sunit" aria-label="Dimension units">' +
        '<option value="px" selected>Pixels</option>' +
        '<option value="in">Inches</option></select></div>' +
        '<div class="tool-field ss-beaut-dpi-wrap" id="ov-sdpi-wrap" hidden>' +
        '<span class="tool-label">DPI</span>' +
        '<input type="number" class="tool-input" id="ov-sdpi" min="36" max="1200" step="1" value="96"></div>' +
        '<div class="tool-field">' +
        '<span class="tool-label" id="ov-swl">Width</span>' +
        '<input type="number" class="tool-input" id="ov-sww" min="0.01" step="0.01" value="1920"></div>' +
        '<div class="tool-field">' +
        '<span class="tool-label" id="ov-shl">Height</span>' +
        '<input type="number" class="tool-input" id="ov-swh" min="0.01" step="0.01" value="1080"></div>' +
        '</div></div></details>' +
        '<details class="ss-beaut-section">' +
        '<summary class="ss-beaut-sum">' +
        '<span class="tool-disclosure-chev" aria-hidden="true"><svg viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg" focusable="false"><path d="M4.5 2.5L8.5 6 4.5 9.5"/></svg></span>' +
        '<span class="ss-beaut-sum-t">Background</span>' +
        '</summary>' +
        '<div class="ss-beaut-body">' +
        '<div class="tool-row">' +
        '<div class="tool-field tool-field--grow">' +
        '<span class="tool-label">Style</span>' +
        '<select class="tool-select" id="ov-sgrad" aria-label="Background style">' +
        '<option value="solid">Solid</option>' +
        '<option value="lin-twilight">Twilight</option>' +
        '<option value="lin-sunset">Sunset</option>' +
        '<option value="lin-ocean">Ocean</option>' +
        '<option value="lin-mint">Mint</option>' +
        '<option value="lin-rose">Rose</option>' +
        '<option value="rad-glow">Glow</option>' +
        '<option value="rad-vignette">Vignette</option>' +
        '<option value="lin-mesh">Mesh</option>' +
        '</select></div></div>' +
        '<div class="tool-row ss-beaut-bg-colors" id="ov-sbg-row">' +
        '<div class="tool-field" id="ov-sbg1-wrap">' +
        '<span class="tool-label" id="ov-sbg1-l">Color</span>' +
        '<input type="color" class="tool-input" id="ov-sbg" value="#00b4d8" aria-label="Background color"></div>' +
        '<div class="tool-field" id="ov-sbg2-wrap" hidden>' +
        '<span class="tool-label">Color 2</span>' +
        '<input type="color" class="tool-input" id="ov-sbg2" value="#4a6fa5" aria-label="Background color 2"></div>' +
        '<div class="tool-field" id="ov-sbg3-wrap" hidden>' +
        '<span class="tool-label">Color 3</span>' +
        '<input type="color" class="tool-input" id="ov-sbg3" value="#c9a0dc" aria-label="Background color 3"></div>' +
        '</div>' +
        '<div class="tool-row ss-beaut-preset-row" id="ov-sbg-preset-wrap">' +
        '<div class="tool-field tool-field--grow">' +
        '<span class="tool-label">Presets</span>' +
        '<select class="tool-select" id="ov-sbg-presets" aria-label="Background color preset">' +
        '<option value="">Custom (use swatches)</option></select></div></div>' +
        '</div></details>' +
        '<details class="ss-beaut-section">' +
        '<summary class="ss-beaut-sum">' +
        '<span class="tool-disclosure-chev" aria-hidden="true"><svg viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg" focusable="false"><path d="M4.5 2.5L8.5 6 4.5 9.5"/></svg></span>' +
        '<span class="ss-beaut-sum-t">Image</span></summary>' +
        '<div class="ss-beaut-body">' +
        '<div class="tool-row">' +
        '<div class="tool-field tool-field--slider">' +
        '<span class="tool-label">Size</span>' +
        '<div class="tool-bpm-slider-row">' +
        '<input type="range" class="tool-input tool-input--range tool-input--bpm" id="ov-spad" min="0" max="200" step="2" value="48" aria-valuenow="48">' +
        '<span class="tool-bpm-val" id="ov-spad-val">48</span></div></div>' +
        '<div class="tool-field tool-field--slider">' +
        '<span class="tool-label">Radius</span>' +
        '<div class="tool-bpm-slider-row">' +
        '<input type="range" class="tool-input tool-input--range tool-input--bpm" id="ov-srd" min="0" max="64" step="1" value="12" aria-valuenow="12">' +
        '<span class="tool-bpm-val" id="ov-srd-val">12</span></div></div>' +
        '</div></div></details>' +
        '<details class="ss-beaut-section">' +
        '<summary class="ss-beaut-sum">' +
        '<span class="tool-disclosure-chev" aria-hidden="true"><svg viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg" focusable="false"><path d="M4.5 2.5L8.5 6 4.5 9.5"/></svg></span>' +
        '<label class="ss-beaut-sum-shadow">' +
        '<input type="checkbox" id="ov-ss-on" checked aria-label="Shadow enabled">' +
        '<span class="ss-beaut-sum-t">Shadow</span>' +
        '</label>' +
        '</summary>' +
        '<div class="ss-beaut-body">' +
        '<div class="tool-row">' +
        '<div class="tool-field tool-field--slider">' +
        '<span class="tool-label">Blur</span>' +
        '<div class="tool-bpm-slider-row">' +
        '<input type="range" class="tool-input tool-input--range tool-input--bpm" id="ov-ssb" min="0" max="80" step="1" value="24" aria-valuenow="24">' +
        '<span class="tool-bpm-val" id="ov-ssb-val">24</span></div></div>' +
        '<div class="tool-field tool-field--slider">' +
        '<span class="tool-label">Offset Y</span>' +
        '<div class="tool-bpm-slider-row">' +
        '<input type="range" class="tool-input tool-input--range tool-input--bpm" id="ov-ssy" min="0" max="48" step="1" value="10" aria-valuenow="10">' +
        '<span class="tool-bpm-val" id="ov-ssy-val">10</span></div></div>' +
        '<div class="tool-field tool-field--slider">' +
        '<span class="tool-label">Offset X</span>' +
        '<div class="tool-bpm-slider-row">' +
        '<input type="range" class="tool-input tool-input--range tool-input--bpm" id="ov-ssx" min="-40" max="40" step="1" value="0" aria-valuenow="0">' +
        '<span class="tool-bpm-val" id="ov-ssx-val">0</span></div></div>' +
        '</div></div></details>' +
        '<div class="tool-row" style="margin-top:4px"><button type="button" class="tool-btn tool-btn--c" id="ov-sdl">Export PNG</button></div></div>'
    );
    iface.appendChild(input);
    /** Per-style palette presets (hex count matches ssBeautColorCount for that style). */
    var SS_BEAUT_BG_PRESETS = {
      solid: [
        { label: 'Brand cyan', c: ['#00b4d8'] },
        { label: 'Charcoal', c: ['#131318'] },
        { label: 'Warm paper', c: ['#f5f0e8'] },
        { label: 'Slate blue', c: ['#334155'] },
        { label: 'Deep pine', c: ['#14532d'] },
        { label: 'Oxblood', c: ['#3f1018'] },
      ],
      /* lin-twilight: dark base + second hue at center; ends darken toward black */
      'lin-twilight': [
        { label: 'Blue hour', c: ['#0d1b2a', '#778da9'] },
        { label: 'Violet dusk', c: ['#1e1b4b', '#a78bfa'] },
        { label: 'Rose afterglow', c: ['#2d1b2e', '#d4a5a5'] },
        { label: 'Steel twilight', c: ['#0f172a', '#94a3b8'] },
      ],
      /* lin-sunset: warm progression (mixes toward white) */
      'lin-sunset': [
        { label: 'Golden hour', c: ['#d97706', '#fde68a'] },
        { label: 'Coral sky', c: ['#ea580c', '#fecaca'] },
        { label: 'Magenta blaze', c: ['#db2777', '#fae8ff'] },
        { label: 'Desert sundown', c: ['#c2410c', '#fef3c7'] },
      ],
      /* lin-ocean: deep top (c1+black) → bright shallow (c2+white) */
      'lin-ocean': [
        { label: 'Midnight sea', c: ['#0c4a6e', '#38bdf8'] },
        { label: 'Pacific', c: ['#1e3a8a', '#7dd3fc'] },
        { label: 'Tropical reef', c: ['#115e59', '#5eead4'] },
        { label: 'Storm surge', c: ['#1e293b', '#93c5fd'] },
      ],
      /* lin-mint: cool green / teal (not yellow-green) */
      'lin-mint': [
        { label: 'Spearmint', c: ['#134e4a', '#34d399'] },
        { label: 'Eucalyptus', c: ['#14532d', '#86efac'] },
        { label: 'Seafoam', c: ['#164e63', '#a5f3fc'] },
        { label: 'Winter ice', c: ['#0f766e', '#ccfbf1'] },
      ],
      /* lin-rose: diagonal soft romantic */
      'lin-rose': [
        { label: 'Dusty blush', c: ['#be123c', '#ffe4e6'] },
        { label: 'Mauve mist', c: ['#86198f', '#f5d0fe'] },
        { label: 'Champagne rose', c: ['#b45309', '#fff7ed'] },
        { label: 'Wild berry', c: ['#831843', '#fbcfe8'] },
      ],
      /* rad-glow: center → mid ring → dark edge */
      'rad-glow': [
        { label: 'Ember core', c: ['#fff7ed', '#ea580c', '#1c0a05'] },
        { label: 'Moon halo', c: ['#f1f5f9', '#64748b', '#0f172a'] },
        { label: 'Biolume', c: ['#e0f2fe', '#06b6d4', '#082f49'] },
        { label: 'Amethyst orb', c: ['#f3e8ff', '#a855f7', '#1e1b4b'] },
      ],
      /* rad-vignette: bright center fades to dark edge */
      'rad-vignette': [
        { label: 'Studio gray', c: ['#71717a', '#18181b'] },
        { label: 'Sepia frame', c: ['#a8a29e', '#1c1917'] },
        { label: 'Cool steel', c: ['#64748b', '#020617'] },
        { label: 'Warm vignette', c: ['#d6d3d1', '#292524'] },
      ],
      /* lin-mesh: three-way blend; c1 dark corner, c2 mid, c3 far edge */
      'lin-mesh': [
        { label: 'Synthwave', c: ['#4c1d95', '#f472b6', '#0f0518'] },
        { label: 'Deep lagoon', c: ['#134e4a', '#2dd4bf', '#042f2e'] },
        { label: 'Copper rust', c: ['#7c2d12', '#fb923c', '#1c0a05'] },
        { label: 'Royal iris', c: ['#312e81', '#818cf8', '#0f0a1f'] },
      ],
    };
    bindToolSliderValue(iface, '#ov-spad', '#ov-spad-val');
    bindToolSliderValue(iface, '#ov-srd', '#ov-srd-val');
    bindToolSliderValue(iface, '#ov-ssb', '#ov-ssb-val');
    bindToolSliderValue(iface, '#ov-ssy', '#ov-ssy-val');
    bindToolSliderValue(iface, '#ov-ssx', '#ov-ssx-val');
    var shot = null;
    var ssSourceName = null;
    var unitPrev = 'px';
    /** Keeps on-screen screenshot width stable; frame (canvas) scales around it. */
    var lastPreviewMetrics = null;
    var PREVIEW_SCREENSHOT_CSS_PX = 420;
    function syncSsShadowUi() {
      var on = iface.querySelector('#ov-ss-on');
      var en = on && on.checked;
      ['#ov-ssb', '#ov-ssy', '#ov-ssx'].forEach(function (sel) {
        var el = iface.querySelector(sel);
        if (el) el.disabled = !en;
      });
    }
    function syncBeautMediaUi() {
      var dz = iface.querySelector('#ov-ssz');
      var wrap = iface.querySelector('#ov-spw');
      var c = iface.querySelector('#ov-spc');
      if (!dz || !c) return;
      if (shot) {
        dz.style.display = 'none';
        if (wrap) {
          wrap.style.display = 'flex';
          wrap.setAttribute('aria-hidden', 'false');
        }
      } else {
        dz.style.display = '';
        if (wrap) {
          wrap.style.display = 'none';
          wrap.setAttribute('aria-hidden', 'true');
        }
        c.style.width = '';
        c.style.height = '';
        lastPreviewMetrics = null;
        var ex = iface.querySelector('#ov-spex');
        if (ex) {
          ex.width = 0;
          ex.height = 0;
        }
      }
    }
    function applyPreviewScale() {
      if (!shot || !lastPreviewMetrics) return;
      var c = iface.querySelector('#ov-spc');
      var wrap = iface.querySelector('#ov-spw');
      if (!c || !wrap) return;
      var cw = lastPreviewMetrics.cw;
      var ch = lastPreviewMetrics.ch;
      var drawW = lastPreviewMetrics.drawW;
      if (cw < 1 || ch < 1) return;
      if (drawW < 0.5) drawW = 0.5;
      /* Match on-screen width of the fitted screenshot to PREVIEW_SCREENSHOT_CSS_PX (same pixel space as cw/ch/drawW). */
      var s = PREVIEW_SCREENSHOT_CSS_PX / drawW;
      var dispW = cw * s;
      var dispH = ch * s;
      /*
       * Measure the scrollport from the media pane, not the inner wrap: when a vertical scrollbar
       * appears/disappears, wrap.clientWidth used to jump (~8px) and ResizeObserver + clamp fought
       * the layout (bad when switching landscape presets ↔ portrait like 4:3 ↔ 4:5). scrollbar-gutter:stable
       * helps; still use the pane for max dimensions.
       */
      var pane = wrap.parentElement;
      var maxW = pane && pane.clientWidth > 0 ? pane.clientWidth - 4 : 0;
      var maxH = pane && pane.clientHeight > 0 ? pane.clientHeight - 28 : 0;
      if (maxW > 0 && dispW > maxW) {
        var f = maxW / dispW;
        dispW *= f;
        dispH *= f;
      }
      if (maxH > 0 && dispH > maxH) {
        var f2 = maxH / dispH;
        dispW *= f2;
        dispH *= f2;
      }
      var rw = Math.max(1, Math.round(dispW));
      c.style.width = rw + 'px';
      c.style.maxWidth = '100%';
      c.style.height = 'auto';
    }
    function getDpi() {
      var d = +iface.querySelector('#ov-sdpi').value;
      return isNaN(d) || d < 1 ? 96 : d;
    }
    function syncDimLabels() {
      var u = iface.querySelector('#ov-sunit').value;
      var px = u === 'px';
      iface.querySelector('#ov-swl').textContent = px ? 'Width (px)' : 'Width (in)';
      iface.querySelector('#ov-shl').textContent = px ? 'Height (px)' : 'Height (in)';
      var dpiWrap = iface.querySelector('#ov-sdpi-wrap');
      if (dpiWrap) {
        if (px) {
          dpiWrap.setAttribute('hidden', '');
        } else {
          dpiWrap.removeAttribute('hidden');
        }
      }
    }
    function parseRatio(str) {
      var p = str.split(':');
      var a = +p[0];
      var b = +p[1];
      if (!a || !b) return { rw: 16, rh: 9 };
      return { rw: a, rh: b };
    }
    function readDimsPx() {
      var u = iface.querySelector('#ov-sunit').value;
      var dpi = getDpi();
      var w = parseFloat(iface.querySelector('#ov-sww').value);
      var h = parseFloat(iface.querySelector('#ov-swh').value);
      if (isNaN(w) || isNaN(h) || w <= 0 || h <= 0) return null;
      if (u === 'in') {
        w *= dpi;
        h *= dpi;
      }
      return {
        w: Math.round(Math.max(100, Math.min(8192, w))),
        h: Math.round(Math.max(100, Math.min(8192, h))),
      };
    }
    function applyRatioPreset(ratioStr) {
      var R = parseRatio(ratioStr);
      var u = iface.querySelector('#ov-sunit').value;
      var wEl = iface.querySelector('#ov-sww');
      var hEl = iface.querySelector('#ov-swh');
      var w = parseFloat(wEl.value);
      var h = parseFloat(hEl.value);
      if (isNaN(w) || w <= 0) w = u === 'in' ? 10 : 1920;
      if (isNaN(h) || h <= 0) h = u === 'in' ? 10 : 1080;
      /*
       * Anchor on the long edge of the current box (not “keep width” vs “keep height” by preset).
       * The old rule shrank dimensions every time you alternated landscape ↔ portrait presets
       * (e.g. 4:3 ↔ 4:5), eventually locking to tiny sizes like 16×20.
       */
      var targetAspect = R.rw / R.rh;
      var longEdge = Math.max(w, h);
      if (u === 'px') longEdge = Math.max(100, longEdge);
      var newW;
      var newH;
      if (R.rw >= R.rh) {
        newW = longEdge;
        newH = longEdge / targetAspect;
      } else {
        newH = longEdge;
        newW = longEdge * targetAspect;
      }
      if (u === 'px') {
        newW = Math.round(newW);
        newH = Math.round(newH);
        if (newW < 100 || newH < 100) {
          var bump = Math.max(100 / newW, 100 / newH);
          newW = Math.max(100, Math.round(newW * bump));
          newH = Math.max(100, Math.round(newH * bump));
        }
      }
      wEl.value = u === 'in' ? newW.toFixed(3) : String(newW);
      hEl.value = u === 'in' ? newH.toFixed(3) : String(newH);
    }
    function onUnitChange() {
      var cur = iface.querySelector('#ov-sunit').value;
      var dpi = getDpi();
      var wEl = iface.querySelector('#ov-sww');
      var hEl = iface.querySelector('#ov-swh');
      var w = parseFloat(wEl.value);
      var h = parseFloat(hEl.value);
      if (isNaN(w) || isNaN(h)) return;
      if (unitPrev === 'px' && cur === 'in') {
        wEl.value = (w / dpi).toFixed(3);
        hEl.value = (h / dpi).toFixed(3);
      } else if (unitPrev === 'in' && cur === 'px') {
        wEl.value = String(Math.round(w * dpi));
        hEl.value = String(Math.round(h * dpi));
      }
      unitPrev = cur;
      syncDimLabels();
    }
    function getSsBgColors() {
      var c1 = iface.querySelector('#ov-sbg').value;
      var w2 = iface.querySelector('#ov-sbg2-wrap');
      var w3 = iface.querySelector('#ov-sbg3-wrap');
      var c2 = c1;
      var c3 = c1;
      if (w2 && !w2.hasAttribute('hidden')) {
        c2 = iface.querySelector('#ov-sbg2').value;
      }
      if (w3 && !w3.hasAttribute('hidden')) {
        c3 = iface.querySelector('#ov-sbg3').value;
      } else if (w2 && !w2.hasAttribute('hidden')) {
        c3 = c2;
      }
      return { c1: c1, c2: c2, c3: c3 };
    }
    /** How many user color swatches the current fillBackground() recipe actually reads (matches composition). */
    function ssBeautColorCount(gradId) {
      if (gradId === 'solid' || !gradId) return 1;
      if (gradId === 'rad-glow' || gradId === 'lin-mesh') return 3;
      return 2;
    }
    function syncSSBeautBgUi() {
      var v = iface.querySelector('#ov-sgrad').value;
      var w2 = iface.querySelector('#ov-sbg2-wrap');
      var w3 = iface.querySelector('#ov-sbg3-wrap');
      var l1 = iface.querySelector('#ov-sbg1-l');
      var n = ssBeautColorCount(v);
      if (n <= 1) {
        if (w2) w2.setAttribute('hidden', '');
        if (w3) w3.setAttribute('hidden', '');
        if (l1) l1.textContent = 'Color';
      } else if (n === 2) {
        if (w2) w2.removeAttribute('hidden');
        if (w3) w3.setAttribute('hidden', '');
        if (l1) l1.textContent = 'Color 1';
      } else {
        if (w2) w2.removeAttribute('hidden');
        if (w3) w3.removeAttribute('hidden');
        if (l1) l1.textContent = 'Color 1';
      }
    }
    function syncSSBeautPresetsUI() {
      var gradId = iface.querySelector('#ov-sgrad').value;
      var sel = iface.querySelector('#ov-sbg-presets');
      if (!sel) return;
      var list = SS_BEAUT_BG_PRESETS[gradId] || [];
      sel.innerHTML = '';
      var o0 = document.createElement('option');
      o0.value = '';
      o0.textContent = 'Custom (use swatches)';
      sel.appendChild(o0);
      list.forEach(function (p, i) {
        var o = document.createElement('option');
        o.value = String(i);
        o.textContent = p.label;
        sel.appendChild(o);
      });
      sel.value = '';
    }
    function applySsBeautPresetByIndex(idx) {
      var gradId = iface.querySelector('#ov-sgrad').value;
      var list = SS_BEAUT_BG_PRESETS[gradId] || [];
      var p = list[idx];
      if (!p || !p.c || !p.c.length) return;
      iface.querySelector('#ov-sbg').value = p.c[0];
      var i2 = iface.querySelector('#ov-sbg2');
      var i3 = iface.querySelector('#ov-sbg3');
      if (p.c[1] && i2) i2.value = p.c[1];
      if (p.c[2] && i3) i3.value = p.c[2];
      compose();
    }
    function onSsBgColorInput() {
      var sel = iface.querySelector('#ov-sbg-presets');
      if (sel) sel.value = '';
      compose();
    }
    function fillBackground(ctx, w, h, gradId, colors) {
      var g;
      var c1 = colors.c1 || '#00b4d8';
      var c2 = colors.c2 || c1;
      var c3 = colors.c3 || c2;
      function hexToRgb(hex) {
        var m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex);
        if (!m) return { r: 19, g: 19, b: 24 };
        return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
      }
      function mix(a, b, t) {
        return {
          r: Math.round(a.r + (b.r - a.r) * t),
          g: Math.round(a.g + (b.g - a.g) * t),
          b: Math.round(a.b + (b.b - a.b) * t),
        };
      }
      function rgbStr(o) {
        return 'rgb(' + o.r + ',' + o.g + ',' + o.b + ')';
      }
      var K = { r: 0, g: 0, b: 0 };
      var W = { r: 255, g: 255, b: 255 };
      var T = hexToRgb(c1);
      var T2 = hexToRgb(c2);
      var T3 = hexToRgb(c3);
      if (gradId === 'solid' || !gradId) {
        ctx.fillStyle = c1;
        ctx.fillRect(0, 0, w, h);
        return;
      }
      switch (gradId) {
        case 'lin-twilight': {
          g = ctx.createLinearGradient(0, 0, w, h);
          g.addColorStop(0, rgbStr(mix(T, K, 0.35)));
          g.addColorStop(0.5, rgbStr(mix(T, T2, 0.55)));
          g.addColorStop(1, rgbStr(mix(T2, K, 0.4)));
          break;
        }
        case 'lin-sunset': {
          g = ctx.createLinearGradient(0, 0, w, h * 0.9);
          g.addColorStop(0, rgbStr(mix(T, W, 0.12)));
          g.addColorStop(0.5, rgbStr(mix(T, T2, 0.5)));
          g.addColorStop(1, rgbStr(mix(T2, W, 0.18)));
          break;
        }
        case 'lin-ocean': {
          g = ctx.createLinearGradient(0, 0, w, h);
          g.addColorStop(0, rgbStr(mix(T, K, 0.45)));
          g.addColorStop(1, rgbStr(mix(T2, W, 0.25)));
          break;
        }
        case 'lin-mint': {
          g = ctx.createLinearGradient(0, h, w, 0);
          g.addColorStop(0, rgbStr(mix(T, K, 0.2)));
          g.addColorStop(1, rgbStr(mix(T2, W, 0.28)));
          break;
        }
        case 'lin-rose': {
          g = ctx.createLinearGradient(w, 0, 0, h);
          g.addColorStop(0, rgbStr(mix(T, W, 0.15)));
          g.addColorStop(1, rgbStr(mix(T2, W, 0.35)));
          break;
        }
        case 'rad-glow': {
          g = ctx.createRadialGradient(w * 0.45, h * 0.35, 0, w * 0.5, h * 0.5, Math.max(w, h) * 0.85);
          g.addColorStop(0, rgbStr(mix(T, W, 0.08)));
          g.addColorStop(0.45, rgbStr(mix(T, T2, 0.42)));
          g.addColorStop(1, rgbStr(mix(T3, K, 0.82)));
          break;
        }
        case 'rad-vignette': {
          g = ctx.createRadialGradient(w * 0.5, h * 0.5, Math.min(w, h) * 0.15, w * 0.5, h * 0.5, Math.max(w, h) * 0.72);
          g.addColorStop(0, rgbStr(mix(T, W, 0.06)));
          g.addColorStop(1, rgbStr(mix(T2, K, 0.88)));
          break;
        }
        case 'lin-mesh': {
          g = ctx.createLinearGradient(0, 0, w, h);
          g.addColorStop(0, rgbStr(mix(T, K, 0.15)));
          g.addColorStop(0.45, rgbStr(mix(T, T2, 0.5)));
          g.addColorStop(1, rgbStr(mix(T3, K, 0.2)));
          break;
        }
        default: {
          ctx.fillStyle = c1;
          ctx.fillRect(0, 0, w, h);
          return;
        }
      }
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
    function roundedPath(ctx, dx, dy, dw, dh, r) {
      r = Math.min(r, dw / 2, dh / 2);
      ctx.beginPath();
      ctx.moveTo(dx + r, dy);
      ctx.lineTo(dx + dw - r, dy);
      ctx.quadraticCurveTo(dx + dw, dy, dx + dw, dy + r);
      ctx.lineTo(dx + dw, dy + dh - r);
      ctx.quadraticCurveTo(dx + dw, dy + dh, dx + dw - r, dy + dh);
      ctx.lineTo(dx + r, dy + dh);
      ctx.quadraticCurveTo(dx, dy + dh, dx, dy + dh - r);
      ctx.lineTo(dx, dy + r);
      ctx.quadraticCurveTo(dx, dy, dx + r, dy);
      ctx.closePath();
    }
    /** Preview bitmap: upscale small exports so the on-screen preview stays sharp; cap huge exports for perf. */
    function previewScaleForLongEdge(m) {
      var MIN = 1600;
      var CAP = 2560;
      if (m < MIN) return MIN / m;
      if (m > CAP) return CAP / m;
      return 1;
    }
    /** Draw one frame at the given pixel dimensions (pad/rad/shadow in the same space as cw×ch). Returns { drawW } or null. */
    function renderBeautifiedToCanvas(canvas, cw, ch, pad, rad, sBlur, sY, sX, gradId, bgColors) {
      var iw = shot.naturalWidth;
      var ih = shot.naturalHeight;
      var availW = cw - pad * 2;
      var availH = ch - pad * 2;
      if (availW < 8 || availH < 8) return null;
      var fit = Math.min(availW / iw, availH / ih);
      var drawW = iw * fit;
      var drawH = ih * fit;
      var ox = pad + (availW - drawW) / 2;
      var oy = pad + (availH - drawH) / 2;
      var rr = Math.min(rad, drawW / 2, drawH / 2);
      canvas.width = cw;
      canvas.height = ch;
      var ctx = canvas.getContext('2d');
      fillBackground(ctx, cw, ch, gradId, bgColors);
      var tmp = document.createElement('canvas');
      tmp.width = Math.max(1, Math.ceil(drawW));
      tmp.height = Math.max(1, Math.ceil(drawH));
      var tx = tmp.getContext('2d');
      tx.save();
      roundedPath(tx, 0, 0, drawW, drawH, rr);
      tx.clip();
      tx.drawImage(shot, 0, 0, iw, ih, 0, 0, drawW, drawH);
      tx.restore();
      ctx.save();
      if (sBlur > 0 || sX !== 0 || sY !== 0) {
        ctx.shadowColor = 'rgba(0,0,0,0.42)';
        ctx.shadowBlur = sBlur;
        ctx.shadowOffsetX = sX;
        ctx.shadowOffsetY = sY;
      }
      ctx.drawImage(tmp, ox, oy);
      ctx.restore();
      return { drawW: drawW };
    }
    function compose() {
      if (!shot) return;
      syncBeautMediaUi();
      var dims = readDimsPx();
      if (!dims) {
        lastPreviewMetrics = null;
        return;
      }
      var pad = +iface.querySelector('#ov-spad').value || 0;
      var rad = +iface.querySelector('#ov-srd').value || 0;
      var gradId = iface.querySelector('#ov-sgrad').value;
      var bgColors = getSsBgColors();
      var shadowOn = iface.querySelector('#ov-ss-on');
      var shadowEn = shadowOn && shadowOn.checked;
      var sBlur = shadowEn ? +iface.querySelector('#ov-ssb').value || 0 : 0;
      var sY = shadowEn ? +iface.querySelector('#ov-ssy').value || 0 : 0;
      var sX = shadowEn ? +iface.querySelector('#ov-ssx').value || 0 : 0;
      var cw = dims.w;
      var ch = dims.h;
      var exportCanvas = iface.querySelector('#ov-spex');
      var viewCanvas = iface.querySelector('#ov-spc');
      if (!exportCanvas || !viewCanvas) return;
      var rEx = renderBeautifiedToCanvas(exportCanvas, cw, ch, pad, rad, sBlur, sY, sX, gradId, bgColors);
      if (!rEx) {
        lastPreviewMetrics = null;
        return;
      }
      var m = Math.max(cw, ch);
      var ps = previewScaleForLongEdge(m);
      var pcw = Math.max(1, Math.round(cw * ps));
      var pch = Math.max(1, Math.round(ch * ps));
      var dpr = Math.min(typeof window !== 'undefined' && window.devicePixelRatio ? window.devicePixelRatio : 1, 2);
      var pcwHi = Math.max(1, Math.round(pcw * dpr));
      var pchHi = Math.max(1, Math.round(pch * dpr));
      var rView = renderBeautifiedToCanvas(
        viewCanvas,
        pcwHi,
        pchHi,
        pad * ps * dpr,
        rad * ps * dpr,
        sBlur * ps * dpr,
        sY * ps * dpr,
        sX * ps * dpr,
        gradId,
        bgColors
      );
      if (!rView) {
        lastPreviewMetrics = null;
        return;
      }
      /* drawW is in the same pixel space as the view canvas (Hi-DPI); cw/ch must match or scale math is wrong for some aspect ratios. */
      lastPreviewMetrics = {
        cw: viewCanvas.width,
        ch: viewCanvas.height,
        drawW: rView.drawW,
      };
      applyPreviewScale();
      requestAnimationFrame(function () {
        requestAnimationFrame(applyPreviewScale);
      });
    }
    var previewWrap = iface.querySelector('#ov-spw');
    if (previewWrap && typeof ResizeObserver !== 'undefined') {
      var sszRoRaf = null;
      var sszRo = new ResizeObserver(function () {
        if (!shot) return;
        if (sszRoRaf) cancelAnimationFrame(sszRoRaf);
        sszRoRaf = requestAnimationFrame(function () {
          sszRoRaf = null;
          if (shot) applyPreviewScale();
        });
      });
      sszRo.observe(previewWrap);
      var sszPane = previewWrap.parentElement;
      if (sszPane) sszRo.observe(sszPane);
      OV.addCleanup(function () {
        sszRo.disconnect();
      });
    }
    syncDimLabels();
    iface.querySelector('#ov-sunit').addEventListener('change', onUnitChange);
    iface.querySelector('#ov-sdpi').addEventListener('input', compose);
    iface.querySelectorAll('[data-ss-ratio]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        applyRatioPreset(btn.getAttribute('data-ss-ratio') || '16:9');
        compose();
      });
    });
    OV.bindDropZone(iface.querySelector('#ov-ssz'), input, function (fs) {
      if (!fs[0]) return;
      ssSourceName = fs[0].name || null;
      OV.loadImageFile(fs[0]).then(function (img) {
        shot = img;
        compose();
      });
    });
    var gradSel = iface.querySelector('#ov-sgrad');
    if (gradSel) {
      gradSel.addEventListener('change', function () {
        syncSSBeautBgUi();
        syncSSBeautPresetsUI();
        compose();
      });
    }
    var preSel = iface.querySelector('#ov-sbg-presets');
    if (preSel) {
      preSel.addEventListener('change', function () {
        var v = preSel.value;
        if (v === '') {
          compose();
          return;
        }
        applySsBeautPresetByIndex(+v);
      });
    }
    var ssOnEl = iface.querySelector('#ov-ss-on');
    var ssOnLbl = iface.querySelector('label.ss-beaut-sum-shadow');
    if (ssOnEl) {
      ssOnEl.addEventListener('click', function (e) {
        e.stopPropagation();
      });
      ssOnEl.addEventListener('change', function () {
        syncSsShadowUi();
        compose();
      });
    }
    if (ssOnLbl) {
      ssOnLbl.addEventListener('click', function (e) {
        e.stopPropagation();
      });
    }
    syncSSBeautBgUi();
    syncSSBeautPresetsUI();
    syncSsShadowUi();
    [
      '#ov-sww',
      '#ov-swh',
      '#ov-spad',
      '#ov-srd',
      '#ov-ssb',
      '#ov-ssy',
      '#ov-ssx',
    ].forEach(function (sel) {
      var node = iface.querySelector(sel);
      if (node) node.addEventListener('input', compose);
    });
    ['#ov-sbg', '#ov-sbg2', '#ov-sbg3'].forEach(function (sel) {
      var node = iface.querySelector(sel);
      if (node) node.addEventListener('input', onSsBgColorInput);
    });
    iface.querySelector('#ov-sdl').addEventListener('click', function () {
      var c = iface.querySelector('#ov-spex');
      if (c && c.width) {
        var stem = (ssSourceName || 'screenshot').replace(/\.[^/.]+$/, '');
        OV.downloadCanvas(c, stem + '.png', 'image/png');
      }
    });
  }

  /* Favicon forge */
  function initFaviconForge(iface) {
    /** Master canvas resolution (was 180px — too soft when scaled to 16/32 favicons). */
    var FCV_INTERNAL = 512;
    var FCV_FONT_SCALE = FCV_INTERNAL / 180;
    /** Preview / GIF: seconds per full loop (each preset has its own tempo). */
    var FCV_MOTION_LOOP_SEC = {
      rotate: 3.47,
      pulse: 2.63,
      beat: 2.08,
      wobble: 3.18,
      buzz: 1.79,
      float: 3.71,
      sway: 3.27,
      rock: 3.02,
    };
    function fcvMotionLoopSec(kind) {
      var s = FCV_MOTION_LOOP_SEC[kind];
      return typeof s === 'number' ? s : 2.85;
    }
    function fcvClamp01(u) {
      return u < 0 ? 0 : u > 1 ? 1 : u;
    }
    /** Subtle phase warp: eases off perfect harmonic timing (endpoints unchanged). */
    function fcvWarpPhase(p) {
      var x = fcvClamp01(p);
      return fcvClamp01(x + 0.038 * Math.sin(Math.PI * 2 * x) * x * (1 - x) * 4);
    }
    function fcvEaseInOutCubic(u) {
      return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
    }
    function fcvEaseOutCubic(u) {
      return 1 - Math.pow(1 - fcvClamp01(u), 3);
    }
    function fcvEaseInCubic(u) {
      u = fcvClamp01(u);
      return u * u * u;
    }
    function fcvEaseInOutQuart(u) {
      u = fcvClamp01(u);
      return u < 0.5 ? 8 * u * u * u * u : 1 - Math.pow(-2 * u + 2, 4) / 2;
    }
    function fcvSmoothstep01(u) {
      var x = u < 0 ? 0 : u > 1 ? 1 : u;
      return x * x * (3 - 2 * x);
    }
    var fcvPreviewRafId = null;
    var fcvPreviewT0 = 0;
    /** Non-static motion modes (preview loop + GIF export). */
    var FCV_MOTION_ON = {
      rotate: 1,
      pulse: 1,
      beat: 1,
      wobble: 1,
      buzz: 1,
      float: 1,
      sway: 1,
      rock: 1,
    };
    function fcvIsMotionOn(mode) {
      return !!FCV_MOTION_ON[mode];
    }
    /** 0 = none, 1 = default design strength, 1.5 = max slider. */
    function fcvMotionIntensityRatio() {
      var el = iface.querySelector('#ov-fmotion-int');
      var n = el ? parseInt(el.value, 10) : 100;
      if (isNaN(n)) return 1;
      return Math.max(0, Math.min(1.5, n / 100));
    }
    function fcvApplyMotion(ctx, w, h, animKind, animPhase) {
      var inten = fcvMotionIntensityRatio();
      if (inten <= 0) return;
      var p = animPhase - Math.floor(animPhase);
      var po = fcvWarpPhase(p);
      var t = po * Math.PI * 2;
      ctx.translate(w / 2, h / 2);
      switch (animKind) {
        case 'rotate': {
          var spin =
            po * Math.PI * 2 +
            0.0055 * Math.sin(t * 2.7 + 0.5) +
            0.0035 * Math.sin(t * 4.3 + 1.1);
          ctx.rotate(spin * inten);
          break;
        }
        case 'pulse': {
          var pulseDeep = 0.098 * inten;
          var depth;
          if (p < 0.53) {
            depth = pulseDeep * fcvEaseOutCubic(p / 0.53);
          } else {
            depth = pulseDeep * (1 - fcvEaseInCubic((p - 0.53) / 0.47));
          }
          var pulseS = 1 - depth;
          ctx.scale(pulseS, pulseS);
          break;
        }
        case 'beat': {
          var bd = 0.078 * inten;
          var dip = (1 - Math.cos(t * 2)) / 2;
          var asym = 0.88 + 0.12 * Math.sin(Math.PI * 2 * po * 2 + 0.4);
          var shaped = fcvSmoothstep01(dip * asym);
          var bs = 1 - bd * shaped;
          ctx.scale(bs, bs);
          break;
        }
        case 'wobble':
          ctx.rotate(
            inten *
              (0.158 * Math.sin(t + 0.11) +
                0.038 * Math.sin(t * 2.17 + 0.95) +
                0.014 * Math.sin(t * 4.51 + 2.2))
          );
          break;
        case 'buzz':
          ctx.rotate(
            inten *
              (0.034 * Math.sin(t * 4.4 + 0.2) +
                0.022 * Math.sin(t * 6.7 + 1.4) +
                0.011 * Math.sin(t * 2.9 + 0.6))
          );
          break;
        case 'float': {
          var bob = Math.sin(t);
          var bobE = fcvEaseInOutQuart((bob + 1) / 2) * 2 - 1;
          ctx.translate(
            0,
            inten * h * 0.036 * bobE * (0.79 + 0.21 * Math.sin(t * 1.73 + 0.52))
          );
          break;
        }
        case 'sway':
          ctx.translate(
            inten * (w * 0.042 * Math.sin(t * 0.91 + 0.2) + w * 0.006 * Math.sin(t * 2.4 + 0.8)),
            inten * (h * 0.009 * Math.sin(t * 1.03 + 0.41) + h * 0.004 * Math.sin(t * 1.67 + 1.2))
          );
          break;
        case 'rock':
          ctx.rotate(
            inten * (0.102 * Math.sin(t + 0.25) + 0.024 * Math.sin(t * 2.21 + 0.7))
          );
          ctx.translate(
            inten * w * 0.021 * Math.sin(t + 0.88),
            inten * (h * 0.016 * Math.sin(t * 0.89 + 0.45) + h * 0.005 * Math.sin(t * 2.6 + 0.3))
          );
          break;
        default:
          break;
      }
      ctx.translate(-w / 2, -h / 2);
    }
    /**
     * Icon path `d` values: geometric marks are original; several paths derive from
     * Heroicons (MIT) https://github.com/tailwindlabs/heroicons; rendered as vectors, not emoji.
     */
    var FCV_ICON_ORDER = [
      'star',
      'bolt',
      'heart',
      'check',
      'xmark',
      'sparkle',
      'disc',
      'target',
      'pathfinder',
      'square',
      'triangle',
      'diamond',
    ];
    var FCV_ICON_LABEL = {
      star: 'Star',
      bolt: 'Lightning',
      heart: 'Heart',
      check: 'Check mark',
      xmark: 'Cross',
      sparkle: 'Sparkle',
      disc: 'Filled circle',
      target: 'Target rings',
      pathfinder: 'Pathfinder',
      square: 'Square',
      triangle: 'Triangle',
      diamond: 'Diamond',
    };
    var FCV_ICON_SPEC = {
      star: {
        d: 'M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.056-.964 1.892-1.825 1.303L12 18.897l-4.834 2.367c-.861.589-1.831-.247-1.825-1.303l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.006Z',
        rule: 'evenodd',
      },
      bolt: { d: 'M3.75 13.5 7.5 6.375h4.125L11.25 2.25l9 10.5h-4.125L15.75 22.5 3.75 13.5Z' },
      heart: {
        d: 'M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 0 1-.383-.218 25.18 25.18 0 0 1-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0 1 12 5.052 5.5 5.5 0 0 1 16.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 0 1-4.244 3.17 15.247 15.247 0 0 1-.383.219l-.022.012-.007.004-.007.003a.75.75 0 0 1-.704 0l-.007-.003Z',
      },
      check: {
        d: 'M19.916 4.626a.75.75 0 0 1-.252.577l-11.857 10a.75.75 0 0 1-.98.07L4.02 12.322a.75.75 0 0 1-.02-1.08l1.5-1.5a.75.75 0 0 1 1.06 0l3.75 3.75 10.5-9.5a.75.75 0 0 1 1.08.154Z',
      },
      xmark: {
        d: 'M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 1 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 0 1 0-1.06Z',
      },
      sparkle: { d: 'M12 1.5l1.65 6.45 6.45 1.65-6.45 1.65L12 17.7l-1.65-6.45-6.45-1.65 6.45-1.65L12 1.5Z' },
      square: { d: 'M5.25 5.25h13.5v13.5H5.25z' },
      triangle: { d: 'M12 3.75L21.75 20.25H2.25L12 3.75Z' },
      diamond: { d: 'M12 2.25L21.75 12 12 21.75 2.25 12 12 2.25Z' },
      disc: { fn: 'disc' },
      target: { fn: 'target' },
      pathfinder: { fn: 'pathfinder' },
    };
    var FCV_EMOJI = [
      [0x1f600, 'Grinning face'],
      [0x1f603, 'Smiling face'],
      [0x1f60d, 'Smiling face with heart eyes'],
      [0x1f44d, 'Thumbs up'],
      [0x1f525, 'Fire'],
      [0x1f680, 'Rocket'],
      [0x2728, 'Sparkles'],
      [0x2705, 'Check mark button'],
      [0x1f389, 'Party popper'],
      [0x1f4a1, 'Light bulb'],
      [0x26a1, 'High voltage'],
      [0x1f331, 'Seedling'],
      [0x1f3af, 'Direct hit'],
      [0x2764, 'Red heart'],
      [0x1f60e, 'Smiling face with sunglasses'],
      [0x2b50, 'Star'],
      [0x1f3ae, 'Video game'],
      [0x2615, 'Hot beverage'],
    ];
    function codeToStr(cp) {
      if (typeof String.fromCodePoint === 'function') return String.fromCodePoint(cp);
      if (cp < 0x10000) return String.fromCharCode(cp);
      var k = cp - 0x10000;
      return String.fromCharCode(0xd800 + (k >> 10), 0xdc00 + (k & 0x3ff));
    }
    var FCV_FONTS = [
      { id: 'syne', label: 'Syne', family: 'Syne' },
      { id: 'inter', label: 'Inter', family: 'Inter' },
      { id: 'oswald', label: 'Oswald', family: 'Oswald' },
      { id: 'playfair', label: 'Playfair Display', family: 'Playfair Display' },
      { id: 'jetbrains', label: 'JetBrains Mono', family: 'JetBrains Mono' },
      { id: 'space', label: 'Space Grotesk', family: 'Space Grotesk' },
      { id: 'fraunces', label: 'Fraunces', family: 'Fraunces' },
      { id: 'bebas', label: 'Bebas Neue', family: 'Bebas Neue' },
      { id: 'montserrat', label: 'Montserrat', family: 'Montserrat' },
      { id: 'dm-sans', label: 'DM Sans', family: 'DM Sans' },
      { id: 'figtree', label: 'Figtree', family: 'Figtree' },
      {
        id: 'helvetica',
        label: 'Helvetica',
        system: true,
        family: 'Helvetica Neue',
        canvasStack: 'Helvetica Neue, Helvetica, Arial, sans-serif',
      },
      { id: 'ibm-plex-sans', label: 'IBM Plex Sans', family: 'IBM Plex Sans' },
      { id: 'lexend', label: 'Lexend', family: 'Lexend' },
      { id: 'lora', label: 'Lora', family: 'Lora' },
      { id: 'merriweather', label: 'Merriweather', family: 'Merriweather' },
      { id: 'nunito', label: 'Nunito', family: 'Nunito' },
      { id: 'outfit', label: 'Outfit', family: 'Outfit' },
      { id: 'plus-jakarta', label: 'Plus Jakarta Sans', family: 'Plus Jakarta Sans' },
      { id: 'poppins', label: 'Poppins', family: 'Poppins' },
      { id: 'raleway', label: 'Raleway', family: 'Raleway' },
      { id: 'roboto', label: 'Roboto', family: 'Roboto' },
      { id: 'rubik', label: 'Rubik', family: 'Rubik' },
      { id: 'source-sans', label: 'Source Sans 3', family: 'Source Sans 3' },
      { id: 'work-sans', label: 'Work Sans', family: 'Work Sans' },
    ];
    var fcvFontOpts = FCV_FONTS.map(function (f, i) {
      return '<option value="' + f.id + '"' + (i === 0 ? ' selected' : '') + '>' + f.label + '</option>';
    }).join('');
    var fcvIconOpts = FCV_ICON_ORDER.map(function (id) {
      return (
        '<option value="' +
        id +
        '"' +
        (id === 'star' ? ' selected' : '') +
        '>' +
        (FCV_ICON_LABEL[id] || id) +
        '</option>'
      );
    }).join('');
    var fcvEmojiOpts = FCV_EMOJI.map(function (row, i) {
      var cp = row[0];
      var ch = codeToStr(cp);
      if (cp === 0x2764) ch += '\ufe0f';
      var label = ch + ' ' + row[1];
      return '<option value="' + i + '"' + (i === 0 ? ' selected' : '') + '>' + label + '</option>';
    }).join('');

    iface.innerHTML = toolShellSplit(
      '<div class="tool-stack tool-media-pane fcv-media-pane" style="width:100%;min-height:0;align-items:stretch">' +
        '<div class="fcv-preview" aria-label="Preview">' +
        '<div class="fcv-preview-inner">' +
        '<div class="fcv-main-wrap" id="fcv-main-wrap">' +
        '<div class="fcv-main">' +
        '<canvas id="ov-fcv" width="' +
        FCV_INTERNAL +
        '" height="' +
        FCV_INTERNAL +
        '" class="fcv-canvas-main"></canvas>' +
        '</div></div></div></div>' +
        '</div>',
      '<div class="tool-stack ss-beaut-tool">' +
        '<div class="fcv-toolbar-head">' +
        '<div class="fcv-export-actions">' +
        '<button type="button" class="tool-btn tool-btn--m" id="ov-fico" title="Static: multi-size .ico. Motion: animated .gif for browser tabs.">FAVICON.ICO</button>' +
        '<button type="button" class="tool-btn" id="ov-f32">PNG 32</button>' +
        '<button type="button" class="tool-btn" id="ov-f180">PNG 180</button>' +
        '</div></div>' +
        '<details class="ss-beaut-section">' +
        '<summary class="ss-beaut-sum">' +
        '<span class="tool-disclosure-chev" aria-hidden="true"><svg viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg" focusable="false"><path d="M4.5 2.5L8.5 6 4.5 9.5"/></svg></span>' +
        '<span class="ss-beaut-sum-t">Content</span>' +
        '</summary>' +
        '<div class="ss-beaut-body">' +
        '<div class="tool-field"><span class="tool-label">Mode</span>' +
        '<select class="tool-select" id="ov-fmode" aria-label="Content type">' +
        '<option value="letter">Letters</option>' +
        '<option value="symbol" selected>Icons and text</option>' +
        '<option value="emoji">Emoji</option>' +
        '</select></div>' +
        '<div class="tool-field" id="ov-fwrap-letter"><span class="tool-label">Letters (optional)</span>' +
        '<input type="text" class="tool-input" id="ov-ft" maxlength="2" value="" placeholder="e.g. OP" autocomplete="off" aria-label="Letters, up to 2; leave empty for no text"></div>' +
        '<section class="fcv-section" id="ov-fwrap-symbol" hidden>' +
        '<div class="fcv-section-title">Icon</div>' +
        '<div class="tool-field"><span class="tool-label">Vector icon</span>' +
        '<select class="tool-select" id="ov-ficon-select" aria-label="Vector icon">' +
        fcvIconOpts +
        '</select></div>' +
        '<div class="tool-field fcv-custom-field">' +
        '<span class="tool-label">Custom character (optional)</span>' +
        '<input type="text" class="tool-input" id="ov-fsym-custom" maxlength="4" placeholder="e.g. π, @, ½" autocomplete="off">' +
        '</div></section>' +
        '<section class="fcv-section" id="ov-fwrap-emoji" hidden>' +
        '<div class="fcv-section-title">Emoji</div>' +
        '<div class="tool-field"><span class="tool-label">Preset</span>' +
        '<select class="tool-select" id="ov-femoji-select" aria-label="Emoji preset">' +
        fcvEmojiOpts +
        '</select></div>' +
        '<div class="tool-field fcv-custom-field">' +
        '<span class="tool-label">Or paste / type</span>' +
        '<input type="text" class="tool-input" id="ov-femoji-in" maxlength="8" autocomplete="off" placeholder="Paste any emoji">' +
        '</div></section>' +
        '</div></details>' +
        '<details class="ss-beaut-section">' +
        '<summary class="ss-beaut-sum">' +
        '<span class="tool-disclosure-chev" aria-hidden="true"><svg viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg" focusable="false"><path d="M4.5 2.5L8.5 6 4.5 9.5"/></svg></span>' +
        '<span class="ss-beaut-sum-t" id="fcv-typo-title">Font &amp; size</span>' +
        '</summary>' +
        '<div class="ss-beaut-body">' +
        '<div class="tool-field" id="ov-fwrap-ffont"><span class="tool-label">Typeface</span>' +
        '<select class="tool-select" id="ov-ffont" aria-label="Font family">' +
        fcvFontOpts +
        '</select></div>' +
        '<div class="tool-field"><span class="tool-label">Weight</span>' +
        '<select class="tool-select" id="ov-fweight" aria-label="Font weight">' +
        '<option value="700" selected>Bold</option>' +
        '<option value="400">Regular</option>' +
        '</select></div>' +
        '<div class="tool-field fcv-field-range">' +
        '<span class="tool-label">Size <span id="ov-fsize-val" class="fcv-size-val">100</span>px</span>' +
        '<div class="tool-bpm-slider-row">' +
        '<input type="range" class="tool-input tool-input--range tool-input--bpm" id="ov-fsize" min="56" max="132" value="100" step="2" aria-valuemin="56" aria-valuemax="132" aria-valuenow="100">' +
        '</div></div></div></details>' +
        '<details class="ss-beaut-section">' +
        '<summary class="ss-beaut-sum">' +
        '<span class="tool-disclosure-chev" aria-hidden="true"><svg viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg" focusable="false"><path d="M4.5 2.5L8.5 6 4.5 9.5"/></svg></span>' +
        '<span class="ss-beaut-sum-t">Mask &amp; color</span>' +
        '</summary>' +
        '<div class="ss-beaut-body">' +
        '<div class="tool-field"><span class="tool-label">Mask shape</span>' +
        '<select class="tool-select" id="ov-fshape" aria-label="Outer mask shape">' +
        '<option value="square">Square</option>' +
        '<option value="rounded">Rounded square</option>' +
        '<option value="circle">Circle</option>' +
        '<option value="diamond">Diamond</option>' +
        '<option value="triangle">Triangle</option>' +
        '</select></div>' +
        '<div class="tool-field fcv-field-range">' +
        '<span class="tool-label">Shape size <span id="ov-fmask-scale-val" class="fcv-size-val">100</span>%</span>' +
        '<div class="tool-bpm-slider-row">' +
        '<input type="range" class="tool-input tool-input--range tool-input--bpm" id="ov-fmask-scale" min="55" max="100" value="100" step="1" aria-label="Mask shape scale" aria-valuemin="55" aria-valuemax="100" aria-valuenow="100">' +
        '</div></div>' +
        '<div class="tool-field"><span class="tool-label">Foreground</span>' +
        '<div class="fcv-color-row">' +
        '<input type="color" class="tool-input" id="ov-ffg" value="#08080c" aria-label="Foreground color">' +
        '<label class="fcv-color-none"><input type="checkbox" id="ov-ffg-none"> None</label>' +
        '</div></div>' +
        '<div class="tool-field"><span class="tool-label">Background</span>' +
        '<div class="fcv-color-row">' +
        '<input type="color" class="tool-input" id="ov-fbg" value="#00b4d8" aria-label="Background color">' +
        '<label class="fcv-color-none"><input type="checkbox" id="ov-fbg-none"> None</label>' +
        '</div></div>' +
        '</div></details>' +
        '<details class="ss-beaut-section">' +
        '<summary class="ss-beaut-sum">' +
        '<span class="tool-disclosure-chev" aria-hidden="true"><svg viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg" focusable="false"><path d="M4.5 2.5L8.5 6 4.5 9.5"/></svg></span>' +
        '<span class="ss-beaut-sum-t">Swatches</span>' +
        '</summary>' +
        '<div class="ss-beaut-body">' +
        '<div class="fcv-section fcv-section--presets">' +
        '<div class="fcv-presets" role="group" aria-label="Color presets">' +
        '<button type="button" class="fcv-preset" data-fg="#08080c" data-bg="#00b4d8" title="Dark on cyan"></button>' +
        '<button type="button" class="fcv-preset" data-fg="#f8fafc" data-bg="#0f172a" title="Light on slate"></button>' +
        '<button type="button" class="fcv-preset" data-fg="#111827" data-bg="#fbbf24" title="Dark on amber"></button>' +
        '<button type="button" class="fcv-preset" data-fg="#ffffff" data-bg="#dc2626" title="White on red"></button>' +
        '<button type="button" class="fcv-preset" data-fg="#ecfdf5" data-bg="#059669" title="Mint on green"></button>' +
        '<button type="button" class="fcv-preset" data-fg="#fef3c7" data-bg="#7c3aed" title="Cream on violet"></button>' +
        '</div></div></div></details>' +
        '<details class="ss-beaut-section">' +
        '<summary class="ss-beaut-sum">' +
        '<span class="tool-disclosure-chev" aria-hidden="true"><svg viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg" focusable="false"><path d="M4.5 2.5L8.5 6 4.5 9.5"/></svg></span>' +
        '<span class="ss-beaut-sum-t">Motion</span>' +
        '</summary>' +
        '<div class="ss-beaut-body">' +
        '<div class="tool-field"><span class="tool-label">Tab icon</span>' +
        '<select class="tool-select" id="ov-fanim" aria-label="Favicon motion (preview and download)">' +
        '<option value="none" selected>Static</option>' +
        '<option value="rotate">Rotate</option>' +
        '<option value="pulse">Pulse</option>' +
        '<option value="beat">Beat</option>' +
        '<option value="wobble">Wobble</option>' +
        '<option value="buzz">Buzz</option>' +
        '<option value="float">Float</option>' +
        '<option value="sway">Sway</option>' +
        '<option value="rock">Rock</option>' +
        '</select></div>' +
        '<div class="tool-field fcv-field-range">' +
        '<span class="tool-label">Intensity <span id="ov-fmotion-int-val" class="fcv-size-val">100</span>%</span>' +
        '<div class="tool-bpm-slider-row">' +
        '<input type="range" class="tool-input tool-input--range tool-input--bpm" id="ov-fmotion-int" min="0" max="150" value="100" step="1" aria-label="Motion intensity" aria-valuemin="0" aria-valuemax="150" aria-valuenow="100">' +
        '</div></div></div></details>' +
        '</div>'
    );

    var fcvFontLink = document.createElement('link');
    fcvFontLink.rel = 'stylesheet';
    document.head.appendChild(fcvFontLink);

    function fcvGetFontEntry() {
      var v = iface.querySelector('#ov-ffont').value;
      var fi;
      for (fi = 0; fi < FCV_FONTS.length; fi++) {
        if (FCV_FONTS[fi].id === v) return FCV_FONTS[fi];
      }
      return FCV_FONTS[0];
    }

    /** Full font list segment for canvas (quoted webfont name or system stack). */
    function fcvFontCanvasFace() {
      var e = fcvGetFontEntry();
      if (e.system && e.canvasStack) return e.canvasStack;
      return '"' + e.family + '",sans-serif';
    }

    function fcvGoogleFontHref(family) {
      return (
        'https://fonts.googleapis.com/css2?family=' +
        encodeURIComponent(family).replace(/%20/g, '+') +
        ':wght@400;700&display=swap'
      );
    }

    function fcvTypeSizePx() {
      var el = iface.querySelector('#ov-fsize');
      var n = el ? parseInt(el.value, 10) : 100;
      if (isNaN(n)) return 100;
      return Math.max(48, Math.min(140, n));
    }

    /** Mask shape scale (0.55–1), centered; scales background shape only (foreground is full size). */
    function fcvMaskScaleRatio() {
      var el = iface.querySelector('#ov-fmask-scale');
      var n = el ? parseInt(el.value, 10) : 100;
      if (isNaN(n)) return 1;
      return Math.max(0.55, Math.min(1, n / 100));
    }

    var fcvFgScratch = document.createElement('canvas');
    fcvFgScratch.width = FCV_INTERNAL;
    fcvFgScratch.height = FCV_INTERNAL;

    function fcvDrawForeground(ox) {
      var w = FCV_INTERNAL;
      var h = FCV_INTERNAL;
      ox.clearRect(0, 0, w, h);
      var mode = iface.querySelector('#ov-fmode').value;
      var fg = iface.querySelector('#ov-ffg').value;
      var fsPx = fcvTypeSizePx();
      var fsCanvas = fsPx * FCV_FONT_SCALE;
      var optNudge = Math.round(2 * FCV_FONT_SCALE);
      var fwNum = iface.querySelector('#ov-fweight').value === '400' ? '400' : '700';
      var fontFace = fcvFontCanvasFace();
      ox.fillStyle = fg;
      ox.textAlign = 'center';
      ox.textBaseline = 'middle';
      if (mode === 'letter') {
        var t = iface.querySelector('#ov-ft').value.trim().slice(0, 2).toUpperCase();
        if (t.length) {
          ox.font = fwNum + ' ' + fsCanvas + 'px ' + fontFace;
          ox.fillText(t, w / 2, h / 2 + optNudge);
        }
      } else if (mode === 'emoji') {
        var eg = emojiGlyph();
        ox.font =
          fwNum +
          ' ' +
          fsCanvas +
          'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
        ox.textBaseline = 'alphabetic';
        var em = ox.measureText(eg);
        var eAsc = em.actualBoundingBoxAscent;
        var eDesc = em.actualBoundingBoxDescent;
        var ey = h / 2;
        if (
          eAsc != null &&
          eDesc != null &&
          !isNaN(eAsc) &&
          !isNaN(eDesc) &&
          (eAsc > 0 || eDesc > 0)
        ) {
          ey = h / 2 + (eAsc - eDesc) / 2;
        } else {
          ox.textBaseline = 'middle';
          ey = h / 2 + Math.round(fsCanvas * 0.06);
        }
        ox.fillText(eg, w / 2, ey);
      } else {
        var customSym = iface.querySelector('#ov-fsym-custom').value.trim();
        if (customSym.length) {
          ox.font =
            fwNum + ' ' + fsCanvas + 'px ' + fontFace + ',system-ui,"Segoe UI Symbol","Apple Symbols",sans-serif';
          ox.fillText(customSym.slice(0, 4), w / 2, h / 2 + optNudge);
        } else {
          ox.save();
          var u = (Math.min(w, h) * 0.72 * (fsPx / 100)) / 24;
          ox.translate(w / 2, h / 2);
          ox.scale(u, u);
          ox.translate(-12, -12);
          drawVectorIcon(ox, iface.querySelector('#ov-ficon-select').value);
          ox.restore();
        }
      }
    }

    function pathShape(ctx, w, h, shape) {
      ctx.beginPath();
      if (shape === 'circle') {
        ctx.arc(w / 2, h / 2, Math.min(w, h) / 2, 0, Math.PI * 2);
      } else if (shape === 'diamond') {
        ctx.moveTo(w / 2, 0);
        ctx.lineTo(w, h / 2);
        ctx.lineTo(w / 2, h);
        ctx.lineTo(0, h / 2);
        ctx.closePath();
      } else if (shape === 'triangle') {
        ctx.moveTo(w / 2, 0);
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.closePath();
      } else if (shape === 'rounded') {
        var rr = Math.min(w, h) * 0.2;
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(0, 0, w, h, rr);
        } else {
          var r = Math.min(rr, w / 2, h / 2);
          ctx.moveTo(r, 0);
          ctx.lineTo(w - r, 0);
          ctx.quadraticCurveTo(w, 0, w, r);
          ctx.lineTo(w, h - r);
          ctx.quadraticCurveTo(w, h, w - r, h);
          ctx.lineTo(r, h);
          ctx.quadraticCurveTo(0, h, 0, h - r);
          ctx.lineTo(0, r);
          ctx.quadraticCurveTo(0, 0, r, 0);
        }
      } else {
        ctx.rect(0, 0, w, h);
      }
    }

    function drawVectorIcon(ctx, id) {
      var spec = FCV_ICON_SPEC[id];
      if (!spec) return;
      if (spec.d) {
        var p = new Path2D(spec.d);
        ctx.fill(p, spec.rule || 'nonzero');
        return;
      }
      ctx.beginPath();
      if (spec.fn === 'disc') {
        ctx.arc(12, 12, 9, 0, Math.PI * 2);
      } else if (spec.fn === 'target') {
        ctx.arc(12, 12, 10, 0, Math.PI * 2);
        ctx.arc(12, 12, 4, 0, Math.PI * 2, true);
        ctx.fill(spec.rule || 'evenodd');
        return;
      } else if (spec.fn === 'pathfinder') {
        ctx.arc(9.5, 12, 6.5, 0, Math.PI * 2);
        ctx.arc(14.5, 12, 6.5, 0, Math.PI * 2);
        ctx.fill('nonzero');
        return;
      }
      ctx.fill(spec.rule || 'nonzero');
    }

    function syncContentUi() {
      var mode = iface.querySelector('#ov-fmode').value;
      iface.querySelector('#ov-fwrap-letter').hidden = mode !== 'letter';
      iface.querySelector('#ov-fwrap-symbol').hidden = mode !== 'symbol';
      iface.querySelector('#ov-fwrap-emoji').hidden = mode !== 'emoji';
      var wrapFont = iface.querySelector('#ov-fwrap-ffont');
      if (wrapFont) wrapFont.hidden = mode === 'emoji';
      var typoTitle = iface.querySelector('#fcv-typo-title');
      if (typoTitle) {
        if (mode === 'letter') {
          typoTitle.textContent = 'Typography';
        } else if (mode === 'emoji') {
          typoTitle.textContent = 'Emoji size';
        } else {
          typoTitle.textContent = 'Font & size';
        }
      }
    }

    function emojiGlyph() {
      var paste = iface.querySelector('#ov-femoji-in').value.trim();
      if (paste.length) return paste.slice(0, 8);
      var es = iface.querySelector('#ov-femoji-select');
      var ix = es ? parseInt(es.value, 10) : 0;
      if (isNaN(ix) || ix < 0 || ix >= FCV_EMOJI.length) ix = 0;
      var cp = FCV_EMOJI[ix][0];
      var ch = codeToStr(cp);
      if (cp === 0x2764) ch += '\ufe0f';
      return ch;
    }

    function fcvSetSmoothDownscale(ctx) {
      ctx.imageSmoothingEnabled = true;
      if (typeof ctx.imageSmoothingQuality === 'string') ctx.imageSmoothingQuality = 'high';
    }

    function syncFcvColorEnabled() {
      var fgIn = iface.querySelector('#ov-ffg');
      var bgIn = iface.querySelector('#ov-fbg');
      var fgN = iface.querySelector('#ov-ffg-none');
      var bgN = iface.querySelector('#ov-fbg-none');
      if (fgIn && fgN) fgIn.disabled = fgN.checked;
      if (bgIn && bgN) bgIn.disabled = bgN.checked;
    }

    function drawToCanvas(canvasEl, opts) {
      opts = opts || {};
      var animPhase = typeof opts.animPhase === 'number' ? opts.animPhase : 0;
      var animKind = opts.animKind || 'none';
      var matteBg = opts.matteBg;
      var w = FCV_INTERNAL;
      var h = FCV_INTERNAL;
      var x = canvasEl.getContext('2d');
      fcvSetSmoothDownscale(x);
      var shape = iface.querySelector('#ov-fshape').value;
      var bg = iface.querySelector('#ov-fbg').value;
      var fgNone = iface.querySelector('#ov-ffg-none').checked;
      var bgNone = iface.querySelector('#ov-fbg-none').checked;
      var paintFg = !fgNone;
      x.clearRect(0, 0, w, h);
      x.save();
      /* Motion before clip so mask + artwork move as one (rotation visible even for solid fills). */
      if (fcvIsMotionOn(animKind)) {
        fcvApplyMotion(x, w, h, animKind, animPhase);
      }
      var maskScale = fcvMaskScaleRatio();
      if (paintFg) {
        var ox = fcvFgScratch.getContext('2d');
        fcvSetSmoothDownscale(ox);
        fcvDrawForeground(ox);
      }
      /* One path for all shape sizes: mask uses scale(s); foreground is drawn from scratch at full size (inverse scale) so 100% matches <100% behavior. */
      x.save();
      x.translate(w / 2, h / 2);
      x.scale(maskScale, maskScale);
      x.translate(-w / 2, -h / 2);
      pathShape(x, w, h, shape);
      x.clip();
      if (!bgNone) {
        x.fillStyle = bg;
        x.fillRect(0, 0, w, h);
      } else if (matteBg) {
        x.fillStyle = matteBg;
        x.fillRect(0, 0, w, h);
      }
      if (paintFg) {
        x.save();
        x.translate(w / 2, h / 2);
        x.scale(1 / maskScale, 1 / maskScale);
        x.translate(-w / 2, -h / 2);
        x.drawImage(fcvFgScratch, 0, 0);
        x.restore();
      }
      x.restore();
      x.restore();
    }

    function fcvStopPreviewLoop() {
      if (fcvPreviewRafId != null) {
        cancelAnimationFrame(fcvPreviewRafId);
        fcvPreviewRafId = null;
      }
    }

    function fcvDrawStatic() {
      drawToCanvas(iface.querySelector('#ov-fcv'), {});
    }

    function fcvPreviewFrame(now) {
      if (!iface.isConnected) {
        fcvStopPreviewLoop();
        return;
      }
      var animEl = iface.querySelector('#ov-fanim');
      if (!animEl || animEl.value === 'none') {
        fcvStopPreviewLoop();
        fcvDrawStatic();
        return;
      }
      var mode = animEl.value;
      if (!fcvIsMotionOn(mode)) {
        fcvStopPreviewLoop();
        fcvDrawStatic();
        return;
      }
      if (fcvMotionIntensityRatio() <= 0) {
        fcvStopPreviewLoop();
        fcvDrawStatic();
        return;
      }
      var elapsed = (now - fcvPreviewT0) / 1000;
      var loopSec = fcvMotionLoopSec(mode);
      var phase = (elapsed % loopSec) / loopSec;
      drawToCanvas(iface.querySelector('#ov-fcv'), { animPhase: phase, animKind: mode });
      fcvPreviewRafId = requestAnimationFrame(fcvPreviewFrame);
    }

    function fcvStartPreviewLoop() {
      if (fcvPreviewRafId != null) return;
      fcvPreviewT0 = performance.now();
      fcvPreviewRafId = requestAnimationFrame(fcvPreviewFrame);
    }

    function syncFcvExportButton() {
      var btn = iface.querySelector('#ov-fico');
      var animEl = iface.querySelector('#ov-fanim');
      if (!btn || !animEl) return;
      var mode = animEl.value || 'none';
      if (fcvIsMotionOn(mode)) {
        btn.textContent = 'FAVICON.GIF';
        btn.title = 'Download animated tab favicon (GIF; browsers use this for motion).';
        btn.setAttribute('aria-label', 'Download animated favicon as GIF');
      } else {
        btn.textContent = 'FAVICON.ICO';
        btn.title = 'Static: multi-size .ico. Turn on Motion below for animated .gif.';
        btn.setAttribute('aria-label', 'Download favicon.ico');
      }
    }

    function fcvSyncPreviewMotion() {
      fcvStopPreviewLoop();
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          var animEl = iface.querySelector('#ov-fanim');
          var mode = animEl ? animEl.value : 'none';
          if (fcvIsMotionOn(mode) && fcvMotionIntensityRatio() > 0) fcvStartPreviewLoop();
          else fcvDrawStatic();
          syncFcvExportButton();
        });
      });
    }

    function draw() {
      var animEl = iface.querySelector('#ov-fanim');
      var mode = animEl ? animEl.value : 'none';
      if (fcvIsMotionOn(mode)) {
        if (fcvMotionIntensityRatio() <= 0) {
          fcvStopPreviewLoop();
          fcvDrawStatic();
          return;
        }
        if (fcvPreviewRafId == null) fcvStartPreviewLoop();
        return;
      }
      fcvStopPreviewLoop();
      fcvDrawStatic();
    }

    function fcvExportAnimatedFavicon() {
      var G = typeof GIFenc !== 'undefined' ? GIFenc : window.GIFenc;
      if (!G || typeof G.GIFEncoder !== 'function') {
        if (typeof alert === 'function') {
          alert('GIF encoder did not load. Refresh the page and try again.');
        }
        return;
      }
      var animKind = iface.querySelector('#ov-fanim').value;
      var gifTiming =
        animKind === 'none'
          ? { frameCount: 1, delayMs: 200 }
          : (function () {
              var fc = 28;
              var loopMs = fcvMotionLoopSec(animKind) * 1000;
              var dm = Math.max(20, Math.round(loopMs / fc));
              return { frameCount: fc, delayMs: dm };
            })();
      var frameCount = gifTiming.frameCount;
      var delayMs = gifTiming.delayMs;
      var outSize = 128;
      var w = FCV_INTERNAL;
      var off = document.createElement('canvas');
      off.width = w;
      off.height = w;
      var tmp = document.createElement('canvas');
      tmp.width = outSize;
      tmp.height = outSize;
      var tctx = tmp.getContext('2d');
      fcvSetSmoothDownscale(tctx);
      var gif = G.GIFEncoder();
      var quantize = G.quantize;
      var applyPalette = G.applyPalette;
      var bgN = iface.querySelector('#ov-fbg-none').checked;
      var matteBg = bgN ? '#ffffff' : null;
      var fi;
      for (fi = 0; fi < frameCount; fi++) {
        var phase = frameCount <= 1 ? 0 : fi / frameCount;
        drawToCanvas(off, {
          animPhase: phase,
          animKind: animKind === 'none' ? 'none' : animKind,
          matteBg: matteBg,
        });
        tctx.clearRect(0, 0, outSize, outSize);
        tctx.drawImage(off, 0, 0, w, w, 0, 0, outSize, outSize);
        var imageData = tctx.getImageData(0, 0, outSize, outSize);
        var data = imageData.data;
        var palette = quantize(data, 256);
        var index = applyPalette(data, palette);
        var frameOpts = {
          palette: palette,
          delay: delayMs,
        };
        if (fi === 0) frameOpts.repeat = 0;
        gif.writeFrame(index, outSize, outSize, frameOpts);
      }
      gif.finish();
      var bytes = gif.bytes();
      OV.downloadBlob(new Blob([bytes], { type: 'image/gif' }), 'favicon.gif');
      draw();
    }

    function applyFcvFont() {
      var e = fcvGetFontEntry();
      if (e.system) {
        fcvFontLink.removeAttribute('href');
        fcvFontLink.onload = null;
        draw();
        return;
      }
      fcvFontLink.href = fcvGoogleFontHref(e.family);
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(function () {
          draw();
        });
      } else {
        fcvFontLink.onload = function () {
          draw();
        };
      }
    }

    function bindInputs() {
      iface.querySelectorAll('#ov-ft,#ov-ffg,#ov-fbg,#ov-fshape,#ov-fsym-custom,#ov-fmask-scale,#ov-fmotion-int').forEach(function (i) {
        i.addEventListener('input', draw);
      });
      iface.querySelector('#ov-fshape').addEventListener('change', draw);
      iface.querySelectorAll('#ov-ffg-none,#ov-fbg-none').forEach(function (cb) {
        cb.addEventListener('change', function () {
          syncFcvColorEnabled();
          draw();
        });
      });
      iface.querySelector('#ov-fsize').addEventListener('input', draw);
      bindToolSliderValue(iface, '#ov-fsize', '#ov-fsize-val');
      bindToolSliderValue(iface, '#ov-fmask-scale', '#ov-fmask-scale-val');
      bindToolSliderValue(iface, '#ov-fmotion-int', '#ov-fmotion-int-val');
      iface.querySelector('#ov-ffont').addEventListener('change', applyFcvFont);
      iface.querySelector('#ov-fweight').addEventListener('change', draw);
      iface.querySelector('#ov-femoji-in').addEventListener('input', draw);
      iface.querySelector('#ov-ficon-select').addEventListener('change', function () {
        iface.querySelector('#ov-fsym-custom').value = '';
        draw();
      });
      iface.querySelector('#ov-femoji-select').addEventListener('change', function () {
        iface.querySelector('#ov-femoji-in').value = '';
        draw();
      });
      iface.querySelector('#ov-fmode').addEventListener('change', function () {
        syncContentUi();
        draw();
      });
      var fcvAnimEl = iface.querySelector('#ov-fanim');
      if (fcvAnimEl) {
        fcvAnimEl.addEventListener('change', fcvSyncPreviewMotion);
        fcvAnimEl.addEventListener('input', fcvSyncPreviewMotion);
      }
      iface.querySelectorAll('.fcv-preset').forEach(function (btn) {
        btn.addEventListener('click', function () {
          iface.querySelector('#ov-ffg').value = btn.getAttribute('data-fg') || '#000000';
          iface.querySelector('#ov-fbg').value = btn.getAttribute('data-bg') || '#ffffff';
          iface.querySelector('#ov-ffg-none').checked = false;
          iface.querySelector('#ov-fbg-none').checked = false;
          syncFcvColorEnabled();
          draw();
        });
      });
    }

    syncContentUi();
    bindInputs();
    syncFcvColorEnabled();
    applyFcvFont();
    syncFcvExportButton();

    OV.addCleanup(function () {
      fcvStopPreviewLoop();
    });

    function dl(size) {
      var out = document.createElement('canvas');
      out.width = out.height = size;
      var src = iface.querySelector('#ov-fcv');
      var octx = out.getContext('2d');
      fcvSetSmoothDownscale(octx);
      octx.drawImage(src, 0, 0, FCV_INTERNAL, FCV_INTERNAL, 0, 0, size, size);
      OV.downloadCanvas(out, 'favicon-' + size + '.png', 'image/png');
    }

    function dlIco() {
      var src = iface.querySelector('#ov-fcv');
      var order = [48, 32, 16];
      var pngs = [];
      var i;
      for (i = 0; i < order.length; i++) {
        var sz = order[i];
        var tmp = document.createElement('canvas');
        tmp.width = tmp.height = sz;
        var tctx = tmp.getContext('2d');
        fcvSetSmoothDownscale(tctx);
        tctx.drawImage(src, 0, 0, FCV_INTERNAL, FCV_INTERNAL, 0, 0, sz, sz);
        pngs.push(OV.canvasToPngUint8Array(tmp));
      }
      var ico = OV.encodeIcoFromPngBuffers(pngs);
      OV.downloadBlob(new Blob([ico], { type: 'image/vnd.microsoft.icon' }), 'favicon.ico');
    }

    iface.querySelector('#ov-fico').addEventListener('click', function () {
      var animEl = iface.querySelector('#ov-fanim');
      var mode = animEl ? animEl.value : 'none';
      if (fcvIsMotionOn(mode)) {
        fcvExportAnimatedFavicon();
      } else {
        dlIco();
      }
    });
    iface.querySelector('#ov-f32').addEventListener('click', function () {
      dl(32);
    });
    iface.querySelector('#ov-f180').addEventListener('click', function () {
      dl(180);
    });
  }

  /* Font pair */
  var FONT_PAIRS = [
    { h: 'Syne', b: 'IBM Plex Mono', id: 'syne+ibm-plex-mono' },
    { h: 'Playfair Display', b: 'Source Sans 3', id: 'playfair-display+source-sans-3' },
    { h: 'Merriweather', b: 'Open Sans', id: 'merriweather+open-sans' },
    { h: 'Bebas Neue', b: 'Montserrat', id: 'bebas-neue+montserrat' },
    { h: 'Space Grotesk', b: 'Inter', id: 'space-grotesk+inter' },
    { h: 'DM Serif Display', b: 'DM Sans', id: 'dm-serif-display+dm-sans' },
    { h: 'Poppins', b: 'Open Sans', id: 'poppins+open-sans' },
    { h: 'Roboto Slab', b: 'Roboto', id: 'roboto-slab+roboto' },
    { h: 'Oswald', b: 'Lato', id: 'oswald+lato' },
    { h: 'Fraunces', b: 'Nunito', id: 'fraunces+nunito' },
    { h: 'Libre Baskerville', b: 'Lato', id: 'libre-baskerville+lato' },
    { h: 'EB Garamond', b: 'Lato', id: 'eb-garamond+lato' },
    { h: 'Spectral', b: 'Karla', id: 'spectral+karla' },
    { h: 'Bitter', b: 'Raleway', id: 'bitter+raleway' },
    { h: 'PT Serif', b: 'PT Sans', id: 'pt-serif+pt-sans' },
    { h: 'Noto Serif', b: 'Noto Sans', id: 'noto-serif+noto-sans' },
    { h: 'Anton', b: 'Manrope', id: 'anton+manrope' },
    { h: 'Archivo Black', b: 'Archivo', id: 'archivo-black+archivo' },
    { h: 'Raleway', b: 'Lato', id: 'raleway+lato' },
    { h: 'Montserrat', b: 'Open Sans', id: 'montserrat+open-sans' },
    { h: 'Outfit', b: 'Source Sans 3', id: 'outfit+source-sans-3' },
    { h: 'Sora', b: 'Inter', id: 'sora+inter' },
    { h: 'Lexend', b: 'IBM Plex Sans', id: 'lexend+ibm-plex-sans' },
    { h: 'Plus Jakarta Sans', b: 'Inter', id: 'plus-jakarta-sans+inter' },
    { h: 'Figtree', b: 'Source Serif 4', id: 'figtree+source-serif-4' },
    { h: 'Urbanist', b: 'IBM Plex Sans', id: 'urbanist+ibm-plex-sans' },
    { h: 'Josefin Sans', b: 'Crimson Text', id: 'josefin-sans+crimson-text' },
    { h: 'Yeseva One', b: 'Josefin Sans', id: 'yeseva-one+josefin-sans' },
    { h: 'Cormorant Garamond', b: 'Proza Libre', id: 'cormorant-garamond+proza-libre' },
    { h: 'Newsreader', b: 'Work Sans', id: 'newsreader+work-sans' },
    { h: 'Zilla Slab', b: 'Nunito Sans', id: 'zilla-slab+nunito-sans' },
    { h: 'Rubik', b: 'Karla', id: 'rubik+karla' },
    { h: 'Barlow', b: 'Fira Sans', id: 'barlow+fira-sans' },
    { h: 'Quicksand', b: 'Mulish', id: 'quicksand+mulish' },
    { h: 'Literata', b: 'Rubik', id: 'literata+rubik' },
    { h: 'Lora', b: 'Nunito Sans', id: 'lora+nunito-sans' },
    { h: 'Cinzel', b: 'Mulish', id: 'cinzel+mulish' },
    { h: 'Instrument Serif', b: 'Inter', id: 'instrument-serif+inter' },
    { h: 'Bodoni Moda', b: 'Outfit', id: 'bodoni-moda+outfit' },
    { h: 'Alegreya', b: 'Alegreya Sans', id: 'alegreya+alegreya-sans' },
    { h: 'Catamaran', b: 'Martel', id: 'catamaran+martel' },
    { h: 'DM Sans', b: 'DM Serif Display', id: 'dm-sans+dm-serif-display' },
    { h: 'Caveat', b: 'Quicksand', id: 'caveat+quicksand' },
    { h: 'Arvo', b: 'Open Sans', id: 'arvo+open-sans' },
    { h: 'Ubuntu', b: 'Open Sans', id: 'ubuntu+open-sans' },
    { h: 'Kanit', b: 'Prompt', id: 'kanit+prompt' },
  ];


  function initFontPair(iface) {
    function fpSvg(paths) {
      return (
        '<svg class="fp-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">' +
        paths +
        '</svg>'
      );
    }
    var FP_MEDIUMS = [
      { id: 'website', label: 'Website', svg: fpSvg('<rect x="3" y="4" width="18" height="14" rx="1"/><path d="M3 8h18"/>') },
      { id: 'mobile', label: 'Mobile', svg: fpSvg('<rect x="7" y="3" width="10" height="18" rx="2"/><path d="M10 18h4"/>') },
      { id: 'ui-grid', label: 'UI grid', svg: fpSvg('<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>') },
      { id: 'slides', label: 'Slides', svg: fpSvg('<rect x="4" y="5" width="16" height="4" rx="1"/><rect x="4" y="11" width="16" height="4" rx="1"/><rect x="4" y="17" width="12" height="3" rx="1"/>') },
      { id: 'social', label: 'Social', svg: fpSvg('<rect x="6" y="2" width="12" height="20" rx="2"/><circle cx="12" cy="7" r="2"/>') },
      { id: 'newsletter', label: 'Newsletter', svg: fpSvg('<path d="M4 5h16v14H4z"/><path d="M4 7l8 5 8-5"/>') },
      { id: 'business-card', label: 'Business card', svg: fpSvg('<rect x="3" y="8" width="18" height="9" rx="1"/><path d="M6 11h6M6 14h10"/>') },
      { id: 'logo', label: 'Logo', svg: fpSvg('<circle cx="12" cy="12" r="7"/><path d="M9 12h6"/>') },
      { id: 'type-scale', label: 'Type scale', svg: fpSvg('<path d="M4 6h16M4 10h12M4 14h14M4 18h10"/>') },
      { id: 'icons', label: 'Icons', svg: fpSvg('<circle cx="6" cy="6" r="1.5"/><circle cx="12" cy="6" r="1.5"/><circle cx="18" cy="6" r="1.5"/><circle cx="6" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="18" cy="12" r="1.5"/><circle cx="6" cy="18" r="1.5"/><circle cx="12" cy="18" r="1.5"/><circle cx="18" cy="18" r="1.5"/>') },
      { id: 'colors', label: 'Colors', svg: fpSvg('<path d="M4 6h16v4H4zM4 12h12v4H4zM4 18h10v4H4z"/>') },
    ];
    var FP_CONTEXTS = [
      { id: 'startup', label: 'Startup', head: 'Ship the vision.', body: 'Iterate in public. Pair a strong display face with a calm UI font for decks, product, and landing pages.', hint: 4 },
      { id: 'work', label: 'Work / corporate', head: 'Clarity at scale.', body: 'Reports, dashboards, and docs need hierarchy without noise. Favor legible serifs or grotesks with a neutral sans.', hint: 7 },
      { id: 'wedding', label: 'Wedding', head: 'Together.', body: 'Invitations and sites call for warmth. Script or high-contrast serif headlines with a light sans for details.', hint: 1 },
      { id: 'birthday', label: 'Birthday / party', head: 'Make it pop.', body: 'Posters and invites can go bolder. Display + geometric sans keeps RSVP blocks readable.', hint: 3 },
      { id: 'education', label: 'Education', head: 'Learn by doing.', body: 'Course hubs and readers need long-form comfort. A sturdy serif body with a friendly sans for nav works well.', hint: 2 },
      { id: 'nonprofit', label: 'Non-profit', head: 'Every voice counts.', body: 'Mission sites balance emotion and trust. Pair an expressive headline with an accessible sans for stories and CTAs.', hint: 1 },
      { id: 'ecommerce', label: 'E-commerce', head: 'New drop.', body: 'Shop the edit.', hint: 5 },
      { id: 'church', label: 'Church', head: 'Gather.', body: 'Event schedules and sermons online: traditional serif headlines with a simple sans for times and links.', hint: 11 },
      { id: 'fashion', label: 'Fashion', head: 'The line.', body: 'Lookbooks reward contrast: tight display typography and a minimal grotesk for sizes and care copy.', hint: 8 },
      { id: 'healthcare', label: 'Healthcare', head: 'Care, explained.', body: 'Patient-facing UI favors neutral sans pairs with clear hierarchy; reserve display for hero moments only.', hint: 6 },
      { id: 'realestate', label: 'Real estate', head: 'Your next address.', body: 'Listings and tours: confident headline + readable sans for specs, maps, and disclosures.', hint: 0 },
      { id: 'restaurant', label: 'Restaurant', head: 'Tonight’s menu.', body: 'Menus and sites: appetizing display for titles, clean sans for ingredients, hours, and reservations.', hint: 3 },
    ];
    var headSet = {};
    var bodySet = {};
    var hi;
    for (hi = 0; hi < FONT_PAIRS.length; hi++) {
      headSet[FONT_PAIRS[hi].h] = true;
      bodySet[FONT_PAIRS[hi].b] = true;
    }
    var heads = Object.keys(headSet).sort();
    var bodies = Object.keys(bodySet).sort();
    var headOpts = heads
      .map(function (f) {
        return '<option value="' + f.replace(/"/g, '&quot;') + '">' + f + '</option>';
      })
      .join('');
    var bodyOpts = bodies
      .map(function (f) {
        return '<option value="' + f.replace(/"/g, '&quot;') + '">' + f + '</option>';
      })
      .join('');
    var curOpts =
      '<option value="-1">Custom mix</option>' +
      FONT_PAIRS.map(function (p, i) {
        return '<option value="' + i + '">' + p.h + ' + ' + p.b + '</option>';
      }).join('');
    var FP_MEDIUM_DEFAULTS = {
      website: {
        head: 'Build beautiful products faster.',
        body: 'Ship a calm, confident landing page with clear hierarchy and room to breathe.',
      },
      mobile: { head: 'Good morning', body: 'Tuesday · 3 updates waiting for you.' },
      'ui-grid': { head: 'Dashboard', body: 'KPIs, activity, and files at a glance.' },
      slides: { head: 'Q3 narrative', body: 'Three bullets your team will actually remember.' },
      social: { head: 'Build. Ship. Scale.', body: 'Just launched our new feature! Check it out.' },
      newsletter: {
        head: 'Weekly brief',
        body: 'The most important links and numbers from this week, in one scroll.',
      },
      'business-card': { head: 'Alex Rivera', body: 'Creative Director · studio.co' },
      logo: { head: 'Overprint', body: 'Design utilities' },
      'type-scale': { head: 'Display', body: 'Paragraph 01 · long-form rhythm for readers.' },
      icons: { head: 'Icon sample', body: 'Glyph stress test at small sizes.' },
      colors: { head: 'Palette', body: 'Overprint tokens and your accent preview.' },
    };
    var mediumOpts = FP_MEDIUMS.map(function (m, i) {
      return (
        '<option value="' +
        m.id +
        '"' +
        (i === 0 ? ' selected' : '') +
        '>' +
        m.label +
        '</option>'
      );
    }).join('');
    var contextOpts = FP_CONTEXTS.map(function (c, i) {
      return (
        '<option value="' +
        c.id +
        '"' +
        (i === 0 ? ' selected' : '') +
        '>' +
        c.label +
        '</option>'
      );
    }).join('');
    var accentHex = ['#00b4d8', '#e040a0', '#f0d020', '#f59e0b', '#22c55e', '#a78bfa'];
    var accentChips = accentHex
      .map(function (hex, i) {
        return (
          '<button type="button" class="fp-chip' +
          (i === 3 ? ' is-picked' : '') +
          '" data-hex="' +
          hex +
          '" style="background:' +
          hex +
          '" title="' +
          hex +
          '"></button>'
        );
      })
      .join('');
    var svgDl =
      '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="M7 12l5 5 5-5"/><path d="M5 21h14"/></svg>';
    var svgChev =
      '<svg class="fp-xbtn__chev" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>';
    var fpLayouts =
      '<div class="fp-layout fp-layout--website">' +
      '<div class="fp-browser">' +
      '<div class="fp-browser-chrome">' +
      '<span class="fp-browser-dots"><i></i><i></i><i></i></span>' +
      '<span class="fp-t-b fp-editable fp-browser-url">yoursite.com</span>' +
      '</div>' +
      '<div class="fp-browser-body">' +
      '<nav class="fp-web-nav">' +
      '<span class="fp-t-h fp-editable fp-web-brand">Acme</span>' +
      '<div class="fp-web-nav-links">' +
      '<span class="fp-t-b fp-editable">Features</span>' +
      '<span class="fp-t-b fp-editable">Pricing</span>' +
      '<span class="fp-t-b fp-editable">Blog</span>' +
      '<span class="fp-t-b fp-editable">About</span>' +
      '</div>' +
      '<span class="fp-t-h fp-editable fp-web-cta-chip">Get started</span>' +
      '</nav>' +
      '<section class="fp-web-hero">' +
      '<h2 class="fp-t-h fp-editable" data-fp-role="headline">Build beautiful products faster</h2>' +
      '<p class="fp-t-b fp-editable" data-fp-role="body">Ship a calm, confident landing page with clear hierarchy and room to breathe.</p>' +
      '<div class="fp-web-hero-btns">' +
      '<span class="fp-web-btn-pri fp-t-h fp-editable">Start free trial</span>' +
      '<span class="fp-web-btn-sec fp-t-b fp-editable">Watch demo \\u2192</span>' +
      '</div></section>' +
      '<div class="fp-web-stats">' +
      '<div class="fp-web-stat"><span class="fp-web-stat-num fp-t-h fp-editable">10k+</span><span class="fp-web-stat-label fp-t-b fp-editable">Users</span></div>' +
      '<div class="fp-web-stat"><span class="fp-web-stat-num fp-t-h fp-editable">99.9%</span><span class="fp-web-stat-label fp-t-b fp-editable">Uptime</span></div>' +
      '<div class="fp-web-stat"><span class="fp-web-stat-num fp-t-h fp-editable">4.9\\u2605</span><span class="fp-web-stat-label fp-t-b fp-editable">Rating</span></div>' +
      '</div>' +
      '<div class="fp-web-features">' +
      '<article class="fp-web-feat"><div class="fp-web-feat-ico"></div><span class="fp-t-h fp-editable">Analytics</span><span class="fp-t-b fp-editable">Real-time dashboards with the metrics that matter most.</span></article>' +
      '<article class="fp-web-feat"><div class="fp-web-feat-ico"></div><span class="fp-t-h fp-editable">Automation</span><span class="fp-t-b fp-editable">Workflows that save your team hours every single week.</span></article>' +
      '<article class="fp-web-feat"><div class="fp-web-feat-ico"></div><span class="fp-t-h fp-editable">Integrations</span><span class="fp-t-b fp-editable">Connect the tools you already use and love in minutes.</span></article>' +
      '</div>' +
      '<div class="fp-web-mid">' +
      '<h3 class="fp-t-h fp-editable">Ready to launch?</h3>' +
      '<p class="fp-t-b fp-editable" style="font-size:10px;opacity:.65;margin:4px 0 10px">Join thousands of teams shipping faster.</p>' +
      '<span class="fp-web-btn-pri fp-t-h fp-editable">Start your free trial</span>' +
      '</div>' +
      '<footer class="fp-web-footer">' +
      '<div class="fp-web-footcol"><span class="fp-t-h fp-editable" style="font-size:11px;font-weight:800">Acme</span><span class="fp-t-b fp-editable">Build products people love.</span></div>' +
      '<div class="fp-web-footcol"><span class="fp-t-h fp-editable">Product</span><span class="fp-t-b fp-editable">Features</span><span class="fp-t-b fp-editable">Pricing</span><span class="fp-t-b fp-editable">Changelog</span></div>' +
      '<div class="fp-web-footcol"><span class="fp-t-h fp-editable">Company</span><span class="fp-t-b fp-editable">About</span><span class="fp-t-b fp-editable">Careers</span><span class="fp-t-b fp-editable">Blog</span></div>' +
      '<div class="fp-web-footcol"><span class="fp-t-h fp-editable">Legal</span><span class="fp-t-b fp-editable">Privacy</span><span class="fp-t-b fp-editable">Terms</span></div>' +
      '</footer></div></div></div>' +
      '<div class="fp-layout fp-layout--mobile">' +
      '<div class="fp-phone"><div class="fp-phone-bar"></div><div class="fp-phone-screen">' +
      '<div class="fp-phone-status"><span class="fp-t-b">9:41</span><div class="fp-phone-status-right"><span class="fp-status-pill fp-t-b">\\u2022\\u2022\\u2022\\u2022</span><svg width="12" height="10" viewBox="0 0 16 12" fill="currentColor" opacity=".6"><path d="M1 8h2v4H1zM5 5h2v7H5zM9 2h2v10H9zM13 0h2v12h-2z"/></svg></div></div>' +
      '<h2 class="fp-t-h fp-editable fp-mob-greet" data-fp-role="headline">Good morning</h2>' +
      '<p class="fp-t-b fp-editable fp-mob-sub" data-fp-role="body">Tuesday \\u00b7 3 updates waiting for you</p>' +
      '<div class="fp-mob-search"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><span class="fp-t-b fp-editable">Search</span></div>' +
      '<div class="fp-mob-actions">' +
      '<div class="fp-mob-act"><i></i><span class="fp-t-b fp-editable">Send</span></div>' +
      '<div class="fp-mob-act"><i></i><span class="fp-t-b fp-editable">Pay</span></div>' +
      '<div class="fp-mob-act"><i></i><span class="fp-t-b fp-editable">Cards</span></div>' +
      '<div class="fp-mob-act"><i></i><span class="fp-t-b fp-editable">More</span></div>' +
      '</div>' +
      '<div class="fp-mob-list-head fp-t-b fp-editable">Recent activity</div>' +
      '<div class="fp-mob-row"><div class="fp-mob-av"></div><span class="fp-t-h fp-editable">Jada</span><span class="fp-t-b fp-editable">Invoice paid</span><span class="fp-mob-time fp-t-b">2m</span></div>' +
      '<div class="fp-mob-row"><div class="fp-mob-av"></div><span class="fp-t-h fp-editable">Phil</span><span class="fp-t-b fp-editable">Comment on deck</span><span class="fp-mob-time fp-t-b">15m</span></div>' +
      '<div class="fp-mob-row"><div class="fp-mob-av"></div><span class="fp-t-h fp-editable">Mia</span><span class="fp-t-b fp-editable">Shared a file</span><span class="fp-mob-time fp-t-b">1h</span></div>' +
      '<nav class="fp-phone-tabbar">' +
      '<div class="fp-phone-tab is-active"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg><span class="fp-t-b">Home</span></div>' +
      '<div class="fp-phone-tab"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><span class="fp-t-b">Search</span></div>' +
      '<div class="fp-phone-tab"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg><span class="fp-t-b">Activity</span></div>' +
      '<div class="fp-phone-tab"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg><span class="fp-t-b">Profile</span></div>' +
      '</nav>' +
      '</div></div></div>' +
      '<div class="fp-layout fp-layout--social">' +
      '<div class="fp-phone"><div class="fp-phone-bar"></div><div class="fp-phone-screen">' +
      '<div class="fp-phone-status"><span class="fp-t-b">9:41</span><div class="fp-phone-status-right"><svg width="12" height="10" viewBox="0 0 16 12" fill="currentColor" opacity=".6"><path d="M1 8h2v4H1zM5 5h2v7H5zM9 2h2v10H9zM13 0h2v12h-2z"/></svg></div></div>' +
      '<div class="fp-soc-stories">' +
      '<div class="fp-soc-story"><i></i><span class="fp-t-b fp-editable">You</span></div>' +
      '<div class="fp-soc-story"><i></i><span class="fp-t-b fp-editable">Mia</span></div>' +
      '<div class="fp-soc-story"><i></i><span class="fp-t-b fp-editable">Leo</span></div>' +
      '<div class="fp-soc-story"><i></i><span class="fp-t-b fp-editable">Ava</span></div>' +
      '</div>' +
      '<div class="fp-soc-post">' +
      '<div class="fp-soc-post-top"><div class="fp-soc-av"></div><span class="fp-t-h fp-editable">studio.acme</span><span class="fp-soc-post-menu">\\u2022\\u2022\\u2022</span></div>' +
      '<div class="fp-soc-photo"><span class="fp-t-h fp-editable" data-fp-role="headline">Build. Ship. Scale.</span></div>' +
      '<div class="fp-soc-actions"><svg class="fp-soc-action" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg><svg class="fp-soc-action" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><svg class="fp-soc-action" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg><svg class="fp-soc-action fp-soc-action--save" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg></div>' +
      '<div class="fp-soc-likes fp-t-h fp-editable">1,847 likes</div>' +
      '<div class="fp-soc-caption"><strong class="fp-t-h fp-editable">studio.acme</strong> <span class="fp-t-b fp-editable" data-fp-role="body">Just launched our new feature! Check it out \\u2728</span></div>' +
      '<div class="fp-soc-time fp-t-b fp-editable">2 hours ago</div>' +
      '</div></div></div></div>' +
      '<div class="fp-layout fp-layout--ui-grid">' +
      '<div class="fp-browser">' +
      '<div class="fp-browser-chrome">' +
      '<span class="fp-browser-dots"><i></i><i></i><i></i></span>' +
      '<span class="fp-t-b fp-editable fp-browser-url">app.acme.com/dashboard</span>' +
      '</div>' +
      '<div class="fp-browser-body fp-dash-body">' +
      '<div class="fp-dash-sidebar">' +
      '<span class="fp-dash-logo fp-t-h fp-editable" style="font-weight:800;font-size:11px;margin-bottom:16px;display:block">Acme</span>' +
      '<span class="fp-dash-nav-item fp-t-b fp-editable is-active">Dashboard</span>' +
      '<span class="fp-dash-nav-item fp-t-b fp-editable">Projects</span>' +
      '<span class="fp-dash-nav-item fp-t-b fp-editable">Team</span>' +
      '<span class="fp-dash-nav-item fp-t-b fp-editable">Settings</span>' +
      '</div>' +
      '<div class="fp-dash-main">' +
      '<h2 class="fp-t-h fp-editable fp-dash-title" data-fp-role="headline">Dashboard</h2>' +
      '<p class="fp-t-b fp-editable fp-dash-lead" data-fp-role="body">KPIs, activity, and files at a glance.</p>' +
      '<div class="fp-dash-stats">' +
      '<div class="fp-dash-stat"><span class="fp-dash-stat-num fp-t-h fp-editable">2,847</span><span class="fp-dash-stat-label fp-t-b fp-editable">Total users</span><span class="fp-dash-stat-trend fp-t-b">+12.5%</span></div>' +
      '<div class="fp-dash-stat"><span class="fp-dash-stat-num fp-t-h fp-editable">$48.2k</span><span class="fp-dash-stat-label fp-t-b fp-editable">Revenue</span><span class="fp-dash-stat-trend fp-t-b">+8.1%</span></div>' +
      '<div class="fp-dash-stat"><span class="fp-dash-stat-num fp-t-h fp-editable">94.2%</span><span class="fp-dash-stat-label fp-t-b fp-editable">Satisfaction</span><span class="fp-dash-stat-trend fp-t-b">+2.3%</span></div>' +
      '<div class="fp-dash-stat"><span class="fp-dash-stat-num fp-t-h fp-editable">1,204</span><span class="fp-dash-stat-label fp-t-b fp-editable">Active now</span><span class="fp-dash-stat-trend fp-dash-stat-trend--live fp-t-b">\\u2022 Live</span></div>' +
      '</div>' +
      '<div class="fp-dash-activity">' +
      '<span class="fp-dash-section-head fp-t-h fp-editable">Recent activity</span>' +
      '<div class="fp-dash-row"><span class="fp-dash-row-dot"></span><span class="fp-t-b fp-editable">New signup from <strong>alex@company.co</strong></span><span class="fp-dash-row-time fp-t-b">2m ago</span></div>' +
      '<div class="fp-dash-row"><span class="fp-dash-row-dot"></span><span class="fp-t-b fp-editable">Invoice #1042 paid \\u2014 $2,400</span><span class="fp-dash-row-time fp-t-b">15m ago</span></div>' +
      '<div class="fp-dash-row"><span class="fp-dash-row-dot"></span><span class="fp-t-b fp-editable">Deploy v2.4.1 completed successfully</span><span class="fp-dash-row-time fp-t-b">1h ago</span></div>' +
      '</div>' +
      '</div></div></div></div>' +
      '<div class="fp-layout fp-layout--slides">' +
      '<div class="fp-slide">' +
      '<div class="fp-slide-bar"></div>' +
      '<h2 class="fp-t-h fp-editable" data-fp-role="headline">Q3 narrative</h2>' +
      '<p class="fp-t-b fp-editable fp-slide-lead" data-fp-role="body">One line that frames the slide before the bullets.</p>' +
      '<ul class="fp-slide-list">' +
      '<li class="fp-t-b fp-editable">North star metric up 18% week over week</li>' +
      '<li class="fp-t-b fp-editable">Shipped onboarding v2 to 40% of users</li>' +
      '<li class="fp-t-b fp-editable">Hiring: 2 senior product designers</li>' +
      '</ul>' +
      '<div class="fp-slide-footer"><span class="fp-slide-num fp-t-b fp-editable">03</span><div class="fp-slide-dots"><span class="fp-slide-dot"></span><span class="fp-slide-dot"></span><span class="fp-slide-dot is-active"></span><span class="fp-slide-dot"></span><span class="fp-slide-dot"></span></div><span class="fp-slide-nav fp-t-b">\\u2192</span></div>' +
      '</div></div>' +
      '<div class="fp-layout fp-layout--newsletter">' +
      '<div class="fp-email">' +
      '<div class="fp-email-header"><div class="fp-email-mark"></div><span class="fp-t-h fp-editable fp-email-pub">The Weekly</span></div>' +
      '<div class="fp-email-meta fp-t-b fp-editable">Issue 12 \\u00b7 September 2024</div>' +
      '<h2 class="fp-t-h fp-editable" data-fp-role="headline">Weekly brief</h2>' +
      '<p class="fp-t-b fp-editable" data-fp-role="body">The most important links and numbers from this week, in one scroll. Curated for builders.</p>' +
      '<span class="fp-email-cta fp-t-h fp-editable">Read the full story</span>' +
      '<div class="fp-email-divider"></div>' +
      '<div class="fp-email-block fp-t-b fp-editable">In other news \\u2014 we shipped three features, opened two roles, and hosted a community AMA.</div>' +
      '<div class="fp-email-footer fp-t-b fp-editable">Unsubscribe \\u00b7 Manage preferences \\u00b7 View in browser</div>' +
      '</div></div>' +
      '<div class="fp-layout fp-layout--business-card">' +
      '<div class="fp-bc-card">' +
      '<div class="fp-bc-accent"></div>' +
      '<div class="fp-bc-layout">' +
      '<div class="fp-bc-info">' +
      '<h2 class="fp-t-h fp-editable" data-fp-role="headline">Alex Rivera</h2>' +
      '<p class="fp-t-b fp-editable" data-fp-role="body">Creative Director</p>' +
      '</div>' +
      '<div class="fp-bc-mark"></div>' +
      '</div>' +
      '<div class="fp-bc-divider"></div>' +
      '<div class="fp-bc-details">' +
      '<div class="fp-bc-detail"><span class="fp-bc-detail-dot"></span><span class="fp-t-b fp-editable">alex@studio.co</span></div>' +
      '<div class="fp-bc-detail"><span class="fp-bc-detail-dot"></span><span class="fp-t-b fp-editable">+1 (555) 000-0000</span></div>' +
      '<div class="fp-bc-detail"><span class="fp-bc-detail-dot"></span><span class="fp-t-b fp-editable">studio.co</span></div>' +
      '</div>' +
      '</div></div>' +
      '<div class="fp-layout fp-layout--logo">' +
      '<div class="fp-logo-lockup">' +
      '<div class="fp-logo-mark"></div>' +
      '<h2 class="fp-t-h fp-editable" data-fp-role="headline">Overprint</h2>' +
      '<div class="fp-logo-rule"></div>' +
      '<p class="fp-t-b fp-editable" data-fp-role="body">Design utilities</p>' +
      '<span class="fp-logo-est fp-t-b fp-editable">Est. 2024</span>' +
      '</div></div>' +
      '<div class="fp-layout fp-layout--type-scale">' +
      '<div class="fp-ts">' +
      '<div class="fp-ts-row fp-t-h fp-editable fp-ts-d1" data-fp-role="headline">Display</div>' +
      '<hr class="fp-ts-hr"/>' +
      '<div class="fp-ts-row fp-t-h fp-editable fp-ts-d2">Heading 1</div>' +
      '<div class="fp-ts-row fp-t-h fp-editable fp-ts-d3">Heading 2</div>' +
      '<div class="fp-ts-row fp-t-h fp-editable fp-ts-d4">Heading 3</div>' +
      '<div class="fp-ts-row fp-t-h fp-editable fp-ts-d5">Heading 4</div>' +
      '<hr class="fp-ts-hr"/>' +
      '<div class="fp-ts-row fp-t-b fp-editable fp-ts-p1" data-fp-role="body">Paragraph 01 \\u00b7 long-form rhythm for readers and article body text.</div>' +
      '<div class="fp-ts-row fp-t-b fp-editable fp-ts-p2">Paragraph 02 \\u00b7 secondary copy for supporting descriptions.</div>' +
      '<div class="fp-ts-row fp-t-b fp-editable fp-ts-p3">Paragraph 03 \\u00b7 captions, meta lines, and timestamps.</div>' +
      '<div class="fp-ts-row fp-t-b fp-editable fp-ts-p4">Paragraph 04 \\u00b7 fine print, legal, and footnotes.</div>' +
      '</div></div>' +
      '<div class="fp-layout fp-layout--icons">' +
      '<div class="fp-icons-head">' +
      '<h3 class="fp-t-h fp-editable" data-fp-role="headline">Icon sample</h3>' +
      '<p class="fp-t-b fp-editable" data-fp-role="body">Glyph stress test at small sizes.</p></div>' +
      '<div class="fp-icondemo">' +
      '<span class="fp-t-h fp-editable">Aa</span>' +
      '<span class="fp-t-h fp-editable">Bb</span>' +
      '<span class="fp-t-h fp-editable">Gg</span>' +
      '<span class="fp-t-h fp-editable">Qq</span>' +
      '<span class="fp-t-h fp-editable">Rr</span>' +
      '<span class="fp-t-h fp-editable">\\u03c0</span>' +
      '<span class="fp-t-h fp-editable">\\u00a7</span>' +
      '<span class="fp-t-h fp-editable">01</span>' +
      '<span class="fp-t-h fp-editable">&amp;</span>' +
      '<span class="fp-t-h fp-editable">@</span>' +
      '</div></div>' +
      '<div class="fp-layout fp-layout--colors">' +
      '<div class="fp-colors-head">' +
      '<h3 class="fp-t-h fp-editable" data-fp-role="headline">Palette</h3>' +
      '<p class="fp-t-b fp-editable" data-fp-role="body">Overprint tokens and your accent preview.</p></div>' +
      '<div class="fp-palette" id="fp-palette" aria-label="Color tokens">' +
      '<div class="fp-palette-row" data-fp-var="--bg" style="background:var(--bg)">' +
      '<span class="fp-palette-row__label fp-t-h">Background</span>' +
      '<div class="fp-palette-row__meta"><span class="fp-palette-line fp-palette-hex fp-mono"></span><span class="fp-palette-line fp-palette-rgb fp-mono"></span><span class="fp-palette-line fp-palette-cmyk fp-mono"></span></div></div>' +
      '<div class="fp-palette-row" data-fp-var="--s1" style="background:var(--s1)">' +
      '<span class="fp-palette-row__label fp-t-h">Surface</span>' +
      '<div class="fp-palette-row__meta"><span class="fp-palette-line fp-palette-hex fp-mono"></span><span class="fp-palette-line fp-palette-rgb fp-mono"></span><span class="fp-palette-line fp-palette-cmyk fp-mono"></span></div></div>' +
      '<div class="fp-palette-row" data-fp-var="--text-hi" style="background:var(--text-hi)">' +
      '<span class="fp-palette-row__label fp-t-h">Text</span>' +
      '<div class="fp-palette-row__meta"><span class="fp-palette-line fp-palette-hex fp-mono"></span><span class="fp-palette-line fp-palette-rgb fp-mono"></span><span class="fp-palette-line fp-palette-cmyk fp-mono"></span></div></div>' +
      '<div class="fp-palette-row" data-fp-var="--border" style="background:var(--border)">' +
      '<span class="fp-palette-row__label fp-t-h">Border</span>' +
      '<div class="fp-palette-row__meta"><span class="fp-palette-line fp-palette-hex fp-mono"></span><span class="fp-palette-line fp-palette-rgb fp-mono"></span><span class="fp-palette-line fp-palette-cmyk fp-mono"></span></div></div>' +
      '<div class="fp-palette-row" data-fp-var="--C" style="background:var(--C)">' +
      '<span class="fp-palette-row__label fp-t-h">Cyan</span>' +
      '<div class="fp-palette-row__meta"><span class="fp-palette-line fp-palette-hex fp-mono"></span><span class="fp-palette-line fp-palette-rgb fp-mono"></span><span class="fp-palette-line fp-palette-cmyk fp-mono"></span></div></div>' +
      '<div class="fp-palette-row fp-palette-row--accent" data-fp-var="--fp-accent" style="background:var(--fp-accent,var(--C))">' +
      '<span class="fp-palette-row__label fp-t-h">Accent</span>' +
      '<div class="fp-palette-row__meta"><span class="fp-palette-line fp-palette-hex fp-mono"></span><span class="fp-palette-line fp-palette-rgb fp-mono"></span><span class="fp-palette-line fp-palette-cmyk fp-mono"></span></div></div>' +
      '</div></div>';
    iface.innerHTML =
      '<div class="tool-stack fp-workbench">' +
      '<div class="fp-shell">' +
      '<div class="fp-work">' +
      '<header class="fp-topbar">' +
      '<div class="fp-topbar__pickers">' +
      '<label class="fp-dd fp-dd--medium">' +
      FP_MEDIUMS[0].svg +
      '<select id="fp-medium" class="fp-dd__select" aria-label="Medium">' +
      mediumOpts +
      '</select></label>' +
      '<label class="fp-dd fp-dd--context">' +
      '<select id="fp-context" class="fp-dd__select" aria-label="Context">' +
      contextOpts +
      '</select></label>' +
      '</div>' +
      '<div class="fp-topbar__export">' +
      '<div class="fp-export-wrap" id="fp-export-wrap">' +
      '<button type="button" class="fp-xbtn fp-xbtn--export" id="fp-export-toggle" aria-expanded="false" aria-haspopup="true">' +
      svgDl +
      '<span>Export code</span>' +
      svgChev +
      '</button>' +
      '<div class="fp-export-menu" id="fp-export-menu" hidden>' +
      '<button type="button" id="fp-exp-copy">Copy CSS</button>' +
      '<button type="button" id="fp-exp-dl">Download .css file</button>' +
      '</div></div>' +
      '<button type="button" class="fp-xbtn fp-xbtn--brand" id="fp-brand-kit">' +
      svgDl +
      '<span>Brand Kit</span>' +
      '</button>' +
      '</div></header>' +
      '<main class="fp-canvas" aria-label="Preview">' +
      '<div class="fp-stage" id="fp-stage" data-medium="website">' +
      fpLayouts +
      '</div></main></div>' +
      '<aside class="fp-rail fp-rail--right fp-rail--props" aria-label="Properties">' +
      '<div class="fp-props-tabs" role="tablist">' +
      '<button type="button" class="fp-tab is-active" role="tab" aria-selected="true" data-tab="design" id="fp-tab-design">Design</button>' +
      '<button type="button" class="fp-tab" role="tab" aria-selected="false" data-tab="css" id="fp-tab-css">CSS</button>' +
      '</div>' +
      '<div class="fp-props-scroll">' +
      '<div class="fp-props-panel" id="fp-panel-design" role="tabpanel" aria-labelledby="fp-tab-design">' +
      '<div class="fp-prop-section">' +
      '<div class="fp-prop-section__head">Typography</div>' +
      '<div class="tool-field"><span class="tool-label">Curated set</span>' +
      '<select class="tool-select" id="fp-curated">' +
      curOpts +
      '</select></div>' +
      '<div class="tool-field"><span class="tool-label">Headline font</span>' +
      '<select class="tool-select" id="fp-head">' +
      headOpts +
      '</select></div>' +
      '<div class="tool-field"><span class="tool-label">Body font</span>' +
      '<select class="tool-select" id="fp-body">' +
      bodyOpts +
      '</select></div>' +
      '<button type="button" class="tool-btn tool-btn--m fp-btn-shuffle" id="fp-rand">Shuffle pair</button>' +
      '</div>' +
      '<div class="fp-prop-section">' +
      '<div class="fp-prop-section__head">Accent</div>' +
      '<div class="fp-chip-row" id="fp-accents">' +
      accentChips +
      '</div></div>' +
      '</div>' +
      '<div class="fp-props-panel" id="fp-panel-css" role="tabpanel" aria-labelledby="fp-tab-css" hidden>' +
      '<pre class="tool-pre-wrap fp-pre" id="fp-css"></pre></div>' +
      '</div>' +
      '</aside></div></div>';
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    var stage = iface.querySelector('#fp-stage');
    (function enableFpStageEditables() {
      var probe = document.createElement('div');
      probe.contentEditable = 'plaintext-only';
      var usePlain = probe.contentEditable === 'plaintext-only';
      stage.querySelectorAll('.fp-editable').forEach(function (n) {
        n.setAttribute('spellcheck', 'false');
        n.contentEditable = usePlain ? 'plaintext-only' : 'true';
      });
    })();
    var selMedium = iface.querySelector('#fp-medium');
    var selContext = iface.querySelector('#fp-context');
    var selCur = iface.querySelector('#fp-curated');
    var selHead = iface.querySelector('#fp-head');
    var selBody = iface.querySelector('#fp-body');
    var preCss = iface.querySelector('#fp-css');
    var exportMenu = iface.querySelector('#fp-export-menu');
    var exportToggle = iface.querySelector('#fp-export-toggle');
    var exportWrap = iface.querySelector('#fp-export-wrap');
    var currentAccent = '#f59e0b';
    function primaryEls(medium) {
      var L = stage.querySelector('.fp-layout--' + medium);
      if (!L) return { h: null, b: null };
      return {
        h: L.querySelector('[data-fp-role="headline"]'),
        b: L.querySelector('[data-fp-role="body"]'),
      };
    }
    function setPrimaryFromDefaults(medium) {
      var d = FP_MEDIUM_DEFAULTS[medium];
      if (!d) return;
      var P = primaryEls(medium);
      if (P.h) P.h.textContent = d.head;
      if (P.b) P.b.textContent = d.body;
    }
    function setAccent(hex) {
      currentAccent = hex;
      stage.style.setProperty('--fp-accent', hex);
      iface.querySelectorAll('.fp-chip').forEach(function (ch) {
        ch.classList.toggle('is-picked', ch.getAttribute('data-hex') === hex);
      });
    }
    function applyPairIndex(i) {
      i = +i;
      if (i < 0 || i >= FONT_PAIRS.length) return;
      var p = FONT_PAIRS[i];
      selHead.value = p.h;
      selBody.value = p.b;
      selCur.value = String(i);
    }
    function syncCuratedFromFonts() {
      var h = selHead.value;
      var b = selBody.value;
      var j;
      for (j = 0; j < FONT_PAIRS.length; j++) {
        if (FONT_PAIRS[j].h === h && FONT_PAIRS[j].b === b) {
          selCur.value = String(j);
          return;
        }
      }
      selCur.value = '-1';
    }
    function fpParseRgb(s) {
      var m = (s || '').match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (!m) return { r: 0, g: 0, b: 0 };
      return { r: +m[1], g: +m[2], b: +m[3] };
    }
    function fpRgbToHex(r, g, b) {
      return (
        '#' +
        [r, g, b]
          .map(function (x) {
            var h = x.toString(16);
            return h.length === 1 ? '0' + h : h;
          })
          .join('')
      );
    }
    function fpRgbToCmyk(r, g, b) {
      var rr = r / 255;
      var gg = g / 255;
      var bb = b / 255;
      var k = 1 - Math.max(rr, gg, bb);
      if (k >= 0.999) return { c: 0, m: 0, y: 0, k: 100 };
      var c = (1 - rr - k) / (1 - k);
      var m = (1 - gg - k) / (1 - k);
      var y = (1 - bb - k) / (1 - k);
      return {
        c: Math.round(c * 100),
        m: Math.round(m * 100),
        y: Math.round(y * 100),
        k: Math.round(k * 100),
      };
    }
    function fpRelLum(r, g, b) {
      var a = [r, g, b].map(function (v) {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
    }
    function refreshFpPalette() {
      var pal = stage.querySelector('#fp-palette');
      if (!pal) return;
      pal.querySelectorAll('.fp-palette-row').forEach(function (row) {
        var rgbStr = getComputedStyle(row).backgroundColor;
        var rgb = fpParseRgb(rgbStr);
        var hex = fpRgbToHex(rgb.r, rgb.g, rgb.b);
        var cm = fpRgbToCmyk(rgb.r, rgb.g, rgb.b);
        var h = row.querySelector('.fp-palette-hex');
        var rb = row.querySelector('.fp-palette-rgb');
        var ck = row.querySelector('.fp-palette-cmyk');
        if (h) h.textContent = 'HEX · ' + hex.toUpperCase();
        if (rb) rb.textContent = 'RGB · ' + rgb.r + ' · ' + rgb.g + ' · ' + rgb.b;
        if (ck) ck.textContent = 'CMYK · ' + cm.c + '% · ' + cm.m + '% · ' + cm.y + '% · ' + cm.k + '%';
        var lum = fpRelLum(rgb.r, rgb.g, rgb.b);
        row.style.color = lum > 0.55 ? '#0a0a10' : '#f4f4f8';
      });
    }

    function paint() {
      var hName = selHead.value;
      var bName = selBody.value;
      link.href =
        'https://fonts.googleapis.com/css2?family=' +
        encodeURIComponent(hName.replace(/ /g, '+')) +
        ':wght@300;400;500;600;700&family=' +
        encodeURIComponent(bName.replace(/ /g, '+')) +
        ':wght@300;400;500;600;700&display=swap';
      stage.querySelectorAll('.fp-t-h').forEach(function (n) {
        n.style.fontFamily = '"' + hName + '",sans-serif';
      });
      stage.querySelectorAll('.fp-t-b').forEach(function (n) {
        n.style.fontFamily = '"' + bName + '",sans-serif';
      });
      preCss.textContent =
        '@import url("' +
        link.href +
        '");\n\n:root { --accent: ' +
        currentAccent +
        '; }\n\n.display { font-family: "' +
        hName +
        '", sans-serif; font-weight: 700; }\n.body { font-family: "' +
        bName +
        '", sans-serif; }\n.accent { color: var(--accent); }\n';
      refreshFpPalette();
    }
    function applyContext(id) {
      var c = null;
      var k;
      for (k = 0; k < FP_CONTEXTS.length; k++) {
        if (FP_CONTEXTS[k].id === id) {
          c = FP_CONTEXTS[k];
          break;
        }
      }
      if (!c) return;
      var med = stage.getAttribute('data-medium') || 'website';
      var P = primaryEls(med);
      if (P.h) P.h.textContent = c.head;
      if (P.b) P.b.textContent = c.body;
      if (typeof c.hint === 'number' && FONT_PAIRS[c.hint]) {
        selCur.value = String(c.hint);
        applyPairIndex(c.hint);
      }
      paint();
    }
    function buildBrandKit() {
      return (
        'OVERPRINT · BRAND KIT (Font Pair)\n' +
        '================================\n\n' +
        'Google Fonts URL:\n' +
        link.href +
        '\n\n' +
        'Headline font: ' +
        selHead.value +
        '\nBody font: ' +
        selBody.value +
        '\nAccent: ' +
        currentAccent +
        '\nMedium: ' +
        selMedium.value +
        '\nContext: ' +
        selContext.value +
        '\n\n:root {\n  --font-head: "' +
        selHead.value +
        '", sans-serif;\n  --font-body: "' +
        selBody.value +
        '", sans-serif;\n  --accent: ' +
        currentAccent +
        ';\n}\n'
      );
    }
    var mediumDd = iface.querySelector('.fp-dd--medium');
    function syncMediumIcon() {
      var id = selMedium.value;
      var svgStr = '';
      var mi;
      for (mi = 0; mi < FP_MEDIUMS.length; mi++) {
        if (FP_MEDIUMS[mi].id === id) {
          svgStr = FP_MEDIUMS[mi].svg;
          break;
        }
      }
      if (!svgStr || !mediumDd) return;
      var oldIco = mediumDd.querySelector('.fp-ico');
      if (oldIco) oldIco.remove();
      selMedium.insertAdjacentHTML('beforebegin', svgStr);
    }
    selMedium.addEventListener('change', function () {
      var m = selMedium.value;
      stage.setAttribute('data-medium', m);
      setPrimaryFromDefaults(m);
      syncMediumIcon();
      paint();
    });
    selContext.addEventListener('change', function () {
      applyContext(selContext.value);
    });
    selCur.addEventListener('change', function () {
      var v = +selCur.value;
      if (v < 0) return;
      applyPairIndex(v);
      paint();
    });
    selHead.addEventListener('change', function () {
      syncCuratedFromFonts();
      paint();
    });
    selBody.addEventListener('change', function () {
      syncCuratedFromFonts();
      paint();
    });
    var tabDesign = iface.querySelector('#fp-tab-design');
    var tabCss = iface.querySelector('#fp-tab-css');
    var panelDesign = iface.querySelector('#fp-panel-design');
    var panelCss = iface.querySelector('#fp-panel-css');
    function setPropsTab(which) {
      var isD = which === 'design';
      tabDesign.classList.toggle('is-active', isD);
      tabCss.classList.toggle('is-active', !isD);
      tabDesign.setAttribute('aria-selected', isD ? 'true' : 'false');
      tabCss.setAttribute('aria-selected', isD ? 'false' : 'true');
      panelDesign.hidden = !isD;
      panelCss.hidden = isD;
    }
    tabDesign.addEventListener('click', function () {
      setPropsTab('design');
    });
    tabCss.addEventListener('click', function () {
      setPropsTab('css');
    });
    exportToggle.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = exportMenu.hidden;
      exportMenu.hidden = !open;
      exportToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    iface.querySelector('#fp-exp-copy').addEventListener('click', function () {
      OV.copyText(preCss.textContent);
      exportMenu.hidden = true;
      exportToggle.setAttribute('aria-expanded', 'false');
    });
    iface.querySelector('#fp-exp-dl').addEventListener('click', function () {
      OV.downloadBlob(
        new Blob([preCss.textContent], { type: 'text/css;charset=utf-8' }),
        'overprint-font-pair.css'
      );
      exportMenu.hidden = true;
      exportToggle.setAttribute('aria-expanded', 'false');
    });
    iface.querySelector('#fp-brand-kit').addEventListener('click', function () {
      paint();
      OV.downloadBlob(
        new Blob([buildBrandKit()], { type: 'text/plain;charset=utf-8' }),
        'overprint-brand-kit.txt'
      );
    });
    function closeExportMenu(ev) {
      if (!exportWrap.contains(ev.target)) {
        exportMenu.hidden = true;
        exportToggle.setAttribute('aria-expanded', 'false');
      }
    }
    document.addEventListener('click', closeExportMenu);
    iface.querySelector('#fp-accents').addEventListener('click', function (e) {
      var t = e.target.closest('.fp-chip');
      if (!t) return;
      setAccent(t.getAttribute('data-hex'));
      paint();
    });
    iface.querySelector('#fp-rand').addEventListener('click', function () {
      var n = Math.floor(Math.random() * FONT_PAIRS.length);
      applyPairIndex(n);
      paint();
    });
    OV.addCleanup(function () {
      document.removeEventListener('click', closeExportMenu);
      if (link.parentNode) link.parentNode.removeChild(link);
    });
    setAccent(currentAccent);
    applyPairIndex(0);
    applyContext(selContext.value);
    syncMediumIcon();
  }


  /* Beat maker (Web Audio; timeline + instruments + genre presets) */
  function initBeatMaker(iface) {
    var BEAT_INSTRUMENTS_HTML =
      '<optgroup label="Core (quick mix)">' +
      '<option value="classic_kick">Punch kick</option>' +
      '<option value="classic_snare">Dry snare</option>' +
      '<option value="classic_hat">Tight hat</option>' +
      '<option value="classic_bass">Soft pluck</option>' +
      '</optgroup>' +
      '<optgroup label="Kick">' +
      '<option value="kick_sub">Sub (deep)</option>' +
      '<option value="kick_punch">Punch</option>' +
      '<option value="kick_808">808 style</option>' +
      '<option value="kick_click">Click / tight</option>' +
      '</optgroup>' +
      '<optgroup label="Snare / clap">' +
      '<option value="snare_tight">Snare (tight)</option>' +
      '<option value="snare_room">Snare (room)</option>' +
      '<option value="rim">Rim shot</option>' +
      '<option value="clap">Hand clap</option>' +
      '</optgroup>' +
      '<optgroup label="Hi-hat / cymbal">' +
      '<option value="hat_closed">Hi-hat closed</option>' +
      '<option value="hat_open">Hi-hat open</option>' +
      '<option value="hat_metallic">Metallic tick</option>' +
      '<option value="cymbal_noise">Cymbal wash</option>' +
      '</optgroup>' +
      '<optgroup label="Percussion">' +
      '<option value="perc_cow">Cowbell</option>' +
      '<option value="perc_tom">Tom hit</option>' +
      '<option value="perc_tick">Wood tick</option>' +
      '</optgroup>' +
      '<optgroup label="Bass / tone">' +
      '<option value="bass_sub">Sub bass (low)</option>' +
      '<option value="bass_pluck">Pluck bass</option>' +
      '<option value="tone_stab">Stab chord</option>' +
      '</optgroup>';

    function pat(ix) {
      var a = [];
      var s = {};
      var i;
      for (i = 0; i < ix.length; i++) s[ix[i]] = true;
      for (i = 0; i < 16; i++) a.push(!!s[i]);
      return a;
    }

    var BEAT_PRESETS = [
      {
        id: '_',
        name: 'Pick a groove',
        bpm: 110,
        instruments: ['kick_sub', 'snare_tight', 'hat_closed', 'bass_sub'],
        pattern: [pat([]), pat([]), pat([]), pat([])],
      },
      {
        id: 'house',
        name: 'House (4×4)',
        bpm: 124,
        instruments: ['kick_punch', 'snare_tight', 'hat_closed', 'bass_pluck'],
        pattern: [pat([0, 4, 8, 12]), pat([4, 12]), pat([2, 6, 10, 14]), pat([0, 4, 8, 12])],
      },
      {
        id: 'hiphop',
        name: 'Hip-hop',
        bpm: 88,
        instruments: ['kick_sub', 'snare_room', 'hat_metallic', 'bass_sub'],
        pattern: [pat([0, 8]), pat([4, 12]), pat([2, 6, 10, 14]), pat([0, 7, 8, 15])],
      },
      {
        id: 'techno',
        name: 'Techno (driving)',
        bpm: 130,
        instruments: ['kick_click', 'rim', 'hat_closed', 'tone_stab'],
        pattern: [pat([0, 4, 8, 12]), pat([4, 12]), pat([0, 2, 4, 6, 8, 10, 12, 14]), pat([0, 8])],
      },
      {
        id: 'lofi',
        name: 'Lo-fi',
        bpm: 82,
        instruments: ['kick_808', 'rim', 'hat_open', 'bass_pluck'],
        pattern: [pat([0, 8]), pat([4, 12]), pat([1, 5, 9, 13]), pat([0, 3, 8, 11])],
      },
      {
        id: 'trap',
        name: 'Trap',
        bpm: 140,
        instruments: ['kick_sub', 'snare_tight', 'hat_closed', 'bass_sub'],
        pattern: [pat([0, 3, 8, 11]), pat([4, 12]), pat([0, 1, 2, 4, 5, 6, 8, 9, 10, 12, 13, 14]), pat([0, 8])],
      },
      {
        id: 'dnb',
        name: 'DnB (roller)',
        bpm: 174,
        instruments: ['kick_punch', 'snare_tight', 'hat_closed', 'bass_pluck'],
        pattern: [pat([0, 4, 8, 12]), pat([4, 12]), pat([2, 6, 10, 14]), pat([0, 3, 8, 11])],
      },
      {
        id: 'disco',
        name: 'Disco / funk',
        bpm: 118,
        instruments: ['kick_punch', 'clap', 'hat_open', 'bass_pluck'],
        pattern: [pat([0, 4, 8, 12]), pat([2, 6, 10, 14]), pat([0, 2, 4, 6, 8, 10, 12, 14]), pat([0, 7, 8, 15])],
      },
    ];

    var TRACK_ON = ['is-on-y', 'is-on-m', 'is-on-c', 'is-on-k'];
    var rows = 4;
    var cols = 16;
    var grid = [];
    var cellEls = [];
    var noiseBuf = null;
    var master = null;
    var outGain = null;
    var playlineEl = null;

    iface.innerHTML =
      '<div class="tool-stack">' +
      '<p class="tool-beat-audio-status" id="ov-bstat" role="status" aria-live="polite"></p>' +
      '<div class="tool-beat-control-column">' +
        '<div class="tool-row tool-row--top tool-row--beat-preset">' +
        '<div class="tool-field tool-field--beat-preset"><span class="tool-label">Pattern preset</span>' +
        '<select class="tool-select tool-select--beat-preset" id="ov-bpre"></select></div>' +
        '<div class="tool-field tool-field--beat-bpm">' +
        '<span class="tool-label">BPM</span>' +
        '<div class="tool-bpm-slider-row">' +
        '<input type="range" class="tool-input tool-input--range tool-input--bpm" id="ov-bpm" value="110" min="60" max="200" step="1" aria-valuemin="60" aria-valuemax="200" aria-valuenow="110" aria-label="Tempo BPM">' +
        '<span class="tool-bpm-val" id="ov-bpm-val">110</span>' +
        '</div></div>' +
        '</div>' +
        '<div class="tool-row tool-row--beat-transport">' +
        '<button type="button" class="tool-btn tool-btn--c tool-beat-transport" id="ov-bplay" aria-pressed="false" aria-label="Play beat">Play</button>' +
        '<button type="button" class="tool-btn tool-btn--m" id="ov-bclr">Clear grid</button>' +
        '</div>' +
        '</div>' +
      '<div class="tool-beat-wrap" id="ov-bwrap"></div>' +
      '</div>';

    var pre = iface.querySelector('#ov-bpre');
    BEAT_PRESETS.forEach(function (p) {
      var o = document.createElement('option');
      o.value = p.id;
      o.textContent = p.name;
      pre.appendChild(o);
    });

    var wrap = iface.querySelector('#ov-bwrap');
    var beatInner = el('<div class="tool-beat-inner"></div>');
    wrap.appendChild(beatInner);
    playlineEl = el('<div class="tool-beat-playline" aria-hidden="true"></div>');
    beatInner.appendChild(playlineEl);

    var timeline = el(
      '<div class="tool-beat-row tool-beat-row--timeline">' +
        '<div class="tool-beat-row-head"><span class="tool-label">Beat</span></div>' +
        '</div>'
    );
    for (var tc = 0; tc < cols; tc++) {
      var tick = el(
        '<div class="tool-beat-tick" data-c="' + tc + '" role="presentation">' + (tc + 1) + '</div>'
      );
      timeline.appendChild(tick);
    }
    beatInner.appendChild(timeline);

    var defaultInst = ['classic_kick', 'classic_snare', 'classic_hat', 'bass_pluck'];
    for (var r = 0; r < rows; r++) {
      grid[r] = [];
      cellEls[r] = [];
      var brow = el('<div class="tool-beat-row"></div>');
      var head = el('<div class="tool-beat-row-head"></div>');
      var sel = el(
        '<select class="tool-select tool-select--beat" data-row="' + r + '" aria-label="Instrument track ' +
          (r + 1) +
          '">' +
          BEAT_INSTRUMENTS_HTML +
          '</select>'
      );
      sel.value = defaultInst[r];
      head.appendChild(sel);
      brow.appendChild(head);
      for (var c = 0; c < cols; c++) {
        grid[r][c] = false;
        var cell = el(
          '<button type="button" class="tool-beat-cell" data-r="' + r + '" data-c="' + c + '" aria-label="Track ' +
            (r + 1) +
            ' step ' +
            (c + 1) +
            '"></button>'
        );
        cell.addEventListener('click', function () {
          var rr = +this.dataset.r;
          var cc = +this.dataset.c;
          grid[rr][cc] = !grid[rr][cc];
          paintCell(this, rr, grid[rr][cc]);
        });
        paintCell(cell, r, false);
        cellEls[r][c] = cell;
        brow.appendChild(cell);
      }
      beatInner.appendChild(brow);
    }

    var beatControlCol = iface.querySelector('.tool-beat-control-column');
    function syncBeatPresetColumnToTransport() {
      var tr = iface.querySelector('.tool-row--beat-transport');
      if (!beatControlCol || !tr) return;
      var w = Math.round(tr.getBoundingClientRect().width);
      if (w > 0) beatControlCol.style.setProperty('--tool-beat-transport-px', w + 'px');
      syncPlaylineVertical();
    }
    syncBeatPresetColumnToTransport();
    requestAnimationFrame(syncBeatPresetColumnToTransport);
    window.addEventListener('resize', syncBeatPresetColumnToTransport);

    function starterPattern() {
      var kicks = pat([0, 4, 8, 12]);
      var c;
      for (c = 0; c < cols; c++) {
        grid[0][c] = kicks[c];
        paintCell(cellEls[0][c], 0, grid[0][c]);
      }
    }
    starterPattern();

    function paintCell(cell, row, on) {
      TRACK_ON.forEach(function (x) {
        cell.classList.remove(x);
      });
      cell.classList.add(TRACK_ON[row]);
      cell.style.opacity = on ? '1' : '0.28';
    }

    var lastBeatCol = -1;

    function syncPlaylineVertical() {
      if (!playlineEl || !beatInner) return;
      var gridRows = beatInner.querySelectorAll('.tool-beat-row:not(.tool-beat-row--timeline)');
      if (!gridRows.length) return;
      var firstRow = gridRows[0];
      var lastRow = gridRows[gridRows.length - 1];
      var top = firstRow.offsetTop;
      var h = lastRow.offsetTop + lastRow.offsetHeight - top;
      playlineEl.style.top = top + 'px';
      playlineEl.style.height = Math.max(0, h) + 'px';
      playlineEl.style.bottom = 'auto';
    }

    /** Discrete playhead (paused / scrub sync). */
    function setPlayheadDiscrete(col) {
      if (col >= 0) lastBeatCol = col;
      for (var rr = 0; rr < rows; rr++) {
        for (var cc = 0; cc < cols; cc++) {
          cellEls[rr][cc].classList.toggle('is-playhead', cc === col);
        }
      }
      syncPlaylineVertical();
      if (playlineEl && cellEls[0] && cellEls[0][0]) {
        if (col < 0) {
          playlineEl.style.opacity = '0';
        } else {
          playlineEl.style.opacity = '1';
          var cell = cellEls[0][col];
          var rowEl = cell.parentElement;
          var c0 = cellEls[0][0];
          var cLast = cellEls[0][cols - 1];
          var gridLeft = rowEl.offsetLeft + c0.offsetLeft;
          var gridRight = rowEl.offsetLeft + cLast.offsetLeft + cLast.offsetWidth;
          var half = 1.5;
          var cx = rowEl.offsetLeft + cell.offsetLeft + cell.offsetWidth / 2;
          cx = Math.max(gridLeft + half, Math.min(gridRight - half, cx));
          playlineEl.style.left = cx + 'px';
        }
      }
    }

    /** Continuous playhead: linear phase from beatAnchorTime (smooth at steady BPM). Re-anchor when step length changes so BPM edits stay smooth. */
    function updatePlayheadSmooth() {
      if (!playing || !ctx || !playlineEl || !cellEls[0] || !cellEls[0][0]) return;
      var now = ctx.currentTime;
      var sp = effectiveSecondsPerStep();
      if (playheadLastSp > 0 && Math.abs(sp - playheadLastSp) > 1e-7) {
        var phaseStepsOld = (now - beatAnchorTime) / playheadLastSp;
        var fracKeep = phaseStepsOld - Math.floor(phaseStepsOld / cols) * cols;
        beatAnchorTime = now - fracKeep * sp;
      }
      playheadLastSp = sp;
      var phaseSteps = (now - beatAnchorTime) / sp;
      var fracInBar = phaseSteps - Math.floor(phaseSteps / cols) * cols;
      lastBeatCol = Math.min(cols - 1, Math.max(0, Math.floor(fracInBar)));
      syncPlaylineVertical();
      var rowEl = cellEls[0][0].parentElement;
      var c0 = cellEls[0][0];
      var cLast = cellEls[0][cols - 1];
      var gridLeft = rowEl.offsetLeft + c0.offsetLeft;
      var gridRight = rowEl.offsetLeft + cLast.offsetLeft + cLast.offsetWidth;
      var totalWidth = gridRight - gridLeft;
      var half = 1.5;
      var cx = gridLeft + ((fracInBar + 0.5) / cols) * totalWidth;
      cx = Math.max(gridLeft + half, Math.min(gridRight - half, cx));
      playlineEl.style.opacity = '1';
      playlineEl.style.left = cx + 'px';
    }

    function clearPlayhead() {
      lastBeatCol = -1;
      setPlayheadDiscrete(-1);
    }

    wrap.addEventListener('scroll', function () {
      if (playing && ctx) updatePlayheadSmooth();
      else if (lastBeatCol >= 0) setPlayheadDiscrete(lastBeatCol);
      else syncPlaylineVertical();
    });

    function fillNoiseDeterministic(d) {
      var s = 0x9e3779b9;
      var i;
      for (i = 0; i < d.length; i++) {
        s = Math.imul(s ^ (s >>> 13), 0x85ebca6b);
        s ^= s >>> 17;
        d[i] = ((s >>> 0) / 0xffffffff) * 2 - 1;
      }
    }

    function ensureNoise(ac) {
      if (noiseBuf && noiseBuf.sampleRate === ac.sampleRate) return noiseBuf;
      var n = Math.floor(ac.sampleRate * 0.25);
      var buf = ac.createBuffer(1, n, ac.sampleRate);
      fillNoiseDeterministic(buf.getChannelData(0));
      noiseBuf = buf;
      return noiseBuf;
    }

    function connectOut(g) {
      if (outGain) g.connect(outGain);
    }

    var playInstrument = {
      classic_kick: function (ac, t) {
        var o = ac.createOscillator();
        var g = ac.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(152, t);
        o.frequency.exponentialRampToValueAtTime(48, t + 0.06);
        g.gain.setValueAtTime(0.0008, t);
        g.gain.exponentialRampToValueAtTime(0.48, t + 0.0025);
        g.gain.exponentialRampToValueAtTime(0.0008, t + 0.2);
        o.connect(g);
        connectOut(g);
        o.start(t);
        o.stop(t + 0.22);
      },
      classic_snare: function (ac, t) {
        var buf = ensureNoise(ac);
        var src = ac.createBufferSource();
        src.buffer = buf;
        var hp = ac.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 1800;
        var bp = ac.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 3200;
        bp.Q.value = 0.55;
        var g = ac.createGain();
        g.gain.setValueAtTime(0.0008, t);
        g.gain.exponentialRampToValueAtTime(0.38, t + 0.002);
        g.gain.exponentialRampToValueAtTime(0.0008, t + 0.09);
        src.connect(hp);
        hp.connect(bp);
        bp.connect(g);
        connectOut(g);
        src.start(t, 0.04, 0.1);
        var o = ac.createOscillator();
        o.type = 'triangle';
        o.frequency.value = 185;
        var g2 = ac.createGain();
        g2.gain.setValueAtTime(0.0008, t);
        g2.gain.exponentialRampToValueAtTime(0.12, t + 0.002);
        g2.gain.exponentialRampToValueAtTime(0.0008, t + 0.045);
        o.connect(g2);
        connectOut(g2);
        o.start(t);
        o.stop(t + 0.055);
      },
      classic_hat: function (ac, t) {
        var buf = ensureNoise(ac);
        var src = ac.createBufferSource();
        src.buffer = buf;
        var hp = ac.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 7200;
        var g = ac.createGain();
        g.gain.setValueAtTime(0.0008, t);
        g.gain.exponentialRampToValueAtTime(0.16, t + 0.001);
        g.gain.exponentialRampToValueAtTime(0.0008, t + 0.032);
        src.connect(hp);
        hp.connect(g);
        connectOut(g);
        src.start(t, 0.12, 0.045);
      },
      classic_bass: function (ac, t) {
        var o = ac.createOscillator();
        var g = ac.createGain();
        var f = ac.createBiquadFilter();
        o.type = 'triangle';
        o.frequency.value = 92;
        f.type = 'lowpass';
        f.frequency.setValueAtTime(520, t);
        f.frequency.exponentialRampToValueAtTime(110, t + 0.1);
        g.gain.setValueAtTime(0.0008, t);
        g.gain.exponentialRampToValueAtTime(0.2, t + 0.004);
        g.gain.exponentialRampToValueAtTime(0.0008, t + 0.16);
        o.connect(f);
        f.connect(g);
        connectOut(g);
        o.start(t);
        o.stop(t + 0.18);
      },
      kick_sub: function (ac, t) {
        var o = ac.createOscillator();
        var g = ac.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(165, t);
        o.frequency.exponentialRampToValueAtTime(52, t + 0.07);
        g.gain.setValueAtTime(0.0008, t);
        g.gain.exponentialRampToValueAtTime(0.55, t + 0.003);
        g.gain.exponentialRampToValueAtTime(0.0008, t + 0.32);
        o.connect(g);
        connectOut(g);
        o.start(t);
        o.stop(t + 0.35);
      },
      kick_punch: function (ac, t) {
        var o = ac.createOscillator();
        var g = ac.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(200, t);
        o.frequency.exponentialRampToValueAtTime(60, t + 0.05);
        g.gain.setValueAtTime(0.0008, t);
        g.gain.exponentialRampToValueAtTime(0.7, t + 0.002);
        g.gain.exponentialRampToValueAtTime(0.0008, t + 0.22);
        o.connect(g);
        connectOut(g);
        o.start(t);
        o.stop(t + 0.25);
      },
      kick_808: function (ac, t) {
        var o = ac.createOscillator();
        var g = ac.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(55, t);
        g.gain.setValueAtTime(0.0008, t);
        g.gain.exponentialRampToValueAtTime(0.5, t + 0.004);
        g.gain.exponentialRampToValueAtTime(0.0008, t + 0.55);
        o.connect(g);
        connectOut(g);
        o.start(t);
        o.stop(t + 0.6);
      },
      kick_click: function (ac, t) {
        var o = ac.createOscillator();
        var g = ac.createGain();
        o.type = 'triangle';
        o.frequency.setValueAtTime(380, t);
        g.gain.setValueAtTime(0.0008, t);
        g.gain.exponentialRampToValueAtTime(0.35, t + 0.001);
        g.gain.exponentialRampToValueAtTime(0.0008, t + 0.04);
        o.connect(g);
        connectOut(g);
        o.start(t);
        o.stop(t + 0.06);
      },
      snare_tight: function (ac, t) {
        var buf = ensureNoise(ac);
        var src = ac.createBufferSource();
        src.buffer = buf;
        var f = ac.createBiquadFilter();
        f.type = 'highpass';
        f.frequency.value = 1400;
        var g = ac.createGain();
        g.gain.setValueAtTime(0.0008, t);
        g.gain.exponentialRampToValueAtTime(0.5, t + 0.002);
        g.gain.exponentialRampToValueAtTime(0.0008, t + 0.1);
        src.connect(f);
        f.connect(g);
        connectOut(g);
        src.start(t);
        src.stop(t + 0.12);
        var o = ac.createOscillator();
        o.type = 'triangle';
        o.frequency.value = 190;
        var g2 = ac.createGain();
        g2.gain.setValueAtTime(0.0008, t);
        g2.gain.exponentialRampToValueAtTime(0.2, t + 0.002);
        g2.gain.exponentialRampToValueAtTime(0.0008, t + 0.06);
        o.connect(g2);
        connectOut(g2);
        o.start(t);
        o.stop(t + 0.07);
      },
      snare_room: function (ac, t) {
        playInstrument.snare_tight(ac, t);
        var buf = ensureNoise(ac);
        var src = ac.createBufferSource();
        src.buffer = buf;
        var f = ac.createBiquadFilter();
        f.type = 'bandpass';
        f.frequency.value = 800;
        f.Q.value = 0.6;
        var g = ac.createGain();
        g.gain.setValueAtTime(0.0008, t);
        g.gain.exponentialRampToValueAtTime(0.12, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0008, t + 0.28);
        src.connect(f);
        f.connect(g);
        connectOut(g);
        src.start(t);
        src.stop(t + 0.3);
      },
      rim: function (ac, t) {
        var o = ac.createOscillator();
        var g = ac.createGain();
        o.type = 'triangle';
        o.frequency.value = 800;
        g.gain.setValueAtTime(0.0008, t);
        g.gain.exponentialRampToValueAtTime(0.25, t + 0.001);
        g.gain.exponentialRampToValueAtTime(0.0008, t + 0.05);
        o.connect(g);
        connectOut(g);
        o.start(t);
        o.stop(t + 0.06);
      },
      clap: function (ac, t) {
        var buf = ensureNoise(ac);
        var taps = [
          { delay: 0, peak: 0.42, bpf: 1650, q: 0.72, hp: 420, off: 0.02, dur: 0.048 },
          { delay: 0.0045, peak: 0.48, bpf: 2100, q: 0.65, hp: 380, off: 0.056, dur: 0.052 },
          { delay: 0.0095, peak: 0.34, bpf: 1350, q: 0.78, hp: 450, off: 0.091, dur: 0.05 },
          { delay: 0.016, peak: 0.24, bpf: 2400, q: 0.58, hp: 360, off: 0.128, dur: 0.046 },
          { delay: 0.0245, peak: 0.14, bpf: 1750, q: 0.82, hp: 400, off: 0.162, dur: 0.042 },
        ];
        var i;
        for (i = 0; i < taps.length; i++) {
          (function (tap) {
            var src = ac.createBufferSource();
            src.buffer = buf;
            var bp = ac.createBiquadFilter();
            bp.type = 'bandpass';
            bp.frequency.value = tap.bpf;
            bp.Q.value = tap.q;
            var hp = ac.createBiquadFilter();
            hp.type = 'highpass';
            hp.frequency.value = tap.hp;
            var g = ac.createGain();
            var t0 = t + tap.delay;
            g.gain.setValueAtTime(0.0001, t0);
            g.gain.exponentialRampToValueAtTime(tap.peak, t0 + 0.0018);
            g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.062);
            src.connect(bp);
            bp.connect(hp);
            hp.connect(g);
            connectOut(g);
            src.start(t0, tap.off, tap.dur);
          })(taps[i]);
        }
      },
      hat_closed: function (ac, t) {
        var buf = ensureNoise(ac);
        var src = ac.createBufferSource();
        src.buffer = buf;
        var f = ac.createBiquadFilter();
        f.type = 'highpass';
        f.frequency.value = 7000;
        var g = ac.createGain();
        g.gain.setValueAtTime(0.0008, t);
        g.gain.exponentialRampToValueAtTime(0.18, t + 0.001);
        g.gain.exponentialRampToValueAtTime(0.0008, t + 0.035);
        src.connect(f);
        f.connect(g);
        connectOut(g);
        src.start(t);
        src.stop(t + 0.04);
      },
      hat_open: function (ac, t) {
        var buf = ensureNoise(ac);
        var src = ac.createBufferSource();
        src.buffer = buf;
        var f = ac.createBiquadFilter();
        f.type = 'highpass';
        f.frequency.value = 6000;
        var g = ac.createGain();
        g.gain.setValueAtTime(0.0008, t);
        g.gain.exponentialRampToValueAtTime(0.15, t + 0.003);
        g.gain.exponentialRampToValueAtTime(0.0008, t + 0.18);
        src.connect(f);
        f.connect(g);
        connectOut(g);
        src.start(t);
        src.stop(t + 0.2);
      },
      hat_metallic: function (ac, t) {
        var o = ac.createOscillator();
        var g = ac.createGain();
        o.type = 'square';
        o.frequency.value = 8000;
        var f = ac.createBiquadFilter();
        f.type = 'bandpass';
        f.frequency.value = 8000;
        f.Q.value = 8;
        g.gain.setValueAtTime(0.0008, t);
        g.gain.exponentialRampToValueAtTime(0.08, t + 0.001);
        g.gain.exponentialRampToValueAtTime(0.0008, t + 0.03);
        o.connect(f);
        f.connect(g);
        connectOut(g);
        o.start(t);
        o.stop(t + 0.04);
      },
      cymbal_noise: function (ac, t) {
        var buf = ensureNoise(ac);
        var src = ac.createBufferSource();
        src.buffer = buf;
        var f = ac.createBiquadFilter();
        f.type = 'highpass';
        f.frequency.value = 5000;
        var g = ac.createGain();
        g.gain.setValueAtTime(0.0008, t);
        g.gain.exponentialRampToValueAtTime(0.08, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0008, t + 0.35);
        src.connect(f);
        f.connect(g);
        connectOut(g);
        src.start(t);
        src.stop(t + 0.38);
      },
      perc_cow: function (ac, t) {
        var o = ac.createOscillator();
        var g = ac.createGain();
        o.type = 'square';
        o.frequency.setValueAtTime(580, t);
        o.frequency.setValueAtTime(780, t + 0.02);
        g.gain.setValueAtTime(0.0008, t);
        g.gain.exponentialRampToValueAtTime(0.12, t + 0.002);
        g.gain.exponentialRampToValueAtTime(0.0008, t + 0.12);
        o.connect(g);
        connectOut(g);
        o.start(t);
        o.stop(t + 0.14);
      },
      perc_tom: function (ac, t) {
        var o = ac.createOscillator();
        var g = ac.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(220, t);
        o.frequency.exponentialRampToValueAtTime(90, t + 0.08);
        g.gain.setValueAtTime(0.0008, t);
        g.gain.exponentialRampToValueAtTime(0.35, t + 0.003);
        g.gain.exponentialRampToValueAtTime(0.0008, t + 0.2);
        o.connect(g);
        connectOut(g);
        o.start(t);
        o.stop(t + 0.22);
      },
      perc_tick: function (ac, t) {
        var o = ac.createOscillator();
        var g = ac.createGain();
        o.type = 'sine';
        o.frequency.value = 1200;
        g.gain.setValueAtTime(0.0008, t);
        g.gain.exponentialRampToValueAtTime(0.2, t + 0.0005);
        g.gain.exponentialRampToValueAtTime(0.0008, t + 0.02);
        o.connect(g);
        connectOut(g);
        o.start(t);
        o.stop(t + 0.025);
      },
      bass_sub: function (ac, t) {
        var o = ac.createOscillator();
        var g = ac.createGain();
        o.type = 'sine';
        o.frequency.value = 55;
        g.gain.setValueAtTime(0.0008, t);
        g.gain.exponentialRampToValueAtTime(0.28, t + 0.008);
        g.gain.exponentialRampToValueAtTime(0.0008, t + 0.2);
        o.connect(g);
        connectOut(g);
        o.start(t);
        o.stop(t + 0.22);
      },
      bass_pluck: function (ac, t) {
        var o = ac.createOscillator();
        var g = ac.createGain();
        var f = ac.createBiquadFilter();
        o.type = 'triangle';
        o.frequency.value = 98;
        f.type = 'lowpass';
        f.frequency.setValueAtTime(600, t);
        f.frequency.exponentialRampToValueAtTime(120, t + 0.12);
        g.gain.setValueAtTime(0.0008, t);
        g.gain.exponentialRampToValueAtTime(0.22, t + 0.003);
        g.gain.exponentialRampToValueAtTime(0.0008, t + 0.18);
        o.connect(f);
        f.connect(g);
        connectOut(g);
        o.start(t);
        o.stop(t + 0.2);
      },
      tone_stab: function (ac, t) {
        var freqs = [196, 247, 294];
        var k;
        for (k = 0; k < freqs.length; k++) {
          var o = ac.createOscillator();
          var g = ac.createGain();
          o.type = 'sawtooth';
          o.frequency.value = freqs[k];
          g.gain.setValueAtTime(0.0008, t);
          g.gain.exponentialRampToValueAtTime(0.06, t + 0.005);
          g.gain.exponentialRampToValueAtTime(0.0008, t + 0.12);
          o.connect(g);
          connectOut(g);
          o.start(t);
          o.stop(t + 0.14);
        }
      },
    };

    function beatMonoBufferToStereoWavBlob(audioBuffer) {
      var sr = audioBuffer.sampleRate;
      var n = audioBuffer.length;
      var ch0 = audioBuffer.getChannelData(0);
      var interleaved = new Float32Array(n * 2);
      var i;
      for (i = 0; i < n; i++) {
        interleaved[i * 2] = ch0[i];
        interleaved[i * 2 + 1] = ch0[i];
      }
      var buffer = new ArrayBuffer(44 + interleaved.length * 2);
      var view = new DataView(buffer);
      var writeStr = function (off, s) {
        var j;
        for (j = 0; j < s.length; j++) view.setUint8(off + j, s.charCodeAt(j));
      };
      var numChannels = 2;
      writeStr(0, 'RIFF');
      view.setUint32(4, 36 + interleaved.length * 2, true);
      writeStr(8, 'WAVE');
      writeStr(12, 'fmt ');
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true);
      view.setUint16(22, numChannels, true);
      view.setUint32(24, sr, true);
      view.setUint32(28, sr * numChannels * 2, true);
      view.setUint16(32, numChannels * 2, true);
      view.setUint16(34, 16, true);
      writeStr(36, 'data');
      view.setUint32(40, interleaved.length * 2, true);
      var offset = 44;
      for (i = 0; i < interleaved.length; i++) {
        var sm = Math.max(-1, Math.min(1, interleaved[i]));
        view.setInt16(offset, Math.max(-32768, Math.min(32767, Math.round(sm * 32767))), true);
        offset += 2;
      }
      return new Blob([buffer], { type: 'audio/wav' });
    }

    function exportBeatLoopWav() {
      var OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
      if (!OAC) {
        setBeatStat('Offline audio not available in this browser.', true);
        return;
      }
      setBeatStat('Rendering…');
      var sp = beatSecondsPerStep();
      var tailSec = 0.45;
      var duration = cols * sp + tailSec;
      var sampleRate = 48000;
      var offline = new OAC(1, Math.ceil(duration * sampleRate), sampleRate);
      var savedNoise = noiseBuf;
      var savedOut = outGain;
      noiseBuf = null;
      var mg = offline.createGain();
      mg.gain.value = 0.65;
      mg.connect(offline.destination);
      outGain = mg;
      ensureNoise(offline);
      var tOff = 0.02;
      var c;
      for (c = 0; c < cols; c++) {
        var tSound = c * sp + tOff;
        var r;
        for (r = 0; r < rows; r++) {
          if (!grid[r][c]) continue;
          var sel = beatInner.querySelector('select[data-row="' + r + '"]');
          var id = (sel && sel.value) || defaultInst[r];
          var fn = playInstrument[id];
          if (fn) {
            try {
              fn(offline, tSound);
            } catch (err) {
              console.error('Overprint beat export:', id, err);
            }
          }
        }
      }
      outGain = savedOut;
      noiseBuf = savedNoise;
      offline
        .startRendering()
        .then(function (buf) {
          var blob = beatMonoBufferToStereoWavBlob(buf);
          var bpm = Math.round(+iface.querySelector('#ov-bpm').value || 110);
          OV.downloadBlob(blob, 'overprint-beat-' + bpm + 'bpm-48k-stereo.wav');
          setBeatStat('Exported 48 kHz WAV (stereo). Ready for Premiere, Resolve, etc.');
        })
        .catch(function (e) {
          console.error('Overprint beat export failed', e);
          setBeatStat('Export failed.', true);
        });
    }

    function applyPreset(id) {
      var p = null;
      var i;
      for (i = 0; i < BEAT_PRESETS.length; i++) {
        if (BEAT_PRESETS[i].id === id) {
          p = BEAT_PRESETS[i];
          break;
        }
      }
      if (!p || p.id === '_') return;
      var bpmIn = iface.querySelector('#ov-bpm');
      bpmIn.value = String(p.bpm);
      bpmIn.setAttribute('aria-valuenow', String(p.bpm));
      targetBpm = clampBpm(p.bpm);
      effectiveBpm = targetBpm;
      var bpmV = iface.querySelector('#ov-bpm-val');
      if (bpmV) bpmV.textContent = String(Math.round(targetBpm));
      for (var r = 0; r < rows; r++) {
        var rowSel = beatInner.querySelector('select[data-row="' + r + '"]');
        if (rowSel) rowSel.value = p.instruments[r] || defaultInst[r];
        for (var c = 0; c < cols; c++) {
          grid[r][c] = !!(p.pattern[r] && p.pattern[r][c]);
          paintCell(cellEls[r][c], r, grid[r][c]);
        }
      }
      if (playing && ctx) {
        beatAnchorTime = ctx.currentTime;
        step = 0;
        nextNoteTime = ctx.currentTime;
        playheadLastSp = 0;
      }
    }

    pre.addEventListener('change', function () {
      applyPreset(pre.value);
    });

    iface.querySelector('#ov-bclr').addEventListener('click', function () {
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          grid[r][c] = false;
          paintCell(cellEls[r][c], r, false);
        }
      }
      pre.value = '_';
    });

    var ctx = null;
    var step = 0;
    var playing = false;
    var nextNoteTime = 0;
    var rafId = null;
    var statEl = null;
    /** Audio-time anchor for bar phase (smooth playhead + stable BPM math). */
    var beatAnchorTime = 0;
    /** Slider / preset target; effectiveBpm ramps toward this while playing. */
    var targetBpm = 110;
    /** Live tempo used for scheduling and playhead (lerped while playing). */
    var effectiveBpm = 110;
    var lastBeatRafTime = 0;
    /** Last step length used for playhead re-anchor when tempo changes. */
    var playheadLastSp = 0;

    function clampBpm(n) {
      var b = +n;
      if (!isFinite(b) || b < 40) b = 110;
      if (b > 240) b = 240;
      return b;
    }

    function beatSecondsPerStep() {
      var bpm = clampBpm(iface.querySelector('#ov-bpm').value);
      var s = (60 / bpm) / 4;
      return s > 0.05 ? s : 0.05;
    }

    function effectiveSecondsPerStep() {
      var bpm = clampBpm(effectiveBpm);
      var s = (60 / bpm) / 4;
      return s > 0.05 ? s : 0.05;
    }

    /** iOS/Safari: start a silent buffer in the same gesture as Play so the graph unlocks. */
    function primeBeatAudioSync(ac) {
      if (!master) return;
      try {
        var buf = ac.createBuffer(1, 1, ac.sampleRate);
        var src = ac.createBufferSource();
        src.buffer = buf;
        src.connect(master);
        src.start(ac.currentTime);
      } catch (e) {}
    }

    function setBeatStat(msg, isErr) {
      if (!statEl) statEl = iface.querySelector('#ov-bstat');
      if (!statEl) return;
      statEl.textContent = msg || '';
      statEl.style.color = isErr ? '#f87171' : '';
    }

    function scheduleBeatColumn(beatAt) {
      if (!ctx || !playing) return;
      var col = step;
      var tSound = beatAt + 0.02;
      var r;
      for (r = 0; r < rows; r++) {
        if (!grid[r][col]) continue;
        var sel = beatInner.querySelector('select[data-row="' + r + '"]');
        var id = (sel && sel.value) || defaultInst[r];
        var fn = playInstrument[id];
        if (fn) {
          try {
            fn(ctx, tSound);
          } catch (err) {
            console.error('Overprint beat sound:', id, err);
          }
        }
      }
      step = (step + 1) % cols;
    }

    function beatSchedulerLoop(now) {
      if (!playing || !ctx) return;
      var t = typeof now === 'number' ? now : performance.now();
      var dt = lastBeatRafTime > 0 ? Math.min(0.064, (t - lastBeatRafTime) / 1000) : 1 / 60;
      lastBeatRafTime = t;
      var tgt = clampBpm(targetBpm);
      var tauSec = 0.085;
      var k = 1 - Math.exp(-dt / tauSec);
      effectiveBpm += (tgt - effectiveBpm) * k;
      if (Math.abs(tgt - effectiveBpm) < 0.06) effectiveBpm = tgt;
      var sp = effectiveSecondsPerStep();
      var lookAhead = 0.12;
      var guard = 32;
      while (guard-- > 0 && nextNoteTime < ctx.currentTime + lookAhead) {
        scheduleBeatColumn(nextNoteTime);
        nextNoteTime += sp;
      }
      updatePlayheadSmooth();
      rafId = window.requestAnimationFrame(beatSchedulerLoop);
    }

    function restartBeatScheduler() {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
      if (!playing || !ctx) return;
      targetBpm = clampBpm(iface.querySelector('#ov-bpm').value);
      effectiveBpm = targetBpm;
      lastBeatRafTime = 0;
      beatAnchorTime = ctx.currentTime;
      step = 0;
      nextNoteTime = beatAnchorTime;
      playheadLastSp = effectiveSecondsPerStep();
      beatSchedulerLoop();
    }

    statEl = iface.querySelector('#ov-bstat');
    var transportBtn = iface.querySelector('#ov-bplay');

    function syncTransportButton() {
      if (!transportBtn) return;
      if (playing) {
        transportBtn.textContent = 'Stop';
        transportBtn.setAttribute('aria-label', 'Stop beat');
        transportBtn.setAttribute('aria-pressed', 'true');
        transportBtn.classList.remove('tool-btn--c');
        transportBtn.classList.add('tool-beat-transport--playing');
      } else {
        transportBtn.textContent = 'Play';
        transportBtn.setAttribute('aria-label', 'Play beat');
        transportBtn.setAttribute('aria-pressed', 'false');
        transportBtn.classList.add('tool-btn--c');
        transportBtn.classList.remove('tool-beat-transport--playing');
      }
      syncBeatPresetColumnToTransport();
    }

    function stopBeatPlayback() {
      playing = false;
      lastBeatRafTime = 0;
      playheadLastSp = 0;
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
      step = 0;
      clearPlayhead();
      setBeatStat('');
      syncTransportButton();
    }

    function syncBpmUiFromSlider() {
      var inp = iface.querySelector('#ov-bpm');
      var v = iface.querySelector('#ov-bpm-val');
      targetBpm = clampBpm(inp.value);
      if (v) v.textContent = String(Math.round(targetBpm));
      inp.setAttribute('aria-valuenow', inp.value);
      if (!playing) effectiveBpm = targetBpm;
    }
    iface.querySelector('#ov-bpm').addEventListener('input', syncBpmUiFromSlider);
    syncBpmUiFromSlider();

    transportBtn.addEventListener('click', function () {
      if (playing) {
        stopBeatPlayback();
        return;
      }
      try {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) {
          setBeatStat('Web Audio unavailable.', true);
          return;
        }
        if (!ctx) {
          ctx = new AC();
          master = ctx.createGain();
          master.gain.value = 0.65;
          master.connect(ctx.destination);
          outGain = master;
        }
        primeBeatAudioSync(ctx);
        if (typeof ctx.resume === 'function') {
          ctx.resume();
        }
        step = 0;
        playing = true;
        ensureNoise(ctx);
        restartBeatScheduler();
        setBeatStat('');
        syncTransportButton();
      } catch (e) {
        console.error('Overprint beat: play failed', e);
        setBeatStat('Audio failed to start.', true);
      }
    });

    syncTransportButton();

    var toolPage = iface.closest('.tool-page');
    var exportBtn = toolPage && toolPage.querySelector('#ov-bexport');
    if (exportBtn) {
      exportBtn.addEventListener('click', exportBeatLoopWav);
    }

    OV.addCleanup(function () {
      window.removeEventListener('resize', syncBeatPresetColumnToTransport);
      playing = false;
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
      if (transportBtn) {
        transportBtn.textContent = 'Play';
        transportBtn.setAttribute('aria-label', 'Play beat');
        transportBtn.setAttribute('aria-pressed', 'false');
        transportBtn.classList.add('tool-btn--c');
        transportBtn.classList.remove('tool-beat-transport--playing');
      }
      syncBeatPresetColumnToTransport();
      master = null;
      outGain = null;
      if (ctx) {
        try {
          ctx.close();
        } catch (e) {}
      }
      ctx = null;
      noiseBuf = null;
    });
  }

  var REGISTRY = {
    'contrast-checker': initContrastChecker,
    'aspect-ratio-calc': initAspectRatioCalc,
    'avatar-generator': initAvatarGenerator,
    'placeholder-hub': initAvatarGenerator,
    'css-generator': initCssGenerator,
    'color-lab': initColorLab,
    'noise-texture': initNoiseTexture,
    'qr-code-generator': initQrCodeGenerator,
    'image-toolbox': initImageToolbox,
    'social-sizer': initSocialSizer,
    'video-converter': initVideoConverter,
    'grid-crop': initGridCrop,
    'carousel-maker': initCarouselMaker,
    'screenshot-beautifier': initScreenshotBeautifier,
    'favicon-forge': initFaviconForge,
    'font-pair': initFontPair,
    'beat-maker': initBeatMaker,
  };
})();
