# ShieldLite

iPhone 用嘅輕量防護 PWA：連結釣魚分析、密碼洩漏檢查（k-匿名）、iPhone 保安健檢清單。純靜態檔案，冇後端。

## 部署（一定要 HTTPS）

iPhone 要 HTTPS 先可以用加密功能（密碼檢查）同安裝成 App。

1. 將成個資料夾上載到任何 HTTPS 靜態主機：Cloudflare Pages、Netlify、GitHub Pages，或者你自己網站嘅子路徑（例如 `/shieldlite/`）。所有路徑都係相對路徑，放喺子資料夾冇問題。
2. iPhone Safari 開個網址，撳分享，揀「加入主畫面」。

本機試用：`python3 -m http.server 8080`，喺電腦用 `http://localhost:8080` 開。iPhone 經區域網絡用 http 開會唔得，因為唔係安全環境。

## 更新

改咗任何檔案之後，將 `sw.js` 入面嘅 `CACHE` 版本號加一（例如 `shieldlite-v2`），手機先會拎到新版。

## 擴充

- 品牌名單：`core.js` 嘅 `BRANDS`，加入你想保護嘅品牌同官方網域。
- 可疑尾綴、短網址、關鍵字：`core.js` 頂部嘅集合。
- 健檢項目同文字：`app.js` 嘅 `HEALTH` 同 `I18N`。

## Google Safe Browsing（選用）

Safe Browsing API 只供個人非商業用途，商業用途要用 Google Web Risk。App 內「關於」頁已有同樣嘅步驟，並有「測試 Key」掣。

1. 登入 Google Cloud Console，建立項目。
2. 「API 與服務」資料庫搵 Safe Browsing API，啟用。
3. 「憑證」建立 API 金鑰。
4. 編輯金鑰：「應用程式限制」揀網站（HTTP 參照網址），加入 `https://你的網域/*`。
5. 「API 限制」揀限制金鑰，只選 Safe Browsing API。
6. 金鑰貼入 App，開啟開關，撳「測試 Key」，再儲存。

注意：頁面用咗 `strict-origin` referrer 政策，所以瀏覽器只會傳送網域（冇路徑），參照網址一定要寫成 `https://你的網域/*`，寫 `https://你的網域/shieldlite/*` 會對唔上。
測試出現 400 通常係 Key 打錯或者未啟用 API，403 通常係參照網址限制對唔上。官方說明：https://developers.google.com/safe-browsing/v4/get-started

## 品牌名單

`core.js` 嘅 `BRANDS` 已包含主要 UK 同 HK 銀行、快遞、電訊、政府部門同常見平台。加新品牌時，關鍵字（`k`）要夠獨特：太普通嘅字（例如 kraken、payme、sky、wise）會令正常網站被誤判。官方網域（`d`）寫錯會令真網站被當成冒充，加之前請核對清楚。`core.test.js` 有誤判測試可以跟住加。

## 測試

`node core.test.js` 跑核心邏輯測試（連結分析、punycode、SHA-1、k-匿名請求、強度、產生器）。

## 限制

- iOS 唔容許 App 掃描其他 App 或檔案，所以呢個唔係傳統防毒。
- 網頁讀唔到系統設定，健檢係自我檢查清單。
- 連結分析係特徵判斷，冇警號唔等於安全。
- 短網址無法本機展開。
