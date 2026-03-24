/* Shared helpers for Overprint tools (client-side only) */
(function () {
  var OV = (window.OV = window.OV || {});

  OV.parseHex = function (s) {
    if (!s || typeof s !== 'string') return null;
    var t = s.trim().replace(/^#/, '');
    if (t.length === 3) {
      t = t[0] + t[0] + t[1] + t[1] + t[2] + t[2];
    }
    if (!/^[0-9a-fA-F]{6}$/.test(t)) return null;
    return {
      r: parseInt(t.slice(0, 2), 16),
      g: parseInt(t.slice(2, 4), 16),
      b: parseInt(t.slice(4, 6), 16),
    };
  };

  OV.rgbToHex = function (r, g, b) {
    function h(x) {
      var n = Math.max(0, Math.min(255, Math.round(x)));
      return ('0' + n.toString(16)).slice(-2);
    }
    return '#' + h(r) + h(g) + h(b);
  };

  OV.relativeLuminance = function (r, g, b) {
    function lin(c) {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    }
    var R = lin(r);
    var G = lin(g);
    var B = lin(b);
    return 0.2126 * R + 0.7152 * G + 0.0722 * B;
  };

  OV.contrastRatio = function (rgb1, rgb2) {
    var L1 = OV.relativeLuminance(rgb1.r, rgb1.g, rgb1.b);
    var L2 = OV.relativeLuminance(rgb2.r, rgb2.g, rgb2.b);
    var hi = Math.max(L1, L2);
    var lo = Math.min(L1, L2);
    if (lo <= 0) return 21;
    return (hi + 0.05) / (lo + 0.05);
  };

  OV.rgbToHsl = function (r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    var max = Math.max(r, g, b);
    var min = Math.min(r, g, b);
    var h = 0;
    var s = 0;
    var l = (max + min) / 2;
    if (max !== min) {
      var d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
          break;
        case g:
          h = ((b - r) / d + 2) / 6;
          break;
        default:
          h = ((r - g) / d + 4) / 6;
      }
    }
    return { h: h * 360, s: s * 100, l: l * 100 };
  };

  OV.hslToRgb = function (h, s, l) {
    h /= 360;
    s /= 100;
    l /= 100;
    var a = s * Math.min(l, 1 - l);
    function f(n) {
      var k = (n + h * 12) % 12;
      return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    }
    return {
      r: Math.round(255 * f(0)),
      g: Math.round(255 * f(8)),
      b: Math.round(255 * f(4)),
    };
  };

  OV.gcd = function (a, b) {
    a = Math.abs(Math.round(a));
    b = Math.abs(Math.round(b));
    while (b) {
      var t = b;
      b = a % b;
      a = t;
    }
    return a || 1;
  };

  OV.simplifyRatio = function (w, h) {
    var g = OV.gcd(w, h);
    return { w: w / g, h: h / g };
  };

  OV.loadImageFile = function (file) {
    return new Promise(function (resolve, reject) {
      if (!file || !file.type || file.type.indexOf('image') !== 0) {
        reject(new Error('Not an image'));
        return;
      }
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error('Load failed'));
      };
      img.src = url;
    });
  };

  OV.bindDropZone = function (zone, input, onFiles) {
    if (!zone) return;
    function handle(files) {
      if (files && files.length) onFiles(Array.prototype.slice.call(files));
    }
    zone.addEventListener('click', function () {
      if (input) input.click();
    });
    zone.addEventListener('dragover', function (e) {
      e.preventDefault();
      zone.classList.add('is-drag');
    });
    zone.addEventListener('dragleave', function () {
      zone.classList.remove('is-drag');
    });
    zone.addEventListener('drop', function (e) {
      e.preventDefault();
      zone.classList.remove('is-drag');
      handle(e.dataTransfer.files);
    });
    if (input) {
      input.addEventListener('change', function () {
        handle(input.files);
        input.value = '';
      });
    }
  };

  OV.downloadBlob = function (blob, name) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(a.href);
    }, 2000);
  };

  OV.downloadCanvas = function (canvas, name, type, quality) {
    canvas.toBlob(
      function (blob) {
        if (blob) OV.downloadBlob(blob, name);
      },
      type || 'image/png',
      quality
    );
  };

  OV.copyText = function (text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    var ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
    } catch (e) {}
    document.body.removeChild(ta);
    return Promise.resolve();
  };

  OV._scriptPromises = OV._scriptPromises || {};
  /**
   * Load a script once (optional globalName e.g. 'JSZip' skips if already present).
   * Used so the app works even when CDN is blocked on first paint.
   */
  OV.loadScriptOnce = function (src, globalName) {
    if (globalName && window[globalName]) return Promise.resolve();
    if (OV._scriptPromises[src]) return OV._scriptPromises[src];
    OV._scriptPromises[src] = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = function () {
        resolve();
      };
      s.onerror = function () {
        reject(new Error('Could not load script: ' + src));
      };
      document.head.appendChild(s);
    });
    return OV._scriptPromises[src];
  };

  OV.CDN_JSZIP = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
  OV.CDN_QRCODE = 'https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js';

  OV.readFileText = function (file) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () {
        resolve(String(r.result || ''));
      };
      r.onerror = reject;
      r.readAsText(file);
    });
  };

  /** Cover-fit image into w×h (object-fit: cover). */
  OV.canvasCover = function (img, outW, outH) {
    var iw = img.naturalWidth || img.width;
    var ih = img.naturalHeight || img.height;
    var ar = outW / outH;
    var ir = iw / ih;
    var sx, sy, sw, sh;
    if (ir > ar) {
      sh = ih;
      sw = Math.round(sh * ar);
      sx = Math.round((iw - sw) / 2);
      sy = 0;
    } else {
      sw = iw;
      sh = Math.round(sw / ar);
      sx = 0;
      sy = Math.round((ih - sh) / 2);
    }
    var c = document.createElement('canvas');
    c.width = outW;
    c.height = outH;
    var ctx = c.getContext('2d');
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);
    return c;
  };

  /** Crop source canvas/image to aspect ratio W:H from center; scale to outW×outH. */
  OV.cropToAspect = function (img, rw, rh, outW, outH) {
    var iw = img.naturalWidth || img.width;
    var ih = img.naturalHeight || img.height;
    var ar = rw / rh;
    var ir = iw / ih;
    var sx, sy, sw, sh;
    if (ir > ar) {
      sw = Math.round(ih * ar);
      sh = ih;
      sx = Math.round((iw - sw) / 2);
      sy = 0;
    } else {
      sw = iw;
      sh = Math.round(iw / ar);
      sx = 0;
      sy = Math.round((ih - sh) / 2);
    }
    var c = document.createElement('canvas');
    c.width = outW;
    c.height = outH;
    var ctx = c.getContext('2d');
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);
    return c;
  };
})();
