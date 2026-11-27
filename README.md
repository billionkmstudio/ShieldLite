# ShieldLite

iPhone 同 Android 用嘅輕量防護 PWA：連結釣魚分析、密碼洩漏檢查（k-匿名）、系統同瀏覽器版本檢查、iPhone／Android 保安健檢清單。純靜態檔案，冇後端。

## 部署（一定要 HTTPS）

iPhone 要 HTTPS 先可以用加密功能（密碼檢查）同安裝成 App。

1. 將成個資料夾上載到任何 HTTPS 靜態主機：Cloudflare Pages、Netlify、GitHub Pages，或者你自己網站嘅子路徑（例如 `/shieldlite/`）。所有路徑都係相對路徑，放喺子資料夾冇問題。
2. iPhone Safari 開個網址，撳分享，揀「加入主畫面」。

本機試用：`python3 -m http.server 8080`，喺電腦用 `http://localhost:8080` 開。iPhone 經區域網絡用 http 開會唔得，因為唔係安全環境。

## 更新

改咗任何檔案之後，將 `sw.js` 入面嘅 `CACHE` 版本號加一（例如 `shieldlite-v2`），手機先會拎到新版。

正式發佈新版時，同時改 `app.js` 頂部嘅 `APP_VERSION`（footer 同「關於」頁都係讀呢個值）。版權年份由 `COPYRIGHT_FROM` 開始自動延伸到今年。

## 公開網址同 SEO

正式網址係 `https://shieldlite.billionstudio.app/`，`index.html` 嘅 canonical、Open Graph、JSON-LD，同 `robots.txt`、`sitemap.xml` 都用呢個網址。換網域要一齊改。Footer 版權行嘅 Billion Studio 連去 billionstudio.co.uk，帶 `utm_source=shieldlite`，喺網站分析可以睇到由 ShieldLite 帶嚟幾多人。

## 擴充

- 品牌名單：`core.js` 嘅 `BRANDS`，加入你想保護嘅品牌同官方網域。
- 可疑尾綴、短網址、關鍵字：`core.js` 頂部嘅集合。
- 健檢項目同文字：`app.js` 嘅 `HEALTH` 同 `I18N`。

## Google Safe Browsing（選用）

Safe Browsing API 只供個人非商業用途，商業用途要用 Google Web Risk。App 內「關於」頁底部嘅「進階設定」摺疊區有同樣嘅步驟同「測試 Key」掣，預設收埋；用家開咗 Safe Browsing 先會自動展開。

1. 登入 Google Cloud Console，建立項目。
2. 「API 與服務」資料庫搵 Safe Browsing API，啟用。
3. 「憑證」建立 API 金鑰。
4. 編輯金鑰：「應用程式限制」揀網站（HTTP 參照網址），加入 `https://你的網域/*`。
5. 「API 限制」揀限制金鑰，只選 Safe Browsing API。
6. 金鑰貼入 App，開啟開關，撳「測試 Key」，再儲存。

注意：頁面用咗 `strict-origin` referrer 政策，所以瀏覽器只會傳送網域（冇路徑），參照網址一定要寫成 `https://你的網域/*`，寫 `https://你的網域/shieldlite/*` 會對唔上。
測試出現 400 通常係 Key 打錯或者未啟用 API，403 通常係參照網址限制對唔上。官方說明：https://developers.google.com/safe-browsing/v4/get-started

## 分享即檢查同快速模式

- 打開 `/?url=<連結>`（或者分享表單嘅 `text`／`title`）就會即刻分析，之後網址會清走個連結；service worker 唔會將帶參數嘅頁面寫入快取。
- Android：`manifest.webmanifest` 有 `share_target`，用 Chrome 安裝之後會出現喺分享選單。
- iPhone：PWA 唔支援分享目標，要用「捷徑」App，步驟寫喺「關於」頁。
- 健檢頁預設只顯示 5 項必做（`QUICK`），可以撳掣顯示全部；揀選會記住。

## Android 支援

- 健檢頁頂有「iPhone｜Android」切換，預設跟部機自動揀，揀咗會記住（幫家人檢查都得）。
- Android 清單 18 項，重點係假 APK、Play Protect、無障礙權限、裝置管理員同讀短訊權限。進度 id 用 `a_` 開頭，同 iPhone 清單分開儲存；「重設清單」只會清當前平台。
- 保安更新日期：網頁讀唔到，叫用家去設定睇，再揀月份；0–2 個月算正常，3–5 個月提醒，6 個月以上提示可能已停止支援。如果 `versions.json` 有 Android 已被利用漏洞（CISA KEV），會一併顯示。
- Android Chrome 會用 client hints 顯示真實 Android 版本同型號。

## 版本檢查

健檢頁頂部會比較你部機嘅 iOS／Chrome 版本同最新版本，用「我哋見到／應該係／點解要理」顯示。

- 資料檔：`versions.json`，由 `.github/workflows/versions.yml` 每日 06:17 UTC 自動更新，亦可以喺 GitHub Actions 撳「Run workflow」手動更新。
- 資料來源：Chrome 用 Google VersionHistory API，iOS 用 SOFA（sofafeed.macadmins.io），已被利用漏洞用 CISA KEV。全部公開，唔使 API key。
- Chrome 嘅 `min` 係 Google 仲喺度推送嘅最舊 build，等於或高過佢就算最新；`latest` 係已全面推出嘅最新 build。
- 電腦同 Android 嘅 Chrome 用 client hints 攞完整版本號；iPhone 用 Safari 嘅版本號推算 iOS 版本（新版 Safari 凍結咗 UA 入面嘅 `OS 18_6`）。推算唔到就叫用家自己去設定睇。
- 改咗 `scripts/update-versions.mjs` 先跑 `node scripts/test-update-versions.mjs`。
- GitHub 設定要允許 Actions 寫入：Settings → Actions → General → Workflow permissions。

## 品牌名單

`core.js` 嘅 `BRANDS` 已包含主要 UK 同 HK 銀行、快遞、電訊、政府部門同常見平台。加新品牌時，關鍵字（`k`）要夠獨特：太普通嘅字（例如 kraken、payme、sky、wise）會令正常網站被誤判。官方網域（`d`）寫錯會令真網站被當成冒充，加之前請核對清楚。`core.test.js` 有誤判測試可以跟住加。

## 測試

`node core.test.js` 跑核心邏輯測試（連結分析、punycode、SHA-1、k-匿名請求、強度、產生器、版本檢查）。

## 限制

- iOS 唔容許 App 掃描其他 App 或檔案，所以呢個唔係傳統防毒。
- 網頁讀唔到系統設定，健檢係自我檢查清單。版本檢查只係由瀏覽器資料推算，睇唔到 iOS 嘅小更新（例如 x.y.z）。
- 連結分析係特徵判斷，冇警號唔等於安全。
- 短網址無法本機展開。
