(() => {
  'use strict';
  const C = window.ShieldCore;
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
      tagline: '連結・密碼・手機保安',
      tab_link: '連結', tab_pw: '密碼', tab_health: '健檢', tab_about: '關於',
      paste: '貼上', copy: '複製', copied: '已複製', clear: '清除', show: '顯示', hide: '隱藏',
      inst_t: '加入主畫面',
      inst_d: '喺 Safari 撳分享按鈕，揀「加入主畫面」，就可以當 App 用，連結分析仲可以離線使用。',
      inst_d_android: '喺 Chrome 撳右上角 ⋮，揀「安裝應用程式」或「加至主畫面」，就可以當 App 用，連結分析仲可以離線使用。',
      inst_close: '知道',

      link_h: '檢查連結',
      link_lede: '貼上短訊、WhatsApp 或電郵入面嘅連結，成段訊息一齊貼都得。分析喺你部機本機進行。',
      link_label: '要檢查嘅連結',
      link_ph: 'https://…',
      link_check: '檢查連結',
      err_empty: '請先貼上連結。',
      err_invalid: '睇唔明呢個連結，請檢查有冇貼漏或者打錯。',
      err_notweb: '呢個唔係網頁連結（電話、短訊或電郵）。',
      paste_fail: '未能讀取剪貼簿，請長按輸入框貼上。',
      lvl_low: '未見警號', lvl_caution: '請小心', lvl_warn: '相當可疑', lvl_high: '高度危險',
      lvl_low_d: '未發現常見釣魚特徵。',
      lvl_caution_d: '有部分可疑特徵。核實寄件人之前，唔好輸入任何資料。',
      lvl_warn_d: '特徵同釣魚連結相近。切勿輸入密碼、驗證碼或付款資料。',
      lvl_high_d: '好大機會係騙局或惡意連結。請勿開啟，亦可以舉報。',
      score_line: (n) => `風險 ${n} / 100`,
      dest_h: '真正去嘅網站',
      official: (d) => `屬已知官方網域（${d}）`,
      findings_h: '點解咁判斷',
      disclaimer_link: '呢個係本機特徵分析，唔能夠保證安全。冇警號唔等於可信，全新嘅釣魚網站亦可能未有特徵。收到叫你「即刻處理」嘅訊息，最穩陣係唔撳連結，直接開官方 App 或自己打網址。',
      lookup_h: '再用信譽服務查一查',
      lookup_note: '撳落去先會將連結傳畀對方服務，並開新頁。',
      defang: '複製無害化連結（方便舉報）',
      sb_checking: 'Google Safe Browsing：查詢中…',
      sb_clean: 'Google Safe Browsing：未列入黑名單',
      sb_hit: (t) => `Google Safe Browsing：已列入黑名單（${t}）`,
      sb_err: 'Google Safe Browsing：查詢失敗，請檢查網絡或 API Key',
      schemeless: '冇寫開頭，已當作 https:// 分析。',

      f_scheme_danger: (p) => [`危險嘅連結類型：${p.scheme}:`, '呢種唔係一般網頁，可以執行程式碼，或者安裝 App／描述檔（例如 itms-services 係 iOS 企業 App 安裝）。除非你完全清楚自己做緊乜，否則唔好開。'],
      f_scheme_odd: (p) => [`唔係一般網頁連結（${p.scheme}）`, '正常網站應該用 https。'],
      f_ip: () => ['網址用 IP 位址，冇網站名稱', '正規機構好少咁做，騙徒會用嚟避開網域審查。'],
      f_homograph: (p) => ['網域夾雜外觀相似嘅外國字母', `解碼後係「${p.unicode}」。睇落似英文字母，其實可能係西里爾或希臘字母（同形字攻擊）。`],
      f_idn_mixed: (p) => ['網域混合中文同英文字母', `解碼後係「${p.unicode}」。香港有合法嘅中文網域，但請核對清楚。`],
      f_idn_cjk: (p) => ['中文網域', `解碼後係「${p.unicode}」。屬正常用法，請確認係你預期嘅網站。`],
      f_idn: (p) => ['網域包含特殊字元', `解碼後係「${p.unicode}」。特殊字元可以令假網域睇落同真嘅一樣。`],
      f_userinfo: (p) => ['網址入面有 @ 符號，用嚟誤導', `「@」前面只係假帳號名，瀏覽器實際會去「@」後面嘅 ${p.host}。`],
      f_nohttps: () => ['冇加密（http）', '資料會以明文傳送。正規嘅登入同付款頁唔會咁。'],
      f_shortener: (p) => ['短網址，睇唔到真正目的地', `${p.host} 會再轉去另一個網站，呢個工具無法本機展開。可以用下面嘅信譽服務，或者問寄件人拎完整連結。`],
      f_tld_zip: (p) => [`網域尾綴 .${p.tld} 容易同檔案名混淆`, '.zip 同 .mov 係真正嘅網域尾綴，騙徒會扮成檔案連結。'],
      f_tld: (p) => [`網域尾綴 .${p.tld} 常被濫用`, '呢類尾綴註冊平，常見於釣魚同垃圾網站，當然亦有正當用途。'],
      f_subdomains: (p) => ['子網域層數過多', `前面嘅名稱只係用嚟誤導，真正網站係 ${p.domain}。`],
      f_hyphens: () => ['網域橫線太多', '「品牌-secure-login-verify」式網域係釣魚常見特徵。'],
      f_longhost: () => ['網域名異常地長', '過長網域常用嚟隱藏真正名稱。'],
      f_brand: (p) => [`疑似冒充 ${p.brand}`, `網址入面有「${p.token}」，但真正網域係 ${p.domain}，唔屬於 ${p.brand} 官方網域。`],
      f_typo: (p) => [`網域名似 ${p.brand}（${p.name} ≈ ${p.key}）`, `疑似拼寫陷阱。真正網域係 ${p.domain}。`],
      f_keywords: (p) => [`有常見釣魚字眼：${p.words.join('、')}`, '單獨出現未必有問題，同其他警號一齊出現就要提防。'],
      f_redirect: () => ['網址帶住另一個網址（轉址參數）', '可能經正規網站轉去危險網站。'],
      f_risky_file: (p) => (p.ext === 'mobileconfig'
        ? ['會下載 iOS 設定描述檔（.mobileconfig）', '描述檔可以改 VPN、DNS 同憑證，被濫用就可以監控你嘅網絡流量。唔認識就唔好安裝。']
        : [`連結指向 .${p.ext} 檔案`, '呢類檔案可能係惡意程式或者安裝檔。']),
      f_port: (p) => [`使用非標準連接埠 :${p.port}`, '一般網站唔會咁，可能係臨時架設嘅釣魚站。'],
      f_longurl: () => ['網址異常地長', '長網址常用嚟隱藏真正目標。'],

      pw_h: '密碼有冇洩漏',
      pw_lede: '對比已知資料洩漏嘅密碼庫，睇下你嘅密碼有冇出現過。',
      pw_label: '要檢查嘅密碼',
      pw_ph: '輸入密碼',
      pw_check: '檢查洩漏',
      pw_privacy: '密碼唔會離開你部機。只有密碼 SHA-1 雜湊值嘅頭 5 個字元會傳去 Have I Been Pwned（k-匿名），比對喺本機完成。離開呢頁或者收埋 App 時，輸入框會自動清空。',
      pw_loading: '檢查緊…',
      pw_clean_t: '資料庫入面搵唔到',
      pw_clean_d: '呢個密碼未出現喺已知洩漏紀錄。但唔代表夠安全，只代表未被收錄。每個網站都要用唔同密碼。',
      pw_pwned_t: (n) => `已洩漏，出現過 ${n.toLocaleString()} 次`,
      pw_pwned_d: '請即刻停用，所有用過呢個密碼嘅網站都要更換。',
      pw_offline: '而家冇網絡，無法檢查。',
      pw_insecure: '呢個頁面唔係 HTTPS，瀏覽器唔准用加密功能。請用 https:// 網址開啟。',
      pw_error: '查詢失敗，請稍後再試。',
      strength: ['非常弱', '弱', '一般', '好', '強'],
      sf_common: '常見密碼', sf_repeat: '重複字元多', sf_sequence: '連續字元', sf_short: '太短', sf_digits: '全數字',
      strength_note: (b) => `估算強度約 ${b} bits`,
      gen_h: '產生隨機密碼',
      gen_len: '長度',
      gen_upper: '大寫字母', gen_lower: '小寫字母', gen_digits: '數字', gen_symbols: '符號',
      gen_noamb: '避免易混淆字元（0 O 1 l I）',
      gen_new: '重新產生',
      gen_note: '用裝置內置嘅安全亂數產生，唔會儲存或者傳送。建議存入密碼 App 或密碼管理員。',
      email_h: '查電郵有冇洩漏',
      email_p: '電郵洩漏查詢需要登入或付費 API，所以呢個工具唔直接查。可以去 Have I Been Pwned 官方網站，只會將你輸入嘅電郵傳畀佢哋。',
      email_btn: '開啟 Have I Been Pwned',

      hl_h: 'iPhone 保安健檢', hl_h_android: 'Android 保安健檢',
      plat_label: '揀手機類型',
      hl_lede: '網頁讀唔到你部機嘅系統設定，所以呢度係自我檢查清單。逐項對住設定撳一撳，睇完再打剔。',
      hl_score: '保安分數',
      hl_good: '做得唔錯', hl_ok: '尚可，仲有改善空間', hl_low: '需要加強',
      hl_next: (t) => `下一步：${t}`,
      hl_all: '全部做齊，繼續保持。',
      hl_reset: '重設清單',
      hl_note: '選單名稱可能因 iOS 版本略有不同。清單進度只儲存喺你部機。',
      hl_note_android: '選單名稱因品牌（Samsung、Pixel、小米等）同 Android 版本會有出入，搵唔到可以用設定入面嘅搜尋。清單進度只儲存喺你部機。',
      hl_must: '重要',
      hl_env_https: '安全連線（HTTPS）', hl_env_app: '已加入主畫面', hl_env_net: '有網絡',
      v_h: '版本檢查',
      v_loading: '檢查緊你嘅系統同瀏覽器版本…',
      v_err: '暫時攞唔到最新版本資料，請稍後再試，或者直接去設定檢查更新。',
      v_see: '我哋見到', v_should: '應該係', v_why: '點解要理', v_how: '點樣更新',
      v_unknown: '讀唔到版本號',
      v_t_ios: 'iOS 系統', v_t_chrome_ios: 'iPhone 上嘅 Chrome',
      v_t_chrome: (p) => `Chrome（${p}）`, v_t_browser: (b) => b,
      v_s_ok: '已係最新', v_s_patch: '有小更新', v_s_behind: '版本過舊', v_s_check: '請手動確認',
      v_s_oldbranch: '舊系列，仍有修補', v_s_nodata: '未有資料', v_s_unsupported: '未支援自動檢查',
      v_want_ios: (v) => `iOS ${v} 或以上`,
      v_want_chrome: (min, latest) => min === latest ? `${latest} 或以上` : `${min} 或以上（最新 ${latest}）`,
      v_want_none: '—',
      v_why_ok: '保持開住自動更新就得。',
      v_why_patch: '同一個大版本入面有較新嘅修補版，入面通常係保安修補。',
      v_why_behind: (n) => n > 0 ? `落後 ${n} 個大版本。舊版本嘅漏洞已經公開，攻擊者可以直接利用。` : '舊版本嘅漏洞已經公開，攻擊者可以直接利用。',
      v_why_check_ios: (have, latest) => have ? `瀏覽器只會透露大概嘅版本號（${have}），分唔到你有冇裝 ${latest} 呢類小更新，要你自己去設定確認。` : '用呢個瀏覽器讀唔到 iOS 版本，要你自己去設定確認。用 Safari 開呢頁就可以自動檢查。',
      v_why_check_chrome: 'Chrome 只會透露大版本號，分唔到已修補同未修補嘅 build，要你自己去設定確認。',
      v_why_oldbranch: (v) => `你部機用緊較舊嘅 iOS 系列，Apple 仍然有提供修補（呢個系列最新係 ${v}）。如果部機支援新系列，建議升級。`,
      v_why_nodata: '暫時未有呢個平台嘅版本資料。',
      v_why_unsupported: '暫時只支援自動檢查 Chrome 同 iOS。',
      v_why_chrome_ios: 'iPhone 上嘅 Chrome 其實用 Apple 嘅引擎，網頁漏洞主要靠 iOS 更新修補；App 本身都應該保持最新。',
      v_kev: '近期已被利用嘅漏洞：',
      v_kev_item: (cve, d) => `${cve}（${d} 列入 CISA 清單）`,
      v_how_ios: '設定 → 一般 → 軟件更新。',
      v_how_chrome_ios: 'App Store → 撳右上角頭像 → 更新 Chrome。',
      v_how_android: 'Play 商店 → 搜尋 Chrome → 更新，之後重新開 Chrome。',
      v_how_desktop: '網址列輸入 chrome://settings/help，等佢更新完，撳「重新啟動」。',
      v_how_other: '去瀏覽器嘅「設定 → 關於」檢查更新。',
      v_foot: (d) => `版本資料更新於 ${d}。結果係由瀏覽器提供嘅資料推算，未必百分百準確。`,
      g_device: '裝置', g_account: '帳戶同密碼', g_net: '網絡同訊息', g_privacy: '私隱',
      p_h: '保安更新日期',
      p_how: '網頁讀唔到呢個日期。去 設定 → 關於手機 → Android 版本 →「Android 保安更新」（Samsung：設定 → 關於手機 → 軟件資訊 →「Android 安全性修補程式等級」），再喺下面揀返個月份。',
      p_label: 'Android 保安更新月份',
      p_device: (v) => `偵測到：${v}`,
      p_see: '我哋見到', p_should: '應該係', p_why: '點解要理',
      p_have: (ym, n) => n === 0 ? `${ym}（今個月）` : `${ym}（舊咗 ${n} 個月）`,
      p_want: '最近 1–2 個月內',
      p_s_ok: '仲有更新', p_s_caution: '有啲舊', p_s_high: '可能已停止支援',
      p_why_ok: 'Google 每個月出保安修補，你部機仲有定期收到。',
      p_why_caution: '已經 3 個月或以上冇裝保安修補。去「軟件更新」睇下有冇更新可以裝；如果冇，可能係廠商開始減少支援。',
      p_why_high: '超過半年冇保安修補，部機好可能已經停止支援。網上銀行同付款最好轉用仲有更新嘅手機。',
      p_kev: '近期已被利用嘅 Android 漏洞：',
      p_clear: '清除',
      g_a_device: '裝置', g_a_apps: 'App 同惡意程式', g_a_account: '帳戶同密碼', g_a_net: '網絡同訊息',
      h_a_update_t: '系統同保安更新保持最新',
      h_a_update_d: '設定 → 系統 → 軟件更新（Samsung：設定 → 軟件更新）。另外去 設定 → 保安與私隱 → 系統與更新 → Google Play 系統更新。',
      h_a_lock_t: '用 6 位或以上嘅 PIN 或密碼',
      h_a_lock_d: '設定 → 保安與私隱 → 裝置解鎖 → 螢幕鎖定。唔好用圖案鎖，好容易俾人喺旁邊偷睇到。',
      h_a_theft_t: '開啟失竊保護',
      h_a_theft_d: '設定 → Google → 所有服務 → 失竊保護，開啟「失竊偵測鎖定」同「離線裝置鎖定」。有人搶咗部機跑走，部機會自動鎖上。',
      h_a_find_t: '開啟「尋找我的裝置」',
      h_a_find_d: '設定 → Google → 所有服務 → 尋找我的裝置，確認已開啟。Samsung 用家可以同時開「SmartThings Find」。',
      h_a_sideload_t: '唔好裝來歷不明嘅 APK',
      h_a_sideload_d: '設定 → 應用程式 → 特殊應用程式存取權 → 安裝不明應用程式，全部 App 都設為「不允許」。騙徒最常經 WhatsApp、短訊或者假客服叫你裝 APK，正規 App 一定喺 Play 商店有。',
      h_a_protect_t: '開啟 Google Play Protect',
      h_a_protect_d: 'Play 商店 → 撳右上角頭像 → Play Protect → ⚙ 設定，開啟「使用 Play Protect 掃描應用程式」。順手撳「掃描」做一次檢查。',
      h_a_access_t: '檢查「無障礙」權限',
      h_a_access_d: '設定 → 無障礙功能 → 已下載的應用程式（或「已安裝的服務」）。除咗你認識又真係需要嘅（例如密碼管理工具），全部關閉。惡意 App 攞到呢個權限，可以睇住你個畫面、代你撳掣，用嚟偷銀行驗證碼。',
      h_a_admin_t: '檢查裝置管理員同讀取短訊嘅 App',
      h_a_admin_d: '設定 → 保安與私隱 → 更多保安設定 → 裝置管理員應用程式，只保留「尋找我的裝置」等你認識嘅。再去 設定 → 私隱 → 權限管理員 → 短訊，睇邊啲 App 讀得到短訊。',
      h_a_apps_t: '刪走唔再用同唔認識嘅 App',
      h_a_apps_d: '設定 → 應用程式，睇晒全部 App，刪除唔認識或者好耐冇用嘅。刪唔到嘅陌生 App，可能拎咗裝置管理員權限，要先喺上一項取消。',
      h_a_g2fa_t: 'Google 帳戶開啟兩步驗證',
      h_a_g2fa_d: '設定 → Google → 管理你的 Google 帳戶 → 安全性 → 兩步驗證。加埋密碼金鑰（passkey）同備用電話號碼。',
      h_a_pwmanager_t: '每個網站用唔同密碼',
      h_a_pwmanager_d: '用內置嘅 Google 密碼管理工具，或者 1Password、Bitwarden 等。重用密碼係帳戶被盜最常見原因。',
      h_a_checkup_t: '做一次 Google 密碼檢查',
      h_a_checkup_d: '設定 → Google → 自動填入 → Google 密碼管理工具 → 密碼檢查。逐個更換被洩漏、重複或者太弱嘅密碼。',
      h_a_backup_t: '開啟 Google 備份',
      h_a_backup_d: '設定 → Google → 備份（或 設定 → 系統 → 備份），確認「Google One 備份」已開。萬一遺失或者要重設部機，可以還原。',
      h_a_chrome_t: 'Chrome 開啟安全瀏覽',
      h_a_chrome_d: 'Chrome → ⋮ → 設定 → 私隱與安全 → 安全瀏覽，揀「加強保護」或至少「標準保護」。',
      h_a_spam_t: '開啟垃圾短訊同來電過濾',
      h_a_spam_d: 'Google 訊息 → 頭像 → 訊息設定 → 垃圾訊息防護，開啟。電話 App → 設定 → 來電顯示與垃圾來電，開啟。Samsung 用家喺各自 App 嘅設定入面搵「封鎖號碼與垃圾訊息」。',
      h_a_wifi_t: '唔好自動連公共 Wi-Fi',
      h_a_wifi_d: '設定 → 網絡和互聯網 → Wi-Fi，公共網絡關閉「自動連線」；網絡詳情入面私隱設定揀「使用隨機 MAC」。',
      h_a_perms_t: '檢查 App 權限',
      h_a_perms_d: '設定 → 保安與私隱 → 私隱 → 權限管理員，逐項（位置、相機、麥克風、相片）睇邊啲 App 有權限，唔需要就關。',
      h_a_advanced_t: '（選用）高風險人士可開進階保護',
      h_a_advanced_d: 'Android 16 或以上：設定 → 保安與私隱 → 進階保護。會限制安裝 App 等功能，只適合成為針對性攻擊目標嘅人，一般人唔需要。',
      h_update_t: 'iOS 保持最新',
      h_update_d: '設定 → 一般 → 軟件更新，開啟「自動更新」。大部分入侵都係利用已修補嘅舊漏洞。',
      h_passcode_t: '用 6 位或以上嘅密碼',
      h_passcode_d: '設定 → Face ID 與密碼 → 更改密碼 → 密碼選項，揀「自訂英數密碼」或 6 位數字。',
      h_sdp_t: '開啟失竊裝置保護',
      h_sdp_d: '設定 → Face ID 與密碼 → 失竊裝置保護。就算有人偷咗部機仲知道密碼，改 Apple 帳戶密碼等敏感操作都要 Face ID 同延遲。',
      h_findmy_t: '開啟「尋找我的 iPhone」',
      h_findmy_d: '設定 → 你嘅名字 → 尋找 → 尋找我的 iPhone，同時開啟「尋找網絡」同「傳送最後位置」。',
      h_profiles_t: '檢查有冇陌生嘅描述檔或 VPN',
      h_profiles_d: '設定 → 一般 → VPN 與裝置管理。見到唔認識嘅描述檔，撳入去「移除描述檔」。呢度係 iOS 上最接近「中毒檢查」嘅地方。',
      h_apple2fa_t: 'Apple 帳戶開啟雙重認證',
      h_apple2fa_d: '設定 → 你嘅名字 → 登入與安全性。確認雙重認證已開，並設定備用電話號碼同帳戶復原聯絡人。',
      h_pwmanager_t: '每個網站用唔同密碼',
      h_pwmanager_d: '用內置「密碼」App 或者 1Password、Bitwarden 等。重用密碼係帳戶被盜最常見原因。',
      h_pwrecs_t: '處理「安全建議」入面嘅警告',
      h_pwrecs_d: '設定 → 密碼 → 安全建議。逐個更換被洩漏、重複或者太弱嘅密碼。',
      h_backup_t: '開啟 iCloud 備份（或者電腦備份）',
      h_backup_d: '設定 → 你嘅名字 → iCloud → iCloud 備份。萬一遺失或者遇上勒索，可以還原。',
      h_safari_t: 'Safari 開啟「欺詐性網站警告」',
      h_safari_d: '設定 → App → Safari（舊版：設定 → Safari），確認「欺詐性網站警告」已開。',
      h_unknown_t: '過濾陌生人嘅訊息',
      h_unknown_d: '設定 → 訊息 → 未知與垃圾訊息 → 過濾未知寄件者。包裹、稅務、銀行嘅短訊釣魚大多嚟自陌生號碼。',
      h_wifi_t: '開啟私人 Wi-Fi 位址，唔好自動連公共 Wi-Fi',
      h_wifi_d: '設定 → Wi-Fi → 撳已連接網絡旁嘅 ⓘ，開啟「私人 Wi-Fi 位址」，並關閉公共網絡嘅「自動加入」。',
      h_perms_t: '檢查 App 權限',
      h_perms_d: '設定 → 私隱與保安，逐項（位置、相機、麥克風、相片）睇邊啲 App 有權限，唔需要就關。',
      h_apps_t: '刪走唔再用同唔認識嘅 App',
      h_apps_d: '設定 → 一般 → iPhone 儲存空間，睇 App 列表，刪除唔認識或者好耐冇用嘅。',
      h_lockdown_t: '（選用）高風險人士可開鎖定模式',
      h_lockdown_d: '設定 → 私隱與保安 → 鎖定模式。會限制好多功能，只適合成為針對性攻擊目標嘅人，一般人唔需要。',

      ab_h: '關於 ShieldLite',
      ab_what: '針對 iPhone 同 Android 用戶最常見嘅威脅而做：釣魚短訊、假 App、洩漏密碼同保安設定疏忽。輕量、免安裝、資料留喺本機。',
      ab_cant_h: '做唔到嘅嘢',
      ab_cant1: '網頁冇權掃描手機入面嘅 App 或系統檔案，所以呢個唔係傳統防毒。iPhone 連原生 App 都唔可以咁做；Android 請用內置嘅 Play Protect。',
      ab_cant2: '網頁版讀唔到你部機嘅系統設定，所以「健檢」係自我檢查清單。',
      ab_cant3: '短網址無法喺本機展開，要用信譽服務或者問寄件人。',
      ab_net_h: '會連去邊度',
      ab_net1: '連結分析：預設完全喺本機，唔會傳送任何資料。',
      ab_net2: '密碼檢查：只傳送雜湊值頭 5 個字元去 api.pwnedpasswords.com。',
      ab_net3: 'Safe Browsing：你自己開啟並提供 API Key 先會將連結傳去 Google。',
      ab_net4: '版本檢查：只會由本網站讀取一份公開嘅版本清單（versions.json），版本比較喺你部機進行，唔會傳送任何資料。',
      ab_sb_h: 'Google Safe Browsing（選用）',
      ab_sb_p: 'Safe Browsing 可以額外查 Google 嘅黑名單。你需要自己申請免費 API Key，只供個人非商業用途（商業用途要用 Google Web Risk）。Key 只儲存喺呢部機。',
      ab_sb_s1: '用 Google 帳戶登入 Google Cloud Console，建立一個項目（或者揀現有嘅）。',
      ab_sb_s2: '喺「API 與服務」嘅資料庫搵「Safe Browsing API」，撳「啟用」。',
      ab_sb_s3: '去「憑證」，建立憑證，揀「API 金鑰」。',
      ab_sb_s4: '編輯金鑰，「應用程式限制」揀「網站（HTTP 參照網址）」，加入：',
      ab_sb_s5: '同一頁嘅「API 限制」揀「限制金鑰」，只選 Safe Browsing API。咁就算 Key 洩漏，都只可以由你嘅網站查呢一項服務。',
      ab_sb_s6: '複製金鑰貼落下面，開啟開關，撳「測試 Key」確認有效，再撳「儲存設定」。',
      ab_sb_menu_note: '選單名稱可能因 Google 介面更新而略有不同。',
      ab_sb_guide: 'Google 官方說明',
      ab_sb_test: '測試 Key',
      sb_test_nokey: '請先貼上 API Key。',
      sb_test_ok: 'Key 有效，Google 回應正常。',
      sb_test_fail: (c) => `測試失敗（${c}）。400 通常係 Key 打錯或者未啟用 API；403 通常係參照網址限制同呢個網址對唔上。`,
      sb_test_offline: '而家冇網絡，無法測試。',
      ab_sb_toggle: '連結檢查時使用 Safe Browsing',
      ab_sb_key_label: 'Safe Browsing API Key',
      ab_sb_key_ph: 'API Key',
      ab_save: '儲存設定',
      ab_saved: '已儲存',
      ab_install_h: '加入主畫面',
      ab_install_p: 'iPhone：喺 Safari 開啟呢個網址，撳分享按鈕，揀「加入主畫面」。Android：喺 Chrome 撳 ⋮，揀「安裝應用程式」或「加至主畫面」。',
      ab_data_h: '本機資料',
      ab_clear: '清除所有本機資料',
      ab_clear_confirm: '會清除健檢進度、語言同 Safe Browsing 設定。確定？',
      ab_cleared: '已清除',
      ab_ver: '版本'
    },

    en: {
      tagline: 'Links · passwords · phone security',
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
      hl_lede: "A web page can't read your phone's system settings, so this is a self-check list. Open each setting, look, then tick it off.",
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
      ab_net_h: 'What it connects to',
      ab_net1: 'Link analysis: fully on-device by default. Nothing is sent.',
      ab_net2: 'Password check: only the first 5 characters of the hash go to api.pwnedpasswords.com.',
      ab_net3: 'Safe Browsing: links go to Google only if you turn it on and supply your own API key.',
      ab_net4: 'Version check: reads a public version list (versions.json) from this site. The comparison runs on your device and nothing is sent.',
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
      ab_ver: 'Version'
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
  const TABS = ['link', 'pw', 'health', 'about'];
  function showTab(id) {
    if (!TABS.includes(id)) id = 'link';
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
  let health = store.get('health', {});
  const openItems = new Set();

  function ring(pct) {
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
    tx.textContent = pct;
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

    let total = 0, got = 0, next = null;
    healthGroups().forEach((grp) => grp.items.forEach(([id, w]) => {
      total += w;
      if (health[id]) got += w;
      else if (w > 0 && (!next || w > next.w)) next = { id, w };
    }));
    const pct = total ? Math.round((got / total) * 100) : 0;

    const standalone = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
    const envTag = (ok, label) => el('span', { class: 'tag ' + (ok ? 'ok' : 'no') }, (ok ? '✓ ' : '– ') + label);

    const sum = $('#healthSummary');
    sum.replaceChildren(ring(pct), el('div', { class: 'summary-text' },
      el('b', null, pct >= 85 ? t('hl_good') : pct >= 60 ? t('hl_ok') : t('hl_low')),
      el('span', null, next ? t('hl_next', t('h_' + next.id + '_t')) : t('hl_all')),
      el('div', { class: 'env' },
        envTag(window.isSecureContext, t('hl_env_https')),
        envTag(standalone, t('hl_env_app')),
        envTag(navigator.onLine, t('hl_env_net')))));

    const list = $('#healthList');
    list.replaceChildren();
    healthGroups().forEach((grp) => {
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
    $('#langBtn').textContent = lang === 'zh' ? 'EN' : '中';
    $('#langBtn').setAttribute('aria-label', lang === 'zh' ? 'Switch to English' : '切換至中文');
    $('#pwToggle').textContent = $('#pwInput').type === 'password' ? t('show') : t('hide');
    renderLink(); renderPw(); renderStrength(); renderHealth(); renderVersions();
  }

  /* --------------------------------- init --------------------------------- */
  function init() {
    $$('.tab').forEach((b) => b.addEventListener('click', () => showTab(b.dataset.tab)));
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
    showTab(TABS.includes(fromHash) ? fromHash : store.get('tab', 'link'));

    if ('serviceWorker' in navigator && window.isSecureContext) {
      navigator.serviceWorker.register('sw.js').catch(() => { /* offline support is optional */ });
    }
  }

  init();
})();
