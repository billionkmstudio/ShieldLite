// Run: node core.test.js
const assert = require('node:assert/strict');
const C = require('./core.js');

let n = 0;
const ok = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };
const A = (u) => C.analyzeUrl(u);
const ids = (r) => r.findings.map((f) => f.id);

(async () => {
  ok('official apple domain is low risk and recognised', () => {
    const r = A('https://support.apple.com/hk');
    assert.equal(r.level, 'low'); assert.equal(r.trustedDomain, 'apple.com');
  });
  ok('brand in subdomain trick is high risk', () => {
    const r = A('http://paypal.com.secure-login.xyz/verify');
    assert.equal(r.level, 'high'); assert.ok(ids(r).includes('brand'));
  });
  ok('leet typosquat paypa1 is flagged', () => {
    const r = A('https://paypa1.com/login');
    assert.ok(ids(r).includes('typo')); assert.equal(r.level, 'warn');
  });
  ok('arnazon (rn -> m) is flagged', () => assert.ok(ids(A('https://arnazon.com')).includes('typo')));
  ok('ip host', () => assert.ok(ids(A('http://192.168.1.5/login')).includes('ip')));
  ok('shortener', () => assert.ok(ids(A('https://bit.ly/abc123')).includes('shortener')));
  ok('punycode decode', () => {
    assert.equal(C.punyDecode('bcher-kva'), 'bücher');
    assert.equal(C.hostToUnicode('xn--80ak6aa92e.com'), 'аррӏе.com');
  });
  ok('cyrillic homograph', () => {
    const r = A('https://xn--80ak6aa92e.com');
    assert.ok(ids(r).includes('homograph')); assert.equal(r.level, 'warn');
  });
  ok('userinfo @ trick shows the real host', () => {
    const r = A('https://google.com@evil.example/path');
    assert.equal(r.host, 'evil.example'); assert.ok(ids(r).includes('userinfo'));
  });
  ok('itms-services is high', () => {
    const r = A('itms-services://?action=download-manifest&url=https://x.example/m.plist');
    assert.equal(r.level, 'high'); assert.ok(ids(r).includes('scheme_danger'));
  });
  ok('javascript: is high', () => assert.equal(A('javascript:alert(1)').level, 'high'));
  ok('mobileconfig download', () => {
    const r = A('https://example.com/profile.mobileconfig');
    assert.ok(ids(r).includes('risky_file')); assert.equal(r.level, 'caution');
  });
  ok('extracts link from pasted SMS text', () => {
    const r = A('Evri: your parcel is held. Pay at https://evri-redelivery.top/pay now.');
    assert.equal(r.host, 'evri-redelivery.top'); assert.ok(ids(r).includes('brand')); assert.equal(r.level, 'warn');
  });
  ok('schemeless input works', () => assert.equal(A('example.com/a').host, 'example.com'));
  ok('hmrc.gov.uk trusted, hmrc-refund.com not', () => {
    assert.equal(A('https://www.gov.uk/government/organisations/hm-revenue-customs').level, 'low');
    assert.ok(ids(A('https://hmrc-refund.com')).includes('brand'));
  });
  ok('redirect parameter', () => assert.ok(ids(A('https://example.com/r?url=https://evil.example')).includes('redirect')));
  ok('plain site has no findings', () => assert.equal(A('https://www.bbc.co.uk/news').findings.length, 0));
  ok('expanded UK/HK brands: impersonation is flagged', () => {
    for (const u of [
      'https://tsb-secure-login.top', 'https://immd-refund.xyz/pay', 'https://sfexpress-redelivery.top/track',
      'https://hkbea.com.account-verify.click', 'https://tesco-gift-claim.icu', 'https://vinted-payment.xyz/ship',
      'https://tfl-congestion-fine.top', 'https://zabank-login.cyou', 'https://hktvmall-order.xyz'
    ]) assert.ok(ids(A(u)).includes('brand'), u);
  });
  ok('expanded brands: look-alike spellings are flagged', () => {
    assert.ok(ids(A('https://vodaf0ne.co.uk')).includes('typo'));
    assert.ok(ids(A('https://santandar.co.uk')).includes('typo'));
    assert.ok(ids(A('https://santanderr.co.uk')).includes('brand')); // contains the brand name: flagged as impersonation
    assert.ok(ids(A('https://citibanc.com')).includes('typo'));
  });
  ok('expanded brands: official domains stay clean', () => {
    for (const u of [
      'https://www.hkbea.com/', 'https://sf-express.com/track', 'https://www.tesco.com/groceries', 'https://tfl.gov.uk/status',
      'https://www.ird.gov.hk/eng/welcome.htm', 'https://www.dbs.com.hk', 'https://www.vodafone.co.uk', 'https://octopus.energy/login'
    ]) { const r = A(u); assert.equal(r.level, 'low', u); assert.ok(r.trustedDomain, u); }
  });
  ok('expanded brands: unrelated sites are not falsely flagged', () => {
    for (const u of [
      'https://www.skyscanner.net', 'https://www.wiseguy.com', 'https://www.kraken-coffee.example', 'https://bird.example/ird-guide',
      'https://www.tesla.com', 'https://www.argosy.example', 'https://clipboard.example', 'https://dbsolutions.example'
    ]) {
      const r = A(u);
      assert.ok(!ids(r).includes('brand') && !ids(r).includes('typo'), u + ' -> ' + ids(r).join(','));
    }
  });
  ok('invalid / empty / notweb', () => {
    assert.equal(A('').reason, 'empty'); assert.equal(A('hello').reason, 'invalid'); assert.equal(A('tel:999').reason, 'notweb');
  });
  ok('defang', () => assert.equal(C.defang('https://evil.example/x'), 'hxxps://evil[.]example/x'));
  ok('registrable', () => {
    assert.equal(C.registrable('a.b.bbc.co.uk'), 'bbc.co.uk');
    assert.equal(C.registrable('www.hsbc.com.hk'), 'hsbc.com.hk');
  });

  await (async () => {
    assert.equal(await C.sha1Hex('password'), '5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8');
    n++; console.log('  ok  sha1 known vector');
  })();
  ok('parseRange', () => {
    assert.equal(C.parseRange('AAA:3\r\n1E4C9B93F3F0682250B6CF8331B7EE68FD8:99\r\nBBB:0', '1E4C9B93F3F0682250B6CF8331B7EE68FD8'), 99);
    assert.equal(C.parseRange('AAA:3', 'ZZZ'), 0);
  });
  await (async () => {
    let calledUrl = '';
    const mock = async (url) => { calledUrl = url; return { ok: true, text: async () => '1E4C9B93F3F0682250B6CF8331B7EE68FD8:12345\n0000000000000000000000000000000000A:0' }; };
    assert.equal(await C.pwnedCount('password', mock), 12345);
    assert.equal(calledUrl, 'https://api.pwnedpasswords.com/range/5BAA6');
    assert.ok(!calledUrl.split('/range/')[1].toLowerCase().includes('password'));
    assert.equal(calledUrl.split('/range/')[1].length, 5);
    n++; console.log('  ok  pwnedCount sends only 5-char prefix');
  })();
  await (async () => {
    const mock = async () => ({ ok: true, json: async () => ({ matches: [{ threatType: 'SOCIAL_ENGINEERING' }] }) });
    assert.deepEqual(await C.safeBrowsingLookup('http://x.example', 'KEY', mock), ['SOCIAL_ENGINEERING']);
    const empty = async () => ({ ok: true, json: async () => ({}) });
    assert.deepEqual(await C.safeBrowsingLookup('http://x.example', 'KEY', empty), []);
    n++; console.log('  ok  safe browsing parse');
  })();
  ok('strength levels', () => {
    assert.equal(C.estimateStrength('password123').level, 0);
    assert.ok(C.estimateStrength('qwerty').flags.includes('common'));
    assert.ok(C.estimateStrength('Tr0ub4dor&3xK9!vQm2#').level >= 3);
    assert.ok(C.estimateStrength('aaaaaaaaaa').flags.includes('repeat'));
  });
  ok('generator respects length and sets', () => {
    for (let i = 0; i < 50; i++) {
      const p = C.generatePassword(20, { symbols: false });
      assert.equal(p.length, 20);
      assert.ok(/[a-z]/.test(p) && /[A-Z]/.test(p) && /\d/.test(p));
      assert.ok(!/[^A-Za-z0-9]/.test(p));
      assert.ok(!/[O0oIl1|]/.test(p));
    }
    assert.notEqual(C.generatePassword(24), C.generatePassword(24));
  });

  // ---- version check ----
  const DATA = {
    chrome: { win: { latest: '158.0.8127.37', min: '157.0.8103.51' }, mac: '157.0.8103.51', linux: '157.0.8103.50', android: { latest: '157.0.8103.60', min: '157.0.8103.50' }, ios: '157.0.8103.40' },
    ios: { branches: [{ latest: '26.1' }, { latest: '18.7.2' }] },
    kev: { chromium: [{ cve: 'CVE-2026-125350' }], apple: [{ cve: 'CVE-2026-1' }] }
  };
  const UA = {
    winChrome: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36',
    androidChrome: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Mobile Safari/537.36',
    iosSafari26: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.1 Mobile/15E148 Safari/604.1',
    iosSafari17: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
    iosSafari18: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.7 Mobile/15E148 Safari/604.1',
    iosChrome: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/155.0.7000.1 Mobile/15E148 Safari/604.1',
    winEdge: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36 Edg/157.0.0.0',
    macSafari: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.1 Safari/605.1.15'
  };
  const hints = (v) => ({ fullVersionList: [{ brand: 'Chromium', version: v }, { brand: 'Google Chrome', version: v }, { brand: 'Not?A_Brand', version: '99.0.0.0' }] });
  const check = (ua, h) => C.assessClient(C.detectClient(ua, h), DATA);

  ok('cmpVer', () => {
    assert.equal(C.cmpVer('157.0.8103.50', '157.0.8103.51'), -1);
    assert.equal(C.cmpVer('26.1', '26.1.0'), 0);
    assert.equal(C.cmpVer('18.10', '18.9'), 1);
  });
  ok('desktop chrome with client hints: patched / unpatched', () => {
    assert.equal(check(UA.winChrome, hints('157.0.8103.51'))[0].status, 'ok');
    assert.equal(check(UA.winChrome, hints('157.0.8103.20'))[0].status, 'patch');
    assert.equal(check(UA.winChrome, hints('156.0.7000.1'))[0].status, 'behind');
    const r = check(UA.winChrome, hints('158.0.8127.37'))[0];
    assert.equal(r.status, 'ok'); assert.equal(r.latest, '158.0.8127.37');
  });
  ok('desktop chrome without hints only knows major', () => {
    const r = check(UA.winChrome)[0];
    assert.equal(r.status, 'check'); assert.equal(r.full, false);
  });
  ok('old android chrome is behind even without hints', () => {
    const r = check(UA.androidChrome)[0];
    assert.equal(r.status, 'behind'); assert.equal(r.behindMajor, 2); assert.equal(r.platform, 'android');
  });
  ok('iOS 26 Safari reads version from Safari, not the frozen 18_6 token', () => {
    const c = C.detectClient(UA.iosSafari26);
    assert.equal(c.os, 'ios'); assert.equal(c.osVersion, '26.1');
    assert.equal(C.assessClient(c, DATA)[0].status, 'ok');
  });
  ok('iOS 17 is behind; iOS 18.7 on the 18 branch is oldbranch', () => {
    assert.equal(check(UA.iosSafari17)[0].status, 'behind');
    const r = check(UA.iosSafari18)[0];
    assert.equal(r.status, 'oldbranch'); assert.equal(r.branchLatest, '18.7.2');
  });
  ok('Chrome on iPhone: iOS unknown, app version compared', () => {
    const r = check(UA.iosChrome);
    assert.equal(r[0].id, 'ios'); assert.equal(r[0].status, 'check');
    assert.equal(r[1].id, 'chrome_ios'); assert.equal(r[1].status, 'behind');
  });
  ok('iPad desktop UA detected as iOS via touch points', () => {
    assert.equal(C.detectClient(UA.macSafari, { touchPoints: 5 }).os, 'ios');
    assert.equal(C.detectClient(UA.macSafari).os, 'mac');
  });
  ok('Edge and Mac Safari are unsupported, not misread as Chrome', () => {
    assert.equal(check(UA.winEdge)[0].status, 'unsupported');
    assert.equal(check(UA.winEdge)[0].browser, 'edge');
    assert.equal(check(UA.macSafari)[0].browser, 'safari');
  });
  ok('missing data gives nodata', () => {
    assert.equal(C.assessClient(C.detectClient(UA.winChrome, hints('157.0.8103.51')), {})[0].status, 'nodata');
  });

  console.log(`\n${n} checks passed`);
})().catch((e) => { console.error(e); process.exit(1); });
