'use strict';

const GITHUB_USER = "ykhr107";
const GITHUB_REPO = "pola_difficult";
const GITHUB_REF = "refs/heads/main";
const MUSIC_DATA_FILE = "pc_apdiff_data.json";
const MUSIC_JSON = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/${GITHUB_REF}/${MUSIC_DATA_FILE}`;

const TARGET_DIFF = ["INF"]; // "PLR","HRD","NML","ESY"

const BG_COLOR = 'rgb(58, 58, 58)';

const AP_DIFF_COLOR = {
  15: 'rgb(164, 154, 62)',
  14: 'rgb(216, 216, 216)',
  13: 'rgb(233, 113, 50)',
  12: 'rgb(134, 0, 134)',
  11: 'rgb(196, 0, 196)',
  10: 'rgb(255, 0, 255)',
  9: 'rgb(196, 0, 0)',
  8: 'rgb(255, 0, 0)',
  7: 'rgb(255, 132, 0)',
  6: 'rgb(255, 255, 0)',
  5: 'rgb(133, 255, 0)',
  4: 'rgb(0, 255, 0)',
  3: 'rgb(0, 255, 255)',
  2: 'rgb(0, 130, 255)',
  1: 'rgb(0, 0, 255)'
};

const MAX_OF_COL = 20;
const MAX_DIFFCULTY_NUM = 15;

const HEADER_HEIGHT = 200;
const HEADER_ALIGN_OUTSIDE_BLANK = 50;
const HEADER_VERTICAL_OUTSIDE_BLANK = 0;

const DIFF_AP_WIDTH = 100;
const LINE_WIDTH = 10;
const DIFF_AP_ALIGN_LEFT_OUTSIDE_BLANK = 50;
const DIFF_AP_ALIGN_RIGHT_OUTSIDE_BLANK = 30;

const JACKET_SIZE = 100;
const JACKET_ALIGN_OUTSIDE_BLANK = 10;
const JACKET_ALIGN_INSIDE_BLANK = 0;
const JACKET_VERTICAL_OUTSIDE_BLANK = 0;
const JACKET_VERTICAL_INSIDE_BLANK = 0;

const BODY_ALIGN_LEFT_OUTSIDE_BLANK = 5;
const BODY_ALIGN_RIGHT_OUTSIDE_BLANK = 50;
const BODY_VERTICAL_OUTSIDE_BLANK = 40;
const BODY_VERTICAL_INSIDE_BLANK = 10;

async function loadFonts() {
  const fonts = [
    new FontFace(
      "copperplate gothic bold",
      "url(fonts/copperplate-gothic-bold2.ttf)",
      { weight: "700" }
    ),
    new FontFace(
      "Zen Maru Gothic",
      "url(fonts/ZenMaruGothic-Bold.ttf)",
      { weight: "700" }
    ),
    new FontFace(
      "Zen Maru Gothic",
      "url(fonts/ZenMaruGothic-Regular.ttf)",
      { weight: "400" }
    ),
  ];

  for (const font of fonts) {
    try {
      await font.load();
      document.fonts.add(font);
    } catch (e) {
      console.warn("Font loading failed:", e);
    }
  }
}

(async () => {
  await loadFonts();

  console.log(document.fonts.check("700 100px 'copperplate gothic bold'"));
  console.log(document.fonts.check("700 100px 'Zen Maru Gothic'"));
  console.log(document.fonts.check("400 100px 'Zen Maru Gothic'"));

  start();
})();

async function start() {
  await loadAndDraw();
}

function normalizeDiffName(value) {
  return String(value ?? '').trim().toUpperCase();
}

// 楽曲データ取得
async function fetchMusicData() {
  const response = await fetch(MUSIC_JSON, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Failed to fetch music data: ${response.status} ${response.statusText}`);
  }

  const json = await response.json();

  let source = json;
  if (Array.isArray(json)) {
    source = json[0];
  }

  if (!source || typeof source !== 'object') {
    throw new Error('Music JSON root is invalid.');
  }

  if (!Array.isArray(source.music_data)) {
    throw new Error('music_data is not an array.');
  }

  return {
    ver: source.ver ?? '',
    date: source.date ?? '',
    music_data: source.music_data
  };
}

