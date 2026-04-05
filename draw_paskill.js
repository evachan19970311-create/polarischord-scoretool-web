// ============================================================
//  POLARIS CHORD — PASKILL TOP 30  Canvas Renderer
//  リデザイン版 v2
// ============================================================

const SUMMARY_DATA_URL =
  "https://raw.githubusercontent.com/evachan19970311-create/polarischord-scoretool-web/main/data/summary/32071900_summary.json";

// ── 難易度カラー定義 ─────────────────────────────────────────
const DIFFICULTY_COLORS = {
  easy:   { border: "#35e7ff", fill: "rgba(53,231,255,0.15)",  glow: "rgba(53,231,255,0.55)",  accent: "#b8f9ff", label: "#35e7ff" },
  normal: { border: "#49ff8e", fill: "rgba(73,255,142,0.15)",  glow: "rgba(73,255,142,0.55)",  accent: "#b7ffd0", label: "#49ff8e" },
  hard:   { border: "#ffb341", fill: "rgba(255,179,65,0.15)",  glow: "rgba(255,179,65,0.55)",  accent: "#ffe2b4", label: "#ffb341" },
  inf:    { border: "#ff58c8", fill: "rgba(255,88,200,0.15)",  glow: "rgba(255,88,200,0.55)",  accent: "#ffd1ee", label: "#ff58c8" },
  polar:  { border: "#9f6bff", fill: "rgba(159,107,255,0.15)", glow: "rgba(159,107,255,0.55)", accent: "#e0d2ff", label: "#9f6bff" },
};

// ── UIカラーパレット ─────────────────────────────────────────
const C = {
  bgDeep:    "#04060f",
  bgMid:     "#08102b",
  bgShallow: "#0d1a3a",

  cyan:      "#37f2ff",
  pink:      "#ff54cf",
  purple:    "#a367ff",
  blue:      "#4b8fff",
  gold:      "#ffe066",

  panel:     "rgba(12,20,52,0.82)",
  panelEdge: "rgba(255,255,255,0.06)",
  glass:     "rgba(255,255,255,0.05)",

  textMain:  "#ffffff",
  textSub:   "#a9b8ff",
  textDim:   "#5a6da0",

  gridFaint: "rgba(55,130,255,0.07)",
  gridLine:  "rgba(55,242,255,0.12)",
};

// ── レイアウト定数 ───────────────────────────────────────────
const PAD      = 72;
const CW       = 1400;
const COLS     = 2;
const CARD_W   = (CW - PAD * 2 - 28) / COLS;
const CARD_H   = 108;
const GAP_X    = 28;
const GAP_Y    = 16;
const JACKET   = 80;
// ヘッダー高さ：ロゴ(96px) + サブタイ(22px) + パネル(100px) + 上下余白 → 360px
const HEADER_H = 360;

let currentSummaryData = null;

// ============================================================
//  PASKILL カラースタイル
// ============================================================

/**
 * paskill値に応じたカラー情報を返す。
 * >=16.0 のみ特殊なレインボーグラデーション処理が必要なため
 * isRainbow フラグを付与する。
 * それ以外は { color: string, glowColor: string } を返す。
 */
