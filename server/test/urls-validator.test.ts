import assert from 'node:assert/strict';
import test from 'node:test';
import { createUrlSchema } from '../src/validators/urls';

const future = new Date(Date.now() + 86_400_000).toISOString();

test('createUrlSchema accepts a plain https URL', () => {
  assert.equal(createUrlSchema.safeParse({ originalUrl: 'https://example.com/path' }).success, true);
});

test('createUrlSchema rejects non-http(s) schemes', () => {
  assert.equal(createUrlSchema.safeParse({ originalUrl: 'javascript:alert(1)' }).success, false);
  assert.equal(createUrlSchema.safeParse({ originalUrl: 'ftp://example.com' }).success, false);
});

test('createUrlSchema enforces the alias charset and length', () => {
  assert.equal(createUrlSchema.safeParse({ originalUrl: 'https://a.com', alias: 'ok-alias1' }).success, true);
  assert.equal(createUrlSchema.safeParse({ originalUrl: 'https://a.com', alias: 'no' }).success, false);
  assert.equal(createUrlSchema.safeParse({ originalUrl: 'https://a.com', alias: 'has space' }).success, false);
  assert.equal(createUrlSchema.safeParse({ originalUrl: 'https://a.com', alias: 'under_score' }).success, false);
});

test('createUrlSchema rejects reserved aliases', () => {
  assert.equal(createUrlSchema.safeParse({ originalUrl: 'https://a.com', alias: 'admin' }).success, false);
  assert.equal(createUrlSchema.safeParse({ originalUrl: 'https://a.com', alias: 'ADMIN' }).success, false);
});

test('createUrlSchema rejects a past expiry and accepts a future one', () => {
  assert.equal(
    createUrlSchema.safeParse({ originalUrl: 'https://a.com', expiresAt: '2000-01-01T00:00:00Z' }).success,
    false,
  );
  assert.equal(createUrlSchema.safeParse({ originalUrl: 'https://a.com', expiresAt: future }).success, true);
});
