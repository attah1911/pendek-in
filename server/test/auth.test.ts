import assert from 'node:assert/strict';
import test from 'node:test';
import jwt from 'jsonwebtoken';
import { readTokenPayload } from '../src/middlewares/auth';

const SECRET = 'test-secret-value-1234567890';

test('readTokenPayload accepts a signed USER/ADMIN token round-trip', () => {
  const token = jwt.sign({ id: 'user_1', role: 'ADMIN' }, SECRET);
  assert.deepEqual(readTokenPayload(jwt.verify(token, SECRET)), { id: 'user_1', role: 'ADMIN' });
});

test('readTokenPayload rejects non-objects', () => {
  assert.equal(readTokenPayload(null), null);
  assert.equal(readTokenPayload('nope'), null);
});

test('readTokenPayload rejects missing/invalid id', () => {
  assert.equal(readTokenPayload({ role: 'USER' }), null);
  assert.equal(readTokenPayload({ id: 123, role: 'USER' }), null);
});

test('readTokenPayload rejects unknown roles', () => {
  assert.equal(readTokenPayload({ id: 'x', role: 'SUPERUSER' }), null);
  assert.equal(readTokenPayload({ id: 'x' }), null);
});

test('readTokenPayload strips extra claims (iat/exp) down to id+role', () => {
  const token = jwt.sign({ id: 'u2', role: 'USER' }, SECRET, { expiresIn: '1h' });
  assert.deepEqual(readTokenPayload(jwt.verify(token, SECRET)), { id: 'u2', role: 'USER' });
});
