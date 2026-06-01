(async function () {
  'use strict';

  const CORE_BLOB_API_URL =
    'https://api.github.com/repos/evachan19970311-create/polarischord-scoretool-web/git/blobs/e91205bd00c46d9e5989711c57d557e22045de5e';
  const ORIGINAL_EDGE_FUNCTION_URL =
    'https://gmoqmxemnmkgjycrjpkx.supabase.co/functions/v1/score-upload';
  const SAFE_EDGE_FUNCTION_URL =
    'https://gmoqmxemnmkgjycrjpkx.supabase.co/functions/v1/score-upload-safe';

  try {
    const response = await fetch(CORE_BLOB_API_URL, {
      headers: {
        Accept: 'application/vnd.github+json'
      }
    });

    if (!response.ok) {
      throw new Error(`core script fetch failed: ${response.status}`);
    }

    const blob = await response.json();
    const base64 = String(blob?.content || '').replace(/\s/g, '');

    if (!base64) {
      throw new Error('core script content is empty');
    }

    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }

    const decoder = new TextDecoder('utf-8');
    const coreScript = decoder
      .decode(bytes)
      .replaceAll(ORIGINAL_EDGE_FUNCTION_URL, SAFE_EDGE_FUNCTION_URL);

    const script = document.createElement('script');
    script.textContent = `${coreScript}\n//# sourceURL=score_upload_safe_core.js`;
    document.head.appendChild(script);
  } catch (error) {
    console.error(error);
    alert(
      'score_upload.js の読み込みに失敗しました。ページを再読み込みしてから再度お試しください。'
    );
  }
})();
