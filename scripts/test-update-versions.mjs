// Run: node scripts/test-update-versions.mjs
import assert from 'node:assert/strict';
import { parseChrome, parseSofa, parseKev } from './update-versions.mjs';

// Shape copied from the VersionHistory API (releases currently being served).
const chrome = parseChrome({
  releases: [
    { version: '157.0.8103.79', fraction: 0.495 },
    { version: '157.0.8103.80', fraction: 0.2475 },
    { version: '158.0.8127.36', fraction: 0.2475 },
    { version: '157.0.8103.81', fraction: 0.005 },
    { version: '159.0.8154.13', fraction: 0.005 },
    { version: '158.0.8127.37', fraction: 1 },
    { version: '158.0.8127.37', fraction: 0 },
    { version: '156.0.8078.82', fraction: 0 }
  ]
});
assert.deepEqual(chrome, { latest: '158.0.8127.37', min: '157.0.8103.79' });
assert.equal(parseChrome({ releases: [] }), null);
assert.deepEqual(parseChrome({ releases: [{ version: '150.0.1.2', fraction: 0.5 }, { version: '150.0.1.3', fraction: 0.4 }] }),
  { latest: '150.0.1.2', min: '150.0.1.2' });

const ios = parseSofa({
  OSVersions: [
    { OSVersion: '26', Latest: { ProductVersion: '26.7.3', ReleaseDate: '2026-11-09T00:00:00Z', ActivelyExploitedCVEs: [] } },
    { OSVersion: '27', Latest: { ProductVersion: '27.2.1', ReleaseDate: '2026-11-09T00:00:00Z', ActivelyExploitedCVEs: ['CVE-1'] } }
  ]
});
assert.equal(ios.branches[0].latest, '27.2.1');
assert.equal(ios.branches[0].exploited, 1);
assert.equal(ios.branches[1].major, 26);

const kev = parseKev({
  vulnerabilities: [
    { cveID: 'CVE-A', vendorProject: 'Google', product: 'Chromium', dateAdded: '2026-11-10', vulnerabilityName: 'x' },
    { cveID: 'CVE-B', vendorProject: 'Google', product: 'Chromium V8', dateAdded: '2026-06-01', vulnerabilityName: 'y' },
    { cveID: 'CVE-C', vendorProject: 'Google', product: 'Android', dateAdded: '2026-11-11', vulnerabilityName: 'z' },
    { cveID: 'CVE-D', vendorProject: 'Apple', product: 'Multiple Products', dateAdded: '2026-10-01', vulnerabilityName: 'w' },
    { cveID: 'CVE-E', vendorProject: 'Microsoft', product: 'Windows', dateAdded: '2026-11-12', vulnerabilityName: 'v' }
  ]
});
assert.deepEqual(kev.chromium.map((v) => v.cve), ['CVE-A', 'CVE-B']);
assert.deepEqual(kev.apple.map((v) => v.cve), ['CVE-D']);

console.log('update-versions parsers ok');
