/*! ShieldLite core · pure logic (no DOM) · runs in browsers and Node */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ShieldCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ------------------------------ data ------------------------------ */
  const SHORTENERS = new Set([
    'bit.ly', 't.co', 'tinyurl.com', 'goo.gl', 'is.gd', 'ow.ly', 'buff.ly', 'rebrand.ly', 'cutt.ly',
    'shorturl.at', 't.ly', 'rb.gy', 'lnkd.in', 's.id', 'tiny.cc', 'v.gd', 'bit.do', 'reurl.cc', 'qr.ae', 'shorturl.asia'
  ]);

  const RISKY_TLDS = new Set([
    'top', 'xyz', 'click', 'link', 'work', 'support', 'rest', 'country', 'gq', 'tk', 'ml', 'ga', 'cf',
    'cyou', 'buzz', 'icu', 'monster', 'sbs', 'cfd', 'bond', 'cam', 'loan', 'men', 'date', 'download',
    'stream', 'racing', 'review', 'accountant', 'science', 'party', 'trade', 'webcam', 'win', 'bid'
  ]);

  const RISKY_EXT = new Set([
    'apk', 'exe', 'scr', 'msi', 'dmg', 'iso', 'jar', 'vbs', 'bat', 'cmd', 'ps1', 'ipa', 'mobileconfig',
    'pkg', 'crx', 'lnk', 'hta', 'wsf', 'cpl', 'appx', 'msix'
  ]);

  const KEYWORDS = new Set([
    'login', 'signin', 'verify', 'verification', 'secure', 'security', 'update', 'account', 'password',
    'confirm', 'wallet', 'billing', 'suspend', 'suspended', 'unlock', 'refund', 'invoice', 'claim',
    'prize', 'reward', 'gift', 'otp', 'authenticate', 'recover', 'helpdesk', 'redelivery', 'customs'
  ]);

  const REDIRECT_KEYS = new Set(['url', 'redirect', 'redirect_uri', 'redirecturl', 'next', 'return', 'returnurl', 'goto', 'dest', 'destination', 'continue', 'target', 'link', 'u']);

  const SECOND_LEVEL = new Set(['co', 'com', 'org', 'net', 'gov', 'ac', 'edu', 'ltd', 'plc', 'me', 'sch', 'nhs']);

  const SPECIAL_SCHEMES = new Set(['javascript', 'data', 'vbscript', 'file', 'blob', 'itms-services', 'intent', 'ms-msdt', 'search-ms', 'ms-officecmd']);
  const NON_WEB = new Set(['tel', 'sms', 'mailto', 'facetime']);

  // n = display name, k = keyword tokens, d = official domains (suffix match). Best effort; extend freely.
  // Keep k distinctive: a common word (kraken, payme, sky, wise) would flag innocent sites.
  const BRANDS = [
    { n: 'PayPal', k: ['paypal'], d: ['paypal.com', 'paypal.me', 'paypalobjects.com'] },
    { n: 'Apple', k: ['apple', 'appleid', 'icloud'], d: ['apple.com', 'apple.com.cn', 'icloud.com', 'icloud-content.com', 'apple.news', 'itunes.com'] },
    { n: 'Google', k: ['google', 'gmail'], d: ['google.com', 'gmail.com', 'google.co.uk', 'google.com.hk', 'goo.gl', 'googleusercontent.com', 'googleapis.com', 'gstatic.com', 'googlevideo.com', 'youtube.com'] },
    { n: 'Microsoft', k: ['microsoft', 'outlook', 'office365', 'onedrive', 'hotmail'], d: ['microsoft.com', 'live.com', 'outlook.com', 'office.com', 'microsoftonline.com', 'office365.com', 'onedrive.com', 'hotmail.com'] },
    { n: 'Amazon', k: ['amazon'], d: ['amazon.com', 'amazon.co.uk', 'amazon.de', 'amazon.fr', 'amazon.it', 'amazon.es', 'amazon.ca', 'amazon.co.jp', 'amazon.in', 'amazon.com.au', 'amazonaws.com'] },
    { n: 'Netflix', k: ['netflix'], d: ['netflix.com'] },
    { n: 'Meta', k: ['facebook', 'instagram', 'whatsapp'], d: ['facebook.com', 'facebookmail.com', 'fbcdn.net', 'fb.com', 'fb.me', 'instagram.com', 'whatsapp.com', 'whatsapp.net', 'meta.com'] },
    { n: 'HSBC', k: ['hsbc'], d: ['hsbc.com', 'hsbc.co.uk', 'hsbc.com.hk', 'hsbc.com.cn'] },
    { n: 'Barclays', k: ['barclays'], d: ['barclays.co.uk', 'barclays.com'] },
    { n: 'Lloyds Bank', k: ['lloyds', 'lloydsbank'], d: ['lloydsbank.com', 'lloydsbank.co.uk', 'lloydsbankinggroup.com'] },
    { n: 'NatWest', k: ['natwest'], d: ['natwest.com', 'natwestgroup.com'] },
    { n: 'Santander', k: ['santander'], d: ['santander.co.uk', 'santander.com'] },
    { n: 'Halifax', k: ['halifax'], d: ['halifax.co.uk'] },
    { n: 'Nationwide', k: ['nationwide'], d: ['nationwide.co.uk', 'nationwide.com'] },
    { n: 'Monzo', k: ['monzo'], d: ['monzo.com'] },
    { n: 'Revolut', k: ['revolut'], d: ['revolut.com'] },
    { n: 'Starling', k: ['starlingbank'], d: ['starlingbank.com'] },
    { n: 'Standard Chartered', k: ['standardchartered'], d: ['standardchartered.com', 'sc.com'] },
    { n: 'Hang Seng', k: ['hangseng'], d: ['hangseng.com'] },
    { n: 'BOCHK', k: ['bochk'], d: ['bochk.com'] },
    { n: 'Royal Mail', k: ['royalmail'], d: ['royalmail.com'] },
    { n: 'Evri', k: ['evri'], d: ['evri.com'] },
    { n: 'DPD', k: ['dpd'], d: ['dpd.co.uk', 'dpd.com', 'dpdgroup.com'] },
    { n: 'DHL', k: ['dhl'], d: ['dhl.com', 'dhl.co.uk', 'dhl.de'] },
    { n: 'FedEx', k: ['fedex'], d: ['fedex.com'] },
    { n: 'Parcelforce', k: ['parcelforce'], d: ['parcelforce.com'] },
    { n: 'Hongkong Post', k: ['hongkongpost', 'hkpost'], d: ['hongkongpost.hk', 'gov.hk'] },
    { n: 'HMRC', k: ['hmrc'], d: ['gov.uk'] },
    { n: 'DVLA', k: ['dvla'], d: ['gov.uk'] },
    { n: 'NHS', k: ['nhs'], d: ['nhs.uk', 'nhs.net'] },
    { n: 'TV Licensing', k: ['tvlicensing'], d: ['tvlicensing.co.uk'] },
    { n: 'Alipay', k: ['alipay', 'alipayhk'], d: ['alipay.com', 'alipayhk.com'] },
    { n: 'WeChat', k: ['wechat', 'weixin'], d: ['wechat.com', 'weixin.qq.com', 'qq.com'] },
    { n: 'Coinbase', k: ['coinbase'], d: ['coinbase.com'] },
    { n: 'Binance', k: ['binance'], d: ['binance.com', 'binance.us'] },
    { n: 'MetaMask', k: ['metamask'], d: ['metamask.io'] },
    { n: 'LinkedIn', k: ['linkedin'], d: ['linkedin.com', 'lnkd.in'] },
    { n: 'Dropbox', k: ['dropbox'], d: ['dropbox.com'] },

    // --- UK: banks and finance
    { n: 'TSB', k: ['tsb'], d: ['tsb.co.uk'] },
    { n: 'First Direct', k: ['firstdirect'], d: ['firstdirect.com'] },
    { n: 'Metro Bank', k: ['metrobank', 'metrobankonline'], d: ['metrobankonline.co.uk'] },
    { n: 'Virgin Money', k: ['virginmoney'], d: ['virginmoney.com'] },
    { n: 'Tesco Bank', k: ['tescobank'], d: ['tescobank.com'] },
    { n: 'Co-operative Bank', k: ['cooperativebank'], d: ['co-operativebank.co.uk'] },
    { n: 'Klarna', k: ['klarna'], d: ['klarna.com'] },
    // --- UK: delivery, post, shopping
    { n: 'Yodel', k: ['yodel'], d: ['yodel.co.uk'] },
    { n: 'InPost', k: ['inpost'], d: ['inpost.co.uk'] },
    { n: 'Post Office', k: ['postoffice'], d: ['postoffice.co.uk'] },
    { n: 'eBay', k: ['ebay'], d: ['ebay.com', 'ebay.co.uk'] },
    { n: 'Argos', k: ['argos'], d: ['argos.co.uk'] },
    { n: 'Tesco', k: ['tesco'], d: ['tesco.com'] },
    { n: 'Vinted', k: ['vinted'], d: ['vinted.co.uk', 'vinted.com'] },
    // --- UK: telecoms, utilities, transport, services
    { n: 'Vodafone', k: ['vodafone'], d: ['vodafone.co.uk', 'vodafone.com'] },
    { n: 'Virgin Media', k: ['virginmedia'], d: ['virginmedia.com'] },
    { n: 'TalkTalk', k: ['talktalk'], d: ['talktalk.co.uk'] },
    { n: 'British Gas', k: ['britishgas'], d: ['britishgas.co.uk'] },
    { n: 'Octopus Energy', k: ['octopusenergy'], d: ['octopus.energy'] },
    { n: 'TfL', k: ['tfl'], d: ['tfl.gov.uk'] },
    // --- Hong Kong: banks and payments
    { n: 'DBS', k: ['dbs'], d: ['dbs.com.hk', 'dbs.com'] },
    { n: 'Citibank', k: ['citibank'], d: ['citibank.com.hk', 'citibank.com', 'citi.com'] },
    { n: 'Bank of East Asia', k: ['hkbea'], d: ['hkbea.com'] },
    { n: 'Dah Sing Bank', k: ['dahsing'], d: ['dahsing.com'] },
    { n: 'ZA Bank', k: ['zabank'], d: ['zabank.hk'] },
    { n: 'WeLab Bank', k: ['welabbank'], d: ['welab.bank'] },
    { n: 'Airstar Bank', k: ['airstarbank'], d: ['airstarbank.com'] },
    { n: 'Fusion Bank', k: ['fusionbank'], d: ['fusionbank.com'] },
    // --- Hong Kong: government
    { n: 'Inland Revenue Dept', k: ['ird'], d: ['gov.hk'] },
    { n: 'Immigration Dept', k: ['immd'], d: ['gov.hk'] },
    // --- Hong Kong: telecoms, utilities, delivery, shopping
    { n: 'HKT', k: ['hkt'], d: ['hkt.com', 'hkcsl.com', 'pccw.com'] },
    { n: 'csl', k: ['hkcsl'], d: ['hkcsl.com', 'hkt.com'] },
    { n: 'SmarTone', k: ['smartone'], d: ['smartone.com'] },
    { n: 'HKBN', k: ['hkbn'], d: ['hkbn.net'] },
    { n: 'CLP', k: ['clp'], d: ['clp.com.hk'] },
    { n: 'Towngas', k: ['towngas'], d: ['towngas.com'] },
    { n: 'SF Express', k: ['sfexpress'], d: ['sf-express.com'] },
    { n: 'Lalamove', k: ['lalamove'], d: ['lalamove.com'] },
    { n: 'foodpanda', k: ['foodpanda'], d: ['foodpanda.com'] },
    { n: 'HKTVmall', k: ['hktvmall'], d: ['hktvmall.com'] },
    // --- Crypto and accounts
    { n: 'Trezor', k: ['trezor'], d: ['trezor.io'] },
    { n: 'Spotify', k: ['spotify'], d: ['spotify.com'] }
  ];

  /* ----------------------------- helpers ---------------------------- */
  const hostIs = (host, d) => host === d || host.endsWith('.' + d);

  function registrable(host) {
    const labels = host.split('.');
    if (labels.length <= 2) return host;
    const tld = labels[labels.length - 1];
    const sld = labels[labels.length - 2];
    if (tld.length === 2 && SECOND_LEVEL.has(sld)) return labels.slice(-3).join('.');
    return labels.slice(-2).join('.');
  }

  function levenshtein(a, b) {
    if (a === b) return 0;
    const m = a.length, n = b.length;
    if (!m) return n;
    if (!n) return m;
    let prev = Array.from({ length: n + 1 }, (_, j) => j);
    for (let i = 1; i <= m; i++) {
      const cur = [i];
      for (let j = 1; j <= n; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
      prev = cur;
    }
    return prev[n];
  }

  const LEET = { '0': 'o', '1': 'l', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b', '$': 's' };
  function deLeet(s) {
    return s.replace(/rn/g, 'm').replace(/vv/g, 'w').replace(/[0134578$]/g, (c) => LEET[c]);
  }

  // RFC 3492 punycode decoder (label without the "xn--" prefix)
  function punyDecode(input) {
    const base = 36, tMin = 1, tMax = 26, skew = 38, damp = 700;
    const digitOf = (cp) => {
      if (cp - 0x30 < 10) return cp - 0x16;
      if (cp - 0x41 < 26) return cp - 0x41;
      if (cp - 0x61 < 26) return cp - 0x61;
      return base;
    };
    const adapt = (delta, numPoints, first) => {
      let k = 0;
      delta = first ? Math.floor(delta / damp) : delta >> 1;
      delta += Math.floor(delta / numPoints);
      for (; delta > (((base - tMin) * tMax) >> 1); k += base) delta = Math.floor(delta / (base - tMin));
      return Math.floor(k + ((base - tMin + 1) * delta) / (delta + skew));
    };
    const out = [];
    let n = 128, i = 0, bias = 72;
    let basic = input.lastIndexOf('-');
    if (basic < 0) basic = 0;
    for (let j = 0; j < basic; j++) {
      if (input.charCodeAt(j) >= 0x80) throw new Error('bad punycode');
      out.push(input.charCodeAt(j));
    }
    for (let idx = basic > 0 ? basic + 1 : 0; idx < input.length;) {
      const oldi = i;
      for (let w = 1, k = base; ; k += base) {
        if (idx >= input.length) throw new Error('bad punycode');
        const digit = digitOf(input.charCodeAt(idx++));
        if (digit >= base) throw new Error('bad punycode');
        i += digit * w;
        const t = k <= bias ? tMin : k >= bias + tMax ? tMax : k - bias;
        if (digit < t) break;
        w *= base - t;
      }
      const len = out.length + 1;
      bias = adapt(i - oldi, len, oldi === 0);
      n += Math.floor(i / len);
      i %= len;
      out.splice(i++, 0, n);
    }
    return String.fromCodePoint(...out);
  }

  function hostToUnicode(host) {
    return host.split('.').map((l) => (l.startsWith('xn--') ? punyDecode(l.slice(4)) : l)).join('.');
  }

  /* --------------------------- URL analysis -------------------------- */
  function parseInput(raw) {
    let s = String(raw == null ? '' : raw).replace(/[​-‍⁠﻿]/g, '').trim();
    if (!s) return { error: 'empty' };
    if (/\s/.test(s)) {
      // Pasted a whole message: pull the first link out of it.
      const m = s.match(/https?:\/\/[^\s<>"'`]+/i) ||
        s.match(/\b(?:[a-z0-9-]+\.)+[a-z]{2,}(?:[/:?#][^\s<>"'`]*)?/i);
      if (!m) return { error: 'invalid' };
      s = m[0];
    }
    s = s.replace(/[)}>,.;:!?'"。，！？）」』]+$/u, '');
    const sm = s.match(/^([a-z][a-z0-9+.\-]*):/i);
    if (sm) {
      const sch = sm[1].toLowerCase();
      if (SPECIAL_SCHEMES.has(sch)) return { special: sch, text: s };
      if (NON_WEB.has(sch)) return { error: 'notweb' };
      if (/^[a-z][a-z0-9+.\-]*:\/\//i.test(s)) return { text: s };
    }
    return { text: 'https://' + s.replace(/^\/\//, ''), schemeless: true };
  }

  function detectBrand(host) {
    const tokens = host.split(/[.\-_]/).filter(Boolean);
    for (const b of BRANDS) {
      for (const key of b.k) {
        for (const tk of tokens) {
          if (tk === key || (key.length >= 6 && tk.includes(key))) return { type: 'brand', brand: b.n, token: tk };
        }
      }
    }
    for (const b of BRANDS) {
      for (const key of b.k) {
        for (const tk of tokens) {
          if (tk.length < 4) continue;
          const nt = deLeet(tk);
          if (nt === key && tk !== key) return { type: 'typo', brand: b.n, name: tk, key };
          if (key.length >= 6 && Math.abs(nt.length - key.length) <= 2) {
            const d = levenshtein(nt, key);
            if (d > 0 && d <= (key.length >= 8 ? 2 : 1)) return { type: 'typo', brand: b.n, name: tk, key };
          }
        }
      }
    }
    return null;
  }

  function levelOf(score) {
    return score >= 70 ? 'high' : score >= 40 ? 'warn' : score >= 20 ? 'caution' : 'low';
  }

  function finish(base, findings) {
    findings.sort((a, b) => b.pts - a.pts);
    const score = Math.min(100, findings.reduce((s, f) => s + f.pts, 0));
    return Object.assign({ ok: true }, base, { findings, score, level: levelOf(score) });
  }

  function analyzeUrl(raw) {
    const p = parseInput(raw);
    if (p.error) return { ok: false, reason: p.error };
    const findings = [];
    const add = (id, sev, pts, extra) => findings.push({ id, sev, pts, p: extra || {} });

    if (p.special) {
      add('scheme_danger', 'high', 90, { scheme: p.special });
      return finish({ input: String(raw), url: p.text, host: '', domain: '', sub: '', scheme: p.special, trustedDomain: null }, findings);
    }

    let u;
    try { u = new URL(p.text); } catch (e) { return { ok: false, reason: 'invalid' }; }
    const scheme = u.protocol.replace(':', '');
    const host = u.hostname.toLowerCase().replace(/\.$/, '');
    const isV4 = /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
    const isIP = isV4 || host.startsWith('[');
    if (!host || (!isIP && !host.includes('.'))) return { ok: false, reason: 'invalid' };

    const domain = isIP ? host : registrable(host);
    const sub = isIP || host === domain ? '' : host.slice(0, host.length - domain.length - 1);

    let trustedDomain = null;
    if (!isIP) {
      outer: for (const b of BRANDS) for (const d of b.d) if (hostIs(host, d)) { trustedDomain = d; break outer; }
    }
    const trusted = !!trustedDomain;

    if (scheme !== 'http' && scheme !== 'https') add('scheme_odd', 'med', 25, { scheme });
    if (isIP) add('ip', 'high', 30);
    if (u.username || u.password) add('userinfo', 'high', 40, { host });
    if (scheme === 'http') add('nohttps', 'low', 8);
    if (u.port) add('port', 'low', 10, { port: u.port });

    const labels = host.split('.');
    const tld = labels[labels.length - 1];

    if (!isIP) {
      if (SHORTENERS.has(host.replace(/^www\./, ''))) add('shortener', 'med', 20, { host });
      if (tld === 'zip' || tld === 'mov') add('tld_zip', 'med', 18, { tld });
      else if (RISKY_TLDS.has(tld)) add('tld', 'low', 10, { tld });

      if (labels.some((l) => l.startsWith('xn--'))) {
        let uni = host;
        try { uni = hostToUnicode(host); } catch (e) { /* keep punycode */ }
        const hasLatin = /[a-z]/i.test(uni.replace(/xn--/g, ''));
        const confusable = /[Ѐ-ӿͰ-Ͽ԰-֏]/.test(uni);
        const cjk = /[぀-ヿ㐀-鿿가-힯]/.test(uni);
        if (confusable) add('homograph', 'high', 55, { unicode: uni });
        else if (cjk && hasLatin) add('idn_mixed', 'low', 10, { unicode: uni });
        else if (cjk) add('idn_cjk', 'info', 3, { unicode: uni });
        else add('idn', 'med', 20, { unicode: uni });
      }

      if (!trusted) {
        if (labels.length - domain.split('.').length >= 3) add('subdomains', 'med', 10, { domain });
        if ((host.match(/-/g) || []).length >= 3) add('hyphens', 'low', 8);
        if (host.length > 45) add('longhost', 'low', 5);

        const hit = detectBrand(host);
        if (hit && hit.type === 'brand') add('brand', 'high', 55, { brand: hit.brand, token: hit.token, domain });
        else if (hit && hit.type === 'typo') add('typo', 'high', 45, { brand: hit.brand, name: hit.name, key: hit.key, domain });

        let pathLower = '';
        try { pathLower = decodeURIComponent(u.pathname).toLowerCase(); } catch (e) { pathLower = u.pathname.toLowerCase(); }
        const words = new Set();
        (host + ' ' + pathLower).split(/[^a-z0-9]+/).forEach((w) => { if (KEYWORDS.has(w)) words.add(w); });
        if (words.size >= 2) add('keywords', 'low', 12, { words: [...words] });
      }
    }

    for (const [k, v] of u.searchParams) {
      if (/^(https?:)?\/\//i.test(v) || (REDIRECT_KEYS.has(k.toLowerCase()) && /^[a-z0-9.-]+\.[a-z]{2,}/i.test(v))) {
        add('redirect', 'med', 10);
        break;
      }
    }

    const ext = (u.pathname.toLowerCase().match(/\.([a-z0-9]{2,12})$/) || [])[1];
    if (ext && RISKY_EXT.has(ext)) add('risky_file', 'high', 30, { ext });

    if (u.href.length > 180) add('longurl', 'low', 5);

    return finish({ input: String(raw), url: u.href, host, domain, sub, scheme, trustedDomain, schemeless: !!p.schemeless }, findings);
  }

  function defang(url) {
    try {
      const u = new URL(url);
      return url.replace(/^http/i, 'hxxp').replace(u.hostname, u.hostname.replace(/\./g, '[.]'));
    } catch (e) {
      return url.replace(/^http/i, 'hxxp');
    }
  }

  /* ------------------------------ passwords ------------------------------ */
  function getCrypto() {
    if (typeof crypto !== 'undefined' && crypto.subtle) return crypto;
    if (typeof require === 'function') return require('node:crypto').webcrypto;
    throw new Error('Web Crypto unavailable (needs HTTPS)');
  }

  async function sha1Hex(str) {
    const buf = new TextEncoder().encode(str);
    const h = await getCrypto().subtle.digest('SHA-1', buf);
    return Array.from(new Uint8Array(h)).map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  }

  function parseRange(text, suffix) {
    for (const line of String(text).split(/\r?\n/)) {
      const i = line.indexOf(':');
      if (i < 0) continue;
      if (line.slice(0, i).trim().toUpperCase() === suffix) return parseInt(line.slice(i + 1), 10) || 0;
    }
    return 0;
  }

  // k-anonymity: only the first 5 hex chars of the SHA-1 leave the device.
  async function pwnedCount(pw, fetchImpl) {
    const f = fetchImpl || fetch;
    const hash = await sha1Hex(pw);
    const res = await f('https://api.pwnedpasswords.com/range/' + hash.slice(0, 5), { headers: { 'Add-Padding': 'true' } });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return parseRange(await res.text(), hash.slice(5));
  }

  const COMMON = ['password', 'passw0rd', 'qwerty', 'letmein', 'admin', 'welcome', 'iloveyou', 'monkey', 'dragon', 'football', 'abc123', '123456', '111111', '000000', 'login', 'master', 'sunshine', 'princess', 'azerty', 'hello'];
  const ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm', '1234567890', 'abcdefghijklmnopqrstuvwxyz'];

  function hasSequence(s, n) {
    const l = s.toLowerCase();
    for (const row of ROWS) {
      const rev = row.split('').reverse().join('');
      for (let i = 0; i + n <= l.length; i++) {
        const part = l.slice(i, i + n);
        if (row.includes(part) || rev.includes(part)) return true;
      }
    }
    return false;
  }

  function estimateStrength(pw) {
    const chars = Array.from(pw || '');
    const len = chars.length;
    if (!len) return { bits: 0, level: 0, flags: [] };
    let pool = 0;
    if (/[a-z]/.test(pw)) pool += 26;
    if (/[A-Z]/.test(pw)) pool += 26;
    if (/\d/.test(pw)) pool += 10;
    if (/[ -/:-@[-`{-~]/.test(pw)) pool += 33;
    if (/[^\x00-\x7f]/.test(pw)) pool += 64;
    let bits = len * Math.log2(pool || 1);
    const flags = [];
    const lower = pw.toLowerCase();
    if (COMMON.some((w) => lower.includes(w))) { bits = Math.min(bits, 20); flags.push('common'); }
    if (len >= 6 && new Set(chars).size / len < 0.5) { bits *= 0.6; flags.push('repeat'); }
    if (hasSequence(pw, 4)) { bits *= 0.75; flags.push('sequence'); }
    if (/^\d+$/.test(pw)) flags.push('digits');
    if (len < 8) flags.push('short');
    const level = bits < 28 ? 0 : bits < 40 ? 1 : bits < 60 ? 2 : bits < 80 ? 3 : 4;
    return { bits: Math.round(bits), level, flags };
  }

  function randInt(max) {
    const c = getCrypto();
    const lim = Math.floor(0x100000000 / max) * max;
    const a = new Uint32Array(1);
    do { c.getRandomValues(a); } while (a[0] >= lim);
    return a[0] % max;
  }

  function generatePassword(length, o) {
    const opt = Object.assign({ upper: true, lower: true, digits: true, symbols: true, noAmbiguous: true }, o || {});
    const strip = (s) => (opt.noAmbiguous ? s.replace(/[O0oIl1|]/g, '') : s);
    const sets = [];
    if (opt.lower) sets.push(strip('abcdefghijklmnopqrstuvwxyz'));
    if (opt.upper) sets.push(strip('ABCDEFGHIJKLMNOPQRSTUVWXYZ'));
    if (opt.digits) sets.push(strip('0123456789'));
    if (opt.symbols) sets.push('!@#$%^&*()-_=+[]{};:,.?');
    if (!sets.length) sets.push(strip('abcdefghijklmnopqrstuvwxyz'));
    const len = Math.max(length, sets.length);
    const all = sets.join('');
    const out = sets.map((s) => s[randInt(s.length)]);
    while (out.length < len) out.push(all[randInt(all.length)]);
    for (let i = out.length - 1; i > 0; i--) {
      const j = randInt(i + 1);
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out.join('');
  }

  /* ----------------------- Google Safe Browsing (opt-in) ----------------------- */
  async function safeBrowsingLookup(url, key, fetchImpl) {
    const f = fetchImpl || fetch;
    const body = {
      client: { clientId: 'shieldlite', clientVersion: '1.0.0' },
      threatInfo: {
        threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE', 'POTENTIALLY_HARMFUL_APPLICATION'],
        platformTypes: ['ANY_PLATFORM'],
        threatEntryTypes: ['URL'],
        threatEntries: [{ url }]
      }
    };
    const res = await f('https://safebrowsing.googleapis.com/v4/threatMatches:find?key=' + encodeURIComponent(key), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const j = await res.json();
    return (j.matches || []).map((m) => m.threatType);
  }

  return {
    analyzeUrl, defang, registrable, levenshtein, punyDecode, hostToUnicode,
    sha1Hex, parseRange, pwnedCount, estimateStrength, generatePassword, safeBrowsingLookup, BRANDS
  };
});
