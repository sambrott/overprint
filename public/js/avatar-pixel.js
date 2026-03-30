/* Shared pixel avatar drawing (dashboard card preview + Avatar Generator tool). */
(function (global) {
  var GRID = 16;
  var CANVAS = 320;

  function P(ctx, cell, c, r, color) {
    ctx.fillStyle = color;
    ctx.fillRect(c * cell, r * cell, cell, cell);
  }

  function mirror(ctx, cell, c, r, color) {
    P(ctx, cell, c, r, color);
    P(ctx, cell, GRID - 1 - c, r, color);
  }

  function drawIdenticon(ctx, cell, rnd) {
    var hue = Math.floor(rnd() * 360);
    var j;
    var i;
    for (j = 0; j < GRID; j++) {
      for (i = 0; i < GRID / 2; i++) {
        if (rnd() > 0.5) {
          mirror(
            ctx,
            cell,
            i,
            j,
            'hsl(' + hue + ',' + (38 + rnd() * 45) + '%,' + (32 + rnd() * 38) + '%)'
          );
        }
      }
    }
  }

  function drawFace(ctx, cell, rnd) {
    var skinHue = 25 + rnd() * 22;
    var skin = 'hsl(' + skinHue + ',' + (38 + rnd() * 22) + '%,' + (58 + rnd() * 14) + '%)';
    var shadow = 'hsl(' + skinHue + ',' + (32 + rnd() * 15) + '%,' + (38 + rnd() * 12) + '%)';
    var hairHue = rnd() * 360;
    var hair = 'hsl(' + hairHue + ',' + (45 + rnd() * 35) + '%,' + (22 + rnd() * 25) + '%)';
    var hairRows = 2 + Math.floor(rnd() * 3);
    var brow = 'hsl(' + skinHue + ',22%,' + (22 + rnd() * 12) + '%)';
    var sclera = 'hsl(210,25%,96%)';
    var iris = 'hsl(' + (180 + rnd() * 80) + ',' + (45 + rnd() * 30) + '%,' + (32 + rnd() * 15) + '%)';
    var pupil = 'hsl(220,35%,10%)';
    var lip = 'hsl(' + (350 + rnd() * 15) + ',' + (48 + rnd() * 22) + '%,' + (38 + rnd() * 12) + '%)';
    var blush = 'hsl(350,' + (55 + rnd() * 20) + '%,' + (72 + rnd() * 8) + '%)';
    var mouth = Math.floor(rnd() * 4);

    ctx.fillStyle = skin;
    ctx.fillRect(0, 0, CANVAS, CANVAS);

    var hx;
    var hy;
    for (hy = 0; hy < hairRows; hy++) {
      for (hx = 3; hx <= 12; hx++) {
        if (rnd() > 0.08) P(ctx, cell, hx, hy, hair);
      }
    }
    if (rnd() > 0.4) {
      for (hx = 4; hx <= 11; hx++) P(ctx, cell, hx, hairRows, hair);
    }

    var ex;
    var ey;
    for (ey = 4; ey <= 5; ey++) {
      mirror(ctx, cell, 4, ey, brow);
    }

    for (ey = 6; ey <= 8; ey++) {
      for (ex = 3; ex <= 5; ex++) {
        mirror(ctx, cell, ex, ey, sclera);
      }
    }
    for (ey = 7; ey <= 7; ey++) {
      mirror(ctx, cell, 4, ey, iris);
    }
    mirror(ctx, cell, 4, 7, pupil);
    mirror(ctx, cell, 3, 7, 'hsl(210,80%,98%)');

    P(ctx, cell, 8, 9, 'hsl(' + skinHue + ',30%,' + (52 + rnd() * 8) + '%)');

    if (mouth === 0) {
      for (ex = 6; ex <= 9; ex++) P(ctx, cell, ex, 12, lip);
      if (rnd() > 0.5) P(ctx, cell, 8, 13, lip);
    } else if (mouth === 1) {
      for (ex = 6; ex <= 9; ex++) P(ctx, cell, ex, 12, lip);
    } else if (mouth === 2) {
      P(ctx, cell, 7, 12, lip);
      P(ctx, cell, 8, 12, lip);
      P(ctx, cell, 9, 12, lip);
      P(ctx, cell, 8, 13, lip);
    } else {
      for (ex = 5; ex <= 10; ex++) P(ctx, cell, ex, 12, lip);
    }

    if (rnd() > 0.35) {
      mirror(ctx, cell, 2, 9, blush);
      mirror(ctx, cell, 3, 10, blush);
    }

    var sx;
    for (sx = 4; sx <= 11; sx++) P(ctx, cell, sx, 14, shadow);
    if (rnd() > 0.5) {
      for (sx = 5; sx <= 10; sx++) P(ctx, cell, sx, 15, shadow);
    }
  }

  function drawRobot(ctx, cell, rnd) {
    var base = 195 + rnd() * 35;
    var metal1 = 'hsl(' + base + ',16%,' + (42 + rnd() * 12) + '%)';
    var metal2 = 'hsl(' + base + ',12%,' + (28 + rnd() * 10) + '%)';
    var metal3 = 'hsl(' + base + ',20%,' + (58 + rnd() * 10) + '%)';
    var dark = 'hsl(' + base + ',25%,' + (14 + rnd() * 8) + '%)';
    var visor = 'hsl(200,85%,' + (18 + rnd() * 12) + '%)';
    var visorHi = 'hsl(190,70%,55%)';
    var led = rnd() > 0.5 ? 'hsl(125,80%,48%)' : 'hsl(28,95%,52%)';
    var ax;
    var ay;

    ctx.fillStyle = metal2;
    ctx.fillRect(0, 0, CANVAS, CANVAS);

    for (ay = 3; ay <= 13; ay++) {
      for (ax = 3; ax <= 12; ax++) {
        if ((ax + ay) % 2 === 0) P(ctx, cell, ax, ay, metal1);
        else P(ctx, cell, ax, ay, metal3);
      }
    }
    for (ax = 3; ax <= 12; ax++) {
      P(ctx, cell, ax, 3, dark);
      P(ctx, cell, ax, 13, dark);
    }
    for (ay = 4; ay <= 12; ay++) {
      P(ctx, cell, 3, ay, dark);
      P(ctx, cell, 12, ay, dark);
    }

    P(ctx, cell, 8, 0, metal3);
    P(ctx, cell, 8, 1, led);
    P(ctx, cell, 8, 2, dark);

    for (ax = 4; ax <= 11; ax++) P(ctx, cell, ax, 4, dark);

    for (ax = 3; ax <= 12; ax++) P(ctx, cell, ax, 6, visor);
    for (ax = 4; ax <= 7; ax++) P(ctx, cell, ax, 7, visorHi);
    mirror(ctx, cell, 4, 8, visorHi);
    mirror(ctx, cell, 5, 8, dark);

    for (ax = 5; ax <= 10; ax++) P(ctx, cell, ax, 10, metal2);
    for (ax = 6; ax <= 9; ax++) P(ctx, cell, ax, 11, dark);

    var gx;
    for (gx = 5; gx <= 10; gx++) {
      if (rnd() > 0.25) P(ctx, cell, gx, 12, dark);
    }

    mirror(ctx, cell, 2, 9, metal3);
    mirror(ctx, cell, 2, 10, dark);
    P(ctx, cell, 8, 14, metal1);
    P(ctx, cell, 7, 15, metal2);
    P(ctx, cell, 8, 15, metal2);
    P(ctx, cell, 9, 15, metal2);
  }

  function drawCat(ctx, cell, rnd) {
    var furH = 28 + rnd() * 18;
    var fur = 'hsl(' + furH + ',' + (62 + rnd() * 28) + '%,' + (48 + rnd() * 14) + '%)';
    var furDark = 'hsl(' + furH + ',' + (50 + rnd() * 20) + '%,' + (28 + rnd() * 12) + '%)';
    var innerEar = 'hsl(350,' + (55 + rnd() * 20) + '%,' + (72 + rnd() * 10) + '%)';
    var eyeC = rnd() > 0.55 ? 'hsl(95,85%,38%)' : 'hsl(260,55%,' + (42 + rnd() * 15) + '%)';
    var slit = 'hsl(55,95%,' + (12 + rnd() * 8) + '%)';
    var noseC = 'hsl(350,65%,' + (55 + rnd() * 10) + '%)';
    var wisk = 'hsl(' + furH + ',15%,' + (22 + rnd() * 10) + '%)';
    var stripe = 'hsl(' + furH + ',' + (40 + rnd() * 25) + '%,' + (32 + rnd() * 12) + '%)';
    var ix;
    var iy;

    ctx.fillStyle = fur;
    ctx.fillRect(0, 0, CANVAS, CANVAS);

    for (iy = 0; iy < 4; iy++) {
      for (ix = 0; ix <= iy; ix++) {
        P(ctx, cell, ix, iy, furDark);
        P(ctx, cell, GRID - 1 - ix, iy, furDark);
      }
    }
    mirror(ctx, cell, 1, 1, innerEar);
    mirror(ctx, cell, 2, 2, innerEar);
    mirror(ctx, cell, 1, 2, innerEar);

    for (iy = 5; iy <= 12; iy++) {
      for (ix = 3; ix <= 12; ix++) {
        if (rnd() > 0.88 && iy > 6 && iy < 11) P(ctx, cell, ix, iy, stripe);
      }
    }

    for (iy = 6; iy <= 8; iy++) {
      for (ix = 4; ix <= 5; ix++) {
        mirror(ctx, cell, ix, iy, eyeC);
      }
    }
    mirror(ctx, cell, 4, 7, slit);

    P(ctx, cell, 8, 9, noseC);
    P(ctx, cell, 7, 10, 'hsl(350,40%,25%)');
    P(ctx, cell, 8, 10, 'hsl(350,40%,25%)');
    P(ctx, cell, 9, 10, 'hsl(350,40%,25%)');

    var wx;
    for (wx = 0; wx <= 2; wx++) P(ctx, cell, wx, 10, wisk);
    for (wx = 13; wx <= 15; wx++) P(ctx, cell, wx, 10, wisk);
    for (wx = 0; wx <= 1; wx++) P(ctx, cell, wx, 11, wisk);
    for (wx = 14; wx <= 15; wx++) P(ctx, cell, wx, 11, wisk);

    if (rnd() > 0.45) {
      for (ix = 5; ix <= 11; ix++) P(ctx, cell, ix, 13, 'hsl(' + rnd() * 360 + ',55%,45%)');
    }

    for (ix = 5; ix <= 11; ix++) P(ctx, cell, ix, 14, furDark);
    for (ix = 6; ix <= 10; ix++) P(ctx, cell, ix, 15, furDark);
  }

  var DRAWERS = {
    identicon: drawIdenticon,
    face: drawFace,
    robot: drawRobot,
    cat: drawCat,
  };

  var STYLES = ['identicon', 'face', 'robot', 'cat'];

  function draw(ctx, style, rnd) {
    var cell = CANVAS / GRID;
    ctx.clearRect(0, 0, CANVAS, CANVAS);
    var fn = DRAWERS[style] || drawIdenticon;
    fn(ctx, cell, rnd);
  }

  global.OVAvatarPixel = {
    GRID: GRID,
    CANVAS: CANVAS,
    STYLES: STYLES,
    draw: draw,
  };
})(typeof window !== 'undefined' ? window : this);
