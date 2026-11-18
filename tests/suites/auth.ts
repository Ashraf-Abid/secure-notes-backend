import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import jwt from 'jsonwebtoken';
import { env } from '../../src/config/env';
import { User } from '../../src/models/User';
import { api } from '../helpers';

export function authTests() {
  describe('Authentication', () => {
    const email = 'auth@test.com';
    const password = 'password123';
    let token: string;
    let userId: string;

    it('registers a user with role USER, returns a token and no password', async () => {
      const res = await api('POST', '/auth/register', {
        body: { name: 'Auth User', email, password, role: 'ADMIN' },
      });
      assert.equal(res.status, 201);
      assert.ok(res.body.data.token);
      assert.equal(res.body.data.user.role, 'USER');
      assert.equal(res.body.data.user.password, undefined);
      token = res.body.data.token;
      userId = res.body.data.user._id;
    });

    it('stores the password as a bcrypt hash', async () => {
      const user = await User.findById(userId).select('+password');
      assert.match(user!.password, /^\$2[aby]\$12\$/);
    });

    it('rejects a duplicate email regardless of case', async () => {
      const res = await api('POST', '/auth/register', {
        body: { name: 'Dup', email: email.toUpperCase(), password },
      });
      assert.equal(res.status, 409);
    });

    it('validates registration input', async () => {
      const res = await api('POST', '/auth/register', { body: { name: '', email: 'bad', password: 'short' } });
      assert.equal(res.status, 400);
      assert.deepEqual(res.body.errors.map((e: any) => e.field).sort(), ['email', 'name', 'password']);
    });

    it('logs in with correct credentials', async () => {
      const res = await api('POST', '/auth/login', { body: { email, password } });
      assert.equal(res.status, 200);
      assert.ok(res.body.data.token);
      assert.equal(res.body.data.user.password, undefined);
    });

    it('gives the same 401 for a wrong password and an unknown email', async () => {
      const wrong = await api('POST', '/auth/login', { body: { email, password: 'wrongpass1' } });
      const unknown = await api('POST', '/auth/login', { body: { email: 'nobody@test.com', password } });
      assert.equal(wrong.status, 401);
      assert.equal(unknown.status, 401);
      assert.equal(wrong.body.message, unknown.body.message);
    });

    it('returns the profile for a valid token', async () => {
      const res = await api('GET', '/users/me', { token });
      assert.equal(res.status, 200);
      assert.equal(res.body.data.email, email);
      assert.equal(res.body.data.password, undefined);
    });

    it('rejects missing, malformed, expired, forged and alg:none tokens', async () => {
      const expired = jwt.sign({ sub: userId, exp: Math.floor(Date.now() / 1000) - 60 }, env.jwtSecret);
      const forged = jwt.sign({ sub: userId }, 'wrong-secret');
      const none =
        Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url') +
        '.' +
        Buffer.from(JSON.stringify({ sub: userId })).toString('base64url') +
        '.';

      assert.equal((await api('GET', '/users/me')).status, 401);
      assert.equal((await api('GET', '/users/me', { token: 'not.a.token' })).body.message, 'Invalid token');
      assert.equal((await api('GET', '/users/me', { token: expired })).body.message, 'Token expired');
      assert.equal((await api('GET', '/users/me', { token: forged })).status, 401);
      assert.equal((await api('GET', '/users/me', { token: none })).status, 401);
    });
  });
}
