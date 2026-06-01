(function () {
  'use strict';

  const LEGACY_SCRIPT_URL =
    'https://cdn.jsdelivr.net/gh/evachan19970311-create/polarischord-scoretool-web@705af7df1852e4efe6b7ce4bd77b03ff04af9ca2/score_upload.js';
  const ORIGINAL_EDGE_FUNCTION_URL =
    'https://gmoqmxemnmkgjycrjpkx.supabase.co/functions/v1/score-upload';
  const SAFE_EDGE_FUNCTION_URL =
    'https://gmoqmxemnmkgjycrjpkx.supabase.co/functions/v1/score-upload-safe';

  function rewrite_score_upload_url(value) {
    const text = String(value || '');

    if (text === ORIGINAL_EDGE_FUNCTION_URL) {
      return SAFE_EDGE_FUNCTION_URL;
    }

    if (text.startsWith(ORIGINAL_EDGE_FUNCTION_URL + '?')) {
      return SAFE_EDGE_FUNCTION_URL + text.slice(ORIGINAL_EDGE_FUNCTION_URL.length);
    }

    return text;
  }

  if (!window.__score_upload_safe_endpoint_patched__) {
    window.__score_upload_safe_endpoint_patched__ = true;

    const original_fetch = window.fetch.bind(window);

    window.fetch = function (input, init) {
      if (typeof input === 'string') {
        return original_fetch(rewrite_score_upload_url(input), init);
      }

      if (input instanceof URL) {
        return original_fetch(new URL(rewrite_score_upload_url(input.toString())), init);
      }

      if (input instanceof Request) {
        const next_url = rewrite_score_upload_url(input.url);

        if (next_url !== input.url) {
          return original_fetch(new Request(next_url, input), init);
        }
      }

      return original_fetch(input, init);
    };
  }

  const script = document.createElement('script');
  script.src = LEGACY_SCRIPT_URL + '?v=score-upload-safe-20260601';
  script.async = false;
  script.onerror = function () {
    alert('score_upload.js の読み込みに失敗しました');
  };

  document.head.appendChild(script);
})();
