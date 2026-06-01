(async function () {
  'use strict';

  const CORE_SCRIPT_URL =
    'https://cdn.jsdelivr.net/gh/evachan19970311-create/polarischord-scoretool-web@847c84ab70fd7eee391cb325c28060b988fbac29/score_upload.js?v=test-diagnostics-20260601-1145';
  const ORIGINAL_EDGE_FUNCTION_URL =
    'https://gmoqmxemnmkgjycrjpkx.supabase.co/functions/v1/score-upload';
  const SAFE_EDGE_FUNCTION_URL =
    'https://gmoqmxemnmkgjycrjpkx.supabase.co/functions/v1/score-upload-safe';

  function stringifyError(error) {
    if (error instanceof Error) {
      return [
        error.message || String(error),
        error.stage ? `stage: ${error.stage}` : '',
        error.status ? `status: ${error.status}` : '',
        error.statusText ? `statusText: ${error.statusText}` : '',
        error.responseText ? `responseText: ${String(error.responseText).slice(0, 500)}` : ''
      ].filter(Boolean).join('\n');
    }

    if (error && typeof error === 'object') {
      const parts = [];
      if (error.status != null) parts.push(`status: ${error.status}`);
      if (error.statusText != null) parts.push(`statusText: ${error.statusText}`);
      if (error.responseText != null) parts.push(`responseText: ${String(error.responseText).slice(0, 500)}`);
      if (error.readyState != null) parts.push(`readyState: ${error.readyState}`);

      try {
        parts.push(`json: ${JSON.stringify(error).slice(0, 500)}`);
      } catch (_error) {
        parts.push(String(error));
      }

      return parts.filter(Boolean).join('\n') || String(error);
    }

    return String(error);
  }

  function patchRuntime() {
    if (window.__score_upload_test_diagnostics_patched__) return;
    window.__score_upload_test_diagnostics_patched__ = true;

    window.addEventListener('unhandledrejection', function (event) {
      console.error('score_upload_test unhandledrejection:', event.reason);
    });

    window.addEventListener('error', function (event) {
      console.error('score_upload_test error:', event.error || event.message);
    });
  }

  try {
    patchRuntime();

    const response = await fetch(CORE_SCRIPT_URL, {
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`core script fetch failed: ${response.status}`);
    }

    let coreScript = await response.text();

    coreScript = coreScript
      .replaceAll(ORIGINAL_EDGE_FUNCTION_URL, SAFE_EDGE_FUNCTION_URL)
      .replace(
        "result.textContent =\n        (error.message || String(error)) +\n        stageText;",
        "result.textContent = (window.__score_upload_test_format_error__ ? window.__score_upload_test_format_error__(error) : ((error && error.message) || String(error))) + stageText;"
      )
      .replace(
        "console.error(error);",
        "console.error('score_upload_test caught error:', error);"
      );

    window.__score_upload_test_format_error__ = stringifyError;

    const script = document.createElement('script');
    script.textContent = `${coreScript}\n//# sourceURL=score_upload_test_core.js`;
    document.head.appendChild(script);
  } catch (error) {
    console.error(error);
    alert(
      'score_upload_test.js の読み込みに失敗しました。\n' + stringifyError(error)
    );
  }
})();
