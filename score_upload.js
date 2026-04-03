window.run_score_upload = async function () {
  'use strict';

  const GAS_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbxPXzlMOJzizzx9vZTpxO5t7hf-FCwGPm-JQ451fIL_XRq3raZeJZXYRxtIs4-DWdbC/exec';

  const get_total_play_count = (play_info) =>
    Number(play_info.standard_play_count || 0) +
    Number(play_info.freetime_play_count || 0) +
    Number(play_info.beginner_play_count || 0) +
    Number(play_info.local_matching_play_count || 0) +
    Number(play_info.global_matching_play_count || 0);

  const post_json = (payload) => {
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
        form.remove();
        iframe.remove();
        resolve({ ok: true });
      }, 1500);
    });
  };

  if (!window.jQuery) {
    await new Promise((resolve) => {
      const s = document.createElement('script');
      s.src = 'https://code.jquery.com/jquery-3.6.0.min.js';
      s.onload = resolve;
      document.head.appendChild(s);
    });
  }

  const $ = window.jQuery;

  const profile_res = await $.ajax({
    url: '../json/pdata_getdata.html',
    type: 'POST',
    dataType: 'json',
    data: {
      service_kind: 'profile',
      pdata_kind: 'profile'
    }
  });

  const music_res = await $.ajax({
    url: '../json/pdata_getdata.html',
    type: 'POST',
    dataType: 'json',
    data: {
      service_kind: 'music_data',
      pdata_kind: 'music_data'
    }
  });

  const play_data = profile_res?.data?.play_data || {};
  const usr_profile = play_data?.usr_profile || {};
  const usr_nametag = play_data?.usr_nametag || {};
  const usr_play_info = play_data?.usr_play_info || {};
  const music_list = music_res?.data?.score_data?.usr_music_highscore?.music || [];

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
    music: music_list.map((music) => ({
      music_id: music.music_id,
      music_title: music.name,
      diffs: (music.chart_list?.chart || []).map((chart) => ({
        diff: ({
          0: 'easy',
          1: 'normal',
          2: 'hard',
          3: 'inf',
          4: 'polar'
        })[chart.chart_difficulty_type] || String(chart.chart_difficulty_type),
        level: Number(chart.difficult || 0),
        ar: Number(chart.achievement_rate || 0),
        clear_status: ({
          0: 'no',
          1: 'play',
          2: 'success',
          3: 'full',
          4: 'perfect'
        })[chart.clear_status] || String(chart.clear_status),
        high_score: Number(chart.highscore || 0),
        maxcombo: Number(chart.maxcombo || 0),
        combo_rank: Number(chart.combo_rank || 0),
        score_rank: Number(chart.score_rank || 0),
        play_count: Number(chart.play_count || 0),
        perfect_clear_count: Number(chart.perfect_clear_count || 0),
        full_combo_count: Number(chart.full_combo_count || 0),
        clear_count: Number(chart.clear_count || 0),
        updated_at: chart.updated_at || '',
        nice_play_rank: Number(chart.nice_play_rank || 0)
      }))
    }))
  };

  if (!payload.player.crew_id) {
    throw new Error('crew_id を取得できませんでした');
  }

  await post_json(payload);

  alert(
    `送信を実行しました\ncrew_id: ${payload.player.crew_id}\nスプレッドシート / GitHub / Discord を確認してください`
  );
};