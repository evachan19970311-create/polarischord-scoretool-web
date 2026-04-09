'use strict';

const GITHUB_USER = "evachan19970311-create";
const GITHUB_REPO = "polaris-chord-QAP-data";
const GITHUB_REF = "refs/heads/main";
const MUSIC_DATA_FILE = "pc_QAP_summary_data.json";
const UPDATE_TIME_DATA_FILE = "pc_updatetime_data.json";
const MUSIC_JSON = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/${GITHUB_REF}/${MUSIC_DATA_FILE}`;
const UPDATE_TIME_JSON = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/${GITHUB_REF}/${UPDATE_TIME_DATA_FILE}`;

const REMOTE_JACKET_BASE_URL = "https://p.eagate.573.jp/game/polarischord/pc/img/music/jacket.html";
const REMOTE_JACKET_URL = id => `${REMOTE_JACKET_BASE_URL}?c=${id}`;

const TARGET_DIFF = ["INF", "POLAR", "HARD"];

const BG_COLOR = '#0a0a0f';

const LEVEL_ORDER = [
  "14", "13+", "13", "12+", "12", "11+", "11", "10+", "10", "9"
];

const DIFF_COLOR = {
  EASY: "rgba(0, 198, 255,.8)", 
  NORMAL: "rgba(0,191,105,.8)", 
  HARD: "rgba(255, 168, 0,.8)",
  INF: "rgba(255, 85, 172,.8)", 
  POLAR: "rgba(200,62,249,.8)"
};

const HARD_ROW_KEY = "__HARD_ROW__";
const HARD_ROW_LABEL = "HARD";

const LEVEL_SORT_MAP = Object.fromEntries(
  LEVEL_ORDER.map((level, index) => [level, index])
);

const jacketCache = new Map();

const MAX_OF_COL = 20;

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

// 左側のレベル帯描画
function drawLevelFrames(ctx, counted, levelYOffsets) {
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (const o of counted) {
    const key = o.key;
    const label = o.label;
    const isHard = key === HARD_ROW_KEY;

    const x = DIFF_AP_ALIGN_LEFT_OUTSIDE_BLANK;
    const y = levelYOffsets.get(key);
    const w = DIFF_AP_WIDTH;
    const h = o.block_height;

    const grad = ctx.createLinearGradient(x, y, x + w, y);
    if (isHard) {
      grad.addColorStop(0, "rgba(255, 240, 245, 0.25)");
      grad.addColorStop(1, "rgba(255, 105, 180, 0.12)");
    } else {
      const intensity = Math.max(0, (14 - parseFloat(label || 9)) / 6);
      grad.addColorStop(0, "rgba(255, 255, 255, 0.18)");
      grad.addColorStop(1, `rgba(255, 182, 193, ${0.08 + intensity * 0.07})`);
    }
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);

    // 左側アクセントバー
    const accentColor = isHard ? "rgba(255, 168, 0,.8)" : "rgba(255, 85, 172,.8)";
    ctx.fillStyle = accentColor;
    ctx.fillRect(x, y, 8, h);

    // 右側細いライン
    ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
    ctx.fillRect(x + w - 3, y, 3, h);

    // レベルラベル
    const fontSize = isHard ? 23 : 37;
    ctx.font = `700 ${fontSize}px copperplate gothic bold`;

    ctx.shadowColor = isHard ? "rgba(255, 168, 0,.8)" : "rgba(255, 85, 172,.8)";
    ctx.shadowBlur = 18;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2;

    ctx.fillStyle = "#ffffff";
    ctx.fillText(label, x + w / 2 + 2, y + h / 2 - 3);

    ctx.shadowBlur = 8;
    ctx.fillStyle = isHard ? "#fff0f5" : "#ffffff";
    ctx.fillText(label, x + w / 2 + 1, y + h / 2 - 4);

    ctx.shadowBlur = 0;
  }
}

