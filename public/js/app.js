document.addEventListener('DOMContentLoaded', function () {
  initBeatPreview();
  initFilters();

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
  var navAbout = document.querySelector('.nav-about');
  if (navAbout) {
    navAbout.addEventListener('click', function () {
      window.location.hash = '#/about';
    });
  }

  document.querySelectorAll('.tool-card[data-slug]').forEach(function (card) {
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

  initRouter();
});
