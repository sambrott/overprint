function initFilters() {
  var chips = document.querySelectorAll('.filter-chip');
  var cards = document.querySelectorAll('#dashboard .tool-card');
  var countEl = document.getElementById('toolCount');
  Array.prototype.forEach.call(chips, function (chip) {
    chip.addEventListener('click', function () {
      Array.prototype.forEach.call(chips, function (c) {
        c.classList.remove('active');
      });
      chip.classList.add('active');
      var f = chip.dataset.cat;
      var vis = 0;
      Array.prototype.forEach.call(cards, function (card) {
        var show = f === 'all' || card.dataset.cat === f;
        card.style.display = show ? '' : 'none';
        if (show) vis++;
      });
      if (countEl) countEl.textContent = String(vis);
    });
  });
}
