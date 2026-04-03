(() => {
  'use strict';

  const CONFIG = {
    // ここをあなたのGAS WebアプリURLに差し替え
    gas_webapp_url: 'https://script.google.com/macros/s/AKfycbxPXzlMOJzizzx9vZTpxO5t7hf-FCwGPm-JQ451fIL_XRq3raZeJZXYRxtIs4-DWdbC/exec',

    // 失敗時の詳細ログを出す
    debug: true,

    // タイムアウト(ms)
    fetch_timeout_ms: 30000,
  };

  const API_CANDIDATES = {
    // 公式サイトの実レスポンスに合わせて必要ならここだけ調整
    profile: [
      '/game/polarischord/pc/profile/getdata/',
      '/game/polarischord/pc/profile/getdata/index.html',
      '/game/polarischord/pc/profile/json/',
      '/game/polarischord/pc/profile/'
    ],
    music_data: [
      '/game/polarischord/pc/music_data/getdata/',
      '/game/polarischord/pc/music_data/getdata/index.html',
      '/game/polarischord/pc/music_data/json/',
      '/game/polarischord/pc/music_data/'
    ],
    common_getdata: [
      '/game/polarischord/pc/common_getdata/',
      '/game/polarischord/pc/common_getdata/index.html'
    ]
  };

  function debug_log(...args) {
    if (CONFIG.debug) {
      console.log('[score_upload]', ...args);
    }
  }

  function show_alert(message) {
    alert(message);
  }

  function to_array(value) {
    if (Array.isArray(value)) return value;
    if (value == null) return [];
    return [value];
  }

  function pad2(num) {
    return String(num).padStart(2, '0');
  }

  function format_jst_iso(date = new Date()) {
    const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
    const y = jst.getUTCFullYear();
    const m = pad2(jst.getUTCMonth() + 1);
    const d = pad2(jst.getUTCDate());
    const hh = pad2(jst.getUTCHours());
    const mm = pad2(jst.getUTCMinutes());
    const ss = pad2(jst.getUTCSeconds());
    return `${y}-${m}-${d}T${hh}:${mm}:${ss}+09:00`;
  }

  function safe_get(obj, path, default_value = undefined) {
    try {
      const parts = path.split('.');
      let cur = obj;
      for (const part of parts) {
        if (cur == null) return default_value;
        cur = cur[part];
      }
      return cur == null ? default_value : cur;
    } catch (_) {
      return default_value;
    }
  }

  function first_defined(...values) {
    for (const value of values) {
      if (value !== undefined && value !== null && value !== '') {
        return value;
      }
    }
    return null;
  }

  function normalize_difficulty_name(value) {
    const raw = String(value ?? '').trim().toLowerCase();

    const map = {
      easy: 'easy',
      ez: 'easy',

      normal: 'normal',
      nml: 'normal',
      nm: 'normal',

      hard: 'hard',
      hd: 'hard',

      inf: 'inf',
      infinite: 'inf',

      polar: 'polar',
      plr: 'polar'
    };

    return map[raw] || raw;
  }

  function normalize_clear_status(value) {
    if (value == null) return null;
    return String(value).trim();
  }

  function parse_number(value) {
    if (value == null || value === '') return null;
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }

  async function fetch_with_timeout(url, options = {}, timeout_ms = CONFIG.fetch_timeout_ms) {
    const controller = new AbortController();
    const timeout_id = setTimeout(() => controller.abort(), timeout_ms);

    try {
      const response = await fetch(url, {
        credentials: 'include',
        cache: 'no-store',
        ...options,
        signal: controller.signal
      });

      const text = await response.text();

      let json = null;
      try {
        json = JSON.parse(text);
      } catch (_) {
        // HTML or non-JSON fallback
      }

      return {
        ok: response.ok,
        status: response.status,
        text,
        json
      };
    } finally {
      clearTimeout(timeout_id);
    }
  }

  function make_absolute_url(path) {
    if (/^https?:\/\//i.test(path)) return path;
    return `${location.origin}${path}`;
  }

  async function try_fetch_json(candidate_paths, label) {
    const errors = [];

    for (const path of candidate_paths) {
      const url = make_absolute_url(path);
      try {
        debug_log(`fetch ${label}:`, url);
        const result = await fetch_with_timeout(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json, text/plain, */*'
          }
        });

        if (!result.ok) {
          errors.push(`${url} -> HTTP ${result.status}`);
          continue;
        }

        if (result.json) {
          debug_log(`fetch ${label} success(json):`, url, result.json);
          return result.json;
        }

        errors.push(`${url} -> JSON parse failed`);
      } catch (error) {
        errors.push(`${url} -> ${error.message}`);
      }
    }

    throw new Error(`${label} の取得に失敗しました\n${errors.join('\n')}`);
  }

  function find_profile_object(raw) {
    return first_defined(
      safe_get(raw, 'data.profile'),
      safe_get(raw, 'profile'),
      safe_get(raw, 'data.user'),
      safe_get(raw, 'user'),
      safe_get(raw, 'data'),
      raw
    );
  }

  function find_music_array(raw) {
    return to_array(
      first_defined(
        safe_get(raw, 'data.music'),
        safe_get(raw, 'data.music_list'),
        safe_get(raw, 'data.list'),
        safe_get(raw, 'music'),
        safe_get(raw, 'music_list'),
        safe_get(raw, 'list'),
        raw
      )
    );
  }

  function find_common_music_array(raw) {
    return to_array(
      first_defined(
        safe_get(raw, 'data.music'),
        safe_get(raw, 'data.music_list'),
        safe_get(raw, 'data.list'),
        safe_get(raw, 'music'),
        safe_get(raw, 'music_list'),
        safe_get(raw, 'list'),
        raw
      )
    );
  }

  function normalize_profile(raw_profile) {
    const profile = find_profile_object(raw_profile);

    return {
      crew_id: String(first_defined(
        profile.crew_id,
        profile.id,
        profile.user_id,
        profile.player_id
      ) ?? '').trim(),
      player_name: String(first_defined(
        profile.player_name,
        profile.name,
        profile.user_name
      ) ?? '').trim(),
      pa_skill: parse_number(first_defined(
        profile.pa_skill,
        profile.paskill,
        profile.pass_skill
      )),
      class_name: first_defined(
        profile.class_name,
        profile.class,
        null
      ),
      team_name: first_defined(
        profile.team_name,
        profile.team,
        null
      ),
      raw_profile: profile
    };
  }

  function normalize_user_music_item(item) {
    const music_id = String(first_defined(
      item.music_id,
      item.id,
      item.song_id
    ) ?? '').trim();

    const title = String(first_defined(
      item.title,
      item.music_name,
      item.name
    ) ?? '').trim();

    const difficulty = normalize_difficulty_name(first_defined(
      item.difficulty,
      item.diff_name,
      item.diff,
      item.sheet,
      item.level_name
    ));

    return {
      music_id,
      title,
      difficulty,
      score: parse_number(first_defined(item.score, item.best_score)),
      ar: parse_number(first_defined(item.ar, item.achievement_rate, item.rate)),
      clear_status: normalize_clear_status(first_defined(item.clear_status, item.clear_type, item.clear_rank)),
      combo_type: first_defined(item.combo_type, item.combo_rank, null),
      grade: first_defined(item.grade, item.rank, null),
      play_count: parse_number(first_defined(item.play_count, item.count)),
      raw: item
    };
  }

  function extract_common_item_difficulties(common_item) {
    const result = [];

    const difficulty_sources = [
      common_item.difficulties,
      common_item.diffs,
      common_item.sheets,
      common_item.chart_list,
      common_item.charts
    ];

    for (const source of difficulty_sources) {
      for (const diff_item of to_array(source)) {
        const difficulty = normalize_difficulty_name(first_defined(
          diff_item.difficulty,
          diff_item.diff_name,
          diff_item.diff,
          diff_item.name
        ));

        if (!difficulty) continue;

        result.push({
          difficulty,
          level: first_defined(diff_item.level, diff_item.lv, null),
          music_const: parse_number(first_defined(diff_item.const, diff_item.music_const, diff_item.difficulty_value)),
          raw: diff_item
        });
      }
      if (result.length > 0) return result;
    }

    const fallback_pairs = [
      ['easy', common_item.easy_level, common_item.easy_const],
      ['normal', common_item.normal_level, common_item.normal_const],
      ['hard', common_item.hard_level, common_item.hard_const],
      ['inf', common_item.inf_level, common_item.inf_const],
      ['polar', common_item.polar_level, common_item.polar_const]
    ];

    for (const [difficulty, level, music_const] of fallback_pairs) {
      if (level != null || music_const != null) {
        result.push({
          difficulty,
          level: first_defined(level, null),
          music_const: parse_number(first_defined(music_const, null)),
          raw: {}
        });
      }
    }

    return result;
  }

  function normalize_common_music_items(raw_common_music) {
    const list = find_common_music_array(raw_common_music);

    const normalized = [];

    for (const item of list) {
      const music_id = String(first_defined(
        item.music_id,
        item.id,
        item.song_id
      ) ?? '').trim();

      const title = String(first_defined(
        item.title,
        item.music_name,
        item.name
      ) ?? '').trim();

      const jacket_url = first_defined(
        item.jk_url,
        item.jacket_url,
        item.image_url,
        item.thumbnail_url,
        null
      );

      const artist = first_defined(item.artist, item.artist_name, null);

      const difficulties = extract_common_item_difficulties(item);

      if (difficulties.length === 0) {
        normalized.push({
          music_id,
          title,
          artist,
          jk_url: jacket_url,
          difficulties: []
        });
        continue;
      }

      normalized.push({
        music_id,
        title,
        artist,
        jk_url: jacket_url,
        difficulties
      });
    }

    return normalized;
  }

  async function collect_payload() {
    const exported_at = format_jst_iso();

    const [profile_raw, music_raw, common_raw] = await Promise.all([
      try_fetch_json(API_CANDIDATES.profile, 'profile'),
      try_fetch_json(API_CANDIDATES.music_data, 'music_data'),
      try_fetch_json(API_CANDIDATES.common_getdata, 'common_getdata')
    ]);

    const profile = normalize_profile(profile_raw);
    const music = find_music_array(music_raw).map(normalize_user_music_item);
    const common_music = normalize_common_music_items(common_raw);

    if (!profile.crew_id) {
      throw new Error('crew_id を取得できませんでした。profile レスポンス形式を確認してください。');
    }

    return {
      exported_at,
      source_url: location.href,
      profile,
      music,
      common_music,
      raw: {
        profile: profile_raw,
        music_data: music_raw,
        common_getdata: common_raw
      }
    };
  }

  async function post_to_gas(payload) {
    const body = new URLSearchParams();
    body.set('payload', JSON.stringify(payload));

    const result = await fetch(CONFIG.gas_webapp_url, {
      method: 'POST',
      body,
      redirect: 'follow'
    });

    const text = await result.text();

    let json = null;
    try {
      json = JSON.parse(text);
    } catch (_) {
      // noop
    }

    if (!result.ok) {
      throw new Error(`GAS送信失敗: HTTP ${result.status}\n${text}`);
    }

    if (json && json.ok === false) {
      throw new Error(json.error || 'GASがエラーを返しました');
    }

    return json || { ok: true, raw_text: text };
  }

  async function run_score_upload() {
    try {
      if (!CONFIG.gas_webapp_url || CONFIG.gas_webapp_url === 'YOUR_GAS_WEBAPP_URL') {
        throw new Error('score_upload.js の CONFIG.gas_webapp_url を設定してください。');
      }

      debug_log('start');

      const payload = await collect_payload();

      debug_log('payload summary', {
        crew_id: payload.profile.crew_id,
        player_name: payload.profile.player_name,
        music_count: payload.music.length,
        common_music_count: payload.common_music.length,
        exported_at: payload.exported_at
      });

      const result = await post_to_gas(payload);

      debug_log('gas result', result);

      show_alert(
        [
          'アップロード完了',
          `プレイヤー: ${payload.profile.player_name || '(unknown)'}`,
          `Crew ID: ${payload.profile.crew_id}`,
          `プレイ済み譜面: ${payload.music.length}`,
          `全曲データ: ${payload.common_music.length}`
        ].join('\n')
      );

      return result;
    } catch (error) {
      console.error(error);
      show_alert(`アップロード失敗\n${error.message}`);
      throw error;
    }
  }

  window.run_score_upload = run_score_upload;

  console.log('score_upload.js loaded', typeof window.run_score_upload);
})();