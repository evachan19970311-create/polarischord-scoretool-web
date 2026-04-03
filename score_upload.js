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

  const to_array = (v) => Array.isArray(v) ? v : (v ? [v] : []);

  const ensure_jquery = async () => {
    if (window.jQuery) return window.jQuery;
    await new Promise((resolve) => {
      const s = document.createElement('script');
      s.src = 'https://code.jquery.com/jquery-3.6.0.min.js';
      s.onload = resolve;
      document.head.appendChild(s);
    });
    return window.jQuery;
  };

  const request_pdata = ($, data) => {
    return $.ajax({
      url: '../json/pdata_getdata.html',
      type: 'POST',
      dataType: 'json',
      data: data
    });
  };

  const request_common_data = ($) => {
    return $.ajax({
      url: '../json/common_getdata.html',
      type: 'POST',
      dataType: 'json',
      data: {
        service_kind: 'music_data',
        pdata_kind: 'music_data'
      }
    });
  };

  const post_json = (payload) => {
    return new Promise((resolve) => {
      const iframe = document.createElement('iframe');
      iframe.name = 'hidden_iframe';
      iframe.style.display = 'none';
      document.body.appendChild(iframe);

      const form = document.createElement('form');
      form.method = 'POST';
      form.action = GAS_WEBAPP_URL;
      form.target = iframe.name;

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
        resolve();
      }, 1500);
    });
  };

  const $ = await ensure_jquery();

  const [profile_res, music_res, common_res] = await Promise.all([
    request_pdata($, { service_kind: 'profile', pdata_kind: 'profile' }),
    request_pdata($, { service_kind: 'music_data', pdata_kind: 'music_data' }),
    request_common_data($)
  ]);

  const play_data = profile_res.data.play_data;
  const usr_profile = play_data.usr_profile;
  const usr_nametag = play_data.usr_nametag;
  const usr_play_info = play_data.usr_play_info;

  const music_list = music_res.data.score_data.usr_music_highscore.music;
  const common_music = common_res.data.music_list || [];

  const payload = {
    version: 1,
    source: 'bookmarklet',
    exported_at: new Date().toISOString(),
    player: {
      crew_id: String(play_data.crew_id),
      player_name: usr_profile.usr_name,
      title_name: usr_nametag.set_title_name,
      pa_skill: Number(usr_profile.pa_skill),
      pa_class: Number(usr_profile.pa_class),
      play_count: Number(usr_play_info.total_play_count || 0)
    },
    music: to_array(music_list).map(m => ({
      music_id: m.music_id,
      music_title: m.name,
      diffs: to_array(m.chart_list.chart).map(c => ({
        diff: DIFF_MAP[c.chart_difficulty_type],
        level: Number(c.difficult),
        ar: Number(c.achievement_rate),
        clear_status: CLEAR_MAP[c.clear_status],
        high_score: Number(c.highscore),
        play_count: Number(c.play_count),
        updated_at: c.updated_at
      }))
    })),
    common_music: to_array(common_music)
  };

  await post_json(payload);

  alert(
    '送信を実行しました\n' +
    `crew_id: ${payload.player.crew_id}\n` 
  );
};