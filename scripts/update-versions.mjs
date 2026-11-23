// Builds versions.json for ShieldLite's version check. Run by .github/workflows/versions.yml once a day.
// Sources (all public, no keys):
//   Chrome  – Google's VersionHistory API (what is being rolled out to Stable right now)
//   iOS     – SOFA feed by Mac Admins (latest iOS per major version)
//   Exploited CVEs – CISA Known Exploited Vulnerabilities catalogue
// Usage: node scripts/update-versions.mjs [output path]
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const CHROME_PLATFORMS = ['win', 'mac', 'linux', 'android', 'ios'];
const CHROME_URL = (p) => `https://versionhistory.googleapis.com/v1/chrome/platforms/${p}/channels/stable/versions/all/releases?filter=endtime=none`;
const SOFA_URL = 'https://sofafeed.macadmins.io/v1/ios_data_feed.json';
const KEV_URL = 'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json';

export function cmpVer(a, b) {
  const pa = String(a).split('.').map((x) => parseInt(x, 10) || 0);
  const pb = String(b).split('.').map((x) => parseInt(x, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d < 0 ? -1 : 1;
  }
  return 0;
}

// latest = newest build fully rolled out (fraction 1), else the newest with the biggest share.
// min    = oldest build still served to a meaningful share (>= 1%). Small experiments are ignored.
export function parseChrome(json) {
  const rel = (json.releases || []).filter((r) => r.version && typeof r.fraction === 'number' && r.fraction >= 0.01);
  if (!rel.length) return null;
  const full = rel.filter((r) => r.fraction >= 0.999);
  const pool = full.length ? full : [rel.reduce((a, b) => (b.fraction > a.fraction ? b : a))];
  const latest = pool.map((r) => r.version).sort(cmpVer).pop();
  const min = rel.map((r) => r.version).sort(cmpVer)[0];
  return { latest, min };
}

export function parseSofa(json) {
  const branches = (json.OSVersions || [])
    .filter((o) => o.Latest && o.Latest.ProductVersion)
    .map((o) => ({
      major: parseInt(o.OSVersion, 10) || parseInt(o.Latest.ProductVersion, 10),
      latest: o.Latest.ProductVersion,
      date: (o.Latest.ReleaseDate || '').slice(0, 10),
      exploited: (o.Latest.ActivelyExploitedCVEs || []).length
    }))
    .sort((a, b) => b.major - a.major);
  return branches.length ? { branches } : null;
}

export function parseKev(json, n = 3) {
  const vulns = json.vulnerabilities || [];
  const pick = (fn) => vulns.filter(fn)
    .sort((a, b) => (b.dateAdded || '').localeCompare(a.dateAdded || ''))
    .slice(0, n)
    .map((v) => ({ cve: v.cveID, date: v.dateAdded, name: v.vulnerabilityName }));
  return {
    chromium: pick((v) => v.vendorProject === 'Google' && /chrom/i.test(v.product || '')),
    android: pick((v) => /^android$/i.test(v.product || '') && /google|android/i.test(v.vendorProject || '')),
    apple: pick((v) => v.vendorProject === 'Apple' && /(ios|webkit|ipados|multiple products)/i.test(v.product || ''))
  };
}

async function getJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'ShieldLite version updater' } });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.json();
}

async function main() {
  const out = process.argv[2] || fileURLToPath(new URL('../versions.json', import.meta.url));
  let prev = {};
  try { prev = JSON.parse(await readFile(out, 'utf8')); } catch { /* first run */ }

  // Each source is optional: if one fails, keep yesterday's value rather than blanking it.
  const chrome = { ...(prev.chrome || {}) };
  for (const p of CHROME_PLATFORMS) {
    try {
      const v = parseChrome(await getJson(CHROME_URL(p)));
      if (v) chrome[p] = v;
    } catch (e) { console.warn('chrome', p, e.message); }
  }
  let ios = prev.ios || null;
  try { ios = parseSofa(await getJson(SOFA_URL)) || ios; } catch (e) { console.warn('ios', e.message); }
  let kev = prev.kev || { chromium: [], android: [], apple: [] };
  try { kev = parseKev(await getJson(KEV_URL)); } catch (e) { console.warn('kev', e.message); }

  const data = { chrome, ios, kev };
  const same = JSON.stringify({ chrome: prev.chrome, ios: prev.ios, kev: prev.kev }) === JSON.stringify(data);
  // Refresh the timestamp daily even when nothing changed, so the app can show the data is fresh.
  const today = new Date().toISOString().slice(0, 10);
  if (same && (prev.updated || '').slice(0, 10) === today) { console.log('no change'); return; }
  await writeFile(out, JSON.stringify({ updated: new Date().toISOString(), ...data }, null, 2) + '\n');
  console.log('wrote', out);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
