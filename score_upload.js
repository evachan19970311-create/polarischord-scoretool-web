window.run_score_upload = async function () {
  'use strict';

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

  const post_json_by_form = (payload) => {
    return new Promise((resolve) => {
      const iframe_name = `gas_post_iframe_${Date.now()}`;

      const iframe = document.createElement('iframe');
      iframe.name = iframe_name;
      iframe.style.display = 'none';
      document.body.appendChild(iframe);

      const form = document.createElement('form');
      form.method = 'POST';
      form.action = GAS_WEBAPP_URL;
      form.target = iframe_name;
      form.style.display = 'none';

      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = 'payload';
      input.value = JSON.stringify(payload);

      form.appendChild(input);
      document.body.appendChild(form);
      form.submit();

      setTimeout(() => {
        try {
          form.remove();
          iframe.remove();
        } catch (_) {}
        resolve();
      }, 1500);
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
    return to_array(music_list).map((music) => {
      return {
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

  try {
    const $ = await ensure_jquery();

    const [profile_res, music_res, common_res] = await Promise.all([
      request_pdata($, { service_kind: 'profile', pdata_kind: 'profile' }),
      request_pdata($, { service_kind: 'music_data', pdata_kind: 'music_data' }),
      request_common_data($)
    ]);

    const play_data = profile_res?.data?.play_data || {};
    const usr_profile = play_data?.usr_profile || {};
    const usr_nametag = play_data?.usr_nametag || {};
    const usr_play_info = play_data?.usr_play_info || {};

    const music_list = extract_music_list(music_res);
    const common_music = extract_common_music_list(common_res);

    console.log('music_list length:', music_list.length);
    console.log('common_music length:', common_music.length);
    console.log('music_res sample:', music_res);
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
      common_music: common_music
    };

    console.log('payload music length:', payload.music.length);
    console.log('payload common_music length:', payload.common_music.length);

    if (!payload.player.crew_id) {
      throw new Error('crew_id を取得できませんでした');
    }

    await post_json_by_form(payload);

    alert(
      '送信を実行しました\n' +
      `crew_id: ${payload.player.crew_id}\n` +
      `music: ${payload.music.length}件\n` +
      `common_music: ${payload.common_music.length}件`
    );
  } catch (error) {
    console.error(error);
    alert('score_upload の実行に失敗しました: ' + (error && error.message ? error.message : error));
  }
};