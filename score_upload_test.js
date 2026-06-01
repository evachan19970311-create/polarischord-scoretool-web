(function () {
  'use strict';

  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/gh/evachan19970311-create/polarischord-scoretool-web@847c84ab70fd7eee391cb325c28060b988fbac29/score_upload_test.js?v=restore-847c84a-20260601';
  script.async = false;
  script.onerror = function () {
    alert('score_upload_test.js の読み込みに失敗しました。ページを再読み込みしてから再度お試しください。');
  };

  document.head.appendChild(script);
})();
