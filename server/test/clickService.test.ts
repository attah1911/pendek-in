import assert from 'node:assert/strict';
import test from 'node:test';
import { deviceFromUserAgent } from '../src/services/clickService';

test('deviceFromUserAgent detects mobile', () => {
  assert.equal(
    deviceFromUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15'),
    'MOBILE',
  );
  assert.equal(deviceFromUserAgent('Mozilla/5.0 (Linux; Android 14; Pixel 8)'), 'MOBILE');
});

test('deviceFromUserAgent detects bots before mobile', () => {
  assert.equal(deviceFromUserAgent('Googlebot/2.1 (+http://www.google.com/bot.html)'), 'BOT');
  assert.equal(deviceFromUserAgent('curl/8.4.0'), 'BOT');
  // "facebookexternalhit" contains no "mobile" but must classify as BOT
  assert.equal(deviceFromUserAgent('facebookexternalhit/1.1'), 'BOT');
});

test('deviceFromUserAgent falls back to desktop for a normal browser', () => {
  assert.equal(
    deviceFromUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120'),
    'DESKTOP',
  );
});

test('deviceFromUserAgent returns UNKNOWN when the header is absent', () => {
  assert.equal(deviceFromUserAgent(undefined), 'UNKNOWN');
});
