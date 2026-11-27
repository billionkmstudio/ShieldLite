(() => {
  'use strict';
  const C = window.ShieldCore;
  // Single source of truth for the version shown in the footer and About tab.
  // Bump this (and CACHE in sw.js) on every release.
  const APP_VERSION = '1.4.0';
  const COPYRIGHT_FROM = 2026;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  function el(tag, attrs, ...kids) {
    const n = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v == null || v === false) continue;
        if (k === 'class') n.className = v;
        else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
        else n.setAttribute(k, v === true ? '' : v);
      }
    }
    for (const kid of kids.flat()) {
      if (kid != null && kid !== false) n.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    }
    return n;
  }

  /* ------------------------------ storage ------------------------------ */
  const store = {
    get(k, d) { try { const v = localStorage.getItem('sl.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('sl.' + k, JSON.stringify(v)); } catch (e) { /* private mode */ } },
    clear() { try { Object.keys(localStorage).filter((k) => k.startsWith('sl.')).forEach((k) => localStorage.removeItem(k)); } catch (e) { /* ignore */ } }
  };

  /* ------------------------------- i18n ------------------------------- */
  const I18N = {
    zh: {
      tagline: '手機安全，一目了然',
      tab_link: '連結', tab_pw: '密碼', tab_health: '健檢', tab_about: '關於',
      paste: '貼上', copy: '複製', copied: '已複製', clear: '清除', show: '顯示', hide: '隱藏',
      inst_t: '加入主畫面',
      inst_d: '在 Safari 按分享按鈕，選擇「加入主畫面」，即可當作 App 使用，連結分析更可離線進行。',
      inst_d_android: '在 Chrome 按右上角 ⋮，選擇「安裝應用程式」或「加至主畫面」，即可當作 App 使用，連結分析更可離線進行。',
      inst_close: '知道了',

      link_h: '檢查連結',
      link_lede: '貼上短訊、WhatsApp 或電郵中的連結，整段訊息一併貼上亦可。分析在你的裝置上進行。',
      link_label: '要檢查的連結',
      link_ph: 'https://…',
      link_check: '檢查連結',
      err_empty: '請先貼上連結。',
      err_invalid: '無法辨識此連結，請檢查是否有遺漏或錯字。',
      err_notweb: '此連結並非網頁連結（電話、短訊或電郵）。',
      paste_fail: '未能讀取剪貼簿，請長按輸入框貼上。',
      lvl_low: '未見警號', lvl_caution: '請小心', lvl_warn: '相當可疑', lvl_high: '高度危險',
      lvl_low_d: '未發現常見的釣魚特徵。',
      lvl_caution_d: '有部分可疑特徵。核實寄件人之前，請勿輸入任何資料。',
      lvl_warn_d: '特徵與釣魚連結相近。切勿輸入密碼、驗證碼或付款資料。',
      lvl_high_d: '極可能是騙局或惡意連結。請勿開啟，亦可考慮舉報。',
      score_line: (n) => `風險 ${n} / 100`,
      dest_h: '實際前往的網站',
      official: (d) => `屬已知官方網域（${d}）`,
      findings_h: '判斷依據',
      disclaimer_link: '此為本機特徵分析，不能保證安全。沒有警號不等於可信，全新的釣魚網站亦可能未有明顯特徵。收到要求「即時處理」的訊息，最穩妥的做法是不按連結，直接開啟官方 App 或自行輸入網址。',
      lookup_h: '以信譽服務再作查證',
      lookup_note: '按下後才會將連結傳送至該服務，並開啟新頁面。',
      defang: '複製無害化連結（方便舉報）',
      sb_checking: 'Google Safe Browsing：查詢中…',
      sb_clean: 'Google Safe Browsing：未列入黑名單',
      sb_hit: (t) => `Google Safe Browsing：已列入黑名單（${t}）`,
      sb_err: 'Google Safe Browsing：查詢失敗，請檢查網絡或 API Key',
      schemeless: '連結未註明開頭，已當作 https:// 分析。',

      f_scheme_danger: (p) => [`危險的連結類型：${p.scheme}:`, '這並非一般網頁，可執行程式碼，或安裝 App／描述檔（例如 itms-services 是 iOS 企業 App 安裝）。除非你完全清楚其用途，否則切勿開啟。'],
      f_scheme_odd: (p) => [`並非一般網頁連結（${p.scheme}）`, '正常網站應使用 https。'],
      f_ip: () => ['網址使用 IP 位址，沒有網站名稱', '正規機構甚少如此，騙徒常藉此避開網域審查。'],
      f_homograph: (p) => ['網域夾雜外觀相似的外國字母', `解碼後為「${p.unicode}」。看似英文字母，實際可能是西里爾或希臘字母（同形字攻擊）。`],
      f_idn_mixed: (p) => ['網域混合中文與英文字母', `解碼後為「${p.unicode}」。香港有合法的中文網域，但請仔細核對。`],
      f_idn_cjk: (p) => ['中文網域', `解碼後為「${p.unicode}」。屬正常用法，請確認是你預期的網站。`],
      f_idn: (p) => ['網域包含特殊字元', `解碼後為「${p.unicode}」。特殊字元可令假網域看來與真網域無異。`],
      f_userinfo: (p) => ['網址含有用作誤導的 @ 符號', `「@」前面只是假帳戶名稱，瀏覽器實際會前往「@」後面的 ${p.host}。`],
      f_nohttps: () => ['未經加密（http）', '資料會以明文傳送。正規的登入及付款頁面不會如此。'],
      f_shortener: (p) => ['短網址，無法看到真正目的地', `${p.host} 會轉往另一個網站，本工具無法在本機展開。可使用下方的信譽服務，或向寄件人索取完整連結。`],
      f_tld_zip: (p) => [`網域尾綴 .${p.tld} 容易與檔案名稱混淆`, '.zip 和 .mov 是真正的網域尾綴，騙徒會偽裝成檔案連結。'],
      f_tld: (p) => [`網域尾綴 .${p.tld} 常被濫用`, '此類尾綴註冊費用低廉，常見於釣魚及垃圾網站，但亦有正當用途。'],
      f_subdomains: (p) => ['子網域層數過多', `前面的名稱只用作誤導，真正網站是 ${p.domain}。`],
      f_hyphens: () => ['網域連字號過多', '「品牌-secure-login-verify」一類網域是常見的釣魚特徵。'],
      f_longhost: () => ['網域名稱異常地長', '過長的網域常用來隱藏真正名稱。'],
      f_brand: (p) => [`疑似冒充 ${p.brand}`, `網址中含有「${p.token}」，但真正網域是 ${p.domain}，並非 ${p.brand} 的官方網域。`],
      f_typo: (p) => [`網域名稱近似 ${p.brand}（${p.name} ≈ ${p.key}）`, `疑似拼寫陷阱。真正網域是 ${p.domain}。`],
      f_keywords: (p) => [`含有常見釣魚字眼：${p.words.join('、')}`, '單獨出現未必有問題，但與其他警號同時出現便須提防。'],
      f_redirect: () => ['網址內附另一個網址（轉址參數）', '可能經正規網站轉往危險網站。'],
      f_risky_file: (p) => (p.ext === 'mobileconfig'
        ? ['會下載 iOS 設定描述檔（.mobileconfig）', '描述檔可更改 VPN、DNS 及憑證，一旦被濫用便可監控你的網絡流量。如不認識來源，切勿安裝。']
        : [`連結指向 .${p.ext} 檔案`, '此類檔案可能是惡意程式或安裝檔。']),
      f_port: (p) => [`使用非標準連接埠 :${p.port}`, '一般網站不會如此，可能是臨時架設的釣魚網站。'],
      f_longurl: () => ['網址異常地長', '過長的網址常用來隱藏真正目標。'],

      pw_h: '密碼是否已洩漏',
      pw_lede: '與已知資料外洩的密碼庫比對，查看你的密碼是否曾經出現。',
      pw_label: '要檢查的密碼',
      pw_ph: '輸入密碼',
      pw_check: '檢查洩漏',
      pw_privacy: '密碼不會離開你的裝置。只有密碼 SHA-1 雜湊值的首 5 個字元會傳送至 Have I Been Pwned（k-匿名），比對在本機完成。離開此頁或將 App 移至背景時，輸入框會自動清空。',
      pw_loading: '檢查中…',
      pw_clean_t: '資料庫中未有紀錄',
      pw_clean_d: '此密碼未出現於已知的洩漏紀錄，但不代表足夠安全，只代表尚未被收錄。每個網站都應使用不同密碼。',
      pw_pwned_t: (n) => `已洩漏，曾出現 ${n.toLocaleString()} 次`,
      pw_pwned_d: '請立即停用，並更換所有曾使用此密碼的網站密碼。',
      pw_offline: '目前沒有網絡連線，無法檢查。',
      pw_insecure: '此頁面並非 HTTPS，瀏覽器不允許使用加密功能。請以 https:// 網址開啟。',
      pw_error: '查詢失敗，請稍後再試。',
      strength: ['非常弱', '弱', '一般', '良好', '強'],
      sf_common: '常見密碼', sf_repeat: '重複字元過多', sf_sequence: '連續字元', sf_short: '太短', sf_digits: '全數字',
      strength_note: (b) => `估算強度約 ${b} bits`,
      gen_h: '產生隨機密碼',
      gen_len: '長度',
      gen_upper: '大寫字母', gen_lower: '小寫字母', gen_digits: '數字', gen_symbols: '符號',
      gen_noamb: '避免易混淆字元（0 O 1 l I）',
      gen_new: '重新產生',
      gen_note: '以裝置內置的安全亂數產生，不會儲存或傳送。建議存入密碼 App 或密碼管理工具。',
      email_h: '查詢電郵是否已洩漏',
      email_p: '電郵洩漏查詢需要登入或付費 API，因此本工具不會直接查詢。你可前往 Have I Been Pwned 官方網站，該網站只會收到你輸入的電郵地址。',
      email_btn: '開啟 Have I Been Pwned',

      hl_h: 'iPhone 保安健檢', hl_h_android: 'Android 保安健檢',
      plat_label: '選擇手機類型',
      g_quick: '5 項必做',
      q_progress: (d, n) => `快速檢查：${n} 項中已完成 ${d} 項`,
      q_done: '5 項必做已全部完成',
      q_next_more: '如想更加穩妥，可繼續完成進階檢查。',
      q_more: (n) => `顯示進階檢查（另有 ${n} 項）`,
      q_less: '只顯示 5 項必做',
      ab_share_h: '分享即檢查',
      ab_share_p: '收到可疑連結時，毋須複製貼上，只要在 WhatsApp、短訊或電郵中直接分享至 ShieldLite，便會即時分析。',
      ab_share_and_h: 'Android：',
      ab_share_and: '先在 Chrome 為 ShieldLite「安裝應用程式」，之後長按連結 → 分享 → 選擇 ShieldLite。',
      ab_share_ios_h: 'iPhone：以「捷徑」App 建立分享按鈕（只需設定一次）',
      ab_share_s1: '開啟「捷徑」App → 右上角 ＋ 新增捷徑，命名為「ShieldLite 檢查」。',
      ab_share_s2: '按底部 ⓘ → 開啟「在分享表單中顯示」，接收類型只選「URL」和「文字」。',
      ab_share_s3: '加入動作「URL 編碼」，編碼內容選擇「捷徑輸入」。',
      ab_share_s4: '加入動作「打開 URL」，網址填入下方一行，最後按「插入變數」並選擇「已編碼的文字」。',
      ab_share_s5: '設定完成。日後在訊息中長按連結 → 分享 → 選擇「ShieldLite 檢查」即可。',
      ab_share_url: '捷徑使用的網址：',
      hl_lede: '跟隨以下清單逐項檢查，只需數分鐘，即可令你的手機更安全。每完成一項，請在旁邊打剔。',
      hl_score: '保安分數',
      hl_good: '表現良好', hl_ok: '尚可，仍有改善空間', hl_low: '需要加強',
      hl_next: (t) => `下一步：${t}`,
      hl_all: '已全部完成，請繼續保持。',
      hl_reset: '重設清單',
      hl_note: '選單名稱或因 iOS 版本而略有不同。清單進度只儲存在你的裝置。',
      hl_note_android: '選單名稱會因品牌（Samsung、Pixel、小米等）及 Android 版本而有出入，如找不到可使用設定中的搜尋功能。清單進度只儲存在你的裝置。',
      hl_must: '重要',
      hl_env_https: '安全連線（HTTPS）', hl_env_app: '已加入主畫面', hl_env_net: '網絡已連線',
      v_h: '版本檢查',
      v_loading: '正在檢查你的系統及瀏覽器版本…',
      v_err: '暫時未能取得最新版本資料，請稍後再試，或直接到設定檢查更新。',
      v_see: '偵測結果', v_should: '建議版本', v_why: '重要原因', v_how: '更新方法',
      v_unknown: '無法讀取版本號',
      v_t_ios: 'iOS 系統', v_t_chrome_ios: 'iPhone 上的 Chrome',
      v_t_chrome: (p) => `Chrome（${p}）`, v_t_browser: (b) => b,
      v_s_ok: '已是最新', v_s_patch: '有小型更新', v_s_behind: '版本過舊', v_s_check: '請手動確認',
      v_s_oldbranch: '舊系列，仍有修補', v_s_nodata: '未有資料', v_s_unsupported: '未支援自動檢查',
      v_want_ios: (v) => `iOS ${v} 或以上`,
      v_want_chrome: (min, latest) => min === latest ? `${latest} 或以上` : `${min} 或以上（最新 ${latest}）`,
      v_want_none: '—',
      v_why_ok: '保持開啟自動更新即可。',
      v_why_patch: '同一大版本已有較新的修補版，通常包含保安修補。',
      v_why_behind: (n) => n > 0 ? `落後 ${n} 個大版本。舊版本的漏洞已經公開，攻擊者可直接利用。` : '舊版本的漏洞已經公開，攻擊者可直接利用。',
      v_why_check_ios: (have, latest) => have ? `瀏覽器只會透露大概的版本號（${have}），無法分辨你是否已安裝 ${latest} 這類小型更新，請自行到設定確認。` : '此瀏覽器無法讀取 iOS 版本，請自行到設定確認。以 Safari 開啟此頁即可自動檢查。',
      v_why_check_chrome: 'Chrome 只會透露大版本號，無法分辨已修補與未修補的版本，請自行到設定確認。',
      v_why_oldbranch: (v) => `你的裝置正使用較舊的 iOS 系列，Apple 仍有提供修補（此系列最新為 ${v}）。如裝置支援新系列，建議升級。`,
      v_why_nodata: '暫時未有此平台的版本資料。',
      v_why_unsupported: '目前只支援自動檢查 Chrome 及 iOS。',
      v_why_chrome_ios: 'iPhone 上的 Chrome 實際使用 Apple 的引擎，網頁漏洞主要依靠 iOS 更新修補；App 本身亦應保持最新。',
      v_kev: '近期已被利用的漏洞：',
      v_kev_item: (cve, d) => `${cve}（${d} 列入 CISA 清單）`,
      v_how_ios: '設定 → 一般 → 軟件更新。',
      v_how_chrome_ios: 'App Store → 按右上角頭像 → 更新 Chrome。',
      v_how_android: 'Play 商店 → 搜尋 Chrome → 更新，然後重新開啟 Chrome。',
      v_how_desktop: '在網址列輸入 chrome://settings/help，待更新完成後按「重新啟動」。',
      v_how_other: '到瀏覽器的「設定 → 關於」檢查更新。',
      v_foot: (d) => `版本資料更新於 ${d}。結果根據瀏覽器提供的資料推算，未必完全準確。`,
      g_device: '裝置', g_account: '帳戶及密碼', g_net: '網絡及訊息', g_privacy: '私隱',
      p_h: '保安更新日期',
      p_how: '網頁無法讀取此日期。請到 設定 → 關於手機 → Android 版本 →「Android 保安更新」（Samsung：設定 → 關於手機 → 軟件資訊 →「Android 安全性修補程式等級」），然後在下方選擇相應月份。',
      p_label: 'Android 保安更新月份',
      p_device: (v) => `偵測到：${v}`,
      p_see: '偵測結果', p_should: '建議狀態', p_why: '重要原因',
      p_have: (ym, n) => n === 0 ? `${ym}（本月）` : `${ym}（已過 ${n} 個月）`,
      p_want: '最近 1–2 個月內',
      p_s_ok: '仍有更新', p_s_caution: '略為過時', p_s_high: '可能已停止支援',
      p_why_ok: 'Google 每月發布保安修補，你的裝置仍定期收到更新。',
      p_why_caution: '已有 3 個月或以上未安裝保安修補。請到「軟件更新」查看是否有可用更新；如沒有，可能是廠商開始減少支援。',
      p_why_high: '已超過半年沒有保安修補，裝置很可能已停止支援。網上銀行及付款最好改用仍有更新的手機。',
      p_kev: '近期已被利用的 Android 漏洞：',
      p_clear: '清除',
      g_a_device: '裝置', g_a_apps: 'App 及惡意程式', g_a_account: '帳戶及密碼', g_a_net: '網絡及訊息',
      h_a_update_t: '保持系統及保安更新為最新',
      h_a_update_d: '設定 → 系統 → 軟件更新（Samsung：設定 → 軟件更新）。另外到 設定 → 保安與私隱 → 系統與更新 → Google Play 系統更新。',
      h_a_lock_t: '使用 6 位或以上的 PIN 或密碼',
      h_a_lock_d: '設定 → 保安與私隱 → 裝置解鎖 → 螢幕鎖定。請勿使用圖案鎖，因為容易被旁人偷看。',
      h_a_theft_t: '開啟失竊保護',
      h_a_theft_d: '設定 → Google → 所有服務 → 失竊保護，開啟「失竊偵測鎖定」及「離線裝置鎖定」。如手機被搶，裝置會自動上鎖。',
      h_a_find_t: '開啟「尋找我的裝置」',
      h_a_find_d: '設定 → Google → 所有服務 → 尋找我的裝置，確認已開啟。Samsung 用戶可同時開啟「SmartThings Find」。',
      h_a_sideload_t: '切勿安裝來歷不明的 APK',
      h_a_sideload_d: '設定 → 應用程式 → 特殊應用程式存取權 → 安裝不明應用程式，將所有 App 設為「不允許」。騙徒最常經 WhatsApp、短訊或假冒客服要求你安裝 APK，正規 App 必定可在 Play 商店找到。',
      h_a_protect_t: '開啟 Google Play Protect',
      h_a_protect_d: 'Play 商店 → 按右上角頭像 → Play Protect → ⚙ 設定，開啟「使用 Play Protect 掃描應用程式」，並按「掃描」進行一次檢查。',
      h_a_access_t: '檢查「無障礙」權限',
      h_a_access_d: '設定 → 無障礙功能 → 已下載的應用程式（或「已安裝的服務」）。除你認識且確實需要的 App（例如密碼管理工具）外，請全部關閉。惡意 App 一旦取得此權限，便可監看你的畫面、代你操作，藉此盜取銀行驗證碼。',
      h_a_admin_t: '檢查裝置管理員及可讀取短訊的 App',
      h_a_admin_d: '設定 → 保安與私隱 → 更多保安設定 → 裝置管理員應用程式，只保留「尋找我的裝置」等你認識的項目。然後到 設定 → 私隱 → 權限管理員 → 短訊，查看哪些 App 可讀取短訊。',
      h_a_apps_t: '刪除不再使用及不認識的 App',
      h_a_apps_d: '設定 → 應用程式，查看所有 App，刪除不認識或長期未使用的項目。如有無法刪除的陌生 App，可能已取得裝置管理員權限，須先在上一項取消。',
      h_a_g2fa_t: 'Google 帳戶開啟兩步驗證',
      h_a_g2fa_d: '設定 → Google → 管理你的 Google 帳戶 → 安全性 → 兩步驗證。同時加入密碼金鑰（passkey）及備用電話號碼。',
      h_a_pwmanager_t: '每個網站使用不同密碼',
      h_a_pwmanager_d: '使用內置的 Google 密碼管理工具，或 1Password、Bitwarden 等。重複使用密碼是帳戶被盜最常見的原因。',
      h_a_checkup_t: '進行一次 Google 密碼檢查',
      h_a_checkup_d: '設定 → Google → 自動填入 → Google 密碼管理工具 → 密碼檢查。逐一更換已洩漏、重複或過弱的密碼。',
      h_a_backup_t: '開啟 Google 備份',
      h_a_backup_d: '設定 → Google → 備份（或 設定 → 系統 → 備份），確認「Google One 備份」已開啟。萬一遺失裝置或需要重設，便可還原資料。',
      h_a_chrome_t: 'Chrome 開啟安全瀏覽',
      h_a_chrome_d: 'Chrome → ⋮ → 設定 → 私隱與安全 → 安全瀏覽，選擇「加強保護」或至少「標準保護」。',
      h_a_spam_t: '開啟垃圾短訊及來電過濾',
      h_a_spam_d: 'Google 訊息 → 頭像 → 訊息設定 → 垃圾訊息防護，開啟。電話 App → 設定 → 來電顯示與垃圾來電，開啟。Samsung 用戶請在相應 App 的設定中尋找「封鎖號碼與垃圾訊息」。',
      h_a_wifi_t: '不要自動連接公共 Wi-Fi',
      h_a_wifi_d: '設定 → 網絡和互聯網 → Wi-Fi，為公共網絡關閉「自動連線」；並在網絡詳情的私隱設定中選擇「使用隨機 MAC」。',
      h_a_perms_t: '檢查 App 權限',
      h_a_perms_d: '設定 → 保安與私隱 → 私隱 → 權限管理員，逐項（位置、相機、麥克風、相片）查看哪些 App 擁有權限，不需要的便關閉。',
      h_a_advanced_t: '（選用）高風險人士可開啟進階保護',
      h_a_advanced_d: 'Android 16 或以上：設定 → 保安與私隱 → 進階保護。此功能會限制安裝 App 等操作，只適合可能成為針對性攻擊目標的人士，一般用戶毋須開啟。',
      h_update_t: '保持 iOS 為最新版本',
      h_update_d: '設定 → 一般 → 軟件更新，開啟「自動更新」。大部分入侵都是利用已修補的舊漏洞。',
      h_passcode_t: '使用 6 位或以上的密碼',
      h_passcode_d: '設定 → Face ID 與密碼 → 更改密碼 → 密碼選項，選擇「自訂英數密碼」或 6 位數字。',
      h_sdp_t: '開啟失竊裝置保護',
      h_sdp_d: '設定 → Face ID 與密碼 → 失竊裝置保護。即使有人偷取手機並知道密碼，更改 Apple 帳戶密碼等敏感操作仍須 Face ID 並設有延遲。',
      h_findmy_t: '開啟「尋找我的 iPhone」',
      h_findmy_d: '設定 → 你的名字 → 尋找 → 尋找我的 iPhone，同時開啟「尋找網絡」及「傳送最後位置」。',
      h_profiles_t: '檢查是否有陌生的描述檔或 VPN',
      h_profiles_d: '設定 → 一般 → VPN 與裝置管理。如發現不認識的描述檔，請點選並「移除描述檔」。這是 iOS 上最接近「中毒檢查」的地方。',
      h_apple2fa_t: 'Apple 帳戶開啟雙重認證',
      h_apple2fa_d: '設定 → 你的名字 → 登入與安全性。確認雙重認證已開啟，並設定備用電話號碼及帳戶復原聯絡人。',
      h_pwmanager_t: '每個網站使用不同密碼',
      h_pwmanager_d: '使用內置的「密碼」App，或 1Password、Bitwarden 等。重複使用密碼是帳戶被盜最常見的原因。',
      h_pwrecs_t: '處理「安全建議」中的警告',
      h_pwrecs_d: '設定 → 密碼 → 安全建議。逐一更換已洩漏、重複或過弱的密碼。',
      h_backup_t: '開啟 iCloud 備份（或電腦備份）',
      h_backup_d: '設定 → 你的名字 → iCloud → iCloud 備份。萬一遺失裝置或遭遇勒索，便可還原資料。',
      h_safari_t: 'Safari 開啟「欺詐性網站警告」',
      h_safari_d: '設定 → App → Safari（舊版：設定 → Safari），確認「欺詐性網站警告」已開啟。',
      h_unknown_t: '過濾陌生人的訊息',
      h_unknown_d: '設定 → 訊息 → 未知與垃圾訊息 → 過濾未知寄件者。有關包裹、稅務及銀行的釣魚短訊大多來自陌生號碼。',
      h_wifi_t: '開啟私人 Wi-Fi 位址，不要自動連接公共 Wi-Fi',
      h_wifi_d: '設定 → Wi-Fi → 按已連接網絡旁的 ⓘ，開啟「私人 Wi-Fi 位址」，並關閉公共網絡的「自動加入」。',
      h_perms_t: '檢查 App 權限',
      h_perms_d: '設定 → 私隱與保安，逐項（位置、相機、麥克風、相片）查看哪些 App 擁有權限，不需要的便關閉。',
      h_apps_t: '刪除不再使用及不認識的 App',
      h_apps_d: '設定 → 一般 → iPhone 儲存空間，查看 App 列表，刪除不認識或長期未使用的項目。',
      h_lockdown_t: '（選用）高風險人士可開啟鎖定模式',
      h_lockdown_d: '設定 → 私隱與保安 → 鎖定模式。此模式會限制大量功能，只適合可能成為針對性攻擊目標的人士，一般用戶毋須開啟。',

      ab_h: '關於 ShieldLite',
      ab_what: '針對 iPhone 及 Android 用戶最常遇到的威脅而設：釣魚短訊、假冒 App、密碼洩漏及保安設定疏忽。輕巧、免安裝，資料留在你的裝置。',
      ab_cant_h: '功能限制',
      ab_cant1: '網頁無權掃描手機中的 App 或系統檔案，因此本工具並非傳統防毒軟件。iPhone 上連原生 App 亦無法進行此類掃描；Android 用戶請使用內置的 Play Protect。',
      ab_cant2: '網頁版無法讀取你裝置的系統設定，因此「健檢」屬自我檢查清單。',
      ab_cant3: '短網址無法在本機展開，請使用信譽服務或向寄件人查證。',
      ab_net_h: '私隱及資料用途',
      ab_priv_p: 'ShieldLite 不設帳戶，不使用 cookies，亦沒有任何追蹤或分析工具。你輸入的連結和密碼不會被儲存或上載。',
      ab_net_sub: '會連接的服務',
      ab_net1: '連結分析：預設完全在本機進行，不會傳送任何資料。',
      ab_net2: '密碼檢查：只會將雜湊值的首 5 個字元傳送至 api.pwnedpasswords.com。',
      ab_net3: 'Safe Browsing：只有在你自行開啟並提供 API Key 後，連結才會傳送至 Google。',
      ab_net4: '版本檢查：只會從本網站讀取一份公開的版本清單（versions.json），版本比較在你的裝置進行，不會傳送任何資料。',
      ab_net5: '外部網站：只有在你按下 VirusTotal、URLhaus、Have I Been Pwned 等連結時，才會開啟該網站，並受其私隱政策約束。',
      ab_store_sub: '儲存在你裝置上的資料',
      ab_store_p: '健檢進度、平台及語言選擇、Android 保安更新月份，以及（如有設定）Safe Browsing API Key。這些資料只存於此瀏覽器，可隨時在下方「本機資料」一鍵清除。',
      ab_host_p: '本網站由 Cloudflare 託管。與一般網站相同，託管服務可能保留標準存取紀錄（例如 IP 位址），ShieldLite 不會另行收集。',
      ab_contact_p: '如對私隱或本工具有任何查詢，歡迎電郵至 ',
      ab_sb_h: 'Google Safe Browsing（選用）',
      ab_sb_p: 'Safe Browsing 可額外查詢 Google 的黑名單。你須自行申請免費 API Key，只限個人非商業用途（商業用途須使用 Google Web Risk）。Key 只會儲存在此裝置。',
      ab_sb_s1: '以 Google 帳戶登入 Google Cloud Console，建立一個項目（或選擇現有項目）。',
      ab_sb_s2: '在「API 與服務」的資料庫中搜尋「Safe Browsing API」，然後按「啟用」。',
      ab_sb_s3: '前往「憑證」，建立憑證並選擇「API 金鑰」。',
      ab_sb_s4: '編輯金鑰，在「應用程式限制」選擇「網站（HTTP 參照網址）」，並加入：',
      ab_sb_s5: '在同一頁的「API 限制」選擇「限制金鑰」，只選 Safe Browsing API。即使 Key 外洩，亦只可經你的網站查詢此項服務。',
      ab_sb_s6: '複製金鑰並貼在下方，開啟開關，按「測試 Key」確認有效，然後按「儲存設定」。',
      ab_sb_menu_note: '選單名稱或因 Google 介面更新而略有不同。',
      ab_sb_guide: 'Google 官方說明',
      ab_sb_test: '測試 Key',
      sb_test_nokey: '請先貼上 API Key。',
      sb_test_ok: 'Key 有效，Google 回應正常。',
      sb_test_fail: (c) => `測試失敗（${c}）。400 通常代表 Key 有誤或未啟用 API；403 通常代表參照網址限制與此網址不符。`,
      sb_test_offline: '目前沒有網絡連線，無法測試。',
      ab_sb_toggle: '檢查連結時使用 Safe Browsing',
      ab_sb_key_label: 'Safe Browsing API Key',
      ab_sb_key_ph: 'API Key',
      ab_save: '儲存設定',
      ab_saved: '已儲存',
      ab_install_h: '加入主畫面',
      ab_install_p: 'iPhone：在 Safari 開啟此網址，按分享按鈕，選擇「加入主畫面」。Android：在 Chrome 按 ⋮，選擇「安裝應用程式」或「加至主畫面」。',
      ab_data_h: '本機資料',
      ab_clear: '清除所有本機資料',
      ab_clear_confirm: '將清除健檢進度、語言及 Safe Browsing 設定。確定繼續？',
      ab_cleared: '已清除',
      ab_ver: '版本',

      ft_disclaimer: 'ShieldLite 免費使用，所有檢查結果只供參考，不能保證絕對安全。如懷疑遇上詐騙，請直接聯絡銀行或相關機構。',
      ft_privacy: '私隱及資料用途',
      ft_contact: '聯絡',
      home_label: 'ShieldLite 首頁'
    },

    en: {
      tagline: 'Your phone\'s security at a glance',
      tab_link: 'Links', tab_pw: 'Passwords', tab_health: 'Checkup', tab_about: 'About',
      paste: 'Paste', copy: 'Copy', copied: 'Copied', clear: 'Clear', show: 'Show', hide: 'Hide',
      inst_t: 'Add to Home Screen',
      inst_d: 'In Safari, tap Share, then Add to Home Screen. It opens like an app and link analysis works offline.',
      inst_d_android: 'In Chrome, tap ⋮ at the top right, then Install app or Add to Home screen. It opens like an app and link analysis works offline.',
      inst_close: 'Got it',

      link_h: 'Check a link',
      link_lede: 'Paste a link from a text, WhatsApp or email. You can paste the whole message. Analysis runs on this device.',
      link_label: 'Link to check',
      link_ph: 'https://…',
      link_check: 'Check link',
      err_empty: 'Paste a link first.',
      err_invalid: "This doesn't look like a valid link. Check for missing or mistyped characters.",
      err_notweb: 'This is not a web link (phone, text or email).',
      paste_fail: "Couldn't read the clipboard. Long-press the box to paste.",
      lvl_low: 'No red flags', lvl_caution: 'Be careful', lvl_warn: 'Suspicious', lvl_high: 'Dangerous',
      lvl_low_d: 'No common phishing signs found.',
      lvl_caution_d: "Some warning signs. Don't enter any details until you've verified the sender.",
      lvl_warn_d: 'Looks a lot like a phishing link. Never enter passwords, codes or payment details.',
      lvl_high_d: 'Very likely a scam or malicious link. Do not open it. Consider reporting it.',
      score_line: (n) => `Risk ${n} / 100`,
      dest_h: 'Where it really goes',
      official: (d) => `Known official domain (${d})`,
      findings_h: 'Why this verdict',
      disclaimer_link: "This is an on-device pattern check and can't guarantee safety. No red flags is not the same as trusted, and brand-new phishing sites may show no patterns. If a message pushes you to act now, skip the link and open the official app or type the address yourself.",
      lookup_h: 'Cross-check with a reputation service',
      lookup_note: 'The link is only sent to that service when you tap, and it opens in a new tab.',
      defang: 'Copy defanged link (for reporting)',
      sb_checking: 'Google Safe Browsing: checking…',
      sb_clean: 'Google Safe Browsing: not on the blocklist',
      sb_hit: (t) => `Google Safe Browsing: listed (${t})`,
      sb_err: 'Google Safe Browsing: lookup failed. Check your connection or API key',
      schemeless: 'No prefix given, analysed as https://.',

      f_scheme_danger: (p) => [`Dangerous link type: ${p.scheme}:`, "This isn't a normal web page. It can run code or install apps or profiles (itms-services installs iOS enterprise apps). Don't open it unless you know exactly what it does."],
      f_scheme_odd: (p) => [`Not a normal web link (${p.scheme})`, 'Regular sites should use https.'],
      f_ip: () => ['Uses a raw IP address, no site name', 'Legitimate organisations rarely do this. Scammers use it to dodge domain checks.'],
      f_homograph: (p) => ['Domain mixes look-alike foreign letters', `Decodes to "${p.unicode}". It may look English but contains Cyrillic or Greek letters (homograph attack).`],
      f_idn_mixed: (p) => ['Domain mixes Chinese and Latin letters', `Decodes to "${p.unicode}". Chinese domains are legitimate in Hong Kong, but verify it.`],
      f_idn_cjk: (p) => ['Chinese-character domain', `Decodes to "${p.unicode}". Normal, but make sure it's the site you expect.`],
      f_idn: (p) => ['Domain contains special characters', `Decodes to "${p.unicode}". Special characters can make a fake domain look genuine.`],
      f_userinfo: (p) => ['Link contains an @ sign to mislead you', `Everything before the @ is a fake username. The browser actually goes to ${p.host}.`],
      f_nohttps: () => ['Not encrypted (http)', "Data is sent in clear text. Real login and payment pages don't do this."],
      f_shortener: (p) => ['Short link hides the real destination', `${p.host} redirects elsewhere and this tool can't expand it offline. Use a reputation service below or ask the sender for the full link.`],
      f_tld_zip: (p) => [`.${p.tld} domain can be mistaken for a file name`, '.zip and .mov are real domain endings. Scammers dress links up as files.'],
      f_tld: (p) => [`.${p.tld} domains are often abused`, 'Cheap to register and common in phishing and spam, though they have legitimate uses too.'],
      f_subdomains: (p) => ['Too many subdomain levels', `The leading names are decoration. The real site is ${p.domain}.`],
      f_hyphens: () => ['Many hyphens in the domain', 'Names like brand-secure-login-verify are a classic phishing pattern.'],
      f_longhost: () => ['Unusually long domain name', 'Long domains are used to hide the real name.'],
      f_brand: (p) => [`Possibly impersonating ${p.brand}`, `The address contains "${p.token}" but the real domain is ${p.domain}, which isn't an official ${p.brand} domain.`],
      f_typo: (p) => [`Domain resembles ${p.brand} (${p.name} ≈ ${p.key})`, `Possible look-alike spelling. The real domain is ${p.domain}.`],
      f_keywords: (p) => [`Common phishing words: ${p.words.join(', ')}`, 'Harmless alone, but worrying alongside other warning signs.'],
      f_redirect: () => ['Link carries another link (redirect parameter)', 'May bounce through a legitimate site to a dangerous one.'],
      f_risky_file: (p) => (p.ext === 'mobileconfig'
        ? ['Downloads an iOS configuration profile (.mobileconfig)', 'Profiles can change VPN, DNS and certificates, and when abused can monitor your traffic. Do not install one you do not recognise.']
        : [`Link points to a .${p.ext} file`, 'This type of file can be malware or an installer.']),
      f_port: (p) => [`Non-standard port :${p.port}`, 'Normal sites rarely do this. It can be a throwaway phishing server.'],
      f_longurl: () => ['Unusually long link', 'Long links are often used to hide the real target.'],

      pw_h: 'Is my password leaked?',
      pw_lede: 'Compares your password against known data-breach lists.',
      pw_label: 'Password to check',
      pw_ph: 'Enter password',
      pw_check: 'Check for leaks',
      pw_privacy: 'Your password never leaves this device. Only the first 5 characters of its SHA-1 hash go to Have I Been Pwned (k-anonymity) and matching happens locally. The box clears when you leave this tab or close the app.',
      pw_loading: 'Checking…',
      pw_clean_t: 'Not found in the database',
      pw_clean_d: "This password isn't in known breaches. That doesn't make it strong, only unlisted. Use a different password on every site.",
      pw_pwned_t: (n) => `Leaked, seen ${n.toLocaleString()} times`,
      pw_pwned_d: 'Stop using it and change it everywhere you used it.',
      pw_offline: "You're offline, so this can't be checked.",
      pw_insecure: "This page isn't served over HTTPS, so the browser blocks encryption features. Open it with an https:// address.",
      pw_error: 'Lookup failed. Try again later.',
      strength: ['Very weak', 'Weak', 'Fair', 'Good', 'Strong'],
      sf_common: 'common password', sf_repeat: 'many repeats', sf_sequence: 'sequence', sf_short: 'too short', sf_digits: 'digits only',
      strength_note: (b) => `Estimated strength ~${b} bits`,
      gen_h: 'Generate a random password',
      gen_len: 'Length',
      gen_upper: 'Uppercase', gen_lower: 'Lowercase', gen_digits: 'Digits', gen_symbols: 'Symbols',
      gen_noamb: 'Avoid look-alike characters (0 O 1 l I)',
      gen_new: 'Generate again',
      gen_note: "Made with the device's secure random generator. Nothing is stored or sent. Save it in the Passwords app or a password manager.",
      email_h: 'Check an email address',
      email_p: "Email breach lookups need a login or a paid API, so this tool doesn't do it directly. Use the official Have I Been Pwned site, which only receives the address you type there.",
      email_btn: 'Open Have I Been Pwned',

      hl_h: 'iPhone security checkup', hl_h_android: 'Android security checkup',
      plat_label: 'Choose phone type',
      g_quick: '5 must-dos',
      q_progress: (d, n) => `Quick check: ${d} of ${n} done`,
      q_done: 'All 5 must-dos done',
      q_next_more: 'For extra protection, try the full checkup.',
      q_more: (n) => `Show full checkup (${n} more)`,
      q_less: 'Show only the 5 must-dos',
      ab_share_h: 'Share to check',
      ab_share_p: 'Got a suspicious link? Skip copy and paste: share it straight from WhatsApp, Messages or email to ShieldLite and it is checked at once.',
      ab_share_and_h: 'Android:',
      ab_share_and: 'Install ShieldLite from Chrome first (⋮ → Install app). Then long-press a link → Share → ShieldLite.',
      ab_share_ios_h: 'iPhone: make a share button with the Shortcuts app (one time only)',
      ab_share_s1: 'Open Shortcuts → tap + to add a shortcut, and name it "ShieldLite check".',
      ab_share_s2: 'Tap ⓘ at the bottom → turn on Show in Share Sheet, and accept only URLs and Text.',
      ab_share_s3: 'Add the action URL Encode, encoding Shortcut Input.',
      ab_share_s4: 'Add the action Open URLs. Enter the address below, then at the end tap Insert Variable → Encoded Text.',
      ab_share_s5: 'Done. Long-press a link in a message → Share → ShieldLite check.',
      ab_share_url: 'Address for the shortcut:',
      hl_lede: 'Work through the list below. In a few minutes your phone will be safer. Tick each item as you finish it.',
      hl_score: 'Security score',
      hl_good: 'Looking good', hl_ok: 'Decent, room to improve', hl_low: 'Needs work',
      hl_next: (t) => `Next: ${t}`,
      hl_all: 'Everything done. Keep it up.',
      hl_reset: 'Reset checklist',
      hl_note: 'Menu names can differ slightly between iOS versions. Progress is stored only on this device.',
      hl_note_android: "Menu names vary by brand (Samsung, Pixel, Xiaomi…) and Android version. If you can't find one, use the search in Settings. Progress is stored only on this device.",
      hl_must: 'Key',
      hl_env_https: 'Secure connection (HTTPS)', hl_env_app: 'On Home Screen', hl_env_net: 'Online',
      v_h: 'Version check',
      v_loading: 'Checking your system and browser versions…',
      v_err: "Couldn't load the latest version data. Try again later, or check for updates in Settings.",
      v_see: 'What we see', v_should: 'Should be', v_why: 'Why it matters', v_how: 'How to update',
      v_unknown: "Can't read the version",
      v_t_ios: 'iOS', v_t_chrome_ios: 'Chrome on iPhone',
      v_t_chrome: (p) => `Chrome (${p})`, v_t_browser: (b) => b,
      v_s_ok: 'Up to date', v_s_patch: 'Minor update', v_s_behind: 'Out of date', v_s_check: 'Check by hand',
      v_s_oldbranch: 'Older series, still patched', v_s_nodata: 'No data yet', v_s_unsupported: 'Not checked',
      v_want_ios: (v) => `iOS ${v} or later`,
      v_want_chrome: (min, latest) => min === latest ? `${latest} or later` : `${min} or later (newest ${latest})`,
      v_want_none: '—',
      v_why_ok: 'Keep automatic updates on.',
      v_why_patch: 'A newer build of the same version is out. These are usually security fixes.',
      v_why_behind: (n) => n > 0 ? `${n} major version${n > 1 ? 's' : ''} behind. Bugs in old versions are public and attackers use them.` : 'Bugs in old versions are public and attackers use them.',
      v_why_check_ios: (have, latest) => have ? `The browser only reveals the rough version (${have}), so we can't tell whether you have small updates like ${latest}. Check in Settings.` : "This browser doesn't reveal your iOS version. Check in Settings, or open this page in Safari for an automatic check.",
      v_why_check_chrome: "Chrome only reveals its major version, so we can't tell a patched build from an unpatched one. Check in Settings.",
      v_why_oldbranch: (v) => `Your phone is on an older iOS series that Apple still patches (newest in this series: ${v}). Upgrade if your phone supports the newer series.`,
      v_why_nodata: "We don't have version data for this platform yet.",
      v_why_unsupported: 'Automatic checks cover Chrome and iOS for now.',
      v_why_chrome_ios: "Chrome on iPhone uses Apple's engine, so web security fixes mostly come with iOS updates. Keep the app updated too.",
      v_kev: 'Recently exploited flaws:',
      v_kev_item: (cve, d) => `${cve} (added to CISA list ${d})`,
      v_how_ios: 'Settings → General → Software Update.',
      v_how_chrome_ios: 'App Store → tap your profile picture → update Chrome.',
      v_how_android: 'Play Store → search Chrome → Update, then reopen Chrome.',
      v_how_desktop: 'Type chrome://settings/help in the address bar, let it update, then tap Relaunch.',
      v_how_other: "Check for updates in the browser's Settings → About.",
      v_foot: (d) => `Version data updated ${d}. Results are worked out from what your browser reports and may not be exact.`,
      g_device: 'Device', g_account: 'Accounts and passwords', g_net: 'Network and messages', g_privacy: 'Privacy',
      p_h: 'Security update date',
      p_how: "A web page can't read this date. Go to Settings → About phone → Android version → Android security update (Samsung: Settings → About phone → Software information → Android security patch level), then pick the month below.",
      p_label: 'Android security update month',
      p_device: (v) => `Detected: ${v}`,
      p_see: 'What we see', p_should: 'Should be', p_why: 'Why it matters',
      p_have: (ym, n) => n === 0 ? `${ym} (this month)` : `${ym} (${n} month${n > 1 ? 's' : ''} old)`,
      p_want: 'Within the last 1–2 months',
      p_s_ok: 'Still updated', p_s_caution: 'Getting old', p_s_high: 'Possibly unsupported',
      p_why_ok: 'Google releases security fixes every month, and your phone is still getting them.',
      p_why_caution: "No security update for 3+ months. Check Software update for one to install. If there's none, the maker may be winding down support.",
      p_why_high: 'No security update for over 6 months, so the phone is likely no longer supported. Use a phone that still gets updates for banking and payments.',
      p_kev: 'Recently exploited Android flaws:',
      p_clear: 'Clear',
      g_a_device: 'Device', g_a_apps: 'Apps and malware', g_a_account: 'Accounts and passwords', g_a_net: 'Network and messages',
      h_a_update_t: 'Keep system and security updates current',
      h_a_update_d: 'Settings → System → Software update (Samsung: Settings → Software update). Also Settings → Security & privacy → System & updates → Google Play system update.',
      h_a_lock_t: 'Use a 6-digit or longer PIN or password',
      h_a_lock_d: 'Settings → Security & privacy → Device unlock → Screen lock. Avoid pattern locks: they are easy to spot over your shoulder.',
      h_a_theft_t: 'Turn on Theft protection',
      h_a_theft_d: 'Settings → Google → All services → Theft protection. Turn on Theft Detection Lock and Offline Device Lock, so a snatched phone locks itself.',
      h_a_find_t: 'Turn on Find My Device',
      h_a_find_d: 'Settings → Google → All services → Find My Device, and check it is on. Samsung users can also turn on SmartThings Find.',
      h_a_sideload_t: "Don't install APKs from unknown sources",
      h_a_sideload_d: 'Settings → Apps → Special app access → Install unknown apps, and set every app to Not allowed. Scammers often push APKs over WhatsApp, text or fake support calls. Real apps are on the Play Store.',
      h_a_protect_t: 'Turn on Google Play Protect',
      h_a_protect_d: 'Play Store → your profile picture → Play Protect → ⚙ settings, and turn on Scan apps with Play Protect. Tap Scan once while you are there.',
      h_a_access_t: 'Check Accessibility access',
      h_a_access_d: "Settings → Accessibility → Downloaded apps (or Installed services). Turn off everything you don't recognise and need (a password manager is fine). Malicious apps use this to watch your screen and tap for you, to steal bank codes.",
      h_a_admin_t: 'Check device admin apps and SMS access',
      h_a_admin_d: 'Settings → Security & privacy → More security settings → Device admin apps. Keep only ones you know, like Find My Device. Then Settings → Privacy → Permission manager → SMS to see which apps can read your texts.',
      h_a_apps_t: "Delete apps you don't use or don't recognise",
      h_a_apps_d: "Settings → Apps. Go through the list and delete unknown or long-unused apps. An unknown app that won't uninstall may hold device admin rights: remove those first.",
      h_a_g2fa_t: 'Turn on 2-Step Verification for Google',
      h_a_g2fa_d: 'Settings → Google → Manage your Google Account → Security → 2-Step Verification. Add a passkey and a backup phone number too.',
      h_a_pwmanager_t: 'Use a different password for every site',
      h_a_pwmanager_d: 'Use the built-in Google Password Manager, or 1Password, Bitwarden and the like. Reused passwords are the most common way accounts get taken over.',
      h_a_checkup_t: 'Run Google Password Checkup',
      h_a_checkup_d: 'Settings → Google → Autofill → Google Password Manager → Password Checkup. Change every leaked, reused or weak password it lists.',
      h_a_backup_t: 'Turn on Google backup',
      h_a_backup_d: 'Settings → Google → Backup (or Settings → System → Backup) and check Backup by Google One is on, so you can restore after a loss or reset.',
      h_a_chrome_t: 'Turn on Safe Browsing in Chrome',
      h_a_chrome_d: 'Chrome → ⋮ → Settings → Privacy and security → Safe Browsing, and choose Enhanced protection or at least Standard protection.',
      h_a_spam_t: 'Turn on spam text and call filtering',
      h_a_spam_d: "Google Messages → profile picture → Messages settings → Spam protection, on. Phone app → Settings → Caller ID & spam, on. On Samsung, look for Block numbers and spam in each app's settings.",
      h_a_wifi_t: "Don't auto-join public Wi-Fi",
      h_a_wifi_d: 'Settings → Network & internet → Wi-Fi. Turn off Auto-connect for public networks, and under each network’s privacy setting choose Use randomized MAC.',
      h_a_perms_t: 'Review app permissions',
      h_a_perms_d: "Settings → Security & privacy → Privacy → Permission manager. Go through location, camera, microphone and photos and switch off what apps don't need.",
      h_a_advanced_t: '(Optional) Advanced Protection for high-risk people',
      h_a_advanced_d: "Android 16 or later: Settings → Security & privacy → Advanced Protection. It limits features such as app installs, so it's only for people likely to be targeted. Most people don't need it.",
      h_update_t: 'Keep iOS up to date',
      h_update_d: 'Settings → General → Software Update, turn on Automatic Updates. Most attacks use old, already-patched bugs.',
      h_passcode_t: 'Use a 6-digit or longer passcode',
      h_passcode_d: 'Settings → Face ID & Passcode → Change Passcode → Passcode Options, choose Custom Alphanumeric or 6-digit.',
      h_sdp_t: 'Turn on Stolen Device Protection',
      h_sdp_d: 'Settings → Face ID & Passcode → Stolen Device Protection. Even if a thief knows your passcode, sensitive actions like changing your Apple Account password need Face ID and a delay.',
      h_findmy_t: 'Turn on Find My iPhone',
      h_findmy_d: 'Settings → your name → Find My → Find My iPhone, and also turn on Find My network and Send Last Location.',
      h_profiles_t: 'Look for unknown profiles or VPNs',
      h_profiles_d: 'Settings → General → VPN & Device Management. If you see a profile you do not recognise, tap it and choose Remove Profile. This is the closest thing iOS has to an infection check.',
      h_apple2fa_t: 'Two-factor authentication on your Apple Account',
      h_apple2fa_d: 'Settings → your name → Sign-In & Security. Make sure two-factor is on, and add a backup phone number and an account recovery contact.',
      h_pwmanager_t: 'A different password on every site',
      h_pwmanager_d: 'Use the built-in Passwords app, 1Password, Bitwarden or similar. Reused passwords are the most common way accounts get taken over.',
      h_pwrecs_t: 'Fix the Security Recommendations warnings',
      h_pwrecs_d: 'Settings → Passwords → Security Recommendations. Replace leaked, reused or weak passwords one by one.',
      h_backup_t: 'Turn on iCloud Backup (or computer backup)',
      h_backup_d: 'Settings → your name → iCloud → iCloud Backup. Lets you restore after loss or ransomware.',
      h_safari_t: 'Safari: Fraudulent Website Warning on',
      h_safari_d: 'Settings → Apps → Safari (older iOS: Settings → Safari), make sure Fraudulent Website Warning is on.',
      h_unknown_t: 'Filter messages from unknown senders',
      h_unknown_d: 'Settings → Messages → Unknown & Spam → Filter Unknown Senders. Parcel, tax and bank text scams mostly come from unknown numbers.',
      h_wifi_t: 'Private Wi-Fi Address on, no auto-join on public Wi-Fi',
      h_wifi_d: 'Settings → Wi-Fi → tap ⓘ beside a network, turn on Private Wi-Fi Address, and turn off Auto-Join for public networks.',
      h_perms_t: 'Review app permissions',
      h_perms_d: 'Settings → Privacy & Security. Go through Location, Camera, Microphone and Photos, and switch off what apps do not need.',
      h_apps_t: 'Delete apps you no longer use or do not recognise',
      h_apps_d: 'Settings → General → iPhone Storage. Scan the app list and delete unknown or long-unused apps.',
      h_lockdown_t: '(Optional) Lockdown Mode for high-risk people',
      h_lockdown_d: 'Settings → Privacy & Security → Lockdown Mode. It limits many features and only suits people who may be targeted individually. Most people do not need it.',

      ab_h: 'About ShieldLite',
      ab_what: 'Built for the threats iPhone and Android users meet most: phishing texts, fake apps, leaked passwords and neglected security settings. Lightweight, no install, data stays on your device.',
      ab_cant_h: "What it can't do",
      ab_cant1: "A web page can't scan the apps or system files on your phone, so this is not a traditional antivirus. On iPhone not even native apps can; on Android use the built-in Play Protect.",
      ab_cant2: "A web app can't read your phone's system settings, so the Checkup is a self-check list.",
      ab_cant3: "Short links can't be expanded on-device. Use a reputation service or ask the sender.",
      ab_net_h: 'Privacy and how your data is used',
      ab_priv_p: 'ShieldLite has no accounts, no cookies and no tracking or analytics. Links and passwords you enter are never stored or uploaded.',
      ab_net_sub: 'Services it connects to',
      ab_net1: 'Link analysis: fully on-device by default. Nothing is sent.',
      ab_net2: 'Password check: only the first 5 characters of the hash go to api.pwnedpasswords.com.',
      ab_net3: 'Safe Browsing: links go to Google only if you turn it on and supply your own API key.',
      ab_net4: 'Version check: reads a public version list (versions.json) from this site. The comparison runs on your device and nothing is sent.',
      ab_net5: 'Other sites: VirusTotal, URLhaus, Have I Been Pwned and similar sites open only when you tap their links, and their own privacy policies apply.',
      ab_store_sub: 'Stored on your device',
      ab_store_p: 'Checklist progress, platform and language choice, your Android patch month and, if you set one, your Safe Browsing API key. This stays in this browser only and you can wipe it any time under Data on this device below.',
      ab_host_p: 'This site is hosted on Cloudflare. As with any website, the host may keep standard access logs (such as IP addresses). ShieldLite collects nothing beyond that.',
      ab_contact_p: 'Questions about privacy or the app? Email ',
      ab_sb_h: 'Google Safe Browsing (optional)',
      ab_sb_p: 'Safe Browsing can also check Google\'s blocklist. You need your own free API key, for personal non-commercial use only (commercial use needs Google Web Risk). The key is stored only on this device.',
      ab_sb_s1: 'Sign in to Google Cloud Console with a Google account and create a project (or pick an existing one).',
      ab_sb_s2: 'Under APIs & Services, open the Library, find Safe Browsing API and click Enable.',
      ab_sb_s3: 'Go to Credentials, Create credentials, and choose API key.',
      ab_sb_s4: 'Edit the key. Under Application restrictions choose Websites (HTTP referrers) and add:',
      ab_sb_s5: 'On the same page, under API restrictions choose Restrict key and select only Safe Browsing API. Even if the key leaks, it can only be used from your site for this one service.',
      ab_sb_s6: 'Copy the key, paste it below, turn the switch on, tap Test key to confirm it works, then tap Save settings.',
      ab_sb_menu_note: 'Menu names may differ slightly as Google updates its console.',
      ab_sb_guide: 'Google official guide',
      ab_sb_test: 'Test key',
      sb_test_nokey: 'Paste an API key first.',
      sb_test_ok: 'Key works. Google responded normally.',
      sb_test_fail: (c) => `Test failed (${c}). 400 usually means a mistyped key or the API not enabled; 403 usually means the referrer restriction does not match this address.`,
      sb_test_offline: "You're offline, so this can't be tested.",
      ab_sb_toggle: 'Use Safe Browsing when checking links',
      ab_sb_key_label: 'Safe Browsing API key',
      ab_sb_key_ph: 'API key',
      ab_save: 'Save settings',
      ab_saved: 'Saved',
      ab_install_h: 'Add to Home Screen',
      ab_install_p: 'iPhone: open this address in Safari, tap Share, then Add to Home Screen. Android: in Chrome tap ⋮, then Install app or Add to Home screen.',
      ab_data_h: 'Data on this device',
      ab_clear: 'Clear all local data',
      ab_clear_confirm: 'This clears checklist progress, language and Safe Browsing settings. Continue?',
      ab_cleared: 'Cleared',
      ab_ver: 'Version',

      ft_disclaimer: 'ShieldLite is free to use. Checks are for guidance only and cannot guarantee safety. If you suspect a scam, contact your bank or the organisation directly.',
      ft_privacy: 'Privacy and how your data is used',
      ft_contact: 'Contact:',
      home_label: 'ShieldLite home'
    }
  };

  let lang = store.get('lang', (navigator.language || 'zh').toLowerCase().startsWith('zh') ? 'zh' : 'en');
  const t = (k, ...a) => {
    const v = I18N[lang][k] !== undefined ? I18N[lang][k] : I18N.en[k];
    if (v === undefined) return k;
    return typeof v === 'function' ? v(...a) : v;
  };

  /* -------------------------------- toast ------------------------------- */
  let toastTimer;
  function toast(msg) {
    const n = $('#toast');
    n.textContent = msg;
    n.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { n.hidden = true; }, 1800);
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      const ta = el('textarea', { 'aria-hidden': 'true', style: 'position:fixed;opacity:0;top:0' });
      ta.value = text;
      document.body.append(ta);
      ta.select();
      try { document.execCommand('copy'); } catch (e2) { /* ignore */ }
      ta.remove();
    }
    toast(t('copied'));
  }

  /* ------------------------------- tabs --------------------------------- */
  const TABS = ['health', 'link', 'pw', 'about'];
  function showTab(id) {
    if (!TABS.includes(id)) id = 'health';
    TABS.forEach((x) => {
      $('#tab-' + x).hidden = x !== id;
      $('#btn-' + x).setAttribute('aria-selected', String(x === id));
    });
    store.set('tab', id);
    try { history.replaceState(null, '', '#' + id); } catch (e) { /* ignore */ }
    window.scrollTo(0, 0);
    if (id !== 'pw') clearPassword();
  }

  /* ------------------------------ link tab ------------------------------ */
  let linkRes = null;
  let sbState = null;

  const STAMP_ICON = { low: '✓', caution: '!', warn: '!', high: '✕' };

  function renderLink() {
    const box = $('#linkResult');
    box.replaceChildren();
    if (!linkRes) { box.hidden = true; return; }
    box.hidden = false;
    const r = linkRes;
    if (!r.ok) { box.append(el('p', { class: 'note' }, t('err_' + r.reason))); return; }

    box.append(el('div', { class: 'verdict' },
      el('div', { class: 's-' + r.level + ' stamp', 'aria-hidden': 'true' },
        el('span', { class: 'stamp-main' }, t('lvl_' + r.level)),
        el('span', { class: 'stamp-sub' }, t('score_line', r.score))),
      el('p', { class: 'verdict-text' }, el('span', { class: 'sr-only' }, t('lvl_' + r.level) + '. '), t('lvl_' + r.level + '_d'))));

    const dest = el('div', { class: 'dest' }, el('h3', null, t('dest_h')));
    if (r.host) {
      dest.append(el('div', { class: 'host' }, r.sub ? r.sub + '.' : null, el('strong', null, r.domain)));
    }
    dest.append(el('div', { class: 'urlline' }, r.url));
    if (r.trustedDomain) dest.append(el('span', { class: 'official' }, t('official', r.trustedDomain)));
    if (r.schemeless) dest.append(el('p', { class: 'fine' }, t('schemeless')));
    box.append(dest);

    if (r.findings.length) {
      const ul = el('ul', { class: 'findings' });
      r.findings.forEach((f) => {
        const [title, detail] = t('f_' + f.id, f.p);
        ul.append(el('li', { class: 'sev-' + f.sev }, el('span', { class: 'dot' }),
          el('div', null, el('b', null, title), el('p', null, detail))));
      });
      box.append(el('div', { class: 'section' }, el('h3', null, t('findings_h')), ul));
    }

    if (r.host) {
      const enc = encodeURIComponent(r.url);
      const lookups = el('div', { class: 'section' }, el('h3', null, t('lookup_h')),
        el('div', { class: 'links' },
          el('a', { class: 'btn ghost small', href: 'https://transparencyreport.google.com/safe-browsing/search?url=' + enc, target: '_blank', rel: 'noopener noreferrer' }, 'Google Safe Browsing'),
          el('a', { class: 'btn ghost small', href: 'https://www.virustotal.com/gui/search/' + enc, target: '_blank', rel: 'noopener noreferrer' }, 'VirusTotal'),
          el('a', { class: 'btn ghost small', href: 'https://urlhaus.abuse.ch/browse.php?search=' + encodeURIComponent(r.host), target: '_blank', rel: 'noopener noreferrer' }, 'URLhaus')),
        el('p', { class: 'fine' }, t('lookup_note')));
      if (sbState) {
        const txt = sbState.status === 'loading' ? t('sb_checking')
          : sbState.status === 'error' ? t('sb_err')
          : sbState.threats.length ? t('sb_hit', sbState.threats.join(', ')) : t('sb_clean');
        lookups.append(el('div', { class: 'sbline ' + (sbState.status === 'ok' ? (sbState.threats.length ? 'hit' : 'clean') : '') }, txt));
      }
      box.append(lookups);
    }

    box.append(el('div', { class: 'section' },
      el('div', { class: 'links' },
        el('button', { class: 'btn ghost small', type: 'button', onclick: () => copyText(C.defang(r.url)) }, t('defang'))),
      el('p', { class: 'fine' }, t('disclaimer_link'))));
  }

  async function runLinkCheck() {
    const value = $('#linkInput').value;
    linkRes = C.analyzeUrl(value);
    sbState = null;
    renderLink();
    if (!linkRes.ok || !linkRes.host) return;
    const key = store.get('sbKey', '');
    if (store.get('sbOn', false) && key) {
      const mine = linkRes;
      sbState = { status: 'loading', threats: [] };
      renderLink();
      try {
        const threats = await C.safeBrowsingLookup(mine.url, key);
        if (linkRes === mine) sbState = { status: 'ok', threats };
      } catch (e) {
        if (linkRes === mine) sbState = { status: 'error', threats: [] };
      }
      if (linkRes === mine) renderLink();
    }
  }

  /* ----------------------------- password tab ----------------------------- */
  let pwState = null;

  function clearPassword() {
    const i = $('#pwInput');
    if (!i) return;
    i.value = '';
    i.type = 'password';
    $('#pwToggle').textContent = t('show');
    pwState = null;
    renderPw();
    renderStrength();
  }

  function renderStrength() {
    const pw = $('#pwInput').value;
    const s = C.estimateStrength(pw);
    const m = $('#meter');
    const line = $('#strengthLine');
    line.replaceChildren();
    if (!pw) { m.setAttribute('data-level', '-1'); return; }
    m.setAttribute('data-level', String(s.level));
    const tags = s.flags.filter((f) => ['common', 'repeat', 'sequence', 'short', 'digits'].includes(f))
      .map((f) => el('span', { class: 'tag' }, t('sf_' + f)));
    line.append(el('b', null, t('strength')[s.level]), ' · ' + t('strength_note', s.bits) + ' ', ...tags);
  }

  function renderPw() {
    const box = $('#pwResult');
    box.replaceChildren();
    if (!pwState) { box.hidden = true; return; }
    box.hidden = false;
    let node;
    switch (pwState.status) {
      case 'loading': node = el('div', { class: 'pwres' }, el('b', null, t('pw_loading'))); break;
      case 'clean': node = el('div', { class: 'pwres' }, el('b', null, t('pw_clean_t')), t('pw_clean_d')); break;
      case 'pwned': node = el('div', { class: 'pwres bad' }, el('b', null, t('pw_pwned_t', pwState.n)), t('pw_pwned_d')); break;
      default: node = el('div', { class: 'pwres err' }, el('b', null, t('pw_' + pwState.status)));
    }
    box.append(node);
  }

  async function runPwCheck() {
    const pw = $('#pwInput').value;
    if (!pw) return;
    if (!window.isSecureContext) { pwState = { status: 'insecure' }; renderPw(); return; }
    if (!navigator.onLine) { pwState = { status: 'offline' }; renderPw(); return; }
    pwState = { status: 'loading' };
    renderPw();
    try {
      const n = await C.pwnedCount(pw);
      pwState = n > 0 ? { status: 'pwned', n } : { status: 'clean' };
    } catch (e) {
      pwState = { status: 'error' };
    }
    renderPw();
  }

  /* ------------------------------- generator ------------------------------ */
  let generated = '';
  function regenerate() {
    const len = parseInt($('#genLen').value, 10);
    $('#genLenVal').textContent = String(len);
    generated = C.generatePassword(len, {
      upper: $('#gUpper').checked, lower: $('#gLower').checked, digits: $('#gDigits').checked,
      symbols: $('#gSymbols').checked, noAmbiguous: $('#gNoAmb').checked
    });
    $('#genOut').textContent = generated;
  }

  /* ------------------------------- health tab ------------------------------ */
  const HEALTH_IOS = [
    { g: 'g_device', items: [['update', 3], ['passcode', 3], ['sdp', 3], ['findmy', 2], ['profiles', 2]] },
    { g: 'g_account', items: [['apple2fa', 3], ['pwmanager', 2], ['pwrecs', 2], ['backup', 1]] },
    { g: 'g_net', items: [['safari', 2], ['unknown', 2], ['wifi', 1]] },
    { g: 'g_privacy', items: [['perms', 2], ['apps', 1], ['lockdown', 0]] }
  ];
  // Android ids start with "a_" so both checklists can share one saved progress object.
  const HEALTH_ANDROID = [
    { g: 'g_a_device', items: [['a_update', 3], ['a_lock', 3], ['a_theft', 2], ['a_find', 2]] },
    { g: 'g_a_apps', items: [['a_sideload', 3], ['a_protect', 3], ['a_access', 3], ['a_admin', 2], ['a_apps', 1]] },
    { g: 'g_a_account', items: [['a_g2fa', 3], ['a_pwmanager', 2], ['a_checkup', 2], ['a_backup', 1]] },
    { g: 'g_a_net', items: [['a_chrome', 2], ['a_spam', 2], ['a_wifi', 1]] },
    { g: 'g_privacy', items: [['a_perms', 2], ['a_advanced', 0]] }
  ];
  const IS_ANDROID = /Android/i.test(navigator.userAgent);
  let plat = store.get('plat', IS_ANDROID ? 'android' : 'ios');
  const healthGroups = () => (plat === 'android' ? HEALTH_ANDROID : HEALTH_IOS);
  // Quick mode shows only the items that stop the most common attacks.
  const QUICK = {
    ios: ['update', 'passcode', 'sdp', 'apple2fa', 'unknown'],
    android: ['a_update', 'a_sideload', 'a_protect', 'a_access', 'a_g2fa']
  };
  let hlMode = store.get('hlMode', 'quick');
  function shownGroups() {
    const all = healthGroups();
    if (hlMode !== 'quick') return all;
    const weight = {};
    all.forEach((grp) => grp.items.forEach(([id, w]) => { weight[id] = w; }));
    return [{ g: 'g_quick', items: QUICK[plat].map((id) => [id, weight[id]]) }];
  }
  let health = store.get('health', {});
  const openItems = new Set();

  function ring(pct, label) {
    const NS = 'http://www.w3.org/2000/svg';
    const c = 2 * Math.PI * 40;
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('class', 'ring');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', pct + '%');
    const mk = (tag, attrs) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); return n; };
    svg.append(mk('circle', { class: 'bg', cx: 50, cy: 50, r: 40 }));
    svg.append(mk('circle', { class: 'fg', cx: 50, cy: 50, r: 40, 'stroke-dasharray': c.toFixed(1), 'stroke-dashoffset': (c * (1 - pct / 100)).toFixed(1) }));
    const tx = mk('text', { x: 50, y: 51 });
    tx.textContent = label == null ? pct : label;
    svg.append(tx);
    return svg;
  }

  function renderHealth() {
    $('#hlTitle').textContent = t(plat === 'android' ? 'hl_h_android' : 'hl_h');
    $('#hlNote').textContent = t(plat === 'android' ? 'hl_note_android' : 'hl_note');
    $$('.seg-btn').forEach((b) => {
      const on = b.dataset.plat === plat;
      b.classList.toggle('on', on);
      b.setAttribute('aria-checked', String(on));
    });
    renderPatch();

    const quick = hlMode === 'quick';
    let total = 0, got = 0, next = null, done = 0, count = 0;
    shownGroups().forEach((grp) => grp.items.forEach(([id, w]) => {
      total += w;
      count++;
      if (health[id]) { got += w; done++; }
      else if (w > 0 && (!next || w > next.w)) next = { id, w };
    }));
    const pct = total ? Math.round((got / total) * 100) : 0;

    const standalone = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
    const envTag = (ok, label) => el('span', { class: 'tag ' + (ok ? 'ok' : 'no') }, (ok ? '✓ ' : '– ') + label);

    const sum = $('#healthSummary');
    sum.replaceChildren(ring(pct, quick ? done + '/' + count : null), el('div', { class: 'summary-text' },
      el('b', null, quick ? (done === count ? t('q_done') : t('q_progress', done, count)) : pct >= 85 ? t('hl_good') : pct >= 60 ? t('hl_ok') : t('hl_low')),
      el('span', null, next ? t('hl_next', t('h_' + next.id + '_t')) : quick ? t('q_next_more') : t('hl_all')),
      el('div', { class: 'env' },
        envTag(window.isSecureContext, t('hl_env_https')),
        envTag(standalone, t('hl_env_app')),
        envTag(navigator.onLine, t('hl_env_net')))));

    const list = $('#healthList');
    list.replaceChildren();
    shownGroups().forEach((grp) => {
      const g = el('div', { class: 'group' }, el('h2', null, t(grp.g)));
      grp.items.forEach(([id, w]) => {
        const open = openItems.has(id);
        const cb = el('input', { type: 'checkbox', 'aria-label': t('h_' + id + '_t') });
        cb.checked = !!health[id];
        cb.addEventListener('change', () => {
          if (cb.checked) health[id] = true; else delete health[id];
          store.set('health', health);
          renderHealth();
        });
        const main = el('button', {
          class: 'item-main', type: 'button', 'aria-expanded': String(open),
          onclick: () => { if (openItems.has(id)) openItems.delete(id); else openItems.add(id); renderHealth(); }
        }, el('span', { class: 'ttl' }, t('h_' + id + '_t')), w >= 3 ? el('span', { class: 'must' }, t('hl_must')) : null);
        const item = el('div', { class: 'item' + (health[id] ? ' done' : '') },
          el('div', { class: 'item-head' }, el('label', { class: 'chk' }, cb), main),
          open ? el('div', { class: 'detail' }, t('h_' + id + '_d')) : null);
        g.append(item);
      });
      list.append(g);
    });
    const allCount = healthGroups().reduce((n, grp) => n + grp.items.length, 0);
    $('#healthMore').replaceChildren(el('button', {
      type: 'button', class: 'btn ghost',
      onclick: () => { hlMode = quick ? 'full' : 'quick'; store.set('hlMode', hlMode); openItems.clear(); renderHealth(); }
    }, quick ? t('q_more', allCount - QUICK[plat].length) : t('q_less')));
  }

  /* ------------------------ Android security patch ------------------------ */
  let androidInfo = null; // { version, model } from client hints, Android Chrome only

  function renderPatch() {
    const box = $('#patchCard');
    if (!box) return;
    box.hidden = plat !== 'android';
    if (box.hidden) return;

    const now = new Date();
    const thisMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    const val = store.get('patch', '');
    const input = el('input', { type: 'month', id: 'patchInput', class: 'plainfield', value: val || null, max: thisMonth, placeholder: 'YYYY-MM', 'aria-label': t('p_label') });
    input.addEventListener('change', () => { store.set('patch', input.value.trim()); renderPatch(); });
    const clear = val ? el('button', { type: 'button', class: 'btn ghost', onclick: () => { store.set('patch', ''); renderPatch(); } }, t('p_clear')) : null;

    const parts = [el('h2', null, t('p_h')), el('p', { class: 'fine' }, t('p_how'))];
    if (androidInfo && androidInfo.version) {
      parts.push(el('p', { class: 'fine' }, t('p_device', ['Android ' + androidInfo.version, androidInfo.model].filter(Boolean).join(' · '))));
    }
    parts.push(el('div', { class: 'row patchrow' }, input, clear));

    const r = C.assessPatch(val, now);
    if (r) {
      const kev = (verData && verData.kev && verData.kev.android) || [];
      const pill = { ok: 'ok', caution: 'caution', high: 'high' }[r.status];
      parts.push(el('div', { class: 'block' },
        el('div', { class: 'vrow' },
          el('div', { class: 'vhead' }, el('b', null, t('p_label')), el('span', { class: 'vpill p-' + pill }, t('p_s_' + r.status))),
          el('dl', { class: 'vlist' },
            el('dt', null, t('p_see')), el('dd', { class: 'mono' }, t('p_have', val.slice(0, 7), r.months)),
            el('dt', null, t('p_should')), el('dd', null, t('p_want')),
            el('dt', null, t('p_why')), el('dd', null, t('p_why_' + r.status),
              r.status !== 'ok' && kev.length ? el('span', { class: 'kev' }, t('p_kev'), ' ', kev.slice(0, 2).map((k) => t('v_kev_item', k.cve, k.date)).join(lang === 'zh' ? '、' : ', ')) : null)))));
    }
    box.replaceChildren(...parts);
  }

  /* ---------------------------- version check ---------------------------- */
  let verData = null;
  let verClient = null;
  let verState = 'loading';
  const PLATFORM = { win: 'Windows', mac: 'Mac', linux: 'Linux', android: 'Android', chromeos: 'ChromeOS', ios: 'iOS', other: '' };
  const BROWSER = { safari: 'Safari', chrome: 'Chrome', edge: 'Microsoft Edge', firefox: 'Firefox', opera: 'Opera', samsung: 'Samsung Internet', other: '' };

  async function loadVersions() {
    const hints = { touchPoints: navigator.maxTouchPoints || 0 };
    try {
      // Chrome hides its full version in the UA; client hints give the exact build.
      if (navigator.userAgentData && navigator.userAgentData.getHighEntropyValues) {
        const h = await navigator.userAgentData.getHighEntropyValues(['fullVersionList', 'platformVersion', 'model']);
        hints.fullVersionList = h.fullVersionList;
        // Android's UA always says "Android 10; K"; hints give the real version and model.
        if (h.platform === 'Android' && h.platformVersion) {
          androidInfo = { version: h.platformVersion.replace(/(\.0)+$/, ''), model: h.model || '' };
        }
      }
    } catch (e) { /* hints are optional */ }
    verClient = C.detectClient(navigator.userAgent, hints);
    try {
      const res = await fetch('versions.json', { cache: 'no-cache' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      verData = await res.json();
      verState = 'ready';
      renderPatch(); // shows recent Android CVEs once data is in
    } catch (e) {
      verState = 'error';
    }
    renderVersions();
  }

  function verTitle(r) {
    if (r.id === 'ios') return t('v_t_ios');
    if (r.id === 'chrome_ios') return t('v_t_chrome_ios');
    if (r.id === 'chrome') return t('v_t_chrome', PLATFORM[r.platform] || '');
    const b = BROWSER[r.browser] || navigator.userAgent.slice(0, 30);
    return t('v_t_browser', [b, PLATFORM[r.platform]].filter(Boolean).join(' · '));
  }

  function verWant(r) {
    if (r.id === 'ios' && r.latest) return t('v_want_ios', r.status === 'oldbranch' ? r.branchLatest : r.latest);
    if ((r.id === 'chrome' || r.id === 'chrome_ios') && r.latest) {
      const key = r.id === 'chrome_ios' ? 'ios' : { chromeos: 'linux' }[r.platform] || r.platform;
      const ch = (verData && verData.chrome && verData.chrome[key]) || {};
      const min = typeof ch === 'string' ? ch : ch.min || r.latest;
      return t('v_want_chrome', min, r.latest);
    }
    return t('v_want_none');
  }

  function verWhy(r) {
    if (r.id === 'chrome_ios' && r.status === 'ok') return t('v_why_chrome_ios');
    switch (r.status) {
      case 'ok': return t('v_why_ok');
      case 'patch': return t('v_why_patch');
      case 'behind': return t('v_why_behind', r.behindMajor || 0);
      case 'check': return r.id === 'ios' ? t('v_why_check_ios', r.have, r.latest) : t('v_why_check_chrome');
      case 'oldbranch': return t('v_why_oldbranch', r.branchLatest);
      case 'nodata': return t('v_why_nodata');
      default: return t('v_why_unsupported');
    }
  }

  function verHow(r) {
    if (r.id === 'ios') return t('v_how_ios');
    if (r.id === 'chrome_ios') return t('v_how_chrome_ios');
    if (r.id === 'chrome') return r.platform === 'android' ? t('v_how_android') : t('v_how_desktop');
    return t('v_how_other');
  }

  const PILL = { ok: 'ok', patch: 'caution', behind: 'high', check: 'caution', oldbranch: 'caution', nodata: 'muted', unsupported: 'muted' };

  function renderVersions() {
    const box = $('#verCard');
    if (!box) return;
    const head = el('h2', null, t('v_h'));
    if (verState === 'loading') { box.replaceChildren(head, el('p', { class: 'fine' }, t('v_loading'))); return; }
    if (verState === 'error' || !verClient) { box.replaceChildren(head, el('div', { class: 'note' }, t('v_err'))); return; }

    const rows = C.assessClient(verClient, verData).map((r) => {
      const showKev = ['behind', 'patch', 'check'].includes(r.status) && r.kev && r.kev.length;
      return el('div', { class: 'vrow' },
        el('div', { class: 'vhead' },
          el('b', null, verTitle(r)),
          el('span', { class: 'vpill p-' + PILL[r.status] }, t('v_s_' + r.status))),
        el('dl', { class: 'vlist' },
          el('dt', null, t('v_see')), el('dd', { class: 'mono' }, r.have || t('v_unknown')),
          el('dt', null, t('v_should')), el('dd', { class: 'mono' }, verWant(r)),
          el('dt', null, t('v_why')), el('dd', null, verWhy(r),
            showKev ? el('span', { class: 'kev' }, t('v_kev'), ' ', r.kev.slice(0, 2).map((k) => t('v_kev_item', k.cve, k.date)).join(lang === 'zh' ? '、' : ', ')) : null),
          r.status !== 'ok' ? [el('dt', null, t('v_how')), el('dd', null, verHow(r))] : null));
    });
    const when = verData && verData.updated ? String(verData.updated).slice(0, 10) : '—';
    box.replaceChildren(head, el('div', { class: 'block' }, rows), el('p', { class: 'fine' }, t('v_foot', when)));
  }

  /* ----------------------------- language / static ----------------------------- */
  function applyLang() {
    document.documentElement.lang = lang === 'zh' ? 'zh-Hant-HK' : 'en';
    $$('[data-i18n]').forEach((n) => { n.textContent = t(n.getAttribute('data-i18n')); });
    $$('[data-i18n-ph]').forEach((n) => { n.setAttribute('placeholder', t(n.getAttribute('data-i18n-ph'))); });
    $$('[data-i18n-aria]').forEach((n) => { n.setAttribute('aria-label', t(n.getAttribute('data-i18n-aria'))); });
    $('#instText').textContent = t(IS_ANDROID ? 'inst_d_android' : 'inst_d');
    $('#shareHint').textContent = location.origin + location.pathname + '?url=';
    $('#langBtn').textContent = lang === 'zh' ? 'EN' : '中';
    $('#langBtn').setAttribute('aria-label', lang === 'zh' ? 'Switch to English' : '切換至中文');
    $('#pwToggle').textContent = $('#pwInput').type === 'password' ? t('show') : t('hide');
    const y = new Date().getFullYear();
    $('#ftYear').textContent = y > COPYRIGHT_FROM ? COPYRIGHT_FROM + '–' + y : String(COPYRIGHT_FROM);
    $$('.appVer').forEach((n) => { n.textContent = APP_VERSION; });
    renderLink(); renderPw(); renderStrength(); renderHealth(); renderVersions();
  }

  /* --------------------------------- init --------------------------------- */
  function init() {
    $$('.tab').forEach((b) => b.addEventListener('click', () => showTab(b.dataset.tab)));
    // Brand returns to the home tab (the checkup), like a site logo.
    $('#homeLink').addEventListener('click', (e) => { e.preventDefault(); showTab(TABS[0]); });
    $$('[data-goto]').forEach((b) => b.addEventListener('click', () => {
      showTab(b.dataset.goto);
      const target = b.dataset.anchor && document.getElementById(b.dataset.anchor);
      if (target) target.scrollIntoView();
    }));
    $('#langBtn').addEventListener('click', () => { lang = lang === 'zh' ? 'en' : 'zh'; store.set('lang', lang); applyLang(); });

    $('#linkForm').addEventListener('submit', (e) => { e.preventDefault(); runLinkCheck(); });
    $('#pasteBtn').addEventListener('click', async () => {
      try {
        const txt = await navigator.clipboard.readText();
        if (txt) { $('#linkInput').value = txt; runLinkCheck(); }
      } catch (e) { toast(t('paste_fail')); }
    });

    $('#pwForm').addEventListener('submit', (e) => { e.preventDefault(); runPwCheck(); });
    $('#pwInput').addEventListener('input', () => { pwState = null; renderPw(); renderStrength(); });
    $('#pwToggle').addEventListener('click', () => {
      const i = $('#pwInput');
      i.type = i.type === 'password' ? 'text' : 'password';
      $('#pwToggle').textContent = i.type === 'password' ? t('show') : t('hide');
    });
    $('#pwClear').addEventListener('click', clearPassword);
    document.addEventListener('visibilitychange', () => { if (document.hidden) clearPassword(); });

    ['genLen', 'gUpper', 'gLower', 'gDigits', 'gSymbols', 'gNoAmb'].forEach((id) => $('#' + id).addEventListener('input', regenerate));
    $('#genNew').addEventListener('click', regenerate);
    $('#genCopy').addEventListener('click', () => copyText(generated));

    // Reset only the checklist on screen; the other phone's progress stays.
    $('#healthReset').addEventListener('click', () => {
      healthGroups().forEach((grp) => grp.items.forEach(([id]) => { delete health[id]; }));
      store.set('health', health);
      if (plat === 'android') store.set('patch', '');
      renderHealth();
    });
    $$('.seg-btn').forEach((b) => b.addEventListener('click', () => {
      plat = b.dataset.plat;
      store.set('plat', plat);
      openItems.clear();
      renderHealth();
    }));

    $('#sbOn').checked = !!store.get('sbOn', false);
    $('#sbKey').value = store.get('sbKey', '');
    $('#sbForm').addEventListener('submit', (e) => {
      e.preventDefault();
      store.set('sbOn', $('#sbOn').checked);
      store.set('sbKey', $('#sbKey').value.trim());
      toast(t('ab_saved'));
    });
    $('#refHint').textContent = location.origin.startsWith('http') ? location.origin + '/*' : 'https://your-domain/*';
    $('#sbTest').addEventListener('click', async () => {
      const out = $('#sbTestResult');
      out.className = 'sbline';
      const key = $('#sbKey').value.trim();
      if (!key) { out.textContent = t('sb_test_nokey'); return; }
      if (!navigator.onLine) { out.textContent = t('sb_test_offline'); return; }
      out.textContent = t('sb_checking');
      try {
        // A harmless, well-known URL: we only care that Google accepts the key.
        await C.safeBrowsingLookup('https://www.google.com/', key);
        out.className = 'sbline clean';
        out.textContent = t('sb_test_ok');
      } catch (e) {
        out.className = 'sbline hit';
        out.textContent = t('sb_test_fail', /HTTP (\d+)/.test(e.message) ? 'HTTP ' + e.message.match(/HTTP (\d+)/)[1] : e.message);
      }
    });
    $('#clearData').addEventListener('click', () => {
      if (!confirm(t('ab_clear_confirm'))) return;
      store.clear();
      health = {};
      $('#sbOn').checked = false;
      $('#sbKey').value = '';
      renderHealth();
      toast(t('ab_cleared'));
    });

    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const standalone = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
    if ((ios || IS_ANDROID) && !standalone && !store.get('instDismissed', false)) $('#installHint').hidden = false;
    $('#installClose').addEventListener('click', () => { $('#installHint').hidden = true; store.set('instDismissed', true); });

    window.addEventListener('online', renderHealth);
    window.addEventListener('offline', renderHealth);

    regenerate();
    applyLang();
    loadVersions();
    const fromHash = location.hash.replace('#', '');
    // Opened from a share sheet or Shortcut: check the link straight away.
    const shared = C.sharedInput(location.search);
    if (shared) {
      showTab('link');
      $('#linkInput').value = shared;
      runLinkCheck();
      // Drop the link from the address bar and history.
      try { history.replaceState(null, '', location.pathname + '#link'); } catch (e) { /* ignore */ }
    } else {
      showTab(TABS.includes(fromHash) ? fromHash : store.get('tab', 'health'));
    }

    if ('serviceWorker' in navigator && window.isSecureContext) {
      navigator.serviceWorker.register('sw.js').catch(() => { /* offline support is optional */ });
    }
  }

  init();
})();
