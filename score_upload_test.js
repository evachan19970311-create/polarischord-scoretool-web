(function () {
  'use strict';

  const script = document.createElement('script');
  script.src = 'https://pc-scoretool-web.com/bookmarklet/score_upload_test.js?v=' + Date.now();
  script.async = false;
  script.onerror = function () {
    alert('テスト用スコア登録スクリプトの読み込みに失敗しました。ページを再読み込みしてから再度お試しください。');
  };

  document.head.appendChild(script);
})();