function getPaskillStyle(paskill) {
  if (paskill >= 16.0) {
    return {
      isRainbow: true,
      // レインボーの停止点（Canvas LinearGradient用）
      rainbowStops: [
        [0.00, "#ff6ec7"],
        [0.17, "#ff9a8b"],
        [0.33, "#ffd93d"],
        [0.50, "#6effb0"],
        [0.67, "#6ecbff"],
        [0.83, "#b06eff"],
        [1.00, "#ff6ec7"],
      ],
      glowColor: "rgba(255,255,255,0.55)",
    };
  }
  if (paskill >= 15.5) return { color: "rgb(204,216,232)", glowColor: "rgba(14,6,118,0.9)"   };
  if (paskill >= 15.0) return { color: "rgb(207,182,211)", glowColor: "rgba(46,0,64,0.9)"    };
  if (paskill >= 14.0) return { color: "rgb(235,180,159)", glowColor: "rgba(78,9,2,0.9)"     };
  if (paskill >= 13.0) return { color: "rgb(237,207,171)", glowColor: "rgba(83,63,64,0.9)"   };
  if (paskill >= 12.0) return { color: "rgb(235,206,128)", glowColor: "rgba(101,54,0,0.9)"   };
  if (paskill >= 11.0) return { color: "rgb(238,230,129)", glowColor: "rgba(66,49,57,0.9)"   };
  if (paskill >=  9.0) return { color: "rgb(174,237,210)", glowColor: "rgba(6,114,98,0.9)"   };
  if (paskill >=  6.0) return { color: "rgb(139,209,211)", glowColor: "rgba(71,95,99,0.9)"   };
  if (paskill >=  3.0) return { color: "rgb(193,230,98)",  glowColor: "rgba(59,92,1,0.9)"    };
  if (paskill >=  1.0) return { color: "rgb(126,222,112)", glowColor: "rgba(61,48,42,0.9)"   };
  return                      { color: "#9ca3af",           glowColor: "rgba(61,48,42,0.9)"   };
}

/**
 * getPaskillStyle の結果を使い、指定領域に PASKILL 数値テキストを描画する。
 * レインボーの場合はテキスト幅に合わせた LinearGradient を生成してfillする。
 */
function drawPaskillValue(ctx, { text, x, y, font, align = "right", base = "top" }) {
  const paskill = parseFloat(text);
  const style   = getPaskillStyle(paskill);

  ctx.save();
  ctx.font        = font;
  ctx.textAlign   = align;
  ctx.textBaseline= base;

  const measured = ctx.measureText(text);
  const tw       = measured.width;

  let lx;
  if (align === "right")  lx = x - tw;
  else if (align === "center") lx = x - tw / 2;
  else lx = x;

  if (style.isRainbow) {
      ctx.shadowColor = "rgba(255,255,255,0.6)";
    } else {
      ctx.shadowColor = style.glowColor;
  }
  ctx.shadowBlur = 6;   ;

  // ── 本体テキストのみ ─────────────────────────────
  if (style.isRainbow) {
    const g = ctx.createLinearGradient(lx, y, lx + tw, y);
    style.rainbowStops.forEach(([s, c]) => g.addColorStop(s, c));
    ctx.fillStyle = g;
  } else {
    ctx.fillStyle = style.color;
  }

  ctx.fillText(text, x, y);

  ctx.restore();
}

// ============================================================
//  ユーティリティ
// ============================================================

function setStatus(msg) {
  const el = document.getElementById("status");
  if (el) el.textContent = msg;
}

function getJacketUrl(musicId) {
  return `https://raw.githubusercontent.com/evachan19970311-create/polarischord-scoretool-web/main/images/jacket/${musicId}.jpg`;
}

function getShibadgeBaseUrl() {
  return "https://raw.githubusercontent.com/evachan19970311-create/polarischord-scoretool-web/main/images/shibadge";
}

function getShibadgeInfo(paskill) {
  let badge = "K";
  let star = null;

  if (paskill < 1.000) {
    badge = "none";
  } else if (paskill < 3.000) {
    badge = "A";
  } else if (paskill < 6.000) {
    badge = "B";
    if (paskill >= 4.500) star = "star1";
  } else if (paskill < 9.000) {
    badge = "C";
    if (paskill >= 7.500) star = "star1";
  } else if (paskill < 11.000) {
    badge = "D";
    if (paskill >= 10.000) star = "star1";
  } else if (paskill < 12.000) {
    badge = "E";
    if (paskill >= 11.500) star = "star1";
  } else if (paskill < 13.000) {
    badge = "F";
    if (paskill >= 12.250) star = "star1";
    if (paskill >= 12.500) star = "star2";
    if (paskill >= 12.750) star = "star3";
  } else if (paskill < 14.000) {
    badge = "G";
    if (paskill >= 13.250) star = "star1";
    if (paskill >= 13.500) star = "star2";
    if (paskill >= 13.750) star = "star3";
  } else if (paskill < 15.000) {
    badge = "H";
    if (paskill >= 14.200) star = "star1";
    if (paskill >= 14.400) star = "star2";
    if (paskill >= 14.600) star = "star3";
    if (paskill >= 14.800) star = "star4";
  } else if (paskill < 15.500) {
    badge = "I";
    if (paskill >= 15.100) star = "star1";
    if (paskill >= 15.200) star = "star2";
    if (paskill >= 15.300) star = "star3";
    if (paskill >= 15.400) star = "star4";
  } else if (paskill < 16.000) {
    badge = "J";
    if (paskill >= 15.600) star = "star1";
    if (paskill >= 15.700) star = "star2";
    if (paskill >= 15.800) star = "star3";
    if (paskill >= 15.900) star = "star4";
  } else {
    badge = "K";
  }

  const base = getShibadgeBaseUrl();
  return {
    badgeUrl: `${base}/${badge}.png`,
    starUrl: star ? `${base}/${star}.png` : null,
  };
}