// データフィルタリングとソート
function filterAndSortMusic(music) {
  const filtered = [];

  for (const item of music) {
    const diff = normalizeDiffName(item.diff ?? item.diff_name);
    const difficulty_ap = Number(item.difficulty_ap ?? 0);

    if (!TARGET_DIFF.includes(diff) || difficulty_ap === 0) {
      continue;
    }

    filtered.push({
      difficulty_ap,
    });
  }

  filtered.sort((a, b) =>
    b.difficulty_ap - a.difficulty_ap
  );

  return filtered;
}

// 難易度別カウント計算と座標事前計算
function calculateDifficultyData(filtered) {
  const difficultyCounts = new Map();
  for (const item of filtered) {
    difficultyCounts.set(item.difficulty_ap, (difficultyCounts.get(item.difficulty_ap) ?? 0) + 1);
  }

  const counted = [];
  const diffApYOffsets = new Map();

  for (let i = MAX_DIFFCULTY_NUM; i >= 1; i--) {
    const count = difficultyCounts.get(i) ?? 0;
    const rows = Math.ceil(count / MAX_OF_COL);
    const diff_ap_height = JACKET_VERTICAL_OUTSIDE_BLANK * 2 +
      rows * JACKET_SIZE +
      Math.max(rows - 1, 0) * JACKET_VERTICAL_INSIDE_BLANK;

    counted.push({
      difficulty_ap: i,
      count,
      rows,
      diff_ap_height
    });
  }

  let currentYOffset = HEADER_VERTICAL_OUTSIDE_BLANK * 2 +
    HEADER_HEIGHT +
    BODY_VERTICAL_OUTSIDE_BLANK;

  for (const item of counted) {
    diffApYOffsets.set(item.difficulty_ap, currentYOffset);
    currentYOffset += item.diff_ap_height + BODY_VERTICAL_INSIDE_BLANK + LINE_WIDTH * 2;
  }

  return { counted, diffApYOffsets };
}

// キャンバスサイズ計算
function calculateCanvasSize(counted) {
  const sum_diff_ap_height = counted.reduce((sum, item) => sum + item.diff_ap_height, 0);
  const sum_line_width_height = counted.length * LINE_WIDTH * 2;

  const width = DIFF_AP_ALIGN_LEFT_OUTSIDE_BLANK +
    DIFF_AP_WIDTH +
    DIFF_AP_ALIGN_RIGHT_OUTSIDE_BLANK +
    BODY_ALIGN_LEFT_OUTSIDE_BLANK +
    JACKET_ALIGN_OUTSIDE_BLANK * 2 +
    MAX_OF_COL * JACKET_SIZE +
    (MAX_OF_COL - 1) * JACKET_ALIGN_INSIDE_BLANK +
    BODY_ALIGN_RIGHT_OUTSIDE_BLANK;

  const height = HEADER_VERTICAL_OUTSIDE_BLANK * 2 +
    HEADER_HEIGHT +
    BODY_VERTICAL_OUTSIDE_BLANK * 2 +
    sum_diff_ap_height +
    BODY_VERTICAL_INSIDE_BLANK * (counted.length - 1) +
    sum_line_width_height;

  return { width, height };
}

// 背景とボーダー描画
function drawBackgroundAndBorders(ctx, width, height) {
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = 'rgb(199, 199, 199)';
  ctx.lineWidth = 3;

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(width, 0);
  ctx.stroke();
  ctx.strokeRect(0, 0, width, height);

  ctx.beginPath();
  ctx.moveTo(0, HEADER_HEIGHT);
  ctx.lineTo(width, HEADER_HEIGHT);
  ctx.stroke();
}

