export function drawTeslaViz(ctx, w, h, t) {
  ctx.clearRect(0, 0, w, h);

  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#07080c");
  g.addColorStop(0.45, "#0b1018");
  g.addColorStop(1, "#10161f");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  const cx = w * 0.5;
  const horizon = h * 0.18;
  const roadWTop = w * 0.04;
  const roadWBot = w * 0.72;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx - roadWTop, horizon);
  ctx.lineTo(cx + roadWTop, horizon);
  ctx.lineTo(cx + roadWBot, h);
  ctx.lineTo(cx - roadWBot, h);
  ctx.closePath();
  const road = ctx.createLinearGradient(0, horizon, 0, h);
  road.addColorStop(0, "#10151d");
  road.addColorStop(1, "#151c26");
  ctx.fillStyle = road;
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  ctx.lineWidth = 2;
  ctx.setLineDash([18, 22]);
  ctx.lineDashOffset = -((t * 0.08) % 40);
  ctx.beginPath();
  ctx.moveTo(cx, horizon + 8);
  ctx.lineTo(cx, h);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  const path = ctx.createLinearGradient(0, horizon, 0, h * 0.72);
  path.addColorStop(0, "rgba(50, 120, 255, 0)");
  path.addColorStop(0.25, "rgba(40, 110, 255, 0.55)");
  path.addColorStop(1, "rgba(40, 110, 255, 0.08)");
  ctx.fillStyle = path;
  ctx.beginPath();
  ctx.moveTo(cx - 10, horizon + 6);
  ctx.lineTo(cx + 10, horizon + 6);
  ctx.lineTo(cx + 22, h * 0.68);
  ctx.lineTo(cx - 22, h * 0.68);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  drawCar(ctx, cx, h * 0.78, 1);

  ctx.fillStyle = "rgba(255,255,255,0.05)";
  for (let i = 0; i < 40; i++) {
    const sx = ((i * 97 + t * 0.01) % w);
    const sy = (i * 53) % (horizon + 20);
    ctx.fillRect(sx, sy, 1.2, 1.2);
  }
}

function drawCar(ctx, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);

  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.ellipse(0, 18, 22, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#d8dde4";
  roundRect(ctx, -16, -28, 32, 50, 8);
  ctx.fill();

  ctx.fillStyle = "#1a2330";
  roundRect(ctx, -11, -18, 22, 16, 4);
  ctx.fill();
  roundRect(ctx, -10, 6, 20, 8, 3);
  ctx.fill();

  ctx.fillStyle = "#7eb6ff";
  ctx.globalAlpha = 0.9;
  ctx.fillRect(-14, -27, 6, 3);
  ctx.fillRect(8, -27, 6, 3);
  ctx.globalAlpha = 1;

  ctx.fillStyle = "#ff5a4e";
  ctx.fillRect(-13, 20, 5, 2);
  ctx.fillRect(8, 20, 5, 2);

  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
