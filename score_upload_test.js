(async function () {
  'use strict';

  const CORE_SCRIPT_URL =
    'https://cdn.jsdelivr.net/gh/evachan19970311-create/polarischord-scoretool-web@847c84ab70fd7eee391cb325c28060b988fbac29/score_upload_test.js?v=basic-course-check-20260601';

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
        "result.textContent = error?.code === 'BASIC_COURSE_REQUIRED'\n        ? 'ベーシックコース未加入です。e-amusement ベーシックコースに加入した状態で、もう一度スコア登録を実行してください。'\n        : ((error.message || String(error)) + stageText);\n\n      if (error?.code === 'BASIC_COURSE_REQUIRED') {\n        alert('ベーシックコース未加入です');\n      }"
      );

    window.__score_upload_test_is_basic_course_like_error__ = is_basic_course_like_error;
    window.__score_upload_test_build_basic_course_error__ = build_basic_course_error;

    const script = document.createElement('script');
    script.textContent = `${core_script}\n//# sourceURL=score_upload_test_basic_course_check_core.js`;
    document.head.appendChild(script);
  } catch (error) {
    console.error(error);
    alert(error?.message || String(error));
  }
})();
