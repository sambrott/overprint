document.addEventListener('DOMContentLoaded', function () {
  initBeatPreview();
  initFilters();

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
      applyTheme(input.checked);
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
    /** Show “OVERPRINT” in the nav only on the home dashboard, after .header-title has scrolled out of view. */
    function updateNavHomeWordVisible() {
      var dash = document.getElementById('dashboard');
      var title = document.querySelector('#dashboard .header-title');
      var show = false;
      if (dash && !dash.classList.contains('is-hidden') && title) {
        var r = title.getBoundingClientRect();
        show = r.bottom <= 0;
      }
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
