import assert from 'node:assert/strict';
import test from 'node:test';
import { addBlacklistSchema } from '../src/validators/admin';

test('addBlacklistSchema accepts a bare domain and lowercases it', () => {
  const parsed = addBlacklistSchema.parse({ domain: 'Phishing.Example.COM' });
  assert.equal(parsed.domain, 'phishing.example.com');
});

test('addBlacklistSchema trims surrounding whitespace', () => {
  assert.equal(addBlacklistSchema.parse({ domain: '  evil.co  ' }).domain, 'evil.co');
});

test('addBlacklistSchema rejects URLs and paths', () => {
  assert.equal(addBlacklistSchema.safeParse({ domain: 'https://evil.com' }).success, false);
  assert.equal(addBlacklistSchema.safeParse({ domain: 'evil.com/malware' }).success, false);
});

test('addBlacklistSchema rejects a hostname with no TLD', () => {
  assert.equal(addBlacklistSchema.safeParse({ domain: 'localhost' }).success, false);
});

test('addBlacklistSchema keeps reason optional but non-empty when given', () => {
  assert.equal(addBlacklistSchema.safeParse({ domain: 'a.com' }).success, true);
  assert.equal(addBlacklistSchema.safeParse({ domain: 'a.com', reason: '' }).success, false);
});
