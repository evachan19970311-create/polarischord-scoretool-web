window.run_score_upload = async function () {
  'use strict';

  if (window.__score_upload_running__) {
    const text = document.getElementById('loading-text');
    if (text) {
      text.textContent = 'すでに実行中です';
    } else {
      alert('すでに実行中です');
    }
    return;
  }
  window.__score_upload_running__ = true;

  const EXPECTED_URL = 'https://p.eagate.573.jp/game/polarischord/pc/playdata/index.html';
  const SCORE_TOOL_BASE_URL = 'https://pc-scoretool-web.com';
  const UPDATE_RESULT_PATH = '/update_result';
  const FALLBACK_PROFILE_PATH = '/profile';
  const GAS_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbxPXzlMOJzizzx9vZTpxO5t7hf-FCwGPm-JQ451fIL_XRq3raZeJZXYRxtIs4-DWdbC/exec';

  const DIFF_MAP = {
    0: 'easy',
    1: 'normal',
    2: 'hard',
    3: 'inf',
    4: 'polar'
  };

  const CLEAR_MAP = {
    0: 'no',
    1: 'play',
    2: 'success',
    3: 'full',
    4: 'perfect'
  };

  const to_array = (value) => {
    if (Array.isArray(value)) return value;
    if (value == null) return [];
    return [value];
  };

  const format_jst_iso = (date = new Date()) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const mi = String(date.getMinutes()).padStart(2, '0');
    const s = String(date.getSeconds()).padStart(2, '0');

    const tz_offset = -date.getTimezoneOffset();
    const sign = tz_offset >= 0 ? '+' : '-';
    const tz_h = String(Math.floor(Math.abs(tz_offset) / 60)).padStart(2, '0');
    const tz_m = String(Math.abs(tz_offset) % 60).padStart(2, '0');

    return `${y}-${m}-${d}T${h}:${mi}:${s}${sign}${tz_h}:${tz_m}`;
  };

  const ensure_jquery = async () => {
    if (window.jQuery) return window.jQuery;

    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://code.jquery.com/jquery-3.6.0.min.js';
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });

    return window.jQuery;
  };

  const request_json = ($, url, data) => {
    return $.ajax({
      url,
      type: 'POST',
      dataType: 'json',
      data
    });
  };

  const request_pdata = async ($, data) => {
    const urls = [
      '../json/pdata_getdata.html',
      './json/pdata_getdata.html'
    ];

    let last_error = null;

    for (const url of urls) {
      try {
        return await request_json($, url, data);
      } catch (error) {
        last_error = error;
      }
    }

    throw last_error || new Error('pdata_getdata.html の取得に失敗しました');
  };

  const extract_matching_log_list = (res) => {
    return to_array(
      res?.data?.play_data?.matching_log?.log ||
      res?.data?.matching_log?.log ||
      res?.play_data?.matching_log?.log ||
      res?.matching_log?.log ||
      []
    );
  };

  const request_matching_log_data = async ($) => {
    const data = {
      service_kind: 'matching_log',
      pdata_kind: 'matching_log'
    };

    try {
      const res = await request_pdata($, data);
      const logs = extract_matching_log_list(res);

      console.log(
        'matching_log request success:',
        data,
        'length:',
        logs.length,
        res
      );

      return res;
    } catch (error) {
      console.log('matching_log request failed:', data, error);
      return null;
    }
  };

  const request_common_data = async ($) => {
    const urls = [
      '../json/common_getdata.html',
      './json/common_getdata.html'
    ];

    let last_error = null;

    for (const url of urls) {
      try {
        const res = await $.ajax({
          url: url,
          type: 'POST',
          dataType: 'json',
          data: {
            service_kind: 'music_list'
          }
        });

        console.log('common_getdata success:', url, res);
        return res;
      } catch (error) {
        last_error = error;
        console.log('common_getdata failed:', url, error);
      }
    }

    throw last_error || new Error('common_getdata.html の取得に失敗しました');
  };

  const post_json = async (payload) => {
    const res = await fetch(GAS_WEBAPP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(payload)
    });

    let result = null;

    try {
      result = await res.json();
    } catch (error) {
      throw new Error('GASからの応答を読み取れませんでした');
    }

    if (!res.ok) {
      const message =
        result?.message ||
        result?.error?.message ||
        result?.error ||
        `GAS送信に失敗しました (${res.status})`;

      throw new Error(message);
    }

    if (!result?.ok) {
      const code =
        result?.code ||
        result?.error?.code ||
        '';

      const message =
        result?.message ||
        result?.error?.message ||
        result?.error ||
        'GAS送信に失敗しました';

      if (code === 'USER_BLOCKED' || result?.blocked === true) {
        const blockedError = new Error(message);
        blockedError.code = 'USER_BLOCKED';
        blockedError.blocked = true;
        throw blockedError;
      }

      throw new Error(message);
    }

    return result;
  };

  const build_score_tool_url = (path, params) => {
    const url = new URL(path, SCORE_TOOL_BASE_URL);

    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== null && value !== undefined && String(value) !== '') {
        url.searchParams.set(key, String(value));
      }
    });

    return url.toString();
  };

  const build_token_save_url = ({
    public_id,
    edit_token,
    next_path
  }) => {
    return build_score_tool_url('/token-save', {
      user: public_id,
      token: edit_token,
      next: next_path
    });
  };

  const get_total_play_count = (play_info) => {
    if (!play_info) return 0;

    if (play_info.total_play_count != null) {
      return Number(play_info.total_play_count || 0);
    }

    return Number(play_info.standard_play_count || 0) +
      Number(play_info.freetime_play_count || 0) +
      Number(play_info.beginner_play_count || 0) +
      Number(play_info.local_matching_play_count || 0) +
      Number(play_info.global_matching_play_count || 0);
  };

  const extract_music_list = (music_res) => {
    return to_array(
      music_res?.data?.score_data?.usr_music_highscore?.music ||
      music_res?.data?.usr_music_highscore?.music ||
      music_res?.data?.music ||
      []
    );
  };

  const extract_common_music_list = (common_res) => {
    return to_array(
      common_res?.data?.musiclist?.music ||
      common_res?.data?.music_list ||
      common_res?.data?.music_data ||
      common_res?.data?.music ||
      []
    );
  };

  const build_music_payload = (music_list) => {
    return to_array(music_list).map((music, index) => {
      return {
        data_index: index,
        music_id: music.music_id,
        music_title: music.name || music.music_title || '',
        diffs: to_array(music?.chart_list?.chart).map((chart) => {
          return {
            diff: DIFF_MAP[chart.chart_difficulty_type] ?? String(chart.chart_difficulty_type),
            level: chart.difficult != null ? Number(chart.difficult) : null,
            ar: chart.achievement_rate != null ? Number(chart.achievement_rate) : null,
            clear_status: CLEAR_MAP[chart.clear_status] ?? String(chart.clear_status),
            high_score: chart.highscore != null ? Number(chart.highscore) : null,
            maxcombo: chart.maxcombo != null ? Number(chart.maxcombo) : null,
            combo_rank: chart.combo_rank != null ? Number(chart.combo_rank) : null,
            score_rank: chart.score_rank != null ? Number(chart.score_rank) : null,
            play_count: chart.play_count != null ? Number(chart.play_count) : 0,
            perfect_clear_count: chart.perfect_clear_count != null ? Number(chart.perfect_clear_count) : 0,
            full_combo_count: chart.full_combo_count != null ? Number(chart.full_combo_count) : 0,
            clear_count: chart.clear_count != null ? Number(chart.clear_count) : 0,
            updated_at: chart.updated_at || '',
            nice_play_rank: chart.nice_play_rank != null ? Number(chart.nice_play_rank) : null
          };
        })
      };
    });
  };

    const sanitize_matching_player_result = (player) => {
    return {
      rank: player?.rank != null ? Number(player.rank) : null,
      usr_name: player?.usr_name || '',
      pa_class: player?.pa_class != null ? Number(player.pa_class) : null,
      achievement_rate: player?.achievement_rate != null ? Number(player.achievement_rate) : null,
      score: player?.score != null ? Number(player.score) : null,
      score_rank: player?.score_rank != null ? Number(player.score_rank) : null,
      clear_status: player?.clear_status != null ? Number(player.clear_status) : null,
      update_flags: player?.update_flags != null ? Number(player.update_flags) : null,
      chart_difficulty_type: player?.chart_difficulty_type != null ? Number(player.chart_difficulty_type) : null,
      difficult: player?.difficult != null ? Number(player.difficult) : null,
      difficult_disp: player?.difficult_disp != null ? String(player.difficult_disp) : '',
      point: player?.point != null ? Number(player.point) : null,
      pa_skill: player?.pa_skill != null ? String(player.pa_skill) : ''
    };
  };

  const build_matching_log_payload = (play_data) => {
    const logs = to_array(play_data?.matching_log?.log);

    return logs
      .filter((log_item) => log_item && typeof log_item === 'object')
      .map((log_item) => {
        const total_result = log_item.total_result || {};
        const detail_music = to_array(log_item?.detail?.music);

        return {
          matching_type: log_item.matching_type != null
            ? Number(log_item.matching_type)
            : null,

          total_result: {
            created_at: total_result.created_at || '',
            music_id_list: {
              music_id: to_array(total_result?.music_id_list?.music_id)
                .map((music_id) => String(music_id || ''))
                .filter(Boolean)
            },
            result_list: {
              result: to_array(total_result?.result_list?.result)
                .map((player) => {
                  return {
                    rank: player?.rank != null ? Number(player.rank) : null,
                    usr_name: player?.usr_name || '',
                    point: player?.point != null ? Number(player.point) : null
                  };
                })
            }
          },

          detail: {
            music: detail_music
              .filter((music) => music && typeof music === 'object')
              .map((music) => {
                return {
                  music_id: String(music.music_id || ''),
                  name: music.name || '',
                  composer: music.composer || '',
                  license: music.license || '',
                  genre: music.genre != null ? Number(music.genre) : null,
                  created_at: music.created_at || '',
                  result_list: {
                    result: to_array(music?.result_list?.result)
                      .map(sanitize_matching_player_result)
                  }
                };
              })
          }
        };
      });
  };

  const create_loading_overlay = () => {
    const overlay = document.createElement('div');
    overlay.id = 'score-upload-loading';

    overlay.innerHTML = `
      <div class="loading-box">
        <div class="spinner" id="loading-spinner"></div>
        <div class="text" id="loading-text">スコア送信中...</div>
        <div class="result" id="loading-result" style="display:none;"></div>
      </div>
    `;

    const style = document.createElement('style');
    style.innerHTML = `
      #score-upload-loading {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.5);
        z-index: 999999;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .loading-box {
        background: #fff;
        padding: 24px 32px;
        border-radius: 16px;
        text-align: center;
        box-shadow: 0 8px 30px rgba(0,0,0,0.2);
        font-family: sans-serif;
      }

      .spinner {
        width: 32px;
        height: 32px;
        border: 4px solid #ddd;
        border-top: 4px solid #4c64ae;
        border-radius: 50%;
        margin: 0 auto 12px;
        animation: spin 1s linear infinite;
      }

      .text {
        font-size: 14px;
        font-weight: bold;
        color: #333;
      }

      .result {
        margin-top: 12px;
        font-size: 13px;
        color: #333;
        line-height: 1.6;
        white-space: pre-line;
      }

      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `;

    document.head.appendChild(style);
    document.body.appendChild(overlay);

    return overlay;
  };

  try {
    create_loading_overlay();

    if (!location.href.startsWith(EXPECTED_URL)) {
      alert('このページでは実行できません。プレイデータページへ移動します。');
      location.href = EXPECTED_URL;
      return;
    }

    const $ = await ensure_jquery();

    const [profile_res, music_res, common_res, matching_res] = await Promise.all([
      request_pdata($, { service_kind: 'profile', pdata_kind: 'profile' }),
      request_pdata($, { service_kind: 'music_data', pdata_kind: 'music_data' }),
      request_common_data($),
      request_matching_log_data($)
    ]);

    const play_data = profile_res?.data?.play_data || {};
    const usr_profile = play_data?.usr_profile || {};
    const usr_nametag = play_data?.usr_nametag || {};
    const usr_play_info = play_data?.usr_play_info || {};

    const music_list = extract_music_list(music_res);
    const common_music = extract_common_music_list(common_res);
    const matching_play_data =
      matching_res?.data?.play_data ||
      matching_res?.play_data ||
      matching_res?.data ||
      play_data;

    const matching_log = build_matching_log_payload(matching_play_data);

    console.log('music_list length:', music_list.length);
    console.log('common_music length:', common_music.length);
    console.log('music_res sample:', music_res);
    console.log('matching_res raw:', matching_res);
    console.log('common_res raw:', common_res);
    console.log('common_res keys:', Object.keys(common_res || {}));
    console.log('common_res.data keys:', Object.keys((common_res && common_res.data) || {}));
    console.log('common_res.data:', common_res && common_res.data);

    const payload = {
      version: 1,
      source: 'bookmarklet',
      exported_at: format_jst_iso(),
      player: {
        crew_id: String(play_data.crew_id || ''),
        player_name: usr_profile.usr_name || '',
        title_name: usr_nametag.set_title_name || '',
        pa_skill: usr_profile.pa_skill != null ? Number(usr_profile.pa_skill) : null,
        pa_class: usr_profile.pa_class != null ? Number(usr_profile.pa_class) : null,
        play_count: get_total_play_count(usr_play_info)
      },
      music: build_music_payload(music_list),
      common_music: common_music,

      play_data: {
        matching_log: {
          log: matching_log
        }
      }
    };

    console.log('payload music length:', payload.music.length);
    console.log('payload matching_log length:', payload.play_data.matching_log.log.length);
    console.log('payload common_music length:', payload.common_music.length);

    if (!payload.player.crew_id) {
      throw new Error('crew_id を取得できませんでした');
    }

    const gasResult = await post_json(payload);
    const publicId = String(gasResult?.public_id || '');
    const editToken = String(gasResult?.edit_token || '');

    const spinner = document.getElementById('loading-spinner');
    const text = document.getElementById('loading-text');
    const result = document.getElementById('loading-result');

    if (spinner) spinner.style.display = 'none';
    if (text) text.textContent = '送信完了！';

    if (result) {
      result.style.display = 'block';
      result.textContent =
        '送信を実行しました\n' +
        `crew_id: ${payload.player.crew_id}\n` +
        `プレイヤー名: ${payload.player.player_name}\n` +
        '5秒後に自動で更新結果ページへ移動します...';
    }

    setTimeout(function () {
      if (publicId && editToken) {
        const nextPath =
          UPDATE_RESULT_PATH + '?user=' + encodeURIComponent(publicId);

        location.href = build_token_save_url({
          public_id: publicId,
          edit_token: editToken,
          next_path: nextPath
        });
        return;
      }

      if (publicId) {
        location.href = build_score_tool_url(UPDATE_RESULT_PATH, {
          user: publicId
        });
        return;
      }

      location.href = build_score_tool_url(FALLBACK_PROFILE_PATH, {
        id: payload.player.crew_id
      });
    }, 5000);

    window.__score_upload_running__ = false;

  } catch (error) {
    console.error(error);
    const spinner = document.getElementById('loading-spinner');
    const text = document.getElementById('loading-text');
    const result = document.getElementById('loading-result');

    if (spinner) spinner.style.display = 'none';

    const isBlocked =
      error?.code === 'USER_BLOCKED' ||
      error?.blocked === true ||
      String(error?.message || '').includes('スコア登録が制限') ||
      String(error?.message || '').includes('スコア登録を利用できません');

    if (text) {
      text.textContent = isBlocked
        ? 'スコア登録できません'
        : 'エラーが発生しました';
    }

    if (result) {
      result.style.display = 'block';
      result.textContent = error.message || String(error);
    }

    window.__score_upload_running__ = false;
  }
};

(function () {
  'use strict';

  if (window.__score_upload_booted__) return;
  window.__score_upload_booted__ = true;

  if (typeof window.run_score_upload !== 'function') {
    alert('run_score_upload が見つかりません');
    return;
  }

  window.run_score_upload();
})();