// AP難易度フレーム描画
function drawDifficultyFrames(ctx, counted, diff_ap_y_offsets) {
  for (let i = 0; i < counted.length; i++) {
    const item = counted[i];
    const ap_diff_color = AP_DIFF_COLOR[counted.length - i];
    const ap_diff_num = item.difficulty_ap;

    const x_difficulty_ap = DIFF_AP_ALIGN_LEFT_OUTSIDE_BLANK;
    const y_difficulty_ap = diff_ap_y_offsets.get(ap_diff_num);

    ctx.fillStyle = BG_COLOR;
    ctx.strokeStyle = ap_diff_color;
    ctx.lineWidth = LINE_WIDTH;

    strokeRoundRect(ctx, x_difficulty_ap, y_difficulty_ap, DIFF_AP_WIDTH, item.diff_ap_height, 10);

    // AP難易度（数字）描画
    ctx.font = "700 70px copperplate gothic bold";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = 'rgb(255, 255, 0)';

    const text_x = x_difficulty_ap + DIFF_AP_WIDTH / 2 + (ap_diff_num >= 10 ? -3 : 0);
    const text_y = y_difficulty_ap + item.diff_ap_height / 2 - LINE_WIDTH;
    ctx.fillText(ap_diff_num, text_x, text_y);
  }
}

// データ読み込み＆描画
async function loadAndDraw() {
  const music = await fetchMusicData();
  const filtered = filterAndSortMusic(music.music_data);
  console.log(filtered);

  const { counted, diffApYOffsets } = calculateDifficultyData(filtered);
  console.log(counted);

  const { width, height } = calculateCanvasSize(counted);
  console.log(`Canvas Size: 縦${height}x横${width}`);

  const cv = document.getElementById("cv");
  cv.width = width;
  cv.height = height;
  const ctx = cv.getContext("2d");

  drawBackgroundAndBorders(ctx, width, height);
  drawDifficultyFrames(ctx, counted, diffApYOffsets);

  await drawHeader(ctx, filtered, music.ver, music.date);
}

