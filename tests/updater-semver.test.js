const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('Running Updater Semver & Version Formatting Tests...');

const updateJsPath = path.join(__dirname, '..', 'update', 'update.js');
const serviceWorkerJsPath = path.join(__dirname, '..', 'background', 'service-worker.js');
const contentIsolatedJsPath = path.join(__dirname, '..', 'content', 'content-isolated.js');

assert(fs.existsSync(updateJsPath), 'update.js must exist');
assert(fs.existsSync(serviceWorkerJsPath), 'service-worker.js must exist');
assert(fs.existsSync(contentIsolatedJsPath), 'content-isolated.js must exist');

const updateJs = fs.readFileSync(updateJsPath, 'utf8');
const serviceWorkerJs = fs.readFileSync(serviceWorkerJsPath, 'utf8');
const contentIsolatedJs = fs.readFileSync(contentIsolatedJsPath, 'utf8');

// 1. Verify compareSemver is defined in all updater/versioning contexts
assert(updateJs.includes('function compareSemver('), 'update.js must define compareSemver');
assert(serviceWorkerJs.includes('function compareSemver('), 'service-worker.js must define compareSemver');
assert(contentIsolatedJs.includes('function compareSemver('), 'content-isolated.js must define compareSemver');
assert(updateJs.includes('const compareVersions = compareSemver;'), 'update.js must alias compareVersions to compareSemver');
console.log('✓ compareSemver function definitions and aliases verified across all files');

// 2. Verify cleanVersion strips single or multiple leading 'v's
assert(updateJs.includes('.replace(/^v+/i, \'\')'), 'cleanVersion must strip multiple leading v characters');
console.log('✓ cleanVersion multi-v stripping verified');

// 3. Verify formatV prevents duplicate 'v' prefixes
assert(updateJs.includes('function formatV('), 'update.js must define formatV helper');
console.log('✓ formatV helper verified');

// 4. Test compareSemver logic in isolated VM
const sandbox = {
  console,
  Math,
  parseInt
};

vm.createContext(sandbox);

// Extract cleanVersion, formatV, and compareSemver from update.js
const extract = (pattern) => {
  const m = updateJs.match(pattern);
  assert(m, `Failed to extract pattern: ${pattern}`);
  return m[0];
};

const cleanVersionCode = extract(/function cleanVersion\([\s\S]*?\n  \}/);
const formatVCode = extract(/function formatV\([\s\S]*?\n  \}/);
const compareSemverCode = extract(/function compareSemver\([\s\S]*?\n  \}/);

vm.runInContext(`${cleanVersionCode}\n${formatVCode}\n${compareSemverCode}`, sandbox);

const { cleanVersion, formatV, compareSemver } = sandbox;

// Test cleanVersion
assert.strictEqual(cleanVersion('1.1.76'), '1.1.76');
assert.strictEqual(cleanVersion('v1.1.76'), '1.1.76');
assert.strictEqual(cleanVersion('vv1.1.76'), '1.1.76');
assert.strictEqual(cleanVersion('vv1.1.76-dev.dev-lat'), '1.1.76-dev.dev-lat');

// Test formatV
assert.strictEqual(formatV('1.1.76'), 'v1.1.76');
assert.strictEqual(formatV('v1.1.76'), 'v1.1.76');
assert.strictEqual(formatV('vv1.1.76'), 'vv1.1.76'); // formatV on raw vv will keep, but cleanVersion handles it:
assert.strictEqual(formatV(cleanVersion('vv1.1.76-dev.dev-lat')), 'v1.1.76-dev.dev-lat');

// Test compareSemver
assert.strictEqual(compareSemver('1.1.76', '1.1.77'), -1);
assert.strictEqual(compareSemver('1.1.77', '1.1.76'), 1);
assert.strictEqual(compareSemver('1.1.77', '1.1.77'), 0);
assert.strictEqual(compareSemver('v1.1.76', 'v1.1.77'), -1);
assert.strictEqual(compareSemver('vv1.1.76-dev.dev-lat', 'v1.1.77 Alpha'), -1);
assert.strictEqual(compareSemver('v1.1.77 Alpha', 'vv1.1.76-dev.dev-lat'), 1);
assert.strictEqual(compareSemver('1.2.0', '1.1.99'), 1);

console.log('✓ VM execution tests for compareSemver, cleanVersion, and formatV passed');

// 5. Verify usingRawFallback branch in update.js
assert(updateJs.includes('compareSemver(cleanInstalled, cleanDev) >= 0'), 'update.js must call compareSemver in usingRawFallback');
console.log('✓ usingRawFallback check verified');

console.log('All Updater Semver & Version Formatting Tests Passed Successfully!');
