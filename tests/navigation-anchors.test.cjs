'use strict';
// Run: node --test tests/navigation-anchors.test.cjs
// Checks site-local anchors without loading live pages or using network.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');
const home = read('components/mobile-journey-home.tsx');
const menu = read('components/mobile-menu.tsx');
const homepageIds = new Set([...home.matchAll(/\bid\s*=\s*["']([^"']+)["']/g)].map(m => m[1]));
const pages = [
  'app/approach/page.tsx',
  'app/about/page.tsx',
  'app/reviews/page.tsx',
  'components/site-shell.tsx',
  'components/mobile-menu.tsx',
];

test('every static home-page hash link targets a real homepage ID', () => {
  let checked = 0;
  for (const file of pages) {
    for (const [, fragment] of read(file).matchAll(/\bhref\s*=\s*["']\/#([^"']+)["']/g)) {
      checked++;
      assert.ok(homepageIds.has(fragment), file + ': broken /#' + fragment);
    }
  }
  assert.ok(checked >= 5, 'Expected homepage links not found: check route structure');
});

test('contact anchor points to the homepage Telegram entry block', () => {
  assert.match(home, /className="v2-intro"\s+id="contact"/);
  assert.match(home, /className="v2-telegram-entry"/);
  assert.ok(homepageIds.has('contact'));
});

test('trial anchor points to selectable practical exercises', () => {
  assert.match(home, /className="v2-directions"\s+id="trials"/);
  assert.match(home, /onClick=\{\(\) => begin\(dir\.id\)\}/);
  assert.ok(homepageIds.has('trials'));
});

test('mobile menu uses a real visible trials anchor, not the obsolete results link', () => {
  assert.match(menu, /href="\/#trials">Малі проби<\/a>/);
  assert.doesNotMatch(menu, /href="\/#results"/);
});
