javascript:(async function(){
  'use strict';

  if (!window.jQuery) {
    await new Promise(o => {
      const s = document.createElement("script");
      s.src = "https://code.jquery.com/jquery-3.6.0.min.js";
      s.onload = o;
      document.head.appendChild(s);
    });
  }

  const p = i =>
    i.standard_play_count +
    i.freetime_play_count +
    i.beginner_play_count +
    i.local_matching_play_count +
    i.global_matching_play_count;

  $.ajax({
    url: "../json/pdata_getdata.html",
    type: "POST",
    dataType: "json",
    data: {
      service_kind: "profile",
      pdata_kind: "profile"
    }
  })
  .done(u => {

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

      const o = {
        crewId: u.data.play_data.crew_id,
        titleName: u.data.play_data.usr_nametag.set_title_name,
        playerName: u.data.play_data.usr_profile.usr_name,
        paSkill: u.data.play_data.usr_profile.pa_skill,
        paClass: u.data.play_data.usr_profile.pa_class,
        playCount: p(u.data.play_data.usr_play_info),
      };

      const j = JSON.stringify(o, null, 2),
            b = new Blob([j], { type: "application/json" }),
            U = URL.createObjectURL(b),
            a = document.createElement("a");

      a.href = U;
      a.download = "pc_profile_data.json";

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      URL.revokeObjectURL(U);

      alert("pc_profile_data.json %E3%82%92%E3%83%80%E3%82%A6%E3%83%B3%E3%83%AD%E3%83%BC%E3%83%89%E3%81%97%E3%81%BE%E3%81%97%E3%81%9F");
    });

  })
  .fail(() =>
    alert("%E3%83%97%E3%83%AC%E3%82%A4%E3%83%A4%E3%83%BC%E3%83%87%E3%83%BC%E3%82%BF%E3%81%AE%E5%8F%96%E5%BE%97%E3%81%AB%E5%A4%B1%E6%95%97%E3%81%97%E3%81%BE%E3%81%97%E3%81%9F%E3%80%82")
  );

})();