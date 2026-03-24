/* Overprint — functional tool UIs (mounted into .tool-interface). Client-side only. */
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

  function tabs(iface, names, renderers) {
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
      '<div class="tool-row"><button type="button" class="tool-btn tool-btn--c">' + label + '</button><span class="tool-hint" data-copy-status></span></div>'
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

  /* —— Contrast checker —— */
  function initContrastChecker(iface) {
    iface.innerHTML =
      '<div class="tool-stack">' +
      '<p class="tool-hint">Foreground and background colors. Ratios use WCAG relative luminance.</p>' +
      '<div class="tool-row">' +
      '<div class="tool-field"><span class="tool-label">Foreground</span><input type="color" class="tool-input" id="ov-fg" value="#e4e4ea"></div>' +
      '<div class="tool-field"><span class="tool-label">Background</span><input type="color" class="tool-input" id="ov-bg" value="#08080c"></div>' +
      '</div>' +
      '<div class="tool-row">' +
      '<div class="tool-field tool-field--grow"><span class="tool-label">Hex FG</span><input type="text" class="tool-input" id="ov-fgx" value="#e4e4ea"></div>' +
      '<div class="tool-field tool-field--grow"><span class="tool-label">Hex BG</span><input type="text" class="tool-input" id="ov-bgx" value="#08080c"></div>' +
      '</div>' +
      '<div class="tool-preview-box" id="ov-cprev" style="color:#e4e4ea;background:#08080c">' +
      '<p style="font-size:14px;margin-bottom:8px">Sample body text for reading.</p>' +
      '<p style="font-size:18px;font-weight:700">Large bold heading text</p>' +
      '</div>' +
      '<p class="tool-hint" id="ov-cratio"></p>' +
      '<div id="ov-badges"></div>' +
      '<div class="tool-row"><button type="button" class="tool-btn tool-btn--y" id="ov-suggest">Suggest passing FG</button></div>' +
      '</div>';

    var fg = iface.querySelector('#ov-fg');
    var bg = iface.querySelector('#ov-bg');
    var fgx = iface.querySelector('#ov-fgx');
    var bgx = iface.querySelector('#ov-bgx');
    var prev = iface.querySelector('#ov-cprev');
    var ratioEl = iface.querySelector('#ov-cratio');
    var badges = iface.querySelector('#ov-badges');

    function rgbFromInputs() {
      var a = OV.parseHex(fgx.value) || OV.parseHex(fg.value);
      var b = OV.parseHex(bgx.value) || OV.parseHex(bg.value);
      if (!a) a = { r: 228, g: 228, b: 234 };
      if (!b) b = { r: 8, g: 8, b: 12 };
      return { fg: a, bg: b };
    }

    function paint() {
      var o = rgbFromInputs();
      var fh = OV.rgbToHex(o.fg.r, o.fg.g, o.fg.b);
      var bh = OV.rgbToHex(o.bg.r, o.bg.g, o.bg.b);
      fg.value = fh;
      bg.value = bh;
      fgx.value = fh;
      bgx.value = bh;
      prev.style.color = fh;
      prev.style.background = bh;
      var r = OV.contrastRatio(o.fg, o.bg);
      ratioEl.textContent = 'Contrast ratio: ' + r.toFixed(2) + ':1';
      function pass(level, large) {
        return large ? r >= level + 2 : r >= level;
      }
      badges.innerHTML =
        '<span class="tool-badge ' + (pass(4.5, false) ? 'tool-badge--ok' : 'tool-badge--bad') + '">AA text ' +
        (pass(4.5, false) ? 'PASS' : 'FAIL') +
        '</span>' +
        '<span class="tool-badge ' + (pass(3, true) ? 'tool-badge--ok' : 'tool-badge--bad') + '">AA large ' +
        (pass(3, true) ? 'PASS' : 'FAIL') +
        '</span>' +
        '<span class="tool-badge ' + (pass(7, false) ? 'tool-badge--ok' : 'tool-badge--bad') + '">AAA text ' +
        (pass(7, false) ? 'PASS' : 'FAIL') +
        '</span>' +
        '<span class="tool-badge ' + (pass(4.5, true) ? 'tool-badge--ok' : 'tool-badge--bad') + '">AAA large ' +
        (pass(4.5, true) ? 'PASS' : 'FAIL') +
        '</span>';
    }

    ['input', 'change'].forEach(function (ev) {
      fg.addEventListener(ev, paint);
      bg.addEventListener(ev, paint);
    });
    fgx.addEventListener('input', paint);
    bgx.addEventListener('input', paint);
    iface.querySelector('#ov-suggest').addEventListener('click', function () {
      var o = rgbFromInputs();
      var target = 4.51;
      var Lb = OV.relativeLuminance(o.bg.r, o.bg.g, o.bg.b);
      var best = o.fg;
      var bestR = OV.contrastRatio(o.fg, o.bg);
      for (var i = 0; i < 512; i++) {
        var t = i / 511;
        var cand = {
          r: Math.round(o.bg.r + (255 * t - o.bg.r) * 0.5),
          g: Math.round(o.bg.g + (255 * t - o.bg.g) * 0.5),
          b: Math.round(o.bg.b + (255 * t - o.bg.b) * 0.5),
        };
        var Lf = OV.relativeLuminance(cand.r, cand.g, cand.b);
        var rr = Lf > Lb ? (Lf + 0.05) / (Lb + 0.05) : (Lb + 0.05) / (Lf + 0.05);
        if (rr >= target && rr < bestR + 20) {
          best = cand;
          bestR = rr;
          break;
        }
      }
      if (bestR < target) {
        for (i = 0; i < 512; i++) {
          t = i / 511;
          cand = {
            r: Math.round(255 * t),
            g: Math.round(255 * t),
            b: Math.round(255 * t),
          };
          Lf = OV.relativeLuminance(cand.r, cand.g, cand.b);
          rr = Lf > Lb ? (Lf + 0.05) / (Lb + 0.05) : (Lb + 0.05) / (Lf + 0.05);
          if (rr >= target) {
            best = cand;
            break;
          }
        }
      }
      var hx = OV.rgbToHex(best.r, best.g, best.b);
      fg.value = hx;
      fgx.value = hx;
      paint();
    });
    paint();
  }

  /* —— Aspect ratio —— */
  function initAspectRatioCalc(iface) {
    iface.innerHTML =
      '<div class="tool-stack">' +
      '<div class="tool-row">' +
      '<div class="tool-field"><span class="tool-label">Width</span><input type="number" class="tool-input" id="ov-aw" value="1920" min="1"></div>' +
      '<div class="tool-field"><span class="tool-label">Height</span><input type="number" class="tool-input" id="ov-ah" value="1080" min="1"></div>' +
      '</div>' +
      '<p class="tool-hint" id="ov-arout"></p>' +
      '<div class="tool-row">' +
      '<div class="tool-field"><span class="tool-label">Scale to W</span><input type="number" class="tool-input" id="ov-sw" placeholder="px"></div>' +
      '<div class="tool-field"><span class="tool-label">Scale to H</span><input type="number" class="tool-input" id="ov-sh" placeholder="px"></div>' +
      '</div>' +
      '<p class="tool-hint" id="ov-scaleout"></p>' +
      '<div class="tool-row tool-row--top">' +
      '<span class="tool-label" style="width:100%">Presets</span></div>' +
      '<div class="tool-row" id="ov-presets"></div>' +
      '<div class="tool-preview-box" id="ov-rect" style="max-width:280px;height:120px;margin:0 auto;display:flex;align-items:center;justify-content:center;border:1px solid var(--border)">' +
      '<div id="ov-rect-inner" style="background:var(--C);opacity:.6;border:1px solid var(--C)"></div></div>' +
      '</div>';

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

      var max = 100;
      var ir = w / h;
      var bw, bh;
      if (ir > max / 80) {
        bw = max;
        bh = max / ir;
      } else {
        bh = 80;
        bw = 80 * ir;
      }
      inner.style.width = bw + 'px';
      inner.style.height = bh + 'px';
    }

    [aw, ah, sw, sh].forEach(function (x) {
      x.addEventListener('input', calc);
    });
    calc();
  }

  /* —— Placeholder hub —— */
  function initPlaceholderHub(iface) {
    tabs(iface, ['Lorem', 'Fake data', 'Placeholder image', 'Avatar'], [
      function (p) {
        p.innerHTML =
          '<div class="tool-stack">' +
          '<div class="tool-row">' +
          '<div class="tool-field"><span class="tool-label">Paragraphs</span><input type="number" class="tool-input" id="ov-lo-n" value="3" min="1" max="20"></div>' +
          '</div>' +
          '<textarea class="tool-textarea" id="ov-lo-t" readonly></textarea>' +
          '</div>';
        var lo =
          'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.';
        function gen() {
          var n = +p.querySelector('#ov-lo-n').value || 3;
          var parts = [];
          for (var i = 0; i < n; i++) parts.push(lo);
          p.querySelector('#ov-lo-t').value = parts.join('\n\n');
        }
        p.querySelector('#ov-lo-n').addEventListener('input', gen);
        gen();
        copyRow(p, 'Copy text', function () {
          return p.querySelector('#ov-lo-t').value;
        });
      },
      function (p) {
        p.innerHTML =
          '<p class="tool-hint">Generated locally — not real people.</p>' +
          '<textarea class="tool-textarea" id="ov-fake" readonly></textarea>';
        var first = ['Alex', 'Jordan', 'Sam', 'Riley', 'Casey', 'Morgan'];
        var last = ['Nguyen', 'Smith', 'Garcia', 'Kim', 'Patel', 'Brown'];
        function gen() {
          var rows = [];
          for (var i = 0; i < 8; i++) {
            var fn = first[Math.floor(Math.random() * first.length)];
            var ln = last[Math.floor(Math.random() * last.length)];
            var em = (fn + '.' + ln + '@example.com').toLowerCase().replace(/[^a-z0-9.@]/g, '');
            rows.push(fn + ' ' + ln + '\t' + em + '\t+1-555-' + (1000 + Math.floor(Math.random() * 9000)));
          }
          p.querySelector('#ov-fake').value = 'Name\tEmail\tPhone\n' + rows.join('\n');
        }
        gen();
        var row = el('<div class="tool-row"><button type="button" class="tool-btn tool-btn--m">Regenerate</button></div>');
        row.querySelector('button').addEventListener('click', gen);
        p.insertBefore(row, p.firstChild);
        copyRow(p, 'Copy TSV', function () {
          return p.querySelector('#ov-fake').value;
        });
      },
      function (p) {
        p.innerHTML =
          '<div class="tool-row">' +
          '<div class="tool-field"><span class="tool-label">W</span><input type="number" class="tool-input" id="ov-ph-w" value="800"></div>' +
          '<div class="tool-field"><span class="tool-label">H</span><input type="number" class="tool-input" id="ov-ph-h" value="450"></div>' +
          '<div class="tool-field"><span class="tool-label">Label</span><input type="text" class="tool-input" id="ov-ph-l" value="Placeholder"></div>' +
          '</div>' +
          '<div class="tool-row"><button type="button" class="tool-btn tool-btn--c" id="ov-ph-dl">Download PNG</button></div>';
        p.querySelector('#ov-ph-dl').addEventListener('click', function () {
          var w = +p.querySelector('#ov-ph-w').value || 400;
          var h = +p.querySelector('#ov-ph-h').value || 300;
          var c = document.createElement('canvas');
          c.width = w;
          c.height = h;
          var x = c.getContext('2d');
          x.fillStyle = '#1e1e26';
          x.fillRect(0, 0, w, h);
          x.strokeStyle = '#00b4d8';
          x.lineWidth = 2;
          x.strokeRect(1, 1, w - 2, h - 2);
          x.fillStyle = '#7e7e8e';
          x.font = '600 16px "IBM Plex Mono",monospace';
          x.textAlign = 'center';
          x.textBaseline = 'middle';
          var t = p.querySelector('#ov-ph-l').value || 'Placeholder';
          x.fillText(t, w / 2, h / 2 - 10);
          x.font = '12px "IBM Plex Mono",monospace';
          x.fillText(w + ' × ' + h, w / 2, h / 2 + 14);
          OV.downloadCanvas(c, 'placeholder.png', 'image/png');
        });
      },
      function (p) {
        p.innerHTML =
          '<p class="tool-hint">Abstract geometric avatar.</p>' +
          '<div class="tool-row"><button type="button" class="tool-btn tool-btn--m" id="ov-av-gen">New avatar</button>' +
          '<button type="button" class="tool-btn tool-btn--c" id="ov-av-dl">Download PNG</button></div>' +
          '<div style="margin-top:12px" id="ov-av-h"></div>';
        var holder = p.querySelector('#ov-av-h');
        var canvas;
        function gen() {
          holder.innerHTML = '';
          canvas = document.createElement('canvas');
          canvas.width = 200;
          canvas.height = 200;
          var x = canvas.getContext('2d');
          var cols = 8,
            rows = 8,
            cell = 25;
          var hue = Math.floor(Math.random() * 360);
          for (var i = 0; i < cols; i++) {
            for (var j = 0; j < rows; j++) {
              if (Math.random() > 0.5) {
                x.fillStyle = 'hsl(' + hue + ',' + (40 + Math.random() * 40) + '%,' + (35 + Math.random() * 35) + '%)';
                x.fillRect(i * cell, j * cell, cell, cell);
                x.fillRect((cols - 1 - i) * cell, j * cell, cell, cell);
              }
            }
          }
          holder.appendChild(canvas);
        }
        gen();
        p.querySelector('#ov-av-gen').addEventListener('click', gen);
        p.querySelector('#ov-av-dl').addEventListener('click', function () {
          if (canvas) OV.downloadCanvas(canvas, 'avatar.png', 'image/png');
        });
      },
    ]);
  }

  /* —— CSS generator —— */
  function initCssGenerator(iface) {
    tabs(iface, ['Gradient', 'Shadow', 'Radius', 'Glass', 'Noise'], [
      function (p) {
        p.innerHTML =
          '<div class="tool-row">' +
          '<div class="tool-field"><span class="tool-label">C1</span><input type="color" class="tool-input" id="g1" value="#00b4d8"></div>' +
          '<div class="tool-field"><span class="tool-label">C2</span><input type="color" class="tool-input" id="g2" value="#e040a0"></div>' +
          '<div class="tool-field"><span class="tool-label">Angle</span><input type="number" class="tool-input" id="ga" value="135"></div>' +
          '</div>' +
          '<div id="gp" style="height:80px;border:1px solid var(--border);border-radius:2px"></div>' +
          '<pre class="tool-pre-wrap" id="go"></pre>';
        function u() {
          var a = p.querySelector('#ga').value || 135;
          var c1 = p.querySelector('#g1').value;
          var c2 = p.querySelector('#g2').value;
          var css = 'linear-gradient(' + a + 'deg, ' + c1 + ', ' + c2 + ')';
          p.querySelector('#gp').style.background = css;
          p.querySelector('#go').textContent = 'background: ' + css + ';';
        }
        ['g1', 'g2', 'ga'].forEach(function (id) {
          p.querySelector('#' + id).addEventListener('input', u);
        });
        u();
        copyRow(p, 'Copy CSS', function () {
          return p.querySelector('#go').textContent;
        });
      },
      function (p) {
        p.innerHTML =
          '<div class="tool-row">' +
          '<div class="tool-field"><span class="tool-label">X</span><input type="number" class="tool-input" id="sx" value="4"></div>' +
          '<div class="tool-field"><span class="tool-label">Y</span><input type="number" class="tool-input" id="sy" value="8"></div>' +
          '<div class="tool-field"><span class="tool-label">Blur</span><input type="number" class="tool-input" id="sb" value="24"></div>' +
          '<div class="tool-field"><span class="tool-label">Spread</span><input type="number" class="tool-input" id="ss" value="0"></div>' +
          '</div>' +
          '<div class="tool-field"><span class="tool-label">Color</span><input type="color" class="tool-input" id="sc" value="#000000"></div>' +
          '<div id="sp" style="width:120px;height:80px;background:var(--s2);margin:12px auto;border:1px solid var(--border)"></div>' +
          '<pre class="tool-pre-wrap" id="so"></pre>';
        function u() {
          var x = +p.querySelector('#sx').value || 0;
          var y = +p.querySelector('#sy').value || 0;
          var b = +p.querySelector('#sb').value || 0;
          var s = +p.querySelector('#ss').value || 0;
          var c = p.querySelector('#sc').value;
          var css = x + 'px ' + y + 'px ' + b + 'px ' + s + 'px ' + c;
          p.querySelector('#sp').style.boxShadow = css;
          p.querySelector('#so').textContent = 'box-shadow: ' + css + ';';
        }
        p.querySelectorAll('.tool-input').forEach(function (i) {
          i.addEventListener('input', u);
        });
        u();
        copyRow(p, 'Copy CSS', function () {
          return p.querySelector('#so').textContent;
        });
      },
      function (p) {
        p.innerHTML =
          '<div class="tool-row">' +
          '<div class="tool-field"><span class="tool-label">All</span><input type="number" class="tool-input" id="ra" value="12"></div>' +
          '</div>' +
          '<div id="rp" style="width:140px;height:90px;background:var(--C-dim);border:2px solid var(--C);margin:12px auto"></div>' +
          '<pre class="tool-pre-wrap" id="ro"></pre>';
        function u() {
          var r = (+p.querySelector('#ra').value || 0) + 'px';
          p.querySelector('#rp').style.borderRadius = r;
          p.querySelector('#ro').textContent = 'border-radius: ' + r + ';';
        }
        p.querySelector('#ra').addEventListener('input', u);
        u();
        copyRow(p, 'Copy CSS', function () {
          return p.querySelector('#ro').textContent;
        });
      },
      function (p) {
        p.innerHTML =
          '<div id="glp" style="padding:24px;background:rgba(20,20,28,.55);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.12);border-radius:8px;max-width:260px;margin:12px auto;text-align:center;color:var(--text-hi)">Glass card</div>' +
          '<pre class="tool-pre-wrap" id="glo"></pre>';
        var css =
          'background: rgba(20,20,28,0.55);\n' +
          'backdrop-filter: blur(12px);\n' +
          '-webkit-backdrop-filter: blur(12px);\n' +
          'border: 1px solid rgba(255,255,255,0.12);\n' +
          'border-radius: 8px;';
        p.querySelector('#glo').textContent = css;
        copyRow(p, 'Copy CSS', function () {
          return p.querySelector('#glo').textContent;
        });
      },
      function (p) {
        p.innerHTML =
          '<p class="tool-hint">SVG turbulence — use as data URL in CSS.</p>' +
          '<pre class="tool-pre-wrap" id="nsvg"></pre>' +
          '<div class="tool-row"><button type="button" class="tool-btn tool-btn--c" id="ndl">Download SVG</button></div>';
        var svg =
          '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">' +
          '<filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" stitchTiles="stitch"/></filter>' +
          '<rect width="100%" height="100%" filter="url(#n)" opacity="0.35"/></svg>';
        p.querySelector('#nsvg').textContent = svg.replace(/></g, '>\n<');
        p.querySelector('#ndl').addEventListener('click', function () {
          var blob = new Blob([svg], { type: 'image/svg+xml' });
          OV.downloadBlob(blob, 'noise.svg');
        });
        copyRow(p, 'Copy SVG', function () {
          return svg;
        });
      },
    ]);
  }

  /* —— Color lab —— */
  function initColorLab(iface) {
    tabs(iface, ['Harmonies', 'Formats', 'Gradient'], [
      function (p) {
        p.innerHTML =
          '<div class="tool-field"><span class="tool-label">Base hex</span><input type="text" class="tool-input" id="chx" value="#00b4d8"></div>' +
          '<div class="tool-row" id="chsw" style="gap:8px;margin-top:12px"></div>' +
          '<p class="tool-hint" id="chn"></p>';
        function paint() {
          var rgb = OV.parseHex(p.querySelector('#chx').value) || { r: 0, g: 180, b: 216 };
          var hsl = OV.rgbToHsl(rgb.r, rgb.g, rgb.b);
          var w = p.querySelector('#chsw');
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
          p.querySelector('#chn').textContent =
            'HSL ' + hsl.h.toFixed(0) + '°, ' + hsl.s.toFixed(0) + '%, ' + hsl.l.toFixed(0) + '%';
        }
        p.querySelector('#chx').addEventListener('input', paint);
        paint();
      },
      function (p) {
        p.innerHTML =
          '<div class="tool-field"><span class="tool-label">Hex</span><input type="text" class="tool-input" id="cfh" value="#f0d020"></div>' +
          '<pre class="tool-pre-wrap" id="cfo"></pre>';
        function u() {
          var rgb = OV.parseHex(p.querySelector('#cfh').value);
          if (!rgb) {
            p.querySelector('#cfo').textContent = 'Invalid hex';
            return;
          }
          var hsl = OV.rgbToHsl(rgb.r, rgb.g, rgb.b);
          p.querySelector('#cfo').textContent =
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
        p.querySelector('#cfh').addEventListener('input', u);
        u();
        copyRow(p, 'Copy', function () {
          return p.querySelector('#cfo').textContent;
        });
      },
      function (p) {
        p.innerHTML =
          '<div class="tool-row">' +
          '<div class="tool-field"><span class="tool-label">A</span><input type="color" class="tool-input" id="cg1" value="#00b4d8"></div>' +
          '<div class="tool-field"><span class="tool-label">B</span><input type="color" class="tool-input" id="cg2" value="#f0d020"></div>' +
          '<div class="tool-field"><span class="tool-label">°</span><input type="number" class="tool-input" id="cga" value="90"></div>' +
          '</div>' +
          '<div id="cgp" style="height:72px;border:1px solid var(--border)"></div>' +
          '<pre class="tool-pre-wrap" id="cgo"></pre>';
        function u() {
          var a = p.querySelector('#cg1').value;
          var b = p.querySelector('#cg2').value;
          var ang = p.querySelector('#cga').value || 90;
          var css = 'linear-gradient(' + ang + 'deg,' + a + ',' + b + ')';
          p.querySelector('#cgp').style.background = css;
          p.querySelector('#cgo').textContent = 'background: ' + css + ';';
        }
        p.querySelectorAll('#cg1,#cg2,#cga').forEach(function (x) {
          x.addEventListener('input', u);
        });
        u();
        copyRow(p, 'Copy CSS', function () {
          return p.querySelector('#cgo').textContent;
        });
      },
    ]);
  }

  /* —— Noise texture —— */
  function initNoiseTexture(iface) {
    iface.innerHTML =
      '<div class="tool-stack">' +
      '<div class="tool-row">' +
      '<div class="tool-field"><span class="tool-label">Frequency</span><input type="range" class="tool-input" id="nf" min="0.2" max="2.5" step="0.05" value="0.65"></div>' +
      '<div class="tool-field"><span class="tool-label">Octaves</span><input type="number" class="tool-input" id="no" value="4" min="1" max="6"></div>' +
      '</div>' +
      '<div id="nv" style="max-width:320px;border:1px solid var(--border);background:var(--bg)"></div>' +
      '<div class="tool-row"><button type="button" class="tool-btn tool-btn--c" id="nsv">Download SVG</button>' +
      '<button type="button" class="tool-btn tool-btn--m" id="npn">Download PNG</button></div>' +
      '</div>';
    var v = iface.querySelector('#nv');
    function svgStr() {
      var f = iface.querySelector('#nf').value;
      var o = iface.querySelector('#no').value || 4;
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
    iface.querySelector('#nf').addEventListener('input', render);
    iface.querySelector('#no').addEventListener('input', render);
    iface.querySelector('#nsv').addEventListener('click', function () {
      var blob = new Blob([svgStr()], { type: 'image/svg+xml' });
      OV.downloadBlob(blob, 'texture.svg');
    });
    iface.querySelector('#npn').addEventListener('click', function () {
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

  /* —— QR —— */
  function initQrCodeGenerator(iface) {
    iface.innerHTML =
      '<div class="tool-stack">' +
      '<div class="tool-field tool-field--grow"><span class="tool-label">Content (URL or text)</span>' +
      '<input type="text" class="tool-input" id="qrt" value="https://example.com"></div>' +
      '<div class="tool-row">' +
      '<div class="tool-field"><span class="tool-label">FG</span><input type="color" class="tool-input" id="qrf" value="#08080c"></div>' +
      '<div class="tool-field"><span class="tool-label">BG</span><input type="color" class="tool-input" id="qrb" value="#ffffff"></div>' +
      '<div class="tool-field"><span class="tool-label">Size</span><input type="number" class="tool-input" id="qrs" value="200" min="64" max="800"></div>' +
      '</div>' +
      '<div style="display:flex;justify-content:center"><canvas id="qrc"></canvas></div>' +
      '<div class="tool-row"><button type="button" class="tool-btn tool-btn--c" id="qrp">Download PNG</button></div>' +
      '<p class="tool-hint" id="qre"></p></div>';
    var canvas = iface.querySelector('#qrc');
    var err = iface.querySelector('#qre');
    function draw() {
      err.textContent = 'Loading QR library (first time needs network)…';
      OV.loadScriptOnce(OV.CDN_QRCODE, 'QRCode')
        .then(function () {
          err.textContent = '';
          var text = iface.querySelector('#qrt').value || ' ';
          var dark = iface.querySelector('#qrf').value;
          var light = iface.querySelector('#qrb').value;
          var size = +iface.querySelector('#qrs').value || 200;
          if (typeof QRCode === 'undefined') {
            err.textContent = 'QR library unavailable.';
            return;
          }
          QRCode.toCanvas(
            canvas,
            text,
            { width: size, margin: 2, color: { dark: dark, light: light } },
            function (e) {
              if (e) err.textContent = String(e.message || e);
            }
          );
        })
        .catch(function () {
          err.textContent = 'Could not load QR library. Allow network for cdn.jsdelivr.net or try again.';
        });
    }
    iface.querySelectorAll('#qrt,#qrf,#qrb,#qrs').forEach(function (x) {
      x.addEventListener('input', draw);
      x.addEventListener('change', draw);
    });
    iface.querySelector('#qrp').addEventListener('click', function () {
      OV.downloadCanvas(canvas, 'qrcode.png', 'image/png');
    });
    draw();
  }

  /* —— Image toolbox —— */
  function initImageToolbox(iface) {
    var input = el('<input type="file" accept="image/*" style="display:none">');
    iface.appendChild(input);
    var zone = el(
      '<div class="drop-zone" tabindex="0">Drop an image or click to browse</div>'
    );
    iface.appendChild(zone);
    var panel = el('<div class="tool-stack" style="display:none" id="ov-itp"></div>');
    panel.innerHTML =
      '<canvas id="ov-itc" style="max-width:100%;border:1px solid var(--border)"></canvas>' +
      '<div class="tool-row">' +
      '<div class="tool-field"><span class="tool-label">Quality %</span><input type="range" class="tool-input" id="ov-iq" min="0.5" max="1" step="0.05" value="0.92"></div>' +
      '<div class="tool-field"><span class="tool-label">Scale %</span><input type="number" class="tool-input" id="ov-isc" value="100" min="5" max="200"></div>' +
      '<div class="tool-field"><span class="tool-label">Format</span><select class="tool-select" id="ov-ifmt"><option value="image/png">PNG</option><option value="image/jpeg">JPEG</option><option value="image/webp">WebP</option></select></div>' +
      '</div>' +
      '<div class="tool-row">' +
      '<button type="button" class="tool-btn" id="ov-ir90">Rotate 90°</button>' +
      '<button type="button" class="tool-btn" id="ov-iflip">Flip H</button>' +
      '<button type="button" class="tool-btn tool-btn--c" id="ov-idl">Download</button></div>';
    iface.appendChild(panel);
    var img,
      c,
      ctx,
      rot = 0,
      flip = 1;
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
      OV.loadImageFile(f).then(function (i) {
        img = i;
        rot = 0;
        flip = 1;
        c = panel.querySelector('#ov-itc');
        ctx = c.getContext('2d');
        panel.style.display = '';
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
      OV.downloadCanvas(c, 'export.' + (fmt.indexOf('jpeg') > 0 ? 'jpg' : fmt.indexOf('webp') > 0 ? 'webp' : 'png'), fmt, fmt.indexOf('png') >= 0 ? undefined : q);
    });
  }

  /* —— Image optimizer —— */
  function initImageOptimizer(iface) {
    var input = el('<input type="file" accept="image/*" multiple style="display:none">');
    iface.appendChild(input);
    var zone = el('<div class="drop-zone">Drop images or click — batch optimize</div>');
    var list = el('<div class="tool-stack" id="ov-iop"></div>');
    iface.appendChild(zone);
    iface.appendChild(list);
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
              '</span><span class="tool-hint">' +
              (file.size / 1024).toFixed(1) +
              ' KB</span>' +
              '<div class="tool-row" style="margin-top:8px">' +
              '<label class="tool-hint">Quality <input type="range" class="tool-input" min="0.5" max="1" step="0.05" value="0.85" data-q></label>' +
              '<select class="tool-select" data-f><option value="image/jpeg">JPEG</option><option value="image/webp">WebP</option><option value="image/png">PNG</option></select>' +
              '<button type="button" class="tool-btn tool-btn--c" data-go>Export</button></div></div>'
          );
          row.appendChild(meta);
          list.appendChild(row);
          var cFull = document.createElement('canvas');
          cFull.width = img.naturalWidth;
          cFull.height = img.naturalHeight;
          cFull.getContext('2d').drawImage(img, 0, 0);
          meta.querySelector('[data-go]').addEventListener('click', function () {
            var fmt = meta.querySelector('[data-f]').value;
            var q = +meta.querySelector('[data-q]').value;
            var ext = fmt.indexOf('jpeg') > 0 ? 'jpg' : fmt.indexOf('webp') > 0 ? 'webp' : 'png';
            OV.downloadCanvas(cFull, file.name.replace(/\.\w+$/, '') + '-opt.' + ext, fmt, fmt.indexOf('png') >= 0 ? undefined : q);
          });
        });
      });
    }
    OV.bindDropZone(zone, input, handle);
  }

  /* —— Social sizer —— */
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
    iface.appendChild(input);
    var zone = el('<div class="drop-zone">Drop one image</div>');
    var grid = el('<div class="tool-grid-preview" id="ov-sg"></div>');
    var btn = el(
      '<div class="tool-row"><button type="button" class="tool-btn tool-btn--c" id="ov-sz-all">Download all (ZIP)</button></div>'
    );
    iface.appendChild(zone);
    iface.appendChild(btn);
    iface.appendChild(grid);
    var source = null;
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
          SOCIAL.forEach(function (s) {
            var c = document.createElement('canvas');
            c.width = s.w;
            c.height = s.h;
            c.getContext('2d').drawImage(OV.canvasCover(source, s.w, s.h), 0, 0);
            var name = s.n.replace(/\s+/g, '-').toLowerCase() + '.png';
            var data = c.toDataURL('image/png').split(',')[1];
            zip.file(name, data, { base64: true });
          });
          return zip.generateAsync({ type: 'blob' });
        })
        .then(function (blob) {
          if (blob) OV.downloadBlob(blob, 'social-sizes.zip');
        })
        .catch(function () {
          window.alert('ZIP export needs a one-time load of JSZip from the network (cdn.jsdelivr.net).');
        });
    });
  }

  /* —— Grid crop —— */
  function initGridCrop(iface) {
    var input = el('<input type="file" accept="image/*" multiple style="display:none">');
    iface.appendChild(input);
    iface.appendChild(el('<div class="drop-zone" id="ov-gz">Drop 1–20 images</div>'));
    var controls = el(
      '<div class="tool-stack" style="margin-top:16px">' +
        '<div class="tool-row">' +
        '<div class="tool-field"><span class="tool-label">Aspect W:H</span><select class="tool-select" id="ov-gr">' +
        '<option value="4/5">4:5</option><option value="1/1">1:1</option><option value="16/9">16:9</option><option value="9/16">9:16</option></select></div>' +
        '<div class="tool-field"><span class="tool-label">Output max px</span><input type="number" class="tool-input" id="ov-gm" value="1080" min="200" max="4096"></div>' +
        '</div>' +
        '<div class="tool-row"><button type="button" class="tool-btn tool-btn--c" id="ov-gzip">ZIP all</button></div>' +
        '<div class="tool-grid-preview" id="ov-gprev"></div></div>'
    );
    iface.appendChild(controls);
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
              var name = (f.name || 'image-' + idx).replace(/\.\w+$/, '') + '-crop.png';
              var data = out.toDataURL('image/png').split(',')[1];
              zip.file(name, data, { base64: true });
              done++;
              if (done === files.length) {
                zip.generateAsync({ type: 'blob' }).then(function (blob) {
                  OV.downloadBlob(blob, 'grid-crop.zip');
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

  /* —— Carousel maker —— */
  function initCarouselMaker(iface) {
    var input = el('<input type="file" accept="image/*" style="display:none">');
    iface.appendChild(input);
    iface.appendChild(el('<div class="drop-zone" id="ov-cz">Drop one wide image</div>'));
    var row = el(
      '<div class="tool-row">' +
        '<div class="tool-field"><span class="tool-label">Panels</span><input type="number" class="tool-input" id="ov-cn" value="3" min="2" max="10"></div>' +
        '<button type="button" class="tool-btn tool-btn--c" id="ov-cdl">Download ZIP</button></div>'
    );
    iface.appendChild(row);
    var wrap = el('<div class="tool-grid-preview" id="ov-cprev"></div>');
    iface.appendChild(wrap);
    var srcImg = null;
    OV.bindDropZone(iface.querySelector('#ov-cz'), input, function (fs) {
      if (!fs[0]) return;
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
          for (var i = 0; i < n; i++) {
            var c = document.createElement('canvas');
            c.width = sliceW;
            c.height = h;
            c.getContext('2d').drawImage(srcImg, i * sliceW, 0, sliceW, h, 0, 0, sliceW, h);
            zip.file('panel-' + (i + 1) + '.png', c.toDataURL('image/png').split(',')[1], { base64: true });
          }
          return zip.generateAsync({ type: 'blob' });
        })
        .then(function (blob) {
          if (blob) OV.downloadBlob(blob, 'carousel.zip');
        })
        .catch(function () {
          window.alert('ZIP export needs a one-time load of JSZip from the network (cdn.jsdelivr.net).');
        });
    });
  }

  /* —— Screenshot beautifier —— */
  function initScreenshotBeautifier(iface) {
    var input = el('<input type="file" accept="image/*" style="display:none">');
    iface.appendChild(input);
    iface.appendChild(el('<div class="drop-zone" id="ov-ssz">Drop screenshot</div>'));
    var ui = el(
      '<div class="tool-stack" style="margin-top:12px">' +
        '<div class="tool-row">' +
        '<div class="tool-field"><span class="tool-label">Padding</span><input type="number" class="tool-input" id="ov-spad" value="48"></div>' +
        '<div class="tool-field"><span class="tool-label">Radius</span><input type="number" class="tool-input" id="ov-srd" value="12"></div>' +
        '<div class="tool-field"><span class="tool-label">BG</span><input type="color" class="tool-input" id="ov-sbg" value="#131318"></div>' +
        '</div>' +
        '<div class="tool-row"><button type="button" class="tool-btn tool-btn--c" id="ov-sdl">Export PNG</button></div>' +
        '<canvas id="ov-spc" style="max-width:100%;border:1px solid var(--border)"></canvas></div>'
    );
    iface.appendChild(ui);
    var shot = null;
    function compose() {
      if (!shot) return;
      var pad = +iface.querySelector('#ov-spad').value || 40;
      var rad = +iface.querySelector('#ov-srd').value || 0;
      var bg = iface.querySelector('#ov-sbg').value;
      var iw = shot.naturalWidth;
      var ih = shot.naturalHeight;
      var c = iface.querySelector('#ov-spc');
      c.width = iw + pad * 2;
      c.height = ih + pad * 2;
      var x = c.getContext('2d');
      x.fillStyle = bg;
      x.fillRect(0, 0, c.width, c.height);
      x.save();
      roundedClip(x, pad, pad, iw, ih, rad);
      x.drawImage(shot, pad, pad);
      x.restore();
      function roundedClip(ctx, dx, dy, w, h, r) {
        ctx.beginPath();
        r = Math.min(r, w / 2, h / 2);
        ctx.moveTo(dx + r, dy);
        ctx.lineTo(dx + w - r, dy);
        ctx.quadraticCurveTo(dx + w, dy, dx + w, dy + r);
        ctx.lineTo(dx + w, dy + h - r);
        ctx.quadraticCurveTo(dx + w, dy + h, dx + w - r, dy + h);
        ctx.lineTo(dx + r, dy + h);
        ctx.quadraticCurveTo(dx, dy + h, dx, dy + h - r);
        ctx.lineTo(dx, dy + r);
        ctx.quadraticCurveTo(dx, dy, dx + r, dy);
        ctx.closePath();
        ctx.clip();
      }
    }
    OV.bindDropZone(iface.querySelector('#ov-ssz'), input, function (fs) {
      if (!fs[0]) return;
      OV.loadImageFile(fs[0]).then(function (img) {
        shot = img;
        compose();
      });
    });
    ['#ov-spad', '#ov-srd', '#ov-sbg'].forEach(function (sel) {
      iface.querySelector(sel).addEventListener('input', compose);
    });
    iface.querySelector('#ov-sdl').addEventListener('click', function () {
      var c = iface.querySelector('#ov-spc');
      if (c.width) OV.downloadCanvas(c, 'beautified.png', 'image/png');
    });
  }

  /* —— Favicon forge —— */
  function initFaviconForge(iface) {
    iface.innerHTML =
      '<div class="tool-stack">' +
      '<div class="tool-row">' +
      '<div class="tool-field"><span class="tool-label">Text (1–2)</span><input type="text" class="tool-input" id="ov-ft" maxlength="2" value="OP"></div>' +
      '<div class="tool-field"><span class="tool-label">FG</span><input type="color" class="tool-input" id="ov-ffg" value="#08080c"></div>' +
      '<div class="tool-field"><span class="tool-label">BG</span><input type="color" class="tool-input" id="ov-fbg" value="#00b4d8"></div>' +
        '</div>' +
      '<div class="tool-row"><button type="button" class="tool-btn" id="ov-f32">PNG 32</button>' +
      '<button type="button" class="tool-btn" id="ov-f180">PNG 180</button></div>' +
      '<canvas id="ov-fcv" width="180" height="180" style="border:1px solid var(--border);image-rendering:pixelated"></canvas></div>';
    function draw() {
      var t = iface.querySelector('#ov-ft').value || '?';
      var fg = iface.querySelector('#ov-ffg').value;
      var bg = iface.querySelector('#ov-fbg').value;
      var c = iface.querySelector('#ov-fcv');
      var x = c.getContext('2d');
      x.fillStyle = bg;
      x.fillRect(0, 0, 180, 180);
      x.fillStyle = fg;
      x.font = 'bold 100px Syne,sans-serif';
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.fillText(t.slice(0, 2).toUpperCase(), 90, 92);
    }
    iface.querySelectorAll('#ov-ft,#ov-ffg,#ov-fbg').forEach(function (i) {
      i.addEventListener('input', draw);
    });
    draw();
    function dl(size) {
      var c = document.createElement('canvas');
      c.width = c.height = size;
      var src = iface.querySelector('#ov-fcv');
      c.getContext('2d').drawImage(src, 0, 0, 180, 180, 0, 0, size, size);
      OV.downloadCanvas(c, 'favicon-' + size + '.png', 'image/png');
    }
    iface.querySelector('#ov-f32').addEventListener('click', function () {
      dl(32);
    });
    iface.querySelector('#ov-f180').addEventListener('click', function () {
      dl(180);
    });
  }

  /* —— Font pair —— */
  var FONT_PAIRS = [
    { h: 'Syne', b: 'IBM Plex Mono', id: 'syne+ibm-plex-mono' },
    { h: 'Playfair Display', b: 'Source Sans 3', id: 'playfair-display+source-sans-3' },
    { h: 'Bebas Neue', b: 'Montserrat', id: 'bebas-neue+montserrat' },
    { h: 'Oswald', b: 'Lato', id: 'oswald+lato' },
    { h: 'Space Grotesk', b: 'Inter', id: 'space-grotesk+inter' },
  ];

  function initFontPair(iface) {
    var opts = FONT_PAIRS.map(function (p, i) {
      return '<option value="' + i + '">' + p.h + ' / ' + p.b + '</option>';
    }).join('');
    iface.innerHTML =
      '<div class="tool-stack">' +
      '<div class="tool-field"><span class="tool-label">Pair</span><select class="tool-select" id="ov-fp">' +
      opts +
      '</select></div>' +
      '<div class="tool-field"><span class="tool-label">Sample</span><textarea class="tool-textarea" id="ov-fpt">Headline here\n\nBody copy in the paired font for quick UI checks.</textarea></div>' +
      '<div id="ov-fpp" style="padding:20px;border:1px solid var(--border);background:var(--bg)">' +
      '<div id="ov-fph" style="font-size:2rem;margin-bottom:12px">Headline here</div>' +
      '<div id="ov-fpb" style="font-size:14px;line-height:1.6;color:var(--text-lo)">Body copy</div></div>' +
      '<pre class="tool-pre-wrap" id="ov-fpc"></pre></div>';
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    OV.addCleanup(function () {
      if (link.parentNode) link.parentNode.removeChild(link);
    });
    function apply() {
      var p = FONT_PAIRS[+iface.querySelector('#ov-fp').value || 0];
      link.href =
        'https://fonts.googleapis.com/css2?family=' +
        encodeURIComponent(p.h.replace(/ /g, '+')) +
        ':wght@400;700&family=' +
        encodeURIComponent(p.b.replace(/ /g, '+')) +
        ':wght@400;600&display=swap';
      var h = iface.querySelector('#ov-fph');
      var b = iface.querySelector('#ov-fpb');
      h.style.fontFamily = '"' + p.h + '",sans-serif';
      b.style.fontFamily = '"' + p.b + '",monospace';
      var lines = iface.querySelector('#ov-fpt').value.split('\n');
      h.textContent = lines[0] || 'Headline';
      b.textContent = lines.slice(1).join('\n') || 'Body';
      iface.querySelector('#ov-fpc').textContent =
        '@import url("' +
        link.href +
        '");\n\n.head { font-family: "' +
        p.h +
        '", sans-serif; }\n.body { font-family: "' +
        p.b +
        '", sans-serif; }';
    }
    iface.querySelector('#ov-fp').addEventListener('change', apply);
    iface.querySelector('#ov-fpt').addEventListener('input', apply);
    apply();
    copyRow(iface, 'Copy CSS snippet', function () {
      return iface.querySelector('#ov-fpc').textContent;
    });
  }

  /* —— Beat maker —— (Web Audio; timeline + instruments + genre presets) */
  function initBeatMaker(iface) {
    var BEAT_INSTRUMENTS_HTML =
      '<optgroup label="Classic (original beeps)">' +
      '<option value="classic_kick">Classic kick · sine 180</option>' +
      '<option value="classic_snare">Classic snare · triangle 220</option>' +
      '<option value="classic_hat">Classic hat · square 800</option>' +
      '<option value="classic_bass">Classic bass · saw 120</option>' +
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
        name: '— Pick a groove (basic) —',
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
        name: 'DnB (break feel)',
        bpm: 174,
        instruments: ['kick_punch', 'snare_room', 'hat_metallic', 'bass_pluck'],
        pattern: [pat([0, 8]), pat([4, 12]), pat([1, 3, 5, 7, 9, 11, 13, 15]), pat([0, 2, 8, 10])],
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
    var playlineEl = null;
    var basicMode = true;

    iface.innerHTML =
      '<div class="tool-stack">' +
      '<p class="tool-hint">16-step loop. <strong>Tap Play</strong> once to start sound (required on iPhone / Safari). Magenta line = playhead. Tap again to stop. <strong>Advanced</strong> unlocks every instrument.</p>' +
      '<p class="tool-beat-audio-status" id="ov-bstat" role="status" aria-live="polite"></p>' +
      '<div class="tool-row tool-row--top">' +
      '<label class="tool-field" style="flex-direction:row;align-items:center;gap:10px;cursor:pointer">' +
      '<input type="checkbox" id="ov-badv" style="width:20px;height:20px">' +
      '<span class="tool-label" style="margin:0">Advanced · per-track instruments</span></label>' +
      '</div>' +
      '<div class="tool-beat-control-column">' +
      '<div class="tool-row tool-row--top tool-row--beat-preset">' +
      '<div class="tool-field tool-field--beat-preset"><span class="tool-label">Pattern preset</span>' +
      '<select class="tool-select tool-select--beat-preset" id="ov-bpre"></select></div>' +
      '<div class="tool-field tool-field--beat-bpm"><span class="tool-label">BPM</span><input type="number" class="tool-input" id="ov-bpm" value="110" min="60" max="200" step="1"></div>' +
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

    var BASIC_LABELS = ['Kick', 'Snare / tom', 'Hi-hat', 'Bass'];
    var defaultInst = ['classic_kick', 'classic_snare', 'classic_hat', 'classic_bass'];
    for (var r = 0; r < rows; r++) {
      grid[r] = [];
      cellEls[r] = [];
      var brow = el('<div class="tool-beat-row"></div>');
      var head = el('<div class="tool-beat-row-head"></div>');
      var lab = el(
        '<span class="tool-beat-basic-label tool-label" style="display:none;padding:10px 0">' +
          BASIC_LABELS[r] +
          ' · classic</span>'
      );
      var sel = el(
        '<select class="tool-select tool-select--beat" data-row="' + r + '" aria-label="Instrument track ' +
          (r + 1) +
          '">' +
          BEAT_INSTRUMENTS_HTML +
          '</select>'
      );
      sel.value = defaultInst[r];
      head.appendChild(lab);
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

    function syncBasicAdvancedUi() {
      basicMode = !iface.querySelector('#ov-badv').checked;
      var labels = beatInner.querySelectorAll('.tool-beat-basic-label');
      var sels = beatInner.querySelectorAll('select.tool-select--beat');
      var i;
      for (i = 0; i < labels.length; i++) {
        labels[i].style.display = basicMode ? 'block' : 'none';
      }
      for (i = 0; i < sels.length; i++) {
        sels[i].style.display = basicMode ? 'none' : 'block';
        sels[i].disabled = basicMode;
      }
    }
    iface.querySelector('#ov-badv').addEventListener('change', syncBasicAdvancedUi);
    syncBasicAdvancedUi();

    var beatControlCol = iface.querySelector('.tool-beat-control-column');
    function syncBeatPresetColumnToTransport() {
      var tr = iface.querySelector('.tool-row--beat-transport');
      if (!beatControlCol || !tr) return;
      var w = Math.round(tr.getBoundingClientRect().width);
      if (w > 0) beatControlCol.style.setProperty('--tool-beat-transport-px', w + 'px');
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

    var CLASSIC_IDS = ['classic_kick', 'classic_snare', 'classic_hat', 'classic_bass'];
    var lastBeatCol = -1;

    function setPlayhead(col) {
      if (col >= 0) lastBeatCol = col;
      for (var rr = 0; rr < rows; rr++) {
        for (var cc = 0; cc < cols; cc++) {
          cellEls[rr][cc].classList.toggle('is-playhead', cc === col);
        }
      }
      if (playlineEl && cellEls[0] && cellEls[0][0]) {
        if (col < 0) {
          playlineEl.style.opacity = '0';
        } else {
          playlineEl.style.opacity = '1';
          var cell = cellEls[0][col];
          var rowEl = cell.parentElement;
          var cx = rowEl.offsetLeft + cell.offsetLeft + cell.offsetWidth / 2;
          playlineEl.style.left = cx + 'px';
        }
      }
    }

    function clearPlayhead() {
      lastBeatCol = -1;
      setPlayhead(-1);
    }

    wrap.addEventListener('scroll', function () {
      if (lastBeatCol >= 0) setPlayhead(lastBeatCol);
    });

    function ensureNoise(ac) {
      if (noiseBuf) return noiseBuf;
      var n = ac.sampleRate * 0.25;
      var buf = ac.createBuffer(1, n, ac.sampleRate);
      var d = buf.getChannelData(0);
      var i;
      for (i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      noiseBuf = buf;
      return noiseBuf;
    }

    function connectOut(g) {
      if (master) g.connect(master);
      else if (ctx) g.connect(ctx.destination);
    }

    var playInstrument = {
      classic_kick: function (ac, t) {
        var o = ac.createOscillator();
        var g = ac.createGain();
        o.type = 'sine';
        o.frequency.value = 180;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.22, t + 0.01);
        g.gain.linearRampToValueAtTime(0.0001, t + 0.08);
        o.connect(g);
        connectOut(g);
        o.start(t);
        o.stop(t + 0.1);
      },
      classic_snare: function (ac, t) {
        var o = ac.createOscillator();
        var g = ac.createGain();
        o.type = 'triangle';
        o.frequency.value = 220;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.2, t + 0.008);
        g.gain.linearRampToValueAtTime(0.0001, t + 0.06);
        o.connect(g);
        connectOut(g);
        o.start(t);
        o.stop(t + 0.08);
      },
      classic_hat: function (ac, t) {
        var o = ac.createOscillator();
        var g = ac.createGain();
        o.type = 'square';
        o.frequency.value = 800;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.18, t + 0.004);
        g.gain.linearRampToValueAtTime(0.0001, t + 0.04);
        o.connect(g);
        connectOut(g);
        o.start(t);
        o.stop(t + 0.05);
      },
      classic_bass: function (ac, t) {
        var o = ac.createOscillator();
        var g = ac.createGain();
        o.type = 'sawtooth';
        o.frequency.value = 120;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.18, t + 0.012);
        g.gain.linearRampToValueAtTime(0.0001, t + 0.12);
        o.connect(g);
        connectOut(g);
        o.start(t);
        o.stop(t + 0.14);
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
        var i;
        for (i = 0; i < 3; i++) {
          (function (delay) {
            var src = ac.createBufferSource();
            src.buffer = buf;
            var f = ac.createBiquadFilter();
            f.type = 'bandpass';
            f.frequency.value = 1200;
            var g = ac.createGain();
            var t0 = t + delay;
            g.gain.setValueAtTime(0.0008, t0);
            g.gain.exponentialRampToValueAtTime(0.22, t0 + 0.002);
            g.gain.exponentialRampToValueAtTime(0.0008, t0 + 0.04);
            src.connect(f);
            f.connect(g);
            connectOut(g);
            src.start(t0);
            src.stop(t0 + 0.05);
          })(i * 0.012);
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
      iface.querySelector('#ov-bpm').value = String(p.bpm);
      for (var r = 0; r < rows; r++) {
        if (!basicMode) {
          var rowSel = beatInner.querySelector('select[data-row="' + r + '"]');
          if (rowSel) rowSel.value = p.instruments[r] || defaultInst[r];
        }
        for (var c = 0; c < cols; c++) {
          grid[r][c] = !!(p.pattern[r] && p.pattern[r][c]);
          paintCell(cellEls[r][c], r, grid[r][c]);
        }
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

    function beatSecondsPerStep() {
      var bpm = +iface.querySelector('#ov-bpm').value || 110;
      if (!isFinite(bpm) || bpm < 40) bpm = 110;
      if (bpm > 240) bpm = 240;
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
      setPlayhead(col);
      var tSound = beatAt + 0.02;
      var r;
      for (r = 0; r < rows; r++) {
        if (!grid[r][col]) continue;
        var sel = beatInner.querySelector('select[data-row="' + r + '"]');
        var id = basicMode ? CLASSIC_IDS[r] : (sel && sel.value) || defaultInst[r];
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

    function beatSchedulerLoop() {
      if (!playing || !ctx) return;
      var sp = beatSecondsPerStep();
      var lookAhead = 0.12;
      var guard = 24;
      while (guard-- > 0 && nextNoteTime < ctx.currentTime + lookAhead) {
        scheduleBeatColumn(nextNoteTime);
        nextNoteTime += sp;
      }
      rafId = window.requestAnimationFrame(beatSchedulerLoop);
    }

    function restartBeatScheduler() {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
      if (!playing || !ctx) return;
      nextNoteTime = ctx.currentTime + beatSecondsPerStep() * 0.35;
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
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
      step = 0;
      clearPlayhead();
      setBeatStat('');
      syncTransportButton();
    }

    iface.querySelector('#ov-bpm').addEventListener('input', function () {
      if (playing) restartBeatScheduler();
    });

    transportBtn.addEventListener('click', function () {
      if (playing) {
        stopBeatPlayback();
        return;
      }
      try {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) {
          setBeatStat('Web Audio is not available here. Try Chrome, Safari, or Firefox.', true);
          return;
        }
        if (!ctx) {
          ctx = new AC();
          master = ctx.createGain();
          master.gain.value = 0.65;
          master.connect(ctx.destination);
        }
        primeBeatAudioSync(ctx);
        if (typeof ctx.resume === 'function') {
          ctx.resume();
        }
        step = 0;
        playing = true;
        noiseBuf = null;
        ensureNoise(ctx);
        restartBeatScheduler();
        setBeatStat('Playing — turn up volume if you hear nothing.');
        syncTransportButton();
      } catch (e) {
        console.error('Overprint beat: play failed', e);
        setBeatStat('Could not start audio. Tap Play again (or reload).', true);
      }
    });

    syncTransportButton();

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
    'placeholder-hub': initPlaceholderHub,
    'css-generator': initCssGenerator,
    'color-lab': initColorLab,
    'noise-texture': initNoiseTexture,
    'qr-code-generator': initQrCodeGenerator,
    'image-toolbox': initImageToolbox,
    'image-optimizer': initImageOptimizer,
    'social-sizer': initSocialSizer,
    'grid-crop': initGridCrop,
    'carousel-maker': initCarouselMaker,
    'screenshot-beautifier': initScreenshotBeautifier,
    'favicon-forge': initFaviconForge,
    'font-pair': initFontPair,
    'beat-maker': initBeatMaker,
  };
})();