async function drawHeader(ctx, filtered, ver, date) {
  const music_count = filtered.length;
  const text_y_1 = HEADER_HEIGHT / 4;
  const text_y_2 = HEADER_HEIGHT * 3 / 4;

  let text_x = HEADER_ALIGN_OUTSIDE_BLANK;

  const date_label = "DATE";
  const date_value = String(date ?? '');

  const title_1 = "INFLUENCE";
  const title_2 = "ALL PERFECT";
  const title_3 = "DIFFICULTY TABLE";

  const creator_label = "CREATOR";
  const creator_value = "YKHR1.07";

  const assistant_label = "ASSISTANT";
  const assistant_value = "ポラリスコードの会";

  const song_label = "SONG";
  const song_value = music_count;

  const ver_label = "VER";
  const ver_value = String(ver ?? '');

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.letterSpacing = "2px";

  // DATE
  ctx.font = "bold 30px copperplate gothic bold";
  const date_label_width = ctx.measureText(date_label).width;
  ctx.font = "bold 20px copperplate gothic bold";
  const date_value_width = ctx.measureText(date_value).width;
  const date_width = Math.max(date_label_width, date_value_width);
  text_x += date_width / 2;

  ctx.font = "bold 30px copperplate gothic bold";
  ctx.fillStyle = 'rgb(71, 212, 90)';
  ctx.fillText(date_label, text_x, text_y_1);

  ctx.font = "bold 20px copperplate gothic bold";
  ctx.fillText(date_value, text_x, text_y_2);

  text_x += date_width / 2 + HEADER_ALIGN_OUTSIDE_BLANK;

  // ロゴ描画
  const logoimg = new Image();
  logoimg.src = "images/logo.png";
  await new Promise(r => {
    logoimg.onload = r;
    logoimg.onerror = r;
  });

  if (logoimg.width > 0 && logoimg.height > 0) {
    const logo_w = 400;
    const logo_h = (logo_w * logoimg.height) / logoimg.width;
    const logo_y = (HEADER_HEIGHT - logo_h) / 2;

    ctx.drawImage(logoimg, text_x, logo_y, logo_w, logo_h);
    text_x += logo_w + HEADER_ALIGN_OUTSIDE_BLANK;
  }

  // TITLE
  ctx.font = "bold 40px copperplate gothic bold";
  const title_width = ctx.measureText(title_1).width + ctx.measureText(title_2).width;
  text_x += title_width / 2;

  ctx.textAlign = "right";
  ctx.fillStyle = 'rgb(255, 51, 153)';
  ctx.fillText(title_1, text_x - 10, text_y_1);

  ctx.textAlign = "left";
  ctx.fillStyle = 'rgb(255,255, 0)';
  ctx.fillText(title_2, text_x + 10, text_y_1);

  ctx.textAlign = "center";
  ctx.fillStyle = 'rgb(0,176, 240)';
  ctx.fillText(title_3, text_x, text_y_2);

  text_x += title_width / 2 + 10 + HEADER_ALIGN_OUTSIDE_BLANK;

  // CREATOR
  ctx.font = "bold 30px copperplate gothic bold";
  const creator_label_width = ctx.measureText(creator_label).width;
  const creator_value_width = ctx.measureText(creator_value).width;
  const creator_width = Math.max(creator_label_width, creator_value_width);
  text_x += creator_width / 2;

  ctx.fillStyle = 'rgb(149, 220, 247)';
  ctx.fillText(creator_label, text_x, text_y_1);
  ctx.fillText(creator_value, text_x, text_y_2);

  text_x += creator_width / 2 + HEADER_ALIGN_OUTSIDE_BLANK;

  // ASSISTANT
  ctx.font = "bold 30px copperplate gothic bold";
  const assistant_label_width = ctx.measureText(assistant_label).width;
  const assistant_value_width = ctx.measureText(assistant_value).width;
  const assistant_width = Math.max(assistant_label_width, assistant_value_width);
  text_x += assistant_width / 2;

  ctx.fillStyle = 'rgb(255, 0, 0)';
  ctx.strokeStyle = 'rgb(255, 0, 0)';
  ctx.lineWidth = 0;
  ctx.fillText(assistant_label, text_x, text_y_1);

  ctx.font = "700 30px Zen Maru Gothic";
  ctx.lineWidth = 2;
  ctx.strokeText(assistant_value, text_x, text_y_2);
  ctx.fillText(assistant_value, text_x, text_y_2);

  text_x += assistant_width / 2 + HEADER_ALIGN_OUTSIDE_BLANK;

  // SONG
  ctx.font = "bold 30px copperplate gothic bold";
  const song_label_width = ctx.measureText(song_label).width;
  const song_value_width = ctx.measureText(song_value).width;
  const song_width = Math.max(song_label_width, song_value_width);
  text_x += song_width / 2;

  ctx.fillStyle = 'rgb(255, 255, 0)';
  ctx.fillText(song_label, text_x, text_y_1);
  ctx.fillText(song_value, text_x, text_y_2);

  text_x += song_width / 2 + HEADER_ALIGN_OUTSIDE_BLANK;

  // VER
  ctx.font = "bold 30px copperplate gothic bold";
  const ver_label_width = ctx.measureText(ver_label).width;
  const ver_value_width = ctx.measureText(ver_value).width;
  const ver_width = Math.max(ver_label_width, ver_value_width);
  text_x += ver_width / 2;

  ctx.fillStyle = 'rgb(233, 113, 50)';
  ctx.fillText(ver_label, text_x, text_y_1);
  ctx.fillText(ver_value, text_x, text_y_2);
}

function strokeRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arc(x + w - r, y + r, r, Math.PI * (3 / 2), 0, false);
  ctx.lineTo(x + w, y + h - r);
  ctx.arc(x + w - r, y + h - r, r, 0, Math.PI * (1 / 2), false);
  ctx.lineTo(x + r, y + h);
  ctx.arc(x + r, y + h - r, r, Math.PI * (1 / 2), Math.PI, false);
  ctx.lineTo(x, y + r);
  ctx.arc(x + r, y + r, r, Math.PI, Math.PI * (3 / 2), false);
  ctx.closePath();

  ctx.stroke();
}