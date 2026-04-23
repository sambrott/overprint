/* One-off: emit public/js/lava-liquid.js from Aurora abstract-glassy-shader.tsx */
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(
  '/Users/SamBro/Projects/aurora-screensaver/src/components/ui/abstract-glassy-shader.tsx',
  'utf8'
);
const mVert = src.match(/const VERT = `([\s\S]*?)`/);
const mFrag = src.match(/const FRAG = `([\s\S]*?)`/);
if (!mVert || !mFrag) {
  console.error('VERT/FRAG not found');
  process.exit(1);
}
const escBT = (s) => s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');

const head = `/**
 * Lava (metaball) WebGL2 layer from Aurora screensaver — liquid only, no background shader.
 * Source: abstract-glassy-shader.tsx (kept in sync via scripts/build-lava-liquid.cjs)
 */
(function (global) {
  'use strict';

  var VERT = \`${escBT(mVert[1])}\`;
  var FRAG = \`${escBT(mFrag[1])}\`;
  var FULLSCREEN = new Float32Array([-1, 1, -1, -1, 1, 1, 1, -1]);
  var N = 5;
  var TSCALE = 0.7;
  var CLUSTER = 0.1;
  var PAD = 0.01;
  var K_FLOAT = 3.2;
  var B_DRAG = 0.55;
  var REST = 0.7;
  var WOBBLE = 0.02;
  var R_BALL_BASE = 0.2;
`;

