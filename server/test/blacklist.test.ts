import assert from 'node:assert/strict';
import test from 'node:test';
import { domainCandidates } from '../src/services/blacklistService';

test('domainCandidates walks up to the registrable domain', () => {
  assert.deepEqual(domainCandidates('evil.phishing.example.com'), [
    'evil.phishing.example.com',
    'phishing.example.com',
    'example.com',
  ]);
});

test('domainCandidates on a bare registrable domain returns just itself', () => {
  assert.deepEqual(domainCandidates('example.com'), ['example.com']);
});

test('domainCandidates never yields a bare TLD', () => {
  assert.equal(domainCandidates('a.b.co.uk').includes('uk'), false);
});

test('domainCandidates lowercases', () => {
  assert.deepEqual(domainCandidates('EVIL.Example.COM'), ['evil.example.com', 'example.com']);
});

test('domainCandidates handles single-label host', () => {
  assert.deepEqual(domainCandidates('localhost'), ['localhost']);
});
