function initFilters() {
  var chips = document.querySelectorAll('.filter-chip');
  var cards = document.querySelectorAll('#dashboard .tool-card');
  var countEl = document.getElementById('toolCount');
  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      chips.forEach(function (c) { c.classList.remove('active'); });
      chip.classList.add('active');
      var f = chip.dataset.cat;
      var vis = 0;
      cards.forEach(function (card) {
        var show = f === 'all' || card.dataset.cat === f;
        card.style.display = show ? '' : 'none';
        if (show) vis++;
      });
      if (countEl) countEl.textContent = String(vis);
    });
  });
}