const tail = `
  function compileShader(gl, type, srcStr) {
    var s = gl.createShader(type);
    if (!s) return null;
    gl.shaderSource(s, srcStr);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      if (global.console) console.error('Shader error:', gl.getShaderInfoLog(s), srcStr.substring(0, 200));
      gl.deleteShader(s);
      return null;
    }
    return s;
  }

  function lissajous(tSec) {
    var s = tSec * TSCALE;
    var scale = CLUSTER;
    var c = new Float32Array(10);
    c[0] = Math.cos(s * 0.9) * 0.42 * scale;
    c[1] = Math.sin(s * 1.4) * 0.28 * scale;
    c[2] = Math.cos(s * 0.7 + 2.2) * 0.35 * scale;
    c[3] = Math.sin(s * 1.1 + 1.0) * 0.32 * scale;
    c[4] = Math.cos(s * 1.1 + 4.0) * 0.38 * scale;
    c[5] = Math.sin(s * 0.9 + 3.3) * 0.24 * scale;
    c[6] = Math.cos(s * 0.85 + 5.5) * 0.28 * scale;
    c[7] = Math.sin(s * 1.25) * 0.38 * scale;
    c[8] = Math.sin(s * 0.95) * 0.22 * scale;
    c[9] = Math.cos(s * 1.05 + 0.8) * 0.42 * scale;
    return c;
  }

  function LavaSim() {
    this.p = new Float32Array(10);
    this.v = new Float32Array(10);
    this.w = 1;
    this.h = 1;
    this.rBall = R_BALL_BASE;
  }
  LavaSim.prototype.reset = function (w, h) {
    this.w = w;
    this.h = h;
    var c = lissajous(0);
    for (var i = 0; i < N; i++) {
      this.p[i * 2] = c[i * 2];
      this.p[i * 2 + 1] = c[i * 2 + 1];
      this.v[i * 2] = 0;
      this.v[i * 2 + 1] = 0;
    }
  };
  LavaSim.prototype.setWallRadiusForSizeScale = function (sizeScale) {
    this.rBall = R_BALL_BASE * Math.max(0.3, Math.min(0.85, sizeScale));
  };
  LavaSim.prototype._bounds = function () {
    var a = this.w / this.h;
    return {
      xMin: -0.5 * a + PAD,
      xMax: 0.5 * a - PAD,
      yMin: -0.5 + PAD,
      yMax: 0.5 - PAD
    };
  };
  LavaSim.prototype._wallSoft = function (i, t) {
    var b = this._bounds();
    var r = this.rBall;
    var ix = i * 2;
    var iy = ix + 1;
    if (this.p[ix] < b.xMin + r) {
      this.p[ix] = b.xMin + r;
      this.v[ix] = Math.abs(this.v[ix]) * REST;
      this.v[iy] += 0.08 * Math.sin(2.4 * t + i * 0.3);
    }
    if (this.p[ix] > b.xMax - r) {
      this.p[ix] = b.xMax - r;
      this.v[ix] = -Math.abs(this.v[ix]) * REST;
      this.v[iy] += 0.08 * Math.sin(1.7 * t + i * 0.25);
    }
    if (this.p[iy] < b.yMin + r) {
      this.p[iy] = b.yMin + r;
      this.v[iy] = Math.abs(this.v[iy]) * REST;
      this.v[ix] += 0.08 * Math.cos(2.0 * t + i * 0.2);
    }
    if (this.p[iy] > b.yMax - r) {
      this.p[iy] = b.yMax - r;
      this.v[iy] = -Math.abs(this.v[iy]) * REST;
      this.v[ix] += 0.08 * Math.sin(1.5 * t - i * 0.2);
    }
  };
  LavaSim.prototype._solveWalls = function (t) {
    for (var p = 0; p < 2; p++) {
      for (var i = 0; i < N; i++) {
        this._wallSoft(i, t);
      }
    }
  };
  LavaSim.prototype.step = function (dt, tSec, cpuMotion) {
    if (dt <= 0 || this.w < 1 || this.h < 1) return;
    var cm = Math.max(0, Math.min(1, cpuMotion));
    var wob = WOBBLE * 0.55 * (0.2 + 0.85 * cm);
    var tar = lissajous(tSec);
    for (var i = 0; i < N; i++) {
      var wx = wob * (Math.sin(1.2 * tSec + 0.4 * i) + 0.7 * Math.sin(2.4 * tSec - i * 0.5));
      var wy = wob * (Math.cos(1.0 * tSec + 0.3 * i) + 0.7 * Math.cos(2.1 * tSec + 0.2 * i));
      var tx = tar[i * 2] + wx;
      var ty = tar[i * 2 + 1] + wy;
      var j = i * 2;
      var ax = K_FLOAT * (tx - this.p[j]) - B_DRAG * this.v[j];
      var ay = K_FLOAT * (ty - this.p[j + 1]) - B_DRAG * this.v[j + 1];
      this.v[j] += ax * dt;
      this.v[j + 1] += ay * dt;
    }
    for (i = 0; i < N; i++) {
      this.p[i * 2] += this.v[i * 2] * dt;
      this.p[i * 2 + 1] += this.v[i * 2 + 1] * dt;
    }
    this._solveWalls(tSec);
    var vmax = 0.65;
    for (i = 0; i < N; i++) {
      var m = this.v[i * 2] * this.v[i * 2] + this.v[i * 2 + 1] * this.v[i * 2 + 1];
      if (m > vmax * vmax) {
        var s = (vmax / Math.sqrt(m)) * 0.98;
        this.v[i * 2] *= s;
        this.v[i * 2 + 1] *= s;
      }
    }
  };

  function LavaLampLayer(canvas) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: false, antialias: true });
    if (!this.gl) {
      throw new Error('WebGL2 not supported');
    }
    var gl = this.gl;
    this.vs = compileShader(gl, gl.VERTEX_SHADER, VERT);
    this.fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!this.vs || !this.fs) throw new Error('Shader compile failed');
    this.program = gl.createProgram();
    gl.attachShader(this.program, this.vs);
    gl.attachShader(this.program, this.fs);
    gl.bindAttribLocation(this.program, 0, 'aPosition');
    gl.linkProgram(this.program);
    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      throw new Error('Program link failed: ' + gl.getProgramInfoLog(this.program));
    }
    this.buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    gl.bufferData(gl.ARRAY_BUFFER, FULLSCREEN, gl.STATIC_DRAW);
    this.u = { c: [] };
    for (var j = 0; j < 5; j++) {
      this.u.c.push(gl.getUniformLocation(this.program, 'uC' + j));
    }
    this.u.time = gl.getUniformLocation(this.program, 'time');
    this.u.res = gl.getUniformLocation(this.program, 'resolution');
    this.u.morph = gl.getUniformLocation(this.program, 'uMorph');
    this.u.sizeScale = gl.getUniformLocation(this.program, 'uSizeScale');
    this.u.merge = gl.getUniformLocation(this.program, 'uMerge');
    this.u.edgeWave = gl.getUniformLocation(this.program, 'uEdgeWave');
    this.u.axisPuff = gl.getUniformLocation(this.program, 'uAxisPuff');
    this.u.detail = gl.getUniformLocation(this.program, 'uDetail');
    this.u.rim = gl.getUniformLocation(this.program, 'uRim');
    this.u.aaSoft = gl.getUniformLocation(this.program, 'uAASoft');
    this.u.breathe = gl.getUniformLocation(this.program, 'uBreathe');
    this.sim = new LavaSim();
    this.simClock = 0;
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);
  }
  LavaLampLayer.prototype.resize = function () {
    var gl = this.gl;
    var dpr = Math.min((global.devicePixelRatio || 1), 1.5);
    var q = 0.9;
    var w = Math.max(1, Math.floor(this.canvas.clientWidth * dpr * q));
    var h = Math.max(1, Math.floor(this.canvas.clientHeight * dpr * q));
    if (this.canvas.width === w && this.canvas.height === h) {
      return;
    }
    this.canvas.width = w;
    this.canvas.height = h;
    gl.viewport(0, 0, w, h);
    this.sim.reset(w, h);
  };
  LavaLampLayer.prototype.setUniform1f = function (loc, v) {
    if (loc) this.gl.uniform1f(loc, v);
  };
  LavaLampLayer.prototype.render = function (tSec, p) {
    var gl = this.gl;
    var dt = this.simClock > 0 ? Math.min(0.04, (tSec - this.simClock) / 1000) : 0;
    this.simClock = tSec;
    this.sim.setWallRadiusForSizeScale(p.sizeScale);
    this.sim.step(dt, tSec * 0.001, p.cpuMotion);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.program);
    gl.enableVertexAttribArray(0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    this.setUniform1f(this.u.time, tSec * 0.001);
    if (this.u.res) {
      gl.uniform2f(this.u.res, gl.canvas.width, gl.canvas.height);
    }
    this.setUniform1f(this.u.morph, p.morph);
    this.setUniform1f(this.u.sizeScale, p.sizeScale);
    this.setUniform1f(this.u.merge, p.merge);
    this.setUniform1f(this.u.edgeWave, p.edgeWave);
    this.setUniform1f(this.u.axisPuff, p.axisPuff);
    this.setUniform1f(this.u.detail, p.detail);
    this.setUniform1f(this.u.rim, p.whiteRim);
    this.setUniform1f(this.u.aaSoft, p.aaSoft);
    this.setUniform1f(this.u.breathe, p.breathe);
    for (var i = 0; i < 5; i++) {
      var l = this.u.c[i];
      if (l) {
        var j = i * 2;
        gl.uniform2f(l, this.sim.p[j], this.sim.p[j + 1]);
      }
    }
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };
  LavaLampLayer.prototype.destroy = function () {
    var gl = this.gl;
    gl.deleteBuffer(this.buf);
    gl.deleteProgram(this.program);
    gl.deleteShader(this.vs);
    gl.deleteShader(this.fs);
  };

  var DEFAULT = {
    morph: 0.49,
    sizeScale: 0.44,
    merge: 0.61,
    edgeWave: 0.72,
    axisPuff: 0.71,
    detail: 0.65,
    whiteRim: 1.5,
    cpuMotion: 0.69,
    aaSoft: 0.59,
    breathe: 0.64
  };

  function mount(canvas, getParams) {
    var layer = new LavaLampLayer(canvas);
    var t0 = global.performance.now();
    var raf = 0;
    var ro = new global.ResizeObserver(function () {
      try {
        layer.resize();
      } catch (e) {}
    });
    ro.observe(canvas);
    function loop(now) {
      try {
        layer.render(now - t0, getParams());
      } catch (e) {}
      raf = global.requestAnimationFrame(loop);
    }
    var done = false;
    try {
      layer.resize();
    } catch (e) {}
    raf = global.requestAnimationFrame(loop);
    return function unmount() {
      if (done) return;
      done = true;
      global.cancelAnimationFrame(raf);
      ro.disconnect();
      try {
        layer.destroy();
      } catch (e) {}
    };
  }

  function buildCopyText(values) {
    var json = JSON.stringify(values, null, 2);
    return [
      'Liquid (metaball) layer — parameters to keep:',
      '',
      json,
      '',
      'Meaning: morph=overall undulation; sizeScale=rendered SDF scale (1.0=full; <1=smaller);',
      'merge=smooth-union width; edgeWave/axisPuff/detail=rim vs lobe bulge vs fine ripples;',
      'whiteRim=ice band; cpuMotion=CPU Liss wobble; aaSoft=AA; breathe=expand/compress on morph.',
      '',
      'Embed (after adding lava-liquid.js next to your page):',
      '<script src="lava-liquid.js"><\\/script>',
      '<canvas id="ov-liquid" style="width:100%;min-height:240px;display:block" width="400" height="300"><\\/canvas>',
      '<script>',
      '  (function () {',
      '    var p = ' + json + ';',
      '    var c = document.getElementById("ov-liquid");',
      '    if (!c || !window.OVLava) return;',
      '    OVLava.mount(c, function () { return p; });',
      '  })();',
      '<\\/script>'
    ].join(String.fromCharCode(10));
  }

  global.OVLava = {
    mount: mount,
    DEFAULT: DEFAULT,
    buildCopyText: buildCopyText,
    LavaLampLayer: LavaLampLayer
  };
})(
  typeof window !== 'undefined' ? window : this
);
`;

fs.writeFileSync(path.join(__dirname, '../public/js/lava-liquid.js'), head + tail, 'utf8');
console.log('Wrote', path.join(__dirname, '../public/js/lava-liquid.js'));