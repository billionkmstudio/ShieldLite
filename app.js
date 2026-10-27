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

      hl_h: 'iPhone 保安健檢',
      hl_lede: '網頁讀唔到你部機嘅系統設定，所以呢度係自我檢查清單。逐項對住設定撳一撳，睇完再打剔。',
      hl_score: '保安分數',
      hl_good: '做得唔錯', hl_ok: '尚可，仲有改善空間', hl_low: '需要加強',
      hl_next: (t) => `下一步：${t}`,
      hl_all: '全部做齊，繼續保持。',
      hl_reset: '重設清單',
      hl_note: '選單名稱可能因 iOS 版本略有不同。清單進度只儲存喺你部機。',
      hl_must: '重要',
      hl_env_https: '安全連線（HTTPS）', hl_env_app: '已加入主畫面', hl_env_net: '有網絡',
      g_device: '裝置', g_account: '帳戶同密碼', g_net: '網絡同訊息', g_privacy: '私隱',
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
      ab_what: '針對 iPhone 用戶最常見嘅威脅而做：釣魚短訊、洩漏密碼同保安設定疏忽。輕量、免安裝、資料留喺本機。',
      ab_cant_h: '做唔到嘅嘢',
      ab_cant1: 'iOS 唔容許任何 App 掃描其他 App 或系統檔案，所以呢個唔係傳統防毒，亦冇可能做到。',
      ab_cant2: '網頁版讀唔到你部機嘅系統設定，所以「健檢」係自我檢查清單。',
      ab_cant3: '短網址無法喺本機展開，要用信譽服務或者問寄件人。',
      ab_net_h: '會連去邊度',
      ab_net1: '連結分析：預設完全喺本機，唔會傳送任何資料。',
      ab_net2: '密碼檢查：只傳送雜湊值頭 5 個字元去 api.pwnedpasswords.com。',
      ab_net3: 'Safe Browsing：你自己開啟並提供 API Key 先會將連結傳去 Google。',
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
      ab_install_p: '喺 Safari 開啟呢個網址，撳分享按鈕，揀「加入主畫面」。',
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

      hl_h: 'iPhone security checkup',
      hl_lede: "A web page can't read your phone's system settings, so this is a self-check list. Open each setting, look, then tick it off.",
      hl_score: 'Security score',
      hl_good: 'Looking good', hl_ok: 'Decent, room to improve', hl_low: 'Needs work',
      hl_next: (t) => `Next: ${t}`,
      hl_all: 'Everything done. Keep it up.',
      hl_reset: 'Reset checklist',
      hl_note: 'Menu names can differ slightly between iOS versions. Progress is stored only on this device.',
      hl_must: 'Key',
      hl_env_https: 'Secure connection (HTTPS)', hl_env_app: 'On Home Screen', hl_env_net: 'Online',
      g_device: 'Device', g_account: 'Accounts and passwords', g_net: 'Network and messages', g_privacy: 'Privacy',
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
      ab_what: 'Built for the threats iPhone users meet most: phishing texts, leaked passwords and neglected security settings. Lightweight, no install, data stays on your device.',
      ab_cant_h: "What it can't do",
      ab_cant1: "iOS doesn't let any app scan other apps or system files, so this is not a traditional antivirus and can't be.",
      ab_cant2: "A web app can't read your phone's system settings, so the Checkup is a self-check list.",
      ab_cant3: "Short links can't be expanded on-device. Use a reputation service or ask the sender.",
      ab_net_h: 'What it connects to',
      ab_net1: 'Link analysis: fully on-device by default. Nothing is sent.',
      ab_net2: 'Password check: only the first 5 characters of the hash go to api.pwnedpasswords.com.',
      ab_net3: 'Safe Browsing: links go to Google only if you turn it on and supply your own API key.',
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
      ab_install_p: 'Open this address in Safari, tap Share, then Add to Home Screen.',
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
  const HEALTH = [
    { g: 'g_device', items: [['update', 3], ['passcode', 3], ['sdp', 3], ['findmy', 2], ['profiles', 2]] },
    { g: 'g_account', items: [['apple2fa', 3], ['pwmanager', 2], ['pwrecs', 2], ['backup', 1]] },
    { g: 'g_net', items: [['safari', 2], ['unknown', 2], ['wifi', 1]] },
    { g: 'g_privacy', items: [['perms', 2], ['apps', 1], ['lockdown', 0]] }
  ];
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
    let total = 0, got = 0, next = null;
    HEALTH.forEach((grp) => grp.items.forEach(([id, w]) => {
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
    HEALTH.forEach((grp) => {
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

  /* ----------------------------- language / static ----------------------------- */
  function applyLang() {
    document.documentElement.lang = lang === 'zh' ? 'zh-Hant-HK' : 'en';
    $$('[data-i18n]').forEach((n) => { n.textContent = t(n.getAttribute('data-i18n')); });
    $$('[data-i18n-ph]').forEach((n) => { n.setAttribute('placeholder', t(n.getAttribute('data-i18n-ph'))); });
    $('#langBtn').textContent = lang === 'zh' ? 'EN' : '中';
    $('#langBtn').setAttribute('aria-label', lang === 'zh' ? 'Switch to English' : '切換至中文');
    $('#pwToggle').textContent = $('#pwInput').type === 'password' ? t('show') : t('hide');
    renderLink(); renderPw(); renderStrength(); renderHealth();
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

    $('#healthReset').addEventListener('click', () => { health = {}; store.set('health', health); renderHealth(); });

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
    if (ios && !standalone && !store.get('instDismissed', false)) $('#installHint').hidden = false;
    $('#installClose').addEventListener('click', () => { $('#installHint').hidden = true; store.set('instDismissed', true); });

    window.addEventListener('online', renderHealth);
    window.addEventListener('offline', renderHealth);

    regenerate();
    applyLang();
    const fromHash = location.hash.replace('#', '');
    showTab(TABS.includes(fromHash) ? fromHash : store.get('tab', 'link'));

    if ('serviceWorker' in navigator && window.isSecureContext) {
      navigator.serviceWorker.register('sw.js').catch(() => { /* offline support is optional */ });
    }
  }

  init();
})();
