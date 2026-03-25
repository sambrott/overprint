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

  /* —— Contrast checker —— */
  function initContrastChecker(iface) {
    iface.innerHTML =
      '<div class="tool-stack">' +
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
      '<p class="tool-out" id="ov-cratio"></p>' +
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
      '<p class="tool-out" id="ov-arout"></p>' +
      '<div class="tool-row">' +
      '<div class="tool-field"><span class="tool-label">Scale to W</span><input type="number" class="tool-input" id="ov-sw" placeholder="px"></div>' +
      '<div class="tool-field"><span class="tool-label">Scale to H</span><input type="number" class="tool-input" id="ov-sh" placeholder="px"></div>' +
      '</div>' +
      '<p class="tool-out" id="ov-scaleout"></p>' +
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
          '<p class="tool-out" id="chn"></p>';
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
      '<input type="text" class="tool-input" id="qrt" value="" autocomplete="off" placeholder="https://example.com"></div>' +
      '<div class="tool-row">' +
      '<div class="tool-field"><span class="tool-label">FG</span><input type="color" class="tool-input" id="qrf" value="#08080c"></div>' +
      '<div class="tool-field"><span class="tool-label">BG</span><input type="color" class="tool-input" id="qrb" value="#ffffff"></div>' +
      '<div class="tool-field"><span class="tool-label">Export size (px)</span><input type="number" class="tool-input" id="qrs" value="200" min="64" max="800"></div>' +
      '</div>' +
      '<div class="qr-preview">' +
      '<div class="qr-preview-label">Preview</div>' +
      '<div class="qr-preview-canvas"><canvas id="qrc" width="280" height="280" aria-label="QR code preview"></canvas></div>' +
      '</div>' +
      '<div class="tool-row"><button type="button" class="tool-btn tool-btn--c" id="qrp">Download PNG</button></div>' +
      '</div>';
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
        return;
      }
      var text = normalizeQrContent(raw);
      QR.toCanvas(canvas, text, qrOpts(dark, light, previewW), function (e) {
        if (e) console.warn(e);
      });
    }
    iface.querySelectorAll('#qrt,#qrf,#qrb,#qrs').forEach(function (x) {
      x.addEventListener('input', drawPreview);
      x.addEventListener('change', drawPreview);
    });
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
              '</span><span class="tool-meta-kb">' +
              (file.size / 1024).toFixed(1) +
              ' KB</span>' +
              '<div class="tool-row" style="margin-top:8px">' +
              '<label class="tool-field tool-field--inline"><span class="tool-label">Quality</span><input type="range" class="tool-input tool-input--range" min="0.5" max="1" step="0.05" value="0.85" data-q></label>' +
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
    var FCV_SIZES = [16, 24, 32, 48, 64];
    /**
     * Icon path `d` values: geometric marks are original; several paths derive from
     * Heroicons (MIT) https://github.com/tailwindlabs/heroicons — rendered as vectors, not emoji.
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

    iface.innerHTML =
      '<div class="tool-stack fcv-stack">' +
      '<div class="fcv-shell">' +
      '<div class="fcv-preview" aria-label="Preview">' +
      '<div class="fcv-preview-inner">' +
      '<div class="fcv-main-wrap">' +
      '<div class="fcv-main">' +
      '<canvas id="ov-fcv" width="180" height="180" class="fcv-canvas-main"></canvas>' +
      '</div>' +
      '<div class="fcv-scales" aria-label="Preview at common sizes">' +
      FCV_SIZES.map(function (sz) {
        return (
          '<div class="fcv-scale">' +
          '<canvas id="ov-fcv-p' +
          sz +
          '" width="' +
          sz +
          '" height="' +
          sz +
          '" class="fcv-canvas-scale"></canvas>' +
          '<span class="fcv-scale-label">' +
          sz +
          'px</span></div>'
        );
      }).join('') +
      '</div></div></div></div>' +
      '<aside class="fcv-toolbar" aria-label="Favicon controls">' +
      '<div class="fcv-toolbar-head">' +
      '<div class="fcv-export-actions">' +
      '<button type="button" class="tool-btn tool-btn--m" id="ov-fico">favicon.ico</button>' +
      '<button type="button" class="tool-btn" id="ov-f32">PNG 32</button>' +
      '<button type="button" class="tool-btn" id="ov-f180">PNG 180</button>' +
      '</div></div>' +
      '<div class="fcv-panels">' +
      '<section class="fcv-section">' +
      '<div class="fcv-section-title">Content</div>' +
      '<div class="tool-field"><span class="tool-label">Mode</span>' +
      '<select class="tool-select" id="ov-fmode" aria-label="Content type">' +
      '<option value="letter">Letters</option>' +
      '<option value="symbol">Icons and text</option>' +
      '<option value="emoji">Emoji</option>' +
      '</select></div>' +
      '<div class="tool-field" id="ov-fwrap-letter"><span class="tool-label">Letters (1–2)</span>' +
      '<input type="text" class="tool-input" id="ov-ft" maxlength="2" value="OP" autocomplete="off"></div>' +
      '</section>' +
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
      '<section class="fcv-section" id="fcv-section-type">' +
      '<div class="fcv-section-title" id="fcv-typo-title">Typography</div>' +
      '<p class="fcv-section-hint" id="fcv-type-hint"></p>' +
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
      '<input type="range" class="tool-input tool-input--range" id="ov-fsize" min="56" max="132" value="100" step="2" aria-valuemin="56" aria-valuemax="132" aria-valuenow="100">' +
      '</div></section>' +
      '<section class="fcv-section">' +
      '<div class="fcv-section-title">Mask and color</div>' +
      '<div class="tool-field"><span class="tool-label">Mask shape</span>' +
      '<select class="tool-select" id="ov-fshape" aria-label="Outer mask shape">' +
      '<option value="square">Square</option>' +
      '<option value="rounded">Rounded square</option>' +
      '<option value="circle">Circle</option>' +
      '<option value="diamond">Diamond</option>' +
      '<option value="triangle">Triangle</option>' +
      '</select></div>' +
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
      '</section>' +
      '<section class="fcv-section fcv-section--presets">' +
      '<div class="fcv-section-title">Swatches</div>' +
      '<div class="fcv-presets" role="group" aria-label="Color presets">' +
      '<button type="button" class="fcv-preset" data-fg="#08080c" data-bg="#00b4d8" title="Dark on cyan"></button>' +
      '<button type="button" class="fcv-preset" data-fg="#f8fafc" data-bg="#0f172a" title="Light on slate"></button>' +
      '<button type="button" class="fcv-preset" data-fg="#111827" data-bg="#fbbf24" title="Dark on amber"></button>' +
      '<button type="button" class="fcv-preset" data-fg="#ffffff" data-bg="#dc2626" title="White on red"></button>' +
      '<button type="button" class="fcv-preset" data-fg="#ecfdf5" data-bg="#059669" title="Mint on green"></button>' +
      '<button type="button" class="fcv-preset" data-fg="#fef3c7" data-bg="#7c3aed" title="Cream on violet"></button>' +
      '</div></section>' +
      '</div></aside></div></div>';

    var fcvFontLink = document.createElement('link');
    fcvFontLink.rel = 'stylesheet';
    document.head.appendChild(fcvFontLink);

    function fcvFontFamilyCss() {
      var v = iface.querySelector('#ov-ffont').value;
      var fam = FCV_FONTS[0].family;
      var fi;
      for (fi = 0; fi < FCV_FONTS.length; fi++) {
        if (FCV_FONTS[fi].id === v) {
          fam = FCV_FONTS[fi].family;
          break;
        }
      }
      return fam;
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
      }
      ctx.fill(spec.rule || 'nonzero');
    }

    function syncTypeHint() {
      var hint = iface.querySelector('#fcv-type-hint');
      if (!hint) return;
      var mode = iface.querySelector('#ov-fmode').value;
      if (mode === 'symbol') {
        hint.textContent =
          'Typeface applies to custom characters. Vector icons scale with the size slider.';
      } else if (mode === 'emoji') {
        hint.textContent = 'Size and weight adjust emoji. Typeface applies to letter mode.';
      } else {
        hint.textContent = 'Font, weight, and size apply to letters.';
      }
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
        if (mode === 'emoji') {
          typoTitle.textContent = 'Emoji size';
        } else {
          typoTitle.textContent = 'Typography';
        }
      }
      syncTypeHint();
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

    function drawScales() {
      var main = iface.querySelector('#ov-fcv');
      var i;
      for (i = 0; i < FCV_SIZES.length; i++) {
        var sz = FCV_SIZES[i];
        var el = iface.querySelector('#ov-fcv-p' + sz);
        if (!el) continue;
        el.width = sz;
        el.height = sz;
        var sx = el.getContext('2d');
        sx.imageSmoothingEnabled = true;
        sx.clearRect(0, 0, sz, sz);
        sx.drawImage(main, 0, 0, 180, 180, 0, 0, sz, sz);
      }
    }

    function syncFcvColorEnabled() {
      var fgIn = iface.querySelector('#ov-ffg');
      var bgIn = iface.querySelector('#ov-fbg');
      var fgN = iface.querySelector('#ov-ffg-none');
      var bgN = iface.querySelector('#ov-fbg-none');
      if (fgIn && fgN) fgIn.disabled = fgN.checked;
      if (bgIn && bgN) bgIn.disabled = bgN.checked;
    }

    function draw() {
      var w = 180;
      var h = 180;
      var c = iface.querySelector('#ov-fcv');
      var x = c.getContext('2d');
      var shape = iface.querySelector('#ov-fshape').value;
      var mode = iface.querySelector('#ov-fmode').value;
      var fg = iface.querySelector('#ov-ffg').value;
      var bg = iface.querySelector('#ov-fbg').value;
      var fgNone = iface.querySelector('#ov-ffg-none').checked;
      var bgNone = iface.querySelector('#ov-fbg-none').checked;
      x.clearRect(0, 0, w, h);
      x.save();
      pathShape(x, w, h, shape);
      x.clip();
      if (!bgNone) {
        x.fillStyle = bg;
        x.fillRect(0, 0, w, h);
      }
      if (!fgNone) {
        x.fillStyle = fg;
        x.textAlign = 'center';
        x.textBaseline = 'middle';
        var fsPx = fcvTypeSizePx();
        var fwNum = iface.querySelector('#ov-fweight').value === '400' ? '400' : '700';
        var fam = fcvFontFamilyCss();
        if (mode === 'letter') {
          var t = (iface.querySelector('#ov-ft').value || '?').slice(0, 2).toUpperCase();
          x.font = fwNum + ' ' + fsPx + 'px "' + fam + '",sans-serif';
          x.fillText(t, w / 2, h / 2 + 2);
        } else if (mode === 'emoji') {
          var eg = emojiGlyph();
          x.font =
            fwNum +
            ' ' +
            fsPx +
            'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
          x.textBaseline = 'alphabetic';
          var em = x.measureText(eg);
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
            x.textBaseline = 'middle';
            ey = h / 2 + Math.round(fsPx * 0.06);
          }
          x.fillText(eg, w / 2, ey);
        } else {
          var customSym = iface.querySelector('#ov-fsym-custom').value.trim();
          if (customSym.length) {
            x.font =
              fwNum +
              ' ' +
              fsPx +
              'px "' +
              fam +
              '",system-ui,"Segoe UI Symbol","Apple Symbols",sans-serif';
            x.fillText(customSym.slice(0, 4), w / 2, h / 2 + 2);
          } else {
            x.save();
            var u = (Math.min(w, h) * 0.72 * (fsPx / 100)) / 24;
            x.translate(w / 2, h / 2);
            x.scale(u, u);
            x.translate(-12, -12);
            drawVectorIcon(x, iface.querySelector('#ov-ficon-select').value);
            x.restore();
          }
        }
      }
      x.restore();
      drawScales();
    }

    function applyFcvFont() {
      fcvFontLink.href = fcvGoogleFontHref(fcvFontFamilyCss());
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
      iface.querySelectorAll('#ov-ft,#ov-ffg,#ov-fbg,#ov-fshape,#ov-fsym-custom').forEach(function (i) {
        i.addEventListener('input', draw);
      });
      iface.querySelectorAll('#ov-ffg-none,#ov-fbg-none').forEach(function (cb) {
        cb.addEventListener('change', function () {
          syncFcvColorEnabled();
          draw();
        });
      });
      iface.querySelector('#ov-fsize').addEventListener('input', function () {
        var lab = iface.querySelector('#ov-fsize-val');
        if (lab) lab.textContent = this.value;
        this.setAttribute('aria-valuenow', this.value);
        draw();
      });
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

    function dl(size) {
      var out = document.createElement('canvas');
      out.width = out.height = size;
      var src = iface.querySelector('#ov-fcv');
      out.getContext('2d').drawImage(src, 0, 0, 180, 180, 0, 0, size, size);
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
        tmp.getContext('2d').drawImage(src, 0, 0, 180, 180, 0, 0, sz, sz);
        pngs.push(OV.canvasToPngUint8Array(tmp));
      }
      var ico = OV.encodeIcoFromPngBuffers(pngs);
      OV.downloadBlob(new Blob([ico], { type: 'image/vnd.microsoft.icon' }), 'favicon.ico');
    }

    iface.querySelector('#ov-fico').addEventListener('click', dlIco);
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
      { id: 'fashion', label: 'Fashion', head: 'The line.', body: 'Lookbooks reward contrast—tight display typography and a minimal grotesk for sizes and care copy.', hint: 8 },
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
      '</div></aside></div></div>';
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


  /* —— Beat maker —— (Web Audio; timeline + instruments + genre presets) */
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
        name: '— Pick a groove —',
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
          var a = document.createElement('a');
          var bpm = Math.round(+iface.querySelector('#ov-bpm').value || 110);
          a.href = URL.createObjectURL(blob);
          a.download = 'overprint-beat-' + bpm + 'bpm-48k-stereo.wav';
          a.click();
          setTimeout(function () {
            URL.revokeObjectURL(a.href);
          }, 4000);
          setBeatStat('Exported 48 kHz WAV (stereo) — ready for Premiere, Resolve, etc.');
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
