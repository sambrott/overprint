/**
 * Lava (metaball) WebGL2 layer from Aurora screensaver — liquid only, no background shader.
 * Source: abstract-glassy-shader.tsx (kept in sync via scripts/build-lava-liquid.cjs)
 */
(function (global) {
  'use strict';

  var VERT = `#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;
  var FRAG = `#version 300 es
precision highp float;
uniform float time;
uniform vec2 resolution;
uniform vec2 uC0, uC1, uC2, uC3, uC4;
uniform float uMorph;
uniform float uSizeScale;
uniform float uMerge;
uniform float uEdgeWave;
uniform float uAxisPuff;
uniform float uDetail;
uniform float uRim;
uniform float uAASoft;
// Pulsing expand / compress: isotropic + wobble envelope (0 = off)
uniform float uBreathe;
uniform vec3 uBodyTint;
uniform vec3 uRimTint;
out vec4 fragColor;

void fusionSpread(float t, out float kOut, out float spreadOut) {
  float g = mix(0.2, 0.48, clamp(uMerge, 0.0, 1.0)) + 0.02 * sin(t * 0.3 + 0.2);
  kOut = g;
  spreadOut = 1.0;
}

float opSmoothUnion(float d1, float d2, float k) {
  float h = clamp(0.5 + 0.5 * (d2 - d1) / k, 0.0, 1.0);
  return mix(d2, d1, h) - k * h * (1.0 - h);
}

mat2 mrot(float a) { float s = sin(a), c = cos(a); return mat2(c, -s, s, c); }

float sdMetaball(vec2 p, vec2 ctr, vec2 ax, float rot, float t, float ph) {
  vec2 q = mrot(-rot) * (p - ctr);
  vec2 qn = q / max(ax, vec2(1e-4));
  float rp = length(qn);
  float th = atan(qn.y, qn.x);
  float ew = clamp(uEdgeWave, 0.0, 1.0);
  float um = clamp(uMorph, 0.0, 1.0);
  float mBody = (0.12 + 0.9 * um) * (0.2 + 0.85 * ew) * 2.0;
  float mm = 1.0 + 1.4 * mBody;
  float tw = 1.0 + 0.6 * mBody;
  float w0 = 0.032 * mm * sin(2.0 * th + t * 0.48 * tw + ph);
  float w1 = 0.024 * mm * sin(1.3 * th - t * 0.4 * tw + ph * 0.8);
  float w2 = 0.014 * mm * sin(0.7 * th + 0.28 * sin(t * (0.22 + 0.3 * mBody) + ph * 0.25));
  float det = clamp(uDetail, 0.0, 1.0);
  float w3 = (0.01 + 0.022 * det) * mBody * sin(2.3 * th + 2.0 * ph + t * 0.62);
  float B = clamp(uBreathe, 0.0, 1.0);
  // Envelope + isotropic: time-only (shared across lobes) so smooth-union doesn’t kink
  float e1 = 0.5 + 0.5 * sin(t * 0.2);
  float e2 = 0.5 + 0.5 * sin(t * 0.32);
  float e3 = 0.5 + 0.5 * sin(t * 0.11);
  float e4 = 0.5 + 0.5 * sin(t * 0.27);
  float env = (e1 * e2 + e3 * e4) * 0.5;
  float qW = 1.0 - 0.38 * B * (1.0 - env);
  float sumW = w0 + w1 + w2 + w3;
  sumW *= qW;
  float sIso = 0.16 + 0.84 * clamp(um, 0.0, 1.0);
  // All-t only: one coherent radial pulse; tiny ph wiggle keeps it from static moiré
  float iso = 0.028 * B * sIso * (
    0.5 * sin(t * 0.22) +
    0.38 * sin(t * 0.095) +
    0.22 * sin(t * 0.165 + 0.12 * ph)
  );
  return (rp - 1.0 - sumW + iso) * min(ax.x, ax.y);
}

const float TSCALE = 0.7;

void metaballState(
  in float t,
  in float sp,
  in vec2 c0, in vec2 c1, in vec2 c2, in vec2 c3, in vec2 c4,
  out vec2 p0, out vec2 p1, out vec2 p2, out vec2 p3, out vec2 p4,
  out vec2 a0, out vec2 a1, out vec2 a2, out vec2 a3, out vec2 a4,
  out float r0, out float r1, out float r2, out float r3, out float r4
) {
  float s = t * TSCALE;
  p0 = c0 * sp; p1 = c1 * sp; p2 = c2 * sp; p3 = c3 * sp; p4 = c4 * sp;
  vec2 b0 = vec2(0.2, 0.144);
  vec2 b1 = vec2(0.165, 0.118);
  vec2 b2 = vec2(0.14, 0.102);
  vec2 b3 = vec2(0.123, 0.094);
  vec2 b4 = vec2(0.115, 0.082);
  float um = clamp(uMorph, 0.0, 1.0);
  float ap = clamp(uAxisPuff, 0.0, 1.0);
  float mA = (0.15 + 0.9 * um) * (0.2 + 0.85 * ap);
  float kx = 0.4 * (1.0 + 1.0 * mA);
  a0 = b0 * (vec2(1.0) + kx * vec2(sin(s * 0.6 + 0.1 + 0.2 * mA),  sin(s * 0.7 + 0.7 - 0.12 * mA)));
  a1 = b1 * (vec2(1.0) + kx * vec2(sin(s * 0.6 + 2.0 + 0.3 * mA),  sin(s * 0.65 + 1.0 + 0.1 * mA)));
  a2 = b2 * (vec2(1.0) + kx * vec2(sin(s * 0.62 + 2.4 - 0.08 * mA),  sin(s * 0.6 + 3.0 + 0.18 * mA)));
  a3 = b3 * (vec2(1.0) + 0.86 * kx * vec2(sin(s * 0.6 + 4.0 + 0.12 * mA),  sin(s * 0.7 + 2.5 - 0.08 * mA)));
  a4 = b4 * (vec2(1.0) + kx * vec2(sin(s * 0.6 + 0.2 + 0.2 * mA),  sin(s * 0.6 + 5.0 + 0.1 * mA)));
  // One shared lobe “breath” (same t phase for all) → no seam at smooth-union joins
  float Br = clamp(uBreathe, 0.0, 1.0) * 0.11;
  float pAll = 1.0 + Br * sin(s * 0.45);
  a0 *= pAll; a1 *= pAll; a2 *= pAll; a3 *= pAll; a4 *= pAll;
  r0 = s * 0.15 + 0.55; r1 = -s * 0.2 + 1.5; r2 =  s * 0.2 + 2.2; r3 = -s * 0.18 + 2.0; r4 =  s * 0.22 + 0.9;
}

float scene(vec2 uv, float t) {
  float d = 1e9;
  float kf, sp;
  fusionSpread(t, kf, sp);
  vec2 p0, p1, p2, p3, p4, a0, a1, a2, a3, a4;
  float r0, r1, r2, r3, r4;
  metaballState(t, sp, uC0, uC1, uC2, uC3, uC4, p0, p1, p2, p3, p4, a0, a1, a2, a3, a4, r0, r1, r2, r3, r4);
  d = opSmoothUnion(d, sdMetaball(uv, p0, a0, r0, t, 0.0), kf);
  d = opSmoothUnion(d, sdMetaball(uv, p1, a1, r1, t, 1.3), kf);
  d = opSmoothUnion(d, sdMetaball(uv, p2, a2, r2, t, 2.6), kf);
  d = opSmoothUnion(d, sdMetaball(uv, p3, a3, r3, t, 3.8), kf);
  d = opSmoothUnion(d, sdMetaball(uv, p4, a4, r4, t, 5.1), kf);
  return d;
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * resolution.xy) / resolution.y;
  float t = time;
  float S = clamp(uSizeScale, 0.25, 0.85);
  float d = S * scene(uv / S, t);
  float b = clamp(uBreathe, 0.0, 1.0);
  float sPx = (0.48 + 0.15 * b) / min(resolution.x, resolution.y);
  if (abs(d) < 0.13) {
    // 5-tap box on d: stabilizes fwidth/derivs when the surface breathes
    d = (d
      + S * scene((uv + vec2(sPx, 0.0)) / S, t)
      + S * scene((uv + vec2(-sPx, 0.0)) / S, t)
      + S * scene((uv + vec2(0.0, sPx)) / S, t)
      + S * scene((uv + vec2(0.0, -sPx)) / S, t)
    ) * 0.2;
  }
  float gL = max(length(vec2(dFdx(d), dFdy(d))), 1e-5);
  float as = clamp(uAASoft, 0.0, 1.0);
  float nRes = 1.0 / min(resolution.x, resolution.y);
  float minAA = nRes * (2.15 + 1.0 * as + 0.5 * b);
  float edgeW = 3.55 * (1.0 + 0.2 * b) * gL + minAA;
  float fill = 1.0 - smoothstep(0.0, edgeW, d);
  float rim = exp(-12.0 * d * d) * smoothstep(0.16, 0.0, d);
  float spec = exp(-58.0 * d * d) * smoothstep(0.055, 0.0, d);

  float rw = max(0.0, uRim);
  vec3 vary = 0.5 + 0.5 * cos(t * 0.4 + vec3(0.0, 2.0, 4.0));
  vec3 bodyCol = mix(uBodyTint, vary, 0.18);
  vec3 fillRgb = bodyCol * fill;
  vec3 edge = rw * uRimTint * (rim * 0.95 + spec * 0.7);
  vec3 rgb = fillRgb + edge;
  float alpha = min(0.96, 0.9 * fill + 0.52 * rw * (rim + spec));
  fragColor = vec4(rgb, alpha);
}
`;
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
    this.u.bodyTint = gl.getUniformLocation(this.program, 'uBodyTint');
    this.u.rimTint = gl.getUniformLocation(this.program, 'uRimTint');
    this.sim = new LavaSim();
    this.simClock = 0;
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);
  }
  LavaLampLayer.prototype.resize = function () {
    var gl = this.gl;
    var dpr = Math.min(global.devicePixelRatio || 1, this._dprMax != null ? this._dprMax : 1.5);
    var q = this._qualityQ != null ? this._qualityQ : 0.9;
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
    if (this.u.bodyTint && p.bodyTint && p.bodyTint.length === 3) {
      gl.uniform3f(this.u.bodyTint, p.bodyTint[0], p.bodyTint[1], p.bodyTint[2]);
    }
    if (this.u.rimTint && p.rimTint && p.rimTint.length === 3) {
      gl.uniform3f(this.u.rimTint, p.rimTint[0], p.rimTint[1], p.rimTint[2]);
    }
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

  /* body = --C, rim = --Y (Overprint CMY palette, sRGB) */
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
    breathe: 0.64,
    bodyTint: [0, 180 / 255, 216 / 255],
    rimTint: [240 / 255, 208 / 255, 32 / 255]
  };

  function mount(canvas, getParams, mountOpts) {
    mountOpts = mountOpts || {};
    var layer = new LavaLampLayer(canvas);
    if (mountOpts.maxDpr != null) {
      layer._dprMax = mountOpts.maxDpr;
    }
    if (mountOpts.qualityScale != null) {
      layer._qualityQ = mountOpts.qualityScale;
    }
    var t0 = global.performance.now();
    var raf = 0;
    var ro = new global.ResizeObserver(function () {
      try {
        layer.resize();
      } catch (e) {}
    });
    ro.observe(canvas);
    var minFrameMs = mountOpts.maxFps ? 1000 / mountOpts.maxFps : 0;
    var lastDraw = 0;
    var io;
    var visible = true;
    if (mountOpts.pauseWhenNotVisible) {
      io = new global.IntersectionObserver(
        function (ents) {
          if (!ents.length) return;
          visible = !!ents[0].isIntersecting;
        },
        { root: mountOpts.visibilityRoot || null, rootMargin: '32px', threshold: 0 }
      );
      io.observe(canvas);
    }
    var hoverGating = null;
    var useHoverGating = false;
    if (mountOpts.hoverTarget && global.document && global.document.addEventListener) {
      useHoverGating = true;
      var htEl = mountOpts.hoverTarget;
      hoverGating = { el: htEl, on: false };
      hoverGating._in = function () {
        hoverGating.on = true;
      };
      hoverGating._out = function () {
        hoverGating.on = false;
      };
      if (global.window && global.window.PointerEvent) {
        htEl.addEventListener('pointerenter', hoverGating._in);
        htEl.addEventListener('pointerleave', hoverGating._out);
      } else {
        htEl.addEventListener('mouseenter', hoverGating._in);
        htEl.addEventListener('mouseleave', hoverGating._out);
      }
    }
    var hoverBootFrame = useHoverGating;
    function loop(now) {
      raf = global.requestAnimationFrame(loop);
      if (!visible) {
        return;
      }
      if (useHoverGating) {
        if (!hoverBootFrame && !hoverGating.on) {
          return;
        }
      }
      if (minFrameMs && now - lastDraw < minFrameMs) {
        return;
      }
      lastDraw = now;
      try {
        layer.render(now - t0, getParams());
        if (useHoverGating && hoverBootFrame) {
          hoverBootFrame = false;
        }
      } catch (e) {}
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
      if (io) {
        try {
          io.disconnect();
        } catch (e) {}
        io = null;
      }
      if (hoverGating && hoverGating.el) {
        try {
          if (global.window && global.window.PointerEvent) {
            hoverGating.el.removeEventListener('pointerenter', hoverGating._in);
            hoverGating.el.removeEventListener('pointerleave', hoverGating._out);
          } else {
            hoverGating.el.removeEventListener('mouseenter', hoverGating._in);
            hoverGating.el.removeEventListener('mouseleave', hoverGating._out);
          }
        } catch (e) {}
        hoverGating = null;
      }
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
      'bodyTint=liquid fill (RGB 0-1); rimTint=edge highlight; whiteRim=ice band weight;',
      'cpuMotion=CPU Liss wobble; aaSoft=AA; breathe=expand/compress on morph.',
      '',
      'Embed (after adding lava-liquid.js next to your page):',
      '<script src="lava-liquid.js"><\/script>',
      '<canvas id="ov-liquid" style="width:100%;min-height:240px;display:block" width="400" height="300"><\/canvas>',
      '<script>',
      '  (function () {',
      '    var p = ' + json + ';',
      '    var c = document.getElementById("ov-liquid");',
      '    if (!c || !window.OVLava) return;',
      '    OVLava.mount(c, function () { return p; });',
      '  })();',
      '<\/script>'
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
