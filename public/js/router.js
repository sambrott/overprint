/* Hash SPA: #/ #/tools #/about #/tools/:slug — smooth route transitions */
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
  container.querySelectorAll('[data-back]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      window.location.hash = '#/';
    });
  });
}

function routeDurationMs() {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 0;
  return 420;
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

  try {
    if (route.type === 'about') {
      var res = await fetch('about.html');
      html = await res.text();
      titleSuffix = 'About — Overprint';
    } else if (route.type === 'tool') {
      var tres = await fetch('tools/' + route.slug + '.html');
      if (!tres.ok) throw new Error('not found');
      html = await tres.text();
      var tmp = document.createElement('div');
      tmp.innerHTML = html;
      var nameEl = tmp.querySelector('.tool-header-name');
      titleSuffix = (nameEl ? nameEl.textContent.trim() : route.slug) + ' — Overprint';
    }
  } catch (e) {
    html =
      '<div class="tool-page"><div class="tool-header"><button type="button" class="back-btn" data-back>← Back</button><div class="tool-header-info"><h1 class="tool-header-name">Not found</h1></div></div><p class="tool-placeholder">This tool page is missing or could not be loaded. Use a local server (see README).</p></div>';
    titleSuffix = 'Not found — Overprint';
  }

  if (myGen !== routeGeneration) return;

  pageView.classList.remove('route-leave-to');
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
  routeFirstBoot = false;
}

function initRouter() {
  window.addEventListener('hashchange', renderRoute);
  renderRoute();
}
