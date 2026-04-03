javascript:(async function () {
  'use strict';

  const GAS_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbxPXzlMOJzizzx9vZTpxO5t7hf-FCwGPm-JQ451fIL_XRq3raZeJZXYRxtIs4-DWdbC/exec';

  const DIFF_MAP = {
    0: 'easy',
    1: 'nml',
    2: 'hard',
    3: 'inf',
    4: 'plr'
  };

  const CLEAR_MAP = {
    0: 'no',
    1: 'play',
    2: 'success',
    3: 'full',
    4: 'perfect'
  };

  if (!window.jQuery) {
    await new Promise(resolve => {
      const s = document.createElement('script');
      s.src = 'https://code.jquery.com/jquery-3.6.0.min.js';
      s.onload = resolve;
      document.head.appendChild(s);
    });
  }

  const $ = window.jQuery;

  const get_total_play_count = (play_info) =>
    Number(play_info.standard_play_count || 0) +
    Number(play_info.freetime_play_count || 0) +
    Number(play_info.beginner_play_count || 0) +
    Number(play_info.local_matching_play_count || 0) +
    Number(play_info.global_matching_play_count || 0);

  const post_json = async (payload) => {
    const res = await fetch(GAS_WEBAPP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(payload)
    });

    const text = await res.text();

    try {
      return JSON.parse(text);
    } catch (_) {
      return { ok: false, raw: text };
    }
  };

  const get_profile = () => {
    return $.ajax({
      url: '../json/pdata_getdata.html',
      type: 'POST',
      dataType: 'json',
      data: {
        service_kind: 'profile',
        pdata_kind: 'profile'
      }
    });
  };

  const get_music = () => {
    return $.ajax({
      url: '../json/pdata_getdata.html',
      type: 'POST',
      dataType: 'json',
      data: {
        service_kind: 'music_data',
        pdata_kind: 'music_data'
      }
    });
  };

  try {
    const [profile_res, music_res] = await Promise.all([get_profile(), get_music()]);

    const play_data = profile_res?.data?.play_data || {};
    const usr_profile = play_data?.usr_profile || {};
    const usr_nametag = play_data?.usr_nametag || {};
    const usr_play_info = play_data?.usr_play_info || {};

    const music_map = {};
    const music_list = music_res?.data?.score_data?.usr_music_highscore?.music || [];

    $(music_list).each(function () {
      const music_id = this.music_id;
      const music_title = this.name;

      if (!music_map[music_id]) {
        music_map[music_id] = {
          music_id: music_id,
          music_title: music_title,
          diffs: []
        };
      }

      $(this.chart_list?.chart || []).each(function () {
        music_map[music_id].diffs.push({
          diff: DIFF_MAP[this.chart_difficulty_type] ?? String(this.chart_difficulty_type),
          level: Number(this.difficult || 0),
          ar: Number(this.achievement_rate || 0),
          clear_status: CLEAR_MAP[this.clear_status] ?? String(this.clear_status),
          high_score: Number(this.highscore || 0),
          maxcombo: Number(this.maxcombo || 0),
          combo_rank: Number(this.combo_rank || 0),
          score_rank: Number(this.score_rank || 0),
          play_count: Number(this.play_count || 0),
          perfect_clear_count: Number(this.perfect_clear_count || 0),
          full_combo_count: Number(this.full_combo_count || 0),
          clear_count: Number(this.clear_count || 0),
          updated_at: this.updated_at || '',
          nice_play_rank: Number(this.nice_play_rank || 0)
        });
      });
    });

    const payload = {
      version: 1,
      source: 'bookmarklet',
      exported_at: new Date().toISOString(),
      player: {
        crew_id: String(play_data.crew_id || ''),
        player_name: usr_profile.usr_name || '',
        title_name: usr_nametag.set_title_name || '',
        pa_skill: Number(usr_profile.pa_skill || 0),
        pa_class: Number(usr_profile.pa_class || 0),
        play_count: get_total_play_count(usr_play_info)
      },
      music: Object.values(music_map)
    };

    if (!payload.player.crew_id) {
      throw new Error('crew_id を取得できませんでした');
    }

    const result = await post_json(payload);

    if (result.ok) {
      alert(`送信成功\ncrew_id: ${payload.player.crew_id}\n保存先: ${result.path || 'unknown'}`);
    } else {
      console.error(result);
      alert('GASへの送信に失敗しました。コンソールを確認してください。');
    }
  } catch (error) {
    console.error(error);
    alert(`処理に失敗しました: ${error.message}`);
  }
})();