import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import { Note } from '../../src/models/Note';
import { Post } from '../../src/models/Post';
import { api, createUser } from '../helpers';

export function adminTests() {
  describe('Admin', () => {
    let admin: Awaited<ReturnType<typeof createUser>>;
    let createdId: string;

    before(async () => {
      admin = await createUser({ role: 'ADMIN' });
    });

    it('creates a user with default role USER who can log in', async () => {
      const res = await api('POST', '/users', {
        token: admin.token,
        body: { name: 'Managed', email: 'managed@test.com', password: 'managedpass1' },
      });
      assert.equal(res.status, 201);
      assert.equal(res.body.data.role, 'USER');
      assert.equal(res.body.data.password, undefined);
      createdId = res.body.data._id;

      const login = await api('POST', '/auth/login', { body: { email: 'managed@test.com', password: 'managedpass1' } });
      assert.equal(login.status, 200);
    });

    it('creates an ADMIN when the role is given, rejects invalid role and duplicate email', async () => {
      const ok = await api('POST', '/users', {
        token: admin.token,
        body: { name: 'Second Admin', email: 'admin2@test.com', password: 'password123', role: 'ADMIN' },
      });
      assert.equal(ok.body.data.role, 'ADMIN');

      const badRole = await api('POST', '/users', {
        token: admin.token,
        body: { name: 'X', email: 'x@test.com', password: 'password123', role: 'SUPER' },
      });
      assert.equal(badRole.status, 400);

      const dup = await api('POST', '/users', {
        token: admin.token,
        body: { name: 'X', email: 'MANAGED@test.com', password: 'password123' },
      });
      assert.equal(dup.status, 409);
    });

    it('lists users newest first with pagination and no passwords', async () => {
      const res = await api('GET', '/users?page=1&limit=2', { token: admin.token });
      assert.equal(res.status, 200);
      assert.equal(res.body.data.length, 2);
      assert.equal(res.body.data[0].email, 'admin2@test.com');
      assert.ok(res.body.pagination.totalItems >= 3);
      assert.ok(res.body.data.every((u: any) => u.password === undefined));
    });

    it('gets a user by id', async () => {
      const res = await api('GET', `/users/${createdId}`, { token: admin.token });
      assert.equal(res.body.data.email, 'managed@test.com');
      assert.equal((await api('GET', '/users/000000000000000000000000', { token: admin.token })).status, 404);
    });

    it('updates a user without resetting unspecified fields', async () => {
      await api('PATCH', `/users/${createdId}`, { token: admin.token, body: { role: 'ADMIN', interests: ['Chess'] } });
      const res = await api('PATCH', `/users/${createdId}`, { token: admin.token, body: { name: 'Renamed' } });
      assert.equal(res.status, 200);
      assert.equal(res.body.data.name, 'Renamed');
      assert.equal(res.body.data.role, 'ADMIN');
      assert.deepEqual(res.body.data.interests, ['chess']);
    });

    it('re-hashes the password on update', async () => {
      await api('PATCH', `/users/${createdId}`, { token: admin.token, body: { password: 'newpassword9' } });
      const login = (password: string) => api('POST', '/auth/login', { body: { email: 'managed@test.com', password } });
      assert.equal((await login('newpassword9')).status, 200);
      assert.equal((await login('managedpass1')).status, 401);
    });

    it('prevents an admin from changing their own role or deleting themselves', async () => {
      const role = await api('PATCH', `/users/${admin.id}`, { token: admin.token, body: { role: 'USER' } });
      assert.equal(role.status, 400);
      const del = await api('DELETE', `/users/${admin.id}`, { token: admin.token });
      assert.equal(del.status, 400);
    });

    it("lists everyone's notes with owner info and filters by user", async () => {
      const a = await createUser({ name: 'Note Owner A' });
      const b = await createUser({ name: 'Note Owner B' });
      for (const t of ['a1', 'a2']) await api('POST', '/notes', { token: a.token, body: { title: t, content: 'x' } });
      await api('POST', '/notes', { token: b.token, body: { title: 'b1', content: 'x' } });

      const all = await api('GET', '/admin/notes?limit=50', { token: admin.token });
      const titles = all.body.data.map((n: any) => n.title);
      assert.ok(['a1', 'a2', 'b1'].every((t) => titles.includes(t)));
      const b1 = all.body.data.find((n: any) => n.title === 'b1');
      assert.deepEqual(Object.keys(b1.user).sort(), ['_id', 'email', 'name']);

      const filtered = await api('GET', `/admin/notes?userId=${a.id}`, { token: admin.token });
      assert.deepEqual(filtered.body.data.map((n: any) => n.title), ['a2', 'a1']);
      assert.equal(filtered.body.pagination.totalItems, 2);

      assert.equal((await api('GET', '/admin/notes?userId=bad', { token: admin.token })).status, 400);
    });

    it('deletes a user together with their notes and posts', async () => {
      const victim = await createUser();
      await api('POST', '/notes', { token: victim.token, body: { title: 'n', content: 'x' } });
      await api('POST', '/posts', { token: victim.token, body: { title: 'p', content: 'x' } });

      const res = await api('DELETE', `/users/${victim.id}`, { token: admin.token });
      assert.equal(res.status, 200);
      assert.equal(await Note.countDocuments({ user: victim.id }), 0);
      assert.equal(await Post.countDocuments({ user: victim.id }), 0);
      assert.equal((await api('GET', '/users/me', { token: victim.token })).status, 401);
      assert.equal((await api('DELETE', `/users/${victim.id}`, { token: admin.token })).status, 404);
    });
  });
}