function loadImage(src) {
  return new Promise(resolve => {
    if (!src) return resolve(null);

    const img = new Image();
    img.crossOrigin = "anonymous";
    const t = setTimeout(() => resolve(null), 5000);

    img.onload = () => {
      clearTimeout(t);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(t);
      resolve(null);
    };

    img.src = src;
  });
}

function diffColor(diff) {
  return DIFFICULTY_COLORS[String(diff).toLowerCase()] || DIFFICULTY_COLORS.inf;
}

function rrect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function fitText(ctx, text, maxWidth, font) {
  ctx.save();
  ctx.font = font;
  if (ctx.measureText(text).width <= maxWidth) { ctx.restore(); return text; }
  let t = text;
  while (t.length > 0 && ctx.measureText(t + "…").width > maxWidth) t = t.slice(0, -1);
  ctx.restore();
  return t + "…";
}

// ============================================================
//  プリミティブ描画
// ============================================================

function glowText(ctx, { text, x, y, font, color, glow, blur = 22, layers = 2, align = "left", base = "top", stroke = null }) {
  ctx.save();
  ctx.font        = font;
  ctx.textAlign   = align;
  ctx.textBaseline= base;
  for (let i = 0; i < layers; i++) {
    ctx.shadowColor = glow;
    ctx.shadowBlur  = blur + i * 12;
    ctx.fillStyle   = glow;
    ctx.fillText(text, x, y);
  }
  ctx.shadowBlur = 0;
  if (stroke) {
    ctx.lineWidth   = stroke.width || 3;
    ctx.strokeStyle = stroke.color || "rgba(4,6,15,0.85)";
    ctx.strokeText(text, x, y);
  }
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

function strokeText(ctx, { text, x, y, font, color, strokeColor = "rgba(4,6,15,0.85)", sw = 3, align = "left", base = "top" }) {
  ctx.save();
  ctx.font         = font;
  ctx.textAlign    = align;
  ctx.textBaseline = base;
  ctx.lineWidth    = sw;
  ctx.strokeStyle  = strokeColor;
  ctx.strokeText(text, x, y);
  ctx.fillStyle    = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

function glowOrb(ctx, x, y, r, color) {
  ctx.save();
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function glassPanel(ctx, x, y, w, h, r, { borderC, glowC, fillTop, fillBot }) {
  ctx.save();
  ctx.shadowColor = glowC;
  ctx.shadowBlur  = 28;
  const bg = ctx.createLinearGradient(x, y, x, y + h);
  bg.addColorStop(0, fillTop || C.panel);
  bg.addColorStop(1, fillBot || "rgba(8,14,38,0.88)");
  ctx.fillStyle = bg;
  rrect(ctx, x, y, w, h, r);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.fillStyle = C.glass;
  rrect(ctx, x + 2, y + 2, w - 4, Math.min(h * 0.35, 36), r - 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  const bd = ctx.createLinearGradient(x, y, x + w, y + h);
  bd.addColorStop(0, borderC);
  bd.addColorStop(1, "rgba(255,255,255,0.12)");
  ctx.strokeStyle = bd;
  ctx.lineWidth   = 1.5;
  rrect(ctx, x, y, w, h, r);
  ctx.stroke();
  ctx.restore();
}

// ============================================================
//  背景描画
// ============================================================

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function drawBackground(ctx, W, H) {
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0.00, C.bgDeep);
  bg.addColorStop(0.40, C.bgMid);
  bg.addColorStop(1.00, C.bgShallow);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  glowOrb(ctx, W * 0.12, H * 0.06, 320, "rgba(55,242,255,0.13)");
  glowOrb(ctx, W * 0.88, H * 0.08, 380, "rgba(255,84,207,0.13)");
  glowOrb(ctx, W * 0.50, H * 0.28, 460, "rgba(163,103,255,0.08)");
  glowOrb(ctx, W * 0.30, H * 0.72, 280, "rgba(75,143,255,0.07)");
  glowOrb(ctx, W * 0.75, H * 0.82, 300, "rgba(255,84,207,0.07)");

  ctx.save();
  const rng = mulberry32(0xdeadbeef);
  for (let i = 0; i < 320; i++) {
    const sx    = rng() * W;
    const sy    = rng() * H;
    const sr    = rng() * 1.6 + 0.3;
    const alpha = rng() * 0.7 + 0.15;
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
    ctx.fill();
  }
  ctx.restore();

  const gs = 56;
  ctx.save();
  ctx.lineWidth = 1;
  for (let x = 0; x <= W; x += gs) {
    ctx.beginPath();
    ctx.strokeStyle = x % (gs * 4) === 0 ? C.gridLine : C.gridFaint;
    ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = 0; y <= H; y += gs) {
    ctx.beginPath();
    ctx.strokeStyle = y % (gs * 4) === 0 ? C.gridLine : C.gridFaint;
    ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
  ctx.restore();

  // ヘッダー区切りライン
  ctx.save();
  const hl = ctx.createLinearGradient(0, 0, W, 0);
  hl.addColorStop(0,   "rgba(55,242,255,0)");
  hl.addColorStop(0.3, "rgba(55,242,255,0.7)");
  hl.addColorStop(0.7, "rgba(255,84,207,0.7)");
  hl.addColorStop(1,   "rgba(255,84,207,0)");
  ctx.strokeStyle = hl;
  ctx.lineWidth   = 1.5;
  ctx.beginPath();
  ctx.moveTo(PAD, HEADER_H);
  ctx.lineTo(W - PAD, HEADER_H);
  ctx.stroke();
  ctx.restore();
}

// ============================================================
//  ヘッダー描画
// ============================================================

function drawHeader(ctx, W, data, shibadgeImages) {
  const cx = W / 2;

  glowText(ctx, {
    text:  "PASKILL TARGET LIST",
    x: cx, y: PAD + 10,
    font:  "900 96px 'M PLUS Rounded 1c', sans-serif",
    color: C.textMain,
    glow:  C.cyan,
    blur:  40, layers: 3,
    align: "center", base: "top",
    stroke: { width: 4, color: "rgba(4,6,15,0.9)" },
  });

  strokeText(ctx, {
    text:  "TOP 30 TARGET LIST",
    x: cx, y: PAD + 116,
    font:  "700 22px 'M PLUS Rounded 1c', sans-serif",
    color: C.textSub,
    sw: 3,
    align: "center", base: "top",
  });

  const py = PAD + 150;
  const ph = 100;
  const px = PAD;

  const col1X = px + 40;
  const col2X = W - PAD;

  strokeText(ctx, {
    text:  "PLAYER NAME",
    x: col1X, y: py,
    font:  "700 24px 'M PLUS Rounded 1c', sans-serif",
    color: C.textDim, sw: 2,
    base: "top",
  });

  const nameFont = "900 40px 'M PLUS Rounded 1c', sans-serif";

  glowText(ctx, {
    text:  data.player_name || "-",
    x: col1X, y: py + ph - 16,
    font:  nameFont,
    color: C.textMain,
    glow:  C.cyan,
    blur:  16, layers: 1,
    base:  "bottom",
    stroke: { width: 3, color: "rgba(4,6,15,0.85)" },
  });

  // PLAYER NAME 下線デコレーション
  ctx.save();
  ctx.font = nameFont;
  ctx.textAlign = "right";
  const nameW = 530;
  const nameUlX = col1X;
  const nameUlY = py + ph;
  const nameUlG = ctx.createLinearGradient(col1X, nameUlY, col1X + nameW, nameUlY);
  nameUlG.addColorStop(0, C.cyan);
  nameUlG.addColorStop(1, "rgba(255,255,255,0)");
  ctx.strokeStyle = nameUlG;
  ctx.lineWidth = 1.5;
  ctx.beginPath(); 
  ctx.moveTo(nameUlX, nameUlY);
  ctx.lineTo(col2X, nameUlY);
  ctx.stroke();
  ctx.restore();

  let shibadgeW = 0;
  const avgVal = typeof data.paskill_average_top30 === "number"
    ? data.paskill_average_top30.toFixed(4)
    : "-";
  const avgFont = "900 64px 'M PLUS Rounded 1c', sans-serif";

  const avgPaskill = Number(avgVal);
  const avgStyle = getPaskillStyle(avgPaskill);

    // シバッジ描画
  if (shibadgeImages?.badge) {
    ctx.save();

    const starW = 72;
    const starH = 18;
    const starX = col2X - starW;
    const starY = py + 14;

    const badgeW = 72;
    const badgeH = 72;
    const badgeX = starX - badgeW + 20;
    const badgeY = py + 14;

    const shibadgeGap = 16;

    shibadgeW = starW + badgeW + shibadgeGap - 20;

    if (shibadgeImages.star) {

      ctx.drawImage(shibadgeImages.star, starX, starY, starW, starH);
    }

    if (avgStyle.isRainbow) {
        ctx.shadowColor = "rgba(255,255,255,0.6)";
    } else {
        ctx.shadowColor = avgStyle.glowColor;
    }
    ctx.shadowBlur = 12;

    ctx.drawImage(shibadgeImages.badge, badgeX, badgeY, badgeW, badgeH);

    ctx.restore();
  }

  drawPaskillValue(ctx, {
    text: avgVal,
    x: col2X - shibadgeW, y: py + 30,
    font: avgFont,
    align: "right", base: "top",
    glowLayers: 3,
    glowBlur:   28,
  });

  // AVG TOP30 下線デコレーション
  ctx.save();
  ctx.font = avgFont;
  ctx.textAlign = "right";
  const avgW = ctx.measureText(avgVal).width + shibadgeW;
  const avgUlX = col2X - avgW;
  const avgUlY = py + ph;
  const avgUlG = ctx.createLinearGradient(avgUlX, avgUlY, col2X, avgUlY);
  avgUlG.addColorStop(0, C.cyan);
  avgUlG.addColorStop(1, "rgba(255,255,255,0)");
  ctx.strokeStyle = avgUlG;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(avgUlX, avgUlY);
  ctx.lineTo(col2X, avgUlY);
  ctx.stroke();
  ctx.restore();

  strokeText(ctx, {
    text: "PASKILL",
    x: col2X - avgW - 16, y: py,
    font: "700 24px 'M PLUS Rounded 1c', sans-serif",
    color: C.textDim, sw: 2,
    align: "left", base: "top",
  });
}

// ============================================================
//  カード描画
// ============================================================

function drawCard(ctx, item, rank, x, y, jacketImg) {
  const dc = diffColor(item.diff);
  const r  = 16;

  // ── パネル背景 ───────────────────────────────────────────
  glassPanel(ctx, x, y, CARD_W, CARD_H, r, {
    borderC:  dc.border,
    glowC:    dc.glow,
    fillTop:  "rgba(12,20,52,0.86)",
    fillBot:  "rgba(6,10,28,0.92)",
  });

  // ── 左アクセントバー ─────────────────────────────────────
  ctx.save();
  const bar = ctx.createLinearGradient(x + 8, y, x + 8, y + CARD_H);
  bar.addColorStop(0, dc.border);
  bar.addColorStop(1, C.pink);
  ctx.fillStyle = bar;
  rrect(ctx, x + 10, y + 12, 5, CARD_H - 24, 3);
  ctx.fill();
  ctx.restore();

  // ── ジャケット ───────────────────────────────────────────
  const jx = x + 26, jy = y + (CARD_H - JACKET) / 2;
  ctx.save();
  rrect(ctx, jx, jy, JACKET, JACKET, 10);
  ctx.clip();
  if (jacketImg) {
    ctx.drawImage(jacketImg, jx, jy, JACKET, JACKET);
    const gloss = ctx.createLinearGradient(jx, jy, jx, jy + JACKET);
    gloss.addColorStop(0,    "rgba(255,255,255,0.22)");
    gloss.addColorStop(0.25, "rgba(255,255,255,0.04)");
    gloss.addColorStop(1,    "rgba(255,255,255,0)");
    ctx.fillStyle = gloss;
    ctx.fillRect(jx, jy, JACKET, JACKET);
  } else {
    ctx.fillStyle = dc.fill;
    ctx.fillRect(jx, jy, JACKET, JACKET);
    strokeText(ctx, {
      text: "NO IMG", x: jx + JACKET / 2, y: jy + JACKET / 2,
      font: "700 11px 'M PLUS Rounded 1c', sans-serif", color: C.textDim, sw: 2,
      align: "center", base: "middle",
    });
  }
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  ctx.lineWidth = 1.2;
  rrect(ctx, jx, jy, JACKET, JACKET, 10);
  ctx.stroke();
  ctx.restore();

  // ── テキスト領域の基準座標 ───────────────────────────────
  const tx = jx + JACKET + 16;  // テキスト開始X（ジャケット右）
  const rx = x + CARD_W - 18;   // 右端基準X
  const ty = y + 14;            // テキスト上端Y

  // ── 順位バッジ ───────────────────────────────────────────
  const rankStr  = `#${rank}`;
  const rankFont = "800 13px 'M PLUS Rounded 1c', sans-serif";
  ctx.save();
  ctx.font = rankFont;
  const rw = Math.max(ctx.measureText(rankStr).width + 20, 42);
  const rbg = ctx.createLinearGradient(tx, ty, tx + rw, ty);
  rbg.addColorStop(0, dc.border);
  rbg.addColorStop(1, "rgba(255,255,255,0.2)");
  ctx.fillStyle = rbg;
  rrect(ctx, tx, ty, rw, 22, 999); ctx.fill();
  ctx.fillStyle = "rgba(4,6,15,0.8)";
  rrect(ctx, tx + 1.5, ty + 1.5, rw - 3, 19, 999); ctx.fill();
  ctx.restore();
  strokeText(ctx, {
    text: rankStr, x: tx + rw / 2, y: ty + 11,
    font: rankFont, color: "#fff", sw: 2,
    align: "center", base: "middle",
  });

  // ── 難易度バッジ ─────────────────────────────────────────
  const diffStr  = String(item.diff || "-").toUpperCase();
  const diffFont = "800 13px 'M PLUS Rounded 1c', sans-serif";
  ctx.save();
  ctx.font = diffFont;
  const dw = Math.max(ctx.measureText(diffStr).width + 20, 46);
  const dx = tx + rw + 8;
  ctx.fillStyle = dc.fill;
  rrect(ctx, dx, ty, dw, 22, 999); ctx.fill();
  ctx.strokeStyle = dc.border;
  ctx.lineWidth   = 1.2;
  rrect(ctx, dx, ty, dw, 22, 999); ctx.stroke();
  ctx.restore();
  strokeText(ctx, {
    text: diffStr, x: dx + dw / 2, y: ty + 11,
    font: diffFont, color: dc.accent, sw: 2,
    align: "center", base: "middle",
  });

  // ── 楽曲名 ───────────────────────────────────────────────
  const titleFont = "700 18px 'Exo 2','M PLUS Rounded 1c', sans-serif";
  // PASKILL数値エリア（右から約190px）を避ける
  const titleMaxW = rx - tx - 190;
  const titleStr  = fitText(ctx, item.title || "-", titleMaxW, titleFont);
  strokeText(ctx, {
    text: titleStr, x: tx, y: ty + 30,
    font: titleFont, color: C.textMain, sw: 3,
    base: "top",
  });

  // ── 譜面定数 ─────────────────────────────────────────────
  const constStr  = `CONST  ${Number(item.music_const || 0).toFixed(1)}`;
  const constFont = "700 13px 'M PLUS Rounded 1c', sans-serif";
  strokeText(ctx, {
    text: constStr, x: tx, y: ty + 58,
    font: constFont, color: C.textSub, sw: 2,
    base: "top",
  });

  // ── AR（グロー表示・バーなし） ───────────────────────────
  // CONST の右隣に配置
  ctx.save();
  ctx.font = constFont;
  const constW = ctx.measureText(constStr).width;
  ctx.restore();

  const arVal  = Number(item.ar || 0);
  const arPct  = (arVal / 100).toFixed(2) + "%";
  const arX = tx + constW + 28;  // CONST テキスト右端 + 余白

  const arStyle = (item) => {
    if (!item.clear_status) return "#b400ff";

    switch (item.clear_status.toLowerCase()) {
        case "perfect":
        return "#ffd85c";
        case "full":
        return "#eda2ff";
        case "success":
        return "#74dafa";
        default:
        return "#b400ff";
    }
    };

  const arColor = arStyle(item);

  // AR ラベル
    strokeText(ctx, {
    text: "AR",
    x: arX, y: ty + 58,
    font: "700 13px 'M PLUS Rounded 1c', sans-serif",
    color: C.textSub,
    sw: 2,
    base: "top",
    });

    // AR 値（強調）
    glowText(ctx, {
    text: arPct,
    x: arX + ctx.measureText("AR").width + 15, y: ty + 58,
    font: "800 13px 'M PLUS Rounded 1c', sans-serif",
    color: arColor,
    glow: arColor,
    blur: 8,
    layers: 1,
    base: "top",
    stroke: { width: 2, color: "rgba(4,6,15,0.85)" },
    });

  // ── PASKILL エリア（右側・最大強調）─────────────────────
  const psVal  = Number(item.paskill || 0).toFixed(3);
  const psFont = "900 48px 'M PLUS Rounded 1c', sans-serif";

  // PASKILL ラベル
  strokeText(ctx, {
    text: "MUSIC PASKILL", x: rx, y: ty + 2,
    font: "700 11px 'M PLUS Rounded 1c', sans-serif",
    color: dc.label, sw: 2,
    align: "right", base: "top",
  });

  // PASKILL 値（getPaskillStyle カラーでグロー強調）
  drawPaskillValue(ctx, {
    text: psVal,
    x: rx, y: ty + 18,
    font: psFont,
    align: "right", base: "top",
    glowLayers: 3,
    glowBlur:   28,
  });

  // PASKILL 下線デコレーション
  ctx.save();
  ctx.font      = psFont;
  ctx.textAlign = "right";
  const psW = ctx.measureText(psVal).width;
  const ulX = rx - psW;
  const ulY = ty + 18 + 52;
  const ulG = ctx.createLinearGradient(ulX, ulY, rx, ulY);
  ulG.addColorStop(0, "rgba(255,255,255,0)");
  ulG.addColorStop(1, dc.border);
  ctx.strokeStyle = ulG;
  ctx.lineWidth   = 1.5;
  ctx.beginPath();
  ctx.moveTo(ulX, ulY); ctx.lineTo(rx, ulY);
  ctx.stroke();
  ctx.restore();
}

// ============================================================
//  フッター描画
// ============================================================

function drawFooter(ctx, W, H, data) {
  const now  = new Date();
  const jst  = new Date(now.getTime() + 9 * 3600 * 1000);
  const pad2 = n => String(n).padStart(2, "0");
  const ts   = `${jst.getUTCFullYear()}-${pad2(jst.getUTCMonth()+1)}-${pad2(jst.getUTCDate())}  ${pad2(jst.getUTCHours())}:${pad2(jst.getUTCMinutes())} JST`;

  strokeText(ctx, {
    text:  `GENERATED  ${ts}`,
    x: W - PAD, y: H - 28,
    font:  "700 13px 'Exo 2','M PLUS Rounded 1c', sans-serif",
    color: C.textDim, sw: 2,
    align: "right", base: "middle",
  });

  strokeText(ctx, {
    text:  "POLARIS CHORD SCORETOOL WEB",
    x: PAD, y: H - 28,
    font:  "700 13px 'Exo 2','M PLUS Rounded 1c', sans-serif",
    color: C.textDim, sw: 2,
    base: "middle",
  });
}

// ============================================================
//  ジャケット画像ロード
// ============================================================

function loadJackets(charts) {
  return Promise.all(
    charts.map(chart => new Promise(resolve => {
      const img       = new Image();
      img.crossOrigin = "anonymous";
      img.src         = getJacketUrl(chart.music_id);
      const t         = setTimeout(() => resolve(null), 5000);
      img.onload      = () => { clearTimeout(t); resolve(img); };
      img.onerror     = () => { clearTimeout(t); resolve(null); };
    }))
  );
}

// ============================================================
//  メイン描画
// ============================================================

async function renderPaskillImage(data) {
  const canvas = document.getElementById("paskillCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) { setStatus("Canvas 初期化失敗"); return; }

  const items = Array.isArray(data.top_paskill_charts)
    ? data.top_paskill_charts.slice(0, 30)
    : [];

  const rows    = Math.ceil(items.length / COLS);
  const W       = CW;
  // カード開始Y = HEADER_H + 余白(PAD/2)
  // カード終端Y = HEADER_H + PAD/2 + rows*(CARD_H+GAP_Y) - GAP_Y
  const H = HEADER_H + PAD / 2 + rows * CARD_H + (rows - 1) * GAP_Y + PAD + 40;
  canvas.width  = W;
  canvas.height = H;

  setStatus("背景描画中…");
  drawBackground(ctx, W, H);

    const avgPaskill = Number(data.paskill_average_top30 || 0);
    const shibadgeInfo = getShibadgeInfo(avgPaskill);
    const [badgeImg, starImg] = await Promise.all([
        loadImage(shibadgeInfo.badgeUrl),
        loadImage(shibadgeInfo.starUrl),
    ]);

  setStatus("ヘッダー描画中…");
  drawHeader(ctx, W, data, {
    badge: badgeImg,
    star: starImg,
  });

  setStatus("ジャケット読み込み中…");
  const jackets = await loadJackets(items);

  setStatus("カード描画中…");
  // カード開始Y：HEADER_H の下に PAD/2 の余白
  const startY = HEADER_H + PAD / 2;
  items.forEach((item, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const cx  = PAD + col * (CARD_W + GAP_X);
    const cy  = startY + row * (CARD_H + GAP_Y);
    drawCard(ctx, item, i + 1, cx, cy, jackets[i]);
  });

  drawFooter(ctx, W, H, data);
  setStatus("描画完了 ✓");
}

// ============================================================
//  データ取得
// ============================================================

async function fetchSummaryData() {
  setStatus("データ取得中…");
  const res = await fetch(SUMMARY_DATA_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
  return res.json();
}

async function reloadAndRender() {
  try {
    const data         = await fetchSummaryData();
    currentSummaryData = data;
    await renderPaskillImage(data);
  } catch (e) {
    console.error(e);
    setStatus(`エラー: ${e.message}`);
  }
}

function downloadCanvas() {
  const canvas = document.getElementById("paskillCanvas");
  if (!canvas || !currentSummaryData) return;
  const a    = document.createElement("a");
  a.download = `paskill_top30_${currentSummaryData.crew_id || "unknown"}.png`;
  a.href     = canvas.toDataURL("image/png");
  a.click();
}

// ============================================================
//  起動
// ============================================================

async function boot() {
  try {
    await document.fonts.ready;
    await reloadAndRender();

    document.getElementById("renderBtn")
      ?.addEventListener("click", reloadAndRender);
    document.getElementById("downloadBtn")
      ?.addEventListener("click", downloadCanvas);
  } catch (e) {
    console.error(e);
    setStatus(`初期化エラー: ${e.message}`);
  }
}

boot();