// ジャケット描画関数
function drawJacketAndQAP(ctx, jacket, o, x, y) {
  if (jacket) {
    ctx.shadowColor = "rgb(0, 0, 0)";
    ctx.drawImage(jacket, x, y, JACKET_SIZE, JACKET_SIZE);
  }

  // QAP達成時は黒半透明
  if (o.qap_count >= 1) {
    ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
    ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
    ctx.fillRect(x, y, JACKET_SIZE, JACKET_SIZE);
  }
}

async function loadFonts() {
  const fonts = [
    new FontFace("copperplate gothic bold", "url(fonts/copperplate-gothic-bold2.ttf)", { weight: "700" }),
    new FontFace("Zen Maru Gothic", "url(fonts/ZenMaruGothic-Bold.ttf)", { weight: "700" }),
    new FontFace("Zen Maru Gothic", "url(fonts/ZenMaruGothic-Regular.ttf)", { weight: "400" }),
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

async function loadImage(src) {
  return new Promise(resolve => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function loadJacket(id) {
  if (!id || jacketCache.has(id)) return jacketCache.get(id);

  const remoteUrl = REMOTE_JACKET_URL(id);
  const img = await loadImage(remoteUrl);
  if (!img) {
    console.warn(`Jacket image not found: ${id}`);
  }
  jacketCache.set(id, img);
  return img;
}

async function fetchMusicData() {
  const response = await fetch(MUSIC_JSON, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);

  const json = await response.json();

  if (Array.isArray(json)) {
    return { ver: '', date: '', music_data: json };
  }
  if (json && Array.isArray(json.music_data)) {
    return { ver: json.ver ?? '', date: json.date ?? '', music_data: json.music_data };
  }

  throw new Error('Unsupported JSON format.');
}

function normalizeDiffName(value) {
  return String(value ?? '').trim().toUpperCase();
}

function getLevelLabel(item) {
  if (item.level != null && String(item.level).trim() !== "") {
    return String(item.level).trim();
  }
  const base = Number(item.level_base ?? 0);
  const plus = Number(item.plus_flag ?? 0);
  if (!base) return "0";
  return plus === 1 ? `${base}+` : String(base);
}

function filterAndSortMusic(music) {
  const filtered = [];

  for (const item of music) {
    const diff = normalizeDiffName(item.diff ?? item.diff_name);
    const level_label = getLevelLabel(item);

    if (!TARGET_DIFF.includes(diff)) continue;

    const isHard = diff === "HARD";
    if (!isHard && !(level_label in LEVEL_SORT_MAP)) continue;

    filtered.push({
      data_index: Number(item.data_index ?? 0),
      music_id: item.music_id,
      title: item.music_title,
      diff: diff,
      level: level_label,
      music_const: Number(item.music_const ?? 0),
      qap_count: Number(item.QAP_count ?? 0),
      level_sort: isHard ? 999 : LEVEL_SORT_MAP[level_label],
      group_key: isHard ? HARD_ROW_KEY : level_label,
    });
  }

  filtered.sort((a, b) => {
    const aIsHard = a.group_key === HARD_ROW_KEY;
    const bIsHard = b.group_key === HARD_ROW_KEY;

    if (aIsHard !== bIsHard) return aIsHard ? 1 : -1;

    if (!aIsHard && !bIsHard) {
      return a.level_sort - b.level_sort || a.data_index - b.data_index;
    }

    return a.music_const - b.music_const || a.data_index - b.data_index;
  });

  return filtered;
}

function calculateLevelData(filtered) {
  const rowCounts = new Map();
  for (const item of filtered) {
    rowCounts.set(item.group_key, (rowCounts.get(item.group_key) ?? 0) + 1);
  }

  const counted = [];
  const levelYOffsets = new Map();

  for (const level of LEVEL_ORDER) {
    const count = rowCounts.get(level) ?? 0;
    const rows = Math.ceil(count / MAX_OF_COL);
    const block_height = JACKET_VERTICAL_OUTSIDE_BLANK * 2 +
      rows * JACKET_SIZE +
      Math.max(rows - 1, 0) * JACKET_VERTICAL_INSIDE_BLANK;

    counted.push({ key: level, label: level, count, rows, block_height });
  }

  {
    const count = rowCounts.get(HARD_ROW_KEY) ?? 0;
    const rows = Math.ceil(count / MAX_OF_COL);
    const block_height = JACKET_VERTICAL_OUTSIDE_BLANK * 2 +
      rows * JACKET_SIZE +
      Math.max(rows - 1, 0) * JACKET_VERTICAL_INSIDE_BLANK;

    counted.push({ key: HARD_ROW_KEY, label: HARD_ROW_LABEL, count, rows, block_height });
  }

  let currentYOffset = HEADER_VERTICAL_OUTSIDE_BLANK * 2 + HEADER_HEIGHT + BODY_VERTICAL_OUTSIDE_BLANK;

  for (const item of counted) {
    levelYOffsets.set(item.key, currentYOffset);
    currentYOffset += item.block_height + BODY_VERTICAL_INSIDE_BLANK + LINE_WIDTH * 2;
  }

  return { counted, levelYOffsets };
}

function calculateCanvasSize(counted) {
  const SUM_BLOCK_HEIGHT = counted.reduce((sum, item) => sum + item.block_height, 0);
  const SUM_LINE_WIDTH_HEIGHT = counted.length * LINE_WIDTH * 2;

  const WIDTH = DIFF_AP_ALIGN_LEFT_OUTSIDE_BLANK +
    DIFF_AP_WIDTH +
    DIFF_AP_ALIGN_RIGHT_OUTSIDE_BLANK +
    BODY_ALIGN_LEFT_OUTSIDE_BLANK +
    JACKET_ALIGN_OUTSIDE_BLANK * 2 +
    MAX_OF_COL * JACKET_SIZE +
    (MAX_OF_COL - 1) * JACKET_ALIGN_INSIDE_BLANK +
    BODY_ALIGN_RIGHT_OUTSIDE_BLANK;

  const HEIGHT = HEADER_VERTICAL_OUTSIDE_BLANK * 2 +
    HEADER_HEIGHT +
    BODY_VERTICAL_OUTSIDE_BLANK * 2 +
    SUM_BLOCK_HEIGHT +
    BODY_VERTICAL_INSIDE_BLANK * (counted.length - 1) +
    SUM_LINE_WIDTH_HEIGHT;

  return { WIDTH, HEIGHT };
}

function drawBackgroundAndBorders(ctx, WIDTH, HEIGHT) {
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.strokeStyle = 'rgba(255, 182, 193, 0.4)';
  ctx.lineWidth = 3;

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(WIDTH, 0);
  ctx.stroke();
  ctx.strokeRect(0, 0, WIDTH, HEIGHT);

  ctx.beginPath();
  ctx.moveTo(0, HEADER_HEIGHT);
  ctx.lineTo(WIDTH, HEADER_HEIGHT);
  ctx.stroke();
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

  // ロゴ
  const logoimg = new Image();
  logoimg.src = "images/logo.png";
  await new Promise(r => { logoimg.onload = r; logoimg.onerror = r; });
  const logo_w = 400;
  const logo_h = (logo_w * logoimg.height) / logoimg.width;
  const logo_x = text_x;
  const logo_y = (HEADER_HEIGHT - logo_h) / 2;
  ctx.drawImage(logoimg, logo_x, logo_y, logo_w, logo_h);

  text_x += logo_w + HEADER_ALIGN_OUTSIDE_BLANK;

  // TITLE, CREATOR, ASSISTANT, SONG, VER の描画部分は省略（変更なし）
  // ...（前のコードと同じまま）
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

  ctx.font = "bold 30px copperplate gothic bold";
  const creator_width = Math.max(ctx.measureText(creator_label).width, ctx.measureText(creator_value).width);
  text_x += creator_width / 2;
  ctx.fillStyle = 'rgb(149, 220, 247)';
  ctx.fillText(creator_label, text_x, text_y_1);
  ctx.fillText(creator_value, text_x, text_y_2);
  text_x += creator_width / 2 + HEADER_ALIGN_OUTSIDE_BLANK;

  ctx.font = "bold 30px copperplate gothic bold";
  const assistant_width = Math.max(ctx.measureText(assistant_label).width, ctx.measureText(assistant_value).width);
  text_x += assistant_width / 2;
  ctx.fillStyle = 'rgb(255, 0, 0)';
  ctx.fillText(assistant_label, text_x, text_y_1);

  ctx.font = "700 30px Zen Maru Gothic";
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgb(255, 0, 0)';
  ctx.strokeText(assistant_value, text_x, text_y_2);
  ctx.fillText(assistant_value, text_x, text_y_2);

  text_x += assistant_width / 2 + HEADER_ALIGN_OUTSIDE_BLANK;

  ctx.font = "bold 30px copperplate gothic bold";
  const song_width = Math.max(ctx.measureText(song_label).width, ctx.measureText(song_value).width);
  text_x += song_width / 2;
  ctx.fillStyle = 'rgb(255, 255, 0)';
  ctx.fillText(song_label, text_x, text_y_1);
  ctx.fillText(song_value, text_x, text_y_2);
  text_x += song_width / 2 + HEADER_ALIGN_OUTSIDE_BLANK;

  ctx.font = "bold 30px copperplate gothic bold";
  const ver_width = Math.max(ctx.measureText(ver_label).width, ctx.measureText(ver_value).width);
  text_x += ver_width / 2;
  ctx.fillStyle = 'rgb(233, 113, 50)';
  ctx.fillText(ver_label, text_x, text_y_1);
  ctx.fillText(ver_value, text_x, text_y_2);
}

async function loadAndDraw() {
  const music = await fetchMusicData();
  const filtered = filterAndSortMusic(music.music_data);

  const { counted, levelYOffsets } = calculateLevelData(filtered);
  const { WIDTH, HEIGHT } = calculateCanvasSize(counted);

  console.log(`Canvas Size: ${HEIGHT} x ${WIDTH}`);

  const cv = document.getElementById("cv");
  cv.width = WIDTH;
  cv.height = HEIGHT;
  const ctx = cv.getContext("2d");

  drawBackgroundAndBorders(ctx, WIDTH, HEIGHT);
  drawLevelFrames(ctx, counted, levelYOffsets);

  const uniqueMusicIds = [...new Set(filtered.map(o => o.music_id))];
  await Promise.all(uniqueMusicIds.map(id => loadJacket(id)));

  const baseX = DIFF_AP_ALIGN_LEFT_OUTSIDE_BLANK +
    DIFF_AP_WIDTH +
    DIFF_AP_ALIGN_RIGHT_OUTSIDE_BLANK +
    BODY_ALIGN_LEFT_OUTSIDE_BLANK +
    JACKET_ALIGN_OUTSIDE_BLANK;

  const rowRenderIndex = new Map();

  for (const o of filtered) {
    const currentIndex = rowRenderIndex.get(o.group_key) ?? 0;
    rowRenderIndex.set(o.group_key, currentIndex + 1);

    const x = baseX + (currentIndex % MAX_OF_COL) * (JACKET_SIZE + JACKET_ALIGN_INSIDE_BLANK);
    const y = levelYOffsets.get(o.group_key) + JACKET_VERTICAL_OUTSIDE_BLANK +
      Math.floor(currentIndex / MAX_OF_COL) * (JACKET_SIZE + JACKET_VERTICAL_INSIDE_BLANK);

    const jacket = jacketCache.get(o.music_id);
    drawJacketAndQAP(ctx, jacket, o, x, y);
  }

  await drawHeader(ctx, filtered, music.ver, music.date);
}

(async () => {
  await loadFonts();
  await loadAndDraw();
})();