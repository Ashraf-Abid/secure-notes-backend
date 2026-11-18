import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import { User } from '../../src/models/User';
import { api, createUser } from '../helpers';

export function authorizationTests() {
  describe('Authorization', () => {
    let user: Awaited<ReturnType<typeof createUser>>;
    let admin: Awaited<ReturnType<typeof createUser>>;

    const adminEndpoints: [string, string][] = [
      ['GET', '/users'],
      ['POST', '/users'],
      ['GET', '/users/000000000000000000000000'],
      ['PATCH', '/users/000000000000000000000000'],
      ['DELETE', '/users/000000000000000000000000'],
      ['GET', '/admin/notes'],
      ['GET', '/admin/users/grouped-by-interests'],
    ];

    before(async () => {
      user = await createUser();
      admin = await createUser({ role: 'ADMIN' });
    });

    const bodyFor = (method: string) => (method === 'POST' || method === 'PATCH' ? { name: 'x' } : undefined);

    it('returns 401 on protected routes without a token', async () => {
      for (const [method, path] of [...adminEndpoints, ['GET', '/notes'], ['GET', '/posts']]) {
        assert.equal((await api(method, path, { body: bodyFor(method) })).status, 401, `${method} ${path}`);
      }
    });

    it('returns 403 when a USER calls any admin endpoint', async () => {
      for (const [method, path] of adminEndpoints) {
        const res = await api(method, path, { token: user.token, body: bodyFor(method) });
        assert.equal(res.status, 403, `${method} ${path}`);
      }
    });

    it('allows an ADMIN to call admin endpoints', async () => {
      for (const path of ['/users', '/admin/notes', '/admin/users/grouped-by-interests']) {
        assert.equal((await api('GET', path, { token: admin.token })).status, 200, path);
      }
    });

    it('applies role changes immediately without a new login', async () => {
      await User.updateOne({ _id: user.id }, { role: 'ADMIN' });
      assert.equal((await api('GET', '/users', { token: user.token })).status, 200);
      await User.updateOne({ _id: user.id }, { role: 'USER' });
      assert.equal((await api('GET', '/users', { token: user.token })).status, 403);
    });

    it('rejects the token of a deleted user', async () => {
      const temp = await createUser();
      await User.deleteOne({ _id: temp.id });
      const res = await api('GET', '/users/me', { token: temp.token });
      assert.equal(res.status, 401);
    });
  });
}
