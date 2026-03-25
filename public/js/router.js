/* Hash SPA: #/ #/tools #/about #/tools/:slug — smooth route transitions */

/**
 * Folder that contains about.html + tools/ (the static root), derived from script URLs.
 * Using the page URL alone breaks when the server omits index.html or uses odd paths.
 */
function getOverprintStaticRoot() {
  var w = window;
  if (w.__OVERPRINT_BASE__ != null && String(w.__OVERPRINT_BASE__).trim() !== '') {
    return new URL(String(w.__OVERPRINT_BASE__).trim(), w.location.href).href;
  }
  var scripts = document.querySelectorAll('script[src]');
  var i;
  var src;
  for (i = scripts.length - 1; i >= 0; i--) {
    src = scripts[i].getAttribute('src');
    if (!src) continue;
    if (/\/(app\.js|router\.js|tools\.js|tool-utils\.js|filters\.js|beat-preview\.js)(\?|#|$)/i.test(src)) {
      var scriptAbs = new URL(src, w.location.href);
      return new URL('../', scriptAbs).href;
    }
  }
  return pageDirectoryHref(w.location.href.replace(/#.*$/, ''));
}

/** Directory containing the current HTML document (trailing slash), for fetch() bases. */
function pageDirectoryHref(pageHref) {
  try {
    var u = new URL(pageHref);
    var p = u.pathname;
    if (!p || p === '/') {
      u.pathname = '/';
    } else if (p.endsWith('/')) {
      /* keep */
    } else if (/\.html?$/i.test(p)) {
      u.pathname = p.replace(/\/[^/]+$/, '/') || '/';
    } else {
      u.pathname = (p.endsWith('/') ? p : p + '/') || '/';
    }
    u.hash = '';
    u.search = '';
    return u.href;
  } catch (e) {
    return pageHref;
  }
}

function fetchAppAsset(path) {
  var root = getOverprintStaticRoot();
  var rel = String(path || '').replace(/^\/+/, '');
  return fetch(new URL(rel, root));
}

function parseRoute() {
  var h = window.location.hash;
  var raw = h && h.length > 1 ? h.replace(/^#/, '') : '/';
  if (raw === '' || raw === '/' || raw === '/tools' || raw === '/tools/') return { type: 'home' };
  if (raw === '/about' || raw === '/about/') return { type: 'about' };
  var m = raw.match(/^\/tools\/([a-z0-9-]+)\/?$/);
  if (m) return { type: 'tool', slug: m[1] };
  return { type: 'home' };
}

function bindBackButtons(container) {
  if (!container) return;
  Array.prototype.forEach.call(container.querySelectorAll('[data-back]'), function (btn) {
    btn.addEventListener('click', function () {
      window.location.hash = '#/';
    });
  });
}

function routeDurationMs() {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 0;
  return 220;
}

function waitMs(ms) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}

function waitDoubleRaf() {
  return new Promise(function (resolve) {
    requestAnimationFrame(function () {
      requestAnimationFrame(resolve);
    });
  });
}

var routeGeneration = 0;
var routeFirstBoot = true;

async function renderRoute() {
  var myGen = ++routeGeneration;
  var dashboard = document.getElementById('dashboard');
  var pageView = document.getElementById('view-page');
  if (!dashboard || !pageView) return;

  dashboard.classList.remove('route-leave-to', 'route-enter-from');
  pageView.classList.remove('route-leave-to', 'route-enter-from');

  var route = parseRoute();
  var animate = !routeFirstBoot;
  var ms = routeDurationMs();

  if (route.type === 'home') {
    var hadSubPage = pageView.classList.contains('is-visible');

    if (hadSubPage) {
      if (animate && ms) {
        pageView.classList.add('route-leave-to');
        await waitMs(ms);
        if (myGen !== routeGeneration) return;
        pageView.classList.remove('route-leave-to');
      }
      if (window.OV && typeof window.OV.unmountTool === 'function') window.OV.unmountTool();
      pageView.innerHTML = '';
      pageView.classList.remove('is-visible');
    }

    dashboard.classList.remove('is-hidden');

    if (hadSubPage && animate && ms) {
      dashboard.classList.add('route-enter-from');
      await waitDoubleRaf();
      if (myGen !== routeGeneration) return;
      dashboard.classList.remove('route-enter-from');
    }

    document.title = 'Overprint';
    routeFirstBoot = false;
    return;
  }

  /* —— Subpage (about / tool) —— */
  var hadHome = !dashboard.classList.contains('is-hidden');
  var hadSubPage = pageView.classList.contains('is-visible');

  if (hadHome) {
    if (animate && ms) {
      dashboard.classList.add('route-leave-to');
      await waitMs(ms);
      if (myGen !== routeGeneration) return;
      dashboard.classList.remove('route-leave-to');
    }
    dashboard.classList.add('is-hidden');
  } else if (hadSubPage) {
    if (animate && ms) {
      pageView.classList.add('route-leave-to');
      await waitMs(ms);
      if (myGen !== routeGeneration) return;
    }
    /* keep route-leave-to until innerHTML swaps (avoids flash of old content) */
  } else {
    dashboard.classList.add('is-hidden');
  }

  if (route.type === 'tool' && route.slug === 'svg-optimizer') {
    try {
      history.replaceState(null, '', '#/tools/image-optimizer');
    } catch (e) {}
    route.slug = 'image-optimizer';
  }

  var html = '';
  var titleSuffix = 'Overprint';
  var routeContentOk = false;

  try {
    if (route.type === 'about') {
      var res = await fetchAppAsset('about.html');
      if (!res.ok) throw new Error('about fetch failed');
      html = await res.text();
      titleSuffix = 'About — Overprint';
      routeContentOk = true;
    } else if (route.type === 'tool') {
      var tres = await fetchAppAsset('tools/' + route.slug + '.html');
      if (!tres.ok) throw new Error('not found');
      html = await tres.text();
      var tmp = document.createElement('div');
      tmp.innerHTML = html;
      var nameEl = tmp.querySelector('.tool-header-name');
      titleSuffix = (nameEl ? nameEl.textContent.trim() : route.slug) + ' — Overprint';
      routeContentOk = true;
    } else {
      routeContentOk = true;
    }
  } catch (e) {
    console.error('Overprint route fetch:', e);
    html =
      '<div class="tool-page"><div class="tool-header"><div class="tool-header-main"><button type="button" class="back-btn" data-back aria-label="Back to tools"><span class="back-btn__glyph" aria-hidden="true">←</span><span class="back-btn__txt">Tools</span></button><div class="tool-header-info"><h1 class="tool-header-name">Not found</h1></div></div></div>' +
      '<div class="tool-interface"><p class="tool-placeholder">Could not load this page. If you opened <code>index.html</code> from disk (<code>file://</code>), use a local server instead:</p>' +
      '<pre class="tool-pre-wrap">cd public && python3 -m http.server 8080\n# then open http://localhost:8080/#/</pre>' +
      '<p class="tool-placeholder">Also check the browser console for network errors.</p></div></div>';
    titleSuffix = 'Not found — Overprint';
  }

  if (myGen !== routeGeneration) return;

  pageView.classList.remove('route-leave-to');
  if (window.OV && typeof window.OV.unmountTool === 'function') window.OV.unmountTool();
  pageView.innerHTML = html;
  pageView.classList.add('is-visible');

  if (animate && ms) {
    pageView.classList.add('route-enter-from');
    await waitDoubleRaf();
    if (myGen !== routeGeneration) return;
    pageView.classList.remove('route-enter-from');
  }

  document.title = titleSuffix;
  bindBackButtons(pageView);
  if (
    route.type === 'tool' &&
    routeContentOk &&
    window.OV &&
    typeof window.OV.mountTool === 'function'
  ) {
    window.OV.mountTool(route.slug, pageView);
  }
  routeFirstBoot = false;
}

function initRouter() {
  var h = window.location.hash;
  if (!h || h === '#') {
    window.location.hash = '#/';
  }
  function runRoute() {
    return renderRoute().catch(function (err) {
      console.error('Overprint: route error', err);
    });
  }
  window.addEventListener('hashchange', runRoute);
  runRoute();
}
