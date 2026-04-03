javascript:(async function(){
  'use strict';

  const D = {
    0: "easy",
    1: "nml",
    2: "hard",
    3: "inf",
    4: "plr"
  };

  const C = {
    0: "no",
    1: "play",
    2: "success",
    3: "full",
    4: "perfect"
  };

  if (!window.jQuery) {
    await new Promise(o => {
      const s = document.createElement("script");
      s.src = "https://code.jquery.com/jquery-3.6.0.min.js";
      s.onload = o;
      document.head.appendChild(s);
    });
  }

  $.ajax({
    url: "../json/pdata_getdata.html",
    type: "POST",
    dataType: "json",
    data: {
      service_kind: "music_data",
      pdata_kind: "music_data"
    }
  })
  .done(res => {

    const map = {}; // ★ 曲ごとにまとめる用

    $(res.data.score_data.usr_music_highscore.music).each(function(){
      const m = this.music_id;
      const t = this.name;

      // ★ 初回だけ作成
      if (!map[m]) {
        map[m] = {
          music_id: m,
          music_title: t,
          diffs: []
        };
      }

      $(this.chart_list.chart).each(function(){
        map[m].diffs.push({
          diff: D[this.chart_difficulty_type],
          level: Number(this.difficult),
          ar: this.achievement_rate,
          clear_status: C[this.clear_status],
          highScore: this.highscore,
          maxcombo: this.maxcombo,
          combo_rank: this.combo_rank,
          score_rank: this.score_rank,
          play_count: this.play_count,
          perfect_clear_count: this.perfect_clear_count,
          full_combo_count: this.full_combo_count,
          clear_count: this.clear_count,
          updated_at: this.updated_at,
          nice_play_rank: this.nice_play_rank
        });
      });
    });

    // ★ 配列に変換
    const result = Object.values(map);

    const j = JSON.stringify(result, null, 2),
          b = new Blob([j], { type: "application/json" }),
          U = URL.createObjectURL(b),
          a = document.createElement("a");

    a.href = U;
    a.download = "pc_score_data.json";

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(U);

    alert("pc_score_data.json をダウンロードしました");
  })
  .fail(() =>
    alert("データの取得に失敗しました")
  );

})();