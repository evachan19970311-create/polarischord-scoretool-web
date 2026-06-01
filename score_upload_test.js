(async function () {
  'use strict';

  const CORE_SCRIPT_URL =
    'https://cdn.jsdelivr.net/gh/evachan19970311-create/polarischord-scoretool-web@847c84ab70fd7eee391cb325c28060b988fbac29/score_upload_test.js?v=basic-course-dialog-20260601';

  const BASIC_COURSE_MESSAGE = 'ベーシックコース未加入です';

  function build_basic_course_error(xhr, request_url) {
    const error = new Error(BASIC_COURSE_MESSAGE);
    error.code = 'BASIC_COURSE_REQUIRED';
    error.stage = 'official_pdata_getdata';
    error.status = xhr?.status || 404;
    error.request_url = request_url || '';
    return error;
  }

  function is_basic_course_like_error(xhr) {
    const status = Number(xhr?.status || 0);
    const response_text = String(xhr?.responseText || '');

    return (
      status === 404 &&
      response_text.includes('<html') &&
      response_text.includes('404 Notfound')
    );
  }

  function show_basic_course_dialog() {
    const existing = document.getElementById('score-upload-basic-course-dialog');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'score-upload-basic-course-dialog';
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.zIndex = '2147483647';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.padding = '24px';
    overlay.style.background = 'rgba(0, 0, 0, 0.45)';

    const card = document.createElement('div');
    card.style.boxSizing = 'border-box';
    card.style.width = 'min(560px, 100%)';
    card.style.borderRadius = '20px';
    card.style.background = '#fff';
    card.style.padding = '28px 24px 24px';
    card.style.boxShadow = '0 20px 60px rgba(0, 0, 0, 0.28)';
    card.style.color = '#333';
    card.style.textAlign = 'center';
    card.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

    const title = document.createElement('div');
    title.textContent = BASIC_COURSE_MESSAGE;
    title.style.fontSize = '20px';
    title.style.fontWeight = '700';
    title.style.lineHeight = '1.5';
    title.style.marginBottom = '14px';

    const body = document.createElement('div');
    body.textContent = 'e-amusement ベーシックコースに加入した状態で、もう一度スコア登録を実行してください。';
    body.style.fontSize = '15px';
    body.style.lineHeight = '1.9';
    body.style.marginBottom = '22px';

    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = '閉じる';
    button.style.width = '100%';
    button.style.border = '0';
    button.style.borderRadius = '999px';
    button.style.padding = '14px 18px';
    button.style.background = '#333';
    button.style.color = '#fff';
    button.style.fontSize = '16px';
    button.style.fontWeight = '700';
    button.style.cursor = 'pointer';
    button.onclick = function () {
      overlay.remove();
    };

    card.appendChild(title);
    card.appendChild(body);
    card.appendChild(button);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
  }

  try {
    const response = await fetch(CORE_SCRIPT_URL, {
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`score_upload_test.js の本体取得に失敗しました (${response.status})`);
    }

    let core_script = await response.text();

    core_script = core_script
      .replace(
        "const request_json = ($, url, data) => {\n    return $.ajax({\n      url,\n      type: 'POST',\n      dataType: 'json',\n      data\n    });\n  };",
        "const request_json = ($, url, data) => {\n    const request_url = new URL(url, location.href).toString();\n\n    return new Promise((resolve, reject) => {\n      $.ajax({\n        url,\n        type: 'POST',\n        dataType: 'json',\n        data\n      })\n        .done((res) => resolve(res))\n        .fail((xhr) => {\n          if (window.__score_upload_test_is_basic_course_like_error__ && window.__score_upload_test_is_basic_course_like_error__(xhr)) {\n            reject(window.__score_upload_test_build_basic_course_error__(xhr, request_url));\n            return;\n          }\n\n          reject(xhr);\n        });\n    });\n  };"
      )
      .replace(
        "text.textContent = isBlocked\n        ? 'スコア登録できません'\n        : 'エラーが発生しました';",
        "text.textContent = error?.code === 'BASIC_COURSE_REQUIRED'\n        ? 'ベーシックコース未加入です'\n        : (isBlocked\n          ? 'スコア登録できません'\n          : 'エラーが発生しました');"
      )
      .replace(
        "result.textContent =\n        (error.message || String(error)) +\n        stageText;",
        "if (error?.code === 'BASIC_COURSE_REQUIRED') {\n        result.style.display = 'none';\n        window.__score_upload_test_show_basic_course_dialog__?.();\n      } else {\n        result.textContent = (error.message || String(error)) + stageText;\n      }"
      );

    window.__score_upload_test_is_basic_course_like_error__ = is_basic_course_like_error;
    window.__score_upload_test_build_basic_course_error__ = build_basic_course_error;
    window.__score_upload_test_show_basic_course_dialog__ = show_basic_course_dialog;

    const script = document.createElement('script');
    script.textContent = `${core_script}\n//# sourceURL=score_upload_test_basic_course_check_core.js`;
    document.head.appendChild(script);
  } catch (error) {
    console.error(error);
    alert(error?.message || String(error));
  }
})();
