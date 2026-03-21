/* Beat maker card preview — same grid pattern as original inline script */
function initBeatPreview() {
  var ba = document.getElementById('beatAnim');
  if (!ba) return;
  var g = document.createElement('div');
  g.className = 'p-beats';
  g.style.cssText =
    'display:grid;grid-template-columns:repeat(8,1fr);grid-template-rows:repeat(3,1fr);gap:3px;padding:20px 14px 8px;height:100%;position:relative';
  var pat = [1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1];
  var cls = ['on-y', 'on-m', 'on-c'];
  for (var i = 0; i < 24; i++) {
    var b = document.createElement('div');
    b.className = 'p-bt' + (pat[i] ? ' on ' + cls[Math.floor(i / 8)] : '');
    g.appendChild(b);
  }
  var cur = document.createElement('div');
  cur.className = 'p-btc';
  g.appendChild(cur);
  ba.appendChild(g);
}
