/**
 * Lava lamp (stripe swirl) — WebGL1, adapted from the sambrott.com lvol banner shader.
 * Full-frame animated bands only: no center “blue box” (blueBg + mix removed). Colors are uniforms.
 */
(function (global) {
  'use strict';

  /* Cream / orange / blue bands: light paper (K+Y), --M, --C (Overprint CMYK-inspired, sRGB) */
  var DEFAULTS = {
    u_freq: 1.38,
    u_warp: 5.4,
    u_scale: 1.35,
    u_cross: 0.4,
    u_angle: 0.8,
    u_speed: 0.19,
    u_wspeed: 0.155,
    u_cw: 0.12,
    u_ow: 0.235,
    u_bor: 0.44,
    u_cream: [0.94, 0.92, 0.88],
    u_orange: [224 / 255, 64 / 255, 160 / 255],
    u_blue: [0, 180 / 255, 216 / 255]
  };

  var FLOAT_KEYS = [
    'u_freq',
    'u_warp',
    'u_scale',
    'u_cross',
    'u_angle',
    'u_speed',
    'u_wspeed',
    'u_cw',
    'u_ow',
    'u_bor'
  ];
  var VEC3_KEYS = ['u_cream', 'u_orange', 'u_blue'];

  var VS =
    'attribute vec2 p;varying vec2 uv;void main(){ uv=p*.5+.5; gl_Position=vec4(p,0,1); }';

  var FS = [
    'precision highp float;',
    'varying vec2 uv;',
    'uniform float t;',
    'uniform vec2  res;',
    'uniform float u_freq,u_warp,u_scale,u_cross,u_angle,u_speed,u_wspeed;',
    'uniform float u_cw,u_ow,u_bor;',
    'uniform vec3 u_cream,u_orange,u_blue;',
    'vec2 hash2(vec2 p){',
    '  p=vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3)));',
    '  return fract(sin(p)*43758.5453);',
    '}',
    'float vnoise(vec2 p){',
    '  vec2 i=floor(p),f=fract(p),u=f*f*(3.-2.*f);',
    '  float a=dot(hash2(i),          f-vec2(0,0));',
    '  float b=dot(hash2(i+vec2(1,0)),f-vec2(1,0));',
    '  float cc=dot(hash2(i+vec2(0,1)),f-vec2(0,1));',
    '  float d=dot(hash2(i+vec2(1,1)),f-vec2(1,1));',
    '  return mix(mix(a,b,u.x),mix(cc,d,u.x),u.y)*.5+.5;',
    '}',
    'vec3 swirlColor(vec2 q){',
    '  float ws=u_wspeed,s=u_scale;',
    '  vec2 w1=vec2(',
    '    vnoise(q*s+vec2(t*ws,        t*ws*.7)),',
    '    vnoise(q*s+vec2(t*ws*.7+4.7, t*ws+2.3))',
    '  );',
    '  vec2 w2=vec2(',
    '    vnoise(q*s+w1*1.9+vec2(t*ws*.6+8.2,t*ws*.8+1.4)),',
    '    vnoise(q*s+w1*1.9+vec2(t*ws*.8+3.1,t*ws*.6+7.9))',
    '  );',
    '  vec2 w3=vec2(',
    '    vnoise(q*s*1.8+w2*2.1+vec2(t*ws*.4+5.5,t*ws*.5+9.1)),',
    '    vnoise(q*s*1.8+w2*2.1+vec2(t*ws*.5+0.8,t*ws*.4+4.4))',
    '  );',
    '  float diag=q.x*u_angle+q.y*(2.0-u_angle);',
    '  float prim=diag+(w3.x-.5)*u_warp+(w3.y-.5)*u_warp*.85;',
    '  float cf=q.x*(2.0-u_angle)-q.y*u_angle;',
    '  float sec=cf+(w3.y-.5)*u_warp*.7+(w3.x-.5)*u_warp*.55;',
    '  float bm=vnoise(q*1.1+vec2(t*ws*.5,t*ws*.4));',
    '  float f=fract(mix(prim,sec*.8+prim*.2,bm*u_cross)*u_freq+t*u_speed);',
    '  float s1=u_cw;',
    '  float s2=s1+u_bor*(1.0-u_cw*3.0-u_ow);',
    '  float s3=s2+u_cw;',
    '  float s4=s3+u_ow;',
    '  float s5=s4+u_cw;',
    '  vec3 orange=u_orange;',
    '  vec3 blue  =u_blue;',
    '  vec3 cream =u_cream;',
    '  vec3 col;',
    '  if(f<s1)col=cream;',
    '  else if(f<s2)col=blue;',
    '  else if(f<s3)col=cream;',
    '  else if(f<s4)col=orange;',
    '  else if(f<s5)col=cream;',
    '  else col=blue;',
    '  float aa=0.008;',
    '  float ca=',
    '    (1.-smoothstep(s1-aa,s1+aa,f))+',
    '    smoothstep(s2-aa,s2+aa,f)*(1.-smoothstep(s3-aa,s3+aa,f))+',
    '    smoothstep(s4-aa,s4+aa,f)*(1.-smoothstep(s5-aa,s5+aa,f));',
    '  return mix(col,cream,clamp(ca,0.,1.)*.55);',
    '}',
    'void main(){',
    '  vec2 suv=vec2(uv.x,1.0-uv.y);',
    '  vec2 q=suv*vec2(res.x/res.y,1.0);',
    '  gl_FragColor=vec4(swirlColor(q),1.0);',
    '}'
  ].join('\n');

  function cloneDefaults() {
    return JSON.parse(JSON.stringify(DEFAULTS));
  }

  function create(host, options) {
    options = options || {};
    var getParams = options.getParams || function () {
      return DEFAULTS;
    };
    var capFps = options.maxFps;
    var minFrameMs = capFps ? 1000 / capFps : 0;
    var dprCap = options.maxDpr;
    var lastDraw = 0;

    var noop = function () {};
    if (!host) {
      return { destroy: noop };
    }

    var wrap = document.createElement('div');
    wrap.className = 'lava-lamp-gl-wrap';
    wrap.style.cssText = 'position:absolute;inset:0;overflow:hidden;';
    host.appendChild(wrap);

    var c = document.createElement('canvas');
    c.setAttribute('aria-hidden', 'true');
    c.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;display:block;';
    wrap.appendChild(c);

    var gl = c.getContext('webgl', { alpha: false, antialias: true });
    if (!gl) {
      wrap.textContent = 'WebGL not available';
      return { destroy: noop };
    }
    gl.disable(gl.DEPTH_TEST);

    function mk(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        if (global.console) console.error(gl.getShaderInfoLog(s));
        return null;
      }
      return s;
    }
    var prog = gl.createProgram();
    var vsh = mk(gl.VERTEX_SHADER, VS);
    var fsh = mk(gl.FRAGMENT_SHADER, FS);
    if (!vsh || !fsh) {
      return { destroy: noop };
    }
    gl.attachShader(prog, vsh);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      if (global.console) console.error(gl.getProgramInfoLog(prog));
      return { destroy: noop };
    }
    gl.useProgram(prog);

    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    );
    var aloc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(aloc);
    gl.vertexAttribPointer(aloc, 2, gl.FLOAT, false, 0, 0);

    var uT = gl.getUniformLocation(prog, 't');
    var uRes = gl.getUniformLocation(prog, 'res');
    var ULf = {};
    var ULv = {};
    var i;
    for (i = 0; i < FLOAT_KEYS.length; i++) {
      ULf[FLOAT_KEYS[i]] = gl.getUniformLocation(prog, FLOAT_KEYS[i]);
    }
    for (i = 0; i < VEC3_KEYS.length; i++) {
      ULv[VEC3_KEYS[i]] = gl.getUniformLocation(prog, VEC3_KEYS[i]);
    }

    function applyAll(p) {
      var k;
      for (k in ULf) {
        if (ULf[k] && p[k] != null) {
          gl.uniform1f(ULf[k], +p[k]);
        }
      }
      for (k in ULv) {
        if (ULv[k] && p[k] && p[k].length === 3) {
          gl.uniform3f(ULv[k], p[k][0], p[k][1], p[k][2]);
        }
      }
    }

    var lastW = 0;
    var lastH = 0;
    var lastBufW = 0;
    var lastBufH = 0;
    var ro;
    var resizeDebounce = null;
    var dead = false;
    var raf = 0;

    function applySize() {
      var W = wrap.offsetWidth | 0;
      var H = wrap.offsetHeight | 0;
      if (W < 2 || H < 2) return;
      if (W === lastW && H === lastH) return;
      lastW = W;
      lastH = H;
      var dpr = Math.min(global.devicePixelRatio || 1, dprCap != null ? dprCap : 2);
      var bw = Math.max(1, Math.round(W * dpr));
      var bh = Math.max(1, Math.round(H * dpr));
      c.width = bw;
      c.height = bh;
      gl.viewport(0, 0, bw, bh);
      lastBufW = bw;
      lastBufH = bh;
    }

    function scheduleResize() {
      if (resizeDebounce) clearTimeout(resizeDebounce);
      resizeDebounce = setTimeout(function () {
        resizeDebounce = null;
        applySize();
      }, 100);
    }

    applySize();
    ro = new global.ResizeObserver(scheduleResize);
    ro.observe(wrap);
    global.addEventListener('resize', scheduleResize, { passive: true });

    var start = null;
    var visIo;
    var visible = true;
    if (options.pauseWhenNotVisible) {
      visIo = new global.IntersectionObserver(
        function (ents) {
          if (!ents.length) return;
          visible = !!ents[0].isIntersecting;
        },
        { root: options.visibilityRoot || null, rootMargin: '32px', threshold: 0 }
      );
      visIo.observe(wrap);
    }

    function loop(ts) {
      raf = global.requestAnimationFrame(loop);
      if (dead) return;
      if (visIo && !visible) {
        return;
      }
      if (minFrameMs && ts - lastDraw < minFrameMs) {
        return;
      }
      lastDraw = ts;
      if (!start) start = ts;
      var p = getParams();
      if (p) {
        applyAll(p);
      }
      gl.uniform1f(uT, (ts - start) / 1000);
      if (lastBufW >= 2 && lastBufH >= 2) {
        gl.uniform2f(uRes, lastBufW, lastBufH);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
    }
    raf = global.requestAnimationFrame(loop);

    function destroy() {
      if (dead) return;
      dead = true;
      if (raf) global.cancelAnimationFrame(raf);
      raf = 0;
      if (visIo) {
        try {
          visIo.disconnect();
        } catch (e) {}
        visIo = null;
      }
      try {
        ro.disconnect();
      } catch (e) {}
      global.removeEventListener('resize', scheduleResize, { passive: true });
      if (resizeDebounce) clearTimeout(resizeDebounce);
      if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
    }

    return { destroy: destroy };
  }

  var api = { create: create, DEFAULTS: DEFAULTS, cloneDefaults: cloneDefaults };
  global.OVLavaLamp = api;
  global.OVLvolBanner = api;
})(
  typeof window !== 'undefined' ? window : this
);
