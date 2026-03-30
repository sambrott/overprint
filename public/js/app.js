document.addEventListener('DOMContentLoaded', function () {
  initBeatPreview();
  initFilters();
  initAvatarCardPreview();

  (function initThemeToggle() {
    var root = document.documentElement;
    var meta = document.getElementById('ov-meta-theme');
    var input = document.getElementById('ov-theme-toggle');
    if (!input) return;
    function applyTheme(isLight) {
      root.classList.toggle('theme-light', isLight);
      input.checked = isLight;
      input.setAttribute('aria-checked', isLight ? 'true' : 'false');
      try {
        localStorage.setItem('overprint-theme', isLight ? 'light' : 'dark');
      } catch (e) {}
      if (meta) {
        meta.setAttribute('content', isLight ? '#e2e5ee' : '#08080c');
      }
    }
    applyTheme(root.classList.contains('theme-light'));
    input.addEventListener('change', function () {
      var next = input.checked;
      function go() {
        applyTheme(next);
      }
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        go();
        return;
      }
      if (typeof document.startViewTransition === 'function') {
        document.startViewTransition(go);
      } else {
        go();
      }
    });
  })();

  var navHome = document.querySelector('.nav-left');
  if (navHome) {
    navHome.setAttribute('tabindex', '0');
    navHome.setAttribute('role', 'link');
    navHome.setAttribute('aria-label', 'Overprint home');
    function goHome() {
      window.location.hash = '#/';
    }
    navHome.addEventListener('click', goHome);
    navHome.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        goHome();
      }
    });
  }

  (function initNavHomeWordReveal() {
    var navLeft = document.querySelector('.nav-left');
    if (!navLeft) return;
    /** True when a tool page is open (#/tools/:slug, not #/tools alone). */
    function isToolRoute() {
      var h = window.location.hash || '';
      return /^#\/tools\/.+/.test(h);
    }
    /** Show “OVERPRINT” in the nav on tool pages (always), or on the home dashboard after .header-title has scrolled out of view. */
    function updateNavHomeWordVisible() {
      var dash = document.getElementById('dashboard');
      var title = document.querySelector('#dashboard .header-title');
      var onTool = isToolRoute();
      var show = onTool;
      if (!show && dash && !dash.classList.contains('is-hidden') && title) {
        var r = title.getBoundingClientRect();
        show = r.bottom <= 0;
      }
      navLeft.classList.toggle('nav-tool-active', onTool);
      navLeft.classList.toggle('nav-home-word-visible', show);
    }
    window.addEventListener('scroll', updateNavHomeWordVisible, { passive: true });
    window.addEventListener('resize', updateNavHomeWordVisible);
    window.addEventListener('hashchange', updateNavHomeWordVisible);
    var dash = document.getElementById('dashboard');
    if (dash && typeof MutationObserver !== 'undefined') {
      new MutationObserver(updateNavHomeWordVisible).observe(dash, {
        attributes: true,
        attributeFilter: ['class'],
      });
    }
    updateNavHomeWordVisible();
    requestAnimationFrame(function () {
      requestAnimationFrame(updateNavHomeWordVisible);
    });
  })();
  var navAbout = document.querySelector('.nav-about');
  if (navAbout) {
    navAbout.addEventListener('click', function () {
      window.location.hash = '#/about';
    });
  }

  Array.prototype.forEach.call(document.querySelectorAll('.tool-card[data-slug]'), function (card) {
    card.addEventListener('click', function () {
      var slug = card.getAttribute('data-slug');
      if (slug) window.location.hash = '#/tools/' + slug;
    });
    card.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        var slug = card.getAttribute('data-slug');
        if (slug) window.location.hash = '#/tools/' + slug;
      }
    });
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'link');
  });

  function initAvatarCardPreview() {
    var AP = typeof OVAvatarPixel !== 'undefined' ? OVAvatarPixel : null;
    if (!AP) return;
    var canvas = document.querySelector('.tool-card[data-slug="avatar-generator"] .p-av-canvas');
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    var styles = AP.STYLES;
    var seeds = [0x9e3779b1, 0xdeadbeef, 0xcafebabe, 0xabcdef01];
    function mulberry32(a) {
      return function () {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        var t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }
    function renderAt(i) {
      var rnd = mulberry32(seeds[i]);
      AP.draw(ctx, styles[i], rnd);
    }
    var idx = 0;
    renderAt(0);
    var card = canvas.closest('.tool-card');
    if (!card) return;
    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var canHover = !window.matchMedia || window.matchMedia('(hover: hover)').matches;
    if (reduceMotion || !canHover) return;
    var tick = null;
    function onEnter() {
      idx = 0;
      renderAt(0);
      if (tick) clearInterval(tick);
      tick = setInterval(function () {
        idx = (idx + 1) % styles.length;
        renderAt(idx);
      }, 100);
    }
    function onLeave() {
      if (tick) {
        clearInterval(tick);
        tick = null;
      }
      idx = 0;
      renderAt(0);
    }
    card.addEventListener('mouseenter', onEnter);
    card.addEventListener('mouseleave', onLeave);
  }

  try {
    initRouter();
  } catch (err) {
    console.error('Overprint: initRouter failed', err);
    var banner = document.getElementById('ov-fatal');
    if (banner) {
      banner.hidden = false;
      banner.textContent =
        'App failed to start: ' +
        (err && err.message ? err.message : String(err)) +
        '. Open the browser console (F12) for details.';
    }
  }
});
